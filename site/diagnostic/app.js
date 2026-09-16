// app.js — interface uniquement. Toute la logique de score, d'applicabilité
// et de priorisation vit dans engine.js / indicators.js / rules.js ; ce
// fichier se contente de collecter les réponses et d'afficher les résultats.
'use strict';

import * as C from './content.js';
import { INDICATORS, getIndicator } from './indicators.js';
import * as E from './engine.js';
import { drawRadar } from './radar.js';

// ---------------------------------------------------------------------
// État
// ---------------------------------------------------------------------
const state = {
  context: { objectifs: [], patrimoine: {}, entreprise: {} },
  answers: {},
  stepIndex: 0, // index dans la liste combinée contexte + indicateurs
};

function clearAll() {
  state.context = { objectifs: [], patrimoine: {}, entreprise: {} };
  state.answers = {};
  state.stepIndex = 0;
}

// ---------------------------------------------------------------------
// Étapes de contexte (C1 à C7 — non notées)
// ---------------------------------------------------------------------
const CONTEXT_STEP_IDS = ['situation', 'foyer', 'residenceFiscale', 'objectifs', 'capacite', 'patrimoine', 'entreprise'];

function activeContextStepIds() {
  const isEntrepreneur = state.context.situation === 'entrepreneur';
  return CONTEXT_STEP_IDS.filter((id) => id !== 'entreprise' || isEntrepreneur);
}

function activeIndicatorIds() {
  const isEntrepreneur = E.deriveBranch(state.context) === 'entrepreneur';
  return INDICATORS.filter((i) => isEntrepreneur || !i.entrepreneurOnly).map((i) => i.id);
}

function allStepIds() {
  return [...activeContextStepIds(), ...activeIndicatorIds()];
}

// ---------------------------------------------------------------------
// Utilitaires de rendu
// ---------------------------------------------------------------------
function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function radioGroup(name, options, selected) {
  return `<div class="choices">${options
    .map(
      (o) => `<label class="choice"><input type="radio" name="${name}" value="${o.value}" ${selected === o.value ? 'checked' : ''}><span>${o.label}</span></label>`
    )
    .join('')}</div>`;
}

function selectHTML(id, options, selected, placeholder) {
  return `<select id="${id}">${placeholder ? `<option value="" ${!selected ? 'selected' : ''}>${placeholder}</option>` : ''}${options
    .map((o) => `<option value="${o.value}" ${selected === o.value ? 'selected' : ''}>${o.label}</option>`)
    .join('')}</select>`;
}

function amountFieldHTML(fieldId, label, field, opts = {}) {
  const isUnknown = field && field.status === 'unknown';
  const isRefuse = field && field.status === 'refuse';
  const value = field && field.status === 'value' ? field.value : '';
  const meta = isUnknown ? 'unknown' : isRefuse ? 'refuse' : '';
  return `
  <div class="field-group" data-field="${fieldId}" data-meta="${meta}">
    <label style="display:block;font-weight:700;color:var(--p);font-size:14px;margin-bottom:6px">${label}${opts.helper ? `<br><span style="font-weight:400;color:var(--muted);font-size:12.5px">${opts.helper}</span>` : ''}</label>
    <div class="field"><input type="number" min="0" inputmode="decimal" id="${fieldId}" placeholder="${opts.placeholder || 'Ex. 1000'}" value="${value}" ${meta ? 'disabled' : ''}><span>€</span></div>
    <div class="meta-row">
      <button type="button" class="meta-btn ${meta === 'unknown' ? 'active' : ''}" data-role="unknown" data-target="${fieldId}">${C.DONT_KNOW_LABEL}</button>
      <button type="button" class="meta-btn ${meta === 'refuse' ? 'active' : ''}" data-role="refuse" data-target="${fieldId}">${C.PREFER_NOT_TO_SAY_LABEL}</button>
    </div>
  </div>`;
}

function wireMetaButtons(container) {
  container.querySelectorAll('.meta-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const group = container.querySelector(`[data-field="${targetId}"]`);
      const input = document.getElementById(targetId);
      const role = btn.dataset.role;
      const already = group.dataset.meta === role;
      group.dataset.meta = already ? '' : role;
      input.disabled = !already;
      if (!already) input.value = '';
      group.querySelectorAll('.meta-btn').forEach((b) => b.classList.toggle('active', !already && b === btn));
    });
  });
}

