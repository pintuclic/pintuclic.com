'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, PaintBucket } from 'lucide-react';
import { Alert, Button, Modal, Skeleton } from '@/core/components';
import { esColorMuyClaro } from '@/core/utils/color-muestra';
import type {
  ColorOfrecido,
  OfertaPublica,
  ProductoPublicoFicha,
  VariantePublica,
} from '../../dtos/m01-catalogo-productos.dto';
import { useFichaPublica } from '../../hooks/useFichaPublica';
import { imagenDeCompra, presentacionInicial, requiereColor, subtituloProducto } from '../../services/compra-rapida';
import { catalogoPublicoApi } from '../../services/consulta-publica-api';
import { textoRendimiento } from '../../services/rendimiento';
import { AgregarAlCarrito } from './AgregarAlCarrito';
import { MuestrasColor } from './MuestrasColor';
import { PrecioPresentacion, SelectorPresentacion } from './PresentacionProducto';
import { CartaColores } from './SelectorColorProducto';

export interface ImagenConColorProps {
  nombre: string;
  /** null = sin foto: se muestra el ícono de pintura. */
  url: string | null;
  color: ColorOfrecido | null;
  className?: string;
}

/**
 * La foto del producto; con un color elegido, sobre un panel de ese color (la misma muestra de la tarjeta del listado),
 * para ver el tono antes de agregarlo.
 */
export const ImagenConColor: React.FC<ImagenConColorProps> = ({ nombre, url, color, className = '' }) => (
  <div className={`relative flex items-center justify-center overflow-hidden rounded-card bg-neutral-lightest p-4 ${className}`}>
    {color !== null && (
      <div
        aria-hidden="true"
        data-muestra-color={color.hexadecimal}
        className={`absolute inset-x-5 top-[45%] bottom-4 rounded-card transition-colors duration-300 ${
          esColorMuyClaro(color.hexadecimal) ? 'ring-1 ring-inset ring-neutral-light' : ''
        }`}
        style={{ backgroundColor: color.hexadecimal }}
      />
    )}
    {url === null ? (
      <PaintBucket className="relative h-14 w-14 text-action" strokeWidth={1.75} aria-hidden="true" />
    ) : (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={url}
        alt={nombre}
        width={400}
        height={400}
        className={`relative h-full w-full object-contain ${color === null ? 'mix-blend-multiply' : 'drop-shadow-md'}`}
      />
    )}
  </div>
);

export interface PanelCompraRapidaProps {
  ficha: ProductoPublicoFicha;
  variante: VariantePublica | null;
  oferta: OfertaPublica | null;
  color: ColorOfrecido | null;
  onElegirVariante: (idVariante: number) => void;
  onElegirColor: (color: ColorOfrecido) => void;
  /** Cambia la ventana a la carta completa de colores. */
  onVerCarta: () => void;
}

