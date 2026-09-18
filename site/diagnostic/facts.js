// facts.js — petites fonctions pures qui dérivent des faits déclaratifs à partir
// du contexte (jamais de note ici, sauf les fonctions compute*Score en bas qui
// traduisent un fait objectif en palier 0/1/2 — voir GRILLE.md pour la table
// complète des seuils). Utilisé par indicators.js (notation + applicabilité)
// et rules.js (priorités/leviers). Aucune dépendance DOM, aucun accès réseau.
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
  return context.situation === 'entrepreneur';
}

export function residenceNonFrancaise(context) {
  return context.residenceFiscale === 'autre' || context.residenceFiscale === 'incertaine';
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

// --- Excédent professionnel durable (branche entrepreneur) -----------------
// Remplace l'ancienne question p3Gate : lu directement depuis context.entreprise,
// renseigné en une seule question (voir content.js / GRILLE.md).
export function hasDurableSurplus(context) {
  const v = context.entreprise && context.entreprise.excedentTresorerie;
  if (v === 'oui') return true;
  if (v === 'non') return false;
  return 'unknown';
}

// --- Patrimoine net et allocation (inchangé) --------------------------------

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

// Dette totale = crédits immobiliers estimés (via les tranches déclarées,
// section « Levier bancaire ») + autres dettes déclarées (hors immobilier).
// Ne remonte un montant que si tous les éléments nécessaires sont connus.
export function computeTotalDebt(context) {
  const p = context.patrimoine || {};
  const autresDettes = fieldValue(p.dettesAutres);
  if (autresDettes === null) return null;
  const leverage = computeRealEstateLeverage(context);
  let creditImmo = 0;
  if (leverage.available) {
    creditImmo = leverage.totalCredit;
  } else if (leverage.reason === 'unknown_values') {
    return null; // bien détenu mais valeur/tranche de crédit manquante : dette non calculable
  }
  // reason === 'no_real_estate' → creditImmo reste 0, c'est un fait, pas une inconnue.
  return autresDettes + creditImmo;
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
  const dettesTotal = computeTotalDebt(context);
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

// --- Faits objectifs utilisés pour noter les six piliers --------------------
// Chacun n'est disponible que si les champs nécessaires sont connus ; sinon
// {available:false}. Jamais de conversion silencieuse d'un champ vide en zéro.
// Les seuils de notation eux-mêmes (compute*Score plus bas) sont volontairement
// regroupés et documentés pour rester ajustables en un seul endroit.

// Tranche de crédit restant dû déclarée pour un bien, convertie en un point
// représentatif de pourcentage de la valeur du bien encore financé à crédit.
// « Plus de 50 % » n'a pas de borne haute déclarée : 70 % est un point milieu
// indicatif (à ajuster si besoin), pas une valeur mesurée.
export const CREDIT_BRACKET_PCT = { aucun: 0, leger: 0.2, moyen: 0.5, fort: 0.7 };

export function computeRunwayMonths(context) {
  const depenses = fieldValue(context.depensesEssentielles);
  const dispo = fieldValue(context.epargneDisponible);
  if (depenses === null || dispo === null) return null;
  if (depenses <= 0) return dispo > 0 ? Infinity : 0;
  return dispo / depenses;
}

export function computeSavingsRate(context) {
  const revenus = fieldValue(context.revenusNets);
  const epargne = fieldValue(context.epargneMensuelle);
  if (revenus === null || epargne === null) return null;
  if (epargne < 0) return { negative: true, rate: null };
  if (revenus <= 0) return null; // taux non calculable sans revenu de référence
  return { negative: false, rate: epargne / revenus };
}

// Effet de levier bancaire immobilier : part de la valeur totale de
// l'immobilier détenu encore financée à crédit (loan-to-value agrégé).
// L'absence de bien immobilier n'est pas une inconnue : c'est un fait
// (« no_real_estate »), qui rend l'axe non applicable plutôt que pénalisé.
export function computeRealEstateLeverage(context) {
  const p = context.patrimoine || {};
  const rpOwned = p.residencePrincipaleProprietaire === 'oui';
  const autresOwned = p.autresBiensImmobiliers === 'oui';
  if (!rpOwned && !autresOwned) return { available: false, reason: 'no_real_estate', totalCredit: 0 };

  let totalValue = 0;
  let totalCredit = 0;
  let missing = false;

  if (rpOwned) {
    const v = fieldValue(p.residencePrincipale);
    const bracket = p.residencePrincipaleCredit;
    if (v === null || !bracket) missing = true;
    else {
      totalValue += v;
      totalCredit += v * (CREDIT_BRACKET_PCT[bracket] || 0);
    }
  }
  if (autresOwned) {
    const v = fieldValue(p.immobilierLocatif);
    const bracket = p.autresBiensCredit;
    if (v === null || !bracket) missing = true;
    else {
      totalValue += v;
      totalCredit += v * (CREDIT_BRACKET_PCT[bracket] || 0);
    }
  }
  if (missing || totalValue <= 0) return { available: false, reason: 'unknown_values', totalCredit: 0 };
  return { available: true, ltv: totalCredit / totalValue, totalCredit };
}

// Diversification : nombre de supports d'épargne/investissement distincts
// déclarés, plafonné si une concentration importante a par ailleurs été
// détectée sur le patrimoine global (résidence+locatif ou parts d'entreprise).
export function computeDiversification(context) {
  const inv = hasInvestments(context);
  if (inv !== true) return { available: false, invStatus: inv };
  const supports = (context.patrimoine && context.patrimoine.supportsDetenus) || [];
  const nbSupports = supports.filter((s) => s !== 'aucun').length;
  const concentration = computeConcentrationFlags(context);
  const concentrated = concentration.available && concentration.flags.length > 0;
  return { available: true, nbSupports, concentrated };
}

// « Argent qui dort » : épargne financière dominée par des supports non
// investis (livrets/comptes) alors que son montant dépasse largement le
// besoin de sécurité déjà couvert par le matelas (axe A).
export function computeDormantMoney(context) {
  const inv = hasInvestments(context);
  if (inv !== true) return { available: false, invStatus: inv };
  const p = context.patrimoine || {};
  const dominant = p.supportDominant || (Array.isArray(p.supportsDetenus) && p.supportsDetenus.length === 1 ? p.supportsDetenus[0] : null);
  const epargnePlacements = fieldValue(p.epargnePlacements);
  const depenses = fieldValue(context.depensesEssentielles);
  if (dominant === null || epargnePlacements === null || depenses === null) return { available: false, invStatus: 'unknown' };
  const besoinSecurite = depenses * 6; // repère de matelas cible, cohérent avec l'axe A
  return { available: true, dominant, excedent: epargnePlacements - besoinSecurite * 1.5 };
}
