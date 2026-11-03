import { INTERVALO_CONSULTA_SEGUNDOS, type Resumen } from './fp02-notificaciones.dto';
import { obtenerResumen } from './notificaciones-api';
import { registrarRefresco, useNotificacionesStore } from './notificacionesStore';
import {
  CLAVE_ULTIMA,
  INACTIVIDAD_MAXIMA_MS,
  esperaConDesfase,
  intervaloSiguiente,
  tomarTurno,
} from './sondeo';

/**
 * Gestor único del sondeo de `/notificaciones/resumen` (FP-02 · R13e). Una sola instancia por pestaña, compartida por
 * todos los componentes que lo pidan (cuenta de usos). Cumple, en el navegador:
 *  - consulta SOLO con la pestaña visible, y se detiene tras INACTIVIDAD_MAXIMA_MS sin que la persona toque la pantalla;
 *  - desfase aleatorio de ±10 % en cada espera;
 *  - UNA consulta por navegador: la pestaña con el turno consulta y avisa a las demás por BroadcastChannel;
 *  - intervalo que crece mientras la respuesta no cambia (hasta el máximo) y vuelve al base cuando algo cambia;
 *  - al volver a la pestaña, consulta al momento si lo último que se supo ya es viejo.
 */

const CANAL = 'pc-notificaciones';
const ID_PESTANA = `p${Math.random().toString(36).slice(2, 10)}`;

let usos = 0;
let temporizador: ReturnType<typeof setTimeout> | null = null;
let intervalo = INTERVALO_CONSULTA_SEGUNDOS;
let ultimoCuerpo = '';
let ultimaActividad = 0;
let consultando = false;
let canal: BroadcastChannel | null = null;
let limpiezas: Array<() => void> = [];

function almacen(): Pick<Storage, 'getItem' | 'setItem'> | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function visible(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'visible';
}

function activa(): boolean {
  return Date.now() - ultimaActividad < INACTIVIDAD_MAXIMA_MS;
}

function programar(segundos: number): void {
  if (temporizador !== null) clearTimeout(temporizador);
  temporizador = setTimeout(() => void ciclo(), esperaConDesfase(segundos, Math.random()));
}

function aplicar(resumen: Resumen, huboCambio: boolean): void {
  useNotificacionesStore.getState().aplicarResumen(resumen);
  intervalo = intervaloSiguiente(intervalo, huboCambio);
}

async function ciclo(forzar = false): Promise<void> {
  if (usos === 0 || consultando) return;
  if (!visible() || !activa()) return; // se reanuda sola al volver o al tocar la pantalla
  const memoria = almacen();
  const turno = memoria === null || tomarTurno(memoria, ID_PESTANA, Date.now(), esperaConDesfase(intervalo, 1) + 5_000);
  if (!turno && !forzar) {
    programar(intervalo);
    return;
  }
  consultando = true;
  try {
    const resumen = await obtenerResumen();
    const cuerpo = JSON.stringify(resumen);
    const huboCambio = cuerpo !== ultimoCuerpo;
    ultimoCuerpo = cuerpo;
    aplicar(resumen, huboCambio);
    try {
      memoria?.setItem(CLAVE_ULTIMA, String(Date.now()));
    } catch {
      // Sin almacenamiento solo se pierde el atajo de «consulté hace poco».
    }
    canal?.postMessage({ resumen, de: ID_PESTANA });
  } catch {
    // Sin red o con sesión caducada el sondeo sigue más despacio; el 401 ya limpia la sesión y el gestor se detiene.
    intervalo = intervaloSiguiente(intervalo, false);
  } finally {
    consultando = false;
    if (usos > 0) programar(intervalo);
  }
}

function alVolver(): void {
  if (!visible() || usos === 0) return;
  ultimaActividad = Date.now();
  const ultima = Number(almacen()?.getItem(CLAVE_ULTIMA) ?? 0);
  const viejo = Date.now() - ultima > INTERVALO_CONSULTA_SEGUNDOS * 1000;
  // Un pequeño desfase también al volver: mil pestañas que despiertan juntas no deben consultar a la vez.
  if (temporizador !== null) clearTimeout(temporizador);
  intervalo = INTERVALO_CONSULTA_SEGUNDOS;
  temporizador = setTimeout(() => void ciclo(), viejo ? Math.round(Math.random() * 1500) : esperaConDesfase(intervalo, Math.random()));
}

function alActuar(): void {
  const estabaDormida = !activa();
  ultimaActividad = Date.now();
  if (estabaDormida && visible() && usos > 0) alVolver();
}

function iniciar(): void {
  ultimaActividad = Date.now();
  intervalo = INTERVALO_CONSULTA_SEGUNDOS;
  ultimoCuerpo = '';
  if (typeof BroadcastChannel !== 'undefined') {
    canal = new BroadcastChannel(CANAL);
    canal.onmessage = (evento: MessageEvent<unknown>) => {
      const dato = evento.data as { resumen?: Resumen; de?: string } | null;
      if (dato?.resumen !== undefined && dato.de !== ID_PESTANA) {
        const cuerpo = JSON.stringify(dato.resumen);
        const huboCambio = cuerpo !== ultimoCuerpo;
        ultimoCuerpo = cuerpo;
        useNotificacionesStore.getState().aplicarResumen(dato.resumen);
        // La pestaña que no tiene el turno se limita a escuchar: reprograma su propio respaldo.
        intervalo = intervaloSiguiente(intervalo, huboCambio);
        programar(intervalo);
      }
    };
  }
  const eventos: Array<[EventTarget, string]> = [
    [document, 'visibilitychange'],
    [window, 'pointerdown'],
    [window, 'keydown'],
    [window, 'scroll'],
  ];
  document.addEventListener('visibilitychange', alVolver);
  for (const [objetivo, nombre] of eventos.slice(1)) objetivo.addEventListener(nombre, alActuar, { passive: true });
  limpiezas.push(() => {
    document.removeEventListener('visibilitychange', alVolver);
    for (const [objetivo, nombre] of eventos.slice(1)) objetivo.removeEventListener(nombre, alActuar);
  });
  limpiezas.push(registrarRefresco(() => void refrescarYa()));
  void ciclo(true);
}

/** Tras marcar algo leído o abrir la campanita: consulta ya, saltándose el turno (la persona acaba de actuar aquí). */
async function refrescarYa(): Promise<void> {
  if (usos === 0) return;
  ultimaActividad = Date.now();
  intervalo = INTERVALO_CONSULTA_SEGUNDOS;
  if (temporizador !== null) clearTimeout(temporizador);
  await ciclo(true);
}

function detener(): void {
  if (temporizador !== null) clearTimeout(temporizador);
  temporizador = null;
  canal?.close();
  canal = null;
  for (const limpiar of limpiezas) limpiar();
  limpiezas = [];
  useNotificacionesStore.getState().reiniciar();
}

/** Pide el sondeo; devuelve cómo soltarlo. El primero en pedirlo lo arranca y el último en soltarlo lo detiene. */
export function usarSondeo(): () => void {
  usos += 1;
  if (usos === 1) iniciar();
  let suelto = false;
  return () => {
    if (suelto) return;
    suelto = true;
    usos -= 1;
    if (usos === 0) detener();
  };
}
