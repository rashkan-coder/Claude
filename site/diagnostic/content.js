// content.js — textes uniquement (aucune logique). Modifier ce fichier ne change
// jamais un calcul ; seuls indicators.js et rules.js portent la logique de score.
'use strict';

export const RULE_VERSION = 'diagnostic-patrimoine-v1.2.0';
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
  title: 'Votre patrimoine : les leviers que vous n’utilisez pas encore',
  subtitle: 'Découvrez vos points forts, vos angles morts et les prochaines étapes pour mieux organiser votre patrimoine.',
  ctaPrimary: 'Faire mon diagnostic',
  ctaSecondary: 'Découvrir les 6 piliers',
  promise: 'Cet outil vous aide à repérer les sujets à étudier et leur ordre de priorité. Il ne promet ni enrichissement, ni rendement, ni économie d’impôt chiffrée, ni validation d’un montage.',
};

// Disclaimer court, affiché bien en évidence (accueil + questionnaire), en
// plus de la mention légale complète (LEGAL_MENTION) affichée sous les
// résultats.
export const SHORT_DISCLAIMER = 'Ce diagnostic est une estimation pédagogique à partir de vos réponses — quelques minutes suffisent. Aucun engagement de votre part, aucun résultat garanti.';

export const PILLARS_INTRO = {
  eyebrow: 'LES 6 PILIERS DE VOTRE ORGANISATION PATRIMONIALE',
  title: 'Ce que le diagnostic regarde vraiment.',
  text: 'Aucun de ces piliers n’est jugé sur ce que vous possédez. Ce qui compte, c’est la cohérence de vos décisions avec vos objectifs, vos contraintes et les risques que vous portez.',
};

export const PILLARS = [
  { axis: 'A', title: 'Sécurité financière', text: 'Une réserve disponible en cas de coup dur.' },
  { axis: 'B', title: 'Capacité à investir', text: 'Savoir ce que vous pouvez réellement investir.' },
  { axis: 'C', title: 'Maîtrise du crédit', text: 'Une vue claire du coût de vos engagements.' },
  { axis: 'D', title: 'Diversification', text: 'Savoir à quoi vous êtes réellement exposé.' },
  { axis: 'E', title: 'Capitalisation et efficacité', text: 'Donner un rôle à chaque actif.' },
  { axis: 'F', title: 'Protection et transmission', text: 'Savoir qui recevrait quoi, et qui pourrait agir pour vous.' },
];

// --- Écrans de contexte (non notés) — volontairement réduits au minimum ---

export const SITUATION_OPTIONS = [
  { value: 'salarie', label: 'Salarié(e)' },
  { value: 'entrepreneur', label: 'Indépendant(e) ou dirigeant(e)' },
  { value: 'retraite', label: 'Retraité(e)' },
  { value: 'autre', label: 'Autre situation' },
];

export const AGE_BRACKETS = [
  { value: 'moins-35', label: 'Moins de 35 ans' },
  { value: '35-54', label: '35 à 54 ans' },
  { value: '55-74', label: '55 à 74 ans' },
  { value: '75-plus', label: '75 ans et plus' },
];

export const FOYER_OPTIONS = [
  { value: 'seul', label: 'Seul(e)' },
  { value: 'concubinage', label: 'En concubinage' },
  { value: 'pacs', label: 'Pacsé(e)' },
  { value: 'mariage', label: 'Marié(e)' },
];

export const RESIDENCE_FISCALE_OPTIONS = [
  { value: 'france', label: 'France' },
  { value: 'autre', label: 'Un autre pays' },
  { value: 'incertaine', label: 'Je ne suis pas sûr(e)' },
];

export const OBJECTIF_OPTIONS = [
  { value: 'immobilier', label: 'Investir dans l’immobilier' },
  { value: 'placements', label: 'Développer mon épargne et mes placements' },
  { value: 'entreprise', label: 'Développer mon entreprise' },
  { value: 'transmission', label: 'Protéger mes proches et transmettre' },
];

export const ECHEANCE_OPTIONS = [
  { value: 'moins-3', label: 'Moins de 3 ans' },
  { value: '3-8', label: '3 à 8 ans' },
  { value: 'plus-8', label: 'Plus de 8 ans' },
  { value: 'inconnue', label: 'Échéance inconnue' },
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
  { value: 'plus-50', label: 'Plus de 50 %' },
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
  objectifs: 'Votre objectif',
  capacite: 'Votre capacité financière',
  patrimoine: 'Votre patrimoine',
  entreprise: 'Votre activité',
};

// --- Textes des indicateurs notés (voir indicators.js pour la logique) ---
// Réduits à un indicateur par pilier (deux pour la branche dirigeant/
// indépendant) pour raccourcir le parcours, et à une échelle à 3 niveaux
// (0/1/2 : non / partiellement / oui) au lieu de 5, pour ne jamais proposer
// plus de 4 choix par question (3 niveaux + « je ne sais pas / je préfère
// ne pas répondre »).

