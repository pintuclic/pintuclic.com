import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SolicitudPagadaInput } from '../dtos/m08-ordenes.dto';
import type { CreacionRepository, CreacionTx, OrdenCreada, OrdenExistente } from '../interfaces/ordenes.interface';
import type { NotificacionesOrdenPort } from '../interfaces/notificaciones-orden.port';
import { UnicidadOrdenError } from '../repositories/creacion.repository';
import { CreacionOrdenError, CreacionService } from '../services/creacion.service';

/**
 * Repositorio en memoria con semántica transaccional: una sola transacción a la vez
 * (como el bloqueo de la fila `consecutivo`) y reversión completa si el trabajo lanza.
 */
class RepoMemoria implements CreacionRepository {
  ordenes = new Map<string, OrdenCreada & { entrada: SolicitudPagadaInput }>();
  consecutivo = 0;
  fallarAlInsertar: Error | null = null;
  private cola: Promise<unknown> = Promise.resolve();

  private clave(codigoSolicitud: string, transaccionPagoId: string): string {
    return `${codigoSolicitud}|${transaccionPagoId}`;
  }

  async enTransaccion<T>(trabajo: (tx: CreacionTx) => Promise<T>): Promise<T> {
    const turno = this.cola.then(async () => {
      const copiaOrdenes = new Map(this.ordenes);
      const copiaConsecutivo = this.consecutivo;
      try {
        return await trabajo({
          bloquearConsecutivo: async () => undefined,
          buscarExistente: async (s, p) => this.buscar(s, p),
          avanzarConsecutivo: async () => {
            this.consecutivo += 1;
            return this.consecutivo;
          },
          insertarOrden: async (codigo, entrada) => {
            if (this.fallarAlInsertar) throw this.fallarAlInsertar;
            const orden = { codigo, estado: 'revision_disponibilidad' as const, entrada };
            this.ordenes.set(this.clave(entrada.codigoSolicitud, entrada.transaccionPagoId), orden);
            return { codigo, estado: orden.estado };
          },
        });
      } catch (error) {
        this.ordenes = copiaOrdenes;
        this.consecutivo = copiaConsecutivo;
        throw error;
      }
    });
    this.cola = turno.catch(() => undefined);
    return turno;
  }

  async buscarExistente(codigoSolicitud: string, transaccionPagoId: string): Promise<OrdenExistente | null> {
    return this.buscar(codigoSolicitud, transaccionPagoId);
  }

  private buscar(codigoSolicitud: string, transaccionPagoId: string): OrdenExistente | null {
    const orden = [...this.ordenes.values()].find(
      (o) => o.entrada.codigoSolicitud === codigoSolicitud || o.entrada.transaccionPagoId === transaccionPagoId,
    );
    return orden
      ? {
          codigo: orden.codigo,
          estado: orden.estado,
          codigoSolicitud: orden.entrada.codigoSolicitud,
          transaccionPagoId: orden.entrada.transaccionPagoId,
          idUsuario: orden.entrada.idUsuario,
        }
      : null;
  }
}

function solicitud(sobrescribir: Partial<SolicitudPagadaInput> = {}): SolicitudPagadaInput {
  return {
    codigoSolicitud: 'SOL-2026-00001',
    transaccionPagoId: 'TX-1',
    idUsuario: 7,
    origen: 'carrito',
    idCotizacion: null,
    modoEntrega: 'recogida',
    direccion: null,
    costoEntrega: 0,
    subTotal: 100000,
    descuento: 10000,
    total: 90000,
    baseSinImpuesto: 75630.25,
    importeIva: 14369.75,
    tasaIva: 19,
    montoPagado: 90000,
    observaciones: null,
    lineas: [
      {
        nombreProducto: 'Vinilo Tipo 1',
        varianteCopia: 'Galón',
        colorSolicitado: null,
        skuVendido: 'VIN-GAL',
        cantidad: 1,
        precioInicial: 100000,
        precioAplicado: 90000,
        idVarianteRef: 3,
        esEntonado: false,
        baseConsumida: null,
        descuentos: [{ ordenAplicacion: 1, origen: 'Promoción de temporada', porcentaje: 10, importe: 10000 }],
      },
    ],
    ...sobrescribir,
  };
}

