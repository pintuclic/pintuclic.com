import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import {
  COLUMNAS_PLANTILLA_PRODUCTOS,
  VERSION_PLANTILLA_PRODUCTOS,
} from '../dtos/m01-catalogo-carga-masiva.dto';
import {
  booleanoDeCelda,
  caracteristicasDeCelda,
  enteroDeCelda,
  leerLibroProductos,
  LibroInvalidoError,
  listaDeCelda,
  numeroDeCelda,
  textoDeCelda,
} from '../services/carga-productos';

type Valores = Partial<Record<(typeof COLUMNAS_PLANTILLA_PRODUCTOS)[number], string | number | boolean>>;

const FILA_BASE: Valores = {
  Marca: 'Pintuco',
  Línea: 'Viniltex',
  Categoría: 'Pinturas',
  Subcategoría: 'Vinilos',
  Producto: 'Viniltex Advanced',
  'Uso interior': 'Sí',
  'Uso exterior': 'No',
  Medida: 'Galón',
  Precio: 98900,
};

/** Arma una plantilla en memoria como la que descarga el servidor y la llena con las filas dadas. */
async function libro(filas: Valores[], version: number = VERSION_PLANTILLA_PRODUCTOS): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const productos = wb.addWorksheet('Productos');
  productos.addRow([...COLUMNAS_PLANTILLA_PRODUCTOS]);
  for (const f of filas) productos.addRow(COLUMNAS_PLANTILLA_PRODUCTOS.map((c) => f[c] ?? null));
  const meta = wb.addWorksheet('meta');
  meta.getCell('A1').value = 'versionPlantilla';
  meta.getCell('B1').value = version;
  const buffer = await wb.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

describe('celdas de la plantilla', () => {
  it('el texto de una celda: número, fórmula, texto con formato y enlace', () => {
    expect(textoDeCelda(null)).toBe('');
    expect(textoDeCelda('  Hola  ')).toBe('Hola');
    expect(textoDeCelda(12)).toBe('12');
    expect(textoDeCelda({ richText: [{ text: 'Ro' }, { text: 'jo' }] })).toBe('Rojo');
    expect(textoDeCelda({ formula: 'A1', result: 'Mate' })).toBe('Mate');
    expect(textoDeCelda({ text: 'sitio', hyperlink: 'https://x.co' })).toBe('sitio');
  });

  it('números: acepta la coma decimal y rechaza el separador de miles en vez de adivinar', () => {
    expect(numeroDeCelda(98900)).toEqual({ ok: true, valor: 98900 });
    expect(numeroDeCelda('98900,50')).toEqual({ ok: true, valor: 98900.5 });
    expect(numeroDeCelda('12.5')).toEqual({ ok: true, valor: 12.5 });
    expect(numeroDeCelda(null)).toEqual({ ok: true, valor: null });
    expect(numeroDeCelda('98.900')).toMatchObject({ ok: false });
    expect(numeroDeCelda('doce')).toMatchObject({ ok: false });
    expect(enteroDeCelda('4,5')).toMatchObject({ ok: false });
    expect(enteroDeCelda('4200')).toEqual({ ok: true, valor: 4200 });
  });

  it('Sí/No: acepta sí, si, x, 1 y vacío como no; rechaza lo demás', () => {
    for (const v of ['Sí', 'si', 'X', '1', true]) expect(booleanoDeCelda(v)).toEqual({ ok: true, valor: true });
    for (const v of ['No', '', null, 0]) expect(booleanoDeCelda(v)).toEqual({ ok: true, valor: false });
    expect(booleanoDeCelda('quizás')).toMatchObject({ ok: false });
  });

  it('listas separadas por punto y coma', () => {
    expect(listaDeCelda(' Muros ; Madera ;; ')).toEqual(['Muros', 'Madera']);
    expect(listaDeCelda(null)).toEqual([]);
  });

  it('C15: características «Nombre: valor»; el valor puede llevar dos puntos; un par mal escrito se rechaza', () => {
    expect(caracteristicasDeCelda('Secado: 2 horas; Hora: 10:30')).toEqual({
      ok: true,
      valor: [
        { nombre: 'Secado', valor: '2 horas' },
        { nombre: 'Hora', valor: '10:30' },
      ],
    });
    expect(caracteristicasDeCelda('Secado 2 horas')).toMatchObject({ ok: false });
    expect(caracteristicasDeCelda('Secado:')).toMatchObject({ ok: false });
    expect(caracteristicasDeCelda(null)).toEqual({ ok: true, valor: [] });
  });
});

