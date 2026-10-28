'use client';

import { useEffect } from 'react';
import { useFavoritosStore } from '@/core/store/favoritosStore';

/** Carga los favoritos guardados en el navegador al abrir la tienda. No pinta nada. */
export function FavoritosBootstrap() {
  const iniciar = useFavoritosStore((estado) => estado.iniciar);
  useEffect(() => iniciar(), [iniciar]);
  return null;
}
