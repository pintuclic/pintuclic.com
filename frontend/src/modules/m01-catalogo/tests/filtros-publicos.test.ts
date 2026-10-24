import { describe, expect, it } from 'vitest';
import {
  FILTROS_INICIALES,
  filtrosAConsulta,
  filtrosAUrl,
  filtrosDesdeUrl,
  hayFiltros,
  PRODUCTOS_POR_PAGINA,
} from '../services/filtros-publicos';

describe('M01 · filtros de la vitrina en la URL', () => {
  it('lee una URL completa', () => {
    const f = filtrosDesdeUrl(
      new URLSearchParams(
        'q=vinilo&categoria=2&subcategoria=5&marca=3&superficie=7&ambiente=exterior&orden=precio_desc&pagina=3',
      ),
    );
    expect(f).toEqual({
      busqueda: 'vinilo',
      idCategoria: '2',
      idSubcategoria: '5',
      idMarca: '3',
      idSuperficie: '7',
      ambiente: 'exterior',
      ordenar: 'precio_desc',
      pagina: 3,
    });
  });

  it('ignora valores inválidos, incluidos los enlaces del menú con slugs', () => {
    const f = filtrosDesdeUrl(
      new URLSearchParams('categoria=decorativos&marca=-1&ambiente=sotano&orden=azar&pagina=0'),
    );
    expect(f).toEqual(FILTROS_INICIALES);
    expect(filtrosDesdeUrl(new URLSearchParams('pagina=2.5&marca=1e3')).pagina).toBe(1);
  });

  it('ida y vuelta: lo que se escribe se vuelve a leer igual', () => {
    const f = { ...FILTROS_INICIALES, busqueda: 'mate', idMarca: '4', ordenar: 'precio_asc' as const, pagina: 2 };
    expect(filtrosDesdeUrl(filtrosAUrl(f))).toEqual(f);
  });

  it('no escribe lo que está en su valor por defecto', () => {
    expect(filtrosAUrl(FILTROS_INICIALES).toString()).toBe('');
  });

  it('la consulta a la API cumple el esquema del contrato', () => {
    expect(filtrosAConsulta({ ...FILTROS_INICIALES, idMarca: '4', pagina: 2 })).toEqual({
      idMarca: '4',
      ordenar: 'nombre',
      pagina: 2,
      limite: PRODUCTOS_POR_PAGINA,
    });
  });

  it('detecta si hay filtros activos', () => {
    expect(hayFiltros(FILTROS_INICIALES)).toBe(false);
    expect(hayFiltros({ ...FILTROS_INICIALES, ordenar: 'precio_asc', pagina: 4 })).toBe(false);
    expect(hayFiltros({ ...FILTROS_INICIALES, ambiente: 'interior' })).toBe(true);
  });
});
