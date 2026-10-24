import { responderExito } from '../../../core/utils/apiResponse';
import {
  listarColoresProductoRequestSchema,
  listarProductosPublicosRequestSchema,
} from '../dtos/m01-catalogo-productos.dto';
import type { ConsultaPublicaService } from '../services/consulta-publica.service';
import { leerId, manejar, responderParametroInvalido, validar } from './catalogo-http';
import { responderPagina } from './catalogos.controller';
import { responderColores } from './productos.controller';

/** Consulta pública del catálogo: sin sesión, solo lectura. */
export class ConsultaPublicaController {
  constructor(private readonly servicio: ConsultaPublicaService) {}

  categorias = manejar(async (_req, res) => {
    responderExito(res, await this.servicio.categorias());
  });

  filtros = manejar(async (_req, res) => {
    responderExito(res, await this.servicio.filtros());
  });

  listar = manejar(async (req, res) => {
    const query = validar(res, listarProductosPublicosRequestSchema, req.query);
    if (query === null) return;
    responderPagina(res, await this.servicio.listar(query), query.pagina, query.limite);
  });

  ficha = manejar(async (req, res) => {
    const id = leerId(req, 'idProducto');
    if (id === null) {
      responderParametroInvalido(res, 'El identificador del producto no es válido.');
      return;
    }
    responderExito(res, await this.servicio.ficha(id));
  });

  colores = manejar(async (req, res) => {
    const id = leerId(req, 'idProducto');
    if (id === null) {
      responderParametroInvalido(res, 'El identificador del producto no es válido.');
      return;
    }
    const query = validar(res, listarColoresProductoRequestSchema, req.query);
    if (query === null) return;
    responderColores(res, await this.servicio.colores(id, query), query.pagina, query.limite);
  });

  logotipo = manejar(async (req, res) => {
    const id = leerId(req, 'idMarca');
    if (id === null) {
      responderParametroInvalido(res, 'El identificador de la marca no es válido.');
      return;
    }
    const { bytes, mimeType } = await this.servicio.logotipo(id);
    res.status(200).type(mimeType).set('Cache-Control', 'public, max-age=300').send(bytes);
  });
}
