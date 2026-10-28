import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import { medioContactoSchema, type EstadoOrden, type ModoEntrega } from '../dtos/m08-ordenes.dto';
import type {
  DetalleGestionDatos,
  FilaBandejaDatos,
  FiltroGestion,
  GestionRepository,
} from '../interfaces/gestion.interface';

interface FilaCruda {
  codigo_visible: string;
  fecha: Date;
  total: number;
  estado: string;
  modo_entrega: string | null;
  cliente: string;
  entrada_estado: Date;
}

/** Escapa los comodines de LIKE para que el texto del usuario se busque literal. */
function comodin(texto: string): string {
  return `%${texto.replace(/[\\%_]/g, '\\$&')}%`;
}

function condiciones(filtro: FiltroGestion): Prisma.Sql[] {
  const c: Prisma.Sql[] = [];
  if (filtro.codigo !== undefined) c.push(Prisma.sql`o.codigo_visible ILIKE ${comodin(filtro.codigo)}`);
  if (filtro.estados !== undefined && filtro.estados.length > 0) {
    const estados = filtro.estados.map((e) => Prisma.sql`${e}::enum_estado_orden`);
    c.push(Prisma.sql`o.estado IN (${Prisma.join(estados)})`);
  }
  if (filtro.desde !== undefined) c.push(Prisma.sql`o.fecha >= ${filtro.desde}::date`);
  if (filtro.hasta !== undefined) c.push(Prisma.sql`o.fecha <= ${filtro.hasta}::date`);
  if (filtro.cliente !== undefined) c.push(Prisma.sql`o.id_usuario = ${filtro.cliente}`);
  if (filtro.nombre !== undefined) c.push(Prisma.sql`u.nombre ILIKE ${comodin(filtro.nombre)}`);
  if (filtro.correo !== undefined) c.push(Prisma.sql`u.correo ILIKE ${comodin(filtro.correo)}`);
  if (filtro.telefono !== undefined) c.push(Prisma.sql`u.telefono ILIKE ${comodin(filtro.telefono)}`);
  if (filtro.diasEsperando !== undefined) {
    c.push(Prisma.sql`COALESCE(h.fecha, o.fecha::timestamptz) <= NOW() - make_interval(days => ${filtro.diasEsperando}::int)`);
  }
  return c;
}

/** El estado actual empezó en el último cambio del historial; sin historial (órdenes antiguas), en la fecha de la orden. */
const DESDE = Prisma.sql`
  FROM orden o
  JOIN usuario u ON u.id_usuario = o.id_usuario
  LEFT JOIN LATERAL (
    SELECT hh.fecha
    FROM historial_estado_orden hh
    WHERE hh.id_orden = o.id_orden
    ORDER BY hh.fecha DESC, hh.id_historial_estado_orden DESC
    LIMIT 1
  ) h ON TRUE`;

export class PrismaGestionRepository implements GestionRepository {
  async listar(filtro: FiltroGestion): Promise<{ filas: FilaBandejaDatos[]; total: number }> {
    const partes = condiciones(filtro);
    const donde = partes.length > 0 ? Prisma.sql`WHERE ${Prisma.join(partes, ' AND ')}` : Prisma.empty;
    const orden =
      filtro.orden === 'antiguedad'
        ? Prisma.sql`ORDER BY COALESCE(h.fecha, o.fecha::timestamptz) ASC, o.id_orden ASC`
        : Prisma.sql`ORDER BY o.fecha DESC, o.id_orden DESC`;
    const pagina =
      filtro.pagina !== undefined && filtro.limite !== undefined
        ? Prisma.sql`LIMIT ${filtro.limite} OFFSET ${(filtro.pagina - 1) * filtro.limite}`
        : Prisma.empty;

    const [filas, conteo] = await Promise.all([
      prisma.$queryRaw<FilaCruda[]>`
        SELECT o.codigo_visible, o.fecha, o.total::float8 AS total, o.estado::text AS estado,
               o.modo_entrega::text AS modo_entrega, u.nombre AS cliente,
               COALESCE(h.fecha, o.fecha::timestamptz) AS entrada_estado
        ${DESDE} ${donde} ${orden} ${pagina}`,
      prisma.$queryRaw<Array<{ total: number }>>`SELECT COUNT(*)::int AS total ${DESDE} ${donde}`,
    ]);

    return {
      filas: filas.map((f) => ({
        codigo: f.codigo_visible,
        fecha: f.fecha,
        total: f.total,
        estado: f.estado as EstadoOrden,
        modoEntrega: f.modo_entrega as ModoEntrega | null,
        cliente: f.cliente,
        entradaEstado: f.entrada_estado,
      })),
      total: conteo[0]?.total ?? 0,
    };
  }

