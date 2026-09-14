// content.js — textes uniquement (aucune logique). Modifier ce fichier ne change
// jamais un calcul ; seuls indicators.js et rules.js portent la logique de score.
'use strict';

export const RULE_VERSION = 'diagnostic-patrimoine-v1.0.0';
export const RULE_DATE = '2026-09-14';

export const AXES = [
  { id: 'A', name: 'Sécurité financière', short: 'Sécurité' },
  { id: 'B', name: 'Capacité à investir', short: 'Capacité' },
  { id: 'C', name: 'Maîtrise du crédit', short: 'Crédit' },
  { id: 'D', name: 'Diversification', short: 'Diversif.' },
  { id: 'E', name: 'Capitalisation et efficacité', short: 'Capital.' },
  { id: 'F', name: 'Protection et transmission', short: 'Protect.' },
];

export const LEVELS = [
  { max: 24, id: 'a-structurer', label: 'À structurer' },
  { max: 49, id: 'premiers-reperes', label: 'Premiers repères' },
  { max: 74, id: 'en-construction', label: 'En construction' },
  { max: 100, id: 'organisation-avancee', label: 'Organisation avancée' },
];

// Introductions adaptables au thème du Reel — n'influencent jamais le calcul,
// seulement le texte d'accroche affiché avant le questionnaire (section 1).
export const REEL_INTROS = {
  default: 'Après ce Reel, une question simple : votre patrimoine est-il organisé pour tenir vos objectifs ?',
  immobilier: 'Vous venez de voir un Reel sur l’immobilier. Voyons maintenant comment il s’intègre dans l’ensemble de votre patrimoine.',
  placements: 'Vous venez de voir un Reel sur les placements financiers. Voyons comment ils s’intègrent dans votre organisation globale.',
  remuneration: 'Vous venez de voir un Reel sur la rémunération du dirigeant. Voyons comment elle s’articule avec le reste de votre patrimoine.',
  holding: 'Vous venez de voir un Reel sur la holding. Voyons si votre situation justifie d’aller plus loin sur ce sujet — ou pas encore.',
  credit: 'Vous venez de voir un Reel sur le crédit. Voyons comment il s’inscrit dans votre organisation patrimoniale.',
  fiscalite: 'Vous venez de voir un Reel sur la fiscalité. Voyons ce qu’il en est du reste de votre organisation patrimoniale.',
  transmission: 'Vous venez de voir un Reel sur la transmission. Voyons où vous en êtes sur l’ensemble de vos six piliers.',
};

export const HERO = {
  title: 'Votre patrimoine : les leviers que vous n’utilisez pas encore',
  subtitle: 'Découvrez vos points forts, vos angles morts et les prochaines étapes pour mieux organiser votre patrimoine.',
  ctaPrimary: 'Faire mon diagnostic',
  ctaSecondary: 'Découvrir les 6 piliers',
  promise: 'Cet outil vous aide à repérer les sujets à étudier et leur ordre de priorité. Il ne promet ni enrichissement, ni rendement, ni économie d’impôt chiffrée, ni validation d’un montage.',
};

export const PILLARS_INTRO = {
  eyebrow: 'LES 6 PILIERS DE VOTRE ORGANISATION PATRIMONIALE',
  title: 'Ce que le diagnostic regarde vraiment.',
  text: 'Aucun de ces piliers n’est jugé sur ce que vous possédez. Ce qui compte, c’est la cohérence de vos décisions avec vos objectifs, vos contraintes et les risques que vous portez.',
};

export const PILLARS = [
  { axis: 'A', title: 'Sécurité financière', text: 'Une réserve disponible en cas de coup dur, et une protection du foyer si un revenu s’arrête.' },
  { axis: 'B', title: 'Capacité à investir', text: 'Savoir ce que vous pouvez réellement investir, et selon quelle règle vous décidez de le faire.' },
  { axis: 'C', title: 'Maîtrise du crédit', text: 'Une vue complète du coût de vos engagements, et leur résistance à un imprévu.' },
  { axis: 'D', title: 'Diversification', text: 'Savoir à quoi vous êtes réellement exposé, et ce que vous faites de vos concentrations.' },
  { axis: 'E', title: 'Capitalisation et efficacité', text: 'Donner un rôle à chaque actif, et comparer frais et fiscalité avant de décider.' },
  { axis: 'F', title: 'Protection et transmission', text: 'Savoir qui recevrait quoi, qui pourrait agir pour vous, et si les mesures nécessaires ont été prises.' },
];

