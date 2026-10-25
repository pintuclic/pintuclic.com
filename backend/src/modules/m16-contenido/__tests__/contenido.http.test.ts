import express, { type Express } from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Actor } from '../../m20-seguridad/interfaces/actor.interface';
import type { AuditoriaPort } from '../../m20-seguridad/interfaces/auditoria.port';
import {
  AutorizacionService,
  type ResolutorPermisos,
} from '../../m20-seguridad/services/autorizacion.service';
import {
  MENSAJE_RECURSO_NO_DISPONIBLE,
  PERMISOS_CONTENIDO,
  type EstadoFaq,
  type EstadoPaginaContenido,
  type FaqAdminEntity,
  type FaqPublicaItem,
  type FiltroFaqAdminQuery,
  type FiltroPaginasAdminQuery,
  type PaginaAdminEntity,
  type PaginaPublicaDetalle,
  type PaginaPublicaResumen,
} from '../dtos/m16-contenido.dto';
import type {
  CrearFaqDatos,
  CrearPaginaDatos,
  EditarFaqDatos,
  EditarPaginaDatos,
  FaqRepositoryPort,
  PaginasRepositoryPort,
} from '../interfaces/contenido.interface';
import { construirModuloM16, type ModuloM16 } from '../m16.routes';

const ACTORES = {
  admin: {
    idUsuario: 1,
    idSesion: 'sid-admin-m16',
    tipoSesion: 'admin',
  } satisfies Actor,
  lector: {
    idUsuario: 2,
    idSesion: 'sid-lector-m16',
    tipoSesion: 'admin',
  } satisfies Actor,
  cliente: {
    idUsuario: 99,
    idSesion: 'sid-cliente-m16',
    tipoSesion: 'cliente',
  } satisfies Actor,
};

type NombreActor = keyof typeof ACTORES;

const PERMISOS_POR_USUARIO: Record<number, readonly string[]> = {
  1: [PERMISOS_CONTENIDO.ver, PERMISOS_CONTENIDO.editar],
  2: [PERMISOS_CONTENIDO.ver],
  99: [],
};

class PaginasMemoriaRepository implements PaginasRepositoryPort {
  private items: PaginaAdminEntity[] = [];
  private seq = 1;

  sembrar(iniciales: PaginaAdminEntity[]): void {
    this.items = iniciales.map((i) => ({ ...i }));
    this.seq =
      iniciales.reduce((max, actual) => Math.max(max, actual.idPagina), 0) + 1;
  }

  listarPublicadas(): Promise<PaginaPublicaResumen[]> {
    const publicadas = this.items
      .filter((p) => p.estado === 'publicado')
      .sort((a, b) => a.idPagina - b.idPagina)
      .map((p) => ({
        slug: p.slug,
        titulo: p.titulo,
        resumen: p.resumen,
        fechaActualizacion: p.fechaActualizacion,
      }));
    return Promise.resolve(publicadas);
  }

  obtenerPublicadaPorSlug(slug: string): Promise<PaginaPublicaDetalle | null> {
    const encontrada = this.items.find(
      (p) => p.slug === slug && p.estado === 'publicado',
    );
    if (!encontrada) return Promise.resolve(null);
    return Promise.resolve({
      slug: encontrada.slug,
      titulo: encontrada.titulo,
      resumen: encontrada.resumen,
      cuerpoMarkdown: encontrada.cuerpoMarkdown,
      fechaActualizacion: encontrada.fechaActualizacion,
    });
  }

  listarAdmin(filtro: FiltroPaginasAdminQuery): Promise<PaginaAdminEntity[]> {
    const busq = filtro.busqueda?.toLowerCase();
    const res = this.items
      .filter((p) => (filtro.estado ? p.estado === filtro.estado : true))
      .filter((p) =>
        busq
          ? p.titulo.toLowerCase().includes(busq) ||
            p.slug.toLowerCase().includes(busq)
          : true,
      )
      .sort((a, b) => a.idPagina - b.idPagina);
    return Promise.resolve(res);
  }

  obtenerPorId(idPagina: number): Promise<PaginaAdminEntity | null> {
    return Promise.resolve(
      this.items.find((p) => p.idPagina === idPagina) ?? null,
    );
  }

  existeSlug(slug: string, excluirIdPagina?: number): Promise<boolean> {
    const existe = this.items.some(
      (p) =>
        p.slug.toLowerCase() === slug.toLowerCase() &&
        (excluirIdPagina === undefined || p.idPagina !== excluirIdPagina),
    );
    return Promise.resolve(existe);
  }

