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

const primera = (variantes: readonly VariantePublica[]): VariantePublica | null => variantes[0] ?? null;

/**
 * Lo que comparten la ficha y la compra rápida (U8): carga la ficha pública, recuerda la presentación y el color
 * elegidos y pide las ofertas con ese color (los eventos pueden excluir colores).
 */
export function useFichaPublica(
  idProducto: number,
  varianteInicial: (variantes: readonly VariantePublica[]) => VariantePublica | null = primera,
): FichaPublica {
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
      .then((ficha) => {
        if (!vigente) return;
        setIdVariante(varianteInicial(ficha.variantes)?.idVariante ?? null);
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
    // `varianteInicial` solo decide al cargar: cambiarla no vuelve a pedir la ficha.
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
