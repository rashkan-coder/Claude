// rules.js — moteur de priorisation explicable (section 8) et carte des
// leviers (section 9). Pas de génération à la volée : chaque règle est une
// condition explicite, stockée avec son identifiant, son niveau et son texte.
// Indicateurs objectifs (voir indicators.js/facts.js pour la table des
// seuils) — voir GRILLE.md pour le détail de ce que ce référentiel couvre et
// ne couvre pas.
'use strict';

import {
  hasInvestments,
  hasDurableSurplus,
  residenceNonFrancaise,
  computeConcentrationFlags,
  computeRealEstateLeverage,
} from './facts.js';

function scoreOf(answers, id) {
  const a = answers[id];
  return a && a.kind === 'value' && typeof a.value === 'number' ? a.value : null;
}

function applicable(applicability, id) {
  return applicability[id] && applicability[id].status === 'applicable';
}

function hasObjectif(context, id) {
  return (context.objectifs || []).some((o) => o.id === id);
}

function echeanceOf(context, id) {
  const o = (context.objectifs || []).find((x) => x.id === id);
  return o ? o.echeance : null;
}

// --- Règles de priorité, triées par palier (1 = le plus urgent) -----------
// `test(ctx)` reçoit {context, answers, applicability, axesResults}.
export const PRIORITY_RULES = [
  // Palier 1 — fragilité immédiate déclarée
  {
    id: 'p1-depenses-non-couvertes',
    tier: 1,
    topic: 'depenses-non-couvertes',
    axis: 'B',
    test: ({ answers }) => scoreOf(answers, 'capa1') === 0,
    text: 'Votre épargne mensuelle déclarée est nulle ou négative : vous ne parvenez pas encore à dégager de capacité d’épargne.',
    action: 'Réexaminez votre budget avant d’engager tout nouveau crédit ou investissement.',
  },

  // Palier 2 — socle à sécuriser
  {
    id: 'p2-reserve-faible',
    tier: 2,
    topic: 'reserve-faible',
    axis: 'A',
    test: ({ answers }) => scoreOf(answers, 'secu1') === 0,
    text: 'Votre réserve de sécurité couvre moins de 3 mois de dépenses essentielles.',
    action: 'Priorisez la reconstitution d’une réserve avant tout nouvel investissement.',
  },

  // Palier 3 — cohérence
  {
    id: 'p3-concentration',
    tier: 3,
    topic: 'concentration',
    axis: 'D',
    test: ({ context }) => {
      const flags = computeConcentrationFlags(context);
      return flags.available && flags.flags.length > 0;
    },
    text: 'Une concentration importante de vos actifs a été identifiée.',
    action: 'Étudiez si cette concentration reste compatible avec vos objectifs et vos échéances.',
  },
  {
    id: 'p3-dependance-activite',
    tier: 3,
    topic: 'dependance-activite',
    axis: 'D',
    test: ({ context }) => {
      if (context.branch !== 'entrepreneur') return false;
      const part = context.entreprise && context.entreprise.partRevenusDependante;
      const forte = part === 'plus-50';
      const inv = hasInvestments(context);
      return forte && inv !== true;
    },
    text: 'Une grande partie des revenus du foyer dépend de votre activité professionnelle, sans patrimoine construit en dehors.',
    action: 'Étudiez la construction d’un patrimoine en dehors de l’entreprise, pour réduire cette dépendance.',
  },

  // Palier 4 — organisation
  {
    id: 'p4-remuneration-non-arbitree',
    tier: 4,
    topic: 'remuneration-non-arbitree',
    axis: 'B',
    test: ({ context, answers }) => context.branch === 'entrepreneur' && scoreOf(answers, 'remuneration1') !== null && scoreOf(answers, 'remuneration1') <= 1,
    text: 'Votre mode de rémunération n’a pas été comparé récemment.',
    action: 'Faites arbitrer votre rémunération selon votre revenu, votre protection sociale et les besoins de l’entreprise.',
  },
  {
    id: 'p4-argent-qui-dort',
    tier: 4,
    topic: 'argent-qui-dort',
    axis: 'E',
    test: ({ answers }) => scoreOf(answers, 'capital1') === 0,
    text: 'Une part importante de votre épargne financière semble rester sur des supports peu productifs (livrets, comptes), au-delà de votre besoin de sécurité.',
    action: 'Étudiez si une partie de cette épargne pourrait être orientée vers des supports plus adaptés à vos horizons.',
  },
  {
    id: 'p4-transmission-a-examiner',
    tier: 4,
    topic: 'transmission-a-examiner',
    axis: 'F',
    test: ({ answers }) => scoreOf(answers, 'transmission1') !== null && scoreOf(answers, 'transmission1') <= 1,
    text: 'Le sujet de la protection de vos proches et de la transmission reste peu avancé.',
    action: 'Clarifiez qui recevrait votre patrimoine et qui pourrait agir pour vous en cas d’incapacité.',
  },

  // Palier 5 — pistes de développement
  {
    id: 'p5-premiers-investissements',
    tier: 5,
    topic: 'premiers-investissements',
    axis: 'D',
    test: ({ context }) => {
      const inv = hasInvestments(context);
      const viseInvestissement = hasObjectif(context, 'placements') || hasObjectif(context, 'immobilier');
      return inv === false && viseInvestissement;
    },
    text: 'Vous ne détenez pas encore d’actifs investis, alors que c’est votre objectif déclaré.',
    action: 'Construisez une première capacité d’épargne investie, suivie et régulière.',
  },
];

