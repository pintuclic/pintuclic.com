import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AutorizacionService } from '../../m20-seguridad/services/autorizacion.service';
import type { SolicitudPagadaInput } from '../dtos/m08-ordenes.dto';
import type { CreacionRepository, CreacionTx } from '../interfaces/ordenes.interface';
import { construirModuloM08 } from '../m08.routes';

/** El ensamblaje no ejecuta autorización: solo exige que exista el colaborador. */
const autorizacion = { exigirPermiso: vi.fn() } as unknown as AutorizacionService;

function solicitud(): SolicitudPagadaInput {
  return {
    codigoSolicitud: 'SOL-2026-00010',
    transaccionPagoId: 'TX-ENSAMBLAJE-1',
    idUsuario: 7,
    origen: 'carrito',
    idCotizacion: null,
    modoEntrega: 'recogida',
    direccion: null,
    costoEntrega: 0,
    subTotal: 100000,
    descuento: 0,
    total: 100000,
    baseSinImpuesto: 84033.61,
    importeIva: 15966.39,
    tasaIva: 19,
    montoPagado: 100000,
    observaciones: null,
    lineas: [
      {
        nombreProducto: 'Vinilo',
        varianteCopia: 'Galón',
        colorSolicitado: null,
        skuVendido: null,
        cantidad: 1,
        precioInicial: 100000,
        precioAplicado: 100000,
        idVarianteRef: null,
        esEntonado: false,
        baseConsumida: null,
        descuentos: [],
      },
    ],
  };
}

describe('m08.routes · ensamblaje del módulo', () => {
  afterEach(() => vi.restoreAllMocks());

  it('expone el servicio de creación para que M07 lo invoque al confirmarse el pago (HU-ORD-01)', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const m08 = construirModuloM08(autorizacion);

    expect(m08.router).toBeDefined();
    expect(typeof m08.creacion.crearDesdePagoConfirmado).toBe('function');
  });

  it('la creación usa el repositorio y las notificaciones inyectados', async () => {
    const notificarOrdenCreada = vi.fn().mockResolvedValue(undefined);
    const tx: CreacionTx = {
      bloquearConsecutivo: async () => undefined,
      buscarExistente: async () => null,
      avanzarConsecutivo: async () => 42,
      insertarOrden: async (codigo) => ({ codigo, estado: 'revision_disponibilidad' }),
    };
    const repo: CreacionRepository = {
      enTransaccion: async (trabajo) => trabajo(tx),
      buscarExistente: async () => null,
    };

    const m08 = construirModuloM08(autorizacion, {
      creacion: { repo },
      estados: {
        notificaciones: { notificarOrdenCreada, notificarOrdenDespachada: vi.fn() },
        eventos: { emitirCambioEstado: vi.fn() },
        reloj: { ahora: () => new Date('2026-10-26T15:00:00Z') },
      },
    });
    const resultado = await m08.creacion.crearDesdePagoConfirmado(solicitud());

    expect(resultado).toEqual({ codigo: 'PC-2026-00042', estado: 'revision_disponibilidad', creada: true });
    expect(notificarOrdenCreada).toHaveBeenCalledWith({ codigo: 'PC-2026-00042', idUsuario: 7, total: 100000 });
  });

  it('sin adaptadores reales avisa de que las notificaciones están desactivadas (M18 no conectado)', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    construirModuloM08(autorizacion);

    expect(aviso).toHaveBeenCalledWith(expect.stringMatching(/Notificaciones de pedidos DESACTIVADAS.*M18/));
  });

  it('con adaptadores reales inyectados no avisa', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    construirModuloM08(autorizacion, {
      estados: {
        notificaciones: { notificarOrdenCreada: vi.fn(), notificarOrdenDespachada: vi.fn() },
        eventos: { emitirCambioEstado: vi.fn() },
      },
    });

    expect(aviso).not.toHaveBeenCalled();
  });
});
