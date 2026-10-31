import { describe, expect, it } from 'vitest';
import { ESTADOS_ORDEN, MAX_NOTA_CANCELACION, solicitarCancelacionRequestSchema, verificarLineasRequestSchema } from '../dtos/m09-cumplimiento.dto';
import type { EstadoMarca } from '../dtos/m09-cumplimiento.dto';
import {
  armarVerificacion,
  componerMotivoCancelacion,
  describirLinea,
  esEstadoDeCumplimiento,
  estadoDeLinea,
  motivosDeRetencion,
  todasDisponibles,
  todasPreparadas,
} from '../services/reglas-cumplimiento';
import { linea, ordenDe } from './repo-memoria';

const base = { nombreProducto: 'Vinilo', varianteCopia: 'Galón' };

function conRegistros(...estados: EstadoMarca[]) {
  const l = linea(1, base);
  l.registros = estados.map((estado, i) => ({ estado, autor: 'Luis', fecha: new Date(2026, 9, 30, 8, i) }));
  return l;
}

describe('reglas de M09', () => {
  it('en revisión, el estado de una línea es su último registro; sin registros, pendiente (R2, R3, R17)', () => {
    const revision = 'revision_disponibilidad';
    expect(estadoDeLinea(revision, conRegistros())).toBe('pendiente');
    expect(estadoDeLinea(revision, conRegistros('disponible'))).toBe('disponible');
    expect(estadoDeLinea(revision, conRegistros('disponible', 'consiguiendo_stock'))).toBe('consiguiendo_stock');
    expect(estadoDeLinea(revision, conRegistros('no_disponible', 'consiguiendo_stock', 'disponible'))).toBe('disponible');
  });

  it('sin registros, el estado sale de la orden: disponible en preparación, preparada en preparada (R17)', () => {
    expect(estadoDeLinea('en_preparacion', conRegistros())).toBe('disponible');
    expect(estadoDeLinea('preparada', conRegistros())).toBe('preparada');
    expect(estadoDeLinea('orden_confirmada', conRegistros())).toBe('pendiente');
  });

  it('con registros, la última marca manda aunque la orden esté más adelantada: corregir no la mueve (R6)', () => {
    expect(estadoDeLinea('preparada', conRegistros('preparada', 'no_disponible'))).toBe('no_disponible');
    expect(estadoDeLinea('en_preparacion', conRegistros('disponible', 'preparada'))).toBe('preparada');
  });

  it.each([
    ['despachado', 'despachada'],
    ['entregado', 'entregada'],
    ['cancelado', 'cancelada'],
    ['devuelto', 'devuelta'],
  ] as const)('con la orden %s la línea hereda %s, sea cual sea su última marca (R17)', (orden, esperado) => {
    expect(estadoDeLinea(orden, conRegistros('no_disponible'))).toBe(esperado);
    expect(estadoDeLinea(orden, conRegistros())).toBe(esperado);
  });

  it('solo cuentan como completas las órdenes con TODAS las líneas disponibles, y nunca una vacía (R7)', () => {
    const rev = 'revision_disponibilidad';
    expect(todasDisponibles(rev, [conRegistros('disponible'), conRegistros('disponible')])).toBe(true);
    expect(todasDisponibles(rev, [conRegistros('disponible'), conRegistros('consiguiendo_stock')])).toBe(false);
    expect(todasDisponibles(rev, [conRegistros('disponible'), conRegistros()])).toBe(false);
    expect(todasDisponibles(rev, [conRegistros('disponible', 'no_disponible')])).toBe(false);
    expect(todasDisponibles(rev, [])).toBe(false);
  });

  it('solo cuentan como preparadas las órdenes con TODAS las líneas preparadas, y nunca una vacía (R15)', () => {
    const prep = 'en_preparacion';
    expect(todasPreparadas(prep, [conRegistros('disponible', 'preparada'), conRegistros('preparada')])).toBe(true);
    expect(todasPreparadas(prep, [conRegistros('preparada'), conRegistros('disponible')])).toBe(false);
    expect(todasPreparadas(prep, [conRegistros('preparada'), conRegistros()])).toBe(false);
    expect(todasPreparadas(prep, [conRegistros('preparada', 'disponible')])).toBe(false);
    expect(todasPreparadas(prep, [])).toBe(false);
  });

  it('los estados donde M09 opera son exactamente tres (R4)', () => {
    const operables = ESTADOS_ORDEN.filter(esEstadoDeCumplimiento);
    expect(operables).toEqual(['revision_disponibilidad', 'en_preparacion', 'preparada']);
  });

  it('el motivo de retención nombra cada línea que no está disponible y su estado (R12)', () => {
    const lineas = [conRegistros('disponible'), conRegistros('consiguiendo_stock'), conRegistros()];
    lineas[1] = { ...lineas[1]!, nombreProducto: 'Brocha', varianteCopia: 'Unidad' };

    expect(motivosDeRetencion('revision_disponibilidad', lineas)).toEqual([
      { descripcion: 'Brocha — Unidad', estado: 'consiguiendo_stock' },
      { descripcion: 'Vinilo — Galón', estado: 'pendiente' },
    ]);
    expect(describirLinea(base)).toBe('Vinilo — Galón');
  });

  describe('la verificación se arma en cualquier estado de la orden (R4, R17)', () => {
    it('una orden despachada muestra sus líneas heredadas, ninguna sin confirmar y completa', () => {
      const v = armarVerificacion(ordenDe('PC-2026-00001', 'despachado'));

      expect(v.estado).toBe('despachado');
      expect(v.lineas.map((l) => l.estado)).toEqual(['despachada', 'despachada', 'despachada']);
      expect(v).toMatchObject({ lineasSinConfirmar: 0, completa: true, cancelacion: null });
    });

    it('las líneas preparadas, disponibles o heredadas no cuentan como sin confirmar; una pendiente sí', () => {
      const orden = ordenDe('PC-2026-00001', 'en_preparacion');
      orden.lineas[1]!.registros = [{ estado: 'preparada', autor: 'Luis', fecha: new Date() }];
      orden.lineas[2]!.registros = [{ estado: 'consiguiendo_stock', autor: 'Luis', fecha: new Date() }];

      const v = armarVerificacion(orden);

      expect(v.lineas.map((l) => l.estado)).toEqual(['disponible', 'preparada', 'consiguiendo_stock']);
      expect(v).toMatchObject({ lineasSinConfirmar: 1, completa: false });
    });

    it('trae la cancelación en trámite con su origen y la fecha en ISO (R18)', () => {
      const orden = ordenDe('PC-2026-00001', 'revision_disponibilidad');
      orden.cancelacion = { codigo: 'DEV-2026-00012', estado: 'solicitada', iniciadaPor: 'tienda', fecha: new Date('2026-10-31T10:00:00Z') };

      expect(armarVerificacion(orden).cancelacion).toEqual({
        codigo: 'DEV-2026-00012',
        estado: 'solicitada',
        iniciadaPor: 'tienda',
        fecha: '2026-10-31T10:00:00.000Z',
      });
    });
  });

  describe('el motivo de la cancelación por falta de stock (R18)', () => {
    it('nombra cada producto sin stock con su presentación y cantidad, en singular o plural', () => {
      const a = linea(1, { nombreProducto: 'Vinilo Blanco', varianteCopia: 'Galón', cantidad: 2 });
      const b = linea(2, { nombreProducto: 'Brocha', varianteCopia: 'Unidad', cantidad: 1 });

      expect(componerMotivoCancelacion([a, b], undefined)).toBe(
        'Sin existencias de: Vinilo Blanco, Galón (2 unidades); Brocha, Unidad (1 unidad).',
      );
    });

    it('añade la nota del empleado en una línea aparte y la recorta al tope del contrato', () => {
      const a = linea(1, { nombreProducto: 'Vinilo', varianteCopia: 'Galón' });

      expect(componerMotivoCancelacion([a], '  Llegará hasta fin de mes  ')).toBe(
        'Sin existencias de: Vinilo, Galón (1 unidad).\nNota: Llegará hasta fin de mes',
      );
      const larga = componerMotivoCancelacion([a], 'x'.repeat(MAX_NOTA_CANCELACION + 50));
      expect(larga.split('\nNota: ')[1]).toHaveLength(MAX_NOTA_CANCELACION);
    });

    it('una nota en blanco no añade nada', () => {
      const a = linea(1, { nombreProducto: 'Vinilo', varianteCopia: 'Galón' });

      expect(componerMotivoCancelacion([a], '   ')).toBe('Sin existencias de: Vinilo, Galón (1 unidad).');
    });
  });

  describe('la petición de cancelar (R18)', () => {
    it('la nota es opcional, no puede estar en blanco y tiene tope', () => {
      expect(solicitarCancelacionRequestSchema.safeParse({}).success).toBe(true);
      expect(solicitarCancelacionRequestSchema.safeParse({ nota: 'Llega en una semana' }).success).toBe(true);
      expect(solicitarCancelacionRequestSchema.safeParse({ nota: '   ' }).success).toBe(false);
      expect(solicitarCancelacionRequestSchema.safeParse({ nota: 'x'.repeat(MAX_NOTA_CANCELACION + 1) }).success).toBe(false);
    });
  });

  describe('la petición de marcar (R2, R5)', () => {
    const valida = (lineas: unknown) => verificarLineasRequestSchema.safeParse({ lineas }).success;

    it('acepta las cuatro marcas, una o varias líneas', () => {
      expect(valida([{ numeroLinea: 1, estado: 'disponible' }])).toBe(true);
      expect(valida([{ numeroLinea: 1, estado: 'consiguiendo_stock' }, { numeroLinea: 2, estado: 'no_disponible' }])).toBe(true);
      expect(valida([{ numeroLinea: 1, estado: 'preparada' }])).toBe(true);
    });

    it.each([
      ['lista vacía', []],
      ['volver a pendiente a mano', [{ numeroLinea: 1, estado: 'pendiente' }]],
      ['marcar un estado heredado a mano', [{ numeroLinea: 1, estado: 'despachada' }]],
      ['una marca que no existe', [{ numeroLinea: 1, estado: 'parcial' }]],
      ['el booleano anterior', [{ numeroLinea: 1, disponible: true }]],
      ['una línea repetida', [{ numeroLinea: 1, estado: 'disponible' }, { numeroLinea: 1, estado: 'no_disponible' }]],
      ['línea 0', [{ numeroLinea: 0, estado: 'disponible' }]],
      ['línea con decimales', [{ numeroLinea: 1.5, estado: 'disponible' }]],
      ['más de 200 líneas', Array.from({ length: 201 }, (_, i) => ({ numeroLinea: i + 1, estado: 'disponible' }))],
    ])('rechaza %s', (_nombre, lineas) => {
      expect(valida(lineas)).toBe(false);
    });
  });
});
