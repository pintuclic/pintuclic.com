import { beforeEach, describe, expect, it, vi } from 'vitest';

const cliente = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }));
vi.mock('@/core/api/apiClient', () => ({ apiClient: cliente, esRespuestaError: () => false }));

import { listarRetenidas, marcarLineas, obtenerHoja, obtenerVerificacion, solicitarCancelacion } from '../services/cumplimiento-api';
import { HOJA, PAGINACION, RETENIDA, lineaVerificacion, verificacion } from './fixtures';

describe('servicio HTTP de M09', () => {
  beforeEach(() => {
    cliente.get.mockReset();
    cliente.put.mockReset();
    cliente.post.mockReset();
  });

  it('solicitarCancelacion envía la nota recortada por POST y entrega la solicitud abierta (R18)', async () => {
    const tramite = { codigo: 'DEV-2026-00012', estado: 'solicitada', iniciadaPor: 'tienda', fecha: '2026-10-31T10:00:00.000Z' };
    cliente.post.mockResolvedValue({ data: { success: true, data: { cancelacion: tramite } } });

    const r = await solicitarCancelacion('PC 2026/1', '  Llega a fin de mes ');

    expect(cliente.post).toHaveBeenCalledWith('/cumplimiento/ordenes/PC%202026%2F1/cancelacion', { nota: 'Llega a fin de mes' });
    expect(r).toEqual(tramite);
  });

  it('solicitarCancelacion sin nota (o en blanco) no envía el campo', async () => {
    const tramite = { codigo: 'DEV-2026-00012', estado: 'solicitada', iniciadaPor: 'tienda', fecha: '2026-10-31T10:00:00.000Z' };
    cliente.post.mockResolvedValue({ data: { success: true, data: { cancelacion: tramite } } });

    await solicitarCancelacion('PC-2026-00001');
    await solicitarCancelacion('PC-2026-00001', '   ');

    expect(cliente.post).toHaveBeenNthCalledWith(1, '/cumplimiento/ordenes/PC-2026-00001/cancelacion', {});
    expect(cliente.post).toHaveBeenNthCalledWith(2, '/cumplimiento/ordenes/PC-2026-00001/cancelacion', {});
  });

  it('una solicitud de cancelación que no cumple el contrato se rechaza en vez de pintarse', async () => {
    cliente.post.mockResolvedValue({ data: { success: true, data: { cancelacion: { codigo: 'XX', estado: 'solicitada' } } } });

    await expect(solicitarCancelacion('PC-2026-00001')).rejects.toThrow();
  });

  it('obtenerVerificacion pide la lista de chequeo del pedido, con el código escapado', async () => {
    cliente.get.mockResolvedValue({ data: { success: true, data: verificacion([lineaVerificacion()]) } });

    const v = await obtenerVerificacion('PC 2026/1');

    expect(cliente.get).toHaveBeenCalledWith('/cumplimiento/ordenes/PC%202026%2F1/verificacion');
    expect(v.lineas).toHaveLength(1);
  });

  it('marcarLineas envía las marcas por PUT y entrega si el pedido avanzó', async () => {
    const resultado = verificacion([lineaVerificacion({ estado: 'disponible' })], { estado: 'en_preparacion' });
    cliente.put.mockResolvedValue({ data: { success: true, data: { verificacion: resultado, avanzo: true } } });

    const r = await marcarLineas('PC-2026-00001', [{ numeroLinea: 1, estado: 'disponible' }]);

    expect(cliente.put).toHaveBeenCalledWith('/cumplimiento/ordenes/PC-2026-00001/verificacion', {
      lineas: [{ numeroLinea: 1, estado: 'disponible' }],
    });
    expect(r.avanzo).toBe(true);
    expect(r.verificacion.estado).toBe('en_preparacion');
  });

  it('listarRetenidas entrega las filas y la paginación, y envía la página pedida', async () => {
    cliente.get.mockResolvedValue({ data: { success: true, data: [RETENIDA], pagination: PAGINACION } });

    const r = await listarRetenidas(2, 5);

    expect(cliente.get).toHaveBeenCalledWith('/cumplimiento/retenidas', { params: { pagina: 2, limite: 5 } });
    expect(r.filas[0]?.motivos).toHaveLength(2);
    expect(r.paginacion.total).toBe(1);
  });

  it('obtenerHoja entrega la hoja', async () => {
    cliente.get.mockResolvedValue({ data: { success: true, data: HOJA } });

    expect((await obtenerHoja('PC-2026-00001')).lineas).toHaveLength(2);
    expect(cliente.get).toHaveBeenCalledWith('/cumplimiento/ordenes/PC-2026-00001/hoja');
  });

  it('una respuesta que no cumple el contrato se rechaza en vez de pintarse', async () => {
    cliente.get.mockResolvedValue({ data: { success: true, data: { ...HOJA, lineas: [{ ...HOJA.lineas[0], precioAplicado: 10 }] } } });

    await expect(obtenerHoja('PC-2026-00001')).rejects.toThrow();
  });

  it('una marca que el contrato no define se rechaza antes de pintarse', async () => {
    const mala = verificacion([lineaVerificacion()]);
    cliente.get.mockResolvedValue({ data: { success: true, data: { ...mala, lineas: [{ ...mala.lineas[0], estado: 'parcial' }] } } });

    await expect(obtenerVerificacion('PC-2026-00001')).rejects.toThrow();
  });
});
