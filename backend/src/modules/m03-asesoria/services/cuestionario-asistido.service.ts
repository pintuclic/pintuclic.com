import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  MAX_PREGUNTAS_CUESTIONARIO,
  type PreguntaAsistida,
  type RespuestaDada,
  type TurnoCuestionarioRequest,
} from '../dtos/asistente.dto';
import type { ResultadoCuestionario, ValorVocabulario } from '../dtos/cuestionario.dto';
import { CODIGOS_ERROR_M03, MAX_COMPLEMENTOS, VISTA_PREVIA_PRODUCTOS } from '../dtos/m03-asesoria.dto';
import type { GeminiClient } from '../gemini/gemini.client';
import { ESQUEMA_RESPUESTA_CUESTIONARIO, instruccionesCuestionario } from '../gemini/instrucciones';
import type { ResilienciaIa } from '../gemini/resiliencia-ia';
import type {
  CatalogoPreviewPort,
  ConfiguracionRepositoryPort,
  VocabularioRepositoryPort,
} from '../interfaces/cuestionario.interface';
import { AsesoriaError } from './asesoria.error';
import {
  aplicarEfectos,
  nombreDeComplemento,
  resumenFiltros,
  rutaCatalogo,
  rutaComplemento,
  type OpcionElegida,
} from './filtros-catalogo';

/** Un turno: o viene la siguiente pregunta, o viene el resultado. Nunca los dos (R6). */
export type TurnoCuestionario =
  | { fase: 'pregunta'; pregunta: PreguntaAsistida; numero: number }
  | { fase: 'resultado'; resultado: ResultadoCuestionario };

const salidaModeloSchema = z.object({
  continuar: z.boolean(),
  texto: z.string().trim().min(1).max(200),
  opciones: z
    .array(
      z.object({
        texto: z.string().trim().min(1).max(100),
        filtros: z
          .array(z.object({ dimension: z.string(), idValor: z.number().int() }))
          .max(10)
          .default([]),
        ambiente: z.string().nullish(),
        complementos: z
          .array(z.object({ dimension: z.string(), idValor: z.number().int() }))
          .max(3)
          .default([]),
      }),
    )
    .default([]),
});

const DIMENSIONES = [
  'categoria',
  'subcategoria',
  'superficie',
  'familia_color',
  'tipo_resina',
  'linea',
] as const;
type Dimension = (typeof DIMENSIONES)[number];

const esDimension = (valor: string): valor is Dimension =>
  (DIMENSIONES as readonly string[]).includes(valor);

/**
 * HU-ASE-01 — Cuestionario guiado en modo `asistido` (contrato · R4, R6, R10).
 *
 * Gemini PROPONE la pregunta y sus opciones; el SERVIDOR decide qué sobrevive. Cada filtro
 * tiene que estar en el vocabulario del catálogo activo: lo que no esté se descarta, y si una
 * opción se queda sin filtros, se descarta la opción.
 *
 * Termina exactamente igual que el modo `fijo` (D9): el mismo resultado y el mismo botón al
 * catálogo. Lo único distinto es quién formula las preguntas.
 */
export class CuestionarioAsistidoService {
  constructor(
    private readonly gemini: GeminiClient | null,
    private readonly resiliencia: ResilienciaIa,
    private readonly vocabulario: VocabularioRepositoryPort,
    private readonly configuracion: ConfiguracionRepositoryPort,
    private readonly catalogo: CatalogoPreviewPort,
  ) {}

  async turno(peticion: TurnoCuestionarioRequest): Promise<TurnoCuestionario> {
    const config = await this.configuracion.obtener();
    if (config.modoCuestionario !== 'asistido') {
      throw new AsesoriaError(
        CODIGOS_ERROR_M03.MODO_CUESTIONARIO_DISTINTO,
        'La búsqueda asistida cambió de modo. Vuelve a empezar el cuestionario.',
        409,
      );
    }

    const vocabulario = await this.vocabulario.obtener();

    // R6: al llegar al tope se cierra el flujo aunque el modelo quiera seguir.
    const alTope = peticion.respuestas.length >= MAX_PREGUNTAS_CUESTIONARIO;
    if (peticion.finalizar || alTope) {
      return { fase: 'resultado', resultado: await this.resultado(peticion.respuestas, vocabulario) };
    }

    const cliente = this.gemini;
    if (cliente === null) throw this.iaNoDisponible();

    const pregunta = await this.pedirPregunta(cliente, config, vocabulario, peticion.respuestas);

    // R4: si no queda ninguna opción utilizable, se termina con lo que haya en vez de
    // mostrar una pregunta vacía o un error técnico.
    if (pregunta === null) {
      return { fase: 'resultado', resultado: await this.resultado(peticion.respuestas, vocabulario) };
    }

    return { fase: 'pregunta', pregunta, numero: peticion.respuestas.length + 1 };
  }

