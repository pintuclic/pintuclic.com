import { derivarContrasena, verificarContrasena } from '../../../core/utils/crypto';
import type { CuentasRepository } from '../repositories/cuentas.repository';
import type { CodigosVerificacionRepository } from '../repositories/codigos-verificacion.repository';
import type { NotificacionesPort } from '../interfaces/notificaciones.port';
import type { DateProviderPort } from '../interfaces/date-provider.port';
import type { SesionService } from '../../m20-seguridad/services/sesion.service';
import type {
  ActualizarDatosPerfilRequest,
  CambiarContrasenaPerfilRequest,
  ConfirmarCambioCorreoRequest,
  DesactivarCuentaRequest,
  PerfilUsuarioResponse,
  SolicitarCambioCorreoRequest,
} from '../dtos/m04-cuentas.dto';

const MINUTOS_VIGENCIA_CAMBIO_CORREO = 15;

export class PerfilError extends Error {
  constructor(
    message: string,
    public readonly codigo: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'PerfilError';
  }
}

export class PerfilService {
  constructor(
    private readonly cuentasRepo: CuentasRepository,
    private readonly codigosRepo: CodigosVerificacionRepository,
    private readonly notificaciones: NotificacionesPort,
    private readonly dateProvider: DateProviderPort,
    private readonly sesionService: SesionService,
  ) {}

  /**
   * HU-CUE-06: Obtener perfil del usuario autenticado. La forma pública la fija
   * `perfilUsuarioResponseSchema` del contrato rector, sin contraseña ni derivados
   * (RN-CUE-25).
   */
  async obtenerPerfil(idUsuario: number): Promise<PerfilUsuarioResponse> {
    const usuario = await this.cuentasRepo.buscarConEmpresaPorId(idUsuario);
    if (!usuario) {
      throw new PerfilError('Usuario no encontrado.', 'USUARIO_NO_ENCONTRADO', 404);
    }

    const empresa = usuario.cuentaEmpresa;
    return {
      idUsuario: usuario.idUsuario,
      nombre: usuario.nombre,
      correo: usuario.correo,
      telefono: usuario.telefono,
      tipo: usuario.tipo,
      estado: usuario.estado,
      cambioContrasenaPendiente: usuario.cambioContrasenaPendiente,
      empresa: empresa
        ? {
            nit: empresa.nit,
            nombreEmpresa: empresa.nombreEmpresa,
            nombreRepresentante: empresa.nombreRepresentante,
            correoEmpresarial: empresa.correoEmpresarial,
            telefono: empresa.telefono,
            fechaAprobacion: empresa.fechaAprobacion.toISOString(),
          }
        : null,
    };
  }

  /**
   * HU-CUE-06: Actualizar datos personales básicos
   */
  async actualizarDatos(idUsuario: number, input: ActualizarDatosPerfilRequest) {
    const usuario = await this.cuentasRepo.buscarPorId(idUsuario);
    if (!usuario) {
      throw new PerfilError('Usuario no encontrado.', 'USUARIO_NO_ENCONTRADO', 404);
    }

    await this.cuentasRepo.actualizarDatosPerfil(idUsuario, {
      nombre: input.nombre,
      telefono: input.telefono,
    });

    // Misma forma que GET /perfil: el contrato define una sola respuesta de perfil.
    return this.obtenerPerfil(idUsuario);
  }

  /**
   * HU-CUE-06: Cambiar contraseña validando contraseña actual
   */
  async cambiarPassword(idUsuario: number, input: CambiarContrasenaPerfilRequest) {
    const usuario = await this.cuentasRepo.buscarPorId(idUsuario);
    if (!usuario) {
      throw new PerfilError('Usuario no encontrado.', 'USUARIO_NO_ENCONTRADO', 404);
    }

    const coincideActual = await verificarContrasena(input.contrasenaActual, usuario.contrasena);
    if (!coincideActual) {
      throw new PerfilError('La contraseña actual es incorrecta.', 'CONTRASENA_ACTUAL_INCORRECTA', 400);
    }

    const nuevoHash = await derivarContrasena(input.nuevaContrasena);
    await this.cuentasRepo.actualizarContrasena(idUsuario, nuevoHash, false);

    // Invalidar sesiones para forzar re-autenticación segura
    await this.sesionService.invalidarTodas(idUsuario, 'cambio_contrasena');

    return {
      mensaje: 'Contraseña actualizada exitosamente. Por favor inicie sesión nuevamente.',
    };
  }

