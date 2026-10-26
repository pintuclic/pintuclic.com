import { describe, expect, it } from 'vitest';
import {
  actualizarDireccionRequestSchema,
  crearDireccionRequestSchema,
  registroClienteRequestSchema,
} from '../dtos/m04-cuentas.dto';

const direccionBase = {
  direccion: 'Calle 12 # 5-37',
  barrio: 'San Pedro',
  nombreApellido: 'Laura Gomez',
  esPredeterminada: true,
};

describe('Teléfono en M04 (regla transversal)', () => {
  it('la dirección acepta un número con formato y rechaza letras o símbolos', () => {
    expect(crearDireccionRequestSchema.safeParse({ ...direccionBase, telefono: '+57 300 123 4567' }).success).toBe(true);

    const res = crearDireccionRequestSchema.safeParse({ ...direccionBase, telefono: '300abc4567' });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.issues[0]?.message).toContain('números o caracteres de marcado');
  });

  it('editar la dirección valida el teléfono solo si viene', () => {
    expect(actualizarDireccionRequestSchema.safeParse({ barrio: 'Otro' }).success).toBe(true);
    expect(actualizarDireccionRequestSchema.safeParse({ telefono: '3001234567;' }).success).toBe(false);
  });

  it('el registro del cliente usa la misma regla', () => {
    const res = registroClienteRequestSchema.safeParse({
      nombre: 'Laura Gomez',
      correo: 'laura@correo.com',
      telefono: 'no-es-un-telefono',
      contrasena: 'ClaveSegura#2026',
      aceptaTerminos: true,
    });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.issues.some((i) => i.path[0] === 'telefono')).toBe(true);
  });
});
