import { describe, expect, it } from 'vitest';
import { formAjusteSchema } from '../dtos/formularios.dto';
import { aCuerpoAjuste } from '../services/formularios';

describe('M13 · formulario de ajuste', () => {
  const ok = { existencia: '12', motivo: 'conteo_fisico', nota: '' } as const;

  it('arma el cuerpo con la existencia esperada y sin nota vacía (R4)', () => {
    expect(aCuerpoAjuste(ok, 10)).toEqual({
      ok: true,
      valor: { existencia: 12, existenciaEsperada: 10, motivo: 'conteo_fisico' },
    });
    expect(aCuerpoAjuste({ ...ok, nota: '  Llegó pedido ' }, 10)).toMatchObject({
      ok: true,
      valor: { nota: 'Llegó pedido' },
    });
  });

  it.each([
    ['vacía', ''],
    ['decimal', '1.5'],
    ['negativa', '-1'],
    ['con letras', '12a'],
    ['mayor al máximo', '2147483648'],
  ])('rechaza una existencia %s con un mensaje claro', (_n, existencia) => {
    const r = formAjusteSchema.safeParse({ ...ok, existencia });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toMatch(/existencia|número|grande/i);
  });

  it('acepta el máximo y el cero', () => {
    expect(formAjusteSchema.safeParse({ ...ok, existencia: '2147483647' }).success).toBe(true);
    expect(formAjusteSchema.safeParse({ ...ok, existencia: '0' }).success).toBe(true);
  });

  it('no permite el motivo de la carga masiva a mano', () => {
    expect(formAjusteSchema.safeParse({ ...ok, motivo: 'carga_masiva' }).success).toBe(false);
  });
});
