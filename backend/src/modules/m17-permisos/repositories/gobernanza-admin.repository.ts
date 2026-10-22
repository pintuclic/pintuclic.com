import { prisma } from '../../../core/db/client';
import type {
  GobernanzaAdminRepositoryPort,
  SolicitudCambioCorreoAdmin,
} from '../interfaces/gobernanza.interface';

export class GobernanzaAdminRepository implements GobernanzaAdminRepositoryPort {
  private solicitudesTokens: Map<string, SolicitudCambioCorreoAdmin> = new Map();

  async obtenerAdmin(): Promise<{ idUsuario: number; correo: string; nombre: string } | null> {
    const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@pintuclic.com';
    const admin = await prisma.usuario.findFirst({
      where: {
        OR: [
          { correo: adminEmail },
          { rolDirecto: { nombre: { contains: 'Admin', mode: 'insensitive' } } },
        ],
      },
      select: { idUsuario: true, correo: true, nombre: true },
    });

    if (admin) return admin;

    const primerUsuario = await prisma.usuario.findFirst({
      orderBy: { idUsuario: 'asc' },
      select: { idUsuario: true, correo: true, nombre: true },
    });

    return primerUsuario;
  }

  async guardarSolicitudCambioCorreo(solicitud: SolicitudCambioCorreoAdmin): Promise<void> {
    this.solicitudesTokens.set(solicitud.tokenConfirmacion, solicitud);
  }

  async buscarSolicitudPorToken(token: string): Promise<SolicitudCambioCorreoAdmin | null> {
    const solicitud = this.solicitudesTokens.get(token);
    if (!solicitud) return null;

    if (new Date().getTime() > solicitud.fechaExpiracion.getTime()) {
      this.solicitudesTokens.delete(token);
      return null;
    }

    return solicitud;
  }

  async eliminarSolicitud(token: string): Promise<void> {
    this.solicitudesTokens.delete(token);
  }

  async actualizarCorreoAdmin(idUsuario: number, nuevoCorreo: string): Promise<void> {
    await prisma.usuario.update({
      where: { idUsuario },
      data: { correo: nuevoCorreo },
    });
  }
}
