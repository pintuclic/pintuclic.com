import { describe, expect, it } from 'vitest';
import type { EstadoOrden, ModoEntrega } from '../dtos/m08-ordenes.dto';
import { evaluarTransicion, exigeMotivo, transicionesDisponibles } from '../services/reglas-estado';

type Caso = [EstadoOrden, EstadoOrden, ModoEntrega | null, 'ok' | 'NO_PERMITIDA' | 'NO_HABILITADA'];

const CASOS: Caso[] = [
  ['orden_confirmada', 'revision_disponibilidad', null, 'ok'],
  ['revision_disponibilidad', 'en_preparacion', null, 'ok'],
  ['en_preparacion', 'preparada', null, 'ok'],
  ['preparada', 'en_preparacion', null, 'ok'],
  ['preparada', 'despachado', 'domicilio', 'ok'],
  ['preparada', 'despachado', null, 'ok'],
  ['preparada', 'despachado', 'recogida', 'NO_PERMITIDA'],
  ['preparada', 'entregado', 'recogida', 'ok'],
  ['preparada', 'entregado', null, 'ok'],
  ['preparada', 'entregado', 'domicilio', 'NO_PERMITIDA'],
  ['despachado', 'entregado', 'domicilio', 'ok'],
  ['preparada', 'revision_disponibilidad', null, 'NO_PERMITIDA'],
  ['orden_confirmada', 'preparada', null, 'NO_PERMITIDA'],
  ['en_preparacion', 'orden_confirmada', null, 'NO_PERMITIDA'],
  ['entregado', 'preparada', null, 'NO_PERMITIDA'],
  ['despachado', 'preparada', 'domicilio', 'NO_PERMITIDA'],
  ['preparada', 'cancelado', null, 'NO_HABILITADA'],
  ['orden_confirmada', 'cancelado', null, 'NO_HABILITADA'],
  ['entregado', 'devuelto', 'recogida', 'NO_HABILITADA'],
];

describe('reglas de estado de la orden (HU-ORD-03, §5 de la spec)', () => {
  it.each(CASOS)('%s → %s (modo %s): %s', (desde, hacia, modo, esperado) => {
    const resultado = evaluarTransicion(desde, hacia, modo);

    if (esperado === 'ok') {
      expect(resultado).toEqual({ ok: true });
    } else {
      expect(resultado).toEqual({ ok: false, razon: esperado });
    }
  });

  it('solo volver de preparada a en_preparacion exige motivo (RF-CUM-05-05)', () => {
    expect(exigeMotivo('preparada', 'en_preparacion')).toBe(true);
    expect(exigeMotivo('en_preparacion', 'preparada')).toBe(false);
    expect(exigeMotivo('orden_confirmada', 'revision_disponibilidad')).toBe(false);
  });

  it('lista los destinos habilitados hoy según el modo de entrega', () => {
    expect(transicionesDisponibles('preparada', 'domicilio')).toEqual(['en_preparacion', 'despachado']);
    expect(transicionesDisponibles('preparada', 'recogida')).toEqual(['en_preparacion', 'entregado']);
    expect(transicionesDisponibles('preparada', null)).toEqual(['en_preparacion', 'despachado', 'entregado']);
    expect(transicionesDisponibles('despachado', 'domicilio')).toEqual(['entregado']);
    expect(transicionesDisponibles('entregado', 'recogida')).toEqual([]);
  });
});
