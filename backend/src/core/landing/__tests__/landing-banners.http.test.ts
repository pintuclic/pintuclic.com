import { readFileSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { construirParserJson } from '../../middlewares/cuerpoJson.middleware';
import type {
  BannersInicioRepositoryPort,
  CrearBannerRepositorioInput,
  EditarBannerRepositorioInput,
  ImagenBannerBytes,
} from '../banners.repository';
import { construirRutasLandingBanners } from '../banners.routes';
import type {
  BannerInicioAdminEntity,
  BannerInicioPublicoItem,
  EstadoBannerInicio,
} from '../fp01-landing.dto';

const RAIZ = resolve(__dirname, '../../../../../');

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

interface RegistroBannerMemoria extends BannerInicioAdminEntity {
  imagenBytes: Buffer | null;
  imagenMimeType: ImagenBannerBytes['mimeType'] | null;
}

class InMemoryBannersRepository implements BannersInicioRepositoryPort {
  private filas: RegistroBannerMemoria[] = [];
  private seq = 1;

  reset(): void {
    this.seq = 3;
    const ahora = '2026-10-25T00:00:00.000Z';
    this.filas = [
      {
        idBanner: 1,
        tituloLinea1: 'Todo para tu proyecto,',
        tituloLinea2: 'en un solo lugar',
        descripcion: 'Pinturas y accesorios de las mejores marcas con envío rápido.',
        textoBotonPrimario: 'Explorar catálogo',
        enlaceBotonPrimario: '/productos',
        textoBotonSecundario: 'Centro de ayuda',
        enlaceBotonSecundario: '/centro-de-ayuda',
        tieneImagenPersonalizada: false,
        imagenBytes: null,
        imagenMimeType: null,
        orden: 1,
        focoX: 50,
        focoY: 50,
        estado: 'activo',
        idAutor: 1,
        nombreAutor: 'Carlos Mendoza',
        fechaCreacion: ahora,
        fechaActualizacion: ahora,
      },
      {
        idBanner: 2,
        tituloLinea1: 'Banner inactivo de prueba',
        tituloLinea2: null,
        descripcion: 'Este banner está inactivo y no debe aparecer en público.',
        textoBotonPrimario: 'Ver más',
        enlaceBotonPrimario: '/productos',
        textoBotonSecundario: null,
        enlaceBotonSecundario: null,
        tieneImagenPersonalizada: false,
        imagenBytes: null,
        imagenMimeType: null,
        orden: 2,
        focoX: 50,
        focoY: 50,
        estado: 'inactivo',
        idAutor: 1,
        nombreAutor: 'Carlos Mendoza',
        fechaCreacion: ahora,
        fechaActualizacion: ahora,
      },
    ];
  }

  async listarPublicos(): Promise<BannerInicioPublicoItem[]> {
    return this.filas
      .filter((f) => f.estado === 'activo')
      .sort((a, b) => a.orden - b.orden || a.idBanner - b.idBanner)
      .map((f) => ({
        idBanner: f.idBanner,
        tituloLinea1: f.tituloLinea1,
        tituloLinea2: f.tituloLinea2,
        descripcion: f.descripcion,
        textoBotonPrimario: f.textoBotonPrimario,
        enlaceBotonPrimario: f.enlaceBotonPrimario,
        textoBotonSecundario: f.textoBotonSecundario,
        enlaceBotonSecundario: f.enlaceBotonSecundario,
        tieneImagenPersonalizada: f.tieneImagenPersonalizada,
        orden: f.orden,
        focoX: f.focoX,
        focoY: f.focoY,
      }));
  }

  async obtenerImagenPublica(idBanner: number): Promise<ImagenBannerBytes | null> {
    const f = this.filas.find((x) => x.idBanner === idBanner);
    if (!f || !f.imagenBytes || !f.imagenMimeType) return null;
    return { bytes: f.imagenBytes, mimeType: f.imagenMimeType };
  }

  async listarAdmin(): Promise<BannerInicioAdminEntity[]> {
    return [...this.filas].sort((a, b) => a.orden - b.orden || a.idBanner - b.idBanner);
  }

  async obtenerPorIdAdmin(idBanner: number): Promise<BannerInicioAdminEntity | null> {
    return this.filas.find((x) => x.idBanner === idBanner) ?? null;
  }

  async crear(datos: CrearBannerRepositorioInput): Promise<BannerInicioAdminEntity> {
    const ahora = new Date().toISOString();
    const nueva: RegistroBannerMemoria = {
      idBanner: this.seq++,
      tituloLinea1: datos.tituloLinea1,
      tituloLinea2: datos.tituloLinea2,
      descripcion: datos.descripcion,
      textoBotonPrimario: datos.textoBotonPrimario,
      enlaceBotonPrimario: datos.enlaceBotonPrimario,
      textoBotonSecundario: datos.textoBotonSecundario,
      enlaceBotonSecundario: datos.enlaceBotonSecundario,
      tieneImagenPersonalizada: datos.imagen !== null && datos.imagenMimeType !== null,
      imagenBytes: datos.imagen,
      imagenMimeType: datos.imagenMimeType,
      orden: datos.orden,
      focoX: datos.focoX,
      focoY: datos.focoY,
      estado: datos.estado,
      idAutor: datos.idAutor,
      nombreAutor: 'Carlos Mendoza',
      fechaCreacion: ahora,
      fechaActualizacion: ahora,
    };
    this.filas.push(nueva);
    return nueva;
  }

  async editar(
    idBanner: number,
    datos: EditarBannerRepositorioInput,
  ): Promise<BannerInicioAdminEntity> {
    const f = this.filas.find((x) => x.idBanner === idBanner);
    if (!f) throw new Error('No encontrado');
    if (datos.tituloLinea1 !== undefined) f.tituloLinea1 = datos.tituloLinea1;
    if (datos.tituloLinea2 !== undefined) f.tituloLinea2 = datos.tituloLinea2;
    if (datos.descripcion !== undefined) f.descripcion = datos.descripcion;
    if (datos.textoBotonPrimario !== undefined) f.textoBotonPrimario = datos.textoBotonPrimario;
    if (datos.enlaceBotonPrimario !== undefined) f.enlaceBotonPrimario = datos.enlaceBotonPrimario;
    if (datos.textoBotonSecundario !== undefined)
      f.textoBotonSecundario = datos.textoBotonSecundario;
    if (datos.enlaceBotonSecundario !== undefined)
      f.enlaceBotonSecundario = datos.enlaceBotonSecundario;
    if (datos.imagen !== undefined) f.imagenBytes = datos.imagen;
    if (datos.imagenMimeType !== undefined) f.imagenMimeType = datos.imagenMimeType;
    f.tieneImagenPersonalizada = f.imagenBytes !== null && f.imagenMimeType !== null;
    if (datos.orden !== undefined) f.orden = datos.orden;
    if (datos.focoX !== undefined) f.focoX = datos.focoX;
    if (datos.focoY !== undefined) f.focoY = datos.focoY;
    f.idAutor = datos.idAutor;
    f.fechaActualizacion = new Date().toISOString();
    return f;
  }

  async cambiarEstado(
    idBanner: number,
    estado: EstadoBannerInicio,
    idAutor: number,
  ): Promise<BannerInicioAdminEntity> {
    const f = this.filas.find((x) => x.idBanner === idBanner);
    if (!f) throw new Error('No encontrado');
    f.estado = estado;
    f.idAutor = idAutor;
    f.fechaActualizacion = new Date().toISOString();
    return f;
  }

  async eliminar(idBanner: number): Promise<void> {
    this.filas = this.filas.filter((x) => x.idBanner !== idBanner);
  }
}

describe('FP-01 · Banners de Inicio (Contrato espejo y HTTP)', () => {
  const repo = new InMemoryBannersRepository();
  let server: Server;
  let baseUrl = '';

  beforeAll(async () => {
    const app = express();
    app.use(construirParserJson());

    const autorizacionMock = {
      exigirPermiso: async (actor: { idUsuario: number }) => actor.idUsuario === 1,
    };

    const autenticarMock = (req: Request, res: Response, next: NextFunction) => {
      const header = req.header('x-test-user');
      if (!header) {
        res.status(404).json({
          success: false,
          error: {
            code: 'RECURSO_NO_DISPONIBLE',
            message: 'El recurso solicitado no está disponible.',
          },
        });
        return;
      }
      req.actor = {
        idUsuario: Number(header),
        idSesion: 'sesion-test',
        tipoSesion: 'admin',
      };
      next();
    };

    const rutas = construirRutasLandingBanners(autorizacionMock, repo);
    app.use('/api/v1/admin/landing', autenticarMock, rutas.adminRouter);
    app.use('/api/v1/landing', rutas.publicRouter);

    await new Promise<void>((resolvePromise) => {
      server = app.listen(0, () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${String(addr.port)}`;
        resolvePromise();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolvePromise) => {
      server.close(() => resolvePromise());
    });
  });

  beforeEach(() => {
    repo.reset();
  });

  it('fp01-landing.dto.ts es espejo exacto de contracts/fp01-landing.contract.ts', () => {
    const quitarComentarios = (t: string) =>
      t
        .replace(/\/\*\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .trim();
    const contrato = readFileSync(resolve(RAIZ, 'contracts/fp01-landing.contract.ts'), 'utf8');
    const dto = readFileSync(resolve(__dirname, '..', 'fp01-landing.dto.ts'), 'utf8');
    expect(quitarComentarios(dto)).toBe(quitarComentarios(contrato));
  });

  it('lista públicamente solo los banners activos ordenados y sin exponer campos de autoría', async () => {
    const res = await fetch(`${baseUrl}/api/v1/landing/banners`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      success: boolean;
      data: Array<Record<string, unknown>>;
    };
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0]?.tituloLinea1).toBe('Todo para tu proyecto,');
    expect(json.data[0]).not.toHaveProperty('idAutor');
    expect(json.data[0]).not.toHaveProperty('estado');
  });

  it('permite al administrador crear un banner con imagen PNG, servirla y actualizar el carrusel público', async () => {
    const crearRes = await fetch(`${baseUrl}/api/v1/admin/landing/banners`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user': '1',
      },
      body: JSON.stringify({
        tituloLinea1: 'Promoción de esmaltes',
        tituloLinea2: 'para metal y madera',
        descripcion: 'Protección anticorrosiva y acabado brillante o mate con secado rápido.',
        textoBotonPrimario: 'Ver esmaltes',
        enlaceBotonPrimario: '/productos?categoria=1',
        textoBotonSecundario: 'Centro de ayuda',
        enlaceBotonSecundario: '/centro-de-ayuda',
        imagenBase64: PNG_1X1.toString('base64'),
        imagenMimeType: 'image/png',
        orden: 0,
        estado: 'activo',
      }),
    });
    expect(crearRes.status).toBe(201);
    const creado = (await crearRes.json()) as {
      data: { idBanner: number; tieneImagenPersonalizada: boolean };
    };
    expect(creado.data.tieneImagenPersonalizada).toBe(true);

    // La imagen personalizada se sirve con su MIME correcto
    const imgRes = await fetch(
      `${baseUrl}/api/v1/landing/banners/${String(creado.data.idBanner)}/imagen`,
    );
    expect(imgRes.status).toBe(200);
    expect(imgRes.headers.get('content-type')).toBe('image/png');
    const bytes = Buffer.from(await imgRes.arrayBuffer());
    expect(bytes.equals(PNG_1X1)).toBe(true);

    // El listado público se invalida y devuelve ahora los 2 banners activos en orden
    const pubRes = await fetch(`${baseUrl}/api/v1/landing/banners`);
    const pubJson = (await pubRes.json()) as { data: Array<{ idBanner: number }> };
    expect(pubJson.data.map((b) => b.idBanner)).toEqual([creado.data.idBanner, 1]);
  });

  it('el punto de enfoque se guarda, se publica, vale el centro por defecto y se puede mover al editar', async () => {
    const cuerpo = {
      tituloLinea1: 'Banner con enfoque',
      descripcion: 'Una imagen de cualquier forma con su punto de enfoque.',
      textoBotonPrimario: 'Ver más',
      enlaceBotonPrimario: '/productos',
      imagenBase64: PNG_1X1.toString('base64'),
      imagenMimeType: 'image/png',
    };
    const enviar = async (metodo: string, ruta: string, extra: object) =>
      fetch(`${baseUrl}/api/v1/admin/landing/banners${ruta}`, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', 'x-test-user': '1' },
        body: JSON.stringify({ ...(metodo === 'POST' ? cuerpo : {}), ...extra }),
      });
    const sin = (await (await enviar('POST', '', {})).json()) as { data: { idBanner: number; focoX: number; focoY: number } };
    expect([sin.data.focoX, sin.data.focoY]).toEqual([50, 50]);

    const con = await enviar('POST', '', { focoX: 20, focoY: 80 });
    expect(con.status).toBe(201);
    const creado = (await con.json()) as { data: { idBanner: number; focoX: number; focoY: number } };
    expect([creado.data.focoX, creado.data.focoY]).toEqual([20, 80]);

    const pub = (await (await fetch(`${baseUrl}/api/v1/landing/banners`)).json()) as { data: Array<{ idBanner: number; focoX: number; focoY: number }> };
    expect(pub.data.find((b) => b.idBanner === creado.data.idBanner)).toMatchObject({ focoX: 20, focoY: 80 });

    const editado = await enviar('PUT', `/${String(creado.data.idBanner)}`, { focoX: 0, focoY: 100 });
    expect(editado.status).toBe(200);
    expect(((await editado.json()) as { data: { focoX: number; focoY: number } }).data).toMatchObject({ focoX: 0, focoY: 100 });

    for (const foco of [{ focoX: -1 }, { focoY: 101 }, { focoX: 10.5 }, { focoX: 'a' }]) {
      expect((await enviar('POST', '', foco)).status, JSON.stringify(foco)).toBe(400);
    }
  });

  it('rechaza imágenes corruptas y bloquea accesos sin permiso con 404 opaco', async () => {
    const sinPermiso = await fetch(`${baseUrl}/api/v1/admin/landing/banners`, {
      headers: { 'x-test-user': '99' },
    });
    expect(sinPermiso.status).toBe(404);

    const corrupta = await fetch(`${baseUrl}/api/v1/admin/landing/banners`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user': '1',
      },
      body: JSON.stringify({
        tituloLinea1: 'Banner con archivo falso',
        descripcion: 'Descripción válida de prueba para el banner.',
        textoBotonPrimario: 'Ver más',
        enlaceBotonPrimario: '/productos',
        imagenBase64: Buffer.from('esto no es un png').toString('base64'),
        imagenMimeType: 'image/png',
      }),
    });
    expect(corrupta.status).toBe(400);
  });
});
