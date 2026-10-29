export type TipoComunicacion =
  | 'registro_otp'
  | 'recuperacion_password'
  | 'activacion_empleado'
  | 'cambio_correo_otp'
  | 'cambio_correo_confirmado'
  | 'dictamen_empresa'
  | 'alerta_servicio_ia'
  | 'comprobante_venta'
  | 'orden_despachada'
  | 'orden_cancelada'
  | 'cotizacion_respondida'
  | 'cotizacion_rechazada';

export type EstadoEnvio = 'pendiente' | 'enviado' | 'fallido';

export interface PlantillaNotificacion {
  tipo: TipoComunicacion;
  asunto: string;
  contenidoTexto: string;
  fechaActualizacion: string;
}

export interface ListarPlantillasRespuesta {
  plantillas: PlantillaNotificacion[];
}

export interface PrevisualizarPlantillaRespuesta {
  asunto: string;
  contenidoHtml: string;
  contenidoTexto: string;
}

export interface EnvioNotificacion {
  idEnvio: string;
  tipo: TipoComunicacion;
  destinatario: string;
  estado: EstadoEnvio;
  intentos: number;
  maxIntentos: number;
  ultimoError: string | null;
  fechaCreacion: string;
  fechaResultado: string | null;
}

export interface ListarEnviosRespuesta {
  envios: EnvioNotificacion[];
  total: number;
  pagina: number;
  limite: number;
}

export interface ReboteNotificacion {
  idRebote: string;
  idEnvio: string | null;
  destinatario: string;
  motivo: string | null;
  fechaRegistro: string;
}

export interface ListarRebotesRespuesta {
  rebotes: ReboteNotificacion[];
  total: number;
  pagina: number;
  limite: number;
}
