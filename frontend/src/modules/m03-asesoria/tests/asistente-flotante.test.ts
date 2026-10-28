import { describe, expect, it } from 'vitest';
import { ACCIONES_RAPIDAS } from '../services/acciones-rapidas';
import { horaDeChat } from '../services/hora-chat';

describe('atajos del asistente (mockup pág. 11)', () => {
  it('ofrece los cinco atajos del mockup, en su orden', () => {
    expect(ACCIONES_RAPIDAS.map((a) => a.etiqueta)).toEqual([
      'Buscar productos',
      'Recomendar pintura',
      'Consultar mi pedido',
      'Herramientas recomendadas',
      'Ver promociones',
    ]);
  });

  it('no manda al chat nada que las reglas duras le prohíban responder', () => {
    // El pedido son datos de órdenes y las promociones son precios y descuentos: la IA tiene
    // prohibido hablar de ambos, así que esos dos atajos deben navegar, no preguntar.
    const prohibidos = ['pedido', 'promociones'];
    for (const id of prohibidos) {
      const accion = ACCIONES_RAPIDAS.find((a) => a.id === id);
      expect(accion?.tipo, `el atajo "${id}" debería ser un enlace`).toBe('enlace');
    }
  });

  it('los atajos que sí preguntan llevan un texto no vacío', () => {
    for (const accion of ACCIONES_RAPIDAS) {
      if (accion.tipo === 'pregunta') expect(accion.texto.trim().length).toBeGreaterThan(0);
    }
  });

  it('los atajos que navegan apuntan a una ruta interna', () => {
    for (const accion of ACCIONES_RAPIDAS) {
      if (accion.tipo === 'enlace') expect(accion.href.startsWith('/')).toBe(true);
    }
  });

  it('cada atajo tiene un id único', () => {
    const ids = ACCIONES_RAPIDAS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('hora de las burbujas', () => {
  it('da la hora en formato de 12 horas, como el mockup', () => {
    // 2026-10-27 10:30 en hora local, para no depender de la zona horaria de quien corra esto.
    const texto = horaDeChat(new Date(2026, 9, 27, 10, 30));
    expect(texto).toMatch(/10:30/);
    expect(texto.toLowerCase()).toMatch(/a\.?\s?m\.?/);
  });

  it('distingue la mañana de la tarde', () => {
    const manana = horaDeChat(new Date(2026, 9, 27, 9, 5)).toLowerCase();
    const tarde = horaDeChat(new Date(2026, 9, 27, 21, 5)).toLowerCase();
    expect(manana).not.toBe(tarde);
    expect(tarde).toMatch(/9:05/);
  });
});
