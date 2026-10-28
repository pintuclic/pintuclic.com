/**
 * Las superficies que ofrece la calculadora (mockup VISTAS.pdf, pág. 10).
 *
 * Lo ÚNICO que cambia entre una y otra es el vocabulario: cómo se llama el segundo lado y
 * cómo se cuentan las piezas iguales. El cálculo es el mismo, `ancho × ladoMayor × piezas`.
 * No hay coeficientes por tipo de superficie —ni «una puerta se pinta por las dos caras»,
 * ni mermas por textura— porque el catálogo no registra ese dato y no se inventan cifras:
 * la advertencia del resultado ya dice que el rendimiento real varía.
 *
 * Vive fuera de los componentes para poder probarlo sin DOM: el proyecto no tiene jsdom.
 */

export type TipoSuperficie = 'paredes' | 'techos' | 'puertas' | 'muebles';

export interface Superficie {
  id: TipoSuperficie;
  /** Lo que se lee en el botón: «Paredes». */
  etiqueta: string;
  /** Etiqueta del segundo campo: «Alto (m)» o «Largo (m)». */
  etiquetaLadoMayor: string;
  /** Cómo nombrarlo dentro de un mensaje de error: «el alto», «el largo». */
  ladoMayor: string;
  /** Rótulo del contador: «Cantidad de paredes iguales». */
  contador: string;
}

export const SUPERFICIES: ReadonlyArray<Superficie> = [
  {
    id: 'paredes',
    etiqueta: 'Paredes',
    etiquetaLadoMayor: 'Alto (m)',
    ladoMayor: 'el alto',
    contador: 'Cantidad de paredes iguales',
  },
  {
    // Un techo se mide en planta: ancho por largo. Pedirle el «alto» a un techo no
    // significa nada, y es el error que delata una calculadora copiada de las paredes.
    id: 'techos',
    etiqueta: 'Techos',
    etiquetaLadoMayor: 'Largo (m)',
    ladoMayor: 'el largo',
    contador: 'Cantidad de techos iguales',
  },
  {
    id: 'puertas',
    etiqueta: 'Puertas',
    etiquetaLadoMayor: 'Alto (m)',
    ladoMayor: 'el alto',
    contador: 'Cantidad de puertas iguales',
  },
  {
    id: 'muebles',
    etiqueta: 'Muebles',
    etiquetaLadoMayor: 'Alto (m)',
    ladoMayor: 'el alto',
    contador: 'Cantidad de muebles iguales',
  },
];

export const SUPERFICIE_POR_DEFECTO: TipoSuperficie = 'paredes';

export function superficiePorId(id: TipoSuperficie): Superficie {
  const encontrada = SUPERFICIES.find((s) => s.id === id);
  // El tipo ya lo garantiza; el respaldo evita un `!` y deja la función total.
  return encontrada ?? SUPERFICIES[0]!;
}
