import {
  actualizarCuponRequestSchema,
  crearCuponRequestSchema,
  crearEventoRequestSchema,
  crearTipoClienteRequestSchema,
  type ActualizarCuponRequest,
  type Cupon,
  type CrearCuponRequest,
  type CrearEventoRequest,
  type CrearTipoClienteRequest,
  type Evento,
  type Exclusion,
  type ReferenciaCatalogo,
  type TipoClienteEmpresa,
  type TipoObjetivo,
} from '../dtos/m06-precios.dto';
import type { FormCupon, FormTipoCliente } from '../dtos/formularios.dto';
import { aInstanteBogota, deInstanteBogota } from './etiquetas';
import { parsearDinero, parsearEntero, parsearPorcentaje } from './numeros';

export type Resultado<T> = { ok: true; valor: T } | { ok: false; mensaje: string };
const falla = (mensaje: string): { ok: false; mensaje: string } => ({ ok: false, mensaje });

/* ── Evento ──────────────────────────────────────────────────────────────── */

export type ObjetivoElegido = TipoObjetivo | 'todo';

export interface BorradorRegla {
  /** Identifica la fila en la pantalla (no viaja a la API). */
  clave: string;
  tipoObjetivo: ObjetivoElegido;
  objetivo: ReferenciaCatalogo | null;
  /** Texto tal como lo escribe la persona: "15" o "12,5". */
  porcentaje: string;
  exclusiones: ReferenciaCatalogo[];
}

export interface BorradorEvento {
  nombre: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  diasSemana: number[];
  horaInicio: string;
  horaFin: string;
  reglas: BorradorRegla[];
  exclusiones: ReferenciaCatalogo[];
}

let contador = 0;
export const nuevaClave = (): string => `regla-${(contador += 1)}`;

export function reglaVacia(): BorradorRegla {
  return { clave: nuevaClave(), tipoObjetivo: 'marca', objetivo: null, porcentaje: '', exclusiones: [] };
}

export function borradorVacio(hoy: string): BorradorEvento {
  return {
    nombre: '',
    descripcion: '',
    fechaInicio: hoy,
    fechaFin: '',
    diasSemana: [],
    horaInicio: '',
    horaFin: '',
    reglas: [reglaVacia()],
    exclusiones: [],
  };
}

export function borradorDesdeEvento(e: Evento): BorradorEvento {
  return {
    nombre: e.nombre,
    descripcion: e.descripcion ?? '',
    fechaInicio: e.calendario.fechaInicio,
    fechaFin: e.calendario.fechaFin ?? '',
    diasSemana: [...e.calendario.diasSemana],
    horaInicio: e.calendario.horaInicio ?? '',
    horaFin: e.calendario.horaFin ?? '',
    reglas: e.reglas.map((r) => ({
      clave: nuevaClave(),
      tipoObjetivo: r.objetivo === null ? 'todo' : (r.objetivo.tipo as TipoObjetivo),
      objetivo: r.objetivo,
      porcentaje: String(r.porcentaje).replace('.', ','),
      exclusiones: r.exclusiones,
    })),
    exclusiones: e.exclusiones,
  };
}

const aExclusion = (r: ReferenciaCatalogo): Exclusion => ({ tipo: r.tipo, id: r.id });

/** Borrador de pantalla → cuerpo del contrato, con mensajes que una persona entiende. */
export function aCuerpoEvento(b: BorradorEvento): Resultado<CrearEventoRequest> {
  if (b.nombre.trim().length < 3) return falla('Escriba un nombre de al menos 3 caracteres.');
  if (b.fechaInicio === '') return falla('Elija la fecha de inicio.');
  if (b.fechaFin !== '' && b.fechaFin < b.fechaInicio)
    return falla('La fecha de fin no puede ser anterior a la de inicio.');
  if ((b.horaInicio === '') !== (b.horaFin === '')) return falla('Escriba las dos horas o deje las dos vacías.');
  if (b.horaInicio !== '' && b.horaFin <= b.horaInicio)
    return falla('La hora de fin debe ser posterior a la de inicio.');
  if (b.reglas.length === 0) return falla('Agregue al menos un descuento.');

  const reglas: CrearEventoRequest['reglas'] = [];
  for (const [i, r] of b.reglas.entries()) {
    const n = i + 1;
    if (r.tipoObjetivo !== 'todo' && r.objetivo === null)
      return falla(`Descuento ${n}: elija qué entra en el descuento.`);
    const porcentaje = parsearPorcentaje(r.porcentaje);
    if (porcentaje === null)
      return falla(`Descuento ${n}: el porcentaje debe ser mayor que 0 y hasta 100 (máximo dos decimales).`);
    reglas.push({
      objetivo: r.tipoObjetivo === 'todo' || r.objetivo === null ? null : { tipo: r.tipoObjetivo, id: r.objetivo.id },
      porcentaje,
      exclusiones: r.exclusiones.map(aExclusion),
    });
  }
  const cuerpo = {
    nombre: b.nombre.trim(),
    descripcion: b.descripcion.trim() === '' ? null : b.descripcion.trim(),
    calendario: {
      fechaInicio: b.fechaInicio,
      fechaFin: b.fechaFin === '' ? null : b.fechaFin,
      diasSemana: [...b.diasSemana].sort((x, y) => x - y),
      horaInicio: b.horaInicio === '' ? null : b.horaInicio,
      horaFin: b.horaFin === '' ? null : b.horaFin,
    },
    reglas,
    exclusiones: b.exclusiones.map(aExclusion),
  };
  const r = crearEventoRequestSchema.safeParse(cuerpo);
  return r.success ? { ok: true, valor: r.data } : falla(r.error.issues[0]?.message ?? 'Revise los datos del evento.');
}

