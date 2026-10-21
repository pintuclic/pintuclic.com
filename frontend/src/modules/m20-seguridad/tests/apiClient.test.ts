import { describe, expect, it } from 'vitest';
import { apiClient, esRespuestaError } from '@/core/api/apiClient';

/** ADR-005 / RNF-SEG-02-01 — El cliente HTTP no toca el identificador de sesión. */

describe('ADR-005 · Cliente HTTP', () => {
  it('envía credenciales para que el navegador adjunte la cookie HttpOnly', () => {
    expect(apiClient.defaults.withCredentials).toBe(true);
  });

  it('RNF-SEG-02-01: no declara ninguna cabecera de autorización', () => {
    const cabeceras = JSON.stringify(apiClient.defaults.headers);
    expect(cabeceras.toLowerCase()).not.toMatch(/authorization|bearer/);
  });

  it('reconoce el envelope de error canónico', () => {
    expect(
      esRespuestaError({
        success: false,
        error: { code: 'ERROR_INTERNO', message: 'x', details: null },
      }),
    ).toBe(true);
    expect(esRespuestaError({ success: true, data: {} })).toBe(false);
    expect(esRespuestaError(null)).toBe(false);
    expect(esRespuestaError('texto')).toBe(false);
  });
});
