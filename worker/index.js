// Worker entry point — serves the static site (site/) as assets and
// handles POST /api/leads itself (stores signups in the LEADS_KV KV namespace).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/leads" && request.method === "POST") {
      return handleLeads(request, env);
    }

    if (url.pathname === "/api/leads-export" && request.method === "GET") {
      return handleLeadsExport(request, env, url);
    }

    // Everything else (/, /guide/, /confidentialite/, favicon.svg, ...)
    // is served straight from the site/ static assets.
    return env.ASSETS.fetch(request);
  },
};

async function handleLeads(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Requête invalide." }, 400);
  }

  const firstName = String(body?.firstName || "").trim();
  const lastName = String(body?.lastName || "").trim();
  const email = String(body?.email || "").trim();
  const consent = Boolean(body?.consent);

  if (!firstName || !lastName) {
    return jsonResponse({ error: "Merci d'indiquer votre prénom et votre nom." }, 400);
  }
  if (!EMAIL_RE.test(email)) {
    return jsonResponse({ error: "Merci d'indiquer une adresse email valide." }, 400);
  }
  if (!consent) {
    return jsonResponse({ error: "Merci d'accepter l'envoi du guide et des communications." }, 400);
  }

  if (!env.LEADS_KV) {
    return jsonResponse(
      { error: "Configuration serveur manquante (binding KV 'LEADS_KV' absent)." },
      500
    );
  }

  const id = `${Date.now()}-${crypto.randomUUID()}`;
  const record = {
    firstName,
    lastName,
    email,
    consent,
    createdAt: new Date().toISOString(),
    ip: request.headers.get("CF-Connecting-IP") || null,
    userAgent: request.headers.get("User-Agent") || null,
  };

  await env.LEADS_KV.put(id, JSON.stringify(record));
  // Best-effort secondary index by email (last submission wins; not a strict uniqueness guarantee).
  await env.LEADS_KV.put(`email:${email.toLowerCase()}`, id);

  return jsonResponse({ ok: true });
}

// GET /api/leads-export?token=...&format=json|csv
// Protected by a shared secret (env.EXPORT_TOKEN, set as a Worker secret —
// never committed to the repo). Auth via `Authorization: Bearer <token>`
// header (preferred) or `?token=` query param (handy to open in a browser).
async function handleLeadsExport(request, env, url) {
  if (!env.EXPORT_TOKEN) {
    return jsonResponse(
      { error: "Export non configuré (secret 'EXPORT_TOKEN' absent)." },
      500
    );
  }

  const authHeader = request.headers.get("Authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const providedToken = bearerToken || url.searchParams.get("token") || "";

  if (!safeEqual(providedToken, env.EXPORT_TOKEN)) {
    return jsonResponse({ error: "Non autorisé." }, 401);
  }

  if (!env.LEADS_KV) {
    return jsonResponse(
      { error: "Configuration serveur manquante (binding KV 'LEADS_KV' absent)." },
      500
    );
  }

  const leads = [];
  let cursor;
  do {
    const page = await env.LEADS_KV.list({ cursor });
    for (const key of page.keys) {
      if (key.name.startsWith("email:")) continue; // secondary index, not a real record
      const value = await env.LEADS_KV.get(key.name);
      if (!value) continue;
      try {
        leads.push(JSON.parse(value));
      } catch {
        // skip malformed entries rather than fail the whole export
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  leads.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));

  const format = (url.searchParams.get("format") || "json").toLowerCase();

  if (format === "csv") {
    const columns = ["firstName", "lastName", "email", "consent", "createdAt", "ip", "userAgent"];
    const rows = [columns.join(",")];
    for (const lead of leads) {
      rows.push(columns.map((col) => csvEscape(lead[col])).join(","));
    }
    return new Response(rows.join("\r\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="leads.csv"',
      },
    });
  }

  return jsonResponse({ count: leads.length, leads });
}

function csvEscape(value) {
  const str = value === undefined || value === null ? "" : String(value);
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

// Constant-time-ish string comparison to avoid trivial timing side-channels.
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
