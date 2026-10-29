import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Prisma } from '@prisma/client';
import { PostventaService } from '../services/postventa.service';
import type {
  PostventaRepositoryPort,
  SolicitudPostventaEntidad,
  SolicitudPostventaConLineas,
} from '../repositories/postventa.repository';
import type { OrdenesPortM11 } from '../interfaces/postventa.interface';
import type { AuditoriaPort } from '../../m20-seguridad/interfaces/auditoria.port';
import { ErrorPostventa } from '../services/reglas-postventa';

/** Cliente de transacción de mentira: los dobles solo comprueban que se lo pasen. */
const TX = { tx: true } as unknown as Prisma.TransactionClient;
const AHORA = new Date('2026-10-28T15:00:00Z');

describe('PostventaService (M11)', () => {
  let service: PostventaService;
  let repoMock: PostventaRepositoryPort;
  let ordenesPortMock: OrdenesPortM11;
  let auditoriaMock: AuditoriaPort;

  const ordenEjemplo = {
    idOrden: 10,
    codigoVisible: 'PC-2026-00010',
    idUsuario: 5,
    estado: 'orden_confirmada',
    fecha: new Date('2026-10-25T10:00:00Z'),
    fechaEntrega: null as Date | null,
    total: 150000,
    lineas: [
      {
        idLineaOrden: 101,
        nombreProducto: 'Viniltex Blanco',
        varianteCopia: 'Galón',
        cantidad: 2,
        precioAplicado: 75000,
        esEntonado: false,
        skuVendido: 'VIN-BLA-GAL',
        colorSolicitado: null,
      },
    ],
  };

  const solicitudRawMock = {
    idSolicitudPostventa: 1,
    codigoVisible: 'DEV-2026-00001',
    idOrden: 10,
    idUsuario: 5,
    tipo: 'cancelacion',
    estado: 'solicitada',
    motivoGeneral: 'Me equivoqué de producto al comprar',
    observacionesResolucion: null,
    motivoRechazo: null,
    totalReembolso: 150000,
    metodoReembolso: null,
    referenciaReembolso: null,
    comprobanteUrl: null,
    datosBancarios: null,
    evidenciaUrls: null,
    fechaSolicitud: new Date('2026-10-25T12:00:00Z'),
    fechaResolucion: null,
    fechaReembolso: null,
    orden: { codigoVisible: 'PC-2026-00010', estado: 'orden_confirmada' },
    usuario: { idUsuario: 5, nombre: 'Juan Pérez', correo: 'juan@example.com' },
    empleadoResuelve: null,
    lineas: [
      {
        idLineaSolicitudPostventa: 1,
        idLineaOrden: 101,
        cantidad: 2,
        precioUnitario: 75000,
        subtotal: 150000,
        motivoEspecifico: 'Me equivoqué de producto al comprar',
        lineaOrden: {
          nombreProducto: 'Viniltex Blanco',
          varianteCopia: 'Galón',
          skuVendido: 'VIN-BLA-GAL',
          colorSolicitado: null,
          esEntonado: false,
        },
      },
    ],
    historial: [
      {
        idHistorialEstadoPostventa: 1,
        estadoAnterior: null,
        estadoNuevo: 'solicitada',
        motivo: 'Solicitud radicada por el cliente',
        fecha: new Date('2026-10-25T12:00:00Z'),
        autor: { nombre: 'Juan Pérez' },
      },
    ],
  };

  beforeEach(() => {
    repoMock = {
      enTransaccion: vi.fn((trabajo: (tx: Prisma.TransactionClient) => Promise<unknown>) => trabajo(TX)),
      bloquearOrden: vi.fn().mockResolvedValue(undefined),
      cantidadesDevueltas: vi.fn().mockResolvedValue(new Map()),
      generarSiguienteCodigo: vi.fn().mockResolvedValue('DEV-2026-00001'),
      buscarPorCodigo: vi.fn().mockResolvedValue(solicitudRawMock as unknown as SolicitudPostventaEntidad),
      buscarPorOrden: vi.fn().mockResolvedValue(null),
      crearSolicitud: vi.fn().mockResolvedValue(solicitudRawMock as unknown as SolicitudPostventaEntidad),
      listarPorUsuario: vi.fn().mockResolvedValue({ items: [solicitudRawMock], total: 1 }),
      listarGestion: vi.fn().mockResolvedValue({ items: [solicitudRawMock], total: 1 }),
      contarPorEstado: vi.fn().mockResolvedValue([{ estado: 'solicitada', cantidad: 1 }]),
      actualizarResolucion: vi.fn().mockResolvedValue({
        ...solicitudRawMock,
        estado: 'aprobada',
        fechaResolucion: new Date(),
        empleadoResuelve: { idUsuario: 99, nombre: 'Admin Operaciones' },
      } as unknown as SolicitudPostventaEntidad),
      registrarReembolso: vi.fn().mockResolvedValue({
        ...solicitudRawMock,
        estado: 'reembolsada',
        metodoReembolso: 'transferencia_bancaria',
        referenciaReembolso: 'TRANS-987654',
        fechaReembolso: new Date(),
      } as unknown as SolicitudPostventaEntidad),
    } as unknown as PostventaRepositoryPort;

    ordenesPortMock = {
      obtenerOrdenParaPostventa: vi.fn().mockResolvedValue(ordenEjemplo),
      cambiarEstadoOrden: vi.fn().mockResolvedValue(undefined),
    };
    auditoriaMock = {
      registrarAccesoDenegado: vi.fn().mockResolvedValue(undefined),
      registrarAccion: vi.fn().mockResolvedValue(undefined),
    };

    service = new PostventaService(repoMock, ordenesPortMock, auditoriaMock, () => AHORA);
  });

  describe('solicitarCancelacion', () => {
    it('crea solicitud de cancelación si la orden está en orden_confirmada y pertenece al usuario', async () => {
      const res = await service.solicitarCancelacion(5, {
        codigoOrden: 'PC-2026-00010',
        motivo: 'Compré por error y necesito cancelar',
      });

      expect(res.codigo).toBe('DEV-2026-00001');
      expect(res.tipo).toBe('cancelacion');
      expect(res.totalReembolso).toBe(150000);
      expect(repoMock.crearSolicitud).toHaveBeenCalled();
    });

    it('rechaza cancelación si la orden pertenece a otro usuario (404 seguro)', async () => {
      await expect(
        service.solicitarCancelacion(999, {
          codigoOrden: 'PC-2026-00010',
          motivo: 'Compré por error y necesito cancelar',
        })
      ).rejects.toMatchObject({ codigo: 'RECURSO_NO_DISPONIBLE' });
    });

    it('rechaza cancelación si ya hay una solicitud activa para la misma orden', async () => {
      vi.mocked(repoMock.buscarPorOrden).mockResolvedValueOnce({
        codigoVisible: 'DEV-2026-00001',
      } as unknown as SolicitudPostventaConLineas);

      await expect(
        service.solicitarCancelacion(5, {
          codigoOrden: 'PC-2026-00010',
          motivo: 'Compré por error y necesito cancelar',
        })
      ).rejects.toMatchObject({ codigo: 'SOLICITUD_DUPLICADA' });
    });
  });

  describe('resolverSolicitud', () => {
    it('al aprobar cancelación, actualiza la orden asociada en M08 a estado cancelado', async () => {
      await service.resolverSolicitud(99, 'DEV-2026-00001', {
        accion: 'aprobar',
        observaciones: 'Cancelación autorizada por no estar despachada',
      });

      expect(ordenesPortMock.cambiarEstadoOrden).toHaveBeenCalledWith(
        TX,
        'PC-2026-00010',
        'cancelado',
        expect.stringContaining('DEV-2026-00001'),
        99
      );
      expect(repoMock.actualizarResolucion).toHaveBeenCalledWith(
        'DEV-2026-00001',
        expect.objectContaining({ estadoEsperado: 'solicitada', estado: 'aprobada', idEmpleadoResuelve: 99 }),
        TX
      );
      expect(auditoriaMock.registrarAccion).toHaveBeenCalledWith(
        expect.objectContaining({
          idUsuario: 99,
          accion: 'postventa.solicitud.aprobar',
          idEntidad: 'DEV-2026-00001',
          valorAnterior: 'solicitada',
          valorNuevo: 'aprobada',
        })
      );
    });

    it('si M08 ya no admite el cambio, la solicitud no se resuelve', async () => {
      vi.mocked(ordenesPortMock.cambiarEstadoOrden).mockRejectedValueOnce(
        new ErrorPostventa('ORDEN_NO_ELEGIBLE', 'El pedido ya está despachado', 409)
      );

      await expect(
        service.resolverSolicitud(99, 'DEV-2026-00001', { accion: 'aprobar' })
      ).rejects.toMatchObject({ codigo: 'ORDEN_NO_ELEGIBLE' });
      expect(repoMock.actualizarResolucion).not.toHaveBeenCalled();
      expect(auditoriaMock.registrarAccion).not.toHaveBeenCalled();
    });

    it('si otra persona la resolvió antes, responde ESTADO_CAMBIADO', async () => {
      vi.mocked(repoMock.actualizarResolucion).mockResolvedValueOnce(null);

      await expect(
        service.resolverSolicitud(99, 'DEV-2026-00001', { accion: 'aprobar' })
      ).rejects.toMatchObject({ codigo: 'ESTADO_CAMBIADO', statusCode: 409 });
    });

    it('marca el pedido como devuelto cuando, sumando devoluciones anteriores, se devuelve todo', async () => {
      const devolucion = {
        ...solicitudRawMock,
        tipo: 'devolucion',
        lineas: [{ ...solicitudRawMock.lineas[0], cantidad: 1, subtotal: 75000 }],
      } as unknown as SolicitudPostventaEntidad;
      vi.mocked(repoMock.buscarPorCodigo).mockResolvedValue(devolucion);

      await service.resolverSolicitud(99, 'DEV-2026-00001', { accion: 'aprobar' });
      expect(ordenesPortMock.cambiarEstadoOrden).not.toHaveBeenCalled();

      vi.mocked(repoMock.cantidadesDevueltas).mockResolvedValueOnce(new Map([[101, 1]]));
      await service.resolverSolicitud(99, 'DEV-2026-00001', { accion: 'aprobar' });
      expect(ordenesPortMock.cambiarEstadoOrden).toHaveBeenCalledWith(
        TX,
        'PC-2026-00010',
        'devuelto',
        expect.stringContaining('Devolución total'),
        99
      );
    });

    it('al rechazar, exige observaciones y actualiza a estado rechazada', async () => {
      await service.resolverSolicitud(99, 'DEV-2026-00001', {
        accion: 'rechazar',
        motivoRechazo: 'politica_no_cumplida',
        observaciones: 'El pedido ya fue cargado al camión',
      });

      expect(repoMock.actualizarResolucion).toHaveBeenCalledWith(
        'DEV-2026-00001',
        expect.objectContaining({
          estado: 'rechazada',
          motivoRechazo: 'politica_no_cumplida',
        }),
        TX
      );
      expect(ordenesPortMock.cambiarEstadoOrden).not.toHaveBeenCalled();
    });
  });

  describe('registrarReembolso', () => {
    it('registra el reembolso exitosamente para una solicitud aprobada', async () => {
      vi.mocked(repoMock.buscarPorCodigo).mockResolvedValueOnce({
        ...solicitudRawMock,
        estado: 'aprobada',
      } as unknown as SolicitudPostventaEntidad);

      const res = await service.registrarReembolso(99, 'DEV-2026-00001', {
        metodo: 'transferencia_bancaria',
        montoReembolsado: 150000,
        referenciaTransaccion: 'TRANS-987654',
      });

      expect(res.estado).toBe('reembolsada');
      expect(repoMock.registrarReembolso).toHaveBeenCalled();
    });

    it('rechaza un monto mayor al total de la solicitud', async () => {
      vi.mocked(repoMock.buscarPorCodigo).mockResolvedValueOnce({
        ...solicitudRawMock,
        estado: 'aprobada',
      } as unknown as SolicitudPostventaEntidad);

      await expect(
        service.registrarReembolso(99, 'DEV-2026-00001', {
          metodo: 'efectivo',
          montoReembolsado: 150001,
          referenciaTransaccion: 'CAJA-1',
        })
      ).rejects.toMatchObject({ codigo: 'PARAMETRO_INVALIDO' });
      expect(repoMock.registrarReembolso).not.toHaveBeenCalled();
    });

    it('rechaza registrar reembolso si la solicitud aún está en estado solicitada', async () => {
      await expect(
        service.registrarReembolso(99, 'DEV-2026-00001', {
          metodo: 'transferencia_bancaria',
          montoReembolsado: 150000,
          referenciaTransaccion: 'TRANS-987654',
        })
      ).rejects.toMatchObject({ codigo: 'TRANSICION_NO_PERMITIDA' });
    });
  });

  describe('solicitarDevolucion · plazo desde la entrega (RN-POS-02)', () => {
    const entrada = {
      codigoOrden: 'PC-2026-00010',
      tipo: 'devolucion' as const,
      motivoGeneral: 'El color no era el que esperaba',
      lineas: [{ idLineaOrden: 101, cantidad: 1 }],
    };

    it('cuenta los 5 días hábiles desde la entrega, no desde la compra', async () => {
      vi.mocked(ordenesPortMock.obtenerOrdenParaPostventa).mockResolvedValue({
        ...ordenEjemplo,
        estado: 'entregado',
        fecha: new Date('2026-09-01T10:00:00Z'),
        fechaEntrega: new Date('2026-10-26T10:00:00Z'),
      });

      await service.solicitarDevolucion(5, entrada);
      expect(repoMock.bloquearOrden).toHaveBeenCalledWith(10, TX);
      expect(repoMock.crearSolicitud).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'devolucion', totalReembolso: 75000 }),
        TX
      );
    });

    it('vence a los 5 días hábiles de la entrega', async () => {
      vi.mocked(ordenesPortMock.obtenerOrdenParaPostventa).mockResolvedValue({
        ...ordenEjemplo,
        estado: 'entregado',
        fechaEntrega: new Date('2026-10-01T10:00:00Z'),
      });

      await expect(service.solicitarDevolucion(5, entrada)).rejects.toMatchObject({ codigo: 'PLAZO_VENCIDO' });
      expect(repoMock.crearSolicitud).not.toHaveBeenCalled();
    });

    it('no deja devolver unidades que ya se devolvieron', async () => {
      vi.mocked(ordenesPortMock.obtenerOrdenParaPostventa).mockResolvedValue({
        ...ordenEjemplo,
        estado: 'entregado',
        fechaEntrega: new Date('2026-10-27T10:00:00Z'),
      });
      vi.mocked(repoMock.cantidadesDevueltas).mockResolvedValueOnce(new Map([[101, 2]]));

      await expect(service.solicitarDevolucion(5, entrada)).rejects.toMatchObject({ codigo: 'PARAMETRO_INVALIDO' });
    });
  });
});
