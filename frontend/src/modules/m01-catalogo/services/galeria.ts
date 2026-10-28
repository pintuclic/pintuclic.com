import type { ImagenPublica } from '../dtos/m01-catalogo-productos.dto';

/**
 * Entrega 3 (I6, CA-CAT-07-03): al elegir un color o una presentación en la ficha se muestra la imagen
 * que se asoció a esa elección. Gana el color; si no hay, la de la presentación; si tampoco, no se
 * cambia nada (null) y la galería sigue donde estaba.
 */
export function imagenParaSeleccion(
  imagenes: readonly ImagenPublica[],
  seleccion: { idColor: number | null; idVariante: number | null },
): number | null {
  if (seleccion.idColor !== null) {
    const delColor = imagenes.find((i) => i.idColor === seleccion.idColor);
    if (delColor !== undefined) return delColor.idImagen;
  }
  if (seleccion.idVariante !== null) {
    const delaVariante = imagenes.find((i) => i.idVariante === seleccion.idVariante);
    if (delaVariante !== undefined) return delaVariante.idImagen;
  }
  return null;
}
