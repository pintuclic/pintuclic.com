import { z } from 'zod';

/**
 * ==============================================================================
 * DTOs de Notificaciones y Comunicaciones — M18 (Frontend)
 * ==============================================================================
 * Espejo del formulario de edición de plantillas (HU-NOT-03).
 */

export const editarPlantillaFormSchema = z.object({
  asunto: z.string().trim().min(1, 'El asunto no puede estar vacío').max(200),
  contenidoTexto: z.string().trim().min(1, 'El texto introductorio no puede estar vacío'),
});
export type EditarPlantillaFormData = z.infer<typeof editarPlantillaFormSchema>;
