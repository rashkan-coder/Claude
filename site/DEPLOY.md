# Déploiement — guide.captain-invest.com

Cloudflare a fusionné Pages dans Workers : ce dépôt se déploie comme un
**Worker avec assets statiques**, pas comme un « projet Pages » classique.

## Structure du dépôt
- `wrangler.toml` — config du Worker (nom, assets, binding KV) — **à la racine**
- `worker/index.js` — le Worker : sert `site/` tel quel, et gère lui-même
  `POST /api/leads` et `POST /api/obo-diagnostic`
- `site/index.html` — landing page « Clauses Don » (opt-in du guide transmission)
- `site/guide/index.html` — page affichée après inscription (guide clauses de donation)
- `site/obo/index.html` — landing page « OBO » (opt-in du guide OBO — même gabarit que ci-dessus)
- `site/obo/decouvrir/index.html` — page affichée après inscription : mécanisme de l'OBO,
  schémas (liquidités / immobilier) et diagnostic d'éligibilité interactif
- `site/confidentialite/index.html` — page provisoire, **à remplacer**
- `site/favicon.svg`

Les deux landing pages (`/` et `/obo/`) partagent le même Worker, la même KV de leads et
le même sous-domaine `guide.captain-invest.com` — pas de route ni de KV supplémentaire à créer
pour l'OBO. Si un sous-domaine dédié est préféré à terme (ex. `obo.captain-invest.com`), suivre
la même méthode manuelle DNS + Route décrite à l'étape 3 ci-dessous.

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
   - Ouvrir `https://guide.captain-invest.com/obo/` : idem, avec redirection vers `/obo/decouvrir/`
     et son diagnostic d'éligibilité.
   - Dashboard Cloudflare → *Storage & Databases* → *KV* → `captain-invest-guide-leads` → une entrée doit apparaître.

## Export des leads (`GET /api/leads-export`) et des diagnostics OBO (`GET /api/obo-diagnostic-export`)

Deux endpoints protégés par le même secret partagé (`EXPORT_TOKEN`), à configurer une fois :

1. Dashboard Cloudflare → Worker `captain-invest-guide` → *Settings* → *Variables and Secrets* → *Add*.
   - Type : **Secret** (pas "Text" — pour qu'il ne soit jamais affiché en clair après coup).
   - Name : `EXPORT_TOKEN`
   - Value : (un token long et aléatoire — généré une fois pour ce projet, à garder confidentiel comme un mot de passe).
2. Save + redeploy si demandé.

Usage ensuite :
- Leads (formulaires d'opt-in, tous sites confondus — voir le champ `source` : `clauses-don` ou `obo`) :
  - JSON : `https://guide.captain-invest.com/api/leads-export?token=VOTRE_TOKEN`
  - CSV : `https://guide.captain-invest.com/api/leads-export?token=VOTRE_TOKEN&format=csv`
- Réponses au diagnostic d'éligibilité OBO (`site/obo/decouvrir/`) — éligible ou non, et pourquoi :
  - JSON : `https://guide.captain-invest.com/api/obo-diagnostic-export?token=VOTRE_TOKEN`
  - CSV : `https://guide.captain-invest.com/api/obo-diagnostic-export?token=VOTRE_TOKEN&format=csv`
- Ou via header (plus propre, évite le token dans l'URL/historique du navigateur) :
  `curl -H "Authorization: Bearer VOTRE_TOKEN" https://guide.captain-invest.com/api/leads-export`

⚠️ Ce token donne accès à toutes les coordonnées collectées (email, prénom, nom) — à traiter comme un mot de passe, ne jamais le committer dans le repo ni le partager publiquement.

## À finaliser ensuite
- **`/confidentialite`** : remplacer le contenu provisoire par le texte réel (donne l'URL du site principal ou le texte, et il sera mis à jour).
- **Envoi automatique du guide par email** : `/api/leads` enregistre le contact dans la KV mais n'envoie aucun email pour l'instant — à brancher plus tard (Resend, Brevo, Mailjet…) si besoin.
- **Lien Calendly OBO** : `https://calendly.com/rashan-kadioglu/transmission-obo`, câblé en dur dans
  `site/obo/decouvrir/index.html` (constante `CALENDLY_URL`) — à mettre à jour au même endroit si l'événement change.
