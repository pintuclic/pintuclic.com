import { isAxiosError } from 'axios';
import { apiClient, esRespuestaError } from '@/core/api/apiClient';
import { revalidacionSchema, type Revalidacion } from '@/modules/m05-carrito/dtos/m05-carrito.dto';
import type {
  CompraDirecta,
  CrearSolicitudRequest,
  EstadoSolicitud,
  PrepararCheckout,
  ReintentarPagoRequest,
  ResumenPagos,
  Solicitud,
  SolicitudAdmin,
} from '../dtos/m07-checkout.dto';

interface SobreUno<T> {
  success: boolean;
  data: T;
}

interface SobrePagina {
  success: boolean;
  data: SolicitudAdmin[];
  pagination: { pagina: number; limite: number; total: number; totalPaginas: number };
  resumen: ResumenPagos;
}

export interface PaginaSolicitudes {
  items: SolicitudAdmin[];
  pagina: number;
  totalPaginas: number;
  total: number;
  /** R18: cifras de todo lo filtrado, no solo de esta página. */
  resumen: ResumenPagos;
}

export interface FiltroPagos {
  estado: EstadoSolicitud | null;
  pagina: number;
  busqueda: string;
  /** R18: días de Colombia `AAAA-MM-DD`, ambos incluidos; null = sin límite. */
  desde?: string | null;
  hasta?: string | null;
  idCliente?: number | null;
  limite?: number;
}

/** Rutas del cliente (`/checkout`) y del panel (`/admin/pagos`). La sesión viaja en cookie HttpOnly. */
export const checkoutApi = {
  /** Con `directa`, solo esa línea de la ficha (R17); si no, el carrito con su cupón. */
  preparar: async (codigoCupon: string | null, directa: CompraDirecta | null = null): Promise<PrepararCheckout> =>
    (
      await apiClient.get<SobreUno<PrepararCheckout>>('/checkout/preparar', {
        params:
          directa !== null
            ? {
                idVariante: directa.idVariante,
                cantidad: directa.cantidad,
                ...(directa.idColor === null ? {} : { idColor: directa.idColor }),
              }
            : codigoCupon === null
              ? {}
              : { codigoCupon },
      })
    ).data.data,

  crear: async (cuerpo: CrearSolicitudRequest): Promise<Solicitud> =>
    (await apiClient.post<SobreUno<Solicitud>>('/checkout/solicitudes', cuerpo)).data.data,

  obtener: async (codigo: string): Promise<Solicitud> =>
    (await apiClient.get<SobreUno<Solicitud>>(`/checkout/solicitudes/${encodeURIComponent(codigo)}`)).data.data,

  reintentar: async (codigo: string, cuerpo: ReintentarPagoRequest): Promise<Solicitud> =>
    (await apiClient.post<SobreUno<Solicitud>>(`/checkout/solicitudes/${encodeURIComponent(codigo)}/reintentar`, cuerpo)).data
      .data,

  cancelar: async (codigo: string): Promise<Solicitud> =>
    (await apiClient.post<SobreUno<Solicitud>>(`/checkout/solicitudes/${encodeURIComponent(codigo)}/cancelar`)).data.data,

  listarAdmin: async (f: FiltroPagos): Promise<PaginaSolicitudes> => {
    const s = (
      await apiClient.get<SobrePagina>('/admin/pagos', {
        params: {
          pagina: f.pagina,
          limite: f.limite ?? 20,
          ...(f.estado === null ? {} : { estado: f.estado }),
          ...(f.busqueda.trim() === '' ? {} : { busqueda: f.busqueda.trim() }),
          ...(f.desde == null ? {} : { desde: f.desde }),
          ...(f.hasta == null ? {} : { hasta: f.hasta }),
          ...(f.idCliente == null ? {} : { idCliente: f.idCliente }),
        },
      })
    ).data;
    return {
      items: s.data,
      pagina: s.pagination.pagina,
      totalPaginas: s.pagination.totalPaginas,
      total: s.pagination.total,
      resumen: s.resumen,
    };
  },

  obtenerAdmin: async (codigo: string): Promise<SolicitudAdmin> =>
    (await apiClient.get<SobreUno<SolicitudAdmin>>(`/admin/pagos/${encodeURIComponent(codigo)}`)).data.data,

  consultarWompi: async (codigo: string): Promise<SolicitudAdmin> =>
    (await apiClient.post<SobreUno<SolicitudAdmin>>(`/admin/pagos/${encodeURIComponent(codigo)}/consultar-wompi`)).data.data,

  reintentarOrden: async (codigo: string): Promise<SolicitudAdmin> =>
    (await apiClient.post<SobreUno<SolicitudAdmin>>(`/admin/pagos/${encodeURIComponent(codigo)}/reintentar-orden`)).data.data,
};

/** Prefiere el mensaje del envelope de la API; si no hay uno legible, usa el respaldo. */
export function mensajeDeError(err: unknown, respaldo: string): string {
  if (isAxiosError<unknown>(err) && esRespuestaError(err.response?.data)) return err.response.data.error.message;
  return respaldo;
}

/** El código del error del envelope, si lo hay. */
export function codigoDeError(err: unknown): string | null {
  if (isAxiosError<unknown>(err) && esRespuestaError(err.response?.data)) return err.response.data.error.code;
  return null;
}

function detalles(err: unknown): unknown {
  if (!isAxiosError<unknown>(err)) return null;
  const cuerpo = err.response?.data;
  if (typeof cuerpo !== 'object' || cuerpo === null || !('error' in cuerpo)) return null;
  const error = (cuerpo as { error: unknown }).error;
  return typeof error === 'object' && error !== null && 'details' in error ? (error as { details: unknown }).details : null;
}

/** R2 a: con CARRITO_CAMBIO la API manda la revalidación para mostrar qué cambió. */
export function revalidacionDeError(err: unknown): Revalidacion | null {
  if (codigoDeError(err) !== 'CARRITO_CAMBIO') return null;
  const r = revalidacionSchema.safeParse(detalles(err));
  return r.success ? r.data : null;
}

/** R2 c: con PAGO_EN_CURSO la API manda el código de la compra que sigue en Nequi. */
export function pagoEnCursoDeError(err: unknown): string | null {
  if (codigoDeError(err) !== 'PAGO_EN_CURSO') return null;
  const d = detalles(err);
  return typeof d === 'object' && d !== null && 'codigo' in d && typeof d.codigo === 'string' ? d.codigo : null;
}

/** 401: hace falta iniciar sesión. */
export function requiereSesion(err: unknown): boolean {
  return isAxiosError(err) && err.response?.status === 401;
}
