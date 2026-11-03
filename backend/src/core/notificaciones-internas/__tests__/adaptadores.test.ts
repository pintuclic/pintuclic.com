import { describe, expect, it, vi } from 'vitest';
import { NotificacionesCotizacionFp02Adapter } from '../adapters/cotizacion-fp02.adapter';
import { EventosOrdenFp02Adapter, NotificacionesOrdenFp02Adapter } from '../adapters/orden-fp02.adapter';
import type { PublicadorNotificacionesPort } from '../notificaciones.interface';

function publicadorFalso() {
  const publicar = vi.fn<PublicadorNotificacionesPort['publicar']>(async () => undefined);
  return { publicar, port: { publicar } satisfies PublicadorNotificacionesPort };
}

const interno = () => ({
  notificarOrdenCreada: vi.fn(async () => undefined),
  notificarOrdenDespachada: vi.fn(async () => undefined),
  notificarOrdenCancelada: vi.fn(async () => undefined),
});

describe('FP-02 · adaptador de avisos de órdenes (M08/M12)', () => {
  it('orden creada: avisa al personal, deja correr lo que ya hacía y avisa al titular del comprobante', async () => {
    const p = publicadorFalso();
    const base = interno();
    const emitir = vi.fn(async () => ({}));
    await new NotificacionesOrdenFp02Adapter(base, p.port, { emitir }).notificarOrdenCreada({ codigo: 'PC-1', idUsuario: 7, total: 100 });
    expect(base.notificarOrdenCreada).toHaveBeenCalledOnce();
    expect(p.publicar.mock.calls.map(([e]) => e)).toEqual([
      { tipo: 'pedido_nuevo', destino: { tipo: 'permiso', permiso: 'ventas.ver' }, referencia: 'PC-1' },
      { tipo: 'comprobante_listo', destino: { tipo: 'usuario', idUsuario: 7 }, referencia: 'PC-1' },
    ]);
  });

  it('faltan los datos del vendedor: avisa a quien edita la configuración, sin datos de la orden', async () => {
    const p = publicadorFalso();
    const emitir = vi.fn(async () => Promise.reject(Object.assign(new Error('x'), { code: 'DATOS_VENDEDOR_INCOMPLETOS' })));
    await new NotificacionesOrdenFp02Adapter(interno(), p.port, { emitir }).notificarOrdenCreada({ codigo: 'PC-1', idUsuario: 7, total: 100 });
    expect(p.publicar.mock.calls.map(([e]) => e.tipo)).toEqual(['pedido_nuevo', 'comprobante_pendiente']);
    expect(p.publicar.mock.calls[1]?.[0]).toEqual({ tipo: 'comprobante_pendiente', destino: { tipo: 'permiso', permiso: 'configuracion.editar' } });
  });

  it('otro fallo al emitir no genera aviso de comprobante', async () => {
    const p = publicadorFalso();
    const emitir = vi.fn(async () => Promise.reject(new Error('base caída')));
    await new NotificacionesOrdenFp02Adapter(interno(), p.port, { emitir }).notificarOrdenCreada({ codigo: 'PC-1', idUsuario: 7, total: 100 });
    expect(p.publicar.mock.calls.map(([e]) => e.tipo)).toEqual(['pedido_nuevo']);
  });

  it('si lo que ya hacía falla, el error sigue saliendo igual', async () => {
    const p = publicadorFalso();
    const base = { ...interno(), notificarOrdenCreada: vi.fn(async () => Promise.reject(new Error('correo'))) };
    await expect(new NotificacionesOrdenFp02Adapter(base, p.port).notificarOrdenCreada({ codigo: 'PC-1', idUsuario: 7, total: 1 })).rejects.toThrow('correo');
  });

  it('cancelación por postventa: avisa al personal y al titular', async () => {
    const p = publicadorFalso();
    const base = interno();
    await new NotificacionesOrdenFp02Adapter(base, p.port).notificarOrdenCancelada({ codigo: 'PC-1', idUsuario: 7, motivo: 'm', origen: 'cliente' });
    expect(base.notificarOrdenCancelada).toHaveBeenCalledOnce();
    expect(p.publicar.mock.calls.map(([e]) => e.tipo)).toEqual(['pedido_anulado', 'pedido_estado']);
  });

  it('despachada pasa de largo (la cubre el cambio de estado)', async () => {
    const p = publicadorFalso();
    const base = interno();
    await new NotificacionesOrdenFp02Adapter(base, p.port).notificarOrdenDespachada({ codigo: 'PC-1', idUsuario: 7 });
    expect(base.notificarOrdenDespachada).toHaveBeenCalledOnce();
    expect(p.publicar).not.toHaveBeenCalled();
  });
});

describe('FP-02 · adaptador de cambios de estado', () => {
  const evento = (estadoNuevo: 'en_preparacion' | 'cancelado' | 'devuelto') => ({ codigo: 'PC-1', idUsuario: 7, estadoAnterior: 'orden_confirmada' as const, estadoNuevo, idUsuarioAutor: 1, fecha: new Date() });

  it('un cambio normal solo avisa al titular', async () => {
    const p = publicadorFalso();
    await new EventosOrdenFp02Adapter(p.port).emitirCambioEstado(evento('en_preparacion'));
    expect(p.publicar.mock.calls.map(([e]) => e.tipo)).toEqual(['pedido_estado']);
  });

  it.each(['cancelado', 'devuelto'] as const)('%s avisa también al personal', async (estado) => {
    const p = publicadorFalso();
    await new EventosOrdenFp02Adapter(p.port).emitirCambioEstado(evento(estado));
    expect(p.publicar.mock.calls.map(([e]) => e.tipo)).toEqual(['pedido_estado', 'pedido_anulado']);
  });
});

describe('FP-02 · adaptador de cotizaciones (M21)', () => {
  const base = { idCotizacion: 5, codigo: 'COT-000005', correoCliente: 'a@b.co', nombreCliente: 'Ana' };

  it('respondida y rechazada llegan al titular de la cotización', async () => {
    const p = publicadorFalso();
    const a = new NotificacionesCotizacionFp02Adapter(p.port, async () => 9);
    await a.cotizacionRespondida({ ...base, totalAcordado: 1, fechaVencimiento: '2026-12-01' });
    await a.cotizacionRechazada({ ...base, motivo: 'sin stock' });
    expect(p.publicar.mock.calls.map(([e]) => [e.tipo, e.destino])).toEqual([
      ['cotizacion_respondida', { tipo: 'usuario', idUsuario: 9 }],
      ['cotizacion_rechazada', { tipo: 'usuario', idUsuario: 9 }],
    ]);
  });

  it('sin titular (cotización sin cuenta) o si la búsqueda falla, no publica ni lanza', async () => {
    const p = publicadorFalso();
    await new NotificacionesCotizacionFp02Adapter(p.port, async () => null).cotizacionRechazada({ ...base, motivo: 'x' });
    await new NotificacionesCotizacionFp02Adapter(p.port, async () => Promise.reject(new Error('x'))).cotizacionRechazada({ ...base, motivo: 'x' });
    expect(p.publicar).not.toHaveBeenCalled();
  });
});
