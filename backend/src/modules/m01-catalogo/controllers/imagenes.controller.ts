import type { Request, Response } from 'express';
import { responderExito } from '../../../core/utils/apiResponse';
import {
  cambiarAsociacionImagenRequestSchema,
  subirImagenAsociadaRequestSchema,
  tamanoImagenQuerySchema,
} from '../dtos/m01-catalogo-entrega3.dto';
import { ordenarImagenesRequestSchema, subirImagenRequestSchema } from '../dtos/m01-catalogo-productos.dto';
import type { ImagenesService } from '../services/imagenes.service';
import type { MedidasService } from '../services/medidas.service';
import { leerId, manejar, responderParametroInvalido, validar } from './catalogo-http';

/**
 * Entrega los bytes de una imagen con su tipo; no es JSON. `publico` permite la caché compartida.
 * `inmutable` es para imágenes de producto: nunca se editan en su lugar (reemplazar = subir otra con
 * otro id), así que el navegador puede conservarlas un día en vez de cinco minutos (I7).
 */
export function enviarImagen(
  res: Response,
  imagen: { bytes: Buffer; mimeType: string },
  publico: boolean,
  inmutable = false,
): void {
  res
    .status(200)
    .type(imagen.mimeType)
    .set('Cache-Control', `${publico ? 'public' : 'private'}, max-age=${inmutable ? 86400 : 300}`)
    .send(imagen.bytes);
}

/** HU-CAT-07: galería de imágenes de un producto. */
export class ImagenesController {
  constructor(private readonly servicio: ImagenesService) {}

  private idProducto(req: Request, res: Response): number | null {
    const valor = leerId(req, 'idProducto');
    if (valor === null) responderParametroInvalido(res, 'El identificador del producto no es válido.');
    return valor;
  }

  private idImagen(req: Request, res: Response): number | null {
    const valor = leerId(req, 'idImagen');
    if (valor === null) responderParametroInvalido(res, 'El identificador de la imagen no es válido.');
    return valor;
  }

  listar = manejar(async (req, res) => {
    const id = this.idProducto(req, res);
    if (id === null) return;
    responderExito(res, await this.servicio.listar(id));
  });

  subir = manejar(async (req, res) => {
    const id = this.idProducto(req, res);
    if (id === null) return;
    const datos = validar(res, subirImagenAsociadaRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.servicio.subir(id, datos), 'Imagen agregada', 201);
  });

  cambiarAsociacion = manejar(async (req, res) => {
    const id = this.idImagen(req, res);
    if (id === null) return;
    const datos = validar(res, cambiarAsociacionImagenRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.servicio.cambiarAsociacion(id, datos));
  });

  ordenar = manejar(async (req, res) => {
    const id = this.idProducto(req, res);
    if (id === null) return;
    const datos = validar(res, ordenarImagenesRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.servicio.ordenar(id, datos));
  });

  marcarPrincipal = manejar(async (req, res) => {
    const id = this.idImagen(req, res);
    if (id === null) return;
    responderExito(res, await this.servicio.marcarPrincipal(id));
  });

  eliminar = manejar(async (req, res) => {
    const id = this.idImagen(req, res);
    if (id === null) return;
    await this.servicio.eliminar(id);
    responderExito(res, null, 'Imagen eliminada');
  });

  bytes = manejar(async (req, res) => {
    const id = this.idImagen(req, res);
    if (id === null) return;
    const consulta = validar(res, tamanoImagenQuerySchema, req.query);
    if (consulta === null) return;
    enviarImagen(res, await this.servicio.obtenerBytes(id, consulta.tamano), false);
  });
}

/** HU-CAT-07 (I4): imagen de una medida. */
export class ImagenMedidaController {
  constructor(private readonly servicio: MedidasService) {}

  private id(req: Request, res: Response): number | null {
    const valor = leerId(req, 'idMedida');
    if (valor === null) responderParametroInvalido(res, 'El identificador de la medida no es válido.');
    return valor;
  }

  reemplazar = manejar(async (req, res) => {
    const id = this.id(req, res);
    if (id === null) return;
    const datos = validar(res, subirImagenRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.servicio.reemplazarImagen(id, datos));
  });

  quitar = manejar(async (req, res) => {
    const id = this.id(req, res);
    if (id === null) return;
    responderExito(res, await this.servicio.quitarImagen(id));
  });

  bytes = manejar(async (req, res) => {
    const id = this.id(req, res);
    if (id === null) return;
    enviarImagen(res, await this.servicio.obtenerImagen(id), false);
  });
}
