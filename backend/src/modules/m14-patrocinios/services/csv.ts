/** BOM UTF-8: sin él Excel abre los acentos mal. */
export const BOM_UTF8 = '﻿';
/** Separador que Excel en español espera (la coma es el separador decimal). */
export const SEPARADOR_CSV = ';';

/**
 * Un valor de celda. Se entrecomilla si trae separador, comillas o saltos de línea; y si empieza por `=`, `+`, `-`, `@`,
 * tabulación o retorno se le antepone una comilla simple para que Excel no lo ejecute como fórmula (los nombres de
 * campañas y anuncios los escribe el personal, pero el archivo lo abre otra persona).
 */
export function celdaCsv(valor: string | number | null): string {
  if (valor === null) return '';
  let texto = String(valor);
  if (typeof valor === 'string' && /^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return /[;"\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function filaCsv(valores: ReadonlyArray<string | number | null>): string {
  return valores.map(celdaCsv).join(SEPARADOR_CSV);
}

/** El CTR con coma decimal, como lo lee Excel en español. */
export const decimalCsv = (n: number | null): string => (n === null ? '' : String(n).replace('.', ','));
