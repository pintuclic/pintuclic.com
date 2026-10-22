import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CredencialesService } from '../services/credenciales.service';
import { derivarContrasena, obtenerCosteDerivacion } from '../../../core/utils/crypto';
import type { CredencialUsuario, UsuarioRepository } from '../repositories/usuario.repository';
import type { SesionService } from '../services/sesion.service';

/**
 * HU-SEG-01 — Almacenamiento seguro de credenciales.
 * Cada prueba cita el escenario BDD de 02_HISTORIAS_USUARIO.md que certifica.
 */

function construirUsuarioRepo(credencial: CredencialUsuario | null) {
  return {
    buscarCredencialPorCorreo: vi.fn().mockResolvedValue(credencial),
    obtenerEstado: vi.fn(),
    actualizarContrasena: vi.fn().mockResolvedValue(undefined),
  } as unknown as UsuarioRepository;
}

function construirSesionService() {
  return { invalidarTodas: vi.fn().mockResolvedValue(3) } as unknown as SesionService;
}

describe('HU-SEG-01 · Almacenamiento seguro de credenciales', () => {
  beforeEach(() => {
    process.env.BCRYPT_COST = '12';
  });

  it('Escenario 1 (CA-SEG-01-01): la credencial no queda legible ni es recuperable', async () => {
    const plana = 'ContrasenaSegura123';
    const derivacion = await derivarContrasena(plana);

    expect(derivacion).not.toContain(plana);
    expect(derivacion.startsWith('$2b$12$')).toBe(true);
  });

  it('Escenario 2 (CA-SEG-01-02): dos contraseñas iguales producen valores distintos', async () => {
    const plana = 'MismaContrasena999';
    const a = await derivarContrasena(plana);
    const b = await derivarContrasena(plana);

    expect(a).not.toBe(b); // sal única por usuario
  });

  it('RNF-SEG-01-02: el coste es ajustable pero nunca por debajo de 12', () => {
    process.env.BCRYPT_COST = '14';
    expect(obtenerCosteDerivacion()).toBe(14);

    process.env.BCRYPT_COST = '8';
    expect(() => obtenerCosteDerivacion()).toThrow(/>= 12/);
  });

  it('Escenario 5 (CA-SEG-01-05): cambiar la contraseña invalida todas las sesiones', async () => {
    const usuarios = construirUsuarioRepo(null);
    const sesiones = construirSesionService();
    const servicio = new CredencialesService(usuarios, sesiones);

    await servicio.cambiarContrasena(7, 'NuevaContrasena123');

    expect(usuarios.actualizarContrasena).toHaveBeenCalledOnce();
    expect(sesiones.invalidarTodas).toHaveBeenCalledWith(7, 'cambio_contrasena');
  });

  it('RF-SEG-06-06: un correo inexistente no se distingue de una contraseña errónea', async () => {
    const servicio = new CredencialesService(construirUsuarioRepo(null), construirSesionService());
    await expect(servicio.verificarPorCorreo('nadie@pintuclic.com', 'x')).resolves.toBeNull();
  });

  it('CA-SEG-02-04: una cuenta no activa no autentica aunque la contraseña sea correcta', async () => {
    const plana = 'ContrasenaValida123';
    const credencial: CredencialUsuario = {
      idUsuario: 5,
      contrasena: await derivarContrasena(plana),
      estado: 'bloqueado',
    };
    const servicio = new CredencialesService(
      construirUsuarioRepo(credencial),
      construirSesionService(),
    );

    await expect(servicio.verificarPorCorreo('a@b.com', plana)).resolves.toBeNull();
  });

  it('autentica cuando la contraseña coincide y la cuenta está activa', async () => {
    const plana = 'ContrasenaValida123';
    const credencial: CredencialUsuario = {
      idUsuario: 5,
      contrasena: await derivarContrasena(plana),
      estado: 'activo',
    };
    const servicio = new CredencialesService(
      construirUsuarioRepo(credencial),
      construirSesionService(),
    );

    await expect(servicio.verificarPorCorreo('a@b.com', plana)).resolves.toBe(5);
  });
});
