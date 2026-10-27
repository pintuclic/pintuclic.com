'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, RotateCcw } from 'lucide-react';
import { Button, ProductCard, type ProductCardProps } from '@/core/components';
import { busquedaApi } from '@/modules/m02-busqueda/services/busqueda-api';
import { useAgregarDesdeTarjeta } from '@/modules/m02-busqueda/hooks/useAgregarDesdeTarjeta';
import { tarjetaDeResultado } from '@/modules/m02-busqueda/services/tarjeta-resultado';
import { featuredLink, featuredProducts, type FeaturedProduct } from '../_data/home.content';
import {
  emitirFiltroLanding,
  EVENTO_FILTRO_LANDING,
  type DetalleFiltroLanding,
} from './ToolsBar';

const IMAGEN_POR_PRODUCTO: Readonly<Record<number, string>> = {
  1: '/images/landing/catalogo-viniltex.png',
  2: '/images/landing/catalogo-koraza.png',
  3: '/images/landing/catalogo-pintulux.png',
  4: '/images/landing/catalogo-esmalte-ico.png',
  5: '/images/landing/catalogo-barniz.png',
  6: '/images/landing/producto-brocha.png',
};

function resolverImagenRespaldo(idProducto: number, categoria: string, subcategoria: string): string {
  const directa = IMAGEN_POR_PRODUCTO[idProducto];
  if (directa) return directa;
  const texto = `${categoria} ${subcategoria}`.toLowerCase();
  if (texto.includes('brocha')) return '/images/landing/producto-brocha.png';
  if (texto.includes('rodillo')) return '/images/landing/producto-rodillo.png';
  if (texto.includes('cinta')) return '/images/landing/producto-cinta.png';
  if (texto.includes('madera') || texto.includes('barniz')) return '/images/landing/catalogo-barniz.png';
  if (texto.includes('fachada') || texto.includes('exterior')) return '/images/landing/catalogo-koraza.png';
  if (texto.includes('esmalte')) return '/images/landing/catalogo-pintulux.png';
  return '/images/landing/catalogo-viniltex.png';
}

/** La colección fija del inicio, con la misma tarjeta del catálogo (sin "Ver producto", carrito junto al precio). */
function tarjetaDestacada(p: FeaturedProduct): ProductCardProps {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    ...(p.originalPrice === undefined ? {} : { originalPrice: p.originalPrice }),
    ...(p.imageUrl === undefined ? {} : { imageUrl: p.imageUrl }),
    isOffer: Boolean(p.offerBadge),
    ...(p.offerBadge === undefined ? {} : { offerBadgeText: p.offerBadge }),
    href: p.href,
    showViewDetails: false,
  };
}

/**
 * Sección "Productos destacados" (UI Spec §4.1, punto 5).
 * Muestra los productos reales del catálogo con la búsqueda de M02 (tolerante a errores de escritura) y la misma
 * tarjeta de /productos: cada producto en su color, llevando a su ficha en ese color (contrato M02 · V5). Reacciona en
 * tiempo real cuando el usuario escribe o elige una categoría en la barra de búsqueda superior.
 */
