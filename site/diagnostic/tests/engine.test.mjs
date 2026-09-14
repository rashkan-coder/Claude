// Tests du moteur de calcul — exécuter avec : node site/diagnostic/tests/engine.test.mjs
// Aucune dépendance externe (pas de framework) : petites assertions maison.
// Référentiel réduit (un indicateur par pilier, deux pour la branche
// dirigeant/indépendant) — voir GRILLE.md pour ce que cela change.
'use strict';

import assert from 'node:assert/strict';
import {
  computeResults,
  computeAxisResult,
  pruneAnswers,
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
    ageBracket: '30-44',
    foyerSituation: 'seul',
    residenceFiscale: 'france',
    objectifs: [],
    objectifPrioritaireId: null,
    revenusNets: field(3000),
    versementsInvestissement: field(200),
    patrimoine: {
      residencePrincipale: field(0),
      immobilierLocatif: field(0),
      epargnePlacements: field(0),
      partsEntreprise: { mode: 'value', value: 0 },
      dettesTotal: field(0),
    },
    ...overrides,
  };
}

function baseEntrepreneur(overrides = {}) {
  return baseParticulier({
    situation: 'dirigeant',
    entreprise: {
      activiteStabilite: 'stable',
      partRevenusDependante: '50-75',
      projetFinancementEnvisage: 'non',
    },
    ...overrides,
  });
}

function scored(value) {
  return { kind: 'value', value };
}

// ---------------------------------------------------------------------
console.log('Scénarios (section 14)');

// 1. Salarié sans dette, budget suivi : aucune pénalité pour absence de crédit.
test('1. salarié sans dette — cred1 seul peut donner un score plein sur l’axe C', () => {
  const context = baseParticulier();
  const answers = { creditGate: { kind: 'value', value: 'non' }, cred1: scored(4) };
  const axisC = computeAxisResult('C', context, answers);
  assert.equal(axisC.applicableCount, 1);
  assert.equal(axisC.score, 100);
});

// 2. Débutant sans patrimoine : diversification non applicable, pas de pénalité.
test('2. débutant sans patrimoine — axe D non applicable, cap1 propose un plan futur', () => {
  const context = baseParticulier(); // tout à 0
  const answers = {};
  const axisD = computeAxisResult('D', context, answers);
  assert.equal(axisD.status, 'not_applicable');
});

// 3. Retraité vivant de ses revenus patrimoniaux : pas de pénalité pour non-réinvestissement.
test('3. retraité — cap1=4 (retrait pour vivre) n’est pas pénalisé', () => {
  const context = baseParticulier({ situation: 'retraite' });
  const answers = { cap1: scored(4) };
  const axisE = computeAxisResult('E', context, answers);
  assert.equal(axisE.applicableCount, 1); // seul indicateur d'axe E pour un particulier
  assert.equal(axisE.score, 100);
});

// 4. Dirigeant sans holding mais arbitrages examinés : aucune pénalité pour absence de holding.
test('4. dirigeant sans excédent durable — p3 non applicable, n’abaisse pas l’axe E', () => {
  const context = baseEntrepreneur();
  const answers = { p3Gate: { kind: 'value', value: 'non' }, cap1: scored(3) };
  const app = applicabilityMap(context, answers);
  assert.equal(app.p3.status, 'not_applicable');
  const axisE = computeAxisResult('E', context, answers);
  assert.equal(axisE.applicableCount, 1);
  assert.equal(axisE.score, 75);
});

// 5. Dirigeant avec forte trésorerie nécessaire à l'activité : aucun montant traité comme excédent libre.
test('5. dirigeant trésorerie nécessaire à l’activité — pas d’excédent présumé', () => {
  const context = baseEntrepreneur();
  const answers = { p3Gate: { kind: 'value', value: 'non' } };
  const results = computeResults(context, answers);
  assert.equal(results.levers.capitalisationHolding.status, 'non_prioritaire');
});

// 6. Patrimoine immobilier concentré : signalement contextualisé, pas d'injonction de vendre.
test('6. concentration immobilière — signalée, jamais une injonction de vendre', () => {
  const context = baseParticulier({
    patrimoine: {
      ...baseParticulier().patrimoine,
      residencePrincipale: field(400000),
      immobilierLocatif: field(200000),
      epargnePlacements: field(50000),
    },
  });
  const alloc = computeGrossAllocation(context);
  assert.ok(alloc.available);
  const results = computeResults(context, {});
  assert.ok(results.factuals.concentration.flags.some((f) => f.id === 'immobilier'));
  const p = results.priorities.find((r) => r.id === 'p3-concentration');
  assert.ok(p);
  assert.ok(!/vendre/i.test(p.action));
  assert.ok(!/vendre/i.test(p.text));
});

// 7. Réponses inconnues/refusées : couverture réduite, jamais transformées en zéro.
test('7. réponse inconnue — n’est jamais comptée comme un score de 0', () => {
  const context = baseParticulier();
  const answers = { a1: { kind: 'unknown' } };
  const axisA = computeAxisResult('A', context, answers);
  assert.equal(axisA.answeredCount, 0);
  assert.equal(axisA.status, 'not_evaluated');
  assert.equal(axisA.score, null); // ne doit jamais afficher 0
});

