import type { Request, Response } from 'express';
import { responderExito } from '../../../core/utils/apiResponse';
import { cargarProductosRequestSchema } from '../dtos/m01-catalogo-carga-masiva.dto';
import type { CatalogosPlantillaPort } from '../repositories/plantilla-productos.repository';
import type { CargaProductosService } from '../services/carga-productos.service';
import { construirPlantillaProductos } from '../services/plantilla-productos';
import { manejar, validar } from './catalogo-http';

const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Carga masiva de productos (contrato `m01-catalogo-carga-masiva`). */
export class CargaProductosController {
  constructor(
    private readonly catalogos: CatalogosPlantillaPort,
    private readonly servicio: CargaProductosService,
  ) {}

  /** D3: la plantilla se arma con los catálogos de hoy. Binaria, sin el envelope JSON. */
  plantilla = manejar(async (_req: Request, res: Response): Promise<void> => {
    const libro = await construirPlantillaProductos(await this.catalogos.leer());
    res.setHeader('Content-Type', TIPO_XLSX);
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla-productos.xlsx"');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(libro);
  });

  /** C7: no escribe nada; lista los productos que se crearían y los errores por fila. */
  previsualizar = manejar(async (req: Request, res: Response): Promise<void> => {
    const peticion = validar(res, cargarProductosRequestSchema, req.body);
    if (peticion === null) return;
    responderExito(res, await this.servicio.previsualizar(peticion));
  });

  aplicar = manejar(async (req: Request, res: Response): Promise<void> => {
    const peticion = validar(res, cargarProductosRequestSchema, req.body);
    if (peticion === null) return;
    responderExito(res, await this.servicio.aplicar(peticion), 'Carga aplicada');
  });
}
