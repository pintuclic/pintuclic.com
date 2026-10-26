import {
  agregarLineaRequestSchema,
  cambiarCantidadRequestSchema,
  consultarCarritoRequestSchema,
  idLineaParamsSchema,
  quitarLineaRequestSchema,
  revalidarRequestSchema,
} from '../dtos/m05-carrito.dto';
import type { CarritoService } from '../services/carrito.service';
import { aplicarCookie, manejar, responderExito, solicitante, validar } from './carrito-http';

/** HTTP de M05: valida con Zod `query`, `params` y `body`, y delega en el servicio. */
export class CarritoController {
  constructor(private readonly carrito: CarritoService) {}

  consultar = manejar(async (req, res) => {
    const q = validar(res, consultarCarritoRequestSchema, req.query);
    if (q === null) return;
    const r = await this.carrito.consultar(solicitante(req), q.codigoCupon);
    aplicarCookie(res, r.cookie);
    responderExito(res, r.datos);
  });

  resumen = manejar(async (req, res) => {
    const r = await this.carrito.resumen(solicitante(req));
    aplicarCookie(res, r.cookie);
    responderExito(res, r.datos);
  });

  agregar = manejar(async (req, res) => {
    const datos = validar(res, agregarLineaRequestSchema, req.body);
    if (datos === null) return;
    const r = await this.carrito.agregar(solicitante(req), datos);
    aplicarCookie(res, r.cookie);
    responderExito(res, r.datos);
  });

  cambiarCantidad = manejar(async (req, res) => {
    const params = validar(res, idLineaParamsSchema, req.params);
    if (params === null) return;
    const datos = validar(res, cambiarCantidadRequestSchema, req.body);
    if (datos === null) return;
    const r = await this.carrito.cambiarCantidad(solicitante(req), params.idLinea, datos);
    aplicarCookie(res, r.cookie);
    responderExito(res, r.datos);
  });

  quitar = manejar(async (req, res) => {
    const params = validar(res, idLineaParamsSchema, req.params);
    if (params === null) return;
    const q = validar(res, quitarLineaRequestSchema, req.query);
    if (q === null) return;
    const r = await this.carrito.quitar(solicitante(req), params.idLinea, q.codigoCupon);
    aplicarCookie(res, r.cookie);
    responderExito(res, r.datos);
  });

  revalidar = manejar(async (req, res) => {
    const datos = validar(res, revalidarRequestSchema, req.body);
    if (datos === null) return;
    const r = await this.carrito.revalidar(solicitante(req), datos);
    aplicarCookie(res, r.cookie);
    responderExito(res, r.datos);
  });
}
