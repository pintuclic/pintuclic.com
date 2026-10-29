import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express, { type NextFunction, type Request, type Response } from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { construirParserJson } from '../../middlewares/cuerpoJson.middleware';
import type { BannersInicioRepositoryPort } from '../banners.repository';
import { construirRutasLandingBanners } from '../banners.routes';
import type {
  CategoriasInicioRepositoryPort,
  GuardarImagenCategoriaRepositorioInput,
  ImagenCategoriaBytes,
} from '../categorias-inicio.repository';
import type { CategoriaInicioAdminEntity, CategoriaInicioPublicaItem } from '../fp01-landing.dto';

/** FP-01 · C1–C6: imágenes de las tarjetas de categorías del inicio (rutas con repositorio en memoria). */

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

interface Fila {
  idCategoria: number;
  nombre: string;
  imagen: ImagenCategoriaBytes | null;
  focoX: number;
  focoY: number;
  fecha: string | null;
}

class CategoriasEnMemoria implements CategoriasInicioRepositoryPort {
  filas: Fila[] = [];

  reset(): void {
    this.filas = [
      { idCategoria: 1, nombre: 'Pinturas', imagen: null, focoX: 50, focoY: 50, fecha: null },
      { idCategoria: 2, nombre: 'Maderas', imagen: null, focoX: 50, focoY: 50, fecha: null },
    ];
  }

  private admin(f: Fila): CategoriaInicioAdminEntity {
    return { idCategoria: f.idCategoria, nombre: f.nombre, tieneImagen: f.imagen !== null, focoX: f.focoX, focoY: f.focoY, fechaActualizacion: f.fecha };
  }

  async listarPublicas(): Promise<CategoriaInicioPublicaItem[]> {
    return this.filas.filter((f) => f.imagen !== null).map((f) => ({ idCategoria: f.idCategoria, focoX: f.focoX, focoY: f.focoY, version: f.fecha ?? '0' }));
  }

  async obtenerImagen(idCategoria: number): Promise<ImagenCategoriaBytes | null> {
    return this.filas.find((f) => f.idCategoria === idCategoria)?.imagen ?? null;
  }

  async listarAdmin(): Promise<CategoriaInicioAdminEntity[]> {
    return this.filas.map((f) => this.admin(f));
  }

  async guardar(idCategoria: number, datos: GuardarImagenCategoriaRepositorioInput): Promise<CategoriaInicioAdminEntity | null> {
    const fila = this.filas.find((f) => f.idCategoria === idCategoria);
    if (fila === undefined) return null;
    if (fila.imagen === null && datos.imagen === undefined) return null;
    if (datos.imagen !== undefined) fila.imagen = datos.imagen;
    if (datos.focoX !== undefined) fila.focoX = datos.focoX;
    if (datos.focoY !== undefined) fila.focoY = datos.focoY;
    fila.fecha = '2026-10-28T10:00:00.000Z';
    return this.admin(fila);
  }

  async quitar(idCategoria: number): Promise<void> {
    const fila = this.filas.find((f) => f.idCategoria === idCategoria);
    if (fila !== undefined) {
      fila.imagen = null;
      fila.focoX = 50;
      fila.focoY = 50;
    }
  }
}

const SIN_BANNERS = {} as BannersInicioRepositoryPort;

