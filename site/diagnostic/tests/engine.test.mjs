// Tests du moteur de calcul — exécuter avec : node site/diagnostic/tests/engine.test.mjs
// Aucune dépendance externe (pas de framework) : petites assertions maison.
// Référentiel v2 : chaque pilier est noté à partir de faits concrets
// (montants, tranches, choix structurels) — voir GRILLE.md pour la table
// complète des seuils utilisée par indicators.js/facts.js.
'use strict';

import assert from 'node:assert/strict';
import {
  computeResults,
  computeAxisResult,
  applicabilityMap,
  computeGrossAllocation,
  validateAmountInput,
} from '../engine.js';

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`FAIL  ${name}`);
    console.log('      ' + (err && err.message ? err.message : err));
  }
}

function field(value) {
  return { status: 'value', value };
}

function baseParticulier(overrides = {}) {
  return {
    situation: 'salarie',
    ageBracket: '35-54',
    foyerSituation: 'seul',
    residenceFiscale: 'france',
    objectifs: [],
    objectifPrioritaireId: null,
    revenusNets: field(3000),
    depensesEssentielles: field(2000),
    epargneDisponible: field(6000),
    epargneMensuelle: field(300),
    patrimoine: {
      residencePrincipaleProprietaire: 'non',
      residencePrincipale: field(0),
      residencePrincipaleCredit: null,
      autresBiensImmobiliers: 'non',
      immobilierLocatif: field(0),
      autresBiensCredit: null,
      supportsDetenus: ['aucun'],
      supportDominant: null,
      epargnePlacements: field(0),
      partsEntreprise: { mode: 'value', value: 0 },
      dettesAutres: field(0),
    },
    transmissionOrganisee: null,
    ...overrides,
  };
}

function baseEntrepreneur(overrides = {}) {
  return baseParticulier({
    situation: 'entrepreneur',
    entreprise: {
      activiteStabilite: 'stable',
      partRevenusDependante: 'plus-50',
      projetFinancementEnvisage: 'non',
      remunerationComparee: null,
      excedentTresorerie: 'non',
    },
    ...overrides,
  });
}

function withPatrimoine(context, patch) {
  return { ...context, patrimoine: { ...context.patrimoine, ...patch } };
}

// ---------------------------------------------------------------------
console.log('Axe A — Sécurité financière (mois de couverture)');

test('A1. couverture < 3 mois → score 0', () => {
  const ctx = baseParticulier({ depensesEssentielles: field(2000), epargneDisponible: field(1000) });
  const r = computeAxisResult('A', ctx, {});
  assert.equal(r.score, 0);
});
test('A2. couverture entre 3 et 12 mois → score 50', () => {
  const ctx = baseParticulier({ depensesEssentielles: field(2000), epargneDisponible: field(6000) }); // 3 mois pile
  const r = computeAxisResult('A', ctx, {});
  assert.equal(r.score, 50);
});
test('A3. couverture > 12 mois → score 100', () => {
  const ctx = baseParticulier({ depensesEssentielles: field(2000), epargneDisponible: field(30000) });
  const r = computeAxisResult('A', ctx, {});
  assert.equal(r.score, 100);
});
test('A4. dépenses ou épargne inconnues → non évalué, jamais 0', () => {
  const ctx = baseParticulier({ epargneDisponible: { status: 'unknown' } });
  const r = computeAxisResult('A', ctx, {});
  assert.equal(r.status, 'not_evaluated');
  assert.equal(r.score, null);
});

// ---------------------------------------------------------------------
console.log('\nAxe B — Capacité à investir (taux d’épargne)');

