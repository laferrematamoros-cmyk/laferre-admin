import { validate, daysText, recurrenceLabel, summaryText, toRow, fromActivity, REMINDERS, EMPTY_VALUES } from '../activity-form';

const base = { ...EMPTY_VALUES, title: 'Encender radios', start: '09:00', limit: '09:15', days: [1, 2, 3, 4, 5] };

describe('validate', () => {
  it('sin errores cuando todo está bien', () => {
    expect(validate(base)).toEqual({});
  });
  it('pide título, al menos un día y que la hora límite sea después del inicio', () => {
    expect(validate({ ...base, title: '  ', days: [], limit: '09:00' })).toEqual({
      title: 'Escribe qué hay que hacer.',
      days: 'Escoge al menos un día.',
      limit: 'La hora límite debe ser después de la hora de inicio.',
    });
  });
});

describe('textos', () => {
  it('daysText nombra los días como se dicen', () => {
    expect(daysText([0, 1, 2, 3, 4, 5, 6])).toBe('Todos los días');
    expect(daysText([5, 1, 2, 3, 4])).toBe('Lunes a viernes');
    expect(daysText([1, 2, 3, 4, 5, 6])).toBe('Lunes a sábado');
    expect(daysText([5, 1, 3])).toBe('Lunes, miércoles y viernes');
    expect(daysText([])).toBe('Ningún día');
  });
  it('recurrenceLabel guarda lo mismo que antes', () => {
    expect(recurrenceLabel([0, 1, 2, 3, 4, 5, 6])).toBe('diaria');
    expect(recurrenceLabel([1, 2, 3, 4, 5])).toBe('lun-vie');
    expect(recurrenceLabel([1, 2, 3, 4, 5, 6])).toBe('lun-sáb');
    expect(recurrenceLabel([1, 3])).toBe('personalizado');
  });
  it('summaryText resume cuándo toca', () => {
    expect(summaryText(base)).toBe('Lunes a viernes, de 09:00 a 09:15');
    expect(summaryText({ ...base, weekOfMonth: 2 })).toBe('Lunes a viernes, de 09:00 a 09:15, sólo la 2ª semana del mes');
    expect(summaryText({ ...base, weekOfMonth: -1 })).toBe('Lunes a viernes, de 09:00 a 09:15, sólo la última semana del mes');
  });
});

describe('guardar y leer', () => {
  it('toRow sólo manda los campos del formulario (no toca urgente ni nombre/nota/firma)', () => {
    const row = toRow({ ...base, description: '  ', days: [5, 1] });
    expect(row).toEqual({
      title: 'Encender radios', description: null, start_time: '09:00', limit_time: '09:15',
      recurrence: 'personalizado', days_of_week: [1, 5], week_of_month: null,
      assigned_employee_ids: [], reminder_minutes: 10, evidence_photo: true,
    });
    expect('is_urgent' in row || 'evidence_name' in row).toBe(false);
  });
  it('fromActivity respeta un recordatorio que no está en la lista', () => {
    const v = fromActivity({
      title: 'X', description: null, start_time: '08:00:00', limit_time: '08:15:00', days_of_week: [6],
      week_of_month: null, assigned_employee_ids: ['e1'], reminder_minutes: 20, evidence_photo: false,
    });
    expect(v).toEqual({ title: 'X', description: '', start: '08:00', limit: '08:15', days: [6], weekOfMonth: null, assigned: ['e1'], reminder: 20, photo: false });
    expect(REMINDERS).toEqual([5, 10, 15, 30]);
  });
});
