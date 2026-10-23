import jwt from 'jsonwebtoken';
import { Prisma, type Sesion, type Usuario } from '@prisma/client';
import { derivarContrasena, verificarContrasena } from '../../../core/utils/crypto';
import { esUsuarioAdministrativo, type CuentasRepository } from '../repositories/cuentas.repository';
import { obtenerSecretoJwt } from './secreto-jwt';
import { generarCodigoOtp } from './codigo-otp';
import { leerParametroCuentas } from './parametros-cuentas';
import type { ParametrosCuentasPort } from '../interfaces/parametros-cuentas.port';
import type { CodigosVerificacionRepository } from '../repositories/codigos-verificacion.repository';
import type { ControlIntentosRepository } from '../repositories/control-intentos.repository';
import type { NotificacionesPort } from '../interfaces/notificaciones.port';
import type { GoogleAuthPort } from '../interfaces/google-auth.port';
import type { DateProviderPort } from '../interfaces/date-provider.port';
import type { SesionService } from '../../m20-seguridad/services/sesion.service';
import type {
  CompletarRegistroGoogleRequest,
  LoginGoogleRequest,
  LoginRequest,
  RegistroClienteRequest,
} from '../dtos/m04-cuentas.dto';

const DERIVACION_SENUELO = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.JustAPlaceholderHashForTimingXXXXXXXXXX';

export class AuthCuentasError extends Error {
  constructor(
    message: string,
    public readonly codigo: string,
    public readonly statusCode: number = 400,
    public readonly detalles?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AuthCuentasError';
  }
}

export interface TokenRegistroGooglePayload {
  sub: string;
  email: string;
  nombre: string;
  tipo: 'google_registro';
}

export class AuthCuentasService {
  constructor(
    private readonly cuentasRepo: CuentasRepository,
    private readonly codigosRepo: CodigosVerificacionRepository,
    private readonly controlIntentosRepo: ControlIntentosRepository,
    private readonly notificaciones: NotificacionesPort,
    private readonly googleAuth: GoogleAuthPort,
    private readonly dateProvider: DateProviderPort,
    private readonly sesionService: SesionService,
    /** HU-ADM-07: valores que el admin edita en M17; sin él se usan los del seed. */
    private readonly parametros?: ParametrosCuentasPort,
  ) {}

  private obtenerJwtSecret(): string {
    return obtenerSecretoJwt();
  }

  private async parametrosOtpRegistro(): Promise<{ minutosVigencia: number; maxIntentos: number }> {
    const [minutosVigencia, maxIntentos] = await Promise.all([
      leerParametroCuentas(this.parametros, 'auth.vigencia_codigo_registro_minutos'),
      leerParametroCuentas(this.parametros, 'auth.intentos_codigo_registro'),
    ]);
    return { minutosVigencia, maxIntentos };
  }

  /**
   * HU-CUE-01: Registro B2C - Solicitar verificación con código OTP
   */
  async solicitarRegistroB2C(input: RegistroClienteRequest): Promise<{
    idVerificacion: string;
    correo: string;
    tiempoExpiracionSegundos: number;
  }> {
    const correoNormalizado = input.correo.trim().toLowerCase();

    // Comprobar unicidad estricta (HU-CUE-08)
    const existente = await this.cuentasRepo.buscarPorCorreo(correoNormalizado);
    if (existente !== null) {
      if (existente.estado === 'activo') {
        throw new AuthCuentasError(
          'El correo electrónico ya se encuentra registrado.',
          'CORREO_YA_REGISTRADO',
          409,
        );
      }
    }

    // Generar código numérico de 6 dígitos
    const { minutosVigencia, maxIntentos } = await this.parametrosOtpRegistro();
    const codigoNumerico = generarCodigoOtp();
    const codigoHash = await derivarContrasena(codigoNumerico);
    const expiracion = new Date(
      this.dateProvider.ahora().getTime() + minutosVigencia * 60 * 1000,
    );

    // Hash temporal de contraseña para registrarla una vez validado el OTP
    const contrasenaHashTemporal = await derivarContrasena(input.contrasena);

    const guardado = await this.codigosRepo.guardarCodigo({
      correo: correoNormalizado,
      codigoHash,
      tipo: 'registro',
      expiracion,
      maxIntentos,
      datosTemporales: {
        nombre: input.nombre.trim(),
        telefono: input.telefono?.trim() ?? null,
        contrasenaHash: contrasenaHashTemporal,
      },
    });

    // Despachar evento desacoplado (ADR-009)
    await this.notificaciones.enviarCodigoRegistro(
      correoNormalizado,
      codigoNumerico,
      minutosVigencia,
    );

    return {
      idVerificacion: guardado.idCodigo,
      correo: correoNormalizado,
      tiempoExpiracionSegundos: minutosVigencia * 60,
    };
  }

