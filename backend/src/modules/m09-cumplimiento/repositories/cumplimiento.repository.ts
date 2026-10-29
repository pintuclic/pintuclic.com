import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import { estadosTxDe } from '../../m08-ordenes/repositories/estados.repository';
import { cambiarEstadoPorCumplimiento } from '../../m08-ordenes/services/estados.service';
import { MOTIVO_AVANCE_AUTOMATICO, type EstadoMarca, type EstadoOrden } from '../dtos/m09-cumplimiento.dto';
import type {
  CumplimientoRepository,
  CumplimientoTx,
  FilaRetenidaDatos,
  LineaDatos,
  MarcaNueva,
  OrdenDatos,
  ResultadoAvance,
} from '../interfaces/cumplimiento.interface';

type Cliente = Prisma.TransactionClient | typeof prisma;

const SELECCION_ORDEN = {
  codigoVisible: true,
  estado: true,
  idUsuario: true,
  lineas: {
    orderBy: { idLineaOrden: 'asc' },
    select: {
      idLineaOrden: true,
      nombreProducto: true,
      varianteCopia: true,
      colorSolicitado: true,
      cantidad: true,
      esEntonado: true,
      baseConsumida: true,
      verificaciones: {
        orderBy: { idVerificacionLineaOrden: 'asc' },
        select: { estado: true, fecha: true, autor: { select: { nombre: true } } },
      },
    },
  },
} satisfies Prisma.OrdenSelect;

type OrdenCruda = Prisma.OrdenGetPayload<{ select: typeof SELECCION_ORDEN }>;

function aLineas(lineas: OrdenCruda['lineas']): LineaDatos[] {
  return lineas.map((l, i) => ({
    idLinea: l.idLineaOrden,
    // El número es la posición por orden de creación: las líneas de una orden no cambian (D4).
    numeroLinea: i + 1,
    nombreProducto: l.nombreProducto,
    varianteCopia: l.varianteCopia,
    colorSolicitado: l.colorSolicitado,
    cantidad: l.cantidad,
    esEntonado: l.esEntonado,
    baseConsumida: l.baseConsumida,
    registros: l.verificaciones.map((v) => ({ estado: v.estado satisfies EstadoMarca, autor: v.autor.nombre, fecha: v.fecha })),
  }));
}

async function leerOrden(cliente: Cliente, codigo: string): Promise<OrdenDatos | null> {
  const fila = await cliente.orden.findUnique({ where: { codigoVisible: codigo }, select: SELECCION_ORDEN });
  if (!fila) return null;
  return { codigo: fila.codigoVisible, estado: fila.estado satisfies EstadoOrden, idUsuario: fila.idUsuario, lineas: aLineas(fila.lineas) };
}

class PrismaCumplimientoTx implements CumplimientoTx {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  async cargarOrden(codigo: string): Promise<OrdenDatos | null> {
    // El bloqueo dura hasta el final de la transacción: dos marcas a la vez sobre la misma orden se hacen una tras otra.
    await this.tx.$queryRaw`SELECT 1 FROM orden WHERE codigo_visible = ${codigo} FOR UPDATE`;
    return leerOrden(this.tx, codigo);
  }

  async insertarMarcas(marcas: readonly MarcaNueva[], idUsuarioAutor: number): Promise<void> {
    await this.tx.verificacionLineaOrden.createMany({
      data: marcas.map((m) => ({ idLineaOrden: m.idLinea, estado: m.estado, idUsuarioAutor })),
    });
  }

  async avanzarAPreparacion(codigo: string, idUsuarioAutor: number): Promise<ResultadoAvance> {
    const resultado = await cambiarEstadoPorCumplimiento(estadosTxDe(this.tx), codigo, MOTIVO_AVANCE_AUTOMATICO, idUsuarioAutor);
    return resultado.ok ? { ok: true } : { ok: false, razon: resultado.razon };
  }
}

interface FilaRetenidaCruda {
  id_orden: number;
  codigo_visible: string;
  fecha: Date;
  cliente: string;
  entrada_estado: Date;
}

/**
 * R12. Órdenes en revisión con al menos una línea cuya última marca no es «disponible» (o que no tiene marcas).
 * El estado actual empezó en el último cambio del historial; sin historial, en la fecha de la orden.
 */
const RETENIDAS = Prisma.sql`
  FROM orden o
  JOIN usuario u ON u.id_usuario = o.id_usuario
  LEFT JOIN LATERAL (
    SELECT hh.fecha
    FROM historial_estado_orden hh
    WHERE hh.id_orden = o.id_orden
    ORDER BY hh.fecha DESC, hh.id_historial_estado_orden DESC
    LIMIT 1
  ) h ON TRUE
  WHERE o.estado = 'revision_disponibilidad'
    AND EXISTS (
      SELECT 1
      FROM linea_orden l
      WHERE l.id_orden = o.id_orden
        AND COALESCE((
          SELECT v.estado::text
          FROM verificacion_linea_orden v
          WHERE v.id_linea_orden = l.id_linea_orden
          ORDER BY v.id_verificacion_linea_orden DESC
          LIMIT 1
        ), 'pendiente') <> 'disponible'
    )`;

export class PrismaCumplimientoRepository implements CumplimientoRepository {
  cargarOrden(codigo: string): Promise<OrdenDatos | null> {
    return leerOrden(prisma, codigo);
  }

  async listarRetenidas(pagina: number, limite: number): Promise<{ filas: FilaRetenidaDatos[]; total: number }> {
    const [filas, conteo] = await Promise.all([
      prisma.$queryRaw<FilaRetenidaCruda[]>`
        SELECT o.id_orden, o.codigo_visible, o.fecha, u.nombre AS cliente,
               COALESCE(h.fecha, o.fecha::timestamptz) AS entrada_estado
        ${RETENIDAS}
        ORDER BY COALESCE(h.fecha, o.fecha::timestamptz) ASC, o.id_orden ASC
        LIMIT ${limite} OFFSET ${(pagina - 1) * limite}`,
      prisma.$queryRaw<Array<{ total: number }>>`SELECT COUNT(*)::int AS total ${RETENIDAS}`,
    ]);

    const lineas = await prisma.lineaOrden.findMany({
      where: { idOrden: { in: filas.map((f) => f.id_orden) } },
      orderBy: { idLineaOrden: 'asc' },
      select: {
        idOrden: true,
        idLineaOrden: true,
        nombreProducto: true,
        varianteCopia: true,
        colorSolicitado: true,
        cantidad: true,
        esEntonado: true,
        baseConsumida: true,
        verificaciones: {
          orderBy: { idVerificacionLineaOrden: 'asc' },
          select: { estado: true, fecha: true, autor: { select: { nombre: true } } },
        },
      },
    });

    return {
      filas: filas.map((f) => ({
        codigo: f.codigo_visible,
        cliente: f.cliente,
        fecha: f.fecha,
        entradaEstado: f.entrada_estado,
        lineas: aLineas(lineas.filter((l) => l.idOrden === f.id_orden)),
      })),
      total: conteo[0]?.total ?? 0,
    };
  }

  async enTransaccion<T>(trabajo: (tx: CumplimientoTx) => Promise<T>): Promise<T> {
    return prisma.$transaction((px) => trabajo(new PrismaCumplimientoTx(px)));
  }
}
