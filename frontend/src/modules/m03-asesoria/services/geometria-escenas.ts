/**
 * Geometría de los ambientes del simulador (contrato M03 · S3).
 *
 * Las vistas de frente se dibujan con rectángulos. Las que miran a una esquina, o la pared
 * lateral de una fachada, son planos en perspectiva: un cuadrilátero cuyos bordes superior e
 * inferior se acercan o se alejan. Para colocar una ventana o un cuadro SOBRE ese plano sin
 * calcular a mano cada vértice, se describe en coordenadas del propio plano —`u` a lo largo
 * (0 a 1) y `v` a lo alto (0 a 1)— y aquí se convierte a la pantalla.
 *
 * Es lógica pura, sin React ni DOM, para poder probarla sin navegador.
 */

export interface Punto {
  readonly x: number;
  readonly y: number;
}

/** Un plano vertical visto en perspectiva: de `x0` a `x1`, con su altura al empezar y al acabar. */
export interface PlanoPared {
  readonly x0: number;
  readonly x1: number;
  readonly arriba0: number;
  readonly arriba1: number;
  readonly abajo0: number;
  readonly abajo1: number;
}

const mezclar = (a: number, b: number, t: number): number => a + (b - a) * t;
const redondear = (n: number): number => Math.round(n * 10) / 10;

/** El punto del plano en (`u`, `v`): (0, 0) es la esquina superior del lado `x0` y (1, 1) la inferior del lado `x1`. */
export function puntoEnPlano(plano: PlanoPared, u: number, v: number): Punto {
  const arriba = mezclar(plano.arriba0, plano.arriba1, u);
  const abajo = mezclar(plano.abajo0, plano.abajo1, u);
  return { x: mezclar(plano.x0, plano.x1, u), y: mezclar(arriba, abajo, v) };
}

/** Los cuatro vértices de un rectángulo dibujado sobre el plano, en el orden en que se recorren. */
export function rectanguloEnPlano(plano: PlanoPared, u0: number, u1: number, v0: number, v1: number): Punto[] {
  return [puntoEnPlano(plano, u0, v0), puntoEnPlano(plano, u1, v0), puntoEnPlano(plano, u1, v1), puntoEnPlano(plano, u0, v1)];
}

/** El valor del atributo `points` de un `<polygon>`. */
export function aPuntos(puntos: readonly Punto[]): string {
  return puntos.map((p) => `${redondear(p.x)},${redondear(p.y)}`).join(' ');
}

/** `points` de un rectángulo de frente. */
export function rectPuntos(x: number, y: number, ancho: number, alto: number): string {
  return aPuntos([
    { x, y },
    { x: x + ancho, y },
    { x: x + ancho, y: y + alto },
    { x, y: y + alto },
  ]);
}
