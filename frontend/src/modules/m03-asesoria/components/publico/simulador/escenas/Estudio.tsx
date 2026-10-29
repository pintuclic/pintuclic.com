import { rectPuntos } from '../../../../services/geometria-escenas';
import {
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

/** Los lomos de los libros, en tonos fijos y apagados para que no compitan con la pared. */
const LIBROS = ['#7C8F9E', '#C9826B', '#D9C7B0', '#5F7A6A', '#B08A62', '#8E6340', '#A9B4BE', '#C46B3E'] as const;

/** Una balda de la biblioteca con sus libros; `y` es la altura de la tabla. */
function Balda({ y }: { y: number }) {
  const libros: { x: number; w: number; h: number; color: string }[] = [];
  let x = 574;
  let i = 0;
  while (x < 736) {
    const w = 11 + ((i * 5) % 9);
    const h = 38 + ((i * 7) % 18);
    libros.push({ x, w, h, color: LIBROS[i % LIBROS.length] ?? '#7C8F9E' });
    x += w + 2;
    i += 1;
  }
  return (
    <g>
      {libros.map((l) => (
        <rect key={l.x} x={l.x} y={y - l.h} width={l.w} height={l.h} fill={l.color} />
      ))}
      <rect x={560} y={y} width={190} height={7} fill={TONO.maderaOscura} />
    </g>
  );
}

/** Estudio visto de frente: un escritorio con monitor y silla, una biblioteca y una ventana. */
export function Estudio({ pared, ids }: PropsEscena) {
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

      <Ventana x={64} y={66} w={130} h={160} ids={ids} />
      <HazDeLuz puntos="70,350 200,350 300,470 90,492" ids={ids} />
      <Cuadro x={304} y={42} w={92} h={82} lamina={1} />
      <Planta x={236} y={430} escala={0.9} />

      {/* Biblioteca */}
      <rect x={552} y={40} width={206} height={304} fill={TONO.madera} />
      <rect x={560} y={48} width={190} height={288} fill="#000" opacity={0.14} />
      <Balda y={122} />
      <Balda y={200} />
      <Balda y={278} />
      <rect x={560} y={336} width={190} height={8} fill={TONO.maderaOscura} />

      {/* Escritorio */}
      <SombraSuelo cx={340} cy={386} rx={216} ry={11} />
      <rect x={140} y={262} width={400} height={16} rx={4} fill={TONO.maderaClara} />
      <rect x={140} y={274} width={400} height={5} fill="#000" opacity={0.14} />
      <rect x={156} y={278} width={12} height={108} fill={TONO.madera} />
      <rect x={496} y={278} width={12} height={108} fill={TONO.madera} />
      <rect x={400} y={278} width={96} height={72} rx={3} fill={TONO.madera} />
      <rect x={408} y={286} width={80} height={24} fill="#000" opacity={0.1} />
      <rect x={408} y={316} width={80} height={24} fill="#000" opacity={0.1} />

      {/* Monitor, teclado y lámpara */}
      <rect x={252} y={158} width={152} height={96} rx={5} fill="#26303A" />
      <rect x={260} y={166} width={136} height={80} fill="#3A4A5C" />
      <rect x={272} y={178} width={60} height={6} fill="#8AA3BC" />
      <rect x={272} y={192} width={108} height={4} fill="#5F7A94" />
      <rect x={272} y={204} width={90} height={4} fill="#5F7A94" />
      <rect x={318} y={254} width={20} height={8} fill="#26303A" />
      <rect x={278} y={258} width={100} height={6} rx={3} fill="#26303A" />
      <LamparaMesa x={186} y={262} />
      <rect x={440} y={240} width={22} height={22} rx={4} fill="#E8DCC8" />

      {/* Silla de escritorio, vista desde atrás */}
      <rect x={316} y={290} width={8} height={78} fill={TONO.grafito} />
      <ellipse cx={320} cy={388} rx={46} ry={7} fill={TONO.grafito} />
      <rect x={284} y={272} width={86} height={34} rx={14} fill="#3B4652" />
      <rect x={290} y={236} width={74} height={62} rx={16} fill="#47535F" />
    </g>
  );
}
