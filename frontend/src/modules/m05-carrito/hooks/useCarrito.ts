'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/core/store/authStore';
import { avisarCarritoActualizado } from '@/core/utils/eventos-carrito';
import type { CambioRevalidacion, Carrito } from '../dtos/m05-carrito.dto';
import { carritoApi, mensajeDeError } from '../services/carrito-api';
import { pantallaDe } from '../services/textos-carrito';

/** C8: el cupón lo conserva la pantalla (también al ir a iniciar sesión y volver). */
const CLAVE_CUPON = 'pc_carrito_cupon';

function leerCupon(): string | null {
  try {
    return window.sessionStorage.getItem(CLAVE_CUPON);
  } catch {
    return null;
  }
}

function guardarCupon(codigo: string | null): void {
  try {
    if (codigo === null) window.sessionStorage.removeItem(CLAVE_CUPON);
    else window.sessionStorage.setItem(CLAVE_CUPON, codigo);
  } catch {
    // Sin almacenamiento del navegador el cupón dura lo que dure la página.
  }
}

/** Qué acción está en curso: una línea, el cupón o "continuar". */
export type Ocupado = { tipo: 'linea'; idLinea: number } | { tipo: 'cupon' } | { tipo: 'continuar' } | null;

export interface EstadoCarrito {
  carrito: Carrito | null;
  cargando: boolean;
  ocupado: Ocupado;
  error: string | null;
  codigoCupon: string | null;
  /** C11: lo que cambió al revalidar. */
  cambios: readonly CambioRevalidacion[];
}

export function useCarrito() {
  const router = useRouter();
  const usuario = useAuthStore((s) => s.usuario);
  const [estado, setEstado] = useState<EstadoCarrito>({
    carrito: null,
    cargando: true,
    ocupado: null,
    error: null,
    codigoCupon: null,
    cambios: [],
  });
  const cupon = useRef<string | null>(null);

  const ejecutar = useCallback(
    async (ocupado: Ocupado, accion: () => Promise<Carrito>, respaldo: string): Promise<void> => {
      setEstado((e) => ({ ...e, ocupado, error: null, cambios: [] }));
      try {
        const carrito = await accion();
        setEstado((e) => ({ ...e, carrito, ocupado: null, cargando: false }));
        // La cabecera vuelve a leer la cantidad y el total.
        avisarCarritoActualizado();
      } catch (err: unknown) {
        setEstado((e) => ({ ...e, ocupado: null, cargando: false, error: mensajeDeError(err, respaldo) }));
      }
    },
    [],
  );

  // La sesión decide de quién es el carrito: al entrar o salir se vuelve a leer (C9).
  useEffect(() => {
    cupon.current = leerCupon();
    setEstado((e) => ({ ...e, codigoCupon: cupon.current, cargando: true }));
    void ejecutar(null, () => carritoApi.consultar(cupon.current), 'No fue posible cargar tu carrito. Intenta de nuevo.');
  }, [ejecutar, usuario?.idUsuario]);

  const cambiarCantidad = useCallback(
    (idLinea: number, cantidad: number) =>
      ejecutar(
        { tipo: 'linea', idLinea },
        () => carritoApi.cambiarCantidad(idLinea, cantidad, cupon.current),
        'No fue posible cambiar la cantidad.',
      ),
    [ejecutar],
  );

  const quitar = useCallback(
    (idLinea: number) =>
      ejecutar({ tipo: 'linea', idLinea }, () => carritoApi.quitar(idLinea, cupon.current), 'No fue posible quitar el producto.'),
    [ejecutar],
  );

  const aplicarCupon = useCallback(
    (codigo: string | null) => {
      cupon.current = codigo;
      guardarCupon(codigo);
      setEstado((e) => ({ ...e, codigoCupon: codigo }));
      return ejecutar({ tipo: 'cupon' }, () => carritoApi.consultar(codigo), 'No fue posible aplicar el código.');
    },
    [ejecutar],
  );

  /** HU-CAR-05: revalida; sin sesión pide iniciarla y vuelve al carrito (RF-CAR-01-02). Si todo sigue igual, al pago (M07). */
  const continuar = useCallback(async (): Promise<void> => {
    const actual = estado.carrito;
    if (actual === null) return;
    setEstado((e) => ({ ...e, ocupado: { tipo: 'continuar' }, error: null, cambios: [] }));
    try {
      const r = await carritoApi.revalidar(pantallaDe(actual, cupon.current));
      if (!r.puedeContinuar) {
        setEstado((e) => ({ ...e, carrito: r.carrito, ocupado: null, cambios: r.cambios }));
        return;
      }
      if (usuario === null) {
        setEstado((e) => ({ ...e, carrito: r.carrito, ocupado: null }));
        router.push(`/login?destino=${encodeURIComponent('/carrito')}`);
        return;
      }
      setEstado((e) => ({ ...e, carrito: r.carrito, ocupado: null }));
      // El cupón viaja en la dirección: el checkout vuelve a pedir el carrito con él (C8).
      router.push(cupon.current === null ? '/checkout' : `/checkout?cupon=${encodeURIComponent(cupon.current)}`);
    } catch (err: unknown) {
      setEstado((e) => ({ ...e, ocupado: null, error: mensajeDeError(err, 'No fue posible revisar tu carrito.') }));
    }
  }, [estado.carrito, router, usuario]);

  return { ...estado, haySesion: usuario !== null, cambiarCantidad, quitar, aplicarCupon, continuar };
}
