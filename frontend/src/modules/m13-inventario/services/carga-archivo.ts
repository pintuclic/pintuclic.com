import { EXISTENCIA_MAXIMA, MAXIMO_FILAS_BLOQUE, type FilaCarga } from '../dtos/m13-inventario.dto';

/**
 * Lectura del archivo de la carga masiva (R5–R10). Acepta el CSV de la plantilla de Pintu Clic
 * (separado por `;`, `,` o tabulador, con o sin BOM) o texto pegado desde una hoja de cálculo.
 * Lo que no se puede enviar se explica por línea; nada se descarta en silencio.
 */

export interface FilaArchivo {
  /** Número de línea en el archivo (base 1), para señalar los problemas. */
  linea: number;
  fila: FilaCarga;
}

export interface ErrorLinea {
  linea: number;
  mensaje: string;
}

export interface LecturaCarga {
  /** Listas para enviar. */
  filas: FilaArchivo[];
  /** Con problema: no se envían. */
  errores: ErrorLinea[];
  /** Con la celda de existencia vacía: se omiten a propósito (R9). */
  omitidas: number;
  /** null si el archivo se pudo leer; si no, por qué no. */
  formatoInvalido: string | null;
}

type Columna = 'marca' | 'producto' | 'medida' | 'sku' | 'existencia' | 'nota';

const SINONIMOS: Record<string, Columna> = {
  marca: 'marca',
  producto: 'producto',
  medida: 'medida',
  sku: 'sku',
  existencia: 'existencia',
  cantidad: 'existencia',
  nota: 'nota',
};

const MENSAJE_FORMATO =
  'El archivo no tiene el formato de la plantilla. Descargue la plantilla y llene la columna "existencia".';

/** Igual que en el servidor (R5): sin mayúsculas, tildes ni espacios sobrantes. */
export function normalizar(texto: string): string {
  const limpio = texto.trim();
  const sinNeutralizar = limpio.startsWith("'") && '=+-@'.includes(limpio.charAt(1)) ? limpio.slice(1) : limpio;
  return sinNeutralizar.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Excel en español guarda "CSV (delimitado por comas)" en Windows-1252, no en UTF-8. Se prueba
 * UTF-8 estricto y, si el archivo no lo es, se lee como Windows-1252 para no romper las tildes.
 */
export function decodificarCsv(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

function detectarSeparador(primeraLinea: string): string {
  let mejor = ';';
  let max = -1;
  for (const candidato of [';', '\t', ',']) {
    const n = primeraLinea.split(candidato).length - 1;
    if (n > max) {
      max = n;
      mejor = candidato;
    }
  }
  return mejor;
}

/** Divide una línea respetando campos entre comillas dobles ("Rojo; intenso"). */
export function dividirLinea(linea: string, separador: string): string[] {
  const campos: string[] = [];
  let actual = '';
  let entreComillas = false;
  for (let i = 0; i < linea.length; i += 1) {
    const c = linea[i] ?? '';
    if (entreComillas) {
      if (c === '"' && linea[i + 1] === '"') {
        actual += '"';
        i += 1;
      } else if (c === '"') {
        entreComillas = false;
      } else {
        actual += c;
      }
    } else if (c === '"') {
      entreComillas = true;
    } else if (c === separador) {
      campos.push(actual);
      actual = '';
    } else {
      actual += c;
    }
  }
  campos.push(actual);
  return campos.map((x) => x.trim());
}

/** Separa el texto en líneas; un salto dentro de comillas no corta la fila. */
function lineasDe(texto: string): Array<{ contenido: string; linea: number }> {
  const resultado: Array<{ contenido: string; linea: number }> = [];
  let actual = '';
  let entreComillas = false;
  let inicio = 1;
  let numero = 1;
  const cerrar = () => {
    if (actual.trim() !== '') resultado.push({ contenido: actual, linea: inicio });
    actual = '';
  };
  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i] ?? '';
    if (c === '"') entreComillas = !entreComillas;
    if (!entreComillas && (c === '\n' || c === '\r')) {
      if (c === '\r' && texto[i + 1] === '\n') i += 1;
      cerrar();
      numero += 1;
      inicio = numero;
    } else {
      if (c === '\n') numero += 1;
      actual += c;
    }
  }
  cerrar();
  return resultado;
}

