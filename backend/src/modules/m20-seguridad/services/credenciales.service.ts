import { derivarContrasena, verificarContrasena } from '../../../core/utils/crypto';
import type { UsuarioRepository } from '../repositories/usuario.repository';
import type { SesionService } from './sesion.service';

/**
 * HU-SEG-01 — Almacenamiento seguro de credenciales.
 * Lo consumen M04 (registro, login, recuperación) y M17 (alta de empleados).
 */
export class CredencialesService {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly sesiones: SesionService,
  ) {}

  /** RN-SEG-01. La sal la genera bcrypt por llamada: dos contraseñas iguales difieren. */
  async derivar(contrasenaPlana: string): Promise<string> {
    return derivarContrasena(contrasenaPlana);
  }

  /**
   * RF-SEG-01-02 y RNF-SEG-01-01: deriva y compara en tiempo constante.
   *
   * Si el correo no existe se verifica igualmente contra una derivación señuelo,
   * para que el tiempo de respuesta no delate la ausencia de la cuenta
   * (refuerza RF-SEG-06-06, no enumeración de correos).
   */
  async verificarPorCorreo(correo: string, contrasenaPlana: string): Promise<number | null> {
    const credencial = await this.usuarios.buscarCredencialPorCorreo(correo);

    if (credencial === null) {
      await verificarContrasena(contrasenaPlana, DERIVACION_SENUELO);
      return null;
    }
    const coincide = await verificarContrasena(contrasenaPlana, credencial.contrasena);
    if (!coincide || credencial.estado !== 'activo') {
      return null;
    }
    return credencial.idUsuario;
  }

  /**
   * RF-SEG-01-06 / CA-SEG-01-05 — Cambiar la contraseña invalida todas las
   * sesiones del usuario. La invalidación es parte indivisible del cambio.
   */
  async cambiarContrasena(idUsuario: number, nuevaContrasena: string): Promise<void> {
    const derivacion = await this.derivar(nuevaContrasena);
    await this.usuarios.actualizarContrasena(idUsuario, derivacion);
    await this.sesiones.invalidarTodas(idUsuario, 'cambio_contrasena');
  }
}

/**
 * Derivación de una cadena arbitraria, usada solo para igualar el tiempo de
 * respuesta cuando el correo no existe. Nunca autentica a nadie.
 */
const DERIVACION_SENUELO =
  '$2b$12$C6UzMDM.H6dfI/f/IKcEe.JustAPlaceholderHashForTimingXXXXXXXXXX';
