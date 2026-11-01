import { describe, expect, it } from 'vitest';
import type { FilaProductoCarga } from '../dtos/m01-catalogo-carga-masiva.dto';
import type {
  CargaProductosRepositoryPort,
  CatalogosCarga,
  ColorCarga,
  ProductoCargaDatos,
  ProductoExistenteCarga,
  VarianteNuevaDatos,
} from '../interfaces/carga-productos.interface';
import { CargaProductosService, normalizar } from '../services/carga-productos.service';

const CATALOGOS: CatalogosCarga = {
  marcas: [
    { id: 1, nombre: 'Pintuco', activo: true },
    { id: 2, nombre: 'Sika', activo: true },
    { id: 3, nombre: 'Marca dormida', activo: false },
  ],
  lineas: [
    { id: 10, idMarca: 1, nombre: 'Viniltex', activo: true },
    { id: 11, idMarca: 2, nombre: 'Sikalastic', activo: true },
    { id: 12, idMarca: 1, nombre: 'Linea dormida', activo: false },
  ],
  categorias: [{ id: 100, nombre: 'Pinturas', activo: true }],
  subcategorias: [{ id: 1000, idCategoria: 100, nombre: 'Vinilos', activo: true }],
  medidas: [
    { id: 5, nombre: 'Galón', activo: true },
    { id: 6, nombre: 'Cuarto', activo: true },
    { id: 7, nombre: 'Medida dormida', activo: false },
  ],
  superficies: [{ id: 20, nombre: 'Muros', activo: true }],
  acabados: [{ id: 30, nombre: 'Mate', activo: true }],
  bases: [{ id: 40, nombre: 'Pastel', activo: true }],
  tiposResina: [{ id: 50, nombre: 'Acrílica', activo: true }],
};
const COLORES: ColorCarga[] = [{ id: 60, idMarca: 1, nombre: 'Rojo Colonial', activo: true }];

class RepoMemoria implements CargaProductosRepositoryPort {
  creados: Array<{ producto: ProductoCargaDatos; variantes: readonly VarianteNuevaDatos[] }> = [];
  productos: ProductoExistenteCarga[] = [];
  skus = new Set<string>();
  fallarConUnico = false;
  leerCatalogos = async (): Promise<CatalogosCarga> => CATALOGOS;
  leerColores = async (): Promise<ColorCarga[]> => COLORES;
  productosDeMarcas = async (): Promise<ProductoExistenteCarga[]> => this.productos;
  skusExistentes = async (): Promise<Set<string>> => this.skus;
  codigosProveedorExistentes = async (): Promise<Set<string>> => new Set();
  crearProductoConVariantes = async (producto: ProductoCargaDatos, variantes: readonly VarianteNuevaDatos[]): Promise<number> => {
    if (this.fallarConUnico) throw Object.assign(new Error('unique'), { code: 'P2002' });
    this.creados.push({ producto, variantes });
    return 900 + this.creados.length;
  };
}

let numero = 2;
function fila(cambios: Partial<FilaProductoCarga> = {}): FilaProductoCarga {
  return {
    fila: numero++,
    marca: 'Pintuco',
    linea: null,
    categoria: 'Pinturas',
    subcategoria: 'Vinilos',
    producto: 'Viniltex Advanced',
    descripcion: null,
    usoInterior: true,
    usoExterior: false,
    medida: 'Galón',
    sku: null,
    precio: 98900,
    codigoProveedor: null,
    superficies: [],
    acabados: [],
    bases: [],
    coloresFabrica: [],
    caracteristicas: [],
    tipoResina: null,
    tipoCalidad: null,
    rendimientoMin: null,
    rendimientoMax: null,
    manos: null,
    ...cambios,
  };
}

const servicio = (repo = new RepoMemoria()) => ({ repo, servicio: new CargaProductosService(repo) });