  crear(datos: CrearPaginaDatos): Promise<PaginaAdminEntity> {
    const ahora = new Date().toISOString();
    const nueva: PaginaAdminEntity = {
      idPagina: this.seq++,
      slug: datos.slug,
      titulo: datos.titulo,
      resumen: datos.resumen ?? null,
      cuerpoMarkdown: datos.cuerpoMarkdown,
      estado: datos.estado,
      idAutor: datos.idAutor,
      nombreAutor: datos.idAutor === 1 ? 'Admin General' : null,
      fechaCreacion: ahora,
      fechaActualizacion: ahora,
    };
    this.items.push(nueva);
    return Promise.resolve(nueva);
  }

  editar(idPagina: number, datos: EditarPaginaDatos): Promise<PaginaAdminEntity> {
    const idx = this.items.findIndex((p) => p.idPagina === idPagina);
    const actual = this.items[idx]!;
    const actualizada: PaginaAdminEntity = {
      ...actual,
      ...(datos.slug !== undefined ? { slug: datos.slug } : {}),
      ...(datos.titulo !== undefined ? { titulo: datos.titulo } : {}),
      ...(datos.resumen !== undefined ? { resumen: datos.resumen } : {}),
      ...(datos.cuerpoMarkdown !== undefined
        ? { cuerpoMarkdown: datos.cuerpoMarkdown }
        : {}),
      idAutor: datos.idAutor,
      fechaActualizacion: new Date().toISOString(),
    };
    this.items[idx] = actualizada;
    return Promise.resolve(actualizada);
  }

  cambiarEstado(
    idPagina: number,
    estado: EstadoPaginaContenido,
    idAutor: number | null,
  ): Promise<PaginaAdminEntity> {
    const idx = this.items.findIndex((p) => p.idPagina === idPagina);
    const actual = this.items[idx]!;
    const actualizada: PaginaAdminEntity = {
      ...actual,
      estado,
      idAutor,
      fechaActualizacion: new Date().toISOString(),
    };
    this.items[idx] = actualizada;
    return Promise.resolve(actualizada);
  }
}

class FaqMemoriaRepository implements FaqRepositoryPort {
  private items: FaqAdminEntity[] = [];
  private seq = 1;

  sembrar(iniciales: FaqAdminEntity[]): void {
    this.items = iniciales.map((i) => ({ ...i }));
    this.seq =
      iniciales.reduce((max, actual) => Math.max(max, actual.idFaq), 0) + 1;
  }

  listarActivas(): Promise<FaqPublicaItem[]> {
    const activas = this.items
      .filter((f) => f.estado === 'activo')
      .sort((a, b) => (a.orden !== b.orden ? a.orden - b.orden : a.idFaq - b.idFaq))
      .map((f) => ({
        idFaq: f.idFaq,
        pregunta: f.pregunta,
        respuestaMarkdown: f.respuestaMarkdown,
        orden: f.orden,
      }));
    return Promise.resolve(activas);
  }

  listarAdmin(filtro: FiltroFaqAdminQuery): Promise<FaqAdminEntity[]> {
    const busq = filtro.busqueda?.toLowerCase();
    const res = this.items
      .filter((f) => (filtro.estado ? f.estado === filtro.estado : true))
      .filter((f) =>
        busq
          ? f.pregunta.toLowerCase().includes(busq) ||
            f.respuestaMarkdown.toLowerCase().includes(busq)
          : true,
      )
      .sort((a, b) => (a.orden !== b.orden ? a.orden - b.orden : a.idFaq - b.idFaq));
    return Promise.resolve(res);
  }

  obtenerPorId(idFaq: number): Promise<FaqAdminEntity | null> {
    return Promise.resolve(this.items.find((f) => f.idFaq === idFaq) ?? null);
  }

  crear(datos: CrearFaqDatos): Promise<FaqAdminEntity> {
    const ahora = new Date().toISOString();
    const nueva: FaqAdminEntity = {
      idFaq: this.seq++,
      pregunta: datos.pregunta,
      respuestaMarkdown: datos.respuestaMarkdown,
      orden: datos.orden,
      estado: datos.estado,
      idAutor: datos.idAutor,
      nombreAutor: datos.idAutor === 1 ? 'Admin General' : null,
      fechaCreacion: ahora,
      fechaActualizacion: ahora,
    };
    this.items.push(nueva);
    return Promise.resolve(nueva);
  }

