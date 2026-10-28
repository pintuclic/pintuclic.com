import type { TipoComunicacion } from './registro-envios.port';

export interface EntidadPlantillaNotificacion {
  idPlantilla: string;
  tipo: TipoComunicacion;
  asunto: string;
  contenidoTexto: string;
  fechaActualizacion: Date;
  idUsuarioActualizo: number | null;
}

export interface CambiosPlantilla {
  asunto?: string | undefined;
  contenidoTexto?: string | undefined;
}

/**
 * HU-NOT-03: plantillas de comunicación administrables desde el panel. Solo texto
 * plano (asunto + copia introductoria) — el admin nunca edita HTML ni variables.
 */
export interface PlantillasRepositoryPort {
  listar(): Promise<EntidadPlantillaNotificacion[]>;
  obtenerPorTipo(tipo: TipoComunicacion): Promise<EntidadPlantillaNotificacion | null>;
  actualizar(
    tipo: TipoComunicacion,
    cambios: CambiosPlantilla,
    idAdmin?: number,
  ): Promise<EntidadPlantillaNotificacion>;
}
