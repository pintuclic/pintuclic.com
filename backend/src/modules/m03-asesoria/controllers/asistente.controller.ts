import type { Request, Response } from 'express';
import { responderExito } from '../../../core/utils/apiResponse';
import { mensajeAsistenteRequestSchema, turnoCuestionarioRequestSchema } from '../dtos/asistente.dto';
import { listarIncidentesQuerySchema } from '../dtos/incidentes.dto';
import { CODIGOS_ERROR_M03 } from '../dtos/m03-asesoria.dto';
import type { IncidentesRepositoryPort } from '../repositories/incidentes.repository';
import { AsesoriaError } from '../services/asesoria.error';
import type { AsistenteService } from '../services/asistente.service';
import type { CuestionarioAsistidoService } from '../services/cuestionario-asistido.service';
import { manejar, validar } from './asesoria-http';

/**
 * H8 — tope por minuto y por origen. Se cuenta en memoria y NUNCA se guarda la dirección IP:
 * solo se usa para decidir si este minuto ya tuvo demasiadas peticiones.
 */
export interface LimitadorPort {
  permitir(origen: string): boolean;
}

/** El origen de la petición, sin guardarlo: solo alimenta el conteo del minuto. */
function origenDe(req: Request): string {
  const reenviado = req.header('x-forwarded-for');
  const ultimo = reenviado?.split(',').at(-1)?.trim();
  return ultimo !== undefined && ultimo !== '' ? ultimo : (req.ip ?? 'desconocido');
}

const limiteExcedido = (): AsesoriaError =>
  new AsesoriaError(
    CODIGOS_ERROR_M03.LIMITE_MENSAJES_EXCEDIDO,
    'Has enviado muchos mensajes seguidos. Espera un momento y vuelve a intentarlo.',
    429,
  );

/** HU-ASE-05 — asistente. Público: no pide sesión (H1). */
export class AsistenteController {
  constructor(
    private readonly servicio: AsistenteService,
    private readonly limitador: LimitadorPort,
  ) {}

  /** GET /asesoria/asistente/estado */
  estado = manejar(async (_req: Request, res: Response): Promise<void> => {
    responderExito(res, this.servicio.estadoPublico());
  });

  /** POST /asesoria/asistente/mensajes */
  responder = manejar(async (req: Request, res: Response): Promise<void> => {
    if (!this.limitador.permitir(origenDe(req))) throw limiteExcedido();

    const datos = validar(res, mensajeAsistenteRequestSchema, req.body);
    if (datos === null) return;

    responderExito(res, await this.servicio.responder(datos.mensaje, datos.historial));
  });
}

/** HU-ASE-01 — cuestionario en modo `asistido`. Público. */
export class CuestionarioAsistidoController {
  constructor(
    private readonly servicio: CuestionarioAsistidoService,
    private readonly limitador: LimitadorPort,
  ) {}

  /** POST /asesoria/cuestionario/turno */
  turno = manejar(async (req: Request, res: Response): Promise<void> => {
    if (!this.limitador.permitir(origenDe(req))) throw limiteExcedido();

    const datos = validar(res, turnoCuestionarioRequestSchema, req.body);
    if (datos === null) return;

    responderExito(res, await this.servicio.turno(datos));
  });
}

/** Panel: estado del servicio de IA y registro de incidentes (HU-ASE-06). */
export class IaAdminController {
  constructor(
    private readonly asistente: AsistenteService,
    private readonly incidentes: IncidentesRepositoryPort,
  ) {}

  /** GET /admin/asesoria/ia/estado */
  estado = manejar(async (_req: Request, res: Response): Promise<void> => {
    responderExito(res, await this.asistente.estadoAdmin());
  });

  /** GET /admin/asesoria/incidentes */
  listarIncidentes = manejar(async (req: Request, res: Response): Promise<void> => {
    const query = validar(res, listarIncidentesQuerySchema, req.query);
    if (query === null) return;

    const { datos, total } = await this.incidentes.listar(query);
    res.status(200).json({
      success: true,
      data: datos,
      pagination: {
        page: query.pagina,
        limit: query.limite,
        total,
        totalPages: Math.ceil(total / query.limite),
      },
    });
  });
}
