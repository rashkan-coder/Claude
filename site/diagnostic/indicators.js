// indicators.js — configuration des indicateurs notés (référentiel section 5).
// Chaque indicateur pondère un seul axe. Les valeurs de score vont de 0 à 4.
// Ce fichier ne fait aucun rendu DOM ; il décrit seulement de quoi dépend
// l'applicabilité et les options de chaque question, à partir du contexte et
// des réponses déjà saisies (y compris les "portes" liées : creditGate,
// p3Gate, p4Gate, qui ne sont pas elles-mêmes des indicateurs notés).
'use strict';

import { INDICATOR_TEXTS } from './content.js';
import {
  hasInvestments,
  hasDebtOrCreditProject,
  hasDurableSurplus,
  hasProFinancingToTest,
} from './facts.js';

// applicability status: 'applicable' | 'not_applicable' | 'unknown'
// 'unknown' = le fait qui déterminerait l'applicabilité n'est pas connu :
// l'indicateur reste compté au dénominateur (à clarifier), sans être exclu.

export const INDICATORS = [
  {
    id: 'a1',
    axis: 'A',
    entrepreneurOnly: false,
    special: 'reserve', // logique dédiée dans engine.js (calcul depuis le contexte)
    getApplicability: () => ({ status: 'applicable' }),
  },
  {
    id: 'a2',
    axis: 'A',
    entrepreneurOnly: false,
    getApplicability: () => ({ status: 'applicable' }),
    getQuestion: () => INDICATOR_TEXTS.a2.question,
    getHelper: () => INDICATOR_TEXTS.a2.helper,
    getOptions: () => INDICATOR_TEXTS.a2.options,
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
    id: 'b2',
    axis: 'B',
    entrepreneurOnly: false,
    getApplicability: () => ({ status: 'applicable' }),
    getQuestion: () => INDICATOR_TEXTS.b2.question,
    getOptions: () => INDICATOR_TEXTS.b2.options,
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
    id: 'cred2',
    axis: 'C',
    entrepreneurOnly: false,
    // Ne redemande pas la porte : cred1 l'a déjà posée dans sa propre carte.
    // cred2 lit simplement le fait déjà établi (voir hasDebtOrCreditProject).
    getApplicability: (context, answers) => {
      const debt = hasDebtOrCreditProject(context, answers);
      if (debt === true) return { status: 'applicable' };
      if (debt === false) {
        return { status: 'not_applicable', note: 'Absence d’endettement déclarée ; la résistance d’un futur crédit n’est pas évaluée.' };
      }
      return { status: 'unknown', note: 'À clarifier : présence de dettes ou d’un projet de crédit.' };
    },
    getQuestion: () => INDICATOR_TEXTS.cred2.question,
    getOptions: () => INDICATOR_TEXTS.cred2.options,
  },
  {
    id: 'div1',
    axis: 'D',
    entrepreneurOnly: false,
    getApplicability: (context) => {
      const inv = hasInvestments(context);
      if (inv === true) return { status: 'applicable' };
      if (inv === false) return { status: 'not_applicable', note: 'Aucun actif investi déclaré : un plan de diversification future peut être envisagé, sans pénalité.' };
      return { status: 'unknown', note: 'À clarifier : présence d’actifs investis (immobilier locatif, placements financiers, cryptoactifs, parts d’entreprise).' };
    },
    getQuestion: () => INDICATOR_TEXTS.div1.question,
    getOptions: () => INDICATOR_TEXTS.div1.options,
  },
  {
    id: 'div2',
    axis: 'D',
    entrepreneurOnly: false,
    getApplicability: (context) => {
      const inv = hasInvestments(context);
      if (inv === true) return { status: 'applicable' };
      if (inv === false) return { status: 'not_applicable' };
      return { status: 'unknown', note: 'À clarifier : présence d’actifs investis.' };
    },
    getQuestion: () => INDICATOR_TEXTS.div2.question,
    getOptions: () => INDICATOR_TEXTS.div2.options,
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
    id: 'cap2',
    axis: 'E',
    entrepreneurOnly: false,
    getApplicability: (context, answers) => {
      const inv = hasInvestments(context);
      const debt = hasDebtOrCreditProject(context, answers);
      if (inv === true || debt === true) return { status: 'applicable' };
      if (inv === false && debt === false) {
        return { status: 'not_applicable', note: 'Aucun investissement ni décision de financement engagée à ce jour.' };
      }
      return { status: 'unknown', note: 'À clarifier : présence d’investissements ou de décisions de financement engagées.' };
    },
    getQuestion: () => INDICATOR_TEXTS.cap2.question,
    getOptions: () => INDICATOR_TEXTS.cap2.options,
  },
  {
    id: 'prot1',
    axis: 'F',
    entrepreneurOnly: false,
    getApplicability: () => ({ status: 'applicable' }),
    getQuestion: () => INDICATOR_TEXTS.prot1.question,
    getOptions: () => INDICATOR_TEXTS.prot1.options,
  },
  {
    id: 'prot2',
    axis: 'F',
    entrepreneurOnly: false,
    getApplicability: () => ({ status: 'applicable' }),
    getQuestion: () => INDICATOR_TEXTS.prot2.question,
    getOptions: () => INDICATOR_TEXTS.prot2.options,
    extraDontKnowLabel: () => INDICATOR_TEXTS.prot2.dontKnowIfNeeded,
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
    id: 'p2',
    axis: 'A',
    entrepreneurOnly: true,
    getApplicability: () => ({ status: 'applicable' }),
    getQuestion: () => INDICATOR_TEXTS.p2.question,
    getOptions: () => INDICATOR_TEXTS.p2.options,
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
      return { status: 'unknown', note: 'À clarifier : existence d’excédents professionnels durables.' };
    },
    getQuestion: () => INDICATOR_TEXTS.p3.question,
    getOptions: () => INDICATOR_TEXTS.p3.options,
  },
  {
    id: 'p4',
    axis: 'C',
    entrepreneurOnly: true,
    gate: 'p4Gate',
    getApplicability: (context, answers) => {
      const need = hasProFinancingToTest(context, answers);
      if (need === true) return { status: 'applicable' };
      if (need === false) return { status: 'not_applicable', note: 'Aucune dette professionnelle, caution ou projet de financement déclaré.' };
      return { status: 'unknown', note: 'À clarifier : dette professionnelle, caution ou projet de financement en cours.' };
    },
    getQuestion: () => INDICATOR_TEXTS.p4.question,
    getOptions: () => INDICATOR_TEXTS.p4.options,
  },
];

export function getIndicator(id) {
  return INDICATORS.find((i) => i.id === id);
}

export function indicatorsForBranch(isEntrepreneurBranch) {
  return INDICATORS.filter((i) => isEntrepreneurBranch || !i.entrepreneurOnly);
}
