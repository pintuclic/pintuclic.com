import { redirect } from 'next/navigation';

/** Dirección corta de «Ofertas»: el listado es el de la búsqueda con el filtro en oferta (M02). */
export default function OfertasPage(): never {
  redirect('/productos?enOferta=true');
}
