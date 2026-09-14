// rules.js — moteur de priorisation explicable (section 8) et carte des
// leviers (section 9). Pas de génération à la volée : chaque règle est une
// condition explicite, stockée avec son identifiant, son niveau et son texte.
'use strict';

import {
  hasInvestments,
  hasDebtOrCreditProject,
  hasDurableSurplus,
  hasProFinancingToTest,
  residenceNonFrancaise,
  computeConcentrationFlags,
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
    id: 'p1-impayes',
    tier: 1,
    topic: 'impayes',
    axis: 'C',
    test: ({ answers, context }) => {
      const debt = hasDebtOrCreditProject(context, answers);
      return debt === true && scoreOf(answers, 'cred2') === 0;
    },
    text: 'Vous déclarez des difficultés actuelles pour tenir vos échéances de crédit.',
    action: 'Contactez votre créancier et un professionnel pour sécuriser vos échéances avant toute autre décision.',
  },
  {
    id: 'p1-depenses-non-couvertes',
    tier: 1,
    topic: 'depenses-non-couvertes',
    axis: 'B',
    test: ({ answers }) => scoreOf(answers, 'b1') === 0,
    text: 'Vos engagements semblent financés à découvert, sans capacité d’investissement identifiée.',
    action: 'Réexaminez votre budget avant d’engager tout nouveau crédit ou investissement.',
  },
  {
    id: 'p1-argent-expose',
    tier: 1,
    topic: 'argent-expose',
    axis: 'E',
    test: ({ answers }) => scoreOf(answers, 'cap1') === 0 || scoreOf(answers, 'b2') === 0,
    text: 'De l’argent nécessaire à des dépenses proches semble exposé à un risque incompatible.',
    action: 'Vérifiez la disponibilité de cet argent avant votre prochaine échéance importante.',
  },

  // Palier 2 — socle à clarifier ou sécuriser
  {
    id: 'p2-reserve-faible',
    tier: 2,
    topic: 'reserve-faible',
    axis: 'A',
    test: ({ answers }) => scoreOf(answers, 'a1') === 0,
    text: 'Votre réserve de sécurité couvre moins d’un mois de dépenses essentielles.',
    action: 'Priorisez la reconstitution d’une réserve avant tout nouvel investissement.',
  },
  {
    id: 'p2-engagements-inconnus',
    tier: 2,
    topic: 'engagements-inconnus',
    axis: 'C',
    test: ({ answers, context }) => {
      const debt = hasDebtOrCreditProject(context, answers);
      const s = scoreOf(answers, 'cred1');
      return debt === true && s !== null && s <= 1;
    },
    text: 'Vous avez des dettes ou un projet de crédit, mais une vue incomplète de leur coût réel.',
    action: 'Listez taux, assurances, échéances et capital restant dû de chaque crédit.',
  },
  {
    id: 'p2-tresorerie-melangee',
    tier: 2,
    topic: 'tresorerie-melangee',
    axis: 'A',
    test: ({ answers, context }) => context.branch === 'entrepreneur' && scoreOf(answers, 'p2') !== null && scoreOf(answers, 'p2') <= 1,
    text: 'La trésorerie de votre activité et votre argent personnel semblent encore mélangés.',
    action: 'Séparez ce qui revient à l’activité de ce qui vous est réellement disponible.',
  },

  // Palier 3 — cohérence
  {
    id: 'p3-objectif-proche-expose',
    tier: 3,
    topic: 'objectif-proche-expose',
    axis: 'E',
    test: ({ context, answers }) => {
      const proche = (context.objectifs || []).some((o) => o.echeance === 'moins-3');
      return proche && scoreOf(answers, 'cap1') !== null && scoreOf(answers, 'cap1') <= 1;
    },
    text: 'Un objectif à moins de 3 ans ne semble pas encore protégé du risque pris sur vos actifs.',
    action: 'Sécurisez la part nécessaire à ce projet avant son échéance.',
  },
  {
    id: 'p3-concentration-sans-strategie',
    tier: 3,
    topic: 'concentration-sans-strategie',
    axis: 'D',
    test: ({ answers, context }) => {
      const s = scoreOf(answers, 'div2');
      const flags = computeConcentrationFlags(context);
      return s !== null && s <= 2 && flags.available && flags.flags.length > 0;
    },
    text: 'Une concentration importante de vos actifs n’est pas encore accompagnée d’une stratégie.',
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
      const forte = part === '50-75' || part === 'plus-75';
      const inv = hasInvestments(context);
      return forte && inv !== true;
    },
    text: 'Une grande partie des revenus du foyer dépend de votre activité professionnelle, sans patrimoine construit en dehors.',
    action: 'Étudiez la construction d’un patrimoine en dehors de l’entreprise, pour réduire cette dépendance.',
  },

  // Palier 4 — organisation
  {
    id: 'p4-fiscalite-non-comparee',
    tier: 4,
    topic: 'fiscalite-non-comparee',
    axis: 'E',
    test: ({ answers, applicability }) => applicable(applicability, 'cap2') && scoreOf(answers, 'cap2') !== null && scoreOf(answers, 'cap2') <= 1,
    text: 'Les frais et la fiscalité de vos principaux choix ne semblent pas encore comparés.',
    action: 'Faites comparer vos options avant votre prochaine décision importante.',
  },
  {
    id: 'p4-remuneration-non-arbitree',
    tier: 4,
    topic: 'remuneration-non-arbitree',
    axis: 'B',
    test: ({ context, answers }) => context.branch === 'entrepreneur' && scoreOf(answers, 'p1') !== null && scoreOf(answers, 'p1') <= 2,
    text: 'Votre mode de rémunération n’a pas été comparé récemment.',
    action: 'Faites arbitrer votre rémunération selon votre revenu, votre protection sociale et les besoins de l’entreprise.',
  },
  {
    id: 'p4-capitalisation-a-organiser',
    tier: 4,
    topic: 'capitalisation-a-organiser',
    axis: 'E',
    test: ({ applicability, answers }) => applicable(applicability, 'p3') && scoreOf(answers, 'p3') !== null && scoreOf(answers, 'p3') <= 2,
    text: 'L’utilisation de vos excédents professionnels n’est pas encore organisée.',
    action: 'Comparez réinvestissement dans l’activité, détention professionnelle et sortie personnelle.',
  },
  {
    id: 'p4-transmission-a-examiner',
    tier: 4,
    topic: 'transmission-a-examiner',
    axis: 'F',
    test: ({ answers }) => {
      const s1 = scoreOf(answers, 'prot1');
      const s2 = scoreOf(answers, 'prot2');
      return (s1 !== null && s1 <= 1) || (s2 !== null && s2 <= 1);
    },
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
    text: 'Vous ne détenez pas encore d’actifs investis, alors que c’est l’un de vos objectifs.',
    action: 'Construisez une première capacité d’investissement suivie et régulière.',
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
    securiser: 'A',
    'residence-principale': 'C',
    immobilier: 'D',
    placements: 'D',
    retraite: 'E',
    remuneration: 'B',
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

function immobilierCredit({ context, answers, applicability }) {
  const p = context.patrimoine || {};
  const dejaLocatif = p.immobilierLocatif && p.immobilierLocatif.status === 'value' && p.immobilierLocatif.value > 0;
  const debt = hasDebtOrCreditProject(context, answers);
  const credInconnu = debt === 'unknown';
  const b1 = scoreOf(answers, 'b1');
  const difficulteActuelle = scoreOf(answers, 'cred2') === 0 || scoreOf(answers, 'cred1') === 0;

  if (dejaLocatif) {
    const aRevoir = (applicable(applicability, 'cred2') && scoreOf(answers, 'cred2') !== null && scoreOf(answers, 'cred2') <= 1) || (scoreOf(answers, 'cred1') !== null && scoreOf(answers, 'cred1') <= 1);
    return {
      status: 'deja_mobilise',
      motif: aRevoir ? 'Immobilier locatif déjà détenu, dont les engagements gagneraient à être revus.' : 'Immobilier locatif déjà détenu.',
      action: aRevoir ? 'Reprenez le détail des coûts et de la résistance de ce crédit.' : 'Continuez à suivre ce crédit et sa cohérence avec vos autres objectifs.',
    };
  }
  if (difficulteActuelle) {
    return { status: 'a_differer', motif: 'Une fragilité de paiement est déclarée sur vos engagements actuels.', action: 'Stabilisez vos crédits en cours avant d’en envisager un nouveau.' };
  }
  const objectifOk = hasObjectif(context, 'immobilier') || hasObjectif(context, 'residence-principale');
  if (!objectifOk) {
    return { status: 'non_prioritaire', motif: 'Ce sujet ne fait pas partie de vos objectifs déclarés actuellement.', action: 'À reconsidérer si votre projet évolue.' };
  }
  if (b1 === null || b1 === undefined || credInconnu) {
    return { status: 'informations_insuffisantes', motif: 'Capacité d’investissement ou engagements de crédit non précisés.', action: 'Précisez votre capacité mensuelle et vos engagements actuels.' };
  }
  return { status: 'a_examiner', motif: 'Objectif immobilier déclaré, sans fragilité immédiate identifiée.', action: 'Étudiez le budget complet, la trésorerie, les risques et le financement.' };
}

function investissementFinancier({ context, answers }) {
  const p = context.patrimoine || {};
  const deja = (p.placementsFinanciers && p.placementsFinanciers.status === 'value' && p.placementsFinanciers.value > 0) || (p.crypto && p.crypto.status === 'value' && p.crypto.value > 0);
  if (deja) {
    return { status: 'deja_mobilise', motif: 'Placements financiers déjà détenus.', action: 'Vérifiez que leur rôle reste cohérent avec vos objectifs et échéances.' };
  }
  const objectifOk = hasObjectif(context, 'placements') || hasObjectif(context, 'retraite');
  if (!objectifOk) return { status: 'non_prioritaire', motif: 'Ce sujet ne fait pas partie de vos objectifs déclarés actuellement.', action: 'À reconsidérer si votre projet évolue.' };
  const echeanceProche = echeanceOf(context, 'placements') === 'moins-3';
  if (echeanceProche) {
    return { status: 'a_examiner', motif: 'Objectif financier à échéance proche.', action: 'Étudiez d’abord la disponibilité et la sécurité de cet argent, avant toute allocation chiffrée.' };
  }
  const b1 = scoreOf(answers, 'b1');
  if (b1 === null) return { status: 'informations_insuffisantes', motif: 'Capacité d’investissement non précisée.', action: 'Précisez ce que vous pouvez investir régulièrement.' };
  return { status: 'a_examiner', motif: 'Objectif financier de long terme déclaré, capacité identifiée.', action: 'Étudiez une mise en place progressive, cohérente avec votre horizon.' };
}

function remunerationDirigeant({ context, answers }) {
  if (context.branch !== 'entrepreneur') return null;
  const s = scoreOf(answers, 'p1');
  if (s === null) return { status: 'informations_insuffisantes', motif: 'Comparaison de votre rémunération non précisée.', action: 'Faites le point sur votre mode de rémunération actuel.' };
  if (s >= 3) return { status: 'deja_mobilise', motif: 'Comparaison de rémunération déjà réalisée et cohérente.', action: 'Revoyez cet arbitrage à chaque changement important.' };
  return { status: 'a_examiner', motif: 'Comparaison de rémunération jamais faite ou devenue ancienne.', action: 'Faites comparer vos options en tenant compte de votre revenu disponible, de votre protection sociale et des besoins de l’entreprise.' };
}

function capitalisationHolding({ context, answers }) {
  if (context.branch !== 'entrepreneur') return null;
  const surplus = hasDurableSurplus(answers);
  if (surplus === 'unknown') return { status: 'informations_insuffisantes', motif: 'Existence d’excédents professionnels durables non précisée.', action: 'Précisez si votre activité dégage des excédents durables.' };
  if (surplus === false) return { status: 'non_prioritaire', motif: 'Aucun excédent professionnel durable déclaré actuellement.', action: 'À reconsidérer si votre trésorerie professionnelle évolue.' };
  const projetExplicite = hasObjectif(context, 'entreprise') || hasObjectif(context, 'transmission') || hasObjectif(context, 'placements');
  if (!projetExplicite) {
    return { status: 'non_prioritaire', motif: 'Excédents durables déclarés, mais aucun projet professionnel ou patrimonial explicite.', action: 'Ce sujet reste à examiner si un projet se précise — pas sur la seule base de la trésorerie disponible.' };
  }
  const s = scoreOf(answers, 'p3');
  if (s !== null && s >= 3) {
    return { status: 'deja_mobilise', motif: 'Arbitrage des excédents déjà comparé.', action: 'Continuez à suivre cet arbitrage lors des changements importants.' };
  }
  return { status: 'a_examiner', motif: 'Excédents durables et projet explicite, sans comparaison des coûts et contraintes.', action: 'Comparez réinvestissement, détention professionnelle et sortie personnelle — sans présumer d’un seuil, d’un taux ou d’une économie.' };
}

function levierBancairePro({ context, answers }) {
  if (context.branch !== 'entrepreneur') return null;
  const need = hasProFinancingToTest(context, answers);
  if (need === 'unknown') return { status: 'informations_insuffisantes', motif: 'Dette professionnelle, caution ou projet de financement non précisé.', action: 'Précisez vos engagements professionnels actuels ou envisagés.' };
  if (need === false) return { status: 'non_prioritaire', motif: 'Aucune dette professionnelle ni projet de financement déclaré.', action: 'À reconsidérer si un projet de financement se présente.' };
  const s = scoreOf(answers, 'p4');
  if (s !== null && s >= 3) {
    return { status: 'deja_mobilise', motif: 'Financement déjà testé sur les flux de l’activité.', action: 'Revoyez ce test si l’activité ou les engagements évoluent.' };
  }
  return { status: 'a_examiner', motif: 'Dette, caution ou projet de financement déclaré, sans test complet.', action: 'Évaluez les flux prévisionnels et les garanties — ceci n’est pas un accord bancaire.' };
}

function fiscaliteFrais({ context, answers, applicability }) {
  if (residenceNonFrancaise(context)) {
    return { status: 'informations_insuffisantes', motif: 'Résidence fiscale hors de France ou incertaine.', action: 'Une analyse transfrontalière dédiée est nécessaire ; les pistes fiscales françaises ne sont pas présentées ici comme applicables.' };
  }
  if (!applicable(applicability, 'cap2')) {
    return { status: 'non_prioritaire', motif: 'Aucun investissement ni décision engagée à comparer pour l’instant.', action: 'À reconsidérer dès votre première décision d’investissement.' };
  }
  const s = scoreOf(answers, 'cap2');
  if (s === null) return { status: 'informations_insuffisantes', motif: 'Comparaison des frais et de la fiscalité non précisée.', action: 'Précisez si vos derniers choix ont été comparés.' };
  if (s >= 3) return { status: 'deja_mobilise', motif: 'Comparaison des frais et de la fiscalité déjà réalisée.', action: 'Actualisez cette comparaison à chaque changement notable.' };
  return { status: 'a_examiner', motif: 'Frais et fiscalité de vos choix pas encore comparés.', action: 'Faites comparer vos options avant votre prochaine décision importante.' };
}

function transmission({ context, answers }) {
  const s1 = scoreOf(answers, 'prot1');
  const s2 = scoreOf(answers, 'prot2');
  if (s1 === null && s2 === null) {
    return { status: 'informations_insuffisantes', motif: 'Sujet non encore précisé.', action: 'Indiquez si vous savez qui recevrait votre patrimoine et qui pourrait agir pour vous.' };
  }
  const trigger = context.dependents === true || hasObjectif(context, 'transmission') || (context.branch === 'entrepreneur' && hasObjectif(context, 'entreprise'));
  const bas = (s1 !== null && s1 <= 1) || (s2 !== null && s2 <= 1);
  const haut = (s1 === null || s1 >= 3) && (s2 === null || s2 >= 3) && (s1 !== null || s2 !== null);
  const nonFr = residenceNonFrancaise(context);
  const outilsFr = nonFr ? '' : ' Donation, démembrement ou organisation sociétaire sont des outils à examiner selon votre situation.';
  if (trigger && bas) {
    return { status: 'a_examiner', motif: 'Vos souhaits ne semblent pas encore traduits en mesures concrètes.', action: `Clarifiez qui doit recevoir quoi, et dans quelles conditions.${outilsFr}` };
  }
  if (haut) {
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
