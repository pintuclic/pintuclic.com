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

/**
 * M01 (D2 del contrato): los logotipos de marca, las imágenes de producto y las imágenes de
 * medida (hasta 5 MB) viajan en base64 dentro del JSON. Solo estas rutas reciben el límite
 * mayor; el tamaño exacto lo valida el servicio (≤ 5 MB, tipo por firma de archivo).
 */
const RUTAS_CON_IMAGEN: ReadonlyArray<{ metodo: string; ruta: RegExp }> = [
  { metodo: 'POST', ruta: /^\/api\/v1\/admin\/catalogo\/marcas$/ },
  { metodo: 'PUT', ruta: /^\/api\/v1\/admin\/catalogo\/marcas\/\d+\/logotipo$/ },
  { metodo: 'POST', ruta: /^\/api\/v1\/admin\/catalogo\/productos\/\d+\/imagenes$/ },
  { metodo: 'PUT', ruta: /^\/api\/v1\/admin\/catalogo\/medidas\/\d+\/imagen$/ },
  { metodo: 'POST', ruta: /^\/api\/v1\/admin\/landing\/banners$/ },
  { metodo: 'PUT', ruta: /^\/api\/v1\/admin\/landing\/banners\/\d+$/ },
  { metodo: 'PUT', ruta: /^\/api\/v1\/admin\/landing\/categorias\/\d+\/imagen$/ },
];

/**
 * M14 (B7 del contrato): un anuncio lleva la imagen de escritorio y, si quiere, la móvil, cada una de hasta 5 MB en
 * base64 dentro del mismo JSON (~13,4 MB las dos). Solo crear y editar un anuncio reciben este límite; el tamaño exacto
 * de cada imagen lo valida el servicio (≤ 5 MB, tipo por firma de archivo).
 */
export const LIMITE_JSON_CON_DOS_IMAGENES = '14mb';
const RUTAS_CON_DOS_IMAGENES: ReadonlyArray<{ metodo: string; ruta: RegExp }> = [
  { metodo: 'POST', ruta: /^\/api\/v1\/admin\/patrocinios\/anuncios$/ },
  { metodo: 'PUT', ruta: /^\/api\/v1\/admin\/patrocinios\/anuncios\/\d+$/ },
];

/**
 * M13 (D2 del contrato): una carga masiva de inventario viaja en bloques de hasta 500 filas
 * (cada una con su nota), que no caben en 100 kb. Solo estas dos rutas reciben 1 MB; la
 * cantidad de filas la valida el DTO (≤ 500).
 */
export const LIMITE_JSON_CON_CARGA = '1mb';
const RUTAS_CON_CARGA: ReadonlySet<string> = new Set([
  '/api/v1/admin/inventario/cargas/previsualizar',
  '/api/v1/admin/inventario/cargas/aplicar',
]);

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
  const conCarga = express.json({ limit: LIMITE_JSON_CON_CARGA });
  const conDosImagenes = express.json({ limit: LIMITE_JSON_CON_DOS_IMAGENES });

  return (req: Request, res: Response, next: NextFunction) => {
    const ruta = req.path.replace(/\/+$/, '');
    const llevaDocumento = req.method === 'POST' && RUTAS_CON_DOCUMENTO.has(ruta);
    const llevaImagen = RUTAS_CON_IMAGEN.some((r) => r.metodo === req.method && r.ruta.test(ruta));
    const llevaCarga = req.method === 'POST' && RUTAS_CON_CARGA.has(ruta);
    const llevaDosImagenes = RUTAS_CON_DOS_IMAGENES.some((r) => r.metodo === req.method && r.ruta.test(ruta));
    const parser = llevaDosImagenes
      ? conDosImagenes
      : llevaDocumento || llevaImagen
        ? conDocumento
        : llevaCarga
          ? conCarga
          : general;

    parser(req, res, (error?: unknown) => {
      if (error && esCuerpoDemasiadoGrande(error)) {
        res.status(413).json({
          success: false,
          error: llevaDosImagenes
            ? { code: 'CUERPO_DEMASIADO_GRANDE', message: 'Cada imagen no puede superar 5 MB.' }
            : llevaDocumento
            ? { code: 'DOCUMENTO_RUT_INVALIDO', message: 'El documento RUT no puede superar 5 MB.' }
            : llevaImagen
              ? { code: 'CUERPO_DEMASIADO_GRANDE', message: 'La imagen no puede superar 5 MB.' }
              : llevaCarga
                ? { code: 'CUERPO_DEMASIADO_GRANDE', message: 'El bloque de la carga supera el tamaño permitido.' }
                : { code: 'CUERPO_DEMASIADO_GRANDE', message: 'La solicitud supera el tamaño permitido.' },
        });
        return;
      }
      next(error);
    });
  };
}
