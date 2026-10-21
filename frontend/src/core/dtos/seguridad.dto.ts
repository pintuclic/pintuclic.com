import { z } from 'zod';

/**
 * DTOs transversales de seguridad (M20 · HU-SEG-01).
 *
 * Los consumen M04 (registro, login, recuperación, cambio de contraseña) y M17
 * (alta de empleados). Viven aquí y no en cada formulario porque la Directiva
 * #12 prohíbe declarar esquemas Zod dentro de componentes `.tsx`.
 *
 * ⚠️ Deben permanecer en paridad con
 * `.sdlc/docs/contracts/m20-seguridad.contract.ts`. Si el contrato cambia, esto
 * cambia con él: es el mismo requisito expresado del lado del navegador.
 */

/** RN-SEG-01. El mismo mínimo que valida el servidor. */
export const contrasenaSchema = z
  .string()
  .min(12, 'La contraseña debe tener al menos 12 caracteres')
  .max(128, 'La contraseña no puede superar los 128 caracteres');

export const correoSchema = z
  .string()
  .email('Introduce un correo electrónico válido')
  .max(150)
  .toLowerCase();

/**
 * RN-SEG-02 — Toda cuenta tiene contraseña propia, incluidas las creadas con
 * Google. Este esquema sirve tanto al alta por formulario como al paso de
 * contraseña obligatorio tras registrarse con Google (RF-CUE-02-04).
 */
export const establecerContrasenaSchema = z
  .object({
    contrasena: contrasenaSchema,
    confirmacion: z.string(),
  })
  .refine((datos) => datos.contrasena === datos.confirmacion, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmacion'],
  });

export type EstablecerContrasenaDto = z.infer<typeof establecerContrasenaSchema>;
