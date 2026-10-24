import type { Request, Response } from 'express';
import type { ZodType } from 'zod';
import { responderExito } from '../../../core/utils/apiResponse';
import {
  cambiarEstadoRequestSchema,
  crearLineaRequestSchema,
  crearMarcaRequestSchema,
  crearMedidaRequestSchema,
  editarLineaRequestSchema,
  editarMarcaRequestSchema,
  editarMedidaRequestSchema,
  listarBaseRequestSchema,
  listarCompletoRequestSchema,
  listarLineasRequestSchema,
  listarMedidasRequestSchema,
  reemplazarLogotipoRequestSchema,
  type Estado,
} from '../dtos/m01-catalogo.dto';
import type { Pagina } from '../interfaces/catalogo.interface';
import type { CatalogoSimpleService } from '../services/catalogo-simple.service';
import type { LineasService } from '../services/lineas.service';
import type { MarcasService } from '../services/marcas.service';
import type { MedidasService } from '../services/medidas.service';
import { leerId, manejar, responderParametroInvalido, validar } from './catalogo-http';

export type Manejador = (req: Request, res: Response) => Promise<void>;

/** Respuesta paginada del contrato: `{ success, data, pagination }`. */
export function responderPagina<T>(res: Response, pagina: Pagina<T>, numero: number, limite: number): void {
  res.status(200).json({
    success: true,
    data: pagina.items,
    pagination: {
      pagina: numero,
      limite,
      total: pagina.total,
      totalPaginas: Math.ceil(pagina.total / limite),
    },
  });
}

const ID_INVALIDO = (que: string): string => `El identificador ${que} no es válido.`;

export interface ControladorRecurso {
  listar: Manejador;
  crear: Manejador;
  editar: Manejador;
  cambiarEstado: Manejador;
  impacto: Manejador;
}

interface ConfigSimple<E extends { estado: Estado; nombre: string }, C extends { nombre: string }, U extends { nombre?: string | undefined }> {
  servicio: CatalogoSimpleService<E, C, U>;
  esquemaCrear: ZodType<C>;
  esquemaEditar: ZodType<U>;
  /** Nombre del parámetro de ruta: `idSuperficie`, `idAcabado`… */
  parametroId: string;
  /** Para los mensajes: "de la superficie", "del acabado". */
  deQue: string;
  mensajeCreado: string;
}

/** Controlador común de los catálogos pequeños, sin paginar (D5). */
export function controladorSimple<
  E extends { estado: Estado; nombre: string },
  C extends { nombre: string },
  U extends { nombre?: string | undefined },
>(cfg: ConfigSimple<E, C, U>): ControladorRecurso {
  const id = (req: Request, res: Response): number | null => {
    const valor = leerId(req, cfg.parametroId);
    if (valor === null) responderParametroInvalido(res, ID_INVALIDO(cfg.deQue));
    return valor;
  };
  return {
    listar: manejar(async (req, res) => {
      const query = validar(res, listarCompletoRequestSchema, req.query);
      if (query === null) return;
      responderExito(res, await cfg.servicio.listar(query));
    }),
    crear: manejar(async (req, res) => {
      const datos = validar(res, cfg.esquemaCrear, req.body);
      if (datos === null) return;
      responderExito(res, await cfg.servicio.crear(datos), cfg.mensajeCreado, 201);
    }),
    editar: manejar(async (req, res) => {
      const ident = id(req, res);
      if (ident === null) return;
      const datos = validar(res, cfg.esquemaEditar, req.body);
      if (datos === null) return;
      responderExito(res, await cfg.servicio.editar(ident, datos));
    }),
    cambiarEstado: manejar(async (req, res) => {
      const ident = id(req, res);
      if (ident === null) return;
      const peticion = validar(res, cambiarEstadoRequestSchema, req.body);
      if (peticion === null) return;
      responderExito(res, await cfg.servicio.cambiarEstado(ident, peticion));
    }),
    impacto: manejar(async (req, res) => {
      const ident = id(req, res);
      if (ident === null) return;
      responderExito(res, await cfg.servicio.impacto(ident));
    }),
  };
}

/* ─── Marcas ─────────────────────────────────────────────────────────────── */

export class MarcasController {
  constructor(private readonly servicio: MarcasService) {}

  private id(req: Request, res: Response): number | null {
    const valor = leerId(req, 'idMarca');
    if (valor === null) responderParametroInvalido(res, ID_INVALIDO('de la marca'));
    return valor;
  }

  listar = manejar(async (req, res) => {
    const query = validar(res, listarBaseRequestSchema, req.query);
    if (query === null) return;
    responderPagina(res, await this.servicio.listar(query), query.pagina, query.limite);
  });

