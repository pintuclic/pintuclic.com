import { geocodificacionInversaSchema, type GeocodificacionInversa } from '../dtos/m04-cuentas.dto';

const URL_GEOCODIFICACION_INVERSA = 'https://nominatim.openstreetmap.org/reverse';
const ESPERA_MAXIMA_MS = 8000;

/** Campos de la dirección que se pudieron deducir de las coordenadas; `null` si no hubo dato. */
export interface DireccionSugerida {
  direccion: string | null;
  barrio: string | null;
}

/**
 * Convierte la respuesta de geocodificación en los campos del formulario.
 * La dirección sigue el formato colombiano ("Calle 12 # 5-37"); el barrio sale del
 * nivel más fino que exista (barrio, sector, comuna), nunca de la ciudad.
 */
export function sugerirDireccion(respuesta: GeocodificacionInversa): DireccionSugerida {
  const partes = respuesta.address;
  const calle = partes?.road?.trim() || null;
  const numero = partes?.house_number?.trim() || null;
  const barrio =
    partes?.neighbourhood?.trim() || partes?.suburb?.trim() || partes?.quarter?.trim() || partes?.city_district?.trim() || null;

  return {
    direccion: calle ? (numero ? `${calle} # ${numero}` : calle) : null,
    barrio,
  };
}

/**
 * HU-CUE-07 · Averigua la dirección de unas coordenadas. Devuelve `null` si el servicio
 * no responde a tiempo, falla o no conoce el lugar: el formulario sigue siendo manual.
 */
export async function direccionDesdeCoordenadas(latitud: number, longitud: number): Promise<DireccionSugerida | null> {
  const parametros = new URLSearchParams({
    format: 'jsonv2',
    lat: String(latitud),
    lon: String(longitud),
    zoom: '18',
    addressdetails: '1',
    'accept-language': 'es',
  });
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), ESPERA_MAXIMA_MS);
  try {
    const respuesta = await fetch(`${URL_GEOCODIFICACION_INVERSA}?${parametros.toString()}`, {
      signal: controlador.signal,
      headers: { Accept: 'application/json' },
    });
    if (!respuesta.ok) return null;
    const analizada = geocodificacionInversaSchema.safeParse(await respuesta.json());
    if (!analizada.success) return null;
    const sugerida = sugerirDireccion(analizada.data);
    return sugerida.direccion || sugerida.barrio ? sugerida : null;
  } catch {
    return null;
  } finally {
    clearTimeout(temporizador);
  }
}
