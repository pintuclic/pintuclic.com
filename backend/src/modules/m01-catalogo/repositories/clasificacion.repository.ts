import type { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type {
  Categoria,
  CrearCategoriaRequest,
  EditarCategoriaRequest,
  Estado,
  ImpactoDesactivacion,
  ListarCompletoRequest,
  Subcategoria,
} from '../dtos/m01-catalogo.dto';
import type {
  CategoriasRepositoryPort,
  CrearSubcategoriaDatos,
  SubcategoriasRepositoryPort,
} from '../interfaces/catalogo.interface';
import { impactoVacio, productoVisible, sinIndefinidos } from './prisma-comun';

type CategoriaConSubs = Prisma.CategoriaGetPayload<{ include: { subcategorias: true } }>;
type FilaSubcategoria = Prisma.SubcategoriaGetPayload<Record<string, never>>;

const ORDEN_SUBCATEGORIAS = [{ orden: 'asc' }, { nombre: 'asc' }] as const;

function aSubcategoria(fila: FilaSubcategoria): Subcategoria {
  return {
    idSubcategoria: fila.idSubcategoria,
    idCategoria: fila.idCategoria,
    nombre: fila.nombre,
    orden: fila.orden,
    estado: fila.estado,
  };
}

function aCategoria(fila: CategoriaConSubs): Categoria {
  return {
    idCategoria: fila.idCategoria,
    nombre: fila.nombre,
    orden: fila.orden,
    estado: fila.estado,
    subcategorias: fila.subcategorias.map(aSubcategoria),
  };
}

export class CategoriasRepository implements CategoriasRepositoryPort {
  private readonly incluirSubcategorias = {
    subcategorias: { orderBy: [...ORDEN_SUBCATEGORIAS] },
  } satisfies Prisma.CategoriaInclude;

  async listar(query: ListarCompletoRequest): Promise<Categoria[]> {
    const filas = await prisma.categoria.findMany({
      where: query.estado !== undefined ? { estado: query.estado } : {},
      include: this.incluirSubcategorias,
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    });
    return filas.map(aCategoria);
  }

  async obtener(id: number): Promise<Categoria | null> {
    const fila = await prisma.categoria.findUnique({
      where: { idCategoria: id },
      include: this.incluirSubcategorias,
    });
    return fila === null ? null : aCategoria(fila);
  }

  async crear(datos: CrearCategoriaRequest): Promise<Categoria> {
    const fila = await prisma.categoria.create({
      data: { nombre: datos.nombre, orden: datos.orden },
      include: this.incluirSubcategorias,
    });
    return aCategoria(fila);
  }

  async editar(id: number, datos: EditarCategoriaRequest): Promise<Categoria> {
    const fila = await prisma.categoria.update({
      where: { idCategoria: id },
      data: sinIndefinidos({ nombre: datos.nombre, orden: datos.orden }),
      include: this.incluirSubcategorias,
    });
    return aCategoria(fila);
  }

  /** R5: desactivar una categoría desactiva sus subcategorías, en una sola transacción. */
  async cambiarEstado(id: number, estado: Estado): Promise<Categoria> {
    const fila = await prisma.$transaction(async (tx) => {
      if (estado === 'inactivo') {
        await tx.subcategoria.updateMany({ where: { idCategoria: id }, data: { estado: 'inactivo' } });
      }
      return tx.categoria.update({
        where: { idCategoria: id },
        data: { estado },
        include: this.incluirSubcategorias,
      });
    });
    return aCategoria(fila);
  }

  async contarImpacto(id: number): Promise<ImpactoDesactivacion> {
    const [subcategorias, productos] = await Promise.all([
      prisma.subcategoria.count({ where: { idCategoria: id, estado: 'activo' } }),
      prisma.producto.count({ where: productoVisible({ subcategoria: { idCategoria: id } }) }),
    ]);
    return { ...impactoVacio(), subcategorias, productos };
  }

  async existeDuplicado(clave: { nombre: string }, excluirId?: number): Promise<boolean> {
    const fila = await prisma.categoria.findFirst({
      where: {
        nombre: { equals: clave.nombre, mode: 'insensitive' },
        ...(excluirId !== undefined ? { NOT: { idCategoria: excluirId } } : {}),
      },
      select: { idCategoria: true },
    });
    return fila !== null;
  }

  async padreActivo(): Promise<boolean> {
    return true;
  }
}

export class SubcategoriasRepository implements SubcategoriasRepositoryPort {
  async obtener(id: number): Promise<Subcategoria | null> {
    const fila = await prisma.subcategoria.findUnique({ where: { idSubcategoria: id } });
    return fila === null ? null : aSubcategoria(fila);
  }

  async crear(datos: CrearSubcategoriaDatos): Promise<Subcategoria> {
    const fila = await prisma.subcategoria.create({
      data: { idCategoria: datos.idCategoria, nombre: datos.nombre, orden: datos.orden },
    });
    return aSubcategoria(fila);
  }

  async editar(id: number, datos: EditarCategoriaRequest): Promise<Subcategoria> {
    const fila = await prisma.subcategoria.update({
      where: { idSubcategoria: id },
      data: sinIndefinidos({ nombre: datos.nombre, orden: datos.orden }),
    });
    return aSubcategoria(fila);
  }

  async cambiarEstado(id: number, estado: Estado): Promise<Subcategoria> {
    const fila = await prisma.subcategoria.update({ where: { idSubcategoria: id }, data: { estado } });
    return aSubcategoria(fila);
  }

  async contarImpacto(id: number): Promise<ImpactoDesactivacion> {
    const productos = await prisma.producto.count({ where: productoVisible({ idSubcategoria: id }) });
    return { ...impactoVacio(), productos };
  }

  async existeDuplicado(clave: { idCategoria: number; nombre: string }, excluirId?: number): Promise<boolean> {
    const fila = await prisma.subcategoria.findFirst({
      where: {
        idCategoria: clave.idCategoria,
        nombre: { equals: clave.nombre, mode: 'insensitive' },
        ...(excluirId !== undefined ? { NOT: { idSubcategoria: excluirId } } : {}),
      },
      select: { idSubcategoria: true },
    });
    return fila !== null;
  }

  /** R7: la categoría padre debe estar activa. */
  async padreActivo(id: number): Promise<boolean> {
    const fila = await prisma.subcategoria.findUnique({
      where: { idSubcategoria: id },
      select: { categoria: { select: { estado: true } } },
    });
    return fila?.categoria.estado === 'activo';
  }
}
