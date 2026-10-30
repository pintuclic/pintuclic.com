import { z } from 'zod';

/**
 * ============================================================================
 * DTOs Y ESQUEMAS — M10. Entrega (espejo de contracts/m10-entrega.contract.ts)
 * ============================================================================
 * La voz de la verdad es el contrato. Regenerar copiando el cuerpo tras el primer cierre de comentario.
 * ============================================================================
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. ENUMS OFICIALES
 * ─────────────────────────────────────────────────────────────────────────── */

export const PROVEEDOR_ENVIO_PROPIO = 'envio_propio';

/** Estado del envío en el proveedor; el estado de la orden sigue siendo de M08. */
export const ESTADOS_ENVIO = ['pendiente', 'creado', 'en_transito', 'con_novedad', 'entregado', 'fallido'] as const;
export const estadoEnvioSchema = z.enum(ESTADOS_ENVIO);
export type EstadoEnvio = z.infer<typeof estadoEnvioSchema>;

export const CODIGOS_ERROR_M10 = {
  RECURSO_NO_DISPONIBLE: 'RECURSO_NO_DISPONIBLE',
  PARAMETRO_INVALIDO: 'PARAMETRO_INVALIDO',
  PROVEEDOR_NO_CONFIGURADO: 'PROVEEDOR_NO_CONFIGURADO',
  PROVEEDOR_NO_DISPONIBLE: 'PROVEEDOR_NO_DISPONIBLE',
  ERROR_INTERNO: 'ERROR_INTERNO',
} as const;

/* ───────────────────────────────────────────────────────────────────────────
 * 2. TIPOS DEL PUERTO (lo que M10 le pide al proveedor y lo que este responde)
 * ─────────────────────────────────────────────────────────────────────────── */

/** Destino del envío. `municipio` y `departamento` son null hasta que M04/M07 los capturen (P1). */
export const destinoEnvioSchema = z.object({
  direccion: z.string().min(1).max(255),
  barrio: z.string().max(100).nullable(),
  complemento: z.string().max(100).nullable(),
  municipio: z.string().max(100).nullable(),
  departamento: z.string().max(100).nullable(),
  /** null si la orden guardó la dirección como texto y no se pudo separar quién recibe. */
  nombreRecibe: z.string().max(150).nullable(),
  telefonoRecibe: z.string().max(20).nullable(),
});
export type DestinoEnvio = z.infer<typeof destinoEnvioSchema>;

/** Un bulto. Los pesos y medidas son null hasta que el catálogo los guarde (P2). */
export const bultoEnvioSchema = z.object({
  descripcion: z.string().max(150),
  cantidad: z.number().int().positive(),
  pesoGramos: z.number().int().positive().nullable(),
  altoCm: z.number().positive().nullable(),
  anchoCm: z.number().positive().nullable(),
  largoCm: z.number().positive().nullable(),
  valorDeclarado: z.number().nonnegative(),
});
export type BultoEnvio = z.infer<typeof bultoEnvioSchema>;

export const solicitudCotizacionSchema = z.object({
  destino: destinoEnvioSchema,
  bultos: z.array(bultoEnvioSchema).min(1),
  /** Total de la mercancía, para la regla de envío gratis del adaptador por defecto. */
  totalMercancia: z.number().nonnegative(),
});
export type SolicitudCotizacion = z.infer<typeof solicitudCotizacionSchema>;

export const opcionEnvioSchema = z.object({
  proveedor: z.string().min(1),
  servicio: z.string().min(1).max(100),
  costo: z.number().nonnegative(),
  diasEstimados: z.number().int().nonnegative().nullable(),
});
export type OpcionEnvio = z.infer<typeof opcionEnvioSchema>;

export const solicitudCrearEnvioSchema = z.object({
  codigoOrden: z.string().min(1),
  destino: destinoEnvioSchema,
  bultos: z.array(bultoEnvioSchema).min(1),
  servicio: z.string().max(100).nullable(),
});
export type SolicitudCrearEnvio = z.infer<typeof solicitudCrearEnvioSchema>;

export const resultadoCrearEnvioSchema = z.object({
  proveedor: z.string().min(1),
  idExterno: z.string().max(100).nullable(),
  numeroGuia: z.string().max(100).nullable(),
  urlSeguimiento: z.string().url().nullable(),
  urlEtiqueta: z.string().url().nullable(),
});
export type ResultadoCrearEnvio = z.infer<typeof resultadoCrearEnvioSchema>;

