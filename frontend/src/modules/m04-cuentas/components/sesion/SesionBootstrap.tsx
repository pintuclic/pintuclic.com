'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/core/store/authStore';
import { obtenerPerfil } from '../../services/cuentas.service';

/**
 * Hidrata `useAuthStore` al cargar la página (ADR-005): la cookie `HttpOnly` no
 * es legible desde el navegador, así que se pregunta al servidor quién es el
 * usuario. Un 401 significa visitante anónimo y no es un error que mostrar.
 */
export function SesionBootstrap() {
  const establecerUsuario = useAuthStore((s) => s.establecerUsuario);

  useEffect(() => {
    let vigente = true;
    obtenerPerfil()
      .then(({ idUsuario, correo, nombre, tipo, esAdmin }) => {
        if (vigente) {
          establecerUsuario({
            idUsuario,
            correo,
            nombre,
            tipo,
            ...(esAdmin !== undefined ? { esAdmin } : {}),
          });
        }
      })
      .catch(() => {
        // Anónimo o API caída: la interfaz sigue como visitante; cada vista
        // protegida vuelve a comprobar la sesión por su cuenta.
      });
    return () => {
      vigente = false;
    };
  }, [establecerUsuario]);

  return null;
}
