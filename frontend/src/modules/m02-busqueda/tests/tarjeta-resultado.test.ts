import { describe, expect, it } from 'vitest';
import type { ResultadoBusqueda } from '../dtos/busqueda.dto';
import { enlaceDeResultado, tarjetaDeResultado, textoDelColor } from '../services/tarjeta-resultado';

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
  colorMuestra: { idColor: 13, nombre: 'Azul Cielo', hexadecimal: '#9CC9E8' },
  totalColores: 46,
  coincidenciaColor: null,
  patrocinado: false,
  idCampania: null,
  ...cambios,
});

describe('Tarjeta del producto en un color (V2, V3)', () => {
  it('lleva a la ficha abierta en el color de la tarjeta; sin color, a la ficha sola', () => {
    expect(enlaceDeResultado(resultado())).toBe('/productos/1?color=13');
    expect(enlaceDeResultado(resultado({ colorMuestra: null }))).toBe('/productos/1');
  });

  it('nombra el color y cuántos más hay', () => {
    expect(textoDelColor(resultado())).toBe('Azul Cielo · y 45 colores más');
    expect(textoDelColor(resultado({ totalColores: 2 }))).toBe('Azul Cielo · y 1 color más');
    expect(textoDelColor(resultado({ totalColores: 1 }))).toBe('Azul Cielo');
    expect(textoDelColor(resultado({ colorMuestra: null, totalColores: 0 }))).toBeUndefined();
  });

  it('arma la tarjeta sin "Ver producto", con la muestra y el enlace al color', () => {
    const t = tarjetaDeResultado(resultado());
    expect(t).toMatchObject({
      name: 'Viniltex Ultralavable',
      href: '/productos/1?color=13',
      showViewDetails: false,
      swatchColor: '#9CC9E8',
      swatchLabel: 'Azul Cielo · y 45 colores más',
      price: 28900,
    });
    expect(t).not.toHaveProperty('onAddToCart');
  });

  it('una herramienta sin color no lleva muestra ni texto de color', () => {
    const t = tarjetaDeResultado(resultado({ colorMuestra: null, totalColores: 0, tieneColor: false }));
    expect(t).not.toHaveProperty('swatchColor');
    expect(t).not.toHaveProperty('swatchLabel');
    expect(t.href).toBe('/productos/1');
  });
});