function readAmountField(fieldId, { allowZero = true } = {}) {
  const group = document.querySelector(`[data-field="${fieldId}"]`);
  const meta = group ? group.dataset.meta : '';
  if (meta === 'unknown') return { field: { status: 'unknown' }, error: null };
  if (meta === 'refuse') return { field: { status: 'refuse' }, error: null };
  const raw = document.getElementById(fieldId).value;
  const v = E.validateAmountInput(raw, { allowZero });
  if (!v.valid) return { field: null, error: v.error };
  return { field: { status: 'value', value: v.value }, error: null };
}

function radioValue(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : null;
}

// ---------------------------------------------------------------------
// Rendu des écrans de contexte
// ---------------------------------------------------------------------
function renderContextStep(id, container) {
  const ctx = state.context;
  if (id === 'situation') {
    container.innerHTML = `
      <div class="step-top"><span>VOTRE SITUATION</span><span>Un questionnaire adapté à votre situation</span></div>
      <h2 tabindex="-1">Quelle est votre situation aujourd'hui&nbsp;?</h2>
      <p class="helper">Cela adapte les questions suivantes à votre cas.</p>
      ${radioGroup('situation', C.SITUATION_OPTIONS, ctx.situation)}
      <p class="error" id="error" role="alert"></p>
      ${navHTML(false)}`;
    return () => {
      const v = radioValue('situation');
      if (!v) return { error: 'Choisissez une réponse.' };
      const oldSituation = ctx.situation;
      ctx.situation = v;
      if (oldSituation !== v) {
        state.answers = E.pruneAnswers(ctx, state.answers);
      }
      return { error: null };
    };
  }

  if (id === 'foyer') {
    container.innerHTML = `
      <div class="step-top"><span>VOTRE FOYER</span><span></span></div>
      <h2 tabindex="-1">Votre foyer</h2>
      <div class="linked-field"><p class="q">Votre tranche d'âge</p>${radioGroup('ageBracket', C.AGE_BRACKETS, ctx.ageBracket)}</div>
      <div class="linked-field"><p class="q">Votre situation familiale</p>${radioGroup('foyerSituation', C.FOYER_OPTIONS, ctx.foyerSituation)}</div>
      <p class="error" id="error" role="alert"></p>
      ${navHTML(true)}`;
    return () => {
      const age = radioValue('ageBracket');
      const foyer = radioValue('foyerSituation');
      if (!age || !foyer) return { error: 'Merci de répondre à chaque question.' };
      ctx.ageBracket = age;
      ctx.foyerSituation = foyer;
      return { error: null };
    };
  }

  if (id === 'residenceFiscale') {
    container.innerHTML = `
      <div class="step-top"><span>RÉSIDENCE FISCALE</span><span></span></div>
      <h2 tabindex="-1">Où êtes-vous résident fiscal&nbsp;?</h2>
      <p class="helper">Si vous résidez hors de France, ou si vous n'êtes pas sûr, les pistes fiscales françaises ne vous seront pas présentées comme applicables.</p>
      ${radioGroup('residenceFiscale', C.RESIDENCE_FISCALE_OPTIONS, ctx.residenceFiscale)}
      <p class="error" id="error" role="alert"></p>
      ${navHTML(true)}`;
    return () => {
      const v = radioValue('residenceFiscale');
      if (!v) return { error: 'Choisissez une réponse.' };
      ctx.residenceFiscale = v;
      return { error: null };
    };
  }

  if (id === 'objectifs') {
    const selected = (ctx.objectifs || []).map((o) => o.id)[0] || null;
    container.innerHTML = `
      <div class="step-top"><span>VOTRE OBJECTIF</span><span></span></div>
      <h2 tabindex="-1">Quel est votre objectif principal en ce moment&nbsp;?</h2>
      ${radioGroup('objectif', C.OBJECTIF_OPTIONS, selected)}
      <div id="echeance-field"></div>
      <p class="error" id="error" role="alert"></p>
      ${navHTML(true)}`;
    function renderEcheance() {
      const picked = radioValue('objectif');
      const wrap = container.querySelector('#echeance-field');
      if (!picked) { wrap.innerHTML = ''; return; }
      const current = (ctx.objectifs || []).find((o) => o.id === picked);
      wrap.innerHTML = `<div class="linked-field"><p class="q">À quelle échéance&nbsp;?</p>${selectHTML('echeance-objectif', C.ECHEANCE_OPTIONS, current ? current.echeance : null, 'Choisir…')}</div>`;
    }
    renderEcheance();
    container.querySelectorAll('input[name="objectif"]').forEach((r) => r.addEventListener('change', renderEcheance));
    return () => {
      const picked = radioValue('objectif');
      if (!picked) return { error: 'Choisissez un objectif.' };
      const ech = document.getElementById('echeance-objectif').value;
      if (!ech) return { error: 'Merci d’indiquer une échéance.' };
      ctx.objectifs = [{ id: picked, echeance: ech }];
      ctx.objectifPrioritaireId = picked;
      return { error: null };
    };
  }

  if (id === 'capacite') {
    container.innerHTML = `
      <div class="step-top"><span>VOTRE CAPACITÉ FINANCIÈRE</span><span></span></div>
      <h2 tabindex="-1">Votre capacité financière</h2>
      <p class="helper">Montants approximatifs acceptés, y compris zéro.</p>
      ${amountFieldHTML('revenusNets', 'Revenus nets mensuels du foyer, après impôt', ctx.revenusNets, { placeholder: 'Ex. 3500' })}
      ${amountFieldHTML('versementsInvestissement', 'Versements d’investissement habituels par mois', ctx.versementsInvestissement, { placeholder: 'Ex. 300' })}
      <p class="error" id="error" role="alert"></p>
      ${navHTML(true)}`;
    wireMetaButtons(container);
    return () => {
      const fields = ['revenusNets', 'versementsInvestissement'];
      const results = {};
      for (const f of fields) {
        const r = readAmountField(f);
        if (r.error) return { error: r.error };
        results[f] = r.field;
      }
      Object.assign(ctx, results);
      return { error: null };
    };
  }

  if (id === 'patrimoine') {
    const p = ctx.patrimoine || {};
    const parts = p.partsEntreprise || { mode: 'value', value: '' };
    container.innerHTML = `
      <div class="step-top"><span>VOTRE PATRIMOINE</span><span></span></div>
      <h2 tabindex="-1">Votre patrimoine</h2>
      <p class="helper">Valeurs brutes approximatives. Un patrimoine nul est accepté.</p>
      ${amountFieldHTML('residencePrincipale', 'Résidence principale', ctx.patrimoine && ctx.patrimoine.residencePrincipale, { placeholder: 'Ex. 300000' })}
      ${amountFieldHTML('immobilierLocatif', 'Immobilier locatif', ctx.patrimoine && ctx.patrimoine.immobilierLocatif, { placeholder: 'Ex. 150000' })}
      ${amountFieldHTML('epargnePlacements', 'Épargne et placements financiers (comptes, livrets, assurance-vie, bourse, crypto…)', ctx.patrimoine && ctx.patrimoine.epargnePlacements, { placeholder: 'Ex. 50000' })}
      <div class="field-group" data-field="partsEntreprise" data-meta="${parts.mode === 'unknown' ? 'unknown' : ''}">
        <label style="display:block;font-weight:700;color:var(--p);font-size:14px;margin-bottom:6px">Parts d’entreprise (valeur estimée des titres)</label>
        <div class="field"><input type="number" min="0" id="partsEntreprise" placeholder="Ex. 150000" value="${parts.mode === 'value' ? parts.value : ''}" ${parts.mode === 'unknown' ? 'disabled' : ''}><span>€</span></div>
        <div class="meta-row"><button type="button" class="meta-btn ${parts.mode === 'unknown' ? 'active' : ''}" data-role="unknown" data-target="partsEntreprise">Valeur inconnue</button></div>
      </div>
      ${amountFieldHTML('dettesTotal', 'Dettes personnelles (total)', ctx.patrimoine && ctx.patrimoine.dettesTotal, { placeholder: 'Ex. 20000' })}
      <p class="error" id="error" role="alert"></p>
      ${navHTML(true)}`;
    wireMetaButtons(container);
    return () => {
      const fields = ['residencePrincipale', 'immobilierLocatif', 'epargnePlacements', 'dettesTotal'];
      const results = {};
      for (const f of fields) {
        const r = readAmountField(f);
        if (r.error) return { error: r.error };
        results[f] = r.field;
      }
      const partsGroup = document.querySelector('[data-field="partsEntreprise"]');
      let partsResult;
      if (partsGroup.dataset.meta === 'unknown') {
        partsResult = { mode: 'unknown' };
      } else {
        const raw = document.getElementById('partsEntreprise').value;
        const v = E.validateAmountInput(raw, { allowZero: true });
        if (!v.valid) return { error: v.error };
        partsResult = { mode: 'value', value: v.value };
      }
      ctx.patrimoine = { ...results, partsEntreprise: partsResult };
      state.answers = E.pruneAnswers(ctx, state.answers);
      return { error: null };
    };
  }

  if (id === 'entreprise') {
    const ent = ctx.entreprise || {};
    container.innerHTML = `
      <div class="step-top"><span>VOTRE ACTIVITÉ</span><span></span></div>
      <h2 tabindex="-1">Votre activité professionnelle</h2>
      <div class="linked-field"><p class="q">L’activité est…</p>${radioGroup('activiteStabilite', C.ACTIVITE_STABILITE_OPTIONS, ent.activiteStabilite)}</div>
      <div class="linked-field"><p class="q">Part des revenus du foyer dépendant de cette activité</p>${radioGroup('partRevenusDependante', C.PART_REVENUS_OPTIONS, ent.partRevenusDependante)}</div>
      <div class="linked-field"><p class="q">Avez-vous un projet professionnel avec financement envisagé&nbsp;?</p>${radioGroup('projetFinancementEnvisage', C.OUI_NON_INCONNU, ent.projetFinancementEnvisage)}</div>
      <p class="error" id="error" role="alert"></p>
      ${navHTML(true)}`;
    return () => {
      const activiteStabilite = radioValue('activiteStabilite');
      const partRevenusDependante = radioValue('partRevenusDependante');
      const projetFinancementEnvisage = radioValue('projetFinancementEnvisage');
      if (!activiteStabilite || !partRevenusDependante || !projetFinancementEnvisage) {
        return { error: 'Merci de répondre à chaque question.' };
      }
      ctx.entreprise = { activiteStabilite, partRevenusDependante, projetFinancementEnvisage };
      return { error: null };
    };
  }
  return () => ({ error: null });
}

