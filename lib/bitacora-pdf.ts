import type { jsPDF as JsPDF } from 'jspdf';
import type { Bitacora } from './bitacora';

// PDF de la bitácora semanal (carta horizontal), con la forma de la hoja de papel:
// tareas por área en filas, lunes a sábado en columnas, y abajo quién la hizo y la firma.
// Helvetica no trae "✓": la palomita se dibuja con líneas.

type RGB = [number, number, number];
const INK: RGB = [15, 15, 16];
const MUTED: RGB = [110, 110, 115];
const OK: RGB = [10, 125, 85];
const WARN: RGB = [180, 83, 9];
const BAND: RGB = [238, 238, 242];
const OFF: RGB = [246, 246, 248];
const DAY = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];

const dm = (date: string) => new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  .format(new Date(`${date}T12:00:00Z`)).replace('.', '');
const hm = (iso: string) => new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Matamoros' });
const slug = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function buildBitacoraPdf(o: { bitacora: Bitacora; activityTitle: string; companyName: string }): Promise<JsPDF> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const W = 279.4, H = 215.9, M = 10;
  const TASK_W = 82;
  const COL_W = (W - 2 * M - TASK_W) / 6;
  const ROW_H = 6.6;
  const b = o.bitacora;
  const first = b.days[0].date, last = b.days[5].date;
  const ink = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const line = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
  const fit = (t: string, w: number) => {
    let s = t;
    while (s.length > 1 && doc.getTextWidth(s) > w) s = s.slice(0, -1);
    return s === t ? t : `${s.slice(0, -1)}…`;
  };
  let y = 0;

  const header = () => {
    fill(INK); doc.rect(0, 0, W, 24, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(`${o.companyName.toUpperCase()} · BITÁCORA SEMANAL`, M, 9);
    doc.setFontSize(18);
    doc.text(o.activityTitle.toUpperCase(), M, 18);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(200, 200, 205);
    doc.text(`Semana del ${dm(first)} al ${dm(last)} de ${first.slice(0, 4)}`, W - M, 18, { align: 'right' });
    y = 30;
    // Encabezado de columnas
    fill(INK); doc.rect(M, y, W - 2 * M, 8, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    doc.text('TAREA', M + 3, y + 5.4);
    b.days.forEach((d, i) => doc.text(`${DAY[d.dow]} ${d.date.slice(8, 10)}`, M + TASK_W + COL_W * i + COL_W / 2, y + 5.4, { align: 'center' }));
    y += 8;
  };
  const ensure = (h: number) => { if (y + h > H - 12) { doc.addPage(); header(); } };
  const check = (cx: number, cy: number) => {
    line(OK); doc.setLineWidth(0.7);
    doc.line(cx - 1.8, cy, cx - 0.5, cy + 1.4);
    doc.line(cx - 0.5, cy + 1.4, cx + 2, cy - 1.6);
  };

  header();
  for (const area of b.areas) {
    ensure(ROW_H * 2);
    fill(BAND); doc.rect(M, y, W - 2 * M, ROW_H, 'F');
    ink(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    doc.text(area.area.toUpperCase(), M + 3, y + 4.4);
    y += ROW_H;
    for (const row of area.rows) {
      ensure(ROW_H);
      line([226, 226, 230]); doc.setLineWidth(0.2);
      doc.line(M, y + ROW_H, W - M, y + ROW_H);
      ink(INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
      doc.text(fit(row.label, TASK_W - 5), M + 3, y + 4.4);
      row.cells.forEach((c, i) => {
        const x = M + TASK_W + COL_W * i;
        const cx = x + COL_W / 2, cy = y + ROW_H / 2;
        if (c === null) { fill(OFF); doc.rect(x + 0.4, y + 0.4, COL_W - 0.8, ROW_H - 0.8, 'F'); return; }
        doc.setFontSize(7);
        if (c.state === 'none') { ink(MUTED); doc.text('—', cx, cy + 1.2, { align: 'center' }); return; }
        if (c.state === 'done') { check(c.photo ? cx - 4 : cx, cy); if (c.photo) { ink(MUTED); doc.text('foto', cx + 1, cy + 1.2); } return; }
        if (c.state === 'skipped') { ink(WARN); doc.setFont('helvetica', 'bold'); doc.text(fit(`No: ${c.reason ?? ''}`, COL_W - 3), cx, cy + 1.2, { align: 'center' }); doc.setFont('helvetica', 'normal'); return; }
        ink(MUTED); doc.text('Pendiente', cx, cy + 1.2, { align: 'center' });
      });
      y += ROW_H;
    }
  }

  // Pie: quién la hizo y la firma de cada día
  ensure(ROW_H * 3 + 4);
  y += 3;
  const foot = (title: string, text: (i: number) => [string, RGB], h = ROW_H) => {
    fill(BAND); doc.rect(M, y, TASK_W, h, 'F');
    ink(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    doc.text(title, M + 3, y + 4.4);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    b.days.forEach((_, i) => {
      const [t, c] = text(i);
      ink(c);
      const lines = doc.splitTextToSize(t, COL_W - 3) as string[];
      doc.text(lines.slice(0, 2), M + TASK_W + COL_W * i + COL_W / 2, y + 4, { align: 'center' });
    });
    line([226, 226, 230]); doc.line(M, y + h, W - M, y + h);
    y += h;
  };
  foot('LA HIZO', i => [b.days[i].employee ?? '—', b.days[i].employee ? INK : MUTED]);
  foot('FIRMA', i => {
    const d = b.days[i];
    if (d.status === 'signed' && d.signedAt) return [`${d.signedBy ?? ''} · ${hm(d.signedAt)}${d.signedVia === 'pin' ? ' (PIN)' : ''}`, OK];
    if (d.status === 'awaiting_signature') return ['Falta firma', WARN];
    if (d.status === 'returned') return ['Regresada', WARN];
    if (d.status === 'in_progress') return ['Sin terminar', MUTED];
    return ['Sin lista', MUTED];
  }, ROW_H * 1.8);

  ink(MUTED); doc.setFontSize(7);
  doc.text(`Generado el ${new Date().toLocaleString('es-MX', { timeZone: 'America/Matamoros' })} · Panel de Actividades`, M, H - 6);
  return doc;
}

export async function downloadBitacoraPdf(o: { bitacora: Bitacora; activityTitle: string; companyName: string }): Promise<void> {
  const doc = await buildBitacoraPdf(o);
  doc.save(`bitacora-${slug(o.activityTitle)}-${o.bitacora.days[0].date}.pdf`);
}
