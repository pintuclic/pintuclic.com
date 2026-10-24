import {
  MAXIMO_FILAS_IMPORTACION,
  filaColorImportacionSchema,
  type FilaColorImportacion,
} from '../dtos/m01-catalogo-productos.dto';
import type { FilaImportacionBorrador } from '../interfaces/catalogo.interface';

/**
 * Lectura del archivo de colores que prepara el cliente (C8). Acepta CSV con coma, punto y
 * coma (Excel en español) o tabulador, con o sin encabezado, y texto pegado desde una hoja.
 * Orden de columnas sin encabezado: nombre, código, hexadecimal, base, acabado, familia.
 */

export interface FilaLeida {
  /** Número de línea en el archivo (base 1), para señalar los errores. */
  linea: number;
  borrador: FilaImportacionBorrador;
}

export interface ErrorLinea {
  linea: number;
  mensaje: string;
}

export interface LecturaImportacion {
  filas: FilaLeida[];
  errores: ErrorLinea[];
}

const COLUMNAS: ReadonlyArray<keyof FilaImportacionBorrador> = [
  'nombre',
  'codigo',
  'hexadecimal',
  'base',
  'acabado',
  'familia',
];

const SINONIMOS: Record<string, keyof FilaImportacionBorrador> = {
  nombre: 'nombre',
  color: 'nombre',
  codigo: 'codigo',
  code: 'codigo',
  hex: 'hexadecimal',
  hexadecimal: 'hexadecimal',
  rgb: 'hexadecimal',
  base: 'base',
  acabado: 'acabado',
  familia: 'familia',
};

const sinTildes = (texto: string): string => texto.normalize('NFD').replace(/[̀-ͯ]/g, '');

function detectarSeparador(primeraLinea: string): string {
  const candidatos = ['\t', ';', ','];
  let mejor = ',';
  let max = -1;
  for (const c of candidatos) {
    const n = primeraLinea.split(c).length - 1;
    if (n > max) {
      max = n;
      mejor = c;
    }
  }
  return mejor;
}

/** Divide una línea respetando campos entre comillas dobles ("Rojo, intenso"). */
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

/** Normaliza "d7263d", "D7263D" o "#d7263d" a "#D7263D"; deja igual lo que no parezca un hexadecimal. */
export function normalizarHexadecimal(texto: string): string {
  const limpio = texto.trim();
  const sinAlmohadilla = limpio.startsWith('#') ? limpio.slice(1) : limpio;
  return /^[0-9a-fA-F]{6}$/.test(sinAlmohadilla) ? `#${sinAlmohadilla.toUpperCase()}` : limpio;
}

export function leerFilasColores(texto: string): LecturaImportacion {
  const lineas = texto
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .map((contenido, i) => ({ contenido, linea: i + 1 }))
    .filter((l) => l.contenido.trim() !== '');
  if (lineas.length === 0) return { filas: [], errores: [] };

  const separador = detectarSeparador(lineas[0]?.contenido ?? '');
  const primera = dividirLinea(lineas[0]?.contenido ?? '', separador).map((c) => SINONIMOS[sinTildes(c).toLowerCase()]);
  const tieneEncabezado = primera.includes('nombre') && primera.includes('hexadecimal');
  const orden: Array<keyof FilaImportacionBorrador | undefined> = tieneEncabezado ? primera : [...COLUMNAS];
  const datos = tieneEncabezado ? lineas.slice(1) : lineas;

  const filas: FilaLeida[] = [];
  const errores: ErrorLinea[] = [];
  for (const { contenido, linea } of datos) {
    const campos = dividirLinea(contenido, separador);
    const borrador: FilaImportacionBorrador = {
      nombre: '',
      codigo: '',
      hexadecimal: '',
      base: '',
      acabado: '',
      familia: '',
    };
    orden.forEach((columna, i) => {
      if (columna !== undefined) borrador[columna] = campos[i] ?? '';
    });
    borrador.hexadecimal = normalizarHexadecimal(borrador.hexadecimal);
    if (borrador.nombre === '') {
      errores.push({ linea, mensaje: 'Falta el nombre del color.' });
      continue;
    }
    if (!/^#[0-9A-F]{6}$/.test(borrador.hexadecimal)) {
      errores.push({ linea, mensaje: `"${borrador.nombre}": el hexadecimal debe tener el formato #RRGGBB.` });
      continue;
    }
    filas.push({ linea, borrador });
  }
  return { filas, errores };
}

/** Convierte un borrador en la fila del contrato: lo vacío no se envía (no modifica un color existente). */
export function aFilaContrato(b: FilaImportacionBorrador): FilaColorImportacion {
  const fila = filaColorImportacionSchema.parse({
    nombre: b.nombre,
    hexadecimal: b.hexadecimal,
    ...(b.codigo === '' ? {} : { codigo: b.codigo }),
    ...(b.base === '' ? {} : { base: b.base }),
    ...(b.acabado === '' ? {} : { acabado: b.acabado }),
    ...(b.familia === '' ? {} : { familia: b.familia }),
  });
  return fila;
}

/** Parte las filas en bloques del tamaño máximo que acepta la API (C8). */
export function dividirEnBloques<T>(filas: readonly T[], tamano: number = MAXIMO_FILAS_IMPORTACION): T[][] {
  const bloques: T[][] = [];
  for (let i = 0; i < filas.length; i += tamano) bloques.push(filas.slice(i, i + tamano));
  return bloques;
}

/** Plantilla descargable para el cliente: encabezado y dos filas de ejemplo. */
export const PLANTILLA_COLORES_CSV = [
  'nombre;codigo;hexadecimal;base;acabado;familia',
  'Rojo Colonial;1234;#B5242F;Tint;Mate;Rojos',
  'Blanco Hueso;;#F5F1EA;;;',
].join('\n');