function navHTML(showBack) {
  return `<div class="nav"><button class="button secondary" type="button" id="btn-back" ${showBack ? '' : 'disabled'} style="${showBack ? '' : 'visibility:hidden'}">Retour</button><button class="button" type="button" id="btn-next">Continuer →</button></div>`;
}

// ---------------------------------------------------------------------
// Rendu des cartes d'indicateurs notés
// ---------------------------------------------------------------------
function renderIndicatorStep(id, container) {
  const ctx = state.context;
  const answers = state.answers;
  const ind = getIndicator(id);

  // Indicateurs avec une "porte" liée (creditGate, p3Gate)
  if (ind.gate) return renderGatedIndicator(ind, container);

  const app = ind.getApplicability(ctx, answers);
  if (app.status === 'not_applicable') {
    container.innerHTML = `
      <div class="step-top"><span>${axisLabel(ind.axis)}</span><span></span></div>
      <h2 tabindex="-1">${ind.getQuestion(ctx, answers)}</h2>
      <div class="info-note">${app.note || 'Cette question ne s’applique pas à votre situation déclarée.'}</div>
      ${navHTML(true)}`;
    return () => ({ error: null });
  }

  const question = ind.getQuestion(ctx, answers);
  const options = ind.getOptions(ctx, answers);
  const helper = INDICATOR_HELPER(id);
  const current = answers[id];
  const selectedValue = current && current.kind === 'value' ? String(current.value) : current && (current.kind === 'unknown' || current.kind === 'refuse') ? '__unknown__' : null;

  container.innerHTML = `
    <div class="step-top"><span>${axisLabel(ind.axis)}</span><span></span></div>
    <h2 tabindex="-1">${question}</h2>
    ${helper ? `<p class="helper">${helper}</p>` : ''}
    ${app.status === 'unknown' ? `<div class="info-note unknown">${app.note}</div>` : ''}
    ${radioGroup('indicator', [...options.map((o) => ({ value: String(o.value), label: o.label })), { value: '__unknown__', label: C.UNKNOWN_OR_PREFER_LABEL }], selectedValue)}
    <p class="error" id="error" role="alert"></p>
    ${navHTML(true)}`;

  return () => {
    const v = radioValue('indicator');
    if (!v) return { error: 'Choisissez une réponse.' };
    if (v === '__unknown__') answers[id] = { kind: 'unknown' };
    else answers[id] = { kind: 'value', value: Number(v) };
    return { error: null };
  };
}

