import { z } from 'zod';

/**
 * ==============================================================================
 * DTOs de Entrega — M10 (Frontend)
 * ==============================================================================
 * Espejo de las respuestas de contracts/m10-entrega.contract.ts que consume la interfaz.
 */

export const ESTADOS_ENVIO = ['pendiente', 'creado', 'en_transito', 'con_novedad', 'entregado', 'fallido'] as const;
export const estadoEnvioSchema = z.enum(ESTADOS_ENVIO);
export type EstadoEnvio = z.infer<typeof estadoEnvioSchema>;

export const envioOrdenSchema = z.object({
  codigoOrden: z.string(),
  proveedor: z.string(),
  estado: estadoEnvioSchema,
  numeroGuia: z.string().nullable(),
  urlSeguimiento: z.string().url().nullable(),
  urlEtiqueta: z.string().url().nullable(),
  ultimoError: z.string().nullable(),
  fechaCreacion: z.string().datetime(),
  fechaActualizacion: z.string().datetime(),
});
export type EnvioOrden = z.infer<typeof envioOrdenSchema>;

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

export const envioClienteResponseEnvelopeSchema = z.object({ success: z.literal(true), data: envioClienteSchema });
export const envioPersonalResponseEnvelopeSchema = z.object({ success: z.literal(true), data: envioDetallePersonalSchema });
export const envioOrdenResponseEnvelopeSchema = z.object({ success: z.literal(true), data: envioOrdenSchema });
