import { describe, expect, it, vi } from 'vitest';
import type { SesionService } from '../../m20-seguridad/services/sesion.service';
import { construirModuloM04 } from '../m04.routes';

describe('m04.routes · Ensamblaje y registro de rutas de cuentas y perfiles', () => {
  it('construye el módulo M04 con todas sus dependencias y expone los routers y servicios', () => {
    const sesionService = {
      crear: vi.fn(),
      validarYRenovar: vi.fn(),
      cerrarManualmente: vi.fn(),
      invalidarTodas: vi.fn(),
    } as unknown as SesionService;

    const m04 = construirModuloM04(sesionService);

    expect(m04.cuentasRouter).toBeDefined();
    expect(m04.adminEmpresasRouter).toBeDefined();
    expect(m04.authService).toBeDefined();
    expect(m04.recuperacionService).toBeDefined();
    expect(m04.perfilService).toBeDefined();
    expect(m04.direccionesService).toBeDefined();
    expect(m04.empresasService).toBeDefined();
  });

  it('el router de cuentas registra todas las rutas públicas y de perfil requeridas', () => {
    const sesionService = {} as unknown as SesionService;
    const m04 = construirModuloM04(sesionService);

    const paths = m04.cuentasRouter.stack
      .filter((layer) => layer.route)
      .map((layer) => layer.route?.path);

    // Rutas públicas de autenticación y onboarding
    expect(paths).toContain('/registro');
    expect(paths).toContain('/registro/verificar-otp');
    expect(paths).toContain('/registro/reenviar-otp');
    expect(paths).toContain('/login');
    expect(paths).toContain('/cambio-password-primer-acceso');
    expect(paths).toContain('/oauth/google');
    expect(paths).toContain('/oauth/google/completar');
    expect(paths).toContain('/recuperar-password/solicitar');
    expect(paths).toContain('/recuperar-password/confirmar');
    expect(paths).toContain('/empresas/registro');

    // Rutas protegidas de perfil y direcciones
    expect(paths).toContain('/logout');
    expect(paths).toContain('/perfil');
    expect(paths).toContain('/perfil/password');
    expect(paths).toContain('/perfil/cambio-correo/solicitar');
    expect(paths).toContain('/perfil/cambio-correo/confirmar');
    expect(paths).toContain('/perfil/desactivar');
    expect(paths).toContain('/direcciones');
    expect(paths).toContain('/direcciones/:idDireccion');
    expect(paths).toContain('/direcciones/:idDireccion/predeterminada');
    expect(paths).toContain('/empresas/ascenso');
    expect(paths).toContain('/empresas/renovacion-nit');
  });

  it('el router de administración de empresas registra las rutas de gestión de solicitudes', () => {
    const sesionService = {} as unknown as SesionService;
    const m04 = construirModuloM04(sesionService);

    const paths = m04.adminEmpresasRouter.stack
      .filter((layer) => layer.route)
      .map((layer) => layer.route?.path);

    expect(paths).toContain('/solicitudes');
    expect(paths).toContain('/solicitudes/:idSolicitud');
    expect(paths).toContain('/solicitudes/:idSolicitud/dictamen');
    expect(paths).toContain('/renovaciones/:idSolicitud/dictamen');
  });
});
