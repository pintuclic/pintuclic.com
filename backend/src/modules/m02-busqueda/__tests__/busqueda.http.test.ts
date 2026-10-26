import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express, { type Express } from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Actor } from '../../m20-seguridad/interfaces/actor.interface';
import type { AuditoriaPort } from '../../m20-seguridad/interfaces/auditoria.port';
import {
  AutorizacionService,
  type ResolutorPermisos,
} from '../../m20-seguridad/services/autorizacion.service';
import type {
  BuscarColoresRequest,
  BuscarProductosRequest,
  BusquedaSinResultado,
  ColorBuscado,
  ContextoPrecio,
  ListarSinResultadoRequest,
  OpcionesFiltro,
  OpcionesFiltroRequest,
  ResultadoBusqueda,
} from '../dtos/m02-busqueda.dto';
import type { BusquedaRepositoryPort, PaginaResultado } from '../interfaces/busqueda.interface';
import { construirModuloM02, type ModuloM02 } from '../m02.routes';

import { normalizarTexto } from '../repositories/busqueda.repository';

class BusquedaMemoriaRepository implements BusquedaRepositoryPort {
  public sinResultadoRegistradas: string[] = [];
  public productos: ResultadoBusqueda[] = [
    {
      idProducto: 1,
      nombre: 'Vinilo Acrílico Tipo 1',
      marca: 'Pintuco',
      linea: 'Viniltex',
      categoria: 'Pinturas Arquitectónicas',
      subcategoria: 'Vinilos',
      precioDesde: 65000,
      tieneColor: true,
      disponibilidad: 'disponible',
      idImagenPrincipal: 10,
      esCombo: false,
      compraBloqueada: false,
      oferta: null,
      patrocinado: false,
      idCampania: null,
      coincidenciaColor: null,
    },
    {
      idProducto: 2,
      nombre: 'Esmalte Sintético Brillante',
      marca: 'Corona',
      linea: null,
      categoria: 'Esmaltes',
      subcategoria: 'Sintéticos',
      precioDesde: 45000,
      tieneColor: true,
      disponibilidad: 'disponible',
      idImagenPrincipal: 11,
      esCombo: false,
      compraBloqueada: false,
      oferta: null,
      patrocinado: false,
      idCampania: null,
      coincidenciaColor: 'Amarillo Cromo',
    },
    {
      idProducto: 3,
      nombre: 'Brocha Profesional 2 Pulgadas',
      marca: 'Pintuco',
      linea: null,
      categoria: 'Herramientas',
      subcategoria: 'Brochas',
      precioDesde: 12000,
      tieneColor: false,
      disponibilidad: 'disponible',
      idImagenPrincipal: null,
      esCombo: false,
      compraBloqueada: false,
      oferta: null,
      patrocinado: false,
      idCampania: null,
      coincidenciaColor: null,
    },
  ];

  async buscarProductos(
    filtros: BuscarProductosRequest,
    _contexto: ContextoPrecio,
  ): Promise<PaginaResultado<ResultadoBusqueda>> {
    let items = [...this.productos];

    if (filtros.q) {
      const qNorm = normalizarTexto(filtros.q);
      items = items.filter(
        (p) =>
          normalizarTexto(p.nombre).includes(qNorm) ||
          normalizarTexto(p.marca).includes(qNorm) ||
          (p.linea && normalizarTexto(p.linea).includes(qNorm)) ||
          (p.coincidenciaColor && normalizarTexto(p.coincidenciaColor).includes(qNorm)),
      );
    }

    if (filtros.precioMin !== undefined) {
      items = items.filter((p) => p.precioDesde !== null && p.precioDesde >= filtros.precioMin!);
    }
    if (filtros.precioMax !== undefined) {
      items = items.filter((p) => p.precioDesde !== null && p.precioDesde <= filtros.precioMax!);
    }

    if (filtros.ordenar === 'precio_asc') {
      items.sort((a, b) => (a.precioDesde ?? 0) - (b.precioDesde ?? 0));
    } else if (filtros.ordenar === 'precio_desc') {
      items.sort((a, b) => (b.precioDesde ?? 0) - (a.precioDesde ?? 0));
    }

    const total = items.length;
    const pagina = filtros.pagina;
    const limite = filtros.limite;
    const totalPaginas = Math.ceil(total / limite);
    const paginados = items.slice((pagina - 1) * limite, pagina * limite);

    return {
      items: paginados,
      total,
      pagina,
      limite,
      totalPaginas,
    };
  }

