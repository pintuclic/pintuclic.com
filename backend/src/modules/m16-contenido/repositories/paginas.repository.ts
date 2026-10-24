import type { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type {
  EstadoPaginaContenido,
  FiltroPaginasAdminQuery,
  PaginaAdminEntity,
  PaginaPublicaDetalle,
  PaginaPublicaResumen,
} from '../dtos/m16-contenido.dto';
import type {
  CrearPaginaDatos,
  EditarPaginaDatos,
  PaginasRepositoryPort,
} from '../interfaces/contenido.interface';

const SELECT_PAGINA_ADMIN = {
  idPagina: true,
  slug: true,
  titulo: true,
  resumen: true,
  cuerpoMarkdown: true,
  estado: true,
  idAutor: true,
  fechaCreacion: true,
  fechaActualizacion: true,
  autor: {
    select: {
      nombre: true,
    },
  },
} satisfies Prisma.PaginaInstitucionalSelect;

type FilaPaginaAdmin = Prisma.PaginaInstitucionalGetPayload<{
  select: typeof SELECT_PAGINA_ADMIN;
}>;

function mapearPaginaAdmin(fila: FilaPaginaAdmin): PaginaAdminEntity {
  return {
    idPagina: fila.idPagina,
    slug: fila.slug,
    titulo: fila.titulo,
    resumen: fila.resumen,
    cuerpoMarkdown: fila.cuerpoMarkdown,
    estado: fila.estado,
    idAutor: fila.idAutor,
    nombreAutor: fila.autor?.nombre ?? null,
    fechaCreacion: fila.fechaCreacion.toISOString(),
    fechaActualizacion: fila.fechaActualizacion.toISOString(),
  };
}

export class PaginasRepository implements PaginasRepositoryPort {
  async listarPublicadas(): Promise<PaginaPublicaResumen[]> {
    const filas = await prisma.paginaInstitucional.findMany({
      where: { estado: 'publicado' },
      select: {
        slug: true,
        titulo: true,
        resumen: true,
        fechaActualizacion: true,
      },
      orderBy: [{ idPagina: 'asc' }],
    });

    return filas.map((f) => ({
      slug: f.slug,
      titulo: f.titulo,
      resumen: f.resumen,
      fechaActualizacion: f.fechaActualizacion.toISOString(),
    }));
  }

  async obtenerPublicadaPorSlug(slug: string): Promise<PaginaPublicaDetalle | null> {
    const fila = await prisma.paginaInstitucional.findFirst({
      where: {
        slug,
        estado: 'publicado',
      },
      select: {
        slug: true,
        titulo: true,
        resumen: true,
        cuerpoMarkdown: true,
        fechaActualizacion: true,
      },
    });

    if (!fila) {
      return null;
    }

    return {
      slug: fila.slug,
      titulo: fila.titulo,
      resumen: fila.resumen,
      cuerpoMarkdown: fila.cuerpoMarkdown,
      fechaActualizacion: fila.fechaActualizacion.toISOString(),
    };
  }

  async listarAdmin(filtro: FiltroPaginasAdminQuery): Promise<PaginaAdminEntity[]> {
    const where: Prisma.PaginaInstitucionalWhereInput = {};
    if (filtro.estado) {
      where.estado = filtro.estado;
    }
    if (filtro.busqueda && filtro.busqueda.length > 0) {
      where.OR = [
        { titulo: { contains: filtro.busqueda, mode: 'insensitive' } },
        { slug: { contains: filtro.busqueda, mode: 'insensitive' } },
      ];
    }

    const filas = await prisma.paginaInstitucional.findMany({
      where,
      select: SELECT_PAGINA_ADMIN,
      orderBy: [{ idPagina: 'asc' }],
    });

    return filas.map(mapearPaginaAdmin);
  }

  async obtenerPorId(idPagina: number): Promise<PaginaAdminEntity | null> {
    const fila = await prisma.paginaInstitucional.findUnique({
      where: { idPagina },
      select: SELECT_PAGINA_ADMIN,
    });
    return fila ? mapearPaginaAdmin(fila) : null;
  }

  async existeSlug(slug: string, excluirIdPagina?: number): Promise<boolean> {
    const conteo = await prisma.paginaInstitucional.count({
      where: {
        slug: { equals: slug, mode: 'insensitive' },
        ...(excluirIdPagina !== undefined ? { idPagina: { not: excluirIdPagina } } : {}),
      },
    });
    return conteo > 0;
  }

  async crear(datos: CrearPaginaDatos): Promise<PaginaAdminEntity> {
    const fila = await prisma.paginaInstitucional.create({
      data: {
        slug: datos.slug,
        titulo: datos.titulo,
        resumen: datos.resumen ?? null,
        cuerpoMarkdown: datos.cuerpoMarkdown,
        estado: datos.estado,
        idAutor: datos.idAutor,
      },
      select: SELECT_PAGINA_ADMIN,
    });
    return mapearPaginaAdmin(fila);
  }

  async editar(idPagina: number, datos: EditarPaginaDatos): Promise<PaginaAdminEntity> {
    const data: Prisma.PaginaInstitucionalUncheckedUpdateInput = {
      idAutor: datos.idAutor,
      fechaActualizacion: new Date(),
    };
    if (datos.slug !== undefined) {
      data.slug = datos.slug;
    }
    if (datos.titulo !== undefined) {
      data.titulo = datos.titulo;
    }
    if (datos.resumen !== undefined) {
      data.resumen = datos.resumen;
    }
    if (datos.cuerpoMarkdown !== undefined) {
      data.cuerpoMarkdown = datos.cuerpoMarkdown;
    }

    const fila = await prisma.paginaInstitucional.update({
      where: { idPagina },
      data,
      select: SELECT_PAGINA_ADMIN,
    });
    return mapearPaginaAdmin(fila);
  }

  async cambiarEstado(
    idPagina: number,
    estado: EstadoPaginaContenido,
    idAutor: number | null,
  ): Promise<PaginaAdminEntity> {
    const fila = await prisma.paginaInstitucional.update({
      where: { idPagina },
      data: {
        estado,
        idAutor,
        fechaActualizacion: new Date(),
      },
      select: SELECT_PAGINA_ADMIN,
    });
    return mapearPaginaAdmin(fila);
  }
}