  /**
   * HU-CUE-01: Registro B2C - Verificar código OTP y consolidar cuenta activa
   */
  async verificarCodigoRegistro(
    idVerificacion: string,
    codigo: string,
  ): Promise<{ usuario: Usuario; sesion: Sesion }> {
    const registro = await this.codigosRepo.buscarPorId(idVerificacion);
    if (!registro || registro.tipo !== 'registro') {
      throw new AuthCuentasError('Código o verificación inexistente.', 'CODIGO_INVALIDO_O_EXPIRADO', 404);
    }

    const ahora = this.dateProvider.ahora();

    // Validar expiración (RN-CUE-01: BVA 14:59 vs 15:01)
    if (ahora.getTime() > registro.expiracion.getTime()) {
      await this.codigosRepo.eliminar(idVerificacion);
      throw new AuthCuentasError(
        'El código de verificación ha expirado.',
        'CODIGO_INVALIDO_O_EXPIRADO',
        400,
      );
    }

    // Validar reintentos máximos (3)
    if (registro.intentos >= registro.maxIntentos) {
      await this.codigosRepo.eliminar(idVerificacion);
      throw new AuthCuentasError(
        'Se ha superado el número máximo de intentos permitidos.',
        'MAXIMO_INTENTOS_EXCEDIDO',
        400,
      );
    }

    // Verificar coincidencia criptográfica con BCrypt
    const coincide = await verificarContrasena(codigo, registro.codigoHash);
    if (!coincide) {
      const actualizado = await this.codigosRepo.incrementarIntentos(idVerificacion);
      const restantes = Math.max(0, registro.maxIntentos - actualizado.intentos);
      throw new AuthCuentasError(
        `Código de verificación incorrecto. Intentos restantes: ${restantes}.`,
        'CODIGO_INVALIDO_O_EXPIRADO',
        400,
        { intentosRestantes: restantes },
      );
    }

    // Extraer datos temporales del registro
    const datos = registro.datosTemporales as {
      nombre: string;
      telefono?: string | null;
      contrasenaHash: string;
    } | null;

    if (!datos || !datos.contrasenaHash) {
      throw new AuthCuentasError(
        'Datos de registro incompletos o corruptos.',
        'DATOS_INVALIDOS',
        400,
      );
    }

    // Comprobar nuevamente unicidad antes de persistir
    const existente = await this.cuentasRepo.buscarPorCorreo(registro.correo);
    let usuario: Usuario;
    if (existente) {
      if (existente.estado === 'pendiente') {
        usuario = await this.cuentasRepo.actualizarEstado(existente.idUsuario, 'activo');
      } else {
        throw new AuthCuentasError(
          'El usuario ya se encuentra registrado y activo.',
          'CORREO_YA_REGISTRADO',
          409,
        );
      }
    } else {
      usuario = await this.cuentasRepo.crearUsuarioCliente({
        nombre: datos.nombre,
        correo: registro.correo,
        contrasenaHash: datos.contrasenaHash,
        telefono: datos.telefono ?? null,
        estado: 'activo',
        tipo: 'normal',
      });
    }

    // Consumir el código eliminándolo
    await this.codigosRepo.eliminar(idVerificacion);

    // Iniciar sesión automáticamente tras verificación exitosa
    const sesion = await this.sesionService.crear(usuario.idUsuario, 'cliente');

    return { usuario, sesion };
  }

