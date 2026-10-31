import type { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import { DONDE_EMPLEADO, ROL_EMPLEADO } from '../../../core/utils/roles';
import type {
  EmpleadosRepositoryPort,
  EntidadEmpleado,
  FiltrosListadoEmpleados,
} from '../interfaces/empleados.interface';

/** Datos que hacen falta para armar un `EntidadEmpleado`: último acceso y permisos activos en una sola consulta. */
const INCLUIR_RESUMEN = {
  sesiones: {
    take: 1,
    orderBy: { fechaUltimoAcceso: 'desc' },
    select: { fechaUltimoAcceso: true },
  },
  _count: { select: { permisosIndividuales: { where: { permiso: { estado: 'activo' } } } } },
} satisfies Prisma.UsuarioInclude;

type FilaEmpleado = Prisma.UsuarioGetPayload<{ include: typeof INCLUIR_RESUMEN }>;

function aEntidad(f: FilaEmpleado): EntidadEmpleado {
  return {
    idUsuario: f.idUsuario,
    nombre: f.nombre,
    correo: f.correo,
    telefono: f.telefono,
    estado: f.estado as EntidadEmpleado['estado'],
    idRol: f.idRol,
    fechaCreacion: f.fechaCreacion,
    fechaUltimoAcceso: f.sesiones[0]?.fechaUltimoAcceso ?? null,
    cantidadPermisos: f._count.permisosIndividuales,
    primerAccesoPendiente: f.cambioContrasenaPendiente,
  };
}

export class EmpleadosRepository implements EmpleadosRepositoryPort {
  async listar(filtros: FiltrosListadoEmpleados): Promise<{ empleados: EntidadEmpleado[]; total: number }> {
    const where: Prisma.UsuarioWhereInput = { ...DONDE_EMPLEADO };

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
        include: INCLUIR_RESUMEN,
      }),
      prisma.usuario.count({ where }),
    ]);

    return { empleados: filas.map(aEntidad), total };
  }

  async obtenerPorId(idUsuario: number): Promise<EntidadEmpleado | null> {
    const fila = await prisma.usuario.findFirst({
      where: { idUsuario, ...DONDE_EMPLEADO },
      include: INCLUIR_RESUMEN,
    });
    return fila ? aEntidad(fila) : null;
  }

  async obtenerPorCorreo(correo: string): Promise<EntidadEmpleado | null> {
    const fila = await prisma.usuario.findUnique({
      where: { correo },
      include: INCLUIR_RESUMEN,
    });
    return fila ? aEntidad(fila) : null;
  }

  async crear(datos: {
    nombre: string;
    correo: string;
    telefono: string;
    contrasenaHash: string;
  }): Promise<EntidadEmpleado> {
    const creado = await prisma.usuario.create({
      data: {
        nombre: datos.nombre,
        correo: datos.correo,
        telefono: datos.telefono,
        contrasena: datos.contrasenaHash,
        estado: 'activo',
        tipo: 'normal',
        // R-ACC-1: el rol de la cuenta es el único vínculo. El rol `empleado` no lleva permisos (R-ACC-3).
        rolDirecto: { connect: { nombre: ROL_EMPLEADO } },
        // CA-ADM-01-03: queda pendiente hasta que el empleado defina su contraseña con el enlace.
        cambioContrasenaPendiente: true,
      },
      include: INCLUIR_RESUMEN,
    });
    return aEntidad(creado);
  }

  async actualizarContacto(
    idUsuario: number,
    datos: { nombre?: string | undefined; telefono?: string | undefined },
  ): Promise<EntidadEmpleado> {
    const datosActualizar: { nombre?: string; telefono?: string } = {};
    if (datos.nombre !== undefined) datosActualizar.nombre = datos.nombre;
    if (datos.telefono !== undefined) datosActualizar.telefono = datos.telefono;

    // `updateMany` lleva el filtro de rol en la misma sentencia: no se puede editar a quien no es empleado.
    await prisma.usuario.updateMany({ where: { idUsuario, ...DONDE_EMPLEADO }, data: datosActualizar });
    const actualizado = await this.obtenerPorId(idUsuario);
    if (!actualizado) throw new Error('El colaborador solicitado no existe.');
    return actualizado;
  }

  async actualizarEstado(idUsuario: number, nuevoEstado: EntidadEmpleado['estado']): Promise<void> {
    await prisma.usuario.updateMany({ where: { idUsuario, ...DONDE_EMPLEADO }, data: { estado: nuevoEstado } });
  }
}