test('B1. épargne mensuelle négative → score 0 (à découvert)', () => {
  const ctx = baseParticulier({ epargneMensuelle: field(-100) });
  const r = computeAxisResult('B', ctx, {});
  assert.equal(r.score, 0);
});
test('B1b. épargne mensuelle nulle → score 0, jamais logée avec un taux positif', () => {
  const ctx = baseParticulier({ revenusNets: field(3000), epargneMensuelle: field(0) });
  const r = computeAxisResult('B', ctx, {});
  assert.equal(r.score, 0);
});
test('B2. taux d’épargne ≤ 10% → score 50', () => {
  const ctx = baseParticulier({ revenusNets: field(3000), epargneMensuelle: field(200) }); // ~6.7%
  const r = computeAxisResult('B', ctx, {});
  assert.equal(r.score, 50);
});
test('B3. taux d’épargne > 10% → score 100', () => {
  const ctx = baseParticulier({ revenusNets: field(3000), epargneMensuelle: field(600) }); // 20%
  const r = computeAxisResult('B', ctx, {});
  assert.equal(r.score, 100);
});

// ---------------------------------------------------------------------
console.log('\nAxe C — Levier bancaire (loan-to-value immobilier)');

test('C1. aucun bien immobilier → axe non applicable, sans pénalité', () => {
  const ctx = baseParticulier();
  const app = applicabilityMap(ctx, {});
  assert.equal(app.levier1.status, 'not_applicable');
  const r = computeAxisResult('C', ctx, {});
  assert.equal(r.status, 'not_applicable');
});
test('C2. résidence principale remboursée → levier non exploité, score 0', () => {
  const ctx = withPatrimoine(baseParticulier(), {
    residencePrincipaleProprietaire: 'oui',
    residencePrincipale: field(300000),
    residencePrincipaleCredit: 'aucun',
  });
  const r = computeAxisResult('C', ctx, {});
  assert.equal(r.score, 0);
});
test('C3. crédit ≈ 20% de la valeur → levier partiellement exploité, score 50', () => {
  const ctx = withPatrimoine(baseParticulier(), {
    residencePrincipaleProprietaire: 'oui',
    residencePrincipale: field(300000),
    residencePrincipaleCredit: 'leger',
  });
  const r = computeAxisResult('C', ctx, {});
  assert.equal(r.score, 50);
});
test('C4. crédit ≥ 50% de la valeur → levier bien exploité, score 100', () => {
  const ctx = withPatrimoine(baseParticulier(), {
    residencePrincipaleProprietaire: 'oui',
    residencePrincipale: field(300000),
    residencePrincipaleCredit: 'fort',
  });
  const r = computeAxisResult('C', ctx, {});
  assert.equal(r.score, 100);
});

// ---------------------------------------------------------------------
console.log('\nAxe D — Diversification');

test('D1. aucun actif investi → non applicable', () => {
  const ctx = baseParticulier();
  const r = computeAxisResult('D', ctx, {});
  assert.equal(r.status, 'not_applicable');
});
test('D2. un seul support détenu → score 0', () => {
  const ctx = withPatrimoine(baseParticulier(), { supportsDetenus: ['assuranceVie'], supportDominant: 'assuranceVie', epargnePlacements: field(50000) });
  const r = computeAxisResult('D', ctx, {});
  assert.equal(r.score, 0);
});
test('D3. quatre supports détenus, sans concentration → score 100', () => {
  const ctx = withPatrimoine(baseParticulier(), {
    supportsDetenus: ['livrets', 'assuranceVie', 'actions', 'scpi'],
    supportDominant: 'assuranceVie',
    epargnePlacements: field(50000),
  });
  const r = computeAxisResult('D', ctx, {});
  assert.equal(r.score, 100);
});
test('D4. quatre supports mais concentration immobilière globale → plafonné à 50', () => {
  const ctx = withPatrimoine(baseParticulier(), {
    supportsDetenus: ['livrets', 'assuranceVie', 'actions', 'scpi'],
    supportDominant: 'assuranceVie',
    epargnePlacements: field(50000),
    residencePrincipaleProprietaire: 'oui',
    residencePrincipale: field(400000),
    residencePrincipaleCredit: 'aucun',
  });
  const r = computeAxisResult('D', ctx, {});
  assert.equal(r.score, 50);
});

// ---------------------------------------------------------------------
console.log('\nAxe E — Capitalisation et efficacité (argent qui dort)');

