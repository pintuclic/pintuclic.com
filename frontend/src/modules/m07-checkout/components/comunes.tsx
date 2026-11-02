import Link from 'next/link';
import { ChevronLeft, ChevronRight, CreditCard, ShieldCheck, Smartphone } from 'lucide-react';
import { Badge, Button } from '@/core/components';
import { formatCOP } from '@/core/utils/moneda';
import type { EstadoSolicitud, MedioPago } from '../dtos/m07-checkout.dto';
import { ETIQUETA_ESTADO, FILTROS_ESTADO, VARIANTE_ESTADO, textoEnvio } from '../services/textos-checkout';

export function EstadoSolicitudBadge({ estado }: { estado: EstadoSolicitud }) {
  return <Badge variant={VARIANTE_ESTADO[estado]}>{ETIQUETA_ESTADO[estado]}</Badge>;
}

export interface LineaResumen {
  clave: string;
  nombre: string;
  detalle: string | null;
  colorHexadecimal: string | null;
  cantidad: number;
  subtotal: number;
}

interface ResumenCompraProps {
  lineas: readonly LineaResumen[];
  subtotal: number;
  descuento: number;
  envio: number | null;
  total: number;
  /** El botón de pagar u otra acción al pie. */
  children?: React.ReactNode;
}

/** Resumen de la compra (UI §4.7): líneas, descuentos, envío y total con IVA incluido. */
export function ResumenCompra({ lineas, subtotal, descuento, envio, total, children }: ResumenCompraProps) {
  return (
    <section aria-labelledby="titulo-resumen" className="space-y-4 rounded-card border border-neutral-light/70 bg-neutral-white p-5 shadow-card">
      <h2 id="titulo-resumen" className="font-title text-lg font-bold text-corporate">
        Resumen de tu compra
      </h2>
      <ul className="divide-y divide-neutral-light" aria-label="Productos">
        {lineas.map((l) => (
          <li key={l.clave} className="flex items-start justify-between gap-3 py-3 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-neutral-black">{l.nombre}</p>
              <p className="flex items-center gap-1.5 text-xs text-neutral-dark">
                {l.colorHexadecimal !== null && (
                  <span aria-hidden className="inline-block h-3 w-3 rounded-full border border-neutral-medium/40" style={{ backgroundColor: l.colorHexadecimal }} />
                )}
                {[l.detalle, `${l.cantidad} ${l.cantidad === 1 ? 'unidad' : 'unidades'}`].filter(Boolean).join(' · ')}
              </p>
            </div>
            <p className="shrink-0 font-title font-semibold text-neutral-black">{formatCOP(l.subtotal)}</p>
          </li>
        ))}
      </ul>
      <dl className="space-y-2 border-t border-neutral-light pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-neutral-dark">Subtotal</dt>
          <dd className="text-neutral-black">{formatCOP(subtotal)}</dd>
        </div>
        {descuento > 0 && (
          <div className="flex justify-between">
            <dt className="text-neutral-dark">Descuentos</dt>
            <dd className="font-semibold text-conversion-hover">−{formatCOP(descuento)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-neutral-dark">Envío</dt>
          <dd className="text-neutral-black">{envio === null ? 'Elige cómo recibirlo' : textoEnvio(envio, formatCOP)}</dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-neutral-light pt-3">
          <dt className="font-title text-base font-semibold text-neutral-black">Total</dt>
          <dd className="font-title text-2xl font-bold text-corporate">{formatCOP(total)}</dd>
        </div>
        <p className="text-xs text-neutral-medium">IVA incluido.</p>
      </dl>
      {children}
      <p className="flex items-center justify-center gap-1.5 text-xs text-neutral-medium">
        <ShieldCheck aria-hidden className="h-4 w-4 text-conversion" />
        Pago seguro a través de Wompi
      </p>
    </section>
  );
}

/** R19: Nequi directo o la página de pago de Wompi (tarjeta, PSE, Daviplata y más). */
export function SelectorMedioPago({ valor, onCambiar }: { valor: MedioPago; onCambiar: (m: MedioPago) => void }) {
  return (
    <div role="group" aria-label="Medio de pago" className="grid gap-3 sm:grid-cols-2">
      <Button
        type="button"
        variant="selection"
        selected={valor === 'nequi'}
        aria-pressed={valor === 'nequi'}
        onClick={() => onCambiar('nequi')}
        leftIcon={<Smartphone aria-hidden className="h-5 w-5" />}
      >
        Nequi
      </Button>
      <Button
        type="button"
        variant="selection"
        selected={valor === 'pagina_wompi'}
        aria-pressed={valor === 'pagina_wompi'}
        onClick={() => onCambiar('pagina_wompi')}
        leftIcon={<CreditCard aria-hidden className="h-5 w-5" />}
      >
        Tarjeta, PSE, Daviplata y más
      </Button>
    </div>
  );
}

/** Lo que verá el cliente al elegir la página de Wompi (R19). */
export function AvisoPaginaWompi() {
  return (
    <p className="rounded-input border border-neutral-light bg-neutral-lightest p-3 text-sm text-neutral-dark">
      Te llevaremos a la página segura de <span className="font-semibold">Wompi</span> para pagar con tarjeta de crédito o
      débito, PSE, Daviplata, Bancolombia y otros medios. Tus datos de pago los recibe Wompi, no Pintu Clic. Al terminar,
      vuelves a esta tienda.
    </p>
  );
}

/** Botón-píldora de los filtros del panel (estado y periodo). */
export function clasePildora(activo: boolean): string {
  return `inline-flex min-h-9 items-center rounded-full border px-3 font-title text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 ${
    activo
      ? 'border-action bg-action text-neutral-white'
      : 'border-neutral-light bg-neutral-white text-neutral-dark hover:border-action hover:text-action'
  }`;
}

export function FiltrosEstado({ actual, enlace }: { actual: EstadoSolicitud | null; enlace: (e: EstadoSolicitud | null) => string }) {
  return (
    <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
      {FILTROS_ESTADO.map((f) => {
        const activo = f.valor === actual;
        return (
          <Link
            key={f.etiqueta}
            href={enlace(f.valor)}
            aria-current={activo ? 'page' : undefined}
            className={clasePildora(activo)}
          >
            {f.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}

export function Paginacion({ pagina, totalPaginas, onCambiar }: { pagina: number; totalPaginas: number; onCambiar: (p: number) => void }) {
  if (totalPaginas <= 1) return null;
  return (
    <nav aria-label="Páginas" className="flex items-center justify-center gap-3">
      <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => onCambiar(pagina - 1)} leftIcon={<ChevronLeft aria-hidden className="h-4 w-4" />}>
        Anterior
      </Button>
      <span className="text-sm text-neutral-dark">
        Página {pagina} de {totalPaginas}
      </span>
      <Button variant="outline" size="sm" disabled={pagina >= totalPaginas} onClick={() => onCambiar(pagina + 1)} rightIcon={<ChevronRight aria-hidden className="h-4 w-4" />}>
        Siguiente
      </Button>
    </nav>
  );
}
