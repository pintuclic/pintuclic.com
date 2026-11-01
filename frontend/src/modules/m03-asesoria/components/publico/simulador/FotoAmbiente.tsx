import type { AmbienteSimulador, EncuadreAmbienteSimulador } from '../../../dtos/m03-asesoria.dto';

/** Clases literales, no armadas con el nombre: así Tailwind las encuentra al compilar. */
const POSICION: Readonly<Record<EncuadreAmbienteSimulador, string>> = {
  arriba: 'object-top',
  centro: 'object-center',
  abajo: 'object-bottom',
};

export interface FotoAmbienteProps {
  ambiente: Pick<AmbienteSimulador, 'imagen' | 'encuadre'>;
  /** El color de las paredes, un `#RRGGBB` ya validado. */
  color: string;
  /**
   * El texto que describe la foto (S9). Sin él la foto es decorativa (`alt=""`) y se oculta a los
   * lectores de pantalla: es lo que pasa con las miniaturas, que ya tienen su nombre visible.
   */
  etiqueta?: string;
  className?: string;
}

/**
 * Un ambiente del simulador: la fotografía con la pared transparente, y el color detrás (S3).
 *
 * El color es el `background-color` del propio `<img>`: se ve a través de los píxeles
 * transparentes de la pared, mientras que muebles, ventanas y objetos son opacos y no cambian.
 * Las sombras de la pared son píxeles semitransparentes de la foto, así que no hace falta ninguna
 * capa encima ni `mix-blend-mode`. Cambiar de color es cambiar ese estilo: la imagen no se vuelve
 * a pedir.
 */
export function FotoAmbiente({ ambiente, color, etiqueta, className }: FotoAmbienteProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- WebP estático del sitio, ya optimizado: el color se ve por su alfa (S3, S12) y no debe pasar por un optimizador que lo recodifique
    <img
      src={ambiente.imagen}
      alt={etiqueta ?? ''}
      draggable={false}
      decoding="async"
      style={{ backgroundColor: color }}
      className={[className, 'object-cover', POSICION[ambiente.encuadre], 'transition-colors duration-300 motion-reduce:transition-none']
        .filter(Boolean)
        .join(' ')}
    />
  );
}
