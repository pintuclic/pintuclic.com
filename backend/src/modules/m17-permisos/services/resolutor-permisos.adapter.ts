import type { ResolutorPermisos } from '../../m20-seguridad/services/autorizacion.service';
import type { GobernanzaAdminRepositoryPort } from '../interfaces/gobernanza.interface';
import type { PermisosRepositoryPort } from '../interfaces/permisos.interface';

/**
 * ADR-008 / ADR-013 — Adaptador en caliente de resolución de permisos para AutorizacionService de M20.
 *
 * Resuelve permisos en tiempo real contra la base de datos sin cachear en JWT.
 * Cuenta de Administrador: bypass incondicional (retorna true para cualquier permiso).
 * Cualquier otra cuenta: el repositorio solo concede si es un empleado ACTIVO con rol `empleado` y la fila en
 * `usuario_permiso` (M17 R-ACC-5). Un cliente, aunque tuviera una fila suelta, queda sin permisos.
 */
export class ResolutorPermisosDatabaseAdapter implements ResolutorPermisos {
  constructor(
    private readonly permisosRepo: PermisosRepositoryPort,
    private readonly gobernanzaRepo: GobernanzaAdminRepositoryPort,
  ) {}

  async tienePermiso(idUsuario: number, codigoPermiso: string): Promise<boolean> {
    const admin = await this.gobernanzaRepo.obtenerAdmin();
    if (admin && admin.idUsuario === idUsuario) {
      return true;
    }

    return this.permisosRepo.tienePermiso(idUsuario, codigoPermiso);
  }
}
