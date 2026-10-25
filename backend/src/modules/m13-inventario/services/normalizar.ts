/**
 * R5: las comparaciones de la carga ignoran mayúsculas, tildes y espacios sobrantes.
 * También se ignora el apóstrofo con que la plantilla neutraliza las fórmulas (D4), por
 * si la hoja de cálculo lo conservó al guardar.
 */
export function normalizar(texto: string): string {
  return quitarNeutralizacion(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

const INICIOS_DE_FORMULA = ['=', '+', '-', '@'];

function quitarNeutralizacion(texto: string): string {
  const limpio = texto.trim();
  const segundo = limpio.charAt(1);
  return limpio.startsWith("'") && INICIOS_DE_FORMULA.includes(segundo) ? limpio.slice(1) : limpio;
}

/** Clave de una variante por marca + producto + medida (R5). */
export function clavePorNombre(marca: string, producto: string, medida: string): string {
  return [marca, producto, medida].map(normalizar).join('\u0001');
}
