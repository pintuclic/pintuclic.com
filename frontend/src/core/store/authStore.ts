import { create } from 'zustand';
import type { UsuarioAutenticado } from '@/core/types/usuario.type';

/**
 * Estado de sesión del cliente.
 *
 * ⚠️ ADR-005 — Aquí NO vive ningún token. El identificador de sesión viaja en
 * una cookie `HttpOnly`, inaccesible para el código de la página
 * (RNF-SEG-02-01). Este store solo recuerda quién es el usuario para pintar la
 * interfaz; la autoridad sobre la sesión está siempre en el servidor.
 */
interface AuthState {
  usuario: UsuarioAutenticado | null;
  /** Destino que el usuario pretendía alcanzar cuando expiró su sesión (CA-SEG-02-06). */
  destinoPendiente: string | null;
  establecerUsuario: (usuario: UsuarioAutenticado) => void;
  limpiarSesion: () => void;
  recordarDestino: (ruta: string) => void;
  consumirDestino: () => string | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  usuario: null,
  destinoPendiente: null,
  establecerUsuario: (usuario) => set({ usuario }),
  limpiarSesion: () => set({ usuario: null }),
  recordarDestino: (ruta) => set({ destinoPendiente: ruta }),
  consumirDestino: () => {
    const destino = get().destinoPendiente;
    set({ destinoPendiente: null });
    return destino;
  },
}));
