import { describe, expect, it } from 'vitest';
import {
  DISPONIBILIDAD_POR_ESTADO_LINEA,
  ESTADOS_LINEA,
  ESTADOS_ORDEN,
  type EstadoOrden,
} from '../dtos/m08-ordenes.dto';
import type { MarcaLinea } from '../interfaces/consulta-cliente.interface';
import { disponibilidadParaCliente, estadoDeLinea } from '../services/estado-linea';

const MARCAS: readonly MarcaLinea[] = ['disponible', 'consiguiendo_stock', 'no_disponible', 'preparada'];

describe('estado de una línea (M08 R15, M09 R17)', () => {
  it.each([
    ['revision_disponibilidad', 'pendiente'],
    ['en_preparacion', 'disponible'],
    ['preparada', 'preparada'],
    ['orden_confirmada', 'pendiente'],
  ] as const)('sin marcas, con la orden en %s la línea está %s', (orden, esperado) => {
    expect(estadoDeLinea(orden, null)).toBe(esperado);
  });

  it.each(['revision_disponibilidad', 'en_preparacion', 'preparada'] as const)(
    'con la orden en %s la última marca manda, sea cual sea',
    (orden) => {
      for (const marca of MARCAS) expect(estadoDeLinea(orden, marca)).toBe(marca);
    },
  );

  it('una orden en orden_confirmada nunca tiene marcas, y si las trajera seguiría pendiente', () => {
    expect(estadoDeLinea('orden_confirmada', 'disponible')).toBe('pendiente');
  });

  it.each([
    ['despachado', 'despachada'],
    ['entregado', 'entregada'],
    ['cancelado', 'cancelada'],
    ['devuelto', 'devuelta'],
  ] as const)('desde %s la línea hereda %s aunque tenga marcas', (orden, esperado) => {
    expect(estadoDeLinea(orden, null)).toBe(esperado);
    for (const marca of MARCAS) expect(estadoDeLinea(orden, marca)).toBe(esperado);
  });

  it('toda combinación de orden y marca da un estado del contrato', () => {
    for (const orden of ESTADOS_ORDEN as readonly EstadoOrden[]) {
      for (const marca of [null, ...MARCAS]) expect(ESTADOS_LINEA).toContain(estadoDeLinea(orden, marca));
    }
  });
});

describe('lo que ve el cliente de cada línea (M08 R16)', () => {
  it.each([
    ['pendiente', 'verificando_disponibilidad'],
    ['consiguiendo_stock', 'verificando_disponibilidad'],
    ['disponible', 'confirmado'],
    ['preparada', 'confirmado'],
    ['despachada', 'confirmado'],
    ['entregada', 'confirmado'],
    ['no_disponible', 'rechazado'],
    ['cancelada', null],
    ['devuelta', null],
  ] as const)('%s se muestra como %s', (estado, esperado) => {
    expect(disponibilidadParaCliente(estado)).toBe(esperado);
  });

  it('el mapa cubre todos los estados de línea del contrato, ni uno más', () => {
    expect(Object.keys(DISPONIBILIDAD_POR_ESTADO_LINEA).sort()).toEqual([...ESTADOS_LINEA].sort());
  });

  it('de punta a punta: un producto sin stock en revisión se ve rechazado y, ya cancelado el pedido, deja de mostrarse', () => {
    expect(disponibilidadParaCliente(estadoDeLinea('revision_disponibilidad', 'no_disponible'))).toBe('rechazado');
    expect(disponibilidadParaCliente(estadoDeLinea('cancelado', 'no_disponible'))).toBeNull();
  });
});
