'use client';

import { ShoppingCart } from 'lucide-react';
import { BareButton } from '@/core/components';
import { useResumenCarrito } from '@/core/hooks/useResumenCarrito';

/**
 * La pestaña que queda en el borde derecho cuando se cierra el panel del carrito: un toque lo vuelve a desplegar. Sin
 * ella el panel desaparecía hasta que se agregara otro producto. Solo se pinta con productos en el carrito.
 */
export function PestanaCarrito({ onAbrir }: { onAbrir: () => void }) {
  const resumen = useResumenCarrito();
  const cantidad = resumen?.cantidadItems ?? 0;
  if (cantidad === 0) return null;

  return (
    <BareButton
      data-testid="pestana-carrito"
      aria-label={`Abrir el carrito, ${cantidad} ${cantidad === 1 ? 'producto' : 'productos'}`}
      onClick={onAbrir}
      className="fixed right-0 top-[42%] z-40 flex min-h-12 w-11 flex-col items-center justify-center gap-1 rounded-l-card bg-corporate py-3 text-neutral-white shadow-card transition-transform hover:-translate-x-0.5 motion-reduce:transition-none"
    >
      <ShoppingCart className="h-5 w-5" aria-hidden="true" />
      <span aria-hidden="true" className="rounded-full bg-danger px-1.5 text-[11px] font-bold leading-4">
        {cantidad}
      </span>
    </BareButton>
  );
}
