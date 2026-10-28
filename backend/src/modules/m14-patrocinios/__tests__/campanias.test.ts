import { describe, expect, it } from 'vitest';
import type { FilaCampania } from '../interfaces/patrocinios.interface';
import { cubre, ordenarParaBloque, prioridadesPorProducto, situacionCampania, vigentesEn } from '../services/campanias';
import { fechaBogota } from '../services/fechas';

/** Lógica pura de M14 (sin base de datos): vigencia, alcance, prioridad y orden del bloque. */
const campania = (c: Partial<FilaCampania> & Pick<FilaCampania, 'idCampania'>): FilaCampania => ({
  nombre: `Campaña ${c.idCampania}`,
  descripcion: null,
  estado: 'activo',
  fechaInicio: '2026-11-01',
  fechaFin: '2026-11-30',
  prioridad: 0,
  ubicaciones: ['listado'],
  objetivos: [],
  fechaCreacion: new Date(),
  fechaActualizacion: new Date(),
  actualizadoPor: null,
  ...c,
});

/** Instante a una hora dada de Colombia (UTC-5) de un día dado. */
const bogota = (fecha: string, hora: string): Date => new Date(`${fecha}T${hora}:00-05:00`);

describe('M14 · fecha en hora de Colombia', () => {
  it('a las 23:30 en Bogotá sigue siendo el mismo día aunque en UTC ya sea el siguiente', () => {
    expect(fechaBogota(bogota('2026-11-30', '23:30'))).toBe('2026-11-30');
    expect(fechaBogota(new Date('2026-12-01T04:30:00Z'))).toBe('2026-11-30');
  });

  it('a las 00:10 en Bogotá ya es el día nuevo', () => {
    expect(fechaBogota(bogota('2026-12-01', '00:10'))).toBe('2026-12-01');
  });
});

describe('M14 · A1 y A2: situación de una campaña', () => {
  const c = campania({ idCampania: 1 });

  it('antes de su inicio está programada y desde su inicio, vigente', () => {
    expect(situacionCampania(c, bogota('2026-10-31', '23:59'))).toBe('programado');
    expect(situacionCampania(c, bogota('2026-11-01', '00:00'))).toBe('vigente');
  });

  it('el último día entero sigue vigente y al día siguiente caduca sola', () => {
    expect(situacionCampania(c, bogota('2026-11-30', '23:59'))).toBe('vigente');
    expect(situacionCampania(c, bogota('2026-12-01', '00:00'))).toBe('vencido');
  });

  it('una campaña de un solo día vale ese día', () => {
    const uno = campania({ idCampania: 2, fechaInicio: '2026-11-15', fechaFin: '2026-11-15' });
    expect(situacionCampania(uno, bogota('2026-11-15', '12:00'))).toBe('vigente');
    expect(situacionCampania(uno, bogota('2026-11-16', '00:00'))).toBe('vencido');
  });

  it('inactiva manda sobre las fechas', () => {
    expect(situacionCampania(campania({ idCampania: 3, estado: 'inactivo' }), bogota('2026-11-10', '10:00'))).toBe('inactivo');
    expect(situacionCampania(campania({ idCampania: 3, estado: 'inactivo', fechaFin: '2026-01-01' }), bogota('2026-11-10', '10:00'))).toBe('inactivo');
  });

  it('vigentesEn solo deja las vigentes con esa ubicación', () => {
    const ahora = bogota('2026-11-10', '10:00');
    const lista = [
      campania({ idCampania: 1, ubicaciones: ['listado'] }),
      campania({ idCampania: 2, ubicaciones: ['inicio', 'listado'] }),
      campania({ idCampania: 3, ubicaciones: ['listado'], estado: 'inactivo' }),
      campania({ idCampania: 4, ubicaciones: ['listado'], fechaFin: '2026-11-05' }),
      campania({ idCampania: 5, ubicaciones: ['complementarios'] }),
    ];
    expect(vigentesEn(lista, 'listado', ahora).map((c) => c.idCampania)).toEqual([1, 2]);
    expect(vigentesEn(lista, 'inicio', ahora).map((c) => c.idCampania)).toEqual([2]);
    expect(vigentesEn(lista, 'complementarios', ahora).map((c) => c.idCampania)).toEqual([5]);
  });
});

