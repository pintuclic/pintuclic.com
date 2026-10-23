/**
 * Utilidades puras del flujo de autenticación (sin React, probadas en tests/).
 */

/** "ana.perez@correo.com" -> "a•••@correo.com" (mockup de verificación, pág. 5). */
export function enmascararCorreo(correo: string): string {
  const [usuario, dominio] = correo.split('@');
  if (!usuario || !dominio) return correo;
  return `${usuario.charAt(0)}•••@${dominio}`;
}

/** Rutas del propio flujo de acceso: volver a ellas tras autenticarse sería un bucle. */
const RUTAS_DE_ACCESO = ['/login', '/registro', '/recuperar-contrasena', '/restablecer-contrasena'];

/**
 * Destino de retorno tras autenticarse (CA-SEG-02-06). Solo rutas internas
 * absolutas: evita redirecciones abiertas a otros dominios (`//evil.com`, `\\`).
 */
export function destinoSeguro(destino: string | undefined | null, respaldo = '/'): string {
  if (!destino || !destino.startsWith('/') || destino.startsWith('//') || destino.includes('\\')) {
    return respaldo;
  }
  const ruta = destino.split(/[?#]/)[0] ?? destino;
  if (RUTAS_DE_ACCESO.some((acceso) => ruta === acceso || ruta.startsWith(`${acceso}/`))) {
    return respaldo;
  }
  return destino;
}

/** Minutos enteros (redondeo hacia arriba) a partir de segundos. */
export function minutosDesde(segundos: number): number {
  return Math.max(1, Math.ceil(segundos / 60));
}
