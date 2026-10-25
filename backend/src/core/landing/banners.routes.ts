import { Router, type Request, type RequestHandler, type Response } from 'express';
import { ZodError } from 'zod';
import type { AutorizacionService } from '../../modules/m20-seguridad/services/autorizacion.service';
import { requirePermission } from '../middlewares/autorizacion.middleware';
import { responderExito, responderRecursoNoDisponible } from '../utils/apiResponse';
import {
  CODIGOS_ERROR_LANDING,
  PERMISOS_LANDING_BANNERS,
  cambiarEstadoBannerInicioRequestSchema,
  crearBannerInicioRequestSchema,
  editarBannerInicioRequestSchema,
} from './fp01-landing.dto';
import {
  PrismaBannersInicioRepository,
  type BannersInicioRepositoryPort,
} from './banners.repository';
import { BannersInicioService, LandingBannerError } from './banners.service';

function parsearId(req: Request, nombre: string): number {
  const raw = req.params[nombre];
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
    throw new LandingBannerError(
      CODIGOS_ERROR_LANDING.RECURSO_NO_DISPONIBLE,
      'El recurso solicitado no está disponible.',
      404,
    );
  }
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n <= 0) {
    throw new LandingBannerError(
      CODIGOS_ERROR_LANDING.RECURSO_NO_DISPONIBLE,
      'El recurso solicitado no está disponible.',
      404,
    );
  }
  return n;
}

function manejarError(res: Response, error: unknown): void {
  if (error instanceof ZodError) {
    const mensaje = error.issues[0]?.message ?? 'Datos de entrada inválidos.';
    res.status(400).json({
      success: false,
      error: {
        code: CODIGOS_ERROR_LANDING.VALIDATION_ERROR,
        message: mensaje,
      },
    });
    return;
  }
  if (error instanceof LandingBannerError) {
    if (error.statusCode === 404) {
      responderRecursoNoDisponible(res);
      return;
    }
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Error interno al procesar los banners de inicio.',
    },
  });
}

export interface RutasLandingBanners {
  publicRouter: Router;
  adminRouter: Router;
  service: BannersInicioService;
}

export function construirRutasLandingBanners(
  autorizacionService: Pick<AutorizacionService, 'exigirPermiso'>,
  repositorio: BannersInicioRepositoryPort = new PrismaBannersInicioRepository(),
): RutasLandingBanners {
  const service = new BannersInicioService(repositorio);
  const exigirVer = requirePermission(
    autorizacionService as AutorizacionService,
    PERMISOS_LANDING_BANNERS.ver,
  ) as RequestHandler;
  const exigirEditar = requirePermission(
    autorizacionService as AutorizacionService,
    PERMISOS_LANDING_BANNERS.editar,
  ) as RequestHandler;

  const publicRouter = Router();

  publicRouter.get('/banners', async (_req: Request, res: Response) => {
    try {
      const lista = await service.listarPublicos();
      responderExito(res, lista);
    } catch (error) {
      manejarError(res, error);
    }
  });

  publicRouter.get('/banners/:id/imagen', async (req: Request, res: Response) => {
    try {
      const id = parsearId(req, 'id');
      const img = await service.obtenerImagen(id);
      res.setHeader('Content-Type', img.mimeType);
      res.setHeader('Cache-Control', 'no-cache');
      res.status(200).send(img.bytes);
    } catch (error) {
      manejarError(res, error);
    }
  });

  const adminRouter = Router();

  adminRouter.get('/banners', exigirVer, async (_req: Request, res: Response) => {
    try {
      const lista = await service.listarAdmin();
      responderExito(res, lista);
    } catch (error) {
      manejarError(res, error);
    }
  });

  adminRouter.post('/banners', exigirEditar, async (req: Request, res: Response) => {
    try {
      const body = crearBannerInicioRequestSchema.parse(req.body);
      const idAutor = req.actor?.idUsuario ?? 1;
      const creado = await service.crear(body, idAutor);
      responderExito(res, creado, undefined, 201);
    } catch (error) {
      manejarError(res, error);
    }
  });

  adminRouter.put('/banners/:id', exigirEditar, async (req: Request, res: Response) => {
    try {
      const id = parsearId(req, 'id');
      const body = editarBannerInicioRequestSchema.parse(req.body);
      const idAutor = req.actor?.idUsuario ?? 1;
      const actualizado = await service.editar(id, body, idAutor);
      responderExito(res, actualizado);
    } catch (error) {
      manejarError(res, error);
    }
  });

  adminRouter.patch('/banners/:id/estado', exigirEditar, async (req: Request, res: Response) => {
    try {
      const id = parsearId(req, 'id');
      const body = cambiarEstadoBannerInicioRequestSchema.parse(req.body);
      const idAutor = req.actor?.idUsuario ?? 1;
      const actualizado = await service.cambiarEstado(id, body.estado, idAutor);
      responderExito(res, actualizado);
    } catch (error) {
      manejarError(res, error);
    }
  });

  adminRouter.delete('/banners/:id', exigirEditar, async (req: Request, res: Response) => {
    try {
      const id = parsearId(req, 'id');
      await service.eliminar(id);
      responderExito(res, { eliminado: true });
    } catch (error) {
      manejarError(res, error);
    }
  });

  return { publicRouter, adminRouter, service };
}
