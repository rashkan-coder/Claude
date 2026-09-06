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
3. **Ajouter le domaine personnalisé** :
   - Dans le Worker créé → *Settings* → *Domains & Routes* → *Add* → *Custom Domain*.
   - Entrer `guide.captain-invest.com`.
   - Le DNS de `captain-invest.com` étant déjà sur Cloudflare, l'enregistrement est créé automatiquement.
   - ⚠️ Ne pas toucher à `www.captain-invest.com` — le site principal n'est pas concerné, on utilise un sous-domaine dédié.
4. **Vérifier** :
   - Ouvrir `https://guide.captain-invest.com/` : la landing page doit s'afficher.
   - Remplir le formulaire : succès → redirection vers `/guide/`.
   - Dashboard Cloudflare → *Storage & Databases* → *KV* → `captain-invest-guide-leads` → une entrée doit apparaître.

## À finaliser ensuite
- **`/confidentialite`** : remplacer le contenu provisoire par le texte réel (donne l'URL du site principal ou le texte, et il sera mis à jour).
- **Envoi automatique du guide par email** : `/api/leads` enregistre le contact dans la KV mais n'envoie aucun email pour l'instant — à brancher plus tard (Resend, Brevo, Mailjet…) si besoin.
- **Export des leads** : consultable pour l'instant via le dashboard Cloudflare KV (ou l'API Cloudflare).
