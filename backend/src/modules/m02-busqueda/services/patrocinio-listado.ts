import { CUPO_PATROCINADOS_LISTADO } from '../dtos/m02-busqueda.dto';

export interface Patrocinio {
  prioridad: number;
  idCampania: number;
}

interface Candidato {
  idProducto: number;
  puntaje: number;
  nombre: string;
}

/**
 * Qué productos de los resultados puede adelantar el patrocinio (contrato M02 · O7; M14 · A8).
 *
 * Solo con `ordenar=relevancia`. Entre los resultados que son patrocinados se eligen, como mucho,
 * CUPO_PATROCINADOS_LISTADO: los de mayor prioridad y, a igual prioridad, los más pertinentes y luego por nombre; el resto se
 * ordena como un producto normal. Que un producto no pertinente no entre nunca lo decide quien arma `candidatos`: solo
 * pasan los que ya son resultados.
 */
export function elegirPatrocinados(
  candidatos: readonly Candidato[],
  patrocinios: ReadonlyMap<number, Patrocinio>,
  ordenar: string,
  cupo: number = CUPO_PATROCINADOS_LISTADO,
): Map<number, Patrocinio> {
  if (ordenar !== 'relevancia' || patrocinios.size === 0) return new Map();
  const patrocinados = candidatos.flatMap((c) => {
    const p = patrocinios.get(c.idProducto);
    return p === undefined ? [] : [{ ...c, ...p }];
  });
  patrocinados.sort(
    (a, b) =>
      b.prioridad - a.prioridad || b.puntaje - a.puntaje || a.nombre.localeCompare(b.nombre) || a.idProducto - b.idProducto,
  );
  return new Map(
    patrocinados.slice(0, cupo).map((p) => [p.idProducto, { prioridad: p.prioridad, idCampania: p.idCampania }]),
  );
}

/**
 * Comparación de dos resultados en el orden por relevancia (O1, O7): primero la relevancia; entre la MISMA relevancia,
 * el patrocinado antes que el que no lo es y, entre dos patrocinados, el de mayor prioridad. 0 = empate (sigue el
 * desempate por nombre).
 */
export function compararPorRelevancia(
  a: { idProducto: number; puntaje: number },
  b: { idProducto: number; puntaje: number },
  elegidos: ReadonlyMap<number, Patrocinio>,
): number {
  if (a.puntaje !== b.puntaje) return b.puntaje - a.puntaje;
  const pa = elegidos.get(a.idProducto);
  const pb = elegidos.get(b.idProducto);
  if (pa === undefined && pb === undefined) return 0;
  if (pa === undefined) return 1;
  if (pb === undefined) return -1;
  return pb.prioridad - pa.prioridad;
}
