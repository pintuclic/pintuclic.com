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
    nombreApellido: string;
    telefono: string;
    esPredeterminada?: boolean;
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
      nombreApellido?: string;
      telefono?: string;
      esPredeterminada?: boolean;
      latitud?: number | null;
      longitud?: number | null;
    },
  ): Promise<DireccionCliente>;
  eliminar(idDireccion: string, idUsuario: number): Promise<void>;
  desmarcarPredeterminadas(idUsuario: number): Promise<void>;
  establecerPredeterminada(idDireccion: string, idUsuario: number): Promise<DireccionCliente>;
}

export class PrismaDireccionesRepository implements DireccionesRepository {
  async listarPorUsuario(idUsuario: number): Promise<DireccionCliente[]> {
    return prisma.direccionCliente.findMany({
      where: { idUsuario },
      orderBy: [{ esPredeterminada: 'desc' }, { fechaCreacion: 'desc' }],
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
    nombreApellido: string;
    telefono: string;
    esPredeterminada?: boolean;
    latitud?: number | null;
    longitud?: number | null;
  }): Promise<DireccionCliente> {
    // Si se marca como predeterminada, desmarcamos las demás en transacción
    if (datos.esPredeterminada) {
      return prisma.$transaction(async (tx) => {
        await tx.direccionCliente.updateMany({
          where: { idUsuario: datos.idUsuario, esPredeterminada: true },
          data: { esPredeterminada: false },
        });

        return tx.direccionCliente.create({
          data: {
            idUsuario: datos.idUsuario,
            direccion: datos.direccion.trim(),
            barrio: datos.barrio.trim(),
            apartamentoCasa: datos.apartamentoCasa?.trim() ?? null,
            nombreApellido: datos.nombreApellido.trim(),
            telefono: datos.telefono.trim(),
            esPredeterminada: true,
            latitud: datos.latitud ?? null,
            longitud: datos.longitud ?? null,
          },
        });
      });
    }

    return prisma.direccionCliente.create({
      data: {
        idUsuario: datos.idUsuario,
        direccion: datos.direccion.trim(),
        barrio: datos.barrio.trim(),
        apartamentoCasa: datos.apartamentoCasa?.trim() ?? null,
        nombreApellido: datos.nombreApellido.trim(),
        telefono: datos.telefono.trim(),
        esPredeterminada: false,
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
      nombreApellido?: string;
      telefono?: string;
      esPredeterminada?: boolean;
      latitud?: number | null;
      longitud?: number | null;
    },
  ): Promise<DireccionCliente> {
    if (datos.esPredeterminada) {
      return prisma.$transaction(async (tx) => {
        await tx.direccionCliente.updateMany({
          where: { idUsuario, esPredeterminada: true },
          data: { esPredeterminada: false },
        });

        const data: Prisma.DireccionClienteUpdateInput = {
          esPredeterminada: true,
          fechaActualizacion: new Date(),
        };
        if (datos.direccion !== undefined) data.direccion = datos.direccion.trim();
        if (datos.barrio !== undefined) data.barrio = datos.barrio.trim();
        if (datos.apartamentoCasa !== undefined) data.apartamentoCasa = datos.apartamentoCasa?.trim() ?? null;
        if (datos.nombreApellido !== undefined) data.nombreApellido = datos.nombreApellido.trim();
        if (datos.telefono !== undefined) data.telefono = datos.telefono.trim();
        if (datos.latitud !== undefined) data.latitud = datos.latitud;
        if (datos.longitud !== undefined) data.longitud = datos.longitud;

        return tx.direccionCliente.update({
          where: { idDireccion },
          data,
        });
      });
    }

    const data: Prisma.DireccionClienteUpdateInput = {
      fechaActualizacion: new Date(),
    };
    if (datos.direccion !== undefined) data.direccion = datos.direccion.trim();
    if (datos.barrio !== undefined) data.barrio = datos.barrio.trim();
    if (datos.apartamentoCasa !== undefined) data.apartamentoCasa = datos.apartamentoCasa?.trim() ?? null;
    if (datos.nombreApellido !== undefined) data.nombreApellido = datos.nombreApellido.trim();
    if (datos.telefono !== undefined) data.telefono = datos.telefono.trim();
    if (datos.esPredeterminada !== undefined) data.esPredeterminada = datos.esPredeterminada;
    if (datos.latitud !== undefined) data.latitud = datos.latitud;
    if (datos.longitud !== undefined) data.longitud = datos.longitud;

    return prisma.direccionCliente.update({
      where: { idDireccion },
      data,
    });
  }

  async eliminar(idDireccion: string, idUsuario: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const dir = await tx.direccionCliente.findFirst({
        where: { idDireccion, idUsuario },
      });
      if (!dir) return;

      await tx.direccionCliente.delete({
        where: { idDireccion },
      });

      // Si era predeterminada, asignamos la más antigua restante como predeterminada
      if (dir.esPredeterminada) {
        const siguiente = await tx.direccionCliente.findFirst({
          where: { idUsuario },
          orderBy: { fechaCreacion: 'asc' },
        });
        if (siguiente) {
          await tx.direccionCliente.update({
            where: { idDireccion: siguiente.idDireccion },
            data: { esPredeterminada: true },
          });
        }
      }
    });
  }

  async desmarcarPredeterminadas(idUsuario: number): Promise<void> {
    await prisma.direccionCliente.updateMany({
      where: { idUsuario, esPredeterminada: true },
      data: { esPredeterminada: false },
    });
  }

  async establecerPredeterminada(idDireccion: string, idUsuario: number): Promise<DireccionCliente> {
    return prisma.$transaction(async (tx) => {
      await tx.direccionCliente.updateMany({
        where: { idUsuario, esPredeterminada: true },
        data: { esPredeterminada: false },
      });

      return tx.direccionCliente.update({
        where: { idDireccion },
        data: {
          esPredeterminada: true,
          fechaActualizacion: new Date(),
        },
      });
    });
  }
}
