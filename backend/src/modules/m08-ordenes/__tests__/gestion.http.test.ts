import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Actor } from '../../m20-seguridad/interfaces/actor.interface';
import { AutorizacionService } from '../../m20-seguridad/services/autorizacion.service';
import {
  bandejaAgrupadaResponseEnvelopeSchema,
  bandejaResponseEnvelopeSchema,
  ordenGestionResponseEnvelopeSchema,
  resumenGestionResponseEnvelopeSchema,
  type EstadoOrden,
  type ModoEntrega,
} from '../dtos/m08-ordenes.dto';
import type { EstadosRepository, EstadosTx } from '../interfaces/estados.interface';
import type {
  DetalleGestionDatos,
  FilaBandejaDatos,
  FiltroGestion,
  GestionRepository,
} from '../interfaces/gestion.interface';
import { construirModuloM08 } from '../m08.routes';

const AHORA = new Date('2026-10-24T15:00:00Z');

function detalle(codigo: string, estado: EstadoOrden, sobrescribir: Partial<DetalleGestionDatos> = {}): DetalleGestionDatos {
  return {
    codigo,
    fecha: new Date('2026-10-20T00:00:00Z'),
    total: 90000,
    estado,
    modoEntrega: 'domicilio' as ModoEntrega,
    idUsuario: 7,
    origen: 'carrito',
    subTotal: 100000,
    descuento: 10000,
    costoEntrega: 0,
    baseSinImpuesto: 75630.25,
    importeIva: 14369.75,
    tasaIva: 19,
    cliente: { idUsuario: 7, nombre: 'Ana Pérez', correo: 'ana@correo.co', telefono: '3001234567' },
    direccion: 'Calle 10 # 20-30, Bogotá',
    codigoSolicitud: 'SOL-2026-00001',
    idCotizacion: null,
    observaciones: null,
    lineas: [
      {
        nombreProducto: 'Vinilo Tipo 1',
        varianteCopia: 'Galón',
        colorSolicitado: 'Rojo Colonial',
        skuVendido: 'VIN-GAL-RC',
        cantidad: 1,
        precioInicial: 100000,
        precioAplicado: 90000,
        idVarianteRef: 11,
        descuentos: [{ ordenAplicacion: 1, origen: 'Promoción', porcentaje: 10, importe: 10000 }],
        esEntonado: true,
        baseConsumida: 'Base Deep 1 gal',
      },
    ],
    historial: [
      { estadoAnterior: null, estadoNuevo: 'orden_confirmada', fecha: new Date('2026-10-20T10:00:00Z'), autor: null, motivo: null },
      {
        estadoAnterior: 'orden_confirmada',
        estadoNuevo: 'revision_disponibilidad',
        fecha: new Date('2026-10-21T10:00:00Z'),
        autor: 'Luis Gómez',
        motivo: null,
      },
    ],
    notas: [{ idNota: 1, texto: 'Cliente pidió llamar antes', autor: 'Luis Gómez', fecha: new Date('2026-10-21T11:00:00Z') }],
    contactos: [{ idContacto: 1, medio: 'telefono', detalle: null, autor: 'Luis Gómez', fecha: new Date('2026-10-21T12:00:00Z') }],
    ...sobrescribir,
  };
}

/** Un único almacén en memoria hace de lectura (gestión) y de escritura (estados). */
class RepoMemoria implements GestionRepository, EstadosRepository {
  ordenes: DetalleGestionDatos[] = [];
  entrada = new Map<string, Date>();
  ultimoFiltro: FiltroGestion | null = null;

  async listar(filtro: FiltroGestion) {
    this.ultimoFiltro = filtro;
    let filas: FilaBandejaDatos[] = this.ordenes
      .filter((o) => filtro.estados === undefined || filtro.estados.includes(o.estado))
      .filter((o) => filtro.cliente === undefined || o.idUsuario === filtro.cliente)
      .filter((o) => filtro.correo === undefined || o.cliente.correo.includes(filtro.correo))
      .map((o) => ({
        codigo: o.codigo,
        fecha: o.fecha,
        total: o.total,
        estado: o.estado,
        modoEntrega: o.modoEntrega,
        cliente: o.cliente.nombre,
        entradaEstado: this.entrada.get(o.codigo) ?? o.fecha,
      }));
    filas =
      filtro.orden === 'antiguedad'
        ? filas.sort((a, b) => a.entradaEstado.getTime() - b.entradaEstado.getTime())
        : filas.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
    const total = filas.length;
    if (filtro.pagina !== undefined && filtro.limite !== undefined) {
      const desde = (filtro.pagina - 1) * filtro.limite;
      filas = filas.slice(desde, desde + filtro.limite);
    }
    return { filas, total };
  }

