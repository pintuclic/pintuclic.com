import type { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type { CampaniaRequest, Estado } from '../dtos/m14-patrocinios.dto';
import type { CampaniasRepositoryPort, FilaCampania } from '../interfaces/patrocinios.interface';
import { columnaDeFecha, fechaDeColumna } from '../services/fechas';

const SELECCION = {
  idCampania: true,
  nombre: true,
  descripcion: true,
  estado: true,
  fechaInicio: true,
  fechaFin: true,
  prioridad: true,
  ubicaciones: true,
  fechaCreacion: true,
  fechaActualizacion: true,
  usuarioActualizo: { select: { nombre: true } },
  objetivos: { orderBy: { idCampaniaObjetivo: 'asc' } },
} satisfies Prisma.CampaniaPatrocinioSelect;

type FilaPrisma = Prisma.CampaniaPatrocinioGetPayload<{ select: typeof SELECCION }>;

function aFila(f: FilaPrisma): FilaCampania {
  return {
    idCampania: f.idCampania,
    nombre: f.nombre,
    descripcion: f.descripcion,
    estado: f.estado,
    fechaInicio: fechaDeColumna(f.fechaInicio),
    fechaFin: fechaDeColumna(f.fechaFin),
    prioridad: f.prioridad,
    ubicaciones: f.ubicaciones,
    objetivos: f.objetivos.map((o) => ({ tipo: o.tipo, id: o.idReferencia })),
    fechaCreacion: f.fechaCreacion,
    fechaActualizacion: f.fechaActualizacion,
    actualizadoPor: f.usuarioActualizo?.nombre ?? null,
  };
}

function campos(datos: CampaniaRequest): Prisma.CampaniaPatrocinioUncheckedUpdateInput {
  return {
    nombre: datos.nombre,
    descripcion: datos.descripcion,
    fechaInicio: columnaDeFecha(datos.fechaInicio),
    fechaFin: columnaDeFecha(datos.fechaFin),
    prioridad: datos.prioridad,
    ubicaciones: datos.ubicaciones,
  };
}

const filasObjetivos = (idCampania: number, datos: CampaniaRequest): Prisma.CampaniaObjetivoCreateManyInput[] =>
  datos.objetivos.map((o) => ({ idCampania, tipo: o.tipo, idReferencia: o.id }));

export class CampaniasRepository implements CampaniasRepositoryPort {
  async listarTodas(): Promise<FilaCampania[]> {
    const filas = await prisma.campaniaPatrocinio.findMany({ select: SELECCION, orderBy: { idCampania: 'desc' } });
    return filas.map(aFila);
  }

  async listarActivasDesde(hoy: string): Promise<FilaCampania[]> {
    const filas = await prisma.campaniaPatrocinio.findMany({
      where: { estado: 'activo', fechaFin: { gte: columnaDeFecha(hoy) } },
      select: SELECCION,
      orderBy: { idCampania: 'asc' },
    });
    return filas.map(aFila);
  }

  async obtener(idCampania: number): Promise<FilaCampania | null> {
    const fila = await prisma.campaniaPatrocinio.findUnique({ where: { idCampania }, select: SELECCION });
    return fila === null ? null : aFila(fila);
  }

  async nombreExiste(nombre: string, exceptoId?: number): Promise<boolean> {
    // Misma comparación que `uq_campania_nombre`: minúsculas y sin espacios en los bordes.
    const filas = await prisma.$queryRaw<Array<{ id_campania: number }>>`
      SELECT id_campania FROM campania_patrocinio
      WHERE lower(btrim(nombre)) = lower(btrim(${nombre}))
        AND (${exceptoId ?? null}::int IS NULL OR id_campania <> ${exceptoId ?? null}::int)
      LIMIT 1`;
    return filas.length > 0;
  }

  async crear(datos: CampaniaRequest, idUsuario: number): Promise<number> {
    return prisma.$transaction(async (tx) => {
      const campania = await tx.campaniaPatrocinio.create({
        data: { ...(campos(datos) as Prisma.CampaniaPatrocinioUncheckedCreateInput), idUsuarioActualizo: idUsuario },
        select: { idCampania: true },
      });
      await tx.campaniaObjetivo.createMany({ data: filasObjetivos(campania.idCampania, datos) });
      return campania.idCampania;
    });
  }

  async reemplazar(idCampania: number, datos: CampaniaRequest, idUsuario: number): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const existe = await tx.campaniaPatrocinio.findUnique({ where: { idCampania }, select: { idCampania: true } });
      if (existe === null) return false;
      await tx.campaniaObjetivo.deleteMany({ where: { idCampania } });
      await tx.campaniaPatrocinio.update({
        where: { idCampania },
        data: { ...campos(datos), idUsuarioActualizo: idUsuario, fechaActualizacion: new Date() },
      });
      await tx.campaniaObjetivo.createMany({ data: filasObjetivos(idCampania, datos) });
      return true;
    });
  }

  async cambiarEstado(idCampania: number, estado: Estado, idUsuario: number): Promise<boolean> {
    const { count } = await prisma.campaniaPatrocinio.updateMany({
      where: { idCampania },
      data: { estado, idUsuarioActualizo: idUsuario, fechaActualizacion: new Date() },
    });
    return count > 0;
  }
}
