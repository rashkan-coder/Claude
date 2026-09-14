// facts.js — petites fonctions pures qui dérivent des faits déclaratifs à partir
// du contexte (jamais de note ici). Utilisé par indicators.js (applicabilité) et
// engine.js (calcul, cohérence). Aucune dépendance DOM, aucun accès réseau.
'use strict';

// Un champ de saisie peut être {status:'value', value:Number} | {status:'unknown'}
// | {status:'refuse'}. On ne convertit jamais un champ vide/inconnu en 0.
export function fieldValue(field) {
  if (!field || field.status !== 'value') return null;
  if (typeof field.value !== 'number' || !Number.isFinite(field.value)) return null;
  return field.value;
}

export function fieldKnown(field) {
  return !!field && field.status === 'value';
}

export function isEntrepreneur(context) {
  return context.situation === 'independant' || context.situation === 'dirigeant';
}

// --- Patrimoine : présence d'actifs "investis" (hors résidence principale) ---
// true / false / 'unknown' (au moins un champ pertinent inconnu/refusé et aucun
// actif investi connu et positif par ailleurs).
export function hasInvestments(context) {
  const p = context.patrimoine || {};
  const relevant = [p.immobilierLocatif, p.epargnePlacements];
  let anyKnownPositive = false;
  let anyUnknown = false;
  for (const f of relevant) {
    if (fieldKnown(f)) {
      if ((f.value || 0) > 0) anyKnownPositive = true;
    } else {
      anyUnknown = true;
    }
  }
  // Parts d'entreprise : compte comme actif investi si valeur connue > 0.
  // "Valeur inconnue" ne compte ni pour ni contre le calcul du score, mais
  // signale une composition potentiellement incomplète.
  const parts = p.partsEntreprise;
  if (parts && parts.mode === 'value' && typeof parts.value === 'number' && parts.value > 0) {
    anyKnownPositive = true;
  } else if (parts && parts.mode === 'unknown') {
    anyUnknown = true;
  }
  if (anyKnownPositive) return true;
  if (anyUnknown) return 'unknown';
  return false;
}

// --- Dettes / projet de crédit (gate axe C) --------------------------------
export function hasDebtOrCreditProject(context, answers) {
  const gate = answers.creditGate;
  if (gate && gate.kind === 'value') return gate.value === 'oui' ? true : gate.value === 'non' ? false : 'unknown';
  return 'unknown';
}

// --- Gate excédents pro durables (P3) --------------------------------------
export function hasDurableSurplus(answers) {
  const gate = answers.p3Gate;
  if (gate && gate.kind === 'value') return gate.value === 'oui' ? true : gate.value === 'non' ? false : 'unknown';
  return 'unknown';
}

export function residenceNonFrancaise(context) {
  return context.residenceFiscale === 'autre' || context.residenceFiscale === 'incertaine';
}

// --- Indicateurs factuels complémentaires (section 7) ----------------------
// Chacun n'est renvoyé que si réellement calculable ; sinon {available:false}.
// Jamais de conversion silencieuse d'un champ vide/inconnu en zéro.

export function grossAssetFields(context) {
  const p = context.patrimoine || {};
  return {
    residencePrincipale: p.residencePrincipale,
    immobilierLocatif: p.immobilierLocatif,
    epargnePlacements: p.epargnePlacements,
  };
}

function partsEntrepriseKnownValue(context) {
  const parts = context.patrimoine && context.patrimoine.partsEntreprise;
  if (parts && parts.mode === 'value' && typeof parts.value === 'number' && Number.isFinite(parts.value)) {
    return parts.value;
  }
  return null;
}

export function computeNetWorth(context) {
  const fields = grossAssetFields(context);
  const values = {};
  for (const [key, f] of Object.entries(fields)) {
    const v = fieldValue(f);
    if (v === null) return { available: false };
    values[key] = v;
  }
  const parts = partsEntrepriseKnownValue(context);
  if (parts === null) return { available: false };
  values.partsEntreprise = parts;
  const dettesTotal = fieldValue(context.patrimoine && context.patrimoine.dettesTotal);
  if (dettesTotal === null) return { available: false };
  const grossTotal = Object.values(values).reduce((a, b) => a + b, 0);
  const net = grossTotal - dettesTotal;
  return { available: true, grossTotal, dettesTotal, net, breakdown: values };
}

export function computeGrossAllocation(context) {
  const net = computeNetWorth(context);
  if (!net.available) return { available: false };
  if (net.grossTotal <= 0) return { available: false, reason: 'gross_zero' };
  const pct = {};
  for (const [key, v] of Object.entries(net.breakdown)) {
    pct[key] = (v / net.grossTotal) * 100;
  }
  return { available: true, grossTotal: net.grossTotal, pct };
}

// Seuils pédagogiques de concentration (section 8) — ne diminuent jamais
// automatiquement une note ; simple repère d'attention, contextualisé.
export function computeConcentrationFlags(context) {
  const alloc = computeGrossAllocation(context);
  if (!alloc.available) return { available: false };
  const flags = [];
  const immoPct = (alloc.pct.residencePrincipale || 0) + (alloc.pct.immobilierLocatif || 0);
  if (immoPct > 70) flags.push({ id: 'immobilier', pct: immoPct });
  if ((alloc.pct.partsEntreprise || 0) > 50) flags.push({ id: 'entreprise', pct: alloc.pct.partsEntreprise });
  return { available: true, flags };
}

export function computeIlliquidShare(context) {
  const net = computeNetWorth(context);
  if (!net.available || net.grossTotal <= 0) return { available: false };
  const illiquid = (net.breakdown.residencePrincipale || 0) + (net.breakdown.immobilierLocatif || 0) + (net.breakdown.partsEntreprise || 0);
  return { available: true, pct: (illiquid / net.grossTotal) * 100 };
}
