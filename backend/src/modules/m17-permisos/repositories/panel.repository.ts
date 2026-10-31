import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import { DONDE_EMPLEADO, DONDE_NO_PERSONAL } from '../../../core/utils/roles';
import type { ClavePendientePanel, ProductoCotizado } from '../dtos/m17-panel-resumen.dto';
import { ESTADOS_COTIZACION_PANEL } from '../dtos/m17-panel-resumen.dto';
import type {
  AgregadoCotizacionesEstado,
  FilaCotizacion,
  MedicionesPeriodo,
  PanelRepositoryPort,
  UsoCupones,
} from '../interfaces/panel.interface';

const numero = (valor: Prisma.Decimal | null | undefined): number => (valor === null || valor === undefined ? 0 : Number(valor));

/**
 * Resumen del panel (contrato M17 · resumen): solo lectura, con consultas agregadas (R14). Lee tablas de otros módulos
 * sin tocar su código, como ya hace M02 con el catálogo.
 */
export class PanelRepository implements PanelRepositoryPort {
  async cotizacionesPorEstado(desde: Date, hasta: Date): Promise<AgregadoCotizacionesEstado[]> {
    const rango = { gte: desde, lt: hasta };
    const [porEstado, sinAcordado] = await Promise.all([
      prisma.cotizacion.groupBy({
        by: ['estado'],
        where: { fechaCreacion: rango },
        _count: { _all: true },
        _sum: { totalReferencia: true, totalAcordado: true },
      }),
      prisma.cotizacion.groupBy({
        by: ['estado'],
        where: { fechaCreacion: rango, totalAcordado: null },
        _sum: { totalReferencia: true },
      }),
    ]);
    const sinAcordadoPorEstado = new Map(sinAcordado.map((f) => [f.estado, numero(f._sum.totalReferencia)]));
    return porEstado
      .filter((f) => (ESTADOS_COTIZACION_PANEL as readonly string[]).includes(f.estado))
      .map((f) => ({
        estado: f.estado,
        total: f._count._all,
        sumaReferencia: numero(f._sum.totalReferencia),
        sumaAcordado: numero(f._sum.totalAcordado),
        sumaReferenciaSinAcordado: sinAcordadoPorEstado.get(f.estado) ?? 0,
      }));
  }

  async filasCotizaciones(desde: Date, hasta: Date, limite: number): Promise<FilaCotizacion[]> {
    const filas = await prisma.cotizacion.findMany({
      where: { fechaCreacion: { gte: desde, lt: hasta } },
      select: { fechaCreacion: true, totalReferencia: true },
      orderBy: { fechaCreacion: 'asc' },
      take: limite,
    });
    return filas.map((f) => ({ fecha: f.fechaCreacion, valor: numero(f.totalReferencia) }));
  }

  async topProductosCotizados(desde: Date, hasta: Date, limite: number): Promise<ProductoCotizado[]> {
    // `COUNT(DISTINCT …)` no se expresa con `groupBy`; las fechas viajan como texto UTC porque la columna no lleva zona.
    const filas = await prisma.$queryRaw<Array<{ nombre: string; marca: string | null; unidades: bigint; cotizaciones: bigint }>>`
      SELECT lc.nombre_producto AS nombre,
             lc.marca AS marca,
             SUM(lc.cantidad) AS unidades,
             COUNT(DISTINCT lc.id_cotizacion) AS cotizaciones
        FROM linea_cotizacion lc
        JOIN cotizacion c ON c.id_cotizacion = lc.id_cotizacion
       WHERE c.fecha_creacion >= ${desde.toISOString()}::timestamp
         AND c.fecha_creacion < ${hasta.toISOString()}::timestamp
       GROUP BY lc.nombre_producto, lc.marca
       ORDER BY unidades DESC, nombre ASC
       LIMIT ${limite}`;
    return filas.map((f) => ({ nombre: f.nombre, marca: f.marca, unidades: Number(f.unidades), cotizaciones: Number(f.cotizaciones) }));
  }

  async carritos(desdeActividad: Date): Promise<{ activos: number; unidades: number }> {
    const vigente = { fechaUltimaActividad: { gte: desdeActividad }, lineas: { some: {} } };
    const [activos, suma] = await Promise.all([
      prisma.carrito.count({ where: vigente }),
      prisma.lineaCarrito.aggregate({ where: { carrito: vigente }, _sum: { cantidad: true } }),
    ]);
    return { activos, unidades: suma._sum.cantidad ?? 0 };
  }

