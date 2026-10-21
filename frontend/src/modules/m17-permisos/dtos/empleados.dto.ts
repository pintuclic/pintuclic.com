import { z } from 'zod';

/**
 * ==============================================================================
 * DTOs de Empleados / Colaboradores — M17 (Frontend)
 * ==============================================================================
 * Regla de Oro #11: Sin `any`. Tipado estricto con inferencia Zod 4.
 * Directiva #12: Esquemas Zod centralizados en `dtos/`, nunca inline en `.tsx`.
 */

export const correoSchema = z
  .string()
  .min(1, 'El correo electrónico es obligatorio')
  .email('Ingrese un correo electrónico válido')
  .max(150, 'El correo no puede superar los 150 caracteres')
  .toLowerCase();

export const telefonoSchema = z
  .string()
  .trim()
  .min(7, 'El teléfono debe tener al menos 7 dígitos')
  .max(20, 'El teléfono no puede superar los 20 caracteres')
  .regex(/^[0-9+\s()-]+$/, 'El teléfono solo debe contener números o caracteres de marcado');

/**
 * Teléfono en edición: admite además la cadena vacía.
 *
 * Un colaborador puede tener `telefono: null`, y el formulario lo precarga como
 * `''`. Con `telefonoSchema.optional()` —que solo acepta `undefined`— ese caso
 * fallaba el mínimo de 7 dígitos y bloqueaba la edición incluso para cambiar
 * solo el nombre. El vacío se valida aquí y la vista lo omite del payload,
 * porque el contrato del backend tampoco acepta `''`
 * (`editarEmpleadoInputSchema`).
 */
export const telefonoEdicionSchema = z
  .string()
  .trim()
  .max(20, 'El teléfono no puede superar los 20 caracteres')
  .regex(
    /^[0-9+\s()-]*$/,
    'El teléfono solo debe contener números o caracteres de marcado',
  )
  .refine(
    (valor) => valor === '' || valor.length >= 7,
    'El teléfono debe tener al menos 7 dígitos',
  );

export const documentoIdentidadSchema = z
  .string()
  .trim()
  .min(5, 'El documento debe tener al menos 5 caracteres')
  .max(30, 'El documento no puede superar los 30 caracteres');

export const contrasenaSchema = z
  .string()
  .min(12, 'La contraseña debe tener al menos 12 caracteres (RN-SEG-01)')
  .max(128, 'La contraseña no puede superar los 128 caracteres');

/** HU-ADM-01: Creación de Colaborador */
export const crearEmpleadoDto = z.object({
  nombre: z
    .string()
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(150, 'El nombre no puede superar los 150 caracteres'),
  documento: documentoIdentidadSchema,
  correo: correoSchema,
  telefono: telefonoSchema,
});
export type CrearEmpleadoFormData = z.infer<typeof crearEmpleadoDto>;

/** HU-ADM-01: Edición de Datos Básicos de Colaborador */
export const editarEmpleadoDto = z.object({
  nombre: z
    .string()
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(150, 'El nombre no puede superar los 150 caracteres')
    .optional(),
  telefono: telefonoEdicionSchema.optional(),
});
export type EditarEmpleadoFormData = z.infer<typeof editarEmpleadoDto>;

/** HU-ADM-01 / HU-ADM-04: Desactivación con confirmación explícita */
export const desactivarEmpleadoDto = z.object({
  confirmacion: z.boolean().refine((val) => val === true, {
    message: 'Debe confirmar explícitamente la desactivación',
  }),
});
export type DesactivarEmpleadoFormData = z.infer<typeof desactivarEmpleadoDto>;

/** HU-ADM-01: Primer acceso y cambio obligatorio de credencial */
export const primerAccesoEmpleadoDto = z
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
export type PrimerAccesoEmpleadoFormData = z.infer<typeof primerAccesoEmpleadoDto>;
