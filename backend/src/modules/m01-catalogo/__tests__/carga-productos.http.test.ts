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

  describe('previsualizar y aplicar', () => {
    const nombre = `Producto de carga ${Date.now()}`;
    const fila = (cambios: Record<string, unknown> = {}) => ({
      fila: 2,
      marca: 'pintuco',
      linea: 'Viniltex',
      categoria: 'Pinturas',
      subcategoria: 'Vinilos para muros',
      producto: nombre,
      descripcion: 'Creado por la carga masiva',
      usoInterior: true,
      usoExterior: false,
      medida: '1 galón',
      sku: null,
      precio: 98900,
      codigoProveedor: null,
      superficies: [],
      acabados: ['Mate'],
      bases: [],
      coloresFabrica: [],
      caracteristicas: [{ nombre: 'Secado', valor: '2 horas' }],
      tipoResina: 'Base agua',
      tipoCalidad: null,
      rendimientoMin: null,
      rendimientoMax: null,
      manos: null,
      ...cambios,
    });
    const cuerpo = { filas: [fila(), fila({ fila: 3, medida: '1/4 de galón', precio: 35900 })] };
    const buscar = async (texto: string) =>
      (await servidor.peticion('admin', 'GET', `/productos?busqueda=${encodeURIComponent(texto)}`)).cuerpo as { data: unknown[] };

    it('la vista previa lista el producto con sus variantes y no escribe nada', async () => {
      const r = await servidor.peticion('admin', 'POST', '/productos/importar/previsualizar', cuerpo);
      expect(r.status).toBe(200);
      const datos = (
        r.cuerpo as {
          data: { aplicada: boolean; balance: { productosNuevos: number; variantesNuevas: number }; productos: Array<{ resultado: string }> };
        }
      ).data;
      expect(datos.aplicada).toBe(false);
      expect(datos.balance).toMatchObject({ productosNuevos: 1, variantesNuevas: 2 });
      expect(datos.productos[0]?.resultado).toBe('por_crear');
      expect((await buscar(nombre)).data).toHaveLength(0);
    });

    it('aplicar crea el producto sin publicar, con SKU generado y existencia 0; repetirlo lo deja como ya existente', async () => {
      const r = await servidor.peticion('admin', 'POST', '/productos/importar/aplicar', cuerpo);
      expect(r.status).toBe(200);
      const creado = (r.cuerpo as { data: { productos: Array<{ resultado: string; idProducto: number }> } }).data.productos[0];
      expect(creado?.resultado).toBe('creado');

      const detalle = (await servidor.peticion('admin', 'GET', `/productos/${creado?.idProducto}`)).cuerpo as {
        data: {
          publicado: boolean;
          estado: string;
          ficha: unknown;
          caracteristicas: Array<{ nombre: string; valor: string }>;
          acabados: Array<{ nombre: string }>;
          variantes: Array<{ sku: string; existenciaReferencial: number }>;
        };
      };
      expect(detalle.data.publicado).toBe(false);
      expect(detalle.data.estado).toBe('activo');
      expect(detalle.data.ficha).not.toBeNull();
      expect(detalle.data.caracteristicas).toMatchObject([{ nombre: 'Secado', valor: '2 horas' }]);
      expect(detalle.data.acabados.map((a) => a.nombre)).toEqual(['Mate']);
      expect(detalle.data.variantes).toHaveLength(2);
      for (const v of detalle.data.variantes) {
        expect(v.existenciaReferencial).toBe(0);
        expect(v.sku).toMatch(new RegExp(`^P${creado?.idProducto}-V\\d+$`));
      }

      const otra = await servidor.peticion('admin', 'POST', '/productos/importar/aplicar', cuerpo);
      expect((otra.cuerpo as { data: { productos: Array<{ resultado: string }> } }).data.productos[0]?.resultado).toBe('ya_existe');
      expect((await buscar(nombre)).data).toHaveLength(1);
    });

    it('un producto con un error no se crea a medias', async () => {
      const malo = `${nombre} malo`;
      const r = await servidor.peticion('admin', 'POST', '/productos/importar/aplicar', {
        filas: [fila({ producto: malo }), fila({ producto: malo, fila: 3, medida: 'medida que no existe' })],
      });
      const producto = (r.cuerpo as { data: { productos: Array<{ resultado: string; motivo: string }> } }).data.productos[0];
      expect(producto).toMatchObject({ resultado: 'rechazado', motivo: 'producto_rechazado' });
      expect((await buscar(malo)).data).toHaveLength(0);
    });

    it('sin permiso de crear, sin sesión o un cliente: 404; un cuerpo mal formado: 400', async () => {
      for (const actor of ['lector', null, 'cliente'] as const) {
        expect((await servidor.peticion(actor, 'POST', '/productos/importar/previsualizar', cuerpo)).status).toBe(404);
        expect((await servidor.peticion(actor, 'POST', '/productos/importar/aplicar', cuerpo)).status).toBe(404);
      }
      expect((await servidor.peticion('admin', 'POST', '/productos/importar/aplicar', { filas: [] })).status).toBe(400);
    });
  });
});
