import { responderExito, responderRecursoNoDisponible } from '../../../core/utils/apiResponse';
import { codigoOrdenParamSchema, editarDatosFacturacionRequestSchema } from '../dtos/m12-facturacion.dto';
import type { ComprobantesService } from '../services/comprobantes.service';
import type { DatosFacturacionService } from '../services/datos-facturacion.service';
import { manejarFacturacion, validar } from './facturacion-http';

export class FacturacionController {
  constructor(
    private readonly comprobantes: ComprobantesService,
    private readonly datos: DatosFacturacionService,
  ) {}

  /** El titular de la orden. */
  miComprobante = manejarFacturacion(async (req, res) => {
    const actor = req.actor;
    if (actor === undefined) {
      responderRecursoNoDisponible(res);
      return;
    }
    const p = validar(res, codigoOrdenParamSchema, req.params);
    if (p === null) return;
    responderExito(res, await this.comprobantes.paraTitular(actor.idUsuario, p.codigoOrden));
  });

  comprobanteDePersonal = manejarFacturacion(async (req, res) => {
    const p = validar(res, codigoOrdenParamSchema, req.params);
    if (p === null) return;
    responderExito(res, await this.comprobantes.paraPersonal(p.codigoOrden));
  });

  reenviar = manejarFacturacion(async (req, res) => {
    const p = validar(res, codigoOrdenParamSchema, req.params);
    if (p === null) return;
    await this.comprobantes.reenviar(p.codigoOrden);
    responderExito(res, { enviado: true as const });
  });

  obtenerDatos = manejarFacturacion(async (_req, res) => {
    responderExito(res, await this.datos.obtener());
  });

  guardarDatos = manejarFacturacion(async (req, res) => {
    const cuerpo = validar(res, editarDatosFacturacionRequestSchema, req.body);
    if (cuerpo === null) return;
    responderExito(res, await this.datos.guardar(cuerpo, req.actor?.idUsuario ?? null));
  });
}
