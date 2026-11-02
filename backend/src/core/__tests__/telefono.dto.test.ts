import { describe, expect, it } from 'vitest';
import { telefonoSchema } from '../dtos/telefono.dto';

describe('telefonoSchema (regla transversal)', () => {
  it.each(['3001234567', '601-234567', '(1) 234567', '  3001234567  '])('acepta %j', (valor) => {
    expect(telefonoSchema.safeParse(valor).success).toBe(true);
  });

  it('recorta los espacios de los extremos', () => {
    expect(telefonoSchema.parse('  3001234567  ')).toBe('3001234567');
  });

  it.each(['300abc4567', '300.123.45', '300123456;', '<b>123456', '300-12 ext'])(
    'rechaza %j por llevar caracteres que no son de marcado',
    (valor) => {
      const res = telefonoSchema.safeParse(valor);
      expect(res.success).toBe(false);
      if (!res.success) expect(res.error.issues[0]?.message).toContain('números o caracteres de marcado');
    },
  );

  it('exige entre 7 y 10 caracteres', () => {
    expect(telefonoSchema.safeParse('123456').success).toBe(false);
    expect(telefonoSchema.safeParse('1234567').success).toBe(true);
    expect(telefonoSchema.safeParse('1'.repeat(10)).success).toBe(true);
    expect(telefonoSchema.safeParse('1'.repeat(11)).success).toBe(false);
  });

  it.each(['300 123 4567', '+57 300 123 4567', '(601) 234-5678'])(
    'rechaza %j: el límite cuenta también espacios y signos',
    (valor) => {
      const res = telefonoSchema.safeParse(valor);
      expect(res.success).toBe(false);
      if (!res.success) expect(res.error.issues[0]?.message).toBe('El teléfono no puede exceder 10 caracteres');
    },
  );
});
