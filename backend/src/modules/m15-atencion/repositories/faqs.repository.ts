import type { PreguntaFrecuente as PreguntaFrecuentePrisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type { CrearFaqRequest, EditarFaqRequest, PreguntaFrecuente } from '../dtos/m15-atencion.dto';
import type { FaqsRepositoryPort, FiltroFaqsAdmin, PaginaFaqs } from '../interfaces/atencion.interface';

function aPreguntaFrecuente(fila: PreguntaFrecuentePrisma): PreguntaFrecuente {
  return {
    idPregunta: fila.idPregunta,
    tema: fila.tema,
    pregunta: fila.pregunta,
    respuesta: fila.respuesta,
    orden: fila.orden,
    activa: fila.activa,
    fechaCreacion: fila.fechaCreacion.toISOString(),
    fechaActualizacion: fila.fechaActualizacion.toISOString(),
  };
}

/** R2: el listado se agrupa por tema y se ordena por `orden` dentro de cada tema. */
const ORDEN_PRESENTACION = [{ tema: 'asc' }, { orden: 'asc' }, { idPregunta: 'asc' }] as const;

export class PrismaFaqsRepository implements FaqsRepositoryPort {
  async listarPublicas(): Promise<PreguntaFrecuente[]> {
    const filas = await prisma.preguntaFrecuente.findMany({
      where: { activa: true },
      orderBy: [...ORDEN_PRESENTACION],
    });
    return filas.map(aPreguntaFrecuente);
  }

  async listarAdmin(filtro: FiltroFaqsAdmin): Promise<PaginaFaqs> {
    const where = {
      ...(filtro.tema === undefined ? {} : { tema: filtro.tema }),
      ...(filtro.incluirInactivas ? {} : { activa: true }),
    };

    const [filas, total] = await Promise.all([
      prisma.preguntaFrecuente.findMany({
        where,
        orderBy: [...ORDEN_PRESENTACION],
        skip: (filtro.pagina - 1) * filtro.limite,
        take: filtro.limite,
      }),
      prisma.preguntaFrecuente.count({ where }),
    ]);

    return { items: filas.map(aPreguntaFrecuente), total };
  }

  async obtener(idPregunta: number): Promise<PreguntaFrecuente | null> {
    const fila = await prisma.preguntaFrecuente.findUnique({ where: { idPregunta } });
    return fila === null ? null : aPreguntaFrecuente(fila);
  }

  async crear(datos: CrearFaqRequest): Promise<PreguntaFrecuente> {
    const fila = await prisma.preguntaFrecuente.create({
      data: {
        tema: datos.tema,
        pregunta: datos.pregunta,
        respuesta: datos.respuesta,
        orden: datos.orden,
      },
    });
    return aPreguntaFrecuente(fila);
  }

  async actualizar(idPregunta: number, datos: EditarFaqRequest): Promise<PreguntaFrecuente> {
    const fila = await prisma.preguntaFrecuente.update({
      where: { idPregunta },
      data: {
        ...(datos.tema === undefined ? {} : { tema: datos.tema }),
        ...(datos.pregunta === undefined ? {} : { pregunta: datos.pregunta }),
        ...(datos.respuesta === undefined ? {} : { respuesta: datos.respuesta }),
        ...(datos.orden === undefined ? {} : { orden: datos.orden }),
        fechaActualizacion: new Date(),
      },
    });
    return aPreguntaFrecuente(fila);
  }

  async cambiarActiva(idPregunta: number, activa: boolean): Promise<PreguntaFrecuente> {
    const fila = await prisma.preguntaFrecuente.update({
      where: { idPregunta },
      data: { activa, fechaActualizacion: new Date() },
    });
    return aPreguntaFrecuente(fila);
  }

  async eliminar(idPregunta: number): Promise<void> {
    await prisma.preguntaFrecuente.delete({ where: { idPregunta } });
  }

  async idsDelTema(tema: string): Promise<number[]> {
    const filas = await prisma.preguntaFrecuente.findMany({
      where: { tema },
      select: { idPregunta: true },
    });
    return filas.map((fila) => fila.idPregunta);
  }

  async reordenar(ordenIds: number[]): Promise<void> {
    const ahora = new Date();
    await prisma.$transaction(
      ordenIds.map((idPregunta, indice) =>
        prisma.preguntaFrecuente.update({
          where: { idPregunta },
          data: { orden: indice + 1, fechaActualizacion: ahora },
        }),
      ),
    );
  }
}
