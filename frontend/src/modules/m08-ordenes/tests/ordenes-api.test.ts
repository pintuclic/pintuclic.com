import { beforeEach, describe, expect, it, vi } from 'vitest';

const cliente = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
vi.mock('@/core/api/apiClient', () => ({ apiClient: cliente, esRespuestaError: () => false }));

import {
  cambiarEstado,
  crearContacto,
  crearNota,
  listarBandeja,
  listarBandejaAgrupada,
  listarMisPedidos,
  obtenerMiPedido,
  obtenerResumenGestion,
} from '../services/ordenes-api';

const PAGINACION = { pagina: 1, limite: 20, total: 1, totalPaginas: 1 };
const RESUMEN = {
  codigo: 'PC-2026-00001',
  fecha: '2026-05-12T00:00:00.000Z',
  total: 287900,
  estado: 'en_preparacion',
  modoEntrega: 'domicilio',
};

describe('servicio HTTP de M08', () => {
  beforeEach(() => {
    cliente.get.mockReset();
    cliente.post.mockReset();
    cliente.patch.mockReset();
  });

  it('listarMisPedidos entrega en curso, finalizados y paginación, y envía la búsqueda', async () => {
    cliente.get.mockResolvedValue({
      data: { success: true, data: { enCurso: [RESUMEN], finalizados: [] }, pagination: PAGINACION },
    });

    const r = await listarMisPedidos({ q: 'vinilo', pagina: 2 });

    expect(cliente.get).toHaveBeenCalledWith('/ordenes/mis-pedidos', { params: { q: 'vinilo', pagina: 2 } });
    expect(r.enCurso).toHaveLength(1);
    expect(r.paginacion.totalPaginas).toBe(1);
  });

  it('rechaza una respuesta que no cumple el contrato', async () => {
    cliente.get.mockResolvedValue({ data: { success: true, data: { enCurso: [{ codigo: 'mal' }], finalizados: [] } } });

    await expect(listarMisPedidos()).rejects.toThrow();
  });

  it('obtenerMiPedido codifica el código en la ruta', async () => {
    cliente.get.mockResolvedValue({ data: { success: false } });

    await expect(obtenerMiPedido('PC-2026-00001')).rejects.toThrow();
    expect(cliente.get).toHaveBeenCalledWith('/ordenes/mis-pedidos/PC-2026-00001');
  });

  it('listarBandejaAgrupada pide agruparPorEstado=true', async () => {
    cliente.get.mockResolvedValue({
      data: { success: true, data: [{ estado: 'orden_confirmada', ordenes: [] }] },
    });

    const grupos = await listarBandejaAgrupada({ correo: 'ana@' });

    expect(cliente.get).toHaveBeenCalledWith('/ordenes/gestion', { params: { correo: 'ana@', agruparPorEstado: 'true' } });
    expect(grupos[0]?.estado).toBe('orden_confirmada');
  });

  it('listarBandeja devuelve filas con cliente y tiempo en el estado', async () => {
    cliente.get.mockResolvedValue({
      data: { success: true, data: [{ ...RESUMEN, cliente: 'Ana Pérez', segundosEnEstado: 3600 }], pagination: PAGINACION },
    });

    const r = await listarBandeja({ estado: 'en_preparacion' });

    expect(r.filas[0]).toMatchObject({ cliente: 'Ana Pérez', segundosEnEstado: 3600 });
  });

  it('obtenerResumenGestion devuelve los contadores por estado', async () => {
    cliente.get.mockResolvedValue({ data: { success: true, data: [{ estado: 'orden_confirmada', cantidad: 4 }] } });

    expect(await obtenerResumenGestion()).toEqual([{ estado: 'orden_confirmada', cantidad: 4 }]);
  });

  it('cambiarEstado envía estadoActual y estadoNuevo por PATCH', async () => {
    cliente.patch.mockResolvedValue({ data: { success: false } });

    await expect(
      cambiarEstado('PC-2026-00001', { estadoActual: 'orden_confirmada', estadoNuevo: 'revision_disponibilidad' }),
    ).rejects.toThrow();
    expect(cliente.patch).toHaveBeenCalledWith('/ordenes/gestion/PC-2026-00001/estado', {
      estadoActual: 'orden_confirmada',
      estadoNuevo: 'revision_disponibilidad',
    });
  });

  it('crearNota y crearContacto devuelven lo registrado', async () => {
    cliente.post.mockResolvedValueOnce({
      data: { success: true, data: { idNota: 1, texto: 'x', autor: 'Luis', fecha: '2026-10-24T15:00:00.000Z' } },
    });
    cliente.post.mockResolvedValueOnce({
      data: { success: true, data: { idContacto: 2, medio: 'correo', detalle: null, autor: 'Luis', fecha: '2026-10-24T15:00:00.000Z' } },
    });

    expect((await crearNota('PC-2026-00001', { texto: 'x' })).idNota).toBe(1);
    expect((await crearContacto('PC-2026-00001', { medio: 'correo' })).medio).toBe('correo');
    expect(cliente.post).toHaveBeenNthCalledWith(1, '/ordenes/gestion/PC-2026-00001/notas', { texto: 'x' });
  });
});
