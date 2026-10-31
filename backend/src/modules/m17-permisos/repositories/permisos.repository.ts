import { prisma } from '../../../core/db/client';
import { DONDE_EMPLEADO } from '../../../core/utils/roles';
import type { AreaFuncional } from '../dtos/m17-permisos.dto';
import type { EntidadPermiso, PermisosRepositoryPort } from '../interfaces/permisos.interface';

export class PermisosRepository implements PermisosRepositoryPort {
  private determinarArea(nombrePermiso: string): AreaFuncional {
    const prefijo = nombrePermiso.split('.')[0] ?? '';
    if (prefijo === 'catalogo' || prefijo === 'productos') return 'catalogo';
    if (prefijo === 'ventas' || prefijo === 'ordenes') return 'ventas';
    if (prefijo === 'personal' || prefijo === 'usuarios') return 'personal';
    if (prefijo === 'seguridad') return 'seguridad';
    if (prefijo === 'configuracion') return 'configuracion';
    if (prefijo === 'estadisticas') return 'estadisticas';
    if (prefijo === 'notificaciones') return 'notificaciones';
    if (prefijo === 'atencion') return 'atencion';
    if (prefijo === 'patrocinios') return 'patrocinios';
    if (prefijo === 'asesoria') return 'asesoria';
    return 'personal';
  }

  async listarCatalogo(): Promise<EntidadPermiso[]> {
    const filas = await prisma.permiso.findMany({
      where: { estado: 'activo' },
      orderBy: { nombre: 'asc' },
    });

    return filas.map((fila) => ({
      idPermiso: fila.idPermiso,
      nombre: fila.nombre,
      descripcion: fila.descripcion,
      area: this.determinarArea(fila.nombre),
    }));
  }

  async obtenerPermisosUsuario(idUsuario: number): Promise<string[]> {
    const filas = await prisma.usuarioPermiso.findMany({
      where: {
        idUsuario,
        permiso: { estado: 'activo' },
        usuario: { estado: 'activo', ...DONDE_EMPLEADO },
      },
      select: { permiso: { select: { nombre: true } } },
    });
    return filas.map((f) => f.permiso.nombre);
  }

  async tienePermiso(idUsuario: number, codigoPermiso: string): Promise<boolean> {
    const fila = await prisma.usuarioPermiso.findFirst({
      where: {
        idUsuario,
        permiso: { nombre: codigoPermiso, estado: 'activo' },
        // R-ACC-5: una fila suelta de una cuenta que no es empleado activo no concede nada.
        usuario: { estado: 'activo', ...DONDE_EMPLEADO },
      },
      select: { idUsuarioPermiso: true },
    });
    return fila !== null;
  }

  async asignarPermisos(idUsuario: number, codigosPermiso: string[]): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const empleado = await tx.usuario.findFirst({
        where: { idUsuario, ...DONDE_EMPLEADO },
        select: { idUsuario: true },
      });
      if (!empleado) {
        throw new Error('Solo se asignan permisos a cuentas con rol empleado.');
      }

      const permisos = await tx.permiso.findMany({
        where: { nombre: { in: codigosPermiso }, estado: 'activo' },
        select: { idPermiso: true },
      });

      await tx.usuarioPermiso.deleteMany({ where: { idUsuario } });
      if (permisos.length > 0) {
        await tx.usuarioPermiso.createMany({
          data: permisos.map((p) => ({ idUsuario, idPermiso: p.idPermiso })),
          skipDuplicates: true,
        });
      }
    });
  }
}
