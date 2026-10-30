import { createHash } from 'node:crypto';
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
import type { TiposClientePort } from '../interfaces/tipos-cliente.port';
import type { EntidadDocumentoSoporte } from '../interfaces/cuentas.interfaces';
import type { NotificacionesPort } from '../../m18-notificaciones/interfaces/notificaciones.port';
import { EmpresasError, EmpresasService } from '../services/empresas.service';

describe('EmpresasService (HU-CUE-03, HU-CUE-06, HU-CUE-09, HU-CUE-10)', () => {
  let cuentasRepo: CuentasRepository;
  let solicitudesRepo: SolicitudesEmpresaRepository;
  let almacenDocumentos: AlmacenDocumentosPort;
  let notificaciones: NotificacionesPort;
  let tiposCliente: TiposClientePort;
  let service: EmpresasService;

  const fechaBase = new Date('2026-10-21T12:00:00Z');

  const solicitudPendiente = (extra: Partial<SolicitudEmpresa> = {}): SolicitudEmpresa =>
    ({
      idSolicitud: 'solicitud-uuid-1',
      idUsuario: 33,
      nombreEmpresa: 'Pinturas del Valle S.A.S.',
      nombreRepresentante: 'Carlos Mario',
      correoEmpresarial: 'contacto@valle.com',
      telefono: '3151234567',
      nit: '901234567-1',
      tipoSolicitud: 'registro',
      estado: 'pendiente',
      motivoRechazo: null,
      idAdminRevisor: null,
      fechaSolicitud: fechaBase,
      fechaRevision: null,
      ...extra,
    }) as SolicitudEmpresa;

  const renovacionPendiente = (extra: Partial<SolicitudActualizacionNit> = {}): SolicitudActualizacionNit =>
    ({
      idSolicitud: 'renovacion-uuid-1',
      idUsuario: 33,
      nitAnterior: '900111222-3',
      nitNuevo: '900999888-7',
      idDocumento: 'doc-uuid-1',
      estado: 'pendiente',
      motivoRechazo: null,
      idAdminRevisor: null,
      fechaSolicitud: fechaBase,
      fechaRevision: null,
      ...extra,
    }) as SolicitudActualizacionNit;

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
          tipo: datos.tipo ?? 'normal',
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
      listarCuentasEmpresa: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      buscarCuentaEmpresaConTipo: vi.fn().mockResolvedValue(null),
      asignarTipoCuentaEmpresa: vi.fn().mockResolvedValue(true),
    };

    solicitudesRepo = {
      crearSolicitud: vi.fn().mockImplementation((datos) =>
        Promise.resolve(
          solicitudPendiente({
            idUsuario: datos.idUsuario,
            nombreEmpresa: datos.nombreEmpresa,
            nit: datos.nit,
            tipoSolicitud: datos.tipoSolicitud,
          })
        )
      ),
      buscarPorId: vi.fn().mockResolvedValue(null),
      buscarPendientePorNit: vi.fn().mockResolvedValue(null),
      buscarPendientePorUsuario: vi.fn().mockResolvedValue(null),
      buscarUltimaPorUsuario: vi.fn().mockResolvedValue(null),
      listar: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      decidirSolicitud: vi.fn().mockImplementation((idSolicitud, datos) =>
        Promise.resolve({
          resultado: 'decidida',
          solicitud: solicitudPendiente({
            idSolicitud,
            estado: datos.estado,
            motivoRechazo: datos.motivoRechazo ?? null,
            idAdminRevisor: datos.idAdminRevisor,
            fechaRevision: datos.fechaRevision,
          }),
        })
      ),
      crearSolicitudRenovacionNit: vi.fn().mockImplementation((datos) =>
        Promise.resolve(
          renovacionPendiente({
            idUsuario: datos.idUsuario,
            nitAnterior: datos.nitAnterior,
            nitNuevo: datos.nitNuevo,
            idDocumento: datos.idDocumento,
          })
        )
      ),
      buscarRenovacionPorId: vi.fn().mockResolvedValue(null),
      buscarRenovacionPendientePorUsuario: vi.fn().mockResolvedValue(null),
      buscarRenovacionPendientePorNit: vi.fn().mockResolvedValue(null),
      buscarUltimaRenovacionPorUsuario: vi.fn().mockResolvedValue(null),
      listarRenovaciones: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      decidirRenovacionNit: vi.fn().mockImplementation((idSolicitud, datos) =>
        Promise.resolve({
          resultado: 'decidida',
          solicitud: renovacionPendiente({
            idSolicitud,
            estado: datos.estado,
            motivoRechazo: datos.motivoRechazo ?? null,
            idAdminRevisor: datos.idAdminRevisor,
            fechaRevision: datos.fechaRevision,
          }),
        })
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
      enviarEnlaceActivacion: vi.fn(),
      notificarDictamenEmpresa: vi.fn().mockResolvedValue(undefined),
      notificarSolicitudEmpresaRecibida: vi.fn().mockResolvedValue(undefined),
      notificarRenovacionNitRecibida: vi.fn().mockResolvedValue(undefined),
    };

    tiposCliente = {
      listarActivos: vi.fn().mockResolvedValue([
        { idSubRolEmpresa: 1, nombre: 'Proveedor', porcentaje: 15, montoMinimoCompra: 0 },
        { idSubRolEmpresa: 2, nombre: 'Constructora', porcentaje: 10, montoMinimoCompra: 300000 },
      ]),
      existeActivo: vi.fn().mockImplementation((id: number) => Promise.resolve(id === 1 || id === 2)),
    };

    service = new EmpresasService(
      cuentasRepo,
      solicitudesRepo,
      almacenDocumentos,
      notificaciones,
      tiposCliente,
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
      expect(almacenDocumentos.guardarDocumento).toHaveBeenCalled();
      expect(solicitudesRepo.crearSolicitud).toHaveBeenCalledWith(
        expect.objectContaining({
          tipoSolicitud: 'registro',
        })
      );
    });

    it('la cuenta nace pendiente y de tipo normal: sin condiciones de empresa hasta la aprobación (RN-CUE-15, CA-CUE-03-02)', async () => {
      await service.registrarEmpresa({
        nombreEmpresa: 'Pinturas del Valle S.A.S.',
        nit: '901234567-1',
        nombreRepresentante: 'Carlos Mario',
        correoEmpresarial: 'contacto@valle.com',
        telefono: '3151234567',
        contrasena: 'ClaveCorporativa123!',
      });

      expect(cuentasRepo.crearUsuarioCliente).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'pendiente', tipo: 'normal' })
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

  describe('M18 · acuse de recibo de las solicitudes de empresa', () => {
    it('el registro de empresa avisa al correo empresarial y un fallo del correo no lo deshace', async () => {
      vi.mocked(notificaciones.notificarSolicitudEmpresaRecibida!).mockRejectedValueOnce(new Error('SMTP caído'));
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      const res = await service.registrarEmpresa({
        nombreEmpresa: 'Pinturas del Valle S.A.S.',
        nit: '901234567-1',
        nombreRepresentante: 'Carlos Mario',
        correoEmpresarial: 'contacto@valle.com',
        telefono: '3151234567',
        contrasena: 'ClaveCorporativa123!',
      });

      expect(res.idSolicitud).toBe('solicitud-uuid-1');
      expect(notificaciones.notificarSolicitudEmpresaRecibida).toHaveBeenCalledWith('contacto@valle.com', { nombre: 'Pinturas del Valle S.A.S.' });
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
    it('aprueba la solicitud mediante la operación atómica y notifica a la empresa', async () => {
      vi.mocked(solicitudesRepo.buscarPorId).mockResolvedValueOnce(solicitudPendiente());

      const res = await service.dictaminarSolicitud('solicitud-uuid-1', 1, {
        decision: 'aprobar',
        idSubRolEmpresa: 1,
      });

      expect(res.mensaje).toContain('aprobada y cuenta activada');
      expect(solicitudesRepo.decidirSolicitud).toHaveBeenCalledWith(
        'solicitud-uuid-1',
        expect.objectContaining({ estado: 'aprobada', idAdminRevisor: 1, idSubRolEmpresa: 1 })
      );
      // Activación, tipo y cuenta_empresa viven en la transacción del repositorio:
      // el servicio ya no las orquesta con escrituras sueltas.
      expect(cuentasRepo.actualizarEstado).not.toHaveBeenCalled();
      expect(notificaciones.notificarDictamenEmpresa).toHaveBeenCalledWith(
        'contacto@valle.com',
        'aprobada',
      );
    });

    it('aprobar EXIGE el tipo de cliente empresa y no decide nada sin él (M06 · D8)', async () => {
      vi.mocked(solicitudesRepo.buscarPorId).mockResolvedValueOnce(solicitudPendiente());

      await expect(service.dictaminarSolicitud('solicitud-uuid-1', 1, { decision: 'aprobar' })).rejects.toMatchObject({
        codigo: 'DATOS_INVALIDOS',
        statusCode: 400,
      });
      expect(solicitudesRepo.decidirSolicitud).not.toHaveBeenCalled();
      expect(notificaciones.notificarDictamenEmpresa).not.toHaveBeenCalled();
    });

    it('un tipo inexistente o desactivado responde 400 TIPO_CLIENTE_INVALIDO y la solicitud sigue pendiente', async () => {
      vi.mocked(solicitudesRepo.buscarPorId).mockResolvedValueOnce(solicitudPendiente());

      await expect(
        service.dictaminarSolicitud('solicitud-uuid-1', 1, { decision: 'aprobar', idSubRolEmpresa: 99 })
      ).rejects.toMatchObject({ codigo: 'TIPO_CLIENTE_INVALIDO', statusCode: 400 });
      expect(tiposCliente.existeActivo).toHaveBeenCalledWith(99);
      expect(solicitudesRepo.decidirSolicitud).not.toHaveBeenCalled();
    });

    it('un ascenso de cuenta personal también se aprueba con tipo', async () => {
      vi.mocked(solicitudesRepo.buscarPorId).mockResolvedValueOnce(solicitudPendiente({ tipoSolicitud: 'ascenso_particular' }));

      await service.dictaminarSolicitud('solicitud-uuid-1', 1, { decision: 'aprobar', idSubRolEmpresa: 2 });

      expect(solicitudesRepo.decidirSolicitud).toHaveBeenCalledWith(
        'solicitud-uuid-1',
        expect.objectContaining({ estado: 'aprobada', idSubRolEmpresa: 2 })
      );
    });

    it('rechazar no pide ni guarda tipo', async () => {
      vi.mocked(solicitudesRepo.buscarPorId).mockResolvedValueOnce(solicitudPendiente());

      await service.dictaminarSolicitud('solicitud-uuid-1', 1, {
        decision: 'rechazar',
        motivoRechazo: 'RUT ilegible o desactualizado por la DIAN.',
        idSubRolEmpresa: 1,
      });

      expect(tiposCliente.existeActivo).not.toHaveBeenCalled();
      expect(solicitudesRepo.decidirSolicitud).toHaveBeenCalledWith(
        'solicitud-uuid-1',
        expect.objectContaining({ estado: 'rechazada', idSubRolEmpresa: null })
      );
    });

    it('rechaza solicitud y notifica motivo al usuario', async () => {
      vi.mocked(solicitudesRepo.buscarPorId).mockResolvedValueOnce(solicitudPendiente());

      const res = await service.dictaminarSolicitud('solicitud-uuid-1', 1, {
        decision: 'rechazar',
        motivoRechazo: 'RUT ilegible o desactualizado por la DIAN.',
      });

      expect(res.mensaje).toContain('rechazada exitosamente');
      expect(notificaciones.notificarDictamenEmpresa).toHaveBeenCalledWith(
        'contacto@valle.com',
        'rechazada',
        'RUT ilegible o desactualizado por la DIAN.',
      );
    });

    it('exige motivo al rechazar un REGISTRO de empresa (RN-CUE-17, CA-CUE-09-03)', async () => {
      vi.mocked(solicitudesRepo.buscarPorId).mockResolvedValueOnce(
        solicitudPendiente({ tipoSolicitud: 'registro' })
      );

      await expect(
        service.dictaminarSolicitud('solicitud-uuid-1', 1, { decision: 'rechazar' })
      ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });

      expect(solicitudesRepo.decidirSolicitud).not.toHaveBeenCalled();
    });

    it('permite rechazar un ASCENSO sin motivo (RN-CUE-17, CA-CUE-09-08)', async () => {
      vi.mocked(solicitudesRepo.buscarPorId).mockResolvedValueOnce(
        solicitudPendiente({ tipoSolicitud: 'ascenso_particular' })
      );

      const res = await service.dictaminarSolicitud('solicitud-uuid-1', 1, { decision: 'rechazar' });

      expect(res.mensaje).toContain('rechazada exitosamente');
      expect(notificaciones.notificarDictamenEmpresa).toHaveBeenCalledWith(
        'contacto@valle.com',
        'rechazada',
        undefined,
      );
    });

    it('un motivo de menos de 10 caracteres tampoco basta para rechazar un REGISTRO', async () => {
      vi.mocked(solicitudesRepo.buscarPorId).mockResolvedValueOnce(
        solicitudPendiente({ tipoSolicitud: 'registro' })
      );

      await expect(
        service.dictaminarSolicitud('solicitud-uuid-1', 1, { decision: 'rechazar', motivoRechazo: 'corto' })
      ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS', statusCode: 400 });

      expect(solicitudesRepo.decidirSolicitud).not.toHaveBeenCalled();
    });

    it('un motivo vacío o de solo espacios en un ASCENSO se guarda como "sin motivo", no como cadena vacía', async () => {
      vi.mocked(solicitudesRepo.buscarPorId).mockResolvedValueOnce(
        solicitudPendiente({ tipoSolicitud: 'ascenso_particular' })
      );

      await service.dictaminarSolicitud('solicitud-uuid-1', 1, { decision: 'rechazar', motivoRechazo: '   ' });

      expect(solicitudesRepo.decidirSolicitud).toHaveBeenCalledWith(
        'solicitud-uuid-1',
        expect.objectContaining({ estado: 'rechazada', motivoRechazo: null })
      );
    });

    it('una solicitud ya decidida responde 409 SOLICITUD_YA_DECIDIDA sin tocar nada (CA-CUE-09-04)', async () => {
      vi.mocked(solicitudesRepo.buscarPorId).mockResolvedValueOnce(
        solicitudPendiente({ estado: 'aprobada' })
      );

      await expect(
        service.dictaminarSolicitud('solicitud-uuid-1', 1, { decision: 'rechazar', motivoRechazo: 'Ya no aplica' })
      ).rejects.toMatchObject({ codigo: 'RECURSO_NO_ENCONTRADO', statusCode: 409 });

      expect(solicitudesRepo.decidirSolicitud).not.toHaveBeenCalled();
      expect(notificaciones.notificarDictamenEmpresa).not.toHaveBeenCalled();
    });

    it('si otro administrador gana la carrera, este recibe 409 y no genera notificación (RNF-CUE-09-01)', async () => {
      vi.mocked(solicitudesRepo.buscarPorId).mockResolvedValueOnce(solicitudPendiente());
      vi.mocked(solicitudesRepo.decidirSolicitud).mockResolvedValueOnce({ resultado: 'ya_decidida' });

      await expect(
        service.dictaminarSolicitud('solicitud-uuid-1', 1, { decision: 'aprobar', idSubRolEmpresa: 1 })
      ).rejects.toMatchObject({ codigo: 'RECURSO_NO_ENCONTRADO', statusCode: 409 });

      expect(notificaciones.notificarDictamenEmpresa).not.toHaveBeenCalled();
    });

    it('si el NIT pasó a otra cuenta mientras esperaba, responde 409 NIT_YA_REGISTRADO y no notifica', async () => {
      vi.mocked(solicitudesRepo.buscarPorId).mockResolvedValueOnce(solicitudPendiente());
      vi.mocked(solicitudesRepo.decidirSolicitud).mockResolvedValueOnce({ resultado: 'nit_ocupado' });

      await expect(
        service.dictaminarSolicitud('solicitud-uuid-1', 1, { decision: 'aprobar', idSubRolEmpresa: 1 })
      ).rejects.toMatchObject({ codigo: 'NIT_YA_REGISTRADO', statusCode: 409 });

      expect(notificaciones.notificarDictamenEmpresa).not.toHaveBeenCalled();
    });

    it('una solicitud inexistente responde 404', async () => {
      await expect(
        service.dictaminarSolicitud('no-existe', 1, { decision: 'aprobar', idSubRolEmpresa: 1 })
      ).rejects.toMatchObject({ codigo: 'RECURSO_NO_ENCONTRADO', statusCode: 404 });
    });
  });

  describe('M06 · D8: tipo de cliente empresa de las cuentas', () => {
    const cuenta = (extra: Record<string, unknown> = {}) =>
      ({
        idUsuario: 33,
        nit: '901234567-1',
        nombreEmpresa: 'Pinturas del Valle S.A.S.',
        nombreRepresentante: 'Carlos Mario',
        correoEmpresarial: 'contacto@valle.com',
        telefono: '3151234567',
        idSolicitudOrigen: null,
        idSubRolEmpresa: 1,
        fechaAprobacion: fechaBase,
        fechaActualizacion: fechaBase,
        subRolEmpresa: {
          idSubRolEmpresa: 1,
          nombre: 'Proveedor',
          idDescuento: 1,
          estado: 'activo',
          descuento: { idDescuento: 1, tope: 0, porcentajeDescuento: 15, montoMinimoCompra: 0, estado: 'activo' },
        },
        ...extra,
      }) as unknown as Awaited<ReturnType<CuentasRepository['buscarCuentaEmpresaConTipo']>>;

    it('ofrece solo los tipos activos que entrega M06', async () => {
      expect(await service.listarTiposCliente()).toEqual([
        { idSubRolEmpresa: 1, nombre: 'Proveedor', porcentaje: 15, montoMinimoCompra: 0 },
        { idSubRolEmpresa: 2, nombre: 'Constructora', porcentaje: 10, montoMinimoCompra: 300000 },
      ]);
    });

    it('lista las cuentas con su tipo y deja null a la que no tiene', async () => {
      vi.mocked(cuentasRepo.listarCuentasEmpresa).mockResolvedValueOnce({
        items: [cuenta()!, cuenta({ idUsuario: 34, nit: '900111222-3', idSubRolEmpresa: null, subRolEmpresa: null })!],
        total: 2,
      });

      const r = await service.listarCuentas({ page: 1, limit: 20, sinTipo: false });

      expect(cuentasRepo.listarCuentasEmpresa).toHaveBeenCalledWith({ sinTipo: false, page: 1, limit: 20 });
      expect(r.total).toBe(2);
      expect(r.items[0]?.tipoCliente).toEqual({ idSubRolEmpresa: 1, nombre: 'Proveedor', porcentaje: 15, estado: 'activo' });
      expect(r.items[1]?.tipoCliente).toBeNull();
    });

    it('cambia el tipo de una cuenta y devuelve la cuenta con el tipo nuevo', async () => {
      vi.mocked(cuentasRepo.buscarCuentaEmpresaPorIdUsuario).mockResolvedValueOnce(cuenta()!);
      vi.mocked(cuentasRepo.buscarCuentaEmpresaConTipo).mockResolvedValueOnce(
        cuenta({
          idSubRolEmpresa: 2,
          subRolEmpresa: {
            idSubRolEmpresa: 2,
            nombre: 'Constructora',
            idDescuento: 2,
            estado: 'activo',
            descuento: { idDescuento: 2, tope: 0, porcentajeDescuento: 10, montoMinimoCompra: 300000, estado: 'activo' },
          },
        })!
      );

      const r = await service.cambiarTipoCuenta(33, 2);

      expect(cuentasRepo.asignarTipoCuentaEmpresa).toHaveBeenCalledWith(33, 2);
      expect(r.tipoCliente).toMatchObject({ idSubRolEmpresa: 2, nombre: 'Constructora', porcentaje: 10 });
    });

    it('no cambia nada si la cuenta no existe (404) o el tipo no es válido (400)', async () => {
      await expect(service.cambiarTipoCuenta(999, 1)).rejects.toMatchObject({ codigo: 'RECURSO_NO_ENCONTRADO', statusCode: 404 });

      vi.mocked(cuentasRepo.buscarCuentaEmpresaPorIdUsuario).mockResolvedValueOnce(cuenta()!);
      await expect(service.cambiarTipoCuenta(33, 99)).rejects.toMatchObject({ codigo: 'TIPO_CLIENTE_INVALIDO', statusCode: 400 });
      expect(cuentasRepo.asignarTipoCuentaEmpresa).not.toHaveBeenCalled();
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

    it('M18 · RF-CUE-10-04: la solicitud de renovación avisa al correo de la cuenta, sin llevar el NIT', async () => {
      vi.mocked(cuentasRepo.buscarCuentaEmpresaPorIdUsuario).mockResolvedValueOnce({ idUsuario: 33, nit: '900111222-3' } as CuentaEmpresa);
      vi.mocked(cuentasRepo.buscarPorId).mockResolvedValueOnce({ idUsuario: 33, nombre: 'Pinturas del Valle', correo: 'valle@empresa.com' } as Awaited<ReturnType<typeof cuentasRepo.buscarPorId>>);

      await service.solicitarRenovacionNit(33, {
        nitNuevo: '900999888-7',
        nombreOriginal: 'RUT.pdf',
        tipoMime: 'application/pdf',
        tamanoBytes: 2048,
        sha256: 'b'.repeat(64),
        contenidoBase64: Buffer.from('dummy').toString('base64'),
      });

      expect(notificaciones.notificarRenovacionNitRecibida).toHaveBeenCalledWith('valle@empresa.com', { nombre: 'Pinturas del Valle' });
    });

    it('aprueba la renovación mediante la operación atómica (el NIT cambia en la transacción)', async () => {
      vi.mocked(solicitudesRepo.buscarRenovacionPorId).mockResolvedValueOnce(renovacionPendiente());

      const res = await service.dictaminarRenovacionNit('renovacion-uuid-1', 1, {
        decision: 'aprobar',
      });

      expect(res.mensaje).toContain('aprobada exitosamente');
      expect(solicitudesRepo.decidirRenovacionNit).toHaveBeenCalledWith(
        'renovacion-uuid-1',
        expect.objectContaining({ estado: 'aprobada', idAdminRevisor: 1 })
      );
    });

    it('rechazar una renovación sin motivo es válido y deja el NIT vigente (CA-CUE-09-06)', async () => {
      vi.mocked(solicitudesRepo.buscarRenovacionPorId).mockResolvedValueOnce(renovacionPendiente());

      const res = await service.dictaminarRenovacionNit('renovacion-uuid-1', 1, { decision: 'rechazar' });

      expect(res.mensaje).toContain('rechazada exitosamente');
      expect(solicitudesRepo.decidirRenovacionNit).toHaveBeenCalledWith(
        'renovacion-uuid-1',
        expect.objectContaining({ estado: 'rechazada', motivoRechazo: null })
      );
    });

    it('una renovación ya decidida o decidida por otro administrador responde 409', async () => {
      vi.mocked(solicitudesRepo.buscarRenovacionPorId).mockResolvedValueOnce(
        renovacionPendiente({ estado: 'rechazada' })
      );
      await expect(
        service.dictaminarRenovacionNit('renovacion-uuid-1', 1, { decision: 'aprobar' })
      ).rejects.toMatchObject({ codigo: 'RECURSO_NO_ENCONTRADO', statusCode: 409 });

      vi.mocked(solicitudesRepo.buscarRenovacionPorId).mockResolvedValueOnce(renovacionPendiente());
      vi.mocked(solicitudesRepo.decidirRenovacionNit).mockResolvedValueOnce({ resultado: 'ya_decidida' });
      await expect(
        service.dictaminarRenovacionNit('renovacion-uuid-1', 1, { decision: 'aprobar' })
      ).rejects.toMatchObject({ codigo: 'RECURSO_NO_ENCONTRADO', statusCode: 409 });
    });

    it('si el NIT nuevo pasó a otra cuenta mientras esperaba, responde 409 NIT_YA_REGISTRADO', async () => {
      vi.mocked(solicitudesRepo.buscarRenovacionPorId).mockResolvedValueOnce(renovacionPendiente());
      vi.mocked(solicitudesRepo.decidirRenovacionNit).mockResolvedValueOnce({ resultado: 'nit_ocupado' });

      await expect(
        service.dictaminarRenovacionNit('renovacion-uuid-1', 1, { decision: 'aprobar' })
      ).rejects.toMatchObject({ codigo: 'NIT_YA_REGISTRADO', statusCode: 409 });
    });
  });

  describe('HU-CUE-03 E6 / HU-CUE-10 E3: el cliente consulta sus propias solicitudes', () => {
    it('sin solicitudes devuelve ambos estados vacíos', async () => {
      await expect(service.consultarMisSolicitudes(33)).resolves.toEqual({
        solicitudEmpresa: null,
        renovacionNit: null,
      });
    });

    it('consulta solo por el id de la sesión y proyecta únicamente los campos visibles', async () => {
      vi.mocked(solicitudesRepo.buscarUltimaPorUsuario).mockResolvedValueOnce(
        solicitudPendiente({ idAdminRevisor: 77, motivoRechazo: 'dato interno' })
      );
      vi.mocked(solicitudesRepo.buscarUltimaRenovacionPorUsuario).mockResolvedValueOnce(
        renovacionPendiente({ idAdminRevisor: 77 })
      );

      const res = await service.consultarMisSolicitudes(33);

      expect(solicitudesRepo.buscarUltimaPorUsuario).toHaveBeenCalledWith(33);
      expect(solicitudesRepo.buscarUltimaRenovacionPorUsuario).toHaveBeenCalledWith(33);
      expect(res.solicitudEmpresa).toEqual({
        idSolicitud: 'solicitud-uuid-1',
        tipoSolicitud: 'registro',
        estado: 'pendiente',
        motivoRechazo: null, // el motivo solo viaja si fue rechazada
        fechaSolicitud: fechaBase,
        fechaRevision: null,
      });
      expect(res.renovacionNit).toEqual({
        idSolicitud: 'renovacion-uuid-1',
        nitVigente: '900111222-3',
        nitSolicitado: '900999888-7',
        estado: 'pendiente',
        motivoRechazo: null,
        fechaSolicitud: fechaBase,
        fechaRevision: null,
      });
      // Ningún dato interno del revisor ni de documentos se filtra.
      expect(JSON.stringify(res)).not.toContain('77');
      expect(JSON.stringify(res)).not.toContain('doc-uuid-1');
    });

    it('una solicitud rechazada muestra su motivo (CA-CUE-03 E6)', async () => {
      vi.mocked(solicitudesRepo.buscarUltimaPorUsuario).mockResolvedValueOnce(
        solicitudPendiente({ estado: 'rechazada', motivoRechazo: 'RUT ilegible' })
      );

      const res = await service.consultarMisSolicitudes(33);

      expect(res.solicitudEmpresa).toMatchObject({ estado: 'rechazada', motivoRechazo: 'RUT ilegible' });
    });
  });

  describe('HU-CUE-09 E14 / RN-CUE-20: entrega del RUT custodiado', () => {
    const contenido = Buffer.from('contenido-del-rut');
    const documento = (extra: Partial<EntidadDocumentoSoporte> = {}): EntidadDocumentoSoporte => ({
      idDocumento: 'doc-uuid-1',
      nombreOriginal: 'RUT_2026.pdf',
      tipoMime: 'application/pdf',
      tamanoBytes: contenido.length,
      sha256: createHash('sha256').update(contenido).digest('hex'),
      contenido,
      fechaCarga: fechaBase,
      ...extra,
    });

    it('entrega el documento cuando su huella SHA-256 coincide', async () => {
      vi.mocked(almacenDocumentos.obtenerDocumentoCompleto).mockResolvedValueOnce(documento());

      await expect(service.obtenerDocumentoRut('doc-uuid-1')).resolves.toMatchObject({
        idDocumento: 'doc-uuid-1',
        tipoMime: 'application/pdf',
      });
    });

    it('un documento inexistente responde 404', async () => {
      await expect(service.obtenerDocumentoRut('doc-uuid-1')).rejects.toMatchObject({
        codigo: 'RECURSO_NO_ENCONTRADO',
        statusCode: 404,
      });
    });

    it('un documento cuya huella no coincide no se entrega (integridad de la custodia)', async () => {
      vi.mocked(almacenDocumentos.obtenerDocumentoCompleto).mockResolvedValueOnce(
        documento({ sha256: 'f'.repeat(64) })
      );

      await expect(service.obtenerDocumentoRut('doc-uuid-1')).rejects.toMatchObject({
        codigo: 'ARCHIVO_NO_PERMITIDO',
        statusCode: 500,
      });
    });
  });
});
