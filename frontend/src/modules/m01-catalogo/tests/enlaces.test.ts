import { describe, expect, it } from 'vitest';
import { enlaceProductos, filtrosProductosDesdeUrl, leerSeccion } from '../services/enlaces';

describe('M01 · enlaces entre pantallas del panel', () => {
  it('arma el enlace "Ver productos" con los filtros dados', () => {
    expect(enlaceProductos({ marca: 3 })).toBe('/admin/catalogo?seccion=productos&marca=3');
    expect(enlaceProductos({ marca: 3, linea: 7 })).toBe('/admin/catalogo?seccion=productos&marca=3&linea=7');
    expect(enlaceProductos({ subcategoria: 12 })).toBe('/admin/catalogo?seccion=productos&subcategoria=12');
  });

  it('lo que arma el enlace lo entiende la lista de productos', () => {
    const url = new URL(enlaceProductos({ marca: 3, linea: 7 }), 'http://x');
    expect(filtrosProductosDesdeUrl(url.searchParams)).toEqual({ marca: '3', linea: '7', subcategoria: '' });
  });

  it('ignora valores que no son ids y secciones desconocidas', () => {
    expect(filtrosProductosDesdeUrl(new URLSearchParams('marca=abc&linea=-1&subcategoria=0'))).toEqual({
      marca: '',
      linea: '',
      subcategoria: '',
    });
    expect(leerSeccion('colores')).toBe('colores');
    expect(leerSeccion('otra')).toBe('productos');
    expect(leerSeccion(null)).toBe('productos');
  });
});
