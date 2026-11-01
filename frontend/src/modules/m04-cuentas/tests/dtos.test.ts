import { describe, expect, it } from 'vitest';
import {
  cambioContrasenaPrimerAccesoFormSchema,
  completarRegistroGoogleFormSchema,
  dictamenRegistroEmpresaFormSchema,
  dictamenSolicitudEmpresaFormSchema,
  direccionClienteFormSchema,
  vincularGoogleFormSchema,
} from '../dtos/m04-cuentas.dto';

describe('M04 Frontend — DTO de dictamen (RN-CUE-17)', () => {
  describe('ascensos y renovaciones de NIT: el motivo es opcional', () => {
    it('acepta aprobar sin motivo', () => {
      expect(dictamenSolicitudEmpresaFormSchema.safeParse({ decision: 'aprobar' }).success).toBe(true);
    });

    it('acepta rechazar sin motivo (CA-CUE-09-06, CA-CUE-09-08)', () => {
      expect(dictamenSolicitudEmpresaFormSchema.safeParse({ decision: 'rechazar' }).success).toBe(true);
    });

    it('acepta rechazar con un motivo corto: no impone longitud mínima', () => {
      expect(
        dictamenSolicitudEmpresaFormSchema.safeParse({ decision: 'rechazar', motivoRechazo: 'NIT inválido' }).success,
      ).toBe(true);
    });

    it('rechaza un motivo de más de 500 caracteres', () => {
      const res = dictamenSolicitudEmpresaFormSchema.safeParse({
        decision: 'rechazar',
        motivoRechazo: 'x'.repeat(501),
      });
      expect(res.success).toBe(false);
    });

    it('rechaza una decisión que no sea aprobar o rechazar', () => {
      expect(dictamenSolicitudEmpresaFormSchema.safeParse({ decision: 'quizas' }).success).toBe(false);
    });
  });

  describe('rechazo de un REGISTRO de empresa: el motivo es obligatorio', () => {
    it('exige motivo al rechazar', () => {
      const res = dictamenRegistroEmpresaFormSchema.safeParse({ decision: 'rechazar' });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.path).toEqual(['motivoRechazo']);
      }
    });

    it('exige un mínimo de 10 caracteres, contando después de recortar espacios', () => {
      expect(
        dictamenRegistroEmpresaFormSchema.safeParse({ decision: 'rechazar', motivoRechazo: '   corto   ' }).success,
      ).toBe(false);
      expect(
        dictamenRegistroEmpresaFormSchema.safeParse({
          decision: 'rechazar',
          motivoRechazo: 'Documentación incompleta',
        }).success,
      ).toBe(true);
    });

    it('no exige motivo al aprobar', () => {
      expect(dictamenRegistroEmpresaFormSchema.safeParse({ decision: 'aprobar' }).success).toBe(true);
    });
  });
});

describe('M04 Frontend — formulario de primer acceso (HU-CUE-04)', () => {
  const datos = { contrasenaActual: 'Pintu#a1b2c3d4e5f6!', nuevaContrasena: 'ClaveDefinitiva2026!', confirmarNuevaContrasena: 'ClaveDefinitiva2026!' };

  it('acepta una clave nueva distinta de la temporal', () => {
    expect(cambioContrasenaPrimerAccesoFormSchema.safeParse(datos).success).toBe(true);
  });

  it('rechaza reutilizar la clave temporal como definitiva', () => {
    const r = cambioContrasenaPrimerAccesoFormSchema.safeParse({ ...datos, nuevaContrasena: datos.contrasenaActual, confirmarNuevaContrasena: datos.contrasenaActual });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.path.join('.'))).toContain('nuevaContrasena');
  });
});

describe('M04 Frontend — teléfono de la dirección (regla transversal)', () => {
  const base = {
    direccion: 'Calle 12 # 5-37',
    barrio: 'San Pedro',
    nombreApellido: 'Laura Gomez',
    esPredeterminada: true,
  };

  it('acepta un número con formato', () => {
    expect(direccionClienteFormSchema.safeParse({ ...base, telefono: '601-234567' }).success).toBe(true);
  });

  it('rechaza letras o símbolos con un mensaje que dice qué falta', () => {
    const res = direccionClienteFormSchema.safeParse({ ...base, telefono: '300abc4567' });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.issues[0]?.message).toContain('números o caracteres de marcado');
  });
});

describe('M04 Frontend — formularios de Google OAuth (HU-CUE-02)', () => {
  it('exige teléfono, contraseña de 12+ caracteres coincidente y aceptación de términos al completar registro', () => {
    const valido = {
      telefono: '3004567890',
      contrasena: 'ClaveFederada2026!',
      confirmarContrasena: 'ClaveFederada2026!',
      aceptaTerminos: true,
    };
    expect(completarRegistroGoogleFormSchema.safeParse(valido).success).toBe(true);
    expect(
      completarRegistroGoogleFormSchema.safeParse({ ...valido, confirmarContrasena: 'OtraClaveFederada2026!' }).success,
    ).toBe(false);
    expect(completarRegistroGoogleFormSchema.safeParse({ ...valido, aceptaTerminos: false }).success).toBe(false);
  });

  it('exige la contraseña actual para confirmar la vinculación con Google', () => {
    expect(vincularGoogleFormSchema.safeParse({ contrasena: '' }).success).toBe(false);
    expect(vincularGoogleFormSchema.safeParse({ contrasena: 'MiClaveActual123!' }).success).toBe(true);
  });
});