export function computePriorities({ context, answers, applicability, axesResults }) {
  const ctx = { context, answers, applicability, axesResults };
  const triggered = PRIORITY_RULES.filter((r) => {
    try {
      return !!r.test(ctx);
    } catch {
      return false;
    }
  });
  const objectifPrioritaireId = context.objectifPrioritaireId || null;
  const axisOfObjectif = {
    immobilier: 'D',
    placements: 'D',
    entreprise: 'E',
    transmission: 'F',
  };
  const preferredAxis = objectifPrioritaireId ? axisOfObjectif[objectifPrioritaireId] : null;

  triggered.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    const aMatch = preferredAxis && a.axis === preferredAxis ? 0 : 1;
    const bMatch = preferredAxis && b.axis === preferredAxis ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    return a.id.localeCompare(b.id);
  });

  // Dédoublonnage par topic (une seule règle par problème sous-jacent).
  const seenTopics = new Set();
  const deduped = [];
  for (const r of triggered) {
    if (seenTopics.has(r.topic)) continue;
    seenTopics.add(r.topic);
    deduped.push(r);
  }
  return deduped.slice(0, 3).map((r) => ({ id: r.id, tier: r.tier, axis: r.axis, text: r.text, action: r.action }));
}

// --- Carte des leviers (section 9) -----------------------------------------
// Chaque fonction renvoie {status, motif, action}. status ∈
// {deja_mobilise, a_examiner, a_differer, non_prioritaire, informations_insuffisantes}.
// Ce sont des conditions de découverte, jamais une conclusion d'éligibilité.

function immobilierCredit({ context, answers }) {
  const p = context.patrimoine || {};
  const dejaLocatif = p.immobilierLocatif && p.immobilierLocatif.status === 'value' && p.immobilierLocatif.value > 0;
  const leverage = computeRealEstateLeverage(context);
  const capa1 = scoreOf(answers, 'capa1');

  if (dejaLocatif) {
    const nonExploite = leverage.available && leverage.ltv <= 0;
    return {
      status: 'deja_mobilise',
      motif: nonExploite ? 'Immobilier locatif déjà détenu, entièrement remboursé : le levier bancaire n’est plus utilisé dessus.' : 'Immobilier locatif déjà détenu.',
      action: nonExploite ? 'Étudiez si un nouveau projet à crédit reste pertinent selon vos objectifs.' : 'Continuez à suivre ce crédit et sa cohérence avec vos autres objectifs.',
    };
  }
  const objectifOk = hasObjectif(context, 'immobilier');
  if (!objectifOk) {
    return { status: 'non_prioritaire', motif: 'Ce sujet ne fait pas partie de votre objectif déclaré actuellement.', action: 'À reconsidérer si votre projet évolue.' };
  }
  if (capa1 === null) {
    return { status: 'informations_insuffisantes', motif: 'Capacité d’épargne non précisée.', action: 'Précisez votre capacité d’épargne mensuelle.' };
  }
  if (capa1 === 0) {
    return { status: 'a_differer', motif: 'Une fragilité budgétaire est déclarée par ailleurs.', action: 'Stabilisez votre budget avant d’envisager un nouveau crédit.' };
  }
  return { status: 'a_examiner', motif: 'Objectif immobilier déclaré, sans fragilité immédiate identifiée.', action: 'Étudiez le budget complet, la trésorerie, les risques et le financement.' };
}

