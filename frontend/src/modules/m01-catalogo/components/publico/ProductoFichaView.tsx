'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Badge, Container, Skeleton } from '@/core/components';
import { formatCOP } from '@/core/utils/moneda';
import { BotonContactoDirecto } from '@/modules/m15-atencion/components/publico/BotonContactoDirecto';
import type { ColorOfrecido, OfertaPublica, ProductoPublicoFicha } from '../../dtos/m01-catalogo-productos.dto';
import { leerErrorCatalogo } from '../../services/mensaje-error';
import { catalogoPublicoApi } from '../../services/consulta-publica-api';
import { imagenParaSeleccion } from '../../services/galeria';
import { etiquetaOferta, ofertaDePresentacion } from '../../services/ofertas-visuales';
import { textoRendimiento } from '../../services/rendimiento';
import { ComplementariosProducto } from './ComplementariosProducto';
import { GaleriaProducto } from './GaleriaProducto';
import { ColorProducto } from './SelectorColorProducto';

const TIPOS_CALIDAD: Record<number, string> = { 1: 'Tipo 1 (gama alta)', 2: 'Tipo 2', 3: 'Tipo 3' };

export interface ProductoFichaViewProps {
  idProducto: number;
}

/** HU-CAT-06: ficha pública de un producto con presentaciones, rendimiento y selector de color. */
type EstadoFicha =
  | { tipo: 'cargando' }
  | { tipo: 'lista'; ficha: ProductoPublicoFicha }
  | { tipo: 'no_disponible' }
  | { tipo: 'error'; mensaje: string };

export const ProductoFichaView: React.FC<ProductoFichaViewProps> = ({ idProducto }) => {
  const [estado, setEstado] = useState<EstadoFicha>({ tipo: 'cargando' });
  const [idVariante, setIdVariante] = useState<number | null>(null);
  const [color, setColor] = useState<ColorOfrecido | null>(null);
  /** Ofertas con el color elegido (los eventos pueden excluir colores); null = las de la ficha, sin color. */
  const [ofertasConColor, setOfertasConColor] = useState<Map<number, OfertaPublica | null> | null>(null);

  useEffect(() => {
    let vigente = true;
    setEstado({ tipo: 'cargando' });
    setColor(null);
    setOfertasConColor(null);
    catalogoPublicoApi
      .ficha(idProducto)
      .then((ficha) => {
        if (!vigente) return;
        setIdVariante(ficha.variantes[0]?.idVariante ?? null);
        setEstado({ tipo: 'lista', ficha });
      })
      .catch((err: unknown) => {
        if (!vigente) return;
        const error = leerErrorCatalogo(err, 'No se pudo cargar el producto.');
        // U1: 404 uniforme para lo que no existe, no está publicado o tiene un padre inactivo.
        setEstado(error.status === 404 ? { tipo: 'no_disponible' } : { tipo: 'error', mensaje: error.message });
      });
    return () => {
      vigente = false;
    };
  }, [idProducto]);

  const idColorElegido = color?.idColor ?? null;
  useEffect(() => {
    if (idColorElegido === null) return;
    let vigente = true;
    catalogoPublicoApi
      .ofertas(idProducto, idColorElegido)
      .then((lista) => vigente && setOfertasConColor(new Map(lista.map((o) => [o.idVariante, o.oferta]))))
      // Si falla, se conservan las ofertas de la ficha: el carrito vuelve a calcular con el color real.
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [idProducto, idColorElegido]);

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
  const variante = p.variantes.find((v) => v.idVariante === idVariante) ?? p.variantes[0] ?? null;
  const oferta = variante === null ? null : ofertaDePresentacion(variante.idVariante, variante.oferta, ofertasConColor);
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

          {variante !== null && (
            <div>
              {oferta !== null && (
                <p className="flex items-center gap-2 font-sans text-sm">
                  <Badge variant="offer">{etiquetaOferta(oferta.porcentaje)}</Badge>
                  <span className="text-neutral-medium">
                    <span className="sr-only">Precio anterior </span>
                    <s>{formatCOP(oferta.precioAntes)} COP</s>
                  </span>
                </p>
              )}
              <p className="font-title text-3xl font-bold text-corporate">
                {formatCOP(oferta?.precioConOferta ?? variante.precio)}{' '}
                <span className="text-base font-medium">COP</span>
              </p>
              {oferta !== null && <p className="font-sans text-xs text-neutral-medium">{oferta.nombre}</p>}
              <p className="mt-1 flex items-center gap-2 font-sans text-sm">
                <Badge variant={variante.disponibilidad === 'disponible' ? 'success' : 'neutral'}>
                  {variante.disponibilidad === 'disponible' ? 'Disponible' : 'Agotado por ahora'}
                </Badge>
                {rendimiento !== null && <span className="text-neutral-dark">{rendimiento}</span>}
              </p>
            </div>
          )}

          {p.variantes.length > 0 ? (
            <fieldset className="space-y-2">
              <legend className="font-title text-sm font-medium text-neutral-dark">Presentación</legend>
              <div className="flex flex-wrap gap-2">
                {p.variantes.map((v) => (
                  <button
                    key={v.idVariante}
                    type="button"
                    aria-pressed={variante?.idVariante === v.idVariante}
                    onClick={() => setIdVariante(v.idVariante)}
                    className={`min-h-11 rounded-full border px-4 font-title text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 ${
                      variante?.idVariante === v.idVariante
                        ? 'border-action bg-subaction text-corporate'
                        : 'border-neutral-light bg-neutral-white text-neutral-dark hover:border-neutral-medium'
                    }`}
                  >
                    {v.medida}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : (
            <Alert variant="info">Este producto no tiene presentaciones disponibles por ahora.</Alert>
          )}

          {p.claseColor !== 'sin_color' && (
            <ColorProducto idProducto={p.idProducto} elegido={color} onElegir={setColor} />
          )}

          {p.acabados.length > 0 && (
            <p className="font-sans text-sm text-neutral-dark">
              <span className="font-title font-medium">Acabados: </span>
              {p.acabados.map((a) => a.nombre).join(', ')}
            </p>
          )}

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
      <ComplementariosProducto idProducto={p.idProducto} />
    </Container>
  );
};
