import { describe, expect, it, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import type { CodigoVerificacion, Sesion, Usuario, UsuarioIdentidadExterna } from '@prisma/client';
import { derivarContrasena } from '../../../core/utils/crypto';
import type { CuentasRepository } from '../repositories/cuentas.repository';
import type { CodigosVerificacionRepository } from '../repositories/codigos-verificacion.repository';
import type { ControlIntentosRepository } from '../repositories/control-intentos.repository';
import type { NotificacionesPort } from '../../m18-notificaciones/interfaces/notificaciones.port';
import type { GoogleAuthPort } from '../interfaces/google-auth.port';
import type { ParametrosCuentasPort } from '../interfaces/parametros-cuentas.port';
import { SimuladoDateProviderAdapter } from '../adapters/date-provider.adapter';
import { GoogleAuthTokenInvalidoError } from '../adapters/google-auth.adapter';
import { AuthCuentasError, AuthCuentasService } from '../services/auth-cuentas.service';
import type { SesionService } from '../../m20-seguridad/services/sesion.service';

describe('AuthCuentasService (HU-CUE-01, HU-CUE-02, HU-CUE-04)', () => {
  let dateProvider: SimuladoDateProviderAdapter;
  let cuentasRepo: CuentasRepository;
  let codigosRepo: CodigosVerificacionRepository;
  let controlIntentosRepo: ControlIntentosRepository;
  let notificaciones: NotificacionesPort;
  let googleAuth: GoogleAuthPort;
  let sesionService: SesionService;
  let authService: AuthCuentasService;

  const fechaBase = new Date('2026-10-21T12:00:00Z');

  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', 'secreto-de-pruebas-m04-con-mas-de-32-caracteres');
    dateProvider = new SimuladoDateProviderAdapter(fechaBase);

    cuentasRepo = {
      buscarPorCorreo: vi.fn().mockResolvedValue(null),
      buscarPorId: vi.fn().mockResolvedValue(null),
      buscarConEmpresaPorId: vi.fn().mockResolvedValue(null),
      crearUsuarioCliente: vi.fn().mockImplementation((datos) =>
        Promise.resolve({
          idUsuario: 10,
          nombre: datos.nombre,
          correo: datos.correo,
          contrasena: datos.contrasenaHash,
          telefono: datos.telefono ?? null,
          tipo: datos.tipo ?? 'normal',
          estado: datos.estado ?? 'activo',
          idRol: null,
          cambioContrasenaPendiente: false,
          fechaCreacion: fechaBase,
          fechaActualizacion: fechaBase,
        } as Usuario)
      ),
      actualizarDatosPerfil: vi.fn(),
      actualizarContrasena: vi.fn().mockImplementation((idUsuario, hash, cambioPendiente) =>
        Promise.resolve({
          idUsuario,
          nombre: 'Usuario Test',
          correo: 'test@pintuclic.com',
          contrasena: hash,
          telefono: '3001234567',
          tipo: 'normal',
          estado: 'activo',
          idRol: null,
          cambioContrasenaPendiente: Boolean(cambioPendiente),
          fechaCreacion: fechaBase,
          fechaActualizacion: fechaBase,
        } as Usuario)
      ),
      actualizarCorreo: vi.fn(),
      actualizarEstado: vi.fn().mockImplementation((idUsuario, estado) =>
        Promise.resolve({
          idUsuario,
          nombre: 'Usuario Pendiente',
          correo: 'test@pintuclic.com',
          contrasena: 'hash',
          telefono: '3001234567',
          tipo: 'normal',
          estado,
          idRol: null,
          cambioContrasenaPendiente: false,
          fechaCreacion: fechaBase,
          fechaActualizacion: fechaBase,
        } as Usuario)
      ),
      desactivarCuenta: vi.fn(),
      buscarIdentidadExterna: vi.fn().mockResolvedValue(null),
      buscarIdentidadExternaPorUsuario: vi.fn().mockResolvedValue(null),
      vincularIdentidadExterna: vi.fn().mockResolvedValue({
        idIdentidad: 1,
        idUsuario: 10,
        proveedor: 'google',
        idProveedor: 'sub-google-123',
        correoProveedor: 'google@gmail.com',
        fechaVinculacion: fechaBase,
      } as UsuarioIdentidadExterna),
      buscarCuentaEmpresaPorNit: vi.fn().mockResolvedValue(null),
      buscarCuentaEmpresaPorIdUsuario: vi.fn().mockResolvedValue(null),
      listarCuentasEmpresa: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      buscarCuentaEmpresaConTipo: vi.fn().mockResolvedValue(null),
      asignarTipoCuentaEmpresa: vi.fn().mockResolvedValue(true),
    };

    codigosRepo = {
      guardarCodigo: vi.fn().mockImplementation((datos) =>
        Promise.resolve({
          idCodigo: 'codigo-uuid-123',
          correo: datos.correo,
          codigoHash: datos.codigoHash,
          tipo: datos.tipo,
          intentos: 0,
          maxIntentos: datos.maxIntentos ?? 3,
          expiracion: datos.expiracion,
          datosTemporales: datos.datosTemporales ?? null,
          fechaCreacion: fechaBase,
        } as CodigoVerificacion)
      ),
      buscarPorId: vi.fn().mockResolvedValue(null),
      buscarUltimoActivoPorCorreo: vi.fn().mockResolvedValue(null),
      incrementarIntentos: vi.fn().mockImplementation((_id) =>
        Promise.resolve({
          idCodigo: 'codigo-uuid-123',
          correo: 'test@pintuclic.com',
          codigoHash: 'hash',
          tipo: 'registro',
          intentos: 1,
          maxIntentos: 3,
          expiracion: new Date(fechaBase.getTime() + 15 * 60 * 1000),
          datosTemporales: null,
          fechaCreacion: fechaBase,
        } as CodigoVerificacion)
      ),
      eliminar: vi.fn().mockResolvedValue(undefined),
      eliminarPorCorreoYTipo: vi.fn(),
    };

    controlIntentosRepo = {
      obtener: vi.fn().mockResolvedValue(null),
      registrarFallo: vi.fn().mockImplementation((correo, max, minutos, ahora) =>
        Promise.resolve({
          idIntento: 'intento-uuid',
          correo,
          intentosFallidos: 1,
          bloqueadoHasta: null,
          ultimoFallo: ahora,
        })
      ),
      limpiar: vi.fn().mockResolvedValue(undefined),
    };

    notificaciones = {
      enviarCodigoRegistro: vi.fn().mockResolvedValue(undefined),
      enviarCodigoCambioCorreo: vi.fn().mockResolvedValue(undefined),
      enviarEnlaceRecuperacion: vi.fn().mockResolvedValue(undefined),
      enviarEnlaceActivacion: vi.fn(),
      notificarDictamenEmpresa: vi.fn().mockResolvedValue(undefined),
    };

    googleAuth = {
      verificarIdToken: vi.fn().mockResolvedValue({
        sub: 'google-sub-456',
        email: 'nuevo-google@pintuclic.com',
        nombre: 'Google Usuario',
        emailVerified: true,
      }),
    };

    sesionService = {
      crear: vi.fn().mockResolvedValue({
        idSesion: 'sesion-activa-uuid',
        idUsuario: 10,
        tipoSesion: 'cliente',
        estado: 'activa',
        fechaCreacion: fechaBase,
        ultimoAcceso: fechaBase,
        fechaExpiracion: new Date(fechaBase.getTime() + 3600 * 1000),
      } as unknown as Sesion),
      cerrarManualmente: vi.fn(),
      invalidarTodas: vi.fn().mockResolvedValue(1),
    } as unknown as SesionService;

    authService = new AuthCuentasService(
      cuentasRepo,
      codigosRepo,
      controlIntentosRepo,
      notificaciones,
      googleAuth,
      dateProvider,
      sesionService,
    );
  });

  /* ───────────────────────────────────────────────────────────────────────────
   * HU-CUE-01: REGISTRO B2C Y VALIDACIÓN OTP
   * ─────────────────────────────────────────────────────────────────────────── */
  describe('HU-CUE-01: Registro B2C con OTP', () => {
    it('HU-ADM-07: la vigencia y los intentos del OTP salen de la configuración de M17', async () => {
      const parametros: ParametrosCuentasPort = {
        obtenerNumero: vi.fn().mockImplementation((clave: string) =>
          Promise.resolve(clave === 'auth.vigencia_codigo_registro_minutos' ? 20 : clave === 'auth.intentos_codigo_registro' ? 4 : null),
        ),
      };
      const servicio = new AuthCuentasService(
        cuentasRepo, codigosRepo, controlIntentosRepo, notificaciones, googleAuth, dateProvider, sesionService, parametros,
      );

      const res = await servicio.solicitarRegistroB2C({
        nombre: 'Config Prueba',
        correo: 'config@pintuclic.com',
        telefono: '3001234567',
        contrasena: 'ClaveSegura2026!',
      });

      expect(res.tiempoExpiracionSegundos).toBe(20 * 60);
      expect(codigosRepo.guardarCodigo).toHaveBeenCalledWith(expect.objectContaining({ maxIntentos: 4 }));
      expect(notificaciones.enviarCodigoRegistro).toHaveBeenCalledWith('config@pintuclic.com', expect.stringMatching(/^\d{6}$/), 20);
    });

    it('debe registrar solicitud y enviar código OTP de 6 dígitos', async () => {
      const res = await authService.solicitarRegistroB2C({
        nombre: 'Juan Perez',
        correo: 'juan@pintuclic.com',
        telefono: '3001234567',
        contrasena: 'PasswordRobusto123!',
      });

      expect(res.idVerificacion).toBe('codigo-uuid-123');
      expect(res.correo).toBe('juan@pintuclic.com');
      expect(res.tiempoExpiracionSegundos).toBe(900); // 15 minutos

      expect(notificaciones.enviarCodigoRegistro).toHaveBeenCalledWith(
        'juan@pintuclic.com',
        expect.stringMatching(/^\d{6}$/),
        15,
      );
    });

    it('rechaza si el correo ya está registrado y activo (HU-CUE-08)', async () => {
      vi.mocked(cuentasRepo.buscarPorCorreo).mockResolvedValueOnce({
        idUsuario: 1,
        correo: 'activo@pintuclic.com',
        estado: 'activo',
      } as Usuario);

      await expect(
        authService.solicitarRegistroB2C({
          nombre: 'Juan',
          correo: 'activo@pintuclic.com',
          telefono: '3001234567',
          contrasena: 'PasswordRobusto123!',
        })
      ).rejects.toThrow(AuthCuentasError);
    });

    it('verifica código OTP exitosamente, crea usuario y sesión', async () => {
      const contrasenaHash = await derivarContrasena('Secret123456!');
      const codigoHash = await derivarContrasena('123456');

      vi.mocked(codigosRepo.buscarPorId).mockResolvedValueOnce({
        idCodigo: 'codigo-uuid-123',
        correo: 'juan@pintuclic.com',
        codigoHash,
        tipo: 'registro',
        intentos: 0,
        maxIntentos: 3,
        expiracion: new Date(fechaBase.getTime() + 15 * 60 * 1000),
        datosTemporales: {
          nombre: 'Juan Perez',
          telefono: '3001234567',
          contrasenaHash,
        },
        fechaCreacion: fechaBase,
      } as CodigoVerificacion);

      const res = await authService.verificarCodigoRegistro('codigo-uuid-123', '123456');

      expect(res.usuario.correo).toBe('juan@pintuclic.com');
      expect(res.sesion.idSesion).toBe('sesion-activa-uuid');
      expect(codigosRepo.eliminar).toHaveBeenCalledWith('codigo-uuid-123');
    });

    it('rechaza código OTP expirado (RN-CUE-01: BVA > 15m)', async () => {
      const codigoHash = await derivarContrasena('123456');
      vi.mocked(codigosRepo.buscarPorId).mockResolvedValueOnce({
        idCodigo: 'codigo-uuid-123',
        correo: 'juan@pintuclic.com',
        codigoHash,
        tipo: 'registro',
        intentos: 0,
        maxIntentos: 3,
        expiracion: new Date(fechaBase.getTime() - 1000), // Expirado hace 1s
        datosTemporales: {},
        fechaCreacion: fechaBase,
      } as CodigoVerificacion);

      await expect(
        authService.verificarCodigoRegistro('codigo-uuid-123', '123456')
      ).rejects.toThrow(AuthCuentasError);

      expect(codigosRepo.eliminar).toHaveBeenCalledWith('codigo-uuid-123');
    });

    it('rechaza código OTP incorrecto e incrementa intentos', async () => {
      const codigoHash = await derivarContrasena('999999');
      vi.mocked(codigosRepo.buscarPorId).mockResolvedValueOnce({
        idCodigo: 'codigo-uuid-123',
        correo: 'juan@pintuclic.com',
        codigoHash,
        tipo: 'registro',
        intentos: 0,
        maxIntentos: 3,
        expiracion: new Date(fechaBase.getTime() + 15 * 60 * 1000),
        datosTemporales: {},
        fechaCreacion: fechaBase,
      } as CodigoVerificacion);

      await expect(
        authService.verificarCodigoRegistro('codigo-uuid-123', '123456')
      ).rejects.toThrow(AuthCuentasError);

      expect(codigosRepo.incrementarIntentos).toHaveBeenCalledWith('codigo-uuid-123');
    });
  });

  /* ───────────────────────────────────────────────────────────────────────────
   * HU-CUE-02: FEDERACIÓN GOOGLE IDENTITY
   * ─────────────────────────────────────────────────────────────────────────── */
  describe('HU-CUE-02: Federación con Google', () => {
    it('traduce GoogleAuthTokenInvalidoError a 401 TOKEN_INVALIDO_O_EXPIRADO sin lanzar 500', async () => {
      vi.mocked(googleAuth.verificarIdToken).mockRejectedValueOnce(new GoogleAuthTokenInvalidoError());

      await expect(authService.autenticarGoogle({ idToken: 'token-google-expirado' })).rejects.toMatchObject({
        codigo: 'TOKEN_INVALIDO_O_EXPIRADO',
        statusCode: 401,
      });
    });

    it('rechaza un correo no verificado por Google sin buscar ni vincular cuentas', async () => {
      vi.mocked(googleAuth.verificarIdToken).mockResolvedValueOnce({
        sub: 'google-sub-789',
        email: 'cliente@pintuclic.com',
        nombre: 'Sin Verificar',
        emailVerified: false,
      });

      await expect(authService.autenticarGoogle({ idToken: 'token-sin-verificar' })).rejects.toMatchObject({
        codigo: 'CREDENCIALES_INVALIDAS',
        statusCode: 401,
      });
      expect(cuentasRepo.buscarPorCorreo).not.toHaveBeenCalled();
      expect(cuentasRepo.vincularIdentidadExterna).not.toHaveBeenCalled();
    });

    it('inicia sesión directamente si el usuario cliente ya tiene la identidad vinculada', async () => {
      vi.mocked(cuentasRepo.buscarIdentidadExterna).mockResolvedValueOnce({
        idIdentidad: 1,
        idUsuario: 20,
        proveedor: 'google',
        idProveedor: 'google-sub-456',
        correoProveedor: 'nuevo-google@pintuclic.com',
        fechaVinculacion: fechaBase,
      } as UsuarioIdentidadExterna);

      vi.mocked(cuentasRepo.buscarPorId).mockResolvedValueOnce({
        idUsuario: 20,
        correo: 'nuevo-google@pintuclic.com',
        nombre: 'Google Usuario',
        estado: 'activo',
        tipo: 'normal',
        idRol: null,
        cambioContrasenaPendiente: false,
      } as Usuario);

      const res = await authService.autenticarGoogle({ idToken: 'valid-google-id-token' });

      expect(res.etapa).toBe('sesion');
      if (res.etapa === 'sesion') {
        expect(res.usuario.idUsuario).toBe(20);
        expect(res.sesion.idSesion).toBe('sesion-activa-uuid');
      }
    });

    it('rechaza acceso con Google en cuentas empresariales o administrativas (DP-12, RF-CUE-08-02)', async () => {
      vi.mocked(cuentasRepo.buscarPorCorreo).mockResolvedValueOnce({
        idUsuario: 1,
        correo: 'nuevo-google@pintuclic.com',
        nombre: 'Admin',
        estado: 'activo',
        tipo: 'normal',
        idRol: 1,
        cambioContrasenaPendiente: false,
      } as Usuario);

      await expect(authService.autenticarGoogle({ idToken: 'valid-google-id-token' })).rejects.toMatchObject({
        codigo: 'PERMISO_DENEGADO',
        statusCode: 403,
      });
      expect(cuentasRepo.vincularIdentidadExterna).not.toHaveBeenCalled();

      vi.mocked(cuentasRepo.buscarPorCorreo).mockResolvedValueOnce({
        idUsuario: 25,
        correo: 'nuevo-google@pintuclic.com',
        nombre: 'Empresa S.A.S.',
        estado: 'activo',
        tipo: 'empresa',
        idRol: null,
        cambioContrasenaPendiente: false,
      } as Usuario);

      await expect(authService.autenticarGoogle({ idToken: 'valid-google-id-token' })).rejects.toMatchObject({
        codigo: 'PERMISO_DENEGADO',
        statusCode: 403,
      });
      expect(cuentasRepo.vincularIdentidadExterna).not.toHaveBeenCalled();
    });

    it('exige confirmar con la contraseña actual antes de vincular una cuenta activa existente (RF-CUE-02-03)', async () => {
      const hashExistente = await derivarContrasena('ClavePersonalExistente123!');
      const usuarioExistente = {
        idUsuario: 44,
        correo: 'nuevo-google@pintuclic.com',
        nombre: 'Cliente Existente',
        contrasena: hashExistente,
        estado: 'activo',
        tipo: 'normal',
        idRol: null,
        cambioContrasenaPendiente: false,
      } as Usuario;

      vi.mocked(cuentasRepo.buscarPorCorreo).mockResolvedValueOnce(usuarioExistente);

      const paso1 = await authService.autenticarGoogle({ idToken: 'valid-google-id-token' });
      expect(paso1.etapa).toBe('requiere_vinculacion');
      expect(cuentasRepo.vincularIdentidadExterna).not.toHaveBeenCalled();
      expect(sesionService.crear).not.toHaveBeenCalled();
      if (paso1.etapa !== 'requiere_vinculacion') return;

      // Con contraseña errónea rechaza y registra fallo anti-fuerza bruta
      vi.mocked(cuentasRepo.buscarPorId).mockResolvedValueOnce(usuarioExistente);
      await expect(
        authService.vincularCuentaGoogle({
          tokenVinculacion: paso1.tokenVinculacion,
          contrasena: 'ClaveIncorrecta999!',
        }),
      ).rejects.toMatchObject({
        codigo: 'CONTRASENA_INCORRECTA',
        statusCode: 400,
      });
      expect(controlIntentosRepo.registrarFallo).toHaveBeenCalled();
      expect(cuentasRepo.vincularIdentidadExterna).not.toHaveBeenCalled();

      // Con contraseña correcta vincula la identidad Google e inicia sesión
      vi.mocked(cuentasRepo.buscarPorId).mockResolvedValueOnce(usuarioExistente);
      const vinculado = await authService.vincularCuentaGoogle({
        tokenVinculacion: paso1.tokenVinculacion,
        contrasena: 'ClavePersonalExistente123!',
      });

      expect(cuentasRepo.vincularIdentidadExterna).toHaveBeenCalledWith({
        idUsuario: 44,
        proveedor: 'google',
        idProveedor: 'google-sub-456',
        correoProveedor: 'nuevo-google@pintuclic.com',
      });
      expect(controlIntentosRepo.limpiar).toHaveBeenCalledWith('nuevo-google@pintuclic.com');
      expect(vinculado.usuario.idUsuario).toBe(44);
      expect(vinculado.sesion.idSesion).toBe('sesion-activa-uuid');
    });

    it('emite token efímero de registro si es una cuenta nueva para obligar a fijar contraseña (RN-SEG-02)', async () => {
      const res = await authService.autenticarGoogle({ idToken: 'valid-google-id-token' });

      expect(res.etapa).toBe('requiere_registro');
      if (res.etapa === 'requiere_registro') {
        expect(res.tokenRegistroTemporal).toBeDefined();
        expect(res.email).toBe('nuevo-google@pintuclic.com');
      }
    });

    it('completa registro federado fijando contraseña y teléfono, y rechaza colisiones en cualquier estado', async () => {
      const authRes = await authService.autenticarGoogle({ idToken: 'valid-google-id-token' });
      expect(authRes.etapa).toBe('requiere_registro');
      if (authRes.etapa !== 'requiere_registro') return;

      // Si el correo existe en estado inactivo o pendiente, rechaza con 409 en vez de colisionar con P2002
      vi.mocked(cuentasRepo.buscarPorCorreo).mockResolvedValueOnce({
        idUsuario: 99,
        correo: 'nuevo-google@pintuclic.com',
        estado: 'inactivo',
      } as Usuario);

      await expect(
        authService.completarRegistroGoogle({
          tokenRegistroTemporal: authRes.tokenRegistroTemporal,
          telefono: '3109876543',
          contrasena: 'MiPasswordFederado123!',
        }),
      ).rejects.toMatchObject({ codigo: 'CORREO_YA_REGISTRADO', statusCode: 409 });

      // Con correo libre consolida cuenta y vincula Google
      const res = await authService.completarRegistroGoogle({
        tokenRegistroTemporal: authRes.tokenRegistroTemporal,
        telefono: '3109876543',
        contrasena: 'MiPasswordFederado123!',
      });

      expect(res.usuario.correo).toBe('nuevo-google@pintuclic.com');
      expect(cuentasRepo.crearUsuarioCliente).toHaveBeenCalled();
      expect(cuentasRepo.vincularIdentidadExterna).toHaveBeenCalledWith({
        idUsuario: 10,
        proveedor: 'google',
        idProveedor: 'google-sub-456',
        correoProveedor: 'nuevo-google@pintuclic.com',
      });
      expect(res.sesion.idSesion).toBe('sesion-activa-uuid');
    });
  });

  /* ───────────────────────────────────────────────────────────────────────────
   * HU-CUE-04: LOGIN Y BLOQUEO POR INTENTOS
   * ─────────────────────────────────────────────────────────────────────────── */
  describe('HU-CUE-04: Inicio de sesión y control de fuerza bruta', () => {
    it('inicia sesión con credenciales válidas y limpia control de intentos', async () => {
      const passHash = await derivarContrasena('ClaveCorrecta123!');
      vi.mocked(cuentasRepo.buscarPorCorreo).mockResolvedValueOnce({
        idUsuario: 5,
        correo: 'login@pintuclic.com',
        contrasena: passHash,
        estado: 'activo',
        tipo: 'normal',
        idRol: null,
        cambioContrasenaPendiente: false,
      } as Usuario);

      const res = await authService.login({
        correo: 'login@pintuclic.com',
        contrasena: 'ClaveCorrecta123!',
      });

      expect(res.requiereCambioContrasena).toBe(false);
      if (!res.requiereCambioContrasena) {
        expect(res.usuario.idUsuario).toBe(5);
        expect(res.esAdmin).toBe(false);
        expect(res.sesion.idSesion).toBe('sesion-activa-uuid');
        expect(sesionService.crear).toHaveBeenCalledWith(5, 'cliente');
        expect(controlIntentosRepo.limpiar).toHaveBeenCalledWith('login@pintuclic.com');
      }
    });

    it('cuenta inactiva con clave errónea responde igual que una inexistente (RF-SEG-06-06)', async () => {
      const passHash = await derivarContrasena('ClaveCorrecta123!');
      vi.mocked(cuentasRepo.buscarPorCorreo).mockResolvedValueOnce({
        idUsuario: 3,
        correo: 'baja@pintuclic.com',
        contrasena: passHash,
        estado: 'inactivo',
        tipo: 'normal',
        idRol: null,
        cambioContrasenaPendiente: false,
      } as Usuario);

      await expect(
        authService.login({ correo: 'baja@pintuclic.com', contrasena: 'ClaveErronea123!' }),
      ).rejects.toMatchObject({ codigo: 'CREDENCIALES_INVALIDAS', statusCode: 401 });
      expect(controlIntentosRepo.registrarFallo).toHaveBeenCalled();
    });

    it('cuenta inactiva con clave correcta informa el estado sin abrir sesión', async () => {
      const passHash = await derivarContrasena('ClaveCorrecta123!');
      vi.mocked(cuentasRepo.buscarPorCorreo).mockResolvedValueOnce({
        idUsuario: 3,
        correo: 'baja@pintuclic.com',
        contrasena: passHash,
        estado: 'inactivo',
        tipo: 'normal',
        idRol: null,
        cambioContrasenaPendiente: false,
      } as Usuario);

      await expect(
        authService.login({ correo: 'baja@pintuclic.com', contrasena: 'ClaveCorrecta123!' }),
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(sesionService.crear).not.toHaveBeenCalled();
    });

    it('identifica como esAdmin=true y abre sesión admin para administrador o colaborador de M17', async () => {
      const passHash = await derivarContrasena('Pintuclic2026');
      vi.mocked(cuentasRepo.buscarPorCorreo).mockResolvedValueOnce({
        idUsuario: 1,
        nombre: 'Admin Pintuclic',
        telefono: '3001112233',
        correo: 'admin@pintuclic.co',
        contrasena: passHash,
        estado: 'activo',
        tipo: 'normal',
        idRol: 1,
        usuarioRol: { idRol: 1 },
        cambioContrasenaPendiente: false,
      });

      const res = await authService.login({
        correo: 'admin@pintuclic.co',
        contrasena: 'Pintuclic2026',
      });

      expect(res.requiereCambioContrasena).toBe(false);
      if (!res.requiereCambioContrasena) {
        expect(res.esAdmin).toBe(true);
        expect(sesionService.crear).toHaveBeenCalledWith(1, 'admin');
      }
    });

    it('ejecuta señuelo de tiempo constante ante usuario inexistente (ADR-012)', async () => {
      vi.mocked(cuentasRepo.buscarPorCorreo).mockResolvedValueOnce(null);

      await expect(
        authService.login({
          correo: 'noexiste@pintuclic.com',
          contrasena: 'CualquierClave123!',
        })
      ).rejects.toThrow(AuthCuentasError);

      expect(controlIntentosRepo.registrarFallo).toHaveBeenCalled();
    });

    it('bloquea tras 5 intentos fallidos durante 15 minutos (ADR-012)', async () => {
      const passHash = await derivarContrasena('ClaveCorrecta123!');
      vi.mocked(cuentasRepo.buscarPorCorreo).mockResolvedValue({
        idUsuario: 5,
        correo: 'ataque@pintuclic.com',
        contrasena: passHash,
        estado: 'activo',
        tipo: 'normal',
        idRol: null,
        cambioContrasenaPendiente: false,
      } as Usuario);

      vi.mocked(controlIntentosRepo.registrarFallo).mockResolvedValueOnce({
        correo: 'ataque@pintuclic.com',
        intentosFallidos: 5,
        bloqueadoHasta: new Date(fechaBase.getTime() + 15 * 60 * 1000),
        fechaUltimoIntento: fechaBase,
      });

      await expect(
        authService.login({
          correo: 'ataque@pintuclic.com',
          contrasena: 'ClaveEquivocada1!',
        })
      ).rejects.toThrow(AuthCuentasError);
    });

    it('clave errónea de un correo existente responde sin detalles, igual que uno inexistente', async () => {
      const passHash = await derivarContrasena('ClaveCorrecta123!');
      vi.mocked(cuentasRepo.buscarPorCorreo).mockResolvedValueOnce({
        idUsuario: 5,
        correo: 'login@pintuclic.com',
        contrasena: passHash,
        estado: 'activo',
        tipo: 'normal',
        idRol: null,
        cambioContrasenaPendiente: false,
      } as Usuario);

      const error = await authService
        .login({ correo: 'login@pintuclic.com', contrasena: 'ClaveErronea123!' })
        .catch((e: unknown) => e);
      expect(error).toMatchObject({ codigo: 'CREDENCIALES_INVALIDAS', statusCode: 401 });
      expect((error as AuthCuentasError).detalles).toBeUndefined();
    });

    it('HU-ADM-07: el bloqueo usa los intentos y la duración que el admin configuró en M17', async () => {
      const parametros: ParametrosCuentasPort = {
        obtenerNumero: vi.fn().mockImplementation((clave: string) =>
          Promise.resolve(clave === 'auth.intentos_fallidos_bloqueo' ? 3 : clave === 'auth.duracion_bloqueo_minutos' ? 7 : null),
        ),
      };
      const servicio = new AuthCuentasService(
        cuentasRepo, codigosRepo, controlIntentosRepo, notificaciones, googleAuth, dateProvider, sesionService, parametros,
      );

      await expect(
        servicio.login({ correo: 'noexiste@pintuclic.com', contrasena: 'Cualquiera123!' }),
      ).rejects.toThrow(AuthCuentasError);
      expect(controlIntentosRepo.registrarFallo).toHaveBeenCalledWith('noexiste@pintuclic.com', 3, 7, fechaBase);
    });

    it('HU-ADM-07: si la configuración falla se aplican los valores por defecto (5 intentos, 15 min)', async () => {
      const parametros: ParametrosCuentasPort = {
        obtenerNumero: vi.fn().mockRejectedValue(new Error('BD caída')),
      };
      const servicio = new AuthCuentasService(
        cuentasRepo, codigosRepo, controlIntentosRepo, notificaciones, googleAuth, dateProvider, sesionService, parametros,
      );

      await expect(
        servicio.login({ correo: 'noexiste@pintuclic.com', contrasena: 'Cualquiera123!' }),
      ).rejects.toThrow(AuthCuentasError);
      expect(controlIntentosRepo.registrarFallo).toHaveBeenCalledWith('noexiste@pintuclic.com', 5, 15, fechaBase);
    });

    it('solicita cambio obligatorio de contraseña en primer acceso (ADR-011)', async () => {
      const passHash = await derivarContrasena('ClaveInicial123!');
      vi.mocked(cuentasRepo.buscarPorCorreo).mockResolvedValueOnce({
        idUsuario: 8,
        correo: 'primero@pintuclic.com',
        contrasena: passHash,
        estado: 'activo',
        tipo: 'normal',
        idRol: null,
        cambioContrasenaPendiente: true, // Forzado
      } as Usuario);

      const res = await authService.login({
        correo: 'primero@pintuclic.com',
        contrasena: 'ClaveInicial123!',
      });

      expect(res.requiereCambioContrasena).toBe(true);
      if (res.requiereCambioContrasena) {
        expect(res.idUsuario).toBe(8);
        expect(res.tokenCambio).toBeDefined();
      }
    });

    it('permite cambiar contraseña en primer acceso consumiendo token válido', async () => {
      const passHash = await derivarContrasena('ClaveInicial123!');
      vi.mocked(cuentasRepo.buscarPorCorreo).mockResolvedValueOnce({
        idUsuario: 8,
        correo: 'primero@pintuclic.com',
        contrasena: passHash,
        estado: 'activo',
        tipo: 'normal',
        idRol: null,
        cambioContrasenaPendiente: true,
      } as Usuario);

      const loginRes = await authService.login({
        correo: 'primero@pintuclic.com',
        contrasena: 'ClaveInicial123!',
      });

      if (!loginRes.requiereCambioContrasena) return;

      vi.mocked(cuentasRepo.buscarPorId).mockResolvedValueOnce({
        idUsuario: 8,
        correo: 'primero@pintuclic.com',
        contrasena: passHash,
        estado: 'activo',
        tipo: 'normal',
        idRol: null,
        cambioContrasenaPendiente: true,
      } as Usuario);

      const cambioRes = await authService.cambiarContrasenaPrimerAcceso(
        loginRes.tokenCambio,
        'ClaveInicial123!',
        'NuevaPasswordDefinitiva123!',
      );

      expect(cambioRes.usuario.idUsuario).toBe(8);
      expect(cuentasRepo.actualizarContrasena).toHaveBeenCalledWith(
        8,
        expect.any(String),
        false, // cambioContrasenaPendiente = false
      );
      expect(cambioRes.sesion.idSesion).toBe('sesion-activa-uuid');
    });

    describe('primer acceso: el token no basta por sí solo', () => {
      const empleado = (cambios: Partial<Usuario>, hash: string): Usuario =>
        ({
          idUsuario: 8,
          correo: 'primero@pintuclic.com',
          contrasena: hash,
          estado: 'activo',
          tipo: 'normal',
          idRol: 3,
          cambioContrasenaPendiente: true,
          ...cambios,
        }) as Usuario;
      const tokenPara = (idUsuario: number) =>
        jwt.sign({ idUsuario, tipo: 'cambio_primer_acceso' }, process.env.JWT_SECRET ?? '', { expiresIn: '15m' });

      it('un token ya usado no vuelve a cambiar la clave ni abre sesión', async () => {
        const hash = await derivarContrasena('ClaveInicial123!');
        vi.mocked(cuentasRepo.buscarPorId).mockResolvedValueOnce(empleado({ cambioContrasenaPendiente: false }, hash));

        await expect(
          authService.cambiarContrasenaPrimerAcceso(tokenPara(8), 'ClaveInicial123!', 'OtraClaveDefinitiva123!'),
        ).rejects.toMatchObject({ codigo: 'TOKEN_INVALIDO_O_EXPIRADO' });
        expect(cuentasRepo.actualizarContrasena).not.toHaveBeenCalled();
        expect(sesionService.crear).not.toHaveBeenCalled();
      });

      it('rechaza el token de una cuenta que ya no está activa', async () => {
        const hash = await derivarContrasena('ClaveInicial123!');
        vi.mocked(cuentasRepo.buscarPorId).mockResolvedValueOnce(empleado({ estado: 'bloqueado' }, hash));

        await expect(
          authService.cambiarContrasenaPrimerAcceso(tokenPara(8), 'ClaveInicial123!', 'OtraClaveDefinitiva123!'),
        ).rejects.toMatchObject({ codigo: 'TOKEN_INVALIDO_O_EXPIRADO' });
        expect(cuentasRepo.actualizarContrasena).not.toHaveBeenCalled();
      });

      it('exige la clave temporal correcta', async () => {
        const hash = await derivarContrasena('ClaveInicial123!');
        vi.mocked(cuentasRepo.buscarPorId).mockResolvedValueOnce(empleado({}, hash));

        await expect(
          authService.cambiarContrasenaPrimerAcceso(tokenPara(8), 'ClaveEquivocada123!', 'OtraClaveDefinitiva123!'),
        ).rejects.toMatchObject({ codigo: 'CONTRASENA_INCORRECTA' });
        expect(cuentasRepo.actualizarContrasena).not.toHaveBeenCalled();
      });

      it('no acepta como definitiva la misma clave temporal', async () => {
        const hash = await derivarContrasena('ClaveInicial123!');
        vi.mocked(cuentasRepo.buscarPorId).mockResolvedValueOnce(empleado({}, hash));

        await expect(
          authService.cambiarContrasenaPrimerAcceso(tokenPara(8), 'ClaveInicial123!', 'ClaveInicial123!'),
        ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
        expect(cuentasRepo.actualizarContrasena).not.toHaveBeenCalled();
      });
    });
  });
});
