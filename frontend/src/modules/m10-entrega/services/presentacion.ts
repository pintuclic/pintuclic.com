import type { EstadoEnvio } from '../dtos/m10-entrega.dto';

export const ETIQUETA_ESTADO_ENVIO: Record<EstadoEnvio, string> = {
  pendiente: 'Pendiente de crear',
  creado: 'Despachado',
  en_transito: 'En camino',
  con_novedad: 'Con novedad',
  entregado: 'Entregado',
  fallido: 'Fallido',
};

/** «envio_propio» → «Entrega propia»; cualquier otro proveedor se muestra tal cual. */
export function nombreProveedor(proveedor: string): string {
  return proveedor === 'envio_propio' ? 'Entrega propia de la tienda' : proveedor;
}
