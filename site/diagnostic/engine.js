// engine.js — fonctions de calcul pures (aucun DOM, aucun réseau, aucun appel
// à un modèle génératif). Toute la logique de score, de couverture, de
// cohérence et de priorisation vit ici, pour rester testable indépendamment
// de l'interface (voir tests/engine.test.mjs).
'use strict';

import { RULE_VERSION, AXES, LEVELS } from './content.js';
import { INDICATORS, indicatorsForBranch } from './indicators.js';
import {
  isEntrepreneur,
  fieldValue,
  residenceNonFrancaise,
  computeNetWorth,
  computeGrossAllocation,
  computeConcentrationFlags,
  computeIlliquidShare,
} from './facts.js';
import { computePriorities, computeLevers } from './rules.js';

export { RULE_VERSION, AXES, LEVELS };
export { computeNetWorth, computeGrossAllocation, computeConcentrationFlags, computeIlliquidShare };

export function deriveBranch(context) {
  return isEntrepreneur(context) ? 'entrepreneur' : 'particulier';
}

// Liste fixe des indicateurs actifs pour la branche (ordre d'affichage).
export function activeIndicatorIds(context) {
  const branch = deriveBranch(context);
  return indicatorsForBranch(branch === 'entrepreneur').map((i) => i.id);
}

// --- Validation des champs numériques (section 7) --------------------------
// Ne convertit jamais une chaîne vide / "je ne sais pas" en 0.
export function validateAmountInput(raw, { allowZero = true } = {}) {
  if (raw === '' || raw === null || raw === undefined) {
    return { valid: false, error: 'Merci de renseigner un montant, ou de choisir « je ne sais pas ».' };
  }
  const n = Number(String(raw).replace(',', '.').replace(/\s/g, ''));
  if (!Number.isFinite(n)) return { valid: false, error: 'Merci de saisir un nombre.' };
  if (n < 0) return { valid: false, error: 'Merci de saisir un montant positif ou nul.' };
  if (!allowZero && n === 0) return { valid: false, error: 'Merci de saisir un montant supérieur à zéro, ou « je ne sais pas ».' };
  return { valid: true, value: n };
}

export function validatePercentInput(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    return { valid: false, error: 'Merci de saisir un pourcentage entre 0 et 100.' };
  }
  return { valid: true, value: n };
}

// --- Applicabilité -----------------------------------------------------
export function applicabilityMap(context, answers) {
  const branch = deriveBranch(context);
  const map = {};
  for (const ind of indicatorsForBranch(branch === 'entrepreneur')) {
    map[ind.id] = ind.getApplicability(context, answers);
  }
  return map;
}

// --- Score d'un indicateur ------------------------------------------------
// Renvoie {kind:'value', value} | {kind:'unknown'} | {kind:'refuse'} | null (non répondu)
export function resolvedAnswer(id, context, answers) {
  return answers[id] || null;
}

// --- Score et couverture par axe -------------------------------------------
export function computeAxisResult(axisId, context, answers, contradictions = []) {
  const branch = deriveBranch(context);
  const appMap = applicabilityMap(context, answers);
  const indicatorsOfAxis = indicatorsForBranch(branch === 'entrepreneur').filter((i) => i.axis === axisId);

  let applicableCount = 0;
  let answeredCount = 0;
  let sum = 0;
  for (const ind of indicatorsOfAxis) {
    const app = appMap[ind.id];
    if (app.status === 'not_applicable') continue; // exclu du dénominateur
    applicableCount += 1; // 'applicable' et 'unknown' comptent au dénominateur
    if (isSuspended(ind.id, contradictions)) continue; // incohérence non résolue : compte au dénominateur, pas au numérateur
    const ans = resolvedAnswer(ind.id, context, answers);
    if (ans && ans.kind === 'value') {
      answeredCount += 1;
      sum += ans.value;
    }
  }

  if (applicableCount === 0) {
    return { axis: axisId, status: 'not_applicable', score: null, coverage: null, answeredCount: 0, applicableCount: 0 };
  }
  const coverage = answeredCount / applicableCount;
  if (coverage < 2 / 3) {
    return { axis: axisId, status: 'not_evaluated', score: null, coverage, answeredCount, applicableCount };
  }
  const raw = (sum / answeredCount) * 25;
  const score = Math.round(raw / 5) * 5;
  return { axis: axisId, status: 'ok', score, level: levelFor(score), coverage, answeredCount, applicableCount };
}

