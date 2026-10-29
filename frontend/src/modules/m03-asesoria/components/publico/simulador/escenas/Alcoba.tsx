import { rectPuntos } from '../../../../services/geometria-escenas';
import {
  Alfombra,
  Cuadro,
  HazDeLuz,
  LamparaMesa,
  Pared,
  Piso,
  SombraSuelo,
  TONO,
  Ventana,
  Zocalo,
  type PropsEscena,
} from './piezas';

/** Una mesa de noche con dos cajones; `x` es su borde izquierdo. */
function MesaDeNoche({ x }: { x: number }) {
  return (
    <g>
      <SombraSuelo cx={x + 40} cy={352} rx={52} ry={8} />
      <rect x={x} y={272} width={80} height={78} rx={4} fill={TONO.madera} />
      <rect x={x + 6} y={280} width={68} height={30} fill="#000" opacity={0.1} />
      <rect x={x + 6} y={314} width={68} height={30} fill="#000" opacity={0.1} />
      <circle cx={x + 40} cy={295} r={3} fill="#E8DCC8" />
      <circle cx={x + 40} cy={329} r={3} fill="#E8DCC8" />
      <rect x={x + 6} y={350} width={7} height={10} fill={TONO.maderaOscura} />
      <rect x={x + 67} y={350} width={7} height={10} fill={TONO.maderaOscura} />
    </g>
  );
}

/** Alcoba vista de frente: la cama contra la pared, una mesa de noche a cada lado y un cuadro grande. */
export function Alcoba({ pared, ids }: PropsEscena) {
  return (
    <g>
      <Pared puntos={rectPuntos(0, 0, 800, 340)} color={pared} ids={ids} />
      <Piso
        puntos={rectPuntos(0, 340, 800, 160)}
        ids={ids}
        tablones={[
          { y: 382, x0: 0, x1: 800 },
          { y: 430, x0: 0, x1: 800 },
          { y: 472, x0: 0, x1: 800 },
        ]}
      />
      <Zocalo y={328} />

      <Ventana x={648} y={56} w={120} h={170} ids={ids} cortinas />
      <HazDeLuz puntos="600,356 700,356 700,470 560,494" ids={ids} />
      <Cuadro x={290} y={42} w={220} h={86} lamina={2} />
      <Alfombra cx={400} cy={438} rx={310} ry={42} color="#CFC3B0" />

      <MesaDeNoche x={96} />
      <MesaDeNoche x={624} />
      <LamparaMesa x={136} y={272} />
      <LamparaMesa x={664} y={272} />

      {/* Cama */}
      <SombraSuelo cx={400} cy={372} rx={226} ry={13} />
      <rect x={200} y={344} width={400} height={20} rx={5} fill={TONO.maderaOscura} />
      <rect x={216} y={136} width={368} height={140} rx={16} fill="#6B5B4E" />
      <rect x={232} y={152} width={336} height={108} rx={10} fill="#000" opacity={0.08} />
      <rect x={206} y={262} width={388} height={92} rx={14} fill={TONO.blanco} />
      <rect x={206} y={300} width={388} height={34} fill="#D9D4CB" />
      <rect x={206} y={338} width={388} height={16} rx={8} fill="#000" opacity={0.07} />
      <rect x={244} y={226} width={134} height={48} rx={18} fill="#fff" stroke="#000" strokeOpacity={0.09} />
      <rect x={422} y={226} width={134} height={48} rx={18} fill="#fff" stroke="#000" strokeOpacity={0.09} />
      <rect x={348} y={254} width={104} height={30} rx={12} fill="#B9674A" />
    </g>
  );
}
