import type { VariantePublica } from '@/modules/m01-catalogo/dtos/m01-catalogo-productos.dto';
import type { ResultadoBusqueda } from '../dtos/busqueda.dto';

/**
 * V3: la presentación que agrega el botón del carrito de la tarjeta, la del precio que muestra ("desde"): la más barata
 * entre las que se pueden comprar. "Agotado por ahora" NO impide comprar: la existencia es solo informativa (M13, V4 de
 * M01); solo un combo agotado se bloquea (`compraBloqueada`, K5). Si ninguna se puede comprar, null (V4: va a la ficha).
 */
export function presentacionDeTarjeta(variantes: readonly VariantePublica[]): VariantePublica | null {
  const vendibles = variantes.filter((v) => !v.compraBloqueada);
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
