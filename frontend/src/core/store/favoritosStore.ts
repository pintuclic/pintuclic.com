import { create } from 'zustand';
import { CLAVE_FAVORITOS, alternarFavorito, leerFavoritos } from '../utils/favoritos';

interface FavoritosState {
  /** Productos guardados, el más reciente primero. */
  ids: ReadonlyArray<number>;
  /** Lee los favoritos del navegador y sigue los cambios de otras pestañas; devuelve cómo dejar de seguirlos. */
  iniciar: () => () => void;
  alternar: (idProducto: number) => void;
}

function guardar(ids: ReadonlyArray<number>): void {
  try {
    window.localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify(ids));
  } catch {
    // Sin almacenamiento (modo privado, cuota) los favoritos viven solo mientras la página esté abierta.
  }
}

function leer(): number[] {
  try {
    return leerFavoritos(window.localStorage.getItem(CLAVE_FAVORITOS));
  } catch {
    return [];
  }
}

/**
 * Favoritos: los productos que la persona marcó con la estrella. Se guardan en el navegador (`localStorage`), así que no
 * piden iniciar sesión pero tampoco viajan entre dispositivos.
 */
export const useFavoritosStore = create<FavoritosState>((set, get) => ({
  ids: [],
  iniciar: () => {
    set({ ids: leer() });
    const alCambiarOtraPestana = (e: StorageEvent): void => {
      if (e.key === CLAVE_FAVORITOS || e.key === null) set({ ids: leer() });
    };
    window.addEventListener('storage', alCambiarOtraPestana);
    return () => window.removeEventListener('storage', alCambiarOtraPestana);
  },
  alternar: (idProducto) => {
    const siguiente = alternarFavorito(get().ids, idProducto);
    set({ ids: siguiente });
    guardar(siguiente);
  },
}));
