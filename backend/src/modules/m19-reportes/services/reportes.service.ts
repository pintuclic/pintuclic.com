import {
  ESTADOS_ORDEN_REPORTE,
  type CifrasVenta,
  type Compradores,
  type ConsultaLimite,
  type ConsultaRango,
  type ConsultaSerie,
  type ConsultaVentasPor,
  type DimensionVenta,
  type FacturacionReporte,
  type Periodo,
  type PostventaReporte,
  type ReporteDescuentos,
  type ResumenVentas,
  type SerieVentas,
  type TopClientes,
  type VentasPor,
} from '../dtos/m19-reportes.dto';
import type { ReportesRepositoryPort } from '../interfaces/reportes.interface';
import { intervalosDelRango, periodoAnterior, periodoSerie, resolverPeriodo } from './fechas';

const redondear = (x: number, d: number): number => Math.round(x * 10 ** d) / 10 ** d;

/** R4: variación en % con un decimal; null si el periodo anterior vale 0 (o no hay dato). */
export function variacion(actual: number | null, anterior: number | null): number | null {
  if (actual === null || anterior === null || anterior === 0) return null;
  return redondear(((actual - anterior) / anterior) * 100, 1);
}

/** Reportes de ventas (contracts/m19-reportes.contract.ts). Solo lectura: arma, compara y completa lo que el repositorio agrega. */
export class ReportesService {
  constructor(
    private readonly repo: ReportesRepositoryPort,
    private readonly ahora: () => Date = () => new Date(),
  ) {}

  private periodo(q: Pick<ConsultaRango, 'desde' | 'hasta'>): Periodo {
    return resolverPeriodo(q.desde, q.hasta, this.ahora());
  }

  async resumen(q: ConsultaRango): Promise<ResumenVentas> {
    const periodo = this.periodo(q);
    const anterior = periodoAnterior(periodo);
    const [actual, previo, estados] = await Promise.all([this.repo.cifras(periodo), this.repo.cifras(anterior), this.repo.porEstado(periodo)]);
    const porEstado = ESTADOS_ORDEN_REPORTE.map((estado) => {
      const f = estados.find((e) => e.estado === estado);
      return { estado, ordenes: f?.ordenes ?? 0, total: f?.total ?? 0 };
    });
    return {
      periodo,
      periodoAnterior: anterior,
      actual,
      anterior: previo,
      variacion: {
        ordenes: variacion(actual.ordenes, previo.ordenes),
        unidades: variacion(actual.unidades, previo.unidades),
        totalCobrado: variacion(actual.totalCobrado, previo.totalCobrado),
        ticketPromedio: variacion(actual.ticketPromedio, previo.ticketPromedio),
      },
      porEstado,
    };
  }

  /** R5: un punto por intervalo, sin huecos. */
  async serie(q: ConsultaSerie): Promise<SerieVentas> {
    const periodo = periodoSerie(q.desde, q.hasta, this.ahora());
    const intervalos = intervalosDelRango(periodo, q.agrupar);
    const crudos = new Map((await this.repo.serie(periodo, q.agrupar)).map((p) => [p.periodo, p]));
    return {
      periodo,
      agrupar: q.agrupar,
      puntos: intervalos.map((inicio) => {
        const p = crudos.get(inicio);
        return { periodo: inicio, ordenes: p?.ordenes ?? 0, unidades: p?.unidades ?? 0, totalCobrado: p?.totalCobrado ?? 0 };
      }),
    };
  }

  /** R6: con la participación de cada fila sobre el total de la dimensión. */
  async ventasPor(dimension: DimensionVenta, q: ConsultaVentasPor): Promise<VentasPor> {
    const periodo = this.periodo(q);
    const { filas, total } = await this.repo.ventasPor(dimension, periodo, q.orden, q.limite);
    return {
      periodo,
      dimension,
      total,
      filas: filas.map((f) => ({ ...f, participacion: total.importe === 0 ? 0 : redondear((f.importe / total.importe) * 100, 1) })),
    };
  }

  async descuentos(q: ConsultaRango): Promise<ReporteDescuentos> {
    const periodo = this.periodo(q);
    return { periodo, ...(await this.repo.descuentos(periodo)) };
  }

  async topClientes(q: ConsultaLimite): Promise<TopClientes> {
    const periodo = this.periodo(q);
    return { periodo, ...(await this.repo.topClientes(periodo, q.limite)) };
  }

  async compradores(q: ConsultaRango): Promise<Compradores> {
    const periodo = this.periodo(q);
    return { periodo, ...(await this.repo.compradores(periodo)) };
  }

  async postventa(q: ConsultaRango): Promise<PostventaReporte> {
    const periodo = this.periodo(q);
    return { periodo, ...(await this.repo.postventa(periodo)) };
  }

  async facturacion(q: ConsultaRango): Promise<FacturacionReporte> {
    const periodo = this.periodo(q);
    return { periodo, ...(await this.repo.facturacion(periodo)) };
  }
}

export type { CifrasVenta };
