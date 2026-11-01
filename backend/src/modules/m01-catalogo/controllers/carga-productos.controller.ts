import type { Request, Response } from 'express';
import type { CatalogosPlantillaPort } from '../repositories/plantilla-productos.repository';
import { construirPlantillaProductos } from '../services/plantilla-productos';
import { manejar } from './catalogo-http';

const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Carga masiva de productos (contrato `m01-catalogo-carga-masiva`). */
export class CargaProductosController {
  constructor(private readonly catalogos: CatalogosPlantillaPort) {}

  /** D3: la plantilla se arma con los catálogos de hoy. Binaria, sin el envelope JSON. */
  plantilla = manejar(async (_req: Request, res: Response): Promise<void> => {
    const libro = await construirPlantillaProductos(await this.catalogos.leer());
    res.setHeader('Content-Type', TIPO_XLSX);
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla-productos.xlsx"');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(libro);
  });
}
