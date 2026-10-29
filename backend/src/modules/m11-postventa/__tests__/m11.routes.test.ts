import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Actor } from '../../m20-seguridad/interfaces/actor.interface';
import type { AutorizacionService } from '../../m20-seguridad/services/autorizacion.service';
import {
  solicitudPostventaResponseEnvelopeSchema,
  listaPostventaResponseEnvelopeSchema,
  resumenGestionPostventaResponseEnvelopeSchema,
} from '../dtos/m11-postventa.dto';
import { construirModuloM11 } from '../m11.routes';
import type { PostventaServicePort } from '../interfaces/postventa.interface';

const autorizacionMock = {
  exigirPermiso: vi.fn().mockResolvedValue(true),
} as unknown as AutorizacionService;

describe('M11 HTTP Routes', () => {
  let app: express.Express;
  let server: Server;
  let baseUrl: string;
  let actorSimulado: Actor | undefined = undefined;

  const mockService = {
    solicitarCancelacion: vi.fn().mockResolvedValue({
      idSolicitud: 1,
      codigo: 'DEV-2026-00001',
      codigoOrden: 'PC-2026-00010',
      idCliente: 5,
      nombreCliente: 'Cliente Prueba',
      tipo: 'cancelacion',
      estado: 'solicitada',
      totalReembolso: 150000,
      totalItems: 2,
      fechaSolicitud: '2026-10-25T12:00:00.000Z',
      fechaResolucion: null,
      motivoGeneral: 'Compré por error de medida en el pedido',
      observacionesResolucion: null,
      nombreEmpleadoResuelve: null,
      metodoReembolso: null,
      referenciaReembolso: null,
      comprobanteUrl: null,
      fechaReembolso: null,
      datosBancarios: null,
      lineas: [
        {
          idLineaPostventa: 1,
          idLineaOrden: 101,
          nombreProducto: 'Viniltex',
          varianteCopia: 'Galón',
          skuVendido: null,
          colorSolicitado: null,
          esEntonado: false,
          cantidad: 2,
          precioUnitario: 75000,
          subTotal: 150000,
          motivoEspecifico: null,
        },
      ],
      historial: [
        {
          idHistorial: 1,
          estadoAnterior: null,
          estadoNuevo: 'solicitada',
          motivo: 'Solicitud radicada',
          nombreAutor: 'Cliente Prueba',
          fecha: '2026-10-25T12:00:00.000Z',
        },
      ],
    }),

    solicitarDevolucion: vi.fn(),

    consultarMisSolicitudes: vi.fn().mockResolvedValue({
      data: [
        {
          idSolicitud: 1,
          codigo: 'DEV-2026-00001',
          codigoOrden: 'PC-2026-00010',
          idCliente: 5,
          nombreCliente: 'Cliente Prueba',
          tipo: 'cancelacion',
          estado: 'solicitada',
          totalReembolso: 150000,
          totalItems: 2,
          fechaSolicitud: '2026-10-25T12:00:00.000Z',
          fechaResolucion: null,
        },
      ],
      pagination: { pagina: 1, limite: 20, total: 1, totalPaginas: 1 },
    }),

    consultarMiSolicitud: vi.fn(),
    listarGestion: vi.fn().mockResolvedValue({
      data: [],
      pagination: { pagina: 1, limite: 20, total: 0, totalPaginas: 0 },
    }),

    obtenerResumenGestion: vi.fn().mockResolvedValue([
      { estado: 'solicitada', cantidad: 3 },
      { estado: 'aprobada', cantidad: 1 },
    ]),

    consultarGestionPorCodigo: vi.fn(),
    resolverSolicitud: vi.fn(),
    registrarReembolso: vi.fn(),
  };

  beforeAll(async () => {
    app = express();
    app.use(express.json());

    // Middleware simulador de autenticación
    app.use((req, _res, next) => {
      if (actorSimulado !== undefined) {
        req.actor = actorSimulado;
      }
      next();
    });

    const m11 = construirModuloM11(autorizacionMock, {
      service: mockService as unknown as PostventaServicePort,
    });

    app.use('/postventa', m11.router);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}/postventa`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(() => {
    vi.mocked(autorizacionMock.exigirPermiso).mockResolvedValue(true);

    actorSimulado = {
      idUsuario: 5,
      idSesion: 'ses-5',
      tipoSesion: 'cliente',
    };

    mockService.solicitarCancelacion.mockResolvedValue({
      idSolicitud: 1,
      codigo: 'DEV-2026-00001',
      codigoOrden: 'PC-2026-00010',
      idCliente: 5,
      nombreCliente: 'Cliente Prueba',
      tipo: 'cancelacion',
      estado: 'solicitada',
      totalReembolso: 150000,
      totalItems: 2,
      fechaSolicitud: '2026-10-25T12:00:00.000Z',
      fechaResolucion: null,
      motivoGeneral: 'Compré por error de medida en el pedido',
      observacionesResolucion: null,
      nombreEmpleadoResuelve: null,
      metodoReembolso: null,
      referenciaReembolso: null,
      comprobanteUrl: null,
      fechaReembolso: null,
      datosBancarios: null,
      lineas: [
        {
          idLineaPostventa: 1,
          idLineaOrden: 101,
          nombreProducto: 'Viniltex',
          varianteCopia: 'Galón',
          skuVendido: null,
          colorSolicitado: null,
          esEntonado: false,
          cantidad: 2,
          precioUnitario: 75000,
          subTotal: 150000,
          motivoEspecifico: null,
        },
      ],
      historial: [
        {
          idHistorial: 1,
          estadoAnterior: null,
          estadoNuevo: 'solicitada',
          motivo: 'Solicitud radicada',
          nombreAutor: 'Cliente Prueba',
          fecha: '2026-10-25T12:00:00.000Z',
        },
      ],
    });

    mockService.consultarMisSolicitudes.mockResolvedValue({
      data: [
        {
          idSolicitud: 1,
          codigo: 'DEV-2026-00001',
          codigoOrden: 'PC-2026-00010',
          idCliente: 5,
          nombreCliente: 'Cliente Prueba',
          tipo: 'cancelacion',
          estado: 'solicitada',
          totalReembolso: 150000,
          totalItems: 2,
          fechaSolicitud: '2026-10-25T12:00:00.000Z',
          fechaResolucion: null,
        },
      ],
      pagination: { pagina: 1, limite: 20, total: 1, totalPaginas: 1 },
    });

    mockService.obtenerResumenGestion.mockResolvedValue([
      { estado: 'solicitada', cantidad: 3 },
      { estado: 'aprobada', cantidad: 1 },
    ]);
  });

  it('POST /postventa/cancelar responde 201 y envelope válido con sesión de cliente', async () => {
    const res = await fetch(`${baseUrl}/cancelar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codigoOrden: 'PC-2026-00010',
        motivo: 'Compré por error de medida en el pedido',
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(solicitudPostventaResponseEnvelopeSchema.safeParse(json).success).toBe(true);
    expect(json.data.codigo).toBe('DEV-2026-00001');
  });

  it('POST /postventa/cancelar responde 400 si el motivo es menor a 10 caracteres', async () => {
    const res = await fetch(`${baseUrl}/cancelar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codigoOrden: 'PC-2026-00010',
        motivo: 'muy corto',
      }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('PARAMETRO_INVALIDO');
  });

  it('GET /postventa/mis-solicitudes responde 200 y envelope de lista paginada', async () => {
    const res = await fetch(`${baseUrl}/mis-solicitudes`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(listaPostventaResponseEnvelopeSchema.safeParse(json).success).toBe(true);
    expect(json.data.length).toBe(1);
  });

  it('GET /postventa/gestion responde 404 seguro si quien consulta no es personal (ADR-003 / HU-SEG-06)', async () => {
    actorSimulado = {
      idUsuario: 5,
      idSesion: 'ses-5',
      tipoSesion: 'cliente',
    };

    const res = await fetch(`${baseUrl}/gestion`);
    expect(res.status).toBe(404);
  });

  it('GET /postventa/gestion/resumen responde 200 si la sesión es de personal', async () => {
    actorSimulado = {
      idUsuario: 99,
      idSesion: 'ses-admin-99',
      tipoSesion: 'admin',
    };

    const res = await fetch(`${baseUrl}/gestion/resumen`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(resumenGestionPostventaResponseEnvelopeSchema.safeParse(json).success).toBe(true);
    expect(json.data.length).toBe(2);
  });
});