test('E1. aucun actif investi → non pénalisé (rien à faire fructifier)', () => {
  const ctx = baseParticulier();
  const r = computeAxisResult('E', ctx, {});
  assert.equal(r.score, 100);
});
test('E2. dominant = livrets, épargne largement excédentaire → argent qui dort, score 0', () => {
  const ctx = withPatrimoine(baseParticulier({ depensesEssentielles: field(1500) }), {
    supportsDetenus: ['livrets'],
    supportDominant: 'livrets',
    epargnePlacements: field(50000), // très supérieur à 1.5×6×1500=13500
  });
  const r = computeAxisResult('E', ctx, {});
  assert.equal(r.score, 0);
});
test('E3. dominant = assurance-vie → capital jugé mis au travail, score 100', () => {
  const ctx = withPatrimoine(baseParticulier(), {
    supportsDetenus: ['assuranceVie'],
    supportDominant: 'assuranceVie',
    epargnePlacements: field(50000),
  });
  const r = computeAxisResult('E', ctx, {});
  assert.equal(r.score, 100);
});

// ---------------------------------------------------------------------
console.log('\nAxe F — Protection et transmission');

test('F1. transmission faite et à jour → score 100', () => {
  const r = computeAxisResult('F', baseParticulier({ transmissionOrganisee: 'fait' }), {});
  assert.equal(r.score, 100);
});
test('F2. rien n’est fait → score 0', () => {
  const r = computeAxisResult('F', baseParticulier({ transmissionOrganisee: 'non' }), {});
  assert.equal(r.score, 0);
});
test('F3. je ne sais pas → non évalué, jamais 0', () => {
  const r = computeAxisResult('F', baseParticulier({ transmissionOrganisee: 'inconnu' }), {});
  assert.equal(r.status, 'not_evaluated');
  assert.equal(r.score, null);
});

// ---------------------------------------------------------------------
console.log('\nBranche entrepreneur');

test('Ent1. rémunération jamais comparée → axe B tiré vers le bas', () => {
  const ctx = baseEntrepreneur({ epargneMensuelle: field(600) }); // capa1 = 100
  ctx.entreprise.remunerationComparee = 'non';
  const r = computeAxisResult('B', ctx, {});
  assert.equal(r.coverage, 1); // 2 indicateurs, 2 répondus
  assert.equal(r.score, 50); // (100 + 0) / 2
});
test('Ent2. excédent de trésorerie non déclaré → levier holding non prioritaire', () => {
  const ctx = baseEntrepreneur();
  ctx.entreprise.excedentTresorerie = 'non';
  const results = computeResults(ctx, {});
  assert.equal(results.levers.capitalisationHolding.status, 'non_prioritaire');
});
test('Ent3. excédent durable + objectif entreprise → levier holding à examiner', () => {
  const ctx = baseEntrepreneur({ objectifs: [{ id: 'entreprise', echeance: 'plus-8' }], objectifPrioritaireId: 'entreprise' });
  ctx.entreprise.excedentTresorerie = 'oui';
  const results = computeResults(ctx, {});
  assert.equal(results.levers.capitalisationHolding.status, 'a_examiner');
});

// ---------------------------------------------------------------------
console.log('\nPriorités et cohérence');