export const INDICATOR_TEXTS = {
  a1: {
    question: 'Si vos revenus s’arrêtaient, combien de temps votre épargne immédiatement disponible couvrirait-elle vos dépenses et vos crédits ?',
    helper: 'Une estimation suffit — on exclut la trésorerie nécessaire à l’entreprise et l’argent déjà réservé à un projet.',
    options: [
      { value: 0, label: 'Moins de 3 mois' },
      { value: 1, label: '3 à 12 mois' },
      { value: 2, label: 'Plus de 12 mois' },
    ],
  },
  b1: {
    question: 'Savez-vous ce que vous pouvez investir après vos dépenses, crédits, impôts et projets proches ?',
    helper: null,
    options: [
      { value: 0, label: 'Non, mes dépenses dépassent mes revenus disponibles' },
      { value: 1, label: 'J’ai une estimation approximative' },
      { value: 2, label: 'Je la connais précisément et je la suis' },
    ],
  },
  creditGate: {
    question: 'Avez-vous des dettes personnelles en cours, une caution, ou un projet de crédit à l’étude ?',
  },
  cred1WithDebt: {
    question: 'Avez-vous une vue complète du coût et des engagements de vos crédits ?',
    options: [
      { value: 0, label: 'Aucune vue d’ensemble' },
      { value: 1, label: 'Je connais les grandes lignes (mensualités, échéances)' },
      { value: 2, label: 'Vue complète (taux, assurances, garanties)' },
    ],
  },
  cred1NoDebt: {
    question: 'Disposez-vous d’une vérification de vos engagements et cautions éventuelles ?',
    options: [
      { value: 2, label: 'Oui, absence d’engagement confirmée' },
      { value: null, label: 'Incertain' },
    ],
  },
  div1: {
    question: 'Savez-vous à quels actifs, secteurs et zones vos placements sont réellement exposés ?',
    helper: null,
    options: [
      { value: 0, label: 'Aucune vue d’ensemble' },
      { value: 1, label: 'Je connais les grandes catégories' },
      { value: 2, label: 'Vue précise, y compris via mon entreprise ou mes structures' },
    ],
  },
  cap1: {
    question: 'Vos actifs et les revenus qu’ils produisent ont-ils un rôle défini dans vos objectifs ?',
    helper: null,
    options: [
      { value: 0, label: 'Non, de l’argent nécessaire à court terme est mal protégé' },
      { value: 1, label: 'Partiellement — certains horizons sont distingués' },
      { value: 2, label: 'Oui, chaque actif a un rôle et une règle suivie' },
    ],
    noInvestmentOptions: [
      { value: 0, label: 'Pas encore de projet formalisé' },
      { value: 1, label: 'J’ai défini des horizons et une règle' },
      { value: 2, label: 'J’ai un plan que je suis et j’ajuste' },
    ],
  },
  prot1: {
    question: 'Savez-vous qui recevrait votre patrimoine et qui pourrait agir en cas d’incapacité ?',
    helper: null,
    options: [
      { value: 0, label: 'Jamais examiné' },
      { value: 1, label: 'Partiellement (intentions ou vérifications partielles)' },
      { value: 2, label: 'Oui, organisation vérifiée et à jour' },
    ],
  },
  p1: {
    question: 'Votre rémunération de dirigeant a-t-elle déjà été optimisée ?',
    helper: 'En tenant compte de votre revenu disponible, de votre protection sociale et des besoins de l’entreprise.',
    options: [
      { value: 0, label: 'Jamais' },
      { value: 1, label: 'Une réflexion partielle ou ancienne' },
      { value: 2, label: 'Oui, une comparaison à jour' },
    ],
  },
  p3Gate: {
    question: 'Votre activité dégage-t-elle des excédents de trésorerie durables, au-delà des besoins d’exploitation, des impôts et des projets déjà engagés ?',
  },
  p3: {
    question: 'L’utilisation de ces excédents professionnels est-elle organisée ?',
    helper: null,
    options: [
      { value: 0, label: 'Aucune réflexion' },
      { value: 1, label: 'Des choix ponctuels, sans comparaison' },
      { value: 2, label: 'Oui, un arbitrage comparé et suivi' },
    ],
  },
};

export const DONT_KNOW_LABEL = 'Je ne sais pas';
export const PREFER_NOT_TO_SAY_LABEL = 'Je préfère ne pas répondre';
// Option unique utilisée sur les cartes de questions notées, pour ne
// jamais dépasser 4 choix par question (3 niveaux + celui-ci).
export const UNKNOWN_OR_PREFER_LABEL = 'Je ne sais pas / je préfère ne pas répondre';

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

export const LEGAL_MENTION = 'Cet outil propose une lecture pédagogique de votre organisation patrimoniale à partir de vos déclarations. Les scores reposent sur une grille indicative ; ils ne constituent ni une expertise, ni un conseil personnalisé en investissement, fiscalité, droit ou assurance. L’outil ne vérifie pas l’éligibilité à un dispositif, la conformité d’un montage ou l’adéquation d’un produit. Les résultats dépendent de l’exactitude et de la complétude des réponses et ne garantissent aucun rendement ni économie — c’est une estimation, sans engagement de votre part. Toute décision importante nécessite une analyse de votre situation avec les professionnels compétents.';

export const NON_RESIDENT_NOTICE = 'Votre résidence fiscale n’est pas la France, ou reste incertaine. Ce diagnostic reste utilisable pour une lecture générale de votre organisation patrimoniale, mais les pistes fiscales françaises ne sont pas présentées ici comme applicables à votre situation. Une analyse transfrontalière dédiée est nécessaire avant toute décision liée à la fiscalité ou à la transmission.';

export const PRIVACY_NOTE = 'Vos réponses restent dans votre navigateur : aucun calcul n’est envoyé à un serveur, à un outil publicitaire ou à un service de mesure d’audience. Rien n’est enregistré automatiquement sur cet appareil — vous pouvez choisir de sauvegarder localement, et effacer cette sauvegarde à tout moment.';

