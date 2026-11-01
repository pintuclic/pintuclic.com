import type {
  EstadoSolicitud,
  EstadoWompi,
  ListarSolicitudesAdminRequest,
  ModoEntrega,
  OrigenSolicitud,
  ResumenPagos,
} from '../dtos/m07-checkout.dto';

/** Un descuento congelado de una línea (lo que pasa a `linea_orden_descuento`). */
export interface DescuentoCongelado {
  ordenAplicacion: number;
  origen: string;
  porcentaje: number | null;
  importe: number;
}

export interface LineaCongelada {
  posicion: number;
  idVariante: number;
  idColor: number | null;
  idCotizacion: number | null;
  nombreProducto: string;
  marca: string | null;
  medida: string | null;
  sku: string | null;
  colorNombre: string | null;
  colorHexadecimal: string | null;
  cantidad: number;
  precioInicial: number;
  precioAplicado: number;
  subtotal: number;
  descuentos: DescuentoCongelado[];
}

export interface IntentoGuardado {
  idIntento: number;
  numero: number;
  referencia: string;
  idTransaccion: string | null;
  estado: EstadoWompi;
  montoCentavos: number;
  celularEnmascarado: string;
  mensaje: string | null;
  ultimaConsulta: Date | null;
  fechaCreacion: Date;
}

/** Lo que se guarda al iniciar el pago (R2 d). */
export interface SolicitudNueva {
  idUsuario: number;
  origen: OrigenSolicitud;
  idCotizacion: number | null;
  modoEntrega: ModoEntrega;
  direccion: string | null;
  costoEntrega: number;
  subTotal: number;
  descuento: number;
  descuentoEventos: number;
  descuentoEmpresa: number;
  totalMercancia: number;
  total: number;
  baseSinImpuesto: number;
  importeIva: number;
  tasaIva: number;
  idCupon: number | null;
  importeCupon: number;
  venceEn: Date;
  /** R17: comprada desde la ficha, sin el carrito. */
  compraDirecta: boolean;
  lineas: LineaCongelada[];
}

export interface SolicitudGuardada extends Omit<SolicitudNueva, 'lineas'> {
  idSolicitud: number;
  codigo: string;
  estado: EstadoSolicitud;
  cuponRegistrado: boolean;
  observaciones: string | null;
  transaccionPagoId: string | null;
  montoPagado: number | null;
  codigoOrden: string | null;
  reintentosOrden: number;
  proximoIntentoOrden: Date | null;
  ultimoError: string | null;
  fechaCreacion: Date;
  lineas: LineaCongelada[];
  /** Ordenados por número. */
  intentos: IntentoGuardado[];
  cliente: { nombre: string; correo: string };
}

/** Campos de la solicitud que el servicio cambia. */
export type CambiosSolicitud = Partial<
  Pick<
    SolicitudGuardada,
    | 'estado'
    | 'cuponRegistrado'
    | 'observaciones'
    | 'transaccionPagoId'
    | 'montoPagado'
    | 'codigoOrden'
    | 'reintentosOrden'
    | 'proximoIntentoOrden'
    | 'ultimoError'
  >
>;

export interface IntentoNuevo {
  numero: number;
  referencia: string;
  montoCentavos: number;
  celularEnmascarado: string;
}

export type CambiosIntento = Partial<Pick<IntentoGuardado, 'estado' | 'idTransaccion' | 'mensaje' | 'ultimaConsulta'>>;

export interface Pagina<T> {
  items: T[];
  pagina: number;
  limite: number;
  total: number;
}

/** R18: la página de pagos del panel con las cifras de todo lo filtrado. */
export interface PaginaPagos<T> extends Pagina<T> {
  resumen: ResumenPagos;
}

export interface CheckoutRepositoryPort {
  /** R2 d: toma el siguiente consecutivo `solicitud` y guarda la solicitud con sus líneas en una transacción. */
  crear(nueva: SolicitudNueva, anio: number): Promise<SolicitudGuardada>;
  buscarPorCodigo(codigo: string): Promise<SolicitudGuardada | null>;
  /** La más reciente del cliente en `en_pago` o `rechazada` (R2 c). */
  abiertaDelUsuario(idUsuario: number): Promise<SolicitudGuardada | null>;
  /** Referencia de un intento → la solicitud a la que pertenece. */
  codigoPorReferencia(referencia: string): Promise<string | null>;
  agregarIntento(idSolicitud: number, intento: IntentoNuevo): Promise<IntentoGuardado>;
  actualizarIntento(idIntento: number, cambios: CambiosIntento): Promise<void>;
  actualizar(idSolicitud: number, cambios: CambiosSolicitud): Promise<void>;
  /**
   * R6: marca el intento aprobado y la solicitud `pagada` (en cola) en una sola transacción. Solo si la
   * solicitud aún no tiene un pago aprobado; devuelve false si otro proceso llegó antes.
   */
  registrarAprobacion(
    idSolicitud: number,
    idIntento: number,
    datos: { transaccionPagoId: string; montoPagado: number; observaciones: string | null; ahora: Date },
  ): Promise<boolean>;
  /** R6: las que esperan crear su orden y ya les toca. */
  pendientesDeOrden(ahora: Date, limite: number): Promise<SolicitudGuardada[]>;
  /** R3, R5: abiertas (`en_pago` o `rechazada`) para revisar su pago o su vencimiento. */
  abiertasParaRevisar(limite: number): Promise<SolicitudGuardada[]>;
  /** R18: filtra por estado, búsqueda, periodo y cliente; el resumen cuenta todo lo filtrado. */
  listar(filtros: ListarSolicitudesAdminRequest): Promise<PaginaPagos<SolicitudGuardada>>;
}
