// pdf-layout.js — petit utilitaire de mise en page partagé par le guide (3
// pages fixes) et le bilan (pagination libre), pour éviter de dupliquer le
// calcul de retour à la ligne / interlignage entre les deux générateurs PDF.
'use strict';

const MM_PER_PT = 0.352778;

export class Cursor {
  constructor(doc, { marginLeft = 22, marginRight = 22, marginTop = 22, marginBottom = 22, autoPaginate = false } = {}) {
    this.doc = doc;
    this.marginLeft = marginLeft;
    this.marginRight = marginRight;
    this.marginTop = marginTop;
    this.marginBottom = marginBottom;
    this.autoPaginate = autoPaginate;
    this.pageWidth = doc.internal.pageSize.getWidth();
    this.pageHeight = doc.internal.pageSize.getHeight();
    this.contentWidth = this.pageWidth - marginLeft - marginRight;
    this.y = marginTop;
  }

  lineHeight(fontSizePt) {
    return fontSizePt * MM_PER_PT * 1.34;
  }

  ensureSpace(mm) {
    if (this.y + mm > this.pageHeight - this.marginBottom) {
      if (this.autoPaginate) {
        this.doc.addPage();
        this.y = this.marginTop;
      }
    }
  }

  space(mm) {
    this.y += mm;
  }

  heading(text, { size = 20, color = [65, 20, 89], gapAfter = 6 } = {}) {
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(size);
    this.doc.setTextColor(...color);
    const lines = this.doc.splitTextToSize(text, this.contentWidth);
    const lh = this.lineHeight(size);
    this.ensureSpace(lines.length * lh + gapAfter);
    for (const line of lines) {
      this.doc.text(line, this.marginLeft, this.y);
      this.y += lh;
    }
    this.y += gapAfter;
  }

  subheading(text, { size = 13, color = [65, 20, 89], gapAfter = 3 } = {}) {
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(size);
    this.doc.setTextColor(...color);
    const lh = this.lineHeight(size);
    this.ensureSpace(lh + gapAfter);
    this.doc.text(text, this.marginLeft, this.y);
    this.y += lh + gapAfter;
  }

  paragraph(text, { size = 11, color = [43, 22, 54], gapAfter = 5, bold = false } = {}) {
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal');
    this.doc.setFontSize(size);
    this.doc.setTextColor(...color);
    const lines = this.doc.splitTextToSize(text, this.contentWidth);
    const lh = this.lineHeight(size);
    this.ensureSpace(lines.length * lh + gapAfter);
    for (const line of lines) {
      this.doc.text(line, this.marginLeft, this.y);
      this.y += lh;
    }
    this.y += gapAfter;
  }

  bullet(text, { size = 11, color = [43, 22, 54], gapAfter = 3 } = {}) {
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(size);
    this.doc.setTextColor(...color);
    const indent = 5;
    const lines = this.doc.splitTextToSize(text, this.contentWidth - indent);
    const lh = this.lineHeight(size);
    this.ensureSpace(lines.length * lh + gapAfter);
    this.doc.text('•', this.marginLeft, this.y);
    for (const line of lines) {
      this.doc.text(line, this.marginLeft + indent, this.y);
      this.y += lh;
    }
    this.y += gapAfter;
  }

  calloutBox(text, { size = 10.5, padding = 5, gapAfter = 6 } = {}) {
    this.doc.setFont('helvetica', 'italic');
    this.doc.setFontSize(size);
    const lines = this.doc.splitTextToSize(text, this.contentWidth - padding * 2);
    const lh = this.lineHeight(size);
    const boxHeight = lines.length * lh + padding * 2;
    this.ensureSpace(boxHeight + gapAfter);
    this.doc.setFillColor(251, 242, 253);
    this.doc.setDrawColor(106, 33, 141);
    this.doc.setLineWidth(0.6);
    this.doc.rect(this.marginLeft, this.y, this.contentWidth, boxHeight, 'FD');
    this.doc.setTextColor(65, 20, 89);
    let ty = this.y + padding + lh * 0.72;
    for (const line of lines) {
      this.doc.text(line, this.marginLeft + padding, ty);
      ty += lh;
    }
    this.y += boxHeight + gapAfter;
  }

  rule({ gapBefore = 2, gapAfter = 6, color = [231, 224, 236] } = {}) {
    this.y += gapBefore;
    this.doc.setDrawColor(...color);
    this.doc.setLineWidth(0.3);
    this.doc.line(this.marginLeft, this.y, this.pageWidth - this.marginRight, this.y);
    this.y += gapAfter;
  }

  footer(text, { size = 8.5, color = [107, 98, 112] } = {}) {
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(size);
    this.doc.setTextColor(...color);
    this.doc.text(text, this.marginLeft, this.pageHeight - 10);
  }
}
