import { STATUSES, STATUS_LABEL, RATING_LABEL, ratingOf, toDateStr, weekLabel, type Status, type WeekReport } from './reports';
import type { Insight } from './report-insights';

type RGB = [number, number, number];
const COLOR: Record<Status, RGB> = { ok: [10, 125, 85], late: [232, 147, 12], miss: [225, 29, 46], todo: [222, 222, 228] };
const INK: RGB = [15, 15, 16];
const MUTED: RGB = [110, 110, 115];
const DAY = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function slug(t: string): string {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** PDF de la semana con los mismos números que la pantalla.
 *  `showCounts = false` (practicante) quita las cifras por persona. */
export async function downloadReportPdf(o: { report: WeekReport; insights: Insight[]; companyName: string; showCounts: boolean }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, M = 14;
  const r = o.report;
  let y = 0;
  const ensure = (h: number) => { if (y + h > 282) { doc.addPage(); y = 16; } };
  const ink = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const section = (title: string) => {
    ensure(14);
    y += 4;
    ink(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text(title, M, y);
    y += 5;
  };

  // Encabezado
  fill(INK); doc.rect(0, 0, W, 30, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text(`${o.companyName.toUpperCase()} · REPORTE SEMANAL`, M, 13);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(180, 180, 180);
  doc.text(`Semana del ${weekLabel(r.weekStart)}`, M, 20);
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, M, 26);

  // Resumen
  y = 37;
  const rating = r.pct === null ? null : ratingOf(r.pct);
  fill(rating ? COLOR[rating] : MUTED);
  doc.roundedRect(M, y, W - 2 * M, 24, 3, 3, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(24);
  doc.text(r.pct === null ? 'Sin datos' : `${r.pct}%`, M + 6, y + 15);
  doc.setFontSize(11);
  doc.text(rating ? RATING_LABEL[rating] : 'Todavía no toca nada', M + 48, y + 9);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(r.pct === null ? 'No hay actividades vencidas en la semana.' : `Se hizo ${r.done} de ${r.due} que ya tocaban.`, M + 48, y + 15);
  doc.text(STATUSES.map(k => `${r.counts[k]} ${STATUS_LABEL[k].toLowerCase()}`).join(' · '), M + 48, y + 20);
  y += 30;

  // Barra con todas las actividades de la semana
  const total = STATUSES.reduce((n, k) => n + r.counts[k], 0);
  if (total > 0) {
    let x = M;
    const bw = W - 2 * M;
    for (const k of STATUSES) {
      const w = (bw * r.counts[k]) / total;
      if (w > 0) { fill(COLOR[k]); doc.rect(x, y, w, 4, 'F'); x += w; }
    }
    y += 10;
  }

  // Lectura rápida
  if (o.insights.length) {
    section('Lectura rápida');
    for (const it of o.insights) {
      ensure(11);
      fill(COLOR[it.tone]); doc.circle(M + 1.5, y + 1.5, 1.5, 'F');
      ink(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text(it.title, M + 6, y + 2.5);
      ink(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text(it.detail, M + 6, y + 7);
      y += 11;
    }
  }

  // Por persona
  const active = r.people.filter(p => p.done + p.miss > 0);
  if (active.length || r.generalMiss) {
    section('Por persona');
    const max = Math.max(1, r.generalMiss, ...active.map(p => p.done + p.miss));
    const barX = 62;
    const barW = o.showCounts ? 72 : W - M - barX;
    const rows = [
      ...active.map(p => ({ name: p.name, ok: p.done - p.late, late: p.late, miss: p.miss, nums: `${p.done} hechas · ${p.late} tarde · ${p.miss} sin hacer` })),
      ...(r.generalMiss ? [{ name: 'Generales', ok: 0, late: 0, miss: r.generalMiss, nums: `${r.generalMiss} sin hacer` }] : []),
    ];
    for (const row of rows) {
      ensure(9);
      ink(INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(row.name, M, y + 4);
      fill([240, 240, 244]); doc.roundedRect(barX, y + 0.5, barW, 4, 1, 1, 'F');
      let x = barX;
      for (const k of ['ok', 'late', 'miss'] as const) {
        const w = (barW * row[k]) / max;
        if (w > 0) { fill(COLOR[k]); doc.rect(x, y + 0.5, w, 4, 'F'); x += w; }
      }
      if (o.showCounts) { ink(MUTED); doc.setFontSize(8.5); doc.text(row.nums, barX + barW + 4, y + 4); }
      y += 8;
    }
  }

  // Lo que no se hizo
  section(`Lo que no se hizo (${r.missed.length})`);
  if (r.missed.length === 0) {
    ink(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text('No quedó nada sin hacer.', M, y + 3);
    y += 8;
  } else {
    for (const m of r.missed) {
      ensure(13);
      fill([252, 231, 233]); doc.roundedRect(M, y, W - 2 * M, 10, 2, 2, 'F');
      ink(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.text(m.title, M + 4, y + 4);
      ink(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
      doc.text(`${DAY[m.date.getDay()]} ${m.date.getDate()} · límite ${m.limit} · ${m.general ? 'General (nadie la tomó)' : m.assignee}`, M + 4, y + 8.3);
      y += 13;
    }
  }

  doc.save(`reporte-${slug(o.companyName) || 'actividades'}-${toDateStr(r.weekStart)}.pdf`);
}
