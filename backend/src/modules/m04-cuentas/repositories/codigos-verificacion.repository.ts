import { Prisma, type CodigoVerificacion, type TipoCodigoOtp } from '@prisma/client';
import { prisma } from '../../../core/db/client';

export interface CodigosVerificacionRepository {
  guardarCodigo(datos: {
    correo: string;
    codigoHash: string;
    tipo: TipoCodigoOtp;
    expiracion: Date;
    maxIntentos?: number;
    datosTemporales?: Prisma.InputJsonValue;
  }): Promise<CodigoVerificacion>;
  buscarPorId(idCodigo: string): Promise<CodigoVerificacion | null>;
  buscarUltimoActivoPorCorreo(correo: string, tipo: TipoCodigoOtp, ahora?: Date): Promise<CodigoVerificacion | null>;
  incrementarIntentos(idCodigo: string): Promise<CodigoVerificacion>;
  eliminar(idCodigo: string): Promise<void>;
  eliminarPorCorreoYTipo(correo: string, tipo: TipoCodigoOtp): Promise<void>;
}

export class PrismaCodigosVerificacionRepository implements CodigosVerificacionRepository {
  async guardarCodigo(datos: {
    correo: string;
    codigoHash: string;
    tipo: TipoCodigoOtp;
    expiracion: Date;
    maxIntentos?: number;
    datosTemporales?: Prisma.InputJsonValue;
  }): Promise<CodigoVerificacion> {
    return prisma.codigoVerificacion.create({
      data: {
        correo: datos.correo.trim().toLowerCase(),
        codigoHash: datos.codigoHash,
        tipo: datos.tipo,
        expiracion: datos.expiracion,
        maxIntentos: datos.maxIntentos ?? 3,
        datosTemporales: datos.datosTemporales ?? Prisma.JsonNull,
      },
    });
  }

  async buscarPorId(idCodigo: string): Promise<CodigoVerificacion | null> {
    return prisma.codigoVerificacion.findUnique({
      where: { idCodigo },
    });
  }

  async buscarUltimoActivoPorCorreo(
    correo: string,
    tipo: TipoCodigoOtp,
    ahora: Date = new Date(),
  ): Promise<CodigoVerificacion | null> {
    return prisma.codigoVerificacion.findFirst({
      where: {
        correo: correo.trim().toLowerCase(),
        tipo,
        expiracion: {
          gt: ahora,
        },
      },
      orderBy: {
        fechaCreacion: 'desc',
      },
    });
  }

  async incrementarIntentos(idCodigo: string): Promise<CodigoVerificacion> {
    return prisma.codigoVerificacion.update({
      where: { idCodigo },
      data: {
        intentos: {
          increment: 1,
        },
      },
    });
  }

  async eliminar(idCodigo: string): Promise<void> {
    await prisma.codigoVerificacion.delete({
      where: { idCodigo },
    });
  }

  async eliminarPorCorreoYTipo(correo: string, tipo: TipoCodigoOtp): Promise<void> {
    await prisma.codigoVerificacion.deleteMany({
      where: { correo: correo.trim().toLowerCase(), tipo },
    });
  }
}
