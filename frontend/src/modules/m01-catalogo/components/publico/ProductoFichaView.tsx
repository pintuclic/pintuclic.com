'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Award,
  Brush,
  Droplets,
  FolderTree,
  Home,
  Layers,
  ListChecks,
  type LucideIcon,
  Package,
  Ruler,
  Tag,
} from 'lucide-react';
import { Alert, Badge, Container, Skeleton } from '@/core/components';
import { BotonContactoDirecto } from '@/modules/m15-atencion/components/publico/BotonContactoDirecto';
import { EspacioPublicitario } from '@/modules/m14-patrocinios/components/EspacioPublicitario';
import { CalculadoraDeFicha } from '@/modules/m03-asesoria/components/publico/CalculadoraDeFicha';
import type { ColorOfrecido } from '../../dtos/m01-catalogo-productos.dto';
import { useFichaPublica } from '../../hooks/useFichaPublica';
import { catalogoPublicoApi } from '../../services/consulta-publica-api';
import { type ClaveDato, datosFichaTecnica, textoAmbiente } from '../../services/ficha-tecnica';
import { imagenParaSeleccion } from '../../services/galeria';
import { textoRendimiento } from '../../services/rendimiento';
import { direccionConColor, requiereColor } from '../../services/seleccion-ficha';
import { AgregarAlCarrito } from './AgregarAlCarrito';
import { ComplementariosProducto } from './ComplementariosProducto';
import { GaleriaProducto } from './GaleriaProducto';
import { MuestrasColor } from './MuestrasColor';
import { PrecioPresentacion, SelectorPresentacion } from './PresentacionProducto';
import { ModalColoresProducto } from './SelectorColorProducto';

const ICONO_DATO: Record<ClaveDato, LucideIcon> = {
  marca: Tag,
  categoria: FolderTree,
  presentaciones: Package,
  rendimiento: Ruler,
  ambiente: Home,
  superficies: Layers,
  resina: Droplets,
  calidad: Award,
  acabados: Brush,
  caracteristica: ListChecks,
};

export interface ProductoFichaViewProps {
  idProducto: number;
  /** U8 y P11: el color con que se abre (`?color=`), desde la tarjeta del listado o la paleta de color. */
  idColorInicial?: number | null;
}

/**
 * HU-CAT-06 y U8: ficha pública. A la izquierda la imagen sobre la pared del color elegido, la descripción y la ficha
 * técnica; a la derecha el panel de compra, que se queda a la vista al bajar.
 */
