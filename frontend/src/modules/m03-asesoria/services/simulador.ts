import { esHexadecimal } from '@/core/utils/color-muestra';
import type { AmbienteSimulador, SimuladorInput } from '../dtos/m03-asesoria.dto';

/** S2, S9: sin un `#RRGGBB` válido no se pinta nada y se muestra la invitación a elegir un color. */
export function sePuedeSimular(color: { hexadecimal: string } | null): color is SimuladorInput {
  return color !== null && esHexadecimal(color.hexadecimal);
}

/** S8: lo que identifica al color junto a la imagen. «Sol De La Tarde · NRO96T», o solo el nombre si no tiene código. */
export function rotuloDeColor(color: Pick<SimuladorInput, 'nombre' | 'codigo'>): string {
  return color.codigo === null || color.codigo.trim() === '' ? color.nombre : `${color.nombre} · ${color.codigo}`;
}

/** S9: el texto accesible de cada dibujo: el espacio y el color, nunca «así se verá». */
export function textoAccesible(ambiente: Pick<AmbienteSimulador, 'alt'>, color: Pick<SimuladorInput, 'nombre'>): string {
  return `${ambiente.alt}, con las paredes pintadas en ${color.nombre}`;
}

/** S7: la leyenda de cada vista. Dice «así se vería, aproximadamente», nunca «así se verá». */
export function leyendaDeVista(ambiente: Pick<AmbienteSimulador, 'nombre'>, color: Pick<SimuladorInput, 'nombre'>): string {
  return `Así se vería ${color.nombre}, aproximadamente. Vista: ${ambiente.nombre}.`;
}
