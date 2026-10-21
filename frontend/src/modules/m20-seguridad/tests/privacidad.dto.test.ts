import { describe, expect, it } from 'vitest';
import {
  crearSolicitudSupresionSchema,
  otorgarConsentimientoSchema,
} from '../dtos/privacidad.dto';

/** HU-SEG-05 — Validación previa al envío. */

describe('HU-SEG-05 · DTOs de privacidad', () => {
  it('CA-SEG-05-01: no se puede consentir sin aceptar', () => {
    const r = otorgarConsentimientoSchema.safeParse({ idAvisoPrivacidad: 2, aceptado: false });
    expect(r.success).toBe(false);
  });

  it('acepta un consentimiento bien formado', () => {
    expect(
      otorgarConsentimientoSchema.safeParse({ idAvisoPrivacidad: 2, aceptado: true }).success,
    ).toBe(true);
  });

  it('rechaza un identificador de aviso no positivo', () => {
    expect(
      otorgarConsentimientoSchema.safeParse({ idAvisoPrivacidad: 0, aceptado: true }).success,
    ).toBe(false);
  });

  it('RF-SEG-05-06: el motivo de la supresión es opcional', () => {
    expect(crearSolicitudSupresionSchema.safeParse({}).success).toBe(true);
    expect(crearSolicitudSupresionSchema.safeParse({ motivo: 'Ya no compro' }).success).toBe(true);
    expect(
      crearSolicitudSupresionSchema.safeParse({ motivo: 'x'.repeat(501) }).success,
    ).toBe(false);
  });
});
