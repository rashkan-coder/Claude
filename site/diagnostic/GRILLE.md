# Grille du diagnostic patrimonial — documentation et limites

Version de la grille : voir `RULE_VERSION` dans `content.js` (actuellement
`diagnostic-patrimoine-v1.1.0`, datée du 14/09/2026). Toute modification des
seuils, des textes de règles ou du calcul doit incrémenter cette version.

**v1.1.0** a volontairement raccourci le parcours (retour utilisateur : trop
long) — voir section 2 pour l'ampleur de la réduction et section 8 pour ce
que cela change par rapport à un référentiel plus détaillé (v1.0.0, conservé
dans l'historique git). Un disclaimer court (« estimation pédagogique, sans
engagement ») est désormais affiché dès l'accueil et pendant le
questionnaire, en plus de la mention légale complète en fin de résultats.

## 1. Principe

Deux lectures distinctes, jamais mélangées :

1. **Le radar (6 axes)** — évalue la *cohérence des décisions déclarées*,
   jamais la détention d'un outil. Posséder ou non une SCI, un PER, une
   assurance-vie, un bien locatif ou un crédit ne rapporte et ne retire
   aucun point en soi.
2. **La carte des leviers** — statut par levier (déjà mobilisé / à
   examiner / à différer / non prioritaire actuellement / informations
   insuffisantes), qui sont des *conditions de découverte*, jamais une
   conclusion d'éligibilité ni une recommandation de souscription.

Aucune note globale sur 100, aucun percentile, aucune comparaison à une
population, aucun diagnostic psychologique.

## 2. Les six axes et leurs indicateurs

Réduit à **un indicateur par pilier** (deux pour la branche dirigeant/
indépendant), pour raccourcir le parcours à 6 écrans de contexte (7 pour un
dirigeant) et 6 cartes notées (8 pour un dirigeant), au lieu de 7+12/16
dans la version initiale plus exhaustive.

| Axe | Nom | Indicateur particulier | Complément dirigeant |
|---|---|---|---|
| A | Sécurité financière | a1 (réserve de sécurité, question directe à choix) | — |
| B | Capacité à investir | b1 (capacité connue) | p1 (rémunération) |
| C | Maîtrise du crédit | cred1 (vue des coûts, deux formulations selon la porte `creditGate`) | — |
| D | Diversification | div1 (exposition connue) | — |
| E | Capitalisation et efficacité | cap1 (rôle des actifs) | p3 (excédents pro organisés) |
| F | Protection et transmission | prot1 (bénéficiaires/mandataires connus) | — |

