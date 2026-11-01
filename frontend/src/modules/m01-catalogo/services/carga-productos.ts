import type { CellValue, Worksheet } from 'exceljs';
import {
  COLUMNAS_PLANTILLA_PRODUCTOS,
  MAXIMO_BYTES_ARCHIVO_PRODUCTOS,
  MAXIMO_FILAS_ARCHIVO_PRODUCTOS,
  VERSION_PLANTILLA_PRODUCTOS,
  filaProductoCargaSchema,
  type FilaProductoCarga,
} from '../dtos/m01-catalogo-carga-masiva.dto';

const HOJA_PRODUCTOS = 'Productos';
const HOJA_META = 'meta';

export interface ErrorLecturaFila {
  /** Número de la fila en el Excel. */
  fila: number;
  mensaje: string;
}

export interface LecturaLibro {
  /** Las filas que se pueden enviar al servidor. */
  filas: FilaProductoCarga[];
  /** Las filas que no se entienden: no se envían y se muestran con su motivo. */
  errores: ErrorLecturaFila[];
  /** Cuántos productos distintos (marca + producto) hay entre las filas leídas. */
  productos: number;
}

/** El archivo no es la plantilla, es de otra versión o excede los límites: no se puede leer nada de él. */
export class LibroInvalidoError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'LibroInvalidoError';
  }
}

type Titulo = (typeof COLUMNAS_PLANTILLA_PRODUCTOS)[number];
const indiceDe = (titulo: Titulo): number => COLUMNAS_PLANTILLA_PRODUCTOS.indexOf(titulo) + 1;

/* ── Lectura de celdas ───────────────────────────────────────────────────── */

/** El texto visible de una celda, sea texto, número, fórmula (su resultado), enlace o texto con formato. */
export function textoDeCelda(valor: CellValue): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'string') return valor.trim();
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor);
  if (valor instanceof Date) return valor.toISOString();
  if ('richText' in valor) return valor.richText.map((t) => t.text).join('').trim();
  if ('result' in valor) return textoDeCelda(valor.result as CellValue);
  if ('text' in valor) return textoDeCelda(valor.text as CellValue);
  return '';
}

type Lectura<T> = { ok: true; valor: T } | { ok: false; mensaje: string };

const ok = <T>(valor: T): Lectura<T> => ({ ok: true, valor });
const fallo = (mensaje: string): Lectura<never> => ({ ok: false, mensaje });

/**
 * Un número. Si Excel lo guardó como número se usa tal cual. Si es texto se acepta la coma decimal, pero un texto como
 * «98.900» es ambiguo (¿noventa y ocho mil novecientos o noventa y ocho con nueve?) y se rechaza en vez de adivinar.
 */
export function numeroDeCelda(valor: CellValue): Lectura<number | null> {
  if (typeof valor === 'number') return ok(valor);
  const texto = textoDeCelda(valor);
  if (texto === '') return ok(null);
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(texto)) {
    return fallo(`«${texto}» tiene separador de miles; escríbalo sin él (98900 o 98900,50)`);
  }
  if (!/^\d+([.,]\d+)?$/.test(texto)) return fallo(`«${texto}» no es un número`);
  return ok(Number(texto.replace(',', '.')));
}

export function enteroDeCelda(valor: CellValue): Lectura<number | null> {
  const r = numeroDeCelda(valor);
  if (!r.ok || r.valor === null) return r;
  return Number.isInteger(r.valor) ? r : fallo(`«${r.valor}» debe ser un número entero`);
}

const VERDADERO = new Set(['si', 'sí', 's', 'x', '1', 'true', 'verdadero']);
const FALSO = new Set(['', 'no', 'n', '0', 'false', 'falso']);

export function booleanoDeCelda(valor: CellValue): Lectura<boolean> {
  const texto = textoDeCelda(valor).toLowerCase();
  if (VERDADERO.has(texto)) return ok(true);
  if (FALSO.has(texto)) return ok(false);
  return fallo(`«${textoDeCelda(valor)}» debe ser Sí o No`);
}

/** C: varios valores separados por punto y coma. */
export function listaDeCelda(valor: CellValue): string[] {
  return textoDeCelda(valor)
    .split(';')
    .map((p) => p.trim())
    .filter((p) => p !== '');
}

