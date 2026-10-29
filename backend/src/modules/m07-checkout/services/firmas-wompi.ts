import { createHash, timingSafeEqual } from 'node:crypto';

function sha256(texto: string): string {
  return createHash('sha256').update(texto, 'utf8').digest('hex');
}

/** R11: firma de integridad de una transacción (SHA-256 de reference + amount_in_cents + currency + secreto). */
export function firmaIntegridad(referencia: string, montoEnCentavos: number, moneda: string, secreto: string): string {
  return sha256(`${referencia}${montoEnCentavos}${moneda}${secreto}`);
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

/** Lee `transaction.id` dentro de `data`; undefined si el camino no existe o no es un valor simple. */
function valorEn(data: unknown, camino: string): string | undefined {
  let actual: unknown = data;
  for (const parte of camino.split('.')) {
    if (!esObjeto(actual)) return undefined;
    actual = actual[parte];
  }
  if (typeof actual === 'string') return actual;
  if (typeof actual === 'number' || typeof actual === 'boolean') return String(actual);
  return undefined;
}

/**
 * R5 a: el checksum que Wompi debió calcular para este evento: los valores de `signature.properties` leídos de
 * `data`, en ese orden, luego `timestamp` y el secreto de eventos, con SHA-256. Null si el evento no trae lo
 * necesario: un evento así no es de Wompi.
 */
export function checksumEsperado(cuerpo: unknown, secretoEventos: string): string | null {
  if (!esObjeto(cuerpo) || !esObjeto(cuerpo.signature)) return null;
  const propiedades = cuerpo.signature.properties;
  const timestamp = cuerpo.timestamp;
  if (!Array.isArray(propiedades) || propiedades.length === 0) return null;
  if (typeof timestamp !== 'number' && typeof timestamp !== 'string') return null;
  let concatenado = '';
  for (const propiedad of propiedades) {
    if (typeof propiedad !== 'string') return null;
    const valor = valorEn(cuerpo.data, propiedad);
    if (valor === undefined) return null;
    concatenado += valor;
  }
  return sha256(`${concatenado}${String(timestamp)}${secretoEventos}`);
}

/** R5 a: compara en tiempo constante con el checksum de la cabecera o, si no viene, el del cuerpo. */
export function firmaEventoValida(cuerpo: unknown, checksumCabecera: string | null, secretoEventos: string): boolean {
  const esperado = checksumEsperado(cuerpo, secretoEventos);
  if (esperado === null) return false;
  const delCuerpo =
    esObjeto(cuerpo) && esObjeto(cuerpo.signature) && typeof cuerpo.signature.checksum === 'string'
      ? cuerpo.signature.checksum
      : null;
  const recibido = (checksumCabecera ?? delCuerpo ?? '').trim().toLowerCase();
  const a = Buffer.from(esperado, 'utf8');
  const b = Buffer.from(recibido, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
