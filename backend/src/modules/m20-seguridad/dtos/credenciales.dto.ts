import { z } from 'zod';

/** RN-SEG-01. Lo consumen M04 y M17 al capturar o cambiar credenciales. */
export const contrasenaSchema = z
  .string()
  .min(12, 'La contraseña debe tener al menos 12 caracteres')
  .max(128, 'La contraseña no puede superar los 128 caracteres');

export const correoSchema = z.string().email().max(150).toLowerCase();
