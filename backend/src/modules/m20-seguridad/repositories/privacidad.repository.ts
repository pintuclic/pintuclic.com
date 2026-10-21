import type {
  AvisoPrivacidad,
  ConsentimientoUsuario,
  SolicitudSupresion,
} from '@prisma/client';
import { prisma } from '../../../core/db/client';

export class PrivacidadRepository {
  async obtenerAvisoVigente(): Promise<AvisoPrivacidad | null> {
    return prisma.avisoPrivacidad.findFirst({ where: { esVigente: true } });
  }

  async registrarConsentimiento(
    idUsuario: number,
    idAvisoPrivacidad: number,
  ): Promise<ConsentimientoUsuario> {
    return prisma.consentimientoUsuario.create({ data: { idUsuario, idAvisoPrivacidad } });
  }

  async buscarConsentimiento(
    idUsuario: number,
    idAvisoPrivacidad: number,
  ): Promise<ConsentimientoUsuario | null> {
    return prisma.consentimientoUsuario.findUnique({
      where: { idUsuario_idAvisoPrivacidad: { idUsuario, idAvisoPrivacidad } },
    });
  }

  async crearSolicitudSupresion(idUsuario: number): Promise<SolicitudSupresion> {
    return prisma.solicitudSupresion.create({ data: { idUsuario } });
  }

  async buscarSolicitudPendiente(idUsuario: number): Promise<SolicitudSupresion | null> {
    return prisma.solicitudSupresion.findFirst({
      where: { idUsuario, estado: { in: ['pendiente', 'en_proceso'] } },
    });
  }

  async listarSolicitudesDeUsuario(idUsuario: number): Promise<SolicitudSupresion[]> {
    return prisma.solicitudSupresion.findMany({
      where: { idUsuario },
      orderBy: { fechaSolicitud: 'desc' },
    });
  }
}