/** Lo que se ve en la compra rápida cuando la ficha ya cargó: foto, precio, presentación, color y cantidad. */
export const PanelCompraRapida: React.FC<PanelCompraRapidaProps> = ({
  ficha,
  variante,
  oferta,
  color,
  onElegirVariante,
  onElegirColor,
  onVerCarta,
}) => {
  const idImagen = imagenDeCompra(ficha.imagenes, {
    idColor: color?.idColor ?? null,
    idVariante: variante?.idVariante ?? null,
  });

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="space-y-3">
        <ImagenConColor
          nombre={ficha.nombre}
          url={idImagen === null ? null : catalogoPublicoApi.urlImagen(idImagen, 'mediana')}
          color={color}
          className="h-60 md:h-80"
        />
        {ficha.descripcion !== null && (
          <p className="hidden font-sans text-sm text-neutral-dark md:block">{ficha.descripcion}</p>
        )}
      </div>

      <div className="min-w-0 space-y-5">
        {ficha.compraBloqueada && (
          <Alert variant="warning">Este combo está agotado por ahora y no se puede comprar.</Alert>
        )}

        {variante !== null && (
          <PrecioPresentacion
            variante={variante}
            oferta={oferta}
            rendimiento={textoRendimiento(variante.rendimiento, ficha.manos)}
            tamano="mediano"
          />
        )}

        {ficha.variantes.length > 0 ? (
          <SelectorPresentacion
            variantes={ficha.variantes}
            idElegida={variante?.idVariante ?? null}
            onElegir={onElegirVariante}
          />
        ) : (
          <Alert variant="info">Este producto no tiene presentaciones disponibles por ahora.</Alert>
        )}

        {requiereColor(ficha) && (
          <MuestrasColor idProducto={ficha.idProducto} elegido={color} onElegir={onElegirColor} onVerTodos={onVerCarta} />
        )}

        <div className="border-t border-neutral-light pt-4">
          <AgregarAlCarrito
            idVariante={variante?.idVariante ?? null}
            idColor={color?.idColor ?? null}
            requiereColor={requiereColor(ficha)}
            bloqueado={ficha.compraBloqueada || variante?.compraBloqueada === true}
          />
        </div>

        <Link
          href={`/productos/${ficha.idProducto}`}
          className="inline-flex items-center gap-1.5 rounded-btn font-title text-sm font-medium text-action hover:text-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
        >
          Ver todos los detalles del producto
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
};

const VentanaCompraRapida: React.FC<{ idProducto: number; onClose: () => void }> = ({ idProducto, onClose }) => {
  const { estado, variante, elegirVariante, color, elegirColor, oferta } = useFichaPublica(
    idProducto,
    presentacionInicial,
  );
  const [vista, setVista] = useState<'compra' | 'carta'>('compra');
  const ficha = estado.tipo === 'lista' ? estado.ficha : null;

  let contenido: React.ReactNode;
  if (estado.tipo === 'cargando') {
    contenido = (
      <div className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]" aria-busy="true">
        <Skeleton className="h-60 md:h-80" rounded="card" />
        <div className="space-y-4">
          <Skeleton className="h-9 w-1/2" rounded="btn" />
          <Skeleton className="h-11 w-3/4" rounded="btn" />
          <Skeleton className="h-24" rounded="card" />
          <Skeleton className="h-11" rounded="btn" />
        </div>
      </div>
    );
  } else if (estado.tipo === 'no_disponible') {
    contenido = <Alert variant="info">Este producto ya no está disponible.</Alert>;
  } else if (estado.tipo === 'error') {
    contenido = <Alert variant="error">{estado.mensaje}</Alert>;
  } else if (vista === 'carta') {
    contenido = (
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
          onClick={() => setVista('compra')}
        >
          Volver
        </Button>
        <CartaColores
          idProducto={estado.ficha.idProducto}
          elegido={color}
          onElegir={(c) => {
            elegirColor(c);
            setVista('compra');
          }}
        />
      </div>
    );
  } else {
    contenido = (
      <PanelCompraRapida
        ficha={estado.ficha}
        variante={variante}
        oferta={oferta}
        color={color}
        onElegirVariante={elegirVariante}
        onElegirColor={elegirColor}
        onVerCarta={() => setVista('carta')}
      />
    );
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={ficha?.nombre ?? 'Agregar al carrito'}
      subtitle={ficha === null ? undefined : vista === 'carta' ? 'Elige el color para tu producto.' : subtituloProducto(ficha)}
      size="xl"
    >
      {contenido}
    </Modal>
  );
};

export interface CompraRapidaModalProps {
  /** El producto de la tarjeta; null = ventana cerrada. */
  idProducto: number | null;
  onClose: () => void;
}

/**
 * U8: compra rápida desde una tarjeta del listado. Elige presentación, color y cantidad sin salir de la página y
 * agrega con el mismo servicio de la ficha. El color no viene elegido: lo escoge el cliente.
 */
export const CompraRapidaModal: React.FC<CompraRapidaModalProps> = ({ idProducto, onClose }) =>
  idProducto === null ? null : <VentanaCompraRapida key={idProducto} idProducto={idProducto} onClose={onClose} />;