function investissementFinancier({ context, answers }) {
  const p = context.patrimoine || {};
  const deja = p.epargnePlacements && p.epargnePlacements.status === 'value' && p.epargnePlacements.value > 0;
  if (deja) {
    return { status: 'deja_mobilise', motif: 'Épargne et placements déjà détenus.', action: 'Vérifiez que leur rôle reste cohérent avec vos objectifs et échéances.' };
  }
  const objectifOk = hasObjectif(context, 'placements');
  if (!objectifOk) return { status: 'non_prioritaire', motif: 'Ce sujet ne fait pas partie de votre objectif déclaré actuellement.', action: 'À reconsidérer si votre projet évolue.' };
  const echeanceProche = echeanceOf(context, 'placements') === 'moins-3';
  if (echeanceProche) {
    return { status: 'a_examiner', motif: 'Objectif financier à échéance proche.', action: 'Étudiez d’abord la disponibilité et la sécurité de cet argent, avant toute allocation chiffrée.' };
  }
  const capa1 = scoreOf(answers, 'capa1');
  if (capa1 === null) return { status: 'informations_insuffisantes', motif: 'Capacité d’épargne non précisée.', action: 'Précisez ce que vous pouvez épargner régulièrement.' };
  return { status: 'a_examiner', motif: 'Objectif financier de long terme déclaré, capacité identifiée.', action: 'Étudiez une mise en place progressive, cohérente avec votre horizon.' };
}

function remunerationDirigeant({ context, answers }) {
  if (context.branch !== 'entrepreneur') return null;
  const s = scoreOf(answers, 'remuneration1');
  if (s === null) return { status: 'informations_insuffisantes', motif: 'Comparaison de votre rémunération non précisée.', action: 'Faites le point sur votre mode de rémunération actuel.' };
  if (s >= 2) return { status: 'deja_mobilise', motif: 'Comparaison de rémunération déjà réalisée.', action: 'Revoyez cet arbitrage à chaque changement important.' };
  return { status: 'a_examiner', motif: 'Comparaison de rémunération jamais faite ou devenue ancienne.', action: 'Faites comparer vos options en tenant compte de votre revenu disponible, de votre protection sociale et des besoins de l’entreprise.' };
}

function capitalisationHolding({ context }) {
  if (context.branch !== 'entrepreneur') return null;
  const surplus = hasDurableSurplus(context);
  if (surplus === 'unknown') return { status: 'informations_insuffisantes', motif: 'Existence d’excédents professionnels durables non précisée.', action: 'Précisez si votre activité dégage des excédents durables.' };
  if (surplus === false) return { status: 'non_prioritaire', motif: 'Aucun excédent professionnel durable déclaré actuellement.', action: 'À reconsidérer si votre trésorerie professionnelle évolue.' };
  const projetExplicite = hasObjectif(context, 'entreprise') || hasObjectif(context, 'transmission') || hasObjectif(context, 'placements');
  if (!projetExplicite) {
    return { status: 'non_prioritaire', motif: 'Excédents durables déclarés, mais aucun projet professionnel ou patrimonial explicite.', action: 'Ce sujet reste à examiner si un projet se précise — pas sur la seule base de la trésorerie disponible.' };
  }
  return { status: 'a_examiner', motif: 'Excédents durables et projet explicite, sans comparaison des coûts et contraintes encore réalisée.', action: 'Comparez réinvestissement, détention professionnelle et sortie personnelle — sans présumer d’un seuil, d’un taux ou d’une économie.' };
}

