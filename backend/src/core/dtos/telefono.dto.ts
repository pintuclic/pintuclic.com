import { z } from 'zod';

/**
 * Regla transversal del teléfono: la comparten todos los formularios y endpoints que piden uno
 * (registro, perfil, cuenta empresa y direcciones de M04; empleados de M17).
 * Vive aquí y no en cada módulo para que cambie en un solo sitio.
 *
 * ⚠️ Debe permanecer en paridad con `frontend/src/core/dtos/telefono.dto.ts`
 * y con `telefonoSchema` de `contracts/m04-cuentas.contract.ts`.
 */

/** Solo dígitos y los caracteres con que se escribe un número (+, espacios, paréntesis y guion). */
export const REGEX_TELEFONO = /^[0-9+\s()-]+$/;

export const telefonoSchema = z
  .string()
  .trim()
  .min(7, 'El teléfono debe tener al menos 7 dígitos')
  .max(20, 'El teléfono no puede exceder 20 caracteres')
  .regex(REGEX_TELEFONO, 'El teléfono solo debe contener números o caracteres de marcado');