  async contarPorEstado(): Promise<Array<{ estado: EstadoOrden; cantidad: number }>> {
    const grupos = await prisma.orden.groupBy({ by: ['estado'], _count: { _all: true } });
    return grupos.map((g) => ({ estado: g.estado, cantidad: g._count._all }));
  }

  async buscarIdCliente(codigo: string): Promise<number | null> {
    const fila = await prisma.orden.findUnique({ where: { codigoVisible: codigo }, select: { idUsuario: true } });
    return fila?.idUsuario ?? null;
  }

  async buscarDetalle(codigo: string): Promise<DetalleGestionDatos | null> {
    const fila = await prisma.orden.findUnique({
      where: { codigoVisible: codigo },
      include: {
        usuario: { select: { idUsuario: true, nombre: true, correo: true, telefono: true } },
        lineas: { orderBy: { idLineaOrden: 'asc' }, include: { descuentos: true } },
        historial: {
          orderBy: [{ fecha: 'asc' }, { idHistorialEstadoOrden: 'asc' }],
          include: { autor: { select: { nombre: true } } },
        },
        notas: { orderBy: [{ fecha: 'asc' }, { idNotaOrden: 'asc' }], include: { autor: { select: { nombre: true } } } },
        contactos: {
          orderBy: [{ fecha: 'asc' }, { idContactoOrden: 'asc' }],
          include: { autor: { select: { nombre: true } } },
        },
      },
    });
    if (!fila) return null;

    return {
      codigo: fila.codigoVisible,
      fecha: fila.fecha,
      total: fila.total.toNumber(),
      estado: fila.estado,
      modoEntrega: fila.modoEntrega,
      idUsuario: fila.idUsuario,
      origen: fila.origen,
      subTotal: fila.subTotal.toNumber(),
      descuento: fila.descuento.toNumber(),
      costoEntrega: fila.costoEntrega.toNumber(),
      baseSinImpuesto: fila.baseSinImpuesto?.toNumber() ?? null,
      importeIva: fila.importeIva?.toNumber() ?? null,
      tasaIva: fila.tasaIva?.toNumber() ?? null,
      cliente: fila.usuario,
      direccion: fila.direccion,
      codigoSolicitud: fila.codigoSolicitud,
      idCotizacion: fila.idCotizacion,
      observaciones: fila.observaciones,
      lineas: fila.lineas.map((linea) => ({
        nombreProducto: linea.nombreProducto,
        varianteCopia: linea.varianteCopia,
        colorSolicitado: linea.colorSolicitado,
        skuVendido: linea.skuVendido,
        cantidad: linea.cantidad,
        precioInicial: linea.precioInicial?.toNumber() ?? null,
        precioAplicado: linea.precioAplicado.toNumber(),
        idVarianteRef: linea.idVarianteRef,
        esEntonado: linea.esEntonado,
        baseConsumida: linea.baseConsumida,
        descuentos: linea.descuentos.map((d) => ({
          ordenAplicacion: d.ordenAplicacion,
          origen: d.origen,
          porcentaje: d.porcentaje?.toNumber() ?? null,
          importe: d.importe.toNumber(),
        })),
      })),
      historial: fila.historial.map((h) => ({
        estadoAnterior: h.estadoAnterior,
        estadoNuevo: h.estadoNuevo,
        fecha: h.fecha,
        autor: h.autor?.nombre ?? null,
        motivo: h.motivo,
      })),
      notas: fila.notas.map((n) => ({ idNota: n.idNotaOrden, texto: n.texto, autor: n.autor.nombre, fecha: n.fecha })),
      // La columna admite cualquier medio; solo se muestran los que el contrato reconoce.
      contactos: fila.contactos.flatMap((c) => {
        const medio = medioContactoSchema.safeParse(c.medio);
        return medio.success
          ? [{ idContacto: c.idContactoOrden, medio: medio.data, detalle: c.detalle, autor: c.autor.nombre, fecha: c.fecha }]
          : [];
      }),
    };
  }
}
