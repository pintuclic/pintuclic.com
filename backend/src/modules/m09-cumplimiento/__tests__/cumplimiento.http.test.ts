import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Actor } from '../../m20-seguridad/interfaces/actor.interface';
import { AutorizacionService } from '../../m20-seguridad/services/autorizacion.service';
import {
  errorResponseEnvelopeSchema,
  hojaResponseEnvelopeSchema,
  retenidasResponseEnvelopeSchema,
  verificacionResponseEnvelopeSchema,
  verificarLineasResponseEnvelopeSchema,
} from '../dtos/m09-cumplimiento.dto';
import { construirModuloM09 } from '../m09.routes';
import { AHORA, ordenDe, RepoMemoria } from './repo-memoria';

const CODIGO = 'PC-2026-00001';

describe('M09 · HTTP (HU-CUM-01, 03 y 06)', () => {
  let servidor: Server;
  let baseUrl: string;
  const repo = new RepoMemoria();
  const erroresNoControlados: unknown[] = [];
  const auditoria = { registrarAccesoDenegado: vi.fn().mockResolvedValue(undefined) };
  const eventos = { emitirCambioEstado: vi.fn().mockResolvedValue(undefined) };

  const ACTORES: Record<string, Actor> = {
    gestor: { idUsuario: 21, idSesion: 's21', tipoSesion: 'admin' },
    /** Puede consultar pedidos pero no operarlos: en M09 tampoco entra (D5). */
    lector: { idUsuario: 22, idSesion: 's22', tipoSesion: 'admin' },
    sinPermiso: { idUsuario: 23, idSesion: 's23', tipoSesion: 'admin' },
    cliente: { idUsuario: 7, idSesion: 's7', tipoSesion: 'cliente' },
    /** Cuenta de empresa: sesión de CLIENTE que, por su rol, trae los permisos de ventas. */
    empresa: { idUsuario: 9, idSesion: 's9', tipoSesion: 'cliente' },
  };
  const PERMISOS: Record<number, readonly string[]> = {
    21: ['ventas.ver', 'ventas.gestionar'],
    22: ['ventas.ver'],
    23: [],
    7: [],
    9: ['ventas.ver', 'ventas.gestionar'],
  };

  beforeAll(async () => {
    const autorizacion = new AutorizacionService(
      { tienePermiso: async (idUsuario, codigo) => PERMISOS[idUsuario]?.includes(codigo) ?? false },
      auditoria,
    );
    const m09 = construirModuloM09(autorizacion, { auditoria, repo, eventos, reloj: { ahora: () => AHORA } });
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      const nombre = req.header('x-actor');
      const actor = nombre ? ACTORES[nombre] : undefined;
      if (actor) req.actor = actor;
      next();
    });
    app.use('/cumplimiento', m09.router);
    // Lo que llegue aquí es un error no controlado: en producción lo registra el manejador global.
    app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      erroresNoControlados.push(error);
      if (!res.headersSent) res.status(500).end();
    });
    servidor = await new Promise<Server>((resolver) => {
      const s = app.listen(0, '127.0.0.1', () => resolver(s));
    });
    baseUrl = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolver) => servidor.close(() => resolver()));
  });

  beforeEach(() => {
    repo.ordenes.clear();
    repo.historial = [];
    repo.escrituras = 0;
    repo.perderCarrera = false;
    repo.cargar(ordenDe(CODIGO, 'revision_disponibilidad'));
    auditoria.registrarAccesoDenegado.mockClear();
    eventos.emitirCambioEstado.mockClear();
    erroresNoControlados.length = 0;
  });

  async function llamar(metodo: string, ruta: string, actor?: string, cuerpo?: unknown) {
    const respuesta = await fetch(`${baseUrl}/cumplimiento${ruta}`, {
      method: metodo,
      headers: { 'content-type': 'application/json', ...(actor ? { 'x-actor': actor } : {}) },
      ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
    });
    const texto = await respuesta.text();
    // Una ruta que no existe responde con el HTML por defecto de Express, no con JSON.
    let json: Record<string, unknown> | null;
    try {
      json = texto ? (JSON.parse(texto) as Record<string, unknown>) : null;
    } catch {
      json = null;
    }
    return { status: respuesta.status, cuerpo: json };
  }

  const TODAS = { lineas: [1, 2, 3].map((numeroLinea) => ({ numeroLinea, estado: 'disponible' })) };

  describe('quién puede entrar (R11, CA-CUM-01-09)', () => {
    const RUTAS: Array<[string, string, unknown]> = [
      ['GET', '/retenidas', undefined],
      ['GET', `/ordenes/${CODIGO}/verificacion`, undefined],
      ['PUT', `/ordenes/${CODIGO}/verificacion`, TODAS],
      ['GET', `/ordenes/${CODIGO}/hoja`, undefined],
    ];

    it.each(RUTAS)('%s %s: quien solo tiene ventas.ver responde 404 opaco (los GET también)', async (metodo, ruta, cuerpo) => {
      const r = await llamar(metodo, ruta, 'lector', cuerpo);

      expect(r.status).toBe(404);
      expect(r.cuerpo).toMatchObject({ success: false, error: { code: 'RECURSO_NO_DISPONIBLE' } });
    });

    it.each(RUTAS)('%s %s: sin permiso o sin sesión responde 404 opaco', async (metodo, ruta, cuerpo) => {
      expect((await llamar(metodo, ruta, 'sinPermiso', cuerpo)).status).toBe(404);
      expect((await llamar(metodo, ruta, undefined, cuerpo)).status).toBe(404);
    });

    it.each(RUTAS)('%s %s: una sesión de cliente, aunque su rol traiga ventas.gestionar, responde 404 y se audita', async (metodo, ruta, cuerpo) => {
      const r = await llamar(metodo, ruta, 'empresa', cuerpo);

      expect(r.status).toBe(404);
      expect(auditoria.registrarAccesoDenegado).toHaveBeenCalledTimes(1);
      expect(repo.escrituras).toBe(0);
    });

    it('el 404 por falta de permiso es idéntico al de una orden inexistente', async () => {
      const sinPermiso = await llamar('GET', `/ordenes/${CODIGO}/verificacion`, 'lector');
      const inexistente = await llamar('GET', '/ordenes/PC-2026-99999/verificacion', 'gestor');

      expect(sinPermiso.status).toBe(inexistente.status);
      expect(sinPermiso.cuerpo).toEqual(inexistente.cuerpo);
    });

    it('un empleado sin permiso no logra marcar nada (CA-CUM-01-09)', async () => {
      await llamar('PUT', `/ordenes/${CODIGO}/verificacion`, 'sinPermiso', TODAS);

      expect(repo.ordenes.get(CODIGO)?.estado).toBe('revision_disponibilidad');
      expect(repo.escrituras).toBe(0);
    });
  });

  describe('lista de chequeo y avance', () => {
    it('GET verificacion devuelve las líneas con su estado', async () => {
      const r = await llamar('GET', `/ordenes/${CODIGO}/verificacion`, 'gestor');

      expect(r.status).toBe(200);
      expect(verificacionResponseEnvelopeSchema.safeParse(r.cuerpo).success).toBe(true);
    });

    it('PUT con todas disponibles avanza la orden y lo dice (CA-CUM-03-05)', async () => {
      const r = await llamar('PUT', `/ordenes/${CODIGO}/verificacion`, 'gestor', TODAS);

      expect(r.status).toBe(200);
      const envelope = verificarLineasResponseEnvelopeSchema.parse(r.cuerpo);
      expect(envelope.data.avanzo).toBe(true);
      expect(envelope.data.verificacion.estado).toBe('en_preparacion');
      expect(eventos.emitirCambioEstado).toHaveBeenCalledTimes(1);
    });

    it('PUT con una sola línea no avanza', async () => {
      const r = await llamar('PUT', `/ordenes/${CODIGO}/verificacion`, 'gestor', { lineas: [{ numeroLinea: 1, estado: 'consiguiendo_stock' }] });

      expect(verificarLineasResponseEnvelopeSchema.parse(r.cuerpo).data.avanzo).toBe(false);
    });

    it.each([
      ['sin cuerpo', undefined],
      ['lista vacía', { lineas: [] }],
      ['marca inexistente', { lineas: [{ numeroLinea: 1, estado: 'parcial' }] }],
      ['línea repetida', { lineas: [{ numeroLinea: 1, estado: 'disponible' }, { numeroLinea: 1, estado: 'no_disponible' }] }],
    ])('PUT %s responde 400 PARAMETRO_INVALIDO y no escribe nada', async (_nombre, cuerpo) => {
      const r = await llamar('PUT', `/ordenes/${CODIGO}/verificacion`, 'gestor', cuerpo);

      expect(r.status).toBe(400);
      expect(errorResponseEnvelopeSchema.parse(r.cuerpo).error.code).toBe('PARAMETRO_INVALIDO');
      expect(repo.escrituras).toBe(0);
      expect(erroresNoControlados).toEqual([]);
    });

    it('una línea que la orden no tiene responde 400 con cuál es', async () => {
      const r = await llamar('PUT', `/ordenes/${CODIGO}/verificacion`, 'gestor', { lineas: [{ numeroLinea: 7, estado: 'disponible' }] });

      expect(r.status).toBe(400);
      expect(r.cuerpo).toMatchObject({ error: { code: 'PARAMETRO_INVALIDO' } });
    });

    it('una orden fuera de cumplimiento responde 409 ORDEN_FUERA_DE_CUMPLIMIENTO (R4)', async () => {
      repo.cargar(ordenDe('PC-2026-00002', 'despachado'));

      for (const [metodo, ruta, cuerpo] of [
        ['GET', '/ordenes/PC-2026-00002/verificacion', undefined],
        ['PUT', '/ordenes/PC-2026-00002/verificacion', TODAS],
        ['GET', '/ordenes/PC-2026-00002/hoja', undefined],
      ] as const) {
        const r = await llamar(metodo, ruta, 'gestor', cuerpo);
        expect(r.status).toBe(409);
        expect(errorResponseEnvelopeSchema.parse(r.cuerpo).error.code).toBe('ORDEN_FUERA_DE_CUMPLIMIENTO');
      }
    });

    it('si la orden cambió justo antes del avance responde 409 ESTADO_CAMBIADO', async () => {
      repo.perderCarrera = true;

      const r = await llamar('PUT', `/ordenes/${CODIGO}/verificacion`, 'gestor', TODAS);

      expect(r.status).toBe(409);
      expect(errorResponseEnvelopeSchema.parse(r.cuerpo).error.code).toBe('ESTADO_CAMBIADO');
    });

    it('los métodos que el contrato no define no existen: no se puede borrar ni editar el rastro (R3)', async () => {
      for (const metodo of ['DELETE', 'PATCH', 'POST']) {
        const r = await llamar(metodo, `/ordenes/${CODIGO}/verificacion`, 'gestor', {});
        expect(r.status).toBe(404);
      }
    });
  });

  describe('retenidas y hoja', () => {
    it('GET retenidas responde con el envelope del contrato y acepta paginación', async () => {
      const r = await llamar('GET', '/retenidas?pagina=1&limite=5', 'gestor');

      expect(r.status).toBe(200);
      expect(retenidasResponseEnvelopeSchema.parse(r.cuerpo).pagination).toEqual({ pagina: 1, limite: 5, total: 1, totalPaginas: 1 });
    });

    it.each(['limite=0', 'limite=101', 'pagina=0', 'pagina=abc'])('GET retenidas?%s responde 400', async (consulta) => {
      const r = await llamar('GET', `/retenidas?${consulta}`, 'gestor');

      expect(r.status).toBe(400);
    });

    it('GET hoja responde con el envelope estricto del contrato, sin importes (R13)', async () => {
      const r = await llamar('GET', `/ordenes/${CODIGO}/hoja`, 'gestor');

      expect(r.status).toBe(200);
      expect(hojaResponseEnvelopeSchema.safeParse(r.cuerpo).success).toBe(true);
      expect(JSON.stringify(r.cuerpo)).not.toMatch(/precio|descuento|total|importe|iva|pago/i);
    });
  });
});
