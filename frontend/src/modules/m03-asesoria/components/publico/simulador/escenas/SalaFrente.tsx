import { rectPuntos } from '../../../../services/geometria-escenas';
import {
  Alfombra,
  Cuadro,
  HazDeLuz,
  LamparaMesa,
  Pared,
  Piso,
  Planta,
  SombraSuelo,
  TONO,
  Ventana,
  Zocalo,
  type PropsEscena,
} from './piezas';

/** Sala vista de frente: un sofá bajo tres cuadros, una ventana con cortinas y una mesa lateral. */
export function SalaFrente({ pared, ids }: PropsEscena) {
  return (
    <g>
      <Pared puntos={rectPuntos(0, 0, 800, 340)} color={pared} ids={ids} />
      <Piso
        puntos={rectPuntos(0, 340, 800, 160)}
        ids={ids}
        tablones={[
          { y: 380, x0: 0, x1: 800 },
          { y: 428, x0: 0, x1: 800 },
          { y: 470, x0: 0, x1: 800 },
        ]}
      />
      <Zocalo y={328} />

      <Ventana x={70} y={70} w={150} h={170} ids={ids} cortinas />
      <HazDeLuz puntos="90,350 250,350 340,470 120,492" ids={ids} />

      <Cuadro x={300} y={70} w={110} h={140} lamina={0} />
      <Cuadro x={430} y={96} w={84} h={112} lamina={1} />
      <Cuadro x={532} y={70} w={72} h={72} lamina={2} />

      <Alfombra cx={400} cy={432} rx={290} ry={44} />
      <Planta x={64} y={428} />

      {/* Sofá */}
      <SombraSuelo cx={400} cy={374} rx={220} />
      <rect x={225} y={350} width={10} height={16} fill={TONO.maderaOscura} />
      <rect x={565} y={350} width={10} height={16} fill={TONO.maderaOscura} />
      <rect x={215} y={235} width={370} height={112} rx={24} fill={TONO.tela} />
      <rect x={188} y={268} width={52} height={92} rx={20} fill={TONO.telaClara} />
      <rect x={560} y={268} width={52} height={92} rx={20} fill={TONO.telaClara} />
      <rect x={225} y={298} width={350} height={54} rx={14} fill={TONO.telaClara} />
      <rect x={225} y={336} width={350} height={16} rx={8} fill="#000" opacity={0.08} />
      <rect x={400} y={300} width={2} height={46} fill="#000" opacity={0.1} />
      <rect x={236} y={262} width={64} height={62} rx={12} fill={TONO.terracota} transform="rotate(-8 268 293)" />
      <rect x={500} y={266} width={58} height={58} rx={12} fill={TONO.crema} transform="rotate(7 529 295)" />
      <rect x={452} y={272} width={56} height={52} rx={12} fill="#7B8794" />

      {/* Mesa lateral con lámpara */}
      <SombraSuelo cx={692} cy={358} rx={50} ry={8} />
      <rect x={650} y={296} width={84} height={10} rx={3} fill={TONO.madera} />
      <rect x={658} y={306} width={7} height={52} fill={TONO.maderaOscura} />
      <rect x={719} y={306} width={7} height={52} fill={TONO.maderaOscura} />
      <LamparaMesa x={692} y={296} />
    </g>
  );
}
