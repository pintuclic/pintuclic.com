import ExcelJS from 'exceljs';
import { COLUMNAS_PLANTILLA_PRODUCTOS, VERSION_PLANTILLA_PRODUCTOS } from '../dtos/m01-catalogo-carga-masiva.dto';

/** Lo que la plantilla toma de la base de datos. Solo registros activos. */
export interface CatalogosPlantilla {
  marcas: readonly string[];
  lineas: ReadonlyArray<{ marca: string; nombre: string }>;
  categorias: readonly string[];
  subcategorias: ReadonlyArray<{ categoria: string; nombre: string }>;
  medidas: ReadonlyArray<{ tipo: string; nombre: string }>;
  superficies: readonly string[];
  acabados: readonly string[];
  bases: readonly string[];
  tiposResina: readonly string[];
  colores: ReadonlyArray<{ marca: string; nombre: string }>;
}

export const HOJA_PRODUCTOS = 'Productos';
export const HOJA_CATALOGOS = 'Catálogos';
export const HOJA_COLORES = 'Colores';
export const HOJA_INSTRUCCIONES = 'Instrucciones';
/** Hoja oculta con la versión de la plantilla (C13): una plantilla de otra versión se rechaza. */
export const HOJA_META = 'meta';
/** Cuántas filas de la hoja «Productos» llevan listas desplegables: el máximo de filas de un archivo + el encabezado. */
const FILAS_CON_LISTAS = 2001;
const COLOR_ENCABEZADO = 'FF0B2D6B';

/** C10: una celda que empieza así sería una fórmula para la hoja de cálculo. */
function neutralizar(texto: string): string {
  return /^[=+\-@]/.test(texto) ? `'${texto}` : texto;
}

const ordenar = (valores: readonly string[]): string[] =>
  [...new Set(valores)].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

function estilizarEncabezado(fila: ExcelJS.Row): void {
  fila.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  fila.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ENCABEZADO } };
  fila.alignment = { vertical: 'middle', wrapText: true };
}

/** Escribe una columna de valores en la hoja de catálogos y devuelve el rango para la lista desplegable. */
function escribirColumna(hoja: ExcelJS.Worksheet, columna: number, titulo: string, valores: readonly string[]): string | null {
  hoja.getCell(1, columna).value = titulo;
  valores.forEach((v, i) => {
    hoja.getCell(i + 2, columna).value = neutralizar(v);
  });
  hoja.getColumn(columna).width = Math.max(titulo.length, ...valores.map((v) => v.length)) + 4;
  if (valores.length === 0) return null;
  const letra = hoja.getColumn(columna).letter;
  return `'${HOJA_CATALOGOS}'!$${letra}$2:$${letra}$${valores.length + 1}`;
}

function listaDesde(hoja: ExcelJS.Worksheet, indiceColumna: number, rango: string | null, mensaje: string): void {
  if (rango === null) return;
  for (let fila = 2; fila <= FILAS_CON_LISTAS; fila += 1) {
    hoja.getCell(fila, indiceColumna).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [rango],
      showErrorMessage: true,
      errorStyle: 'warning',
      errorTitle: 'Valor que no está en el catálogo',
      error: mensaje,
    };
  }
}

/**
 * Columnas que admiten varios valores separados por `;`: Excel no deja elegir varios en una lista,
 * así que la lista ayuda a elegir uno y el aviso es informativo para no bloquear los valores combinados.
 */
function listaMultiple(hoja: ExcelJS.Worksheet, indiceColumna: number, rango: string | null, nombre: string, seCrea = true): void {
  if (rango === null) return;
  for (let fila = 2; fila <= FILAS_CON_LISTAS; fila += 1) {
    hoja.getCell(fila, indiceColumna).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [rango],
      showErrorMessage: true,
      errorStyle: 'information',
      errorTitle: `Varios valores en ${nombre}`,
      error: `La lista permite elegir uno. Para varios, escríbalos separados por punto y coma (;). ${
        seCrea ? 'Lo que no esté en la lista se creará al cargar.' : 'Deben existir en la hoja «Colores».'
      } Pulse Aceptar para conservar lo escrito.`,
    };
  }
}

function listaFija(hoja: ExcelJS.Worksheet, indiceColumna: number, opciones: string): void {
  for (let fila = 2; fila <= FILAS_CON_LISTAS; fila += 1) {
    hoja.getCell(fila, indiceColumna).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${opciones}"`],
      showErrorMessage: true,
      errorStyle: 'warning',
      errorTitle: 'Valor no válido',
      error: `Use uno de estos valores: ${opciones}.`,
    };
  }
}

