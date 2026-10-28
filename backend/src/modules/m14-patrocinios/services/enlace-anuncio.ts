/** Origen ficticio para resolver rutas internas: si el resultado cambia de origen, la ruta no era interna. */
const ORIGEN_INTERNO = 'https://interno.invalid';

/**
 * B6 y M2: deja el enlace de un anuncio en la forma exacta en que se guarda y a la que redirige el servidor, o null si
 * no es seguro. Solo `https://…` y rutas internas de una sola barra. Además de lo que ya exige el contrato, rechaza lo
 * que el navegador interpretaría como otro sitio (`/\evil.com` se lee como `//evil.com`) y los caracteres de control,
 * de modo que el 302 jamás salga hacia donde el personal no quiso (no es un redirector abierto).
 */
export function normalizarEnlace(enlace: string): string | null {
  const limpio = enlace.trim();
  if (limpio === '' || limpio.includes('\\') || [...limpio].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) {
    return null;
  }
  try {
    if (/^https:\/\//i.test(limpio)) {
      const url = new URL(limpio);
      return url.protocol === 'https:' && url.hostname !== '' ? url.href : null;
    }
    if (!limpio.startsWith('/') || limpio.startsWith('//')) return null;
    const url = new URL(limpio, ORIGEN_INTERNO);
    if (url.origin !== ORIGEN_INTERNO) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export const esEnlaceExterno = (enlace: string): boolean => enlace.startsWith('https://');