describe('FP-01 · imágenes de las tarjetas de categorías (HTTP)', () => {
  const repo = new CategoriasEnMemoria();
  let server: Server;
  let base = '';

  beforeAll(async () => {
    const app = express();
    app.use(construirParserJson());
    const autorizacion = { exigirPermiso: async (actor: { idUsuario: number }) => actor.idUsuario === 1 };
    const autenticar = (req: Request, res: Response, next: NextFunction): void => {
      const usuario = req.header('x-test-user');
      if (usuario === undefined) {
        res.status(404).json({ success: false, error: { code: 'RECURSO_NO_DISPONIBLE', message: 'El recurso solicitado no está disponible.' } });
        return;
      }
      req.actor = { idUsuario: Number(usuario), idSesion: 'sesion-test', tipoSesion: 'admin' };
      next();
    };
    const rutas = construirRutasLandingBanners(autorizacion, SIN_BANNERS, repo);
    app.use('/api/v1/admin/landing', autenticar, rutas.adminRouter);
    app.use('/api/v1/landing', rutas.publicRouter);
    await new Promise<void>((resolver) => {
      server = app.listen(0, () => {
        base = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
        resolver();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolver) => server.close(() => resolver()));
  });

  beforeEach(() => repo.reset());

  const admin = { 'x-test-user': '1', 'content-type': 'application/json' };
  const cuerpoImagen = (extra: object = {}): string =>
    JSON.stringify({ imagenBase64: PNG_1X1.toString('base64'), imagenMimeType: 'image/png', ...extra });

  it('C5: sin imágenes la lista pública está vacía y la imagen de una categoría responde 404', async () => {
    const lista = await fetch(`${base}/api/v1/landing/categorias`);
    expect((await lista.json()).data).toEqual([]);
    expect((await fetch(`${base}/api/v1/landing/categorias/1/imagen`)).status).toBe(404);
  });

  it('C2: guarda la imagen (cualquier tamaño, se reduce a webp) y el enfoque; la sirve pública con caché larga', async () => {
    const res = await fetch(`${base}/api/v1/admin/landing/categorias/1/imagen`, { method: 'PUT', headers: admin, body: cuerpoImagen({ focoX: 20, focoY: 80 }) });
    expect(res.status).toBe(200);
    expect((await res.json()).data).toMatchObject({ idCategoria: 1, nombre: 'Pinturas', tieneImagen: true, focoX: 20, focoY: 80 });

    const publica = await (await fetch(`${base}/api/v1/landing/categorias`)).json();
    expect(publica.data).toHaveLength(1);
    expect(publica.data[0]).toMatchObject({ idCategoria: 1, focoX: 20, focoY: 80 });

    const img = await fetch(`${base}/api/v1/landing/categorias/1/imagen`);
    expect(img.status).toBe(200);
    expect(img.headers.get('content-type')).toBe('image/webp');
    expect(img.headers.get('cache-control')).toContain('immutable');
    expect(Buffer.from(await img.arrayBuffer()).subarray(8, 12).toString('ascii')).toBe('WEBP');
  });

  it('C2: sin imagen nueva solo cambia el enfoque, y exige que ya haya una', async () => {
    const sinImagen = await fetch(`${base}/api/v1/admin/landing/categorias/2/imagen`, { method: 'PUT', headers: admin, body: JSON.stringify({ focoX: 10 }) });
    expect(sinImagen.status).toBe(400);
    expect((await sinImagen.json()).error.code).toBe('IMAGEN_INVALIDA');

    await fetch(`${base}/api/v1/admin/landing/categorias/2/imagen`, { method: 'PUT', headers: admin, body: cuerpoImagen() });
    const soloFoco = await fetch(`${base}/api/v1/admin/landing/categorias/2/imagen`, { method: 'PUT', headers: admin, body: JSON.stringify({ focoX: 10, focoY: 90 }) });
    expect(soloFoco.status).toBe(200);
    expect((await soloFoco.json()).data).toMatchObject({ focoX: 10, focoY: 90, tieneImagen: true });
  });

  it('C2: rechaza lo que no es una imagen, aunque diga serlo, y un enfoque fuera de rango', async () => {
    const falsa = await fetch(`${base}/api/v1/admin/landing/categorias/1/imagen`, {
      method: 'PUT',
      headers: admin,
      body: JSON.stringify({ imagenBase64: Buffer.from('<script>alert(1)</script>').toString('base64'), imagenMimeType: 'image/png' }),
    });
    expect(falsa.status).toBe(400);
    const fuera = await fetch(`${base}/api/v1/admin/landing/categorias/1/imagen`, { method: 'PUT', headers: admin, body: cuerpoImagen({ focoX: 101 }) });
    expect(fuera.status).toBe(400);
    const incompleta = await fetch(`${base}/api/v1/admin/landing/categorias/1/imagen`, { method: 'PUT', headers: admin, body: JSON.stringify({ imagenBase64: PNG_1X1.toString('base64') }) });
    expect(incompleta.status).toBe(400);
  });

  it('acepta imágenes de varios cientos de KB (la ruta tiene el límite de cuerpo de las imágenes, no el general de 100 kb)', async () => {
    const grande = Buffer.concat([PNG_1X1, Buffer.alloc(300 * 1024)]).toString('base64');
    const res = await fetch(`${base}/api/v1/admin/landing/categorias/1/imagen`, {
      method: 'PUT',
      headers: admin,
      body: JSON.stringify({ imagenBase64: grande, imagenMimeType: 'image/png' }),
    });
    expect(res.status).not.toBe(413);
  });

  it('una categoría que no existe responde 404', async () => {
    const res = await fetch(`${base}/api/v1/admin/landing/categorias/99/imagen`, { method: 'PUT', headers: admin, body: cuerpoImagen() });
    expect(res.status).toBe(404);
  });

  it('C4: el panel lista todas las categorías, con y sin imagen', async () => {
    await fetch(`${base}/api/v1/admin/landing/categorias/1/imagen`, { method: 'PUT', headers: admin, body: cuerpoImagen() });
    const lista = (await (await fetch(`${base}/api/v1/admin/landing/categorias`, { headers: admin })).json()).data as CategoriaInicioAdminEntity[];
    expect(lista.map((c) => [c.nombre, c.tieneImagen])).toEqual([['Pinturas', true], ['Maderas', false]]);
  });

  it('C3: quitar la imagen es idempotente y la tarjeta vuelve a no tenerla', async () => {
    await fetch(`${base}/api/v1/admin/landing/categorias/1/imagen`, { method: 'PUT', headers: admin, body: cuerpoImagen() });
    expect((await fetch(`${base}/api/v1/admin/landing/categorias/1/imagen`, { method: 'DELETE', headers: admin })).status).toBe(200);
    expect((await fetch(`${base}/api/v1/admin/landing/categorias/1/imagen`, { method: 'DELETE', headers: admin })).status).toBe(200);
    expect((await fetch(`${base}/api/v1/landing/categorias/1/imagen`)).status).toBe(404);
  });

  it('C6: sin sesión no existe, y sin el permiso de editar no deja guardar', async () => {
    expect((await fetch(`${base}/api/v1/admin/landing/categorias`)).status).toBe(404);
    const sinPermiso = await fetch(`${base}/api/v1/admin/landing/categorias/1/imagen`, { method: 'PUT', headers: { ...admin, 'x-test-user': '7' }, body: cuerpoImagen() });
    expect([403, 404]).toContain(sinPermiso.status);
  });
});