/* ── Cupón ───────────────────────────────────────────────────────────────── */

export function cuponVacio(): FormCupon {
  return {
    codigo: '',
    nombre: '',
    descripcion: '',
    tipoValor: 'porcentaje',
    valor: '',
    montoMinimoCompra: '',
    usosMaximos: '',
    usosPorUsuario: '',
    audiencia: 'todos',
    fechaInicio: '',
    fechaFin: '',
  };
}

export function formDesdeCupon(c: Cupon): FormCupon {
  return {
    codigo: c.codigo,
    nombre: c.nombre,
    descripcion: c.descripcion ?? '',
    tipoValor: c.tipoValor,
    valor: String(c.valor).replace('.', ','),
    montoMinimoCompra: c.montoMinimoCompra === null ? '' : String(c.montoMinimoCompra).replace('.', ','),
    usosMaximos: c.usosMaximos === null ? '' : String(c.usosMaximos),
    usosPorUsuario: c.usosPorUsuario === null ? '' : String(c.usosPorUsuario),
    audiencia: c.audiencia,
    fechaInicio: deInstanteBogota(c.fechaInicio),
    fechaFin: c.fechaFin === null ? '' : deInstanteBogota(c.fechaFin),
  };
}

/** Un campo opcional vacío es "sin límite"; escrito, tiene que ser válido. */
function opcional<T>(texto: string, leer: (t: string) => T | null, error: string): Resultado<T | null> {
  if (texto.trim() === '') return { ok: true, valor: null };
  const v = leer(texto);
  return v === null ? falla(error) : { ok: true, valor: v };
}

export function aCuerpoCupon(v: FormCupon, modo: 'crear'): Resultado<CrearCuponRequest>;
export function aCuerpoCupon(v: FormCupon, modo: 'editar'): Resultado<ActualizarCuponRequest>;
export function aCuerpoCupon(
  v: FormCupon,
  modo: 'crear' | 'editar',
): Resultado<CrearCuponRequest | ActualizarCuponRequest> {
  const valor = v.tipoValor === 'porcentaje' ? parsearPorcentaje(v.valor) : parsearDinero(v.valor);
  if (valor === null || valor <= 0) {
    return falla(
      v.tipoValor === 'porcentaje'
        ? 'El porcentaje debe ser mayor que 0 y hasta 100.'
        : 'El valor debe ser un monto mayor que 0.',
    );
  }
  const minimo = opcional(v.montoMinimoCompra, parsearDinero, 'El monto mínimo no es válido.');
  if (!minimo.ok) return minimo;
  const maximos = opcional(v.usosMaximos, parsearEntero, 'Los usos máximos deben ser un número entero.');
  if (!maximos.ok) return maximos;
  const porUsuario = opcional(v.usosPorUsuario, parsearEntero, 'Los usos por persona deben ser un número entero.');
  if (!porUsuario.ok) return porUsuario;
  const inicio = aInstanteBogota(v.fechaInicio);
  if (inicio === null) return falla('Elija la fecha y hora de inicio.');
  const fin = v.fechaFin === '' ? null : aInstanteBogota(v.fechaFin);
  if (v.fechaFin !== '' && fin === null) return falla('La fecha de fin no es válida.');
  if (fin !== null && fin <= inicio) return falla('La fecha de fin debe ser posterior al inicio.');

  const base = {
    nombre: v.nombre.trim(),
    descripcion: v.descripcion.trim() === '' ? null : v.descripcion.trim(),
    tipoValor: v.tipoValor,
    valor,
    montoMinimoCompra: minimo.valor,
    usosMaximos: maximos.valor,
    usosPorUsuario: porUsuario.valor,
    audiencia: v.audiencia,
    fechaInicio: inicio,
    fechaFin: fin,
  };
  const r =
    modo === 'crear'
      ? crearCuponRequestSchema.safeParse({ ...base, codigo: v.codigo })
      : actualizarCuponRequestSchema.safeParse(base);
  return r.success ? { ok: true, valor: r.data } : falla(r.error.issues[0]?.message ?? 'Revise los datos del cupón.');
}

/* ── Tipo de cliente empresa ─────────────────────────────────────────────── */

export const tipoClienteVacio = (): FormTipoCliente => ({
  nombre: '',
  porcentaje: '',
  montoMinimoCompra: '',
  tope: '',
});

export function formDesdeTipo(t: TipoClienteEmpresa): FormTipoCliente {
  return {
    nombre: t.nombre,
    porcentaje: String(t.porcentaje).replace('.', ','),
    montoMinimoCompra: t.montoMinimoCompra === 0 ? '' : String(t.montoMinimoCompra).replace('.', ','),
    tope: t.tope === 0 ? '' : String(t.tope).replace('.', ','),
  };
}

export function aCuerpoTipoCliente(v: FormTipoCliente): Resultado<CrearTipoClienteRequest> {
  const porcentaje = parsearPorcentaje(v.porcentaje);
  if (porcentaje === null) return falla('El porcentaje debe ser mayor que 0 y hasta 100 (máximo dos decimales).');
  const minimo = opcional(v.montoMinimoCompra, parsearDinero, 'El monto mínimo no es válido.');
  if (!minimo.ok) return minimo;
  const tope = opcional(v.tope, parsearDinero, 'El tope no es válido.');
  if (!tope.ok) return tope;
  const r = crearTipoClienteRequestSchema.safeParse({
    nombre: v.nombre.trim(),
    porcentaje,
    montoMinimoCompra: minimo.valor ?? 0,
    tope: tope.valor ?? 0,
  });
  return r.success ? { ok: true, valor: r.data } : falla(r.error.issues[0]?.message ?? 'Revise los datos.');
}
