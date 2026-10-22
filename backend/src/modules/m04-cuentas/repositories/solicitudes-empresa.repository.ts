import type {
  EstadoSolicitudEmpresa,
  Prisma,
  SolicitudActualizacionNit,
  SolicitudEmpresa,
  TipoSolicitudEmpresa,
} from '@prisma/client';
import { prisma } from '../../../core/db/client';

export interface SolicitudesEmpresaRepository {
  crearSolicitud(datos: {
    idUsuario: number;
    nombreEmpresa: string;
    nombreRepresentante: string;
    correoEmpresarial: string;
    telefono: string;
    nit: string;
    tipoSolicitud?: TipoSolicitudEmpresa;
  }): Promise<SolicitudEmpresa>;
  buscarPendientePorNit(nit: string): Promise<SolicitudEmpresa | null>;
  buscarPendientePorUsuario(idUsuario: number): Promise<SolicitudEmpresa | null>;
  buscarPorId(idSolicitud: string): Promise<SolicitudEmpresa | null>;
  listar(filtros?: {
    estado?: EstadoSolicitudEmpresa;
    tipo?: TipoSolicitudEmpresa;
    page?: number;
    limit?: number;
  }): Promise<{ items: SolicitudEmpresa[]; total: number }>;
  dictaminar(
    idSolicitud: string,
    dictamen: {
      estado: 'aprobada' | 'rechazada';
      idAdminRevisor: number;
      motivoRechazo?: string | null;
      fechaRevision?: Date;
    },
  ): Promise<SolicitudEmpresa>;

  // Renovación de NIT
  crearSolicitudRenovacionNit(datos: {
    idUsuario: number;
    nitAnterior: string;
    nitNuevo: string;
    idDocumento?: string | null;
  }): Promise<SolicitudActualizacionNit>;
  buscarRenovacionPendientePorUsuario(idUsuario: number): Promise<SolicitudActualizacionNit | null>;
  buscarRenovacionPendientePorNit(nitNuevo: string): Promise<SolicitudActualizacionNit | null>;
  buscarRenovacionPorId(idSolicitud: string): Promise<SolicitudActualizacionNit | null>;
  listarRenovaciones(filtros?: {
    estado?: EstadoSolicitudEmpresa;
    page?: number;
    limit?: number;
  }): Promise<{ items: SolicitudActualizacionNit[]; total: number }>;
  dictaminarRenovacionNit(
    idSolicitud: string,
    dictamen: {
      estado: 'aprobada' | 'rechazada';
      idAdminRevisor: number;
      motivoRechazo?: string | null;
      fechaRevision?: Date;
    },
  ): Promise<SolicitudActualizacionNit>;
}

export class PrismaSolicitudesEmpresaRepository implements SolicitudesEmpresaRepository {
  async crearSolicitud(datos: {
    idUsuario: number;
    nombreEmpresa: string;
    nombreRepresentante: string;
    correoEmpresarial: string;
    telefono: string;
    nit: string;
    tipoSolicitud?: TipoSolicitudEmpresa;
  }): Promise<SolicitudEmpresa> {
    return prisma.solicitudEmpresa.create({
      data: {
        idUsuario: datos.idUsuario,
        nombreEmpresa: datos.nombreEmpresa.trim(),
        nombreRepresentante: datos.nombreRepresentante.trim(),
        correoEmpresarial: datos.correoEmpresarial.trim().toLowerCase(),
        telefono: datos.telefono.trim(),
        nit: datos.nit.trim(),
        tipoSolicitud: datos.tipoSolicitud ?? 'registro',
        estado: 'pendiente',
      },
    });
  }

  async buscarPendientePorNit(nit: string): Promise<SolicitudEmpresa | null> {
    return prisma.solicitudEmpresa.findFirst({
      where: {
        nit: nit.trim(),
        estado: 'pendiente',
      },
    });
  }

  async buscarPendientePorUsuario(idUsuario: number): Promise<SolicitudEmpresa | null> {
    return prisma.solicitudEmpresa.findFirst({
      where: {
        idUsuario,
        estado: 'pendiente',
      },
    });
  }

  async buscarPorId(idSolicitud: string): Promise<SolicitudEmpresa | null> {
    return prisma.solicitudEmpresa.findUnique({
      where: { idSolicitud },
      include: {
        usuario: {
          select: {
            idUsuario: true,
            nombre: true,
            correo: true,
            estado: true,
          },
        },
      },
    });
  }

