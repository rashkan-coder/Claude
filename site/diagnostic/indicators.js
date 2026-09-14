// indicators.js — configuration des indicateurs notés. Chaque indicateur
// pondère un seul axe. Réduit à un indicateur par pilier (deux pour la
// branche dirigeant/indépendant) pour raccourcir le parcours — voir
// GRILLE.md pour ce que cette simplification change par rapport à un
// référentiel plus détaillé.
'use strict';

import { INDICATOR_TEXTS } from './content.js';
import { hasInvestments, hasDebtOrCreditProject, hasDurableSurplus } from './facts.js';

// applicability status: 'applicable' | 'not_applicable' | 'unknown'
// 'unknown' = le fait qui déterminerait l'applicabilité n'est pas connu :
// l'indicateur reste compté au dénominateur (à clarifier), sans être exclu.

export const INDICATORS = [
  {
    id: 'a1',
    axis: 'A',
    entrepreneurOnly: false,
    getApplicability: () => ({ status: 'applicable' }),
    getQuestion: () => INDICATOR_TEXTS.a1.question,
    getHelper: () => INDICATOR_TEXTS.a1.helper,
    getOptions: () => INDICATOR_TEXTS.a1.options,
  },
  {
    id: 'b1',
    axis: 'B',
    entrepreneurOnly: false,
    getApplicability: () => ({ status: 'applicable' }),
    getQuestion: () => INDICATOR_TEXTS.b1.question,
    getOptions: () => INDICATOR_TEXTS.b1.options,
  },
  {
    id: 'cred1',
    axis: 'C',
    entrepreneurOnly: false,
    gate: 'creditGate',
    getApplicability: () => ({ status: 'applicable' }), // toujours applicable, sous deux formulations
    getQuestion: (context, answers) => {
      const debt = hasDebtOrCreditProject(context, answers);
      return debt === false ? INDICATOR_TEXTS.cred1NoDebt.question : INDICATOR_TEXTS.cred1WithDebt.question;
    },
    getOptions: (context, answers) => {
      const debt = hasDebtOrCreditProject(context, answers);
      return debt === false ? INDICATOR_TEXTS.cred1NoDebt.options : INDICATOR_TEXTS.cred1WithDebt.options;
    },
  },
  {
    id: 'div1',
    axis: 'D',
    entrepreneurOnly: false,
    getApplicability: (context) => {
      const inv = hasInvestments(context);
      if (inv === true) return { status: 'applicable' };
      if (inv === false) return { status: 'not_applicable', note: 'Aucun actif investi déclaré : un plan de diversification future peut être envisagé, sans pénalité.' };
      return { status: 'unknown', note: 'À clarifier : présence d’actifs investis (immobilier locatif, épargne/placements ou parts d’entreprise).' };
    },
    getQuestion: () => INDICATOR_TEXTS.div1.question,
    getOptions: () => INDICATOR_TEXTS.div1.options,
  },
  {
    id: 'cap1',
    axis: 'E',
    entrepreneurOnly: false,
    getApplicability: () => ({ status: 'applicable' }), // jamais non applicable
    getQuestion: () => INDICATOR_TEXTS.cap1.question,
    getOptions: (context) => {
      const inv = hasInvestments(context);
      return inv === false ? INDICATOR_TEXTS.cap1.noInvestmentOptions : INDICATOR_TEXTS.cap1.options;
    },
  },
  {
    id: 'prot1',
    axis: 'F',
    entrepreneurOnly: false,
    getApplicability: () => ({ status: 'applicable' }),
    getQuestion: () => INDICATOR_TEXTS.prot1.question,
    getOptions: () => INDICATOR_TEXTS.prot1.options,
  },
  // --- Compléments entrepreneur ---
  {
    id: 'p1',
    axis: 'B',
    entrepreneurOnly: true,
    getApplicability: () => ({ status: 'applicable' }),
    getQuestion: () => INDICATOR_TEXTS.p1.question,
    getOptions: () => INDICATOR_TEXTS.p1.options,
  },
  {
    id: 'p3',
    axis: 'E',
    entrepreneurOnly: true,
    gate: 'p3Gate',
    getApplicability: (context, answers) => {
      const surplus = hasDurableSurplus(answers);
      if (surplus === true) return { status: 'applicable' };
      if (surplus === false) return { status: 'not_applicable', note: 'Aucun excédent professionnel durable déclaré.' };
      return { status: 'unknown', note: 'À clarifier : existence d’excédents professionnels durables.' };
    },
    getQuestion: () => INDICATOR_TEXTS.p3.question,
    getOptions: () => INDICATOR_TEXTS.p3.options,
  },
];

export function getIndicator(id) {
  return INDICATORS.find((i) => i.id === id);
}

export function indicatorsForBranch(isEntrepreneurBranch) {
  return INDICATORS.filter((i) => isEntrepreneurBranch || !i.entrepreneurOnly);
}
