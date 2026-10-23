import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { derivarContrasena, verificarContrasena } from '../../../core/utils/crypto';
import type { CuentasRepository } from '../repositories/cuentas.repository';
import type { CodigosVerificacionRepository } from '../repositories/codigos-verificacion.repository';
import type { NotificacionesPort } from '../interfaces/notificaciones.port';
import type { DateProviderPort } from '../interfaces/date-provider.port';
import type { SesionService } from '../../m20-seguridad/services/sesion.service';
import type { RestablecerPasswordRequest } from '../dtos/m04-cuentas.dto';
import { obtenerSecretoJwt } from './secreto-jwt';
import { leerParametroCuentas } from './parametros-cuentas';
import type { ParametrosCuentasPort } from '../interfaces/parametros-cuentas.port';

const DERIVACION_SENUELO = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.JustAPlaceholderHashForTimingXXXXXXXXXX';

export class RecuperacionPasswordError extends Error {
  constructor(
    message: string,
    public readonly codigo: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'RecuperacionPasswordError';
  }
}

export class RecuperacionPasswordService {
  constructor(
    private readonly cuentasRepo: CuentasRepository,
    private readonly codigosRepo: CodigosVerificacionRepository,
    private readonly notificaciones: NotificacionesPort,
    private readonly dateProvider: DateProviderPort,
    private readonly sesionService: SesionService,
    /** HU-ADM-07: vigencia del enlace editable por el admin en M17. */
    private readonly parametros?: ParametrosCuentasPort,
  ) {}

  private obtenerJwtSecret(): string {
    return obtenerSecretoJwt();
  }

  /**
   * HU-CUE-05: Solicitar recuperación de contraseña con respuesta indistinguible anti-enumeración
   */
  async solicitarRecuperacion(correo: string): Promise<{ mensaje: string }> {
    const correoNormalizado = correo.trim().toLowerCase();
    const usuario = await this.cuentasRepo.buscarPorCorreo(correoNormalizado);

    if (usuario === null || usuario.estado !== 'activo') {
      // Señuelo de tiempo constante (RF-SEG-06-06 / ADR-012)
      await verificarContrasena('dummy-password', DERIVACION_SENUELO);
      return {
        mensaje:
          'Si el correo electrónico se encuentra registrado en nuestro sistema, recibirá un enlace para restablecer su contraseña.',
      };
    }

    // Generar token criptográfico seguro
    const minutosVigencia = await leerParametroCuentas(
      this.parametros,
      'auth.vigencia_enlace_recuperacion_minutos',
    );
    const tokenAleatorio = crypto.randomBytes(32).toString('hex');
    const tokenHash = await derivarContrasena(tokenAleatorio);
    const expiracion = new Date(
      this.dateProvider.ahora().getTime() + minutosVigencia * 60 * 1000,
    );

    const guardado = await this.codigosRepo.guardarCodigo({
      correo: correoNormalizado,
      codigoHash: tokenHash,
      tipo: 'recuperacion_password',
      expiracion,
      maxIntentos: 3,
      // Solo el hash del valor aleatorio queda en BD; el valor plano viaja únicamente en el enlace.
      datosTemporales: {
        idUsuario: usuario.idUsuario,
      },
    });

    // Token firmado con payload identificador para consumo stateless
    const tokenJwt = jwt.sign(
      {
        idCodigo: guardado.idCodigo,
        idUsuario: usuario.idUsuario,
        correo: correoNormalizado,
        rnd: tokenAleatorio,
        tipo: 'recuperacion_password',
      },
      this.obtenerJwtSecret(),
      { expiresIn: `${minutosVigencia}m` },
    );

    // RF-SEG-06-06: el envío no se espera. Esperarlo haría que un correo registrado
    // tarde lo que tarda el SMTP y delataría su existencia; un fallo de transporte
    // tampoco cambia la respuesta.
    this.notificaciones
      .enviarEnlaceRecuperacion(correoNormalizado, tokenJwt, minutosVigencia)
      .catch(() => undefined);

    return {
      mensaje:
        'Si el correo electrónico se encuentra registrado en nuestro sistema, recibirá un enlace para restablecer su contraseña.',
    };
  }

  /**
   * HU-CUE-05: Restablecer contraseña consumiendo token válido
   */
  async restablecerPassword(input: RestablecerPasswordRequest): Promise<{ mensaje: string }> {
    const ahora = this.dateProvider.ahora();
    // Toda causa de rechazo responde igual: no se revela qué parte del enlace falló.
    const enlaceInvalido = (): RecuperacionPasswordError =>
      new RecuperacionPasswordError(
        'El enlace de recuperación es inválido o ha expirado.',
        'TOKEN_INVALIDO_O_EXPIRADO',
        400,
      );

    let payload: { idCodigo?: unknown; idUsuario?: unknown; rnd?: unknown; tipo?: unknown };
    try {
      payload = jwt.verify(input.token, this.obtenerJwtSecret(), { algorithms: ['HS256'] }) as typeof payload;
    } catch {
      throw enlaceInvalido();
    }

    const { idCodigo, idUsuario, rnd } = payload;
    if (
      payload.tipo !== 'recuperacion_password' ||
      typeof idCodigo !== 'string' ||
      typeof idUsuario !== 'number' ||
      typeof rnd !== 'string'
    ) {
      throw enlaceInvalido();
    }

    // El código debe pertenecer al mismo usuario que nombra el token.
    const codigoRegistro = await this.codigosRepo.buscarPorId(idCodigo);
    const datos = codigoRegistro?.datosTemporales;
    const idUsuarioDelCodigo =
      typeof datos === 'object' && datos !== null && !Array.isArray(datos) ? datos.idUsuario : undefined;
    if (
      !codigoRegistro ||
      codigoRegistro.tipo !== 'recuperacion_password' ||
      idUsuarioDelCodigo !== idUsuario
    ) {
      throw enlaceInvalido();
    }

    // Validar expiración (RN-CUE-05: BVA 29:59 vs 30:01) y agotamiento de intentos.
    if (
      ahora.getTime() > codigoRegistro.expiracion.getTime() ||
      codigoRegistro.intentos >= codigoRegistro.maxIntentos
    ) {
      await this.codigosRepo.eliminar(codigoRegistro.idCodigo);
      throw enlaceInvalido();
    }

    // El valor aleatorio del enlace se compara contra el hash almacenado.
    const coincide = await verificarContrasena(rnd, codigoRegistro.codigoHash);
    if (!coincide) {
      await this.codigosRepo.incrementarIntentos(codigoRegistro.idCodigo);
      throw enlaceInvalido();
    }

    const usuario = await this.cuentasRepo.buscarPorId(idUsuario);
    if (!usuario || usuario.estado !== 'activo') {
      throw enlaceInvalido();
    }

    // 1. Derivar nueva contraseña con BCrypt costo 12
    const nuevaContrasenaHash = await derivarContrasena(input.nuevaContrasena);
    await this.cuentasRepo.actualizarContrasena(usuario.idUsuario, nuevaContrasenaHash, false);

    // 2. Eliminar token de recuperación utilizado
    await this.codigosRepo.eliminar(codigoRegistro.idCodigo);

    // 3. Invalidar todas las sesiones previas del usuario (RF-SEG-01-06 / CA-SEG-01-05)
    await this.sesionService.invalidarTodas(usuario.idUsuario, 'cambio_contrasena');

    return {
      mensaje: 'Contraseña restablecida exitosamente. Por favor inicie sesión con su nueva clave.',
    };
  }
}
