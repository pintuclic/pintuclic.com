import type { EstadoOrden, ModoEntrega, OrigenOrden } from '../dtos/m08-ordenes.dto';

export interface FilaResumenOrden {
  codigo: string;
  fecha: Date;
  total: number;
  estado: EstadoOrden;
  modoEntrega: ModoEntrega | null;
}

export interface FiltroMisPedidos {
  /** Texto libre: código de la orden o nombre de un producto comprado. */
  q?: string;
  pagina: number;
  limite: number;
}

export interface DescuentoLineaDatos {
  ordenAplicacion: number;
  origen: string;
  porcentaje: number | null;
  importe: number;
}

export interface LineaOrdenDatos {
  nombreProducto: string;
  varianteCopia: string;
  colorSolicitado: string | null;
  skuVendido: string | null;
  cantidad: number;
  precioInicial: number | null;
  precioAplicado: number;
  idVarianteRef: number | null;
  descuentos: DescuentoLineaDatos[];
}

export interface HistorialClienteDatos {
  estadoAnterior: EstadoOrden | null;
  estadoNuevo: EstadoOrden;
  fecha: Date;
}

/** Orden completa tal como se guardó, con el titular para decidir el acceso. */
export interface DetalleOrdenDatos extends FilaResumenOrden {
  idUsuario: number;
  origen: OrigenOrden;
  subTotal: number;
  descuento: number;
  costoEntrega: number;
  baseSinImpuesto: number | null;
  importeIva: number | null;
  tasaIva: number | null;
  lineas: LineaOrdenDatos[];
  historial: HistorialClienteDatos[];
}

export interface ConsultaClienteRepository {
  /** Órdenes del cliente, de la más reciente a la más antigua. */
  listarPorUsuario(idUsuario: number, filtro: FiltroMisPedidos): Promise<{ filas: FilaResumenOrden[]; total: number }>;
  buscarDetalle(codigo: string): Promise<DetalleOrdenDatos | null>;
}

/** D6 del contrato: lectura de solo existencia sobre `id_variante_ref`; no modifica M01. */
export interface CatalogoDisponibilidadPort {
  /** Las variantes que siguen en el catálogo, cada una con el id de su producto (para enlazar a su ficha). */
  variantesDisponibles(idsVariante: number[]): Promise<Map<number, number>>;
}
