import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { CodigoVerificacion, Usuario } from '@prisma/client';
import type { CuentasRepository } from '../repositories/cuentas.repository';
import type { CodigosVerificacionRepository } from '../repositories/codigos-verificacion.repository';
import type { NotificacionesPort } from '../interfaces/notificaciones.port';
import { SimuladoDateProviderAdapter } from '../adapters/date-provider.adapter';
import {
  RecuperacionPasswordError,
  RecuperacionPasswordService,
} from '../services/recuperacion-password.service';
import type { SesionService } from '../../m20-seguridad/services/sesion.service';

describe('RecuperacionPasswordService (HU-CUE-05)', () => {
  let dateProvider: SimuladoDateProviderAdapter;
  let cuentasRepo: CuentasRepository;
  let codigosRepo: CodigosVerificacionRepository;
  let notificaciones: NotificacionesPort;
  let sesionService: SesionService;
  let service: RecuperacionPasswordService;

  const fechaBase = new Date('2026-10-21T12:00:00Z');

  beforeEach(() => {
    dateProvider = new SimuladoDateProviderAdapter(fechaBase);

    cuentasRepo = {
      buscarPorCorreo: vi.fn().mockResolvedValue(null),
      buscarPorId: vi.fn().mockResolvedValue(null),
      buscarConEmpresaPorId: vi.fn(),
      crearUsuarioCliente: vi.fn(),
      actualizarDatosPerfil: vi.fn(),
      actualizarContrasena: vi.fn().mockImplementation((idUsuario, hash) =>
        Promise.resolve({
          idUsuario,
          nombre: 'Usuario',
          correo: 'recuperar@pintuclic.com',
          contrasena: hash,
          telefono: null,
          tipo: 'normal',
          estado: 'activo',
          idRol: null,
          cambioContrasenaPendiente: false,
          fechaCreacion: fechaBase,
          fechaActualizacion: fechaBase,
        } as Usuario)
      ),
      actualizarCorreo: vi.fn(),
      actualizarEstado: vi.fn(),
      desactivarCuenta: vi.fn(),
      buscarIdentidadExterna: vi.fn(),
      vincularIdentidadExterna: vi.fn(),
      buscarCuentaEmpresaPorNit: vi.fn(),
      buscarCuentaEmpresaPorIdUsuario: vi.fn(),
    };

    codigosRepo = {
      guardarCodigo: vi.fn().mockImplementation((datos) =>
        Promise.resolve({
          idCodigo: 'recup-uuid-999',
          correo: datos.correo,
          codigoHash: datos.codigoHash,
          tipo: datos.tipo,
          intentos: 0,
          maxIntentos: 3,
          expiracion: datos.expiracion,
          datosTemporales: datos.datosTemporales ?? null,
          fechaCreacion: fechaBase,
        } as CodigoVerificacion)
      ),
      buscarPorId: vi.fn().mockResolvedValue(null),
      buscarUltimoActivoPorCorreo: vi.fn().mockResolvedValue(null),
      incrementarIntentos: vi.fn(),
      eliminar: vi.fn().mockResolvedValue(undefined),
    };

    notificaciones = {
      enviarCodigoRegistro: vi.fn(),
      enviarCodigoCambioCorreo: vi.fn(),
      enviarEnlaceRecuperacion: vi.fn().mockResolvedValue(undefined),
      notificarDictamenEmpresa: vi.fn(),
    };

    sesionService = {
      invalidarTodas: vi.fn().mockResolvedValue(2),
    } as unknown as SesionService;

    service = new RecuperacionPasswordService(
      cuentasRepo,
      codigosRepo,
      notificaciones,
      dateProvider,
      sesionService,
    );
  });

  it('solicita recuperación para correo existente y emite notificación con enlace seguro (30m)', async () => {
    vi.mocked(cuentasRepo.buscarPorCorreo).mockResolvedValueOnce({
      idUsuario: 42,
      correo: 'recuperar@pintuclic.com',
      estado: 'activo',
    } as Usuario);

    const res = await service.solicitarRecuperacion('recuperar@pintuclic.com');

    expect(res.mensaje).toContain('Si el correo electrónico se encuentra registrado');
    expect(notificaciones.enviarEnlaceRecuperacion).toHaveBeenCalledWith(
      'recuperar@pintuclic.com',
      expect.any(String),
      30,
    );
  });

  it('solicita recuperación para correo inexistente ejecutando señuelo y retornando respuesta idéntica (ADR-012)', async () => {
    vi.mocked(cuentasRepo.buscarPorCorreo).mockResolvedValueOnce(null);

    const res = await service.solicitarRecuperacion('noexiste@pintuclic.com');

    expect(res.mensaje).toContain('Si el correo electrónico se encuentra registrado');
    expect(notificaciones.enviarEnlaceRecuperacion).not.toHaveBeenCalled();
    expect(codigosRepo.guardarCodigo).not.toHaveBeenCalled();
  });

  it('restablece contraseña con token válido, revoca sesiones y elimina token', async () => {
    vi.mocked(cuentasRepo.buscarPorCorreo).mockResolvedValueOnce({
      idUsuario: 42,
      correo: 'recuperar@pintuclic.com',
      estado: 'activo',
    } as Usuario);

    await service.solicitarRecuperacion('recuperar@pintuclic.com');

    const tokenEmitido = vi.mocked(notificaciones.enviarEnlaceRecuperacion).mock.calls[0]![1];

    vi.mocked(codigosRepo.buscarPorId).mockResolvedValueOnce({
      idCodigo: 'recup-uuid-999',
      correo: 'recuperar@pintuclic.com',
      codigoHash: 'hash',
      tipo: 'recuperacion_password',
      intentos: 0,
      maxIntentos: 3,
      expiracion: new Date(fechaBase.getTime() + 30 * 60 * 1000),
      datosTemporales: { idUsuario: 42 },
      fechaCreacion: fechaBase,
    } as CodigoVerificacion);

    vi.mocked(cuentasRepo.buscarPorId).mockResolvedValueOnce({
      idUsuario: 42,
      correo: 'recuperar@pintuclic.com',
      estado: 'activo',
    } as Usuario);

    const res = await service.restablecerPassword({
      token: tokenEmitido,
      nuevaContrasena: 'NuevaPasswordSegura123!',
    });

    expect(res.mensaje).toContain('Contraseña restablecida exitosamente');
    expect(cuentasRepo.actualizarContrasena).toHaveBeenCalledWith(
      42,
      expect.any(String),
      false,
    );
    expect(codigosRepo.eliminar).toHaveBeenCalledWith('recup-uuid-999');
    expect(sesionService.invalidarTodas).toHaveBeenCalledWith(42, 'cambio_contrasena');
  });

  it('rechaza token expirado y lo elimina (RN-CUE-05: BVA > 30m)', async () => {
    vi.mocked(cuentasRepo.buscarPorCorreo).mockResolvedValueOnce({
      idUsuario: 42,
      correo: 'recuperar@pintuclic.com',
      estado: 'activo',
    } as Usuario);

    await service.solicitarRecuperacion('recuperar@pintuclic.com');
    const tokenEmitido = vi.mocked(notificaciones.enviarEnlaceRecuperacion).mock.calls[0]![1];

    // Simular que el código en base de datos ya expiró
    vi.mocked(codigosRepo.buscarPorId).mockResolvedValueOnce({
      idCodigo: 'recup-uuid-999',
      correo: 'recuperar@pintuclic.com',
      codigoHash: 'hash',
      tipo: 'recuperacion_password',
      intentos: 0,
      maxIntentos: 3,
      expiracion: new Date(fechaBase.getTime() - 1000), // Expirado
      datosTemporales: { idUsuario: 42 },
      fechaCreacion: fechaBase,
    } as CodigoVerificacion);

    await expect(
      service.restablecerPassword({
        token: tokenEmitido,
        nuevaContrasena: 'NuevaPasswordSegura123!',
      })
    ).rejects.toThrow(RecuperacionPasswordError);

    expect(codigosRepo.eliminar).toHaveBeenCalledWith('recup-uuid-999');
  });

  it('rechaza token corrupto o inválido', async () => {
    await expect(
      service.restablecerPassword({
        token: 'token-completamente-invalido-12345',
        nuevaContrasena: 'NuevaPasswordSegura123!',
      })
    ).rejects.toThrow(RecuperacionPasswordError);
  });
});
