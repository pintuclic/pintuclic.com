import {
  INTERVALO_CONSULTA_MAXIMO_SEGUNDOS,
  INTERVALO_CONSULTA_SEGUNDOS,
  RUTA_DE_SECCION,
  SECCIONES,
  type Seccion,
} from './fp02-notificaciones.dto';

/**
 * Lógica pura del sondeo (FP-02 · R13e). Sin temporizadores ni DOM: así se prueba sin navegador y el gestor solo la usa.
 */

/** Sin tocar la pantalla durante este tiempo, se deja de consultar: ahorra servidor y deja que la sesión caduque. */
export const INACTIVIDAD_MAXIMA_MS = 10 * 60_000;

/** Tras una respuesta igual a la anterior el intervalo crece 1,5 veces, hasta el máximo; si algo cambió, vuelve al base. */
export function intervaloSiguiente(actualSegundos: number, huboCambio: boolean): number {
  if (huboCambio) return INTERVALO_CONSULTA_SEGUNDOS;
  return Math.min(INTERVALO_CONSULTA_MAXIMO_SEGUNDOS, Math.round(actualSegundos * 1.5));
}

/** Milisegundos de espera con ±10 % de desfase, para que miles de navegadores no consulten a la vez. `azar` va de 0 a 1. */
export function esperaConDesfase(segundos: number, azar: number): number {
  const factor = 0.9 + 0.2 * Math.min(1, Math.max(0, azar));
  return Math.round(segundos * 1000 * factor);
}

export const CLAVE_TURNO = 'pc-notificaciones-turno';
export const CLAVE_ULTIMA = 'pc-notificaciones-ultima';

interface Turno {
  id: string;
  expira: number;
}

type AlmacenMinimo = Pick<Storage, 'getItem' | 'setItem'>;

function leerTurno(almacen: AlmacenMinimo): Turno | null {
  try {
    const bruto = almacen.getItem(CLAVE_TURNO);
    if (bruto === null) return null;
    const valor: unknown = JSON.parse(bruto);
    if (typeof valor !== 'object' || valor === null) return null;
    const { id, expira } = valor as Record<string, unknown>;
    return typeof id === 'string' && typeof expira === 'number' ? { id, expira } : null;
  } catch {
    return null;
  }
}

/**
 * Una sola consulta por navegador aunque haya varias pestañas visibles (R13e): quien tiene el turno vigente consulta y
 * avisa a las demás; el resto espera. Devuelve si esta pestaña (`yo`) puede consultar ahora. Si el almacenamiento falla,
 * se consulta igual (peor caso: una consulta por pestaña).
 */
export function tomarTurno(almacen: AlmacenMinimo, yo: string, ahoraMs: number, vigenciaMs: number): boolean {
  const actual = leerTurno(almacen);
  if (actual !== null && actual.id !== yo && actual.expira > ahoraMs) return false;
  try {
    almacen.setItem(CLAVE_TURNO, JSON.stringify({ id: yo, expira: ahoraMs + vigenciaMs } satisfies Turno));
  } catch {
    // Sin almacenamiento no hay coordinación, pero la consulta sigue funcionando.
  }
  return true;
}

/** La sección del menú a la que pertenece una dirección (la ruta más específica que la contiene), o null. */
export function seccionDeRuta(pathname: string | null): Seccion | null {
  if (pathname === null) return null;
  let mejor: Seccion | null = null;
  let largo = -1;
  for (const seccion of SECCIONES) {
    const ruta = RUTA_DE_SECCION[seccion];
    // `/perfil` (cuenta) solo cuenta si la dirección es exactamente esa: sus hijas tienen sección propia o ninguna.
    const coincide = seccion === 'cuenta' ? pathname === ruta : pathname === ruta || pathname.startsWith(`${ruta}/`);
    if (coincide && ruta.length > largo) {
      mejor = seccion;
      largo = ruta.length;
    }
  }
  return mejor;
}

/** Texto del número: topa en 99 y pasa a «99+». */
export function textoContador(n: number, tope = 99): string {
  return n > tope ? `${String(tope)}+` : String(n);
}

/** «hace 5 min», «hace 2 h», «ayer»… sin dependencias. */
export function horaRelativa(fechaIso: string, ahora: Date = new Date()): string {
  const segundos = Math.max(0, Math.round((ahora.getTime() - new Date(fechaIso).getTime()) / 1000));
  if (segundos < 60) return 'ahora';
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `hace ${String(minutos)} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${String(horas)} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'ayer' : `hace ${String(dias)} días`;
}

/** La sección que pinta su punto en un ítem del menú con esa dirección exacta (p. ej. `/admin/pedidos`), o null. */
export function seccionDeHref(href: string): Seccion | null {
  return SECCIONES.find((seccion) => RUTA_DE_SECCION[seccion] === href) ?? null;
}