  /**
   * HU-CUE-06: Solicitar cambio de correo electrónico (emite OTP al nuevo correo)
   */
  async solicitarCambioCorreo(idUsuario: number, input: SolicitarCambioCorreoRequest) {
    const usuario = await this.cuentasRepo.buscarPorId(idUsuario);
    if (!usuario) {
      throw new PerfilError('Usuario no encontrado.', 'USUARIO_NO_ENCONTRADO', 404);
    }

    // Validar contraseña antes de emitir cambio
    const coincide = await verificarContrasena(input.contrasena, usuario.contrasena);
    if (!coincide) {
      throw new PerfilError('La contraseña es incorrecta.', 'CONTRASENA_INCORRECTA', 400);
    }

    const nuevoCorreoNormalizado = input.nuevoCorreo.trim().toLowerCase();
    if (usuario.correo.toLowerCase() === nuevoCorreoNormalizado) {
      throw new PerfilError(
        'El nuevo correo debe ser diferente al correo actual.',
        'CORREO_IDENTICO',
        400,
      );
    }

    // Verificar si el correo ya está en uso por otra cuenta
    const enUso = await this.cuentasRepo.buscarPorCorreo(nuevoCorreoNormalizado);
    if (enUso !== null && enUso.idUsuario !== idUsuario) {
      throw new PerfilError(
        'El correo electrónico ya está registrado por otra cuenta.',
        'CORREO_YA_REGISTRADO',
        409,
      );
    }

    // Generar OTP de 6 dígitos
    const codigoNumerico = Math.floor(100000 + Math.random() * 900000).toString();
    const codigoHash = await derivarContrasena(codigoNumerico);
    const expiracion = new Date(
      this.dateProvider.ahora().getTime() + MINUTOS_VIGENCIA_CAMBIO_CORREO * 60 * 1000,
    );

    const guardado = await this.codigosRepo.guardarCodigo({
      correo: nuevoCorreoNormalizado,
      codigoHash,
      tipo: 'cambio_correo',
      expiracion,
      maxIntentos: 3,
      datosTemporales: {
        idUsuario,
        correoAnterior: usuario.correo,
        nuevoCorreo: nuevoCorreoNormalizado,
      },
    });

    await this.notificaciones.enviarCodigoCambioCorreo(
      nuevoCorreoNormalizado,
      codigoNumerico,
      MINUTOS_VIGENCIA_CAMBIO_CORREO,
    );

    return {
      idVerificacion: guardado.idCodigo,
      nuevoCorreo: nuevoCorreoNormalizado,
      tiempoExpiracionSegundos: MINUTOS_VIGENCIA_CAMBIO_CORREO * 60,
    };
  }

  /**
   * HU-CUE-06: Confirmar cambio de correo electrónico con código OTP
   */
  async confirmarCambioCorreo(idUsuario: number, input: ConfirmarCambioCorreoRequest) {
    const ahora = this.dateProvider.ahora();
    const correoNormalizado = input.nuevoCorreo.trim().toLowerCase();

    const registro = await this.codigosRepo.buscarUltimoActivoPorCorreo(
      correoNormalizado,
      'cambio_correo',
      ahora,
    );

    if (!registro) {
      throw new PerfilError('Solicitud de verificación no encontrada.', 'VERIFICACION_NO_ENCONTRADA', 404);
    }

    if (ahora.getTime() > registro.expiracion.getTime()) {
      await this.codigosRepo.eliminar(registro.idCodigo);
      throw new PerfilError('El código de verificación ha expirado.', 'CODIGO_EXPIRADO', 400);
    }

    const coincide = await verificarContrasena(input.codigo, registro.codigoHash);
    if (!coincide) {
      const actualizado = await this.codigosRepo.incrementarIntentos(registro.idCodigo);
      const restantes = Math.max(0, registro.maxIntentos - actualizado.intentos);
      throw new PerfilError(
        `Código de verificación incorrecto. Intentos restantes: ${restantes}.`,
        'CODIGO_INVALIDO',
        400,
      );
    }

    const datos = registro.datosTemporales as {
      idUsuario?: number;
      correoAnterior?: string;
      nuevoCorreo?: string;
    } | null;
    if (datos?.idUsuario !== idUsuario || !datos?.nuevoCorreo) {
      throw new PerfilError('Inconsistencia en la verificación de usuario.', 'USUARIO_NO_COINCIDE', 403);
    }

    await this.cuentasRepo.actualizarCorreo(idUsuario, datos.nuevoCorreo);
    await this.codigosRepo.eliminar(registro.idCodigo);

    if (datos.correoAnterior && this.notificaciones.notificarCambioCorreoConfirmado) {
      await this.notificaciones.notificarCambioCorreoConfirmado(datos.correoAnterior, datos.nuevoCorreo);
    }

    return {
      mensaje: 'Correo electrónico actualizado exitosamente.',
      nuevoCorreo: datos.nuevoCorreo,
    };
  }

  /**
   * HU-CUE-10: Desactivar cuenta propia con confirmación de contraseña
   */
  async desactivarCuenta(idUsuario: number, input: DesactivarCuentaRequest) {
    const usuario = await this.cuentasRepo.buscarPorId(idUsuario);
    if (!usuario) {
      throw new PerfilError('Usuario no encontrado.', 'USUARIO_NO_ENCONTRADO', 404);
    }

    const coincide = await verificarContrasena(input.contrasena, usuario.contrasena);
    if (!coincide) {
      throw new PerfilError('Contraseña incorrecta.', 'CONTRASENA_INCORRECTA', 400);
    }

    await this.cuentasRepo.desactivarCuenta(idUsuario);
    await this.sesionService.invalidarTodas(idUsuario, 'cuenta_desactivada');

    return {
      mensaje: 'Su cuenta ha sido desactivada exitosamente. Todas las sesiones han sido revocadas.',
    };
  }
}
