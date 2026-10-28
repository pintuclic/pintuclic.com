import { CreacionOrdenError, type CreacionService } from '../../m08-ordenes/services/creacion.service';
import type { SolicitudPagadaInput } from '../../m08-ordenes/dtos/m08-ordenes.dto';
import type { OrdenesCheckoutPort } from '../dtos/m07-checkout.dto';
import { OrdenDefinitivaError } from '../services/checkout-error';

/**
 * P4: la creación interna de M08 (`crearDesdePagoConfirmado`, sin HTTP). Sus errores de validación, pago o
 * conflicto no se arreglan reintentando: van a revisión (R6). Cualquier otro (base ocupada, red) se reintenta.
 */
export class OrdenesM08Adapter implements OrdenesCheckoutPort {
  constructor(private readonly creacion: Pick<CreacionService, 'crearDesdePagoConfirmado'>) {}

  async crearDesdePagoConfirmado(entrada: SolicitudPagadaInput): Promise<{ codigo: string; creada: boolean }> {
    try {
      const r = await this.creacion.crearDesdePagoConfirmado(entrada);
      return { codigo: r.codigo, creada: r.creada };
    } catch (error) {
      if (error instanceof CreacionOrdenError) throw new OrdenDefinitivaError(`${error.codigo}: ${error.message}`);
      throw error;
    }
  }
}
