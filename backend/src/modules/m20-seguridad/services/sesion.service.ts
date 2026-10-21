import type { MotivoCierreSesion, Sesion, TipoSesion } from '@prisma/client';
import type { ParametrosSeguridadPort } from '../interfaces/parametros-seguridad.interface';
import type { SesionRepository } from '../repositories/sesion.repository';
import type { UsuarioRepository } from '../repositories/usuario.repository';

/**
 * HU-SEG-02 — Ciclo de vida de la sesión.
 * Implementa la máquina de 8 estados de HU-SEG-02_gestion_sesion.png.
 */

export type ResultadoValidacion =
  | { valida: true; sesion: Sesion }
  | { valida: false; motivo: MotivoCierreSesion | 'inexistente' };

export class SesionService {
  constructor(
    private readonly sesiones: SesionRepository,
    private readonly usuarios: UsuarioRepository,
    private readonly parametros: ParametrosSeguridadPort,
  ) {}

  private calcularExpiracion(tipo: TipoSesion, desde: Date): Date {
    const segundos = this.parametros.ventanaInactividadSegundos(tipo);
    return new Date(desde.getTime() + segundos * 1000);
  }

  /** Estados 1 y 2 del diagrama: autenticar y crear sesión con último acceso. */
  async crear(idUsuario: number, tipoSesion: TipoSesion): Promise<Sesion> {
    const expiracion = this.calcularExpiracion(tipoSesion, new Date());
    return this.sesiones.crear(idUsuario, tipoSesion, expiracion);
  }

  /**
   * Estados 3, 5 y 4.B del diagrama. Es el corazón de la ventana deslizante.
   *
   * Orden deliberado de las comprobaciones:
   *   1. Existencia.
   *   2. Estado terminal (RN-SEG-04: `cerrada`, `expirada` y `revocada` no vuelven a `activa`).
   *   3. Inactividad — el límite es EXCLUYENTE: operar justo en el instante de
   *      expiración se trata como expirado.
   *   4. Estado de la cuenta (CA-SEG-02-04: desactivarla invalida la sesión abierta).
   *   5. Solo entonces se renueva la vigencia.
   */
  async validarYRenovar(idSesion: string, ahora: Date = new Date()): Promise<ResultadoValidacion> {
    const sesion = await this.sesiones.buscarPorId(idSesion);
    if (sesion === null) {
      return { valida: false, motivo: 'inexistente' };
    }
    if (sesion.estado !== 'activa') {
      return { valida: false, motivo: sesion.motivoCierre ?? 'cierre_manual' };
    }
    if (ahora.getTime() >= sesion.fechaExpiracion.getTime()) {
      await this.sesiones.cerrar(idSesion, 'inactividad');
      return { valida: false, motivo: 'inactividad' };
    }

    const estadoCuenta = await this.usuarios.obtenerEstado(sesion.idUsuario);
    if (estadoCuenta !== 'activo') {
      await this.sesiones.cerrar(idSesion, 'cuenta_desactivada');
      return { valida: false, motivo: 'cuenta_desactivada' };
    }

    const renovada = await this.sesiones.renovarVigencia(
      idSesion,
      this.calcularExpiracion(sesion.tipoSesion, ahora),
    );
    return { valida: true, sesion: renovada };
  }

  /** Estado 4.A: cierre explícito por el titular (RF-SEG-02-04). */
  async cerrarManualmente(idSesion: string): Promise<Sesion> {
    return this.sesiones.cerrar(idSesion, 'cierre_manual');
  }

  /** Estado 6.A: invalidación en masa con causa (RF-SEG-02-06 / RN-SEG-04). */
  async invalidarTodas(idUsuario: number, motivo: MotivoCierreSesion): Promise<number> {
    return this.sesiones.invalidarTodasDeUsuario(idUsuario, motivo);
  }
}