  async contarPorEstado() {
    const cuentas = new Map<EstadoOrden, number>();
    for (const o of this.ordenes) cuentas.set(o.estado, (cuentas.get(o.estado) ?? 0) + 1);
    return [...cuentas].map(([estado, cantidad]) => ({ estado, cantidad }));
  }

  async buscarDetalle(codigo: string) {
    return this.ordenes.find((o) => o.codigo === codigo) ?? null;
  }

  async buscarIdCliente(codigo: string) {
    return this.ordenes.find((o) => o.codigo === codigo)?.idUsuario ?? null;
  }

  async enTransaccion<T>(trabajo: (tx: EstadosTx) => Promise<T>): Promise<T> {
    return trabajo({
      buscarOrden: async (codigo) => {
        const o = this.ordenes.find((x) => x.codigo === codigo);
        return o ? { codigo: o.codigo, estado: o.estado, modoEntrega: o.modoEntrega, idUsuario: o.idUsuario } : null;
      },
      actualizarEstadoSiCoincide: async (codigo, desde, hacia) => {
        const o = this.ordenes.find((x) => x.codigo === codigo);
        if (!o || o.estado !== desde) return false;
        o.estado = hacia;
        return true;
      },
      registrarHistorial: async (fila) => {
        const o = this.ordenes.find((x) => x.codigo === fila.codigo);
        o?.historial.push({
          estadoAnterior: fila.estadoAnterior,
          estadoNuevo: fila.estadoNuevo,
          fecha: AHORA,
          autor: `usuario ${fila.idUsuarioAutor}`,
          motivo: fila.motivo,
        });
      },
    });
  }
}

