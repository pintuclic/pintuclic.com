import {
  aPuntos,
  rectanguloEnPlano,
  type PlanoPared,
} from '../../../../services/geometria-escenas';
import {
  Alfombra,
  HazDeLuz,
  Pared,
  Piso,
  SombraSuelo,
  TONO,
  VentanaPlana,
  type PropsEscena,
} from './piezas';

/** La pared de la izquierda y la de la derecha de una esquina vista desde dentro de la sala. */
const IZQUIERDA: PlanoPared = { x0: 0, x1: 470, arriba0: 10, arriba1: 60, abajo0: 440, abajo1: 380 };
const DERECHA: PlanoPared = { x0: 470, x1: 800, arriba0: 60, arriba1: 10, abajo0: 380, abajo1: 440 };

/** Un cuadro sobre un plano en perspectiva. */
function CuadroEnPlano({ plano, u0, u1, v0, v1 }: { plano: PlanoPared; u0: number; u1: number; v0: number; v1: number }) {
  const du = (u1 - u0) * 0.1;
  const dv = (v1 - v0) * 0.07;
  return (
    <g>
      <polygon points={aPuntos(rectanguloEnPlano(plano, u0, u1, v0, v1))} fill="#3A322C" />
      <polygon points={aPuntos(rectanguloEnPlano(plano, u0 + du, u1 - du, v0 + dv, v1 - dv))} fill="#F3ECE0" />
      <polygon
        points={aPuntos(rectanguloEnPlano(plano, u0 + du * 2.2, u1 - du * 2.2, v0 + dv * 3, v1 - dv * 5))}
        fill="#C9826B"
      />
    </g>
  );
}

/** Sala vista desde una esquina: una ventana a un lado, una repisa al otro, una butaca y una lámpara de pie. */
export function SalaEsquina({ pared, ids }: PropsEscena) {
  return (
    <g>
      <polygon points="0,0 800,0 800,10 470,60 0,10" fill={TONO.blanco} />
      <Pared puntos={aPuntos(rectanguloEnPlano(IZQUIERDA, 0, 1, 0, 1))} color={pared} ids={ids} />
      <Pared puntos={aPuntos(rectanguloEnPlano(DERECHA, 0, 1, 0, 1))} color={pared} ids={ids} oscurecer={0.13} />
      <line x1={470} y1={60} x2={470} y2={380} stroke="#000" strokeOpacity={0.14} strokeWidth={2} />

      <Piso puntos="0,440 470,380 800,440 800,500 0,500" ids={ids} />
      <polygon points={aPuntos(rectanguloEnPlano(IZQUIERDA, 0, 1, 0.955, 1))} fill={TONO.blanco} />
      <polygon points={aPuntos(rectanguloEnPlano(DERECHA, 0, 1, 0.955, 1))} fill="#E4E0D8" />

      <VentanaPlana plano={IZQUIERDA} u0={0.14} u1={0.56} v0={0.17} v1={0.64} ids={ids} />
      <HazDeLuz puntos="40,452 250,424 340,474 90,500" ids={ids} />

      <CuadroEnPlano plano={DERECHA} u0={0.16} u1={0.34} v0={0.16} v1={0.46} />
      <CuadroEnPlano plano={DERECHA} u0={0.42} u1={0.56} v0={0.22} v1={0.46} />
      <polygon points={aPuntos(rectanguloEnPlano(DERECHA, 0.14, 0.62, 0.62, 0.655))} fill={TONO.madera} />
      <polygon points={aPuntos(rectanguloEnPlano(DERECHA, 0.2, 0.27, 0.54, 0.62))} fill={TONO.terracota} />
      <polygon points={aPuntos(rectanguloEnPlano(DERECHA, 0.3, 0.36, 0.5, 0.62))} fill={TONO.grafito} />
      <polygon points={aPuntos(rectanguloEnPlano(DERECHA, 0.4, 0.5, 0.56, 0.62))} fill={TONO.crema} />

      <Alfombra cx={360} cy={452} rx={250} ry={34} />

      {/* Mesa de centro */}
      <SombraSuelo cx={300} cy={466} rx={80} ry={9} />
      <rect x={236} y={452} width={6} height={20} fill={TONO.maderaOscura} />
      <rect x={358} y={452} width={6} height={20} fill={TONO.maderaOscura} />
      <ellipse cx={300} cy={438} rx={76} ry={19} fill={TONO.madera} />
      <ellipse cx={300} cy={434} rx={72} ry={16} fill={TONO.maderaClara} />

      {/* Butaca junto a la esquina */}
      <SombraSuelo cx={522} cy={462} rx={100} ry={12} />
      <rect x={470} y={440} width={9} height={22} fill={TONO.maderaOscura} />
      <rect x={566} y={440} width={9} height={22} fill={TONO.maderaOscura} />
      <rect x={458} y={326} width={130} height={104} rx={24} fill="#6B7F8E" />
      <rect x={436} y={372} width={36} height={78} rx={15} fill="#7C909E" />
      <rect x={574} y={372} width={36} height={78} rx={15} fill="#7C909E" />
      <rect x={466} y={394} width={114} height={50} rx={12} fill="#7C909E" />
      <rect x={482} y={350} width={82} height={36} rx={12} fill={TONO.crema} opacity={0.9} />

      {/* Lámpara de pie */}
      <SombraSuelo cx={712} cy={460} rx={34} ry={7} />
      <circle cx={712} cy={176} r={62} fill="#FFE9B0" opacity={0.16} />
      <rect x={709} y={190} width={6} height={268} fill={TONO.grafito} />
      <ellipse cx={712} cy={458} rx={26} ry={6} fill={TONO.grafito} />
      <path d="M676 192 L690 140 h44 L748 192 z" fill="#F2E6CF" />
    </g>
  );
}
