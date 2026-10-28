import { prisma } from '../../../core/db/client';
import type {
  CambiosPlantilla,
  EntidadPlantillaNotificacion,
  PlantillasRepositoryPort,
} from '../interfaces/plantillas.port';
import type { TipoComunicacion } from '../interfaces/registro-envios.port';

function aEntidad(fila: {
  idPlantilla: string;
  tipo: string;
  asunto: string;
  contenidoTexto: string;
  fechaActualizacion: Date;
  idUsuarioActualizo: number | null;
}): EntidadPlantillaNotificacion {
  return {
    idPlantilla: fila.idPlantilla,
    tipo: fila.tipo as TipoComunicacion,
    asunto: fila.asunto,
    contenidoTexto: fila.contenidoTexto,
    fechaActualizacion: fila.fechaActualizacion,
    idUsuarioActualizo: fila.idUsuarioActualizo,
  };
}

export class PrismaPlantillasRepository implements PlantillasRepositoryPort {
  async listar(): Promise<EntidadPlantillaNotificacion[]> {
    const filas = await prisma.plantillaNotificacion.findMany({ orderBy: { tipo: 'asc' } });
    return filas.map(aEntidad);
  }

  async obtenerPorTipo(tipo: TipoComunicacion): Promise<EntidadPlantillaNotificacion | null> {
    const fila = await prisma.plantillaNotificacion.findUnique({ where: { tipo } });
    return fila ? aEntidad(fila) : null;
  }

  async actualizar(
    tipo: TipoComunicacion,
    cambios: CambiosPlantilla,
    idAdmin?: number,
  ): Promise<EntidadPlantillaNotificacion> {
    const fila = await prisma.plantillaNotificacion.update({
      where: { tipo },
      data: {
        ...(cambios.asunto !== undefined ? { asunto: cambios.asunto } : {}),
        ...(cambios.contenidoTexto !== undefined ? { contenidoTexto: cambios.contenidoTexto } : {}),
        idUsuarioActualizo: idAdmin ?? null,
      },
    });
    return aEntidad(fila);
  }
}
