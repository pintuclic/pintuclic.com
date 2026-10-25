import type { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type {
  EstadoFaq,
  FaqAdminEntity,
  FaqPublicaItem,
  FiltroFaqAdminQuery,
} from '../dtos/m16-contenido.dto';
import type {
  CrearFaqDatos,
  EditarFaqDatos,
  FaqRepositoryPort,
} from '../interfaces/contenido.interface';

const SELECT_FAQ_ADMIN = {
  idFaq: true,
  pregunta: true,
  respuestaMarkdown: true,
  orden: true,
  estado: true,
  idAutor: true,
  fechaCreacion: true,
  fechaActualizacion: true,
  autor: {
    select: {
      nombre: true,
    },
  },
} satisfies Prisma.FaqEntradaSelect;

type FilaFaqAdmin = Prisma.FaqEntradaGetPayload<{
  select: typeof SELECT_FAQ_ADMIN;
}>;

function mapearFaqAdmin(fila: FilaFaqAdmin): FaqAdminEntity {
  return {
    idFaq: fila.idFaq,
    pregunta: fila.pregunta,
    respuestaMarkdown: fila.respuestaMarkdown,
    orden: fila.orden,
    estado: fila.estado,
    idAutor: fila.idAutor,
    nombreAutor: fila.autor?.nombre ?? null,
    fechaCreacion: fila.fechaCreacion.toISOString(),
    fechaActualizacion: fila.fechaActualizacion.toISOString(),
  };
}

export class FaqRepository implements FaqRepositoryPort {
  async listarActivas(): Promise<FaqPublicaItem[]> {
    const filas = await prisma.faqEntrada.findMany({
      where: { estado: 'activo' },
      select: {
        idFaq: true,
        pregunta: true,
        respuestaMarkdown: true,
        orden: true,
      },
      orderBy: [{ orden: 'asc' }, { idFaq: 'asc' }],
    });

    return filas.map((f) => ({
      idFaq: f.idFaq,
      pregunta: f.pregunta,
      respuestaMarkdown: f.respuestaMarkdown,
      orden: f.orden,
    }));
  }

  async listarAdmin(filtro: FiltroFaqAdminQuery): Promise<FaqAdminEntity[]> {
    const where: Prisma.FaqEntradaWhereInput = {};
    if (filtro.estado) {
      where.estado = filtro.estado;
    }
    if (filtro.busqueda && filtro.busqueda.length > 0) {
      where.OR = [
        { pregunta: { contains: filtro.busqueda, mode: 'insensitive' } },
        { respuestaMarkdown: { contains: filtro.busqueda, mode: 'insensitive' } },
      ];
    }

    const filas = await prisma.faqEntrada.findMany({
      where,
      select: SELECT_FAQ_ADMIN,
      orderBy: [{ orden: 'asc' }, { idFaq: 'asc' }],
    });

    return filas.map(mapearFaqAdmin);
  }

  async obtenerPorId(idFaq: number): Promise<FaqAdminEntity | null> {
    const fila = await prisma.faqEntrada.findUnique({
      where: { idFaq },
      select: SELECT_FAQ_ADMIN,
    });
    return fila ? mapearFaqAdmin(fila) : null;
  }

  async crear(datos: CrearFaqDatos): Promise<FaqAdminEntity> {
    const fila = await prisma.faqEntrada.create({
      data: {
        pregunta: datos.pregunta,
        respuestaMarkdown: datos.respuestaMarkdown,
        orden: datos.orden,
        estado: datos.estado,
        idAutor: datos.idAutor,
      },
      select: SELECT_FAQ_ADMIN,
    });
    return mapearFaqAdmin(fila);
  }

  async editar(idFaq: number, datos: EditarFaqDatos): Promise<FaqAdminEntity> {
    const data: Prisma.FaqEntradaUncheckedUpdateInput = {
      idAutor: datos.idAutor,
      fechaActualizacion: new Date(),
    };
    if (datos.pregunta !== undefined) {
      data.pregunta = datos.pregunta;
    }
    if (datos.respuestaMarkdown !== undefined) {
      data.respuestaMarkdown = datos.respuestaMarkdown;
    }
    if (datos.orden !== undefined) {
      data.orden = datos.orden;
    }

    const fila = await prisma.faqEntrada.update({
      where: { idFaq },
      data,
      select: SELECT_FAQ_ADMIN,
    });
    return mapearFaqAdmin(fila);
  }

  async cambiarEstado(
    idFaq: number,
    estado: EstadoFaq,
    idAutor: number | null,
  ): Promise<FaqAdminEntity> {
    const fila = await prisma.faqEntrada.update({
      where: { idFaq },
      data: {
        estado,
        idAutor,
        fechaActualizacion: new Date(),
      },
      select: SELECT_FAQ_ADMIN,
    });
    return mapearFaqAdmin(fila);
  }

  async cambiarOrden(
    idFaq: number,
    orden: number,
    idAutor: number | null,
  ): Promise<FaqAdminEntity> {
    const fila = await prisma.faqEntrada.update({
      where: { idFaq },
      data: {
        orden,
        idAutor,
        fechaActualizacion: new Date(),
      },
      select: SELECT_FAQ_ADMIN,
    });
    return mapearFaqAdmin(fila);
  }
}
