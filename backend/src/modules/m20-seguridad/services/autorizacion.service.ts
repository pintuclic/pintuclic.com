import type { Actor } from '../interfaces/actor.interface';
import type { AuditoriaPort } from '../interfaces/auditoria.port';

/**
 * HU-SEG-03 — VALIDADOR CENTRAL.
 *
 * RNF-SEG-03-01: la comprobación vive aquí y solo aquí, de modo que una operación
 * nueva quede protegida por omisión y no por acuerdo del programador que la escriba.
 *
 * Ambas ramas del diagrama —petición por interfaz y petición directa manipulada—
 * convergen obligatoriamente en este servicio.
 */

export interface ResolutorPermisos {
  /**
   * RF-ADM-03-03: resuelve los permisos EN ESTA PETICIÓN, nunca desde un valor
   * fijado al iniciar la sesión. Lo implementará M17; M20 define el puerto.
   */
  tienePermiso(idUsuario: number, codigoPermiso: string): Promise<boolean>;
}

export interface ContextoDenegacion {
  operacionIntentada: string;
  ipOrigen: string | null;
}

export class AutorizacionService {
  constructor(
    private readonly permisos: ResolutorPermisos,
    private readonly auditoria: AuditoriaPort,
  ) {}

  /** RF-SEG-03-03. Comprobación por permiso atómico, jamás por rol. */
  async exigirPermiso(
    actor: Actor,
    codigoPermiso: string,
    contexto: ContextoDenegacion,
  ): Promise<boolean> {
    const autorizado = await this.permisos.tienePermiso(actor.idUsuario, codigoPermiso);
    if (!autorizado) {
      await this.registrarDenegacion(actor.idUsuario, codigoPermiso, contexto);
    }
    return autorizado;
  }

  /**
   * RF-SEG-03-02. Titularidad: el actor solo opera sobre lo suyo.
   * La comparación es contra el actor de la sesión verificada, nunca contra un
   * identificador recibido del cliente (Anti-IDOR).
   */
  async exigirTitularidad(
    actor: Actor,
    idUsuarioPropietario: number,
    contexto: ContextoDenegacion,
  ): Promise<boolean> {
    const esTitular = actor.idUsuario === idUsuarioPropietario;
    if (!esTitular) {
      await this.registrarDenegacion(actor.idUsuario, null, contexto);
    }
    return esTitular;
  }

  private async registrarDenegacion(
    idUsuario: number | null,
    permisoRequerido: string | null,
    contexto: ContextoDenegacion,
  ): Promise<void> {
    // RN-SEG-15: emisión al puerto. La persistencia llega con HU-SEG-04.
    await this.auditoria.registrarAccesoDenegado({
      idUsuario,
      operacionIntentada: contexto.operacionIntentada,
      permisoRequerido,
      fecha: new Date(),
      ipOrigen: contexto.ipOrigen,
    });
  }
}
