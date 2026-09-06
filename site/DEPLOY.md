# Déploiement — guide.captain-invest.com

Site statique (aucun build requis) + une Cloudflare Pages Function pour la capture de leads.

## Contenu du dossier `site/`
- `index.html` — landing page (opt-in du guide)
- `guide/index.html` — page affichée après inscription
- `confidentialite/index.html` — page provisoire, **à remplacer** par le texte réel
- `functions/api/leads.js` — endpoint `POST /api/leads` (Cloudflare Pages Function)
- `favicon.svg`

## KV déjà créée
Une KV namespace a été créée sur ton compte Cloudflare pour stocker les inscriptions :
- Nom : `captain-invest-guide-leads`
- ID : `54ebcb6caa43497382df023894ea90f2`

## Étapes de déploiement (dashboard Cloudflare)

1. **Créer le projet Pages**
   - Cloudflare dashboard → *Workers & Pages* → *Create* → *Pages* → *Connect to Git*.
   - Sélectionner le dépôt GitHub `rashkan-coder/Claude`, branche `claude/heberger-site-domaine-50orct` (ou `main` une fois mergé).
   - Framework preset : `None`.
   - Build command : *(laisser vide)*.
   - Build output directory : `site`.
   - Déployer.

2. **Lier la KV à la Function**
   - Dans le projet Pages → *Settings* → *Functions* → *KV namespace bindings* → *Add binding*.
   - Variable name : `LEADS_KV`
   - KV namespace : `captain-invest-guide-leads`
   - Sauvegarder, puis redéployer (un nouveau déploiement est nécessaire pour que le binding soit pris en compte).

3. **Ajouter le domaine personnalisé**
   - Toujours dans le projet Pages → *Custom domains* → *Set up a custom domain*.
   - Entrer `guide.captain-invest.com`.
   - Comme le DNS de `captain-invest.com` est déjà sur Cloudflare, l'enregistrement CNAME est créé automatiquement. Ne touche pas à `www.captain-invest.com` (site principal) — on utilise volontairement un sous-domaine séparé.

4. **Vérifier**
   - Ouvrir `https://guide.captain-invest.com/` : la landing page doit s'afficher.
   - Remplir le formulaire : succès → redirection vers `/guide`.
   - Dans le dashboard Cloudflare → *KV* → `captain-invest-guide-leads` → vérifier qu'une entrée a été créée.

## À finaliser ensuite
- **`/confidentialite`** : remplacer le contenu provisoire par le texte réel de la politique de confidentialité (donne-moi l'URL du site principal ou le texte, et je le mets à jour).
- **Envoi automatique du guide par email** : pour l'instant, `/api/leads` enregistre juste le contact en base (KV). Aucun email n'est envoyé automatiquement — à brancher plus tard (ex. Resend, Brevo, Mailjet) si besoin.
- **Export des leads** : consultables pour l'instant uniquement via le dashboard Cloudflare KV (ou l'API Cloudflare). Un petit outil d'export peut être ajouté si besoin.
