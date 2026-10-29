/*
 * El contraste y la luminancia viven en el core (`core/utils/color-muestra`), porque los usa más
 * de un módulo. Se vuelven a exportar aquí para que el resto de M01 siga importándolos desde su
 * servicio sin cambiar nada; la prueba de M01 comprueba que el comportamiento es el mismo.
 */
export { colorDeTexto, luminancia as luminanciaRelativa, razonDeContraste } from '@/core/utils/color-muestra';

/** «muy parecido», «parecido» o «aproximado» según el ΔE (P8). */
export function parecidoEnPalabras(deltaE: number, muyParecido: number, parecido: number): string {
  if (deltaE <= muyParecido) return 'muy parecido';
  if (deltaE <= parecido) return 'parecido';
  return 'aproximado';
}
