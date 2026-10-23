import { describe, expect, it } from 'vitest';
import {
  dictamenRegistroEmpresaFormSchema,
  dictamenSolicitudEmpresaFormSchema,
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
