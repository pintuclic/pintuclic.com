import { describe, expect, it, vi } from 'vitest';
import { AvisosCotizacionM18Adapter, AvisosOrdenM18Adapter } from '../adapters/avisos-m18.adapter';
import { MemoriaNotificacionesAdapter } from '../adapters/notificaciones.adapter';

describe('AvisosOrdenM18Adapter · despacho de M08', () => {
  it('busca al titular y avisa a su correo con el código del pedido', async () => {
    const memoria = new MemoriaNotificacionesAdapter();
    const buscar = vi.fn().mockResolvedValue({ nombre: 'Laura', correo: 'laura@pintuclic.co' });
    await new AvisosOrdenM18Adapter(memoria, { buscar }).notificarOrdenDespachada({ codigo: 'PC-2026-00001', idUsuario: 7 });

    expect(buscar).toHaveBeenCalledWith(7);
    expect(memoria.obtenerEventos()).toMatchObject([
      { tipo: 'orden_despachada', destinatario: 'laura@pintuclic.co', metadatos: { nombre: 'Laura', codigoOrden: 'PC-2026-00001' } },
    ]);
  });

  it('si la cuenta ya no existe no envía nada', async () => {
    const memoria = new MemoriaNotificacionesAdapter();
    await new AvisosOrdenM18Adapter(memoria, { buscar: async () => null }).notificarOrdenDespachada({ codigo: 'PC-2026-00001', idUsuario: 9 });
    expect(memoria.obtenerEventos()).toEqual([]);
  });
});

describe('AvisosCotizacionM18Adapter · M21 D8', () => {
  const base = { idCotizacion: 4, codigo: 'COT-2026-00004', correoCliente: 'laura@pintuclic.co', nombreCliente: 'Laura' };

  it('respondida: formatea el total en pesos y el vencimiento en fecha larga', async () => {
    const memoria = new MemoriaNotificacionesAdapter();
    await new AvisosCotizacionM18Adapter(memoria).cotizacionRespondida({ ...base, totalAcordado: 171800, fechaVencimiento: '2026-11-15' });

    const [evento] = memoria.obtenerEventos();
    expect(evento?.tipo).toBe('cotizacion_respondida');
    expect(evento?.metadatos.total).toMatch(/^\$ 171\.800$/);
    expect(evento?.metadatos.vencimiento).toBe('15 de noviembre de 2026');
  });

  it('rechazada: lleva el motivo', async () => {
    const memoria = new MemoriaNotificacionesAdapter();
    await new AvisosCotizacionM18Adapter(memoria).cotizacionRechazada({ ...base, motivo: 'Fuera de catálogo' });
    expect(memoria.obtenerEventos()).toMatchObject([{ tipo: 'cotizacion_rechazada', metadatos: { motivo: 'Fuera de catálogo' } }]);
  });
});