function axisLabel(axisId) {
  const a = C.AXES.find((x) => x.id === axisId);
  return a ? a.name.toUpperCase() : '';
}

function INDICATOR_HELPER(id) {
  const t = C.INDICATOR_TEXTS[id];
  return t && t.helper ? t.helper : null;
}

function renderGatedIndicator(ind, container) {
  const ctx = state.context;
  const answers = state.answers;
  const gateId = ind.gate;
  const gateQuestion = C.INDICATOR_TEXTS[gateId].question;
  const currentGate = answers[gateId] && answers[gateId].kind === 'value' ? answers[gateId].value : null;

  function renderBody() {
    const gateVal = radioValue('gate');
    const draftAnswers = { ...answers, [gateId]: gateVal ? { kind: 'value', value: gateVal } : undefined };
    const app = ind.getApplicability(ctx, draftAnswers);
    const bodyWrap = container.querySelector('#gated-body');
    if (!gateVal) {
      bodyWrap.innerHTML = '';
      return;
    }
    if (app.status === 'not_applicable') {
      bodyWrap.innerHTML = `<div class="info-note">${app.note || 'Cette question ne s’applique pas à votre situation déclarée.'}</div>`;
      return;
    }
    const question = ind.getQuestion(ctx, draftAnswers);
    const options = ind.getOptions(ctx, draftAnswers);
    const current = answers[ind.id];
    const selectedValue = current && current.kind === 'value' ? String(current.value) : current && (current.kind === 'unknown' || current.kind === 'refuse') ? '__unknown__' : null;
    bodyWrap.innerHTML = `
      <p class="q" style="margin-top:18px">${question}</p>
      ${app.status === 'unknown' ? `<div class="info-note unknown">${app.note}</div>` : ''}
      ${radioGroup('scored', [...options.filter((o) => o.value !== null).map((o) => ({ value: String(o.value), label: o.label })), { value: '__unknown__', label: C.UNKNOWN_OR_PREFER_LABEL }], selectedValue)}`;
  }

  container.innerHTML = `
    <div class="step-top"><span>${axisLabel(ind.axis)}</span><span></span></div>
    <h2 tabindex="-1">${gateQuestion}</h2>
    ${radioGroup('gate', C.OUI_NON_INCONNU, currentGate)}
    <div id="gated-body"></div>
    <p class="error" id="error" role="alert"></p>
    ${navHTML(true)}`;
  container.querySelectorAll('input[name="gate"]').forEach((r) => r.addEventListener('change', renderBody));
  renderBody();

  return () => {
    const gateVal = radioValue('gate');
    if (!gateVal) return { error: 'Choisissez une réponse.' };
    answers[gateId] = { kind: 'value', value: gateVal };
    if (gateVal === 'inconnu') {
      answers[ind.id] = { kind: 'unknown' };
      return { error: null };
    }
    const app = ind.getApplicability(ctx, answers);
    if (app.status === 'not_applicable') {
      delete answers[ind.id];
      return { error: null };
    }
    const v = radioValue('scored');
    if (!v) return { error: 'Choisissez une réponse.' };
    if (v === '__unknown__') answers[ind.id] = { kind: 'unknown' };
    else answers[ind.id] = { kind: 'value', value: Number(v) };
    return { error: null };
  };
}

