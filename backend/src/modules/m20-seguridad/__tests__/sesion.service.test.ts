import { describe, expect, it, vi } from 'vitest';
import type { Sesion } from '@prisma/client';
import { SesionService } from '../services/sesion.service';
import { ParametrosSeguridadEnv } from '../services/parametros-seguridad.service';
import type { SesionRepository } from '../repositories/sesion.repository';
import type { UsuarioRepository } from '../repositories/usuario.repository';

/** HU-SEG-02 — Máquina de 8 estados de HU-SEG-02_gestion_sesion.png. */

const AHORA = new Date('2026-10-21T12:00:00.000Z');

function sesionActiva(parcial: Partial<Sesion> = {}): Sesion {
  return {
    idSesion: 'e1f0c8a2-0000-4000-8000-000000000001',
    idUsuario: 42,
    tipoSesion: 'admin',
    fechaInicio: AHORA,
    fechaUltimoAcceso: AHORA,
    fechaExpiracion: new Date(AHORA.getTime() + 1800 * 1000),
    estado: 'activa',
    motivoCierre: null,
    ...parcial,
  };
}

function construir(sesion: Sesion | null, estadoCuenta: string | null = 'activo') {
  const sesiones = {
    crear: vi.fn(),
    buscarPorId: vi.fn().mockResolvedValue(sesion),
    renovarVigencia: vi.fn(async (_id: string, exp: Date) =>
      sesionActiva({ fechaExpiracion: exp, fechaUltimoAcceso: AHORA }),
    ),
    cerrar: vi.fn().mockResolvedValue(sesionActiva({ estado: 'cerrada' })),
    invalidarTodasDeUsuario: vi.fn().mockResolvedValue(2),
  } as unknown as SesionRepository;

  const usuarios = {
    obtenerEstado: vi.fn().mockResolvedValue(estadoCuenta),
  } as unknown as UsuarioRepository;

  return { servicio: new SesionService(sesiones, usuarios, new ParametrosSeguridadEnv()), sesiones };
}

describe('HU-SEG-02 · Gestión de sesión', () => {
  it('RF-SEG-02-02: la ventana por defecto es 30 min en admin y 30 días en cliente', () => {
    const p = new ParametrosSeguridadEnv();
    delete process.env.SESION_INACTIVIDAD_ADMIN_SEG;
    delete process.env.SESION_INACTIVIDAD_CLIENTE_SEG;
    expect(p.ventanaInactividadSegundos('admin')).toBe(1800);
    expect(p.ventanaInactividadSegundos('cliente')).toBe(2592000);
  });

  it('Escenario 2 (CA-SEG-02-02): operar antes del plazo renueva la vigencia', async () => {
    const { servicio, sesiones } = construir(sesionActiva());
    const antes = new Date(AHORA.getTime() + 600 * 1000);

    const r = await servicio.validarYRenovar('id', antes);

    expect(r.valida).toBe(true);
    expect(sesiones.renovarVigencia).toHaveBeenCalledOnce();
  });

  it('Escenario 1 (CA-SEG-02-01): superar la inactividad expira la sesión', async () => {
    const { servicio, sesiones } = construir(sesionActiva());
    const despues = new Date(AHORA.getTime() + 1801 * 1000);

    const r = await servicio.validarYRenovar('id', despues);

    expect(r.valida).toBe(false);
    expect(sesiones.cerrar).toHaveBeenCalledWith('id', 'inactividad');
  });

  it('BVA: el límite es EXCLUYENTE — operar justo en el instante de expiración expira', async () => {
    const { servicio } = construir(sesionActiva());
    const justo = new Date(AHORA.getTime() + 1800 * 1000);

    const r = await servicio.validarYRenovar('id', justo);

    expect(r.valida).toBe(false);
  });

  it('Escenario 4 (CA-SEG-02-04): desactivar la cuenta invalida la sesión abierta', async () => {
    const { servicio, sesiones } = construir(sesionActiva(), 'bloqueado');

    const r = await servicio.validarYRenovar('id', AHORA);

    expect(r.valida).toBe(false);
    expect(sesiones.cerrar).toHaveBeenCalledWith('id', 'cuenta_desactivada');
  });

  it('RN-SEG-04: un estado terminal nunca vuelve a activa', async () => {
    const { servicio, sesiones } = construir(
      sesionActiva({ estado: 'revocada', motivoCierre: 'permisos_retirados' }),
    );

    const r = await servicio.validarYRenovar('id', AHORA);

    expect(r.valida).toBe(false);
    expect(sesiones.renovarVigencia).not.toHaveBeenCalled();
  });

  it('una sesión inexistente no es válida', async () => {
    const { servicio } = construir(null);
    const r = await servicio.validarYRenovar('no-existe', AHORA);
    expect(r).toEqual({ valida: false, motivo: 'inexistente' });
  });

  it('Escenario 7 (RF-SEG-02-04): el cierre manual registra su motivo', async () => {
    const { servicio, sesiones } = construir(sesionActiva());
    await servicio.cerrarManualmente('id');
    expect(sesiones.cerrar).toHaveBeenCalledWith('id', 'cierre_manual');
  });

  it('Escenario 5 (RF-SEG-02-06): invalidación en masa con causa', async () => {
    const { servicio, sesiones } = construir(sesionActiva());
    const n = await servicio.invalidarTodas(42, 'permisos_retirados');
    expect(n).toBe(2);
    expect(sesiones.invalidarTodasDeUsuario).toHaveBeenCalledWith(42, 'permisos_retirados');
  });
});