  editar(idFaq: number, datos: EditarFaqDatos): Promise<FaqAdminEntity> {
    const idx = this.items.findIndex((f) => f.idFaq === idFaq);
    const actual = this.items[idx]!;
    const actualizada: FaqAdminEntity = {
      ...actual,
      ...(datos.pregunta !== undefined ? { pregunta: datos.pregunta } : {}),
      ...(datos.respuestaMarkdown !== undefined
        ? { respuestaMarkdown: datos.respuestaMarkdown }
        : {}),
      ...(datos.orden !== undefined ? { orden: datos.orden } : {}),
      idAutor: datos.idAutor,
      fechaActualizacion: new Date().toISOString(),
    };
    this.items[idx] = actualizada;
    return Promise.resolve(actualizada);
  }

  cambiarEstado(
    idFaq: number,
    estado: EstadoFaq,
    idAutor: number | null,
  ): Promise<FaqAdminEntity> {
    const idx = this.items.findIndex((f) => f.idFaq === idFaq);
    const actual = this.items[idx]!;
    const actualizada: FaqAdminEntity = {
      ...actual,
      estado,
      idAutor,
      fechaActualizacion: new Date().toISOString(),
    };
    this.items[idx] = actualizada;
    return Promise.resolve(actualizada);
  }

  cambiarOrden(
    idFaq: number,
    orden: number,
    idAutor: number | null,
  ): Promise<FaqAdminEntity> {
    const idx = this.items.findIndex((f) => f.idFaq === idFaq);
    const actual = this.items[idx]!;
    const actualizada: FaqAdminEntity = {
      ...actual,
      orden,
      idAutor,
      fechaActualizacion: new Date().toISOString(),
    };
    this.items[idx] = actualizada;
    return Promise.resolve(actualizada);
  }
}

interface RespuestaJson {
  status: number;
  cuerpo: {
    success: boolean;
    data?: unknown;
    error?: { code: string; message: string };
  };
}

