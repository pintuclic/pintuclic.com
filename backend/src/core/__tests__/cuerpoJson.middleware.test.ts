import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { construirParserJson } from '../middlewares/cuerpoJson.middleware';

const RUTA_RUT = '/api/v1/cuentas/empresas/renovacion-nit';
const MB = 1024 * 1024;

let servidor: Server;
let base: string;

/** Cuerpo JSON de aproximadamente `bytes` bytes. */
function cuerpoDe(bytes: number): string {
  return JSON.stringify({ contenidoBase64: 'A'.repeat(bytes) });
}

async function enviar(ruta: string, cuerpo: string, metodo: 'POST' | 'PUT' = 'POST') {
  const respuesta = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: cuerpo,
  });
  return { status: respuesta.status, json: (await respuesta.json()) as Record<string, unknown> };
}

beforeAll(async () => {
  const app = express();
  app.use(construirParserJson());
  const eco = (req: Request, res: Response) => {
    res.json({ recibido: JSON.stringify(req.body).length });
  };
  app.post(RUTA_RUT, eco);
  app.post('/api/v1/cuentas/perfil', eco);
  app.post('/api/v1/admin/catalogo/marcas', eco);
  app.put('/api/v1/admin/catalogo/marcas/:idMarca/logotipo', eco);
  app.put('/api/v1/admin/catalogo/marcas/:idMarca', eco);
  app.post('/api/v1/admin/catalogo/productos/:idProducto/imagenes', eco);
  app.put('/api/v1/admin/catalogo/medidas/:idMedida/imagen', eco);
  app.post('/api/v1/admin/catalogo/productos', eco);
  app.post('/api/v1/admin/catalogo/categorias', eco);
  app.use((_error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ manejadorGlobal: true });
  });
  servidor = app.listen(0);
  await new Promise<void>((listo) => servidor.once('listening', () => listo()));
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((cerrado) => servidor.close(() => cerrado()));
});

describe('construirParserJson — límite general de 100 kb', () => {
  it('acepta un cuerpo por debajo del límite', async () => {
    const { status } = await enviar('/api/v1/cuentas/perfil', cuerpoDe(90 * 1024));
    expect(status).toBe(200);
  });

  it('responde 413 CUERPO_DEMASIADO_GRANDE (no un 500) por encima del límite', async () => {
    const { status, json } = await enviar('/api/v1/cuentas/perfil', cuerpoDe(200 * 1024));
    expect(status).toBe(413);
    expect(json).toEqual({
      success: false,
      error: { code: 'CUERPO_DEMASIADO_GRANDE', message: 'La solicitud supera el tamaño permitido.' },
    });
  });
});

describe('construirParserJson — renovación de NIT con RUT (HU-CUE-10)', () => {
  it('acepta el base64 de un RUT de 5 MB exactos (~6,7 MB de JSON)', async () => {
    const base64DeCincoMb = Math.ceil((5 * MB) / 3) * 4;
    const { status, json } = await enviar(RUTA_RUT, cuerpoDe(base64DeCincoMb));
    expect(status).toBe(200);
    expect(json.recibido).toBeGreaterThan(base64DeCincoMb);
  });

  it('también con barra final en la ruta', async () => {
    const { status } = await enviar(`${RUTA_RUT}/`, cuerpoDe(1 * MB));
    expect(status).toBe(200);
  });

  it('responde 413 DOCUMENTO_RUT_INVALIDO por encima de 7 MB', async () => {
    const { status, json } = await enviar(RUTA_RUT, cuerpoDe(7 * MB + 1));
    expect(status).toBe(413);
    expect(json).toEqual({
      success: false,
      error: { code: 'DOCUMENTO_RUT_INVALIDO', message: 'El documento RUT no puede superar 5 MB.' },
    });
  });
});

describe('construirParserJson — otros errores', () => {
  it('un JSON mal formado sigue llegando al manejador global', async () => {
    const { status, json } = await enviar('/api/v1/cuentas/perfil', '{"roto":');
    expect(status).toBe(500);
    expect(json).toEqual({ manejadorGlobal: true });
  });
});

describe('construirParserJson — imágenes de M01 (logotipos, productos y medidas)', () => {
  const base64DeCincoMb = Math.ceil((5 * MB) / 3) * 4;

  it('crear una marca acepta el base64 de un logotipo de 5 MB exactos', async () => {
    const { status } = await enviar('/api/v1/admin/catalogo/marcas', cuerpoDe(base64DeCincoMb));
    expect(status).toBe(200);
  });

  it('reemplazar el logotipo de una marca acepta 5 MB (PUT)', async () => {
    const { status } = await enviar('/api/v1/admin/catalogo/marcas/12/logotipo', cuerpoDe(base64DeCincoMb), 'PUT');
    expect(status).toBe(200);
  });

  it('por encima de 7 MB responde 413 CUERPO_DEMASIADO_GRANDE con mensaje de la imagen', async () => {
    const { status, json } = await enviar('/api/v1/admin/catalogo/marcas', cuerpoDe(7 * MB + 1));
    expect(status).toBe(413);
    expect(json).toEqual({
      success: false,
      error: { code: 'CUERPO_DEMASIADO_GRANDE', message: 'La imagen no puede superar 5 MB.' },
    });
  });

  it('subir una imagen de producto o de medida acepta 5 MB', async () => {
    expect((await enviar('/api/v1/admin/catalogo/productos/7/imagenes', cuerpoDe(base64DeCincoMb))).status).toBe(200);
    expect((await enviar('/api/v1/admin/catalogo/medidas/3/imagen', cuerpoDe(base64DeCincoMb), 'PUT')).status).toBe(200);
  });

  it('las demás rutas de productos y medidas conservan el límite de 100 kb', async () => {
    expect((await enviar('/api/v1/admin/catalogo/productos', cuerpoDe(200 * 1024))).status).toBe(413);
    expect((await enviar('/api/v1/admin/catalogo/productos/7/imagenes', cuerpoDe(1 * MB), 'PUT')).status).toBe(413);
    expect((await enviar('/api/v1/admin/catalogo/medidas/abc/imagen', cuerpoDe(1 * MB), 'PUT')).status).toBe(413);
  });

  it('el resto del catálogo conserva el límite de 100 kb', async () => {
    expect((await enviar('/api/v1/admin/catalogo/categorias', cuerpoDe(200 * 1024))).status).toBe(413);
    expect((await enviar('/api/v1/admin/catalogo/marcas/12', cuerpoDe(200 * 1024), 'PUT')).status).toBe(413);
  });

  it('un id que no es numérico no recibe el límite mayor', async () => {
    const { status } = await enviar('/api/v1/admin/catalogo/marcas/abc/logotipo', cuerpoDe(1 * MB), 'PUT');
    expect(status).toBe(413);
  });

  it('el límite mayor no se extiende a otros métodos de la ruta de marcas', async () => {
    // PUT /marcas (sin id) y POST /marcas/:id/logotipo no son rutas con logotipo.
    expect((await enviar('/api/v1/admin/catalogo/marcas', cuerpoDe(1 * MB), 'PUT')).status).toBe(413);
    expect((await enviar('/api/v1/admin/catalogo/marcas/12/logotipo', cuerpoDe(1 * MB), 'POST')).status).toBe(413);
  });
});