  async listar(filtros?: {
    estado?: EstadoSolicitudEmpresa;
    tipo?: TipoSolicitudEmpresa;
    page?: number;
    limit?: number;
  }): Promise<{ items: SolicitudEmpresa[]; total: number }> {
    const where: Prisma.SolicitudEmpresaWhereInput = {};
    if (filtros?.estado) {
      where.estado = filtros.estado;
    }
    if (filtros?.tipo) {
      where.tipoSolicitud = filtros.tipo;
    }

    const page = filtros?.page && filtros.page > 0 ? filtros.page : 1;
    const limit = filtros?.limit && filtros.limit > 0 ? filtros.limit : 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.solicitudEmpresa.findMany({
        where,
        orderBy: { fechaSolicitud: 'desc' },
        skip,
        take: limit,
      }),
      prisma.solicitudEmpresa.count({ where }),
    ]);

    return { items, total };
  }

  async dictaminar(
    idSolicitud: string,
    dictamen: {
      estado: 'aprobada' | 'rechazada';
      idAdminRevisor: number;
      motivoRechazo?: string | null;
      fechaRevision?: Date;
    },
  ): Promise<SolicitudEmpresa> {
    return prisma.solicitudEmpresa.update({
      where: { idSolicitud },
      data: {
        estado: dictamen.estado,
        idAdminRevisor: dictamen.idAdminRevisor,
        motivoRechazo: dictamen.motivoRechazo ?? null,
        fechaRevision: dictamen.fechaRevision ?? new Date(),
      },
    });
  }

  // Renovación de NIT
  async crearSolicitudRenovacionNit(datos: {
    idUsuario: number;
    nitAnterior: string;
    nitNuevo: string;
    idDocumento?: string | null;
  }): Promise<SolicitudActualizacionNit> {
    return prisma.solicitudActualizacionNit.create({
      data: {
        idUsuario: datos.idUsuario,
        nitAnterior: datos.nitAnterior.trim(),
        nitNuevo: datos.nitNuevo.trim(),
        idDocumento: datos.idDocumento ?? null,
        estado: 'pendiente',
      },
    });
  }

  async buscarRenovacionPendientePorUsuario(idUsuario: number): Promise<SolicitudActualizacionNit | null> {
    return prisma.solicitudActualizacionNit.findFirst({
      where: {
        idUsuario,
        estado: 'pendiente',
      },
    });
  }

  async buscarRenovacionPendientePorNit(nitNuevo: string): Promise<SolicitudActualizacionNit | null> {
    return prisma.solicitudActualizacionNit.findFirst({
      where: {
        nitNuevo: nitNuevo.trim(),
        estado: 'pendiente',
      },
    });
  }

  async buscarRenovacionPorId(idSolicitud: string): Promise<SolicitudActualizacionNit | null> {
    return prisma.solicitudActualizacionNit.findUnique({
      where: { idSolicitud },
      include: {
        documento: {
          select: {
            idDocumento: true,
            nombreOriginal: true,
            tipoMime: true,
            tamanoBytes: true,
            sha256: true,
            fechaCarga: true,
          },
        },
      },
    });
  }

  async listarRenovaciones(filtros?: {
    estado?: EstadoSolicitudEmpresa;
    page?: number;
    limit?: number;
  }): Promise<{ items: SolicitudActualizacionNit[]; total: number }> {
    const where: Prisma.SolicitudActualizacionNitWhereInput = {};
    if (filtros?.estado) {
      where.estado = filtros.estado;
    }

    const page = filtros?.page && filtros.page > 0 ? filtros.page : 1;
    const limit = filtros?.limit && filtros.limit > 0 ? filtros.limit : 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.solicitudActualizacionNit.findMany({
        where,
        orderBy: { fechaSolicitud: 'desc' },
        skip,
        take: limit,
      }),
      prisma.solicitudActualizacionNit.count({ where }),
    ]);

    return { items, total };
  }

  async dictaminarRenovacionNit(
    idSolicitud: string,
    dictamen: {
      estado: 'aprobada' | 'rechazada';
      idAdminRevisor: number;
      motivoRechazo?: string | null;
      fechaRevision?: Date;
    },
  ): Promise<SolicitudActualizacionNit> {
    return prisma.solicitudActualizacionNit.update({
      where: { idSolicitud },
      data: {
        estado: dictamen.estado,
        idAdminRevisor: dictamen.idAdminRevisor,
        motivoRechazo: dictamen.motivoRechazo ?? null,
        fechaRevision: dictamen.fechaRevision ?? new Date(),
      },
    });
  }
}
