import { Prisma, type EstadoIntentoPago, type EstadoSolicitudCompra } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import { CONSECUTIVO_SOLICITUD, type EstadoWompi, type ListarSolicitudesAdminRequest } from '../dtos/m07-checkout.dto';
import type {
  CambiosIntento,
  CambiosSolicitud,
  CheckoutRepositoryPort,
  DescuentoCongelado,
  IntentoGuardado,
  IntentoNuevo,
  Pagina,
  SolicitudGuardada,
  SolicitudNueva,
} from '../interfaces/checkout.interface';
import { formatearCodigo } from '../services/reglas-checkout';

const LIMITES_TRANSACCION = { maxWait: 5_000, timeout: 15_000 } as const;

const DE_WOMPI: Record<EstadoWompi, EstadoIntentoPago> = {
  PENDING: 'pendiente',
  APPROVED: 'aprobado',
  DECLINED: 'rechazado',
  ERROR: 'error',
  VOIDED: 'anulado',
};
const A_WOMPI: Record<EstadoIntentoPago, EstadoWompi> = {
  pendiente: 'PENDING',
  aprobado: 'APPROVED',
  rechazado: 'DECLINED',
  error: 'ERROR',
  anulado: 'VOIDED',
};

const INCLUIR = {
  lineas: { orderBy: { posicion: 'asc' } },
  intentos: { orderBy: { numero: 'asc' } },
  usuario: { select: { nombre: true, correo: true } },
} satisfies Prisma.SolicitudCompraInclude;

type Fila = Prisma.SolicitudCompraGetPayload<{ include: typeof INCLUIR }>;

const n = (d: Prisma.Decimal): number => d.toNumber();

function descuentosDe(json: Prisma.JsonValue): DescuentoCongelado[] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((d) => {
    if (typeof d !== 'object' || d === null || Array.isArray(d)) return [];
    const { ordenAplicacion, origen, porcentaje, importe } = d;
    if (typeof ordenAplicacion !== 'number' || typeof origen !== 'string' || typeof importe !== 'number') return [];
    return [{ ordenAplicacion, origen, porcentaje: typeof porcentaje === 'number' ? porcentaje : null, importe }];
  });
}

function aIntento(i: Fila['intentos'][number]): IntentoGuardado {
  return {
    idIntento: i.idIntentoPago,
    numero: i.numero,
    referencia: i.referencia,
    idTransaccion: i.idTransaccion,
    estado: A_WOMPI[i.estado],
    montoCentavos: Number(i.montoCentavos),
    celularEnmascarado: i.celularEnmascarado,
    mensaje: i.mensaje,
    ultimaConsulta: i.ultimaConsulta,
    fechaCreacion: i.fechaCreacion,
  };
}

function aSolicitud(f: Fila): SolicitudGuardada {
  return {
    idSolicitud: f.idSolicitud,
    codigo: f.codigo,
    idUsuario: f.idUsuario,
    estado: f.estado,
    origen: f.origen,
    idCotizacion: f.idCotizacion,
    modoEntrega: f.modoEntrega,
    direccion: f.direccion,
    costoEntrega: n(f.costoEntrega),
    subTotal: n(f.subTotal),
    descuento: n(f.descuento),
    descuentoEventos: n(f.descuentoEventos),
    descuentoEmpresa: n(f.descuentoEmpresa),
    totalMercancia: n(f.totalMercancia),
    total: n(f.total),
    baseSinImpuesto: n(f.baseSinImpuesto),
    importeIva: n(f.importeIva),
    tasaIva: n(f.tasaIva),
    idCupon: f.idCupon,
    importeCupon: n(f.importeCupon),
    cuponRegistrado: f.cuponRegistrado,
    observaciones: f.observaciones,
    transaccionPagoId: f.transaccionPagoId,
    montoPagado: f.montoPagado === null ? null : n(f.montoPagado),
    codigoOrden: f.codigoOrden,
    reintentosOrden: f.reintentosOrden,
    proximoIntentoOrden: f.proximoIntentoOrden,
    ultimoError: f.ultimoError,
    venceEn: f.venceEn,
    fechaCreacion: f.fechaCreacion,
    lineas: f.lineas.map((l) => ({
      posicion: l.posicion,
      idVariante: l.idVariante,
      idColor: l.idColor,
      idCotizacion: l.idCotizacion,
      nombreProducto: l.nombreProducto,
      marca: l.marca,
      medida: l.medida,
      sku: l.sku,
      colorNombre: l.colorNombre,
      colorHexadecimal: l.colorHexadecimal,
      cantidad: l.cantidad,
      precioInicial: n(l.precioInicial),
      precioAplicado: n(l.precioAplicado),
      subtotal: n(l.subtotal),
      descuentos: descuentosDe(l.descuentos),
    })),
    intentos: f.intentos.map(aIntento),
    cliente: { nombre: f.usuario.nombre, correo: f.usuario.correo },
  };
}

