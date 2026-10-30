import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { responderExito, responderRecursoNoDisponible } from '../../../core/utils/apiResponse';
import type { AuditoriaPort } from '../../m20-seguridad/interfaces/auditoria.port';
import { CODIGOS_ERROR_M10, codigoOrdenParamsSchema } from '../dtos/m10-entrega.dto';
import { EnvioError } from '../services/envio.error';
import type { EnviosService } from '../services/envios.service';

const resumen = (valor: string): Buffer => createHash('sha256').update(valor).digest();

function error(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ success: false, error: { code, message, details: null } });
}

/** Traduce los errores de dominio; lo que no lo es se relanza para el manejador global (500 opaco). */
function manejar(fn: (req: Request, res: Response) => Promise<void>): (req: Request, res: Response) => Promise<void> {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (e: unknown) {
      if (e instanceof EnvioError) {
        if (e.codigo === CODIGOS_ERROR_M10.RECURSO_NO_DISPONIBLE) responderRecursoNoDisponible(res);
        else error(res, e.statusCode, e.codigo, e.message);
        return;
      }
      throw e;
    }
  };
}

export class EnviosController {
  constructor(
    private readonly envios: EnviosService,
    private readonly auditoria?: AuditoriaPort,
    private readonly tokenWebhook?: string,
  ) {}

  /** R5: el cliente ve el envío de su pedido. */
  delCliente = manejar(async (req, res) => {
    const actor = req.actor;
    const params = codigoOrdenParamsSchema.safeParse(req.params);
    if (actor === undefined || !params.success) {
      responderRecursoNoDisponible(res);
      return;
    }
    responderExito(res, await this.envios.paraCliente(actor.idUsuario, params.data.codigo));
  });

  delPersonal = manejar(async (req, res) => {
    const params = codigoOrdenParamsSchema.safeParse(req.params);
    if (!params.success) {
      responderRecursoNoDisponible(res);
      return;
    }
    responderExito(res, await this.envios.paraPersonal(params.data.codigo));
  });

  /** R4 y R9: reintenta o crea a mano; se audita. */
  reintentar = manejar(async (req, res) => {
    const params = codigoOrdenParamsSchema.safeParse(req.params);
    if (!params.success) {
      responderRecursoNoDisponible(res);
      return;
    }
    const envio = await this.envios.reintentar(params.data.codigo);
    try {
      await this.auditoria?.registrarAccion?.({
        idUsuario: req.actor?.idUsuario ?? null,
        actor: null,
        accion: 'ventas.envio.reintentar',
        entidad: 'envio_orden',
        idEntidad: params.data.codigo,
        valorAnterior: null,
        valorNuevo: envio.estado,
        resultado: 'exito',
        fecha: new Date(),
        ipOrigen: req.ip ?? null,
      });
    } catch {
      // La auditoría no deshace el reintento (M03 · A4).
    }
    responderExito(res, envio);
  });

  /** R7: el proveedor reporta cambios. Sin sesión; la identidad es el token compartido. */
  webhook = manejar(async (req, res) => {
    if (!this.tokenWebhook) {
      error(res, 503, CODIGOS_ERROR_M10.PROVEEDOR_NO_CONFIGURADO, 'El servicio de envíos no está configurado.');
      return;
    }
    const recibido = /^Bearer (.+)$/.exec(req.header('authorization') ?? '')?.[1] ?? '';
    if (!timingSafeEqual(resumen(recibido), resumen(this.tokenWebhook))) {
      error(res, 401, 'NO_AUTORIZADO', 'Credenciales inválidas.');
      return;
    }
    const proveedor = typeof req.params.proveedor === 'string' ? req.params.proveedor : '';
    responderExito(res, await this.envios.procesarWebhook(proveedor, req.body));
  });
}
