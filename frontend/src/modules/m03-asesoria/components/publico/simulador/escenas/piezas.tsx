import {
  aPuntos,
  rectanguloEnPlano,
  type PlanoPared,
} from '../../../../services/geometria-escenas';

/**
 * Piezas que comparten todos los ambientes del simulador (contrato M03 · S3).
 *
 * REGLA DE ESTE ARCHIVO: de todo lo que se dibuja, SOLO la pared lleva el color de la persona.
 * Piso, muebles, ventanas y cuadros son tonos fijos. Y la luz y la sombra se modelan con
 * capas blancas y negras de poca opacidad encima de la pared, no con mezclas que cambien el
 * tono: así un color claro sigue viéndose claro y uno oscuro, oscuro (S4).
 */

/** Los identificadores de los degradados que `EscenaAmbiente` define en su `<defs>`. */
export interface IdsEscena {
  readonly luz: string;
  readonly sombra: string;
  readonly madera: string;
  readonly cielo: string;
  readonly haz: string;
}

export interface PropsEscena {
  /** El color de la persona: lo único que cambia entre una pintura y otra. */
  readonly pared: string;
  readonly ids: IdsEscena;
}

/** Tonos fijos del mobiliario, para que ningún mueble dependa del color elegido. */
export const TONO = {
  madera: '#8E6340',
  maderaClara: '#B08A62',
  maderaOscura: '#5A4A3F',
  tela: '#9AA0A8',
  telaClara: '#AEB4BC',
  blanco: '#F6F3EE',
  crema: '#E8DCC8',
  terracota: '#C46B3E',
  grafito: '#2F3A46',
  hoja: '#4F8A4B',
  hojaClara: '#6FA866',
} as const;

const TRANSICION = 'transition-[fill] duration-300 motion-reduce:transition-none';

/**
 * Una pared pintada. El color va en `style` y no en el atributo `fill` para que la transición
 * de CSS lo anime al cambiar de color. `oscurecer` (0 a 1) apaga una pared que da la espalda a
 * la luz, como la lateral de una esquina.
 */
export function Pared({
  puntos,
  color,
  ids,
  oscurecer = 0,
}: {
  puntos: string;
  color: string;
  ids: IdsEscena;
  oscurecer?: number;
}) {
  return (
    <g data-pared="true">
      <polygon points={puntos} style={{ fill: color }} className={TRANSICION} />
      <polygon points={puntos} fill={`url(#${ids.luz})`} />
      <polygon points={puntos} fill={`url(#${ids.sombra})`} />
      {oscurecer > 0 && <polygon points={puntos} fill="#000" opacity={oscurecer} />}
    </g>
  );
}

/** Piso de madera. Con `tablones` dibuja las juntas, a las alturas indicadas. */
export function Piso({
  puntos,
  ids,
  tablones = [],
}: {
  puntos: string;
  ids: IdsEscena;
  tablones?: readonly { y: number; x0: number; x1: number }[];
}) {
  return (
    <g>
      <polygon points={puntos} fill={`url(#${ids.madera})`} />
      {tablones.map((t) => (
        <line key={t.y} x1={t.x0} x2={t.x1} y1={t.y} y2={t.y} stroke="#000" strokeOpacity={0.07} strokeWidth={1.5} />
      ))}
    </g>
  );
}

/** El zócalo blanco al pie de una pared de frente. */
export function Zocalo({ y, x0 = 0, x1 = 800 }: { y: number; x0?: number; x1?: number }) {
  return (
    <g>
      <rect x={x0} y={y} width={x1 - x0} height={12} fill={TONO.blanco} />
      <rect x={x0} y={y + 12} width={x1 - x0} height={5} fill="#000" opacity={0.09} />
    </g>
  );
}

/** Sombra suave de un mueble sobre el piso. */
export function SombraSuelo({ cx, cy, rx, ry = 12 }: { cx: number; cy: number; rx: number; ry?: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#000" opacity={0.16} />;
}

export function Alfombra({
  cx,
  cy,
  rx,
  ry,
  color = '#D8CBB8',
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  color?: string;
}) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={color} />
      <ellipse cx={cx} cy={cy} rx={rx * 0.86} ry={ry * 0.78} fill="none" stroke="#fff" strokeOpacity={0.45} strokeWidth={2} />
    </g>
  );
}

/** Ventana de frente: marco, vidrio con el degradado de cielo y dos travesaños. */
export function Ventana({
  x,
  y,
  w,
  h,
  ids,
  cortinas = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  ids: IdsEscena;
  cortinas?: boolean;
}) {
  return (
    <g>
      <rect x={x - 7} y={y - 7} width={w + 14} height={h + 14} fill={TONO.blanco} />
      <rect x={x} y={y} width={w} height={h} fill={`url(#${ids.cielo})`} />
      <rect x={x + w / 2 - 3} y={y} width={6} height={h} fill={TONO.blanco} />
      <rect x={x} y={y + h / 2 - 3} width={w} height={6} fill={TONO.blanco} />
      <rect x={x - 12} y={y + h + 7} width={w + 24} height={8} fill={TONO.blanco} />
      <rect x={x - 12} y={y + h + 15} width={w + 24} height={4} fill="#000" opacity={0.1} />
      {cortinas && (
        <g>
          <rect x={x - 30} y={y - 22} width={w + 60} height={7} rx={3} fill={TONO.maderaOscura} />
          <path d={`M${x - 24} ${y - 14} h${w * 0.3} v${h + 70} h-${w * 0.3} z`} fill={TONO.crema} />
          <path d={`M${x + w + 24} ${y - 14} h-${w * 0.3} v${h + 70} h${w * 0.3} z`} fill={TONO.crema} />
        </g>
      )}
    </g>
  );
}

