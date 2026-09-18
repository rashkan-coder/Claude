# Grille du diagnostic patrimonial — documentation et limites

Version de la grille : voir `RULE_VERSION` dans `content.js` (actuellement
`diagnostic-patrimoine-v2.0.0`, datée du 18/09/2026). Toute modification des
seuils, des textes de règles ou du calcul doit incrémenter cette version.

**v2.0.0 est une refonte complète du principe de notation.** Les versions
1.x notaient chaque pilier à partir d'un **ressenti autodéclaré** (« avez-vous
une vue complète de X ? », « vos actifs ont-ils un rôle défini ? »). Retour
explicite : ce n'est pas ce qu'un diagnostic doit mesurer — deux personnes
avec la même situation réelle peuvent se juger très différemment. À partir
de v2.0.0, chaque pilier est noté à partir de **faits concrets** (montants,
tranches de crédit, choix structurels) que la personne déclare, jamais d'une
auto-évaluation de sa propre organisation. Voir section 8 pour l'historique
complet des versions 1.x (conservé pour mémoire).

## 1. Principe

Deux lectures distinctes, jamais mélangées :

1. **Le radar (6 axes)** — évalue des **faits objectifs déclarés**, jamais
   un ressenti ni la détention d'un outil en tant que telle. Posséder ou non
   une SCI, un PER, une assurance-vie, un bien locatif ou un crédit ne
   rapporte et ne retire aucun point en soi — c'est la manière dont ces
   faits se combinent (couverture de sécurité, taux d'épargne, niveau de
   levier, nombre de supports, allocation) qui détermine le score.
2. **La carte des leviers** — statut par levier (déjà mobilisé / à
   examiner / à différer / non prioritaire actuellement / informations
   insuffisantes), qui sont des *conditions de découverte*, jamais une
   conclusion d'éligibilité ni une recommandation de souscription.

Aucune note globale sur 100, aucun percentile, aucune comparaison à une
population, aucun diagnostic psychologique.

## 2. Les six axes, leurs faits et leurs seuils

Chaque indicateur note de 0 à 2 (3 niveaux), calculé par `computeScore` dans
`indicators.js` à partir de faits dérivés dans `facts.js`. **Les seuils
ci-dessous sont des choix de jugement métier, volontairement isolés ici pour
rester ajustables en un seul endroit** — ce ne sont ni des seuils
réglementaires, ni le résultat d'une méthode validée scientifiquement.

| Axe | Indicateur | Fait mesuré | Seuils (0 / 1 / 2) |
|---|---|---|---|
| A — Sécurité financière | `secu1` | Mois de couverture = épargne immédiatement disponible ÷ dépenses mensuelles essentielles | < 3 mois / 3 à 12 mois / > 12 mois |
| B — Capacité à investir | `capa1` | Taux d'épargne = épargne mensuelle moyenne ÷ revenus nets | épargne négative / 0 à 10 % / > 10 % |
| B (dirigeant) | `remuneration1` | Rémunération comparée à une autre option dans les 2 dernières années | non / — / oui (binaire, pas de palier intermédiaire) |
| C — Levier bancaire | `levier1` | Loan-to-value agrégé de l'immobilier détenu (crédit restant ÷ valeur du bien, par tranche déclarée) | 0 % / 0 à 50 % / ≥ 50 % |
| D — Diversification | `diversif1` | Nombre de supports d'épargne distincts détenus, plafonné si concentration globale identifiée | ≤ 1 support / 2 à 3 / ≥ 4 (plafonné à 1 si concentration) |
| E — Capitalisation et efficacité | `capital1` | Support dominant de l'épargne financière face au besoin de sécurité (matelas × 1,5) | dominant = livrets et épargne très excédentaire / dominant = livrets mais épargne modeste / dominant = tout support investi |
| F — Protection et transmission | `transmission1` | Transmission déjà organisée (testament, donation entre époux, mandat de protection future) | rien de fait / réflexion engagée / fait et à jour |

