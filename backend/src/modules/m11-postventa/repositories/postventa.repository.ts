import { PrismaClient, Prisma } from '@prisma/client';
import type {
  TipoPostventa,
  EstadoPostventa,
  MetodoReembolso,
  MotivoRechazoPostventa,
  DatosBancariosInput,
} from '../dtos/m11-postventa.dto';

const NOMBRE_CONSECUTIVO_POSTVENTA = 'postventa';

export type SolicitudPostventaEntidad = Prisma.SolicitudPostventaGetPayload<{
  include: {
    orden: true;
    usuario: true;
    empleadoResuelve: true;
    lineas: {
      include: {
        lineaOrden: true;
      };
    };
    historial: {
      include: {
        autor: true;
      };
    };
  };
}>;

export type SolicitudPostventaConLineas = Prisma.SolicitudPostventaGetPayload<{
  include: {
    lineas: true;
  };
}>;

export type SolicitudPostventaResumenDb = Prisma.SolicitudPostventaGetPayload<{
  include: {
    orden: { select: { codigoVisible: true } };
    usuario: { select: { nombre: true } };
    lineas: { select: { cantidad: true } };
  };
}>;

export interface PostventaRepositoryPort {
  /** Todo lo que pasa dentro se confirma junto o no se confirma (cambio del pedido incluido). */
  enTransaccion<T>(trabajo: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;

  /** Bloquea la fila del pedido hasta el fin de la transacción: dos solicitudes del mismo pedido van en fila. */
  bloquearOrden(idOrden: number, tx: Prisma.TransactionClient): Promise<void>;

  /** RN-POS-05: unidades por línea de orden que ya devolvieron solicitudes aprobadas o reembolsadas. */
  cantidadesDevueltas(idOrden: number, tx?: Prisma.TransactionClient): Promise<Map<number, number>>;

  generarSiguienteCodigo(tx?: Prisma.TransactionClient): Promise<string>;

  buscarPorCodigo(
    codigo: string,
    tx?: Prisma.TransactionClient
  ): Promise<SolicitudPostventaEntidad | null>;

  buscarPorOrden(
    idOrden: number,
    tx?: Prisma.TransactionClient
  ): Promise<SolicitudPostventaConLineas | null>;

  crearSolicitud(
    datos: {
      codigoVisible: string;
      idOrden: number;
      idUsuario: number;
      tipo: TipoPostventa;
      estado: EstadoPostventa;
      motivoGeneral: string;
      totalReembolso: number;
      datosBancarios?: DatosBancariosInput | undefined;
      evidenciaUrls?: string[] | undefined;
      /** M11 R-POS-A: el empleado que la abrió en nombre de la tienda; sin valor = la pidió el cliente. */
      idEmpleadoInicia?: number | undefined;
      lineas: Array<{
        idLineaOrden: number;
        cantidad: number;
        precioUnitario: number;
        subtotal: number;
        motivoEspecifico?: string | undefined;
      }>;
    },
    tx?: Prisma.TransactionClient
  ): Promise<SolicitudPostventaEntidad>;

  listarPorUsuario(
    idUsuario: number,
    opciones: { pagina: number; limite: number; estado?: EstadoPostventa | undefined }
  ): Promise<{ items: SolicitudPostventaResumenDb[]; total: number }>;

  listarGestion(
    filtros: {
      pagina: number;
      limite: number;
      codigo?: string | undefined;
      codigoOrden?: string | undefined;
      estado?: EstadoPostventa | undefined;
      tipo?: TipoPostventa | undefined;
      desde?: string | undefined;
      hasta?: string | undefined;
    }
  ): Promise<{ items: SolicitudPostventaResumenDb[]; total: number }>;

  contarPorEstado(): Promise<Array<{ estado: EstadoPostventa; cantidad: number }>>;

  /** Null si la solicitud ya no estaba en `estadoEsperado` (otra persona la resolvió antes). */
  actualizarResolucion(
    codigo: string,
    datos: {
      estadoEsperado: EstadoPostventa;
      estado: EstadoPostventa;
      idEmpleadoResuelve: number;
      observacionesResolucion?: string | undefined;
      motivoRechazo?: MotivoRechazoPostventa | undefined;
    },
    tx?: Prisma.TransactionClient
  ): Promise<SolicitudPostventaEntidad | null>;

  /** Null si la solicitud ya no estaba aprobada. */
  registrarReembolso(
    codigo: string,
    datos: {
      metodoReembolso: MetodoReembolso;
      montoReembolsado: number;
      referenciaReembolso: string;
      comprobanteUrl?: string | undefined;
      notas?: string | undefined;
      idEmpleado: number;
    },
    tx?: Prisma.TransactionClient
  ): Promise<SolicitudPostventaEntidad | null>;
}

export class PrismaPostventaRepository implements PostventaRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async enTransaccion<T>(trabajo: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => trabajo(tx));
  }

  async bloquearOrden(idOrden: number, tx: Prisma.TransactionClient): Promise<void> {
    await tx.$queryRaw`SELECT id_orden FROM orden WHERE id_orden = ${idOrden} FOR UPDATE`;
  }

  async cantidadesDevueltas(idOrden: number, tx?: Prisma.TransactionClient): Promise<Map<number, number>> {
    const client = tx ?? this.prisma;
    const filas = await client.lineaSolicitudPostventa.groupBy({
      by: ['idLineaOrden'],
      where: {
        solicitud: { idOrden, tipo: { in: ['devolucion', 'garantia'] }, estado: { in: ['aprobada', 'reembolsada'] } },
      },
      _sum: { cantidad: true },
    });
    return new Map(filas.map((f) => [f.idLineaOrden, f._sum.cantidad ?? 0]));
  }

  async generarSiguienteCodigo(tx?: Prisma.TransactionClient): Promise<string> {
    const client = tx ?? this.prisma;
    const anio = new Date().getFullYear();

    await client.$executeRaw`
      INSERT INTO consecutivo (nombre, ultimo_valor)
      SELECT ${NOMBRE_CONSECUTIVO_POSTVENTA}, COALESCE(MAX(CAST(split_part(codigo_visible, '-', 3) AS BIGINT)), 0)
      FROM solicitud_postventa
      WHERE codigo_visible ~ '^DEV-[0-9]{4}-[0-9]+$'
      ON CONFLICT (nombre) DO NOTHING
    `;

    const resultado = await client.$queryRaw<Array<{ ultimo_valor: bigint }>>`
      UPDATE consecutivo
      SET ultimo_valor = ultimo_valor + 1
      WHERE nombre = ${NOMBRE_CONSECUTIVO_POSTVENTA}
      RETURNING ultimo_valor
    `;

    const primer = resultado[0];
    if (!primer) {
      throw new Error('Error al generar correlativo de postventa');
    }
    const consecutivoNum = Number(primer.ultimo_valor);
    const correlativo = String(consecutivoNum).padStart(5, '0');
    return `DEV-${anio}-${correlativo}`;
  }

  async buscarPorCodigo(
    codigo: string,
    tx?: Prisma.TransactionClient
  ): Promise<SolicitudPostventaEntidad | null> {
    const client = tx ?? this.prisma;
    return client.solicitudPostventa.findUnique({
      where: { codigoVisible: codigo },
      include: {
        orden: true,
        usuario: true,
        empleadoResuelve: true,
        lineas: {
          include: {
            lineaOrden: true,
          },
        },
        historial: {
          orderBy: { fecha: 'asc' },
          include: {
            autor: true,
          },
        },
      },
    });
  }

  async buscarPorOrden(
    idOrden: number,
    tx?: Prisma.TransactionClient
  ): Promise<SolicitudPostventaConLineas | null> {
    const client = tx ?? this.prisma;
    return client.solicitudPostventa.findFirst({
      where: {
        idOrden,
        estado: { in: ['solicitada', 'en_revision', 'aprobada'] },
      },
      include: {
        lineas: true,
      },
    });
  }

  async crearSolicitud(
    datos: {
      codigoVisible: string;
      idOrden: number;
      idUsuario: number;
      tipo: TipoPostventa;
      estado: EstadoPostventa;
      motivoGeneral: string;
      totalReembolso: number;
      datosBancarios?: DatosBancariosInput | undefined;
      evidenciaUrls?: string[] | undefined;
      /** M11 R-POS-A: el empleado que la abrió en nombre de la tienda; sin valor = la pidió el cliente. */
      idEmpleadoInicia?: number | undefined;
      lineas: Array<{
        idLineaOrden: number;
        cantidad: number;
        precioUnitario: number;
        subtotal: number;
        motivoEspecifico?: string | undefined;
      }>;
    },
    tx?: Prisma.TransactionClient
  ): Promise<SolicitudPostventaEntidad> {
    const client = tx ?? this.prisma;

    await client.solicitudPostventa.create({
      data: {
        codigoVisible: datos.codigoVisible,
        idOrden: datos.idOrden,
        idUsuario: datos.idUsuario,
        tipo: datos.tipo,
        estado: datos.estado,
        motivoGeneral: datos.motivoGeneral,
        totalReembolso: datos.totalReembolso,
        idEmpleadoInicia: datos.idEmpleadoInicia ?? null,
        datosBancarios: datos.datosBancarios ? (datos.datosBancarios as Prisma.InputJsonValue) : Prisma.JsonNull,
        evidenciaUrls: datos.evidenciaUrls ? (datos.evidenciaUrls as Prisma.InputJsonValue) : Prisma.JsonNull,
        lineas: {
          create: datos.lineas.map((l) => ({
            lineaOrden: { connect: { idLineaOrden: l.idLineaOrden } },
            cantidad: l.cantidad,
            precioUnitario: l.precioUnitario,
            subtotal: l.subtotal,
            motivoEspecifico: l.motivoEspecifico ?? null,
          })),
        },
        historial: {
          create: {
            estadoAnterior: null,
            estadoNuevo: datos.estado,
            idUsuarioAutor: datos.idEmpleadoInicia ?? datos.idUsuario,
            motivo: datos.idEmpleadoInicia ? 'Solicitud radicada por la tienda' : 'Solicitud radicada por el cliente',
          },
        },
      },
    });

    const creada = await this.buscarPorCodigo(datos.codigoVisible, client);
    if (!creada) {
      throw new Error('No se pudo recuperar la solicitud recién creada');
    }
    return creada;
  }

  async listarPorUsuario(
    idUsuario: number,
    opciones: { pagina: number; limite: number; estado?: EstadoPostventa | undefined }
  ): Promise<{ items: SolicitudPostventaResumenDb[]; total: number }> {
    const where: Prisma.SolicitudPostventaWhereInput = {
      idUsuario,
      ...(opciones.estado ? { estado: opciones.estado } : {}),
    };

    const skip = (opciones.pagina - 1) * opciones.limite;

    const [items, total] = await Promise.all([
      this.prisma.solicitudPostventa.findMany({
        where,
        skip,
        take: opciones.limite,
        orderBy: { fechaSolicitud: 'desc' },
        include: {
          orden: { select: { codigoVisible: true } },
          usuario: { select: { nombre: true } },
          lineas: { select: { cantidad: true } },
        },
      }),
      this.prisma.solicitudPostventa.count({ where }),
    ]);

    return { items, total };
  }

  async listarGestion(filtros: {
    pagina: number;
    limite: number;
    codigo?: string | undefined;
    codigoOrden?: string | undefined;
    estado?: EstadoPostventa | undefined;
    tipo?: TipoPostventa | undefined;
    desde?: string | undefined;
    hasta?: string | undefined;
  }): Promise<{ items: SolicitudPostventaResumenDb[]; total: number }> {
    const where: Prisma.SolicitudPostventaWhereInput = {
      ...(filtros.codigo ? { codigoVisible: { contains: filtros.codigo, mode: 'insensitive' } } : {}),
      ...(filtros.codigoOrden
        ? { orden: { codigoVisible: { contains: filtros.codigoOrden, mode: 'insensitive' } } }
        : {}),
      ...(filtros.estado ? { estado: filtros.estado } : {}),
      ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
      ...(filtros.desde || filtros.hasta
        ? {
            fechaSolicitud: {
              ...(filtros.desde ? { gte: new Date(`${filtros.desde}T00:00:00Z`) } : {}),
              ...(filtros.hasta ? { lte: new Date(`${filtros.hasta}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
    };

    const skip = (filtros.pagina - 1) * filtros.limite;

    const [items, total] = await Promise.all([
      this.prisma.solicitudPostventa.findMany({
        where,
        skip,
        take: filtros.limite,
        orderBy: { fechaSolicitud: 'desc' },
        include: {
          orden: { select: { codigoVisible: true } },
          usuario: { select: { nombre: true } },
          lineas: { select: { cantidad: true } },
        },
      }),
      this.prisma.solicitudPostventa.count({ where }),
    ]);

    return { items, total };
  }

  async contarPorEstado(): Promise<Array<{ estado: EstadoPostventa; cantidad: number }>> {
    const agrupado = await this.prisma.solicitudPostventa.groupBy({
      by: ['estado'],
      _count: { _all: true },
    });

    return agrupado.map((g) => ({
      estado: g.estado as EstadoPostventa,
      cantidad: g._count._all,
    }));
  }

  async actualizarResolucion(
    codigo: string,
    datos: {
      estadoEsperado: EstadoPostventa;
      estado: EstadoPostventa;
      idEmpleadoResuelve: number;
      observacionesResolucion?: string | undefined;
      motivoRechazo?: MotivoRechazoPostventa | undefined;
    },
    tx?: Prisma.TransactionClient
  ): Promise<SolicitudPostventaEntidad | null> {
    const client = tx ?? this.prisma;

    // El filtro por estado hace de candado optimista, como en M08.
    const { count } = await client.solicitudPostventa.updateMany({
      where: { codigoVisible: codigo, estado: datos.estadoEsperado },
      data: {
        estado: datos.estado,
        idEmpleadoResuelve: datos.idEmpleadoResuelve,
        observacionesResolucion: datos.observacionesResolucion ?? null,
        motivoRechazo: datos.motivoRechazo ?? null,
        fechaResolucion: new Date(),
      },
    });
    if (count !== 1) return null;

    await client.historialEstadoPostventa.create({
      data: {
        solicitud: { connect: { codigoVisible: codigo } },
        estadoAnterior: datos.estadoEsperado,
        estadoNuevo: datos.estado,
        autor: { connect: { idUsuario: datos.idEmpleadoResuelve } },
        motivo: datos.observacionesResolucion ?? `Solicitud ${datos.estado}`,
      },
    });

    const actualizada = await this.buscarPorCodigo(codigo, client);
    if (!actualizada) {
      throw new Error('No se pudo recuperar la solicitud actualizada');
    }
    return actualizada;
  }

  async registrarReembolso(
    codigo: string,
    datos: {
      metodoReembolso: MetodoReembolso;
      montoReembolsado: number;
      referenciaReembolso: string;
      comprobanteUrl?: string | undefined;
      notas?: string | undefined;
      idEmpleado: number;
    },
    tx?: Prisma.TransactionClient
  ): Promise<SolicitudPostventaEntidad | null> {
    const client = tx ?? this.prisma;

    const { count } = await client.solicitudPostventa.updateMany({
      where: { codigoVisible: codigo, estado: 'aprobada' },
      data: {
        estado: 'reembolsada',
        metodoReembolso: datos.metodoReembolso,
        referenciaReembolso: datos.referenciaReembolso,
        comprobanteUrl: datos.comprobanteUrl ?? null,
        fechaReembolso: new Date(),
      },
    });
    if (count !== 1) return null;

    // El monto no tiene columna propia: queda en el historial, que es inmutable.
    await client.historialEstadoPostventa.create({
      data: {
        solicitud: { connect: { codigoVisible: codigo } },
        estadoAnterior: 'aprobada',
        estadoNuevo: 'reembolsada',
        autor: { connect: { idUsuario: datos.idEmpleado } },
        motivo: `Reembolso registrado por ${datos.montoReembolsado} (${datos.metodoReembolso} ref: ${datos.referenciaReembolso})${
          datos.notas ? ` - ${datos.notas}` : ''
        }`,
      },
    });

    const reembolsada = await this.buscarPorCodigo(codigo, client);
    if (!reembolsada) {
      throw new Error('No se pudo recuperar la solicitud reembolsada');
    }
    return reembolsada;
  }
}