  async obtenerOpcionesFiltro(
    _filtros: OpcionesFiltroRequest,
    _contexto: ContextoPrecio,
  ): Promise<OpcionesFiltro> {
    return {
      totalResultados: this.productos.length,
      categorias: [
        { id: 1, nombre: 'Pinturas Arquitectónicas', total: 1 },
        { id: 2, nombre: 'Esmaltes', total: 1 },
        { id: 3, nombre: 'Herramientas', total: 1 },
      ],
      subcategorias: [
        { id: 10, nombre: 'Vinilos', idCategoria: 1, total: 1 },
        { id: 20, nombre: 'Sintéticos', idCategoria: 2, total: 1 },
        { id: 30, nombre: 'Brochas', idCategoria: 3, total: 1 },
      ],
      marcas: [
        { id: 100, nombre: 'Pintuco', total: 2 },
        { id: 200, nombre: 'Corona', total: 1 },
      ],
      lineas: [{ id: 1000, nombre: 'Viniltex', idMarca: 100, total: 1 }],
      tiposResina: [{ id: 50, nombre: 'Vinil Acrílica', total: 1 }],
      familiasColor: [{ id: 1, nombre: 'Amarillos', hexadecimal: '#FFE57F', total: 1 }],
      presentaciones: [{ id: 1, nombre: '1 Galón', total: 2 }],
      superficies: [{ id: 1, nombre: 'Paredes y Muros', total: 1 }],
      precio: { minimo: 12000, maximo: 65000 },
    };
  }

  async buscarColores(filtros: BuscarColoresRequest): Promise<PaginaResultado<ColorBuscado>> {
    const todos: ColorBuscado[] = [
      {
        idColor: 1,
        nombre: 'Amarillo Cromo',
        codigo: 'COR-01',
        hexadecimal: '#FFD700',
        marca: 'Corona',
        familia: 'Amarillos',
      },
      {
        idColor: 2,
        nombre: 'Amarillo Colonial',
        codigo: 'PIN-02',
        hexadecimal: '#F3E5AB',
        marca: 'Pintuco',
        familia: 'Amarillos',
      },
    ];
    const qNorm = filtros.q.toLowerCase().trim();
    const filtrados = todos.filter((c) => c.nombre.toLowerCase().includes(qNorm));

    return {
      items: filtrados,
      total: filtrados.length,
      pagina: filtros.pagina,
      limite: filtros.limite,
      totalPaginas: 1,
    };
  }

  async registrarBusquedaSinResultado(termino: string): Promise<void> {
    this.sinResultadoRegistradas.push(termino);
  }

  async listarBusquedasSinResultado(
    filtros: ListarSinResultadoRequest,
  ): Promise<PaginaResultado<BusquedaSinResultado>> {
    const items: BusquedaSinResultado[] = [
      {
        termino: 'impermeabilizante',
        repeticiones: 15,
        ultimoIntento: '2026-10-25T15:00:00.000Z',
      },
      {
        termino: 'estuco veneciano',
        repeticiones: 8,
        ultimoIntento: '2026-10-24T18:30:00.000Z',
      },
    ];

    return {
      items,
      total: items.length,
      pagina: filtros.pagina,
      limite: filtros.limite,
      totalPaginas: 1,
    };
  }
}

type NombreActor = 'admin' | 'operador' | 'cliente';

const ACTORES: Record<NombreActor, Actor> = {
  admin: {
    idUsuario: 1,
    idSesion: 'sid-admin-m02',
    tipoSesion: 'admin',
  },
  operador: {
    idUsuario: 2,
    idSesion: 'sid-operador-m02',
    tipoSesion: 'admin',
  },
  cliente: {
    idUsuario: 3,
    idSesion: 'sid-cliente-m02',
    tipoSesion: 'cliente',
  },
};

const PERMISOS_POR_USUARIO: Record<number, readonly string[]> = {
  1: ['estadisticas.consultar'],
  2: [],
  3: [],
};

