import type { OrdenResultados } from '../dtos/busqueda.dto';

export interface FiltrosBusqueda {
  q: string;
  idCategoria: number[];
  idSubcategoria: number[];
  idMarca: number[];
  idLinea: number[];
  idTipoResina: number[];
  idFamiliaColor: number[];
  idColor: number[];
  idMedida: number[];
  idSuperficie: number[];
  ambiente?: 'interior' | 'exterior';
  precioMin?: number;
  precioMax?: number;
  ordenar: OrdenResultados;
  pagina: number;
  limite: number;
}

export const FILTROS_BUSQUEDA_POR_DEFECTO: FiltrosBusqueda = {
  q: '',
  idCategoria: [],
  idSubcategoria: [],
  idMarca: [],
  idLinea: [],
  idTipoResina: [],
  idFamiliaColor: [],
  idColor: [],
  idMedida: [],
  idSuperficie: [],
  ordenar: 'relevancia',
  pagina: 1,
  limite: 12,
};

function parsearListaIds(params: URLSearchParams, claves: string[]): number[] {
  const ids: number[] = [];
  for (const clave of claves) {
    const valores = params.getAll(clave);
    for (const valor of valores) {
      for (const parte of valor.split(',')) {
        const num = Number(parte.trim());
        if (!Number.isNaN(num) && num > 0 && !ids.includes(num)) {
          ids.push(num);
        }
      }
    }
  }
  return ids;
}

export function filtrosDesdeUrl(params: URLSearchParams): FiltrosBusqueda {
  const q = (params.get('q') ?? params.get('busqueda') ?? '').trim();
  const idCategoria = parsearListaIds(params, ['idCategoria', 'categoria']);
  const idSubcategoria = parsearListaIds(params, ['idSubcategoria', 'subcategoria']);
  const idMarca = parsearListaIds(params, ['idMarca', 'marca']);
  const idLinea = parsearListaIds(params, ['idLinea', 'linea']);
  const idTipoResina = parsearListaIds(params, ['idTipoResina', 'tipoResina']);
  const idFamiliaColor = parsearListaIds(params, ['idFamiliaColor', 'familiaColor']);
  const idColor = parsearListaIds(params, ['idColor', 'color']);
  const idMedida = parsearListaIds(params, ['idMedida', 'medida', 'presentacion']);
  const idSuperficie = parsearListaIds(params, ['idSuperficie', 'superficie']);

  const rawAmbiente = params.get('ambiente');
  const ambiente = rawAmbiente === 'interior' || rawAmbiente === 'exterior' ? rawAmbiente : undefined;

  const rawPrecioMin = params.get('precioMin');
  const rawPrecioMax = params.get('precioMax');
  const precioMin = rawPrecioMin !== null && !Number.isNaN(Number(rawPrecioMin)) ? Number(rawPrecioMin) : undefined;
  const precioMax = rawPrecioMax !== null && !Number.isNaN(Number(rawPrecioMax)) ? Number(rawPrecioMax) : undefined;

  const rawOrdenar = params.get('ordenar');
  const ordenar: OrdenResultados =
    rawOrdenar === 'precio_asc' || rawOrdenar === 'precio_desc' || rawOrdenar === 'novedad'
      ? rawOrdenar
      : 'relevancia';

  const rawPagina = params.get('pagina');
  const pagina = rawPagina !== null && Number(rawPagina) > 0 ? Number(rawPagina) : 1;

  const rawLimite = params.get('limite');
  const limite = rawLimite !== null && Number(rawLimite) > 0 ? Number(rawLimite) : 12;

  return {
    q,
    idCategoria,
    idSubcategoria,
    idMarca,
    idLinea,
    idTipoResina,
    idFamiliaColor,
    idColor,
    idMedida,
    idSuperficie,
    ...(ambiente ? { ambiente } : {}),
    ...(precioMin !== undefined ? { precioMin } : {}),
    ...(precioMax !== undefined ? { precioMax } : {}),
    ordenar,
    pagina,
    limite,
  };
}

export function filtrosAUrl(filtros: FiltrosBusqueda): URLSearchParams {
  const params = new URLSearchParams();

  if (filtros.q.trim()) params.set('q', filtros.q.trim());
  if (filtros.idCategoria.length > 0) params.set('idCategoria', filtros.idCategoria.join(','));
  if (filtros.idSubcategoria.length > 0) params.set('idSubcategoria', filtros.idSubcategoria.join(','));
  if (filtros.idMarca.length > 0) params.set('idMarca', filtros.idMarca.join(','));
  if (filtros.idLinea.length > 0) params.set('idLinea', filtros.idLinea.join(','));
  if (filtros.idTipoResina.length > 0) params.set('idTipoResina', filtros.idTipoResina.join(','));
  if (filtros.idFamiliaColor.length > 0) params.set('idFamiliaColor', filtros.idFamiliaColor.join(','));
  if (filtros.idColor.length > 0) params.set('idColor', filtros.idColor.join(','));
  if (filtros.idMedida.length > 0) params.set('idMedida', filtros.idMedida.join(','));
  if (filtros.idSuperficie.length > 0) params.set('idSuperficie', filtros.idSuperficie.join(','));

  if (filtros.ambiente) params.set('ambiente', filtros.ambiente);
  if (filtros.precioMin !== undefined) params.set('precioMin', String(filtros.precioMin));
  if (filtros.precioMax !== undefined) params.set('precioMax', String(filtros.precioMax));

  if (filtros.ordenar !== 'relevancia') params.set('ordenar', filtros.ordenar);
  if (filtros.pagina > 1) params.set('pagina', String(filtros.pagina));
  if (filtros.limite !== 12) params.set('limite', String(filtros.limite));

  return params;
}

export function hayFiltrosActivos(filtros: FiltrosBusqueda): boolean {
  return (
    filtros.q.trim().length > 0 ||
    filtros.idCategoria.length > 0 ||
    filtros.idSubcategoria.length > 0 ||
    filtros.idMarca.length > 0 ||
    filtros.idLinea.length > 0 ||
    filtros.idTipoResina.length > 0 ||
    filtros.idFamiliaColor.length > 0 ||
    filtros.idColor.length > 0 ||
    filtros.idMedida.length > 0 ||
    filtros.idSuperficie.length > 0 ||
    filtros.ambiente !== undefined ||
    filtros.precioMin !== undefined ||
    filtros.precioMax !== undefined
  );
}
