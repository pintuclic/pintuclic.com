'use client';

import { useState } from 'react';
import type { ProductoCalculable } from '../../interfaces/asesoria.interface';
import { CalculadoraPintura } from './CalculadoraPintura';
import { SelectorProductoCalculable } from './SelectorProductoCalculable';

/**
 * Calculadora general (M03 · D5, K10): la de la landing y la de `/asesoria`.
 *
 * Se diferencia de la de la ficha en la ENTRADA, no en el cálculo: aquí la persona escoge
 * cualquier producto con rendimiento y luego calcula igual, en los dos sentidos. El motor es
 * el mismo componente `CalculadoraPintura`.
 *
 * No trae contenedor ni encabezado de página: la pantalla que la monta aporta su propio `h1`
 * y así no hay dos en la misma página.
 */
export function CalculadoraGeneralView() {
  const [elegido, setElegido] = useState<ProductoCalculable | null>(null);

  return (
    <div className="space-y-6">
      <p className="font-sans text-sm text-neutral-medium">
        Elige la pintura, dinos cuántos metros cuadrados vas a pintar y cuántas manos vas a dar, y
        te decimos cuánto comprar. También funciona al revés: si ya tienes la pintura, te decimos
        cuánto alcanza a cubrir.
      </p>

      <div className="rounded-lg border border-neutral-light bg-white p-4 sm:p-6">
        <SelectorProductoCalculable elegido={elegido} onElegir={setElegido} />
      </div>

      {elegido === null ? (
        <p className="font-sans text-sm text-neutral-medium">
          Busca una pintura arriba para empezar.
        </p>
      ) : (
        <CalculadoraPintura idProducto={elegido.idProducto} />
      )}
    </div>
  );
}
