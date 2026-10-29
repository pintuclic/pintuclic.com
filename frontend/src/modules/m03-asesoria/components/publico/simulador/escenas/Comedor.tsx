import { rectPuntos } from '../../../../services/geometria-escenas';
import {
  Alfombra,
  Cuadro,
  HazDeLuz,
  Pared,
  Piso,
  Planta,
  SombraSuelo,
  TONO,
  Ventana,
  Zocalo,
  type PropsEscena,
} from './piezas';

/** Una silla vista de frente, detrás de la mesa: se ve el respaldo y las patas. */
function Silla({ x }: { x: number }) {
  return (
    <g>
      <rect x={x} y={186} width={72} height={104} rx={12} fill="#C9A27A" />
      <rect x={x + 8} y={196} width={56} height={8} rx={3} fill="#000" opacity={0.1} />
      <rect x={x + 8} y={214} width={56} height={8} rx={3} fill="#000" opacity={0.1} />
      <rect x={x + 8} y={232} width={56} height={8} rx={3} fill="#000" opacity={0.1} />
      <rect x={x + 6} y={336} width={8} height={52} fill={TONO.madera} />
      <rect x={x + 58} y={336} width={8} height={52} fill={TONO.madera} />
    </g>
  );
}

/** Comedor visto de frente: una mesa con cuatro sillas, una lámpara colgante, dos cuadros y una ventana. */
export function Comedor({ pared, ids }: PropsEscena) {
  return (
    <g>
      <Pared puntos={rectPuntos(0, 0, 800, 340)} color={pared} ids={ids} />
      <Piso
        puntos={rectPuntos(0, 340, 800, 160)}
        ids={ids}
        tablones={[
          { y: 384, x0: 0, x1: 800 },
          { y: 432, x0: 0, x1: 800 },
          { y: 474, x0: 0, x1: 800 },
        ]}
      />
      <Zocalo y={328} />

      <Ventana x={620} y={80} w={120} h={150} ids={ids} />
      <HazDeLuz puntos="620,350 720,350 770,470 580,492" ids={ids} />
      <Cuadro x={74} y={84} w={104} h={136} lamina={1} />
      <Cuadro x={196} y={110} w={72} h={92} lamina={0} />
      <Planta x={742} y={430} />
      <Alfombra cx={400} cy={430} rx={270} ry={46} color="#D4C6B1" />

      {/* Lámpara colgante */}
      <circle cx={400} cy={130} r={92} fill="#FFE9B0" opacity={0.13} />
      <rect x={398} y={0} width={4} height={84} fill={TONO.grafito} />
      <path d="M346 126 L370 82 h60 L454 126 z" fill={TONO.grafito} />
      <ellipse cx={400} cy={126} rx={54} ry={7} fill="#FFE9B0" opacity={0.7} />

      {/* Sillas detrás de la mesa */}
      <SombraSuelo cx={400} cy={392} rx={236} ry={12} />
      <Silla x={212} />
      <Silla x={334} />
      <Silla x={456} />
      <Silla x={578} />

      {/* Mesa */}
      <rect x={196} y={262} width={408} height={34} fill="#000" opacity={0.14} />
      <rect x={190} y={252} width={420} height={18} rx={5} fill={TONO.maderaClara} />
      <rect x={190} y={266} width={420} height={6} fill="#000" opacity={0.12} />
      <rect x={214} y={272} width={12} height={112} fill={TONO.madera} />
      <rect x={574} y={272} width={12} height={112} fill={TONO.madera} />
      <ellipse cx={400} cy={250} rx={34} ry={4} fill="#fff" opacity={0.5} />
      <rect x={380} y={232} width={40} height={20} rx={6} fill="#E8DCC8" />
      <path d="M392 232 q8 -22 16 0" fill={TONO.hoja} />
    </g>
  );
}
