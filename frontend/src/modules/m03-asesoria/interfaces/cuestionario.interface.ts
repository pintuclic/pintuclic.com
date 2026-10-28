/**
 * Tipos del cuestionario guiado (HU-ASE-01). Espejo del contrato. Solo tipos: cero runtime.
 */

export type ModoCuestionario = 'fijo' | 'asistido';

export type DimensionFiltro =
  | 'categoria'
  | 'subcategoria'
  | 'superficie'
  | 'familia_color'
  | 'tipo_resina'
  | 'linea';

export type DimensionComplemento = 'categoria' | 'subcategoria';
export type AmbienteAsesoria = 'interior' | 'exterior';
export type OrigenOpciones = 'manual' | 'familias_color';

export interface OpcionPublica {
  idOpcion: number;
  texto: string;
  /** Solo en las preguntas de color: la muestra de la familia. */
  hexadecimal: string | null;
}

export interface PreguntaPublica {
  idPregunta: number;
  texto: string;
  origenOpciones: OrigenOpciones;
  opciones: OpcionPublica[];
}

export interface CuestionarioPublico {
  modo: ModoCuestionario;
  preguntas: PreguntaPublica[];
  disponible: boolean;
}

export interface FiltroCatalogo {
  dimension: DimensionFiltro;
  idValor: number;
}

export interface ValorVocabulario {
  dimension: DimensionFiltro;
  idValor: number;
  nombre: string;
}

export interface GrupoComplemento {
  titulo: string;
  rutaCatalogo: string;
  productos: TarjetaProducto[];
}

/** Lo que la vista previa necesita de la tarjeta pública de M01. */
export interface TarjetaProducto {
  idProducto: number;
  nombre: string;
  marca: string;
  categoria: string;
  subcategoria: string;
  precioDesde: number | null;
  idImagenPrincipal: number | null;
}

export interface ResultadoCuestionario {
  filtrosPropuestos: { filtros: FiltroCatalogo[]; ambiente: AmbienteAsesoria | null };
  resumenFiltros: ValorVocabulario[];
  /** Ruta del catálogo con los filtros ya aplicados: el botón del final. */
  rutaCatalogo: string;
  total: number;
  vistaPrevia: TarjetaProducto[];
  complementos: GrupoComplemento[];
  sinResultados: boolean;
  filtroRelajable: { idPregunta: string; texto: string } | null;
}

export interface RespuestaElegida {
  idPregunta: number;
  idOpcion: number;
}

/* ── Panel ────────────────────────────────────────────────────────────────── */

export type EfectoOpcion =
  | { tipo: 'filtrar'; dimension: DimensionFiltro; idObjetivo: number }
  | { tipo: 'filtrar_ambiente'; ambiente: AmbienteAsesoria }
  | { tipo: 'incluir'; dimension: DimensionComplemento; idObjetivo: number; requiereOpciones: number[] };

export interface OpcionAdmin {
  idOpcion: number;
  texto: string;
  orden: number;
  activa: boolean;
  efectos: EfectoOpcion[];
}

export interface PreguntaAdmin {
  idPregunta: number;
  texto: string;
  orden: number;
  activa: boolean;
  origenOpciones: OrigenOpciones;
  opciones: OpcionAdmin[];
}

export interface CuestionarioAdmin {
  modo: ModoCuestionario;
  preguntas: PreguntaAdmin[];
  /** Objetivos que el administrador puede elegir para un efecto. */
  vocabulario: ValorVocabulario[];
}

export interface ConfiguracionAsesoria {
  modoCuestionario: ModoCuestionario;
  manosPorDefecto: number | null;
  guionCuestionario: string;
  guionAsistente: string;
  iaTiempoEsperaMs: number;
  iaReintentos: number;
  iaSuspensionCuotaMinutos: number;
  iaRetencionIncidentesDias: number;
  iaFallosConsecutivosAlerta: number;
  fechaActualizacion: string;
}