test('P1. épargne négative → priorité fragilité budgétaire, tableau de longueur 1', () => {
  const ctx = baseParticulier({ epargneMensuelle: field(-50) });
  const results = computeResults(ctx, {});
  assert.equal(results.priorities.length, 1);
  assert.equal(results.priorities[0].id, 'p1-depenses-non-couvertes');
});
test('P2. concentration immobilière — signalée, jamais une injonction de vendre', () => {
  const ctx = withPatrimoine(baseParticulier(), {
    residencePrincipaleProprietaire: 'oui',
    residencePrincipale: field(400000),
    residencePrincipaleCredit: 'aucun',
    autresBiensImmobiliers: 'oui',
    immobilierLocatif: field(200000),
    autresBiensCredit: 'aucun',
    epargnePlacements: field(50000),
    supportsDetenus: ['livrets'],
    supportDominant: 'livrets',
  });
  const alloc = computeGrossAllocation(ctx);
  assert.ok(alloc.available);
  const results = computeResults(ctx, {});
  assert.ok(results.priorities.some((p) => p.id === 'p3-concentration'));
  const p = results.priorities.find((r) => r.id === 'p3-concentration');
  assert.ok(!/vendre/i.test(p.action));
  assert.ok(!/vendre/i.test(p.text));
});
test('P3. patrimoine net nul — pas de division par zéro', () => {
  const ctx = baseParticulier();
  const alloc = computeGrossAllocation(ctx);
  assert.equal(alloc.available, false);
  assert.doesNotThrow(() => computeResults(ctx, {}));
});
test('P4. parts d’entreprise comptées une seule fois dans le patrimoine net', () => {
  const ctx = withPatrimoine(baseParticulier(), { partsEntreprise: { mode: 'value', value: 100000 } });
  const alloc = computeGrossAllocation(ctx);
  assert.ok(alloc.available);
  const keys = Object.keys(alloc.pct).filter((k) => k === 'partsEntreprise');
  assert.equal(keys.length, 1);
});
test('P5. crédit immobilier déclaré sans tranche connue → patrimoine net non calculable (jamais 0 par défaut)', () => {
  const ctx = withPatrimoine(baseParticulier(), {
    residencePrincipaleProprietaire: 'oui',
    residencePrincipale: field(300000),
    residencePrincipaleCredit: null,
  });
  const net = computeGrossAllocation(ctx);
  assert.equal(net.available, false);
});
test('P6. non-résident — fiscalité mutée vers une orientation transfrontalière', () => {
  const ctx = baseParticulier({ residenceFiscale: 'autre' });
  const results = computeResults(ctx, {});
  assert.equal(results.levers.fiscaliteFrais.status, 'informations_insuffisantes');
  assert.match(results.levers.fiscaliteFrais.action, /transfrontalière/);
  assert.equal(results.nonResident, true);
});
test('P7. toutes les données minimales manquantes — aucun axe n’affiche de score', () => {
  const ctx = { situation: 'salarie', ageBracket: '35-54', foyerSituation: 'seul', residenceFiscale: 'france', objectifs: [], patrimoine: {} };
  const results = computeResults(ctx, {});
  for (const axis of Object.values(results.axes)) {
    assert.notEqual(axis.status, 'ok');
  }
});

// ---------------------------------------------------------------------
console.log('\nInvariance');

test('déterminisme — même contexte ⇒ mêmes résultats', () => {
  const ctx = baseEntrepreneur({ epargneMensuelle: field(600) });
  ctx.entreprise.remunerationComparee = 'oui';
  const r1 = computeResults(ctx, {});
  const r2 = computeResults(ctx, {});
  assert.deepEqual(r1.axes, r2.axes);
  assert.deepEqual(r1.priorities, r2.priorities);
  assert.deepEqual(r1.levers, r2.levers);
});

test('le thème d’entrée du Reel n’influence jamais le calcul', () => {
  const context1 = baseParticulier();
  const context2 = baseParticulier({ reelTheme: 'holding' });
  const r1 = computeResults(context1, {});
  const r2 = computeResults(context2, {});
  assert.deepEqual(r1.axes, r2.axes);
});

test('monotonie — plus de couverture de sécurité ne peut jamais faire baisser le score de l’axe A', () => {
  const before = computeAxisResult('A', baseParticulier({ depensesEssentielles: field(2000), epargneDisponible: field(1000) }), {});
  const after = computeAxisResult('A', baseParticulier({ depensesEssentielles: field(2000), epargneDisponible: field(30000) }), {});
  assert.ok(after.score >= before.score);
});

test('validation — une chaîne vide n’est jamais silencieusement convertie en zéro', () => {
  const r = validateAmountInput('');
  assert.equal(r.valid, false);
});

test('validation — un montant négatif est rejeté par défaut, accepté si explicitement autorisé', () => {
  assert.equal(validateAmountInput('-50').valid, false);
  assert.equal(validateAmountInput('-50', { allowNegative: true }).valid, true);
});

console.log(`\n${passed} tests réussis, ${failed} échecs.`);
if (failed > 0) process.exit(1);
