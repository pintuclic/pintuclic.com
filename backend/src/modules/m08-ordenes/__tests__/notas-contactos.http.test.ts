import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Actor } from '../../m20-seguridad/interfaces/actor.interface';
import { AutorizacionService } from '../../m20-seguridad/services/autorizacion.service';
import {
  contactoResponseEnvelopeSchema,
  notaResponseEnvelopeSchema,
  ordenClienteResponseEnvelopeSchema,
  ordenGestionResponseEnvelopeSchema,
  type MedioContacto,
} from '../dtos/m08-ordenes.dto';
import type { ConsultaClienteRepository } from '../interfaces/consulta-cliente.interface';
import type { DetalleGestionDatos, GestionRepository } from '../interfaces/gestion.interface';
import type { NotasRepository } from '../interfaces/notas.interface';
import { construirModuloM08 } from '../m08.routes';

const FECHA = new Date('2026-10-24T15:00:00Z');

function orden(codigo: string, idUsuario: number): DetalleGestionDatos {
  return {
    codigo,
    fecha: new Date('2026-10-20T00:00:00Z'),
    total: 90000,
    estado: 'revision_disponibilidad',
    modoEntrega: 'domicilio',
    idUsuario,
    origen: 'carrito',
    subTotal: 100000,
    descuento: 10000,
    costoEntrega: 0,
    baseSinImpuesto: null,
    importeIva: null,
    tasaIva: 19,
    cliente: { idUsuario, nombre: 'Ana Pérez', correo: 'ana@correo.co', telefono: '3001234567' },
    direccion: 'Calle 10 # 20-30',
    codigoSolicitud: null,
    idCotizacion: null,
    observaciones: null,
    lineas: [],
    historial: [],
    notas: [],
    contactos: [],
  };
}

/** Un único almacén en memoria sirve de lectura de gestión, del cliente y de escritura de notas. */
class RepoMemoria implements GestionRepository, ConsultaClienteRepository, NotasRepository {
  ordenes: DetalleGestionDatos[] = [];
  siguiente = 1;

  async listar() {
    return { filas: [], total: 0 };
  }
  async listarPorUsuario() {
    return { filas: [], total: 0 };
  }
  async contarPorEstado() {
    return [];
  }
  async buscarDetalle(codigo: string) {
    return this.ordenes.find((o) => o.codigo === codigo) ?? null;
  }
  async buscarIdCliente(codigo: string) {
    return this.ordenes.find((o) => o.codigo === codigo)?.idUsuario ?? null;
  }

  async agregarNota(codigo: string, idAutor: number, texto: string) {
    const o = this.ordenes.find((x) => x.codigo === codigo);
    if (!o) return null;
    const nota = { idNota: this.siguiente++, texto, autor: `usuario ${idAutor}`, fecha: FECHA };
    o.notas.push(nota);
    return nota;
  }

  async agregarContacto(codigo: string, idAutor: number, medio: MedioContacto, detalle: string | null) {
    const o = this.ordenes.find((x) => x.codigo === codigo);
    if (!o) return null;
    const contacto = { idContacto: this.siguiente++, medio, detalle, autor: `usuario ${idAutor}`, fecha: FECHA };
    o.contactos.push(contacto);
    return contacto;
  }
}

