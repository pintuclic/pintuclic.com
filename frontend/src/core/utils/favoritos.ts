/** Dónde guarda el navegador los favoritos (solo en este dispositivo; no hay cuenta de por medio). */
export const CLAVE_FAVORITOS = 'pc:favoritos';

/** Cuántos productos caben en la lista: una página completa del listado (M02 · `ids`). */
export const MAXIMO_FAVORITOS = 48;

/** Lo guardado en el navegador → lista de identificadores de producto. Lo que no sea un entero positivo se descarta. */
export function leerFavoritos(crudo: string | null): number[] {
  if (crudo === null) return [];
  try {
    const valor: unknown = JSON.parse(crudo);
    if (!Array.isArray(valor)) return [];
    const ids: number[] = [];
    for (const v of valor) {
      if (typeof v === 'number' && Number.isInteger(v) && v > 0 && !ids.includes(v)) ids.push(v);
    }
    return ids.slice(0, MAXIMO_FAVORITOS);
  } catch {
    return [];
  }
}

/** Quita el producto si ya era favorito; si no, lo pone primero (si la lista está llena, sale el más viejo). */
export function alternarFavorito(ids: ReadonlyArray<number>, idProducto: number): number[] {
  if (ids.includes(idProducto)) return ids.filter((id) => id !== idProducto);
  return [idProducto, ...ids].slice(0, MAXIMO_FAVORITOS);
}
