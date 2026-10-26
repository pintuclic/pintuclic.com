import type { CalendarioEvento, Estado, Exclusion, Objetivo, SituacionEvento } from '../dtos/m06-precios.dto';
import { aBogota } from './fechas';

/** Evento tal como lo necesita el motor: sin nombres de catálogo, solo ids. */
export interface EventoMotor {
  idEvento: number;
  nombre: string;
  estado: Estado;
  calendario: CalendarioEvento;
  reglas: ReglaMotor[];
  /** Excepciones de todas las reglas (R6). */
  exclusiones: Exclusion[];
}

export interface ReglaMotor {
  idRegla: number;
  /** Null = todo el catálogo. */
  objetivo: Objetivo | null;
  porcentaje: number;
  exclusiones: Exclusion[];
}

/** Dónde cae una línea de compra en el catálogo. `idColor` null = no se conoce el color elegido (R8). */
export interface ClasificacionLinea {
  idVariante: number;
  idProducto: number;
  idMarca: number;
  idLinea: number | null;
  idSubcategoria: number;
  idCategoria: number;
  idColor: number | null;
  idFamiliaColor: number | null;
}

export interface OfertaResuelta {
  idEvento: number;
  nombreEvento: string;
  idRegla: number;
  porcentaje: number;
}

/** R4: situación derivada de un evento en un instante. */
export function situacionEvento(evento: EventoMotor, ahora: Date): SituacionEvento {
  if (evento.estado === 'inactivo') return 'inactivo';
  const { fecha, hora, diaSemana } = aBogota(ahora);
  const c = evento.calendario;
  if (c.fechaFin !== null && fecha > c.fechaFin) return 'vencido';
  if (fecha < c.fechaInicio) return 'programado';
  const diaOk = c.diasSemana.length === 0 || c.diasSemana.includes(diaSemana);
  const horaOk = c.horaInicio === null || c.horaFin === null || (hora >= c.horaInicio && hora < c.horaFin);
  return diaOk && horaOk ? 'en_curso' : 'en_espera';
}

export const eventoEnCurso = (evento: EventoMotor, ahora: Date): boolean =>
  situacionEvento(evento, ahora) === 'en_curso';

function coincideObjetivo(clase: ClasificacionLinea, o: Objetivo): boolean {
  switch (o.tipo) {
    case 'marca':
      return clase.idMarca === o.id;
    case 'linea':
      return clase.idLinea === o.id;
    case 'categoria':
      return clase.idCategoria === o.id;
    case 'subcategoria':
      return clase.idSubcategoria === o.id;
    case 'producto':
      return clase.idProducto === o.id;
    case 'variante':
      return clase.idVariante === o.id;
  }
}

/** R6 y R8: las exclusiones de color solo cuentan si se conoce el color elegido. */
function coincideExclusion(clase: ClasificacionLinea, e: Exclusion): boolean {
  if (e.tipo === 'color') return clase.idColor !== null && clase.idColor === e.id;
  if (e.tipo === 'familia_color') return clase.idFamiliaColor !== null && clase.idFamiliaColor === e.id;
  return coincideObjetivo(clase, { tipo: e.tipo, id: e.id });
}

/**
 * R5–R7: de todas las reglas de los eventos EN CURSO que cubren la línea, la de mayor porcentaje
 * (empate: menor idEvento, luego menor idRegla). Null si ninguna la cubre.
 */
export function mejorOferta(
  eventos: readonly EventoMotor[],
  clase: ClasificacionLinea,
  ahora: Date,
): OfertaResuelta | null {
  let mejor: OfertaResuelta | null = null;
  for (const ev of eventos) {
    if (!eventoEnCurso(ev, ahora)) continue;
    if (ev.exclusiones.some((e) => coincideExclusion(clase, e))) continue;
    for (const r of ev.reglas) {
      if (r.objetivo !== null && !coincideObjetivo(clase, r.objetivo)) continue;
      if (r.exclusiones.some((e) => coincideExclusion(clase, e))) continue;
      const candidata: OfertaResuelta = {
        idEvento: ev.idEvento,
        nombreEvento: ev.nombre,
        idRegla: r.idRegla,
        porcentaje: r.porcentaje,
      };
      if (mejor === null || mejorQue(candidata, mejor)) mejor = candidata;
    }
  }
  return mejor;
}

function mejorQue(a: OfertaResuelta, b: OfertaResuelta): boolean {
  if (a.porcentaje !== b.porcentaje) return a.porcentaje > b.porcentaje;
  if (a.idEvento !== b.idEvento) return a.idEvento < b.idEvento;
  return a.idRegla < b.idRegla;
}
