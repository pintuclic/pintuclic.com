import { describe, expect, it } from 'vitest';
import {
  FILTROS_BUSQUEDA_POR_DEFECTO,
  filtrosAUrl,
  filtrosDesdeUrl,
  hayFiltrosActivos,
} from '../services/filtros-busqueda';
import { busquedaApi } from '../services/busqueda-api';

describe('M02 Frontend — Filtros y Serialización de URLs', () => {
  it('parsea parámetros desde URL correctamente', () => {
    const params = new URLSearchParams('q=vinilo&idCategoria=1,2&idMarca=5&precioMin=10000&precioMax=50000&ordenar=precio_asc&pagina=2');
    const f = filtrosDesdeUrl(params);

    expect(f.q).toBe('vinilo');
    expect(f.idCategoria).toEqual([1, 2]);
    expect(f.idMarca).toEqual([5]);
    expect(f.precioMin).toBe(10000);
    expect(f.precioMax).toBe(50000);
    expect(f.ordenar).toBe('precio_asc');
    expect(f.pagina).toBe(2);
  });

  it('admite parámetros repetidos estilo ?idMarca=1&idMarca=2', () => {
    const params = new URLSearchParams();
    params.append('idMarca', '1');
    params.append('idMarca', '2');
    const f = filtrosDesdeUrl(params);

    expect(f.idMarca).toEqual([1, 2]);
  });

  it('serializa filtros a URLSearchParams omitiendo valores por defecto', () => {
    const params = filtrosAUrl({
      ...FILTROS_BUSQUEDA_POR_DEFECTO,
      q: 'esmalte',
      idMarca: [10],
      ordenar: 'precio_desc',
    });

    expect(params.get('q')).toBe('esmalte');
    expect(params.get('idMarca')).toBe('10');
    expect(params.get('ordenar')).toBe('precio_desc');
    expect(params.get('pagina')).toBeNull(); // pagina 1 se omite
  });

  it('detecta correctamente si hay filtros activos', () => {
    expect(hayFiltrosActivos(FILTROS_BUSQUEDA_POR_DEFECTO)).toBe(false);

    expect(
      hayFiltrosActivos({
        ...FILTROS_BUSQUEDA_POR_DEFECTO,
        q: 'algo',
      }),
    ).toBe(true);

    expect(
      hayFiltrosActivos({
        ...FILTROS_BUSQUEDA_POR_DEFECTO,
        idFamiliaColor: [3],
      }),
    ).toBe(true);
  });

  it('«enOferta» solo se activa con "true", viaja en la URL y en la consulta a la API', () => {
    expect(filtrosDesdeUrl(new URLSearchParams('enOferta=true')).enOferta).toBe(true);
    expect(filtrosDesdeUrl(new URLSearchParams('enOferta=1')).enOferta).toBe(false);
    expect(FILTROS_BUSQUEDA_POR_DEFECTO.enOferta).toBe(false);

    const f = { ...FILTROS_BUSQUEDA_POR_DEFECTO, enOferta: true };
    expect(filtrosAUrl(f).toString()).toBe('enOferta=true');
    expect(filtrosDesdeUrl(filtrosAUrl(f))).toEqual(f);
    expect(filtrosAUrl(FILTROS_BUSQUEDA_POR_DEFECTO).has('enOferta')).toBe(false);
    expect(hayFiltrosActivos(f)).toBe(true);
  });

  it('genera URLs canónicas de imágenes de productos', () => {
    const urlMin = busquedaApi.urlImagen(42, 'miniatura');
    expect(urlMin).toContain('/catalogo/imagenes/42?tamano=miniatura');

    const urlOrig = busquedaApi.urlImagen(42, 'original');
    expect(urlOrig).toContain('/catalogo/imagenes/42');
    expect(urlOrig).not.toContain('tamano');
  });
});