  /**
   * Pide una pregunta al modelo y la depura. Si el primer intento se queda sin opciones
   * válidas se pide UNA vez más; si vuelve a fallar, devuelve `null` y el flujo termina.
   */
  private async pedirPregunta(
    cliente: GeminiClient,
    config: { iaTiempoEsperaMs: number; iaReintentos: number; iaSuspensionCuotaMinutos: number; iaFallosConsecutivosAlerta: number; guionCuestionario: string },
    vocabulario: readonly ValorVocabulario[],
    respuestas: readonly RespuestaDada[],
  ): Promise<PreguntaAsistida | null> {
    const parametros = {
      tiempoEsperaMs: config.iaTiempoEsperaMs,
      reintentos: config.iaReintentos,
      suspensionCuotaMinutos: config.iaSuspensionCuotaMinutos,
      fallosConsecutivosAlerta: config.iaFallosConsecutivosAlerta,
    };

    for (let vuelta = 0; vuelta < 2; vuelta += 1) {
      let crudo: unknown;
      try {
        crudo = await this.resiliencia.ejecutar('cuestionario', parametros, () =>
          cliente.generarJson({
            instruccionesSistema: instruccionesCuestionario(
              config.guionCuestionario,
              vocabulario,
              respuestas.map((r) => r.texto),
            ),
            turnos: [
              {
                rol: 'usuario',
                texto:
                  respuestas.length === 0
                    ? 'Empieza el cuestionario con la primera pregunta.'
                    : `Respuestas hasta ahora: ${respuestas
                        .map((r) => `${r.texto} -> ${r.omitida ? 'omitida' : (r.opcionTexto ?? '')}`)
                        .join(' | ')}. Haz la siguiente pregunta o termina.`,
              },
            ],
            esquemaRespuesta: ESQUEMA_RESPUESTA_CUESTIONARIO,
            tiempoEsperaMs: config.iaTiempoEsperaMs,
          }),
        );
      } catch {
        throw this.iaNoDisponible();
      }

      const analizado = salidaModeloSchema.safeParse(crudo);
      if (!analizado.success) continue;
      if (!analizado.data.continuar) return null;

      const depurada = this.depurar(analizado.data, vocabulario);
      if (depurada !== null) return depurada;
    }

    return null;
  }

  /** D4 — el filtro que no esté en el vocabulario se descarta; sin opciones, se descarta todo. */
  private depurar(
    salida: z.infer<typeof salidaModeloSchema>,
    vocabulario: readonly ValorVocabulario[],
  ): PreguntaAsistida | null {
    const existe = new Set(vocabulario.map((v) => `${v.dimension}:${v.idValor}`));

    const opciones = salida.opciones
      .map((opcion) => {
        const filtros = opcion.filtros.filter(
          (f) => esDimension(f.dimension) && existe.has(`${f.dimension}:${f.idValor}`),
        ) as Array<{ dimension: Dimension; idValor: number }>;

        const complementos = opcion.complementos.filter(
          (c) =>
            (c.dimension === 'categoria' || c.dimension === 'subcategoria') &&
            existe.has(`${c.dimension}:${c.idValor}`),
        ) as Array<{ dimension: 'categoria' | 'subcategoria'; idValor: number }>;

        const ambiente: 'interior' | 'exterior' | null =
          opcion.ambiente === 'interior' || opcion.ambiente === 'exterior' ? opcion.ambiente : null;

        return { idOpcion: randomUUID(), texto: opcion.texto, filtros, ambiente, complementos };
      })
      // Una opción sin ningún efecto no sirve para filtrar: se descarta.
      .filter((o) => o.filtros.length > 0 || o.ambiente !== null || o.complementos.length > 0);

    if (opciones.length < 2) return null;

    return {
      idPregunta: randomUUID(),
      texto: salida.texto,
      opciones: opciones.slice(0, 6),
      omitible: true,
    };
  }

  /**
   * El resultado final, con la MISMA capa determinista que el modo fijo (D9). Los filtros se
   * vuelven a validar aquí, porque llegaron del navegador.
   */
  private async resultado(
    respuestas: readonly RespuestaDada[],
    vocabulario: readonly ValorVocabulario[],
  ): Promise<ResultadoCuestionario> {
    const elegidas: OpcionElegida[] = respuestas
      .filter((r) => !r.omitida)
      .map((r, indice) => ({
        idPregunta: indice + 1,
        textoPregunta: r.texto,
        idOpcion: indice + 1,
        efectos: [
          ...r.filtros.map((f) => ({ tipo: 'filtrar' as const, dimension: f.dimension, idObjetivo: f.idValor })),
          ...(r.ambiente === null ? [] : [{ tipo: 'filtrar_ambiente' as const, ambiente: r.ambiente }]),
          ...r.complementos.map((c) => ({
            tipo: 'incluir' as const,
            dimension: c.dimension,
            idObjetivo: c.idValor,
            requiereOpciones: [],
          })),
        ],
      }));

    const { filtros, ambiente, complementos } = aplicarEfectos(elegidas, vocabulario);
    const propuestos = { filtros, ambiente };

    const { total, productos } = await this.catalogo.contarYMostrar(propuestos, VISTA_PREVIA_PRODUCTOS);

    const grupos: ResultadoCuestionario['complementos'] = [];
    for (const complemento of complementos.slice(0, 3)) {
      const titulo = nombreDeComplemento(complemento, vocabulario);
      if (titulo === null) continue;
      const { productos: suyos } = await this.catalogo.contarYMostrar(
        { filtros: [{ dimension: complemento.dimension, idValor: complemento.idValor }], ambiente: null },
        MAX_COMPLEMENTOS,
      );
      if (suyos.length === 0) continue;
      grupos.push({ titulo, rutaCatalogo: rutaComplemento(complemento), productos: suyos });
    }

    const ultima = respuestas.filter((r) => !r.omitida).at(-1);
    return {
      filtrosPropuestos: propuestos,
      resumenFiltros: resumenFiltros(filtros, vocabulario),
      rutaCatalogo: rutaCatalogo(propuestos),
      total,
      vistaPrevia: productos,
      complementos: grupos,
      sinResultados: total === 0,
      filtroRelajable:
        total === 0 && ultima !== undefined
          ? { idPregunta: ultima.idPregunta, texto: ultima.texto }
          : null,
    };
  }

  private iaNoDisponible(): AsesoriaError {
    return new AsesoriaError(
      CODIGOS_ERROR_M03.SERVICIO_IA_NO_DISPONIBLE,
      'La búsqueda asistida no está disponible en este momento. Puedes buscar con los filtros del catálogo.',
      503,
    );
  }
}
