import { Award, CreditCard, ShieldCheck, Truck, type LucideIcon } from 'lucide-react';
import { trustItems, type TrustIcon } from '../_data/home.content';

const ICONOS: Record<TrustIcon, LucideIcon> = {
  seguridad: ShieldCheck,
  calidad: Award,
  envio: Truck,
  pagos: CreditCard,
};

/** Franja de confianza con los 4 pilares (UI Spec §4.1, punto 3). */
export function TrustStrip() {
  return (
    <section aria-label="Por qué comprar en Pintu Clic">
      <ul className="grid grid-cols-1 gap-4 rounded-card border border-neutral-light bg-neutral-white px-4 py-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-neutral-light">
        {trustItems.map((item) => {
          const Icono = ICONOS[item.icon];
          return (
            <li key={item.title} className="flex items-center gap-4 lg:justify-center lg:px-4">
              <Icono className="h-7 w-7 shrink-0 text-corporate" strokeWidth={1.75} aria-hidden="true" />
              <p className="flex flex-col leading-tight">
                <span className="font-title text-sm font-semibold text-neutral-black">{item.title}</span>
                <span className="font-sans text-xs text-neutral-medium">{item.text}</span>
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
