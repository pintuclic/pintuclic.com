import { prisma } from '../../../core/db/client';
import type {
  CargaProductosRepositoryPort,
  CatalogosCarga,
  ColorCarga,
  ProductoExistenteCarga,
  VarianteNuevaDatos,
} from '../interfaces/carga-productos.interface';
import type { CrearProductoDatos } from '../interfaces/productos.interface';

const activo = { estado: 'activo' } as const;
const sinMayusculas = (texto: string): { equals: string; mode: 'insensitive' } => ({ equals: texto, mode: 'insensitive' });

/** Lee y escribe lo que necesita la carga masiva de productos. Solo crea (C1). */
export class PrismaCargaProductosRepository implements CargaProductosRepositoryPort {
  async leerCatalogos(): Promise<CatalogosCarga> {
    const [marcas, lineas, categorias, subcategorias, medidas, superficies, acabados, bases, resinas] = await Promise.all([
      prisma.marca.findMany({ where: activo, select: { idMarca: true, nombre: true } }),
      prisma.linea.findMany({ where: activo, select: { idLinea: true, idMarca: true, nombre: true } }),
      prisma.categoria.findMany({ where: activo, select: { idCategoria: true, nombre: true } }),
      prisma.subcategoria.findMany({ where: activo, select: { idSubcategoria: true, idCategoria: true, nombre: true } }),
      prisma.medida.findMany({ where: activo, select: { idMedida: true, nombre: true } }),
      prisma.superficie.findMany({ where: activo, select: { idSuperficie: true, nombre: true } }),
      prisma.acabado.findMany({ where: activo, select: { idAcabado: true, nombre: true } }),
      prisma.base.findMany({ where: activo, select: { idBase: true, nombre: true } }),
      prisma.tipoResina.findMany({ where: activo, select: { idTipoResina: true, nombre: true } }),
    ]);
    return {
      marcas: marcas.map((r) => ({ id: r.idMarca, nombre: r.nombre })),
      lineas: lineas.map((r) => ({ id: r.idLinea, idMarca: r.idMarca, nombre: r.nombre })),
      categorias: categorias.map((r) => ({ id: r.idCategoria, nombre: r.nombre })),
      subcategorias: subcategorias.map((r) => ({ id: r.idSubcategoria, idCategoria: r.idCategoria, nombre: r.nombre })),
      medidas: medidas.map((r) => ({ id: r.idMedida, nombre: r.nombre })),
      superficies: superficies.map((r) => ({ id: r.idSuperficie, nombre: r.nombre })),
      acabados: acabados.map((r) => ({ id: r.idAcabado, nombre: r.nombre })),
      bases: bases.map((r) => ({ id: r.idBase, nombre: r.nombre })),
      tiposResina: resinas.map((r) => ({ id: r.idTipoResina, nombre: r.nombre })),
    };
  }

  async leerColores(idsMarca: readonly number[]): Promise<ColorCarga[]> {
    if (idsMarca.length === 0) return [];
    const filas = await prisma.color.findMany({
      where: { ...activo, idMarca: { in: [...idsMarca] } },
      select: { idColor: true, idMarca: true, nombre: true },
    });
    return filas.map((r) => ({ id: r.idColor, idMarca: r.idMarca, nombre: r.nombre }));
  }

  async productosDeMarcas(idsMarca: readonly number[]): Promise<ProductoExistenteCarga[]> {
    if (idsMarca.length === 0) return [];
    return prisma.producto.findMany({
      where: { idMarca: { in: [...idsMarca] } },
      select: { idProducto: true, idMarca: true, nombre: true },
    });
  }

  async skusExistentes(skus: readonly string[]): Promise<Set<string>> {
    if (skus.length === 0) return new Set();
    const filas = await prisma.variante.findMany({
      where: { OR: skus.map((sku) => ({ sku: sinMayusculas(sku) })) },
      select: { sku: true },
    });
    return new Set(filas.map((f) => f.sku.toLowerCase()));
  }

  async codigosProveedorExistentes(codigos: readonly string[]): Promise<Set<string>> {
    if (codigos.length === 0) return new Set();
    const filas = await prisma.variante.findMany({
      where: { OR: codigos.map((codigo) => ({ codigoProveedor: sinMayusculas(codigo) })) },
      select: { codigoProveedor: true },
    });
    return new Set(filas.flatMap((f) => (f.codigoProveedor === null ? [] : [f.codigoProveedor.toLowerCase()])));
  }

  /** C5 / C6 / C14: nace sin publicar y con existencia 0 (valores por defecto de la tabla). */
  async crearProductoConVariantes(producto: CrearProductoDatos, variantes: readonly VarianteNuevaDatos[]): Promise<number> {
    return prisma.$transaction(async (tx) => {
      const creado = await tx.producto.create({
        data: {
          idMarca: producto.idMarca,
          idLinea: producto.idLinea,
          idSubcategoria: producto.idSubcategoria,
          nombre: producto.nombre,
          descripcion: producto.descripcion,
          usoInterior: producto.usoInterior,
          usoExterior: producto.usoExterior,
          idCategoriaComplementaria: producto.idCategoriaComplementaria,
          ...(producto.ficha !== null
            ? {
                ficha: {
                  create: {
                    idTipoResina: producto.ficha.idTipoResina,
                    tipoCalidad: producto.ficha.tipoCalidad,
                    rendimientoMin: producto.ficha.rendimientoMin,
                    rendimientoMax: producto.ficha.rendimientoMax,
                    manos: producto.ficha.manos,
                  },
                },
              }
            : {}),
          superficies: { create: producto.idsSuperficies.map((idSuperficie) => ({ idSuperficie })) },
          acabados: { create: producto.idsAcabados.map((idAcabado) => ({ idAcabado })) },
          bases: { create: producto.idsBases.map((idBase) => ({ idBase })) },
          coloresFabrica: { create: producto.idsColoresFabrica.map((idColor) => ({ idColor })) },
          caracteristicas: { create: producto.caracteristicas },
        },
        select: { idProducto: true },
      });
      for (const v of variantes) {
        const fila = await tx.variante.create({
          data: {
            idProducto: creado.idProducto,
            idMedida: v.idMedida,
            // Provisional y único; se reemplaza antes de terminar la transacción.
            sku: v.sku ?? `tmp-${creado.idProducto}-${v.idMedida}-${Date.now()}`,
            precioVigente: v.precio,
            codigoProveedor: v.codigoProveedor,
          },
          select: { idVariante: true },
        });
        if (v.sku === null) {
          const base = `P${creado.idProducto}-V${fila.idVariante}`;
          const ocupado = await tx.variante.findFirst({ where: { sku: sinMayusculas(base) }, select: { idVariante: true } });
          await tx.variante.update({
            where: { idVariante: fila.idVariante },
            data: { sku: ocupado === null ? base : `${base}-${Date.now().toString(36)}` },
          });
        }
      }
      return creado.idProducto;
    });
  }
}
