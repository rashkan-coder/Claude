// app.js — interface uniquement. Toute la logique de score, d'applicabilité
// et de priorisation vit dans engine.js / indicators.js / rules.js / facts.js ;
// ce fichier se contente de collecter des faits concrets (montants, tranches,
// choix structurels) et d'afficher les résultats. Les scores ne sont jamais
// saisis directement par la personne : ils sont dérivés de ce qu'elle déclare.
'use strict';

import * as C from './content.js';
import * as E from './engine.js';
import * as F from './facts.js';
import { drawRadar } from './radar.js';

// ---------------------------------------------------------------------
// État
// ---------------------------------------------------------------------
const state = {
  context: { objectifs: [], patrimoine: {}, entreprise: {} },
  stepIndex: 0,
};

function clearAll() {
  state.context = { objectifs: [], patrimoine: {}, entreprise: {} };
  state.stepIndex = 0;
}

// ---------------------------------------------------------------------
// Étapes du parcours (toutes des faits déclaratifs — aucune n'est notée
// directement : la notation est entièrement dérivée, voir indicators.js)
// ---------------------------------------------------------------------
const STEP_IDS = ['situation', 'foyer', 'residenceFiscale', 'objectifs', 'capacite', 'immobilier', 'financier', 'transmission', 'entreprise'];

function activeStepIds() {
  const isEntrepreneur = state.context.situation === 'entrepreneur';
  return STEP_IDS.filter((id) => id !== 'entreprise' || isEntrepreneur);
}

// ---------------------------------------------------------------------
// Utilitaires de rendu
// ---------------------------------------------------------------------
function radioGroup(name, options, selected) {
  return `<div class="choices">${options
    .map(
      (o) => `<label class="choice"><input type="radio" name="${name}" value="${o.value}" ${selected === o.value ? 'checked' : ''}><span>${o.label}</span></label>`
    )
    .join('')}</div>`;
}

