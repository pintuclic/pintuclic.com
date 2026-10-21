import { prisma } from '../../../core/db/client';
import type {
  ClientesAdminRepositoryPort,
  EntidadClienteAdmin,
  FiltrosBusquedaClientes,
  ResumenCotizacionDominio,
  ResumenOrdenDominio,
} from '../interfaces/clientes-admin.interface';

export class ClientesAdminRepository implements ClientesAdminRepositoryPort {
  async buscar(
    filtros: FiltrosBusquedaClientes,
  ): Promise<{ clientes: EntidadClienteAdmin[]; total: number }> {
    const where: Record<string, unknown> = {
      usuarioRol: null,
    };

    if (filtros.tipo && filtros.tipo !== 'todos') {
      where.tipo = filtros.tipo;
    }

    if (filtros.termino) {
      where.OR = [
        { nombre: { contains: filtros.termino, mode: 'insensitive' } },
        { correo: { contains: filtros.termino, mode: 'insensitive' } },
        { telefono: { contains: filtros.termino, mode: 'insensitive' } },
      ];
    }

    const [filas, total] = await Promise.all([
      prisma.usuario.findMany({
        where,
        skip: (filtros.pagina - 1) * filtros.limite,
        take: filtros.limite,
        orderBy: { idUsuario: 'desc' },
      }),
      prisma.usuario.count({ where }),
    ]);

    const clientes: EntidadClienteAdmin[] = filas.map((f) => ({
      idUsuario: f.idUsuario,
      nombre: f.nombre,
      correo: f.correo,
      telefono: f.telefono,
      tipo: f.tipo as EntidadClienteAdmin['tipo'],
      estado: f.estado as EntidadClienteAdmin['estado'],
      fechaCreacion: new Date(),
    }));

    return { clientes, total };
  }

  async obtenerPorId(idUsuario: number): Promise<EntidadClienteAdmin | null> {
    const fila = await prisma.usuario.findUnique({
      where: { idUsuario },
    });

    if (!fila) return null;

    return {
      idUsuario: fila.idUsuario,
      nombre: fila.nombre,
      correo: fila.correo,
      telefono: fila.telefono,
      tipo: fila.tipo as EntidadClienteAdmin['tipo'],
      estado: fila.estado as EntidadClienteAdmin['estado'],
      fechaCreacion: new Date(),
    };
  }

  async desactivar(idUsuario: number, _motivo: string): Promise<void> {
    await prisma.usuario.update({
      where: { idUsuario },
      data: { estado: 'inactivo' },
    });
  }

  async obtenerOrdenesRecientes(_idUsuario: number, _limite = 5): Promise<ResumenOrdenDominio[]> {
    return [];
  }

  async obtenerCotizacionesRecientes(_idUsuario: number, _limite = 5): Promise<ResumenCotizacionDominio[]> {
    return [];
  }
}
