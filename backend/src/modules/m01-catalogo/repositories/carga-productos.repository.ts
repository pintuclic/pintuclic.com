import type { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type {
  CargaProductosRepositoryPort,
  CatalogosCarga,
  ColorCarga,
  ProductoCargaDatos,
  ProductoExistenteCarga,
  Referencia,
  VarianteNuevaDatos,
} from '../interfaces/carga-productos.interface';

type Tx = Prisma.TransactionClient;

const sinMayusculas = (texto: string): { equals: string; mode: 'insensitive' } => ({ equals: texto, mode: 'insensitive' });
const estaActivo = (estado: 'activo' | 'inactivo'): boolean => estado === 'activo';

/** PNG de 1×1 píxel transparente: el logotipo es obligatorio (R9) y el Excel no lo trae (C16). Se reemplaza desde Marcas. */
export const LOGOTIPO_PROVISIONAL_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=';
const LOGOTIPO_PROVISIONAL = Buffer.from(LOGOTIPO_PROVISIONAL_BASE64, 'base64');

/* ── C16: cada función devuelve el id del registro; si no existe lo crea (activo) dentro de la transacción ── */

async function idMarca(tx: Tx, ref: Referencia): Promise<number> {
  if ('id' in ref) return ref.id;
  const hallada = await tx.marca.findFirst({ where: { nombre: sinMayusculas(ref.nuevo) }, select: { idMarca: true } });
  if (hallada !== null) return hallada.idMarca;
  const creada = await tx.marca.create({
    data: { nombre: ref.nuevo, logotipo: LOGOTIPO_PROVISIONAL, logotipoMimeType: 'image/png' },
    select: { idMarca: true },
  });
  return creada.idMarca;
}

async function idLinea(tx: Tx, marca: number, ref: Referencia): Promise<number> {
  if ('id' in ref) return ref.id;
  const hallada = await tx.linea.findFirst({ where: { idMarca: marca, nombre: sinMayusculas(ref.nuevo) }, select: { idLinea: true } });
  if (hallada !== null) return hallada.idLinea;
  return (await tx.linea.create({ data: { idMarca: marca, nombre: ref.nuevo }, select: { idLinea: true } })).idLinea;
}

async function idCategoria(tx: Tx, ref: Referencia): Promise<number> {
  if ('id' in ref) return ref.id;
  const hallada = await tx.categoria.findFirst({ where: { nombre: sinMayusculas(ref.nuevo) }, select: { idCategoria: true } });
  if (hallada !== null) return hallada.idCategoria;
  return (await tx.categoria.create({ data: { nombre: ref.nuevo }, select: { idCategoria: true } })).idCategoria;
}

async function idSubcategoria(tx: Tx, categoria: number, ref: Referencia): Promise<number> {
  if ('id' in ref) return ref.id;
  const hallada = await tx.subcategoria.findFirst({
    where: { idCategoria: categoria, nombre: sinMayusculas(ref.nuevo) },
    select: { idSubcategoria: true },
  });
  if (hallada !== null) return hallada.idSubcategoria;
  return (await tx.subcategoria.create({ data: { idCategoria: categoria, nombre: ref.nuevo }, select: { idSubcategoria: true } }))
    .idSubcategoria;
}

async function idSuperficie(tx: Tx, ref: Referencia): Promise<number> {
  if ('id' in ref) return ref.id;
  const hallada = await tx.superficie.findFirst({ where: { nombre: sinMayusculas(ref.nuevo) }, select: { idSuperficie: true } });
  if (hallada !== null) return hallada.idSuperficie;
  return (await tx.superficie.create({ data: { nombre: ref.nuevo }, select: { idSuperficie: true } })).idSuperficie;
}

async function idAcabado(tx: Tx, ref: Referencia): Promise<number> {
  if ('id' in ref) return ref.id;
  const hallado = await tx.acabado.findFirst({ where: { nombre: sinMayusculas(ref.nuevo) }, select: { idAcabado: true } });
  if (hallado !== null) return hallado.idAcabado;
  return (await tx.acabado.create({ data: { nombre: ref.nuevo }, select: { idAcabado: true } })).idAcabado;
}

async function idBase(tx: Tx, ref: Referencia): Promise<number> {
  if ('id' in ref) return ref.id;
  const hallada = await tx.base.findFirst({ where: { nombre: sinMayusculas(ref.nuevo) }, select: { idBase: true } });
  if (hallada !== null) return hallada.idBase;
  return (await tx.base.create({ data: { nombre: ref.nuevo }, select: { idBase: true } })).idBase;
}

async function idTipoResina(tx: Tx, ref: Referencia): Promise<number> {
  if ('id' in ref) return ref.id;
  const hallado = await tx.tipoResina.findFirst({ where: { nombre: sinMayusculas(ref.nuevo) }, select: { idTipoResina: true } });
  if (hallado !== null) return hallado.idTipoResina;
  return (await tx.tipoResina.create({ data: { nombre: ref.nuevo }, select: { idTipoResina: true } })).idTipoResina;
}

/** Resuelve una lista en orden y sin repetir ids (dos nombres nuevos distintos nunca dan el mismo id). */
async function ids(refs: readonly Referencia[], resolver: (ref: Referencia) => Promise<number>): Promise<number[]> {
  const resultado = new Set<number>();
  for (const ref of refs) resultado.add(await resolver(ref));
  return [...resultado];
}

/** Lee y escribe lo que necesita la carga masiva de productos. Solo crea (C1). */
export class PrismaCargaProductosRepository implements CargaProductosRepositoryPort {
  async leerCatalogos(): Promise<CatalogosCarga> {
    const [marcas, lineas, categorias, subcategorias, medidas, superficies, acabados, bases, resinas] = await Promise.all([
      prisma.marca.findMany({ select: { idMarca: true, nombre: true, estado: true } }),
      prisma.linea.findMany({ select: { idLinea: true, idMarca: true, nombre: true, estado: true } }),
      prisma.categoria.findMany({ select: { idCategoria: true, nombre: true, estado: true } }),
      prisma.subcategoria.findMany({ select: { idSubcategoria: true, idCategoria: true, nombre: true, estado: true } }),
      prisma.medida.findMany({ select: { idMedida: true, nombre: true, estado: true } }),
      prisma.superficie.findMany({ select: { idSuperficie: true, nombre: true, estado: true } }),
      prisma.acabado.findMany({ select: { idAcabado: true, nombre: true, estado: true } }),
      prisma.base.findMany({ select: { idBase: true, nombre: true, estado: true } }),
      prisma.tipoResina.findMany({ select: { idTipoResina: true, nombre: true, estado: true } }),
    ]);
    return {
      marcas: marcas.map((r) => ({ id: r.idMarca, nombre: r.nombre, activo: estaActivo(r.estado) })),
      lineas: lineas.map((r) => ({ id: r.idLinea, idMarca: r.idMarca, nombre: r.nombre, activo: estaActivo(r.estado) })),
      categorias: categorias.map((r) => ({ id: r.idCategoria, nombre: r.nombre, activo: estaActivo(r.estado) })),
      subcategorias: subcategorias.map((r) => ({
        id: r.idSubcategoria,
        idCategoria: r.idCategoria,
        nombre: r.nombre,
        activo: estaActivo(r.estado),
      })),
      medidas: medidas.map((r) => ({ id: r.idMedida, nombre: r.nombre, activo: estaActivo(r.estado) })),
      superficies: superficies.map((r) => ({ id: r.idSuperficie, nombre: r.nombre, activo: estaActivo(r.estado) })),
      acabados: acabados.map((r) => ({ id: r.idAcabado, nombre: r.nombre, activo: estaActivo(r.estado) })),
      bases: bases.map((r) => ({ id: r.idBase, nombre: r.nombre, activo: estaActivo(r.estado) })),
      tiposResina: resinas.map((r) => ({ id: r.idTipoResina, nombre: r.nombre, activo: estaActivo(r.estado) })),
    };
  }

  async leerColores(idsMarca: readonly number[]): Promise<ColorCarga[]> {
    if (idsMarca.length === 0) return [];
    const filas = await prisma.color.findMany({
      where: { idMarca: { in: [...idsMarca] } },
      select: { idColor: true, idMarca: true, nombre: true, estado: true },
    });
    return filas.map((r) => ({ id: r.idColor, idMarca: r.idMarca, nombre: r.nombre, activo: estaActivo(r.estado) }));
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

  /** C5 / C6 / C14 / C16: nace sin publicar y con existencia 0 (valores por defecto de la tabla). */
  async crearProductoConVariantes(producto: ProductoCargaDatos, variantes: readonly VarianteNuevaDatos[]): Promise<number> {
    return prisma.$transaction(async (tx) => {
      const marca = await idMarca(tx, producto.marca);
      const linea = producto.linea === null ? null : await idLinea(tx, marca, producto.linea);
      const categoria = await idCategoria(tx, producto.categoria);
      const subcategoria = await idSubcategoria(tx, categoria, producto.subcategoria);
      const superficies = await ids(producto.superficies, (r) => idSuperficie(tx, r));
      const acabados = await ids(producto.acabados, (r) => idAcabado(tx, r));
      const bases = await ids(producto.bases, (r) => idBase(tx, r));
      const resina = producto.ficha === null ? null : await idTipoResina(tx, producto.ficha.tipoResina);

      const creado = await tx.producto.create({
        data: {
          idMarca: marca,
          idLinea: linea,
          idSubcategoria: subcategoria,
          nombre: producto.nombre,
          descripcion: producto.descripcion,
          usoInterior: producto.usoInterior,
          usoExterior: producto.usoExterior,
          idCategoriaComplementaria: null,
          ...(producto.ficha !== null && resina !== null
            ? {
                ficha: {
                  create: {
                    idTipoResina: resina,
                    tipoCalidad: producto.ficha.tipoCalidad,
                    rendimientoMin: producto.ficha.rendimientoMin,
                    rendimientoMax: producto.ficha.rendimientoMax,
                    manos: producto.ficha.manos,
                  },
                },
              }
            : {}),
          superficies: { create: superficies.map((idSuperficie) => ({ idSuperficie })) },
          acabados: { create: acabados.map((idAcabado) => ({ idAcabado })) },
          bases: { create: bases.map((idBase) => ({ idBase })) },
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
