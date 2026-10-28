'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { Alert, Button, ButtonLink, Drawer, Skeleton } from '@/core/components';
import {
  avisoDeApertura,
  EVENTO_ABRIR_CARRITO,
  type AvisoCarritoLateral,
} from '@/core/utils/eventos-carrito';
import { formatCOP } from '@/core/utils/moneda';
import { BotonContactoDirecto } from '@/modules/m15-atencion/components/publico/BotonContactoDirecto';
import { useCarrito } from '../hooks/useCarrito';
import { referenciaWhatsapp } from '../services/textos-carrito';
import { LineaCarritoCompacta } from './LineaCarritoCompacta';

interface ContenidoProps {
  aviso: AvisoCarritoLateral | null;
  onCerrar: () => void;
}

/** Lo que va dentro del panel (cuerpo, subtítulo y pie): vive mientras el panel está abierto, así cada apertura lee el carrito recién cambiado. */
function useContenidoCarritoLateral({ aviso, onCerrar }: ContenidoProps) {
  const c = useCarrito();
  const carrito = c.carrito;
  const resumen = carrito?.calculo?.resumen ?? null;
  const vacio = carrito !== null && carrito.lineas.length === 0;
  const cantidad = carrito?.cantidadItems ?? 0;

  const pie =
    carrito === null || vacio ? undefined : (
      <div className="space-y-3 bg-corporate px-5 py-4 text-neutral-white">
        {resumen !== null && (
          <dl className="space-y-1 text-sm">
            {resumen.descuentoTotal > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-white/80">Ahorras</dt>
                <dd className="font-semibold">−{formatCOP(resumen.descuentoTotal)}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-4">
              <dt className="font-title text-base font-semibold">Total</dt>
              <dd className="font-title text-2xl font-bold">{formatCOP(resumen.total)}</dd>
            </div>
            <p className="text-xs text-neutral-white/75">IVA incluido. El envío se calcula al finalizar la compra.</p>
          </dl>
        )}
        <div className="grid gap-2">
          <ButtonLink href="/carrito" variant="primary-conversion" fullWidth onClick={onCerrar}>
            Ver carrito
          </ButtonLink>
          <Button variant="outline-light" fullWidth onClick={onCerrar}>
            Seguir comprando
          </Button>
        </div>
      </div>
    );

  return {
    subtitulo: carrito === null || vacio ? undefined : `${cantidad} ${cantidad === 1 ? 'producto' : 'productos'}`,
    pie,
    cuerpo: (
      <div className="space-y-4" aria-live="polite">
        {aviso !== null && (
          <Alert variant={aviso.tipo === 'agregado' ? 'success' : 'error'}>{aviso.texto}</Alert>
        )}
        {c.error !== null && <Alert variant="error">{c.error}</Alert>}

        {c.cargando && carrito === null ? (
          <div className="space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : carrito === null ? null : vacio ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-subaction">
              <ShoppingCart aria-hidden className="h-8 w-8 text-action" />
            </span>
            <p className="font-title text-base font-semibold text-neutral-black">Tu carrito está vacío</p>
            <p className="text-sm text-neutral-dark">Explora el catálogo y agrega lo que necesitas para tu proyecto.</p>
            <ButtonLink href="/productos" onClick={onCerrar}>
              Ver productos
            </ButtonLink>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-neutral-light" aria-label="Productos del carrito">
              {carrito.lineas.map((linea) => (
                <LineaCarritoCompacta
                  key={linea.idLinea}
                  linea={linea}
                  ocupada={c.ocupado?.tipo === 'linea' && c.ocupado.idLinea === linea.idLinea}
                  onCambiarCantidad={(n) => void c.cambiarCantidad(linea.idLinea, n)}
                  onQuitar={() => void c.quitar(linea.idLinea)}
                />
              ))}
            </ul>
            <div className="rounded-card bg-neutral-lightest p-4">
              <p className="mb-2 text-sm text-neutral-dark">¿Necesitas ayuda? Un asesor puede revisar tu compra.</p>
              <BotonContactoDirecto referencia={referenciaWhatsapp(cantidad)} />
            </div>
          </>
        )}
      </div>
    ),
  };
}

/** El contenido como componente, para que su `useCarrito` viva solo mientras el panel está abierto. */
function PanelAbierto({ aviso, onCerrar }: ContenidoProps) {
  const { subtitulo, pie, cuerpo } = useContenidoCarritoLateral({ aviso, onCerrar });
  return (
    <Drawer isOpen onClose={onCerrar} title="Tu carrito" subtitle={subtitulo} footer={pie}>
      {cuerpo}
    </Drawer>
  );
}

/**
 * Panel lateral del carrito (contrato M05 · L1–L7, UI §4.7 Variante A). Se monta una vez en el layout público y se abre
 * con el aviso `pc:abrir-carrito` al agregar desde una tarjeta (con su mensaje); el ícono del encabezado lleva a /carrito.
 * Al cambiar de página se cierra.
 */
export function CarritoLateral() {
  const pathname = usePathname();
  const [apertura, setApertura] = useState<{ vez: number; aviso: AvisoCarritoLateral | null } | null>(null);

  useEffect(() => {
    const alPedirApertura = (evento: Event): void => {
      // Reclama el aviso: quien lo envió sabe que hay panel y no navega a /carrito.
      evento.preventDefault();
      const aviso = avisoDeApertura(evento);
      setApertura((previa) => ({ vez: (previa?.vez ?? 0) + 1, aviso }));
    };
    window.addEventListener(EVENTO_ABRIR_CARRITO, alPedirApertura);
    return () => window.removeEventListener(EVENTO_ABRIR_CARRITO, alPedirApertura);
  }, []);

  useEffect(() => {
    setApertura(null);
  }, [pathname]);

  if (apertura === null) return null;
  return <PanelAbierto key={apertura.vez} aviso={apertura.aviso} onCerrar={() => setApertura(null)} />;
}
