import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { explicarFalloDeCarga } from '../services/carga-productos-api';

const conRespuesta = (status: number, data: unknown = {}): AxiosError =>
  new AxiosError('fallo', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    statusText: '',
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

describe('explicarFalloDeCarga', () => {
  const accion = 'No se pudo revisar el archivo';

  it('sin respuesta: no hay conexión; con tiempo agotado: tardó demasiado', () => {
    expect(explicarFalloDeCarga(new AxiosError('red', 'ERR_NETWORK'), accion)).toContain('no hay conexión con el servidor');
    expect(explicarFalloDeCarga(new AxiosError('t', 'ECONNABORTED'), accion)).toContain('tardó demasiado');
  });

  it('si el servidor explicó el motivo, lo muestra tal cual', () => {
    const cuerpo = { success: false, error: { code: 'PARAMETRO_INVALIDO', message: 'El cuerpo no tiene filas.', details: null } };
    expect(explicarFalloDeCarga(conRespuesta(400, cuerpo), accion)).toBe(`${accion}: El cuerpo no tiene filas.`);
  });

  it('sin explicación, deduce el motivo del código HTTP', () => {
    expect(explicarFalloDeCarga(conRespuesta(401), accion)).toContain('sesión venció');
    expect(explicarFalloDeCarga(conRespuesta(404), accion)).toContain('no tiene permiso');
    expect(explicarFalloDeCarga(conRespuesta(413), accion)).toContain('demasiado grande');
    expect(explicarFalloDeCarga(conRespuesta(429), accion)).toContain('demasiadas solicitudes');
    expect(explicarFalloDeCarga(conRespuesta(500), accion)).toContain('error interno (código 500)');
    expect(explicarFalloDeCarga(conRespuesta(418), accion)).toContain('rechazó la solicitud (código 418)');
  });

  it('un error que no viene de la red conserva su texto', () => {
    expect(explicarFalloDeCarga(new Error('algo raro'), accion)).toBe(`${accion}: ocurrió un error inesperado (algo raro).`);
  });
});
