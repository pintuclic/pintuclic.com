import { AxiosError, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ obtenerVerificacion: vi.fn(), marcarLineas: vi.fn(), solicitarCancelacion: vi.fn() }));
vi.mock('../services/cumplimiento-api', () => api);

import { AVISO_AVANZO, AVISO_AVANZO_PREPARADA } from '../services/presentacion';
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
    api.solicitarCancelacion.mockReset();
    useCumplimientoStore.getState().limpiar();
  });

  it('cada marca guardada suma uno a «guardados», para que el detalle del pedido se vuelva a pedir', async () => {
    api.obtenerVerificacion.mockResolvedValue(verificacion(TRES()));
    await useCumplimientoStore.getState().cargar('PC-2026-00001');
    api.marcarLineas.mockResolvedValue({ verificacion: verificacion(TRES()), avanzo: false });

    expect(useCumplimientoStore.getState().guardados).toBe(0);
    await useCumplimientoStore.getState().marcar([{ numeroLinea: 3, estado: 'disponible' }]);
    await useCumplimientoStore.getState().marcar([{ numeroLinea: 2, estado: 'disponible' }]);

    expect(useCumplimientoStore.getState().guardados).toBe(2);
  });

  it('una marca que falla no suma a «guardados»', async () => {
    api.obtenerVerificacion.mockResolvedValue(verificacion(TRES()));
    await useCumplimientoStore.getState().cargar('PC-2026-00001');
    api.marcarLineas.mockRejectedValue(errorDeApi('No se pudo.'));

    await useCumplimientoStore.getState().marcar([{ numeroLinea: 3, estado: 'disponible' }]);

    expect(useCumplimientoStore.getState().guardados).toBe(0);
  });

  it('cuando las marcas dejan todo preparado el aviso es el de «preparada», no el de preparación', async () => {
    const enPreparacion = [1, 2, 3].map((n) => lineaVerificacion({ numeroLinea: n, estado: 'disponible' }));
    api.obtenerVerificacion.mockResolvedValue(verificacion(enPreparacion, { estado: 'en_preparacion' }));
    await useCumplimientoStore.getState().cargar('PC-2026-00001');
    const preparadas = [1, 2, 3].map((n) => lineaVerificacion({ numeroLinea: n, estado: 'preparada' }));
    api.marcarLineas.mockResolvedValue({ verificacion: verificacion(preparadas, { estado: 'preparada' }), avanzo: true });

    const avanzo = await useCumplimientoStore.getState().marcarTodas('preparada');

    expect(avanzo).toBe(true);
    expect(useCumplimientoStore.getState().aviso).toBe(AVISO_AVANZO_PREPARADA);
  });

  describe('pedir la cancelación (R18)', () => {
    const TRAMITE = { codigo: 'DEV-2026-00012', estado: 'solicitada', iniciadaPor: 'tienda', fecha: '2026-10-31T10:00:00.000Z' } as const;

    it('guarda la solicitud en la lista de chequeo y avisa con su código', async () => {
      api.obtenerVerificacion.mockResolvedValue(verificacion([lineaVerificacion({ estado: 'no_disponible' })]));
      await useCumplimientoStore.getState().cargar('PC-2026-00001');
      api.solicitarCancelacion.mockResolvedValue(TRAMITE);

      const ok = await useCumplimientoStore.getState().pedirCancelacion('Llega a fin de mes');

      const s = useCumplimientoStore.getState();
      expect(ok).toBe(true);
      expect(api.solicitarCancelacion).toHaveBeenCalledWith('PC-2026-00001', 'Llega a fin de mes');
      expect(s.verificacion?.cancelacion).toEqual(TRAMITE);
      expect(s.aviso).toContain('DEV-2026-00012');
      expect(s.solicitando).toBe(false);
    });

    it('si falla muestra el mensaje del servidor y la lista queda sin cancelación', async () => {
      api.obtenerVerificacion.mockResolvedValue(verificacion([lineaVerificacion({ estado: 'no_disponible' })]));
      await useCumplimientoStore.getState().cargar('PC-2026-00001');
      api.solicitarCancelacion.mockRejectedValue(errorDeApi('Ya existe una solicitud en trámite (DEV-2026-00009) para este pedido.', 'SOLICITUD_DUPLICADA'));

      const ok = await useCumplimientoStore.getState().pedirCancelacion();

      const s = useCumplimientoStore.getState();
      expect(ok).toBe(false);
      expect(s.error).toBe('Ya existe una solicitud en trámite (DEV-2026-00009) para este pedido.');
      expect(s.verificacion?.cancelacion).toBeNull();
      expect(s.solicitando).toBe(false);
    });

    it('no deja pedirla dos veces a la vez', async () => {
      api.obtenerVerificacion.mockResolvedValue(verificacion([lineaVerificacion({ estado: 'no_disponible' })]));
      await useCumplimientoStore.getState().cargar('PC-2026-00001');
      let liberar: () => void = () => undefined;
      api.solicitarCancelacion.mockImplementation(() => new Promise((resolver) => (liberar = () => resolver(TRAMITE))));

      const primera = useCumplimientoStore.getState().pedirCancelacion();
      const segunda = await useCumplimientoStore.getState().pedirCancelacion();
      liberar();
      await primera;

      expect(segunda).toBe(false);
      expect(api.solicitarCancelacion).toHaveBeenCalledTimes(1);
    });

    it('sin un pedido cargado no hace nada', async () => {
      expect(await useCumplimientoStore.getState().pedirCancelacion()).toBe(false);
      expect(api.solicitarCancelacion).not.toHaveBeenCalled();
    });
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