export function levelFor(score) {
  for (const l of LEVELS) {
    if (score <= l.max) return l;
  }
  return LEVELS[LEVELS.length - 1];
}

export function computeAllAxes(context, answers, contradictions = []) {
  const result = {};
  for (const axis of AXES) {
    result[axis.id] = computeAxisResult(axis.id, context, answers, contradictions);
  }
  return result;
}

export function overallCoverage(context, answers) {
  const appMap = applicabilityMap(context, answers);
  let applicableCount = 0;
  let answeredCount = 0;
  for (const ind of indicatorsForBranch(deriveBranch(context) === 'entrepreneur')) {
    const app = appMap[ind.id];
    if (app.status === 'not_applicable') continue;
    applicableCount += 1;
    const ans = resolvedAnswer(ind.id, context, answers);
    if (ans && ans.kind === 'value') answeredCount += 1;
  }
  return { applicableCount, answeredCount, ratio: applicableCount ? answeredCount / applicableCount : null };
}

// --- Cohérence (section 7) --------------------------------------------------
// Une incohérence non résolue rend indisponible le seul calcul concerné —
// jamais tout le diagnostic. Réduit aux deux contrôles calculables avec le
// contexte simplifié (voir GRILLE.md).
export function detectContradictions(context, answers) {
  const issues = [];
  const anyAssetPositive = context.patrimoine && Object.values(context.patrimoine).some((f) => f && f.status === 'value' && f.value > 0);
  const epargnePositive = context.patrimoine && (fieldValue(context.patrimoine.epargnePlacements) || 0) > 0;
  if (epargnePositive && anyAssetPositive === false) {
    issues.push({ id: 'patrimoine-nul-mais-placements', message: 'Un patrimoine nul est déclaré, alors qu’une épargne ou des placements positifs sont renseignés.', affects: ['div1'] });
  }
  const parts = context.patrimoine && context.patrimoine.partsEntreprise;
  const entreprise = context.entreprise || {};
  if (deriveBranch(context) === 'entrepreneur' && parts && parts.mode === 'value' && parts.value === 0 && entreprise.activiteStabilite === 'stable') {
    issues.push({ id: 'entreprise-sans-valeur-mais-active', message: 'Votre activité est déclarée stable, mais la valeur de vos parts d’entreprise est renseignée à zéro.', affects: ['p3'] });
  }
  return issues;
}

function isSuspended(indicatorId, contradictions) {
  return contradictions.some((c) => c.affects.includes(indicatorId));
}

// --- Purge des réponses devenues inapplicables ------------------------------
// À appeler après toute modification d'une réponse de contexte (ex. retour en
// arrière) pour ne jamais garder au calcul une réponse qui ne s'applique plus.
export function pruneAnswers(context, answers) {
  const branch = deriveBranch(context);
  const next = { ...answers };
  for (const ind of INDICATORS) {
    if (ind.entrepreneurOnly && branch !== 'entrepreneur') {
      delete next[ind.id];
      if (ind.gate) delete next[ind.gate];
      continue;
    }
  }
  const appMap = applicabilityMap(context, next);
  for (const ind of indicatorsForBranch(branch === 'entrepreneur')) {
    if (appMap[ind.id] && appMap[ind.id].status === 'not_applicable' && next[ind.id]) {
      delete next[ind.id];
    }
  }
  return next;
}

// --- Résultats consolidés ---------------------------------------------------
export function computeResults(context, answers) {
  // rules.js lit context.branch directement : on l'y injecte systématiquement
  // ici plutôt que de faire porter cette responsabilité à chaque appelant.
  const branch = deriveBranch(context);
  const ctx = { ...context, branch };
  const contradictions = detectContradictions(ctx, answers);
  const axesResults = computeAllAxes(ctx, answers, contradictions);
  const appMap = applicabilityMap(ctx, answers);
  const priorities = computePriorities({ context: ctx, answers, applicability: appMap, axesResults });
  const levers = computeLevers({ context: ctx, answers, applicability: appMap });
  const coverage = overallCoverage(ctx, answers);
  return {
    ruleVersion: RULE_VERSION,
    generatedAt: new Date().toISOString(),
    branch,
    nonResident: residenceNonFrancaise(context),
    axes: axesResults,
    coverage,
    priorities,
    levers,
    contradictions,
    factuals: {
      netWorth: computeNetWorth(context),
      grossAllocation: computeGrossAllocation(context),
      illiquidShare: computeIlliquidShare(context),
      concentration: computeConcentrationFlags(context),
    },
  };
}
