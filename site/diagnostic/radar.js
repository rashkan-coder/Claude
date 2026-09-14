// radar.js — dessin du radar à six axes sur un <canvas> (partagé entre la
// page de résultats et l'export PDF du bilan). Un axe non évalué n'est
// jamais relié aux axes voisins ni ramené à zéro : le tracé s'interrompt.
'use strict';

import { AXES } from './content.js';

export function drawRadar(canvas, results) {
  const ctx2d = canvas.getContext('2d');
  const size = canvas.width;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.30;
  const n = AXES.length;
  ctx2d.clearRect(0, 0, size, size);
  ctx2d.fillStyle = '#ffffff';
  ctx2d.fillRect(0, 0, size, size);

  ctx2d.strokeStyle = '#e3d7e5';
  ctx2d.lineWidth = 1;
  for (const frac of [0.25, 0.5, 0.75, 1]) {
    ctx2d.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (Math.PI * 2 * i) / n - Math.PI / 2;
      const r = radius * frac;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      i === 0 ? ctx2d.moveTo(x, y) : ctx2d.lineTo(x, y);
    }
    ctx2d.stroke();
  }

  ctx2d.fillStyle = '#6b6270';
  ctx2d.font = '10px Arial';
  const labelPad = 4; // marge de sécurité pour ne jamais dessiner hors canvas
  AXES.forEach((axis, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    const x2 = cx + Math.cos(a) * radius;
    const y2 = cy + Math.sin(a) * radius;
    ctx2d.strokeStyle = '#e3d7e5';
    ctx2d.beginPath();
    ctx2d.moveTo(cx, cy);
    ctx2d.lineTo(x2, y2);
    ctx2d.stroke();
    let lx = cx + Math.cos(a) * (radius + 16);
    const ly = cy + Math.sin(a) * (radius + 16);
    const align = Math.cos(a) > 0.3 ? 'left' : Math.cos(a) < -0.3 ? 'right' : 'center';
    ctx2d.textAlign = align;
    // Garde-fou : même si un libellé est plus long que prévu, il ne doit
    // jamais dépasser le cadre du canvas (les navigateurs ne redimensionnent
    // pas le texte automatiquement).
    const textWidth = ctx2d.measureText(axis.short).width;
    if (align === 'left') lx = Math.min(lx, size - labelPad - textWidth);
    else if (align === 'right') lx = Math.max(lx, labelPad + textWidth);
    else lx = Math.min(Math.max(lx, labelPad + textWidth / 2), size - labelPad - textWidth / 2);
    ctx2d.fillText(axis.short, lx, ly);
  });

  ctx2d.strokeStyle = '#6a218d';
  ctx2d.lineWidth = 2;
  const points = AXES.map((axis, i) => {
    const res = results.axes[axis.id];
    if (res.status !== 'ok') return null;
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = radius * (res.score / 100);
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });
  let started = false;
  ctx2d.beginPath();
  for (let i = 0; i <= n; i++) {
    const p = points[i % n];
    if (!p) { started = false; continue; }
    if (!started) { ctx2d.moveTo(p.x, p.y); started = true; } else { ctx2d.lineTo(p.x, p.y); }
  }
  ctx2d.stroke();
  points.forEach((p) => {
    if (!p) return;
    ctx2d.beginPath();
    ctx2d.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx2d.fillStyle = '#411459';
    ctx2d.fill();
  });
}
