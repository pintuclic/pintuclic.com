import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { COLUMNAS_PLANTILLA_PRODUCTOS, VERSION_PLANTILLA_PRODUCTOS } from '../dtos/m01-catalogo-carga-masiva.dto';
import {
  construirPlantillaProductos,
  HOJA_CATALOGOS,
  HOJA_COLORES,
  HOJA_INSTRUCCIONES,
  HOJA_META,
  HOJA_PRODUCTOS,
  type CatalogosPlantilla,
} from '../services/plantilla-productos';

const CATALOGOS: CatalogosPlantilla = {
  marcas: ['Pintuco', 'Sika'],
  lineas: [
    { marca: 'Pintuco', nombre: 'Viniltex' },
    { marca: 'Sika', nombre: 'Viniltex' },
    { marca: 'Pintuco', nombre: 'Koraza' },
  ],
  categorias: ['Pinturas', 'Ferretería'],
  subcategorias: [
    { categoria: 'Pinturas', nombre: 'Vinilos' },
    { categoria: 'Ferretería', nombre: 'Brochas' },
  ],
  medidas: [
    { tipo: 'Volumen', nombre: 'Galón' },
    { tipo: 'Volumen', nombre: 'Cuarto' },
  ],
  superficies: ['Muros', 'Madera'],
  acabados: ['Mate', 'Brillante'],
  bases: ['Pastel', 'Intermedia'],
  tiposResina: ['Acrílica'],
  colores: [
    { marca: 'Pintuco', nombre: 'Rojo Colonial' },
    { marca: 'Pintuco', nombre: '=SUMA(1;1)' },
  ],
};

async function abrir(): Promise<ExcelJS.Workbook> {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load((await construirPlantillaProductos(CATALOGOS)) as unknown as ExcelJS.Buffer);
  return libro;
}

describe('plantilla de la carga masiva de productos · D3', () => {
  it('trae las hojas esperadas y la de versión oculta', async () => {
    const libro = await abrir();
    expect(libro.worksheets.map((h) => h.name)).toEqual([HOJA_INSTRUCCIONES, HOJA_PRODUCTOS, HOJA_CATALOGOS, HOJA_COLORES, HOJA_META]);
    const meta = libro.getWorksheet(HOJA_META);
    expect(meta?.state).toBe('hidden');
    expect(meta?.getCell('B1').value).toBe(VERSION_PLANTILLA_PRODUCTOS);
  });

  it('la hoja «Productos» lleva los encabezados del contrato, en su orden', async () => {
    const hoja = (await abrir()).getWorksheet(HOJA_PRODUCTOS);
    const encabezados = COLUMNAS_PLANTILLA_PRODUCTOS.map((_, i) => String(hoja?.getCell(1, i + 1).value));
    expect(encabezados).toEqual([...COLUMNAS_PLANTILLA_PRODUCTOS]);
    expect(hoja?.getCell(2, 1).value).toBeNull();
  });

  it('los catálogos salen de la base de datos, ordenados y sin repetir', async () => {
    const hoja = (await abrir()).getWorksheet(HOJA_CATALOGOS);
    const columna = (n: number) =>
      Array.from({ length: 10 }, (_, i) => hoja?.getCell(i + 2, n).value).filter((v) => v !== null && v !== undefined);
    expect(columna(1)).toEqual(['Pintuco', 'Sika']);
    // «Viniltex» existe en dos marcas pero la lista de nombres no lo repite.
    expect(columna(2)).toEqual(['Koraza', 'Viniltex']);
    expect(columna(3)).toEqual(['Pintuco › Koraza', 'Pintuco › Viniltex', 'Sika › Viniltex']);
    expect(columna(7)).toEqual(['Cuarto', 'Galón']);
    expect(columna(8)).toEqual(['Volumen › Cuarto', 'Volumen › Galón']);
  });

  it('las columnas que se eligen de un catálogo tienen lista desplegable apuntando a su hoja', async () => {
    const hoja = (await abrir()).getWorksheet(HOJA_PRODUCTOS);
    const validacion = (col: string) => hoja?.getCell(`${col}2`).dataValidation;
    expect(validacion('A')).toMatchObject({ type: 'list', formulae: [`'${HOJA_CATALOGOS}'!$A$2:$A$3`] });
    expect(validacion('G')).toMatchObject({ type: 'list', formulae: ['"Sí,No"'] });
    // La última fila con listas es la 2001: el máximo de filas de un archivo más el encabezado.
    expect(hoja?.getCell('A2001').dataValidation).toMatchObject({ type: 'list' });
    expect(hoja?.getCell('A2002').dataValidation).toBeUndefined();
  });

  it('superficies, acabados, bases y colores de fábrica tienen lista y no bloquean varios valores con «;»', async () => {
    const hoja = (await abrir()).getWorksheet(HOJA_PRODUCTOS);
    const col = (titulo: (typeof COLUMNAS_PLANTILLA_PRODUCTOS)[number]) =>
      hoja?.getCell(2, COLUMNAS_PLANTILLA_PRODUCTOS.indexOf(titulo) + 1).dataValidation;
    expect(col('Superficies')).toMatchObject({ type: 'list', formulae: [`'${HOJA_CATALOGOS}'!$J$2:$J$3`], errorStyle: 'information' });
    expect(col('Acabados')).toMatchObject({ type: 'list', formulae: [`'${HOJA_CATALOGOS}'!$K$2:$K$3`], errorStyle: 'information' });
    expect(col('Bases')).toMatchObject({ type: 'list', formulae: [`'${HOJA_CATALOGOS}'!$L$2:$L$3`], errorStyle: 'information' });
    expect(col('Colores de fábrica')).toMatchObject({ type: 'list', formulae: [`'${HOJA_COLORES}'!$B$2:$B$3`], errorStyle: 'information' });
  });

  it('C10: un nombre de catálogo que parece fórmula se neutraliza', async () => {
    const hoja = (await abrir()).getWorksheet(HOJA_COLORES);
    const nombres = [hoja?.getCell('B2').value, hoja?.getCell('B3').value];
    expect(nombres).toContain("'=SUMA(1;1)");
    expect(nombres).not.toContain('=SUMA(1;1)');
  });

  it('con un catálogo vacío no inventa listas desplegables', async () => {
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(
      (await construirPlantillaProductos({ ...CATALOGOS, marcas: [], tiposResina: [] })) as unknown as ExcelJS.Buffer,
    );
    const hoja = libro.getWorksheet(HOJA_PRODUCTOS);
    expect(hoja?.getCell('A2').dataValidation).toBeUndefined();
    expect(hoja?.getCell('U2').dataValidation).toBeUndefined();
  });
});