describe('Gestión de pedidos · HTTP (HU-ORD-03, 05, 08, 09, 11)', () => {
  let servidor: Server;
  let baseUrl: string;
  const repo = new RepoMemoria();
  const auditoria = { registrarAccesoDenegado: vi.fn().mockResolvedValue(undefined) };
  const eventos = { emitirCambioEstado: vi.fn().mockResolvedValue(undefined) };
  const notificaciones = {
    notificarOrdenCreada: vi.fn().mockResolvedValue(undefined),
    notificarOrdenDespachada: vi.fn().mockResolvedValue(undefined),
  };

  const ACTORES: Record<string, Actor> = {
    gestor: { idUsuario: 21, idSesion: 's21', tipoSesion: 'admin' },
    lector: { idUsuario: 22, idSesion: 's22', tipoSesion: 'admin' },
    sinPermiso: { idUsuario: 23, idSesion: 's23', tipoSesion: 'admin' },
    cliente: { idUsuario: 7, idSesion: 's7', tipoSesion: 'cliente' },
    /** Cuenta de empresa (rol empresa_vip): sesión de CLIENTE que, por su rol, tiene permisos de ventas. */
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
    const m08 = construirModuloM08(autorizacion, {
      auditoria,
      gestion: { repo, catalogo: { variantesDisponibles: async (ids) => new Set(ids) } },
      estados: { repo, eventos, notificaciones, reloj: { ahora: () => AHORA } },
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
    eventos.emitirCambioEstado.mockClear();
    repo.ordenes = [
      detalle('PC-2026-00001', 'orden_confirmada'),
      detalle('PC-2026-00002', 'orden_confirmada', { fecha: new Date('2026-10-10T00:00:00Z') }),
      detalle('PC-2026-00003', 'en_preparacion', { idUsuario: 8, cliente: { idUsuario: 8, nombre: 'Bea Ruiz', correo: 'bea@correo.co', telefono: null } }),
      detalle('PC-2026-00004', 'preparada', { modoEntrega: 'recogida', direccion: null }),
      detalle('PC-2026-00005', 'entregado', { fecha: new Date('2026-09-01T00:00:00Z') }),
    ];
    repo.entrada = new Map([
      ['PC-2026-00001', new Date('2026-10-23T15:00:00Z')],
      ['PC-2026-00002', new Date('2026-10-21T15:00:00Z')],
    ]);
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

  describe('bandeja (HU-ORD-05)', () => {
    it('agrupa las órdenes en curso por estado, la que más lleva esperando primero, con su tiempo (CA-ORD-05-07)', async () => {
      const r = await llamar('GET', '/gestion?agruparPorEstado=true', 'lector');

      expect(r.status).toBe(200);
      const { data } = bandejaAgrupadaResponseEnvelopeSchema.parse(json(r));
      expect(data.map((g) => g.estado)).toEqual(['orden_confirmada', 'revision_disponibilidad', 'en_preparacion', 'preparada']);
      const confirmadas = data[0]?.ordenes ?? [];
      expect(confirmadas.map((o) => o.codigo)).toEqual(['PC-2026-00002', 'PC-2026-00001']);
      expect(confirmadas[0]).toMatchObject({ cliente: 'Ana Pérez', total: 90000, estado: 'orden_confirmada', modoEntrega: 'domicilio' });
      expect(confirmadas[0]?.segundosEnEstado).toBe(3 * 24 * 3600);
      expect(confirmadas[1]?.segundosEnEstado).toBe(24 * 3600);
      expect(data.flatMap((g) => g.ordenes).some((o) => o.estado === 'entregado')).toBe(false);
    });

    it('el contador de la navegación muestra cuántas esperan en cada estado en curso (CA-ORD-05-05)', async () => {
      const r = await llamar('GET', '/gestion/resumen', 'lector');

      const { data } = resumenGestionResponseEnvelopeSchema.parse(json(r));
      expect(data).toEqual([
        { estado: 'orden_confirmada', cantidad: 2 },
        { estado: 'revision_disponibilidad', cantidad: 0 },
        { estado: 'en_preparacion', cantidad: 1 },
        { estado: 'preparada', cantidad: 1 },
      ]);
    });

    it('lista paginada con filtros de búsqueda por código, estado, cliente, correo y teléfono (CA-ORD-08-01, 08-02)', async () => {
      const r = await llamar(
        'GET',
        '/gestion?estado=orden_confirmada&correo=ana@&cliente=7&codigo=PC-2026&telefono=300&diasEsperando=1&orden=reciente&pagina=1&limite=10',
        'lector',
      );

      expect(r.status).toBe(200);
      const cuerpo = bandejaResponseEnvelopeSchema.parse(json(r));
      expect(cuerpo.data.map((o) => o.codigo)).toEqual(['PC-2026-00001', 'PC-2026-00002']);
      expect(cuerpo.pagination).toEqual({ pagina: 1, limite: 10, total: 2, totalPaginas: 1 });
      expect(repo.ultimoFiltro).toMatchObject({
        estados: ['orden_confirmada'],
        correo: 'ana@',
        cliente: 7,
        codigo: 'PC-2026-00001'.slice(0, 7),
        telefono: '300',
        diasEsperando: 1,
        orden: 'reciente',
      });
    });

    it('una orden anterior al formato PC-AAAA-NNNNN (ORD-2026-0001, del seed) aparece en la bandeja y se puede abrir', async () => {
      repo.ordenes.push(detalle('ORD-2026-0001', 'orden_confirmada'));

      const bandeja = await llamar('GET', '/gestion?agruparPorEstado=true', 'lector');
      const abierta = await llamar('GET', '/gestion/ORD-2026-0001', 'lector');

      expect(bandeja.status).toBe(200);
      const { data } = bandejaAgrupadaResponseEnvelopeSchema.parse(json(bandeja));
      expect(data[0]?.ordenes.map((o) => o.codigo)).toContain('ORD-2026-0001');
      expect(abierta.status).toBe(200);
      expect(ordenGestionResponseEnvelopeSchema.parse(json(abierta)).data.codigo).toBe('ORD-2026-0001');
    });

    it('rechaza un rango de fechas invertido con 400', async () => {
      const r = await llamar('GET', '/gestion?desde=2026-10-10&hasta=2026-10-01', 'lector');
      expect(r.status).toBe(400);
    });
  });

  describe('acceso (HU-ORD-05, CA-ORD-05-01 a 05-03, CA-ORD-08-03)', () => {
    it('sin ningún permiso no ve la bandeja, el detalle ni el contador: 404 opaco y rastro', async () => {
      for (const ruta of ['/gestion', '/gestion/resumen', '/gestion/PC-2026-00001', '/gestion/PC-2026-00001/historial-cliente']) {
        const r = await llamar('GET', ruta, 'sinPermiso');
        expect(r.status, ruta).toBe(404);
      }
      expect(auditoria.registrarAccesoDenegado).toHaveBeenCalledTimes(4);
    });

    it('un cliente tampoco entra a la gestión, y la respuesta es la de una orden inexistente', async () => {
      const prohibido = await llamar('GET', '/gestion/PC-2026-00001', 'cliente');
      const inexistente = await llamar('GET', '/gestion/PC-2026-99999', 'lector');

      expect(prohibido.status).toBe(404);
      expect(prohibido.texto).toBe(inexistente.texto);
    });

    it('una sesión de CLIENTE no entra a la gestión aunque su rol traiga ventas.ver y ventas.gestionar (cuenta empresa)', async () => {
      const inexistente = await llamar('GET', '/gestion/PC-2026-99999', 'lector');

      for (const [metodo, ruta, cuerpo] of [
        ['GET', '/gestion', undefined],
        ['GET', '/gestion?agruparPorEstado=true', undefined],
        ['GET', '/gestion/resumen', undefined],
        ['GET', '/gestion/PC-2026-00001', undefined],
        ['GET', '/gestion/PC-2026-00001/historial-cliente', undefined],
        ['PATCH', '/gestion/PC-2026-00001/estado', { estadoActual: 'orden_confirmada', estadoNuevo: 'revision_disponibilidad' }],
        ['POST', '/gestion/PC-2026-00001/notas', { texto: 'intento' }],
        ['POST', '/gestion/PC-2026-00001/contactos', { medio: 'correo' }],
      ] as const) {
        const r = await llamar(metodo, ruta, 'empresa', cuerpo);
        expect(r.status, `${metodo} ${ruta}`).toBe(404);
        expect(r.texto, `${metodo} ${ruta}`).toBe(inexistente.texto);
      }

      expect(repo.ordenes[0]?.estado).toBe('orden_confirmada');
      expect(repo.ordenes[0]?.notas).toHaveLength(1);
    });

    it('el intento de una sesión de cliente deja rastro de acceso denegado (M20)', async () => {
      await llamar('GET', '/gestion', 'empresa');

      expect(auditoria.registrarAccesoDenegado).toHaveBeenCalledWith(
        expect.objectContaining({ idUsuario: 9, operacionIntentada: expect.stringContaining('/gestion') }),
      );
    });

    it('con solo «Revisar órdenes» consulta pero no puede operar (CA-ORD-05-02)', async () => {
      const lectura = await llamar('GET', '/gestion/PC-2026-00001', 'lector');
      const escritura = await llamar('PATCH', '/gestion/PC-2026-00001/estado', 'lector', {
        estadoActual: 'orden_confirmada',
        estadoNuevo: 'revision_disponibilidad',
      });

      expect(lectura.status).toBe(200);
      expect(escritura.status).toBe(404);
      expect(repo.ordenes[0]?.estado).toBe('orden_confirmada');
    });

    it('sin sesión verificada responde 404 opaco', async () => {
      expect((await llamar('GET', '/gestion')).status).toBe(404);
    });
  });

  describe('detalle (HU-ORD-09)', () => {
    it('muestra contacto, dirección si es envío, base consumida, historial con autor, notas y contactos (CA-ORD-09-01, 09-02, 10-02)', async () => {
      const r = await llamar('GET', '/gestion/PC-2026-00001', 'lector');

      expect(r.status).toBe(200);
      const { data } = ordenGestionResponseEnvelopeSchema.parse(json(r));
      expect(data.cliente).toEqual({ idUsuario: 7, nombre: 'Ana Pérez', correo: 'ana@correo.co', telefono: '3001234567' });
      expect(data.direccion).toBe('Calle 10 # 20-30, Bogotá');
      expect(data.lineas[0]).toMatchObject({ esEntonado: true, baseConsumida: 'Base Deep 1 gal', productoDisponible: true });
      expect(data.historial.map((h) => [h.estadoNuevo, h.autor])).toEqual([
        ['orden_confirmada', null],
        ['revision_disponibilidad', 'Luis Gómez'],
      ]);
      expect(data.notas).toEqual([
        { idNota: 1, texto: 'Cliente pidió llamar antes', autor: 'Luis Gómez', fecha: '2026-10-21T11:00:00.000Z' },
      ]);
      expect(data.contactos[0]).toMatchObject({ medio: 'telefono', autor: 'Luis Gómez' });
      expect(data.transicionesPermitidas).toEqual(['revision_disponibilidad']);
    });

    it('en recogida no muestra dirección y solo ofrece Entregado desde preparada', async () => {
      const r = await llamar('GET', '/gestion/PC-2026-00004', 'lector');

      const { data } = ordenGestionResponseEnvelopeSchema.parse(json(r));
      expect(data.direccion).toBeNull();
      expect(data.transicionesPermitidas).toEqual(['en_preparacion', 'entregado']);
    });

    it('no filtra datos sensibles del cliente', async () => {
      const r = await llamar('GET', '/gestion/PC-2026-00001', 'lector');
      expect(r.texto).not.toMatch(/contrasena|hash|token/i);
    });

    it('una orden inexistente responde 404 opaco', async () => {
      expect((await llamar('GET', '/gestion/PC-2026-99999', 'lector')).status).toBe(404);
    });
  });

  describe('historial del cliente (HU-ORD-11)', () => {
    it('lista las compras del mismo cliente de la más reciente a la más antigua (CA-ORD-11-01)', async () => {
      const r = await llamar('GET', '/gestion/PC-2026-00001/historial-cliente', 'lector');

      expect(r.status).toBe(200);
      const cuerpo = bandejaResponseEnvelopeSchema.parse(json(r));
      expect(cuerpo.data.map((o) => o.codigo)).toEqual([
        'PC-2026-00001',
        'PC-2026-00004',
        'PC-2026-00002',
        'PC-2026-00005',
      ]);
      expect(cuerpo.data.every((o) => o.cliente === 'Ana Pérez')).toBe(true);
    });

    it('una orden inexistente responde 404 opaco', async () => {
      expect((await llamar('GET', '/gestion/PC-2026-99999/historial-cliente', 'lector')).status).toBe(404);
    });
  });

  describe('cambio de estado (HU-ORD-03)', () => {
    it('con «Gestión de pedidos» avanza la orden, devuelve el detalle y emite el evento (CA-ORD-05-01)', async () => {
      const r = await llamar('PATCH', '/gestion/PC-2026-00001/estado', 'gestor', {
        estadoActual: 'orden_confirmada',
        estadoNuevo: 'revision_disponibilidad',
      });

      expect(r.status).toBe(200);
      const { data } = ordenGestionResponseEnvelopeSchema.parse(json(r));
      expect(data.estado).toBe('revision_disponibilidad');
      expect(data.historial.at(-1)).toMatchObject({ estadoNuevo: 'revision_disponibilidad', autor: 'usuario 21' });
      expect(eventos.emitirCambioEstado).toHaveBeenCalledTimes(1);
    });

    it('si otro compañero ya cambió el estado responde 409 ESTADO_CAMBIADO y no sobrescribe (CA-ORD-05-08)', async () => {
      const r = await llamar('PATCH', '/gestion/PC-2026-00001/estado', 'gestor', {
        estadoActual: 'revision_disponibilidad',
        estadoNuevo: 'en_preparacion',
      });

      expect(r.status).toBe(409);
      expect(json(r)).toMatchObject({ success: false, error: { code: 'ESTADO_CAMBIADO' } });
      expect(repo.ordenes[0]?.estado).toBe('orden_confirmada');
    });

    it('cancelar responde 409 OPERACION_NO_HABILITADA hasta la política de M11', async () => {
      const r = await llamar('PATCH', '/gestion/PC-2026-00004/estado', 'gestor', {
        estadoActual: 'preparada',
        estadoNuevo: 'cancelado',
        motivo: 'Cliente desistió',
      });

      expect(r.status).toBe(409);
      expect(json(r)).toMatchObject({ error: { code: 'OPERACION_NO_HABILITADA' } });
    });

    it('una transición fuera del ciclo responde 409 TRANSICION_NO_PERMITIDA', async () => {
      const r = await llamar('PATCH', '/gestion/PC-2026-00001/estado', 'gestor', {
        estadoActual: 'orden_confirmada',
        estadoNuevo: 'preparada',
      });

      expect(r.status).toBe(409);
      expect(json(r)).toMatchObject({ error: { code: 'TRANSICION_NO_PERMITIDA' } });
    });

    it('volver de preparada a preparación sin motivo responde 400 por el esquema del contrato', async () => {
      const r = await llamar('PATCH', '/gestion/PC-2026-00004/estado', 'gestor', {
        estadoActual: 'preparada',
        estadoNuevo: 'en_preparacion',
      });

      expect(r.status).toBe(400);
    });

    it('en recogida registra la entrega sin pasar por Despachado (CA-ORD-03-03)', async () => {
      const r = await llamar('PATCH', '/gestion/PC-2026-00004/estado', 'gestor', {
        estadoActual: 'preparada',
        estadoNuevo: 'entregado',
      });

      expect(r.status).toBe(200);
      const { data } = ordenGestionResponseEnvelopeSchema.parse(json(r));
      expect(data.estado).toBe('entregado');
      expect(data.historial.map((h) => h.estadoNuevo)).not.toContain('despachado');
    });

    it('una orden inexistente responde 404 opaco', async () => {
      const r = await llamar('PATCH', '/gestion/PC-2026-99999/estado', 'gestor', {
        estadoActual: 'orden_confirmada',
        estadoNuevo: 'revision_disponibilidad',
      });
      expect(r.status).toBe(404);
    });
  });
});
