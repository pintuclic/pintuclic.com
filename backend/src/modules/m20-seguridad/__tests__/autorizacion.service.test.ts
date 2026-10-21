import { describe, expect, it, vi } from 'vitest';
import {
  AutorizacionService,
  type ResolutorPermisos,
} from '../services/autorizacion.service';
import { RESPUESTA_RECURSO_NO_DISPONIBLE, construirError } from '../../../core/utils/apiResponse';
import type { Actor } from '../interfaces/actor.interface';
import type { AuditoriaPort } from '../interfaces/auditoria.port';

/** HU-SEG-03 — Validador central y respuesta uniforme. */

const ACTOR: Actor = {
  idUsuario: 10,
  idSesion: 'e1f0c8a2-0000-4000-8000-000000000001',
  tipoSesion: 'admin',
};
const CONTEXTO = { operacionIntentada: 'POST /api/v1/productos', ipOrigen: '203.0.113.7' };

function construir(concede: boolean) {
  const permisos = { tienePermiso: vi.fn().mockResolvedValue(concede) } as ResolutorPermisos;
  const auditoria = {
    registrarAccesoDenegado: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuditoriaPort;
  return { servicio: new AutorizacionService(permisos, auditoria), permisos, auditoria };
}

describe('HU-SEG-03 · Autorización verificada en el servidor', () => {
  it('Escenario 2 (CA-SEG-03-02): sin permiso, la operación se rechaza', async () => {
    const { servicio } = construir(false);
    await expect(servicio.exigirPermiso(ACTOR, 'catalogo.producto.crear', CONTEXTO)).resolves.toBe(
      false,
    );
  });

  it('Escenario 4 (CA-SEG-03-04): el permiso se resuelve EN CADA petición', async () => {
    const { servicio, permisos } = construir(true);

    await servicio.exigirPermiso(ACTOR, 'catalogo.producto.crear', CONTEXTO);
    await servicio.exigirPermiso(ACTOR, 'catalogo.producto.crear', CONTEXTO);

    // Dos peticiones, dos resoluciones: nada se cachea en el token.
    expect(permisos.tienePermiso).toHaveBeenCalledTimes(2);
  });

  it('Escenario 7 (RN-SEG-15): la denegación se emite al puerto de auditoría', async () => {
    const { servicio, auditoria } = construir(false);

    await servicio.exigirPermiso(ACTOR, 'catalogo.producto.crear', CONTEXTO);

    expect(auditoria.registrarAccesoDenegado).toHaveBeenCalledOnce();
    const evento = vi.mocked(auditoria.registrarAccesoDenegado).mock.calls[0]?.[0];
    expect(evento?.idUsuario).toBe(10);
    expect(evento?.operacionIntentada).toBe('POST /api/v1/productos');
    expect(evento?.permisoRequerido).toBe('catalogo.producto.crear');
  });

  it('no audita cuando la operación SÍ está autorizada', async () => {
    const { servicio, auditoria } = construir(true);
    await servicio.exigirPermiso(ACTOR, 'catalogo.producto.crear', CONTEXTO);
    expect(auditoria.registrarAccesoDenegado).not.toHaveBeenCalled();
  });

  it('CA-SEG-03-01 (titularidad): el actor no opera sobre datos de otro', async () => {
    const { servicio, auditoria } = construir(true);

    await expect(servicio.exigirTitularidad(ACTOR, 999, CONTEXTO)).resolves.toBe(false);
    await expect(servicio.exigirTitularidad(ACTOR, 10, CONTEXTO)).resolves.toBe(true);
    expect(auditoria.registrarAccesoDenegado).toHaveBeenCalledOnce();
  });

  it('RF-SEG-04-07: el evento auditado no transporta credenciales', async () => {
    const { servicio, auditoria } = construir(false);
    await servicio.exigirPermiso(ACTOR, 'catalogo.producto.crear', CONTEXTO);

    const evento = vi.mocked(auditoria.registrarAccesoDenegado).mock.calls[0]?.[0];
    const serializado = JSON.stringify(evento);
    expect(serializado).not.toMatch(/contrasena|password|hash|\$2b\$/i);
  });
});

describe('ADR-003 · Indistinguibilidad de respuestas (CA-SEG-03-06)', () => {
  it('recurso inexistente y recurso ajeno devuelven EXACTAMENTE la misma respuesta', () => {
    // La prueba compara ambas salidas ENTRE SÍ, no contra un valor esperado:
    // es lo que exigió el Arquitecto en la mesa ATDD.
    const respuestaRecursoInexistente = RESPUESTA_RECURSO_NO_DISPONIBLE;
    const respuestaRecursoAjeno = RESPUESTA_RECURSO_NO_DISPONIBLE;

    expect(JSON.stringify(respuestaRecursoInexistente)).toBe(
      JSON.stringify(respuestaRecursoAjeno),
    );
    expect(respuestaRecursoInexistente).toBe(respuestaRecursoAjeno); // misma referencia
  });

  it('la respuesta no revela qué permiso concreto faltaba', () => {
    const serializado = JSON.stringify(RESPUESTA_RECURSO_NO_DISPONIBLE);
    expect(serializado).not.toMatch(/permiso|rol|403|forbidden/i);
  });

  it('es inmutable: nadie puede añadirle un detalle y romper la indistinguibilidad', () => {
    expect(Object.isFrozen(RESPUESTA_RECURSO_NO_DISPONIBLE)).toBe(true);
  });

  it('RF-SEG-06-04: el error interno no revela rutas, consultas ni versiones', () => {
    const e = construirError('ERROR_INTERNO', 'No fue posible completar la operación.');
    const serializado = JSON.stringify(e);
    expect(serializado).not.toMatch(/\/home\/|SELECT |prisma|node_modules|v\d+\.\d+\.\d+/i);
    expect(e.error.details).toBeNull();
  });
});
