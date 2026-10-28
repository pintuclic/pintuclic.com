import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PostventaService } from '../services/postventa.service';
import type {
  PostventaRepositoryPort,
  SolicitudPostventaEntidad,
  SolicitudPostventaConLineas,
} from '../repositories/postventa.repository';
import type { OrdenesPortM11 } from '../interfaces/postventa.interface';

describe('PostventaService (M11)', () => {
  let service: PostventaService;
  let repoMock: PostventaRepositoryPort;
  let ordenesPortMock: OrdenesPortM11;

  const ordenEjemplo = {
    idOrden: 10,
    codigoVisible: 'PC-2026-00010',
    idUsuario: 5,
    estado: 'orden_confirmada',
    fecha: new Date('2026-10-25T10:00:00Z'),
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
      actualizarEstadoOrden: vi.fn().mockResolvedValue(undefined),
    };

    service = new PostventaService(repoMock, ordenesPortMock);
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

      expect(ordenesPortMock.actualizarEstadoOrden).toHaveBeenCalledWith(
        'PC-2026-00010',
        'orden_confirmada',
        'cancelado',
        expect.stringContaining('DEV-2026-00001'),
        99
      );
      expect(repoMock.actualizarResolucion).toHaveBeenCalledWith(
        'DEV-2026-00001',
        expect.objectContaining({ estado: 'aprobada', idEmpleadoResuelve: 99 })
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
        })
      );
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
});