function checkboxGroup(name, options, selected) {
  const sel = selected || [];
  return `<div class="choices">${options
    .map(
      (o) => `<label class="choice"><input type="checkbox" name="${name}" value="${o.value}" ${sel.includes(o.value) ? 'checked' : ''}><span>${o.label}</span></label>`
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
    <div class="field"><input type="number" ${opts.allowNegative ? '' : 'min="0"'} inputmode="decimal" id="${fieldId}" placeholder="${opts.placeholder || 'Ex. 1000'}" value="${value}" ${meta ? 'disabled' : ''}><span>€</span></div>
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

function readAmountField(fieldId, { allowZero = true, allowNegative = false } = {}) {
  const group = document.querySelector(`[data-field="${fieldId}"]`);
  const meta = group ? group.dataset.meta : '';
  if (meta === 'unknown') return { field: { status: 'unknown' }, error: null };
  if (meta === 'refuse') return { field: { status: 'refuse' }, error: null };
  const raw = document.getElementById(fieldId).value;
  const v = E.validateAmountInput(raw, { allowZero, allowNegative });
  if (!v.valid) return { field: null, error: v.error };
  return { field: { status: 'value', value: v.value }, error: null };
}

function radioValue(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : null;
}

function checkboxValues(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((el) => el.value);
}

function navHTML(showBack) {
  return `<div class="nav"><button class="button secondary" type="button" id="btn-back" ${showBack ? '' : 'disabled'} style="${showBack ? '' : 'visibility:hidden'}">Retour</button><button class="button" type="button" id="btn-next">Continuer →</button></div>`;
}

// ---------------------------------------------------------------------
// Rendu des écrans
// ---------------------------------------------------------------------
function renderStepBody(id, container) {
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
      ctx.situation = v;
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
      ${amountFieldHTML('depensesEssentielles', C.DIAGNOSTIC_QUESTIONS.depensesEssentielles.label, ctx.depensesEssentielles, { placeholder: 'Ex. 2200', helper: C.DIAGNOSTIC_QUESTIONS.depensesEssentielles.helper })}
      ${amountFieldHTML('epargneDisponible', C.DIAGNOSTIC_QUESTIONS.epargneDisponible.label, ctx.epargneDisponible, { placeholder: 'Ex. 8000', helper: C.DIAGNOSTIC_QUESTIONS.epargneDisponible.helper })}
      ${amountFieldHTML('epargneMensuelle', C.DIAGNOSTIC_QUESTIONS.epargneMensuelle.label, ctx.epargneMensuelle, { placeholder: 'Ex. 300', helper: C.DIAGNOSTIC_QUESTIONS.epargneMensuelle.helper, allowNegative: true })}
      <p class="error" id="error" role="alert"></p>
      ${navHTML(true)}`;
    wireMetaButtons(container);
    return () => {
      const revenus = readAmountField('revenusNets');
      if (revenus.error) return { error: revenus.error };
      const depenses = readAmountField('depensesEssentielles');
      if (depenses.error) return { error: depenses.error };
      const dispo = readAmountField('epargneDisponible');
      if (dispo.error) return { error: dispo.error };
      const mensuelle = readAmountField('epargneMensuelle', { allowNegative: true });
      if (mensuelle.error) return { error: mensuelle.error };
      ctx.revenusNets = revenus.field;
      ctx.depensesEssentielles = depenses.field;
      ctx.epargneDisponible = dispo.field;
      ctx.epargneMensuelle = mensuelle.field;
      return { error: null };
    };
  }

  if (id === 'immobilier') {
    const p = ctx.patrimoine || {};
    container.innerHTML = `
      <div class="step-top"><span>VOTRE IMMOBILIER</span><span></span></div>
      <h2 tabindex="-1">Votre immobilier</h2>
      <div class="linked-field">
        <p class="q">${C.DIAGNOSTIC_QUESTIONS.residencePrincipaleProprietaire.question}</p>
        ${radioGroup('rpProprietaire', C.OUI_NON_OPTIONS, p.residencePrincipaleProprietaire || null)}
        <div id="rp-body"></div>
      </div>
      <div class="linked-field">
        <p class="q">${C.DIAGNOSTIC_QUESTIONS.autresBiensImmobiliers.question}</p>
        ${radioGroup('autresBiens', C.OUI_NON_OPTIONS, p.autresBiensImmobiliers || null)}
        <div id="autres-body"></div>
      </div>
      <p class="error" id="error" role="alert"></p>
      ${navHTML(true)}`;

    function renderRP() {
      const v = radioValue('rpProprietaire');
      const wrap = container.querySelector('#rp-body');
      if (v !== 'oui') { wrap.innerHTML = ''; return; }
      wrap.innerHTML = `
        ${amountFieldHTML('residencePrincipale', 'Valeur estimée du bien', p.residencePrincipale, { placeholder: 'Ex. 300000' })}
        <p class="q">${C.DIAGNOSTIC_QUESTIONS.residencePrincipaleCredit.question}</p>
        ${radioGroup('rpCredit', C.CREDIT_BRACKET_OPTIONS, p.residencePrincipaleCredit || null)}`;
      wireMetaButtons(wrap);
    }
    function renderAutres() {
      const v = radioValue('autresBiens');
      const wrap = container.querySelector('#autres-body');
      if (v !== 'oui') { wrap.innerHTML = ''; return; }
      wrap.innerHTML = `
        ${amountFieldHTML('immobilierLocatif', 'Valeur estimée du ou des biens', p.immobilierLocatif, { placeholder: 'Ex. 150000' })}
        <p class="q">${C.DIAGNOSTIC_QUESTIONS.autresBiensCredit.question}</p>
        ${radioGroup('autresCredit', C.CREDIT_BRACKET_OPTIONS, p.autresBiensCredit || null)}`;
      wireMetaButtons(wrap);
    }
    renderRP();
    renderAutres();
    container.querySelectorAll('input[name="rpProprietaire"]').forEach((r) => r.addEventListener('change', renderRP));
    container.querySelectorAll('input[name="autresBiens"]').forEach((r) => r.addEventListener('change', renderAutres));

    return () => {
      const rpOwned = radioValue('rpProprietaire');
      const autresOwned = radioValue('autresBiens');
      if (!rpOwned || !autresOwned) return { error: 'Merci de répondre à chaque question.' };

      let residencePrincipale = { status: 'value', value: 0 };
      let residencePrincipaleCredit = null;
      if (rpOwned === 'oui') {
        const r = readAmountField('residencePrincipale');
        if (r.error) return { error: r.error };
        residencePrincipale = r.field;
        residencePrincipaleCredit = radioValue('rpCredit');
        if (!residencePrincipaleCredit) return { error: 'Merci d’indiquer si un crédit reste en cours sur ce bien.' };
      }

      let immobilierLocatif = { status: 'value', value: 0 };
      let autresBiensCredit = null;
      if (autresOwned === 'oui') {
        const r = readAmountField('immobilierLocatif');
        if (r.error) return { error: r.error };
        immobilierLocatif = r.field;
        autresBiensCredit = radioValue('autresCredit');
        if (!autresBiensCredit) return { error: 'Merci d’indiquer si un crédit reste en cours sur ce bien.' };
      }

      ctx.patrimoine = {
        ...ctx.patrimoine,
        residencePrincipaleProprietaire: rpOwned,
        residencePrincipale,
        residencePrincipaleCredit,
        autresBiensImmobiliers: autresOwned,
        immobilierLocatif,
        autresBiensCredit,
      };
      return { error: null };
    };
  }

  if (id === 'financier') {
    const p = ctx.patrimoine || {};
    const parts = p.partsEntreprise || { mode: 'value', value: '' };
    const supports = p.supportsDetenus || [];
    container.innerHTML = `
      <div class="step-top"><span>VOTRE ÉPARGNE FINANCIÈRE</span><span></span></div>
      <h2 tabindex="-1">Votre épargne financière</h2>
      <div class="linked-field">
        <p class="q">${C.DIAGNOSTIC_QUESTIONS.supportsDetenus.question}</p>
        ${checkboxGroup('supports', C.SUPPORTS_OPTIONS, supports)}
      </div>
      <div id="dominant-field"></div>
      <p class="helper">Valeurs brutes approximatives. Un montant nul est accepté.</p>
      ${amountFieldHTML('epargnePlacements', 'Montant total de votre épargne et placements financiers', p.epargnePlacements, { placeholder: 'Ex. 50000' })}
      <div class="field-group" data-field="partsEntreprise" data-meta="${parts.mode === 'unknown' ? 'unknown' : ''}">
        <label style="display:block;font-weight:700;color:var(--p);font-size:14px;margin-bottom:6px">Parts d’entreprise (valeur estimée des titres)</label>
        <div class="field"><input type="number" min="0" id="partsEntreprise" placeholder="Ex. 150000" value="${parts.mode === 'value' ? parts.value : ''}" ${parts.mode === 'unknown' ? 'disabled' : ''}><span>€</span></div>
        <div class="meta-row"><button type="button" class="meta-btn ${parts.mode === 'unknown' ? 'active' : ''}" data-role="unknown" data-target="partsEntreprise">Valeur inconnue</button></div>
      </div>
      ${amountFieldHTML('dettesAutres', C.DIAGNOSTIC_QUESTIONS.dettesAutres.label, p.dettesAutres, { placeholder: 'Ex. 5000', helper: C.DIAGNOSTIC_QUESTIONS.dettesAutres.helper })}
      <p class="error" id="error" role="alert"></p>
      ${navHTML(true)}`;
    wireMetaButtons(container);

    function renderDominant() {
      const checked = checkboxValues('supports').filter((s) => s !== 'aucun');
      const wrap = container.querySelector('#dominant-field');
      if (checked.length < 2) { wrap.innerHTML = ''; return; }
      const opts = C.SUPPORTS_OPTIONS.filter((o) => checked.includes(o.value));
      wrap.innerHTML = `<div class="linked-field"><p class="q">${C.DIAGNOSTIC_QUESTIONS.supportDominant.question}</p>${radioGroup('supportDominant', opts, p.supportDominant || null)}</div>`;
    }
    renderDominant();
    container.querySelectorAll('input[name="supports"]').forEach((c) => c.addEventListener('change', renderDominant));

    return () => {
      const selectedSupports = checkboxValues('supports');
      if (selectedSupports.length === 0) return { error: 'Choisissez au moins une réponse (ou « Aucun de ces supports »).' };
      const nonAucun = selectedSupports.filter((s) => s !== 'aucun');
      let supportDominant = null;
      if (nonAucun.length === 1) supportDominant = nonAucun[0];
      else if (nonAucun.length >= 2) {
        supportDominant = radioValue('supportDominant');
        if (!supportDominant) return { error: 'Choisissez le support qui représente la plus grande part.' };
      }

      const epargne = readAmountField('epargnePlacements');
      if (epargne.error) return { error: epargne.error };

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

      const dettes = readAmountField('dettesAutres');
      if (dettes.error) return { error: dettes.error };

      ctx.patrimoine = {
        ...ctx.patrimoine,
        supportsDetenus: selectedSupports,
        supportDominant,
        epargnePlacements: epargne.field,
        partsEntreprise: partsResult,
        dettesAutres: dettes.field,
      };
      return { error: null };
    };
  }

  if (id === 'transmission') {
    container.innerHTML = `
      <div class="step-top"><span>VOTRE TRANSMISSION</span><span></span></div>
      <h2 tabindex="-1">${C.DIAGNOSTIC_QUESTIONS.transmissionOrganisee.question}</h2>
      <p class="helper">${C.DIAGNOSTIC_QUESTIONS.transmissionOrganisee.helper}</p>
      ${radioGroup('transmissionOrganisee', C.TRANSMISSION_OPTIONS, ctx.transmissionOrganisee || null)}
      <p class="error" id="error" role="alert"></p>
      ${navHTML(true)}`;
    return () => {
      const v = radioValue('transmissionOrganisee');
      if (!v) return { error: 'Choisissez une réponse.' };
      ctx.transmissionOrganisee = v;
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
      <div class="linked-field"><p class="q">${C.DIAGNOSTIC_QUESTIONS.remunerationComparee.question}</p><p class="helper">${C.DIAGNOSTIC_QUESTIONS.remunerationComparee.helper}</p>${radioGroup('remunerationComparee', C.OUI_NON_INCONNU, ent.remunerationComparee)}</div>
      <div class="linked-field"><p class="q">${C.DIAGNOSTIC_QUESTIONS.excedentTresorerie.question}</p><p class="helper">${C.DIAGNOSTIC_QUESTIONS.excedentTresorerie.helper}</p>${radioGroup('excedentTresorerie', C.OUI_NON_INCONNU, ent.excedentTresorerie)}</div>
      <p class="error" id="error" role="alert"></p>
      ${navHTML(true)}`;
    return () => {
      const activiteStabilite = radioValue('activiteStabilite');
      const partRevenusDependante = radioValue('partRevenusDependante');
      const projetFinancementEnvisage = radioValue('projetFinancementEnvisage');
      const remunerationComparee = radioValue('remunerationComparee');
      const excedentTresorerie = radioValue('excedentTresorerie');
      if (!activiteStabilite || !partRevenusDependante || !projetFinancementEnvisage || !remunerationComparee || !excedentTresorerie) {
        return { error: 'Merci de répondre à chaque question.' };
      }
      ctx.entreprise = { activiteStabilite, partRevenusDependante, projetFinancementEnvisage, remunerationComparee, excedentTresorerie };
      return { error: null };
    };
  }

  return () => ({ error: null });
}

// ---------------------------------------------------------------------
// Navigation du parcours
// ---------------------------------------------------------------------
let currentCommit = null;

function renderStep() {
  const steps = activeStepIds();
  if (state.stepIndex >= steps.length) {
    showResults();
    return;
  }
  const id = steps[state.stepIndex];
  const container = document.getElementById('step-container');
  currentCommit = renderStepBody(id, container);

  const total = steps.length;
  document.getElementById('progress-bar').style.width = `${Math.round((state.stepIndex / total) * 100)}%`;
  document.getElementById('rail-count').textContent = `Étape ${state.stepIndex + 1} sur ${total}`;
  document.getElementById('rail-phase').textContent = 'DIAGNOSTIC';
  document.getElementById('rail-title').textContent = C.CONTEXT_LABELS[id];

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

// Explique un score d'axe à partir des faits objectifs qui l'ont produit
// (voir facts.js) — jamais à partir d'un libellé d'option choisie, puisqu'il
// n'y a plus de question notée directement.
function axisExplain(axisId, context) {
  const lines = [];
  if (axisId === 'A') {
    const months = F.computeRunwayMonths(context);
    if (months !== null) {
      lines.push(months === Infinity ? 'Dépenses essentielles déclarées nulles : couverture jugée large.' : `Votre épargne disponible couvre environ ${Math.round(months * 10) / 10} mois de dépenses essentielles.`);
    }
  } else if (axisId === 'B') {
    const r = F.computeSavingsRate(context);
    if (r !== null) {
      lines.push(r.negative ? 'Votre épargne mensuelle déclarée est négative.' : `Vous épargnez environ ${Math.round(r.rate * 100)}% de vos revenus nets chaque mois.`);
    }
  } else if (axisId === 'C') {
    const l = F.computeRealEstateLeverage(context);
    if (l.available) lines.push(`Environ ${Math.round(l.ltv * 100)}% de la valeur de votre immobilier reste financée à crédit.`);
  } else if (axisId === 'D') {
    const d = F.computeDiversification(context);
    if (d.available) {
      lines.push(`${d.nbSupports} support${d.nbSupports > 1 ? 's' : ''} d’épargne différent${d.nbSupports > 1 ? 's' : ''} détenu${d.nbSupports > 1 ? 's' : ''}.`);
      if (d.concentrated) lines.push('Une concentration importante a par ailleurs été repérée sur votre patrimoine global.');
    }
  } else if (axisId === 'E') {
    const d = F.computeDormantMoney(context);
    if (d.available) {
      const label = (C.SUPPORTS_OPTIONS.find((o) => o.value === d.dominant) || {}).label;
      lines.push(d.dominant === 'livrets' ? 'Votre épargne financière reste majoritairement sur des livrets ou comptes non investis.' : `Votre épargne financière est majoritairement investie (${label || 'support déclaré'}).`);
    }
  } else if (axisId === 'F') {
    const label = (C.TRANSMISSION_OPTIONS.find((o) => o.value === context.transmissionOrganisee) || {}).label;
    if (label) lines.push(label);
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
    return `${strong[0]} est suivi. Votre priorité maintenant : ${weakestName.toLowerCase()}.`;
  }
  return `Voici où en est votre organisation patrimoniale déclarée, pilier par pilier. Votre priorité actuelle porte sur : ${weakestName.toLowerCase()}.`;
}

function renderResults() {
  const results = E.computeResults(state.context, {});
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
    const explainLines = axisExplain(axis.id, state.context);
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
