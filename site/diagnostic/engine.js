// engine.js — fonctions de calcul pures (aucun DOM, aucun réseau, aucun appel
// à un modèle génératif). Toute la logique de score, de couverture, de
// cohérence et de priorisation vit ici, pour rester testable indépendamment
// de l'interface (voir tests/engine.test.mjs).
'use strict';

import { RULE_VERSION, AXES, LEVELS } from './content.js';
import { indicatorsForBranch, deriveIndicatorAnswers } from './indicators.js';
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

// Chaque indicateur est désormais calculé à partir du contexte (montants,
// tranches, choix structurels) plutôt que saisi directement par la personne —
// voir indicators.js. On fusionne systématiquement ces réponses dérivées avec
// les réponses éventuellement déjà présentes (aucune aujourd'hui, gardé pour
// ne pas casser un appelant qui passerait un objet answers non vide).
function withDerivedAnswers(context, answers) {
  return { ...answers, ...deriveIndicatorAnswers(context) };
}

// --- Validation des champs numériques (section 7) --------------------------
// Ne convertit jamais une chaîne vide / "je ne sais pas" en 0.
export function validateAmountInput(raw, { allowZero = true, allowNegative = false } = {}) {
  if (raw === '' || raw === null || raw === undefined) {
    return { valid: false, error: 'Merci de renseigner un montant, ou de choisir « je ne sais pas ».' };
  }
  const n = Number(String(raw).replace(',', '.').replace(/\s/g, ''));
  if (!Number.isFinite(n)) return { valid: false, error: 'Merci de saisir un nombre.' };
  if (!allowNegative && n < 0) return { valid: false, error: 'Merci de saisir un montant positif ou nul.' };
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
// Renvoie {kind:'value', value} | {kind:'unknown'} | null (non résolu)
export function resolvedAnswer(id, context, answers) {
  return answers[id] || null;
}

// --- Score et couverture par axe -------------------------------------------
export function computeAxisResult(axisId, context, answers, contradictions = []) {
  const merged = withDerivedAnswers(context, answers);
  const branch = deriveBranch(context);
  const appMap = applicabilityMap(context, merged);
  const indicatorsOfAxis = indicatorsForBranch(branch === 'entrepreneur').filter((i) => i.axis === axisId);

  let applicableCount = 0;
  let answeredCount = 0;
  let sum = 0;
  for (const ind of indicatorsOfAxis) {
    const app = appMap[ind.id];
    if (app.status === 'not_applicable') continue; // exclu du dénominateur
    applicableCount += 1; // 'applicable' et 'unknown' comptent au dénominateur
    if (isSuspended(ind.id, contradictions)) continue; // incohérence non résolue : compte au dénominateur, pas au numérateur
    const ans = resolvedAnswer(ind.id, context, merged);
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
  // Chaque indicateur note de 0 à 2 (échelle à 3 niveaux) : ×50 ramène la
  // moyenne sur 100 (2 × 50 = 100).
  const raw = (sum / answeredCount) * 50;
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
  const merged = withDerivedAnswers(context, answers);
  const appMap = applicabilityMap(context, merged);
  let applicableCount = 0;
  let answeredCount = 0;
  for (const ind of indicatorsForBranch(deriveBranch(context) === 'entrepreneur')) {
    const app = appMap[ind.id];
    if (app.status === 'not_applicable') continue;
    applicableCount += 1;
    const ans = resolvedAnswer(ind.id, context, merged);
    if (ans && ans.kind === 'value') answeredCount += 1;
  }
  return { applicableCount, answeredCount, ratio: applicableCount ? answeredCount / applicableCount : null };
}

// --- Cohérence (section 7) --------------------------------------------------
// Une incohérence non résolue rend indisponible le seul calcul concerné —
// jamais tout le diagnostic.
export function detectContradictions(context, answers) {
  const issues = [];
  const anyAssetPositive = context.patrimoine && Object.values(context.patrimoine).some((f) => f && f.status === 'value' && f.value > 0);
  const epargnePositive = context.patrimoine && (fieldValue(context.patrimoine.epargnePlacements) || 0) > 0;
  if (epargnePositive && anyAssetPositive === false) {
    issues.push({ id: 'patrimoine-nul-mais-placements', message: 'Un patrimoine nul est déclaré, alors qu’une épargne ou des placements positifs sont renseignés.', affects: ['diversif1'] });
  }
  const parts = context.patrimoine && context.patrimoine.partsEntreprise;
  const entreprise = context.entreprise || {};
  if (deriveBranch(context) === 'entrepreneur' && parts && parts.mode === 'value' && parts.value === 0 && entreprise.activiteStabilite === 'stable') {
    issues.push({ id: 'entreprise-sans-valeur-mais-active', message: 'Votre activité est déclarée stable, mais la valeur de vos parts d’entreprise est renseignée à zéro.', affects: ['capital1'] });
  }
  return issues;
}

function isSuspended(indicatorId, contradictions) {
  return contradictions.some((c) => c.affects.includes(indicatorId));
}

// --- Résultats consolidés ---------------------------------------------------
export function computeResults(context, answers) {
  // rules.js lit context.branch directement : on l'y injecte systématiquement
  // ici plutôt que de faire porter cette responsabilité à chaque appelant.
  const branch = deriveBranch(context);
  const ctx = { ...context, branch };
  const merged = withDerivedAnswers(ctx, answers);
  const contradictions = detectContradictions(ctx, merged);
  const axesResults = computeAllAxes(ctx, merged, contradictions);
  const appMap = applicabilityMap(ctx, merged);
  const priorities = computePriorities({ context: ctx, answers: merged, applicability: appMap, axesResults });
  const levers = computeLevers({ context: ctx, answers: merged, applicability: appMap });
  const coverage = overallCoverage(ctx, merged);
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
