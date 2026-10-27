import { describe, expect, it } from 'vitest';
import type { ResultadoBusqueda } from '../../m02-busqueda/dtos/m02-busqueda.dto';
import type { BusquedaServicePort, PaginaResultado } from '../../m02-busqueda/interfaces/busqueda.interface';
import { ContextoCatalogoAdapter, palabrasClave } from '../adapters/contexto-catalogo.adapter';

const producto = (idProducto: number, nombre: string): ResultadoBusqueda =>
  ({
    idProducto,
    nombre,
    marca: 'Pintuco',
    linea: null,
    categoria: 'Pinturas',
    subcategoria: 'Vinilos para muros',
    precioDesde: 90000,
    tieneColor: true,
    disponibilidad: 'disponible',
    idImagenPrincipal: null,
    esCombo: false,
    compraBloqueada: false,
    oferta: null,
    coincidenciaColor: null,
    patrocinado: false,
    idCampania: null,
  }) as ResultadoBusqueda;

/** Doble de M02: solo encuentra algo cuando el término es UNA palabra que casa. */
function busquedaFalsa(porTermino: Record<string, ResultadoBusqueda[]>): {
  servicio: BusquedaServicePort;
  terminos: string[];
} {
  const terminos: string[] = [];
  const servicio = {
    buscarProductos: async (filtros): Promise<PaginaResultado<ResultadoBusqueda>> => {
      terminos.push(filtros.q ?? '');
      const items = porTermino[filtros.q ?? ''] ?? [];
      return { items, total: items.length, pagina: 1, limite: filtros.limite, totalPaginas: 1 };
    },
  } as unknown as BusquedaServicePort;
  return { servicio, terminos };
}

describe('Contexto del asistente (M03 · H3)', () => {
  describe('palabras clave del mensaje', () => {
    it('quita signos, acentos y palabras vacías', () => {
      expect(palabrasClave('¿Qué pintura me sirve para las paredes interiores de una sala?')).toEqual([
        'pintura',
        'paredes',
        'interiores',
        'sala',
      ]);
    });

    it('descarta las palabras muy cortas', () => {
      expect(palabrasClave('voy a pintar un muro')).toEqual(['muro']);
    });

    it('no repite una palabra', () => {
      expect(palabrasClave('pintura pintura para madera')).toEqual(['pintura', 'madera']);
    });

    it('se queda con unas pocas, para no disparar consultas', () => {
      const muchas = palabrasClave('pintura madera metal techo fachada puerta ventana');
      expect(muchas).toHaveLength(4);
    });
  });

  describe('búsqueda del contexto', () => {
    it('busca palabra por palabra, porque la frase entera no encuentra nada', async () => {
      const { servicio, terminos } = busquedaFalsa({
        madera: [producto(1, 'Barniz Transparente')],
      });
      const adaptador = new ContextoCatalogoAdapter(servicio);

      const contexto = await adaptador.buscarParaAsistente('¿Qué uso para la madera?', 5);

      expect(terminos).toEqual(['madera']);
      expect(contexto.resumen.map((p) => p.nombre)).toEqual(['Barniz Transparente']);
      expect(contexto.tarjetas.get(1)?.nombre).toBe('Barniz Transparente');
    });

    it('junta lo de varias palabras sin repetir productos', async () => {
      const { servicio } = busquedaFalsa({
        pintura: [producto(1, 'Viniltex'), producto(2, 'Koraza')],
        madera: [producto(2, 'Koraza'), producto(3, 'Barniz')],
      });
      const adaptador = new ContextoCatalogoAdapter(servicio);

      const contexto = await adaptador.buscarParaAsistente('pintura para madera', 5);

      expect(contexto.resumen.map((p) => p.idProducto)).toEqual([1, 2, 3]);
    });

    it('deja de buscar al llenar el cupo', async () => {
      const { servicio, terminos } = busquedaFalsa({
        pintura: [producto(1, 'Uno'), producto(2, 'Dos')],
        madera: [producto(3, 'Tres')],
      });
      const adaptador = new ContextoCatalogoAdapter(servicio);

      await adaptador.buscarParaAsistente('pintura para madera', 2);

      expect(terminos).toEqual(['pintura']);
    });

    it('sin coincidencias, ofrece lo más relevante del catálogo', async () => {
      const { servicio, terminos } = busquedaFalsa({
        '': [producto(9, 'Lo que haya')],
      });
      const adaptador = new ContextoCatalogoAdapter(servicio);

      const contexto = await adaptador.buscarParaAsistente('algo que no existe aqui', 5);

      // Primero lo intenta por palabras y, al no hallar nada, cae al catálogo general.
      expect(terminos.at(-1)).toBe('');
      expect(contexto.resumen.map((p) => p.nombre)).toEqual(['Lo que haya']);
    });

    it('no entrega precios ni existencias al modelo (H4)', async () => {
      const { servicio } = busquedaFalsa({ pintura: [producto(1, 'Viniltex')] });
      const adaptador = new ContextoCatalogoAdapter(servicio);

      const contexto = await adaptador.buscarParaAsistente('pintura', 5);

      expect(Object.keys(contexto.resumen[0] ?? {}).sort()).toEqual([
        'ambientes',
        'categoria',
        'idProducto',
        'marca',
        'nombre',
        'rendimiento',
        'superficies',
      ]);
    });
  });
});
