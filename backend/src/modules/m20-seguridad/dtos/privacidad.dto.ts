import { z } from 'zod';

/**
 * DTOs de HU-SEG-05. Espejo de docs/contracts/m20-seguridad.contract.ts.
 * Regla de Oro #2: ningún request toca un servicio sin pasar por Zod.
 */

export const otorgarConsentimientoSchema = z.object({
  idAvisoPrivacidad: z.number().int().positive(),
  aceptado: z.literal(true),
});
export type OtorgarConsentimientoDto = z.infer<typeof otorgarConsentimientoSchema>;

export const crearSolicitudSupresionSchema = z.object({
  motivo: z.string().max(500).optional(),
});
export type CrearSolicitudSupresionDto = z.infer<typeof crearSolicitudSupresionSchema>;
