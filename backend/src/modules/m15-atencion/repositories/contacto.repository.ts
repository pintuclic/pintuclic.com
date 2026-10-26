import { prisma } from '../../../core/db/client';
import type {
  CalificacionAtencion,
  EstadoSolicitudContacto,
  MensajeSolicitudContacto,
  RolAutorMensaje,
  SolicitudContacto,
  SolicitudContactoDetalle,
  TipoSolicitudContacto,
} from '../dtos/m15-atencion.dto';
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
const INCLUIR_RESUMEN = {
  usuario: { select: { nombre: true, correo: true, telefono: true } },
  _count: { select: { mensajes: true } },
} as const;

const INCLUIR_DETALLE = {
  usuario: { select: { nombre: true, correo: true, telefono: true } },
  _count: { select: { mensajes: true } },
  mensajes: {
    orderBy: { fechaCreacion: 'asc' as const },
    include: {
      autor: { select: { nombre: true } },
    },
  },
} as const;

interface FilaResumen {
  idSolicitud: string;
  idUsuario: number;
  tipo: TipoSolicitudContacto;
  descripcion: string;
  estado: EstadoSolicitudContacto;
  calificacion: number | null;
  fechaCalificacion: Date | null;
  fechaCreacion: Date;
  usuario: { nombre: string; correo: string; telefono: string | null };
  _count: { mensajes: number };
}

interface FilaMensaje {
  idMensaje: string;
  idSolicitud: string;
  idAutor: number;
  rolAutor: RolAutorMensaje;
  contenido: string;
  fechaCreacion: Date;
  autor: { nombre: string };
}

interface FilaDetalle extends FilaResumen {
  mensajes: FilaMensaje[];
}

function aMensaje(fila: FilaMensaje): MensajeSolicitudContacto {
  return {
    idMensaje: fila.idMensaje,
    idSolicitud: fila.idSolicitud,
    idAutor: fila.idAutor,
    rolAutor: fila.rolAutor,
    nombreAutor: fila.autor.nombre,
    contenido: fila.contenido,
    fechaCreacion: fila.fechaCreacion.toISOString(),
  };
}

function aSolicitudContacto(fila: FilaResumen): SolicitudContacto {
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
    calificacion: fila.calificacion as CalificacionAtencion | null,
    fechaCalificacion: fila.fechaCalificacion === null ? null : fila.fechaCalificacion.toISOString(),
    totalMensajes: fila._count.mensajes,
    fechaCreacion: fila.fechaCreacion.toISOString(),
  };
}

function aSolicitudDetalle(fila: FilaDetalle): SolicitudContactoDetalle {
  return {
    ...aSolicitudContacto(fila),
    mensajes: fila.mensajes.map(aMensaje),
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
      include: INCLUIR_RESUMEN,
    });
    return aSolicitudContacto(fila);
  }

  async listar(filtro: FiltroSolicitudes): Promise<PaginaSolicitudes> {
    const where = {
      ...(filtro.idUsuario === undefined ? {} : { idUsuario: filtro.idUsuario }),
      ...(filtro.tipo === undefined ? {} : { tipo: filtro.tipo }),
      ...(filtro.estado === undefined ? {} : { estado: filtro.estado }),
    };

    const [filas, total] = await Promise.all([
      prisma.solicitudContacto.findMany({
        where,
        include: INCLUIR_RESUMEN,
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
      include: INCLUIR_RESUMEN,
    });
    return fila === null ? null : aSolicitudContacto(fila);
  }

  async obtenerDetalle(idSolicitud: string): Promise<SolicitudContactoDetalle | null> {
    const fila = await prisma.solicitudContacto.findUnique({
      where: { idSolicitud },
      include: INCLUIR_DETALLE,
    });
    return fila === null ? null : aSolicitudDetalle(fila);
  }

  async agregarMensaje(
    idSolicitud: string,
    idAutor: number,
    rolAutor: RolAutorMensaje,
    contenido: string,
  ): Promise<MensajeSolicitudContacto> {
    const fila = await prisma.mensajeSolicitudContacto.create({
      data: {
        idSolicitud,
        idAutor,
        rolAutor,
        contenido,
      },
      include: {
        autor: { select: { nombre: true } },
      },
    });
    return aMensaje(fila);
  }

  async cambiarEstado(
    idSolicitud: string,
    estado: EstadoSolicitudContacto,
  ): Promise<SolicitudContacto> {
    const fila = await prisma.solicitudContacto.update({
      where: { idSolicitud },
      data: { estado },
      include: INCLUIR_RESUMEN,
    });
    return aSolicitudContacto(fila);
  }

  async calificar(
    idSolicitud: string,
    calificacion: CalificacionAtencion,
    fechaCalificacion: Date,
  ): Promise<SolicitudContacto> {
    const fila = await prisma.solicitudContacto.update({
      where: { idSolicitud },
      data: { calificacion, fechaCalificacion },
      include: INCLUIR_RESUMEN,
    });
    return aSolicitudContacto(fila);
  }

  async contarDesde(idUsuario: number, desde: Date): Promise<number> {
    return prisma.solicitudContacto.count({
      where: { idUsuario, fechaCreacion: { gte: desde } },
    });
  }
}