/** C15: «Nombre: valor; Nombre: valor». El nombre llega hasta el primer `:`; el valor puede llevar más. */
export function caracteristicasDeCelda(valor: CellValue): Lectura<Array<{ nombre: string; valor: string }>> {
  const pares: Array<{ nombre: string; valor: string }> = [];
  for (const par of listaDeCelda(valor)) {
    const corte = par.indexOf(':');
    const nombre = corte === -1 ? '' : par.slice(0, corte).trim();
    const dato = corte === -1 ? '' : par.slice(corte + 1).trim();
    if (nombre === '' || dato === '') return fallo(`«${par}» no sigue el formato «Nombre: valor»`);
    pares.push({ nombre, valor: dato });
  }
  return ok(pares);
}

/* ── De una fila del libro a una fila del contrato ──────────────────────── */

const textoONulo = (valor: CellValue): string | null => {
  const t = textoDeCelda(valor);
  return t === '' ? null : t;
};

function leerFila(hoja: Worksheet, numero: number): Lectura<FilaProductoCarga> {
  const celda = (titulo: Titulo): CellValue => hoja.getCell(numero, indiceDe(titulo)).value;
  const problemas: string[] = [];
  const tomar = <T>(titulo: Titulo, lectura: Lectura<T>, porDefecto: T): T => {
    if (lectura.ok) return lectura.valor;
    problemas.push(`«${titulo}»: ${lectura.mensaje}`);
    return porDefecto;
  };

  const candidata = {
    fila: numero,
    marca: textoDeCelda(celda('Marca')),
    linea: textoONulo(celda('Línea')),
    categoria: textoDeCelda(celda('Categoría')),
    subcategoria: textoDeCelda(celda('Subcategoría')),
    producto: textoDeCelda(celda('Producto')),
    descripcion: textoONulo(celda('Descripción')),
    usoInterior: tomar('Uso interior', booleanoDeCelda(celda('Uso interior')), false),
    usoExterior: tomar('Uso exterior', booleanoDeCelda(celda('Uso exterior')), false),
    medida: textoDeCelda(celda('Medida')),
    sku: textoONulo(celda('SKU')),
    precio: tomar('Precio', numeroDeCelda(celda('Precio')), null),
    codigoProveedor: textoONulo(celda('Código de proveedor')),
    superficies: listaDeCelda(celda('Superficies')),
    acabados: listaDeCelda(celda('Acabados')),
    bases: listaDeCelda(celda('Bases')),
    coloresFabrica: listaDeCelda(celda('Colores de fábrica')),
    caracteristicas: tomar('Características', caracteristicasDeCelda(celda('Características')), []),
    tipoResina: textoONulo(celda('Tipo de resina')),
    tipoCalidad: tomar('Calidad (1 a 3)', enteroDeCelda(celda('Calidad (1 a 3)')), null),
    rendimientoMin: tomar('Rendimiento mínimo (m²/galón)', numeroDeCelda(celda('Rendimiento mínimo (m²/galón)')), null),
    rendimientoMax: tomar('Rendimiento máximo (m²/galón)', numeroDeCelda(celda('Rendimiento máximo (m²/galón)')), null),
    manos: tomar('Manos', enteroDeCelda(celda('Manos')), null),
  };
  if (problemas.length > 0) return fallo(problemas.join(' · '));

  const analizada = filaProductoCargaSchema.safeParse(candidata);
  if (analizada.success) return ok(analizada.data);
  // La primera columna que falla, por su nombre en la plantilla y no por el de un campo interno.
  const campo = String(analizada.error.issues[0]?.path[0] ?? '');
  return fallo(`La columna «${tituloDeCampo(campo)}» está vacía o tiene un valor que no es válido`);
}