  async catalogo(existenciaBajaMaxima: number): Promise<{
    productosActivos: number;
    variantesActivas: number;
    variantesAgotadas: number;
    variantesExistenciaBaja: number;
  }> {
    const activa = { estado: 'activo' as const };
    const [productosActivos, variantesActivas, variantesAgotadas, variantesExistenciaBaja] = await Promise.all([
      prisma.producto.count({ where: activa }),
      prisma.variante.count({ where: activa }),
      prisma.variante.count({ where: { ...activa, existenciaReferencial: { lte: 0 } } }),
      prisma.variante.count({ where: { ...activa, existenciaReferencial: { gte: 1, lte: existenciaBajaMaxima } } }),
    ]);
    return { productosActivos, variantesActivas, variantesAgotadas, variantesExistenciaBaja };
  }

  eventosVigentes(hoy: Date): Promise<number> {
    return prisma.eventoDescuento.count({
      where: { estado: 'activo', fechaInicio: { lte: hoy }, OR: [{ fechaFin: null }, { fechaFin: { gte: hoy } }] },
    });
  }

  cuponesVigentes(ahora: Date): Promise<number> {
    return prisma.cupon.count({
      where: { estado: 'activo', fechaInicio: { lte: ahora }, OR: [{ fechaFin: null }, { fechaFin: { gte: ahora } }] },
    });
  }

  async usosCupon(desde: Date, hasta: Date): Promise<UsoCupones> {
    const suma = await prisma.cuponUso.aggregate({
      where: { fecha: { gte: desde, lt: hasta }, liberadoEn: null },
      _count: { _all: true },
      _sum: { importeDescuento: true },
    });
    return { usos: suma._count._all, importe: numero(suma._sum.importeDescuento) };
  }

  async personas(): Promise<{ clientesNaturales: number; clientesEmpresa: number; colaboradores: number }> {
    const activo = { estado: 'activo' as const };
    const [clientesNaturales, clientesEmpresa, colaboradores] = await Promise.all([
      prisma.usuario.count({ where: { ...activo, ...DONDE_NO_PERSONAL, tipo: 'normal' } }),
      prisma.usuario.count({ where: { ...activo, ...DONDE_NO_PERSONAL, tipo: 'empresa' } }),
      prisma.usuario.count({ where: { ...activo, ...DONDE_EMPLEADO } }),
    ]);
    return { clientesNaturales, clientesEmpresa, colaboradores };
  }

  campaniasVigentes(hoy: Date): Promise<number> {
    return prisma.campaniaPatrocinio.count({ where: { estado: 'activo', fechaInicio: { lte: hoy }, fechaFin: { gte: hoy } } });
  }

  anunciosActivos(hoy: Date): Promise<number> {
    return prisma.anuncioPublicitario.count({ where: { estado: 'activo', fechaInicio: { lte: hoy }, fechaFin: { gte: hoy } } });
  }

  async mediciones(desdeDia: Date, hastaDia: Date): Promise<MedicionesPeriodo> {
    const filas = await prisma.medicionPatrocinio.groupBy({
      by: ['evento'],
      where: { fecha: { gte: desdeDia, lte: hastaDia } },
      _sum: { total: true },
    });
    const total = (evento: 'impresion' | 'clic'): number => Number(filas.find((f) => f.evento === evento)?._sum.total ?? 0);
    return { impresiones: total('impresion'), clics: total('clic') };
  }

  async pendientes(claves: ReadonlySet<ClavePendientePanel>, limiteVencer: Date): Promise<Record<ClavePendientePanel, number>> {
    const cero = Promise.resolve(0);
    const [porResponder, porVencer, contacto, empresa, nit, agotadas] = await Promise.all([
      claves.has('cotizaciones_por_responder') ? prisma.cotizacion.count({ where: { estado: 'solicitada' } }) : cero,
      claves.has('cotizaciones_por_vencer')
        ? prisma.cotizacion.count({ where: { estado: 'enviada', fechaVencimiento: { lte: limiteVencer } } })
        : cero,
      claves.has('solicitudes_contacto') ? prisma.solicitudContacto.count({ where: { estado: 'en_revision' } }) : cero,
      claves.has('solicitudes_empresa') ? prisma.solicitudEmpresa.count({ where: { estado: 'pendiente' } }) : cero,
      claves.has('solicitudes_nit') ? prisma.solicitudActualizacionNit.count({ where: { estado: 'pendiente' } }) : cero,
      claves.has('variantes_agotadas') ? prisma.variante.count({ where: { estado: 'activo', existenciaReferencial: { lte: 0 } } }) : cero,
    ]);
    return {
      cotizaciones_por_responder: porResponder,
      cotizaciones_por_vencer: porVencer,
      solicitudes_contacto: contacto,
      solicitudes_empresa: empresa,
      solicitudes_nit: nit,
      variantes_agotadas: agotadas,
    };
  }
}