**Note sur l'axe C** : renommé « Levier bancaire » (ex-« Maîtrise du
crédit »). Ce n'est plus un contrôle de risque (« comprenez-vous le coût de
vos crédits ? ») mais une mesure d'usage du levier bancaire comme outil de
constitution de patrimoine — cohérent avec le levier `immobilierCredit` déjà
présent dans la carte des leviers. Un bien immobilier intégralement
remboursé note donc 0 (levier non exploité), pas parce que c'est dangereux,
mais parce que le levier n'est plus utilisé sur ce bien.

**Note sur l'axe E** : le signal mesuré est « l'argent qui dort » — de
l'épargne financière dont le support dominant reste un livret/compte non
investi, alors que son montant dépasse largement le besoin de sécurité déjà
couvert par l'axe A. Ce n'est pas un jugement sur le risque prendre, mais sur
l'opportunité manquée de faire travailler un capital disponible.

**Tranches de crédit (axe C)** : la personne indique une tranche (« aucun »,
« environ 20 % », « environ 50 % », « plus de 50 % » de la valeur du bien),
pas un montant exact. « Plus de 50 % » est converti en un point représentatif
de 70 % pour le calcul (`CREDIT_BRACKET_PCT` dans `facts.js`) — une
approximation assumée, pas une valeur mesurée. Un axe C non applicable
(aucun bien immobilier détenu) n'est jamais pénalisé.

### Indicateurs à applicabilité conditionnelle