const INSTRUCCIONES: readonly string[] = [
  'CARGA MASIVA DE PRODUCTOS · Pintu Clic',
  '',
  'Cómo se llena',
  '1. Trabaje en la hoja «Productos». Cada fila es UNA VARIANTE (una presentación) de un producto.',
  '2. Las filas con la misma Marca y el mismo Producto forman un solo producto. Repita en cada una los datos del producto',
  '   (línea, categoría, descripción, usos, superficies, acabados, bases, colores, características y ficha): deben ser iguales.',
  '3. Marca, línea, categoría, subcategoría, medida y tipo de resina se escriben por su NOMBRE. Elíjalos de la lista de cada celda;',
  '   las hojas «Catálogos» y «Colores» muestran todo lo que existe hoy.',
  '   Si una marca, línea, categoría, subcategoría, superficie, acabado, base o tipo de resina NO existe, se CREA al cargar (la marca',
  '   sin logotipo: súbalo después en Marcas). Las MEDIDAS y los COLORES no se crean solos: deben existir, o el producto se rechaza.',
  '   Escriba cada nombre igual en todas las filas; no se distinguen mayúsculas ni tildes. Un nombre inactivo en el catálogo se rechaza.',
  '4. Obligatorios: Marca, Categoría, Subcategoría, Producto, Medida y Precio.',
  '5. Uso interior y Uso exterior: Sí o No.',
  '6. Superficies, Acabados, Bases y Colores de fábrica: varios valores separados por punto y coma (;). La lista de la celda deja elegir',
  '   uno; para agregar más, escríbalos a continuación con ; (Excel avisa, pulse Aceptar). Los nombres están en «Catálogos» y «Colores».',
  '7. Características: pares «Nombre: valor» separados por punto y coma. Ejemplo:  Secado: 2 horas; Rendimiento: 35 m² por galón.',
  '   El valor no puede llevar punto y coma.',
  '8. Un recubrimiento exige Línea y Tipo de resina. Las Bases exigen al menos un Acabado.',
  '9. Si deja el SKU vacío, el sistema lo genera.',
  '',
  'Qué pasa al subirlo',
  '· Primero verá la lista de productos que se van a crear (y lo nuevo del catálogo que se creará), con los errores fila por fila. Nada se guarda todavía.',
  '· Después aparece el botón para cargarlos. Los productos que ya existen no se modifican.',
  '· Los productos nacen SIN PUBLICAR y con existencia 0. Las imágenes y la publicación se hacen después, desde cada producto.',
  '',
  `Límites: ${2000} filas y 5 MB por archivo. No cambie los encabezados ni el orden de las columnas.`,
];

