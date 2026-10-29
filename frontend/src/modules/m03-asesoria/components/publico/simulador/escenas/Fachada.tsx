import {
  aPuntos,
  rectanguloEnPlano,
  rectPuntos,
  type PlanoPared,
} from '../../../../services/geometria-escenas';
import { Pared, TONO, VentanaPlana, type PropsEscena } from './piezas';

/** La pared lateral de la casa, que se aleja hacia la derecha. */
const LATERAL: PlanoPared = { x0: 520, x1: 690, arriba0: 172, arriba1: 204, abajo0: 400, abajo1: 384 };

/** Una ventana de la fachada de frente, con su marco, sus travesaños y su alféizar. */
function VentanaFrente({ x, y, ids }: { x: number; y: number; ids: PropsEscena['ids'] }) {
  return (
    <g>
      <rect x={x - 7} y={y - 7} width={104} height={94} fill={TONO.blanco} />
      <rect x={x} y={y} width={90} height={80} fill={`url(#${ids.cielo})`} />
      <rect x={x + 42} y={y} width={6} height={80} fill={TONO.blanco} />
      <rect x={x} y={y + 37} width={90} height={6} fill={TONO.blanco} />
      <rect x={x - 12} y={y + 87} width={114} height={8} fill={TONO.blanco} />
      <rect x={x - 12} y={y + 95} width={114} height={4} fill="#000" opacity={0.12} />
    </g>
  );
}

/** Fachada de una casa de un piso: puerta, dos ventanas, una pared lateral, un árbol y un camino. */
export function Fachada({ pared, ids }: PropsEscena) {
  return (
    <g>
      {/* Cielo y jardín */}
      <rect x={0} y={0} width={800} height={300} fill={`url(#${ids.cielo})`} />
      <ellipse cx={120} cy={74} rx={58} ry={16} fill="#fff" opacity={0.85} />
      <ellipse cx={168} cy={64} rx={42} ry={14} fill="#fff" opacity={0.85} />
      <ellipse cx={690} cy={52} rx={52} ry={13} fill="#fff" opacity={0.8} />
      <rect x={0} y={296} width={800} height={204} fill="#8DB37A" />
      <rect x={0} y={296} width={800} height={204} fill="#000" opacity={0.04} />
      <polygon points="352,418 448,418 560,500 240,500" fill="#D9D2C6" />
      <polygon points="352,418 448,418 458,428 342,428" fill="#000" opacity={0.06} />

      {/* Techo: la cara de frente y la lateral */}
      <polygon points="320,66 492,96 712,206 538,174" fill="#6F3A2E" />
      <polygon points="104,176 320,66 538,174" fill="#8A4B3C" />
      <polygon points="104,176 320,66 538,174 538,182 104,184" fill="#000" opacity={0.06} />

      {/* Paredes pintadas */}
      <Pared puntos={rectPuntos(120, 176, 400, 224)} color={pared} ids={ids} />
      <Pared puntos={aPuntos(rectanguloEnPlano(LATERAL, 0, 1, 0, 1))} color={pared} ids={ids} oscurecer={0.15} />
      <line x1={520} y1={174} x2={520} y2={400} stroke="#000" strokeOpacity={0.14} strokeWidth={2} />

      {/* Zócalo de la casa */}
      <rect x={120} y={386} width={400} height={14} fill="#B7B0A5" />
      <polygon points={aPuntos(rectanguloEnPlano(LATERAL, 0, 1, 0.94, 1))} fill="#9B958B" />

      {/* Puerta */}
      <rect x={282} y={262} width={76} height={126} fill={TONO.blanco} />
      <rect x={290} y={270} width={60} height={118} fill="#6B4A32" />
      <rect x={298} y={282} width={44} height={40} fill="#000" opacity={0.12} />
      <rect x={298} y={332} width={44} height={44} fill="#000" opacity={0.12} />
      <circle cx={338} cy={340} r={3.5} fill="#E8DCC8" />

      {/* Ventanas */}
      <VentanaFrente x={168} y={232} ids={ids} />
      <VentanaFrente x={388} y={232} ids={ids} />
      <VentanaPlana plano={LATERAL} u0={0.3} u1={0.72} v0={0.26} v1={0.62} ids={ids} />

      {/* Arbusto y árbol */}
      <ellipse cx={150} cy={398} rx={44} ry={20} fill="#5E9B58" />
      <ellipse cx={176} cy={392} rx={30} ry={18} fill="#6FA866" />
      <ellipse cx={480} cy={400} rx={34} ry={16} fill="#5E9B58" />
      <ellipse cx={668} cy={414} rx={52} ry={9} fill="#000" opacity={0.12} />
      <rect x={656} y={316} width={22} height={100} fill="#6B4A32" />
      <circle cx={668} cy={276} r={64} fill="#5E9B58" />
      <circle cx={634} cy={304} r={42} fill="#4F8A4B" />
      <circle cx={706} cy={300} r={44} fill="#6FA866" />
    </g>
  );
}
