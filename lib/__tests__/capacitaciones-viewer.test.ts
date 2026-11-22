import { firstNameOf, previewSettings, shortDay } from '../capacitaciones/format';

describe('página de la animación: textos', () => {
  it('primer nombre en tipo título', () => {
    expect(firstNameOf('EDDIE GARCÍA LÓPEZ')).toBe('Eddie');
    expect(firstNameOf('  ángel  ruiz ')).toBe('Ángel');
    expect(firstNameOf('')).toBe('');
    expect(firstNameOf(null)).toBe('');
  });

  it('día corto con la hora de Matamoros', () => {
    expect(shortDay('2026-11-21T18:30:00Z')).toBe('21 nov');
    // 2:00 UTC del 22 todavía es el 21 en Matamoros.
    expect(shortDay('2026-11-22T02:00:00Z')).toBe('21 nov');
  });

  it('vista previa: lo guardado en Ajustes; si no hay, el catálogo', () => {
    const cat = { title: 'Instalar un fregadero', minSeconds: 30 };
    expect(previewSettings(cat, { title: 'Instalar un fregadero', min_seconds: 45 })).toEqual({ title: 'Instalar un fregadero', minSeconds: 45 });
    // Sin la tabla (011 sin correr) o sin fila.
    expect(previewSettings(cat, null)).toEqual(cat);
    expect(previewSettings(cat, undefined)).toEqual(cat);
    // Valores que la base no aceptaría: se queda el del catálogo.
    for (const bad of [0, 4, 601, 30.5, '45', null]) expect(previewSettings(cat, { min_seconds: bad }).minSeconds).toBe(30);
    expect(previewSettings(cat, { title: '  ', min_seconds: 60 })).toEqual({ title: 'Instalar un fregadero', minSeconds: 60 });
  });
});
