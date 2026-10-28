import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/core/api/apiClient';
import {
  solicitarCancelacion,
  solicitarDevolucion,
  listarMisSolicitudes,
  obtenerMiSolicitud,
  listarGestion,
  obtenerResumenGestion,
  resolverSolicitud,
  registrarReembolso,
} from '../services/postventa-api';

vi.mock('@/core/api/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('postventa-api (M11 Frontend)', () => {
  const detalleMock = {
    idSolicitud: 1,
    codigo: 'DEV-2026-00001',
    codigoOrden: 'PC-2026-00010',
    idCliente: 5,
    nombreCliente: 'Juan Pérez',
    tipo: 'cancelacion',
    estado: 'solicitada',
    totalReembolso: 150000,
    totalItems: 1,
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
    lineas: [],
    historial: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('solicitarCancelacion llama a POST /postventa/cancelar y devuelve el detalle', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { success: true, data: detalleMock },
    });

    const res = await solicitarCancelacion({
      codigoOrden: 'PC-2026-00010',
      motivo: 'Compré por error de medida en el pedido',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/postventa/cancelar', {
      codigoOrden: 'PC-2026-00010',
      motivo: 'Compré por error de medida en el pedido',
    });
    expect(res.codigo).toBe('DEV-2026-00001');
  });

  it('solicitarDevolucion llama a POST /postventa/devolver y devuelve el detalle', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { success: true, data: { ...detalleMock, tipo: 'devolucion' } },
    });

    const res = await solicitarDevolucion({
      codigoOrden: 'PC-2026-00010',
      tipo: 'devolucion',
      motivoGeneral: 'Deseo ejercer derecho de retracto en plazo',
      lineas: [{ idLineaOrden: 101, cantidad: 1 }],
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/postventa/devolver',
      expect.objectContaining({ tipo: 'devolucion' })
    );
    expect(res.tipo).toBe('devolucion');
  });

  it('listarMisSolicitudes llama a GET /postventa/mis-solicitudes', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            idSolicitud: 1,
            codigo: 'DEV-2026-00001',
            codigoOrden: 'PC-2026-00010',
            idCliente: 5,
            nombreCliente: 'Juan Pérez',
            tipo: 'cancelacion',
            estado: 'solicitada',
            totalReembolso: 150000,
            totalItems: 1,
            fechaSolicitud: '2026-10-25T12:00:00.000Z',
            fechaResolucion: null,
          },
        ],
        pagination: { pagina: 1, limite: 20, total: 1, totalPaginas: 1 },
      },
    });

    const res = await listarMisSolicitudes();
    expect(apiClient.get).toHaveBeenCalledWith(
      '/postventa/mis-solicitudes',
      expect.anything()
    );
    expect(res.items.length).toBe(1);
    expect(res.paginacion.total).toBe(1);
  });

  it('resolverSolicitud llama a PATCH /postventa/gestion/:codigo/resolver', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({
      data: { success: true, data: { ...detalleMock, estado: 'aprobada' } },
    });

    const res = await resolverSolicitud('DEV-2026-00001', {
      accion: 'aprobar',
      observaciones: 'Cumple requisitos',
    });

    expect(apiClient.patch).toHaveBeenCalledWith(
      '/postventa/gestion/DEV-2026-00001/resolver',
      { accion: 'aprobar', observaciones: 'Cumple requisitos' }
    );
    expect(res.estado).toBe('aprobada');
  });

  it('registrarReembolso llama a POST /postventa/gestion/:codigo/reembolsar', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          ...detalleMock,
          estado: 'reembolsada',
          metodoReembolso: 'transferencia_bancaria',
          referenciaReembolso: 'TRANS-12345',
        },
      },
    });

    const res = await registrarReembolso('DEV-2026-00001', {
      metodo: 'transferencia_bancaria',
      montoReembolsado: 150000,
      referenciaTransaccion: 'TRANS-12345',
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/postventa/gestion/DEV-2026-00001/reembolsar',
      expect.objectContaining({ referenciaTransaccion: 'TRANS-12345' })
    );
    expect(res.estado).toBe('reembolsada');
  });
});
