import { prisma } from '../../../core/db/client';
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
    const usuarioRol = await prisma.usuarioRol.findUnique({
      where: { idUsuario },
      include: {
        rol: {
          include: {
            asignaciones: {
              include: {
                permiso: true,
              },
            },
          },
        },
      },
    });

    if (!usuarioRol || !usuarioRol.rol) {
      return [];
    }

    return usuarioRol.rol.asignaciones
      .filter((a) => a.permiso.estado === 'activo')
      .map((a) => a.permiso.nombre);
  }

  async tienePermiso(idUsuario: number, codigoPermiso: string): Promise<boolean> {
    const asignacion = await prisma.asignacionPermiso.findFirst({
      where: {
        rol: {
          usuariosConRol: {
            some: { idUsuario },
          },
        },
        permiso: {
          nombre: codigoPermiso,
          estado: 'activo',
        },
      },
    });

    return asignacion !== null;
  }

  async asegurarRolEmpleado(idUsuario: number, nombreEmpleado: string): Promise<number> {
    const existente = await prisma.usuarioRol.findUnique({
      where: { idUsuario },
    });

    if (existente) {
      return existente.idRol;
    }

    const nuevoRol = await prisma.rol.create({
      data: {
        nombre: `Perfil Empleado ${idUsuario} - ${nombreEmpleado.slice(0, 30)}`,
        estado: 'activo',
      },
    });

    await prisma.usuarioRol.create({
      data: {
        idUsuario,
        idRol: nuevoRol.idRol,
      },
    });

    return nuevoRol.idRol;
  }

  async asignarPermisos(idUsuario: number, codigosPermiso: string[]): Promise<void> {
    const usuario = await prisma.usuario.findUnique({
      where: { idUsuario },
      select: { nombre: true },
    });

    const nombre = usuario?.nombre ?? `Empleado ${idUsuario}`;
    const idRol = await this.asegurarRolEmpleado(idUsuario, nombre);

    const permisosEncontrados = await prisma.permiso.findMany({
      where: {
        nombre: { in: codigosPermiso },
        estado: 'activo',
      },
      select: { idPermiso: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.asignacionPermiso.deleteMany({
        where: { idRol },
      });

      if (permisosEncontrados.length > 0) {
        await tx.asignacionPermiso.createMany({
          data: permisosEncontrados.map((p) => ({
            idRol,
            idPermiso: p.idPermiso,
          })),
          skipDuplicates: true,
        });
      }
    });
  }
}
