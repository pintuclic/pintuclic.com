import { listarProductosPublicosRequestSchema } from '../dtos/m01-catalogo-productos.dto';

/** Estado de los filtros de la vitrina. Vive en la URL para poder compartir y volver atrás. */
export interface FiltrosVitrina {
  busqueda: string;
  idCategoria: string;
  idSubcategoria: string;
  idMarca: string;
  idSuperficie: string;
  ambiente: '' | 'interior' | 'exterior';
  /** Solo productos con un evento de M06 en curso (menú «Ofertas»). */
  enOferta: boolean;
  ordenar: 'nombre' | 'precio_asc' | 'precio_desc';
  pagina: number;
}

export const FILTROS_INICIALES: FiltrosVitrina = {
  busqueda: '',
  idCategoria: '',
  idSubcategoria: '',
  idMarca: '',
  idSuperficie: '',
  ambiente: '',
  enOferta: false,
  ordenar: 'nombre',
  pagina: 1,
};

export const PRODUCTOS_POR_PAGINA = 12;

const entero = (v: string | null): string => (v !== null && /^\d+$/.test(v) && Number(v) > 0 ? v : '');

/**
 * Lee la URL de la vitrina. Lo que no es válido se ignora (p. ej. los enlaces del menú con
 * `?categoria=decorativos`): la vitrina nunca falla por una URL escrita a mano.
 */
export function filtrosDesdeUrl(params: URLSearchParams): FiltrosVitrina {
  const ambiente = params.get('ambiente');
  const ordenar = params.get('orden');
  const pagina = Number(params.get('pagina'));
  return {
    busqueda: (params.get('q') ?? '').trim().slice(0, 100),
    idCategoria: entero(params.get('categoria')),
    idSubcategoria: entero(params.get('subcategoria')),
    idMarca: entero(params.get('marca')),
    idSuperficie: entero(params.get('superficie')),
    ambiente: ambiente === 'interior' || ambiente === 'exterior' ? ambiente : '',
    enOferta: params.get('enOferta') === 'true',
    ordenar: ordenar === 'precio_asc' || ordenar === 'precio_desc' ? ordenar : 'nombre',
    pagina: Number.isInteger(pagina) && pagina >= 1 ? pagina : 1,
  };
}

/** Los filtros en forma de URL: lo que está en su valor por defecto no se escribe. */
export function filtrosAUrl(f: FiltrosVitrina): URLSearchParams {
  const params = new URLSearchParams();
  const poner = (clave: string, valor: string) => {
    if (valor !== '') params.set(clave, valor);
  };
  poner('q', f.busqueda.trim());
  poner('categoria', f.idCategoria);
  poner('subcategoria', f.idSubcategoria);
  poner('marca', f.idMarca);
  poner('superficie', f.idSuperficie);
  poner('ambiente', f.ambiente);
  if (f.enOferta) params.set('enOferta', 'true');
  if (f.ordenar !== 'nombre') params.set('orden', f.ordenar);
  if (f.pagina > 1) params.set('pagina', String(f.pagina));
  return params;
}

/** Parámetros de la consulta a la API; se validan con el esquema del contrato antes de enviarse. */
export function filtrosAConsulta(f: FiltrosVitrina): Record<string, string | number> {
  const consulta = {
    ...(f.busqueda.trim() === '' ? {} : { busqueda: f.busqueda.trim() }),
    ...(f.idCategoria === '' ? {} : { idCategoria: f.idCategoria }),
    ...(f.idSubcategoria === '' ? {} : { idSubcategoria: f.idSubcategoria }),
    ...(f.idMarca === '' ? {} : { idMarca: f.idMarca }),
    ...(f.idSuperficie === '' ? {} : { idSuperficie: f.idSuperficie }),
    ...(f.ambiente === '' ? {} : { ambiente: f.ambiente }),
    ...(f.enOferta ? { enOferta: 'true' } : {}),
    ordenar: f.ordenar,
    pagina: f.pagina,
    limite: PRODUCTOS_POR_PAGINA,
  };
  const validada = listarProductosPublicosRequestSchema.parse(consulta);
  return {
    ...consulta,
    pagina: validada.pagina,
    limite: validada.limite,
  };
}

/** ¿Hay algún filtro activo (sin contar orden ni página)? */
export function hayFiltros(f: FiltrosVitrina): boolean {
  return (
    f.busqueda.trim() !== '' ||
    f.idCategoria !== '' ||
    f.idSubcategoria !== '' ||
    f.idMarca !== '' ||
    f.idSuperficie !== '' ||
    f.ambiente !== '' ||
    f.enOferta
  );
}