const TITULO_POR_CAMPO: Record<string, Titulo> = {
  marca: 'Marca',
  linea: 'Línea',
  categoria: 'Categoría',
  subcategoria: 'Subcategoría',
  producto: 'Producto',
  descripcion: 'Descripción',
  usoInterior: 'Uso interior',
  usoExterior: 'Uso exterior',
  medida: 'Medida',
  sku: 'SKU',
  precio: 'Precio',
  codigoProveedor: 'Código de proveedor',
  superficies: 'Superficies',
  acabados: 'Acabados',
  bases: 'Bases',
  coloresFabrica: 'Colores de fábrica',
  caracteristicas: 'Características',
  tipoResina: 'Tipo de resina',
  tipoCalidad: 'Calidad (1 a 3)',
  rendimientoMin: 'Rendimiento mínimo (m²/galón)',
  rendimientoMax: 'Rendimiento máximo (m²/galón)',
  manos: 'Manos',
};
const tituloDeCampo = (campo: string): string => TITULO_POR_CAMPO[campo] ?? campo;

/* ── El libro completo ───────────────────────────────────────────────────── */

function exigirPlantilla(hoja: Worksheet | undefined, meta: Worksheet | undefined): Worksheet {
  if (hoja === undefined || meta === undefined) {
    throw new LibroInvalidoError('El archivo no es la plantilla de productos. Descargue la plantilla y úsela tal como viene.');
  }
  const version = Number(meta.getCell('B1').value);
  if (version !== VERSION_PLANTILLA_PRODUCTOS) {
    throw new LibroInvalidoError('La plantilla es de otra versión. Descargue la plantilla actual y pase los datos a ella.');
  }
  const encabezados = COLUMNAS_PLANTILLA_PRODUCTOS.map((_, i) => textoDeCelda(hoja.getCell(1, i + 1).value));
  const distinto = COLUMNAS_PLANTILLA_PRODUCTOS.find((titulo, i) => titulo !== encabezados[i]);
  if (distinto !== undefined) {
    throw new LibroInvalidoError(`Falta la columna «${distinto}» o está en otro lugar. No cambie los encabezados de la plantilla.`);
  }
  return hoja;
}

const filaVacia = (hoja: Worksheet, numero: number): boolean =>
  COLUMNAS_PLANTILLA_PRODUCTOS.every((_, i) => textoDeCelda(hoja.getCell(numero, i + 1).value) === '');

/** Cuenta los productos distintos por marca + producto, sin tildes ni mayúsculas (C2). */
function contarProductos(filas: readonly FilaProductoCarga[]): number {
  const normal = (t: string): string => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
  return new Set(filas.map((f) => `${normal(f.marca)}|${normal(f.producto)}`)).size;
}

/**
 * Lee la plantilla llenada. Valida el archivo entero (versión, encabezados, tamaño, número de filas) y cada fila por
 * separado: una fila mala no impide leer las demás. No habla con el servidor.
 */
export async function leerLibroProductos(datos: ArrayBuffer): Promise<LecturaLibro> {
  if (datos.byteLength > MAXIMO_BYTES_ARCHIVO_PRODUCTOS) {
    throw new LibroInvalidoError('El archivo pesa más de 5 MB. Divídalo en varios.');
  }
  // La librería es pesada: solo se descarga cuando alguien sube un archivo.
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  try {
    await libro.xlsx.load(datos);
  } catch {
    throw new LibroInvalidoError('No se pudo abrir el archivo. Suba el Excel (.xlsx) de la plantilla.');
  }
  const hoja = exigirPlantilla(libro.getWorksheet(HOJA_PRODUCTOS), libro.getWorksheet(HOJA_META));

  const filas: FilaProductoCarga[] = [];
  const errores: ErrorLecturaFila[] = [];
  let conDatos = 0;
  for (let numero = 2; numero <= hoja.rowCount; numero += 1) {
    if (filaVacia(hoja, numero)) continue;
    conDatos += 1;
    if (conDatos > MAXIMO_FILAS_ARCHIVO_PRODUCTOS) {
      throw new LibroInvalidoError(`El archivo tiene más de ${MAXIMO_FILAS_ARCHIVO_PRODUCTOS} filas. Divídalo en varios.`);
    }
    const lectura = leerFila(hoja, numero);
    if (lectura.ok) filas.push(lectura.valor);
    else errores.push({ fila: numero, mensaje: lectura.mensaje });
  }
  return { filas, errores, productos: contarProductos(filas) };
}
