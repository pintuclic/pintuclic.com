import { describe, expect, it, vi } from 'vitest';
import { NotificacionesOrdenM18Adapter } from '../adapters/notificaciones-m18.adapter';
import type { NotificacionesOrdenPort } from '../interfaces/notificaciones-orden.port';

const EVENTO = { codigo: 'PC-2026-00001', idUsuario: 7, motivo: 'Sin existencias de: Vinilo, Galón (1 unidad).', origen: 'tienda' } as const;

function base(): NotificacionesOrdenPort {
  return {
    notificarOrdenCreada: vi.fn().mockResolvedValue(undefined),
    notificarOrdenDespachada: vi.fn().mockResolvedValue(undefined),
  };
}

describe('NotificacionesOrdenM18Adapter (M08 R10)', () => {
  it('envía el aviso de cancelación por M18 al correo y con el nombre del dueño del pedido', async () => {
    const m18 = { notificarOrdenCancelada: vi.fn().mockResolvedValue(undefined) };
    const adaptador = new NotificacionesOrdenM18Adapter(m18, base(), async () => ({ nombre: 'Laura', correo: 'laura@correo.co' }));

    await adaptador.notificarOrdenCancelada(EVENTO);

    expect(m18.notificarOrdenCancelada).toHaveBeenCalledWith('laura@correo.co', {
      nombre: 'Laura',
      codigoOrden: 'PC-2026-00001',
      motivo: EVENTO.motivo,
      origen: 'tienda',
    });
  });

  it('«creada» y «despachada» siguen yendo adonde ya iban (el comprobante de M12)', async () => {
    const alCrear = base();
    const adaptador = new NotificacionesOrdenM18Adapter({ notificarOrdenCancelada: vi.fn() }, alCrear, async () => null);

    await adaptador.notificarOrdenCreada({ codigo: 'PC-2026-00001', idUsuario: 7, total: 1000 });
    await adaptador.notificarOrdenDespachada({ codigo: 'PC-2026-00001', idUsuario: 7 });

    expect(alCrear.notificarOrdenCreada).toHaveBeenCalledOnce();
    expect(alCrear.notificarOrdenDespachada).toHaveBeenCalledOnce();
  });

  it('si el cliente ya no existe no envía nada ni falla', async () => {
    const m18 = { notificarOrdenCancelada: vi.fn() };
    const adaptador = new NotificacionesOrdenM18Adapter(m18, base(), async () => null);

    await expect(adaptador.notificarOrdenCancelada(EVENTO)).resolves.toBeUndefined();
    expect(m18.notificarOrdenCancelada).not.toHaveBeenCalled();
  });

  it('si el canal de correo no sabe de cancelaciones (adaptador antiguo) no hace nada', async () => {
    const adaptador = new NotificacionesOrdenM18Adapter({}, base(), async () => ({ nombre: 'Laura', correo: 'laura@correo.co' }));

    await expect(adaptador.notificarOrdenCancelada(EVENTO)).resolves.toBeUndefined();
  });

  it('el fallo del correo sube a quien llama, que es quien decide no deshacer nada (M11 lo registra)', async () => {
    const m18 = { notificarOrdenCancelada: vi.fn().mockRejectedValue(new Error('SMTP caído')) };
    const adaptador = new NotificacionesOrdenM18Adapter(m18, base(), async () => ({ nombre: 'Laura', correo: 'laura@correo.co' }));

    await expect(adaptador.notificarOrdenCancelada(EVENTO)).rejects.toThrow('SMTP caído');
  });
});
