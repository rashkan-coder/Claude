// pdf-bilan.js — export du bilan complet (distinct du guide), avec pagination
// libre. Inclut les réponses utiles, le radar, les axes non évalués, les
// hypothèses de calcul, les priorités, la date et la version de la grille.
'use strict';

import { loadJsPDF } from './load-jspdf.js';
import { AXES, LEVER_LABELS, LEVER_STATUS_LABELS, LEGAL_MENTION } from './content.js';
import { Cursor } from './pdf-layout.js';
import { drawRadar } from './radar.js';
import { INDICATORS } from './indicators.js';
import { resolvedAnswer, applicabilityMap, deriveBranch } from './engine.js';

function radarImageDataUrl(results) {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 480;
  drawRadar(canvas, results);
  return canvas.toDataURL('image/png');
}

const SITUATION_LABELS = { salarie: 'Salarié(e)', independant: 'Indépendant(e)', dirigeant: 'Dirigeant(e) de société', retraite: 'Retraité(e)', autre: 'Autre situation' };

function fmtEuros(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

function axisName(axisId) {
  const a = AXES.find((x) => x.id === axisId);
  return a ? a.short : axisId;
}

function fieldSummary(field) {
  if (!field) return 'non renseigné';
  if (field.status === 'value') return fmtEuros(field.value);
  if (field.status === 'unknown') return 'je ne sais pas';
  if (field.status === 'refuse') return 'préfère ne pas répondre';
  return 'non renseigné';
}

export async function buildBilanDoc(context, answers, results) {
  const jsPDF = await loadJsPDF();
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  doc.setProperties({ title: 'Bilan de votre diagnostic patrimonial', author: 'Rashan Kadioglu — Captain Invest' });
  const c = new Cursor(doc, { autoPaginate: true });

  const dateStr = new Date(results.generatedAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  c.heading('Bilan de votre diagnostic patrimonial', { size: 19, gapAfter: 2 });
  c.paragraph(`Généré le ${dateStr} · grille version ${results.ruleVersion} · branche ${results.branch === 'entrepreneur' ? 'dirigeant / indépendant' : 'particulier'}${results.nonResident ? ' · résidence fiscale hors de France ou incertaine' : ''}`, { size: 9.5, color: [107, 98, 112], gapAfter: 8 });

  // --- Votre situation déclarée ---------------------------------------
  c.subheading('Votre situation déclarée');
  c.paragraph(`Situation : ${SITUATION_LABELS[context.situation] || 'non renseignée'}.`, { size: 10.5, gapAfter: 2 });
  if (context.objectifs && context.objectifs.length) {
    c.paragraph(`Objectifs prioritaires : ${context.objectifs.map((o) => o.id).join(', ')}.`, { size: 10.5, gapAfter: 2 });
  }
  c.paragraph(`Complétude générale des réponses : ${results.coverage.applicableCount ? Math.round(results.coverage.ratio * 100) : 0}% (${results.coverage.answeredCount} sur ${results.coverage.applicableCount} indicateurs applicables).`, { size: 10.5, gapAfter: 8 });

  // --- Radar --------------------------------------------------------
  c.subheading('Le radar de vos six piliers');
  c.paragraph('Les piliers non évalués ou non applicables ne sont jamais représentés comme un zéro : le tracé s’interrompt à cet endroit.', { size: 9.5, color: [107, 98, 112], gapAfter: 4 });
  const img = radarImageDataUrl(results);
  const imgSize = 90;
  c.ensureSpace(imgSize + 6);
  doc.addImage(img, 'PNG', c.marginLeft, c.y, imgSize, imgSize);
  c.y += imgSize + 8;

  // --- Détail par axe --------------------------------------------------
  c.subheading('Le détail de vos six piliers');
  for (const axis of AXES) {
    const r = results.axes[axis.id];
    let line;
    if (r.status === 'ok') line = `${axis.name} : ${r.score}/100 — ${r.level.label} (complétude ${Math.round(r.coverage * 100)}%).`;
    else if (r.status === 'not_applicable') line = `${axis.name} : non applicable actuellement.`;
    else line = `${axis.name} : non évalué (complétude insuffisante : ${Math.round((r.coverage || 0) * 100)}%).`;
    c.paragraph(line, { size: 10.5, gapAfter: 2 });
  }
  c.space(4);

  // --- Priorités --------------------------------------------------------
  c.subheading('Vos priorités identifiées');
  if (results.priorities.length) {
    for (const p of results.priorities) {
      c.bullet(`${p.text} — ${p.action}`, { size: 10.5 });
    }
  } else {
    c.paragraph('Aucune fragilité ni priorité claire ne ressort de vos réponses actuelles.', { size: 10.5 });
  }
  c.space(4);

  // --- Leviers --------------------------------------------------------
  c.subheading('La carte de vos leviers');
  for (const [key, lv] of Object.entries(results.levers)) {
    c.paragraph(`${LEVER_LABELS[key]} — ${LEVER_STATUS_LABELS[lv.status]}`, { size: 10.5, bold: true, gapAfter: 1.5 });
    c.paragraph(`${lv.motif} ${lv.action}`, { size: 10, color: [76, 54, 82], gapAfter: 4 });
  }
  c.space(2);

  // --- Contradictions ----------------------------------------------------
  if (results.contradictions.length) {
    c.subheading('Incohérences à vérifier');
    for (const issue of results.contradictions) {
      c.bullet(issue.message, { size: 10.5 });
    }
    c.space(2);
  }

  // --- Réponses utiles (patrimoine et capacité déclarés) -----------------
  c.subheading('Vos réponses (patrimoine et capacité déclarés)');
  const p = context.patrimoine || {};
  const rows = [
    ['Revenus nets mensuels du foyer', fieldSummary(context.revenusNets)],
    ['Versements d’investissement habituels', fieldSummary(context.versementsInvestissement)],
    ['Résidence principale', fieldSummary(p.residencePrincipale)],
    ['Immobilier locatif', fieldSummary(p.immobilierLocatif)],
    ['Épargne et placements financiers', fieldSummary(p.epargnePlacements)],
    ['Parts d’entreprise', p.partsEntreprise ? (p.partsEntreprise.mode === 'value' ? fmtEuros(p.partsEntreprise.value) : 'valeur inconnue') : 'non renseigné'],
    ['Dettes personnelles (total)', fieldSummary(p.dettesTotal)],
  ];
  for (const [label, value] of rows) {
    c.paragraph(`${label} : ${value}`, { size: 10, gapAfter: 1.5 });
  }
  c.space(4);

  // --- Réponses aux questions notées ---------------------------------------
  c.subheading('Vos réponses aux questions notées');
  const branch = deriveBranch(context);
  const appMap = applicabilityMap(context, answers);
  const activeIndicators = INDICATORS.filter((i) => branch === 'entrepreneur' || !i.entrepreneurOnly);
  for (const ind of activeIndicators) {
    const app = appMap[ind.id];
    if (app.status === 'not_applicable') {
      c.paragraph(`${ind.id.toUpperCase()} (${axisName(ind.axis)}) : non applicable — ${app.note || 'ne s’applique pas à votre situation.'}`, { size: 9.6, color: [107, 98, 112], gapAfter: 1.5 });
      continue;
    }
    const ans = resolvedAnswer(ind.id, context, answers);
    let text;
    if (!ans) text = 'non répondu';
    else if (ans.kind === 'unknown') text = 'je ne sais pas';
    else if (ans.kind === 'refuse') text = 'préfère ne pas répondre';
    else if (ans.kind === 'value') {
      const opts = ind.getOptions ? ind.getOptions(context, answers) : null;
      const label = opts ? (opts.find((o) => o.value === ans.value) || {}).label : null;
      text = label || `note ${ans.value}/4`;
    } else {
      text = 'non répondu';
    }
    c.paragraph(`${ind.id.toUpperCase()} (${axisName(ind.axis)}) : ${text}`, { size: 9.6, gapAfter: 1.5 });
  }
  c.space(4);

  // --- Hypothèses et limites ----------------------------------------------
  c.subheading('Hypothèses et limites de ce bilan');
  c.paragraph(LEGAL_MENTION, { size: 9.3, color: [107, 98, 112], gapAfter: 2 });
  c.paragraph('Ce bilan reflète vos réponses au moment de sa génération. Toute réponse modifiée après coup rend ce document caduc sur les points concernés.', { size: 9.3, color: [107, 98, 112] });

  return doc;
}

export async function downloadBilanPdf(context, answers, results) {
  const doc = await buildBilanDoc(context, answers, results);
  doc.save('bilan-diagnostic-patrimonial.pdf');
}
