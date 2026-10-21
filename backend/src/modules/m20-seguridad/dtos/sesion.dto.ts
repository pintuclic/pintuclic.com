import { z } from 'zod';

/** RF-SEG-02-04. El cuerpo va vacío: la sesión se identifica por la cookie. */
export const cerrarSesionSchema = z.object({}).strict();
export type CerrarSesionDto = z.infer<typeof cerrarSesionSchema>;
