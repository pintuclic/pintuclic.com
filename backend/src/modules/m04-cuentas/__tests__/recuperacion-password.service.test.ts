import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { CodigoVerificacion, Usuario } from '@prisma/client';
import type { CuentasRepository } from '../repositories/cuentas.repository';
import type { CodigosVerificacionRepository } from '../repositories/codigos-verificacion.repository';
import type { NotificacionesPort } from '../../m18-notificaciones/interfaces/notificaciones.port';
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
    vi.stubEnv('JWT_SECRET', 'secreto-de-pruebas-m04-con-mas-de-32-caracteres');
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
      eliminarPorCorreoYTipo: vi.fn().mockResolvedValue(undefined),
    };

    notificaciones = {
      enviarCodigoRegistro: vi.fn(),
      enviarCodigoCambioCorreo: vi.fn(),
      enviarEnlaceRecuperacion: vi.fn().mockResolvedValue(undefined),
      enviarEnlaceActivacion: vi.fn().mockResolvedValue(undefined),
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

  /** Código tal como lo dejó guardarCodigo, con el hash real del valor aleatorio. */
  const codigoGuardado = (idUsuarioDelCodigo: number): CodigoVerificacion => {
    const guardado = vi.mocked(codigosRepo.guardarCodigo).mock.calls[0]![0];
    return {
      idCodigo: 'recup-uuid-999',
      correo: 'recuperar@pintuclic.com',
      codigoHash: guardado.codigoHash,
      tipo: 'recuperacion_password',
      intentos: 0,
      maxIntentos: 3,
      expiracion: new Date(fechaBase.getTime() + 30 * 60 * 1000),
      datosTemporales: { idUsuario: idUsuarioDelCodigo },
      fechaCreacion: fechaBase,
    } as CodigoVerificacion;
  };

  const solicitarPara42 = async (): Promise<string> => {
    vi.mocked(cuentasRepo.buscarPorCorreo).mockResolvedValueOnce({
      idUsuario: 42,
      correo: 'recuperar@pintuclic.com',
      estado: 'activo',
    } as Usuario);
    await service.solicitarRecuperacion('recuperar@pintuclic.com');
    return vi.mocked(notificaciones.enviarEnlaceRecuperacion).mock.calls[0]![1];
  };

  it('no persiste el valor aleatorio del enlace en texto plano', async () => {
    await solicitarPara42();

    const guardado = vi.mocked(codigosRepo.guardarCodigo).mock.calls[0]![0];
    expect(guardado.datosTemporales).toEqual({ idUsuario: 42 });
  });

  it('rechaza un enlace cuyo código pertenece a otro usuario sin cambiar ninguna contraseña', async () => {
    const tokenEmitido = await solicitarPara42();
    vi.mocked(codigosRepo.buscarPorId).mockResolvedValueOnce(codigoGuardado(7));

    await expect(
      service.restablecerPassword({ token: tokenEmitido, nuevaContrasena: 'NuevaPasswordSegura123!' }),
    ).rejects.toMatchObject({ codigo: 'TOKEN_INVALIDO_O_EXPIRADO' });
    expect(cuentasRepo.actualizarContrasena).not.toHaveBeenCalled();
  });

  it('rechaza un enlace cuyo valor aleatorio no coincide con el hash y cuenta el intento', async () => {
    const tokenEmitido = await solicitarPara42();
    vi.mocked(codigosRepo.buscarPorId).mockResolvedValueOnce({
      ...codigoGuardado(42),
      codigoHash: '$2b$12$C6UzMDM.H6dfI/f/IKcEe.JustAPlaceholderHashForTimingXXXXXXXXXX',
    });

    await expect(
      service.restablecerPassword({ token: tokenEmitido, nuevaContrasena: 'NuevaPasswordSegura123!' }),
    ).rejects.toMatchObject({ codigo: 'TOKEN_INVALIDO_O_EXPIRADO' });
    expect(codigosRepo.incrementarIntentos).toHaveBeenCalledWith('recup-uuid-999');
    expect(cuentasRepo.actualizarContrasena).not.toHaveBeenCalled();
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
    vi.mocked(codigosRepo.buscarPorId).mockResolvedValueOnce(codigoGuardado(42));

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

describe('RecuperacionPasswordService · enlace de activación de empleados (HU-ADM-01)', () => {
  const fechaBase = new Date('2026-10-21T12:00:00Z');
  const empleado = {
    idUsuario: 30,
    nombre: 'Laura Gómez',
    correo: 'laura@pintuclic.com',
    estado: 'activo',
    cambioContrasenaPendiente: true,
  } as Usuario;

  const construir = (horasConfiguradas: number | null = null) => {
    vi.stubEnv('JWT_SECRET', 'secreto-de-pruebas-m04-con-mas-de-32-caracteres');
    const cuentasRepo = {
      buscarPorId: vi.fn().mockResolvedValue(empleado),
      actualizarContrasena: vi.fn().mockResolvedValue({ ...empleado, cambioContrasenaPendiente: false }),
    } as unknown as CuentasRepository;
    const codigosRepo = {
      guardarCodigo: vi.fn().mockImplementation((datos) =>
        Promise.resolve({ idCodigo: 'activ-uuid-1', intentos: 0, maxIntentos: 3, fechaCreacion: fechaBase, ...datos }),
      ),
      buscarPorId: vi.fn(),
      eliminar: vi.fn().mockResolvedValue(undefined),
      eliminarPorCorreoYTipo: vi.fn().mockResolvedValue(undefined),
      incrementarIntentos: vi.fn(),
    } as unknown as CodigosVerificacionRepository;
    const notificaciones = {
      enviarEnlaceActivacion: vi.fn().mockResolvedValue(undefined),
    } as unknown as NotificacionesPort;
    const sesionService = { invalidarTodas: vi.fn().mockResolvedValue(0) } as unknown as SesionService;
    const service = new RecuperacionPasswordService(
      cuentasRepo,
      codigosRepo,
      notificaciones,
      new SimuladoDateProviderAdapter(fechaBase),
      sesionService,
      { obtenerNumero: vi.fn().mockResolvedValue(horasConfiguradas) },
    );
    return { service, cuentasRepo, codigosRepo, notificaciones };
  };

  it('envía un enlace de 72 h por defecto e invalida los enlaces anteriores', async () => {
    const { service, codigosRepo, notificaciones } = construir();

    await service.emitirEnlaceActivacion(30);

    expect(codigosRepo.eliminarPorCorreoYTipo).toHaveBeenCalledWith('laura@pintuclic.com', 'recuperacion_password');
    const guardado = vi.mocked(codigosRepo.guardarCodigo).mock.calls[0]![0];
    expect(guardado.expiracion.getTime() - fechaBase.getTime()).toBe(72 * 3600 * 1000);
    expect(guardado.datosTemporales).toEqual({ idUsuario: 30 });
    expect(notificaciones.enviarEnlaceActivacion).toHaveBeenCalledWith(
      'laura@pintuclic.com',
      'Laura Gómez',
      expect.any(String),
      72,
    );
  });

  it('usa la vigencia que el admin configuró en M17', async () => {
    const { service, codigosRepo, notificaciones } = construir(24);

    await service.emitirEnlaceActivacion(30);

    const guardado = vi.mocked(codigosRepo.guardarCodigo).mock.calls[0]![0];
    expect(guardado.expiracion.getTime() - fechaBase.getTime()).toBe(24 * 3600 * 1000);
    expect(vi.mocked(notificaciones.enviarEnlaceActivacion).mock.calls[0]![3]).toBe(24);
  });

  it('el enlace fija la contraseña y quita el cambio pendiente', async () => {
    const { service, cuentasRepo, codigosRepo, notificaciones } = construir();
    await service.emitirEnlaceActivacion(30);
    const token = vi.mocked(notificaciones.enviarEnlaceActivacion).mock.calls[0]![2];
    const guardado = vi.mocked(codigosRepo.guardarCodigo).mock.calls[0]![0];
    vi.mocked(codigosRepo.buscarPorId).mockResolvedValueOnce({
      idCodigo: 'activ-uuid-1',
      correo: 'laura@pintuclic.com',
      codigoHash: guardado.codigoHash,
      tipo: 'recuperacion_password',
      intentos: 0,
      maxIntentos: 3,
      expiracion: guardado.expiracion,
      datosTemporales: { idUsuario: 30 },
      fechaCreacion: fechaBase,
    } as CodigoVerificacion);

    await service.restablecerPassword({ token, nuevaContrasena: 'ClaveDeLaura2026!' });

    expect(cuentasRepo.actualizarContrasena).toHaveBeenCalledWith(30, expect.any(String), false);
  });

  it('no emite enlace si la cuenta ya fijó su contraseña', async () => {
    const { service, cuentasRepo, notificaciones } = construir();
    vi.mocked(cuentasRepo.buscarPorId).mockResolvedValueOnce({ ...empleado, cambioContrasenaPendiente: false });

    await expect(service.emitirEnlaceActivacion(30)).rejects.toMatchObject({ codigo: 'RECURSO_NO_ENCONTRADO' });
    expect(notificaciones.enviarEnlaceActivacion).not.toHaveBeenCalled();
  });

  it('propaga el fallo del correo para que M17 avise al admin', async () => {
    const { service, notificaciones } = construir();
    vi.mocked(notificaciones.enviarEnlaceActivacion).mockRejectedValueOnce(new Error('SMTP caído'));

    await expect(service.emitirEnlaceActivacion(30)).rejects.toThrow('SMTP caído');
  });
});
