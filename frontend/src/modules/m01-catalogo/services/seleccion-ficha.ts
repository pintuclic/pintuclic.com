import type { ProductoPublicoFicha, VariantePublica } from '../dtos/m01-catalogo-productos.dto';

/**
 * Presentación con la que abre la ficha (U8): la primera disponible que se puede comprar; si ninguna
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

/** U8: la misma dirección con `?color=` puesto en ese color; conserva el resto de la dirección. */
export function direccionConColor(direccion: string, idColor: number): string {
  const url = new URL(direccion);
  url.searchParams.set('color', String(idColor));
  return `${url.pathname}${url.search}${url.hash}`;
}

/** U8: el `?color=` de la dirección de la ficha, si es un id válido; si no, null (la ficha abre sin color). */
export function colorDeLaDireccion(valor: string | string[] | undefined): number | null {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  if (texto === undefined || !/^\d+$/.test(texto)) return null;
  const id = Number(texto);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
