import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type { Agrupacion, CifrasVenta, Compradores, DimensionVenta, FacturacionReporte, PostventaReporte, ReporteDescuentos, TopClientes } from '../dtos/m19-reportes.dto';
import type { FilaPorEstado, FilaVentaPorCrudo, PuntoCrudo, RangoFechas, ReportesRepositoryPort } from '../interfaces/reportes.interface';

/**
 * Todas las consultas son agregaciones en la base con parámetros (nunca SQL concatenado). R2: una venta es una orden que no
 * está `cancelado` ni `devuelto`. Las fechas son las de `orden.fecha` (fecha local de Colombia, M08).
 */
const ES_VENTA = Prisma.sql`o.estado::text NOT IN ('cancelado', 'devuelto')`;
const EN_RANGO = (r: RangoFechas): Prisma.Sql => Prisma.sql`o.fecha BETWEEN ${r.desde}::date AND ${r.hasta}::date`;

const n = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
const redondear = (x: number, d: number): number => Math.round(x * 10 ** d) / 10 ** d;

const UNIDAD_SQL: Record<Agrupacion, string> = { dia: 'day', semana: 'week', mes: 'month', anio: 'year' };

/** Por dimensión: la expresión de la clave y de la etiqueta, y los joins que necesita (R6). Todo es texto fijo del programa. */
const DIMENSION_SQL: Record<DimensionVenta, { clave: Prisma.Sql; etiqueta: Prisma.Sql; uniones: Prisma.Sql }> = {
  producto: { clave: Prisma.sql`l.nombre_producto`, etiqueta: Prisma.sql`l.nombre_producto`, uniones: Prisma.empty },
  categoria: {
    clave: Prisma.sql`coalesce(c.id_categoria::text, 'sin-clasificar')`,
    etiqueta: Prisma.sql`coalesce(c.nombre, 'Sin clasificar')`,
    uniones: Prisma.sql`LEFT JOIN variante v ON v.id_variante = l.id_variante_ref LEFT JOIN producto p ON p.id_producto = v.id_producto LEFT JOIN subcategoria sc ON sc.id_subcategoria = p.id_subcategoria LEFT JOIN categoria c ON c.id_categoria = sc.id_categoria`,
  },
  marca: {
    clave: Prisma.sql`coalesce(m.id_marca::text, 'sin-clasificar')`,
    etiqueta: Prisma.sql`coalesce(m.nombre, 'Sin clasificar')`,
    uniones: Prisma.sql`LEFT JOIN variante v ON v.id_variante = l.id_variante_ref LEFT JOIN producto p ON p.id_producto = v.id_producto LEFT JOIN marca m ON m.id_marca = p.id_marca`,
  },
  tipo_cliente: {
    clave: Prisma.sql`CASE WHEN ce.id_usuario IS NULL THEN 'persona' ELSE 'empresa' END`,
    etiqueta: Prisma.sql`CASE WHEN ce.id_usuario IS NULL THEN 'Persona' ELSE 'Empresa' END`,
    uniones: Prisma.sql`LEFT JOIN cuenta_empresa ce ON ce.id_usuario = o.id_usuario`,
  },
  modo_entrega: {
    clave: Prisma.sql`coalesce(o.modo_entrega::text, 'sin-dato')`,
    etiqueta: Prisma.sql`CASE o.modo_entrega::text WHEN 'domicilio' THEN 'Envío a domicilio' WHEN 'recogida' THEN 'Recogida en almacén' ELSE 'Sin dato' END`,
    uniones: Prisma.empty,
  },
};

