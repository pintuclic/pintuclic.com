import { describe, expect, it } from 'vitest';
import { estadosVisibles } from '../components/admin/CambiarEstadoPanel';

describe('estadosVisibles · el panel de cambio de estado', () => {
  it('la recogida en almacén no lista «Enviado»: pasa de alistado a entregado', () => {
    const estados = estadosVisibles('preparada', 'recogida');
    expect(estados).not.toContain('despachado');
    expect(estados).toContain('entregado');
  });

  it('el envío a domicilio y las órdenes sin modo conservan «Enviado»', () => {
    expect(estadosVisibles('preparada', 'domicilio')).toContain('despachado');
    expect(estadosVisibles('preparada', null)).toContain('despachado');
  });

  it('una recogida que ya figura como enviada (dato anterior) lo sigue mostrando como estado actual', () => {
    expect(estadosVisibles('despachado', 'recogida')).toContain('despachado');
  });
});
