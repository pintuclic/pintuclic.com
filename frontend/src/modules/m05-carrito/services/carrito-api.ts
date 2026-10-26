import { isAxiosError } from 'axios';
import { apiClient, esRespuestaError } from '@/core/api/apiClient';
import type {
  AgregarLineaRequest,
  Carrito,
  ResumenCarrito,
  Revalidacion,
  RevalidarRequest,
} from '../dtos/m05-carrito.dto';

interface SobreUno<T> {
  success: boolean;
  data: T;
}

const RUTA = '/carrito';

/** C8: el cupón viaja en cada consulta; sin código no se manda el parámetro. */
function conCupon(codigoCupon: string | null): { params?: { codigoCupon: string } } {
  return codigoCupon === null ? {} : { params: { codigoCupon } };
}

/** Llamadas HTTP de M05. La cookie del carrito y la de sesión las envía el navegador (HttpOnly). */
export const carritoApi = {
  consultar: async (codigoCupon: string | null): Promise<Carrito> =>
    (await apiClient.get<SobreUno<Carrito>>(RUTA, conCupon(codigoCupon))).data.data,

  resumen: async (): Promise<ResumenCarrito> =>
    (await apiClient.get<SobreUno<ResumenCarrito>>(`${RUTA}/resumen`)).data.data,

  agregar: async (linea: AgregarLineaRequest): Promise<Carrito> =>
    (await apiClient.post<SobreUno<Carrito>>(`${RUTA}/lineas`, linea)).data.data,

  cambiarCantidad: async (idLinea: number, cantidad: number, codigoCupon: string | null): Promise<Carrito> =>
    (
      await apiClient.patch<SobreUno<Carrito>>(`${RUTA}/lineas/${idLinea}`, {
        cantidad,
        ...(codigoCupon === null ? {} : { codigoCupon }),
      })
    ).data.data,

  quitar: async (idLinea: number, codigoCupon: string | null): Promise<Carrito> =>
    (await apiClient.delete<SobreUno<Carrito>>(`${RUTA}/lineas/${idLinea}`, conCupon(codigoCupon))).data.data,

  revalidar: async (pantalla: RevalidarRequest): Promise<Revalidacion> =>
    (await apiClient.post<SobreUno<Revalidacion>>(`${RUTA}/revalidar`, pantalla)).data.data,

  urlImagen: (idImagen: number): string =>
    `${apiClient.defaults.baseURL ?? '/api/v1'}/catalogo/imagenes/${idImagen}?tamano=miniatura`,
};

/** Prefiere el mensaje del envelope de la API; si no hay uno legible, usa el respaldo. */
export function mensajeDeError(err: unknown, respaldo: string): string {
  if (isAxiosError<unknown>(err)) {
    const cuerpo = err.response?.data;
    return esRespuestaError(cuerpo) ? cuerpo.error.message : respaldo;
  }
  return respaldo;
}
