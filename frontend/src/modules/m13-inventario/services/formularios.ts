import { ajustarExistenciaRequestSchema, type AjustarExistenciaRequest } from '../dtos/m13-inventario.dto';
import type { FormAjuste } from '../dtos/formularios.dto';

export type Resultado<T> = { ok: true; valor: T } | { ok: false; mensaje: string };

/**
 * Cuerpo del ajuste manual (R4): `existenciaEsperada` es la existencia que se veía al abrir el
 * formulario; si otra persona la cambió mientras tanto, la API responde 409 y no escribe.
 */
export function aCuerpoAjuste(f: FormAjuste, existenciaEsperada: number): Resultado<AjustarExistenciaRequest> {
  const r = ajustarExistenciaRequestSchema.safeParse({
    existencia: Number(f.existencia),
    existenciaEsperada,
    motivo: f.motivo,
    ...(f.nota.trim() === '' ? {} : { nota: f.nota.trim() }),
  });
  return r.success
    ? { ok: true, valor: r.data }
    : { ok: false, mensaje: r.error.issues[0]?.message ?? 'Datos no válidos' };
}
