import crypto from 'node:crypto';
import { prisma } from '../../../core/db/client';
import { ROL_ADMINISTRADOR } from '../../../core/utils/roles';
import type {
  GobernanzaAdminRepositoryPort,
  SolicitudCambioCorreoAdmin,
} from '../interfaces/gobernanza.interface';

/** Marca las filas de codigo_verificacion que pertenecen a la gobernanza del admin. */
const ORIGEN_GOBERNANZA = 'gobernanza_admin';

/** Solo se persiste la huella del token: una fuga de la BD no expone enlaces válidos. */
function huellaToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

interface DatosSolicitudPersistida {
  origen: typeof ORIGEN_GOBERNANZA;
  idUsuario: number;
  correoActual: string;
}

function esDatosSolicitud(valor: unknown): valor is DatosSolicitudPersistida {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return false;
  const datos = valor as Record<string, unknown>;
  return (
    datos.origen === ORIGEN_GOBERNANZA &&
    typeof datos.idUsuario === 'number' &&
    typeof datos.correoActual === 'string'
  );
}

export class GobernanzaAdminRepository implements GobernanzaAdminRepositoryPort {
  /**
   * RN-ADM-18: la cuenta administradora es la cuenta activa con el rol exacto
   * `administrador`. Sin coincidencias parciales ni respaldo: si no existe, no hay
   * admin y nadie recibe el acceso total del resolutor de permisos.
   */
  async obtenerAdmin(): Promise<{ idUsuario: number; correo: string; nombre: string } | null> {
    return prisma.usuario.findFirst({
      where: { estado: 'activo', rolDirecto: { nombre: ROL_ADMINISTRADOR } },
      orderBy: { idUsuario: 'asc' },
      select: { idUsuario: true, correo: true, nombre: true },
    });
  }

  async guardarSolicitudCambioCorreo(solicitud: SolicitudCambioCorreoAdmin): Promise<void> {
    const datos: DatosSolicitudPersistida = {
      origen: ORIGEN_GOBERNANZA,
      idUsuario: solicitud.idUsuario,
      correoActual: solicitud.correoActual,
    };
    await prisma.codigoVerificacion.create({
      data: {
        correo: solicitud.nuevoCorreo,
        codigoHash: huellaToken(solicitud.tokenConfirmacion),
        tipo: 'cambio_correo',
        expiracion: solicitud.fechaExpiracion,
        maxIntentos: 1,
        datosTemporales: { ...datos },
      },
    });
  }

  async buscarSolicitudPorToken(token: string): Promise<SolicitudCambioCorreoAdmin | null> {
    const fila = await prisma.codigoVerificacion.findFirst({
      where: { codigoHash: huellaToken(token), tipo: 'cambio_correo' },
    });
    if (!fila || !esDatosSolicitud(fila.datosTemporales)) return null;

    if (new Date().getTime() > fila.expiracion.getTime()) {
      await prisma.codigoVerificacion.delete({ where: { idCodigo: fila.idCodigo } });
      return null;
    }

    return {
      idUsuario: fila.datosTemporales.idUsuario,
      correoActual: fila.datosTemporales.correoActual,
      nuevoCorreo: fila.correo,
      tokenConfirmacion: token,
      fechaExpiracion: fila.expiracion,
    };
  }

  async eliminarSolicitud(token: string): Promise<void> {
    await prisma.codigoVerificacion.deleteMany({
      where: { codigoHash: huellaToken(token), tipo: 'cambio_correo' },
    });
  }

  async actualizarCorreoAdmin(idUsuario: number, nuevoCorreo: string): Promise<void> {
    await prisma.usuario.update({
      where: { idUsuario },
      data: { correo: nuevoCorreo },
    });
  }

  async obtenerHashContrasena(idUsuario: number): Promise<string | null> {
    const usuario = await prisma.usuario.findUnique({
      where: { idUsuario },
      select: { contrasena: true },
    });
    return usuario?.contrasena ?? null;
  }

  async actualizarContrasena(idUsuario: number, hash: string): Promise<void> {
    await prisma.usuario.update({
      where: { idUsuario },
      data: { contrasena: hash, cambioContrasenaPendiente: false },
    });
  }
}
