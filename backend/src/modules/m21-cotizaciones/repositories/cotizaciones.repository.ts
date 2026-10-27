import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type { EstadoCotizacion } from '../dtos/m21-cotizaciones.dto';
import type {
  AjusteGuardado,
  CambioEstado,
  CotizacionGuardada,
  CotizacionesRepositoryPort,
  FiltroCotizaciones,
  NuevaCotizacion,
} from '../interfaces/cotizaciones.interface';

const SELECCION_BASE = {
  idCotizacion: true,
  codigoVisible: true,
  idUsuario: true,
  estado: true,
  fechaCreacion: true,
  comentarioCliente: true,
  notaParaCliente: true,
  motivoRechazo: true,
  fechaEnvio: true,
  fechaVencimiento: true,
  fechaRespuesta: true,
  totalReferencia: true,
  totalAcordado: true,
  usuario: { select: { idUsuario: true, nombre: true, correo: true, tipo: true } },
} satisfies Prisma.CotizacionSelect;

const SELECCION_DETALLE = {
  ...SELECCION_BASE,
  lineas: { orderBy: { idLineaCotizacion: 'asc' } },
} satisfies Prisma.CotizacionSelect;

const SELECCION_LISTA = {
  ...SELECCION_BASE,
  _count: { select: { lineas: true } },
} satisfies Prisma.CotizacionSelect;

type CotizacionBase = Prisma.CotizacionGetPayload<{ select: typeof SELECCION_BASE }>;
type CotizacionDetalleDb = Prisma.CotizacionGetPayload<{ select: typeof SELECCION_DETALLE }>;

const numero = (d: Prisma.Decimal): number => Number(d);
const numeroONull = (d: Prisma.Decimal | null): number | null => (d === null ? null : Number(d));
/** `DATE` llega como medianoche UTC: se devuelve AAAA-MM-DD. */
const fecha = (d: Date | null): string | null => (d === null ? null : d.toISOString().slice(0, 10));
const aDate = (f: string): Date => new Date(`${f}T00:00:00Z`);

function base(c: CotizacionBase): Omit<CotizacionGuardada, 'lineas'> {
  return {
    idCotizacion: c.idCotizacion,
    codigo: c.codigoVisible ?? `COT-${String(c.idCotizacion).padStart(6, '0')}`,
    idUsuario: c.idUsuario,
    estado: c.estado,
    fechaCreacion: c.fechaCreacion,
    comentarioCliente: c.comentarioCliente,
    notaParaCliente: c.notaParaCliente,
    motivoRechazo: c.motivoRechazo,
    fechaEnvio: c.fechaEnvio,
    fechaVencimiento: fecha(c.fechaVencimiento),
    fechaRespuesta: c.fechaRespuesta,
    totalReferencia: numero(c.totalReferencia),
    totalAcordado: numeroONull(c.totalAcordado),
    cliente: c.usuario,
  };
}

function detalle(c: CotizacionDetalleDb): CotizacionGuardada {
  return {
    ...base(c),
    lineas: c.lineas.map((l) => ({
      idLinea: l.idLineaCotizacion,
      idVariante: l.idVariante,
      idColor: l.idColor,
      cantidad: l.cantidad,
      precioReferencia: numero(l.precioReferencia),
      precioAcordado: numeroONull(l.precioAcordado),
      nombreProducto: l.nombreProducto,
      marca: l.marca,
      medida: l.medida,
      sku: l.sku,
      colorNombre: l.colorNombre,
      colorHexadecimal: l.colorHexadecimal,
    })),
  };
}

/** R1/R4 y búsqueda del panel: por código (COT-000123 o el número) o por nombre / correo del cliente. */
function filtroDonde(f: FiltroCotizaciones): Prisma.CotizacionWhereInput {
  const condiciones: Prisma.CotizacionWhereInput[] = [];
  if (f.idUsuario !== undefined) condiciones.push({ idUsuario: f.idUsuario });
  if (f.estado !== undefined) {
    // `borrador` se trata igual que `solicitada` (contrato, Estados).
    condiciones.push(f.estado === 'solicitada' ? { estado: { in: ['solicitada', 'borrador'] } } : { estado: f.estado });
  }
  if (f.busqueda !== undefined) {
    const numeroCodigo = /^(?:cot-?)?0*(\d{1,9})$/i.exec(f.busqueda)?.[1];
    condiciones.push({
      OR: [
        ...(numeroCodigo === undefined ? [] : [{ idCotizacion: Number(numeroCodigo) }]),
        { usuario: { nombre: { contains: f.busqueda, mode: 'insensitive' } } },
        { usuario: { correo: { contains: f.busqueda, mode: 'insensitive' } } },
      ],
    });
  }
  return { AND: condiciones };
}

