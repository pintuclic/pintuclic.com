import type { Metadata } from 'next';
import { CarritoView } from '@/modules/m05-carrito/components/CarritoView';

export const metadata: Metadata = {
  title: 'Tu carrito · Pintu Clic',
  robots: { index: false, follow: false },
};

/** M05 · Carrito de compras. La ruta es exactamente /carrito (la usa también el formulario de contacto de M15). */
export default function CarritoPage() {
  return <CarritoView />;
}
