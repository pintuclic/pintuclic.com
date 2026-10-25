import type { Request, Response } from 'express';
import { responderExito } from '../../../core/utils/apiResponse';
import { listarEnviosQuerySchema, listarRebotesQuerySchema } from '../dtos/m18-notificaciones.dto';
import type { RegistroEnviosService } from '../services/registro-envios.service';

export class RegistroEnviosController {
  constructor(private readonly registroService: RegistroEnviosService) {}

  listarEnvios = async (req: Request, res: Response): Promise<void> => {
    try {
      const parseo = listarEnviosQuerySchema.safeParse(req.query);
      if (!parseo.success) {
        res.status(400).json({
          success: false,
          error: { code: 'PARAMETRO_INVALIDO', message: 'Filtros de búsqueda inválidos.', details: null },
        });
        return;
      }

      const { pagina, limite, tipo, estado } = parseo.data;
      const resultado = await this.registroService.listarEnvios({ pagina, limite, tipo, estado });
      responderExito(res, { ...resultado, pagina, limite });
    } catch {
      res.status(500).json({
        success: false,
        error: { code: 'ERROR_INTERNO', message: 'Ocurrió un error al listar los envíos.', details: null },
      });
    }
  };

  listarRebotes = async (req: Request, res: Response): Promise<void> => {
    try {
      const parseo = listarRebotesQuerySchema.safeParse(req.query);
      if (!parseo.success) {
        res.status(400).json({
          success: false,
          error: { code: 'PARAMETRO_INVALIDO', message: 'Filtros de búsqueda inválidos.', details: null },
        });
        return;
      }

      const { pagina, limite } = parseo.data;
      const resultado = await this.registroService.listarRebotes({ pagina, limite });
      responderExito(res, { ...resultado, pagina, limite });
    } catch {
      res.status(500).json({
        success: false,
        error: { code: 'ERROR_INTERNO', message: 'Ocurrió un error al listar los rebotes.', details: null },
      });
    }
  };
}
