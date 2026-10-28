import {
  campaniaRequestSchema,
  PRIORIDAD_MAXIMA,
  PRIORIDAD_MINIMA,
  type Campania,
  type CampaniaRequest,
  type TipoObjetivoPatrocinio,
  type UbicacionPatrocinio,
} from '../dtos/m14-patrocinios.dto';
import { sumarDias } from './etiquetas';

export type Resultado<T> = { ok: true; valor: T } | { ok: false; mensaje: string };
const falla = (mensaje: string): { ok: false; mensaje: string } => ({ ok: false, mensaje });

/** Un objetivo elegido en el editor, con su nombre para mostrarlo. */
export interface ObjetivoElegido {
  tipo: TipoObjetivoPatrocinio;
  id: number;
  nombre: string;
}

/** Lo que la persona tiene escrito en el editor; la prioridad va como texto, tal cual la escribe. */
export interface BorradorCampania {
  nombre: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  prioridad: string;
  ubicaciones: UbicacionPatrocinio[];
  objetivos: ObjetivoElegido[];
}

/** Una campaña nueva: empieza hoy, dura 30 días y sale en el catálogo. */
export function borradorVacio(hoy: string): BorradorCampania {
  return {
    nombre: '',
    descripcion: '',
    fechaInicio: hoy,
    fechaFin: sumarDias(hoy, 29),
    prioridad: '0',
    ubicaciones: ['listado'],
    objetivos: [],
  };
}

export function borradorDesdeCampania(c: Campania): BorradorCampania {
  return {
    nombre: c.nombre,
    descripcion: c.descripcion ?? '',
    fechaInicio: c.fechaInicio,
    fechaFin: c.fechaFin,
    prioridad: String(c.prioridad),
    ubicaciones: [...c.ubicaciones],
    objetivos: c.objetivos.map((o) => ({ tipo: o.tipo, id: o.id, nombre: o.nombre })),
  };
}

/** "" → 0; admite solo enteros ("40"). Devuelve null si no es un entero. */
export function parsearPrioridad(texto: string): number | null {
  const t = texto.trim();
  if (t === '') return 0;
  return /^\d{1,3}$/.test(t) ? Number(t) : null;
}

/**
 * Convierte el borrador al cuerpo del contrato. Cada falta se explica en español antes de molestar al servidor; el
 * esquema del contrato queda como red de seguridad.
 */
export function aCuerpoCampania(b: BorradorCampania): Resultado<CampaniaRequest> {
  if (b.nombre.trim().length < 3) return falla('Escriba el nombre de la campaña (al menos 3 letras).');
  if (b.objetivos.length === 0) return falla('Elija al menos un producto, una línea o una marca para patrocinar.');
  if (b.fechaInicio === '' || b.fechaFin === '') return falla('Indique desde y hasta qué fecha dura la campaña.');
  if (b.fechaFin < b.fechaInicio) return falla('La fecha fin no puede ser anterior al inicio.');
  const prioridad = parsearPrioridad(b.prioridad);
  if (prioridad === null || prioridad < PRIORIDAD_MINIMA || prioridad > PRIORIDAD_MAXIMA) {
    return falla(`La prioridad es un número entero de ${PRIORIDAD_MINIMA} a ${PRIORIDAD_MAXIMA}.`);
  }
  if (b.ubicaciones.length === 0) return falla('Elija al menos un lugar donde se muestre la campaña.');
  const validado = campaniaRequestSchema.safeParse({
    nombre: b.nombre,
    descripcion: b.descripcion.trim() === '' ? null : b.descripcion,
    objetivos: b.objetivos.map((o) => ({ tipo: o.tipo, id: o.id })),
    fechaInicio: b.fechaInicio,
    fechaFin: b.fechaFin,
    prioridad,
    ubicaciones: b.ubicaciones,
  });
  return validado.success ? { ok: true, valor: validado.data } : falla(validado.error.issues[0]?.message ?? 'Revise los datos.');
}