function levierBancairePro({ context }) {
  if (context.branch !== 'entrepreneur') return null;
  const projet = context.entreprise && context.entreprise.projetFinancementEnvisage;
  if (!projet || projet === 'inconnu') return { status: 'informations_insuffisantes', motif: 'Projet de financement professionnel non précisé.', action: 'Précisez si un financement professionnel est envisagé.' };
  if (projet === 'non') return { status: 'non_prioritaire', motif: 'Aucun projet de financement professionnel déclaré.', action: 'À reconsidérer si un projet de financement se présente.' };
  return { status: 'a_examiner', motif: 'Projet de financement professionnel envisagé.', action: 'Évaluez les flux prévisionnels, les garanties et l’effet sur vos engagements personnels — ceci n’est pas un accord bancaire.' };
}

function fiscaliteFrais({ context }) {
  if (residenceNonFrancaise(context)) {
    return { status: 'informations_insuffisantes', motif: 'Résidence fiscale hors de France ou incertaine.', action: 'Une analyse transfrontalière dédiée est nécessaire ; les pistes fiscales françaises ne sont pas présentées ici comme applicables.' };
  }
  const inv = hasInvestments(context);
  if (inv === false) {
    return { status: 'non_prioritaire', motif: 'Aucun investissement à comparer pour l’instant.', action: 'À reconsidérer dès votre première décision d’investissement.' };
  }
  if (inv === 'unknown') {
    return { status: 'informations_insuffisantes', motif: 'Composition de votre patrimoine partiellement connue.', action: 'Précisez vos actifs pour affiner ce repère.' };
  }
  return { status: 'a_examiner', motif: 'Des actifs sont investis : leurs frais et leur fiscalité méritent d’être comparés.', action: 'Faites comparer vos options avant votre prochaine décision importante.' };
}

function transmission({ context, answers }) {
  const s1 = scoreOf(answers, 'transmission1');
  if (s1 === null) {
    return { status: 'informations_insuffisantes', motif: 'Sujet non encore précisé.', action: 'Indiquez si votre transmission (testament, donation, mandat de protection future) est déjà organisée.' };
  }
  const trigger = hasObjectif(context, 'transmission') || (context.branch === 'entrepreneur' && hasObjectif(context, 'entreprise'));
  const nonFr = residenceNonFrancaise(context);
  const outilsFr = nonFr ? '' : ' Donation, démembrement ou organisation sociétaire sont des outils à examiner selon votre situation.';
  if (trigger && s1 <= 1) {
    return { status: 'a_examiner', motif: 'Vos souhaits ne semblent pas encore traduits en mesures concrètes.', action: `Clarifiez qui doit recevoir quoi, et dans quelles conditions.${outilsFr}` };
  }
  if (s1 >= 2) {
    return { status: 'deja_mobilise', motif: 'Organisation de la protection et de la transmission déjà avancée.', action: 'Revoyez cette organisation après chaque évolution familiale ou professionnelle importante.' };
  }
  return { status: 'non_prioritaire', motif: 'Aucune urgence identifiée à ce stade.', action: `Une cartographie de vos souhaits reste possible, sans urgence établie.${outilsFr}` };
}

export function computeLevers({ context, answers, applicability }) {
  const ctx = { context, answers, applicability };
  const fns = {
    immobilierCredit,
    investissementFinancier,
    remunerationDirigeant,
    capitalisationHolding,
    levierBancairePro,
    fiscaliteFrais,
    transmission: transmission,
  };
  const result = {};
  for (const [key, fn] of Object.entries(fns)) {
    const r = fn(ctx);
    if (r) result[key] = r;
  }
  return result;
}
