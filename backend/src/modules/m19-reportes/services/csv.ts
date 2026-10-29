/**
 * R11: CSV que abre bien en Excel en español: UTF-8 con BOM, separador `;`, coma decimal, una fila de encabezados. Un texto
 * que empiece por `=`, `+`, `-` o `@` se antepone con una comilla simple para que la hoja no lo ejecute como fórmula.
 */
export const BOM = '﻿';
const SEPARADOR = ';';

export type CeldaCsv = string | number | null;

export function celdaCsv(valor: CeldaCsv): string {
  if (valor === null) return '';
  if (typeof valor === 'number') return Number.isFinite(valor) ? String(valor).replace('.', ',') : '';
  const texto = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
  return /[";\r\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
}

export function aCsv(encabezados: ReadonlyArray<string>, filas: ReadonlyArray<ReadonlyArray<CeldaCsv>>): string {
  const lineas = [encabezados.map(celdaCsv).join(SEPARADOR), ...filas.map((f) => f.map(celdaCsv).join(SEPARADOR))];
  return `${BOM}${lineas.join('\r\n')}\r\n`;
}
