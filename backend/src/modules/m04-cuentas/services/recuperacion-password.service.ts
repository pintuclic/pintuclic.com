import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { derivarContrasena, verificarContrasena } from '../../../core/utils/crypto';
import type { CuentasRepository } from '../repositories/cuentas.repository';
import type { CodigosVerificacionRepository } from '../repositories/codigos-verificacion.repository';
import type { NotificacionesPort } from '../interfaces/notificaciones.port';
import type { DateProviderPort } from '../interfaces/date-provider.port';
import type { SesionService } from '../../m20-seguridad/services/sesion.service';
import type { RestablecerPasswordRequest } from '../dtos/m04-cuentas.dto';

const DERIVACION_SENUELO = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.JustAPlaceholderHashForTimingXXXXXXXXXX';
const MINUTOS_VIGENCIA_RECUPERACION = 30;

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
  ) {}

  private obtenerJwtSecret(): string {
    return process.env.JWT_SECRET ?? 'clave-secreta-predeterminada-para-desarrollo-minimo-32-caracteres';
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
    const tokenAleatorio = crypto.randomBytes(32).toString('hex');
    const tokenHash = await derivarContrasena(tokenAleatorio);
    const expiracion = new Date(
      this.dateProvider.ahora().getTime() + MINUTOS_VIGENCIA_RECUPERACION * 60 * 1000,
    );

    const guardado = await this.codigosRepo.guardarCodigo({
      correo: correoNormalizado,
      codigoHash: tokenHash,
      tipo: 'recuperacion_password',
      expiracion,
      maxIntentos: 3,
      datosTemporales: {
        idUsuario: usuario.idUsuario,
        tokenPlano: tokenAleatorio,
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
      { expiresIn: `${MINUTOS_VIGENCIA_RECUPERACION}m` },
    );

    try {
      await this.notificaciones.enviarEnlaceRecuperacion(
        correoNormalizado,
        tokenJwt,
        MINUTOS_VIGENCIA_RECUPERACION,
      );
    } catch {
      // RF-SEG-06-06: preservar respuesta indistinguible ante fallos transitorios de transporte SMTP
    }

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

    let idCodigo: string | null = null;
    let idUsuario: number | null = null;

    try {
      const payload = jwt.verify(input.token, this.obtenerJwtSecret()) as {
        idCodigo: string;
        idUsuario: number;
        tipo: string;
      };
      if (payload.tipo === 'recuperacion_password') {
        idCodigo = payload.idCodigo;
        idUsuario = payload.idUsuario;
      }
    } catch {
      // Si no es un JWT válido, se rechaza
      throw new RecuperacionPasswordError(
        'El enlace de recuperación es inválido o ha expirado.',
        'TOKEN_INVALIDO_O_EXPIRADO',
        400,
      );
    }

    if (!idCodigo || !idUsuario) {
      throw new RecuperacionPasswordError(
        'El enlace de recuperación es inválido o ha expirado.',
        'TOKEN_INVALIDO_O_EXPIRADO',
        400,
      );
    }

    const codigoRegistro = await this.codigosRepo.buscarPorId(idCodigo);
    if (!codigoRegistro || codigoRegistro.tipo !== 'recuperacion_password') {
      throw new RecuperacionPasswordError(
        'El enlace de recuperación es inválido o ha expirado.',
        'TOKEN_INVALIDO_O_EXPIRADO',
        400,
      );
    }

    // Validar expiración (RN-CUE-05: BVA 29:59 vs 30:01)
    if (ahora.getTime() > codigoRegistro.expiracion.getTime()) {
      await this.codigosRepo.eliminar(codigoRegistro.idCodigo);
      throw new RecuperacionPasswordError(
        'El enlace de recuperación ha expirado.',
        'TOKEN_EXPIRADO',
        400,
      );
    }

    const usuario = await this.cuentasRepo.buscarPorId(idUsuario);
    if (!usuario) {
      throw new RecuperacionPasswordError('Usuario no encontrado.', 'USUARIO_NO_ENCONTRADO', 404);
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
