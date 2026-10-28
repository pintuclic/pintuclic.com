'use client';

import { useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { abrirCarritoLateral } from '@/core/utils/eventos-carrito';
import { agregarAlCarrito, mensajeErrorCarrito } from '@/modules/m01-catalogo/services/carrito-publico';
import { catalogoPublicoApi } from '@/modules/m01-catalogo/services/consulta-publica-api';
import type { ResultadoBusqueda } from '../dtos/busqueda.dto';
import { debeIrALaFicha, presentacionDeTarjeta, textoAgregado } from '../services/agregar-desde-tarjeta';
import { enlaceDeResultado } from '../services/tarjeta-resultado';

/**
 * V3 y V4: el botón del carrito de una tarjeta. Agrega 1 unidad en el color de la tarjeta y en la presentación de su
 * precio, con el mismo servicio y los mismos mensajes que la ficha, y abre el panel lateral del carrito (M05 · L2). Si
 * no se puede agregar directo, lleva a la ficha en su color. Un segundo clic mientras agrega no hace nada.
 */
export function useAgregarDesdeTarjeta(): (p: ResultadoBusqueda) => void {
  const router = useRouter();
  const enCurso = useRef(new Set<number>());

  return useCallback(
    (p: ResultadoBusqueda) => {
      if (enCurso.current.has(p.idProducto)) return;
      const irALaFicha = (): void => router.push(enlaceDeResultado(p));
      if (debeIrALaFicha(p)) {
        irALaFicha();
        return;
      }
      enCurso.current.add(p.idProducto);
      void (async () => {
        try {
          const ficha = await catalogoPublicoApi.ficha(p.idProducto);
          const variante = presentacionDeTarjeta(ficha.variantes);
          if (variante === null) {
            irALaFicha();
            return;
          }
          try {
            await agregarAlCarrito(variante.idVariante, p.colorMuestra?.idColor ?? null, 1);
            if (!abrirCarritoLateral({ tipo: 'agregado', texto: textoAgregado(p, variante) })) router.push('/carrito');
          } catch (err: unknown) {
            if (!abrirCarritoLateral({ tipo: 'error', texto: mensajeErrorCarrito(err) })) irALaFicha();
          }
        } catch {
          // Si no se pudo leer la ficha, en la ficha misma el cliente ve qué pasa y puede elegir.
          irALaFicha();
        } finally {
          enCurso.current.delete(p.idProducto);
        }
      })();
    },
    [router],
  );
}
