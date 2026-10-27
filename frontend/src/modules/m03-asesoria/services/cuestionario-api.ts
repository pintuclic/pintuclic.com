import { apiClient } from '@/core/api/apiClient';
import type { RespuestaExitosa } from '@/core/types/respuesta-api.type';
import type {
  AmbienteAsesoria,
  ConfiguracionAsesoria,
  CuestionarioAdmin,
  CuestionarioPublico,
  DimensionComplemento,
  DimensionFiltro,
  EfectoOpcion,
  OpcionAdmin,
  PreguntaAdmin,
  RespuestaElegida,
  ResultadoCuestionario,
} from '../interfaces/cuestionario.interface';

/* ── Público ──────────────────────────────────────────────────────────────── */

export async function obtenerCuestionario(): Promise<CuestionarioPublico> {
  const { data } = await apiClient.get<RespuestaExitosa<CuestionarioPublico>>('/asesoria/cuestionario');
  return data.data;
}

/** Las respuestas viajan en el orden en que se dieron: de ahí sale cuál se ofrece quitar. */
export async function calcularResultado(
  respuestas: RespuestaElegida[],
): Promise<ResultadoCuestionario> {
  const { data } = await apiClient.post<RespuestaExitosa<ResultadoCuestionario>>(
    '/asesoria/cuestionario/resultado',
    { respuestas },
  );
  return data.data;
}

/* ── Panel ────────────────────────────────────────────────────────────────── */

export async function obtenerCuestionarioAdmin(): Promise<CuestionarioAdmin> {
  const { data } = await apiClient.get<RespuestaExitosa<CuestionarioAdmin>>(
    '/admin/asesoria/cuestionario',
  );
  return data.data;
}

export async function crearPregunta(datos: {
  texto: string;
  orden: number;
  origenOpciones: 'manual' | 'familias_color';
}): Promise<PreguntaAdmin> {
  const { data } = await apiClient.post<RespuestaExitosa<PreguntaAdmin>>(
    '/admin/asesoria/preguntas',
    datos,
  );
  return data.data;
}

export async function editarPregunta(
  idPregunta: number,
  datos: { texto?: string; orden?: number; activa?: boolean },
): Promise<PreguntaAdmin> {
  const { data } = await apiClient.patch<RespuestaExitosa<PreguntaAdmin>>(
    `/admin/asesoria/preguntas/${idPregunta}`,
    datos,
  );
  return data.data;
}

export async function crearOpcion(
  idPregunta: number,
  datos: { texto: string; orden: number },
): Promise<OpcionAdmin> {
  const { data } = await apiClient.post<RespuestaExitosa<OpcionAdmin>>(
    `/admin/asesoria/preguntas/${idPregunta}/opciones`,
    datos,
  );
  return data.data;
}

export async function editarOpcion(
  idOpcion: number,
  datos: { texto?: string; orden?: number; activa?: boolean },
): Promise<OpcionAdmin> {
  const { data } = await apiClient.patch<RespuestaExitosa<OpcionAdmin>>(
    `/admin/asesoria/opciones/${idOpcion}`,
    datos,
  );
  return data.data;
}

/** Reemplaza el conjunto completo de efectos: es la correspondencia opción → filtro. */
export async function reemplazarEfectos(
  idOpcion: number,
  efectos: EfectoOpcion[],
): Promise<OpcionAdmin> {
  const { data } = await apiClient.put<RespuestaExitosa<OpcionAdmin>>(
    `/admin/asesoria/opciones/${idOpcion}/efectos`,
    { efectos },
  );
  return data.data;
}

export async function obtenerConfiguracion(): Promise<ConfiguracionAsesoria> {
  const { data } = await apiClient.get<RespuestaExitosa<ConfiguracionAsesoria>>(
    '/admin/asesoria/configuracion',
  );
  return data.data;
}

export async function editarConfiguracion(
  datos: Partial<Omit<ConfiguracionAsesoria, 'fechaActualizacion'>>,
): Promise<ConfiguracionAsesoria> {
  const { data } = await apiClient.patch<RespuestaExitosa<ConfiguracionAsesoria>>(
    '/admin/asesoria/configuracion',
    datos,
  );
  return data.data;
}

/* ── Modo asistido (HU-ASE-01 · R6) ───────────────────────────────────────── */

export interface FiltroTurno {
  dimension: DimensionFiltro;
  idValor: number;
}

export interface ComplementoTurno {
  dimension: DimensionComplemento;
  idValor: number;
}

export interface OpcionAsistida {
  idOpcion: string;
  texto: string;
  filtros: FiltroTurno[];
  ambiente: AmbienteAsesoria | null;
  complementos: ComplementoTurno[];
}

export interface PreguntaAsistida {
  idPregunta: string;
  texto: string;
  opciones: OpcionAsistida[];
  omitible: true;
}

/**
 * Una respuesta ya dada. Lleva consigo los filtros que el servidor validó al ofrecer la
 * opción, porque el flujo es sin estado; el servidor los vuelve a comprobar en cada turno.
 */
export interface RespuestaDada {
  idPregunta: string;
  texto: string;
  idOpcion: string | null;
  opcionTexto: string | null;
  filtros: FiltroTurno[];
  ambiente: AmbienteAsesoria | null;
  complementos: ComplementoTurno[];
  omitida: boolean;
}

export type TurnoCuestionario =
  | { fase: 'pregunta'; pregunta: PreguntaAsistida; numero: number }
  | { fase: 'resultado'; resultado: ResultadoCuestionario };

export async function pedirTurno(
  respuestas: RespuestaDada[],
  finalizar = false,
): Promise<TurnoCuestionario> {
  const { data } = await apiClient.post<RespuestaExitosa<TurnoCuestionario>>(
    '/asesoria/cuestionario/turno',
    { respuestas, finalizar },
  );
  return data.data;
}