export const ProductoFichaView: React.FC<ProductoFichaViewProps> = ({ idProducto, idColorInicial = null }) => {
  const { estado, variante, elegirVariante, color, elegirColor, oferta } = useFichaPublica(idProducto, idColorInicial);
  const [cartaAbierta, setCartaAbierta] = useState(false);

  // U8: la dirección sigue al color elegido, para compartir la ficha en ese color, sin recargar la página.
  const elegirYRecordar = (c: ColorOfrecido): void => {
    elegirColor(c);
    window.history.replaceState(window.history.state, '', direccionConColor(window.location.href, c.idColor));
  };

  if (estado.tipo === 'cargando') {
    return (
      <Container className="py-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <Skeleton className="h-[28rem]" rounded="card" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" rounded="btn" />
            <Skeleton className="h-5 w-1/2" rounded="btn" />
            <Skeleton className="h-80" rounded="card" />
          </div>
        </div>
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
  // Lo esencial a primera vista; el detalle completo va en la ficha técnica.
  const destacados = [textoAmbiente(p), p.tipoResina, rendimiento].filter((x): x is string => x !== null);
  const fichaTecnica = datosFichaTecnica(p, variante);

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

      <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-10">
        {/* Columna izquierda: se desplaza con la página. */}
        <div className="min-w-0 space-y-6">
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
            color={color}
          />

          {p.descripcion !== null && (
            <section
              aria-labelledby="titulo-descripcion"
              className="rounded-card border border-neutral-light bg-neutral-white p-5"
            >
              <h2 id="titulo-descripcion" className="font-title text-lg font-semibold text-corporate">
                Descripción
              </h2>
              <p className="mt-2 font-sans text-sm leading-relaxed text-neutral-dark">{p.descripcion}</p>
            </section>
          )}

          {fichaTecnica.length > 0 && (
            <section
              aria-labelledby="titulo-ficha-tecnica"
              className="rounded-card border border-neutral-light bg-neutral-white p-5"
            >
              <h2 id="titulo-ficha-tecnica" className="font-title text-lg font-semibold text-corporate">
                Ficha técnica
              </h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                {fichaTecnica.map((d) => {
                  const Icono = ICONO_DATO[d.clave];
                  return (
                    <div key={`${d.clave}-${d.etiqueta}`} className="flex gap-3 rounded-input bg-neutral-lightest p-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-subaction">
                        <Icono className="h-4 w-4 text-action" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <dt className="font-sans text-xs text-neutral-medium">{d.etiqueta}</dt>
                        <dd className="font-title text-sm font-medium text-neutral-black">{d.valor}</dd>
                      </div>
                    </div>
                  );
                })}
              </dl>
            </section>
          )}
        </div>

        {/* Columna derecha: el panel de compra se queda a la vista al bajar (y se desplaza solo si no cabe). */}
        <aside
          aria-label="Comprar"
          className="space-y-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto lg:pr-1"
        >
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
            {color !== null && <p className="mt-0.5 font-title text-lg text-neutral-dark">{color.nombre}</p>}
            {destacados.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Lo esencial del producto">
                {destacados.map((d) => (
                  <li
                    key={d}
                    className="rounded-full bg-subaction px-3 py-1 font-sans text-xs font-medium text-corporate"
                  >
                    {d}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {p.compraBloqueada && (
            <Alert variant="warning">Este combo está agotado por ahora y no se puede comprar.</Alert>
          )}

          <div className="space-y-5 rounded-card border border-neutral-light bg-neutral-white p-5 shadow-card">
            {requiereColor(p) && (
              <MuestrasColor
                idProducto={p.idProducto}
                elegido={color}
                onElegir={elegirYRecordar}
                onVerTodos={() => setCartaAbierta(true)}
              />
            )}

            {p.variantes.length > 0 ? (
              <SelectorPresentacion
                variantes={p.variantes}
                idElegida={variante?.idVariante ?? null}
                onElegir={elegirVariante}
              />
            ) : (
              <Alert variant="info">Este producto no tiene presentaciones disponibles por ahora.</Alert>
            )}

            {variante !== null && <PrecioPresentacion variante={variante} oferta={oferta} rendimiento={rendimiento} />}

            {/*
              M03 · HU-ASE-02: la calculadora de este producto. Se monta siempre; es M03
              quien decide si el producto la tiene (contrato K1) y, si no, no dibuja nada.
            */}
            <CalculadoraDeFicha
              idProducto={p.idProducto}
              idVarianteElegida={variante?.idVariante ?? null}
            />

            {/* M05 · P3: agregar la presentación y el color elegidos al carrito. */}
            <div className="border-t border-neutral-light pt-4">
              <AgregarAlCarrito
                idVariante={variante?.idVariante ?? null}
                idColor={color?.idColor ?? null}
                requiereColor={requiereColor(p)}
                bloqueado={p.compraBloqueada}
              />
            </div>
          </div>

          {/* Contacto directo de M15 con la referencia del producto (HU-ATC-03). */}
          <BotonContactoDirecto
            referencia={`Me interesa ${p.marca} ${p.nombre}${color === null ? '' : ` en ${color.nombre}`}${
              variante === null ? '' : ` (${variante.medida})`
            }.`}
          />
        </aside>
      </div>

      {cartaAbierta && (
        <ModalColoresProducto
          idProducto={p.idProducto}
          elegido={color}
          onElegir={elegirYRecordar}
          onClose={() => setCartaAbierta(false)}
        />
      )}

      {/* Espacio publicitario bajo los datos, antes de los complementarios (M14 · B1) */}
      <EspacioPublicitario espacio="ficha" className="mt-10" />
      <ComplementariosProducto idProducto={p.idProducto} />
    </Container>
  );
};
