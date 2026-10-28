'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Search, SlidersHorizontal } from 'lucide-react';
import { Alert, Button, ButtonLink, Skeleton } from '@/core/components';
import type {
  CuestionarioPublico,
  PreguntaPublica,
  RespuestaElegida,
  ResultadoCuestionario,
} from '../../interfaces/cuestionario.interface';
import { calcularResultado, obtenerCuestionario } from '../../services/cuestionario-api';
import { mensajeDeError } from '../../services/mensaje-error';
import { CuestionarioAsistidoFlow } from './CuestionarioAsistidoFlow';

/**
 * HU-ASE-01 — Búsqueda asistida por preguntas guiadas.
 *
 * Una pregunta a la vez, todas omitibles (R3). Las respuestas viven SOLO en la memoria de
 * esta pantalla: no se guardan en el navegador ni en la URL, así que salir del flujo las
 * olvida (CA-ASE-01-08). Retroceder y cambiar una respuesta vuelve a pedir el resultado con
 * las vigentes (CA-ASE-01-05).
 *
 * Termina en un botón al catálogo con los filtros ya aplicados.
 */
export function CuestionarioGuiadoView() {
  const [cuestionario, setCuestionario] = useState<CuestionarioPublico | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [indice, setIndice] = useState(0);
  const [respuestas, setRespuestas] = useState<RespuestaElegida[]>([]);
  const [resultado, setResultado] = useState<ResultadoCuestionario | null>(null);
  const [calculando, setCalculando] = useState(false);

  useEffect(() => {
    let vigente = true;
    obtenerCuestionario()
      .then((c) => {
        if (vigente) setCuestionario(c);
      })
      .catch((err: unknown) => {
        if (vigente) setError(mensajeDeError(err, 'No pudimos cargar la búsqueda asistida.'));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  const pedirResultado = async (vigentes: RespuestaElegida[]): Promise<void> => {
    setCalculando(true);
    setError(null);
    try {
      setResultado(await calcularResultado(vigentes));
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No pudimos calcular el resultado. Inténtalo de nuevo.'));
    } finally {
      setCalculando(false);
    }
  };

  const preguntas = cuestionario?.preguntas ?? [];
  const pregunta = preguntas[indice];

  const avanzar = async (nuevas: RespuestaElegida[]): Promise<void> => {
    setRespuestas(nuevas);
    if (indice + 1 < preguntas.length) {
      setIndice(indice + 1);
      return;
    }
    await pedirResultado(nuevas);
  };

  const responder = async (idOpcion: number): Promise<void> => {
    if (pregunta === undefined) return;
    const sinEsta = respuestas.filter((r) => r.idPregunta !== pregunta.idPregunta);
    await avanzar([...sinEsta, { idPregunta: pregunta.idPregunta, idOpcion }]);
  };

  /** R3: omitir no aporta filtros, y se quita la respuesta anterior si la había. */
  const omitir = async (): Promise<void> => {
    if (pregunta === undefined) return;
    await avanzar(respuestas.filter((r) => r.idPregunta !== pregunta.idPregunta));
  };

  const atras = (): void => {
    setResultado(null);
    setIndice((i) => Math.max(0, i - 1));
  };

  /** CA-ASE-01-07: quitar la última respuesta y volver a calcular. */
  const relajarUltimo = async (): Promise<void> => {
    const vigentes = respuestas.slice(0, -1);
    setRespuestas(vigentes);
    setIndice(Math.max(0, vigentes.length));
    await pedirResultado(vigentes);
  };

  const empezarDeNuevo = (): void => {
    setRespuestas([]);
    setIndice(0);
    setResultado(null);
    setError(null);
  };

  if (cargando) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // R10: si la búsqueda asistida no está disponible, se dice y se ofrece el catálogo.
  if (cuestionario !== null && !cuestionario.disponible) {
    return <NoDisponible />;
  }

  // El modo lo decide el panel y se cambia en caliente (D3). En `asistido` las preguntas
  // las propone el modelo turno a turno, así que el flujo es otro; el resultado, el mismo.
  if (cuestionario !== null && cuestionario.modo === 'asistido') {
    return <CuestionarioAsistidoFlow />;
  }

  if (cuestionario === null || preguntas.length === 0) {
    return error === null ? <NoDisponible /> : <Alert variant="error">{error}</Alert>;
  }

  if (resultado !== null) {
    return (
      <Resultado
        resultado={resultado}
        onRelajar={relajarUltimo}
        onEmpezarDeNuevo={empezarDeNuevo}
        calculando={calculando}
      />
    );
  }

  return (
    <div className="space-y-6">
      {error !== null && <Alert variant="error">{error}</Alert>}

      <Paso numero={indice + 1} total={preguntas.length} />

      {pregunta !== undefined && (
        <Pregunta
          pregunta={pregunta}
          elegida={respuestas.find((r) => r.idPregunta === pregunta.idPregunta)?.idOpcion ?? null}
          onResponder={responder}
          deshabilitado={calculando}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        {indice > 0 && (
          <Button variant="outline" onClick={atras} leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Atrás
          </Button>
        )}
        <Button variant="outline" onClick={omitir} isLoading={calculando}>
          Omitir esta pregunta
        </Button>
        <Link
          href="/productos"
          className="rounded-xs font-sans text-sm text-neutral-medium underline transition-colors hover:text-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
        >
          Salir e ir al catálogo
        </Link>
      </div>
    </div>
  );
}

function Paso({ numero, total }: { numero: number; total: number }) {
  return (
    <div className="space-y-2">
      <p className="font-sans text-xs font-medium uppercase tracking-wide text-neutral-medium">
        Pregunta {numero} de {total}
      </p>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-light"
        role="progressbar"
        aria-valuenow={numero}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`Pregunta ${numero} de ${total}`}
      >
        <div
          className="h-full rounded-full bg-action transition-all"
          style={{ width: `${(numero / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

function Pregunta({
  pregunta,
  elegida,
  onResponder,
  deshabilitado,
}: {
  pregunta: PreguntaPublica;
  elegida: number | null;
  onResponder: (idOpcion: number) => void;
  deshabilitado: boolean;
}) {
  const esColor = pregunta.origenOpciones === 'familias_color';

  return (
    <fieldset disabled={deshabilitado} className="space-y-4">
      <legend className="font-title text-xl font-semibold text-neutral-dark sm:text-2xl">
        {pregunta.texto}
      </legend>

      <div className={esColor ? 'grid gap-3 sm:grid-cols-3' : 'grid gap-3 sm:grid-cols-2'}>
        {pregunta.opciones.map((opcion) => (
          <button
            key={opcion.idOpcion}
            type="button"
            onClick={() => onResponder(opcion.idOpcion)}
            aria-pressed={elegida === opcion.idOpcion}
            className={`flex items-center gap-3 rounded-lg border p-4 text-left font-sans text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 disabled:opacity-60 ${
              elegida === opcion.idOpcion
                ? 'border-action bg-action/5 text-neutral-dark'
                : 'border-neutral-light bg-white text-neutral-dark hover:border-action hover:bg-action/5'
            }`}
          >
            {opcion.hexadecimal !== null && (
              <span
                aria-hidden="true"
                className="h-7 w-7 shrink-0 rounded-full border border-neutral-light"
                style={{ backgroundColor: opcion.hexadecimal }}
              />
            )}
            <span className="font-medium">{opcion.texto}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * El resultado es IDÉNTICO en los dos modos (contrato · D9), así que lo comparten: el modo
 * asistido importa este mismo componente. Por eso cambiar de modo no duplica pantalla.
 */
export function Resultado({
  resultado,
  onRelajar,
  onEmpezarDeNuevo,
  calculando,
}: {
  resultado: ResultadoCuestionario;
  onRelajar: () => void;
  onEmpezarDeNuevo: () => void;
  calculando: boolean;
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="font-title text-xl font-semibold text-neutral-dark sm:text-2xl">
          {resultado.sinResultados
            ? 'No encontramos pinturas con todo lo que elegiste'
            : `Encontramos ${resultado.total} ${resultado.total === 1 ? 'producto' : 'productos'} para tu proyecto`}
        </h2>

        {resultado.resumenFiltros.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {resultado.resumenFiltros.map((f) => (
              <li
                key={`${f.dimension}-${f.idValor}`}
                className="rounded-full bg-neutral-lightest px-3 py-1 font-sans text-xs text-neutral-dark"
              >
                {f.nombre}
              </li>
            ))}
            {resultado.filtrosPropuestos.ambiente !== null && (
              <li className="rounded-full bg-neutral-lightest px-3 py-1 font-sans text-xs text-neutral-dark">
                {resultado.filtrosPropuestos.ambiente === 'interior' ? 'Interior' : 'Exterior'}
              </li>
            )}
          </ul>
        )}
      </header>

      {/* CA-ASE-01-07: se informa y se ofrece relajar el último filtro. */}
      {resultado.sinResultados && resultado.filtroRelajable !== null && (
        <Alert variant="info" title="Prueba con menos condiciones">
          <p className="mb-3">
            Tu última respuesta fue «{resultado.filtroRelajable.texto}». Puedes quitarla y volver a
            ver los resultados.
          </p>
          <Button variant="outline" onClick={onRelajar} isLoading={calculando}>
            Quitar esa respuesta
          </Button>
        </Alert>
      )}

      {resultado.vistaPrevia.length > 0 && (
        <section aria-label="Algunos de los productos" className="space-y-3">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {resultado.vistaPrevia.map((p) => (
              <li
                key={p.idProducto}
                className="rounded-lg border border-neutral-light bg-white p-3 font-sans"
              >
                <Link
                  href={`/productos/${p.idProducto}`}
                  className="rounded-xs text-sm font-medium text-neutral-dark transition-colors hover:text-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
                >
                  {p.nombre}
                </Link>
                <p className="text-xs text-neutral-medium">{p.marca}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* El botón que pidió el Product Owner: al catálogo con los filtros ya puestos. */}
      <div className="flex flex-wrap gap-3">
        <ButtonLink href={resultado.rutaCatalogo} leftIcon={<SlidersHorizontal className="h-4 w-4" />}>
          Ver en el catálogo con estos filtros
        </ButtonLink>
        <Button variant="outline" onClick={onEmpezarDeNuevo}>
          Empezar de nuevo
        </Button>
      </div>

      {/* R8: los preparatorios, aparte y con su propio enlace. */}
      {resultado.complementos.map((grupo) => (
        <section key={grupo.titulo} className="rounded-lg border border-neutral-light bg-white p-4">
          <h3 className="font-sans text-base font-semibold text-neutral-dark">
            También te puede hacer falta: {grupo.titulo}
          </h3>
          <ul className="mt-2 space-y-1">
            {grupo.productos.map((p) => (
              <li key={p.idProducto} className="font-sans text-sm text-neutral-medium">
                <Link
                  href={`/productos/${p.idProducto}`}
                  className="rounded-xs transition-colors hover:text-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
                >
                  {p.nombre}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={grupo.rutaCatalogo}
            className="mt-3 inline-flex items-center gap-1 rounded-xs font-sans text-sm font-medium text-action transition-colors hover:text-action-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
          >
            Ver {grupo.titulo.toLowerCase()}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      ))}
    </div>
  );
}

/** R10 / I5: la alternativa cuando la búsqueda asistida no está disponible. */
export function NoDisponible() {
  return (
    <Alert variant="info" title="La búsqueda asistida no está disponible ahora">
      <p className="mb-3">
        Puedes encontrar lo que buscas con los filtros del catálogo: superficie, color, marca y
        tipo de pintura.
      </p>
      <ButtonLink href="/productos" variant="outline" leftIcon={<Search className="h-4 w-4" />}>
        Ir al catálogo
      </ButtonLink>
    </Alert>
  );
}
