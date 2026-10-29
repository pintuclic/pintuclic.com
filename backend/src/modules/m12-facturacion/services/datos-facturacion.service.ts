import type { DatosFacturacion, EditarDatosFacturacionRequest } from '../dtos/m12-facturacion.dto';
import type { DatosFacturacionRepositoryPort } from '../interfaces/facturacion.interface';

/** Ficha del vendedor que sale en cada comprobante (M12 · R6). */
export class DatosFacturacionService {
  constructor(private readonly repo: DatosFacturacionRepositoryPort) {}

  obtener(): Promise<DatosFacturacion> {
    return this.repo.obtener();
  }

  guardar(datos: EditarDatosFacturacionRequest, idAutor: number | null): Promise<DatosFacturacion> {
    return this.repo.guardar(datos, idAutor);
  }
}
