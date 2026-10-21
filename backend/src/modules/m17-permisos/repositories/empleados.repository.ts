import { prisma } from '../../../core/db/client';
import type {
  EmpleadosRepositoryPort,
  EntidadEmpleado,
  FiltrosListadoEmpleados,
} from '../interfaces/empleados.interface';

export class EmpleadosRepository implements EmpleadosRepositoryPort {
  async listar(filtros: FiltrosListadoEmpleados): Promise<{ empleados: EntidadEmpleado[]; total: number }> {
    const where: Record<string, unknown> = {
      usuarioRol: { isNot: null },
    };

    if (filtros.estado) {
      where.estado = filtros.estado;
    }

    if (filtros.busqueda) {
      where.OR = [
        { nombre: { contains: filtros.busqueda, mode: 'insensitive' } },
        { correo: { contains: filtros.busqueda, mode: 'insensitive' } },
      ];
    }

    const [filas, total] = await Promise.all([
      prisma.usuario.findMany({
        where,
        skip: (filtros.pagina - 1) * filtros.limite,
        take: filtros.limite,
        orderBy: { idUsuario: 'desc' },
        include: {
          sesiones: {
            take: 1,
            orderBy: { fechaUltimoAcceso: 'desc' },
            select: { fechaUltimoAcceso: true },
          },
        },
      }),
      prisma.usuario.count({ where }),
    ]);

    const empleados: EntidadEmpleado[] = filas.map((f) => ({
      idUsuario: f.idUsuario,
      nombre: f.nombre,
      correo: f.correo,
      telefono: f.telefono,
      estado: f.estado as EntidadEmpleado['estado'],
      idRol: f.idRol,
      fechaCreacion: new Date(),
      fechaUltimoAcceso: f.sesiones[0]?.fechaUltimoAcceso ?? null,
    }));

    return { empleados, total };
  }

  async obtenerPorId(idUsuario: number): Promise<EntidadEmpleado | null> {
    const fila = await prisma.usuario.findUnique({
      where: { idUsuario },
      include: {
        sesiones: {
          take: 1,
          orderBy: { fechaUltimoAcceso: 'desc' },
          select: { fechaUltimoAcceso: true },
        },
      },
    });

    if (!fila) return null;

    return {
      idUsuario: fila.idUsuario,
      nombre: fila.nombre,
      correo: fila.correo,
      telefono: fila.telefono,
      estado: fila.estado as EntidadEmpleado['estado'],
      idRol: fila.idRol,
      fechaCreacion: new Date(),
      fechaUltimoAcceso: fila.sesiones[0]?.fechaUltimoAcceso ?? null,
    };
  }

  async obtenerPorCorreo(correo: string): Promise<EntidadEmpleado | null> {
    const fila = await prisma.usuario.findUnique({
      where: { correo },
    });

    if (!fila) return null;

    return {
      idUsuario: fila.idUsuario,
      nombre: fila.nombre,
      correo: fila.correo,
      telefono: fila.telefono,
      estado: fila.estado as EntidadEmpleado['estado'],
      idRol: fila.idRol,
      fechaCreacion: new Date(),
      fechaUltimoAcceso: null,
    };
  }

  async crear(datos: {
    nombre: string;
    correo: string;
    telefono: string;
    contrasenaHash: string;
  }): Promise<EntidadEmpleado> {
    return prisma.$transaction(async (tx) => {
      const nuevoUsuario = await tx.usuario.create({
        data: {
          nombre: datos.nombre,
          correo: datos.correo,
          telefono: datos.telefono,
          contrasena: datos.contrasenaHash,
          estado: 'activo',
          tipo: 'normal',
        },
      });

      const nuevoRol = await tx.rol.create({
        data: {
          nombre: `Perfil Empleado ${nuevoUsuario.idUsuario} - ${datos.nombre.slice(0, 30)}`,
          estado: 'activo',
        },
      });

      await tx.usuarioRol.create({
        data: {
          idUsuario: nuevoUsuario.idUsuario,
          idRol: nuevoRol.idRol,
        },
      });

      return {
        idUsuario: nuevoUsuario.idUsuario,
        nombre: nuevoUsuario.nombre,
        correo: nuevoUsuario.correo,
        telefono: nuevoUsuario.telefono,
        estado: nuevoUsuario.estado as EntidadEmpleado['estado'],
        idRol: nuevoRol.idRol,
        fechaCreacion: new Date(),
        fechaUltimoAcceso: null,
      };
    });
  }

  async actualizarContacto(
    idUsuario: number,
    datos: { nombre?: string | undefined; telefono?: string | undefined },
  ): Promise<EntidadEmpleado> {
    const datosActualizar: { nombre?: string; telefono?: string } = {};
    if (datos.nombre !== undefined) datosActualizar.nombre = datos.nombre;
    if (datos.telefono !== undefined) datosActualizar.telefono = datos.telefono;

    const actualizado = await prisma.usuario.update({
      where: { idUsuario },
      data: datosActualizar,
      include: {
        sesiones: {
          take: 1,
          orderBy: { fechaUltimoAcceso: 'desc' },
          select: { fechaUltimoAcceso: true },
        },
      },
    });

    return {
      idUsuario: actualizado.idUsuario,
      nombre: actualizado.nombre,
      correo: actualizado.correo,
      telefono: actualizado.telefono,
      estado: actualizado.estado as EntidadEmpleado['estado'],
      idRol: actualizado.idRol,
      fechaCreacion: new Date(),
      fechaUltimoAcceso: actualizado.sesiones[0]?.fechaUltimoAcceso ?? null,
    };
  }

  async actualizarEstado(idUsuario: number, nuevoEstado: EntidadEmpleado['estado']): Promise<void> {
    await prisma.usuario.update({
      where: { idUsuario },
      data: { estado: nuevoEstado },
    });
  }

  async contarPermisos(idUsuario: number): Promise<number> {
    const usuarioRol = await prisma.usuarioRol.findUnique({
      where: { idUsuario },
      select: { idRol: true },
    });

    if (!usuarioRol) return 0;

    return prisma.asignacionPermiso.count({
      where: {
        idRol: usuarioRol.idRol,
        permiso: { estado: 'activo' },
      },
    });
  }
}
