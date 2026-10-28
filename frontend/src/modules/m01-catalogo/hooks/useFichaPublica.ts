'use client';

import { useEffect, useState } from 'react';
import type {
  ColorOfrecido,
  OfertaPublica,
  ProductoPublicoFicha,
  VariantePublica,
} from '../dtos/m01-catalogo-productos.dto';
import { catalogoPublicoApi } from '../services/consulta-publica-api';
import { leerErrorCatalogo } from '../services/mensaje-error';
import { ofertaDePresentacion } from '../services/ofertas-visuales';
import { presentacionInicial, requiereColor } from '../services/seleccion-ficha';

export type EstadoFicha =
  | { tipo: 'cargando' }
  | { tipo: 'lista'; ficha: ProductoPublicoFicha }
  | { tipo: 'no_disponible' }
  | { tipo: 'error'; mensaje: string };

export interface FichaPublica {
  estado: EstadoFicha;
  /** La presentación elegida; null si el producto no tiene ninguna o aún no carga. */
  variante: VariantePublica | null;
  elegirVariante: (idVariante: number) => void;
  color: ColorOfrecido | null;
  elegirColor: (color: ColorOfrecido) => void;
  /** Oferta de la presentación elegida, con el color elegido si lo hay. */
  oferta: OfertaPublica | null;
}

/**
 * La ficha pública (HU-CAT-06, U8): carga el producto, empieza con la primera presentación que se puede comprar y,
 * si llega `idColorInicial` (la tarjeta del listado, `?color=`), con ese color ya elegido cuando el producto lo
 * ofrece. Pide las ofertas con el color elegido, porque los eventos pueden excluir colores.
 */
export function useFichaPublica(idProducto: number, idColorInicial: number | null = null): FichaPublica {
  const [estado, setEstado] = useState<EstadoFicha>({ tipo: 'cargando' });
  const [idVariante, setIdVariante] = useState<number | null>(null);
  const [color, setColor] = useState<ColorOfrecido | null>(null);
  /** Ofertas con el color elegido; null = las de la ficha, sin color. */
  const [ofertasConColor, setOfertasConColor] = useState<Map<number, OfertaPublica | null> | null>(null);

  useEffect(() => {
    let vigente = true;
    setEstado({ tipo: 'cargando' });
    setColor(null);
    setOfertasConColor(null);
    catalogoPublicoApi
      .ficha(idProducto)
      .then(async (ficha) => {
        // El color de la tarjeta se pide antes de mostrar la ficha, para que no "salte" de sin color a color.
        const inicial =
          idColorInicial === null || !requiereColor(ficha)
            ? null
            : await catalogoPublicoApi
                .colores(idProducto, { idColor: idColorInicial, pagina: 1, limite: 1 })
                .then((pagina) => pagina.items[0] ?? null)
                // Si no se puede traer, la ficha abre sin color, como siempre.
                .catch(() => null);
        if (!vigente) return;
        setIdVariante(presentacionInicial(ficha.variantes)?.idVariante ?? null);
        setColor(inicial);
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
    // El color inicial solo cuenta al abrir: elegir otro en la ficha cambia la dirección, no vuelve a cargar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const variantes = estado.tipo === 'lista' ? estado.ficha.variantes : [];
  const variante = variantes.find((v) => v.idVariante === idVariante) ?? variantes[0] ?? null;
  const oferta =
    variante === null ? null : ofertaDePresentacion(variante.idVariante, variante.oferta, ofertasConColor);

  return { estado, variante, elegirVariante: setIdVariante, color, elegirColor: setColor, oferta };
}
