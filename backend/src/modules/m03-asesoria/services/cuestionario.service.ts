import { CODIGOS_ERROR_M03, MAX_COMPLEMENTOS, VISTA_PREVIA_PRODUCTOS } from '../dtos/m03-asesoria.dto';
import type {
  CuestionarioPublico,
  PreguntaAdmin,
  PreguntaPublica,
  ResultadoCuestionario,
  ResultadoFijoRequest,
  ValorVocabulario,
} from '../dtos/cuestionario.dto';
import type {
  CatalogoPreviewPort,
  ConfiguracionRepositoryPort,
  CuestionarioRepositoryPort,
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

/**
 * HU-ASE-01 — Cuestionario guiado, modo `fijo`.
 *
 * Público y SIN ESTADO (R1): cada petición trae las respuestas dadas y el servidor no guarda
 * nada, así que salir del flujo las olvida (CA-ASE-01-08). Retroceder y cambiar una respuesta
 * es volver a pedir el resultado con las respuestas vigentes (CA-ASE-01-05).
 *
 * Termina en un botón al catálogo con los filtros ya aplicados, que es el resultado que pidió
 * el Product Owner y el mismo que entregará el modo `asistido` (D9).
 */
export class CuestionarioService {
  constructor(
    private readonly repo: CuestionarioRepositoryPort,
    private readonly vocabulario: VocabularioRepositoryPort,
    private readonly configuracion: ConfiguracionRepositoryPort,
    private readonly catalogo: CatalogoPreviewPort,
    /**
     * R10: en modo `asistido`, si la IA no responde la pantalla no debe fingir que sí.
     * Se inyecta como función para no acoplar este servicio al cliente de Gemini.
     */
    private readonly iaDisponible: () => boolean = () => false,
  ) {}

  /** GET /asesoria/cuestionario — el modo vigente y, si es `fijo`, las preguntas (R2). */
  async obtenerPublico(): Promise<CuestionarioPublico> {
    const { modoCuestionario } = await this.configuracion.obtener();

    if (modoCuestionario === 'asistido') {
      // Las preguntas las propone el modelo turno a turno, así que aquí no viaja ninguna.
      // Si la IA no está disponible, se dice: la pantalla ofrece el catálogo (R10).
      return { modo: 'asistido', preguntas: [], disponible: this.iaDisponible() };
    }

    const [preguntas, familias] = await Promise.all([
      this.repo.listarPublicas(),
      this.vocabulario.obtenerFamilias(),
    ]);

    const publicas: PreguntaPublica[] = preguntas.map((p) => ({
      idPregunta: p.idPregunta,
      texto: p.texto,
      origenOpciones: p.origenOpciones,
      opciones:
        p.origenOpciones === 'familias_color'
          ? // F3: las opciones son las familias cromáticas del catálogo, no filas propias.
            familias.map((f) => ({
              idOpcion: f.idFamiliaColor,
              texto: f.nombre,
              hexadecimal: f.hexadecimal,
            }))
          : p.opciones.map((o) => ({ idOpcion: o.idOpcion, texto: o.texto, hexadecimal: null })),
    }));

    // Una pregunta manual sin opciones activas no se puede responder: se omite en vez de
    // mostrar una pregunta vacía.
    return {
      modo: 'fijo',
      preguntas: publicas.filter((p) => p.opciones.length > 0),
      disponible: true,
    };
  }

  /** POST /asesoria/cuestionario/resultado — el botón al catálogo y la vista previa. */
  async calcularResultado(peticion: ResultadoFijoRequest): Promise<ResultadoCuestionario> {
    const { modoCuestionario } = await this.configuracion.obtener();
    if (modoCuestionario !== 'fijo') {
      throw new AsesoriaError(
        CODIGOS_ERROR_M03.MODO_CUESTIONARIO_DISTINTO,
        'La búsqueda asistida cambió de modo. Vuelve a empezar el cuestionario.',
        409,
      );
    }

    const [preguntas, vocabulario] = await Promise.all([
      this.repo.listarPublicas(),
      this.vocabulario.obtener(),
    ]);

    const elegidas = this.resolverElegidas(peticion, preguntas, vocabulario);
    const { filtros, ambiente, complementos } = aplicarEfectos(elegidas, vocabulario);
    const propuestos = { filtros, ambiente };

    const { total, productos } = await this.catalogo.contarYMostrar(propuestos, VISTA_PREVIA_PRODUCTOS);

    const gruposComplemento = await this.resolverComplementos(complementos, vocabulario);

    const ultima = elegidas.at(-1);
    return {
      filtrosPropuestos: propuestos,
      resumenFiltros: resumenFiltros(filtros, vocabulario),
      rutaCatalogo: rutaCatalogo(propuestos),
      total,
      vistaPrevia: productos,
      complementos: gruposComplemento,
      sinResultados: total === 0,
      // R9: se ofrece quitar la ÚLTIMA respuesta, que es la que más acotó el resultado.
      filtroRelajable:
        total === 0 && ultima !== undefined
          ? { idPregunta: String(ultima.idPregunta), texto: ultima.textoPregunta }
          : null,
    };
  }

  /**
   * Comprueba cada respuesta contra el cuestionario vigente (R11) y recoge los efectos de la
   * opción elegida. Una pregunta u opción que ya no existe o se desactivó se rechaza con 400:
   * la pantalla vuelve a cargar el cuestionario y la persona responde de nuevo.
   */
  private resolverElegidas(
    peticion: ResultadoFijoRequest,
    preguntas: readonly PreguntaAdmin[],
    vocabulario: readonly ValorVocabulario[],
  ): OpcionElegida[] {
    const porId = new Map(preguntas.map((p) => [p.idPregunta, p]));
    const familias = new Set(
      vocabulario.filter((v) => v.dimension === 'familia_color').map((v) => v.idValor),
    );

    const elegidas: OpcionElegida[] = [];
    for (const respuesta of peticion.respuestas) {
      const pregunta = porId.get(respuesta.idPregunta);
      if (pregunta === undefined) {
        throw this.respuestaInvalida();
      }

      if (pregunta.origenOpciones === 'familias_color') {
        // F3: la opción ES la familia cromática, y su efecto se deriva, no se guarda.
        if (!familias.has(respuesta.idOpcion)) throw this.respuestaInvalida();
        elegidas.push({
          idPregunta: pregunta.idPregunta,
          textoPregunta: pregunta.texto,
          idOpcion: respuesta.idOpcion,
          efectos: [{ tipo: 'filtrar', dimension: 'familia_color', idObjetivo: respuesta.idOpcion }],
        });
        continue;
      }

      const opcion = pregunta.opciones.find((o) => o.idOpcion === respuesta.idOpcion);
      if (opcion === undefined) throw this.respuestaInvalida();

      elegidas.push({
        idPregunta: pregunta.idPregunta,
        textoPregunta: pregunta.texto,
        idOpcion: opcion.idOpcion,
        efectos: opcion.efectos,
      });
    }

    return elegidas;
  }

  /**
   * R8 — los preparatorios van aparte, con su propio enlace al catálogo. No entran en los
   * filtros del botón principal porque M02 los combina con Y y meterlos ahí dejaría el
   * resultado vacío: un vinilo no es a la vez un anticorrosivo.
   */
  private async resolverComplementos(
    complementos: ReadonlyArray<{ dimension: 'categoria' | 'subcategoria'; idValor: number }>,
    vocabulario: readonly ValorVocabulario[],
  ): Promise<ResultadoCuestionario['complementos']> {
    const grupos: ResultadoCuestionario['complementos'] = [];

    // Como mucho tres grupos, para no convertir el resultado en otro catálogo.
    for (const complemento of complementos.slice(0, 3)) {
      const titulo = nombreDeComplemento(complemento, vocabulario);
      if (titulo === null) continue;

      const { productos } = await this.catalogo.contarYMostrar(
        { filtros: [{ dimension: complemento.dimension, idValor: complemento.idValor }], ambiente: null },
        MAX_COMPLEMENTOS,
      );
      if (productos.length === 0) continue;

      grupos.push({ titulo, rutaCatalogo: rutaComplemento(complemento), productos });
    }

    return grupos;
  }

  private respuestaInvalida(): AsesoriaError {
    return new AsesoriaError(
      CODIGOS_ERROR_M03.PARAMETRO_INVALIDO,
      'Alguna de tus respuestas ya no está disponible. Vuelve a empezar el cuestionario.',
      400,
    );
  }
}
