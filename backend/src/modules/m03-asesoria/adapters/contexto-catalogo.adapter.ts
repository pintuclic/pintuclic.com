import type { BuscarProductosRequest, ResultadoBusqueda } from '../../m02-busqueda/dtos/m02-busqueda.dto';
import type { BusquedaServicePort } from '../../m02-busqueda/interfaces/busqueda.interface';
import type { ContextoCatalogoPort, ContextoDeConsulta } from '../services/asistente.service';

/** Cuántas palabras del mensaje se buscan, para no multiplicar las consultas. */
const MAX_PALABRAS = 4;

/**
 * Palabras vacías del español más las de pregunta: no dicen nada del producto y solo
 * gastarían una consulta.
 */
const VACIAS = new Set([
  'que', 'cual', 'cuales', 'como', 'donde', 'cuando', 'cuanto', 'cuanta', 'quien',
  'para', 'por', 'con', 'sin', 'del', 'las', 'los', 'una', 'uno', 'unos', 'unas',
  'mi', 'me', 'te', 'se', 'le', 'lo', 'la', 'el', 'y', 'o', 'de', 'en', 'un',
  'es', 'son', 'esta', 'este', 'esto', 'eso', 'esa', 'ese', 'hay', 'tengo', 'quiero',
  'necesito', 'sirve', 'puedo', 'debo', 'mejor', 'bueno', 'buena', 'buenas', 'buenos',
  'hola', 'gracias', 'favor', 'usar', 'uso', 'hacer', 'pintar', 'recomienda',
  'recomiendas', 'recomiendan', 'ayuda', 'ayudar', 'sobre', 'mas', 'muy', 'si', 'no',
]);

/**
 * Saca del mensaje las palabras que pueden coincidir con algo del catálogo. Se quitan
 * acentos y signos porque la búsqueda de M02 compara contra texto normalizado.
 */
export function palabrasClave(texto: string): string[] {
  const normalizado = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ');

  const vistas = new Set<string>();
  const palabras: string[] = [];
  for (const palabra of normalizado.split(/\s+/)) {
    if (palabra.length < 4 || VACIAS.has(palabra) || vistas.has(palabra)) continue;
    vistas.add(palabra);
    palabras.push(palabra);
    if (palabras.length === MAX_PALABRAS) break;
  }
  return palabras;
}

const sinFiltros = (): Pick<
  BuscarProductosRequest,
  | 'idCategoria'
  | 'idSubcategoria'
  | 'idMarca'
  | 'idLinea'
  | 'idTipoResina'
  | 'idFamiliaColor'
  | 'idColor'
  | 'idMedida'
  | 'idSuperficie'
> => ({
  idCategoria: [],
  idSubcategoria: [],
  idMarca: [],
  idLinea: [],
  idTipoResina: [],
  idFamiliaColor: [],
  idColor: [],
  idMedida: [],
  idSuperficie: [],
});

/**
 * H3 — de dónde salen los productos que el asistente puede mencionar.
 *
 * Es la LISTA CERRADA del contrato: se busca en el catálogo público con el mensaje de la
 * persona y solo esos productos se le entregan al modelo. Cualquier identificador que
 * devuelva fuera de esta lista se descarta después (D4).
 *
 * Se devuelven de una vez el resumen para el modelo y la tarjeta para la pantalla, de la
 * MISMA búsqueda: así no hay una segunda consulta ni riesgo de que las dos listas difieran.
 *
 * Se delega en la búsqueda de M02 para no reimplementar su relevancia ni sus reglas de
 * visibilidad. El adaptador vive en M03 y M02 no se entera.
 */
export class ContextoCatalogoAdapter implements ContextoCatalogoPort {
  constructor(private readonly busqueda: BusquedaServicePort) {}

  async buscarParaAsistente(texto: string, limite: number): Promise<ContextoDeConsulta> {
    const encontrados = new Map<number, ResultadoBusqueda>();

    // Palabra por palabra: la búsqueda de M02 compara el término contra cada campo, así que
    // una frase entera («¿qué pintura sirve para las paredes de la sala?») no coincide con
    // nada y el asistente se quedaría sin productos que recomendar. Comprobado contra la
    // base real el 2026-10-27.
    for (const palabra of palabrasClave(texto)) {
      if (encontrados.size >= limite) break;
      await this.acumular(encontrados, palabra, limite);
    }

    // Sin coincidencias, se le da lo más relevante del catálogo: es preferible a dejarlo sin
    // nada que ofrecer. Sigue siendo una lista cerrada, así que no puede inventar productos.
    if (encontrados.size === 0) {
      await this.acumular(encontrados, '', limite);
    }

    const items = [...encontrados.values()].slice(0, limite);

    return {
      // Nada de precios ni existencias en lo que ve el modelo: no habla de eso (H4).
      resumen: items.map((p) => ({
        idProducto: p.idProducto,
        nombre: p.nombre,
        marca: p.marca,
        categoria: p.categoria,
        superficies: [],
        ambientes: [],
        rendimiento: null,
      })),
      tarjetas: new Map(items.map((p) => [p.idProducto, p])),
    };
  }

  private async acumular(
    encontrados: Map<number, ResultadoBusqueda>,
    termino: string,
    limite: number,
  ): Promise<void> {
    const peticion: BuscarProductosRequest = {
      ...sinFiltros(),
      q: termino,
      ordenar: 'relevancia',
      pagina: 1,
      limite,
    };
    const pagina = await this.busqueda.buscarProductos(peticion, { idUsuario: null });
    for (const producto of pagina.items) {
      if (!encontrados.has(producto.idProducto)) encontrados.set(producto.idProducto, producto);
    }
  }
}
