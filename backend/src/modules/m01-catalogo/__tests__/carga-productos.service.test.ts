import { describe, expect, it } from 'vitest';
import type { FilaProductoCarga } from '../dtos/m01-catalogo-carga-masiva.dto';
import type {
  CargaProductosRepositoryPort,
  CatalogosCarga,
  ColorCarga,
  ProductoExistenteCarga,
  VarianteNuevaDatos,
} from '../interfaces/carga-productos.interface';
import type { CrearProductoDatos } from '../interfaces/productos.interface';
import { CargaProductosService, normalizar } from '../services/carga-productos.service';

const CATALOGOS: CatalogosCarga = {
  marcas: [
    { id: 1, nombre: 'Pintuco' },
    { id: 2, nombre: 'Sika' },
  ],
  lineas: [
    { id: 10, idMarca: 1, nombre: 'Viniltex' },
    { id: 11, idMarca: 2, nombre: 'Sikalastic' },
  ],
  categorias: [{ id: 100, nombre: 'Pinturas' }],
  subcategorias: [{ id: 1000, idCategoria: 100, nombre: 'Vinilos' }],
  medidas: [
    { id: 5, nombre: 'Galón' },
    { id: 6, nombre: 'Cuarto' },
  ],
  superficies: [{ id: 20, nombre: 'Muros' }],
  acabados: [{ id: 30, nombre: 'Mate' }],
  bases: [{ id: 40, nombre: 'Pastel' }],
  tiposResina: [{ id: 50, nombre: 'Acrílica' }],
};
const COLORES: ColorCarga[] = [{ id: 60, idMarca: 1, nombre: 'Rojo Colonial' }];

class RepoMemoria implements CargaProductosRepositoryPort {
  creados: Array<{ producto: CrearProductoDatos; variantes: readonly VarianteNuevaDatos[] }> = [];
  productos: ProductoExistenteCarga[] = [];
  skus = new Set<string>();
  fallarConUnico = false;
  leerCatalogos = async (): Promise<CatalogosCarga> => CATALOGOS;
  leerColores = async (): Promise<ColorCarga[]> => COLORES;
  productosDeMarcas = async (): Promise<ProductoExistenteCarga[]> => this.productos;
  skusExistentes = async (): Promise<Set<string>> => this.skus;
  codigosProveedorExistentes = async (): Promise<Set<string>> => new Set();
  crearProductoConVariantes = async (producto: CrearProductoDatos, variantes: readonly VarianteNuevaDatos[]): Promise<number> => {
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

  it('C9: un nombre que no existe rechaza el producto con su motivo y el resto sigue', async () => {
    const { repo, servicio: s } = servicio();
    const r = await s.aplicar({ filas: [fila({ marca: 'Marca fantasma' }), fila({ producto: 'Otro' })] });
    expect(r.productos.map((p) => p.resultado)).toEqual(['rechazado', 'creado']);
    expect(r.productos[0]).toMatchObject({ motivo: 'marca_no_encontrada' });
    expect(r.productos[0]?.detalle).toContain('Marca fantasma');
    expect(repo.creados).toHaveLength(1);
  });

  it('P1: una línea de otra marca se rechaza con su motivo', async () => {
    const { servicio: s } = servicio();
    const r = await s.previsualizar({ filas: [fila({ linea: 'Sikalastic' })] });
    expect(r.productos[0]).toMatchObject({ resultado: 'rechazado', motivo: 'linea_de_otra_marca' });
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
      idLinea: 10,
      ficha: { idTipoResina: 50, tipoCalidad: 1, rendimientoMin: 30, rendimientoMax: 40, manos: 2 },
      idsSuperficies: [20],
      idsAcabados: [30],
      idsBases: [40],
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
});
