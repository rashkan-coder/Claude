// indicators.js — un indicateur objectif par pilier (deux pour la branche
// dirigeant/indépendant). Chaque indicateur note 0/1/2 à partir de faits
// déclarés (montants, tranches, choix structurels) — jamais d'un ressenti
// autodéclaré du type « avez-vous une vue complète de X ». Voir GRILLE.md
// pour la table complète des seuils utilisés par chaque computeScore.
'use strict';

import {
  hasInvestments,
  computeRunwayMonths,
  computeSavingsRate,
  computeRealEstateLeverage,
  computeDiversification,
  computeDormantMoney,
} from './facts.js';

// applicability status: 'applicable' | 'not_applicable' | 'unknown'
// 'unknown' = le fait qui déterminerait l'applicabilité n'est pas encore
// connu : l'indicateur reste compté au dénominateur (à clarifier), sans être
// exclu.

function scoreValue(v) {
  return { kind: 'value', value: v };
}
const UNKNOWN = { kind: 'unknown' };

export const INDICATORS = [
  // --- A — Sécurité financière -----------------------------------------
  {
    id: 'secu1',
    axis: 'A',
    entrepreneurOnly: false,
    getApplicability: () => ({ status: 'applicable' }),
    computeScore: (context) => {
      const months = computeRunwayMonths(context);
      if (months === null) return UNKNOWN;
      if (months < 3) return scoreValue(0);
      if (months <= 12) return scoreValue(1);
      return scoreValue(2);
    },
  },
  // --- B — Capacité à investir ------------------------------------------
  {
    id: 'capa1',
    axis: 'B',
    entrepreneurOnly: false,
    getApplicability: () => ({ status: 'applicable' }),
    computeScore: (context) => {
      const r = computeSavingsRate(context);
      if (r === null) return UNKNOWN;
      if (r.negative) return scoreValue(0);
      if (r.rate <= 0.1) return scoreValue(1);
      return scoreValue(2);
    },
  },
  // --- C — Levier bancaire -----------------------------------------------
  {
    id: 'levier1',
    axis: 'C',
    entrepreneurOnly: false,
    getApplicability: (context) => {
      const l = computeRealEstateLeverage(context);
      if (l.available) return { status: 'applicable' };
      if (l.reason === 'no_real_estate') return { status: 'not_applicable', note: 'Aucun bien immobilier détenu : ce levier n’est pas encore utilisé, sans pénalité.' };
      return { status: 'unknown', note: 'À clarifier : valeur du ou des biens et part encore financée à crédit.' };
    },
    computeScore: (context) => {
      const l = computeRealEstateLeverage(context);
      if (!l.available) return UNKNOWN;
      if (l.ltv <= 0) return scoreValue(0);
      if (l.ltv < 0.5) return scoreValue(1);
      return scoreValue(2);
    },
  },
  // --- D — Diversification ------------------------------------------------
  {
    id: 'diversif1',
    axis: 'D',
    entrepreneurOnly: false,
    getApplicability: (context) => {
      const inv = hasInvestments(context);
      if (inv === true) return { status: 'applicable' };
      if (inv === false) return { status: 'not_applicable', note: 'Aucun actif investi déclaré : un plan de diversification future peut être envisagé, sans pénalité.' };
      return { status: 'unknown', note: 'À clarifier : présence d’actifs investis (immobilier locatif, épargne/placements ou parts d’entreprise).' };
    },
    computeScore: (context) => {
      const d = computeDiversification(context);
      if (!d.available) return UNKNOWN;
      let tier = d.nbSupports >= 4 ? 2 : d.nbSupports >= 2 ? 1 : 0;
      if (d.concentrated && tier > 1) tier = 1; // concentration globale : plafonné, jamais aggravé au-delà
      return scoreValue(tier);
    },
  },
  // --- E — Capitalisation et efficacité ------------------------------------
  {
    id: 'capital1',
    axis: 'E',
    entrepreneurOnly: false,
    getApplicability: () => ({ status: 'applicable' }), // gérée via hasInvestments dans computeScore
    computeScore: (context) => {
      const d = computeDormantMoney(context);
      if (!d.available) {
        // Pas d'actif investi : rien à faire fructifier, l'axe n'est pas pénalisé
        // (cf. ancien comportement cap1 « pas de projet formalisé »).
        return d.invStatus === false ? scoreValue(2) : UNKNOWN;
      }
      if (d.dominant !== 'livrets') return scoreValue(2);
      return d.excedent > 0 ? scoreValue(0) : scoreValue(1);
    },
  },
  // --- F — Protection et transmission --------------------------------------
  {
    id: 'transmission1',
    axis: 'F',
    entrepreneurOnly: false,
    getApplicability: () => ({ status: 'applicable' }),
    computeScore: (context) => {
      const v = context.transmissionOrganisee;
      if (v === 'fait') return scoreValue(2);
      if (v === 'reflexion') return scoreValue(1);
      if (v === 'non') return scoreValue(0);
      return UNKNOWN;
    },
  },
  // --- Compléments entrepreneur --------------------------------------------
  {
    id: 'remuneration1',
    axis: 'B',
    entrepreneurOnly: true,
    getApplicability: () => ({ status: 'applicable' }),
    computeScore: (context) => {
      const v = context.entreprise && context.entreprise.remunerationComparee;
      if (v === 'oui') return scoreValue(2);
      if (v === 'non') return scoreValue(0);
      return UNKNOWN;
    },
  },
];

export function getIndicator(id) {
  return INDICATORS.find((i) => i.id === id);
}

export function indicatorsForBranch(isEntrepreneurBranch) {
  return INDICATORS.filter((i) => isEntrepreneurBranch || !i.entrepreneurOnly);
}

// Calcule (ou recalcule) la réponse de chaque indicateur applicable à partir
// du seul contexte — remplace la notion de « réponse saisie » par une notion
// de « réponse dérivée », mais garde exactement la même forme en sortie
// ({kind:'value',value} | {kind:'unknown'}) pour que engine.js et rules.js
// n'aient rien à savoir de la manière dont chaque score est obtenu.
export function deriveIndicatorAnswers(context) {
  const branch = context.situation === 'entrepreneur' ? 'entrepreneur' : 'particulier';
  const answers = {};
  for (const ind of indicatorsForBranch(branch === 'entrepreneur')) {
    answers[ind.id] = ind.computeScore(context);
  }
  return answers;
}
