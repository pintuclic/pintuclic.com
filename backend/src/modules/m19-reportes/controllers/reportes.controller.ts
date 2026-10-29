import type { Request, Response } from 'express';
import type { ZodType } from 'zod';
import { responderExito } from '../../../core/utils/apiResponse';
import type { AuditoriaPort } from '../../m20-seguridad/interfaces/auditoria.port';
import {
  CODIGOS_ERROR_M19,
  MAXIMO_FILAS_CSV,
  consultaLimiteSchema,
  consultaRangoSchema,
  consultaSerieSchema,
  consultaVentasPorSchema,
  dimensionParamSchema,
} from '../dtos/m19-reportes.dto';
import {
  csvCompradores,
  csvDescuentos,
  csvFacturacion,
  csvPostventa,
  csvResumen,
  csvSerie,
  csvTopClientes,
  csvVentasPor,
} from '../services/exportacion';
import { ReportesError } from '../services/reportes-error';
import type { ReportesService } from '../services/reportes.service';

const ip = (req: Request): string | null => req.ip ?? null;

function validar<T>(res: Response, esquema: ZodType<T>, entrada: unknown): T | null {
  const r = esquema.safeParse(entrada);
  if (r.success) return r.data;
  res.status(400).json({ success: false, error: { code: CODIGOS_ERROR_M19.VALIDATION_ERROR, message: r.error.issues[0]?.message ?? 'Datos de entrada inválidos.' } });
  return null;
}

export class ReportesController {
  constructor(
    private readonly servicio: ReportesService,
    private readonly auditoria?: AuditoriaPort,
  ) {}

  private async responder<Q extends { formato: 'json' | 'csv'; desde?: string | undefined; hasta?: string | undefined }, D extends { periodo: { desde: string; hasta: string } }>(
    req: Request,
    res: Response,
    nombre: string,
    consulta: Q,
    calcular: () => Promise<D>,
    aCsv: (d: D) => string,
  ): Promise<void> {
    try {
      const datos = await calcular();
      if (consulta.formato === 'csv') {
        const csv = aCsv(datos);
        if (csv.split('\r\n').length > MAXIMO_FILAS_CSV + 2) {
          res.status(400).json({ success: false, error: { code: CODIGOS_ERROR_M19.RANGO_INVALIDO, message: 'El reporte tiene demasiadas filas para descargarlo: use un rango más corto.' } });
          return;
        }
        try {
          // R11: quién descargó qué y de qué rango. Un fallo del registro no deshace la descarga (como en M11 y M03).
          await this.auditoria?.registrarAccion?.({
            idUsuario: req.actor?.idUsuario ?? null,
            actor: null,
            accion: `reportes.${nombre}.exportar`,
            entidad: 'reporte',
            idEntidad: nombre,
            valorAnterior: null,
            valorNuevo: `${datos.periodo.desde}..${datos.periodo.hasta}`,
            resultado: 'exito',
            fecha: new Date(),
            ipOrigen: ip(req),
          });
        } catch (error) {
          console.error('[M19] No se pudo auditar la exportación:', error instanceof Error ? error.message : error);
        }
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="reporte-${nombre}-${datos.periodo.desde}_${datos.periodo.hasta}.csv"`);
        res.status(200).send(csv);
        return;
      }
      responderExito(res, datos);
    } catch (error) {
      if (error instanceof ReportesError) {
        if (error.status === 404) {
          res.status(404).json({ success: false, error: { code: error.code, message: error.message } });
          return;
        }
        res.status(error.status).json({ success: false, error: { code: error.code, message: error.message } });
        return;
      }
      throw error;
    }
  }

  resumen = async (req: Request, res: Response): Promise<void> => {
    const q = validar(res, consultaRangoSchema, req.query);
    if (q !== null) await this.responder(req, res, 'resumen', q, () => this.servicio.resumen(q), csvResumen);
  };

  serie = async (req: Request, res: Response): Promise<void> => {
    const q = validar(res, consultaSerieSchema, req.query);
    if (q !== null) await this.responder(req, res, 'serie', q, () => this.servicio.serie(q), csvSerie);
  };

  ventasPor = async (req: Request, res: Response): Promise<void> => {
    const p = validar(res, dimensionParamSchema, req.params);
    const q = validar(res, consultaVentasPorSchema, req.query);
    if (p !== null && q !== null) await this.responder(req, res, `ventas-por-${p.dimension}`, q, () => this.servicio.ventasPor(p.dimension, q), csvVentasPor);
  };

  descuentos = async (req: Request, res: Response): Promise<void> => {
    const q = validar(res, consultaRangoSchema, req.query);
    if (q !== null) await this.responder(req, res, 'descuentos', q, () => this.servicio.descuentos(q), csvDescuentos);
  };

  clientes = async (req: Request, res: Response): Promise<void> => {
    const q = validar(res, consultaLimiteSchema, req.query);
    if (q !== null) await this.responder(req, res, 'clientes', q, () => this.servicio.topClientes(q), csvTopClientes);
  };

  compradores = async (req: Request, res: Response): Promise<void> => {
    const q = validar(res, consultaRangoSchema, req.query);
    if (q !== null) await this.responder(req, res, 'compradores', q, () => this.servicio.compradores(q), csvCompradores);
  };

  postventa = async (req: Request, res: Response): Promise<void> => {
    const q = validar(res, consultaRangoSchema, req.query);
    if (q !== null) await this.responder(req, res, 'postventa', q, () => this.servicio.postventa(q), csvPostventa);
  };

  facturacion = async (req: Request, res: Response): Promise<void> => {
    const q = validar(res, consultaRangoSchema, req.query);
    if (q !== null) await this.responder(req, res, 'facturacion', q, () => this.servicio.facturacion(q), csvFacturacion);
  };
}
