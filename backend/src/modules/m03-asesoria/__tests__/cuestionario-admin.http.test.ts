import express, { type Express } from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Actor } from '../../m20-seguridad/interfaces/actor.interface';
import type { AuditoriaPort, EventoAccionAuditada } from '../../m20-seguridad/interfaces/auditoria.port';
import {
  AutorizacionService,
  type ResolutorPermisos,
} from '../../m20-seguridad/services/autorizacion.service';
import type {
  ConfiguracionAsesoria,
  EditarConfiguracionRequest,
  OpcionAdmin,
  PreguntaAdmin,
} from '../dtos/cuestionario.dto';
import type {
  ConfiguracionRepositoryPort,
  CuestionarioRepositoryPort,
  VocabularioRepositoryPort,
} from '../interfaces/cuestionario.interface';
import type { ConfiguracionCalculadoraPort } from '../interfaces/calculadora.interface';
import { construirModuloM03 } from '../m03.routes';

/**
 * Panel del cuestionario por HTTP: autorización (ADR-003) y auditoría (A1).
 * Express real con el router de verdad y repositorios en memoria. Sin base de datos.
 */

const ACTORES = {
  editor: { idUsuario: 1, idSesion: 's-1', tipoSesion: 'admin' },
  lector: { idUsuario: 2, idSesion: 's-2', tipoSesion: 'admin' },
  intruso: { idUsuario: 3, idSesion: 's-3', tipoSesion: 'admin' },
} as const satisfies Record<string, Actor>;
type NombreActor = keyof typeof ACTORES;

const PERMISOS_POR_USUARIO: Record<number, string[]> = {
  1: ['asesoria.ver', 'asesoria.editar'],
  2: ['asesoria.ver'],
  3: [],
};

const PREGUNTA: PreguntaAdmin = {
  idPregunta: 1,
  texto: '¿Qué superficie va a pintar?',
  orden: 1,
  activa: true,
  origenOpciones: 'manual',
  opciones: [{ idOpcion: 1, texto: 'Metal', orden: 1, activa: true, efectos: [] }],
};

const OPCION: OpcionAdmin = { idOpcion: 1, texto: 'Metal', orden: 1, activa: true, efectos: [] };

const CONFIG: ConfiguracionAsesoria = {
  modoCuestionario: 'fijo',
  manosPorDefecto: null,
  guionCuestionario: 'guion original',
  guionAsistente: '',
  iaTiempoEsperaMs: 8000,
  iaReintentos: 2,
  iaSuspensionCuotaMinutos: 60,
  iaRetencionIncidentesDias: 90,
  iaFallosConsecutivosAlerta: 5,
  fechaActualizacion: new Date(0).toISOString(),
};

let configuracionActual: ConfiguracionAsesoria = { ...CONFIG };
const auditado: EventoAccionAuditada[] = [];

const cuestionarioRepo: CuestionarioRepositoryPort = {
  listarPublicas: async () => [PREGUNTA],
  listarTodas: async () => [PREGUNTA],
  crearPregunta: async (datos) => ({ ...PREGUNTA, idPregunta: 9, texto: datos.texto, orden: datos.orden }),
  editarPregunta: async (id, datos) =>
    id === 1 ? { ...PREGUNTA, ...(datos.texto === undefined ? {} : { texto: datos.texto }) } : null,
  obtenerPregunta: async (id) => (id === 1 ? PREGUNTA : null),
  crearOpcion: async (id, datos) => (id === 1 ? { ...OPCION, idOpcion: 9, texto: datos.texto } : null),
  editarOpcion: async (id, datos) =>
    id === 1 ? { ...OPCION, ...(datos.texto === undefined ? {} : { texto: datos.texto }) } : null,
  obtenerOpcion: async (id) => (id === 1 ? OPCION : null),
  reemplazarEfectos: async (id, efectos) => (id === 1 ? { ...OPCION, efectos: [...efectos] } : null),
};

const vocabularioRepo: VocabularioRepositoryPort = {
  obtener: async () => [{ dimension: 'superficie', idValor: 3, nombre: 'Metal' }],
  obtenerFamilias: async () => [],
};

