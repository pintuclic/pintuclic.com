import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * M20 · HU-SEG-02 — Guarda de rutas protegidas.
 *
 * ⚠️ ESTO NO ES EL CONTROL DE ACCESO.
 *
 * El middleware solo comprueba que EXISTA la cookie de sesión. No puede
 * verificar que sea válida, que no haya expirado ni que el actor tenga permiso:
 * eso lo resuelve el servidor ante cada operación (RF-SEG-03-01, RNF-SEG-03-01).
 * Aquí se evita que alguien ya desconectado vea el esqueleto de una pantalla
 * antes de que la API le responda — es usabilidad, como fija RF-SEG-03-06.
 *
 * Una petición que esquive este middleware es rechazada igualmente por el
 * backend (CA-SEG-03-02 y CA-SEG-03-03).
 */

/** ADR-005. Debe coincidir con ATRIBUTOS_COOKIE_SESION del contrato. */
const COOKIE_SESION = 'pc_sid';

/** Prefijos que exigen sesión. El resto del sitio es público. */
const RUTAS_PROTEGIDAS = ['/admin', '/perfil', '/privacidad/mis-datos'];

export function middleware(req: NextRequest): NextResponse {
  const { pathname, search } = req.nextUrl;

  const exigeSesion = RUTAS_PROTEGIDAS.some(
    (prefijo) => pathname === prefijo || pathname.startsWith(`${prefijo}/`),
  );
  if (!exigeSesion) {
    return NextResponse.next();
  }

  if (req.cookies.has(COOKIE_SESION)) {
    return NextResponse.next();
  }

  // CA-SEG-02-06: se conserva el destino pretendido para volver a él tras
  // autenticarse de nuevo, en lugar de dejar al usuario en el inicio.
  const destino = new URL('/login', req.url);
  destino.searchParams.set('destino', `${pathname}${search}`);
  return NextResponse.redirect(destino);
}

export const config = {
  matcher: ['/admin/:path*', '/perfil/:path*', '/privacidad/mis-datos/:path*'],
};
