import { MAXIMO_EVENTOS_POR_AVISO, type EventoMedicion } from '../dtos/m14-patrocinios.dto';

const URL_MEDICION = `${process.env.NEXT_PUBLIC_API_URL ?? '/api/v1'}/patrocinios/medicion`;
/** Espera para agrupar los avisos de una misma pantalla en un solo envío. */
const ESPERA_MS = 800;

const cola: EventoMedicion[] = [];
let temporizador: ReturnType<typeof setTimeout> | null = null;
let escuchando = false;
/** Lo ya avisado en esta carga de página: una impresión se cuenta una sola vez por elemento (M3). */
const impresionesAvisadas = new Set<string>();

/** Clave estable de una impresión, para no repetirla en la misma carga de página. */
export const claveImpresion = (e: EventoMedicion): string =>
  e.entidad === 'anuncio' ? `anuncio:${e.id}` : `campania:${e.id}:${e.ubicacion}`;

function enviar(): void {
  if (temporizador !== null) {
    clearTimeout(temporizador);
    temporizador = null;
  }
  while (cola.length > 0) {
    const eventos = cola.splice(0, MAXIMO_EVENTOS_POR_AVISO);
    const cuerpo = JSON.stringify({ eventos });
    // `sendBeacon` sobrevive al cierre o al cambio de página; sin él (o si lo rechaza) se usa fetch con `keepalive`.
    const lanzado =
      typeof navigator !== 'undefined' &&
      typeof navigator.sendBeacon === 'function' &&
      navigator.sendBeacon(URL_MEDICION, new Blob([cuerpo], { type: 'application/json' }));
    if (!lanzado) {
      void fetch(URL_MEDICION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: cuerpo,
        keepalive: true,
      }).catch(() => undefined);
    }
  }
}

function escucharCierre(): void {
  if (escuchando || typeof window === 'undefined') return;
  escuchando = true;
  window.addEventListener('pagehide', enviar);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') enviar();
  });
}

/**
 * M3, M4: avisa al servidor que algo se vio o recibió un clic. Es de «dispara y olvida»: nunca bloquea la pantalla ni
 * muestra un error, y si el navegador bloquea el aviso la página sigue igual (las cifras son indicativas, M7). Las
 * impresiones se cuentan una vez por elemento y carga de página.
 */
export function avisarMedicion(evento: EventoMedicion): void {
  if (typeof window === 'undefined') return;
  if (evento.tipo === 'impresion') {
    const clave = claveImpresion(evento);
    if (impresionesAvisadas.has(clave)) return;
    impresionesAvisadas.add(clave);
  }
  escucharCierre();
  cola.push(evento);
  if (cola.length >= MAXIMO_EVENTOS_POR_AVISO) enviar();
  else temporizador ??= setTimeout(enviar, ESPERA_MS);
}

/** Solo para pruebas. */
export function reiniciarMedicionCliente(): void {
  cola.length = 0;
  impresionesAvisadas.clear();
  if (temporizador !== null) clearTimeout(temporizador);
  temporizador = null;
  escuchando = false;
}
