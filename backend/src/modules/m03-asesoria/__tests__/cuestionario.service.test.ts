import { describe, expect, it } from 'vitest';
import type { ProductoPublicoTarjeta } from '../../m01-catalogo/dtos/m01-catalogo-productos.dto';
import type {
  ConfiguracionAsesoria,
  FiltrosPropuestos,
  PreguntaAdmin,
  ValorVocabulario,
} from '../dtos/cuestionario.dto';
import type {
  CatalogoPreviewPort,
  ConfiguracionRepositoryPort,
  CuestionarioRepositoryPort,
  FamiliaCromatica,
  VocabularioRepositoryPort,
} from '../interfaces/cuestionario.interface';
import { CuestionarioService } from '../services/cuestionario.service';
import { aplicarEfectos, rutaCatalogo } from '../services/filtros-catalogo';

/* ───────────────────────────────────────────────────────────────────────────
 * Catálogo de prueba: los MISMOS valores que siembra bd/sql/seed_pintuclic.sql,
 * porque el contrato (D11) exige no inventar nada que M01 no tenga.
 * ─────────────────────────────────────────────────────────────────────────── */

const VOCABULARIO: ValorVocabulario[] = [
  { dimension: 'categoria', idValor: 2, nombre: 'Preparación de superficies' },
  { dimension: 'categoria', idValor: 4, nombre: 'Impermeabilizantes' },
  { dimension: 'subcategoria', idValor: 2, nombre: 'Pinturas para fachadas' },
  { dimension: 'subcategoria', idValor: 4, nombre: 'Anticorrosivos' },
  { dimension: 'subcategoria', idValor: 8, nombre: 'Selladores e imprimantes' },
  { dimension: 'superficie', idValor: 1, nombre: 'Paredes y techos' },
  { dimension: 'superficie', idValor: 3, nombre: 'Metal' },
  { dimension: 'tipo_resina', idValor: 1, nombre: 'Base agua' },
  { dimension: 'familia_color', idValor: 3, nombre: 'Amarillos' },
];

const FAMILIAS: FamiliaCromatica[] = [
  { idFamiliaColor: 1, nombre: 'Blancos', hexadecimal: '#F5F1EA' },
  { idFamiliaColor: 3, nombre: 'Amarillos', hexadecimal: '#F5D430' },
];

/** El cuestionario sembrado, recortado a lo que hace falta para las pruebas. */
const PREGUNTAS: PreguntaAdmin[] = [
  {
    idPregunta: 1,
    texto: '¿Qué superficie va a pintar?',
    orden: 1,
    activa: true,
    origenOpciones: 'manual',
    opciones: [
      {
        idOpcion: 1,
        texto: 'Pared o techo interior',
        orden: 1,
        activa: true,
        efectos: [{ tipo: 'filtrar', dimension: 'superficie', idObjetivo: 1 }],
      },
      {
        idOpcion: 4,
        texto: 'Metal',
        orden: 4,
        activa: true,
        efectos: [{ tipo: 'filtrar', dimension: 'superficie', idObjetivo: 3 }],
      },
    ],
  },
  {
    idPregunta: 2,
    texto: '¿El espacio es abierto o cerrado?',
    orden: 2,
    activa: true,
    origenOpciones: 'manual',
    opciones: [
      {
        idOpcion: 6,
        texto: 'Interior cerrado',
        orden: 1,
        activa: true,
        efectos: [{ tipo: 'filtrar_ambiente', ambiente: 'interior' }],
      },
      {
        idOpcion: 7,
        texto: 'Exterior a la intemperie',
        orden: 2,
        activa: true,
        efectos: [
          { tipo: 'filtrar_ambiente', ambiente: 'exterior' },
          // CA-ASE-01-03
          { tipo: 'incluir', dimension: 'categoria', idObjetivo: 4, requiereOpciones: [] },
        ],
      },
    ],
  },
  {
    idPregunta: 3,
    texto: '¿Qué color desea?',
    orden: 3,
    activa: true,
    origenOpciones: 'familias_color',
    opciones: [],
  },
  {
    idPregunta: 4,
    texto: '¿En qué condiciones está la superficie?',
    orden: 4,
    activa: true,
    origenOpciones: 'manual',
    opciones: [
      {
        idOpcion: 10,
        texto: 'Deteriorada',
        orden: 3,
        activa: true,
        efectos: [
          { tipo: 'incluir', dimension: 'categoria', idObjetivo: 2, requiereOpciones: [] },
          // CA-ASE-01-02: solo si también se eligió «Metal» (opción 4)
          { tipo: 'incluir', dimension: 'subcategoria', idObjetivo: 4, requiereOpciones: [4] },
        ],
      },
    ],
  },
];