const ABIERTAS: EstadoSolicitudCompra[] = ['en_pago', 'rechazada'];

/** Persistencia de M07 sobre `solicitud_compra`, `linea_solicitud`, `intento_pago` y `consecutivo`. */
export class CheckoutRepository implements CheckoutRepositoryPort {
  async crear(nueva: SolicitudNueva, anio: number): Promise<SolicitudGuardada> {
    const id = await prisma.$transaction(async (tx) => {
      // Como M08 con `orden`: la fila se crea la primera vez, después del mayor SOL ya usado (las órdenes del seed
      // traen `codigo_solicitud`), y el UPDATE la bloquea, así dos compras no toman el mismo número.
      await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`;
      await tx.$executeRaw`
        INSERT INTO consecutivo (nombre, ultimo_valor)
        SELECT ${CONSECUTIVO_SOLICITUD}, GREATEST(
          (SELECT COALESCE(MAX(CAST(split_part(codigo_solicitud, '-', 3) AS BIGINT)), 0) FROM orden
            WHERE codigo_solicitud ~ '^SOL-[0-9]{4}-[0-9]+$'),
          (SELECT COALESCE(MAX(CAST(split_part(codigo, '-', 3) AS BIGINT)), 0) FROM solicitud_compra))
        ON CONFLICT (nombre) DO NOTHING`;
      const fila = await tx.consecutivo.update({
        where: { nombre: CONSECUTIVO_SOLICITUD },
        data: { ultimoValor: { increment: 1 } },
        select: { ultimoValor: true },
      });
      const creada = await tx.solicitudCompra.create({
        data: {
          codigo: formatearCodigo(anio, Number(fila.ultimoValor)),
          idUsuario: nueva.idUsuario,
          origen: nueva.origen,
          idCotizacion: nueva.idCotizacion,
          modoEntrega: nueva.modoEntrega,
          direccion: nueva.direccion,
          costoEntrega: nueva.costoEntrega,
          subTotal: nueva.subTotal,
          descuento: nueva.descuento,
          descuentoEventos: nueva.descuentoEventos,
          descuentoEmpresa: nueva.descuentoEmpresa,
          totalMercancia: nueva.totalMercancia,
          total: nueva.total,
          baseSinImpuesto: nueva.baseSinImpuesto,
          importeIva: nueva.importeIva,
          tasaIva: nueva.tasaIva,
          idCupon: nueva.idCupon,
          importeCupon: nueva.importeCupon,
          venceEn: nueva.venceEn,
          lineas: {
            create: nueva.lineas.map((l) => ({
              posicion: l.posicion,
              idVariante: l.idVariante,
              idColor: l.idColor,
              idCotizacion: l.idCotizacion,
              nombreProducto: l.nombreProducto,
              marca: l.marca,
              medida: l.medida,
              sku: l.sku,
              colorNombre: l.colorNombre,
              colorHexadecimal: l.colorHexadecimal,
              cantidad: l.cantidad,
              precioInicial: l.precioInicial,
              precioAplicado: l.precioAplicado,
              subtotal: l.subtotal,
              descuentos: l.descuentos.map((d) => ({ ...d })),
            })),
          },
        },
        select: { idSolicitud: true },
      });
      return creada.idSolicitud;
    }, LIMITES_TRANSACCION);
    return aSolicitud(await prisma.solicitudCompra.findUniqueOrThrow({ where: { idSolicitud: id }, include: INCLUIR }));
  }

  async buscarPorCodigo(codigo: string): Promise<SolicitudGuardada | null> {
    const f = await prisma.solicitudCompra.findUnique({ where: { codigo }, include: INCLUIR });
    return f === null ? null : aSolicitud(f);
  }

  async abiertaDelUsuario(idUsuario: number): Promise<SolicitudGuardada | null> {
    const f = await prisma.solicitudCompra.findFirst({
      where: { idUsuario, estado: { in: ABIERTAS } },
      orderBy: { fechaCreacion: 'desc' },
      include: INCLUIR,
    });
    return f === null ? null : aSolicitud(f);
  }

  async codigoPorReferencia(referencia: string): Promise<string | null> {
    const f = await prisma.intentoPago.findUnique({
      where: { referencia },
      select: { solicitud: { select: { codigo: true } } },
    });
    return f?.solicitud.codigo ?? null;
  }

  async agregarIntento(idSolicitud: number, intento: IntentoNuevo): Promise<IntentoGuardado> {
    const creado = await prisma.intentoPago.create({
      data: {
        idSolicitud,
        numero: intento.numero,
        referencia: intento.referencia,
        montoCentavos: BigInt(intento.montoCentavos),
        celularEnmascarado: intento.celularEnmascarado,
      },
    });
    return aIntento(creado);
  }

  async actualizarIntento(idIntento: number, cambios: CambiosIntento): Promise<void> {
    await prisma.intentoPago.update({
      where: { idIntentoPago: idIntento },
      data: {
        ...(cambios.estado === undefined ? {} : { estado: DE_WOMPI[cambios.estado] }),
        ...(cambios.idTransaccion === undefined ? {} : { idTransaccion: cambios.idTransaccion }),
        ...(cambios.mensaje === undefined ? {} : { mensaje: cambios.mensaje }),
        ...(cambios.ultimaConsulta === undefined ? {} : { ultimaConsulta: cambios.ultimaConsulta }),
        fechaActualizacion: new Date(),
      },
    });
  }

  async actualizar(idSolicitud: number, cambios: CambiosSolicitud): Promise<void> {
    await prisma.solicitudCompra.update({
      where: { idSolicitud },
      data: { ...cambios, fechaActualizacion: new Date() },
    });
  }

  async registrarAprobacion(
    idSolicitud: number,
    idIntento: number,
    datos: { transaccionPagoId: string; montoPagado: number; observaciones: string | null; ahora: Date },
  ): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const r = await tx.solicitudCompra.updateMany({
        where: { idSolicitud, transaccionPagoId: null, estado: { notIn: ['pagada', 'completada', 'en_revision'] } },
        data: {
          estado: 'pagada',
          transaccionPagoId: datos.transaccionPagoId,
          montoPagado: datos.montoPagado,
          observaciones: datos.observaciones,
          reintentosOrden: 0,
          proximoIntentoOrden: datos.ahora,
          ultimoError: null,
          fechaActualizacion: datos.ahora,
        },
      });
      if (r.count === 0) return false;
      await tx.intentoPago.update({
        where: { idIntentoPago: idIntento },
        data: { estado: 'aprobado', idTransaccion: datos.transaccionPagoId, ultimaConsulta: datos.ahora, fechaActualizacion: datos.ahora },
      });
      return true;
    }, LIMITES_TRANSACCION);
  }

  async pendientesDeOrden(ahora: Date, limite: number): Promise<SolicitudGuardada[]> {
    const filas = await prisma.solicitudCompra.findMany({
      where: { estado: 'pagada', proximoIntentoOrden: { lte: ahora } },
      orderBy: { proximoIntentoOrden: 'asc' },
      take: limite,
      include: INCLUIR,
    });
    return filas.map(aSolicitud);
  }

  async abiertasParaRevisar(limite: number): Promise<SolicitudGuardada[]> {
    const filas = await prisma.solicitudCompra.findMany({
      where: { estado: { in: ABIERTAS } },
      orderBy: { fechaActualizacion: 'asc' },
      take: limite,
      include: INCLUIR,
    });
    return filas.map(aSolicitud);
  }

  async listar(filtros: ListarSolicitudesAdminRequest): Promise<Pagina<SolicitudGuardada>> {
    const busqueda = filtros.busqueda?.trim();
    const where: Prisma.SolicitudCompraWhereInput = {
      ...(filtros.estado === undefined ? {} : { estado: filtros.estado }),
      ...(busqueda === undefined || busqueda === ''
        ? {}
        : {
            OR: [
              { codigo: { contains: busqueda, mode: 'insensitive' } },
              { codigoOrden: { contains: busqueda, mode: 'insensitive' } },
              { usuario: { nombre: { contains: busqueda, mode: 'insensitive' } } },
              { usuario: { correo: { contains: busqueda, mode: 'insensitive' } } },
            ],
          }),
    };
    const [total, filas] = await prisma.$transaction([
      prisma.solicitudCompra.count({ where }),
      prisma.solicitudCompra.findMany({
        where,
        orderBy: { fechaCreacion: 'desc' },
        skip: (filtros.pagina - 1) * filtros.limite,
        take: filtros.limite,
        include: INCLUIR,
      }),
    ]);
    return { items: filas.map(aSolicitud), pagina: filtros.pagina, limite: filtros.limite, total };
  }
}
