import {
  ERRORES_TOLERADOS,
  FACTOR_COINCIDENCIA_APROXIMADA,
  FACTOR_COINCIDENCIA_EXACTA,
  LARGO_MINIMO_PALABRA,
} from '../dtos/m02-busqueda.dto';

/** B3: minúsculas, sin acentos y con un solo espacio entre palabras. */
export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * B11: las palabras del término ya normalizado. Las cortas ("de", "la") se ignoran; si todas lo son, se busca el
 * término completo como una sola palabra.
 */
export function palabrasDeBusqueda(terminoNormalizado: string): string[] {
  if (terminoNormalizado === '') return [];
  const palabras = terminoNormalizado.split(' ').filter((p) => p.length >= LARGO_MINIMO_PALABRA);
  return palabras.length > 0 ? [...new Set(palabras)] : [terminoNormalizado];
}

/** B13: cuántas letras pueden estar mal en una palabra de ese largo. */
export function erroresTolerados(largo: number): number {
  return ERRORES_TOLERADOS.find((t) => largo >= t.desdeLetras)?.errores ?? 0;
}

/**
 * Letras que hay que quitar, poner, cambiar o intercambiar (dos vecinas) para pasar de `a` a `b`. Deja de contar
 * en cuanto pasa de `maximo` y devuelve `maximo + 1`: solo importa saber si está dentro de la tolerancia.
 */
export function distanciaEdicion(a: string, b: string, maximo: number): number {
  if (Math.abs(a.length - b.length) > maximo) return maximo + 1;
  let antepenultima: number[] = [];
  let anterior = Array.from({ length: b.length + 1 }, (_v, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const actual = [i];
    let minimoFila = i;
    for (let j = 1; j <= b.length; j += 1) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      let valor = Math.min((anterior[j] ?? 0) + 1, (actual[j - 1] ?? 0) + 1, (anterior[j - 1] ?? 0) + costo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        valor = Math.min(valor, (antepenultima[j - 2] ?? 0) + 1);
      }
      actual.push(valor);
      minimoFila = Math.min(minimoFila, valor);
    }
    if (minimoFila > maximo) return maximo + 1;
    antepenultima = anterior;
    anterior = actual;
  }
  return Math.min(anterior[b.length] ?? maximo + 1, maximo + 1);
}

/** "pinturas" → ["pinturas", "pintura"]; "colores" → ["colores", "colore", "color"]. */
function formasSingularPlural(palabra: string): string[] {
  const formas = [palabra];
  if (palabra.length > LARGO_MINIMO_PALABRA && palabra.endsWith('s')) formas.push(palabra.slice(0, -1));
  if (palabra.length > LARGO_MINIMO_PALABRA + 1 && palabra.endsWith('es')) formas.push(palabra.slice(0, -2));
  return formas;
}

export type FuerzaCoincidencia = 'exacta' | 'contenida' | 'plural' | 'aproximada';

/** O2: cuánto multiplica cada fuerza el peso del campo. */
export const FACTOR_POR_FUERZA: Readonly<Record<FuerzaCoincidencia, number>> = {
  exacta: FACTOR_COINCIDENCIA_EXACTA,
  contenida: 1,
  plural: 1,
  aproximada: FACTOR_COINCIDENCIA_APROXIMADA,
};

/**
 * B13: qué tan bien coincide una palabra buscada con el texto ya normalizado de un campo, de la más fuerte a la más
 * débil; null si no coincide.
 */
export function fuerzaCoincidencia(palabra: string, textoCampo: string): FuerzaCoincidencia | null {
  if (textoCampo === '' || palabra === '') return null;
  const palabrasCampo = textoCampo.split(' ');
  if (palabrasCampo.includes(palabra)) return 'exacta';
  if (textoCampo.includes(palabra)) return 'contenida';

  const formasBuscadas = formasSingularPlural(palabra);
  if (palabrasCampo.some((p) => formasSingularPlural(p).some((f) => formasBuscadas.includes(f)))) return 'plural';

  const tolerancia = erroresTolerados(palabra.length);
  if (tolerancia === 0) return null;
  return palabrasCampo.some((p) => distanciaEdicion(palabra, p, tolerancia) <= tolerancia) ? 'aproximada' : null;
}