/** D3: la plantilla de la carga masiva de productos, con los catálogos actuales de la base de datos. */
export async function construirPlantillaProductos(cat: CatalogosPlantilla): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Pintu Clic';

  const instrucciones = libro.addWorksheet(HOJA_INSTRUCCIONES);
  instrucciones.getColumn(1).width = 130;
  INSTRUCCIONES.forEach((linea, i) => {
    const celda = instrucciones.getCell(i + 1, 1);
    celda.value = linea;
    if (i === 0 || linea === 'Cómo se llena' || linea === 'Qué pasa al subirlo') celda.font = { bold: true, size: i === 0 ? 14 : 12 };
  });

  const productos = libro.addWorksheet(HOJA_PRODUCTOS, { views: [{ state: 'frozen', ySplit: 1 }] });
  productos.addRow([...COLUMNAS_PLANTILLA_PRODUCTOS]);
  estilizarEncabezado(productos.getRow(1));
  productos.getRow(1).height = 32;
  COLUMNAS_PLANTILLA_PRODUCTOS.forEach((titulo, i) => {
    productos.getColumn(i + 1).width = Math.max(14, Math.min(34, titulo.length + 6));
  });
  productos.getColumn(COLUMNAS_PLANTILLA_PRODUCTOS.indexOf('Descripción') + 1).width = 40;

  const catalogos = libro.addWorksheet(HOJA_CATALOGOS);
  const rMarcas = escribirColumna(catalogos, 1, 'Marcas', ordenar(cat.marcas));
  const rLineas = escribirColumna(catalogos, 2, 'Líneas', ordenar(cat.lineas.map((l) => l.nombre)));
  escribirColumna(catalogos, 3, 'Línea de la marca', cat.lineas.map((l) => `${l.marca} › ${l.nombre}`).sort());
  const rCategorias = escribirColumna(catalogos, 4, 'Categorías', ordenar(cat.categorias));
  const rSubcategorias = escribirColumna(catalogos, 5, 'Subcategorías', ordenar(cat.subcategorias.map((s) => s.nombre)));
  escribirColumna(catalogos, 6, 'Subcategoría de la categoría', cat.subcategorias.map((s) => `${s.categoria} › ${s.nombre}`).sort());
  const rMedidas = escribirColumna(catalogos, 7, 'Medidas', ordenar(cat.medidas.map((m) => m.nombre)));
  escribirColumna(catalogos, 8, 'Medida del tipo', cat.medidas.map((m) => `${m.tipo} › ${m.nombre}`).sort());
  const rResinas = escribirColumna(catalogos, 9, 'Tipos de resina', ordenar(cat.tiposResina));
  const rSuperficies = escribirColumna(catalogos, 10, 'Superficies', ordenar(cat.superficies));
  const rAcabados = escribirColumna(catalogos, 11, 'Acabados', ordenar(cat.acabados));
  const rBases = escribirColumna(catalogos, 12, 'Bases', ordenar(cat.bases));
  estilizarEncabezado(catalogos.getRow(1));

  const colores = libro.addWorksheet(HOJA_COLORES);
  colores.addRow(['Marca', 'Color']);
  estilizarEncabezado(colores.getRow(1));
  [...cat.colores]
    .sort((a, b) => a.marca.localeCompare(b.marca, 'es') || a.nombre.localeCompare(b.nombre, 'es'))
    .forEach((c) => colores.addRow([neutralizar(c.marca), neutralizar(c.nombre)]));
  colores.getColumn(1).width = 28;
  colores.getColumn(2).width = 40;

  const columna = (titulo: (typeof COLUMNAS_PLANTILLA_PRODUCTOS)[number]): number => COLUMNAS_PLANTILLA_PRODUCTOS.indexOf(titulo) + 1;
  listaDesde(productos, columna('Marca'), rMarcas, 'Esa marca no está en el catálogo: se creará al cargar, sin logotipo (súbalo después en Marcas).');
  listaDesde(productos, columna('Línea'), rLineas, 'Esa línea no está en el catálogo: se creará al cargar.');
  listaDesde(productos, columna('Categoría'), rCategorias, 'Esa categoría no está en el catálogo: se creará al cargar.');
  listaDesde(productos, columna('Subcategoría'), rSubcategorias, 'Esa subcategoría no está en el catálogo: se creará al cargar.');
  listaDesde(productos, columna('Medida'), rMedidas, 'Esa medida no está en el catálogo y NO se crea sola: el producto será rechazado. Elíjala de la lista.');
  listaDesde(productos, columna('Tipo de resina'), rResinas, 'Ese tipo de resina no está en el catálogo: se creará al cargar.');
  listaMultiple(productos, columna('Superficies'), rSuperficies, 'Superficies');
  listaMultiple(productos, columna('Acabados'), rAcabados, 'Acabados');
  listaMultiple(productos, columna('Bases'), rBases, 'Bases');
  const nombresColor = ordenar(cat.colores.map((c) => c.nombre));
  listaMultiple(
    productos,
    columna('Colores de fábrica'),
    nombresColor.length === 0 ? null : `'${HOJA_COLORES}'!$B$2:$B$${cat.colores.length + 1}`,
    'Colores de fábrica',
    false,
  );
  listaFija(productos, columna('Uso interior'), 'Sí,No');
  listaFija(productos, columna('Uso exterior'), 'Sí,No');
  listaFija(productos, columna('Calidad (1 a 3)'), '1,2,3');

  const meta = libro.addWorksheet(HOJA_META);
  meta.getCell('A1').value = 'versionPlantilla';
  meta.getCell('B1').value = VERSION_PLANTILLA_PRODUCTOS;
  meta.state = 'hidden';

  libro.views = [{ x: 0, y: 0, width: 10000, height: 20000, firstSheet: 0, activeTab: 1, visibility: 'visible' }];
  return Buffer.from(await libro.xlsx.writeBuffer());
}