describe('M02 — Búsqueda, filtros y descubrimiento (HTTP + Dominio)', () => {
  const busquedaRepo = new BusquedaMemoriaRepository();
  const auditoria = {
    registrarAccesoDenegado: vi.fn(),
  } satisfies AuditoriaPort;

  let modulo: ModuloM02;
  let servidor: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const resolutor: ResolutorPermisos = {
      tienePermiso: (idUsuario: number, codigo: string) =>
        Promise.resolve(PERMISOS_POR_USUARIO[idUsuario]?.includes(codigo) === true),
    };
    const autorizacion = new AutorizacionService(resolutor, auditoria);
    modulo = construirModuloM02(autorizacion, { busquedaRepo });

    const app: Express = express();
    app.use(express.json());
    app.use('/api/v1/admin/busqueda', (req, _res, next) => {
      const nombre = req.header('x-actor');
      if (nombre !== undefined && nombre in ACTORES) {
        req.actor = ACTORES[nombre as NombreActor];
      }
      next();
    });
    app.use('/api/v1/admin/busqueda', modulo.adminRouter);
    app.use('/api/v1/busqueda', modulo.publicRouter);

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
    busquedaRepo.sinResultadoRegistradas = [];
  });

  async function peticionPublica(ruta: string) {
    const res = await fetch(`${baseUrl}/api/v1/busqueda${ruta}`);
    const cuerpo = (await res.json()) as Record<string, unknown>;
    return { status: res.status, cuerpo };
  }

  async function peticionAdmin(actor: NombreActor | null, ruta: string) {
    const cabeceras: Record<string, string> = {};
    if (actor !== null) {
      cabeceras['x-actor'] = actor;
    }
    const res = await fetch(`${baseUrl}/api/v1/admin/busqueda${ruta}`, {
      headers: cabeceras,
    });
    const cuerpo = (await res.json()) as Record<string, unknown>;
    return { status: res.status, cuerpo };
  }

  describe('HU-BUS-01 & HU-BUS-03 & HU-BUS-05: Búsqueda y paginación de productos', () => {
    it('lista productos activos con paginación canónica', async () => {
      const { status, cuerpo } = await peticionPublica('/productos');
      expect(status).toBe(200);
      expect(cuerpo.success).toBe(true);
      expect(Array.isArray(cuerpo.data)).toBe(true);
      expect(cuerpo.data).toHaveLength(3);
      expect(cuerpo.pagination).toEqual({
        pagina: 1,
        limite: 12,
        total: 3,
        totalPaginas: 1,
      });
    });

    it('busca por término de texto libre', async () => {
      const { status, cuerpo } = await peticionPublica('/productos?q=acrilico');
      expect(status).toBe(200);
      const data = cuerpo.data as ResultadoBusqueda[];
      expect(data).toHaveLength(1);
      expect(data[0]?.nombre).toBe('Vinilo Acrílico Tipo 1');
    });

    it('ordena por precio ascendente y descendente', async () => {
      const asc = await peticionPublica('/productos?ordenar=precio_asc');
      expect(asc.status).toBe(200);
      const dataAsc = asc.cuerpo.data as ResultadoBusqueda[];
      expect(dataAsc[0]?.precioDesde).toBe(12000);

      const desc = await peticionPublica('/productos?ordenar=precio_desc');
      expect(desc.status).toBe(200);
      const dataDesc = desc.cuerpo.data as ResultadoBusqueda[];
      expect(dataDesc[0]?.precioDesde).toBe(65000);
    });

    it('rechaza con 400 PARAMETRO_INVALIDO cuando precioMin > precioMax', async () => {
      const { status, cuerpo } = await peticionPublica('/productos?precioMin=50000&precioMax=20000');
      expect(status).toBe(400);
      expect(cuerpo.success).toBe(false);
      expect(cuerpo.error).toMatchObject({
        code: 'PARAMETRO_INVALIDO',
      });
    });

    it('registra búsqueda sin resultado cuando no hay filtros y total es 0 (HU-BUS-06 / S2)', async () => {
      const { status, cuerpo } = await peticionPublica('/productos?q=termino_inexistente');
      expect(status).toBe(200);
      expect((cuerpo.data as unknown[]).length).toBe(0);
      expect(busquedaRepo.sinResultadoRegistradas).toContain('termino_inexistente');
    });
  });

  describe('HU-BUS-02: Opciones de filtros dinámicos', () => {
    it('retorna las opciones de filtro con sus totales agrupados', async () => {
      const { status, cuerpo } = await peticionPublica('/filtros');
      expect(status).toBe(200);
      expect(cuerpo.success).toBe(true);
      const filtros = cuerpo.data as OpcionesFiltro;
      expect(filtros.totalResultados).toBe(3);
      expect(filtros.categorias).toHaveLength(3);
      expect(filtros.marcas).toHaveLength(2);
      expect(filtros.precio).toEqual({ minimo: 12000, maximo: 65000 });
    });
  });

  describe('GET /busqueda/colores: Búsqueda de colores de carta', () => {
    it('busca colores activos por nombre o código', async () => {
      const { status, cuerpo } = await peticionPublica('/colores?q=cromo');
      expect(status).toBe(200);
      expect(cuerpo.success).toBe(true);
      const data = cuerpo.data as ColorBuscado[];
      expect(data).toHaveLength(1);
      expect(data[0]?.nombre).toBe('Amarillo Cromo');
      expect(data[0]?.marca).toBe('Corona');
    });

    it('rechaza consulta de colores con término vacío', async () => {
      const { status, cuerpo } = await peticionPublica('/colores?q=');
      expect(status).toBe(400);
      expect(cuerpo.success).toBe(false);
    });
  });

  describe('HU-BUS-06: Analítica de búsquedas sin resultado (Admin)', () => {
    it('responde 404 opaco sin sesión o sin permiso estadisticas.consultar', async () => {
      const sinSesion = await peticionAdmin(null, '/sin-resultado');
      expect(sinSesion.status).toBe(404);

      const cliente = await peticionAdmin('cliente', '/sin-resultado');
      expect(cliente.status).toBe(404);

      const operador = await peticionAdmin('operador', '/sin-resultado');
      expect(operador.status).toBe(404);
    });

    it('permite consulta a usuario con permiso estadisticas.consultar', async () => {
      const admin = await peticionAdmin('admin', '/sin-resultado');
      expect(admin.status).toBe(200);
      expect(admin.cuerpo.success).toBe(true);
      const data = admin.cuerpo.data as BusquedaSinResultado[];
      expect(data).toHaveLength(2);
      expect(data[0]?.termino).toBe('impermeabilizante');
      expect(data[0]?.repeticiones).toBe(15);
    });
  });
});
