import {
  Prisma,
  type EstadoSolicitudEmpresa,
  type SolicitudActualizacionNit,
  type SolicitudEmpresa,
  type TipoSolicitudEmpresa,
} from '@prisma/client';
import { prisma } from '../../../core/db/client';

/** Decisión del personal autorizado sobre una solicitud (aprobar o rechazar). */
export interface DecisionAdministrativa {
  estado: 'aprobada' | 'rechazada';
  idAdminRevisor: number;
  motivoRechazo?: string | null;
  fechaRevision?: Date;
}

/**
 * RNF-CUE-09-01 / RN-CUE-16 — Resultado de una decisión concurrente.
 *
 * - `decidida`: esta petición ganó y todos sus efectos quedaron aplicados.
 * - `ya_decidida`: otra petición decidió antes; no se modificó nada.
 * - `nit_ocupado`: el NIT pasó a pertenecer a otra cuenta mientras la solicitud
 *   estaba pendiente; la transacción se revirtió por completo.
 */
export type ResultadoDecision<T> =
  | { resultado: 'decidida'; solicitud: T }
  | { resultado: 'ya_decidida' }
  | { resultado: 'nit_ocupado' };

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
  buscarUltimaPorUsuario(idUsuario: number): Promise<SolicitudEmpresa | null>;
  buscarPorId(idSolicitud: string): Promise<SolicitudEmpresa | null>;
  listar(filtros?: {
    estado?: EstadoSolicitudEmpresa;
    tipo?: TipoSolicitudEmpresa;
    page?: number;
    limit?: number;
  }): Promise<{ items: SolicitudEmpresa[]; total: number }>;
  /**
   * Decide una solicitud de forma atómica. Solo prospera si sigue `pendiente`; al
   * aprobar, la activación, la conversión a tipo `empresa`, la fila 1:1 de
   * `cuenta_empresa` y la baja del acceso de Google ocurren en UNA transacción.
   */
  decidirSolicitud(
    idSolicitud: string,
    decision: DecisionAdministrativa,
  ): Promise<ResultadoDecision<SolicitudEmpresa>>;

  // Renovación de NIT
  crearSolicitudRenovacionNit(datos: {
    idUsuario: number;
    nitAnterior: string;
    nitNuevo: string;
    idDocumento?: string | null;
  }): Promise<SolicitudActualizacionNit>;
  buscarRenovacionPendientePorUsuario(idUsuario: number): Promise<SolicitudActualizacionNit | null>;
  buscarRenovacionPendientePorNit(nitNuevo: string): Promise<SolicitudActualizacionNit | null>;
  buscarUltimaRenovacionPorUsuario(idUsuario: number): Promise<SolicitudActualizacionNit | null>;
  buscarRenovacionPorId(idSolicitud: string): Promise<SolicitudActualizacionNit | null>;
  listarRenovaciones(filtros?: {
    estado?: EstadoSolicitudEmpresa;
    page?: number;
    limit?: number;
  }): Promise<{ items: SolicitudActualizacionNit[]; total: number }>;
  /** Decide una renovación de NIT de forma atómica (misma garantía que `decidirSolicitud`). */
  decidirRenovacionNit(
    idSolicitud: string,
    decision: DecisionAdministrativa,
  ): Promise<ResultadoDecision<SolicitudActualizacionNit>>;
}

