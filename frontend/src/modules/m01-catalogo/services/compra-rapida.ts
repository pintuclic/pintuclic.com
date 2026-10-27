import type { ProductoPublicoFicha, VariantePublica } from '../dtos/m01-catalogo-productos.dto';

/**
 * Presentación con la que abre la compra rápida (U8): la primera disponible que se puede comprar; si ninguna
 * está disponible, la primera que no esté bloqueada; y si todas lo están, la primera.
 */
export function presentacionInicial(variantes: readonly VariantePublica[]): VariantePublica | null {
  return (
    variantes.find((v) => !v.compraBloqueada && v.disponibilidad === 'disponible') ??
    variantes.find((v) => !v.compraBloqueada) ??
    variantes[0] ??
    null
  );
}

/** El producto se vende con color: hay que elegirlo antes de agregar (P4: entonable o de colores fijos). */
export function requiereColor(ficha: Pick<ProductoPublicoFicha, 'claseColor'>): boolean {
  return ficha.claseColor !== 'sin_color';
}

/** "Viniltex · Pintuco · Línea" → el texto bajo el título de la ventana. */
export function subtituloProducto(ficha: Pick<ProductoPublicoFicha, 'marca' | 'linea'>): string {
  return ficha.linea === null ? ficha.marca : `${ficha.marca} · ${ficha.linea}`;
}
