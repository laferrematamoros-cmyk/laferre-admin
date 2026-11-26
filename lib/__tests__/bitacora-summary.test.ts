import { bitacoraSummary, summaryChips, bitacorasPeek, validWeek } from '../bitacora-summary';

// Semana del lun 23 nov 2026 (lunes a sábado: 23–28). "Hoy" = jueves 26.
const W = '2026-11-23';
const TODAY = '2026-11-26';
const acts = [
  { id: 'L', title: 'LIMPIEZA', days_of_week: [1, 2, 3, 4, 5, 6] },
  { id: 'R', title: 'REVISAR UNIDADES', days_of_week: [1, 3, 5] },
];
const run = (id: string, a: string, d: string, status: string) => ({ id, activity_id: a, scheduled_date: d, status });

describe('resumen de bitácoras', () => {
  it('cuenta días hechos, firmadas, por firmar, faltantes y tareas que no se pudieron', () => {
    const runs = [
      run('1', 'L', '2026-11-23', 'signed'), run('2', 'L', '2026-11-24', 'awaiting_signature'),
      // miércoles 25 no hubo lista: falta; jueves 26 (hoy) en curso: todavía no falta
      run('3', 'L', '2026-11-26', 'in_progress'),
      run('4', 'R', '2026-11-23', 'signed'), run('5', 'R', '2026-11-25', 'signed'),
      run('X', 'L', '2026-11-16', 'signed'), // otra semana: no cuenta
    ];
    const s = bitacoraSummary(acts, runs, [{ run_id: '1' }, { run_id: '1' }, { run_id: '5' }], W, TODAY);
    expect(s).toEqual([
      { id: 'L', title: 'LIMPIEZA', due: 4, done: 2, signed: 1, toSign: 1, missed: 1, skipped: 2 },
      { id: 'R', title: 'REVISAR UNIDADES', due: 2, done: 2, signed: 2, toSign: 0, missed: 0, skipped: 1 },
    ]);
  });
  it('una semana pasada cuenta los seis días; una actividad sin días no debe nada', () => {
    const s = bitacoraSummary([{ id: 'L', title: 'LIMPIEZA', days_of_week: [1, 2, 3, 4, 5, 6] }, { id: 'Z', title: 'A', days_of_week: null }],
      [run('1', 'L', '2026-11-16', 'signed')], [], '2026-11-16', TODAY);
    expect(s.map(x => [x.title, x.due, x.done, x.missed])).toEqual([['A', 0, 0, 0], ['LIMPIEZA', 6, 1, 5]]);
  });
  it('una lista nueva cuenta desde que empezó su rol, no desde el lunes', () => {
    // REVISAR UNIDADES se creó el miércoles 25: el lunes 23 no le debe nada.
    const s2 = bitacoraSummary([{ id: 'R', title: 'REVISAR UNIDADES', days_of_week: [1, 3, 5], start: '2026-11-25' }], [], [], W, TODAY);
    expect(s2).toEqual([{ id: 'R', title: 'REVISAR UNIDADES', due: 1, done: 0, signed: 0, toSign: 0, missed: 1, skipped: 0 }]);
    const s3 = bitacoraSummary([{ id: 'R', title: 'REVISAR UNIDADES', days_of_week: [1, 3, 5], start: '2026-11-26' }], [], [], W, TODAY);
    expect(s3[0]).toMatchObject({ due: 0, missed: 0 });
  });
  it('textos', () => {
    const L = { id: 'L', title: 'LIMPIEZA', due: 4, done: 2, signed: 1, toSign: 1, missed: 1, skipped: 2 };
    expect(summaryChips(L)).toEqual([
      { text: '2 de 4 días hechos', tone: 'warn' }, { text: '1 firmada', tone: 'ok' },
      { text: '1 por firmar', tone: 'warn' }, { text: '2 tareas no se pudieron', tone: 'muted' },
    ]);
    expect(summaryChips({ ...L, due: 1, done: 1, signed: 2, toSign: 0, missed: 0, skipped: 1 })).toEqual([
      { text: '1 de 1 día hecho', tone: 'ok' }, { text: '2 firmadas', tone: 'ok' }, { text: '1 tarea no se pudo', tone: 'muted' },
    ]);
    expect(summaryChips({ ...L, due: 0, done: 0, signed: 0, toSign: 0, missed: 0, skipped: 0 })).toEqual([{ text: 'Esta semana no tocaba', tone: 'muted' }]);
    expect(bitacorasPeek([L, { ...L, id: 'R', toSign: 0, missed: 0 }])).toBe('2 listas · 1 por firmar · 1 día sin hacer');
    expect(bitacorasPeek([{ ...L, toSign: 0, missed: 0 }])).toBe('1 lista · todo al día');
  });
  it('semana de la dirección: un lunes, nunca futura; si no, null', () => {
    expect(validWeek('2026-11-25', '2026-11-23')).toBe('2026-11-23');
    expect(validWeek('2026-11-09', '2026-11-23')).toBe('2026-11-09');
    expect(validWeek('2026-11-30', '2026-11-23')).toBeNull();
    expect(validWeek('hola', '2026-11-23')).toBeNull();
    expect(validWeek(null, '2026-11-23')).toBeNull();
  });
});