// ---------------------------------------------------------------------
// Navigation du parcours
// ---------------------------------------------------------------------
let currentCommit = null;

function renderStep() {
  const steps = allStepIds();
  if (state.stepIndex >= steps.length) {
    showResults();
    return;
  }
  const id = steps[state.stepIndex];
  const isContext = CONTEXT_STEP_IDS.includes(id);
  const container = document.getElementById('step-container');
  currentCommit = isContext ? renderContextStep(id, container) : renderIndicatorStep(id, container);

  const total = steps.length;
  document.getElementById('progress-bar').style.width = `${Math.round((state.stepIndex / total) * 100)}%`;
  document.getElementById('rail-count').textContent = isContext ? `Étape ${state.stepIndex + 1} sur ${activeContextStepIds().length} (contexte)` : `Question ${state.stepIndex - activeContextStepIds().length + 1} sur ${activeIndicatorIds().length}`;
  document.getElementById('rail-phase').textContent = isContext ? 'CONTEXTE' : 'DIAGNOSTIC';
  // Le titre de la barre latérale suit l'étape réellement affichée, plutôt
  // que de rester figé sur le libellé de la toute première étape de la phase.
  document.getElementById('rail-title').textContent = isContext ? C.CONTEXT_LABELS[id] : C.AXES.find((a) => a.id === getIndicator(id).axis).name;

  const h2 = container.querySelector('h2');
  if (h2) h2.focus({ preventScroll: true });
  container.querySelector('#btn-next').addEventListener('click', onNext);
  const backBtn = container.querySelector('#btn-back');
  if (backBtn && !backBtn.disabled) backBtn.addEventListener('click', onBack);
}

