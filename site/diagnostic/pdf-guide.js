// pdf-guide.js — génère le guide pédagogique de trois pages exactement
// (section 11 du cahier des charges), en PDF A4 portrait, texte réellement
// sélectionnable (aucune image de texte). Contenu statique : voir content.js
// (GUIDE) pour le texte édité, ce fichier ne fait que la mise en page.
'use strict';

import { loadJsPDF } from './load-jspdf.js';
import { GUIDE, RULE_VERSION } from './content.js';
import { Cursor } from './pdf-layout.js';

export async function buildGuideDoc() {
  const jsPDF = await loadJsPDF();
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  doc.setProperties({ title: 'Votre patrimoine : les leviers que vous n’utilisez pas encore — Guide', author: 'Rashan Kadioglu — Captain Invest' });

  // --- Page 1 ---------------------------------------------------------
  let c = new Cursor(doc, { autoPaginate: false });
  c.heading(GUIDE.page1.title, { size: 21, gapAfter: 7 });
  c.paragraph(GUIDE.page1.intro, { size: 11, gapAfter: 8 });
  for (const b of GUIDE.page1.blocks) {
    c.subheading(`${b.n}. ${b.title}`, { size: 13 });
    c.paragraph(b.text, { size: 10.8, gapAfter: 2.5 });
    c.paragraph(`Première action : ${b.action}`, { size: 10.5, bold: true, gapAfter: 7 });
  }
  c.calloutBox(GUIDE.page1.callout);
  c.footer('Captain Invest — Guide pédagogique · page 1/3');

  // --- Page 2 ---------------------------------------------------------
  doc.addPage();
  c = new Cursor(doc, { autoPaginate: false });
  c.heading(GUIDE.page2.title, { size: 21, gapAfter: 7 });
  for (const b of GUIDE.page2.blocks) {
    c.subheading(`${b.n}. ${b.title}`, { size: 13 });
    c.paragraph(b.text, { size: 10.8, gapAfter: 2.5 });
    c.paragraph(`Première action : ${b.action}`, { size: 10.5, bold: true, gapAfter: 7 });
  }
  c.calloutBox(GUIDE.page2.callout);
  c.footer('Captain Invest — Guide pédagogique · page 2/3');

  // --- Page 3 ---------------------------------------------------------
  doc.addPage();
  c = new Cursor(doc, { autoPaginate: false });
  c.heading(GUIDE.page3.title, { size: 21, gapAfter: 7 });
  for (const s of GUIDE.page3.sections) {
    c.subheading(s.title, { size: 13 });
    c.paragraph(s.text, { size: 10.8, gapAfter: 7 });
  }
  c.subheading(GUIDE.page3.plan.title, { size: 13 });
  for (const item of GUIDE.page3.plan.items) {
    c.bullet(item, { size: 10.8 });
  }
  c.space(3);
  c.paragraph(GUIDE.page3.conclusion, { size: 11.5, bold: true, gapAfter: 6 });
  c.rule();
  c.paragraph(GUIDE.page3.signature, { size: 10.5, gapAfter: 8 });
  c.paragraph(GUIDE.page3.finalMention, { size: 8.8, color: [107, 98, 112], gapAfter: 2 });
  c.paragraph(`Grille et textes version ${RULE_VERSION}.`, { size: 8, color: [150, 140, 155], gapAfter: 0 });
  c.footer('Captain Invest — Guide pédagogique · page 3/3');

  return doc;
}

export async function downloadGuidePdf() {
  const doc = await buildGuideDoc();
  doc.save('captain-invest-guide-patrimoine.pdf');
}
