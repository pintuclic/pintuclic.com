import crypto from 'node:crypto';
import { prisma } from '../../../core/db/client';
import { derivarContrasena, verificarContrasena } from '../../../core/utils/crypto';
import type { SesionService } from '../../m20-seguridad/services/sesion.service';
import {
  CODIGOS_ERROR_M17,
  type ConfirmarSustitucionCorreoAdminInput,
  type PrimerAccesoAdminInput,
  type SolicitarSustitucionCorreoAdminInput,
} from '../dtos/m17-permisos.dto';
import type { EmpleadosRepositoryPort } from '../interfaces/empleados.interface';
import type { GobernanzaAdminRepositoryPort } from '../interfaces/gobernanza.interface';
import { EmpleadoError } from './empleados.service';

export class GobernanzaAdminService {
  constructor(
    private readonly gobernanzaRepo: GobernanzaAdminRepositoryPort,
    private readonly empleadosRepo: EmpleadosRepositoryPort,
    private readonly sesionService: SesionService,
  ) {}

  async solicitarSustitucionCorreo(
    input: SolicitarSustitucionCorreoAdminInput,
    idActor: number,
  ): Promise<{ mensaje: string; tokenPreview?: string }> {
    const admin = await this.gobernanzaRepo.obtenerAdmin();
    if (!admin || admin.idUsuario !== idActor) {
      throw new EmpleadoError(
        CODIGOS_ERROR_M17.ACCESO_DENEGADO,
        'Solo el administrador principal puede iniciar el traspaso de su cuenta (RN-ADM-18).',
        403,
      );
    }

    const usuarioExistente = await this.empleadosRepo.obtenerPorCorreo(input.nuevoCorreo);
    if (usuarioExistente) {
      throw new EmpleadoError(
        CODIGOS_ERROR_M17.CORREO_DUPLICADO,
        'El nuevo correo ya se encuentra asignado a otra cuenta en el sistema.',
        409,
      );
    }

    const tokenConfirmacion = crypto.randomBytes(24).toString('hex');
    const fechaExpiracion = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    await this.gobernanzaRepo.guardarSolicitudCambioCorreo({
      idUsuario: admin.idUsuario,
      correoActual: admin.correo,
      nuevoCorreo: input.nuevoCorreo,
      tokenConfirmacion,
      fechaExpiracion,
    });

    const respuesta: { mensaje: string; tokenPreview?: string } = {
      mensaje: `Se ha enviado un enlace de confirmación a ${input.nuevoCorreo} y una notificación preventiva a ${admin.correo}.`,
    };
    if (process.env.NODE_ENV !== 'production') {
      respuesta.tokenPreview = tokenConfirmacion;
    }
    return respuesta;
  }

  async confirmarSustitucionCorreo(
    input: ConfirmarSustitucionCorreoAdminInput,
  ): Promise<{ mensaje: string }> {
    const solicitud = await this.gobernanzaRepo.buscarSolicitudPorToken(input.tokenConfirmacion);
    if (!solicitud) {
      throw new EmpleadoError(
        CODIGOS_ERROR_M17.TOKEN_INVALIDO_O_EXPIRADO,
        'El enlace de confirmación es inválido o ha caducado (RN-ADM-18).',
        400,
      );
    }

    await this.gobernanzaRepo.actualizarCorreoAdmin(solicitud.idUsuario, solicitud.nuevoCorreo);
    await this.gobernanzaRepo.eliminarSolicitud(input.tokenConfirmacion);

    // Invalida todas las sesiones del admin para forzar re-login con nuevo correo
    await this.sesionService.invalidarTodas(solicitud.idUsuario, 'cambio_contrasena');

    return {
      mensaje: 'Correo de la cuenta administradora actualizado con éxito. Las sesiones anteriores han sido revocadas.',
    };
  }

  async primerAcceso(
    idUsuario: number,
    input: PrimerAccesoAdminInput,
  ): Promise<{ mensaje: string }> {
    const empleado = await this.empleadosRepo.obtenerPorId(idUsuario);
    if (!empleado) {
      throw new EmpleadoError(
        CODIGOS_ERROR_M17.EMPLEADO_NO_ENCONTRADO,
        'Usuario no encontrado.',
        404,
      );
    }

    // Verificar credencial actual
    const usuarioBD = await prisma.usuario.findUnique({
      where: { idUsuario },
      select: { contrasena: true },
    });

    if (!usuarioBD) {
      throw new EmpleadoError(CODIGOS_ERROR_M17.EMPLEADO_NO_ENCONTRADO, 'Usuario no encontrado.', 404);
    }

    const coincide = await verificarContrasena(input.credencialTemporal, usuarioBD.contrasena);
    if (!coincide) {
      throw new EmpleadoError(
        CODIGOS_ERROR_M17.ACCESO_DENEGADO,
        'La credencial temporal suministrada es incorrecta.',
        401,
      );
    }

    const nuevoHash = await derivarContrasena(input.nuevaContrasena);
    await prisma.usuario.update({
      where: { idUsuario },
      data: { contrasena: nuevoHash },
    });

    await this.sesionService.invalidarTodas(idUsuario, 'cambio_contrasena');

    return {
      mensaje: 'Contraseña actualizada exitosamente. Inicie sesión con su nueva credencial.',
    };
  }
}