function onNext() {
  const result = currentCommit ? currentCommit() : { error: null };
  if (result && result.error) {
    document.getElementById('error').textContent = result.error;
    return;
  }
  state.stepIndex += 1;
  renderStep();
  document.getElementById('app').scrollIntoView({ block: 'start' });
}

function onBack() {
  state.stepIndex = Math.max(0, state.stepIndex - 1);
  renderStep();
}

// ---------------------------------------------------------------------
// Démarrage du parcours
// ---------------------------------------------------------------------
function startFlow() {
  document.getElementById('accueil').hidden = true;
  document.getElementById('piliers').hidden = true;
  document.getElementById('results').hidden = true;
  const app = document.getElementById('app');
  app.hidden = false;
  renderStep();
  app.scrollIntoView({ block: 'start' });
}

// ---------------------------------------------------------------------
// Résultats
// ---------------------------------------------------------------------
function levelClass(levelId) {
  return levelId || 'a-structurer';
}

function axisExplain(axisId, axisResult, context, answers) {
  // Réponses qui expliquent le résultat + limite + action suivante, en
  // s'appuyant sur les indicateurs de l'axe réellement répondus.
  const inds = INDICATORS.filter((i) => i.axis === axisId && (E.deriveBranch(context) === 'entrepreneur' || !i.entrepreneurOnly));
  const lines = [];
  for (const ind of inds) {
    const ans = E.resolvedAnswer(ind.id, context, answers);
    if (ans && ans.kind === 'value') {
      const opts = ind.getOptions ? ind.getOptions(context, answers) : null;
      const label = opts ? (opts.find((o) => o.value === ans.value) || {}).label : null;
      if (label) lines.push(label);
    }
  }
  return lines;
}

function synthesisText(results) {
  const okAxes = Object.values(results.axes).filter((a) => a.status === 'ok');
  if (okAxes.length === 0) {
    return 'Vos réponses ne permettent pas encore d’afficher un repérage fiable sur un ou plusieurs piliers. Complétez-les pour affiner ce diagnostic.';
  }
  const strong = okAxes.filter((a) => a.score >= 75).map((a) => C.AXES.find((x) => x.id === a.axis).name);
  const weakest = [...okAxes].sort((a, b) => a.score - b.score)[0];
  const weakestName = C.AXES.find((x) => x.id === weakest.axis).name;
  if (strong.length && weakest.score < 75) {
    return `${strong[0]} est suivi. Votre priorité maintenant : ${weakestName.toLowerCase()}.`;
  }
  return `Voici où en est votre organisation patrimoniale déclarée, pilier par pilier. Votre priorité actuelle porte sur : ${weakestName.toLowerCase()}.`;
}

