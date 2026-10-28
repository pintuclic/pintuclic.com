import type { EventoNotificacion } from './notificaciones.port';

export type TipoComunicacion = EventoNotificacion['tipo'];
export type EstadoEnvio = 'pendiente' | 'enviado' | 'fallido';

export interface EntidadEnvioNotificacion {
  idEnvio: string;
  tipo: TipoComunicacion;
  destinatario: string;
  estado: EstadoEnvio;
  intentos: number;
  maxIntentos: number;
  ultimoError: string | null;
  fechaCreacion: Date;
  fechaResultado: Date | null;
}

export interface EntidadRebote {
  idRebote: string;
  idEnvio: string | null;
  destinatario: string;
  motivo: string | null;
  fechaRegistro: Date;
}

/**
 * RF-NOT-01-04 / RT-23: registro de envíos y rebotes para diagnóstico. Nunca
 * persiste contenido de correo ni datos sensibles — solo metadatos de resultado.
 */
export interface RegistroEnviosRepositoryPort {
  registrarResultado(datos: {
    tipo: TipoComunicacion;
    destinatario: string;
    estado: EstadoEnvio;
    intentos: number;
    maxIntentos: number;
    ultimoError?: string;
  }): Promise<string>;

  registrarRebote(idEnvio: string | null, destinatario: string, motivo?: string): Promise<void>;

  listarEnvios(filtros: {
    pagina: number;
    limite: number;
    tipo?: TipoComunicacion | undefined;
    estado?: EstadoEnvio | undefined;
  }): Promise<{ envios: EntidadEnvioNotificacion[]; total: number }>;

  listarRebotes(filtros: { pagina: number; limite: number }): Promise<{
    rebotes: EntidadRebote[];
    total: number;
  }>;
}
