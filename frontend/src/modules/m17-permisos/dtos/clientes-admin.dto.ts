import { z } from 'zod';

/**
 * ==============================================================================
 * DTOs de Clientes en Administración — M17 (Frontend)
 * ==============================================================================
 * HU-ADM-05 / RN-ADM-08: El motivo de desactivación es obligatorio (mínimo 5 caracteres).
 */

export const desactivarClienteDto = z.object({
  motivo: z
    .string()
    .trim()
    .min(5, 'El motivo de desactivación debe tener al menos 5 caracteres (RN-ADM-08)')
    .max(500, 'El motivo no puede superar los 500 caracteres'),
  confirmacion: z.boolean().refine((val) => val === true, {
    message: 'Debe confirmar explícitamente la acción de desactivación',
  }),
});
export type DesactivarClienteFormData = z.infer<typeof desactivarClienteDto>;
