import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BusquedaFiltrosSidebar } from '../components/BusquedaFiltrosSidebar';
import type { OpcionesFiltro } from '../dtos/busqueda.dto';
import { FILTROS_BUSQUEDA_POR_DEFECTO } from '../services/filtros-busqueda';

const opcion = (id: number, nombre: string) => ({ id, nombre, total: 1 });

const opciones: OpcionesFiltro = {
  totalResultados: 3,
  categorias: [opcion(1, 'Pinturas')],
  subcategorias: [{ ...opcion(2, 'Vinilos'), idCategoria: 1 }],
  marcas: [opcion(1, 'Pintuco')],
  lineas: [{ ...opcion(1, 'Viniltex'), idMarca: 1 }],
  tiposResina: [opcion(1, 'Base agua')],
  familiasColor: [{ ...opcion(1, 'Azules'), hexadecimal: '#1D4E89' }],
  presentaciones: [opcion(1, '1 galón')],
  superficies: [opcion(1, 'Paredes y techos')],
  precio: { minimo: 8900, maximo: 99900 },
};

describe('Panel de filtros de /productos (V1)', () => {
  it('muestra los grupos en el orden acordado, con Ambiente después de Categorías', () => {
    const html = renderToStaticMarkup(
      <BusquedaFiltrosSidebar filtros={FILTROS_BUSQUEDA_POR_DEFECTO} opciones={opciones} onCambiar={() => undefined} />,
    );
    const orden = [...html.matchAll(/<h3 id="filtro-([a-z-]+)"/g)].map((m) => m[1]);
    expect(orden).toEqual([
      'ofertas',
      'categorias',
      'ambiente',
      'marcas',
      'lineas',
      'familias-color',
      'presentaciones',
      'resinas',
      'superficies',
      'precio',
    ]);
  });
});