describe('carga masiva de productos · servicio', () => {
  it('normaliza sin tildes, mayúsculas ni espacios sobrantes', () => {
    expect(normalizar('  Galón   GRANDE ')).toBe('galon grande');
  });

  it('C2: las filas del mismo producto forman uno solo con sus variantes, y la vista previa no escribe (C7)', async () => {
    const { repo, servicio: s } = servicio();
    const r = await s.previsualizar({
      filas: [fila(), fila({ medida: 'cuarto', precio: 35900, producto: 'VINILTEX advanced' })],
    });
    expect(r.aplicada).toBe(false);
    expect(r.productos).toHaveLength(1);
    expect(r.productos[0]).toMatchObject({ resultado: 'por_crear', motivo: null });
    expect(r.productos[0]?.variantes.map((v) => v.resultado)).toEqual(['por_crear', 'por_crear']);
    expect(r.balance).toMatchObject({ productos: 1, productosNuevos: 1, variantes: 2, variantesNuevas: 2 });
    expect(repo.creados).toHaveLength(0);
  });

  it('C5 / C6: aplicar crea el producto con todas sus variantes y marca el resultado', async () => {
    const { repo, servicio: s } = servicio();
    const r = await s.aplicar({ filas: [fila({ sku: 'VA-G' }), fila({ medida: 'Cuarto' })] });
    expect(r.aplicada).toBe(true);
    expect(r.productos[0]).toMatchObject({ resultado: 'creado', idProducto: 901 });
    expect(r.productos[0]?.variantes.map((v) => v.resultado)).toEqual(['creada', 'creada']);
    expect(repo.creados[0]?.variantes).toEqual([
      { idMedida: 5, precio: 98900, sku: 'VA-G', codigoProveedor: null },
      { idMedida: 6, precio: 98900, sku: null, codigoProveedor: null },
    ]);
  });

  it('C3: un producto que ya existe se reporta y no se crea ni se le agregan variantes', async () => {
    const { repo, servicio: s } = servicio();
    repo.productos = [{ idProducto: 7, idMarca: 1, nombre: 'viniltex ADVANCED' }];
    const r = await s.aplicar({ filas: [fila()] });
    expect(r.productos[0]).toMatchObject({ resultado: 'ya_existe', idProducto: 7 });
    expect(r.balance).toMatchObject({ productosYaExisten: 1, productosNuevos: 0, variantesRechazadas: 1 });
    expect(repo.creados).toHaveLength(0);
  });

  it('C9: una medida que no existe rechaza el producto con su motivo y el resto sigue', async () => {
    const { repo, servicio: s } = servicio();
    const r = await s.aplicar({ filas: [fila({ medida: 'Medida fantasma' }), fila({ producto: 'Otro' })] });
    expect(r.productos.map((p) => p.resultado)).toEqual(['rechazado', 'creado']);
    expect(r.productos[0]?.variantes[0]).toMatchObject({ motivo: 'medida_no_encontrada' });
    expect(r.productos[0]?.variantes[0]?.detalle).toContain('Medida fantasma');
    expect(repo.creados).toHaveLength(1);
  });

  it('P2 / P3: recubrimiento sin línea, acabados sin ficha y bases sin acabado se rechazan', async () => {
    const { servicio: s } = servicio();
    const r = await s.previsualizar({
      filas: [
        fila({ producto: 'A', tipoResina: 'Acrílica' }),
        fila({ producto: 'B', acabados: ['Mate'] }),
        fila({ producto: 'C', linea: 'Viniltex', tipoResina: 'Acrílica', bases: ['Pastel'] }),
      ],
    });
    expect(r.productos.map((p) => p.motivo)).toEqual(['recubrimiento_sin_linea', 'acabados_sin_ficha', 'bases_sin_acabado']);
  });

  it('un recubrimiento completo con línea, acabados, bases, colores y características se acepta', async () => {
    const { repo, servicio: s } = servicio();
    const r = await s.aplicar({
      filas: [
        fila({
          linea: 'Viniltex',
          tipoResina: 'Acrílica',
          tipoCalidad: 1,
          rendimientoMin: 30,
          rendimientoMax: 40,
          manos: 2,
          superficies: ['Muros'],
          acabados: ['Mate'],
          bases: ['Pastel'],
          coloresFabrica: ['rojo colonial'],
          caracteristicas: [{ nombre: 'Secado', valor: '2 horas' }],
        }),
      ],
    });
    expect(r.productos[0]).toMatchObject({ resultado: 'creado' });
    expect(repo.creados[0]?.producto).toMatchObject({
      marca: { id: 1 },
      linea: { id: 10 },
      subcategoria: { id: 1000 },
      ficha: { tipoResina: { id: 50 }, tipoCalidad: 1, rendimientoMin: 30, rendimientoMax: 40, manos: 2 },
      superficies: [{ id: 20 }],
      acabados: [{ id: 30 }],
      bases: [{ id: 40 }],
      idsColoresFabrica: [60],
      caracteristicas: [{ nombre: 'Secado', valor: '2 horas', orden: 0 }],
    });
  });

  it('C2: datos del producto distintos entre sus filas rechazan el producto', async () => {
    const { servicio: s } = servicio();
    const r = await s.previsualizar({ filas: [fila({ descripcion: 'uno' }), fila({ medida: 'Cuarto', descripcion: 'dos' })] });
    expect(r.productos[0]).toMatchObject({ resultado: 'rechazado', motivo: 'datos_del_producto_distintos' });
  });

  it('C5: una variante con error rechaza todo el producto, cada fila con su motivo', async () => {
    const { repo, servicio: s } = servicio();
    const r = await s.aplicar({ filas: [fila(), fila({ medida: 'Litro raro' })] });
    expect(r.productos[0]).toMatchObject({ resultado: 'rechazado', motivo: 'producto_rechazado' });
    expect(r.productos[0]?.variantes.map((v) => v.motivo)).toEqual(['producto_rechazado', 'medida_no_encontrada']);
    expect(repo.creados).toHaveLength(0);
  });

  it('SKU repetido en el archivo y SKU que ya existe', async () => {
    const { repo, servicio: s } = servicio();
    repo.skus = new Set(['ya-esta']);
    const r = await s.previsualizar({
      filas: [
        fila({ producto: 'A', sku: 'X-1' }),
        fila({ producto: 'B', sku: 'x-1' }),
        fila({ producto: 'C', sku: 'YA-ESTA' }),
      ],
    });
    expect(r.productos.map((p) => p.resultado)).toEqual(['por_crear', 'rechazado', 'rechazado']);
    expect(r.productos[1]?.variantes[0]?.motivo).toBe('sku_repetido_en_archivo');
    expect(r.productos[2]?.variantes[0]?.motivo).toBe('sku_ya_existe');
  });

  it('la misma medida dos veces en un producto se rechaza', async () => {
    const { servicio: s } = servicio();
    const r = await s.previsualizar({ filas: [fila(), fila()] });
    expect(r.productos[0]?.variantes[1]?.motivo).toBe('variante_repetida_en_archivo');
  });

  it('C7: si otra persona se adelantó (índice único) solo ese producto se rechaza', async () => {
    const { repo, servicio: s } = servicio();
    repo.fallarConUnico = true;
    const r = await s.aplicar({ filas: [fila()] });
    expect(r.productos[0]).toMatchObject({ resultado: 'rechazado', motivo: 'producto_rechazado' });
    expect(r.balance.productosRechazados).toBe(1);
  });

  describe('C16 · lo que no existe en el catálogo se crea con el producto', () => {
    it('anuncia en la vista previa la marca, línea, categoría y subcategoría nuevas, y no escribe', async () => {
      const { repo, servicio: s } = servicio();
      const r = await s.previsualizar({
        filas: [fila({ marca: 'Marca nueva', linea: 'Línea nueva', categoria: 'Categoría nueva', subcategoria: 'Sub nueva' })],
      });
      expect(r.productos[0]).toMatchObject({ resultado: 'por_crear' });
      expect(r.productos[0]?.nuevos).toEqual([
        { tipo: 'marca', nombre: 'Marca nueva' },
        { tipo: 'linea', nombre: 'Línea nueva' },
        { tipo: 'categoria', nombre: 'Categoría nueva' },
        { tipo: 'subcategoria', nombre: 'Sub nueva' },
      ]);
      expect(repo.creados).toHaveLength(0);
    });

    it('aplicar entrega al repositorio el nombre de lo nuevo y el id de lo que ya existe', async () => {
      const { repo, servicio: s } = servicio();
      const r = await s.aplicar({
        filas: [
          fila({
            linea: 'Línea nueva',
            subcategoria: 'Sub nueva',
            tipoResina: 'Resina nueva',
            superficies: ['Muros', 'Superficie nueva'],
            acabados: ['Acabado nuevo'],
            bases: ['Base nueva'],
          }),
        ],
      });
      expect(r.productos[0]).toMatchObject({ resultado: 'creado' });
      expect(repo.creados[0]?.producto).toMatchObject({
        marca: { id: 1 },
        linea: { nuevo: 'Línea nueva' },
        categoria: { id: 100 },
        subcategoria: { nuevo: 'Sub nueva' },
        ficha: { tipoResina: { nuevo: 'Resina nueva' } },
        superficies: [{ id: 20 }, { nuevo: 'Superficie nueva' }],
        acabados: [{ nuevo: 'Acabado nuevo' }],
        bases: [{ nuevo: 'Base nueva' }],
      });
    });

    it('un nombre nuevo repetido en otros productos del archivo se anuncia una vez y conserva la primera grafía', async () => {
      const { repo, servicio: s } = servicio();
      const r = await s.aplicar({
        filas: [
          fila({ producto: 'A', marca: 'Marca Nueva', linea: 'Línea X' }),
          fila({ producto: 'B', marca: 'MARCA NUEVA', linea: 'linea x' }),
        ],
      });
      expect(r.productos.map((p) => p.resultado)).toEqual(['creado', 'creado']);
      expect(r.productos[0]?.nuevos.map((n) => n.tipo)).toEqual(['marca', 'linea']);
      expect(r.productos[1]?.nuevos).toEqual([]);
      expect(repo.creados[1]?.producto).toMatchObject({ marca: { nuevo: 'Marca Nueva' }, linea: { nuevo: 'Línea X' } });
    });

    it('la misma línea en otra marca no estorba: se crea para esta marca', async () => {
      const { servicio: s } = servicio();
      const r = await s.previsualizar({ filas: [fila({ linea: 'Sikalastic' })] });
      expect(r.productos[0]).toMatchObject({ resultado: 'por_crear', nuevos: [{ tipo: 'linea', nombre: 'Sikalastic' }] });
    });

    it('un registro inactivo no se duplica: la fila se rechaza y se dice que está inactivo', async () => {
      const { servicio: s } = servicio();
      const r = await s.previsualizar({
        filas: [
          fila({ producto: 'A', marca: 'Marca dormida' }),
          fila({ producto: 'B', linea: 'Linea dormida' }),
          fila({ producto: 'C', medida: 'Medida dormida' }),
        ],
      });
      expect(r.productos.map((p) => p.resultado)).toEqual(['rechazado', 'rechazado', 'rechazado']);
      expect(r.productos[0]?.motivo).toBe('marca_no_encontrada');
      expect(r.productos[0]?.detalle).toContain('inactivo');
      expect(r.productos[1]?.motivo).toBe('linea_no_encontrada');
      expect(r.productos[2]?.variantes[0]?.detalle).toContain('inactivo');
    });

    it('no crea medidas ni colores, y una marca nueva no puede traer colores de fábrica', async () => {
      const { servicio: s } = servicio();
      const r = await s.previsualizar({
        filas: [
          fila({ producto: 'A', medida: 'Medida nueva' }),
          fila({ producto: 'B', linea: 'Viniltex', tipoResina: 'Acrílica', coloresFabrica: ['Color nuevo'] }),
          fila({ producto: 'C', marca: 'Marca nueva', linea: 'L', tipoResina: 'Acrílica', coloresFabrica: ['Rojo Colonial'] }),
        ],
      });
      expect(r.productos.map((p) => p.resultado)).toEqual(['rechazado', 'rechazado', 'rechazado']);
      expect(r.productos[0]?.variantes[0]?.motivo).toBe('medida_no_encontrada');
      expect(r.productos[1]?.motivo).toBe('color_no_encontrado');
      expect(r.productos[2]?.motivo).toBe('color_no_encontrado');
    });

    it('un nombre nuevo más largo que la columna se rechaza en vez de fallar al escribir', async () => {
      const { servicio: s } = servicio();
      const r = await s.previsualizar({ filas: [fila({ tipoResina: 'R'.repeat(101), linea: 'Viniltex' }), fila({ producto: 'B', acabados: ['A'.repeat(51)] })] });
      expect(r.productos[0]).toMatchObject({ resultado: 'rechazado', motivo: 'dato_invalido' });
      expect(r.productos[1]).toMatchObject({ resultado: 'rechazado', motivo: 'dato_invalido' });
    });

    it('un producto rechazado por otra razón no anuncia ni reserva nada', async () => {
      const { servicio: s } = servicio();
      const r = await s.previsualizar({
        filas: [
          fila({ producto: 'A', marca: 'Marca nueva', medida: 'Medida fantasma' }),
          fila({ producto: 'B', marca: 'Marca nueva' }),
        ],
      });
      expect(r.productos[0]).toMatchObject({ resultado: 'rechazado', nuevos: [] });
      expect(r.productos[1]?.nuevos).toEqual([{ tipo: 'marca', nombre: 'Marca nueva' }]);
    });
  });
});
