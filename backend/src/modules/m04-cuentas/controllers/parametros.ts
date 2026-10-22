import type { Request } from 'express';
import { idUuidSchema } from '../dtos/m04-cuentas.dto';

/**
 * Lee un parámetro de ruta que debe ser un UUID.
 *
 * Devuelve `null` si falta o no es un UUID válido. El llamador responde entonces
 * con la respuesta opaca de recurso no disponible (RN-SEG-08): un identificador
 * mal formado y uno inexistente son indistinguibles, y Prisma nunca recibe un
 * valor que no pueda castear a `uuid` (que de otro modo acabaría en un 500).
 */
export function leerParamUuid(req: Request, nombre: string): string | null {
  const bruto = req.params[nombre];
  const valor = Array.isArray(bruto) ? bruto[0] : bruto;
  const resultado = idUuidSchema.safeParse(valor);
  return resultado.success ? resultado.data : null;
}
