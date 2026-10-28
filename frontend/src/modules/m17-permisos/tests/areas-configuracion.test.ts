import { describe, expect, it } from 'vitest';
import type { ClaveParametro } from '../dtos/configuracion.dto';
import type { AreaParametro, ParametroConfiguracion } from '../interfaces/configuracion.interface';
import { ETIQUETAS_AREA, contarPorArea, filtrarPorArea } from '../services/areas-configuracion';

const parametro = (clave: ClaveParametro, area: AreaParametro): ParametroConfiguracion => ({
  clave,
  area,
  tipoDato: 'numero',
  valor: 1,
  descripcion: clave,
  valorPorDefecto: 1,
  rangoMinimo: 0,
  fechaActualizacion: '2026-10-26T00:00:00.000Z',
});

const lista = [
  parametro('auth.intentos_codigo_registro', 'autenticacion'),
  parametro('auth.duracion_bloqueo_minutos', 'autenticacion'),
  parametro('comms.reintentos_envio_transaccional', 'comunicaciones'),
  parametro('comercial.iva_porcentaje', 'comercial'),
  parametro('comercial.costo_envio_base', 'comercial'),
];

describe('M17 · filtros por área de la configuración', () => {
  it('cuenta lo que llegó del servidor, no un número fijo', () => {
    expect(contarPorArea(lista)).toEqual({ todas: 5, autenticacion: 2, comunicaciones: 1, comercial: 2 });
    expect(contarPorArea([])).toEqual({ todas: 0, autenticacion: 0, comunicaciones: 0, comercial: 0 });
  });

  it('filtra por área y "todas" las devuelve todas', () => {
    expect(filtrarPorArea(lista, 'comercial').map((p) => p.clave)).toEqual(['comercial.iva_porcentaje', 'comercial.costo_envio_base']);
    expect(filtrarPorArea(lista, 'todas')).toHaveLength(5);
  });

  it('muestra las áreas con su nombre en español', () => {
    expect(ETIQUETAS_AREA.autenticacion).toBe('Autenticación');
  });
});
