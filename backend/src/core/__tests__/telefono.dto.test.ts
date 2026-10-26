import { describe, expect, it } from 'vitest';
import { telefonoSchema } from '../dtos/telefono.dto';

describe('telefonoSchema (regla transversal)', () => {
  it.each(['3001234567', '300 123 4567', '+57 300 123 4567', '(601) 234-5678', '  3001234567  '])(
    'acepta %j',
    (valor) => {
      expect(telefonoSchema.safeParse(valor).success).toBe(true);
    },
  );

  it('recorta los espacios de los extremos', () => {
    expect(telefonoSchema.parse('  3001234567  ')).toBe('3001234567');
  });

  it.each(['300abc4567', '300.123.4567', '3001234567;', '<script>1234567', '300-123-4567 ext 5'])(
    'rechaza %j por llevar caracteres que no son de marcado',
    (valor) => {
      const res = telefonoSchema.safeParse(valor);
      expect(res.success).toBe(false);
      if (!res.success) expect(res.error.issues[0]?.message).toContain('números o caracteres de marcado');
    },
  );

  it('exige entre 7 y 20 caracteres', () => {
    expect(telefonoSchema.safeParse('123456').success).toBe(false);
    expect(telefonoSchema.safeParse('1234567').success).toBe(true);
    expect(telefonoSchema.safeParse('1'.repeat(20)).success).toBe(true);
    expect(telefonoSchema.safeParse('1'.repeat(21)).success).toBe(false);
  });
});