  /**
   * HU-CUE-01: Reenviar código OTP de registro
   */
  async reenviarCodigoRegistro(idVerificacion: string): Promise<{
    idVerificacion: string;
    correo: string;
    tiempoExpiracionSegundos: number;
  }> {
    const registro = await this.codigosRepo.buscarPorId(idVerificacion);
    if (!registro || registro.tipo !== 'registro') {
      throw new AuthCuentasError('Solicitud de verificación no encontrada.', 'CODIGO_INVALIDO_O_EXPIRADO', 404);
    }

    const { minutosVigencia, maxIntentos } = await this.parametrosOtpRegistro();
    const nuevoCodigo = generarCodigoOtp();
    const codigoHash = await derivarContrasena(nuevoCodigo);
    const expiracion = new Date(
      this.dateProvider.ahora().getTime() + minutosVigencia * 60 * 1000,
    );

    await this.codigosRepo.eliminar(idVerificacion);

    const nuevoRegistro = await this.codigosRepo.guardarCodigo({
      correo: registro.correo,
      codigoHash,
      tipo: 'registro',
      expiracion,
      maxIntentos,
      datosTemporales: (registro.datosTemporales as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    });

    await this.notificaciones.enviarCodigoRegistro(
      registro.correo,
      nuevoCodigo,
      minutosVigencia,
    );

    return {
      idVerificacion: nuevoRegistro.idCodigo,
      correo: registro.correo,
      tiempoExpiracionSegundos: minutosVigencia * 60,
    };
  }

  /**
   * HU-CUE-04: Autenticación con Correo y Contraseña
   */
  async login(input: LoginRequest): Promise<
    | { requiereCambioContrasena: false; usuario: Usuario; sesion: Sesion; esAdmin: boolean }
    | { requiereCambioContrasena: true; tokenCambio: string; idUsuario: number }
  > {
    const correoNormalizado = input.correo.trim().toLowerCase();
    const ahora = this.dateProvider.ahora();
    const [maxIntentosLogin, minutosBloqueo] = await Promise.all([
      leerParametroCuentas(this.parametros, 'auth.intentos_fallidos_bloqueo'),
      leerParametroCuentas(this.parametros, 'auth.duracion_bloqueo_minutos'),
    ]);

    // 1. Verificar bloqueo anti-fuerza bruta (ADR-012)
    const control = await this.controlIntentosRepo.obtener(correoNormalizado);
    if (control?.bloqueadoHasta && control.bloqueadoHasta.getTime() > ahora.getTime()) {
      const segundosRestantes = Math.ceil(
        (control.bloqueadoHasta.getTime() - ahora.getTime()) / 1000,
      );
      throw new AuthCuentasError(
        `Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intente nuevamente en ${Math.ceil(segundosRestantes / 60)} minutos.`,
        'CUENTA_BLOQUEADA',
        423,
        { reintentarEnSegundos: segundosRestantes },
      );
    }

    // 2. Buscar usuario
    const usuario = await this.cuentasRepo.buscarPorCorreo(correoNormalizado);

    // 3. Si el correo no existe: señuelo de tiempo constante (RF-SEG-06-06 / ADR-012)
    if (usuario === null) {
      await verificarContrasena(input.contrasena, DERIVACION_SENUELO);
      await this.controlIntentosRepo.registrarFallo(
        correoNormalizado,
        maxIntentosLogin,
        minutosBloqueo,
        ahora,
      );
      throw new AuthCuentasError('Credenciales incorrectas.', 'CREDENCIALES_INVALIDAS', 401);
    }

    // 4. Comparar contraseña con BCrypt ANTES de revelar el estado de la cuenta:
    // con clave errónea, una cuenta inactiva responde igual que una inexistente (RF-SEG-06-06).
    const coincide = await verificarContrasena(input.contrasena, usuario.contrasena);
    if (!coincide) {
      const fallo = await this.controlIntentosRepo.registrarFallo(
        correoNormalizado,
        maxIntentosLogin,
        minutosBloqueo,
        ahora,
      );

      if (fallo.bloqueadoHasta && fallo.bloqueadoHasta.getTime() > ahora.getTime()) {
        throw new AuthCuentasError(
          `Ha superado el número de intentos permitidos. Su cuenta ha sido bloqueada temporalmente por ${minutosBloqueo} minutos.`,
          'CUENTA_BLOQUEADA',
          423,
          { reintentarEnSegundos: minutosBloqueo * 60 },
        );
      }

      // Sin "intentos restantes": la respuesta debe ser idéntica a la de un correo inexistente.
      throw new AuthCuentasError('Credenciales incorrectas.', 'CREDENCIALES_INVALIDAS', 401);
    }

    // 5. Solo quien demostró conocer la clave sabe que la cuenta no está activa.
    if (usuario.estado === 'pendiente') {
      throw new AuthCuentasError(
        'La cuenta está pendiente de activación.',
        'CUENTA_PENDIENTE_ACTIVACION',
        403,
      );
    }
    if (usuario.estado !== 'activo') {
      throw new AuthCuentasError(
        'La cuenta se encuentra inactiva o bloqueada.',
        'CUENTA_BLOQUEADA',
        403,
      );
    }

    // 6. Éxito: limpiar control de fallos
    await this.controlIntentosRepo.limpiar(correoNormalizado);

    // 7. Si tiene cambio obligatorio de clave pendiente (CA-ADM-01-03 / ADR-011)
    if (usuario.cambioContrasenaPendiente) {
      const tokenCambio = jwt.sign(
        { idUsuario: usuario.idUsuario, tipo: 'cambio_primer_acceso' },
        this.obtenerJwtSecret(),
        { expiresIn: '15m' },
      );

      return {
        requiereCambioContrasena: true,
        tokenCambio,
        idUsuario: usuario.idUsuario,
      };
    }

    // 8. Crear sesión activa
    const esAdmin = esUsuarioAdministrativo(usuario);
    const tipoSesion = esAdmin ? 'admin' : 'cliente';
    const sesion = await this.sesionService.crear(usuario.idUsuario, tipoSesion);

    return {
      requiereCambioContrasena: false,
      usuario,
      sesion,
      esAdmin,
    };
  }

  /**
   * HU-CUE-04: Cambio obligatorio de contraseña en primer acceso
   */
  async cambiarContrasenaPrimerAcceso(
    tokenCambio: string,
    nuevaContrasena: string,
  ): Promise<{ usuario: Usuario; sesion: Sesion; esAdmin: boolean }> {
    let payload: { idUsuario: number; tipo: string };
    try {
      payload = jwt.verify(tokenCambio, this.obtenerJwtSecret()) as {
        idUsuario: number;
        tipo: string;
      };
    } catch {
      throw new AuthCuentasError('Token de cambio de contraseña inválido o expirado.', 'TOKEN_INVALIDO_O_EXPIRADO', 401);
    }

    if (payload.tipo !== 'cambio_primer_acceso') {
      throw new AuthCuentasError('Tipo de token no autorizado.', 'TOKEN_INVALIDO_O_EXPIRADO', 401);
    }

    const usuario = await this.cuentasRepo.buscarPorId(payload.idUsuario);
    if (!usuario) {
      throw new AuthCuentasError('Usuario no encontrado.', 'RECURSO_NO_ENCONTRADO', 404);
    }

    const contrasenaHash = await derivarContrasena(nuevaContrasena);
    const usuarioActualizado = await this.cuentasRepo.actualizarContrasena(
      usuario.idUsuario,
      contrasenaHash,
      false, // cambioContrasenaPendiente = false
    );

    const esAdmin = esUsuarioAdministrativo(usuario);
    const tipoSesion = esAdmin ? 'admin' : 'cliente';
    const sesion = await this.sesionService.crear(usuario.idUsuario, tipoSesion);

    return { usuario: usuarioActualizado, sesion, esAdmin };
  }

  /**
   * HU-CUE-02: Federación con Google Identity
   */
  async autenticarGoogle(input: LoginGoogleRequest): Promise<
    | { cuentaNueva: false; usuario: Usuario; sesion: Sesion }
    | { cuentaNueva: true; tokenRegistroTemporal: string; email: string; nombre: string }
  > {
    const claims = await this.googleAuth.verificarIdToken(input.idToken);
    // Sin correo verificado por Google no hay prueba de titularidad para vincular cuentas.
    if (!claims.emailVerified) {
      throw new AuthCuentasError('Credenciales incorrectas.', 'CREDENCIALES_INVALIDAS', 401);
    }
    const emailNormalizado = claims.email.trim().toLowerCase();

    // 1. Buscar si ya existe la identidad externa vinculada
    const identidad = await this.cuentasRepo.buscarIdentidadExterna('google', claims.sub);
    if (identidad) {
      const usuario = await this.cuentasRepo.buscarPorId(identidad.idUsuario);
      if (!usuario || usuario.estado !== 'activo') {
        throw new AuthCuentasError('Cuenta asociada inactiva o no disponible.', 'CUENTA_BLOQUEADA', 403);
      }

      const tipoSesion = esUsuarioAdministrativo(usuario) ? 'admin' : 'cliente';
      const sesion = await this.sesionService.crear(usuario.idUsuario, tipoSesion);
      return { cuentaNueva: false, usuario, sesion };
    }

    // 2. Si no existe identidad externa, buscar si el correo ya existe en usuario
    const usuarioExistente = await this.cuentasRepo.buscarPorCorreo(emailNormalizado);
    if (usuarioExistente) {
      if (usuarioExistente.estado !== 'activo') {
        throw new AuthCuentasError('Cuenta existente no se encuentra activa.', 'CUENTA_BLOQUEADA', 403);
      }

      // Vincular automáticamente la identidad de Google a la cuenta existente
      await this.cuentasRepo.vincularIdentidadExterna({
        idUsuario: usuarioExistente.idUsuario,
        proveedor: 'google',
        idProveedor: claims.sub,
        correoProveedor: emailNormalizado,
      });

      const tipoSesion = esUsuarioAdministrativo(usuarioExistente) ? 'admin' : 'cliente';
      const sesion = await this.sesionService.crear(usuarioExistente.idUsuario, tipoSesion);
      return { cuentaNueva: false, usuario: usuarioExistente, sesion };
    }

    // 3. Cuenta totalmente nueva: emitir token efímero firmado (TTL 10m) para obligar a fijar contraseña (RN-SEG-02 / ADR-011)
    const tokenPayload: TokenRegistroGooglePayload = {
      sub: claims.sub,
      email: emailNormalizado,
      nombre: claims.nombre,
      tipo: 'google_registro',
    };

    const tokenRegistro = jwt.sign(tokenPayload, this.obtenerJwtSecret(), {
      expiresIn: '10m',
    });

    return {
      cuentaNueva: true,
      tokenRegistroTemporal: tokenRegistro,
      email: emailNormalizado,
      nombre: claims.nombre,
    };
  }

  /**
   * HU-CUE-02: Completar registro federado fijando contraseña obligatoria (RN-SEG-02)
   */
  async completarRegistroGoogle(input: CompletarRegistroGoogleRequest): Promise<{
    usuario: Usuario;
    sesion: Sesion;
  }> {
    let payload: TokenRegistroGooglePayload;
    try {
      payload = jwt.verify(input.tokenRegistroTemporal, this.obtenerJwtSecret()) as TokenRegistroGooglePayload;
    } catch {
      throw new AuthCuentasError('Token de registro Google expirado o inválido.', 'TOKEN_INVALIDO_O_EXPIRADO', 401);
    }

    if (payload.tipo !== 'google_registro') {
      throw new AuthCuentasError('Tipo de token no válido para completar registro.', 'TOKEN_INVALIDO_O_EXPIRADO', 401);
    }

    // Comprobar que el correo no se haya registrado entretanto
    const existente = await this.cuentasRepo.buscarPorCorreo(payload.email);
    if (existente && existente.estado === 'activo') {
      throw new AuthCuentasError('El correo ya ha sido registrado.', 'CORREO_YA_REGISTRADO', 409);
    }

    const contrasenaHash = await derivarContrasena(input.contrasena);

    const usuario = await this.cuentasRepo.crearUsuarioCliente({
      nombre: payload.nombre,
      correo: payload.email,
      contrasenaHash,
      telefono: input.telefono,
      estado: 'activo',
      tipo: 'normal',
    });

    await this.cuentasRepo.vincularIdentidadExterna({
      idUsuario: usuario.idUsuario,
      proveedor: 'google',
      idProveedor: payload.sub,
      correoProveedor: payload.email,
    });

    const sesion = await this.sesionService.crear(usuario.idUsuario, 'cliente');

    return { usuario, sesion };
  }
}