- **`levier1`** : non applicable si aucun bien immobilier détenu.
- **`diversif1`** et **`capital1`** : non applicable/non pénalisé si aucun
  actif investi déclaré (immobilier locatif, épargne/placements ou parts
  d'entreprise valorisées) — `capital1` note alors 2 (rien à faire
  fructifier n'est pas une faute), tandis que `diversif1` devient non
  applicable (rien à diversifier pour l'instant).

Quand le **fait** qui déterminerait l'applicabilité ou le score est lui-même
inconnu (champ non renseigné, tranche de crédit non précisée), l'indicateur
reste compté au dénominateur de la couverture — il n'est ni exclu, ni noté à
zéro.

## 3. Calcul du score d'axe

```
score_axe = round( (somme des notes connues / nombre de notes connues) × 50 / 5 ) × 5
```

Ce mécanisme (moyenne des indicateurs de l'axe, couverture minimale de 2/3
avant affichage) est inchangé depuis v1.2.0 — seule la **façon d'obtenir**
chaque note d'indicateur change (calculée, plus jamais saisie directement).

- Les indicateurs non applicables sont exclus du calcul et de la couverture.
- Les faits inconnus comptent dans la couverture (dénominateur) mais jamais
  dans la moyenne (numérateur) — jamais convertis en zéro.
- Le score n'est affiché que si la couverture de l'axe est ≥ 2/3. En
  dessous, affichage « Non évalué ». Si aucun indicateur n'est applicable :
  « Non applicable actuellement ».

Niveaux affichés : 0–24 *À structurer* · 25–49 *Premiers repères* ·
50–74 *En construction* · 75–100 *Organisation avancée*.

## 4. Cohérence

`engine.js#detectContradictions` détecte : patrimoine déclaré nul mais
épargne/placements positifs (suspend `diversif1`) ; activité stable mais
parts d'entreprise valorisées à zéro (suspend `capital1`). Une incohérence
non résolue neutralise uniquement les indicateurs concernés (traités comme
non répondus dans le calcul), jamais tout le diagnostic.

## 5. Moteur de priorités

Cinq paliers (`rules.js#PRIORITY_RULES`), l'objectif prioritaire du foyer
départageant les règles de même palier :

1. Fragilité immédiate (épargne mensuelle négative — `capa1 = 0`).
2. Socle à sécuriser (réserve de sécurité < 3 mois — `secu1 = 0`).
3. Cohérence (concentration identifiée, dépendance forte du foyer à
   l'activité sans patrimoine construit en dehors).
4. Organisation (rémunération non arbitrée, argent qui dort, transmission à
   examiner).
5. Pistes de développement (premiers investissements).

Les règles déclenchées sont dédupliquées par sujet sous-jacent (`topic`) et
limitées aux trois premières. S'il n'y a qu'une priorité fondée, une seule
est affichée — jamais complétée artificiellement.

## 6. Carte des leviers

Sept leviers (`rules.js#computeLevers`) : immobilier à crédit, investissement
financier, rémunération du dirigeant, capitalisation en société/holding,
levier bancaire professionnel, fiscalité et frais, transmission. Chacun
renvoie `{status, motif, action}` à partir de faits déclarés. Le levier
« capitalisation en société/holding » se fonde désormais sur une seule
question (`excedentTresorerie`, oui/non/je ne sais pas) au lieu de deux
(l'ancienne question de comparaison d'arbitrage a été retirée — voir section
8) : il ne distingue plus « excédent existant mais mal arbitré » de « déjà
bien arbitré », seulement « excédent à examiner » ou « non prioritaire ».

## 7. Non-résidents fiscaux

Inchangé : si la résidence fiscale déclarée n'est pas la France, ou reste
incertaine, le radar continue de s'afficher normalement, mais les leviers
« Fiscalité et frais » et « Transmission » n'affichent aucune piste fiscale
française comme applicable ; ils orientent vers une analyse transfrontalière.

## 8. Historique des versions

<details>
<summary>v1.0.0 → v1.2.0 (référentiel à ressenti autodéclaré, avant refonte)</summary>

**v1.1.0** a raccourci le parcours à un indicateur par pilier (deux pour la
branche dirigeant), retiré le statut juridique de l'entreprise et fusionné
plusieurs champs de contexte (régime matrimonial, personnes dépendantes,
etc.).

**v1.1.1** a retiré le guide PDF de 3 pages et le bilan PDF exportable.

**v1.2.0** a plafonné chaque question à 4 choix maximum, réduit l'échelle de
notation de 5 niveaux (0-4) à 3 niveaux (0-2), et fusionné les deux choix
« je ne sais pas » / « je préfère ne pas répondre » en un seul.

Dans ce référentiel, chaque indicateur (a1, b1, cred1, div1, cap1, prot1,
p1, p3) était une question directe demandant à la personne d'auto-évaluer sa
propre organisation (« avez-vous une vue complète de vos crédits ? »,
« vos actifs ont-ils un rôle défini ? »). C'est précisément ce principe que
v2.0.0 remplace : voir l'en-tête de ce document.
</details>

<details>
<summary>v2.0.0 — ce qui change concrètement par rapport à v1.2.0</summary>

- **a1** (mois de couverture autodéclarés par choix) → **`secu1`**, calculé
  à partir de deux montants (dépenses essentielles, épargne disponible).
- **b1** (capacité connue, autodéclarée) → **`capa1`**, calculé à partir du
  taux d'épargne réel (épargne mensuelle ÷ revenus). Remplace aussi le champ
  `versementsInvestissement` (trop restrictif : ne captait que l'argent déjà
  investi, pas la vraie capacité d'épargne).
- **cred1** (vue des coûts de crédit, autodéclarée) → **`levier1`**, calculé
  à partir de la détention immobilière et des tranches de crédit déclarées.
  L'axe est renommé « Levier bancaire » (voir section 2) : ce n'est plus un
  contrôle de compréhension du risque de crédit, mais une mesure d'usage du
  levier. La question `creditGate` (dettes/caution/projet de crédit) est
  retirée : elle mélangeait crédit immobilier et consommation sans les
  distinguer.
- **div1** (exposition connue, autodéclarée) → **`diversif1`**, calculé à
  partir du nombre de supports d'épargne distincts détenus, croisé avec la
  concentration déjà calculée par ailleurs (`computeConcentrationFlags`,
  qui existait déjà mais n'alimentait auparavant que le texte d'une
  priorité, jamais le score de l'axe D lui-même).
- **cap1** (rôle des actifs, autodéclaré) → **`capital1`**, calculé à partir
  du support dominant de l'épargne financière et de son montant face au
  besoin de sécurité.
- **prot1** (bénéficiaires/mandataires connus, autodéclaré) →
  **`transmission1`**, calculé à partir d'une question directe sur l'état
  d'avancement réel de la transmission (fait / réflexion / rien / je ne sais
  pas), qui remplace une auto-évaluation par un fait vérifiable.
- **p1** (rémunération optimisée, autodéclaré) → **`remuneration1`** : même
  principe, mais la question porte directement sur le fait (« avez-vous
  comparé... ») plutôt que sur une auto-évaluation de qualité de l'arbitrage.
- **p3 + p3Gate** (excédents pro : existence puis qualité de l'arbitrage) →
  une seule question (`excedentTresorerie`) qui alimente uniquement le
  levier « capitalisation en société/holding » ; il n'y a plus de deuxième
  question sur la qualité de l'arbitrage. L'axe E des dirigeants est
  désormais noté par le même `capital1` universel que pour un particulier.
- **Nouveaux champs de contexte** : `depensesEssentielles`,
  `epargneDisponible`, `epargneMensuelle` (remplace
  `versementsInvestissement`), propriété et tranche de crédit pour la
  résidence principale et les autres biens immobiliers, supports d'épargne
  détenus (+ support dominant), transmission organisée. Le champ
  `dettesTotal` est renommé `dettesAutres` (dettes hors crédits immobiliers,
  ceux-ci étant désormais dérivés des tranches de crédit déclarées).
- **Retiré** : les priorités `p1-argent-expose` (axe E, ancien sens
  « argent exposé à un risque » — incompatible avec le nouveau sens de
  l'axe E, « argent qui dort ») et `p2-engagements-inconnus` (axe C, fondée
  sur la vue des coûts de crédit qui n'est plus mesurée). La priorité
  `p3-objectif-proche-expose` est également retirée : elle reposait sur le
  signal « argent exposé à un risque » de l'ancien cap1, qui n'existe plus.
  Une nouvelle priorité `p4-argent-qui-dort` (axe E, palier 4) couvre
  désormais le signal d'épargne dormante.
</details>

## 9. Ce que cette version ne fait pas

- Aucun barème fiscal ni simulation de droits n'est codé.
- Aucun calcul ne vérifie l'éligibilité réelle à un dispositif, la
  conformité d'un montage ou l'adéquation d'un produit.
- Le loan-to-value de l'axe C repose sur une tranche déclarée, pas un
  montant exact de capital restant dû — voir la note sur « plus de 50 % »
  en section 2.
- Le calcul tourne entièrement dans le navigateur ; aucune vérification
  croisée avec des données externes (cadastre, relevés bancaires, actes)
  n'est effectuée — tout repose sur l'exactitude des déclarations.

## 10. Tests

`tests/engine.test.mjs` couvre chaque seuil de notation par axe, la branche
dirigeant, les priorités et leviers principaux, et des vérifications
d'invariance (déterminisme, thème du Reel sans effet sur le calcul,
monotonie, jamais de conversion silencieuse en zéro). Lancer :

```
node site/diagnostic/tests/engine.test.mjs
```

Aucune dépendance externe n'est requise (assertions natives Node
uniquement).

## 11. Fichiers

- `content.js` — textes uniquement (aucune logique).
- `facts.js` — fonctions pures dérivant des faits déclaratifs (mois de
  couverture, taux d'épargne, levier bancaire, diversification, argent qui
  dort, patrimoine net, concentration…).
- `indicators.js` — un indicateur objectif par pilier : applicabilité et
  `computeScore(context)` — plus aucune question/option n'y est définie,
  puisque la notation ne se saisit plus directement.
- `rules.js` — moteur de priorités et carte des leviers.
- `engine.js` — calcul (scores, couverture, cohérence, résultats
  consolidés). Aucune fonction de ce fichier ne touche au DOM ni au réseau.
- `app.js` — interface (questionnaire de faits déclaratifs, navigation,
  rendu des résultats).
- `radar.js` — dessin du radar (canvas) affiché sur la page de résultats.
- `styles.css` — mise en forme (palette Captain Invest).
