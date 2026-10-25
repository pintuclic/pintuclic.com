import { COLUMNAS_PLANTILLA } from '../dtos/m13-inventario.dto';
import type { FilaPlantilla } from '../interfaces/inventario.interface';

const BOM = '﻿';
const SEPARADOR = ';';
const FIN_DE_LINEA = '\r\n';

/** D4: una hoja de cálculo ejecutaría una celda que empieza así como fórmula. */
function neutralizar(texto: string): string {
  return /^[=+\-@]/.test(texto) ? `'${texto}` : texto;
}

function celda(texto: string): string {
  const seguro = neutralizar(texto);
  return /[;"\r\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

/**
 * D4 / R6: CSV con `;` y BOM UTF-8, listo para abrir en Excel en español. Trae todas las
 * variantes con su existencia actual en las dos últimas columnas: el cliente solo cambia números.
 */
export function construirPlantillaCsv(filas: readonly FilaPlantilla[]): string {
  const lineas = [COLUMNAS_PLANTILLA.join(SEPARADOR)];
  for (const f of filas) {
    const existencia = String(f.existenciaReferencial);
    lineas.push(
      [celda(f.marca), celda(f.producto), celda(f.medida), celda(f.sku), existencia, existencia].join(SEPARADOR),
    );
  }
  return BOM + lineas.join(FIN_DE_LINEA) + FIN_DE_LINEA;
}
