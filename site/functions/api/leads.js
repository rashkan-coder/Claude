// Cloudflare Pages Function — POST /api/leads
// Stores a guide signup lead into the KV namespace bound as `LEADS_KV`.
// Configure the binding in: Cloudflare dashboard → Pages project → Settings → Functions → KV namespace bindings.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestPost(context) {
  const { request, env } = context;

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

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