/** Única zona de M21 que habla con la base. */
export class CotizacionesRepository implements CotizacionesRepositoryPort {
  async crear(n: NuevaCotizacion): Promise<number> {
    const c = await prisma.cotizacion.create({
      data: {
        idUsuario: n.idUsuario,
        estado: 'solicitada',
        comentarioCliente: n.comentario,
        totalReferencia: n.totalReferencia,
        lineas: { create: n.lineas.map((l) => ({ ...l })) },
      },
      select: { idCotizacion: true },
    });
    return c.idCotizacion;
  }

  async obtener(idCotizacion: number): Promise<CotizacionGuardada | null> {
    const c = await prisma.cotizacion.findUnique({ where: { idCotizacion }, select: SELECCION_DETALLE });
    return c === null ? null : detalle(c);
  }

  async listar(f: FiltroCotizaciones): Promise<{ items: Array<CotizacionGuardada & { cantidadLineas: number }>; total: number }> {
    const where = filtroDonde(f);
    const [filas, total] = await prisma.$transaction([
      prisma.cotizacion.findMany({
        where,
        select: SELECCION_LISTA,
        orderBy: [{ fechaCreacion: 'desc' }, { idCotizacion: 'desc' }],
        skip: (f.pagina - 1) * f.limite,
        take: f.limite,
      }),
      prisma.cotizacion.count({ where }),
    ]);
    return { items: filas.map((c) => ({ ...base(c), lineas: [], cantidadLineas: c._count.lineas })), total };
  }

  contarAbiertas(idUsuario: number): Promise<number> {
    return prisma.cotizacion.count({ where: { idUsuario, estado: { in: ['solicitada', 'borrador', 'enviada'] } } });
  }

  async vencerEnviadas(hoy: string): Promise<number> {
    const r = await prisma.cotizacion.updateMany({
      where: { estado: 'enviada', fechaVencimiento: { lt: aDate(hoy) } },
      data: { estado: 'vencida', fechaActualizacion: new Date() },
    });
    return r.count;
  }

  async guardarAjuste(idCotizacion: number, desde: readonly EstadoCotizacion[], a: AjusteGuardado): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const r = await tx.cotizacion.updateMany({
        where: { idCotizacion, estado: { in: [...desde] } },
        data: {
          notaParaCliente: a.notaParaCliente,
          fechaVencimiento: a.fechaVencimiento === null ? null : aDate(a.fechaVencimiento),
          totalReferencia: a.totalReferencia,
          fechaActualizacion: new Date(),
        },
      });
      if (r.count === 0) return false;
      if (a.quitar.length > 0) {
        await tx.lineaCotizacion.deleteMany({ where: { idCotizacion, idLineaCotizacion: { in: [...a.quitar] } } });
      }
      for (const l of a.lineas) {
        await tx.lineaCotizacion.updateMany({
          where: { idCotizacion, idLineaCotizacion: l.idLinea },
          data: { cantidad: l.cantidad, precioAcordado: l.precioAcordado },
        });
      }
      return true;
    });
  }

  async cambiarEstado(idCotizacion: number, desde: readonly EstadoCotizacion[], cambio: CambioEstado): Promise<boolean> {
    const r = await prisma.cotizacion.updateMany({
      where: { idCotizacion, estado: { in: [...desde] } },
      data: {
        estado: cambio.estado,
        fechaActualizacion: new Date(),
        ...(cambio.fechaEnvio === undefined ? {} : { fechaEnvio: cambio.fechaEnvio }),
        ...(cambio.fechaRespuesta === undefined ? {} : { fechaRespuesta: cambio.fechaRespuesta }),
        ...(cambio.fechaVencimiento === undefined ? {} : { fechaVencimiento: aDate(cambio.fechaVencimiento) }),
        ...(cambio.idUsuarioResponde === undefined ? {} : { idUsuarioResponde: cambio.idUsuarioResponde }),
        ...(cambio.totalAcordado === undefined ? {} : { totalAcordado: cambio.totalAcordado }),
        ...(cambio.motivoRechazo === undefined ? {} : { motivoRechazo: cambio.motivoRechazo }),
      },
    });
    return r.count > 0;
  }
}