describe('Notas internas y contactos · HTTP (HU-ORD-10, HU-ORD-09-02)', () => {
  let servidor: Server;
  let baseUrl: string;
  const repo = new RepoMemoria();
  const erroresNoControlados: unknown[] = [];
  const auditoria = { registrarAccesoDenegado: vi.fn().mockResolvedValue(undefined) };

  const ACTORES: Record<string, Actor> = {
    gestor: { idUsuario: 21, idSesion: 's21', tipoSesion: 'admin' },
    lector: { idUsuario: 22, idSesion: 's22', tipoSesion: 'admin' },
    cliente: { idUsuario: 7, idSesion: 's7', tipoSesion: 'cliente' },
  };
  const PERMISOS: Record<number, readonly string[]> = {
    21: ['ventas.ver', 'ventas.gestionar'],
    22: ['ventas.ver'],
    7: [],
  };

  beforeAll(async () => {
    const autorizacion = new AutorizacionService(
      { tienePermiso: async (idUsuario, codigo) => PERMISOS[idUsuario]?.includes(codigo) ?? false },
      auditoria,
    );
    const catalogo = { variantesDisponibles: async (ids: number[]) => new Map(ids.map((id) => [id, id + 100])) };
    const m08 = construirModuloM08(autorizacion, {
      consultaCliente: { repo, catalogo },
      gestion: { repo, catalogo },
      notas: { repo },
    });
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      const nombre = req.header('x-actor');
      const actor = nombre ? ACTORES[nombre] : undefined;
      if (actor) req.actor = actor;
      next();
    });
    app.use('/ordenes', m08.router);
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
    auditoria.registrarAccesoDenegado.mockClear();
    erroresNoControlados.length = 0;
    repo.ordenes = [orden('PC-2026-00001', 7)];
    repo.siguiente = 1;
  });

  async function llamar(metodo: string, ruta: string, actor?: string, cuerpo?: unknown) {
    const respuesta = await fetch(`${baseUrl}/ordenes${ruta}`, {
      method: metodo,
      headers: { ...(actor ? { 'x-actor': actor } : {}), ...(cuerpo ? { 'content-type': 'application/json' } : {}) },
      ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
    });
    return { status: respuesta.status, texto: await respuesta.text() };
  }
  const json = (r: { texto: string }): unknown => JSON.parse(r.texto);

  describe('notas internas', () => {
    it('registra la nota con su autor y momento, y el compañero la ve al abrir el pedido (CA-ORD-10-02)', async () => {
      const r = await llamar('POST', '/gestion/PC-2026-00001/notas', 'gestor', { texto: '  Falta una lata de base  ' });

      expect(r.status).toBe(201);
      const { data } = notaResponseEnvelopeSchema.parse(json(r));
      expect(data).toEqual({ idNota: 1, texto: 'Falta una lata de base', autor: 'usuario 21', fecha: FECHA.toISOString() });

      const detalle = await llamar('GET', '/gestion/PC-2026-00001', 'lector');
      expect(ordenGestionResponseEnvelopeSchema.parse(json(detalle)).data.notas).toHaveLength(1);
    });

    it('la nota no aparece nunca para el cliente (CA-ORD-10-01)', async () => {
      await llamar('POST', '/gestion/PC-2026-00001/notas', 'gestor', { texto: 'Nota interna confidencial' });

      const r = await llamar('GET', '/mis-pedidos/PC-2026-00001', 'cliente');

      expect(r.status).toBe(200);
      ordenClienteResponseEnvelopeSchema.parse(json(r));
      expect(r.texto).not.toMatch(/confidencial|notas/);
    });

    it('rechaza una nota vacía o demasiado larga con 400', async () => {
      expect((await llamar('POST', '/gestion/PC-2026-00001/notas', 'gestor', { texto: '   ' })).status).toBe(400);
      expect((await llamar('POST', '/gestion/PC-2026-00001/notas', 'gestor', { texto: 'x'.repeat(2001) })).status).toBe(400);
      expect(repo.ordenes[0]?.notas).toHaveLength(0);
    });

    it('con solo «Revisar órdenes» no puede escribir: 404 opaco y no se guarda nada', async () => {
      const r = await llamar('POST', '/gestion/PC-2026-00001/notas', 'lector', { texto: 'intento' });

      expect(r.status).toBe(404);
      expect(repo.ordenes[0]?.notas).toHaveLength(0);
      expect(auditoria.registrarAccesoDenegado).toHaveBeenCalledTimes(1);
    });

    it('una orden inexistente responde 404 opaco', async () => {
      const r = await llamar('POST', '/gestion/PC-2026-99999/notas', 'gestor', { texto: 'hola' });
      expect(r.status).toBe(404);
    });

    it('con el código y el cuerpo inválidos a la vez responde un único 400 y no llega ningún error al manejador global', async () => {
      const codigoLargo = 'X'.repeat(51);

      const nota = await llamar('POST', `/gestion/${codigoLargo}/notas`, 'gestor', { texto: '' });
      const contacto = await llamar('POST', `/gestion/${codigoLargo}/contactos`, 'gestor', { medio: 'whatsapp' });

      expect(nota.status).toBe(400);
      expect(contacto.status).toBe(400);
      expect(erroresNoControlados).toEqual([]);
    });

    it.each(['PUT', 'PATCH', 'DELETE'])('%s sobre una nota responde 405 NOTA_INMUTABLE y no la toca (CA-ORD-10-03)', async (metodo) => {
      await llamar('POST', '/gestion/PC-2026-00001/notas', 'gestor', { texto: 'original' });

      const r = await llamar(metodo, '/gestion/PC-2026-00001/notas/1', 'gestor', { texto: 'cambiada' });

      expect(r.status).toBe(405);
      expect(json(r)).toMatchObject({ success: false, error: { code: 'NOTA_INMUTABLE' } });
      expect(repo.ordenes[0]?.notas.map((n) => n.texto)).toEqual(['original']);
    });

    it('editar o borrar sin permiso de gestión sigue siendo 404 opaco, no 405', async () => {
      const r = await llamar('DELETE', '/gestion/PC-2026-00001/notas/1', 'lector');
      expect(r.status).toBe(404);
    });
  });

  describe('contactos con el cliente', () => {
    it('registra que se inició el contacto con su autor y momento (CA-ORD-09-03)', async () => {
      const r = await llamar('POST', '/gestion/PC-2026-00001/contactos', 'gestor', {
        medio: 'telefono',
        detalle: 'Se avisó de la falta de mercancía',
      });

      expect(r.status).toBe(201);
      const { data } = contactoResponseEnvelopeSchema.parse(json(r));
      expect(data).toEqual({
        idContacto: 1,
        medio: 'telefono',
        detalle: 'Se avisó de la falta de mercancía',
        autor: 'usuario 21',
        fecha: FECHA.toISOString(),
      });
    });

    it('el detalle es opcional', async () => {
      const r = await llamar('POST', '/gestion/PC-2026-00001/contactos', 'gestor', { medio: 'correo' });

      expect(r.status).toBe(201);
      expect(contactoResponseEnvelopeSchema.parse(json(r)).data.detalle).toBeNull();
    });

    it('solo admite correo o teléfono (D3)', async () => {
      const r = await llamar('POST', '/gestion/PC-2026-00001/contactos', 'gestor', { medio: 'whatsapp' });

      expect(r.status).toBe(400);
      expect(repo.ordenes[0]?.contactos).toHaveLength(0);
    });

    it('sin «Gestión de pedidos» responde 404 opaco', async () => {
      const r = await llamar('POST', '/gestion/PC-2026-00001/contactos', 'lector', { medio: 'correo' });
      expect(r.status).toBe(404);
    });

    it.each(['PUT', 'PATCH', 'DELETE'])('%s sobre un contacto responde 405 NOTA_INMUTABLE', async (metodo) => {
      const r = await llamar(metodo, '/gestion/PC-2026-00001/contactos/1', 'gestor', { medio: 'correo' });

      expect(r.status).toBe(405);
      expect(json(r)).toMatchObject({ error: { code: 'NOTA_INMUTABLE' } });
    });
  });
});