describe('CreacionService (HU-ORD-01, HU-ORD-02, HU-ORD-06)', () => {
  let repo: RepoMemoria;
  let notificaciones: NotificacionesOrdenPort;
  let ahora: Date;
  let servicio: CreacionService;

  beforeEach(() => {
    repo = new RepoMemoria();
    notificaciones = {
      notificarOrdenCreada: vi.fn().mockResolvedValue(undefined),
      notificarOrdenDespachada: vi.fn().mockResolvedValue(undefined),
    };
    ahora = new Date('2026-10-24T15:00:00Z');
    servicio = new CreacionService(repo, notificaciones, { ahora: () => ahora });
  });

  it('crea la orden con código PC-AAAA-NNNNN y la deja en revision_disponibilidad (CA-ORD-01-01)', async () => {
    const resultado = await servicio.crearDesdePagoConfirmado(solicitud());

    expect(resultado).toEqual({ codigo: 'PC-2026-00001', estado: 'revision_disponibilidad', creada: true });
    expect(repo.ordenes.size).toBe(1);
  });

  it('entrega a la orden los importes y descuentos tal cual, sin recalcular (D07, CA-ORD-02-05)', async () => {
    const entrada = solicitud();
    await servicio.crearDesdePagoConfirmado(entrada);

    const guardada = [...repo.ordenes.values()][0]?.entrada;
    expect(guardada?.tasaIva).toBe(19);
    expect(guardada?.importeIva).toBe(14369.75);
    expect(guardada?.lineas[0]?.descuentos).toEqual(entrada.lineas[0]?.descuentos);
  });

  it('devuelve la existente si la misma solicitud llega dos veces y no avanza el consecutivo (CA-ORD-01-05)', async () => {
    const primera = await servicio.crearDesdePagoConfirmado(solicitud());
    const segunda = await servicio.crearDesdePagoConfirmado(solicitud());

    expect(segunda).toEqual({ codigo: primera.codigo, estado: 'revision_disponibilidad', creada: false });
    expect(repo.ordenes.size).toBe(1);
    expect(repo.consecutivo).toBe(1);
    expect(notificaciones.notificarOrdenCreada).toHaveBeenCalledTimes(1);
  });

  it('dos confirmaciones simultáneas de la misma solicitud generan una sola orden', async () => {
    const [a, b] = await Promise.all([
      servicio.crearDesdePagoConfirmado(solicitud()),
      servicio.crearDesdePagoConfirmado(solicitud()),
    ]);

    expect(a.codigo).toBe(b.codigo);
    expect([a.creada, b.creada].sort()).toEqual([false, true]);
    expect(repo.ordenes.size).toBe(1);
    expect(repo.consecutivo).toBe(1);
  });

  it('asigna números corridos a solicitudes distintas (CA-ORD-06-01, CA-ORD-06-03)', async () => {
    const a = await servicio.crearDesdePagoConfirmado(solicitud());
    const b = await servicio.crearDesdePagoConfirmado(
      solicitud({ codigoSolicitud: 'SOL-2026-00002', transaccionPagoId: 'TX-2' }),
    );

    expect([a.codigo, b.codigo]).toEqual(['PC-2026-00001', 'PC-2026-00002']);
  });

  it('usa el año de Colombia aunque en UTC ya sea el año siguiente', async () => {
    ahora = new Date('2027-01-01T03:00:00Z'); // 31/12/2026 22:00 en Bogotá

    const resultado = await servicio.crearDesdePagoConfirmado(solicitud());

    expect(resultado.codigo).toBe('PC-2026-00001');
  });

  it('rechaza un pago inferior al total y no deja rastro (D06)', async () => {
    await expect(servicio.crearDesdePagoConfirmado(solicitud({ montoPagado: 89999 }))).rejects.toMatchObject({
      codigo: 'PAGO_INSUFICIENTE',
    });

    expect(repo.ordenes.size).toBe(0);
    expect(repo.consecutivo).toBe(0);
  });

  it('rechaza una solicitud sin confirmación de pago (CA-ORD-01-02)', async () => {
    const sinPago = { ...solicitud(), transaccionPagoId: '' };

    await expect(servicio.crearDesdePagoConfirmado(sinPago)).rejects.toMatchObject({
      codigo: 'PAGO_NO_CONFIRMADO',
    });
    expect(repo.ordenes.size).toBe(0);
  });

  it('rechaza una orden de cotización sin identificador de cotización (CA-ORD-01-04)', async () => {
    await expect(
      servicio.crearDesdePagoConfirmado(solicitud({ origen: 'cotizacion', idCotizacion: null })),
    ).rejects.toBeInstanceOf(CreacionOrdenError);
  });

  it('conserva el identificador de la cotización de origen (CA-ORD-01-04)', async () => {
    await servicio.crearDesdePagoConfirmado(solicitud({ origen: 'cotizacion', idCotizacion: 55 }));

    const guardada = [...repo.ordenes.values()][0]?.entrada;
    expect(guardada?.origen).toBe('cotizacion');
    expect(guardada?.idCotizacion).toBe(55);
  });

  it('si algo falla a mitad de la creación no avanza el consecutivo ni deja huecos (R3)', async () => {
    repo.fallarAlInsertar = new Error('fallo simulado');
    await expect(servicio.crearDesdePagoConfirmado(solicitud())).rejects.toThrow('fallo simulado');
    expect(repo.consecutivo).toBe(0);

    repo.fallarAlInsertar = null;
    const resultado = await servicio.crearDesdePagoConfirmado(solicitud());
    expect(resultado.codigo).toBe('PC-2026-00001');
  });

  it('si otra transacción ganó por unicidad, devuelve la orden ya existente', async () => {
    const existente: OrdenExistente = {
      codigo: 'PC-2026-00009',
      estado: 'revision_disponibilidad',
      codigoSolicitud: 'SOL-2026-00001',
      transaccionPagoId: 'TX-1',
      idUsuario: 7,
    };
    repo.fallarAlInsertar = new UnicidadOrdenError();
    vi.spyOn(repo, 'buscarExistente').mockResolvedValue(existente);

    const resultado = await servicio.crearDesdePagoConfirmado(solicitud());

    expect(resultado).toEqual({ codigo: existente.codigo, estado: existente.estado, creada: false });
  });

  it('tras perder la carrera por unicidad, no devuelve una orden que no coincide con la solicitud', async () => {
    repo.fallarAlInsertar = new UnicidadOrdenError();
    vi.spyOn(repo, 'buscarExistente').mockResolvedValue({
      codigo: 'PC-2026-00009',
      estado: 'revision_disponibilidad',
      codigoSolicitud: 'SOL-2026-00555',
      transaccionPagoId: 'TX-1',
      idUsuario: 7,
    });

    await expect(servicio.crearDesdePagoConfirmado(solicitud())).rejects.toMatchObject({ codigo: 'CONFLICTO_SOLICITUD' });
  });

  describe('claves cruzadas (idempotencia sin devolver la orden de otro)', () => {
    it('una transacción de pago ya usada por OTRA solicitud no devuelve esa orden: conflicto', async () => {
      await servicio.crearDesdePagoConfirmado(solicitud());

      await expect(
        servicio.crearDesdePagoConfirmado(solicitud({ codigoSolicitud: 'SOL-2026-00002' })),
      ).rejects.toMatchObject({ codigo: 'CONFLICTO_SOLICITUD' });

      expect(repo.ordenes.size).toBe(1);
      expect(repo.consecutivo).toBe(1);
    });

    it('una solicitud ya procesada con OTRA transacción de pago es un conflicto', async () => {
      await servicio.crearDesdePagoConfirmado(solicitud());

      await expect(
        servicio.crearDesdePagoConfirmado(solicitud({ transaccionPagoId: 'TX-OTRA' })),
      ).rejects.toMatchObject({ codigo: 'CONFLICTO_SOLICITUD' });
    });

    it('la misma solicitud y transacción de OTRO cliente es un conflicto, nunca la orden del primero', async () => {
      await servicio.crearDesdePagoConfirmado(solicitud());

      await expect(servicio.crearDesdePagoConfirmado(solicitud({ idUsuario: 99 }))).rejects.toMatchObject({
        codigo: 'CONFLICTO_SOLICITUD',
      });
    });

    it('el mensaje del conflicto no revela datos de la otra orden', async () => {
      await servicio.crearDesdePagoConfirmado(solicitud());

      const fallo = await servicio
        .crearDesdePagoConfirmado(solicitud({ codigoSolicitud: 'SOL-2026-00002' }))
        .catch((e: unknown) => e);

      expect((fallo as Error).message).not.toMatch(/PC-2026|TX-1|SOL-2026-00001/);
    });
  });

  it('un fallo del correo no revierte la orden (D5)', async () => {
    notificaciones = {
      notificarOrdenCreada: vi.fn().mockRejectedValue(new Error('smtp caído')),
      notificarOrdenDespachada: vi.fn().mockResolvedValue(undefined),
    };
    servicio = new CreacionService(repo, notificaciones, { ahora: () => ahora });

    const resultado = await servicio.crearDesdePagoConfirmado(solicitud());

    expect(resultado.creada).toBe(true);
    expect(repo.ordenes.size).toBe(1);
  });
});