const configuracionRepo: ConfiguracionCalculadoraPort & ConfiguracionRepositoryPort = {
  obtenerManosPorDefecto: async () => null,
  obtener: async () => configuracionActual,
  editar: async (datos: EditarConfiguracionRequest) => {
    configuracionActual = {
      ...configuracionActual,
      ...(datos.guionCuestionario === undefined ? {} : { guionCuestionario: datos.guionCuestionario }),
      ...(datos.modoCuestionario === undefined ? {} : { modoCuestionario: datos.modoCuestionario }),
    };
    return configuracionActual;
  },
};

const auditoria: AuditoriaPort = {
  registrarAccesoDenegado: vi.fn(),
  registrarAccion: async (evento) => {
    auditado.push(evento);
  },
};

let servidor: Server;
let base: string;

beforeAll(async () => {
  const resolutor: ResolutorPermisos = {
    tienePermiso: (idUsuario, codigo) =>
      Promise.resolve(PERMISOS_POR_USUARIO[idUsuario]?.includes(codigo) === true),
  };
  const m03 = construirModuloM03(new AutorizacionService(resolutor, auditoria), {
    cuestionarioRepo,
    vocabularioRepo,
    configuracionRepo,
    auditoria,
  });

  const app: Express = express();
  app.use(express.json());
  app.use('/admin/asesoria', (req, _res, next) => {
    const nombre = req.header('x-actor');
    if (nombre !== undefined && nombre in ACTORES) req.actor = ACTORES[nombre as NombreActor];
    next();
  });
  app.use('/admin/asesoria', m03.adminRouter);

  await new Promise<void>((listo) => {
    servidor = app.listen(0, () => {
      base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
      listo();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((listo) => servidor.close(() => listo()));
});

const pedir = async (
  metodo: string,
  ruta: string,
  actor: NombreActor | null,
  cuerpo?: unknown,
): Promise<Response> =>
  fetch(`${base}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(actor === null ? {} : { 'x-actor': actor }),
    },
    ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
  });

describe('Panel del cuestionario (HU-ASE-01 · F1)', () => {
  describe('autorización (ADR-003)', () => {
    it('sin sesión responde 404 opaco, no 401', async () => {
      const respuesta = await pedir('GET', '/admin/asesoria/cuestionario', null);
      expect(respuesta.status).toBe(404);
      const cuerpo = (await respuesta.json()) as { error: { code: string; message: string } };
      expect(cuerpo.error.code).toBe('RECURSO_NO_DISPONIBLE');
      // No revela que el recurso existe ni qué permiso haría falta.
      expect(cuerpo.error.message).not.toContain('asesoria');
    });

    it('un empleado sin permisos de asesoría responde 404', async () => {
      const respuesta = await pedir('GET', '/admin/asesoria/cuestionario', 'intruso');
      expect(respuesta.status).toBe(404);
    });

    it('con `asesoria.ver` se puede consultar', async () => {
      const respuesta = await pedir('GET', '/admin/asesoria/cuestionario', 'lector');
      expect(respuesta.status).toBe(200);
      const cuerpo = (await respuesta.json()) as {
        data: { modo: string; preguntas: unknown[]; vocabulario: unknown[] };
      };
      expect(cuerpo.data.modo).toBe('fijo');
      expect(cuerpo.data.preguntas).toHaveLength(1);
      // F4: el panel recibe los objetivos que puede elegir.
      expect(cuerpo.data.vocabulario).toHaveLength(1);
    });

    it('`asesoria.ver` NO alcanza para escribir', async () => {
      const respuesta = await pedir('POST', '/admin/asesoria/preguntas', 'lector', {
        texto: 'Pregunta nueva',
        orden: 5,
      });
      expect(respuesta.status).toBe(404);
    });

    it('con `asesoria.editar` se puede crear', async () => {
      const respuesta = await pedir('POST', '/admin/asesoria/preguntas', 'editor', {
        texto: 'Pregunta nueva',
        orden: 5,
      });
      expect(respuesta.status).toBe(201);
    });
  });

  describe('RF-ASE-01-02: cambiar la correspondencia opción → filtro', () => {
    it('acepta un efecto cuyo objetivo existe en el catálogo', async () => {
      const respuesta = await pedir('PUT', '/admin/asesoria/opciones/1/efectos', 'editor', {
        efectos: [{ tipo: 'filtrar', dimension: 'superficie', idObjetivo: 3 }],
      });
      expect(respuesta.status).toBe(200);
    });

    it('rechaza un objetivo que no está en el catálogo, antes de guardarlo', async () => {
      const respuesta = await pedir('PUT', '/admin/asesoria/opciones/1/efectos', 'editor', {
        efectos: [{ tipo: 'filtrar', dimension: 'subcategoria', idObjetivo: 999 }],
      });
      expect(respuesta.status).toBe(404);
    });

    it('rechaza una dimensión que M02 no sabe filtrar, como el acabado (V2)', async () => {
      const respuesta = await pedir('PUT', '/admin/asesoria/opciones/1/efectos', 'editor', {
        efectos: [{ tipo: 'filtrar', dimension: 'acabado', idObjetivo: 1 }],
      });
      expect(respuesta.status).toBe(400);
    });
  });

  describe('A1: el cambio queda en el registro de auditoría', () => {
    it('guarda actor, acción, entidad y los dos valores', async () => {
      auditado.length = 0;
      await pedir('PATCH', '/admin/asesoria/configuracion', 'editor', {
        guionCuestionario: 'guion nuevo mucho más largo que el anterior',
      });

      expect(auditado).toHaveLength(1);
      const evento = auditado[0];
      expect(evento?.idUsuario).toBe(1);
      expect(evento?.accion).toBe('asesoria.guion.editar');
      expect(evento?.entidad).toBe('configuracion_asesoria');
      expect(evento?.resultado).toBe('exito');
      // A2: el guion va por longitud y huella, nunca entero.
      expect(evento?.valorAnterior).toMatch(/^largo:\d+ huella:[0-9a-f]{12}$/);
      expect(evento?.valorNuevo).not.toContain('guion nuevo');
    });

    it('el cambio de modo se guarda entero, porque es un valor corto', async () => {
      auditado.length = 0;
      await pedir('PATCH', '/admin/asesoria/configuracion', 'editor', {
        modoCuestionario: 'asistido',
      });

      expect(auditado[0]?.accion).toBe('asesoria.configuracion.editar');
      expect(auditado[0]?.valorAnterior).toBe('fijo');
      expect(auditado[0]?.valorNuevo).toBe('asistido');
    });

    it('A4: si la auditoría falla, el cambio NO se deshace', async () => {
      const rota: AuditoriaPort = {
        registrarAccesoDenegado: vi.fn(),
        registrarAccion: async () => {
          throw new Error('bitácora caída');
        },
      };
      const resolutor: ResolutorPermisos = { tienePermiso: () => Promise.resolve(true) };
      const modulo = construirModuloM03(new AutorizacionService(resolutor, rota), {
        cuestionarioRepo,
        vocabularioRepo,
        configuracionRepo,
        auditoria: rota,
      });

      const app: Express = express();
      app.use(express.json());
      app.use('/admin/asesoria', (req, _res, next) => {
        req.actor = ACTORES.editor;
        next();
      });
      app.use('/admin/asesoria', modulo.adminRouter);

      const s = await new Promise<Server>((listo) => {
        const servidorLocal = app.listen(0, () => listo(servidorLocal));
      });
      const puerto = (s.address() as AddressInfo).port;

      const respuesta = await fetch(`http://127.0.0.1:${puerto}/admin/asesoria/configuracion`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modoCuestionario: 'fijo' }),
      });

      expect(respuesta.status).toBe(200);
      await new Promise<void>((listo) => s.close(() => listo()));
    });
  });

  describe('validación de la configuración', () => {
    it('rechaza un tiempo de espera fuera de rango diciendo el límite', async () => {
      const respuesta = await pedir('PATCH', '/admin/asesoria/configuracion', 'editor', {
        iaTiempoEsperaMs: 999,
      });
      expect(respuesta.status).toBe(400);
      const cuerpo = (await respuesta.json()) as { error: { message: string } };
      expect(cuerpo.error.message).toContain('1000 ms');
    });

    it('rechaza un cuerpo sin ningún cambio', async () => {
      const respuesta = await pedir('PATCH', '/admin/asesoria/configuracion', 'editor', {});
      expect(respuesta.status).toBe(400);
    });
  });
});