/** P2002: violación de restricción única (NIT ya asignado a otra cuenta). */
function esViolacionDeUnicidad(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
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

  async buscarUltimaPorUsuario(idUsuario: number): Promise<SolicitudEmpresa | null> {
    return prisma.solicitudEmpresa.findFirst({
      where: { idUsuario },
      orderBy: { fechaSolicitud: 'desc' },
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

  async decidirSolicitud(
    idSolicitud: string,
    decision: DecisionAdministrativa,
  ): Promise<ResultadoDecision<SolicitudEmpresa>> {
    const fechaRevision = decision.fechaRevision ?? new Date();

    try {
      return await prisma.$transaction(async (tx) => {
        // Actualización condicionada (RN-CUE-16): solo una petición concurrente
        // encuentra la solicitud en `pendiente`; la otra obtiene 0 filas.
        const { count } = await tx.solicitudEmpresa.updateMany({
          where: { idSolicitud, estado: 'pendiente' },
          data: {
            estado: decision.estado,
            idAdminRevisor: decision.idAdminRevisor,
            motivoRechazo: decision.motivoRechazo ?? null,
            fechaRevision,
          },
        });
        if (count === 0) {
          return { resultado: 'ya_decidida' as const };
        }

        const solicitud = await tx.solicitudEmpresa.findUniqueOrThrow({ where: { idSolicitud } });

        if (decision.estado === 'aprobada') {
          // RN-CUE-15: solo la aprobación concede condiciones de empresa. El tipo se
          // convierte sobre la MISMA cuenta (RF-CUE-08-03); no se crea otra.
          await tx.usuario.update({
            where: { idUsuario: solicitud.idUsuario },
            data: { estado: 'activo', tipo: 'empresa' },
          });
          // ADR-010 / RFC-M04-001 C-1: fila 1:1 en cuenta_empresa.
          await tx.cuentaEmpresa.create({
            data: {
              idUsuario: solicitud.idUsuario,
              nit: solicitud.nit.trim(),
              nombreEmpresa: solicitud.nombreEmpresa.trim(),
              nombreRepresentante: solicitud.nombreRepresentante.trim(),
              correoEmpresarial: solicitud.correoEmpresarial.trim().toLowerCase(),
              telefono: solicitud.telefono.trim(),
              idSolicitudOrigen: solicitud.idSolicitud,
            },
          });
          // DP-12: una cuenta empresa no tiene acceso con Google.
          await tx.usuarioIdentidadExterna.deleteMany({
            where: { idUsuario: solicitud.idUsuario },
          });
        }

        return { resultado: 'decidida' as const, solicitud };
      });
    } catch (error) {
      // El NIT se asignó a otra cuenta mientras esta solicitud esperaba: la
      // transacción ya se revirtió, la solicitud sigue `pendiente`.
      if (esViolacionDeUnicidad(error)) {
        return { resultado: 'nit_ocupado' };
      }
      throw error;
    }
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

  async buscarUltimaRenovacionPorUsuario(idUsuario: number): Promise<SolicitudActualizacionNit | null> {
    return prisma.solicitudActualizacionNit.findFirst({
      where: { idUsuario },
      orderBy: { fechaSolicitud: 'desc' },
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

  async decidirRenovacionNit(
    idSolicitud: string,
    decision: DecisionAdministrativa,
  ): Promise<ResultadoDecision<SolicitudActualizacionNit>> {
    const fechaRevision = decision.fechaRevision ?? new Date();

    try {
      return await prisma.$transaction(async (tx) => {
        const { count } = await tx.solicitudActualizacionNit.updateMany({
          where: { idSolicitud, estado: 'pendiente' },
          data: {
            estado: decision.estado,
            idAdminRevisor: decision.idAdminRevisor,
            motivoRechazo: decision.motivoRechazo ?? null,
            fechaRevision,
          },
        });
        if (count === 0) {
          return { resultado: 'ya_decidida' as const };
        }

        const solicitud = await tx.solicitudActualizacionNit.findUniqueOrThrow({
          where: { idSolicitud },
        });

        if (decision.estado === 'aprobada') {
          // CA-CUE-09-05: el NIT vigente cambia solo con la aprobación.
          await tx.cuentaEmpresa.update({
            where: { idUsuario: solicitud.idUsuario },
            data: { nit: solicitud.nitNuevo.trim(), fechaActualizacion: new Date() },
          });
        }

        return { resultado: 'decidida' as const, solicitud };
      });
    } catch (error) {
      if (esViolacionDeUnicidad(error)) {
        return { resultado: 'nit_ocupado' };
      }
      throw error;
    }
  }
}
