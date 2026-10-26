import type { OfertaPublica } from "../dtos/m01-catalogo-productos.dto";

const PORCENTAJE = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

/** "−15 %" (el signo es el menos tipográfico). Solo el evento: el descuento de empresa no se rotula aquí. */
export function etiquetaOferta(porcentaje: number): string {
  return `−${PORCENTAJE.format(porcentaje)} %`;
}

export interface PrecioVisible {
  price: number;
  originalPrice?: number;
  isOffer: boolean;
  offerBadgeText?: string;
}

/** Lo que pintan la tarjeta y la ficha: con oferta, el precio rebajado y el anterior tachado. */
export function precioVisible(
  precioBase: number | null,
  oferta: OfertaPublica | null,
): PrecioVisible {
  if (oferta === null) return { price: precioBase ?? 0, isOffer: false };
  return {
    price: oferta.precioConOferta,
    originalPrice: oferta.precioAntes,
    isOffer: true,
    offerBadgeText: etiquetaOferta(oferta.porcentaje),
  };
}

/**
 * La oferta de una presentación. Con color elegido manda lo que respondió el servidor para ese color, y
 * `null` ahí significa «sin oferta para este color» (excepción del evento): no se vuelve a la de la ficha.
 */
export function ofertaDePresentacion(
  idVariante: number,
  ofertaSinColor: OfertaPublica | null,
  ofertasConColor: ReadonlyMap<number, OfertaPublica | null> | null,
): OfertaPublica | null {
  return ofertasConColor?.has(idVariante) === true ? (ofertasConColor.get(idVariante) ?? null) : ofertaSinColor;
}
