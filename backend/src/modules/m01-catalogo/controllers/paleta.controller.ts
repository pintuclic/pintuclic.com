import { responderExito } from '../../../core/utils/apiResponse';
import { armoniasParamsSchema, listarPaletaRequestSchema } from '../dtos/m01-catalogo-paleta.dto';
import type { PaletaService } from '../services/paleta.service';
import { manejar, validar } from './catalogo-http';

/** Paleta de color (público, sin sesión, solo lectura; contrato M01 · entrega 4). */
export class PaletaController {
  constructor(private readonly servicio: PaletaService) {}

  listar = manejar(async (req, res) => {
    const query = validar(res, listarPaletaRequestSchema, req.query);
    if (query === null) return;
    const r = await this.servicio.listar(query);
    res.status(200).json({
      success: true,
      data: { colores: r.colores, familias: r.familias, marcas: r.marcas },
      pagination: {
        pagina: query.pagina,
        limite: query.limite,
        total: r.total,
        totalPaginas: Math.ceil(r.total / query.limite),
      },
    });
  });

  armonias = manejar(async (req, res) => {
    const params = validar(res, armoniasParamsSchema, req.params);
    if (params === null) return;
    responderExito(res, await this.servicio.armonias(params.idColor));
  });
}
