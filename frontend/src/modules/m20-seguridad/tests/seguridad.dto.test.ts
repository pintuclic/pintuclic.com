import { describe, expect, it } from 'vitest';
import {
  contrasenaSchema,
  correoSchema,
  establecerContrasenaSchema,
} from '@/core/dtos/seguridad.dto';

/** HU-SEG-01 — Paridad con el contrato del servidor. */

describe('HU-SEG-01 · DTOs transversales de seguridad', () => {
  it('exige el mismo mínimo de longitud que el servidor', () => {
    expect(contrasenaSchema.safeParse('corta123').success).toBe(false);
    expect(contrasenaSchema.safeParse('ContrasenaSegura123').success).toBe(true);
  });

  it('BVA: 11 caracteres se rechazan, 12 se aceptan', () => {
    expect(contrasenaSchema.safeParse('a'.repeat(11)).success).toBe(false);
    expect(contrasenaSchema.safeParse('a'.repeat(12)).success).toBe(true);
    expect(contrasenaSchema.safeParse('a'.repeat(129)).success).toBe(false);
  });

  it('normaliza el correo a minúsculas (HU-CUE-08, unicidad)', () => {
    const r = correoSchema.safeParse('Cliente@PintuClic.COM');
    expect(r.success).toBe(true);
    expect(r.success && r.data).toBe('cliente@pintuclic.com');
  });

  it('RN-SEG-02: la confirmación debe coincidir', () => {
    expect(
      establecerContrasenaSchema.safeParse({
        contrasena: 'ContrasenaSegura123',
        confirmacion: 'OtraDistinta123456',
      }).success,
    ).toBe(false);

    expect(
      establecerContrasenaSchema.safeParse({
        contrasena: 'ContrasenaSegura123',
        confirmacion: 'ContrasenaSegura123',
      }).success,
    ).toBe(true);
  });
});
