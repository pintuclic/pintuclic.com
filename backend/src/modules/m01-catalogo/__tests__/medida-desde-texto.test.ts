import { describe, expect, it } from 'vitest';
import { deducirMedida } from '../services/medida-desde-texto';

const TIPOS = [
  { id: 1, nombre: 'Galón', abreviatura: 'gal' },
  { id: 2, nombre: 'Litro', abreviatura: 'L' },
  { id: 3, nombre: 'Mililitro', abreviatura: 'ml' },
  { id: 6, nombre: 'Unidad', abreviatura: 'und' },
];

const ok = (texto: string) => {
  const r = deducirMedida(texto, TIPOS);
  return r.ok ? r.valor : r.motivo;
};

describe('deducirMedida', () => {
  it('reconoce cantidad + unidad con nombre, plural o abreviatura, sin importar tildes ni mayúsculas', () => {
    expect(ok('1 galón')).toEqual({ idTipoMedida: 1, valor: 1 });
    expect(ok('5 GALONES')).toEqual({ idTipoMedida: 1, valor: 5 });
    expect(ok('300 ml')).toEqual({ idTipoMedida: 3, valor: 300 });
    expect(ok('2L')).toEqual({ idTipoMedida: 2, valor: 2 });
    expect(ok('3 unidades')).toEqual({ idTipoMedida: 6, valor: 3 });
  });

  it('fracciones, mixtos y decimales con coma o punto', () => {
    expect(ok('1/4 de galón')).toEqual({ idTipoMedida: 1, valor: 0.25 });
    expect(ok('1 1/2 galones')).toEqual({ idTipoMedida: 1, valor: 1.5 });
    expect(ok('0,5 litros')).toEqual({ idTipoMedida: 2, valor: 0.5 });
    expect(ok('3.785 L')).toEqual({ idTipoMedida: 2, valor: 3.785 });
  });

  it('rechaza lo que no se puede deducir, con el motivo', () => {
    expect(ok('Cuarto')).toContain('cantidad + unidad');
    expect(ok('2 metros')).toContain('ningún tipo de medida activo');
    expect(ok('1/3 galón')).toContain('3 decimales');
    expect(ok('1/0 galón')).toContain('número válido');
    expect(ok('0 galón')).toContain('mayor que 0');
    expect(ok('99999999 L')).toContain('no pasar de');
  });
});
