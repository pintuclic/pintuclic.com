import { responderExito } from '../../../core/utils/apiResponse';
import {
  exportarMedicionRequestSchema,
  registrarMedicionRequestSchema,
  resumenMedicionRequestSchema,
  serieMedicionRequestSchema,
} from '../dtos/m14-patrocinios.dto';
import { BOM_UTF8, decimalCsv, filaCsv } from '../services/csv';
import { esRobot, origenDe, type LimitadorPorMinuto } from '../services/limitador';
import type { MedicionService } from '../services/medicion.service';
import { manejar, validar } from './patrocinios-http';

const ENCABEZADO_CSV = ['fecha', 'tipo', 'id', 'nombre', 'lugar', 'impresiones', 'clics', 'ctr_porcentaje'];

/** M14 · medición: el aviso de la pantalla (público) y el informe del panel. */
export class MedicionController {
  constructor(
    private readonly medicion: MedicionService,
    private readonly limitador: LimitadorPorMinuto,
  ) {}

  /**
   * Público (M3-M6): siempre 204 para un aviso bien formado, se haya contado o no. Los robots y los orígenes que pasan
   * del tope por minuto se ignoran sin avisarles. No se lee ni se guarda quién envía el aviso (C2).
   */
  registrar = manejar(async (req, res) => {
    const datos = validar(res, registrarMedicionRequestSchema, req.body);
    if (datos === null) return;
    const cuenta = !esRobot(req.get('user-agent')) && this.limitador.permitir(origenDe(req.ip, req.get('x-forwarded-for')), datos.eventos.length);
    if (cuenta) await this.medicion.registrar(datos.eventos);
    res.status(204).end();
  });

  resumen = manejar(async (req, res) => {
    const query = validar(res, resumenMedicionRequestSchema, req.query);
    if (query === null) return;
    responderExito(res, await this.medicion.resumen(query));
  });

  serie = manejar(async (req, res) => {
    const query = validar(res, serieMedicionRequestSchema, req.query);
    if (query === null) return;
    responderExito(res, await this.medicion.serie(query));
  });

  /** M8: CSV con «;» y UTF-8 con BOM, para abrirlo en Excel. */
  exportar = manejar(async (req, res) => {
    const query = validar(res, exportarMedicionRequestSchema, req.query);
    if (query === null) return;
    const { desde, hasta, filas } = await this.medicion.filasDiarias(query);
    const lineas = [
      filaCsv(ENCABEZADO_CSV),
      ...filas.map((f) =>
        filaCsv([f.fecha, f.entidad === 'campania' ? 'campaña' : 'anuncio', f.id, f.nombre, f.lugar, f.impresiones, f.clics, decimalCsv(f.ctr)]),
      ),
    ];
    res
      .status(200)
      .type('text/csv; charset=utf-8')
      .set('Content-Disposition', `attachment; filename="medicion-patrocinios-${desde}_${hasta}.csv"`)
      .set('Cache-Control', 'no-store')
      .send(`${BOM_UTF8}${lineas.join('\r\n')}\r\n`);
  });
}
