import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CheckoutView } from '@/modules/m07-checkout/components/CheckoutView';

export const metadata: Metadata = {
  title: 'Finaliza tu compra · Pintu Clic',
  robots: { index: false, follow: false },
};

/** M07 · Pago con Nequi o en la página de Wompi (tarjeta, PSE, Daviplata y más). El cupón llega en la dirección desde el carrito; la sesión la exige el servidor (R1). */
export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutView />
    </Suspense>
  );
}