Chaque indicateur note de 0 à 4, décrit exactement dans `indicators.js`
(logique d'applicabilité) et `content.js` (textes des questions et options).
Un indicateur ne pondère qu'un seul axe.

### Indicateurs à applicabilité conditionnelle

- **div1** : non applicable si aucun actif investi déclaré (immobilier
  locatif, épargne/placements ou parts d'entreprise valorisées).
- **p3** : non applicable si aucun excédent professionnel durable déclaré
  (porte `p3Gate`).

Quand le **fait** qui déterminerait l'applicabilité est lui-même inconnu
(porte répondue « je ne sais pas », ou champ de patrimoine non renseigné),
l'indicateur reste compté au dénominateur de la couverture — il n'est ni
exclu, ni noté à zéro. C'est délibéré : une applicabilité incertaine reste
« à clarifier », elle n'améliore jamais la couverture affichée.

### a1 : simplifié en question directe

Dans la v1.0.0, a1 pouvait se calculer automatiquement à partir de
« liquidités » ÷ (« dépenses essentielles » + « mensualités de crédit »),
avec une carte de confirmation/ajustement. Pour supprimer deux champs de
contexte, a1 est désormais une question directe à choix (« Moins d'un
mois », « 1 à 3 mois », … « Au moins 12 mois »), comme n'importe quel autre
indicateur. Le score obtenu est identique par construction ; seule la
méthode de collecte change.

## 3. Calcul du score d'axe

```
score_axe = round( (somme des notes connues / nombre de notes connues) × 25 / 5 ) × 5
```

- Les indicateurs non applicables sont exclus du calcul et de la couverture.
- Les réponses « je ne sais pas » et « je préfère ne pas répondre » comptent
  dans la couverture (dénominateur) mais jamais dans la moyenne (numérateur)
  — jamais converties en zéro.
- **Couverture** = nombre de notes connues ÷ nombre d'indicateurs
  applicables.
- Le score n'est affiché que si la couverture de l'axe est ≥ 2/3. En
  dessous, affichage « Non évalué ». Si aucun indicateur n'est applicable :
  « Non applicable actuellement ».

Niveaux affichés : 0–24 *À structurer* · 25–49 *Premiers repères* ·
50–74 *En construction* · 75–100 *Organisation avancée*. Ce sont des
repères pédagogiques, ni des seuils réglementaires ni une méthode validée
scientifiquement.

## 4. Cohérence

`engine.js#detectContradictions` détecte : patrimoine déclaré nul mais
épargne/placements positifs ; activité stable mais parts d'entreprise
valorisées à zéro. (La v1.0.0 en détectait deux de plus, qui nécessitaient
les champs « dépenses essentielles » et « mensualités de crédit » — retirés
du contexte pour raccourcir le parcours ; voir section 8.) Une incohérence
non résolue neutralise uniquement les indicateurs concernés (traités comme
non répondus dans le calcul), jamais tout le diagnostic.

## 5. Moteur de priorités

Cinq paliers, dans cet ordre (`rules.js#PRIORITY_RULES`), l'objectif
prioritaire du foyer (C4) départageant les règles de même palier :

1. Fragilité immédiate déclarée (dépenses non couvertes, argent exposé
   nécessaire à des dépenses proches).
2. Socle à clarifier ou sécuriser (réserve < 1 mois, engagements de crédit
   mal connus).
3. Cohérence (objectif proche et argent exposé, concentration identifiée,
   dépendance forte du foyer à l'activité).
4. Organisation (rémunération non arbitrée, capitalisation à organiser,
   transmission à examiner).
5. Pistes de développement (premiers investissements).

Les règles déclenchées sont dédupliquées par sujet sous-jacent (`topic`) et
limitées aux trois premières. S'il n'y a qu'une priorité fondée, une seule
est affichée — jamais complétée artificiellement.

## 6. Carte des leviers

Sept leviers (`rules.js#computeLevers`) : immobilier à crédit,
investissement financier, rémunération du dirigeant, capitalisation en
société/holding, levier bancaire professionnel, fiscalité et frais,
transmission. Chacun renvoie `{status, motif, action}` à partir de faits
déclarés (jamais de génération de texte à la volée). Les seuils de
concentration (>70 % immobilier, >50 % entreprise, sur les actifs bruts
connus) sont des repères pédagogiques, pas des injonctions — aucune règle
ne recommande de vendre. Le levier bancaire professionnel se fonde
uniquement sur la réponse « projet de financement envisagé » (C7) ; le
levier fiscalité/frais se fonde sur la seule présence d'actifs investis
(la v1.0.0 le fondait sur un indicateur dédié de comparaison des frais,
retiré pour raccourcir le parcours).

## 7. Non-résidents fiscaux

Si la résidence fiscale déclarée (C3) n'est pas la France, ou reste
incertaine : le radar continue de s'afficher normalement (l'organisation
n'est pas propre au droit français), mais le levier « Fiscalité et frais »
et le levier « Transmission » n'affichent aucune piste fiscale française
comme applicable ; ils orientent vers une analyse transfrontalière. Un
bandeau dédié apparaît en tête des résultats.

## 8. Ce que cette version ne fait pas

- Aucun barème fiscal ni simulation de droits n'est codé. Les seuils cités
  dans le guide pédagogique (100 000 €, 152 500 €, 31 865 €, etc.) sont des
  repères informatifs datés au 14/09/2026, pas un calcul appliqué à la
  situation de la personne.
- Aucun calcul ne vérifie l'éligibilité réelle à un dispositif, la
  conformité d'un montage ou l'adéquation d'un produit.
- Le statut juridique de l'entreprise (EI/micro, IR, IS) n'est plus demandé
  (retiré en v1.1.0 pour raccourcir le parcours) — aucun indicateur ne s'y
  réfère.
- La détection de concentration utilise les valeurs brutes déclarées ; une
  valorisation incomplète (ex. parts d'entreprise à valeur inconnue) réduit
  la fiabilité du pourcentage, auquel cas aucun pourcentage n'est affiché.
  Les cryptoactifs ne sont plus isolés dans une catégorie séparée (fondus
  dans « épargne et placements financiers ») : leur éventuelle
  surconcentration spécifique n'est plus signalée.
- Le calcul tourne entièrement dans le navigateur ; aucune vérification
  croisée avec des données externes (cadastre, relevés bancaires, actes)
  n'est effectuée — tout repose sur l'exactitude des déclarations.

### Simplifications de la v1.1.0 (raccourcissement du parcours)

À la demande explicite d'un retour utilisateur (« trop de questions, trop
long »), le référentiel initial (7 écrans de contexte + 12 cartes notées,
+4 pour un dirigeant) a été réduit à 6 écrans (7 pour un dirigeant) et 6
cartes notées (8 pour un dirigeant). Ce que cela retire, concrètement :

- **Deux indicateurs par pilier redevenus un seul** : a2 (protection du
  foyer), b2 (méthode d'investissement), cred2 (résistance testée), div2
  (gestion des concentrations), cap2 (frais/fiscalité comparés), prot2
  (mesures effectivement prises), p2 (trésorerie pro/perso) et p4
  (financement pro testé) ont été retirés. Chaque pilier garde un signal,
  mais une lecture plus fine (par exemple : « la concentration est connue »
  ET « une stratégie existe » séparément) n'est plus possible — un seul
  indicateur porte l'ensemble du pilier.
- **Contexte réduit** : plus de régime matrimonial, de personnes
  dépendantes, de stabilité des revenus, de statut juridique, de détention
  via société patrimoniale (SCI/holding), d'« autres actifs », ni de
  distinction dépenses essentielles / mensualités de crédit (fondues, avec
  a1 devenu une question directe). Le patrimoine immobilier locatif et la
  résidence principale restent distincts (nécessaire au signal de
  diversification et de concentration) ; liquidités, placements financiers
  et cryptoactifs sont fondus en une seule « épargne et placements ».
- **Un seul objectif au lieu de deux** : la sélection multiple d'objectifs
  et l'arbitrage de priorité entre deux objectifs ont été retirés ; un seul
  objectif est demandé, avec une échéance.
- Ces choix réduisent la granularité de certains messages (la carte des
  leviers « fiscalité et frais » et « levier bancaire professionnel »
  s'appuient désormais sur des faits plus généraux), mais ne changent rien
  au principe fondamental : aucun point pour la détention d'un outil,
  couverture jamais convertie en zéro, incohérences neutralisées
  indicateur par indicateur.

## 9. Tests

`tests/engine.test.mjs` couvre les 15 scénarios de la section 14 du cahier
des charges, plus des vérifications d'invariance (déterminisme, thème du
Reel sans effet sur le calcul, monotonie). Lancer :

```
node site/diagnostic/tests/engine.test.mjs
```

Aucune dépendance externe n'est requise pour les tests (assertions natives
Node uniquement).

## 10. Fichiers

- `content.js` — textes uniquement (aucune logique).
- `facts.js` — petites fonctions dérivant des faits déclaratifs (présence
  d'investissements, concentration, patrimoine net…).
- `indicators.js` — configuration des indicateurs notés (axe, applicabilité,
  questions, options).
- `rules.js` — moteur de priorités et carte des leviers.
- `engine.js` — calcul (scores, couverture, cohérence, résultats consolidés).
  Aucune fonction de ce fichier ne touche au DOM ni au réseau.
- `app.js` — interface (questionnaire, navigation, rendu des résultats).
- `radar.js` — dessin du radar (canvas), partagé entre la page et le bilan PDF.
- `pdf-layout.js`, `pdf-guide.js`, `pdf-bilan.js`, `load-jspdf.js` — export PDF
  (jsPDF est vendu localement dans `vendor/jspdf.umd.min.js`, aucun CDN externe).
- `styles.css` — mise en forme (palette Captain Invest).
