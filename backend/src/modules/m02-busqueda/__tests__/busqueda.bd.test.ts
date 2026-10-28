import { beforeAll, describe, expect, it } from 'vitest';
import type { BuscarProductosRequest, ResultadoBusqueda } from '../dtos/m02-busqueda.dto';
import type { BusquedaRepository } from '../repositories/busqueda.repository';

/**
 * M02 contra PostgreSQL real con el catálogo del seed: tolerancia a errores (B11–B14), color por la carta (B7) y color
 * de muestra (T1–T3), comparado con la carta que muestra la ficha de M01 (P5). Se activa con `M01_TEST_DATABASE_URL`,
 * como M01, M05 y M06; sin ella se omite (CI sin base de datos).
 */
const URL_BD = process.env.M01_TEST_DATABASE_URL;

describe.skipIf(URL_BD === undefined)('M02 · búsqueda (PostgreSQL real)', () => {
  let repo: BusquedaRepository;
  let cartaDeLaFicha: (
    idProducto: number,
    idFamiliaColor?: number,
  ) => Promise<{ primero: { idColor: number; nombre: string; hexadecimal: string } | null; total: number }>;

  const buscar = async (cambios: Partial<BuscarProductosRequest> = {}): Promise<readonly ResultadoBusqueda[]> =>
    (await repo.buscarProductos({ ordenar: 'relevancia', pagina: 1, limite: 48, ...cambios }, { idUsuario: null })).items;
  const nombres = (lista: readonly ResultadoBusqueda[]): string[] => lista.map((p) => p.nombre);

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_BD ?? '';
    const { BusquedaRepository: Repositorio } = await import('../repositories/busqueda.repository.js');
    const { consultarColoresOfrecidos } = await import('../../m01-catalogo/repositories/productos.repository.js');
    repo = new Repositorio();
    cartaDeLaFicha = async (idProducto, idFamiliaColor) => {
      const carta = await consultarColoresOfrecidos(idProducto, {
        pagina: 1,
        limite: 1,
        ...(idFamiliaColor === undefined ? {} : { idFamiliaColor }),
      });
      const primero = carta?.items[0];
      return {
        primero:
          primero === undefined
            ? null
            : { idColor: primero.idColor, nombre: primero.nombre, hexadecimal: primero.hexadecimal.trim() },
        total: carta?.total ?? 0,
      };
    };
  });

  it('encuentra con errores de escritura, plurales y sin acentos', async () => {
    expect(nombres(await buscar({ q: 'vinilex' }))).toContain('Viniltex Ultralavable');
    expect(nombres(await buscar({ q: 'brochas' }))).toContain('Brocha de cerda natural');
    expect(nombres(await buscar({ q: 'BARNIS' }))).toContain('Barniz Transparente');
    expect(nombres(await buscar({ q: 'pintulux' }))[0]).toBe('Pintulux 3 en 1');
  });

  it('cada palabra debe coincidir con algo, y no trae resultados sin relación', async () => {
    expect(await buscar({ q: 'qwxz zzkk' })).toEqual([]);
    expect(nombres(await buscar({ q: 'brocha viniltex' }))).toEqual([]);
  });

  it('escrito bien pesa más que con errores', async () => {
    const [primero] = await buscar({ q: 'koraza' });
    expect(primero?.nombre).toBe('Koraza Sol & Lluvia');
  });

  it('el color de muestra es el primero de la carta de la ficha y cuenta sus colores; sin color, null (T1, T2, T4)', async () => {
    const todos = await buscar();
    expect(todos.length).toBeGreaterThan(0);
    for (const p of todos) {
      const carta = p.tieneColor ? await cartaDeLaFicha(p.idProducto) : { primero: null, total: 0 };
      expect({ producto: p.nombre, color: p.colorMuestra, total: p.totalColores }).toEqual({
        producto: p.nombre,
        color: carta.primero,
        total: carta.total,
      });
    }
    expect(todos.find((p) => p.nombre === 'Brocha de cerda natural')?.colorMuestra).toBeNull();
  });

  it('con filtro de familia, la muestra es el primer color de esa familia (T2)', async () => {
    const opciones = await repo.obtenerOpcionesFiltro({}, { idUsuario: null });
    const familia = opciones.familiasColor[0];
    expect(familia).toBeDefined();
    if (familia === undefined) return;
    const lista = await buscar({ idFamiliaColor: [familia.id] });
    expect(lista.length).toBe(familia.total);
    for (const p of lista) {
      expect(p.colorMuestra).toEqual((await cartaDeLaFicha(p.idProducto, familia.id)).primero);
    }
  });

  it('buscar un color de la carta trae ese color como muestra (B7, T2)', async () => {
    const conColor = (await buscar()).find((p) => p.colorMuestra !== null);
    if (conColor?.colorMuestra == null) return;
    const palabra = conColor.colorMuestra.nombre.split(' ')[0] ?? '';
    const lista = await buscar({ q: palabra });
    const mismo = lista.find((p) => p.idProducto === conColor.idProducto);
    expect(mismo?.coincidenciaColor).not.toBeNull();
    expect(mismo?.colorMuestra?.nombre.toLowerCase()).toContain(palabra.toLowerCase());
  });
});