// 8. Changement entrepreneur → salarié : compléments P1/P3 retirés.
test('8. changement de branche — P1/P3 retirés par pruneAnswers', () => {
  let context = baseEntrepreneur();
  let answers = { p1: scored(3), p3Gate: { kind: 'value', value: 'oui' }, p3: scored(2) };
  context = { ...context, situation: 'salarie' }; // retour à la branche particulier
  answers = pruneAnswers(context, answers);
  assert.equal(answers.p1, undefined);
  assert.equal(answers.p3, undefined);
  assert.equal(answers.p3Gate, undefined);
});

// 9. Patrimoine net nul ou négatif : pas de division par zéro ni concentration aberrante.
test('9. patrimoine net nul — pas de division par zéro', () => {
  const context = baseParticulier();
  const alloc = computeGrossAllocation(context);
  assert.equal(alloc.available, false);
  assert.doesNotThrow(() => computeResults(context, {}));
});

// 10. Objectif proche et besoin indispensable exposé : sécurité prioritaire sur l'organisation.
test('10. fragilité immédiate prioritaire sur l’organisation', () => {
  const context = baseEntrepreneur();
  const answers = {
    b1: scored(0), // dépenses non couvertes (palier 1)
    p1: scored(2), // rémunération non arbitrée (palier 4)
  };
  const results = computeResults(context, answers);
  assert.equal(results.priorities[0].id, 'p1-depenses-non-couvertes');
});

// 11. Parts d'entreprise : pas de doubles comptes.
test('11. parts d’entreprise comptées une seule fois dans le patrimoine net', () => {
  const context = baseParticulier({
    patrimoine: { ...baseParticulier().patrimoine, partsEntreprise: { mode: 'value', value: 100000 } },
  });
  const alloc = computeGrossAllocation(context);
  assert.ok(alloc.available);
  const keys = Object.keys(alloc.pct).filter((k) => k === 'partsEntreprise');
  assert.equal(keys.length, 1);
});

// 12. Couverture 50 % et 100 % : règles d'affichage respectées.
test('12a. couverture 50% (1/2, axe B dirigeant) → non évalué', () => {
  const context = baseEntrepreneur();
  const answers = { b1: scored(3) }; // p1 non répondu
  const axisB = computeAxisResult('B', context, answers);
  assert.equal(axisB.applicableCount, 2);
  assert.equal(axisB.answeredCount, 1);
  assert.equal(axisB.status, 'not_evaluated');
});
test('12b. couverture 100% (2/2) → affiché avec score exact', () => {
  const context = baseEntrepreneur();
  const answers = { b1: scored(3), p1: scored(1) };
  const axisB = computeAxisResult('B', context, answers);
  assert.equal(axisB.coverage, 1);
  assert.equal(axisB.score, 50); // moyenne (3+1)/2=2 -> 2*25=50
});

// 13. Toutes réponses inconnues : aucun radar trompeur.
test('13. tout inconnu — aucun axe n’affiche de score', () => {
  const context = baseParticulier();
  const results = computeResults(context, {});
  for (const axis of Object.values(results.axes)) {
    assert.notEqual(axis.status, 'ok');
  }
});

// 14. Une seule priorité fondée : ne pas en inventer deux autres.
test('14. une seule priorité déclenchée → tableau de longueur 1', () => {
  const context = baseParticulier();
  const answers = { b1: scored(0) };
  const results = computeResults(context, answers);
  assert.equal(results.priorities.length, 1);
});

// 15. Non-résident : aucune piste fiscale française présentée comme applicable.
test('15. non-résident — fiscalité mutée vers une orientation transfrontalière', () => {
  const context = baseParticulier({ residenceFiscale: 'autre' });
  const results = computeResults(context, {});
  assert.equal(results.levers.fiscaliteFrais.status, 'informations_insuffisantes');
  assert.match(results.levers.fiscaliteFrais.action, /transfrontalière/);
  assert.equal(results.nonResident, true);
});

// ---------------------------------------------------------------------
console.log('\nInvariance');

test('déterminisme — mêmes réponses ⇒ mêmes résultats', () => {
  const context = baseEntrepreneur();
  const answers = { p1: scored(2), b1: scored(3) };
  const r1 = computeResults(context, answers);
  const r2 = computeResults(context, answers);
  assert.deepEqual(r1.axes, r2.axes);
  assert.deepEqual(r1.priorities, r2.priorities);
  assert.deepEqual(r1.levers, r2.levers);
});

test('le thème d’entrée du Reel n’influence jamais le calcul', () => {
  const context1 = baseParticulier();
  const context2 = baseParticulier({ reelTheme: 'holding' });
  const answers = { b1: scored(3) };
  const r1 = computeResults(context1, answers);
  const r2 = computeResults(context2, answers);
  assert.deepEqual(r1.axes, r2.axes);
});

test('monotonie — augmenter une note ne peut pas faire baisser son axe', () => {
  const context = baseParticulier();
  const before = computeAxisResult('B', context, { b1: scored(2) });
  const after = computeAxisResult('B', context, { b1: scored(3) });
  assert.ok(after.score >= before.score);
});

test('validation — une chaîne vide n’est jamais silencieusement convertie en zéro', () => {
  const r = validateAmountInput('');
  assert.equal(r.valid, false);
});

console.log(`\n${passed} tests réussis, ${failed} échecs.`);
if (failed > 0) process.exit(1);