describe('M16 · Contenido Institucional y Centro de Ayuda (HTTP + Dominio)', () => {
  const paginasRepo = new PaginasMemoriaRepository();
  const faqRepo = new FaqMemoriaRepository();
  const auditoria = {
    registrarAccesoDenegado: vi.fn(),
  } satisfies AuditoriaPort;

  let servidor: Server;
  let baseUrl: string;
  let modulo: ModuloM16;

  beforeAll(async () => {
    const resolutor: ResolutorPermisos = {
      tienePermiso: (idUsuario, codigo) =>
        Promise.resolve(PERMISOS_POR_USUARIO[idUsuario]?.includes(codigo) === true),
    };
    const autorizacion = new AutorizacionService(resolutor, auditoria);
    modulo = construirModuloM16(autorizacion, { paginasRepo, faqRepo });

    const app: Express = express();
    app.use(express.json());
    app.use('/api/v1/admin/contenido', (req, _res, next) => {
      const nombre = req.header('x-actor');
      if (nombre !== undefined && nombre in ACTORES) {
        req.actor = ACTORES[nombre as NombreActor];
      }
      next();
    });
    app.use('/api/v1/admin/contenido', modulo.adminRouter);
    app.use('/api/v1/contenido', modulo.publicRouter);

    servidor = await new Promise((resolver) => {
      const s = app.listen(0, () => resolver(s));
    });
    baseUrl = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolver) => servidor.close(() => resolver()));
  });

  beforeEach(() => {
    auditoria.registrarAccesoDenegado.mockClear();
    const fechaSemilla = '2026-10-24T12:00:00.000Z';
    paginasRepo.sembrar([
      {
        idPagina: 1,
        slug: 'sobre-nosotros',
        titulo: 'Sobre Nosotros',
        resumen: 'Misión, visión y horarios.',
        cuerpoMarkdown: '## Misión\nOfrecer pinturas de alta calidad.',
        estado: 'publicado',
        idAutor: 1,
        nombreAutor: 'Admin General',
        fechaCreacion: fechaSemilla,
        fechaActualizacion: fechaSemilla,
      },
      {
        idPagina: 2,
        slug: 'borrador-interno',
        titulo: 'Borrador Interno',
        resumen: null,
        cuerpoMarkdown: 'Contenido aún en redacción interna.',
        estado: 'borrador',
        idAutor: 1,
        nombreAutor: 'Admin General',
        fechaCreacion: fechaSemilla,
        fechaActualizacion: fechaSemilla,
      },
      {
        idPagina: 3,
        slug: 'politica-antigua',
        titulo: 'Política Antigua',
        resumen: null,
        cuerpoMarkdown: 'Contenido archivado histórico.',
        estado: 'archivado',
        idAutor: 1,
        nombreAutor: 'Admin General',
        fechaCreacion: fechaSemilla,
        fechaActualizacion: fechaSemilla,
      },
    ]);

    faqRepo.sembrar([
      {
        idFaq: 1,
        pregunta: '¿Cuándo aplica el envío gratis?',
        respuestaMarkdown: 'A partir de $200.000 COP en tu orden.',
        orden: 2,
        estado: 'activo',
        idAutor: 1,
        nombreAutor: 'Admin General',
        fechaCreacion: fechaSemilla,
        fechaActualizacion: fechaSemilla,
      },
      {
        idFaq: 2,
        pregunta: '¿Cómo solicito cuenta empresa?',
        respuestaMarkdown: 'Adjuntando RUT y NIT en el registro.',
        orden: 1,
        estado: 'activo',
        idAutor: 1,
        nombreAutor: 'Admin General',
        fechaCreacion: fechaSemilla,
        fechaActualizacion: fechaSemilla,
      },
      {
        idFaq: 3,
        pregunta: 'Pregunta inactiva de prueba',
        respuestaMarkdown: 'No debe verse en público.',
        orden: 0,
        estado: 'inactivo',
        idAutor: 1,
        nombreAutor: 'Admin General',
        fechaCreacion: fechaSemilla,
        fechaActualizacion: fechaSemilla,
      },
    ]);
  });

  async function peticionAdmin(
    actor: NombreActor | null,
    metodo: 'GET' | 'POST' | 'PUT' | 'PATCH',
    ruta: string,
    cuerpo?: unknown,
  ): Promise<RespuestaJson> {
    const r = await fetch(`${baseUrl}/api/v1/admin/contenido${ruta}`, {
      method: metodo,
      headers: {
        'content-type': 'application/json',
        ...(actor !== null ? { 'x-actor': actor } : {}),
      },
      ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
    });
    return {
      status: r.status,
      cuerpo: (await r.json()) as RespuestaJson['cuerpo'],
    };
  }

  async function peticionPublica(ruta: string): Promise<RespuestaJson> {
    const r = await fetch(`${baseUrl}/api/v1/contenido${ruta}`);
    return {
      status: r.status,
      cuerpo: (await r.json()) as RespuestaJson['cuerpo'],
    };
  }

  describe('Seguridad y control de acceso en servidor (ADR-002 / ADR-003 / RN-SEG-08)', () => {
    it('responde 404 opaco RECURSO_NO_DISPONIBLE sin sesión o con actor cliente sin permiso', async () => {
      const sinSesion = await peticionAdmin(null, 'GET', '/paginas');
      const cliente = await peticionAdmin('cliente', 'GET', '/paginas');

      expect(sinSesion.status).toBe(404);
      expect(sinSesion.cuerpo).toEqual({
        success: false,
        error: {
          code: 'RECURSO_NO_DISPONIBLE',
          message: MENSAJE_RECURSO_NO_DISPONIBLE,
          details: null,
        },
      });
      expect(cliente.status).toBe(404);
      expect(cliente.cuerpo).toEqual(sinSesion.cuerpo);
      expect(auditoria.registrarAccesoDenegado).toHaveBeenCalled();
    });

    it('permite consultar con configuracion.ver pero deniega mutaciones sin configuracion.editar', async () => {
      const lectura = await peticionAdmin('lector', 'GET', '/paginas');
      expect(lectura.status).toBe(200);

      const creacion = await peticionAdmin('lector', 'POST', '/paginas', {
        slug: 'nueva-pagina',
        titulo: 'Nueva Página',
        cuerpoMarkdown: 'Contenido suficiente para la página.',
        estado: 'borrador',
      });
      expect(creacion.status).toBe(404);
      expect(creacion.cuerpo.error?.code).toBe('RECURSO_NO_DISPONIBLE');
    });
  });

  describe('HU-CON-03 · Consulta pública de páginas institucionales', () => {
    it('lista únicamente las páginas en estado publicado sin filtrar metadatos internos', async () => {
      const r = await peticionPublica('/paginas');
      expect(r.status).toBe(200);
      const data = r.cuerpo.data as PaginaPublicaResumen[];
      expect(data).toHaveLength(1);
      expect(data[0]?.slug).toBe('sobre-nosotros');
      expect(data[0]).not.toHaveProperty('idAutor');
      expect(data[0]).not.toHaveProperty('estado');
    });

    it('obtiene el detalle de una página publicada por su slug y devuelve 404 opaco en borradores o archivadas', async () => {
      const ok = await peticionPublica('/paginas/sobre-nosotros');
      expect(ok.status).toBe(200);
      expect((ok.cuerpo.data as PaginaPublicaDetalle).titulo).toBe('Sobre Nosotros');
      expect(ok.cuerpo.data).not.toHaveProperty('idAutor');

      const borrador = await peticionPublica('/paginas/borrador-interno');
      expect(borrador.status).toBe(404);
      expect(borrador.cuerpo.error?.code).toBe('RECURSO_NO_DISPONIBLE');

      const archivada = await peticionPublica('/paginas/politica-antigua');
      expect(archivada.status).toBe(404);
      expect(archivada.cuerpo.error?.code).toBe('RECURSO_NO_DISPONIBLE');
    });
  });

  describe('HU-CON-04 · Consulta pública de FAQ y puerto hacia M15', () => {
    it('lista solo las FAQ activas ordenadas por orden ascendente y expone el mismo catálogo por ContenidoFaqPort', async () => {
      const r = await peticionPublica('/faq');
      expect(r.status).toBe(200);
      const data = r.cuerpo.data as FaqPublicaItem[];
      expect(data.map((i) => i.idFaq)).toEqual([2, 1]);
      expect(data[0]).not.toHaveProperty('idAutor');
      expect(data[0]).not.toHaveProperty('estado');

      const porPuerto = await modulo.faqPort.listarFaqPublicas();
      expect(porPuerto).toEqual(data);
    });
  });

  describe('HU-CON-01 · Gestión administrativa de páginas institucionales', () => {
    it('crea, edita, previene slugs duplicados (409 SLUG_DUPLICADO) y cambia el estado de publicación', async () => {
      const creada = await peticionAdmin('admin', 'POST', '/paginas', {
        slug: 'terminos-y-condiciones',
        titulo: 'Términos y Condiciones',
        resumen: 'Marco contractual de uso.',
        cuerpoMarkdown: '## Aceptación\nCondiciones generales aplicables.',
        estado: 'borrador',
      });
      expect(creada.status).toBe(201);
      const entidad = creada.cuerpo.data as PaginaAdminEntity;
      expect(entidad.slug).toBe('terminos-y-condiciones');
      expect(entidad.idAutor).toBe(1);

      const duplicada = await peticionAdmin('admin', 'POST', '/paginas', {
        slug: 'terminos-y-condiciones',
        titulo: 'Otra página igual',
        cuerpoMarkdown: 'Contenido duplicado de prueba.',
        estado: 'borrador',
      });
      expect(duplicada.status).toBe(409);
      expect(duplicada.cuerpo.error?.code).toBe('SLUG_DUPLICADO');

      const editada = await peticionAdmin(
        'admin',
        'PUT',
        `/paginas/${entidad.idPagina}`,
        {
          titulo: 'Términos y Condiciones Oficiales',
        },
      );
      expect(editada.status).toBe(200);
      expect((editada.cuerpo.data as PaginaAdminEntity).titulo).toBe(
        'Términos y Condiciones Oficiales',
      );

      const publicada = await peticionAdmin(
        'admin',
        'PATCH',
        `/paginas/${entidad.idPagina}/estado`,
        { estado: 'publicado' },
      );
      expect(publicada.status).toBe(200);
      expect((publicada.cuerpo.data as PaginaAdminEntity).estado).toBe('publicado');

      const ahoraVisible = await peticionPublica('/paginas/terminos-y-condiciones');
      expect(ahoraVisible.status).toBe(200);
    });
  });

  describe('HU-CON-02 · Gestión administrativa de FAQ', () => {
    it('crea, edita, cambia orden y activa/inactiva entradas de FAQ', async () => {
      const creada = await peticionAdmin('admin', 'POST', '/faq', {
        pregunta: '¿Qué medios de pago aceptan?',
        respuestaMarkdown: 'Aceptamos PSE, tarjetas y transferencia.',
        orden: 5,
        estado: 'activo',
      });
      expect(creada.status).toBe(201);
      const faq = creada.cuerpo.data as FaqAdminEntity;

      const reordenada = await peticionAdmin(
        'admin',
        'PATCH',
        `/faq/${faq.idFaq}/orden`,
        { orden: 0 },
      );
      expect(reordenada.status).toBe(200);
      expect((reordenada.cuerpo.data as FaqAdminEntity).orden).toBe(0);

      const inactivada = await peticionAdmin(
        'admin',
        'PATCH',
        `/faq/${faq.idFaq}/estado`,
        { estado: 'inactivo' },
      );
      expect(inactivada.status).toBe(200);
      expect((inactivada.cuerpo.data as FaqAdminEntity).estado).toBe('inactivo');
    });
  });
});
