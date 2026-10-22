import type { Actor } from '../../m20-seguridad/interfaces/actor.interface';
import {
  CODIGOS_ERROR_M17,
  type ActualizarPermisosEmpleadoOutput,
  type CodigoPermiso,
  type FichaPermisosEmpleadoOutput,
  type ItemPermisoCatalogo,
} from '../dtos/m17-permisos.dto';
import type { EmpleadosRepositoryPort } from '../interfaces/empleados.interface';
import type { PermisosRepositoryPort } from '../interfaces/permisos.interface';
import { EmpleadoError } from './empleados.service';

const DEPENDENCIAS_CONSULTA: Record<string, string> = {
  'catalogo.crear': 'catalogo.ver',
  'catalogo.editar': 'catalogo.ver',
  'catalogo.eliminar': 'catalogo.ver',
  'productos.crear': 'catalogo.ver',
  'productos.eliminar': 'catalogo.ver',
  'ventas.gestionar': 'ventas.ver',
  'ventas.exportar': 'ventas.ver',
  'ordenes.ver': 'ventas.ver',
  'personal.editar': 'personal.ver',
  'personal.desactivar': 'personal.ver',
  'usuarios.gestionar': 'personal.ver',
  'configuracion.editar': 'configuracion.ver',
};

export class PermisosService {
  constructor(
    private readonly permisosRepo: PermisosRepositoryPort,
    private readonly empleadosRepo: EmpleadosRepositoryPort,
  ) {}

  async obtenerMatriz(idEmpleado: number): Promise<FichaPermisosEmpleadoOutput> {
    const empleado = await this.empleadosRepo.obtenerPorId(idEmpleado);
    if (!empleado) {
      throw new EmpleadoError(
        CODIGOS_ERROR_M17.EMPLEADO_NO_ENCONTRADO,
        'El colaborador solicitado no existe.',
        404,
      );
    }

    const catalogo = await this.permisosRepo.listarCatalogo();
    const concedidos = new Set(await this.permisosRepo.obtenerPermisosUsuario(idEmpleado));

    const permisos: ItemPermisoCatalogo[] = catalogo.map((p) => ({
      idPermiso: p.idPermiso,
      codigo: p.nombre as CodigoPermiso,
      descripcion: p.descripcion,
      area: p.area,
      concedido: concedidos.has(p.nombre),
    }));

    return {
      idUsuario: empleado.idUsuario,
      nombre: empleado.nombre,
      correo: empleado.correo,
      permisos,
    };
  }

  async actualizarPermisos(
    idEmpleado: number,
    permisosDeseados: CodigoPermiso[],
    actor: Actor,
  ): Promise<ActualizarPermisosEmpleadoOutput> {
    if (actor.idUsuario === idEmpleado) {
      throw new EmpleadoError(
        CODIGOS_ERROR_M17.OPERACION_BLOQUEADA_ADMIN,
        'No está permitido modificar sus propios permisos (RN-ADM-10).',
        403,
      );
    }

    const empleado = await this.empleadosRepo.obtenerPorId(idEmpleado);
    if (!empleado) {
      throw new EmpleadoError(
        CODIGOS_ERROR_M17.EMPLEADO_NO_ENCONTRADO,
        'El colaborador solicitado no existe.',
        404,
      );
    }

    const conjuntoFinal = new Set<string>(permisosDeseados);
    const permisosConcedidosAutomaticamente: CodigoPermiso[] = [];

    // RN-ADM-07: Concesión Implicada Consulta-Operación
    for (const permiso of permisosDeseados) {
      const permisoConsultaRequerido = DEPENDENCIAS_CONSULTA[permiso];
      if (permisoConsultaRequerido && !conjuntoFinal.has(permisoConsultaRequerido)) {
        conjuntoFinal.add(permisoConsultaRequerido);
        permisosConcedidosAutomaticamente.push(permisoConsultaRequerido as CodigoPermiso);
      }
    }

    // RN-ADM-08: Retiro en Cascada (si falta consulta, retirar operaciones asociadas)
    const permisosRevocadosEnCascada: CodigoPermiso[] = [];
    for (const [operacion, consulta] of Object.entries(DEPENDENCIAS_CONSULTA)) {
      if (!conjuntoFinal.has(consulta) && conjuntoFinal.has(operacion)) {
        conjuntoFinal.delete(operacion);
        permisosRevocadosEnCascada.push(operacion as CodigoPermiso);
      }
    }

    const resultadoLista = Array.from(conjuntoFinal) as CodigoPermiso[];
    await this.permisosRepo.asignarPermisos(idEmpleado, resultadoLista);

    return {
      idUsuario: idEmpleado,
      permisosOtorgados: resultadoLista,
      permisosConcedidosAutomaticamente,
      permisosRevocadosEnCascada,
      totalPermisosActivos: resultadoLista.length,
    };
  }
}