export class ReportesRepository implements ReportesRepositoryPort {
  async cifras(rango: RangoFechas): Promise<CifrasVenta> {
    const [fila] = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT count(*)::int AS ordenes,
             coalesce(sum(o.sub_total), 0) AS ventas_brutas,
             coalesce(sum(o.descuento), 0) AS descuentos,
             coalesce(sum(o.costo_entrega), 0) AS envio,
             coalesce(sum(o.base_sin_impuesto), 0) AS base_sin_iva,
             coalesce(sum(o.importe_iva), 0) AS iva,
             coalesce(sum(o.total), 0) AS total_cobrado,
             coalesce(sum((SELECT sum(l.cantidad) FROM linea_orden l WHERE l.id_orden = o.id_orden)), 0)::int AS unidades
      FROM orden o WHERE ${EN_RANGO(rango)} AND ${ES_VENTA}`;
    const ordenes = n(fila?.ordenes);
    const total = n(fila?.total_cobrado);
    return {
      ordenes,
      unidades: n(fila?.unidades),
      ventasBrutas: n(fila?.ventas_brutas),
      descuentos: n(fila?.descuentos),
      envio: n(fila?.envio),
      baseSinIva: n(fila?.base_sin_iva),
      iva: n(fila?.iva),
      totalCobrado: total,
      ticketPromedio: ordenes === 0 ? null : Math.round(total / ordenes),
    };
  }

  async porEstado(rango: RangoFechas): Promise<FilaPorEstado[]> {
    const filas = await prisma.$queryRaw<Array<{ estado: string; ordenes: number; total: unknown }>>`
      SELECT o.estado::text AS estado, count(*)::int AS ordenes, coalesce(sum(o.total), 0) AS total
      FROM orden o WHERE ${EN_RANGO(rango)} GROUP BY o.estado`;
    return filas.map((f) => ({ estado: f.estado, ordenes: n(f.ordenes), total: n(f.total) }));
  }

  async serie(rango: RangoFechas, agrupar: Agrupacion): Promise<PuntoCrudo[]> {
    const unidad = UNIDAD_SQL[agrupar];
    const filas = await prisma.$queryRaw<Array<{ periodo: string; ordenes: number; unidades: unknown; total: unknown }>>`
      SELECT to_char(date_trunc(${unidad}, o.fecha), 'YYYY-MM-DD') AS periodo,
             count(*)::int AS ordenes,
             coalesce(sum((SELECT sum(l.cantidad) FROM linea_orden l WHERE l.id_orden = o.id_orden)), 0) AS unidades,
             coalesce(sum(o.total), 0) AS total
      FROM orden o WHERE ${EN_RANGO(rango)} AND ${ES_VENTA}
      GROUP BY 1 ORDER BY 1`;
    return filas.map((f) => ({ periodo: f.periodo, ordenes: n(f.ordenes), unidades: n(f.unidades), totalCobrado: n(f.total) }));
  }

  async ventasPor(dimension: DimensionVenta, rango: RangoFechas, orden: 'importe' | 'unidades', limite: number) {
    const d = DIMENSION_SQL[dimension];
    const orderBy = orden === 'unidades' ? Prisma.sql`unidades DESC, importe DESC, etiqueta` : Prisma.sql`importe DESC, unidades DESC, etiqueta`;
    const filas = await prisma.$queryRaw<Array<{ clave: string; etiqueta: string; ordenes: number; unidades: unknown; importe: unknown }>>`
      SELECT ${d.clave} AS clave, min(${d.etiqueta}) AS etiqueta,
             count(DISTINCT o.id_orden)::int AS ordenes, sum(l.cantidad) AS unidades, sum(l.precio_aplicado * l.cantidad) AS importe
      FROM linea_orden l JOIN orden o ON o.id_orden = l.id_orden ${d.uniones}
      WHERE ${EN_RANGO(rango)} AND ${ES_VENTA}
      GROUP BY 1 ORDER BY ${orderBy} LIMIT ${limite}`;
    const [tot] = await prisma.$queryRaw<Array<{ ordenes: number; unidades: unknown; importe: unknown }>>`
      SELECT count(DISTINCT o.id_orden)::int AS ordenes, coalesce(sum(l.cantidad), 0) AS unidades, coalesce(sum(l.precio_aplicado * l.cantidad), 0) AS importe
      FROM linea_orden l JOIN orden o ON o.id_orden = l.id_orden WHERE ${EN_RANGO(rango)} AND ${ES_VENTA}`;
    const crudas: FilaVentaPorCrudo[] = filas.map((f) => ({ clave: f.clave, etiqueta: f.etiqueta, ordenes: n(f.ordenes), unidades: n(f.unidades), importe: n(f.importe) }));
    return { filas: crudas, total: { ordenes: n(tot?.ordenes), unidades: n(tot?.unidades), importe: n(tot?.importe) } };
  }

  async descuentos(rango: RangoFechas): Promise<Omit<ReporteDescuentos, 'periodo'>> {
    const filas = await prisma.$queryRaw<Array<{ origen: string; lineas: number; ordenes: number; importe: unknown }>>`
      SELECT d.origen, count(*)::int AS lineas, count(DISTINCT o.id_orden)::int AS ordenes, sum(d.importe) AS importe
      FROM linea_orden_descuento d JOIN linea_orden l ON l.id_linea_orden = d.id_linea_orden JOIN orden o ON o.id_orden = l.id_orden
      WHERE ${EN_RANGO(rango)} AND ${ES_VENTA}
      GROUP BY d.origen ORDER BY importe DESC, d.origen`;
    const salida = filas.map((f) => ({ origen: f.origen, lineasAfectadas: n(f.lineas), ordenes: n(f.ordenes), importe: n(f.importe) }));
    return { totalDescuentos: redondear(salida.reduce((s, f) => s + f.importe, 0), 2), filas: salida };
  }

  async topClientes(rango: RangoFechas, limite: number): Promise<Omit<TopClientes, 'periodo'>> {
    const filas = await prisma.$queryRaw<Array<{ nombre: string; empresa: boolean; ordenes: number; unidades: unknown; total: unknown }>>`
      SELECT coalesce(max(ce.nombre_empresa), max(u.nombre)) AS nombre, bool_or(ce.id_usuario IS NOT NULL) AS empresa,
             count(*)::int AS ordenes, coalesce(sum(x.cantidad), 0) AS unidades, sum(o.total) AS total
      FROM orden o JOIN usuario u ON u.id_usuario = o.id_usuario
      LEFT JOIN cuenta_empresa ce ON ce.id_usuario = o.id_usuario
      LEFT JOIN LATERAL (SELECT sum(l.cantidad) AS cantidad FROM linea_orden l WHERE l.id_orden = o.id_orden) x ON true
      WHERE ${EN_RANGO(rango)} AND ${ES_VENTA}
      GROUP BY o.id_usuario ORDER BY total DESC, nombre LIMIT ${limite}`;
    return {
      filas: filas.map((f, i) => ({ posicion: i + 1, nombre: f.nombre, tipo: f.empresa ? 'empresa' : 'persona', ordenes: n(f.ordenes), unidades: n(f.unidades), totalCobrado: n(f.total) })),
    };
  }

  async compradores(rango: RangoFechas): Promise<Omit<Compradores, 'periodo'>> {
    const [f] = await prisma.$queryRaw<Array<{ compradores: number; nuevos: number; varias: number; ordenes: number }>>`
      WITH c AS (
        SELECT o.id_usuario, count(*)::int AS ordenes
        FROM orden o WHERE ${EN_RANGO(rango)} AND ${ES_VENTA} GROUP BY o.id_usuario
      )
      SELECT count(*)::int AS compradores,
             count(*) FILTER (WHERE NOT EXISTS (
               SELECT 1 FROM orden p WHERE p.id_usuario = c.id_usuario AND p.fecha < ${rango.desde}::date AND p.estado::text NOT IN ('cancelado', 'devuelto')
             ))::int AS nuevos,
             count(*) FILTER (WHERE c.ordenes > 1)::int AS varias,
             coalesce(sum(c.ordenes), 0)::int AS ordenes
      FROM c`;
    const compradores = n(f?.compradores);
    const nuevos = n(f?.nuevos);
    return {
      compradores,
      nuevos,
      recurrentes: compradores - nuevos,
      compraronMasDeUnaVez: n(f?.varias),
      ordenesPorComprador: compradores === 0 ? null : redondear(n(f?.ordenes) / compradores, 1),
    };
  }

  async postventa(rango: RangoFechas): Promise<Omit<PostventaReporte, 'periodo'>> {
    const enRangoSolicitud = Prisma.sql`(s.fecha_solicitud AT TIME ZONE 'America/Bogota')::date BETWEEN ${rango.desde}::date AND ${rango.hasta}::date`;
    const porTipo = await prisma.$queryRaw<Array<{ tipo: string; solicitudes: number }>>`
      SELECT s.tipo::text AS tipo, count(*)::int AS solicitudes FROM solicitud_postventa s WHERE ${enRangoSolicitud} GROUP BY 1 ORDER BY 2 DESC, 1`;
    const porEstado = await prisma.$queryRaw<Array<{ estado: string; solicitudes: number }>>`
      SELECT s.estado::text AS estado, count(*)::int AS solicitudes FROM solicitud_postventa s WHERE ${enRangoSolicitud} GROUP BY 1 ORDER BY 2 DESC, 1`;
    const [r] = await prisma.$queryRaw<Array<{ cantidad: number; total: unknown }>>`
      SELECT count(*)::int AS cantidad, coalesce(sum(s.total_reembolso), 0) AS total
      FROM solicitud_postventa s
      WHERE s.fecha_reembolso IS NOT NULL AND (s.fecha_reembolso AT TIME ZONE 'America/Bogota')::date BETWEEN ${rango.desde}::date AND ${rango.hasta}::date`;
    return {
      solicitudes: porTipo.reduce((s, f) => s + n(f.solicitudes), 0),
      porTipo: porTipo.map((f) => ({ tipo: f.tipo, solicitudes: n(f.solicitudes) })),
      porEstado: porEstado.map((f) => ({ estado: f.estado, solicitudes: n(f.solicitudes) })),
      reembolsos: { cantidad: n(r?.cantidad), totalReembolsado: n(r?.total) },
    };
  }

  async facturacion(rango: RangoFechas): Promise<Omit<FacturacionReporte, 'periodo'>> {
    const [f] = await prisma.$queryRaw<Array<{ ventas: number; con: number }>>`
      SELECT count(*)::int AS ventas, count(cv.id_comprobante)::int AS con
      FROM orden o LEFT JOIN comprobante_venta cv ON cv.id_orden = o.id_orden
      WHERE ${EN_RANGO(rango)} AND ${ES_VENTA}`;
    const ultimo = await prisma.comprobanteVenta.findFirst({ orderBy: { idComprobante: 'desc' }, select: { numero: true } });
    const ventas = n(f?.ventas);
    const con = n(f?.con);
    return { ventas, conComprobante: con, sinComprobante: ventas - con, ultimoNumero: ultimo?.numero ?? null };
  }
}
