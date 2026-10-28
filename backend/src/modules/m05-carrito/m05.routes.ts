import { Router } from 'express';
import { construirSesionOpcional } from '../m06-precios/middlewares/sesion-opcional';
import type { SesionService } from '../m20-seguridad/services/sesion.service';
import { CarritoController } from './controllers/carrito.controller';
import type { CatalogoCarritoPort, ParametrosCarritoPort, PreciosCarritoPort } from './dtos/m05-carrito.dto';
import type { CarritoRepositoryPort } from './interfaces/carrito.interface';
import { CarritoRepository } from './repositories/carrito.repository';
import { CarritoService } from './services/carrito.service';

export interface DependenciasM05 {
  /** M20: la sesión es opcional; solo dice de quién es el carrito (C1). */
  sesiones: SesionService;
  /** M06: cálculo de precios y descuentos (C7, D8). */
  precios: PreciosCarritoPort;
  /** M01: datos de la línea, vendible, disponibilidad y tope de combo. */
  catalogo: CatalogoCarritoPort;
  /** M17: días de vigencia del carrito de visitante (C13). */
  parametros?: ParametrosCarritoPort;
  /** Solo pruebas. */
  repo?: CarritoRepositoryPort;
  reloj?: () => Date;
}

export interface ModuloM05 {
  /** Montar en `/api/v1/carrito`. Público, con sesión opcional. */
  publicRouter: Router;
  carrito: CarritoService;
}

export function construirModuloM05(dep: DependenciasM05): ModuloM05 {
  const carrito = new CarritoService({
    repo: dep.repo ?? new CarritoRepository(),
    precios: dep.precios,
    catalogo: dep.catalogo,
    ...(dep.parametros === undefined ? {} : { parametros: dep.parametros }),
    ...(dep.reloj === undefined ? {} : { reloj: dep.reloj }),
  });
  const c = new CarritoController(carrito);
  const sesionOpcional = construirSesionOpcional(dep.sesiones);

  const publicRouter = Router();
  publicRouter.use(sesionOpcional);
  publicRouter.get('/', c.consultar);
  publicRouter.get('/resumen', c.resumen);
  publicRouter.post('/lineas', c.agregar);
  publicRouter.patch('/lineas/:idLinea', c.cambiarCantidad);
  publicRouter.delete('/lineas/:idLinea', c.quitar);
  publicRouter.post('/revalidar', c.revalidar);

  return { publicRouter, carrito };
}
