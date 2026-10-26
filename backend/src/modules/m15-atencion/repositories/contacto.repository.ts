import { prisma } from '../../../core/db/client';
import type { SolicitudContacto, TipoSolicitudContacto } from '../dtos/m15-atencion.dto';
import type {
  ContactoRepositoryPort,
  FiltroSolicitudes,
  PaginaSolicitudes,
} from '../interfaces/atencion.interface';

/**
 * R5 / RF-ATC-02-04: la tabla no guarda los datos de contacto. Se leen de la
 * cuenta al mostrar la solicitud, de modo que el administrador vea el correo y
 * el teléfono vigentes y no una copia que envejece.
 */
const INCLUIR_REMITENTE = {
  usuario: { select: { nombre: true, correo: true, telefono: true } },
} as const;

interface FilaConRemitente {
  idSolicitud: string;
  idUsuario: number;
  tipo: TipoSolicitudContacto;
  descripcion: string;
  estado: 'en_revision' | 'atendida' | 'rechazada';
  fechaCreacion: Date;
  usuario: { nombre: string; correo: string; telefono: string | null };
}

function aSolicitudContacto(fila: FilaConRemitente): SolicitudContacto {
  return {
    idSolicitud: fila.idSolicitud,
    idUsuario: fila.idUsuario,
    remitente: {
      nombre: fila.usuario.nombre,
      correo: fila.usuario.correo,
      telefono: fila.usuario.telefono,
    },
    tipo: fila.tipo,
    descripcion: fila.descripcion,
    estado: fila.estado,
    fechaCreacion: fila.fechaCreacion.toISOString(),
  };
}

export class PrismaContactoRepository implements ContactoRepositoryPort {
  async crear(
    idUsuario: number,
    tipo: TipoSolicitudContacto,
    descripcion: string,
  ): Promise<SolicitudContacto> {
    const fila = await prisma.solicitudContacto.create({
      data: { idUsuario, tipo, descripcion },
      include: INCLUIR_REMITENTE,
    });
    return aSolicitudContacto(fila);
  }

  async listar(filtro: FiltroSolicitudes): Promise<PaginaSolicitudes> {
    const where = {
      ...(filtro.tipo === undefined ? {} : { tipo: filtro.tipo }),
      ...(filtro.estado === undefined ? {} : { estado: filtro.estado }),
    };

    const [filas, total] = await Promise.all([
      prisma.solicitudContacto.findMany({
        where,
        include: INCLUIR_REMITENTE,
        orderBy: [{ fechaCreacion: 'desc' }],
        skip: (filtro.pagina - 1) * filtro.limite,
        take: filtro.limite,
      }),
      prisma.solicitudContacto.count({ where }),
    ]);

    return { items: filas.map(aSolicitudContacto), total };
  }

  async obtener(idSolicitud: string): Promise<SolicitudContacto | null> {
    const fila = await prisma.solicitudContacto.findUnique({
      where: { idSolicitud },
      include: INCLUIR_REMITENTE,
    });
    return fila === null ? null : aSolicitudContacto(fila);
  }

  async marcarAtendida(idSolicitud: string): Promise<SolicitudContacto> {
    const fila = await prisma.solicitudContacto.update({
      where: { idSolicitud },
      data: { estado: 'atendida' },
      include: INCLUIR_REMITENTE,
    });
    return aSolicitudContacto(fila);
  }

  async contarDesde(idUsuario: number, desde: Date): Promise<number> {
    return prisma.solicitudContacto.count({
      where: { idUsuario, fechaCreacion: { gte: desde } },
    });
  }
}
