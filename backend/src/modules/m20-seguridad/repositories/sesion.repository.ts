import type { MotivoCierreSesion, Prisma, Sesion, TipoSesion } from '@prisma/client';
import { prisma } from '../../../core/db/client';

/** Única zona que importa Prisma. Cero SQL crudo (Regla de Oro #1 del Backend). */
export class SesionRepository {
  async crear(idUsuario: number, tipoSesion: TipoSesion, fechaExpiracion: Date): Promise<Sesion> {
    return prisma.sesion.create({
      data: { idUsuario, tipoSesion, fechaExpiracion },
    });
  }

  async buscarPorId(idSesion: string): Promise<Sesion | null> {
    return prisma.sesion.findUnique({ where: { idSesion } });
  }

  /** RF-SEG-02-03. Empuja la ventana deslizante en una sola escritura. */
  async renovarVigencia(idSesion: string, fechaExpiracion: Date): Promise<Sesion> {
    return prisma.sesion.update({
      where: { idSesion },
      data: { fechaUltimoAcceso: new Date(), fechaExpiracion },
    });
  }

  async cerrar(idSesion: string, motivoCierre: MotivoCierreSesion): Promise<Sesion> {
    return prisma.sesion.update({
      where: { idSesion },
      data: { estado: motivoCierre === 'inactividad' ? 'expirada' : 'cerrada', motivoCierre },
    });
  }

  /**
   * RF-SEG-02-06 / RN-SEG-04. Invalidación en masa: solo alcanza a las sesiones
   * `activa`, de modo que no reescribe el motivo de las ya cerradas.
   */
  async invalidarTodasDeUsuario(
    idUsuario: number,
    motivoCierre: MotivoCierreSesion,
  ): Promise<number> {
    const resultado: Prisma.BatchPayload = await prisma.sesion.updateMany({
      where: { idUsuario, estado: 'activa' },
      data: { estado: 'revocada', motivoCierre },
    });
    return resultado.count;
  }
}
