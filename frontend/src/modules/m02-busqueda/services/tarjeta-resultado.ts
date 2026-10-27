import type { ProductCardProps } from '@/core/components';
import { precioVisible } from '@/modules/m01-catalogo/services/ofertas-visuales';
import type { ResultadoBusqueda } from '../dtos/busqueda.dto';
import { busquedaApi } from './busqueda-api';

/** V3: la ficha abierta en el color de la tarjeta (U8 de M01); sin color, la ficha sola. */
export function enlaceDeResultado(p: Pick<ResultadoBusqueda, 'idProducto' | 'colorMuestra'>): string {
  return p.colorMuestra === null
    ? `/productos/${p.idProducto}`
    : `/productos/${p.idProducto}?color=${p.colorMuestra.idColor}`;
}

/** V2: "Azul Cielo · y 45 colores más"; con un solo color, solo su nombre. */
export function textoDelColor(p: Pick<ResultadoBusqueda, 'colorMuestra' | 'totalColores'>): string | undefined {
  if (p.colorMuestra === null) return undefined;
  const otros = p.totalColores - 1;
  if (otros <= 0) return p.colorMuestra.nombre;
  return `${p.colorMuestra.nombre} · y ${otros} ${otros === 1 ? 'color más' : 'colores más'}`;
}

/**
 * La tarjeta de un resultado: el producto en su color de muestra, sin "Ver producto" y con el carrito junto al precio,
 * todo llevando a la ficha en ese color (V2, V3). La usan /productos y el inicio (V5), para que se vean iguales.
 */
export function tarjetaDeResultado(p: ResultadoBusqueda): ProductCardProps {
  const color = textoDelColor(p);
  return {
    id: String(p.idProducto),
    name: p.nombre,
    brand: p.marca,
    description: `${p.esCombo ? 'Combo · ' : ''}${p.subcategoria}${p.precioDesde === null ? '' : ' · Precio desde'}${
      p.disponibilidad === 'agotado' ? ' · Agotado por ahora' : ''
    }`,
    ...precioVisible(p.precioDesde, p.oferta),
    isSponsored: p.patrocinado,
    href: enlaceDeResultado(p),
    showViewDetails: false,
    ...(p.idImagenPrincipal === null ? {} : { imageUrl: busquedaApi.urlImagen(p.idImagenPrincipal, 'miniatura') }),
    ...(p.colorMuestra === null ? {} : { swatchColor: p.colorMuestra.hexadecimal }),
    ...(color === undefined ? {} : { swatchLabel: color }),
  };
}
