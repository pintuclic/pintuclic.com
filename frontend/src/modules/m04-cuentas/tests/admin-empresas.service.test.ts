import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
vi.mock('@/core/api/apiClient', () => ({ apiClient: api }));

import {
  cambiarTipoCliente,
  dictaminarRenovacion,
  dictaminarSolicitud,
  listarCuentasEmpresa,
  listarTiposCliente,
} from '../services/admin-empresas.service';

beforeEach(() => {
  api.get.mockReset().mockResolvedValue({ data: { data: [] } });
  api.post.mockReset().mockResolvedValue({ data: { data: {} } });
  api.patch.mockReset().mockResolvedValue({ data: { data: {} } });
});

describe('dictamen de solicitudes de cuenta (M06 · D8)', () => {
  it('al aprobar envía el tipo de cliente elegido', async () => {
    await dictaminarSolicitud('sol-1', { decision: 'aprobar', idSubRolEmpresa: 2 });
    expect(api.post).toHaveBeenCalledWith('/admin/empresas/solicitudes/sol-1/dictamen', {
      decision: 'aprobar',
      idSubRolEmpresa: 2,
    });
  });

  it('al rechazar NO envía tipo aunque venga, y el motivo vacío no viaja', async () => {
    await dictaminarSolicitud('sol-1', { decision: 'rechazar', motivoRechazo: '  ', idSubRolEmpresa: 2 });
    expect(api.post).toHaveBeenCalledWith('/admin/empresas/solicitudes/sol-1/dictamen', { decision: 'rechazar' });
  });

  it('la renovación de NIT sigue sin tipo', async () => {
    await dictaminarRenovacion('ren-1', { decision: 'aprobar' });
    expect(api.post).toHaveBeenCalledWith('/admin/empresas/renovaciones/ren-1/dictamen', { decision: 'aprobar' });
  });
});

describe('tipos de cliente y cuentas empresa (M06 · D8)', () => {
  it('lista los tipos activos', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [{ idSubRolEmpresa: 1, nombre: 'Proveedor' }] } });
    expect(await listarTiposCliente()).toEqual([{ idSubRolEmpresa: 1, nombre: 'Proveedor' }]);
    expect(api.get).toHaveBeenCalledWith('/admin/empresas/tipos');
  });

  it('las cuentas se piden con filtros limpios: lo vacío no viaja', async () => {
    await listarCuentasEmpresa({ busqueda: '  ', sinTipo: false, page: 2, limit: 10 });
    expect(api.get).toHaveBeenLastCalledWith('/admin/empresas/cuentas', { params: { page: 2, limit: 10 } });
    await listarCuentasEmpresa({ busqueda: ' andes ', sinTipo: true });
    expect(api.get).toHaveBeenLastCalledWith('/admin/empresas/cuentas', {
      params: { busqueda: 'andes', sinTipo: true },
    });
  });

  it('cambiar el tipo hace PATCH de la cuenta con el tipo nuevo', async () => {
    await cambiarTipoCliente(7, 3);
    expect(api.patch).toHaveBeenCalledWith('/admin/empresas/cuentas/7/tipo', { idSubRolEmpresa: 3 });
  });
});
