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
      <ul className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-card border border-neutral-light bg-neutral-white px-3 py-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-neutral-light">
        {trustItems.map((item) => {
          const Icono = ICONOS[item.icon];
          return (
            <li key={item.title} className="flex items-center gap-2.5 lg:justify-center lg:px-3">
              <Icono className="h-5 w-5 shrink-0 text-corporate" strokeWidth={1.75} aria-hidden="true" />
              <p className="flex flex-col leading-tight">
                <span className="font-title text-[13px] font-semibold text-neutral-black">{item.title}</span>
                <span className="hidden font-sans text-xs text-neutral-medium sm:block">{item.text}</span>
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