export function FeaturedProducts() {
  // M02 · V3: el carrito de la tarjeta agrega y abre el panel lateral, igual que en /productos.
  const agregarDesdeTarjeta = useAgregarDesdeTarjeta();
  const [productos, setProductos] = useState<ReadonlyArray<ProductCardProps>>(featuredProducts.map(tarjetaDestacada));
  const [filtro, setFiltro] = useState<DetalleFiltroLanding>({ busqueda: '', idCategoria: '' });
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const manejarEvento = (e: Event) => {
      const custom = e as CustomEvent<DetalleFiltroLanding>;
      if (custom.detail) {
        setFiltro(custom.detail);
      }
    };
    window.addEventListener(EVENTO_FILTRO_LANDING, manejarEvento);
    return () => window.removeEventListener(EVENTO_FILTRO_LANDING, manejarEvento);
  }, []);

  useEffect(() => {
    let activo = true;
    const temporizador = setTimeout(() => {
      setCargando(true);
      const termino = filtro.busqueda.trim();
      busquedaApi
        .productos({
          q: termino,
          idCategoria: filtro.idCategoria !== '' ? [Number(filtro.idCategoria)] : [],
          pagina: 1,
          limite: 12,
        })
        .then((pagina) => {
          if (!activo) return;
          setProductos(
            pagina.items.map((item) => ({
              ...tarjetaDeResultado(item, agregarDesdeTarjeta),
              // Sin foto propia, la ilustración del inicio que corresponde al producto.
              ...(item.idImagenPrincipal === null
                ? { imageUrl: resolverImagenRespaldo(item.idProducto, item.categoria, item.subcategoria) }
                : {}),
            })),
          );
        })
        .catch(() => {
          // Si el backend o la base de datos están temporalmente inaccesibles en el VPS,
          // aplica el filtrado reactivo de forma resiliente sobre la colección destacada.
          const terminoMin = termino.toLowerCase();
          const filtrados = featuredProducts.filter((p) => {
            const coincideTexto =
              terminoMin === '' ||
              p.name.toLowerCase().includes(terminoMin) ||
              p.description.toLowerCase().includes(terminoMin);

            const coincideCategoria =
              filtro.idCategoria === '' ||
              (filtro.idCategoria === '1' && (p.id === '1' || p.id === '2' || p.id === '3' || p.id === '4')) ||
              (filtro.idCategoria === '3' && p.id === '5') ||
              (filtro.idCategoria === '6' && p.id === '6');

            return coincideTexto && coincideCategoria;
          });
          setProductos(filtrados.map(tarjetaDestacada));
        })
        .finally(() => {
          if (activo) setCargando(false);
        });
    }, 180);

    return () => {
      activo = false;
      clearTimeout(temporizador);
    };
  }, [filtro.busqueda, filtro.idCategoria, agregarDesdeTarjeta]);

  const hayFiltroActivo = filtro.busqueda.trim() !== '' || filtro.idCategoria !== '';

  const limpiarFiltro = () => {
    const limpio: DetalleFiltroLanding = { busqueda: '', idCategoria: '' };
    setFiltro(limpio);
    emitirFiltroLanding(limpio);
  };

  return (
    <section aria-labelledby="titulo-destacados">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="titulo-destacados" className="font-title text-xl font-semibold text-neutral-black">
            {hayFiltroActivo ? 'Resultados en el catálogo' : 'Productos destacados'}
          </h2>
          <p className="font-sans text-sm text-neutral-medium">
            {hayFiltroActivo
              ? `Mostrando ${productos.length} ${productos.length === 1 ? 'producto encontrado' : 'productos encontrados'}`
              : 'Selección directa de nuestro catálogo disponible con precios reales por presentación'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hayFiltroActivo && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
              onClick={limpiarFiltro}
            >
              Limpiar filtro
            </Button>
          )}
          <Link
            href={featuredLink.href}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-btn font-sans text-sm font-medium text-conversion-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
          >
            {featuredLink.label}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {productos.length === 0 && !cargando ? (
        <div className="rounded-card border border-dashed border-neutral-light bg-neutral-white p-10 text-center">
          <p className="font-title text-base font-semibold text-neutral-black">
            No encontramos productos con ese filtro
          </p>
          <p className="mt-1 font-sans text-sm text-neutral-medium">
            Prueba buscando otro nombre, marca o selecciona &quot;Todas las categorías&quot;.
          </p>
          <div className="mt-4 flex justify-center">
            <Button type="button" variant="primary-action" size="sm" onClick={limpiarFiltro}>
              Ver todos los productos
            </Button>
          </div>
        </div>
      ) : (
        <div
          aria-busy={cargando}
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5"
        >
          {productos.map((producto) => (
            <ProductCard key={producto.id} {...producto} className="h-full" />
          ))}
        </div>
      )}
    </section>
  );
}