const SIN_LECTURA = (mensaje: string): LecturaCarga => ({
  filas: [],
  errores: [],
  omitidas: 0,
  formatoInvalido: mensaje,
});

function claveDe(f: FilaCarga): string {
  return f.sku !== undefined
    ? `sku\u0001${normalizar(f.sku)}`
    : `nombre\u0001${[f.marca, f.producto, f.medida].map((x) => normalizar(x ?? '')).join('\u0001')}`;
}

export function leerCarga(textoCrudo: string): LecturaCarga {
  const texto = textoCrudo.replace(/^﻿/, '');
  if (texto.trim() === '') return { filas: [], errores: [], omitidas: 0, formatoInvalido: null };

  const lineas = lineasDe(texto);
  const encabezado = lineas[0];
  if (encabezado === undefined) return { filas: [], errores: [], omitidas: 0, formatoInvalido: null };
  const separador = detectarSeparador(encabezado.contenido);
  const columnas = dividirLinea(encabezado.contenido, separador).map(
    (c) => SINONIMOS[normalizar(c).replace(/ /g, '_')],
  );
  const tieneNombres = columnas.includes('marca') && columnas.includes('producto') && columnas.includes('medida');
  if (!columnas.includes('existencia') || (!columnas.includes('sku') && !tieneNombres)) {
    return SIN_LECTURA(MENSAJE_FORMATO);
  }

  const candidatas: FilaArchivo[] = [];
  const errores: ErrorLinea[] = [];
  let omitidas = 0;
  for (const { contenido, linea } of lineas.slice(1)) {
    const campos = dividirLinea(contenido, separador);
    if (campos.every((c) => c === '')) continue;
    const valor = (columna: Columna): string => {
      const i = columnas.indexOf(columna);
      return i === -1 ? '' : (campos[i] ?? '');
    };

    const existencia = valor('existencia');
    if (existencia === '') {
      omitidas += 1;
      continue;
    }
    if (!/^\d+$/.test(existencia) || Number(existencia) > EXISTENCIA_MAXIMA) {
      errores.push({
        linea,
        mensaje: `La existencia "${existencia}" no es válida: use un número entero entre 0 y ${EXISTENCIA_MAXIMA.toLocaleString('es-CO')}.`,
      });
      continue;
    }
    const sku = valor('sku');
    const marca = valor('marca');
    const producto = valor('producto');
    const medida = valor('medida');
    const nota = valor('nota');
    if (sku === '' && (marca === '' || producto === '' || medida === '')) {
      errores.push({ linea, mensaje: 'Falta el SKU, o la marca, el producto y la medida.' });
      continue;
    }
    if (nota.length > 500) {
      errores.push({ linea, mensaje: 'La nota supera 500 caracteres.' });
      continue;
    }
    // R5: el SKU manda; sin SKU se envían los tres nombres.
    const identificador: Pick<FilaCarga, 'sku' | 'marca' | 'producto' | 'medida'> =
      sku !== '' ? { sku } : { marca, producto, medida };
    candidatas.push({
      linea,
      fila: { ...identificador, existencia: Number(existencia), ...(nota === '' ? {} : { nota }) },
    });
  }

  // R10: una variante repetida en el archivo se rechaza en todas sus líneas, aunque caiga en otro bloque.
  const lineasPorClave = new Map<string, number[]>();
  for (const c of candidatas) {
    const clave = claveDe(c.fila);
    lineasPorClave.set(clave, [...(lineasPorClave.get(clave) ?? []), c.linea]);
  }
  const filas: FilaArchivo[] = [];
  for (const c of candidatas) {
    const repetidas = lineasPorClave.get(claveDe(c.fila)) ?? [];
    if (repetidas.length > 1) {
      errores.push({
        linea: c.linea,
        mensaje: `La variante aparece más de una vez en el archivo (líneas ${repetidas.join(', ')}). Deje una sola fila.`,
      });
    } else {
      filas.push(c);
    }
  }
  errores.sort((a, b) => a.linea - b.linea);
  return { filas, errores, omitidas, formatoInvalido: null };
}

/** Parte las filas en bloques del tamaño máximo que acepta la API (R7). */
export function dividirEnBloques<T>(filas: readonly T[], tamano: number = MAXIMO_FILAS_BLOQUE): T[][] {
  const bloques: T[][] = [];
  for (let i = 0; i < filas.length; i += tamano) bloques.push(filas.slice(i, i + tamano));
  return bloques;
}
