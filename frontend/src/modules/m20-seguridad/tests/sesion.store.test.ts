import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/core/store/authStore';
import type { UsuarioAutenticado } from '@/core/types/usuario.type';

/** HU-SEG-02 — Estado de sesión del cliente. */

const USUARIO: UsuarioAutenticado = {
  idUsuario: 42,
  correo: 'cliente@pintuclic.com',
  nombre: 'Cliente de Prueba',
  tipo: 'normal',
};

describe('HU-SEG-02 · Store de sesión', () => {
  beforeEach(() => {
    useAuthStore.setState({ usuario: null, destinoPendiente: null });
  });

  it('ADR-005: el store NO guarda ningún token', () => {
    useAuthStore.getState().establecerUsuario(USUARIO);
    const estado: Record<string, unknown> = { ...useAuthStore.getState() };

    const claves = Object.keys(estado).join(' ').toLowerCase();
    expect(claves).not.toMatch(/token|jwt|bearer|sid/);
  });

  it('CA-SEG-02-05: el store no cachea permisos', () => {
    useAuthStore.getState().establecerUsuario(USUARIO);
    const usuario = useAuthStore.getState().usuario;

    // Una copia de los permisos aquí sobreviviría a su revocación.
    expect(usuario).not.toHaveProperty('permisos');
  });

  it('CA-SEG-02-06: el destino pretendido se recuerda y se consume una sola vez', () => {
    const store = useAuthStore.getState();
    store.recordarDestino('/perfil/mis-datos?seccion=privacidad');

    expect(useAuthStore.getState().destinoPendiente).toBe('/perfil/mis-datos?seccion=privacidad');

    const primero = useAuthStore.getState().consumirDestino();
    expect(primero).toBe('/perfil/mis-datos?seccion=privacidad');

    // Consumirlo lo limpia: una segunda re-autenticación no debe reusar el destino viejo.
    expect(useAuthStore.getState().consumirDestino()).toBeNull();
  });

  it('limpiar la sesión olvida al usuario', () => {
    useAuthStore.getState().establecerUsuario(USUARIO);
    useAuthStore.getState().limpiarSesion();
    expect(useAuthStore.getState().usuario).toBeNull();
  });
});
