'use client';

import { useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import { Alert, ButtonLink, Container, ProductCard, Skeleton, type ProductCardProps } from '@/core/components';
import { useFavoritosStore } from '@/core/store/favoritosStore';
import { useAgregarDesdeTarjeta } from '@/modules/m02-busqueda/hooks/useAgregarDesdeTarjeta';
import { busquedaApi } from '@/modules/m02-busqueda/services/busqueda-api';
import { tarjetaDeResultado } from '@/modules/m02-busqueda/services/tarjeta-resultado';

/**
 * «Mis favoritos»: los productos que se marcaron con la estrella, con la misma tarjeta del catálogo (precio y oferta
 * vigentes). Un producto que ya no está a la venta simplemente no aparece. La lista vive en el navegador.
 */
export function FavoritosView() {
  const ids = useFavoritosStore((estado) => estado.ids);
  const agregarDesdeTarjeta = useAgregarDesdeTarjeta();
  const [productos, setProductos] = useState<ReadonlyArray<ProductCardProps> | null>(null);
  const [fallo, setFallo] = useState(false);

  // Se vuelve a consultar solo cuando cambia QUÉ productos hay, no el orden en que se marcaron.
  const clave = useMemo(() => [...ids].sort((a, b) => a - b).join(','), [ids]);

  useEffect(() => {
    if (clave === '') {
      setProductos([]);
      return;
    }
    let activo = true;
    setFallo(false);
    busquedaApi
      .productos({ ids: clave.split(',').map(Number), limite: 48 })
      .then((pagina) => {
        if (activo) setProductos(pagina.items.map((item) => tarjetaDeResultado(item, agregarDesdeTarjeta)));
      })
      .catch(() => {
        if (activo) setFallo(true);
      });
    return () => {
      activo = false;
    };
  }, [clave, agregarDesdeTarjeta]);

  // Los más recientes primero, como se marcaron; los que ya no existen no salen.
  const ordenados = useMemo(() => {
    if (productos === null) return null;
    const posicion = new Map(ids.map((id, i) => [String(id), i]));
    return productos.filter((p) => posicion.has(p.id)).sort((a, b) => (posicion.get(a.id) ?? 0) - (posicion.get(b.id) ?? 0));
  }, [productos, ids]);

  return (
    <Container className="py-8">
      <h1 className="flex items-center gap-2 font-title text-2xl font-bold text-corporate">
        <Star className="h-6 w-6 fill-highlight text-highlight" aria-hidden="true" />
        Mis favoritos
      </h1>
      <p className="mb-6 font-sans text-sm text-neutral-medium">
        Los productos que marcaste con la estrella. Se guardan en este navegador.
      </p>

      {fallo && <Alert variant="error">No pudimos cargar tus favoritos. Intenta de nuevo en unos minutos.</Alert>}

      {ordenados === null && !fallo ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[24rem] rounded-card" />
          ))}
        </div>
      ) : ordenados !== null && ordenados.length === 0 ? (
        <div className="rounded-card border border-dashed border-neutral-light bg-neutral-white p-10 text-center">
          <p className="font-title text-base font-semibold text-neutral-black">Todavía no tienes favoritos</p>
          <p className="mt-1 font-sans text-sm text-neutral-medium">
            Toca la estrella de un producto para guardarlo aquí y encontrarlo rápido después.
          </p>
          <div className="mt-4 flex justify-center">
            <ButtonLink href="/productos" variant="primary-action" size="sm">
              Ver productos
            </ButtonLink>
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
          {ordenados?.map((producto) => (
            <li key={producto.id} className="flex">
              <ProductCard {...producto} className="h-full w-full" />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
