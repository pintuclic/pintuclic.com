import { AxiosError, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ obtenerVerificacion: vi.fn(), marcarLineas: vi.fn() }));
vi.mock('../services/cumplimiento-api', () => api);

import { AVISO_AVANZO } from '../services/presentacion';
import { useCumplimientoStore } from '../store/cumplimientoStore';
import { lineaVerificacion, verificacion } from './fixtures';

const TRES = () => [
  lineaVerificacion({ numeroLinea: 1, estado: 'disponible' }),
  lineaVerificacion({ numeroLinea: 2, estado: 'consiguiendo_stock' }),
  lineaVerificacion({ numeroLinea: 3 }),
];

function errorDeApi(mensaje: string, code = 'ESTADO_CAMBIADO'): AxiosError {
  const respuesta = { status: 409, data: { success: false, error: { code, message: mensaje, details: null } } } as AxiosResponse;
  return new AxiosError(mensaje, 'ERR_BAD_REQUEST', undefined, undefined, respuesta);
}

describe('store de M09', () => {
  beforeEach(() => {
    api.obtenerVerificacion.mockReset();
    api.marcarLineas.mockReset();
    useCumplimientoStore.getState().limpiar();
  });

  it('cargar trae la lista de chequeo del pedido', async () => {
    api.obtenerVerificacion.mockResolvedValue(verificacion(TRES()));

    await useCumplimientoStore.getState().cargar('PC-2026-00001');

    const s = useCumplimientoStore.getState();
    expect(s.verificacion?.lineas).toHaveLength(3);
    expect(s.cargando).toBe(false);
    expect(s.error).toBeNull();
  });

  it('si la carga falla muestra el mensaje del servidor y no deja una lista a medias', async () => {
    api.obtenerVerificacion.mockRejectedValue(errorDeApi('Esta orden ya no está en revisión ni en preparación.', 'ORDEN_FUERA_DE_CUMPLIMIENTO'));

    await useCumplimientoStore.getState().cargar('PC-2026-00001');

    const s = useCumplimientoStore.getState();
    expect(s.verificacion).toBeNull();
    expect(s.error).toBe('Esta orden ya no está en revisión ni en preparación.');
    expect(s.cargando).toBe(false);
  });

  it('marcar una línea guarda lo que devuelve el servidor y no avisa de avance', async () => {
    api.obtenerVerificacion.mockResolvedValue(verificacion(TRES()));
    await useCumplimientoStore.getState().cargar('PC-2026-00001');
    const despues = TRES();
    despues[2] = lineaVerificacion({ numeroLinea: 3, estado: 'no_disponible' });
    api.marcarLineas.mockResolvedValue({ verificacion: verificacion(despues), avanzo: false });

    const avanzo = await useCumplimientoStore.getState().marcar([{ numeroLinea: 3, estado: 'no_disponible' }]);

    expect(avanzo).toBe(false);
    expect(api.marcarLineas).toHaveBeenCalledWith('PC-2026-00001', [{ numeroLinea: 3, estado: 'no_disponible' }]);
    expect(useCumplimientoStore.getState().verificacion?.lineas[2]?.estado).toBe('no_disponible');
    expect(useCumplimientoStore.getState().aviso).toBeNull();
    expect(useCumplimientoStore.getState().guardando).toBe(false);
  });

  it('cuando la marca hace avanzar el pedido lo devuelve y deja el aviso', async () => {
    api.obtenerVerificacion.mockResolvedValue(verificacion(TRES()));
    await useCumplimientoStore.getState().cargar('PC-2026-00001');
    const lista = [1, 2, 3].map((n) => lineaVerificacion({ numeroLinea: n, estado: 'disponible' }));
    api.marcarLineas.mockResolvedValue({ verificacion: verificacion(lista, { estado: 'en_preparacion' }), avanzo: true });

    const avanzo = await useCumplimientoStore.getState().marcar([{ numeroLinea: 3, estado: 'disponible' }]);

    expect(avanzo).toBe(true);
    expect(useCumplimientoStore.getState().aviso).toBe(AVISO_AVANZO);
    expect(useCumplimientoStore.getState().verificacion?.estado).toBe('en_preparacion');
  });

  it('si guardar falla muestra el mensaje y conserva la lista tal como estaba', async () => {
    api.obtenerVerificacion.mockResolvedValue(verificacion(TRES()));
    await useCumplimientoStore.getState().cargar('PC-2026-00001');
    api.marcarLineas.mockRejectedValue(errorDeApi('La orden cambió de estado mientras la consultaba. Recargue y vuelva a intentarlo.'));

    const avanzo = await useCumplimientoStore.getState().marcar([{ numeroLinea: 3, estado: 'disponible' }]);

    const s = useCumplimientoStore.getState();
    expect(avanzo).toBe(false);
    expect(s.error).toBe('La orden cambió de estado mientras la consultaba. Recargue y vuelva a intentarlo.');
    expect(s.verificacion?.lineas[2]?.estado).toBe('pendiente');
    expect(s.guardando).toBe(false);
  });

  it('marcarTodas envía solo las líneas que aún no tienen esa marca', async () => {
    api.obtenerVerificacion.mockResolvedValue(verificacion(TRES()));
    await useCumplimientoStore.getState().cargar('PC-2026-00001');
    api.marcarLineas.mockResolvedValue({ verificacion: verificacion(TRES()), avanzo: false });

    await useCumplimientoStore.getState().marcarTodas('disponible');

    expect(api.marcarLineas).toHaveBeenCalledWith('PC-2026-00001', [
      { numeroLinea: 2, estado: 'disponible' },
      { numeroLinea: 3, estado: 'disponible' },
    ]);
  });

  it('marcarTodas no llama al servidor si todas ya tienen la marca', async () => {
    const todas = [1, 2].map((n) => lineaVerificacion({ numeroLinea: n, estado: 'disponible' }));
    api.obtenerVerificacion.mockResolvedValue(verificacion(todas));
    await useCumplimientoStore.getState().cargar('PC-2026-00001');

    expect(await useCumplimientoStore.getState().marcarTodas('disponible')).toBe(false);
    expect(api.marcarLineas).not.toHaveBeenCalled();
  });

  it('no deja guardar dos veces a la vez: un segundo toque mientras guarda se ignora', async () => {
    api.obtenerVerificacion.mockResolvedValue(verificacion(TRES()));
    await useCumplimientoStore.getState().cargar('PC-2026-00001');
    let liberar: () => void = () => undefined;
    api.marcarLineas.mockImplementation(
      () => new Promise((resolver) => (liberar = () => resolver({ verificacion: verificacion(TRES()), avanzo: false }))),
    );

    const primera = useCumplimientoStore.getState().marcar([{ numeroLinea: 3, estado: 'disponible' }]);
    const segunda = await useCumplimientoStore.getState().marcar([{ numeroLinea: 2, estado: 'disponible' }]);
    liberar();
    await primera;

    expect(segunda).toBe(false);
    expect(api.marcarLineas).toHaveBeenCalledTimes(1);
  });

  it('una respuesta que llega tarde de otro pedido no pisa el que se está viendo', async () => {
    let resolverViejo: (v: ReturnType<typeof verificacion>) => void = () => undefined;
    api.obtenerVerificacion.mockImplementationOnce(() => new Promise((r) => (resolverViejo = r)));
    const viejo = useCumplimientoStore.getState().cargar('PC-2026-00001');
    api.obtenerVerificacion.mockResolvedValueOnce(verificacion([lineaVerificacion()], { codigo: 'PC-2026-00002' }));
    await useCumplimientoStore.getState().cargar('PC-2026-00002');

    resolverViejo(verificacion(TRES(), { codigo: 'PC-2026-00001' }));
    await viejo;

    expect(useCumplimientoStore.getState().verificacion?.codigo).toBe('PC-2026-00002');
  });
});