// --- Écrans de contexte (non notés) ---------------------------------------

export const SITUATION_OPTIONS = [
  { value: 'salarie', label: 'Salarié(e)' },
  { value: 'independant', label: 'Indépendant(e)' },
  { value: 'dirigeant', label: 'Dirigeant(e) de société' },
  { value: 'retraite', label: 'Retraité(e)' },
  { value: 'autre', label: 'Autre situation' },
];

export const AGE_BRACKETS = [
  { value: 'moins-30', label: 'Moins de 30 ans' },
  { value: '30-44', label: '30 à 44 ans' },
  { value: '45-59', label: '45 à 59 ans' },
  { value: '60-74', label: '60 à 74 ans' },
  { value: '75-plus', label: '75 ans et plus' },
];

export const FOYER_OPTIONS = [
  { value: 'seul', label: 'Seul(e)' },
  { value: 'concubinage', label: 'En concubinage' },
  { value: 'pacs', label: 'Pacsé(e)' },
  { value: 'mariage', label: 'Marié(e)' },
];

export const REGIME_OPTIONS = [
  { value: 'communaute-acquets', label: 'Communauté réduite aux acquêts' },
  { value: 'separation-biens', label: 'Séparation de biens' },
  { value: 'communaute-universelle', label: 'Communauté universelle' },
  { value: 'autre', label: 'Autre régime' },
  { value: 'inconnu', label: 'Je ne sais pas' },
];

export const RESIDENCE_FISCALE_OPTIONS = [
  { value: 'france', label: 'France' },
  { value: 'autre', label: 'Un autre pays' },
  { value: 'incertaine', label: 'Je ne suis pas sûr(e)' },
];

export const OBJECTIF_OPTIONS = [
  { value: 'securiser', label: 'Sécuriser le foyer' },
  { value: 'residence-principale', label: 'Acheter sa résidence principale' },
  { value: 'immobilier', label: 'Investir dans l’immobilier' },
  { value: 'placements', label: 'Développer des placements financiers' },
  { value: 'retraite', label: 'Préparer la retraite' },
  { value: 'remuneration', label: 'Organiser les revenus professionnels' },
  { value: 'entreprise', label: 'Développer ou céder l’entreprise' },
  { value: 'transmission', label: 'Transmettre' },
];

export const ECHEANCE_OPTIONS = [
  { value: 'moins-3', label: 'Moins de 3 ans' },
  { value: '3-8', label: '3 à 8 ans' },
  { value: 'plus-8', label: 'Plus de 8 ans' },
  { value: 'inconnue', label: 'Échéance inconnue' },
];

export const STABILITE_REVENUS_OPTIONS = [
  { value: 'stable', label: 'Stables' },
  { value: 'irregulier', label: 'Irréguliers' },
];

export const STATUT_JURIDIQUE_OPTIONS = [
  { value: 'ei-micro', label: 'Entreprise individuelle / micro-entreprise' },
  { value: 'societe-ir', label: 'Société à l’impôt sur le revenu' },
  { value: 'societe-is', label: 'Société à l’impôt sur les sociétés' },
  { value: 'inconnu', label: 'Je ne sais pas' },
];

export const ACTIVITE_STABILITE_OPTIONS = [
  { value: 'stable', label: 'Stable' },
  { value: 'variable', label: 'Variable' },
  { value: 'lancement', label: 'En phase de lancement' },
  { value: 'difficultes', label: 'En difficulté' },
];

export const PART_REVENUS_OPTIONS = [
  { value: 'moins-25', label: 'Moins de 25 %' },
  { value: '25-50', label: '25 à 50 %' },
  { value: '50-75', label: '50 à 75 %' },
  { value: 'plus-75', label: 'Plus de 75 %' },
  { value: 'inconnue', label: 'Je ne sais pas' },
];

export const OUI_NON_INCONNU = [
  { value: 'oui', label: 'Oui' },
  { value: 'non', label: 'Non' },
  { value: 'inconnu', label: 'Je ne sais pas' },
];

export const CONTEXT_LABELS = {
  situation: 'Votre situation',
  foyer: 'Votre foyer',
  residenceFiscale: 'Votre résidence fiscale',
  objectifs: 'Vos objectifs',
  capacite: 'Votre capacité financière',
  patrimoine: 'Votre patrimoine',
  entreprise: 'Votre activité',
};

