import type { Request, Response } from 'express';
import { responderExito } from '../../../core/utils/apiResponse';
import {
  actualizarAnuncioRequestSchema,
  anunciosEspacioParamsSchema,
  cambiarEstadoRequestSchema,
  crearAnuncioRequestSchema,
  imagenAnuncioQuerySchema,
  listarAnunciosRequestSchema,
} from '../dtos/m14-patrocinios.dto';
import type { ImagenBytes } from '../interfaces/patrocinios.interface';
import type { AnunciosService } from '../services/anuncios.service';
import { esRobot, origenDe, type LimitadorPorMinuto } from '../services/limitador';
import { errores } from '../services/patrocinios-error';
import { leerId, manejar, responderParametroInvalido, validar } from './patrocinios-http';

function responderPagina<T>(res: Response, items: T[], total: number, pagina: number, limite: number): void {
  res.status(200).json({
    success: true,
    data: items,
    pagination: { pagina, limite, total, totalPaginas: Math.ceil(total / limite) },
  });
}

/** El usuario sale de la sesión verificada en el servidor; nunca del cuerpo (Anti-IDOR). */
function idUsuarioDe(req: Request): number {
  if (req.actor === undefined) throw errores.noDisponible();
  return req.actor.idUsuario;
}

/**
 * Las imágenes son de contenido subido por el personal: `nosniff` impide que el navegador las trate como otra cosa y
 * la política de contenido bloquea cualquier script aunque alguien abriera la dirección directamente.
 */
function enviarImagen(res: Response, imagen: ImagenBytes, cache: string): void {
  res
    .status(200)
    .type(imagen.mimeType)
    .set({
      'Cache-Control': cache,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    })
    .send(imagen.bytes);
}

/** M14 · espacios publicitarios: administración de anuncios, entrega pública del slider, imágenes y clic. */
export class AnunciosController {
  constructor(
    private readonly anuncios: AnunciosService,
    private readonly limitador: LimitadorPorMinuto,
  ) {}

  private id(req: Request, res: Response): number | null {
    const id = leerId(req, 'idAnuncio');
    if (id === null) responderParametroInvalido(res, 'El identificador no es válido.');
    return id;
  }

  listar = manejar(async (req, res) => {
    const query = validar(res, listarAnunciosRequestSchema, req.query);
    if (query === null) return;
    const p = await this.anuncios.listar(query);
    responderPagina(res, p.items, p.total, query.pagina, query.limite);
  });

  obtener = manejar(async (req, res) => {
    const id = this.id(req, res);
    if (id === null) return;
    responderExito(res, await this.anuncios.obtener(id));
  });

  crear = manejar(async (req, res) => {
    const datos = validar(res, crearAnuncioRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.anuncios.crear(datos, idUsuarioDe(req)), undefined, 201);
  });

  actualizar = manejar(async (req, res) => {
    const id = this.id(req, res);
    const datos = validar(res, actualizarAnuncioRequestSchema, req.body);
    if (id === null || datos === null) return;
    responderExito(res, await this.anuncios.actualizar(id, datos, idUsuarioDe(req)));
  });

  estado = manejar(async (req, res) => {
    const id = this.id(req, res);
    const datos = validar(res, cambiarEstadoRequestSchema, req.body);
    if (id === null || datos === null) return;
    responderExito(res, await this.anuncios.cambiarEstado(id, datos.estado, idUsuarioDe(req)));
  });

  imagenAdmin = manejar(async (req, res) => {
    const id = this.id(req, res);
    const query = validar(res, imagenAnuncioQuerySchema, req.query);
    if (id === null || query === null) return;
    enviarImagen(res, await this.anuncios.imagenAdmin(id, query), 'private, max-age=300');
  });

  /** Público (B4): los anuncios vigentes de un espacio. */
  publicos = manejar(async (req, res) => {
    const params = validar(res, anunciosEspacioParamsSchema, req.params);
    if (params === null) return;
    // Cambia con las fechas y el estado: que el navegador la vuelva a pedir.
    res.set('Cache-Control', 'no-cache');
    responderExito(res, await this.anuncios.publicos(params.espacio));
  });

  /** Público (B7): solo las imágenes de anuncios vigentes. */
  imagenPublica = manejar(async (req, res) => {
    const id = this.id(req, res);
    const query = validar(res, imagenAnuncioQuerySchema, req.query);
    if (id === null || query === null) return;
    enviarImagen(res, await this.anuncios.imagenPublica(id, query), 'public, max-age=300');
  });

  /**
   * Público (M2): cuenta el clic y manda a la dirección que guardó el personal. Nunca responde un error al cliente: lo
   * que no se puede resolver lo manda al inicio. Un robot, una petición que no es GET (HEAD, que usan las vistas
   * previas) o un origen que se pasó del tope por minuto llegan igual a su destino pero no suman (M6).
   */
  ir = async (req: Request, res: Response): Promise<void> => {
    const id = leerId(req, 'idAnuncio');
    let destino = '/';
    if (id !== null) {
      const cuenta = req.method === 'GET' && !esRobot(req.get('user-agent')) && this.limitador.permitir(origenDe(req.ip, req.get('x-forwarded-for')), 1);
      destino = await this.anuncios.resolverClic(id, cuenta).catch(() => '/');
    }
    res.set('Cache-Control', 'no-store').redirect(302, destino);
  };
}
