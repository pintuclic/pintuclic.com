import { RUTA_CATALOGO } from '../dtos/m03-asesoria.dto';
import type {
  AmbienteAsesoria,
  DimensionComplemento,
  DimensionFiltro,
  EfectoOpcion,
  FiltroCatalogo,
  FiltrosPropuestos,
  ValorVocabulario,
} from '../dtos/cuestionario.dto';

/**
 * CAPA COMPARTIDA del cuestionario (contrato · D9).
 *
 * Traduce las respuestas a filtros del catálogo y arma la URL del botón. Es DETERMINISTA y
 * no habla con ningún servicio de IA: la usan igual el modo `fijo` y el `asistido`, y por eso
 * cambiar de modo no obliga a rehacer nada de esto.
 *
 * Es también el ÚNICO punto de M03 que conoce el formato de la URL del catálogo de M02 (R5).
 */

/** Nombre del parámetro que M02 lee para cada dimensión (`filtrosDesdeUrl` de M02). */
const PARAMETRO: Readonly<Record<DimensionFiltro, string>> = {
  categoria: 'idCategoria',
  subcategoria: 'idSubcategoria',
  superficie: 'idSuperficie',
  familia_color: 'idFamiliaColor',
  tipo_resina: 'idTipoResina',
  linea: 'idLinea',
};

export interface OpcionElegida {
  idPregunta: number;
  textoPregunta: string;
  idOpcion: number;
  efectos: readonly EfectoOpcion[];
}

export interface Complemento {
  dimension: DimensionComplemento;
  idValor: number;
}

export interface EfectosAplicados {
  filtros: FiltroCatalogo[];
  ambiente: AmbienteAsesoria | null;
  complementos: Complemento[];
}

const claveFiltro = (f: { dimension: string; idValor: number }): string => `${f.dimension}:${f.idValor}`;

/**
 * Aplica los efectos de las opciones elegidas (F2, R5).
 *
 * Un efecto cuyo objetivo ya no existe o se desactivó en el catálogo se IGNORA sin error
 * (F4): el administrador pudo desactivar una subcategoría después de apuntarla, y eso no
 * debe romper el flujo de quien está respondiendo.
 *
 * `incluir` solo aplica si también están elegidas las opciones que exige
 * (`requiereOpciones`), que es como se cumple «metal + deteriorada → anticorrosivos».
 */
export function aplicarEfectos(
  elegidas: readonly OpcionElegida[],
  vocabulario: readonly ValorVocabulario[],
): EfectosAplicados {
  const existe = new Set(vocabulario.map(claveFiltro));
  const idsElegidos = new Set(elegidas.map((e) => e.idOpcion));

  const filtros: FiltroCatalogo[] = [];
  const vistosFiltro = new Set<string>();
  const complementos: Complemento[] = [];
  const vistosComplemento = new Set<string>();
  let ambiente: AmbienteAsesoria | null = null;

  for (const elegida of elegidas) {
    for (const efecto of elegida.efectos) {
      if (efecto.tipo === 'filtrar_ambiente') {
        // Un solo `ambiente` cabe en la URL de M02: gana la última respuesta, que es la
        // intención más reciente de quien responde.
        ambiente = efecto.ambiente;
        continue;
      }

      const clave = claveFiltro({ dimension: efecto.dimension, idValor: efecto.idObjetivo });
      if (!existe.has(clave)) continue;

      if (efecto.tipo === 'filtrar') {
        if (vistosFiltro.has(clave)) continue;
        vistosFiltro.add(clave);
        filtros.push({ dimension: efecto.dimension, idValor: efecto.idObjetivo });
        continue;
      }

      const faltaAlguna = efecto.requiereOpciones.some((id) => !idsElegidos.has(id));
      if (faltaAlguna || vistosComplemento.has(clave)) continue;
      vistosComplemento.add(clave);
      complementos.push({ dimension: efecto.dimension, idValor: efecto.idObjetivo });
    }
  }

  return { filtros, ambiente, complementos };
}

/**
 * Arma la ruta del catálogo (R5). Los valores de una misma dimensión van separados por coma,
 * que es como M02 los lee, y entre dimensiones se combinan con Y.
 */
export function rutaCatalogo(propuestos: FiltrosPropuestos): string {
  const params = new URLSearchParams();

  for (const dimension of Object.keys(PARAMETRO) as DimensionFiltro[]) {
    const ids = propuestos.filtros.filter((f) => f.dimension === dimension).map((f) => f.idValor);
    if (ids.length > 0) params.set(PARAMETRO[dimension], ids.join(','));
  }

  if (propuestos.ambiente !== null) params.set('ambiente', propuestos.ambiente);

  const consulta = params.toString();
  return consulta === '' ? RUTA_CATALOGO : `${RUTA_CATALOGO}?${consulta}`;
}

/** Ruta de un grupo de complementos, para su enlace «Ver» propio (R8). */
export function rutaComplemento(complemento: Complemento): string {
  return rutaCatalogo({
    filtros: [{ dimension: complemento.dimension, idValor: complemento.idValor }],
    ambiente: null,
  });
}

/** Los nombres legibles de lo aplicado, en el orden en que se eligieron. */
export function resumenFiltros(
  filtros: readonly FiltroCatalogo[],
  vocabulario: readonly ValorVocabulario[],
): ValorVocabulario[] {
  const porClave = new Map(vocabulario.map((v) => [claveFiltro(v), v]));
  const resumen: ValorVocabulario[] = [];
  for (const filtro of filtros) {
    const valor = porClave.get(claveFiltro(filtro));
    if (valor !== undefined) resumen.push(valor);
  }
  return resumen;
}

/** El nombre de un complemento, para titular su grupo. */
export function nombreDeComplemento(
  complemento: Complemento,
  vocabulario: readonly ValorVocabulario[],
): string | null {
  return vocabulario.find((v) => claveFiltro(v) === claveFiltro(complemento))?.nombre ?? null;
}