// --- Textes des indicateurs notés (voir indicators.js pour la logique) ---

export const INDICATOR_TEXTS = {
  a1: {
    question: 'Si vos revenus s’arrêtaient, combien de temps votre argent immédiatement disponible couvrirait-il vos dépenses essentielles et vos crédits ?',
    helper: 'On exclut la trésorerie nécessaire à l’entreprise, les fonds bloqués et l’argent déjà réservé aux impôts ou à des projets engagés.',
    directQuestion: 'Combien de mois de dépenses essentielles votre réserve disponible couvrirait-elle ?',
  },
  a2: {
    question: 'En cas d’arrêt de travail, de décès ou de perte durable d’un revenu, savez-vous comment le foyer serait protégé ?',
    helper: 'Comptent les couvertures publiques ou employeur, les ressources du foyer, et une décision motivée de ne pas s’assurer.',
    options: [
      { value: 0, label: 'Je n’ai jamais vérifié' },
      { value: 1, label: 'Je connais mes couvertures, mais je n’ai pas évalué mes besoins' },
      { value: 2, label: 'J’ai évalué mes besoins, avec des lacunes identifiées' },
      { value: 3, label: 'J’ai comparé besoins et couvertures, un plan est en cours' },
      { value: 4, label: 'Mon organisation est revue et cohérente avec ma situation' },
    ],
  },
  b1: {
    question: 'Savez-vous ce que vous pouvez investir après vos dépenses, crédits, impôts et projets proches ?',
    helper: null,
    options: [
      { value: 0, label: 'Non, et mes engagements sont financés à découvert' },
      { value: 1, label: 'Non, je n’ai pas d’estimation' },
      { value: 2, label: 'J’ai une estimation partielle' },
      { value: 3, label: 'Je connais ma capacité, mais je ne l’actualise pas régulièrement' },
      { value: 4, label: 'Je connais ma capacité et je la suis, même si elle est temporairement nulle' },
    ],
  },
  b2: {
    question: 'Comment décidez-vous des sommes à investir ?',
    helper: null,
    options: [
      { value: 0, label: 'Mes investissements compromettent mes dépenses indispensables' },
      { value: 1, label: 'Sans règle ni vérification' },
      { value: 2, label: 'Par versements occasionnels qui respectent mon budget' },
      { value: 3, label: 'Selon une règle adaptée, appliquée la plupart du temps' },
      { value: 4, label: 'Selon une règle suivie et ajustée à mes projets — ou une pause volontaire documentée' },
    ],
  },
  creditGate: {
    question: 'Avez-vous des dettes personnelles en cours, une caution, ou un projet de crédit à l’étude ?',
  },
  cred1WithDebt: {
    question: 'Avez-vous une vue complète du coût et des engagements de vos crédits ?',
    options: [
      { value: 0, label: 'Aucune vue' },
      { value: 1, label: 'Je connais les mensualités seules' },
      { value: 2, label: 'Je connais les mensualités et les échéances' },
      { value: 3, label: 'Je connais le taux, les assurances, les échéances et le capital restant dû' },
      { value: 4, label: 'Vue complète, incluant garanties, cautions et risques de taux éventuels' },
    ],
  },
  cred1NoDebt: {
    question: 'Disposez-vous d’une vérification de vos engagements et cautions éventuelles ?',
    options: [
      { value: 4, label: 'Oui, absence d’engagement confirmée' },
      { value: null, label: 'Incertain' },
    ],
  },
  cred2: {
    question: 'Avez-vous testé votre capacité à tenir en cas de baisse de revenus ou de dépenses imprévues ?',
    helper: null,
    options: [
      { value: 0, label: 'J’ai des difficultés actuelles de paiement' },
      { value: 1, label: 'Aucun test' },
      { value: 2, label: 'Une intuition, sans calcul' },
      { value: 3, label: 'Un scénario chiffré' },
      { value: 4, label: 'Un scénario chiffré, avec une réponse prévue' },
    ],
  },
  div1: {
    question: 'Savez-vous à quels actifs, secteurs et zones vos placements sont réellement exposés ?',
    helper: null,
    options: [
      { value: 0, label: 'Aucune vue d’ensemble' },
      { value: 1, label: 'Je connais seulement les noms des produits' },
      { value: 2, label: 'Les principales familles d’actifs sont identifiées' },
      { value: 3, label: 'Expositions et concentrations sont repérées' },
      { value: 4, label: 'Vue consolidée, incluant entreprise et actifs détenus via des structures' },
    ],
  },
  div2: {
    question: 'Que faites-vous de vos principales concentrations ?',
    helper: null,
    options: [
      { value: 0, label: 'Un risque est identifié, incompatible avec un besoin proche, sans solution' },
      { value: 1, label: 'Aucune analyse' },
      { value: 2, label: 'La concentration est connue, sans stratégie' },
      { value: 3, label: 'Stratégie de diversification — ou maintien motivé compatible avec mes contraintes' },
      { value: 4, label: 'Stratégie suivie et réévaluée' },
    ],
  },
  cap1: {
    question: 'Vos actifs et les revenus qu’ils produisent ont-ils un rôle défini dans vos objectifs ?',
    helper: null,
    options: [
      { value: 0, label: 'De l’argent nécessaire à court terme est exposé à un risque incompatible' },
      { value: 1, label: 'Aucun lien entre mes actifs et mes projets' },
      { value: 2, label: 'Les horizons sont partiellement distingués' },
      { value: 3, label: 'Horizons et règle d’utilisation ou de réinvestissement sont définis' },
      { value: 4, label: 'Un plan est suivi et ajusté' },
    ],
    noInvestmentOptions: [
      { value: 1, label: 'Je n’ai pas encore formalisé de projet' },
      { value: 3, label: 'J’ai défini des horizons et une règle pour mes futurs investissements' },
      { value: 4, label: 'J’ai un plan que je suis et j’ajuste' },
    ],
  },
  cap2: {
    question: 'Connaissez-vous les frais et les conséquences fiscales de vos principaux choix ?',
    helper: null,
    options: [
      { value: 0, label: 'Aucune vérification' },
      { value: 1, label: 'Fiscalité ou frais partiellement connus' },
      { value: 2, label: 'Les deux sont identifiés approximativement' },
      { value: 3, label: 'Une comparaison a été faite avant les décisions importantes' },
      { value: 4, label: 'Comparaison actualisée, intégrant disponibilité, risques et objectifs' },
    ],
  },
  prot1: {
    question: 'Savez-vous qui recevrait votre patrimoine et qui pourrait agir en cas d’incapacité ?',
    helper: null,
    options: [
      { value: 0, label: 'Ce sujet n’a jamais été examiné' },
      { value: 1, label: 'J’ai formulé des intentions, sans plus' },
      { value: 2, label: 'Règles et bénéficiaires sont partiellement vérifiés' },
      { value: 3, label: 'Ma situation familiale et professionnelle a été examinée' },
      { value: 4, label: 'Organisation et documents vérifiés depuis ma dernière évolution importante' },
    ],
  },
  prot2: {
    question: 'Les mesures correspondant à vos souhaits ont-elles été prises ?',
    helper: null,
    options: [
      { value: 0, label: 'Une incompatibilité connue n’a pas été traitée' },
      { value: 1, label: 'Aucune démarche, malgré un besoin identifié' },
      { value: 2, label: 'Des mesures partielles ont été prises' },
      { value: 3, label: 'Les mesures essentielles ont été réalisées' },
      { value: 4, label: 'Organisation cohérente et suivie — ou décision motivée de différer' },
    ],
    dontKnowIfNeeded: 'Je ne sais pas si des mesures sont nécessaires',
  },
  p1: {
    question: 'Votre mode de rémunération a-t-il été comparé en tenant compte de votre revenu disponible, de votre protection sociale et des besoins de l’entreprise ?',
    helper: null,
    options: [
      { value: 0, label: 'Jamais' },
      { value: 1, label: 'Une réflexion partielle' },
      { value: 2, label: 'Une comparaison ancienne, devenue inadaptée' },
      { value: 3, label: 'Une comparaison cohérente avec ma situation actuelle' },
      { value: 4, label: 'Un arbitrage suivi et revu lors des changements importants' },
    ],
  },
  p2: {
    question: 'Distinguez-vous la trésorerie nécessaire à l’activité de l’argent durablement disponible ?',
    helper: null,
    options: [
      { value: 0, label: 'Non' },
      { value: 1, label: 'Le solde bancaire est assimilé à de l’argent libre' },
      { value: 2, label: 'Les charges immédiates sont provisionnées' },
      { value: 3, label: 'Impôts, échéances et besoin d’exploitation sont intégrés' },
      { value: 4, label: 'Une prévision inclut une marge de sécurité adaptée et actualisée' },
    ],
  },
  p3Gate: {
    question: 'Votre activité dégage-t-elle des excédents de trésorerie durables, au-delà des besoins d’exploitation, des impôts et des projets déjà engagés ?',
  },
  p3: {
    question: 'L’utilisation de ces excédents professionnels est-elle organisée ?',
    helper: null,
    options: [
      { value: 0, label: 'Aucune réflexion' },
      { value: 1, label: 'Des choix ponctuels' },
      { value: 2, label: 'Des objectifs définis, sans comparaison' },
      { value: 3, label: 'Comparaison entre réinvestissement, détention professionnelle et sortie personnelle' },
      { value: 4, label: 'Arbitrage suivi, coûts et contraintes intégrés' },
    ],
  },
  p4Gate: {
    question: 'Avez-vous une dette professionnelle, une caution en cours, ou un projet professionnel avec financement envisagé ?',
  },
  p4: {
    question: 'Le financement a-t-il été testé sur les flux de l’activité et vos engagements personnels ?',
    helper: null,
    options: [
      { value: 0, label: 'Des difficultés actuelles existent' },
      { value: 1, label: 'Aucun examen' },
      { value: 2, label: 'La mensualité seule a été regardée' },
      { value: 3, label: 'Un plan de financement et des flux prévisionnels existent' },
      { value: 4, label: 'Scénarios défavorables, garanties et effets sur le foyer examinés' },
    ],
  },
};

