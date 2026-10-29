import { useId, type ComponentType } from 'react';
import { Alcoba } from './escenas/Alcoba';
import { Comedor } from './escenas/Comedor';
import { Estudio } from './escenas/Estudio';
import { Fachada } from './escenas/Fachada';
import type { IdsEscena, PropsEscena } from './escenas/piezas';
import { SalaEsquina } from './escenas/SalaEsquina';
import { SalaFrente } from './escenas/SalaFrente';

/**
 * Qué dibujo corresponde a cada `id` de `services/ambientes.ts` (contrato M03 · S5). La prueba
 * del módulo comprueba que no quede un ambiente sin dibujo ni un dibujo sin ambiente.
 */
export const ESCENAS: Readonly<Record<string, ComponentType<PropsEscena>>> = {
  'sala-frente': SalaFrente,
  'sala-esquina': SalaEsquina,
  alcoba: Alcoba,
  comedor: Comedor,
  estudio: Estudio,
  fachada: Fachada,
};

export interface EscenaAmbienteProps {
  idAmbiente: string;
  /** El color de las paredes, un `#RRGGBB` ya validado. */
  color: string;
  /**
   * El texto que describe la imagen (S9). Sin él, el dibujo es decorativo y se oculta a los
   * lectores de pantalla: es lo que pasa con las miniaturas, que ya tienen su nombre visible.
   */
  etiqueta?: string;
  className?: string;
}

/**
 * Un ambiente del simulador dibujado en SVG (contrato M03 · S3), con el color de las paredes.
 *
 * Define los degradados de luz y sombra que usan todas las escenas. Cada instancia lleva
 * identificadores propios, porque la misma escena se dibuja varias veces en la página —grande y
 * en miniatura— y dos `id` iguales en un mismo documento harían que una tomara los degradados
 * de la otra.
 */
export function EscenaAmbiente({ idAmbiente, color, etiqueta, className }: EscenaAmbienteProps) {
  const base = useId().replace(/:/g, '');
  const ids: IdsEscena = {
    luz: `${base}-luz`,
    sombra: `${base}-sombra`,
    madera: `${base}-madera`,
    cielo: `${base}-cielo`,
    haz: `${base}-haz`,
  };
  const Escena = ESCENAS[idAmbiente];

  return (
    <svg
      viewBox="0 0 800 500"
      preserveAspectRatio="xMidYMid slice"
      role={etiqueta === undefined ? undefined : 'img'}
      aria-label={etiqueta}
      aria-hidden={etiqueta === undefined ? true : undefined}
      focusable="false"
      className={className}
    >
      <defs>
        <linearGradient id={ids.luz} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.62" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={ids.sombra} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.16" />
          <stop offset="0.5" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={ids.madera} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B98B5E" />
          <stop offset="1" stopColor="#8E6340" />
        </linearGradient>
        <linearGradient id={ids.cielo} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#BFE3FF" />
          <stop offset="1" stopColor="#EAF6FF" />
        </linearGradient>
        <linearGradient id={ids.haz} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.34" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      {Escena !== undefined && <Escena pared={color} ids={ids} />}
    </svg>
  );
}
