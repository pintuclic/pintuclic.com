import { describe, expect, it } from 'vitest';
import { codigoDeError, mensajeDeError } from '@/core/utils/errorApi';

/** HU-SEG-06 — El navegador nunca pinta detalle interno. */

describe('HU-SEG-06 · Traducción de errores de la API', () => {
  it('traduce un envelope conocido a su mensaje de usuario', () => {
    const error = {
      response: {
        data: {
          success: false,
          error: { code: 'SESION_EXPIRADA', message: 'La sesión ha expirado.', details: null },
        },
      },
    };
    expect(mensajeDeError(error)).toMatch(/sesión ha expirado/i);
    expect(codigoDeError(error)).toBe('SESION_EXPIRADA');
  });

  it('CA-SEG-06-02: una excepción cruda NO filtra su mensaje interno', () => {
    const crudo = new Error(
      'connect ECONNREFUSED 10.0.0.5:5432 at /home/app/src/db/client.ts:42',
    );
    const mensaje = mensajeDeError(crudo);

    expect(mensaje).not.toMatch(/ECONNREFUSED|10\.0\.0\.5|\/home\/|client\.ts/);
    expect(mensaje).toBe('No fue posible completar la operación. Inténtalo de nuevo.');
  });

  it('un código desconocido cae al genérico en lugar de mostrarse tal cual', () => {
    const error = {
      response: {
        data: { success: false, error: { code: 'PG_DUPLICATE_KEY_23505', message: 'dup', details: null } },
      },
    };
    expect(mensajeDeError(error)).not.toMatch(/PG_DUPLICATE|23505/);
    expect(codigoDeError(error)).toBeNull();
  });

  it('tolera null, undefined y formas inesperadas sin romperse', () => {
    expect(mensajeDeError(null)).toBeTruthy();
    expect(mensajeDeError(undefined)).toBeTruthy();
    expect(mensajeDeError('texto suelto')).toBeTruthy();
    expect(codigoDeError({ response: { data: 'no es un envelope' } })).toBeNull();
  });
});
