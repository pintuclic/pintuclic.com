'use client';

import React from 'react';
import Link from 'next/link';
import { Alert, Badge, Container, Skeleton } from '@/core/components';
import { BotonContactoDirecto } from '@/modules/m15-atencion/components/publico/BotonContactoDirecto';
import { useFichaPublica } from '../../hooks/useFichaPublica';
import { requiereColor } from '../../services/compra-rapida';
import { catalogoPublicoApi } from '../../services/consulta-publica-api';
import { imagenParaSeleccion } from '../../services/galeria';
import { textoRendimiento } from '../../services/rendimiento';
import { AgregarAlCarrito } from './AgregarAlCarrito';
import { EspacioPublicitario } from '@/modules/m14-patrocinios/components/EspacioPublicitario';
import { ComplementariosProducto } from './ComplementariosProducto';
import { GaleriaProducto } from './GaleriaProducto';
import { PrecioPresentacion, SelectorPresentacion } from './PresentacionProducto';
import { ColorProducto } from './SelectorColorProducto';

const TIPOS_CALIDAD: Record<number, string> = { 1: 'Tipo 1 (gama alta)', 2: 'Tipo 2', 3: 'Tipo 3' };

export interface ProductoFichaViewProps {
  idProducto: number;
}

/** HU-CAT-06: ficha pública de un producto con presentaciones, rendimiento y selector de color. */
export const ProductoFichaView: React.FC<ProductoFichaViewProps> = ({ idProducto }) => {
  const { estado, variante, elegirVariante, color, elegirColor, oferta } = useFichaPublica(idProducto);

  if (estado.tipo === 'cargando') {
    return (
      <Container className="py-8">
        <Skeleton className="h-8 w-2/3" rounded="btn" />
        <Skeleton className="mt-6 h-96" rounded="card" />
      </Container>
    );
  }
  if (estado.tipo !== 'lista') {
    return (
      <Container className="py-12">
        <div className="mx-auto max-w-lg space-y-4 text-center">
          <h1 className="font-title text-2xl font-bold text-corporate">Este producto no está disponible</h1>
          <p className="font-sans text-sm text-neutral-medium">
            {estado.tipo === 'no_disponible'
              ? 'Puede que se haya retirado del catálogo o que aún no esté publicado.'
              : estado.mensaje}
          </p>
          <Link href="/productos" className="font-title text-sm font-medium text-action hover:text-action-hover">
            Volver al catálogo
          </Link>
        </div>
      </Container>
    );
  }

  const p = estado.ficha;
  const rendimiento = variante === null ? null : textoRendimiento(variante.rendimiento, p.manos);
  const ambientes = [p.usoInterior ? 'Interior' : null, p.usoExterior ? 'Exterior' : null].filter(
    (x): x is string => x !== null,
  );
  const datosTecnicos: Array<[string, string]> = [
    ...(p.tipoResina === null ? [] : ([['Tipo de resina', p.tipoResina]] as Array<[string, string]>)),
    ...(p.tipoCalidad === null
      ? []
      : ([['Calidad', TIPOS_CALIDAD[p.tipoCalidad] ?? `Tipo ${p.tipoCalidad}`]] as Array<[string, string]>)),
    ...(ambientes.length === 0 ? [] : ([['Ambiente', ambientes.join(' y ')]] as Array<[string, string]>)),
    ...(p.superficies.length === 0 ? [] : ([['Superficies', p.superficies.join(', ')]] as Array<[string, string]>)),
    ...p.caracteristicas.map((c): [string, string] => [c.nombre, c.valor]),
  ];

  return (
    <Container className="py-8">
      <nav aria-label="Ruta de navegación" className="mb-4 font-sans text-sm text-neutral-medium">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="hover:text-action">
              Inicio
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li>
            <Link href="/productos" className="hover:text-action">
              Productos
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li>{p.categoria}</li>
          <li aria-hidden="true">›</li>
          <li aria-current="page" className="text-neutral-dark">
            {p.nombre}
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <GaleriaProducto
          nombre={p.nombre}
          imagenes={p.imagenes.map((i) => ({
            idImagen: i.idImagen,
            url: catalogoPublicoApi.urlImagen(i.idImagen, 'mediana'),
            urlMiniatura: catalogoPublicoApi.urlImagen(i.idImagen, 'miniatura'),
          }))}
          idImagenEnfocada={imagenParaSeleccion(p.imagenes, {
            idColor: color?.idColor ?? null,
            idVariante: variante?.idVariante ?? null,
          })}
          imagenMedidaUrl={
            variante?.tieneImagenMedida === true ? catalogoPublicoApi.urlImagenMedida(variante.idMedida) : null
          }
          nombreMedida={variante?.medida ?? null}
        />

        <div className="space-y-6">
          <div>
            <p className="font-title text-xs uppercase tracking-wider text-neutral-medium">
              {p.marca}
              {p.linea !== null && ` · ${p.linea}`}
            </p>
            {p.esCombo && (
              <p className="mt-1">
                <Badge variant="action">Combo</Badge>
              </p>
            )}
            <h1 className="mt-1 font-title text-3xl font-bold text-neutral-black">{p.nombre}</h1>
            {p.descripcion !== null && <p className="mt-2 font-sans text-sm text-neutral-dark">{p.descripcion}</p>}
          </div>

          {p.compraBloqueada && (
            <Alert variant="warning">Este combo está agotado por ahora y no se puede comprar.</Alert>
          )}

          {variante !== null && <PrecioPresentacion variante={variante} oferta={oferta} rendimiento={rendimiento} />}

          {p.variantes.length > 0 ? (
            <SelectorPresentacion
              variantes={p.variantes}
              idElegida={variante?.idVariante ?? null}
              onElegir={elegirVariante}
            />
          ) : (
            <Alert variant="info">Este producto no tiene presentaciones disponibles por ahora.</Alert>
          )}

          {p.claseColor !== 'sin_color' && (
            <ColorProducto idProducto={p.idProducto} elegido={color} onElegir={elegirColor} />
          )}

          {p.acabados.length > 0 && (
            <p className="font-sans text-sm text-neutral-dark">
              <span className="font-title font-medium">Acabados: </span>
              {p.acabados.map((a) => a.nombre).join(', ')}
            </p>
          )}

          {/* M05 · P3: agregar la presentación y el color elegidos al carrito. */}
          <AgregarAlCarrito
            idVariante={variante?.idVariante ?? null}
            idColor={color?.idColor ?? null}
            requiereColor={requiereColor(p)}
            bloqueado={p.compraBloqueada}
          />

          {/* Contacto directo de M15 con la referencia del producto (HU-ATC-03). */}
          <BotonContactoDirecto
            referencia={`Me interesa ${p.marca} ${p.nombre}${variante === null ? '' : ` (${variante.medida})`}.`}
          />

          {datosTecnicos.length > 0 && (
            <details className="rounded-card border border-neutral-light bg-neutral-white" open>
              <summary className="min-h-11 cursor-pointer px-4 py-3 font-title text-sm font-semibold text-corporate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50">
                Ficha técnica
              </summary>
              <dl className="divide-y divide-neutral-light px-4 pb-2">
                {datosTecnicos.map(([nombre, valor]) => (
                  <div key={nombre} className="grid grid-cols-[1fr_2fr] gap-3 py-2 font-sans text-sm">
                    <dt className="text-neutral-medium">{nombre}</dt>
                    <dd className="text-neutral-black">{valor}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
        </div>
      </div>
      {/* Espacio publicitario bajo los datos, antes de los complementarios (M14 · B1) */}
      <EspacioPublicitario espacio="ficha" className="mt-10" />
      <ComplementariosProducto idProducto={p.idProducto} />
    </Container>
  );
};