describe('M14 · A3: qué cubre un objetivo', () => {
  const p = { idProducto: 10, idMarca: 1, idLinea: 5 };
  const sinLinea = { idProducto: 11, idMarca: 1, idLinea: null };

  it('un producto cubre solo ese producto', () => {
    expect(cubre([{ tipo: 'producto', id: 10 }], p)).toBe(true);
    expect(cubre([{ tipo: 'producto', id: 99 }], p)).toBe(false);
  });

  it('una línea cubre todos sus productos y no los de otra línea ni los sin línea', () => {
    expect(cubre([{ tipo: 'linea', id: 5 }], p)).toBe(true);
    expect(cubre([{ tipo: 'linea', id: 6 }], p)).toBe(false);
    expect(cubre([{ tipo: 'linea', id: 5 }], sinLinea)).toBe(false);
  });

  it('una marca cubre todos sus productos, con o sin línea', () => {
    expect(cubre([{ tipo: 'marca', id: 1 }], p)).toBe(true);
    expect(cubre([{ tipo: 'marca', id: 1 }], sinLinea)).toBe(true);
    expect(cubre([{ tipo: 'marca', id: 2 }], p)).toBe(false);
  });

  it('el mismo id con otro tipo no cuenta: la marca 5 no es la línea 5', () => {
    expect(cubre([{ tipo: 'marca', id: 5 }], p)).toBe(false);
    expect(cubre([{ tipo: 'producto', id: 5 }], p)).toBe(false);
  });
});

describe('M14 · A4 y A5: prioridad de un producto en varias campañas', () => {
  const productos = [
    { idProducto: 10, idMarca: 1, idLinea: 5 },
    { idProducto: 11, idMarca: 1, idLinea: null },
    { idProducto: 20, idMarca: 2, idLinea: null },
  ];

  it('gana la prioridad más alta y el producto sale una sola vez', () => {
    const r = prioridadesPorProducto(
      [
        campania({ idCampania: 1, prioridad: 10, objetivos: [{ tipo: 'marca', id: 1 }] }),
        campania({ idCampania: 2, prioridad: 80, objetivos: [{ tipo: 'linea', id: 5 }] }),
      ],
      productos,
    );
    expect(r).toEqual([
      { idProducto: 10, prioridad: 80, idCampania: 2 },
      { idProducto: 11, prioridad: 10, idCampania: 1 },
    ]);
  });

  it('los productos que ninguna campaña cubre no salen', () => {
    const r = prioridadesPorProducto([campania({ idCampania: 1, objetivos: [{ tipo: 'producto', id: 20 }] })], productos);
    expect(r.map((x) => x.idProducto)).toEqual([20]);
  });

  it('en un empate de prioridad gana la que empezó antes y luego la de id menor, sin depender del orden de llegada', () => {
    const antigua = campania({ idCampania: 7, prioridad: 50, fechaInicio: '2026-10-01', objetivos: [{ tipo: 'marca', id: 1 }] });
    const nueva = campania({ idCampania: 3, prioridad: 50, fechaInicio: '2026-11-01', objetivos: [{ tipo: 'marca', id: 1 }] });
    expect(prioridadesPorProducto([nueva, antigua], productos)[0]?.idCampania).toBe(7);
    expect(prioridadesPorProducto([antigua, nueva], productos)[0]?.idCampania).toBe(7);
    const a = campania({ idCampania: 4, prioridad: 50, objetivos: [{ tipo: 'marca', id: 1 }] });
    const b = campania({ idCampania: 9, prioridad: 50, objetivos: [{ tipo: 'marca', id: 1 }] });
    expect(prioridadesPorProducto([b, a], productos)[0]?.idCampania).toBe(4);
  });
});

describe('M14 · A10: orden del bloque del inicio', () => {
  it('va por prioridad descendente', () => {
    const r = ordenarParaBloque([{ id: 1, prioridad: 10 }, { id: 2, prioridad: 90 }, { id: 3, prioridad: 50 }], () => 0.5);
    expect(r.map((x) => x.id)).toEqual([2, 3, 1]);
  });

  it('entre la misma prioridad el orden es el del azar, y cambia con él', () => {
    const items = [{ id: 1, prioridad: 5 }, { id: 2, prioridad: 5 }, { id: 3, prioridad: 5 }];
    const azar = (valores: number[]) => {
      let i = 0;
      return () => valores[i++ % valores.length] ?? 0;
    };
    expect(ordenarParaBloque(items, azar([0.9, 0.1, 0.5])).map((x) => x.id)).toEqual([2, 3, 1]);
    expect(ordenarParaBloque(items, azar([0.1, 0.9, 0.5])).map((x) => x.id)).toEqual([1, 3, 2]);
  });

  it('el azar nunca salta por encima de una prioridad mayor', () => {
    const items = [{ id: 1, prioridad: 5 }, { id: 2, prioridad: 6 }];
    expect(ordenarParaBloque(items, () => 0).map((x) => x.id)).toEqual([2, 1]);
    expect(ordenarParaBloque(items, () => 0.999).map((x) => x.id)).toEqual([2, 1]);
  });

  it('no modifica la lista recibida', () => {
    const items = [{ id: 1, prioridad: 1 }, { id: 2, prioridad: 2 }];
    ordenarParaBloque(items, () => 0.3);
    expect(items.map((x) => x.id)).toEqual([1, 2]);
  });
});