export const seguimientoEnvioSchema = z.object({
  estado: estadoEnvioSchema,
  detalle: z.string().max(500).nullable(),
  fechaEstimadaEntrega: z.string().datetime().nullable(),
  eventos: z.array(z.object({ fecha: z.string().datetime(), descripcion: z.string().max(500) })),
});
export type SeguimientoEnvio = z.infer<typeof seguimientoEnvioSchema>;

/** Lo que el proveedor reporta por webhook, ya traducido por su adaptador. */
export const eventoProveedorEnvioSchema = z.object({
  idExterno: z.string().min(1),
  estado: estadoEnvioSchema,
  detalle: z.string().max(500).nullable(),
});
export type EventoProveedorEnvio = z.infer<typeof eventoProveedorEnvioSchema>;

/**
 * Puerto que implementará cada proveedor (R1). El adaptador `envio_propio` es el de por defecto (R2).
 * Las operaciones que el proveedor no soporte lanzan `ProveedorEnvioError`, nunca devuelven datos inventados.
 */
export interface ServicioEnviosPort {
  readonly proveedor: string;
  cotizar(solicitud: SolicitudCotizacion): Promise<OpcionEnvio[]>;
  crearEnvio(solicitud: SolicitudCrearEnvio): Promise<ResultadoCrearEnvio>;
  consultarSeguimiento(idExterno: string): Promise<SeguimientoEnvio | null>;
  /** Traduce el cuerpo crudo del webhook al evento del contrato; null si no es un evento de envío. */
  interpretarWebhook(cuerpo: unknown): EventoProveedorEnvio | null;
}

/* ───────────────────────────────────────────────────────────────────────────
 * 3. ENTIDAD Y RESPUESTAS DE LA API
 * ─────────────────────────────────────────────────────────────────────────── */

export const envioOrdenSchema = z.object({
  codigoOrden: z.string(),
  proveedor: z.string(),
  estado: estadoEnvioSchema,
  numeroGuia: z.string().nullable(),
  urlSeguimiento: z.string().url().nullable(),
  /** Solo el personal recibe la etiqueta. */
  urlEtiqueta: z.string().url().nullable(),
  ultimoError: z.string().nullable(),
  fechaCreacion: z.string().datetime(),
  fechaActualizacion: z.string().datetime(),
});
export type EnvioOrden = z.infer<typeof envioOrdenSchema>;

/** Lo que ve el cliente: sin etiqueta ni errores internos. */
export const envioClienteSchema = envioOrdenSchema.omit({ urlEtiqueta: true, ultimoError: true });
export type EnvioCliente = z.infer<typeof envioClienteSchema>;

export const novedadEnvioSchema = z.object({
  idNovedad: z.string().uuid(),
  detalle: z.string(),
  fecha: z.string().datetime(),
});
export type NovedadEnvio = z.infer<typeof novedadEnvioSchema>;

export const envioDetallePersonalSchema = z.object({
  envio: envioOrdenSchema.nullable(),
  novedades: z.array(novedadEnvioSchema),
});
export type EnvioDetallePersonal = z.infer<typeof envioDetallePersonalSchema>;

export const webhookEnvioOutputSchema = z.object({ procesado: z.boolean() });
export type WebhookEnvioOutput = z.infer<typeof webhookEnvioOutputSchema>;

export const PERMISOS_M10 = { ver: 'ventas.ver', gestionar: 'ventas.gestionar' } as const;

export const codigoOrdenParamsSchema = z.object({ codigo: z.string().trim().min(1).max(50) });

/* ───────────────────────────────────────────────────────────────────────────
 * 4. MAPA DE RUTAS
 * ───────────────────────────────────────────────────────────────────────────
 *  Cliente (exige sesión; solo sus pedidos, R5)
 *  GET  /api/v1/ordenes/mis-pedidos/:codigo/envio            → EnvioCliente | 404
 *  Personal (`ventas.ver` / `ventas.gestionar`, R9)
 *  GET  /api/v1/ordenes/gestion/:codigo/envio                → EnvioDetallePersonal
 *  POST /api/v1/ordenes/gestion/:codigo/envio/reintentar     → EnvioOrden        (gestionar, R4)
 *  Proveedor (sin sesión, token compartido, R7)
 *  POST /api/v1/entregas/webhook/:proveedor                  → { procesado }
 * ─────────────────────────────────────────────────────────────────────────── */
