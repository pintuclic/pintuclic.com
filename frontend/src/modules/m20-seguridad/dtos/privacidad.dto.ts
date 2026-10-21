import { z } from 'zod';

/**
 * Validación de los payloads de HU-SEG-05 antes de salir al servidor.
 *
 * El servidor vuelve a validarlo todo: esto es conveniencia para el usuario,
 * nunca la barrera. RF-SEG-03-04 obliga a que el backend rechace igualmente una
 * petición manipulada que esquive esta capa.
 */

export const otorgarConsentimientoSchema = z.object({
  idAvisoPrivacidad: z.number().int().positive(),
  aceptado: z.literal(true, {
    message: 'Debes aceptar el aviso de privacidad para continuar',
  }),
});
export type OtorgarConsentimientoDto = z.infer<typeof otorgarConsentimientoSchema>;

export const crearSolicitudSupresionSchema = z.object({
  motivo: z.string().max(500).optional(),
});
export type CrearSolicitudSupresionDto = z.infer<typeof crearSolicitudSupresionSchema>;
