import type { Actor } from '../../m20-seguridad/interfaces/actor.interface';
import {
  CODIGOS_ERROR_M17,
  type ActualizarPermisosEmpleadoOutput,
  type CodigoPermiso,
  type FichaPermisosEmpleadoOutput,
  type ItemPermisoCatalogo,
  type MisPermisosOutput,
} from '../dtos/m17-permisos.dto';
import type { EmpleadosRepositoryPort } from '../interfaces/empleados.interface';
import type { GobernanzaAdminRepositoryPort } from '../interfaces/gobernanza.interface';
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
  'notificaciones.editar': 'notificaciones.ver',
  'atencion.editar': 'atencion.ver',
  'atencion.atender_clientes': 'atencion.ver',
  'patrocinios.editar': 'patrocinios.ver',
  'asesoria.editar': 'asesoria.ver',
};

/** R-ACC-7: este permiso abre la puerta a repartir todos los demás; solo lo mueve el administrador. */
const PERMISO_GESTIONAR_PERMISOS = 'seguridad.gestionar_permisos';

export class PermisosService {
  constructor(
    private readonly permisosRepo: PermisosRepositoryPort,
    private readonly empleadosRepo: EmpleadosRepositoryPort,
    private readonly gobernanzaRepo: GobernanzaAdminRepositoryPort,
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

  /**
   * R-ACC-9: lo que la persona puede hacer, para que la interfaz arme su menú. El administrador recibe todo el
   * catálogo activo. Devuelve `null` si la cuenta no es de personal (el controlador responde el 404 opaco).
   */
  async misPermisos(idUsuario: number): Promise<MisPermisosOutput | null> {
    const admin = await this.gobernanzaRepo.obtenerAdmin();
    if (admin && admin.idUsuario === idUsuario) {
      const catalogo = await this.permisosRepo.listarCatalogo();
      return {
        idUsuario,
        nombre: admin.nombre,
        esAdministrador: true,
        permisos: catalogo.map((p) => p.nombre as CodigoPermiso),
      };
    }

    const empleado = await this.empleadosRepo.obtenerPorId(idUsuario);
    if (!empleado || empleado.estado !== 'activo') return null;

    const permisos = await this.permisosRepo.obtenerPermisosUsuario(idUsuario);
    return {
      idUsuario,
      nombre: empleado.nombre,
      esAdministrador: false,
      permisos: permisos as CodigoPermiso[],
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

    // R-ACC-6: el administrador tiene facultades implícitas y no se edita.
    const admin = await this.gobernanzaRepo.obtenerAdmin();
    if (admin && admin.idUsuario === idEmpleado) {
      throw new EmpleadoError(
        CODIGOS_ERROR_M17.OPERACION_BLOQUEADA_ADMIN,
        'Los permisos de la cuenta administradora no se modifican.',
        403,
      );
    }

    // R-ACC-6: quien no es empleado (un cliente, por ejemplo) se comporta como inexistente.
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

    // R-ACC-7: quien no es el administrador solo mueve permisos que él mismo posee.
    const esAdministrador = admin !== null && admin.idUsuario === actor.idUsuario;
    if (!esAdministrador) {
      const actuales = new Set(await this.permisosRepo.obtenerPermisosUsuario(idEmpleado));
      const propios = new Set(await this.permisosRepo.obtenerPermisosUsuario(actor.idUsuario));
      const cambiados = [
        ...[...conjuntoFinal].filter((c) => !actuales.has(c)),
        ...[...actuales].filter((c) => !conjuntoFinal.has(c)),
      ];
      const fueraDeAlcance = cambiados.some((c) => !propios.has(c) || c === PERMISO_GESTIONAR_PERMISOS);
      if (fueraDeAlcance) {
        throw new EmpleadoError(
          CODIGOS_ERROR_M17.PERMISO_NO_CONCEDIBLE,
          'Solo puede conceder o retirar permisos que usted mismo posee.',
          403,
        );
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
