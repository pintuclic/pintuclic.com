import { describe, expect, it, vi } from 'vitest';
import type { AuditoriaPort } from '../../m20-seguridad/interfaces/auditoria.port';
import type { SesionService } from '../../m20-seguridad/services/sesion.service';
import { construirModuloM17 } from '../m17.routes';

describe('m17.routes · Ensamblaje y registro de rutas administrativas', () => {
  it('construye el módulo M17 con todas sus dependencias y expone el router configurado', () => {
    const sesionService = {
      invalidarTodas: vi.fn(),
    } as unknown as SesionService;

    const auditoria = {
      registrarAccesoDenegado: vi.fn(),
    } as unknown as AuditoriaPort;

    const m17 = construirModuloM17(sesionService, auditoria);

    expect(m17.router).toBeDefined();
    expect(m17.resolutorPermisos).toBeDefined();
    expect(m17.autorizacionService).toBeDefined();
    expect(m17.empleadosService).toBeDefined();
    expect(m17.permisosService).toBeDefined();
    expect(m17.clientesService).toBeDefined();
    expect(m17.configService).toBeDefined();
    expect(m17.gobernanzaService).toBeDefined();
  });

  it('el router registra las rutas principales de M17', () => {
    const sesionService = {} as unknown as SesionService;
    const auditoria = {} as unknown as AuditoriaPort;

    const m17 = construirModuloM17(sesionService, auditoria);

    // Obtener las capas de rutas del router de Express
    const paths = m17.router.stack
      .filter((layer) => layer.route)
      .map((layer) => layer.route?.path);

    expect(paths).toContain('/empleados');
    expect(paths).toContain('/empleados/:id');
    expect(paths).toContain('/empleados/:id/desactivar');
    expect(paths).toContain('/empleados/:id/reactivar');
    expect(paths).toContain('/empleados/:id/reenviar-activacion');
    expect(paths).toContain('/empleados/:id/permisos');
    expect(paths).toContain('/clientes');
    expect(paths).toContain('/clientes/:id');
    expect(paths).toContain('/clientes/:id/desactivar');
    expect(paths).toContain('/configuracion');
    expect(paths).toContain('/configuracion/:clave');
    expect(paths).toContain('/gobernanza/sustituir-correo');
    expect(paths).toContain('/gobernanza/confirmar-correo');
    expect(paths).toContain('/primer-acceso');
  });
});
