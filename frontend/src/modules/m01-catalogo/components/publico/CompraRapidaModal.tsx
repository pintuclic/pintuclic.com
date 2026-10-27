'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, PaintBucket } from 'lucide-react';
import { Alert, Button, Modal, Skeleton } from '@/core/components';
import type {
  ColorOfrecido,
  OfertaPublica,
  ProductoPublicoFicha,
  VariantePublica,
} from '../../dtos/m01-catalogo-productos.dto';
import { useFichaPublica } from '../../hooks/useFichaPublica';
import { presentacionInicial, requiereColor, subtituloProducto } from '../../services/compra-rapida';
import { catalogoPublicoApi } from '../../services/consulta-publica-api';
import { imagenParaSeleccion } from '../../services/galeria';
import { textoRendimiento } from '../../services/rendimiento';
import { AgregarAlCarrito } from './AgregarAlCarrito';
import { PrecioPresentacion, SelectorPresentacion } from './PresentacionProducto';
import { CartaColores, ColorProducto } from './SelectorColorProducto';

export interface PanelCompraRapidaProps {
  ficha: ProductoPublicoFicha;
  variante: VariantePublica | null;
  oferta: OfertaPublica | null;
  color: ColorOfrecido | null;
  onElegirVariante: (idVariante: number) => void;
  onElegirColor: (color: ColorOfrecido) => void;
  /** Cambia la ventana a la carta de colores. */
  onVerCarta: () => void;
}

/** Lo que se ve en la compra rápida cuando la ficha ya cargó: imagen, precio, presentación, color y cantidad. */
export const PanelCompraRapida: React.FC<PanelCompraRapidaProps> = ({
  ficha,
  variante,
  oferta,
  color,
  onElegirVariante,
  onElegirColor,
  onVerCarta,
}) => {
  const idImagen = imagenParaSeleccion(ficha.imagenes, {
    idColor: color?.idColor ?? null,
    idVariante: variante?.idVariante ?? null,
  });

  return (
    <div className="grid gap-5 sm:grid-cols-[11rem_1fr]">
      <div className="flex h-44 items-center justify-center rounded-card bg-neutral-lightest p-3 sm:h-52">
        {idImagen === null ? (
          <PaintBucket className="h-12 w-12 text-action" strokeWidth={1.75} aria-hidden="true" />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={catalogoPublicoApi.urlImagen(idImagen, 'mediana')}
            alt={ficha.nombre}
            width={300}
            height={300}
            className="h-full w-full object-contain mix-blend-multiply"
          />
        )}
      </div>

      <div className="min-w-0 space-y-4">
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
          <ColorProducto idProducto={ficha.idProducto} elegido={color} onElegir={onElegirColor} onVerCarta={onVerCarta} />
        )}

        <AgregarAlCarrito
          idVariante={variante?.idVariante ?? null}
          idColor={color?.idColor ?? null}
          requiereColor={requiereColor(ficha)}
          bloqueado={ficha.compraBloqueada || variante?.compraBloqueada === true}
        />

        <Link
          href={`/productos/${ficha.idProducto}`}
          className="inline-block rounded-btn font-title text-sm font-medium text-action hover:text-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
        >
          Ver ficha completa
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
      <div className="grid gap-5 sm:grid-cols-[11rem_1fr]" aria-busy="true">
        <Skeleton className="h-44 sm:h-52" rounded="card" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-1/2" rounded="btn" />
          <Skeleton className="h-11 w-3/4" rounded="btn" />
          <Skeleton className="h-20" rounded="card" />
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
      size="lg"
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
