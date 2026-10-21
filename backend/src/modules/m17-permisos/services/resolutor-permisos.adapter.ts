import type { ResolutorPermisos } from '../../m20-seguridad/services/autorizacion.service';
import type { EmpleadosRepositoryPort } from '../interfaces/empleados.interface';
import type { GobernanzaAdminRepositoryPort } from '../interfaces/gobernanza.interface';
import type { PermisosRepositoryPort } from '../interfaces/permisos.interface';

/**
 * ADR-008 — Adaptador en caliente de resolución de permisos para AutorizacionService de M20.
 *
 * Resuelve permisos en tiempo real contra la base de datos sin cachear en JWT.
 * Cuenta de Administrador: bypass incondicional (retorna true para cualquier permiso).
 */
export class ResolutorPermisosDatabaseAdapter implements ResolutorPermisos {
  constructor(
    private readonly permisosRepo: PermisosRepositoryPort,
    private readonly empleadosRepo: EmpleadosRepositoryPort,
    private readonly gobernanzaRepo: GobernanzaAdminRepositoryPort,
  ) {}

  async tienePermiso(idUsuario: number, codigoPermiso: string): Promise<boolean> {
    const admin = await this.gobernanzaRepo.obtenerAdmin();
    if (admin && admin.idUsuario === idUsuario) {
      return true;
    }

    const empleado = await this.empleadosRepo.obtenerPorId(idUsuario);
    if (!empleado || empleado.estado !== 'activo') {
      return false;
    }

    return this.permisosRepo.tienePermiso(idUsuario, codigoPermiso);
  }
}
