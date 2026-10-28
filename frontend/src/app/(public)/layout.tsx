import type { ReactNode } from 'react';
import { EncabezadoFijo, Header } from '@/core/components';
import { PieDePagina } from '@/modules/m16-contenido/components/publico/PieDePagina';
import { AsistenteFlotante } from '@/modules/m03-asesoria/components/publico/AsistenteFlotante';
import { SesionBootstrap } from '@/modules/m04-cuentas/components/sesion/SesionBootstrap';
import { CarritoLateral } from '@/modules/m05-carrito/components/CarritoLateral';
import { BarraSuperior } from './_components/BarraSuperior';
import { FavoritosBootstrap } from './_components/FavoritosBootstrap';
import { footer, header } from './_data/shell.content';

/**
 * Estructura común de las páginas públicas: cabecera fija (franja informativa que se esconde al bajar y vuelve al subir),
 * contenido y pie.
 * Incluye el enlace "Saltar al contenido" para navegación por teclado (WCAG 2.4.1).
 * `modal` es el slot paralelo `@modal`: login y registro abiertos sobre la página actual.
 * `CarritoLateral` es el panel del carrito (M05 · L1): uno solo para todas las páginas públicas.
 */
export default function PublicLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  return (
    <>
      <a
        href="#contenido"
        className="sr-only rounded-btn bg-action px-4 py-2 font-title text-sm font-medium text-neutral-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:outline-none focus:ring-2 focus:ring-action/50"
      >
        Saltar al contenido
      </a>
      <EncabezadoFijo franja={<BarraSuperior />}>
        <Header {...header} />
      </EncabezadoFijo>
      <main id="contenido" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
      <PieDePagina {...footer} />
      {modal}
      <CarritoLateral />
      {/*
        M03 · HU-ASE-05: el asistente vive aquí, no en una página, para que el botón redondo
        siga en pantalla al navegar y la conversación no se pierda entre vistas. Es M03 quien
        decide si se dibuja: sin servicio de IA, no pinta nada.
      */}
      <AsistenteFlotante />
      <SesionBootstrap />
      <FavoritosBootstrap />
    </>
  );
}
