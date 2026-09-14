# Grille du diagnostic patrimonial — documentation et limites

Version de la grille : voir `RULE_VERSION` dans `content.js` (actuellement
`diagnostic-patrimoine-v1.0.0`, datée du 14/09/2026). Toute modification des
seuils, des textes de règles ou du calcul doit incrémenter cette version.

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

| Axe | Nom | Indicateurs particuliers | Compléments dirigeant |
|---|---|---|---|
| A | Sécurité financière | a1 (réserve de sécurité), a2 (protection du foyer) | p2 (trésorerie pro/perso) |
| B | Capacité à investir | b1 (capacité connue), b2 (méthode de décision) | p1 (rémunération) |
| C | Maîtrise du crédit | cred1 (vue des coûts), cred2 (résistance testée) | p4 (financement pro testé) |
| D | Diversification | div1 (exposition connue), div2 (concentrations traitées) | — |
| E | Capitalisation et efficacité | cap1 (rôle des actifs), cap2 (frais/fiscalité comparés) | p3 (excédents pro organisés) |
| F | Protection et transmission | prot1 (bénéficiaires/mandataires connus), prot2 (mesures prises) | — |

Chaque indicateur note de 0 à 4, décrit exactement dans `indicators.js`
(logique d'applicabilité) et `content.js` (textes des questions et options).
Un indicateur ne pondère qu'un seul axe.

### Indicateurs à applicabilité conditionnelle

- **cred2** : non applicable si aucune dette ni projet de crédit déclaré
  (porte `creditGate`, posée dans la carte de cred1).
- **div1 / div2** : non applicables si aucun actif investi déclaré
  (immobilier locatif, placements financiers, cryptoactifs ou parts
  d'entreprise valorisées).
- **cap2** : non applicable si ni investissement ni décision de financement
  engagée.
- **p3** : non applicable si aucun excédent professionnel durable déclaré
  (porte `p3Gate`).
- **p4** : non applicable si aucune dette professionnelle, caution ou
  projet de financement déclaré (porte `p4Gate`).

Quand le **fait** qui déterminerait l'applicabilité est lui-même inconnu
(porte répondue « je ne sais pas », ou champ de patrimoine non renseigné),
l'indicateur reste compté au dénominateur de la couverture — il n'est ni
exclu, ni noté à zéro. C'est délibéré : une applicabilité incertaine reste
« à clarifier », elle n'améliore jamais la couverture affichée.

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

`engine.js#detectContradictions` détecte notamment : aucune dette déclarée
mais des mensualités positives ; patrimoine déclaré nul mais placements
positifs ; réserve de 12 mois calculée mais liquidités nulles ; activité
stable mais parts d'entreprise valorisées à zéro ; versements
d'investissement supérieurs au surplus mensuel avant investissement. Une
incohérence non résolue neutralise uniquement les indicateurs concernés
(traités comme non répondus dans le calcul), jamais tout le diagnostic.

## 5. Moteur de priorités

Cinq paliers, dans cet ordre (`rules.js#PRIORITY_RULES`), l'objectif
prioritaire du foyer (C4) départageant les règles de même palier :

1. Fragilité immédiate déclarée (impayés, dépenses non couvertes, argent
   exposé nécessaire à des dépenses proches).
2. Socle à clarifier ou sécuriser (réserve < 1 mois, engagements de crédit
   mal connus, trésorerie pro/perso mélangée).
3. Cohérence (objectif proche et argent exposé, concentration sans
   stratégie, dépendance forte du foyer à l'activité).
4. Organisation (fiscalité/frais non comparés, rémunération non arbitrée,
   capitalisation à organiser, transmission à examiner).
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
concentration (>70 % immobilier, >50 % entreprise, >20 % crypto, sur les
actifs bruts connus) sont des repères pédagogiques, pas des injonctions —
aucune règle ne recommande de vendre.

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
- Les indicateurs entrepreneur (P1-P4) ne couvrent pas tous les statuts
  juridiques avec la même précision (l'EI/micro et la société à l'IS ne
  sont pas distinguées dans le calcul lui-même, seulement dans le contexte
  affiché).
- La détection de concentration utilise les valeurs brutes déclarées ; une
  valorisation incomplète (ex. parts d'entreprise à valeur inconnue) réduit
  la fiabilité du pourcentage, auquel cas aucun pourcentage n'est affiché.
- Le calcul tourne entièrement dans le navigateur ; aucune vérification
  croisée avec des données externes (cadastre, relevés bancaires, actes)
  n'est effectuée — tout repose sur l'exactitude des déclarations.

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
- `facts.js` — petites fonctions dérivant des faits déclaratifs (réserve,
  présence d'investissements, concentration, patrimoine net…).
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