export const DONT_KNOW_LABEL = 'Je ne sais pas';
export const PREFER_NOT_TO_SAY_LABEL = 'Je préfère ne pas répondre';

// --- Leviers -----------------------------------------------------------

export const LEVER_LABELS = {
  immobilierCredit: 'Immobilier à crédit',
  investissementFinancier: 'Investissement financier',
  remunerationDirigeant: 'Rémunération du dirigeant',
  capitalisationHolding: 'Capitalisation en société / holding',
  levierBancairePro: 'Levier bancaire professionnel',
  fiscaliteFrais: 'Fiscalité et frais',
  transmission: 'Transmission',
};

export const LEVER_STATUS_LABELS = {
  deja_mobilise: 'Déjà mobilisé',
  a_examiner: 'À examiner',
  a_differer: 'À différer',
  non_prioritaire: 'Non prioritaire actuellement',
  informations_insuffisantes: 'Informations insuffisantes',
};

// --- Mentions légales et limites ----------------------------------------

export const LEGAL_MENTION = 'Cet outil propose une lecture pédagogique de votre organisation patrimoniale à partir de vos déclarations. Les scores reposent sur une grille indicative ; ils ne constituent ni une expertise, ni un conseil personnalisé en investissement, fiscalité, droit ou assurance. L’outil ne vérifie pas l’éligibilité à un dispositif, la conformité d’un montage ou l’adéquation d’un produit. Les résultats dépendent de l’exactitude et de la complétude des réponses et ne garantissent aucun rendement ni économie. Toute décision importante nécessite une analyse de votre situation avec les professionnels compétents.';