/** Ventana dibujada sobre un plano en perspectiva (esquina o lateral de fachada). */
export function VentanaPlana({
  plano,
  u0,
  u1,
  v0,
  v1,
  ids,
}: {
  plano: PlanoPared;
  u0: number;
  u1: number;
  v0: number;
  v1: number;
  ids: IdsEscena;
}) {
  const du = (u1 - u0) * 0.07;
  const dv = (v1 - v0) * 0.07;
  const medio = (u0 + u1) / 2;
  return (
    <g>
      <polygon points={aPuntos(rectanguloEnPlano(plano, u0, u1, v0, v1))} fill={TONO.blanco} />
      <polygon
        points={aPuntos(rectanguloEnPlano(plano, u0 + du, u1 - du, v0 + dv, v1 - dv))}
        fill={`url(#${ids.cielo})`}
      />
      <polygon
        points={aPuntos(rectanguloEnPlano(plano, medio - 0.004, medio + 0.004, v0 + dv, v1 - dv))}
        fill={TONO.blanco}
      />
    </g>
  );
}

/** Un cuadro de pared, con una de tres láminas abstractas. */
export function Cuadro({
  x,
  y,
  w,
  h,
  lamina = 0,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  lamina?: 0 | 1 | 2;
}) {
  const ix = x + 7;
  const iy = y + 7;
  const iw = w - 14;
  const ih = h - 14;
  return (
    <g>
      <rect x={x + 3} y={y + 5} width={w} height={h} fill="#000" opacity={0.14} />
      <rect x={x} y={y} width={w} height={h} fill="#3A322C" />
      <rect x={ix} y={iy} width={iw} height={ih} fill="#F3ECE0" />
      {lamina === 0 && <circle cx={ix + iw / 2} cy={iy + ih * 0.42} r={Math.min(iw, ih) * 0.26} fill="#D9A15F" />}
      {lamina === 1 && (
        <g>
          <rect x={ix + iw * 0.14} y={iy + ih * 0.18} width={iw * 0.34} height={ih * 0.64} fill="#7C8F9E" />
          <rect x={ix + iw * 0.54} y={iy + ih * 0.32} width={iw * 0.3} height={ih * 0.5} fill="#C9826B" />
        </g>
      )}
      {lamina === 2 && (
        <path
          d={`M${ix} ${iy + ih * 0.7} q${iw * 0.25} -${ih * 0.4} ${iw * 0.5} 0 t${iw * 0.5} 0 V${iy + ih} H${ix} z`}
          fill="#8AA38B"
        />
      )}
    </g>
  );
}

/** Una planta en maceta; `x` e `y` son el centro de la base. */
export function Planta({ x, y, escala = 1 }: { x: number; y: number; escala?: number }) {
  const hojas: readonly { dx: number; dy: number; a: number; clara: boolean }[] = [
    { dx: -26, dy: -78, a: -28, clara: false },
    { dx: 0, dy: -96, a: 0, clara: true },
    { dx: 26, dy: -78, a: 28, clara: false },
    { dx: -14, dy: -58, a: -14, clara: true },
    { dx: 15, dy: -60, a: 14, clara: true },
  ];
  return (
    <g transform={`translate(${x} ${y}) scale(${escala})`}>
      <ellipse cx={0} cy={2} rx={34} ry={7} fill="#000" opacity={0.16} />
      {hojas.map((h) => (
        <ellipse
          key={`${h.dx}-${h.dy}`}
          cx={h.dx}
          cy={h.dy}
          rx={11}
          ry={30}
          transform={`rotate(${h.a} ${h.dx} ${h.dy})`}
          fill={h.clara ? TONO.hojaClara : TONO.hoja}
        />
      ))}
      <path d="M-26 -42 h52 l-8 42 h-36 z" fill="#B8654A" />
      <rect x={-28} y={-46} width={56} height={9} rx={3} fill="#C97358" />
    </g>
  );
}

/** Lámpara de mesa con su halo; `x` e `y` son el centro de la base. */
export function LamparaMesa({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y - 48} r={48} fill="#FFE9B0" opacity={0.16} />
      <rect x={x - 3} y={y - 40} width={6} height={36} fill={TONO.grafito} />
      <ellipse cx={x} cy={y} rx={16} ry={5} fill={TONO.grafito} />
      <path d={`M${x - 26} ${y - 36} L${x - 15} ${y - 74} h30 L${x + 26} ${y - 36} z`} fill="#F2E6CF" />
    </g>
  );
}

/** Mancha de luz de ventana sobre el piso. */
export function HazDeLuz({ puntos, ids }: { puntos: string; ids: IdsEscena }) {
  return <polygon points={puntos} fill={`url(#${ids.haz})`} />;
}
