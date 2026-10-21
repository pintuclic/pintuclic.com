import { z } from 'zod';
import { contrasenaSchema, correoSchema } from './empleados.dto';

/**
 * ==============================================================================
 * DTOs de Gobernanza de la Cuenta Administradora — M17 (Frontend)
 * ==============================================================================
 * HU-ADM-07: Sustitución de Correo Maestro y Primer Acceso.
 */

export const solicitarSustitucionCorreoDto = z.object({
  nuevoCorreo: correoSchema,
});
export type SolicitarSustitucionCorreoFormData = z.infer<typeof solicitarSustitucionCorreoDto>;

export const confirmarSustitucionCorreoDto = z.object({
  tokenConfirmacion: z
    .string()
    .trim()
    .min(16, 'El token debe tener al menos 16 caracteres'),
});
export type ConfirmarSustitucionCorreoFormData = z.infer<typeof confirmarSustitucionCorreoDto>;

export const primerAccesoAdminDto = z
  .object({
    credencialTemporal: z
      .string()
      .min(8, 'La credencial temporal debe tener al menos 8 caracteres'),
    nuevaContrasena: contrasenaSchema,
    confirmarContrasena: z.string().min(1, 'Confirme la nueva contraseña'),
  })
  .refine((data) => data.nuevaContrasena === data.confirmarContrasena, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmarContrasena'],
  });
export type PrimerAccesoAdminFormData = z.infer<typeof primerAccesoAdminDto>;
