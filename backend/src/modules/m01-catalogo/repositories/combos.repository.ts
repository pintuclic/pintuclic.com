import type { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type { Combo, ListarCombosRequest } from '../dtos/m01-catalogo-entrega3.dto';
import type { Pagina } from '../interfaces/catalogo.interface';
import type { CombosRepositoryPort, CrearComboDatos, EditarComboDatos } from '../interfaces/combos.interface';
import { sinIndefinidos } from './prisma-comun';

const contiene = (texto: string): Prisma.StringFilter => ({ contains: texto, mode: 'insensitive' });

const SELECCION_COMBO = {
  idProducto: true,
  nombre: true,
  descripcion: true,
  idMarca: true,
  idSubcategoria: true,
  idCategoriaComplementaria: true,
  excluidoDeDescuentos: true,
  estado: true,
  publicado: true,
  marca: { select: { nombre: true } },
  subcategoria: { select: { nombre: true } },
  variantes: {
    select: {
      idVariante: true,
      idMedida: true,
      sku: true,
      precioVigente: true,
      existenciaReferencial: true,
      medida: { select: { nombre: true } },
    },
    orderBy: { idVariante: 'asc' },
    take: 1,
  },
  _count: { select: { imagenes: true } },
} satisfies Prisma.ProductoSelect;

type FilaCombo = Prisma.ProductoGetPayload<{ select: typeof SELECCION_COMBO }>;

/** K2: todo combo tiene exactamente una variante; una fila sin ella es un dato corrupto. */
function aCombo(f: FilaCombo): Combo | null {
  const v = f.variantes[0];
  if (v === undefined) return null;
  return {
    idProducto: f.idProducto,
    idVariante: v.idVariante,
    nombre: f.nombre,
    descripcion: f.descripcion,
    idMarca: f.idMarca,
    marca: f.marca.nombre,
    idSubcategoria: f.idSubcategoria,
    subcategoria: f.subcategoria.nombre,
    idCategoriaComplementaria: f.idCategoriaComplementaria,
    excluidoDeDescuentos: f.excluidoDeDescuentos,
    idMedida: v.idMedida,
    medida: v.medida.nombre,
    sku: v.sku,
    precio: v.precioVigente.toNumber(),
    existenciaReferencial: v.existenciaReferencial,
    disponibilidad: v.existenciaReferencial > 0 ? 'disponible' : 'agotado',
    estado: f.estado,
    publicado: f.publicado,
    cantidadImagenes: f._count.imagenes,
  };
}

export class CombosRepository implements CombosRepositoryPort {
  async listar(query: ListarCombosRequest): Promise<Pagina<Combo>> {
    const busqueda = query.busqueda;
    const where: Prisma.ProductoWhereInput = {
      esCombo: true,
      ...(query.estado !== undefined ? { estado: query.estado } : {}),
      ...(query.disponibilidad === 'agotado'
        ? { variantes: { none: { existenciaReferencial: { gt: 0 } } } }
        : query.disponibilidad === 'disponible'
          ? { variantes: { some: { existenciaReferencial: { gt: 0 } } } }
          : {}),
      ...(busqueda !== undefined && busqueda !== ''
        ? { OR: [{ nombre: contiene(busqueda) }, { variantes: { some: { sku: contiene(busqueda) } } }] }
        : {}),
    };
    const [filas, total] = await Promise.all([
      prisma.producto.findMany({
        where,
        select: SELECCION_COMBO,
        orderBy: [{ nombre: 'asc' }, { idProducto: 'asc' }],
        skip: (query.pagina - 1) * query.limite,
        take: query.limite,
      }),
      prisma.producto.count({ where }),
    ]);
    return { items: filas.flatMap((f) => aCombo(f) ?? []), total };
  }

  async obtener(idProducto: number): Promise<Combo | null> {
    const f = await prisma.producto.findFirst({ where: { idProducto, esCombo: true }, select: SELECCION_COMBO });
    return f === null ? null : aCombo(f);
  }

  /** La variante nace con existencia 0 (K7): el stock se fija en M13. */
  async crear(datos: CrearComboDatos): Promise<Combo> {
    const idProducto = await prisma.$transaction(async (tx) => {
      const producto = await tx.producto.create({
        data: {
          idMarca: datos.idMarca,
          idSubcategoria: datos.idSubcategoria,
          nombre: datos.nombre,
          descripcion: datos.descripcion,
          esCombo: true,
          excluidoDeDescuentos: datos.excluidoDeDescuentos,
          idCategoriaComplementaria: datos.idCategoriaComplementaria,
        },
        select: { idProducto: true },
      });
      const variante = await tx.variante.create({
        data: {
          idProducto: producto.idProducto,
          idMedida: datos.idMedida,
          // Provisional y único; se reemplaza antes de terminar la transacción.
          sku: datos.sku ?? `tmp-${producto.idProducto}-${Date.now()}`,
          precioVigente: datos.precio,
        },
        select: { idVariante: true },
      });
      if (datos.sku === null) {
        const base = `P${producto.idProducto}-V${variante.idVariante}`;
        const ocupado = await tx.variante.findFirst({
          where: { sku: { equals: base, mode: 'insensitive' } },
          select: { idVariante: true },
        });
        await tx.variante.update({
          where: { idVariante: variante.idVariante },
          data: { sku: ocupado === null ? base : `${base}-${Date.now().toString(36)}` },
        });
      }
      return producto.idProducto;
    });
    return this.obtenerExistente(idProducto);
  }

  async editar(idProducto: number, datos: EditarComboDatos): Promise<Combo> {
    await prisma.$transaction(async (tx) => {
      await tx.producto.update({
        where: { idProducto },
        data: sinIndefinidos({
          idSubcategoria: datos.idSubcategoria,
          nombre: datos.nombre,
          descripcion: datos.descripcion,
          excluidoDeDescuentos: datos.excluidoDeDescuentos,
          idCategoriaComplementaria: datos.idCategoriaComplementaria,
        }),
      });
      if (datos.precio !== undefined || datos.sku !== undefined) {
        await tx.variante.updateMany({
          where: { idProducto },
          data: sinIndefinidos({ precioVigente: datos.precio, sku: datos.sku }),
        });
      }
    });
    return this.obtenerExistente(idProducto);
  }

  private async obtenerExistente(idProducto: number): Promise<Combo> {
    const combo = await this.obtener(idProducto);
    if (combo === null) throw new Error(`El combo ${idProducto} no existe.`);
    return combo;
  }
}
