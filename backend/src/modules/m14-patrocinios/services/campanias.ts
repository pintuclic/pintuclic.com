import type { ObjetivoPatrocinio, Situacion, UbicacionPatrocinio } from '../dtos/m14-patrocinios.dto';
import type { FilaCampania, ProductoDeCatalogo } from '../interfaces/patrocinios.interface';
import { fechaBogota } from './fechas';

type CampaniaVigencia = Pick<FilaCampania, 'estado' | 'fechaInicio' | 'fechaFin'>;

/**
 * Situación de una campaña (A1, A2), derivada de las fechas: no hay tarea programada que cambie estados.
 * Manda la primera que aplique: inactivo > vencido > programado > vigente. Las fechas se comparan como texto
 * AAAA-MM-DD, que ordena igual que el calendario.
 */
export function situacionCampania(c: CampaniaVigencia, ahora: Date): Situacion {
  if (c.estado === 'inactivo') return 'inactivo';
  const hoy = fechaBogota(ahora);
  if (hoy > c.fechaFin) return 'vencido';
  if (hoy < c.fechaInicio) return 'programado';
  return 'vigente';
}

/** ¿El producto cae en alguno de los objetivos? Línea y marca cubren todos sus productos (A3). */
export function cubre(objetivos: readonly ObjetivoPatrocinio[], p: Pick<ProductoDeCatalogo, 'idProducto' | 'idMarca' | 'idLinea'>): boolean {
  return objetivos.some(
    (o) =>
      (o.tipo === 'producto' && o.id === p.idProducto) ||
      (o.tipo === 'linea' && p.idLinea !== null && o.id === p.idLinea) ||
      (o.tipo === 'marca' && o.id === p.idMarca),
  );
}

export interface PrioridadDeProducto {
  idProducto: number;
  prioridad: number;
  idCampania: number;
}

/**
 * Prioridad de cada producto entre las campañas dadas (A4, A5): la MÁS ALTA. En un empate gana la de fecha de inicio
 * más antigua y luego la de id menor, para que el resultado no dependa del orden en que llegaron.
 */
export function prioridadesPorProducto(
  campanias: ReadonlyArray<Pick<FilaCampania, 'idCampania' | 'prioridad' | 'fechaInicio' | 'objetivos'>>,
  productos: readonly Pick<ProductoDeCatalogo, 'idProducto' | 'idMarca' | 'idLinea'>[],
): PrioridadDeProducto[] {
  const ganadora = (a: (typeof campanias)[number], b: (typeof campanias)[number]): boolean =>
    a.prioridad !== b.prioridad
      ? a.prioridad > b.prioridad
      : a.fechaInicio !== b.fechaInicio
        ? a.fechaInicio < b.fechaInicio
        : a.idCampania < b.idCampania;
  const resultado: PrioridadDeProducto[] = [];
  for (const p of productos) {
    let mejor: (typeof campanias)[number] | null = null;
    for (const c of campanias) {
      if (!cubre(c.objetivos, p)) continue;
      if (mejor === null || ganadora(c, mejor)) mejor = c;
    }
    if (mejor !== null) resultado.push({ idProducto: p.idProducto, prioridad: mejor.prioridad, idCampania: mejor.idCampania });
  }
  return resultado;
}

/** Campañas vigentes ahora que tienen esa ubicación (A1, A7). */
export function vigentesEn(
  campanias: readonly FilaCampania[],
  ubicacion: UbicacionPatrocinio,
  ahora: Date,
): FilaCampania[] {
  return campanias.filter((c) => situacionCampania(c, ahora) === 'vigente' && c.ubicaciones.includes(ubicacion));
}

/**
 * Orden del bloque del inicio (A10): prioridad descendente y, entre la misma prioridad, aleatorio en cada consulta
 * (reparto equitativo entre marcas). `aleatorio` devuelve un número en [0, 1): se inyecta para probarlo.
 */
export function ordenarParaBloque<T extends { prioridad: number }>(items: readonly T[], aleatorio: () => number): T[] {
  const copia = items.map((item) => ({ item, azar: aleatorio() }));
  copia.sort((a, b) => b.item.prioridad - a.item.prioridad || a.azar - b.azar);
  return copia.map((x) => x.item);
}
