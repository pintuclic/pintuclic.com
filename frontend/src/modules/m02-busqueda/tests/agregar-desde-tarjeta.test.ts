import { describe, expect, it, vi } from 'vitest';
import type { VariantePublica } from '@/modules/m01-catalogo/dtos/m01-catalogo-productos.dto';
import type { ResultadoBusqueda } from '../dtos/busqueda.dto';
import { debeIrALaFicha, presentacionDeTarjeta, textoAgregado } from '../services/agregar-desde-tarjeta';
import { tarjetaDeResultado } from '../services/tarjeta-resultado';

const variante = (id: number, precio: number, cambios: Partial<VariantePublica> = {}): VariantePublica => ({
  idVariante: id,
  idMedida: id,
  medida: `Medida ${id}`,
  tipoMedida: 'galon',
  sku: `SKU-${id}`,
  precio,
  disponibilidad: 'disponible',
  compraBloqueada: false,
  oferta: null,
  rendimiento: null,
  tieneImagenMedida: false,
  ...cambios,
});

const resultado = (cambios: Partial<ResultadoBusqueda> = {}): ResultadoBusqueda => ({
  idProducto: 1,
  nombre: 'Viniltex Ultralavable',
  marca: 'Pintuco',
  linea: 'Viniltex',
  categoria: 'Pinturas',
  subcategoria: 'Vinilos para muros',
  precioDesde: 28900,
  tieneColor: true,
  disponibilidad: 'disponible',
  idImagenPrincipal: 1,
  esCombo: false,
  compraBloqueada: false,
  oferta: null,
  colorMuestra: { idColor: 8, nombre: 'Amarillo Sol', hexadecimal: '#F7C600' },
  totalColores: 19,
  coincidenciaColor: null,
  patrocinado: false,
  idCampania: null,
  ...cambios,
});

describe('Botón del carrito de la tarjeta (M02 · V3, V4)', () => {
  it('agrega la presentación del precio que muestra: la más barata que se puede comprar', () => {
    const lista = [variante(1, 85900), variante(2, 28900), variante(3, 99000, { compraBloqueada: true })];
    expect(presentacionDeTarjeta(lista)?.idVariante).toBe(2);
    expect(presentacionDeTarjeta([variante(4, 10000, { compraBloqueada: true })])).toBeNull();
    expect(presentacionDeTarjeta([])).toBeNull();
  });

  it('"agotado por ahora" no impide agregar: la existencia es solo informativa (M13, V4 de M01)', () => {
    const lista = [variante(1, 34500, { disponibilidad: 'agotado' })];
    expect(presentacionDeTarjeta(lista)?.idVariante).toBe(1);
  });

  it('lleva a la ficha cuando no puede agregar directo', () => {
    expect(debeIrALaFicha(resultado())).toBe(false);
    expect(debeIrALaFicha(resultado({ compraBloqueada: true }))).toBe(true);
    expect(debeIrALaFicha(resultado({ colorMuestra: null }))).toBe(true);
    expect(debeIrALaFicha(resultado({ tieneColor: false, colorMuestra: null }))).toBe(false);
  });

  it('avisa qué agregó, con el color solo si lo lleva', () => {
    expect(textoAgregado(resultado(), { medida: '1/4 de galón' })).toBe(
      'Agregaste Viniltex Ultralavable · Amarillo Sol · 1/4 de galón',
    );
    expect(textoAgregado(resultado({ nombre: 'Brocha', colorMuestra: null }), { medida: '2 pulgadas' })).toBe(
      'Agregaste Brocha · 2 pulgadas',
    );
  });

  it('la tarjeta llama a quien agrega con su resultado; sin él, el carrito sigue siendo un enlace', () => {
    const agregar = vi.fn();
    const t = tarjetaDeResultado(resultado(), agregar);
    t.onAddToCart?.('1');
    expect(agregar).toHaveBeenCalledWith(expect.objectContaining({ idProducto: 1 }));
    expect(t.href).toBe('/productos/1?color=8');
    expect(tarjetaDeResultado(resultado())).not.toHaveProperty('onAddToCart');
  });
});
