# Déploiement — guide.captain-invest.com

Cloudflare a fusionné Pages dans Workers : ce dépôt se déploie comme un
**Worker avec assets statiques**, pas comme un « projet Pages » classique.

## Structure du dépôt
- `wrangler.toml` — config du Worker (nom, assets, binding KV) — **à la racine**
- `worker/index.js` — le Worker : sert `site/` tel quel, et gère lui-même
  `POST /api/leads`
- `site/index.html` — landing page (opt-in du guide)
- `site/guide/index.html` — page affichée après inscription
- `site/confidentialite/index.html` — page provisoire, **à remplacer**
- `site/favicon.svg`

## KV déjà créée
- Nom : `captain-invest-guide-leads`
- ID : `54ebcb6caa43497382df023894ea90f2` (déjà référencée dans `wrangler.toml`)

## Étapes de déploiement (dashboard Cloudflare → Create an app → Git)

1. Sur l'écran **« Set up your application »** :
   - *Project name* : `captain-invest-guide` (pour que ça corresponde au `name` du `wrangler.toml`).
   - *Build command* : laisser vide.
   - *Deploy command* : `npx wrangler deploy` (déjà pré-rempli, ne pas toucher).
   - Cliquer **Deploy**.
2. Le premier déploiement clone le repo et exécute `wrangler deploy`, qui lit `wrangler.toml` :
   crée le Worker, sert `site/` comme assets, et lie la KV `LEADS_KV`.
3. **Ajouter le domaine personnalisé** — sur ce compte, le bouton *Add Domain* (Custom Domain automatique)
   a échoué silencieusement (« No zones match »), probablement un bug de l'onboarding pour ce compte.
   Méthode manuelle qui fonctionne (2 étapes) :
   - **DNS** : dans la zone `captain-invest.com` (dashboard Cloudflare → Domains → captain-invest.com → DNS),
     *Add record* → Type `A`, Name `guide`, IPv4 `192.0.2.1` (IP factice, sans conséquence — Cloudflare
     intercepte le trafic avant), Proxy status **Proxied** (nuage orange).
   - **Route** : dans le Worker `captain-invest-guide` → *Domains* → *Add Route* → Route
     `guide.captain-invest.com/*`, Zone `captain-invest.com`.
   - ⚠️ Ne pas toucher à `www.captain-invest.com` — le site principal n'est pas concerné, on utilise un sous-domaine dédié.
   - (Si le bouton *Add Domain* fonctionne un jour normalement sur ce compte, il fait les deux étapes
     ci-dessus automatiquement en une fois — plus simple si disponible.)
4. **Vérifier** :
   - Ouvrir `https://guide.captain-invest.com/` : la landing page doit s'afficher.
   - Remplir le formulaire : succès → redirection vers `/guide/`.
   - Dashboard Cloudflare → *Storage & Databases* → *KV* → `captain-invest-guide-leads` → une entrée doit apparaître.

## À finaliser ensuite
- **`/confidentialite`** : remplacer le contenu provisoire par le texte réel (donne l'URL du site principal ou le texte, et il sera mis à jour).
- **Envoi automatique du guide par email** : `/api/leads` enregistre le contact dans la KV mais n'envoie aucun email pour l'instant — à brancher plus tard (Resend, Brevo, Mailjet…) si besoin.
- **Export des leads** : consultable pour l'instant via le dashboard Cloudflare KV (ou l'API Cloudflare).
