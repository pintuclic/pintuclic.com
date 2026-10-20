import { create } from 'zustand';
import type { UsuarioAutenticado } from '@/core/types/usuario.type';

interface AuthState {
  user: UsuarioAutenticado | null;
  accessToken: string | null;
  setAuth: (user: UsuarioAutenticado, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  clearAuth: () => set({ user: null, accessToken: null }),
}));
