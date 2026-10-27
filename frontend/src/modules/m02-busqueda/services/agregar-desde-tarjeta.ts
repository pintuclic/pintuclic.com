import type { VariantePublica } from '@/modules/m01-catalogo/dtos/m01-catalogo-productos.dto';
import type { ResultadoBusqueda } from '../dtos/busqueda.dto';

/**
 * V3: la presentación que agrega el botón del carrito de la tarjeta, la del precio que muestra ("desde"): la más barata
 * entre las que se pueden comprar y están disponibles. Si ninguna, null (el botón lleva a la ficha, V4).
 */
export function presentacionDeTarjeta(variantes: readonly VariantePublica[]): VariantePublica | null {
  const vendibles = variantes.filter((v) => !v.compraBloqueada && v.disponibilidad === 'disponible');
  return vendibles.reduce<VariantePublica | null>(
    (mejor, v) => (mejor === null || v.precio < mejor.precio ? v : mejor),
    null,
  );
}

/**
 * V4: si la tarjeta NO puede agregar directo y debe llevar a la ficha (combo agotado, o un producto que lleva color sin
 * color de muestra). La falta de presentación vendible solo se sabe al leer la ficha.
 */
export function debeIrALaFicha(p: Pick<ResultadoBusqueda, 'compraBloqueada' | 'tieneColor' | 'colorMuestra'>): boolean {
  return p.compraBloqueada || (p.tieneColor && p.colorMuestra === null);
}

/** L2: "Agregaste Viniltex Ultralavable · Amarillo Sol · 1/4 de galón". */
export function textoAgregado(
  p: Pick<ResultadoBusqueda, 'nombre' | 'colorMuestra'>,
  variante: Pick<VariantePublica, 'medida'>,
): string {
  return ['Agregaste ' + p.nombre, p.colorMuestra?.nombre, variante.medida].filter(Boolean).join(' · ');
}
