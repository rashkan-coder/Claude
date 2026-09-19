// content.js — textes uniquement (aucune logique). Modifier ce fichier ne change
// jamais un calcul ; seuls indicators.js et rules.js portent la logique de score.
'use strict';

export const RULE_VERSION = 'diagnostic-patrimoine-v2.0.0';
export const RULE_DATE = '2026-09-18';

export const AXES = [
  { id: 'A', name: 'Sécurité financière', short: 'Sécurité' },
  { id: 'B', name: 'Capacité à investir', short: 'Capacité' },
  { id: 'C', name: 'Levier bancaire', short: 'Levier' },
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
  { axis: 'C', title: 'Levier bancaire', text: 'Utiliser le crédit comme un outil, pas seulement le subir.' },
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
  immobilier: 'Votre immobilier',
  financier: 'Votre épargne financière',
  transmission: 'Votre transmission',
  entreprise: 'Votre activité',
};

// --- Textes des étapes de diagnostic (voir facts.js/indicators.js pour la
// logique de calcul) — chaque pilier est désormais noté à partir de faits
// concrets (montants, tranches, choix structurels), jamais d'un ressenti
// autodéclaré. Voir GRILLE.md pour la table complète des seuils.

export const DIAGNOSTIC_QUESTIONS = {
  depensesEssentielles: {
    label: 'Dépenses mensuelles essentielles',
    helper: 'Logement, charges fixes, alimentation, crédits en cours.',
  },
  epargneDisponible: {
    label: 'Épargne immédiatement disponible',
    helper: 'Sans délai ni pénalité, hors argent déjà destiné à un projet précis.',
  },
  epargneMensuelle: {
    label: 'Épargne mensuelle moyenne, tous supports confondus',
    helper: 'Mettez un chiffre négatif si vous devez parfois puiser dans votre épargne pour boucler les fins de mois.',
  },
  residencePrincipaleProprietaire: {
    question: 'Êtes-vous propriétaire de votre résidence principale ?',
  },
  residencePrincipaleCredit: {
    question: 'Reste-t-il un crédit sur ce bien ?',
  },
  autresBiensImmobiliers: {
    question: 'Avez-vous d’autres biens immobiliers (locatif, résidence secondaire) ?',
  },
  autresBiensCredit: {
    question: 'Reste-t-il un crédit sur ce bien ?',
  },
  supportsDetenus: {
    question: 'Parmi ces supports, lesquels détenez-vous aujourd’hui ?',
  },
  supportDominant: {
    question: 'Lequel représente la plus grande part de votre épargne financière ?',
  },
  dettesAutres: {
    label: 'Autres dettes ou crédits en cours',
    helper: 'Hors crédits immobiliers déjà indiqués (consommation, personnel...).',
  },
  transmissionOrganisee: {
    question: 'Avez-vous déjà organisé votre transmission ?',
    helper: 'Testament, donation entre époux, mandat de protection future.',
  },
  remunerationComparee: {
    question: 'Avez-vous comparé votre rémunération actuelle à une autre option au cours des 2 dernières années ?',
    helper: 'Dividendes, PER entreprise, ou toute autre alternative.',
  },
  excedentTresorerie: {
    question: 'Votre activité dégage-t-elle un excédent de trésorerie durable ?',
    helper: 'Au-delà des besoins d’exploitation, des impôts et des projets déjà engagés.',
  },
};

export const OUI_NON_OPTIONS = [
  { value: 'oui', label: 'Oui' },
  { value: 'non', label: 'Non' },
];

export const CREDIT_BRACKET_OPTIONS = [
  { value: 'aucun', label: 'Non, il est remboursé' },
  { value: 'leger', label: 'Oui, environ 20 % de la valeur du bien' },
  { value: 'moyen', label: 'Oui, environ 50 % de la valeur du bien' },
  { value: 'fort', label: 'Oui, plus de 50 % de la valeur du bien' },
];

export const SUPPORTS_OPTIONS = [
  { value: 'livrets', label: 'Livrets réglementés (Livret A, LDDS, PEL...)' },
  { value: 'assuranceVie', label: 'Assurance-vie' },
  { value: 'per', label: 'PER ou épargne retraite' },
  { value: 'actions', label: 'Compte-titres, PEA ou actions en direct' },
  { value: 'scpi', label: 'SCPI' },
  { value: 'epargneSalariale', label: 'Épargne salariale (PEE, PERCO...)' },
  { value: 'crypto', label: 'Cryptomonnaies' },
  { value: 'aucun', label: 'Aucun de ces supports' },
];

export const TRANSMISSION_OPTIONS = [
  { value: 'fait', label: 'Oui, c’est fait et à jour' },
  { value: 'reflexion', label: 'Une réflexion engagée, rien de formalisé' },
  { value: 'non', label: 'Non, rien n’est fait' },
  { value: 'inconnu', label: 'Je ne sais pas' },
];

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

export const PRIVACY_NOTE = 'Vos réponses restent dans votre navigateur : aucun calcul n’est envoyé à un serveur, à un outil publicitaire ou à un service de mesure d’audience. Rien n’est enregistré ni conservé au-delà de votre visite.';

// Disclaimer affiché une seule fois, à la toute fin du parcours (page de
// résultats) — ne pas dupliquer sur les autres écrans.
export const SUMMARY_ESTIMATE_NOTICE = 'Ce diagnostic constitue une estimation sommaire, établie à but pédagogique à partir des réponses que vous avez fournies. Il ne saurait remplacer une étude patrimoniale approfondie réalisée avec un professionnel.';

