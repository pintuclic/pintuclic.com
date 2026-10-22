import type { AreaFuncional, CodigoPermiso } from '../dtos/permisos.dto';

/**
 * ==============================================================================
 * Contratos de Tipado para Permisos Atómicos — M17 (Frontend)
 * ==============================================================================
 * CERO RUNTIME. Solo definiciones de TypeScript.
 */

export interface ItemPermisoCatalogo {
  idPermiso: number;
  codigo: CodigoPermiso;
  descripcion: string | null;
  area: AreaFuncional;
  concedido: boolean;
}

export interface FichaPermisosEmpleadoRespuesta {
  idUsuario: number;
  nombre: string;
  correo: string;
  permisos: ItemPermisoCatalogo[];
}

export interface ActualizarPermisosRespuesta {
  idUsuario: number;
  permisosOtorgados: CodigoPermiso[];
  permisosConcedidosAutomaticamente: CodigoPermiso[];
  permisosRevocadosEnCascada: CodigoPermiso[];
  totalPermisosActivos: number;
}
