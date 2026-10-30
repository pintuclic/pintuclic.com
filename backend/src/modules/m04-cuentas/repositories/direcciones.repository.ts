import type { DireccionCliente, Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';

export interface DireccionesRepository {
  listarPorUsuario(idUsuario: number): Promise<DireccionCliente[]>;
  contarPorUsuario(idUsuario: number): Promise<number>;
  buscarPorId(idDireccion: string, idUsuario: number): Promise<DireccionCliente | null>;
  crear(datos: {
    idUsuario: number;
    direccion: string;
    barrio: string;
    apartamentoCasa?: string | null;
    municipio?: string | null;
    departamento?: string | null;
    nombreApellido: string;
    telefono: string;
    esPredeterminada: boolean;
    latitud?: number | null;
    longitud?: number | null;
  }): Promise<DireccionCliente>;
  actualizar(
    idDireccion: string,
    idUsuario: number,
    datos: {
      direccion?: string;
      barrio?: string;
      apartamentoCasa?: string | null;
      municipio?: string | null;
      departamento?: string | null;
      nombreApellido?: string;
      telefono?: string;
      latitud?: number | null;
      longitud?: number | null;
    },
  ): Promise<DireccionCliente>;
  eliminar(idDireccion: string, idUsuario: number): Promise<void>;
}

/** Cada cuenta guarda una sola dirección (RF-CUE-07-04): el índice único de la BD lo respalda. */
export class PrismaDireccionesRepository implements DireccionesRepository {
  async listarPorUsuario(idUsuario: number): Promise<DireccionCliente[]> {
    return prisma.direccionCliente.findMany({
      where: { idUsuario },
      orderBy: { fechaCreacion: 'desc' },
    });
  }

  async contarPorUsuario(idUsuario: number): Promise<number> {
    return prisma.direccionCliente.count({
      where: { idUsuario },
    });
  }

  async buscarPorId(idDireccion: string, idUsuario: number): Promise<DireccionCliente | null> {
    return prisma.direccionCliente.findFirst({
      where: { idDireccion, idUsuario },
    });
  }

  async crear(datos: {
    idUsuario: number;
    direccion: string;
    barrio: string;
    apartamentoCasa?: string | null;
    municipio?: string | null;
    departamento?: string | null;
    nombreApellido: string;
    telefono: string;
    esPredeterminada: boolean;
    latitud?: number | null;
    longitud?: number | null;
  }): Promise<DireccionCliente> {
    return prisma.direccionCliente.create({
      data: {
        idUsuario: datos.idUsuario,
        direccion: datos.direccion.trim(),
        barrio: datos.barrio.trim(),
        apartamentoCasa: datos.apartamentoCasa?.trim() ?? null,
        municipio: datos.municipio?.trim() || null,
        departamento: datos.departamento?.trim() || null,
        nombreApellido: datos.nombreApellido.trim(),
        telefono: datos.telefono.trim(),
        esPredeterminada: datos.esPredeterminada,
        latitud: datos.latitud ?? null,
        longitud: datos.longitud ?? null,
      },
    });
  }

  async actualizar(
    idDireccion: string,
    idUsuario: number,
    datos: {
      direccion?: string;
      barrio?: string;
      apartamentoCasa?: string | null;
      municipio?: string | null;
      departamento?: string | null;
      nombreApellido?: string;
      telefono?: string;
      latitud?: number | null;
      longitud?: number | null;
    },
  ): Promise<DireccionCliente> {
    const data: Prisma.DireccionClienteUpdateInput = {
      fechaActualizacion: new Date(),
    };
    if (datos.direccion !== undefined) data.direccion = datos.direccion.trim();
    if (datos.barrio !== undefined) data.barrio = datos.barrio.trim();
    if (datos.municipio !== undefined) data.municipio = datos.municipio?.trim() || null;
    if (datos.departamento !== undefined) data.departamento = datos.departamento?.trim() || null;
    if (datos.apartamentoCasa !== undefined) data.apartamentoCasa = datos.apartamentoCasa?.trim() ?? null;
    if (datos.nombreApellido !== undefined) data.nombreApellido = datos.nombreApellido.trim();
    if (datos.telefono !== undefined) data.telefono = datos.telefono.trim();
    if (datos.latitud !== undefined) data.latitud = datos.latitud;
    if (datos.longitud !== undefined) data.longitud = datos.longitud;

    return prisma.direccionCliente.update({
      where: { idDireccion, idUsuario },
      data,
    });
  }

  async eliminar(idDireccion: string, idUsuario: number): Promise<void> {
    await prisma.direccionCliente.deleteMany({
      where: { idDireccion, idUsuario },
    });
  }
}
