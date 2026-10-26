/**
 * Tipos de M21 (solo tipos: 0 código en runtime). Los esquemas HTTP están en `dtos/`.
 */
import type { ClienteCotizacion, EstadoCotizacion } from '../dtos/m21-cotizaciones.dto';

/** Copia de la línea del carrito al pedir la cotización (R2). */
export interface DatosLinea {
  readonly idVariante: number;
  readonly idColor: number | null;
  readonly cantidad: number;
  readonly precioReferencia: number;
  readonly nombreProducto: string;
  readonly marca: string | null;
  readonly medida: string | null;
  readonly sku: string | null;
  readonly colorNombre: string | null;
  readonly colorHexadecimal: string | null;
}

export interface LineaGuardada extends DatosLinea {
  readonly idLinea: number;
  readonly precioAcordado: number | null;
}

export interface CotizacionGuardada {
  readonly idCotizacion: number;
  readonly codigo: string;
  readonly idUsuario: number | null;
  readonly estado: EstadoCotizacion;
  readonly fechaCreacion: Date;
  readonly comentarioCliente: string | null;
  readonly notaParaCliente: string | null;
  readonly motivoRechazo: string | null;
  readonly fechaEnvio: Date | null;
  /** AAAA-MM-DD */
  readonly fechaVencimiento: string | null;
  readonly fechaRespuesta: Date | null;
  readonly totalReferencia: number;
  readonly totalAcordado: number | null;
  readonly cliente: ClienteCotizacion | null;
  readonly lineas: readonly LineaGuardada[];
}

export interface NuevaCotizacion {
  readonly idUsuario: number;
  readonly comentario: string | null;
  readonly totalReferencia: number;
  readonly lineas: readonly DatosLinea[];
}

export interface FiltroCotizaciones {
  /** Solo las de este cliente (rutas del cliente). */
  readonly idUsuario?: number;
  readonly estado?: EstadoCotizacion;
  /** Código (COT-000123 o el número) o nombre / correo del cliente. */
  readonly busqueda?: string;
  readonly pagina: number;
  readonly limite: number;
}

export interface AjusteGuardado {
  readonly lineas: ReadonlyArray<{ readonly idLinea: number; readonly cantidad: number; readonly precioAcordado: number | null }>;
  readonly quitar: readonly number[];
  readonly notaParaCliente: string | null;
  readonly fechaVencimiento: string | null;
  readonly totalReferencia: number;
}

/** Lo que cambia al pasar de estado. Solo se aplica si la cotización está en uno de `desde` (atómico). */
export interface CambioEstado {
  readonly estado: EstadoCotizacion;
  readonly fechaEnvio?: Date;
  readonly fechaRespuesta?: Date | null;
  readonly fechaVencimiento?: string;
  readonly idUsuarioResponde?: number;
  readonly totalAcordado?: number;
  readonly motivoRechazo?: string | null;
}

/** Acceso a `cotizacion` y `linea_cotizacion`. */
export interface CotizacionesRepositoryPort {
  crear(nueva: NuevaCotizacion): Promise<number>;
  obtener(idCotizacion: number): Promise<CotizacionGuardada | null>;
  /** Las listas no traen líneas (vienen vacías), pero sí `cantidadLineas`. */
  listar(filtro: FiltroCotizaciones): Promise<{ items: Array<CotizacionGuardada & { cantidadLineas: number }>; total: number }>;
  /** R4: solicitadas, en borrador o enviadas vigentes del cliente. */
  contarAbiertas(idUsuario: number): Promise<number>;
  /** R10: pasa a `vencida` toda `enviada` con vencimiento anterior a `hoy` (AAAA-MM-DD). */
  vencerEnviadas(hoy: string): Promise<number>;
  /** R5: aplica el ajuste solo si sigue en un estado editable. */
  guardarAjuste(idCotizacion: number, desde: readonly EstadoCotizacion[], ajuste: AjusteGuardado): Promise<boolean>;
  cambiarEstado(idCotizacion: number, desde: readonly EstadoCotizacion[], cambio: CambioEstado): Promise<boolean>;
}
