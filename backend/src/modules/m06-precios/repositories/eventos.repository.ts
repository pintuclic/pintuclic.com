import type { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type { CrearEventoRequest, Estado, Exclusion, Objetivo } from '../dtos/m06-precios.dto';
import type { EventosRepositoryPort, FilaEvento } from '../interfaces/precios.interface';
import { columnaDeFecha, fechaDeColumna } from '../services/fechas';

const SELECCION = {
  idEvento: true,
  nombre: true,
  descripcion: true,
  estado: true,
  fechaInicio: true,
  fechaFin: true,
  diasSemana: true,
  horaInicio: true,
  horaFin: true,
  fechaCreacion: true,
  fechaActualizacion: true,
  usuarioActualizo: { select: { nombre: true } },
  reglas: { orderBy: [{ orden: 'asc' }, { idRegla: 'asc' }] },
  exclusiones: { orderBy: { idExclusion: 'asc' } },
} satisfies Prisma.EventoDescuentoSelect;

type FilaPrisma = Prisma.EventoDescuentoGetPayload<{ select: typeof SELECCION }>;

function aObjetivo(tipo: string | null, id: number | null): Objetivo | null {
  if (tipo === null || id === null) return null;
  return { tipo: tipo as Objetivo['tipo'], id };
}

function aFila(f: FilaPrisma): FilaEvento {
  const deRegla = (idRegla: number): Exclusion[] =>
    f.exclusiones.filter((e) => e.idRegla === idRegla).map((e) => ({ tipo: e.tipo, id: e.idObjetivo }));
  return {
    idEvento: f.idEvento,
    nombre: f.nombre,
    descripcion: f.descripcion,
    estado: f.estado,
    calendario: {
      fechaInicio: fechaDeColumna(f.fechaInicio),
      fechaFin: f.fechaFin === null ? null : fechaDeColumna(f.fechaFin),
      diasSemana: [...f.diasSemana].sort((a, b) => a - b),
      horaInicio: f.horaInicio,
      horaFin: f.horaFin,
    },
    reglas: f.reglas.map((r) => ({
      idRegla: r.idRegla,
      objetivo: aObjetivo(r.tipoObjetivo, r.idObjetivo),
      porcentaje: Number(r.porcentaje),
      exclusiones: deRegla(r.idRegla),
    })),
    exclusiones: f.exclusiones.filter((e) => e.idRegla === null).map((e) => ({ tipo: e.tipo, id: e.idObjetivo })),
    fechaCreacion: f.fechaCreacion,
    fechaActualizacion: f.fechaActualizacion,
    actualizadoPor: f.usuarioActualizo?.nombre ?? null,
  };
}

/** Escribe un evento con sus reglas y exclusiones dentro de la transacción de quien llama. */
async function escribirReglas(
  tx: Prisma.TransactionClient,
  idEvento: number,
  datos: CrearEventoRequest,
): Promise<void> {
  for (const [orden, regla] of datos.reglas.entries()) {
    const creada = await tx.eventoRegla.create({
      data: {
        idEvento,
        tipoObjetivo: regla.objetivo?.tipo ?? null,
        idObjetivo: regla.objetivo?.id ?? null,
        porcentaje: regla.porcentaje,
        orden,
      },
      select: { idRegla: true },
    });
    await tx.eventoExclusion.createMany({
      data: dedup(regla.exclusiones).map((e) => ({
        idEvento,
        idRegla: creada.idRegla,
        tipo: e.tipo,
        idObjetivo: e.id,
      })),
    });
  }
  await tx.eventoExclusion.createMany({
    data: dedup(datos.exclusiones).map((e) => ({ idEvento, idRegla: null, tipo: e.tipo, idObjetivo: e.id })),
  });
}

/** Quita las excepciones repetidas: el índice único las rechazaría. */
function dedup(lista: readonly Exclusion[]): Exclusion[] {
  return [...new Map(lista.map((e) => [`${e.tipo}:${e.id}`, e])).values()];
}

function camposEvento(datos: CrearEventoRequest): Prisma.EventoDescuentoUncheckedUpdateInput {
  return {
    nombre: datos.nombre,
    descripcion: datos.descripcion,
    fechaInicio: columnaDeFecha(datos.calendario.fechaInicio),
    fechaFin: datos.calendario.fechaFin === null ? null : columnaDeFecha(datos.calendario.fechaFin),
    diasSemana: [...datos.calendario.diasSemana].sort((a, b) => a - b),
    horaInicio: datos.calendario.horaInicio,
    horaFin: datos.calendario.horaFin,
  };
}

export class EventosRepository implements EventosRepositoryPort {
  async listarTodos(): Promise<FilaEvento[]> {
    const filas = await prisma.eventoDescuento.findMany({ select: SELECCION, orderBy: { idEvento: 'desc' } });
    return filas.map(aFila);
  }

  async listarActivos(desdeFecha: string): Promise<FilaEvento[]> {
    const filas = await prisma.eventoDescuento.findMany({
      where: {
        estado: 'activo',
        OR: [{ fechaFin: null }, { fechaFin: { gte: columnaDeFecha(desdeFecha) } }],
      },
      select: SELECCION,
      orderBy: { idEvento: 'asc' },
    });
    return filas.map(aFila);
  }

  async obtener(idEvento: number): Promise<FilaEvento | null> {
    const fila = await prisma.eventoDescuento.findUnique({ where: { idEvento }, select: SELECCION });
    return fila === null ? null : aFila(fila);
  }

  async crear(datos: CrearEventoRequest, idUsuario: number): Promise<number> {
    return prisma.$transaction(async (tx) => {
      const evento = await tx.eventoDescuento.create({
        data: { ...(camposEvento(datos) as Prisma.EventoDescuentoUncheckedCreateInput), idUsuarioActualizo: idUsuario },
        select: { idEvento: true },
      });
      await escribirReglas(tx, evento.idEvento, datos);
      return evento.idEvento;
    });
  }

  async reemplazar(idEvento: number, datos: CrearEventoRequest, idUsuario: number): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const existe = await tx.eventoDescuento.findUnique({ where: { idEvento }, select: { idEvento: true } });
      if (existe === null) return false;
      // Las exclusiones de cada regla se borran en cascada con la regla.
      await tx.eventoExclusion.deleteMany({ where: { idEvento } });
      await tx.eventoRegla.deleteMany({ where: { idEvento } });
      await tx.eventoDescuento.update({
        where: { idEvento },
        data: { ...camposEvento(datos), idUsuarioActualizo: idUsuario, fechaActualizacion: new Date() },
      });
      await escribirReglas(tx, idEvento, datos);
      return true;
    });
  }

  async cambiarEstado(idEvento: number, estado: Estado, idUsuario: number): Promise<boolean> {
    const { count } = await prisma.eventoDescuento.updateMany({
      where: { idEvento },
      data: { estado, idUsuarioActualizo: idUsuario, fechaActualizacion: new Date() },
    });
    return count > 0;
  }
}