const tarjeta = (idProducto: number): ProductoPublicoTarjeta => ({
  idProducto,
  nombre: `Producto ${idProducto}`,
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
});

const CONFIG_FIJO: ConfiguracionAsesoria = {
  modoCuestionario: 'fijo',
  manosPorDefecto: null,
  guionCuestionario: '',
  guionAsistente: '',
  iaTiempoEsperaMs: 8000,
  iaReintentos: 2,
  iaSuspensionCuotaMinutos: 60,
  iaRetencionIncidentesDias: 90,
  iaFallosConsecutivosAlerta: 5,
  fechaActualizacion: new Date(0).toISOString(),
};

interface Llamada {
  filtros: FiltrosPropuestos;
  limite: number;
}

function servicio(opciones: { total?: number; modo?: 'fijo' | 'asistido' } = {}): {
  servicio: CuestionarioService;
  llamadas: Llamada[];
} {
  const llamadas: Llamada[] = [];
  const total = opciones.total ?? 12;

  const repo: CuestionarioRepositoryPort = {
    listarPublicas: async () => PREGUNTAS,
    listarTodas: async () => PREGUNTAS,
    crearPregunta: async () => PREGUNTAS[0] as PreguntaAdmin,
    editarPregunta: async () => null,
    obtenerPregunta: async () => null,
    crearOpcion: async () => null,
    editarOpcion: async () => null,
    obtenerOpcion: async () => null,
    reemplazarEfectos: async () => null,
  };

  const vocabulario: VocabularioRepositoryPort = {
    obtener: async () => VOCABULARIO,
    obtenerFamilias: async () => FAMILIAS,
  };

  const configuracion: ConfiguracionRepositoryPort = {
    obtener: async () => ({ ...CONFIG_FIJO, modoCuestionario: opciones.modo ?? 'fijo' }),
    editar: async () => CONFIG_FIJO,
  };

  const catalogo: CatalogoPreviewPort = {
    contarYMostrar: async (filtros, limite) => {
      llamadas.push({ filtros, limite });
      // Los complementos piden una sola dimensión; el principal, el conjunto completo.
      const esComplemento = filtros.filtros.length === 1 && filtros.ambiente === null;
      if (esComplemento) return { total: 3, productos: [tarjeta(90), tarjeta(91)] };
      return {
        total,
        productos: total === 0 ? [] : [tarjeta(1), tarjeta(2)],
      };
    },
  };

  return {
    servicio: new CuestionarioService(repo, vocabulario, configuracion, catalogo),
    llamadas,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════ */

describe('Capa de filtros (contrato · D9)', () => {
  it('combina Y entre dimensiones y O dentro de una misma (R5)', () => {
    const ruta = rutaCatalogo({
      filtros: [
        { dimension: 'superficie', idValor: 1 },
        { dimension: 'superficie', idValor: 3 },
        { dimension: 'tipo_resina', idValor: 1 },
      ],
      ambiente: 'interior',
    });

    expect(ruta).toBe('/productos?idSuperficie=1%2C3&idTipoResina=1&ambiente=interior');
  });

  it('sin filtros lleva al catálogo completo', () => {
    expect(rutaCatalogo({ filtros: [], ambiente: null })).toBe('/productos');
  });

  it('F4: ignora sin error un efecto que apunta a algo que ya no está activo', () => {
    const aplicado = aplicarEfectos(
      [
        {
          idPregunta: 1,
          textoPregunta: 'x',
          idOpcion: 1,
          efectos: [
            { tipo: 'filtrar', dimension: 'superficie', idObjetivo: 1 },
            // La subcategoría 999 no está en el vocabulario: se desactivó.
            { tipo: 'filtrar', dimension: 'subcategoria', idObjetivo: 999 },
          ],
        },
      ],
      VOCABULARIO,
    );

    expect(aplicado.filtros).toEqual([{ dimension: 'superficie', idValor: 1 }]);
  });

  it('no repite un filtro que llega por dos opciones distintas', () => {
    const aplicado = aplicarEfectos(
      [
        { idPregunta: 1, textoPregunta: 'a', idOpcion: 1, efectos: [{ tipo: 'filtrar', dimension: 'superficie', idObjetivo: 1 }] },
        { idPregunta: 2, textoPregunta: 'b', idOpcion: 2, efectos: [{ tipo: 'filtrar', dimension: 'superficie', idObjetivo: 1 }] },
      ],
      VOCABULARIO,
    );

    expect(aplicado.filtros).toHaveLength(1);
  });
});

describe('CuestionarioService — modo fijo (HU-ASE-01)', () => {
  describe('CA-ASE-01-01: el cuestionario es público', () => {
    it('entrega las preguntas activas con sus opciones', async () => {
      const { servicio: s } = servicio();
      const cuestionario = await s.obtenerPublico();

      expect(cuestionario.modo).toBe('fijo');
      expect(cuestionario.disponible).toBe(true);
      expect(cuestionario.preguntas.map((p) => p.texto)).toEqual([
        '¿Qué superficie va a pintar?',
        '¿El espacio es abierto o cerrado?',
        '¿Qué color desea?',
        '¿En qué condiciones está la superficie?',
      ]);
    });

    it('F3: la pregunta de color toma sus opciones de las familias del catálogo', async () => {
      const { servicio: s } = servicio();
      const cuestionario = await s.obtenerPublico();
      const color = cuestionario.preguntas.find((p) => p.origenOpciones === 'familias_color');

      expect(color?.opciones).toEqual([
        { idOpcion: 1, texto: 'Blancos', hexadecimal: '#F5F1EA' },
        { idOpcion: 3, texto: 'Amarillos', hexadecimal: '#F5D430' },
      ]);
    });
  });

  describe('el botón al catálogo (R5, R7)', () => {
    it('traduce las respuestas a la URL del catálogo con los filtros aplicados', async () => {
      const { servicio: s } = servicio();
      const resultado = await s.calcularResultado({
        respuestas: [
          { idPregunta: 1, idOpcion: 1 },
          { idPregunta: 2, idOpcion: 6 },
        ],
      });

      expect(resultado.rutaCatalogo).toBe('/productos?idSuperficie=1&ambiente=interior');
      expect(resultado.total).toBe(12);
      expect(resultado.vistaPrevia).toHaveLength(2);
    });

    it('resume con nombres legibles lo que se va a aplicar', async () => {
      const { servicio: s } = servicio();
      const resultado = await s.calcularResultado({ respuestas: [{ idPregunta: 1, idOpcion: 4 }] });

      expect(resultado.resumenFiltros).toEqual([
        { dimension: 'superficie', idValor: 3, nombre: 'Metal' },
      ]);
    });

    it('la familia cromática elegida se convierte en su filtro (F3)', async () => {
      const { servicio: s } = servicio();
      const resultado = await s.calcularResultado({ respuestas: [{ idPregunta: 3, idOpcion: 3 }] });

      expect(resultado.rutaCatalogo).toBe('/productos?idFamiliaColor=3');
    });

    it('CA-ASE-01-06: omitir una pregunta aplica solo los filtros de las respondidas', async () => {
      const { servicio: s } = servicio();
      const soloSuperficie = await s.calcularResultado({ respuestas: [{ idPregunta: 1, idOpcion: 1 }] });

      expect(soloSuperficie.rutaCatalogo).toBe('/productos?idSuperficie=1');
    });

    it('sin ninguna respuesta lleva al catálogo completo', async () => {
      const { servicio: s } = servicio();
      const resultado = await s.calcularResultado({ respuestas: [] });

      expect(resultado.rutaCatalogo).toBe('/productos');
      expect(resultado.filtroRelajable).toBeNull();
    });
  });

  describe('complementos (R8)', () => {
    it('CA-ASE-01-03: a la intemperie el resultado incluye impermeabilizantes', async () => {
      const { servicio: s } = servicio();
      const resultado = await s.calcularResultado({ respuestas: [{ idPregunta: 2, idOpcion: 7 }] });

      expect(resultado.complementos.map((c) => c.titulo)).toEqual(['Impermeabilizantes']);
      expect(resultado.complementos[0]?.rutaCatalogo).toBe('/productos?idCategoria=4');
    });

    it('CA-ASE-01-02: metal deteriorado incluye anticorrosivos', async () => {
      const { servicio: s } = servicio();
      const resultado = await s.calcularResultado({
        respuestas: [
          { idPregunta: 1, idOpcion: 4 },
          { idPregunta: 4, idOpcion: 10 },
        ],
      });

      expect(resultado.complementos.map((c) => c.titulo)).toEqual([
        'Preparación de superficies',
        'Anticorrosivos',
      ]);
    });

    it('la superficie deteriorada SIN metal no propone anticorrosivos', async () => {
      const { servicio: s } = servicio();
      const resultado = await s.calcularResultado({
        respuestas: [
          { idPregunta: 1, idOpcion: 1 },
          { idPregunta: 4, idOpcion: 10 },
        ],
      });

      expect(resultado.complementos.map((c) => c.titulo)).toEqual(['Preparación de superficies']);
    });

    it('los complementos NO entran en los filtros del botón principal', async () => {
      const { servicio: s } = servicio();
      const resultado = await s.calcularResultado({ respuestas: [{ idPregunta: 2, idOpcion: 7 }] });

      // Si entraran, la URL pediría a la vez exterior y la categoría de impermeabilizantes.
      expect(resultado.rutaCatalogo).toBe('/productos?ambiente=exterior');
    });
  });

  describe('CA-ASE-01-07: sin resultados', () => {
    it('lo informa y ofrece quitar la última respuesta', async () => {
      const { servicio: s } = servicio({ total: 0 });
      const resultado = await s.calcularResultado({
        respuestas: [
          { idPregunta: 1, idOpcion: 1 },
          { idPregunta: 2, idOpcion: 6 },
        ],
      });

      expect(resultado.sinResultados).toBe(true);
      expect(resultado.filtroRelajable).toEqual({
        idPregunta: '2',
        texto: '¿El espacio es abierto o cerrado?',
      });
      // La ruta se entrega igual, para poder ir al catálogo y ajustar a mano.
      expect(resultado.rutaCatalogo).toContain('/productos?');
    });

    it('con resultados no ofrece relajar nada', async () => {
      const { servicio: s } = servicio({ total: 5 });
      const resultado = await s.calcularResultado({ respuestas: [{ idPregunta: 1, idOpcion: 1 }] });

      expect(resultado.sinResultados).toBe(false);
      expect(resultado.filtroRelajable).toBeNull();
    });
  });

  describe('R11: respuestas que ya no valen', () => {
    it('rechaza una pregunta que no existe', async () => {
      const { servicio: s } = servicio();
      await expect(
        s.calcularResultado({ respuestas: [{ idPregunta: 999, idOpcion: 1 }] }),
      ).rejects.toMatchObject({ code: 'PARAMETRO_INVALIDO', status: 400 });
    });

    it('rechaza una opción que no es de esa pregunta', async () => {
      const { servicio: s } = servicio();
      await expect(
        s.calcularResultado({ respuestas: [{ idPregunta: 1, idOpcion: 6 }] }),
      ).rejects.toMatchObject({ code: 'PARAMETRO_INVALIDO', status: 400 });
    });

    it('rechaza una familia cromática inexistente', async () => {
      const { servicio: s } = servicio();
      await expect(
        s.calcularResultado({ respuestas: [{ idPregunta: 3, idOpcion: 99 }] }),
      ).rejects.toMatchObject({ code: 'PARAMETRO_INVALIDO', status: 400 });
    });
  });

  describe('modo asistido (E4, todavía sin construir)', () => {
    it('se declara no disponible en vez de fingir', async () => {
      const { servicio: s } = servicio({ modo: 'asistido' });
      const cuestionario = await s.obtenerPublico();

      expect(cuestionario).toEqual({ modo: 'asistido', preguntas: [], disponible: false });
    });

    it('pedir el resultado del modo fijo cuando está en asistido responde 409', async () => {
      const { servicio: s } = servicio({ modo: 'asistido' });
      await expect(s.calcularResultado({ respuestas: [] })).rejects.toMatchObject({
        code: 'MODO_CUESTIONARIO_DISTINTO',
        status: 409,
      });
    });
  });

  describe('R7: la vista previa la resuelve M02', () => {
    it('le pasa los filtros propuestos y el tope de tarjetas', async () => {
      const { servicio: s, llamadas } = servicio();
      await s.calcularResultado({ respuestas: [{ idPregunta: 1, idOpcion: 1 }] });

      expect(llamadas[0]).toEqual({
        filtros: { filtros: [{ dimension: 'superficie', idValor: 1 }], ambiente: null },
        limite: 6,
      });
    });
  });
});
