import { prisma } from '../../../core/db/client';
import type {
  CambiosPlantilla,
  EntidadPlantillaNotificacion,
  PlantillasRepositoryPort,
} from '../interfaces/plantillas.port';
import type { TipoComunicacion } from '../interfaces/registro-envios.port';

function comoListaTexto(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((v): v is string => typeof v === 'string') : [];
}

export class PrismaPlantillasRepository implements PlantillasRepositoryPort {
  async listar(): Promise<EntidadPlantillaNotificacion[]> {
    const filas = await prisma.plantillaNotificacion.findMany({ orderBy: { tipo: 'asc' } });
    return filas.map((f) => ({
      idPlantilla: f.idPlantilla,
      tipo: f.tipo as TipoComunicacion,
      asunto: f.asunto,
      contenidoHtml: f.contenidoHtml,
      contenidoTexto: f.contenidoTexto,
      variablesDisponibles: comoListaTexto(f.variablesDisponibles),
      variablesObligatorias: comoListaTexto(f.variablesObligatorias),
      fechaActualizacion: f.fechaActualizacion,
      idUsuarioActualizo: f.idUsuarioActualizo,
    }));
  }

  async obtenerPorTipo(tipo: TipoComunicacion): Promise<EntidadPlantillaNotificacion | null> {
    const fila = await prisma.plantillaNotificacion.findUnique({ where: { tipo } });
    if (!fila) return null;
    return {
      idPlantilla: fila.idPlantilla,
      tipo: fila.tipo as TipoComunicacion,
      asunto: fila.asunto,
      contenidoHtml: fila.contenidoHtml,
      contenidoTexto: fila.contenidoTexto,
      variablesDisponibles: comoListaTexto(fila.variablesDisponibles),
      variablesObligatorias: comoListaTexto(fila.variablesObligatorias),
      fechaActualizacion: fila.fechaActualizacion,
      idUsuarioActualizo: fila.idUsuarioActualizo,
    };
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
        ...(cambios.contenidoHtml !== undefined ? { contenidoHtml: cambios.contenidoHtml } : {}),
        ...(cambios.contenidoTexto !== undefined ? { contenidoTexto: cambios.contenidoTexto } : {}),
        idUsuarioActualizo: idAdmin ?? null,
      },
    });

    return {
      idPlantilla: fila.idPlantilla,
      tipo: fila.tipo as TipoComunicacion,
      asunto: fila.asunto,
      contenidoHtml: fila.contenidoHtml,
      contenidoTexto: fila.contenidoTexto,
      variablesDisponibles: comoListaTexto(fila.variablesDisponibles),
      variablesObligatorias: comoListaTexto(fila.variablesObligatorias),
      fechaActualizacion: fila.fechaActualizacion,
      idUsuarioActualizo: fila.idUsuarioActualizo,
    };
  }
}
