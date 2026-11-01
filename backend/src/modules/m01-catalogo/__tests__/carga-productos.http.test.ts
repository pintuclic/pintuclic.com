import ExcelJS from 'exceljs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { COLUMNAS_PLANTILLA_PRODUCTOS } from '../dtos/m01-catalogo-carga-masiva.dto';
import type { ServidorPrueba } from './helpers/servidor-prueba';

/**
 * Carga masiva de productos · plantilla (D3) contra PostgreSQL real, por HTTP.
 * Se activa con `M01_TEST_DATABASE_URL`; sin ella se omite (CI sin base de datos).
 */
const URL_BD = process.env.M01_TEST_DATABASE_URL;
const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

describe.skipIf(URL_BD === undefined)('M01 · carga masiva de productos: plantilla (HTTP + PostgreSQL)', () => {
  let servidor: ServidorPrueba;
  const auditoria = { registrarAccesoDenegado: vi.fn() };

  const pedir = (actor: string | null) =>
    fetch(`${servidor.baseUrl}/api/v1/admin/catalogo/productos/importar/plantilla`, {
      headers: actor === null ? {} : { 'x-actor': actor },
    });

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_BD ?? '';
    const { levantarServidor } = await import('./helpers/servidor-prueba.js');
    servidor = await levantarServidor(auditoria);
  });

  afterAll(async () => {
    await servidor.cerrar();
  });

  it('quien puede crear descarga un libro de Excel con los catálogos reales de la base de datos', async () => {
    const r = await pedir('admin');
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe(TIPO_XLSX);
    expect(r.headers.get('content-disposition')).toContain('plantilla-productos.xlsx');

    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load((Buffer.from(await r.arrayBuffer())) as unknown as ExcelJS.Buffer);
    const productos = libro.getWorksheet('Productos');
    expect(COLUMNAS_PLANTILLA_PRODUCTOS.map((_, i) => String(productos?.getCell(1, i + 1).value))).toEqual([
      ...COLUMNAS_PLANTILLA_PRODUCTOS,
    ]);
    // El seed trae marcas y acabados activos: salen en la hoja de catálogos.
    const catalogos = libro.getWorksheet('Catálogos');
    expect(String(catalogos?.getCell('A2').value)).not.toBe('null');
    expect(catalogos?.getCell('A2').value).toBeTruthy();
    expect(catalogos?.getCell('K2').value).toBeTruthy();
  });

  it('sin permiso de crear (solo lector), sin sesión o un cliente: 404 opaco', async () => {
    for (const actor of ['lector', null, 'cliente']) {
      const r = await pedir(actor);
      expect(r.status).toBe(404);
      expect(r.headers.get('content-type')).toContain('application/json');
    }
  });
});
