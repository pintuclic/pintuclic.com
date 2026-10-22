import express from 'express';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Límite general: ninguna otra operación de la API necesita más. */
export const LIMITE_JSON_GENERAL = '100kb';

/**
 * HU-CUE-10 / RN-CUE-20: el RUT (hasta 5 MB) viaja en base64 dentro del JSON, lo
 * que lo lleva a ~6,7 MB. Solo estas rutas reciben el límite mayor; el tamaño
 * exacto del documento lo sigue validando el DTO (`tamanoBytes` ≤ 5 MB).
 */
export const LIMITE_JSON_CON_DOCUMENTO = '7mb';
export const RUTAS_CON_DOCUMENTO: ReadonlySet<string> = new Set(['/api/v1/cuentas/empresas/renovacion-nit']);

interface ErrorDeCuerpo {
  type?: unknown;
}

function esCuerpoDemasiadoGrande(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as ErrorDeCuerpo).type === 'entity.too.large';
}

/**
 * Parser JSON con límite por ruta. Un cuerpo que excede el límite responde 413
 * con un código propio, en lugar del 500 genérico del manejador global.
 */
export function construirParserJson(): RequestHandler {
  const general = express.json({ limit: LIMITE_JSON_GENERAL });
  const conDocumento = express.json({ limit: LIMITE_JSON_CON_DOCUMENTO });

  return (req: Request, res: Response, next: NextFunction) => {
    const ruta = req.path.replace(/\/+$/, '');
    const llevaDocumento = req.method === 'POST' && RUTAS_CON_DOCUMENTO.has(ruta);
    const parser = llevaDocumento ? conDocumento : general;

    parser(req, res, (error?: unknown) => {
      if (error && esCuerpoDemasiadoGrande(error)) {
        res.status(413).json({
          success: false,
          error: llevaDocumento
            ? { code: 'DOCUMENTO_RUT_INVALIDO', message: 'El documento RUT no puede superar 5 MB.' }
            : { code: 'CUERPO_DEMASIADO_GRANDE', message: 'La solicitud supera el tamaño permitido.' },
        });
        return;
      }
      next(error);
    });
  };
}
