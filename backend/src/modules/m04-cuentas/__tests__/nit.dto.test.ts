import { describe, expect, it } from 'vitest';
import {
  nitSchema,
  normalizarNit,
  registroEmpresaRequestSchema,
  solicitarAscensoEmpresaRequestSchema,
  solicitarRenovacionNitRequestSchema,
} from '../dtos/m04-cuentas.dto';

/**
 * RN-CUE-14 / HU-CUE-08: la unicidad del NIT se evadía escribiéndolo con otro
 * formato ("900.555.666-1" pasaba como distinto de "900555666-1"). El contrato
 * normaliza el NIT en todas las entradas antes de que el servicio lo compare.
 */
describe('normalizarNit', () => {
  it('quita puntos y espacios y conserva el guion del dígito de verificación', () => {
    expect(normalizarNit('900.555.666-1')).toBe('900555666-1');
    expect(normalizarNit(' 900 555 666-1 ')).toBe('900555666-1');
    expect(normalizarNit('900555666-1')).toBe('900555666-1');
  });

  it('no infiere el dígito de verificación: sin guion queda tal cual', () => {
    expect(normalizarNit('9005556661')).toBe('9005556661');
  });
});

/** Decisión del PO (2026-10-23): todo NIT lleva guion antes del dígito de verificación. */
describe('formato de NIT con guion obligatorio', () => {
  it.each(['9005556661', '900555666', '900555666-', '900555666-12', '-1', 'ABC555666-1'])(
    'rechaza "%s"',
    (nit) => {
      expect(nitSchema.safeParse(nit).success).toBe(false);
    },
  );

  it.each(['900555666-1', '900.555.666-1', ' 12345-6 '])('acepta "%s"', (nit) => {
    expect(nitSchema.safeParse(nit).success).toBe(true);
  });
});

describe('esquemas con NIT normalizado', () => {
  const empresa = {
    nombreEmpresa: 'Pinturas del Valle',
    nombreRepresentante: 'Ana Prueba',
    correoEmpresarial: 'ana@correo.co',
    telefono: '3001231234',
  };

  it('registro de empresa', () => {
    const r = registroEmpresaRequestSchema.parse({ ...empresa, nit: '900.555.666-1', contrasena: 'ClaveSegura2026!' });
    expect(r.nit).toBe('900555666-1');
  });

  it('ascenso de cuenta personal', () => {
    const r = solicitarAscensoEmpresaRequestSchema.parse({ ...empresa, nit: '900 555 666-1' });
    expect(r.nit).toBe('900555666-1');
  });

  it('renovación de NIT', () => {
    const r = solicitarRenovacionNitRequestSchema.parse({
      nitNuevo: '901.234.567-9',
      nombreOriginal: 'rut.pdf',
      tipoMime: 'application/pdf',
      tamanoBytes: 10,
      sha256: 'a'.repeat(64),
      contenidoBase64: 'QQ==',
    });
    expect(r.nitNuevo).toBe('901234567-9');
  });

  it('la longitud mínima se valida sobre el NIT ya normalizado', () => {
    expect(registroEmpresaRequestSchema.safeParse({ ...empresa, nit: '1.2.3', contrasena: 'ClaveSegura2026!' }).success).toBe(false);
  });

  it('las tres entradas rechazan un NIT sin guion', () => {
    expect(registroEmpresaRequestSchema.safeParse({ ...empresa, nit: '9005556661', contrasena: 'ClaveSegura2026!' }).success).toBe(false);
    expect(solicitarAscensoEmpresaRequestSchema.safeParse({ ...empresa, nit: '9005556661' }).success).toBe(false);
    expect(
      solicitarRenovacionNitRequestSchema.safeParse({
        nitNuevo: '9012345679',
        nombreOriginal: 'rut.pdf',
        tipoMime: 'application/pdf',
        tamanoBytes: 10,
        sha256: 'a'.repeat(64),
        contenidoBase64: 'QQ==',
      }).success,
    ).toBe(false);
  });
});
