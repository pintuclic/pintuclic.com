/**
 * La hora que acompaña a cada burbuja (mockup VISTAS.pdf, pág. 11: «10:30 a. m.»).
 *
 * Se calcula en el navegador y NO viaja al servidor: H1 dice que la conversación no se
 * guarda en ningún sitio, así que esta hora solo existe mientras el panel está abierto.
 */
export function horaDeChat(fecha: Date): string {
  return fecha.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true });
}