export const NON_RESIDENT_NOTICE = 'Votre résidence fiscale n’est pas la France, ou reste incertaine. Ce diagnostic reste utilisable pour une lecture générale de votre organisation patrimoniale, mais les pistes fiscales françaises ne sont pas présentées ici comme applicables à votre situation. Une analyse transfrontalière dédiée est nécessaire avant toute décision liée à la fiscalité ou à la transmission.';

export const PRIVACY_NOTE = 'Vos réponses restent dans votre navigateur : aucun calcul n’est envoyé à un serveur, à un outil publicitaire ou à un service de mesure d’audience. Rien n’est enregistré automatiquement sur cet appareil — vous pouvez choisir de sauvegarder localement, et effacer cette sauvegarde à tout moment.';

// --- Guide pédagogique (3 pages) -----------------------------------------

export const GUIDE = {
  page1: {
    title: 'Gagner de l’argent ne suffit pas. Il faut l’organiser.',
    intro: 'Un patrimoine solide ne repose pas sur un placement miracle. Il repose sur des décisions qui se complètent : garder une marge de sécurité, investir avec un objectif, utiliser le crédit avec discernement et préparer la suite. Avant de chercher le prochain investissement, regardez comment fonctionne l’ensemble.',
    blocks: [
      {
        n: 1,
        title: 'Sécuriser',
        text: 'Argent disponible pour les imprévus, protection des revenus et du foyer.',
        action: 'Comptez les mois de dépenses essentielles couverts sans revenus.',
      },
      {
        n: 2,
        title: 'Transformer ses revenus en actifs',
        text: 'Connaître ce qui reste réellement après dépenses, crédits, impôts et projets proches. Pour un dirigeant, distinguer revenu personnel et argent nécessaire à l’activité.',
        action: 'Établissez une capacité d’investissement réaliste.',
      },
      {
        n: 3,
        title: 'Utiliser le crédit',
        text: 'Il permet de financer un actif sans disposer immédiatement de tout son prix, mais crée des engagements. Le projet doit tenir après charges et imprévus.',
        action: 'Testez un scénario défavorable avant d’emprunter.',
      },
    ],
    callout: 'La première bonne décision n’est pas toujours d’investir plus. Elle peut être de retrouver une marge de manœuvre.',
  },
  page2: {
    title: 'Faire grandir ce que vous avez construit',
    blocks: [
      {
        n: 4,
        title: 'Investir dans le temps',
        text: 'Affecter l’argent à des horizons distincts. Le réinvestissement des revenus peut soutenir la croissance du capital ; les pertes et les frais pèsent aussi. En immobilier, le remboursement du capital réduit la dette, sans garantir la rentabilité globale.',
        action: 'Attribuez un objectif et une échéance à chaque poche d’argent.',
      },
      {
        n: 5,
        title: 'Maîtriser fiscalité et frais',
        text: 'Comparer ce qu’il reste après coûts, impôts et contraintes. Une réduction d’impôt ne suffit pas à rendre une opération intéressante. Pour le dirigeant : rémunération, capitalisation personnelle ou professionnelle, financement et, si utile, holding.',
        action: 'Faites comparer les options à situation et objectif identiques.',
      },
      {
        n: 6,
        title: 'Préparer la transmission',
        text: 'Clarifier ses souhaits et vérifier la protection du conjoint, des proches et la continuité de l’entreprise. Donation, démembrement et organisation sociétaire sont des outils à examiner selon la situation.',
        action: 'Écrivez qui doit recevoir quoi, et dans quelles conditions.',
      },
    ],
    callout: 'Votre entreprise peut être votre premier actif et votre première source de revenus. Construire un patrimoine hors de l’entreprise permet d’étudier une moindre dépendance au même risque.',
  },
  page3: {
    title: 'Deux règles pour relier toutes vos décisions',
    sections: [
      {
        title: 'Diversification',
        text: 'Compter les sources de risque, pas les contrats. Plusieurs biens dans une même zone, ou plusieurs enveloppes investies dans les mêmes actifs, peuvent rester concentrés. La diversification réduit certaines dépendances ; elle n’empêche pas toutes les pertes.',
      },
      {
        title: 'Temps et capitalisation',
        text: 'Investir avec régularité, et laisser une part des revenus produire à son tour des revenus, peut soutenir la construction du patrimoine. L’horizon, les retraits, les frais, la fiscalité et les résultats réels changent la trajectoire. Le temps ne transforme pas automatiquement un mauvais investissement en bon investissement.',
      },
    ],
    plan: {
      title: 'Plan d’action',
      items: [
        'Cette semaine : recenser actifs, dettes et réserves.',
        'Ce mois-ci : traiter le premier angle mort de votre diagnostic.',
        'Avant votre prochaine décision importante : vérifier son effet sur la trésorerie, la concentration et les objectifs familiaux.',
      ],
    },
    conclusion: 'Ne cherchez pas à activer tous les leviers. Choisissez ceux qui servent votre situation, dans le bon ordre.',
    signature: 'Je m’appelle Rashan. 25 ans de finance. Je vous aide à relier vos revenus, vos investissements et vos décisions patrimoniales.',
    finalMention: 'Ce guide et ce diagnostic sont pédagogiques. Ils ne remplacent pas une analyse personnalisée de votre situation.',
  },
};