  obtener = manejar(async (req, res) => {
    const id = this.id(req, res);
    if (id === null) return;
    responderExito(res, await this.servicio.obtener(id));
  });

  crear = manejar(async (req, res) => {
    const datos = validar(res, crearMarcaRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.servicio.crear(datos), 'Marca creada', 201);
  });

  editar = manejar(async (req, res) => {
    const id = this.id(req, res);
    if (id === null) return;
    const datos = validar(res, editarMarcaRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.servicio.editar(id, datos));
  });

  reemplazarLogotipo = manejar(async (req, res) => {
    const id = this.id(req, res);
    if (id === null) return;
    const datos = validar(res, reemplazarLogotipoRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.servicio.reemplazarLogotipo(id, datos));
  });

  /** Devuelve los bytes del logotipo con su `Content-Type`; no es JSON. */
  logotipo = manejar(async (req, res) => {
    const id = this.id(req, res);
    if (id === null) return;
    const { bytes, mimeType } = await this.servicio.obtenerLogotipo(id);
    res.status(200).type(mimeType).set('Cache-Control', 'private, max-age=300').send(bytes);
  });

  cambiarEstado = manejar(async (req, res) => {
    const id = this.id(req, res);
    if (id === null) return;
    const peticion = validar(res, cambiarEstadoRequestSchema, req.body);
    if (peticion === null) return;
    responderExito(res, await this.servicio.cambiarEstado(id, peticion));
  });

  impacto = manejar(async (req, res) => {
    const id = this.id(req, res);
    if (id === null) return;
    responderExito(res, await this.servicio.impacto(id));
  });
}

/* ─── Líneas ─────────────────────────────────────────────────────────────── */

export class LineasController implements ControladorRecurso {
  constructor(private readonly servicio: LineasService) {}

  private id(req: Request, res: Response): number | null {
    const valor = leerId(req, 'idLinea');
    if (valor === null) responderParametroInvalido(res, ID_INVALIDO('de la línea'));
    return valor;
  }

  listar = manejar(async (req, res) => {
    const query = validar(res, listarLineasRequestSchema, req.query);
    if (query === null) return;
    responderPagina(res, await this.servicio.listar(query), query.pagina, query.limite);
  });

  crear = manejar(async (req, res) => {
    const datos = validar(res, crearLineaRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.servicio.crear(datos), 'Línea creada', 201);
  });

  editar = manejar(async (req, res) => {
    const id = this.id(req, res);
    if (id === null) return;
    const datos = validar(res, editarLineaRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.servicio.editar(id, datos));
  });

  cambiarEstado = manejar(async (req, res) => {
    const id = this.id(req, res);
    if (id === null) return;
    const peticion = validar(res, cambiarEstadoRequestSchema, req.body);
    if (peticion === null) return;
    responderExito(res, await this.servicio.cambiarEstado(id, peticion));
  });

  impacto = manejar(async (req, res) => {
    const id = this.id(req, res);
    if (id === null) return;
    responderExito(res, await this.servicio.impacto(id));
  });
}

/* ─── Medidas ────────────────────────────────────────────────────────────── */

export class MedidasController implements ControladorRecurso {
  constructor(private readonly servicio: MedidasService) {}

  private id(req: Request, res: Response): number | null {
    const valor = leerId(req, 'idMedida');
    if (valor === null) responderParametroInvalido(res, ID_INVALIDO('de la medida'));
    return valor;
  }

  listar = manejar(async (req, res) => {
    const query = validar(res, listarMedidasRequestSchema, req.query);
    if (query === null) return;
    responderPagina(res, await this.servicio.listar(query), query.pagina, query.limite);
  });

  crear = manejar(async (req, res) => {
    const datos = validar(res, crearMedidaRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.servicio.crear(datos), 'Medida creada', 201);
  });

  editar = manejar(async (req, res) => {
    const id = this.id(req, res);
    if (id === null) return;
    const datos = validar(res, editarMedidaRequestSchema, req.body);
    if (datos === null) return;
    responderExito(res, await this.servicio.editar(id, datos));
  });

  cambiarEstado = manejar(async (req, res) => {
    const id = this.id(req, res);
    if (id === null) return;
    const peticion = validar(res, cambiarEstadoRequestSchema, req.body);
    if (peticion === null) return;
    responderExito(res, await this.servicio.cambiarEstado(id, peticion));
  });

  impacto = manejar(async (req, res) => {
    const id = this.id(req, res);
    if (id === null) return;
    responderExito(res, await this.servicio.impacto(id));
  });
}
