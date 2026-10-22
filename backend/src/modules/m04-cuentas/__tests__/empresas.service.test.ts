import { describe, expect, it, vi, beforeEach } from 'vitest';
import type {
  CuentaEmpresa,
  DocumentoSoporte,
  SolicitudActualizacionNit,
  SolicitudEmpresa,
  Usuario,
} from '@prisma/client';
import type { CuentasRepository } from '../repositories/cuentas.repository';
import type { SolicitudesEmpresaRepository } from '../repositories/solicitudes-empresa.repository';
import type { AlmacenDocumentosPort } from '../interfaces/almacen-documentos.port';
import type { NotificacionesPort } from '../interfaces/notificaciones.port';
import { EmpresasError, EmpresasService } from '../services/empresas.service';

describe('EmpresasService (HU-CUE-03, HU-CUE-06, HU-CUE-09, HU-CUE-10)', () => {
  let cuentasRepo: CuentasRepository;
  let solicitudesRepo: SolicitudesEmpresaRepository;
  let almacenDocumentos: AlmacenDocumentosPort;
  let notificaciones: NotificacionesPort;
  let service: EmpresasService;

  const fechaBase = new Date('2026-10-21T12:00:00Z');

  beforeEach(() => {
    cuentasRepo = {
      buscarPorCorreo: vi.fn().mockResolvedValue(null),
      buscarPorId: vi.fn().mockResolvedValue(null),
      buscarConEmpresaPorId: vi.fn().mockResolvedValue(null),
      crearUsuarioCliente: vi.fn().mockImplementation((datos) =>
        Promise.resolve({
          idUsuario: 33,
          nombre: datos.nombre,
          correo: datos.correo,
          contrasena: datos.contrasenaHash,
          telefono: datos.telefono ?? null,
          tipo: 'empresa',
          estado: 'pendiente',
          idRol: null,
          cambioContrasenaPendiente: false,
          fechaCreacion: fechaBase,
          fechaActualizacion: fechaBase,
        } as Usuario)
      ),
      actualizarDatosPerfil: vi.fn(),
      actualizarContrasena: vi.fn(),
      actualizarCorreo: vi.fn(),
      actualizarEstado: vi.fn().mockResolvedValue({} as Usuario),
      desactivarCuenta: vi.fn(),
      buscarIdentidadExterna: vi.fn(),
      vincularIdentidadExterna: vi.fn(),
      buscarCuentaEmpresaPorNit: vi.fn().mockResolvedValue(null),
      buscarCuentaEmpresaPorIdUsuario: vi.fn().mockResolvedValue(null),
      crearCuentaEmpresa: vi.fn().mockImplementation((datos) =>
        Promise.resolve({
          idUsuario: datos.idUsuario,
          nit: datos.nit,
          nombreEmpresa: datos.nombreEmpresa,
          nombreRepresentante: datos.nombreRepresentante,
          correoEmpresarial: datos.correoEmpresarial,
          telefono: datos.telefono,
          idSolicitudOrigen: datos.idSolicitudOrigen ?? null,
          fechaAprobacion: fechaBase,
          fechaActualizacion: fechaBase,
        } as CuentaEmpresa)
      ),
      actualizarNitEmpresa: vi.fn().mockImplementation((idUsuario, nitNuevo) =>
        Promise.resolve({
          idUsuario,
          nit: nitNuevo,
          nombreEmpresa: 'Empresa Renovada',
          nombreRepresentante: 'Rep',
          correoEmpresarial: 'empresa@pintuclic.com',
          telefono: '3001234567',
          idSolicitudOrigen: null,
          fechaAprobacion: fechaBase,
          fechaActualizacion: fechaBase,
        } as CuentaEmpresa)
      ),
    };

    solicitudesRepo = {
      crearSolicitud: vi.fn().mockImplementation((datos) =>
        Promise.resolve({
          idSolicitud: 'solicitud-uuid-1',
          idUsuario: datos.idUsuario,
          nombreEmpresa: datos.nombreEmpresa,
          nombreRepresentante: datos.nombreRepresentante,
          correoEmpresarial: datos.correoEmpresarial,
          telefono: datos.telefono,
          nit: datos.nit,
          tipoSolicitud: datos.tipoSolicitud,
          estado: 'pendiente',
          motivoRechazo: null,
          idAdminRevisor: null,
          fechaSolicitud: fechaBase,
          fechaRevision: null,
        } as SolicitudEmpresa)
      ),
      buscarPorId: vi.fn().mockResolvedValue(null),
      buscarPendientePorNit: vi.fn().mockResolvedValue(null),
      buscarPendientePorUsuario: vi.fn().mockResolvedValue(null),
      listar: vi.fn().mockResolvedValue({ solicitudes: [], total: 0 }),
      dictaminar: vi.fn().mockImplementation((idSolicitud, datos) =>
        Promise.resolve({
          idSolicitud,
          idUsuario: 33,
          nombreEmpresa: 'Pinturas del Valle S.A.S.',
          nombreRepresentante: 'Carlos Mario',
          correoEmpresarial: 'contacto@valle.com',
          telefono: '3151234567',
          nit: '901234567-1',
          tipoSolicitud: 'registro',
          estado: datos.estado,
          motivoRechazo: datos.motivoRechazo ?? null,
          idAdminRevisor: datos.idAdminRevisor,
          fechaSolicitud: fechaBase,
          fechaRevision: datos.fechaRevision,
        } as SolicitudEmpresa)
      ),
      crearSolicitudRenovacionNit: vi.fn().mockImplementation((datos) =>
        Promise.resolve({
          idSolicitud: 'renovacion-uuid-1',
          idUsuario: datos.idUsuario,
          nitAnterior: datos.nitAnterior,
          nitNuevo: datos.nitNuevo,
          idDocumento: datos.idDocumento,
          estado: 'pendiente',
          motivoRechazo: null,
          idAdminRevisor: null,
          fechaSolicitud: fechaBase,
          fechaRevision: null,
        } as SolicitudActualizacionNit)
      ),
      buscarRenovacionPorId: vi.fn().mockResolvedValue(null),
      buscarRenovacionPendientePorUsuario: vi.fn().mockResolvedValue(null),
      buscarRenovacionPendientePorNit: vi.fn().mockResolvedValue(null),
      listarRenovaciones: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      dictaminarRenovacionNit: vi.fn().mockImplementation((idSolicitud, datos) =>
        Promise.resolve({
          idSolicitud,
          idUsuario: 33,
          nitAnterior: '900111222-3',
          nitNuevo: '900999888-7',
          idDocumento: 'doc-uuid-1',
          estado: datos.estado,
          motivoRechazo: datos.motivoRechazo ?? null,
          idAdminRevisor: datos.idAdminRevisor,
          fechaSolicitud: fechaBase,
          fechaRevision: datos.fechaRevision,
        } as SolicitudActualizacionNit)
      ),
    };

    almacenDocumentos = {
      guardarDocumento: vi.fn().mockResolvedValue({
        idDocumento: 'doc-uuid-1',
        nombreOriginal: 'RUT_2026.pdf',
        tipoMime: 'application/pdf',
        tamanoBytes: 1024,
        sha256: 'a'.repeat(64),
        fechaCarga: fechaBase,
      } as DocumentoSoporte),
      obtenerMetadatos: vi.fn().mockResolvedValue(null),
      obtenerDocumentoCompleto: vi.fn().mockResolvedValue(null),
    };

    notificaciones = {
      enviarCodigoRegistro: vi.fn(),
      enviarCodigoCambioCorreo: vi.fn(),
      enviarEnlaceRecuperacion: vi.fn(),
      notificarDictamenEmpresa: vi.fn().mockResolvedValue(undefined),
    };

    service = new EmpresasService(
      cuentasRepo,
      solicitudesRepo,
      almacenDocumentos,
      notificaciones,
    );
  });

  describe('HU-CUE-03: Registro B2B directo', () => {
    it('registra empresa en estado pendiente y custodia archivo RUT si viene adjunto', async () => {
      const res = await service.registrarEmpresa(
        {
          nombreEmpresa: 'Pinturas del Valle S.A.S.',
          nit: '901234567-1',
          nombreRepresentante: 'Carlos Mario',
          correoEmpresarial: 'contacto@valle.com',
          telefono: '3151234567',
          contrasena: 'ClaveCorporativa123!',
        },
        {
          buffer: Buffer.from('fake pdf content'),
          mimeType: 'application/pdf',
          originalname: 'RUT_Valle.pdf',
        }
      );

      expect(res.idSolicitud).toBe('solicitud-uuid-1');
      expect(cuentasRepo.crearUsuarioCliente).toHaveBeenCalledWith(
        expect.objectContaining({
          estado: 'pendiente',
          tipo: 'empresa',
        })
      );
      expect(almacenDocumentos.guardarDocumento).toHaveBeenCalled();
      expect(solicitudesRepo.crearSolicitud).toHaveBeenCalledWith(
        expect.objectContaining({
          tipoSolicitud: 'registro',
        })
      );
    });

    it('rechaza si el NIT ya pertenece a una cuenta activa o tiene solicitud pendiente', async () => {
      vi.mocked(cuentasRepo.buscarCuentaEmpresaPorNit).mockResolvedValueOnce({
        nit: '901234567-1',
      } as CuentaEmpresa);

      await expect(
        service.registrarEmpresa({
          nombreEmpresa: 'Pinturas del Valle S.A.S.',
          nit: '901234567-1',
          nombreRepresentante: 'Carlos Mario',
          correoEmpresarial: 'contacto@valle.com',
          telefono: '3151234567',
          contrasena: 'ClaveCorporativa123!',
        })
      ).rejects.toThrow(EmpresasError);
    });
  });

  describe('HU-CUE-06: Ascenso a cuenta empresa', () => {
    it('permite a un usuario cliente B2C solicitar ascenso a empresa', async () => {
      vi.mocked(cuentasRepo.buscarPorId).mockResolvedValueOnce({
        idUsuario: 12,
        tipo: 'normal',
      } as Usuario);

      const res = await service.solicitarAscensoEmpresa(12, {
        nombreEmpresa: 'Ferretería El Tornillo',
        nit: '800555444-1',
        nombreRepresentante: 'Pedro Gomez',
        correoEmpresarial: 'pedro@tornillo.com',
        telefono: '3105556677',
      });

      expect(res.idSolicitud).toBe('solicitud-uuid-1');
      expect(solicitudesRepo.crearSolicitud).toHaveBeenCalledWith(
        expect.objectContaining({
          idUsuario: 12,
          tipoSolicitud: 'ascenso_particular',
        })
      );
    });

    it('rechaza solicitud de ascenso si el usuario ya es de tipo empresa', async () => {
      vi.mocked(cuentasRepo.buscarPorId).mockResolvedValueOnce({
        idUsuario: 12,
        tipo: 'empresa',
      } as Usuario);

      await expect(
        service.solicitarAscensoEmpresa(12, {
          nombreEmpresa: 'Ferretería El Tornillo',
          nit: '800555444-1',
          nombreRepresentante: 'Pedro Gomez',
          correoEmpresarial: 'pedro@tornillo.com',
          telefono: '3105556677',
        })
      ).rejects.toThrow(EmpresasError);
    });
  });

  describe('HU-CUE-09: Dictamen administrativo de solicitudes corporativas', () => {
    it('aprueba solicitud, activa cuenta y crea registro 1:1 en cuenta_empresa (ADR-010)', async () => {
      vi.mocked(solicitudesRepo.buscarPorId).mockResolvedValueOnce({
        idSolicitud: 'solicitud-uuid-1',
        idUsuario: 33,
        nombreEmpresa: 'Pinturas del Valle S.A.S.',
        nombreRepresentante: 'Carlos Mario',
        correoEmpresarial: 'contacto@valle.com',
        telefono: '3151234567',
        nit: '901234567-1',
        estado: 'pendiente',
      } as SolicitudEmpresa);

      const res = await service.dictaminarSolicitud('solicitud-uuid-1', 1, {
        decision: 'aprobar',
      });

      expect(res.mensaje).toContain('aprobada y cuenta activada');
      expect(cuentasRepo.actualizarEstado).toHaveBeenCalledWith(33, 'activo');
      expect(cuentasRepo.crearCuentaEmpresa).toHaveBeenCalledWith(
        expect.objectContaining({
          idUsuario: 33,
          nit: '901234567-1',
        })
      );
      expect(notificaciones.notificarDictamenEmpresa).toHaveBeenCalledWith(
        'contacto@valle.com',
        'aprobada',
      );
    });

    it('rechaza solicitud y notifica motivo al usuario', async () => {
      vi.mocked(solicitudesRepo.buscarPorId).mockResolvedValueOnce({
        idSolicitud: 'solicitud-uuid-1',
        idUsuario: 33,
        correoEmpresarial: 'contacto@valle.com',
        estado: 'pendiente',
      } as SolicitudEmpresa);

      const res = await service.dictaminarSolicitud('solicitud-uuid-1', 1, {
        decision: 'rechazar',
        motivoRechazo: 'RUT ilegible o desactualizado por la DIAN.',
      });

      expect(res.mensaje).toContain('rechazada exitosamente');
      expect(cuentasRepo.crearCuentaEmpresa).not.toHaveBeenCalled();
      expect(notificaciones.notificarDictamenEmpresa).toHaveBeenCalledWith(
        'contacto@valle.com',
        'rechazada',
        'RUT ilegible o desactualizado por la DIAN.',
      );
    });
  });

  describe('HU-CUE-10: Renovación de NIT corporativo', () => {
    it('radica solicitud de renovación de NIT con soporte RUT', async () => {
      vi.mocked(cuentasRepo.buscarCuentaEmpresaPorIdUsuario).mockResolvedValueOnce({
        idUsuario: 33,
        nit: '900111222-3',
      } as CuentaEmpresa);

      const res = await service.solicitarRenovacionNit(33, {
        nitNuevo: '900999888-7',
        nombreOriginal: 'RUT_Actualizado.pdf',
        tipoMime: 'application/pdf',
        tamanoBytes: 2048,
        sha256: 'b'.repeat(64),
        contenidoBase64: Buffer.from('dummy-rut-data').toString('base64'),
      });

      expect(res.idSolicitud).toBe('renovacion-uuid-1');
      expect(almacenDocumentos.guardarDocumento).toHaveBeenCalled();
      expect(solicitudesRepo.crearSolicitudRenovacionNit).toHaveBeenCalledWith(
        expect.objectContaining({
          idUsuario: 33,
          nitAnterior: '900111222-3',
          nitNuevo: '900999888-7',
        })
      );
    });

    it('dictamina y actualiza el NIT vigente en cuenta_empresa tras aprobación', async () => {
      vi.mocked(solicitudesRepo.buscarRenovacionPorId).mockResolvedValueOnce({
        idSolicitud: 'renovacion-uuid-1',
        idUsuario: 33,
        nitNuevo: '900999888-7',
        estado: 'pendiente',
      } as SolicitudActualizacionNit);

      const res = await service.dictaminarRenovacionNit('renovacion-uuid-1', 1, {
        decision: 'aprobar',
      });

      expect(res.mensaje).toContain('aprobada exitosamente');
      expect(cuentasRepo.actualizarNitEmpresa).toHaveBeenCalledWith(33, '900999888-7');
    });
  });
});
