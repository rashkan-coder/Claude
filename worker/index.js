// Worker entry point — serves the static site (site/) as assets and
// handles POST /api/leads itself (stores signups in the LEADS_KV KV namespace).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/leads" && request.method === "POST") {
      return handleLeads(request, env);
    }

    if (url.pathname === "/api/obo-diagnostic" && request.method === "POST") {
      return handleOboDiagnostic(request, env);
    }

    if (url.pathname === "/api/leads-export" && request.method === "GET") {
      return handleLeadsExport(request, env, url);
    }

    if (url.pathname === "/api/obo-diagnostic-export" && request.method === "GET") {
      return handleOboDiagnosticExport(request, env, url);
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
  // Which landing page this lead came from (e.g. "clauses-don", "obo") — optional, purely informational.
  const source = String(body?.source || "clauses-don").trim().slice(0, 60);

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
    source,
    createdAt: new Date().toISOString(),
    ip: request.headers.get("CF-Connecting-IP") || null,
    userAgent: request.headers.get("User-Agent") || null,
  };

  await env.LEADS_KV.put(id, JSON.stringify(record));
  // Best-effort secondary index by email (last submission wins; not a strict uniqueness guarantee).
  await env.LEADS_KV.put(`email:${email.toLowerCase()}`, id);

  return jsonResponse({ ok: true });
}

// POST /api/obo-diagnostic — records an answer set from the OBO eligibility
// quiz (site/obo/decouvrir/). Best-effort and low-stakes: the frontend fires
// this after computing the result and never blocks on it, so validation here
// stays lenient (no lead lookup, no hard requirement on identity fields).
async function handleOboDiagnostic(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Requête invalide." }, 400);
  }

  const firstName = String(body?.firstName || "").trim().slice(0, 200);
  const lastName = String(body?.lastName || "").trim().slice(0, 200);
  const emailRaw = String(body?.email || "").trim().slice(0, 200);
  const email = EMAIL_RE.test(emailRaw) ? emailRaw : null;
  const answers = body?.answers && typeof body.answers === "object" ? body.answers : {};
  const eligible = Boolean(body?.eligible);
  const reason = body?.reason ? String(body.reason).trim().slice(0, 100) : null;

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
    answers,
    eligible,
    reason,
    createdAt: new Date().toISOString(),
    ip: request.headers.get("CF-Connecting-IP") || null,
    userAgent: request.headers.get("User-Agent") || null,
  };

  await env.LEADS_KV.put(`obo:${id}`, JSON.stringify(record));

  // Best-effort: also attach this diagnostic to the matching lead record (by
  // email), so a single lookup shows both the opt-in and the questionnaire
  // answers for that person. The standalone "obo:" record above stays the
  // source of truth (kept even if no matching lead is found, or several
  // attempts are made) — this is purely a convenience mirror.
  if (email) {
    try {
      const leadId = await env.LEADS_KV.get(`email:${email.toLowerCase()}`);
      if (leadId) {
        const leadRaw = await env.LEADS_KV.get(leadId);
        if (leadRaw) {
          const lead = JSON.parse(leadRaw);
          lead.oboDiagnostic = { answers, eligible, reason, updatedAt: record.createdAt };
          await env.LEADS_KV.put(leadId, JSON.stringify(lead));
        }
      }
    } catch {
      // non-fatal: the standalone "obo:" record above already has the answers
    }
  }

  return jsonResponse({ ok: true });
}

// Shared bearer/token check for both export endpoints below.
function checkExportAuth(request, env, url) {
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
  return null; // authorized
}

// Lists every KV value whose key starts with `prefix` (pass "" for no filter,
// in which case `skipPrefixes` lets callers exclude other records living in
// the same namespace, e.g. secondary indexes or a different record type).
async function listRecords(kv, { prefix = "", skipPrefixes = [] } = {}) {
  const records = [];
  let cursor;
  do {
    const page = await kv.list({ prefix, cursor });
    for (const key of page.keys) {
      if (skipPrefixes.some((p) => key.name.startsWith(p))) continue;
      const value = await kv.get(key.name);
      if (!value) continue;
      try {
        records.push(JSON.parse(value));
      } catch {
        // skip malformed entries rather than fail the whole export
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  records.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  return records;
}

// GET /api/leads-export?token=...&format=json|csv
// Protected by a shared secret (env.EXPORT_TOKEN, set as a Worker secret —
// never committed to the repo). Auth via `Authorization: Bearer <token>`
// header (preferred) or `?token=` query param (handy to open in a browser).
async function handleLeadsExport(request, env, url) {
  const authError = checkExportAuth(request, env, url);
  if (authError) return authError;

  if (!env.LEADS_KV) {
    return jsonResponse(
      { error: "Configuration serveur manquante (binding KV 'LEADS_KV' absent)." },
      500
    );
  }

  // "email:" is the secondary index, "obo:" holds the diagnostic answers
  // (see /api/obo-diagnostic-export) — neither belongs in the leads export.
  const leads = await listRecords(env.LEADS_KV, { skipPrefixes: ["email:", "obo:"] });

  const format = (url.searchParams.get("format") || "json").toLowerCase();

  if (format === "csv") {
    const columns = ["firstName", "lastName", "email", "consent", "source", "createdAt", "ip", "userAgent", "oboEligible", "oboReason"];
    const rows = [columns.join(",")];
    for (const lead of leads) {
      const flat = {
        ...lead,
        oboEligible: lead.oboDiagnostic ? lead.oboDiagnostic.eligible : "",
        oboReason: lead.oboDiagnostic ? lead.oboDiagnostic.reason : "",
      };
      rows.push(columns.map((col) => csvEscape(flat[col])).join(","));
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

// GET /api/obo-diagnostic-export?token=...&format=json|csv
// Same auth as /api/leads-export. Lists the answers collected by the OBO
// eligibility quiz (site/obo/decouvrir/), stored under the "obo:" prefix.
async function handleOboDiagnosticExport(request, env, url) {
  const authError = checkExportAuth(request, env, url);
  if (authError) return authError;

  if (!env.LEADS_KV) {
    return jsonResponse(
      { error: "Configuration serveur manquante (binding KV 'LEADS_KV' absent)." },
      500
    );
  }

  const diagnostics = await listRecords(env.LEADS_KV, { prefix: "obo:" });

  const format = (url.searchParams.get("format") || "json").toLowerCase();

  if (format === "csv") {
    const columns = ["firstName", "lastName", "email", "eligible", "reason", "answers", "createdAt", "ip", "userAgent"];
    const rows = [columns.join(",")];
    for (const d of diagnostics) {
      rows.push(
        columns
          .map((col) => csvEscape(col === "answers" ? JSON.stringify(d.answers || {}) : d[col]))
          .join(",")
      );
    }
    return new Response(rows.join("\r\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="obo-diagnostics.csv"',
      },
    });
  }

  return jsonResponse({ count: diagnostics.length, diagnostics });
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