function renderResults() {
  const results = E.computeResults(state.context, state.answers);
  const root = document.getElementById('results');
  document.getElementById('app').hidden = true;
  root.hidden = false;

  const priorityHTML = results.priorities.length
    ? `<div class="priority-banner"><p class="tag">Priorité identifiée</p><h3>${results.priorities[0].text}</h3><p>${results.priorities[0].action}</p></div>`
    : '';

  const nonResidentHTML = results.nonResident ? `<div class="non-resident-banner">${C.NON_RESIDENT_NOTICE}</div>` : '';

  const contradictionsHTML = results.contradictions.length
    ? `<div class="contradiction-note"><strong>À vérifier avant d’aller plus loin&nbsp;:</strong><ul style="margin:8px 0 0;padding-left:20px">${results.contradictions
        .map((c) => `<li>${c.message}</li>`)
        .join('')}</ul></div>`
    : '';

  const axesHTML = C.AXES.map((axis) => {
    const r = results.axes[axis.id];
    if (r.status === 'not_applicable') {
      return `<div class="axis-card"><div class="head"><h3>${axis.name}</h3></div><p class="not-evaluated">Non applicable actuellement.</p></div>`;
    }
    if (r.status === 'not_evaluated') {
      return `<div class="axis-card"><div class="head"><h3>${axis.name}</h3></div><p class="not-evaluated">Non évalué — complétude des réponses insuffisante sur ce pilier (${Math.round((r.coverage || 0) * 100)}%).</p></div>`;
    }
    const explainLines = axisExplain(axis.id, r, state.context, state.answers);
    return `<div class="axis-card">
      <div class="head"><h3>${axis.name}</h3><span class="axis-score">${r.score}</span></div>
      <span class="axis-level ${levelClass(r.level.id)}">${r.level.label}</span>
      ${explainLines.length ? `<ul>${explainLines.map((l) => `<li>${l}</li>`).join('')}</ul>` : ''}
      <p class="limite">Organisation déclarée, complétude des réponses&nbsp;: ${Math.round(r.coverage * 100)}%. Une bonne note ne certifie ni la conformité juridique, ni l’adéquation d’un produit.</p>
    </div>`;
  }).join('');

  const actionsHTML = results.priorities.length
    ? `<div class="actions-block"><h3>Vos prochaines actions</h3>${results.priorities
        .map((p) => `<div class="action-item"><p class="text">${p.text}</p><p class="what">${p.action}</p></div>`)
        .join('')}</div>`
    : `<div class="actions-block"><h3>Vos prochaines actions</h3><p class="what">Aucune fragilité ni priorité claire ne ressort de vos réponses actuelles. Complétez les piliers « non évalués » ci-dessus pour affiner ce repérage.</p></div>`;

  const leverEntries = Object.entries(results.levers);
  const leversHTML = leverEntries
    .map(([key, lv]) => `<div class="lever-card">
      <span class="lever-status ${lv.status}">${C.LEVER_STATUS_LABELS[lv.status]}</span>
      <h4>${C.LEVER_LABELS[key]}</h4>
      <p>${lv.motif}</p>
      <p class="action-line">${lv.action}</p>
    </div>`)
    .join('');

  root.innerHTML = `
    <div class="results-inner">
      <span class="pill">VOTRE REPÉRAGE PERSONNALISÉ</span>
      <h2 class="synth" tabindex="-1">Des pistes pour organiser votre patrimoine.</h2>
      <p class="synth-text">${synthesisText(results)}</p>
      ${nonResidentHTML}
      ${priorityHTML}
      ${contradictionsHTML}
      <p class="coverage-line">Complétude des réponses&nbsp;: ${results.coverage.applicableCount ? Math.round(results.coverage.ratio * 100) : 0}% (${results.coverage.answeredCount} sur ${results.coverage.applicableCount} indicateurs applicables) · grille version ${results.ruleVersion}.</p>

      <div class="radar-block">
        <canvas id="radar" width="320" height="320" role="img" aria-label="Radar de votre organisation patrimoniale déclarée sur six piliers"></canvas>
        <table class="radar-table">
          <caption>Lecture accessible du radar (les piliers non évalués ne sont pas représentés par un zéro)</caption>
          <thead><tr><th>Pilier</th><th>Niveau</th><th>Complétude</th></tr></thead>
          <tbody>${C.AXES.map((axis) => {
            const r = results.axes[axis.id];
            const level = r.status === 'ok' ? `${r.score} — ${r.level.label}` : r.status === 'not_applicable' ? 'Non applicable' : 'Non évalué';
            const cov = r.coverage !== null && r.coverage !== undefined ? `${Math.round(r.coverage * 100)}%` : '—';
            return `<tr><td>${axis.name}</td><td>${level}</td><td>${cov}</td></tr>`;
          }).join('')}</tbody>
        </table>
      </div>

      <h3 style="margin-top:6px">Le détail de vos six piliers</h3>
      ${axesHTML}

      ${actionsHTML}

      <h3>La carte de vos leviers</h3>
      <p class="helper">Des conditions de découverte à partir de vos réponses — jamais une conclusion d’éligibilité ni une recommandation de souscription.</p>
      <div class="levers-grid">${leversHTML}</div>

      <div class="quiet-actions">
        <button class="button secondary" id="btn-edit" type="button" style="color:var(--p);border-color:#d9cedc">Modifier mes réponses</button>
      </div>

      <div class="contact-block">
        <h3>Envie d’aller plus loin&nbsp;?</h3>
        <p>Un simulateur donne des pistes&nbsp;; une étude patrimoniale les transforme en plan d’action, adapté à votre famille et à vos objectifs.</p>
        <div class="cta-row">
          <a class="button" href="https://calendly.com/rashan-kadioglu/diagnostic-strategique?back=1" target="_blank" rel="noopener noreferrer">Demander une étude personnalisée</a>
          <a class="mail" href="mailto:rashan@captain-invest.com">Ou écrivez-moi directement</a>
        </div>
        <p class="disclosure">Ce bouton ouvre Calendly (planification de rendez-vous) dans un nouvel onglet. Vos réponses à ce diagnostic ne sont transmises automatiquement à personne&nbsp;; vous seul(e) choisissez ce que vous partagez lors de l’échange.</p>
      </div>

      <section class="legal" style="padding:0">${C.LEGAL_MENTION}</section>
      <p class="summary-notice">${C.SUMMARY_ESTIMATE_NOTICE}</p>
    </div>`;

  drawRadar(document.getElementById('radar'), results);

  document.getElementById('btn-edit').addEventListener('click', () => {
    state.stepIndex = 0;
    root.hidden = true;
    document.getElementById('app').hidden = false;
    renderStep();
  });

  root.querySelector('h2.synth').focus({ preventScroll: true });
}