describe('leerLibroProductos', () => {
  it('lee las filas, cuenta productos distintos sin tildes ni mayúsculas y salta las filas vacías', async () => {
    const lectura = await leerLibroProductos(
      await libro([
        { ...FILA_BASE, Medida: 'Galón', SKU: 'VA-G' },
        {},
        { ...FILA_BASE, Marca: 'PINTUCO', Producto: 'viniltex advanced', Medida: 'Cuarto', Precio: '35900,50' },
        { ...FILA_BASE, Producto: 'Koraza', Características: 'Secado: 2 horas', Superficies: 'Muros; Madera' },
      ]),
    );

    expect(lectura.errores).toEqual([]);
    expect(lectura.filas).toHaveLength(3);
    expect(lectura.productos).toBe(2);
    expect(lectura.filas[0]).toMatchObject({ fila: 2, marca: 'Pintuco', sku: 'VA-G', precio: 98900, usoInterior: true, usoExterior: false });
    expect(lectura.filas[1]).toMatchObject({ fila: 4, precio: 35900.5 });
    expect(lectura.filas[2]).toMatchObject({
      fila: 5,
      superficies: ['Muros', 'Madera'],
      caracteristicas: [{ nombre: 'Secado', valor: '2 horas' }],
    });
  });

  it('una fila mala no impide leer las demás y dice en qué columna falla', async () => {
    const lectura = await leerLibroProductos(
      await libro([
        FILA_BASE,
        { ...FILA_BASE, Precio: '98.900' },
        { ...FILA_BASE, Marca: '' },
        { ...FILA_BASE, 'Uso interior': 'quizás' },
      ]),
    );

    expect(lectura.filas).toHaveLength(1);
    expect(lectura.errores.map((e) => e.fila)).toEqual([3, 4, 5]);
    expect(lectura.errores[0]?.mensaje).toContain('«Precio»');
    expect(lectura.errores[1]?.mensaje).toContain('«Marca»');
    expect(lectura.errores[2]?.mensaje).toContain('«Uso interior»');
  });

  it('rechaza un archivo que no es la plantilla, de otra versión o con encabezados cambiados', async () => {
    const otro = new ExcelJS.Workbook();
    otro.addWorksheet('Hoja1').addRow(['hola']);
    await expect(leerLibroProductos((await otro.xlsx.writeBuffer()) as ArrayBuffer)).rejects.toThrow(LibroInvalidoError);
    await expect(leerLibroProductos(await libro([FILA_BASE], VERSION_PLANTILLA_PRODUCTOS + 1))).rejects.toThrow(/otra versión/);

    const roto = new ExcelJS.Workbook();
    const hoja = roto.addWorksheet('Productos');
    hoja.addRow(['Marca', 'Otra cosa']);
    roto.addWorksheet('meta').getCell('B1').value = VERSION_PLANTILLA_PRODUCTOS;
    await expect(leerLibroProductos((await roto.xlsx.writeBuffer()) as ArrayBuffer)).rejects.toThrow(/encabezados/);
  });

  it('rechaza un archivo que no es un Excel y uno de más de 5 MB', async () => {
    await expect(leerLibroProductos(new TextEncoder().encode('no soy un excel').buffer as ArrayBuffer)).rejects.toThrow(/No se pudo abrir/);
    await expect(leerLibroProductos(new ArrayBuffer(5 * 1024 * 1024 + 1))).rejects.toThrow(/5 MB/);
  });
});