function showResults() {
  renderResults();
}

// ---------------------------------------------------------------------
// Amorçage
// ---------------------------------------------------------------------
function fillStaticText() {
  document.getElementById('short-disclaimer').textContent = C.SHORT_DISCLAIMER;
  document.getElementById('promise-text').textContent = C.HERO.promise;
  document.getElementById('reel-intro').textContent = C.REEL_INTROS[new URLSearchParams(location.search).get('theme')] || '';
  document.getElementById('pillars-eyebrow').textContent = C.PILLARS_INTRO.eyebrow;
  document.getElementById('pillars-title').textContent = C.PILLARS_INTRO.title;
  document.getElementById('pillars-text').textContent = C.PILLARS_INTRO.text;
  document.getElementById('pillars-grid').innerHTML = C.PILLARS.map(
    (p) => `<div class="pillar-card"><span class="axis-tag">${p.axis}</span><h3>${p.title}</h3><p>${p.text}</p></div>`
  ).join('');
  document.getElementById('legal-mention').innerHTML = `<p>${C.LEGAL_MENTION}</p><p class="privacy-note" style="padding:0">${C.PRIVACY_NOTE}</p>`;
}

function backToAccueil() {
  document.getElementById('results').hidden = true;
  document.getElementById('app').hidden = true;
  document.getElementById('accueil').hidden = false;
  document.getElementById('piliers').hidden = false;
  window.scrollTo({ top: 0 });
}

function init() {
  fillStaticText();
  document.getElementById('cta-start').addEventListener('click', startFlow);
  document.getElementById('cta-start-2').addEventListener('click', startFlow);
  document.getElementById('cta-pillars').addEventListener('click', () => {
    document.getElementById('piliers').scrollIntoView({ block: 'start' });
  });

  document.getElementById('btn-clear').addEventListener('click', () => {
    clearAll();
    backToAccueil();
  });
}

document.addEventListener('DOMContentLoaded', init);
