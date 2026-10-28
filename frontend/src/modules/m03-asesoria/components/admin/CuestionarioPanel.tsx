'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Alert, Button, Input, Select, Skeleton } from '@/core/components';
import type {
  CuestionarioAdmin,
  DimensionFiltro,
  EfectoOpcion,
  OpcionAdmin,
  PreguntaAdmin,
  ValorVocabulario,
} from '../../interfaces/cuestionario.interface';
import {
  crearOpcion,
  crearPregunta,
  editarOpcion,
  editarPregunta,
  obtenerCuestionarioAdmin,
  reemplazarEfectos,
} from '../../services/cuestionario-api';
import { mensajeDeError } from '../../services/mensaje-error';

/**
 * Panel del cuestionario guiado (RF-ASE-01-02, CA-ASE-01-09).
 *
 * El administrador edita las preguntas, sus opciones y la correspondencia entre cada opción y
 * el filtro que aplica, sin intervención del equipo de desarrollo. El cambio vale desde la
 * siguiente petición del público.
 *
 * Nada se borra: se desactiva (F5), para no romper un flujo a medio responder.
 */
export function CuestionarioPanel() {
  const [datos, setDatos] = useState<CuestionarioAdmin | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const recargar = async (): Promise<void> => {
    try {
      setDatos(await obtenerCuestionarioAdmin());
      setError(null);
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No pudimos cargar el cuestionario.'));
    }
  };

  useEffect(() => {
    void recargar().finally(() => setCargando(false));
  }, []);

  const ejecutar = async (accion: () => Promise<unknown>, exito: string): Promise<void> => {
    setError(null);
    try {
      await accion();
      await recargar();
      setAviso(exito);
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No pudimos guardar el cambio.'));
    }
  };

  if (cargando) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (datos === null) {
    return <Alert variant="error">{error ?? 'No pudimos cargar el cuestionario.'}</Alert>;
  }

  return (
    <div className="space-y-6">
      {error !== null && <Alert variant="error">{error}</Alert>}
      {aviso !== null && <Alert variant="success">{aviso}</Alert>}

      {datos.modo === 'asistido' && (
        <Alert variant="info" title="El cuestionario está en modo asistido">
          Las preguntas que edites aquí no se muestran mientras el modo sea «asistido». Puedes
          cambiarlo en la pestaña de configuración.
        </Alert>
      )}

      <NuevaPregunta
        onCrear={(datosPregunta) => ejecutar(() => crearPregunta(datosPregunta), 'Pregunta creada.')}
      />

      {datos.preguntas.length === 0 ? (
        <p className="font-sans text-sm text-neutral-medium">
          Todavía no hay preguntas. Crea la primera arriba.
        </p>
      ) : (
        <ul className="space-y-4">
          {datos.preguntas.map((pregunta) => (
            <li key={pregunta.idPregunta}>
              <TarjetaPregunta
                pregunta={pregunta}
                vocabulario={datos.vocabulario}
                onEjecutar={ejecutar}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
 * Crear una pregunta
 * ─────────────────────────────────────────────────────────────────────────── */

function NuevaPregunta({
  onCrear,
}: {
  onCrear: (datos: { texto: string; orden: number; origenOpciones: 'manual' | 'familias_color' }) => Promise<void>;
}) {
  const [texto, setTexto] = useState('');
  const [orden, setOrden] = useState('10');
  const [origen, setOrigen] = useState<'manual' | 'familias_color'>('manual');
  const [errorCampo, setErrorCampo] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const enviar = async (evento: React.FormEvent): Promise<void> => {
    evento.preventDefault();
    if (texto.trim().length < 3) {
      setErrorCampo('La pregunta debe tener al menos 3 caracteres');
      return;
    }
    setErrorCampo(null);
    setGuardando(true);
    await onCrear({ texto: texto.trim(), orden: Number(orden) || 0, origenOpciones: origen });
    setTexto('');
    setGuardando(false);
  };

  return (
    <form
      onSubmit={enviar}
      noValidate
      className="rounded-lg border border-neutral-light bg-white p-4 space-y-4"
    >
      <h3 className="font-sans text-base font-semibold text-neutral-dark">Nueva pregunta</h3>
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
        <Input
          label="Texto de la pregunta"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          error={errorCampo ?? undefined}
          placeholder="¿Qué superficie va a pintar?"
        />
        <Input
          label="Orden"
          inputMode="numeric"
          value={orden}
          onChange={(e) => setOrden(e.target.value)}
        />
        <Select
          label="Opciones"
          value={origen}
          onChange={(e) => setOrigen(e.target.value === 'familias_color' ? 'familias_color' : 'manual')}
          options={[
            { value: 'manual', label: 'Las escribo yo' },
            { value: 'familias_color', label: 'Las familias de color' },
          ]}
        />
        <Button type="submit" isLoading={guardando} leftIcon={<Plus className="h-4 w-4" />}>
          Crear
        </Button>
      </div>
    </form>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
 * Una pregunta con sus opciones
 * ─────────────────────────────────────────────────────────────────────────── */

type Ejecutar = (accion: () => Promise<unknown>, exito: string) => Promise<void>;

function TarjetaPregunta({
  pregunta,
  vocabulario,
  onEjecutar,
}: {
  pregunta: PreguntaAdmin;
  vocabulario: ValorVocabulario[];
  onEjecutar: Ejecutar;
}) {
  const [texto, setTexto] = useState(pregunta.texto);
  const [orden, setOrden] = useState(String(pregunta.orden));
  const [nuevaOpcion, setNuevaOpcion] = useState('');

  const esColor = pregunta.origenOpciones === 'familias_color';

  return (
    <article
      className={`rounded-lg border bg-white p-4 space-y-4 ${
        pregunta.activa ? 'border-neutral-light' : 'border-neutral-light opacity-70'
      }`}
    >
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto_auto] sm:items-end">
        <Input label="Pregunta" value={texto} onChange={(e) => setTexto(e.target.value)} />
        <Input
          label="Orden"
          inputMode="numeric"
          value={orden}
          onChange={(e) => setOrden(e.target.value)}
        />
        <Button
          variant="outline"
          onClick={() =>
            onEjecutar(
              () => editarPregunta(pregunta.idPregunta, { texto: texto.trim(), orden: Number(orden) || 0 }),
              'Pregunta actualizada.',
            )
          }
        >
          Guardar
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            onEjecutar(
              () => editarPregunta(pregunta.idPregunta, { activa: !pregunta.activa }),
              pregunta.activa ? 'Pregunta desactivada.' : 'Pregunta activada.',
            )
          }
        >
          {pregunta.activa ? 'Desactivar' : 'Activar'}
        </Button>
      </div>

      {esColor ? (
        <p className="font-sans text-sm text-neutral-medium">
          Las opciones de esta pregunta son las familias de color del catálogo, así que no se
          editan aquí: se actualizan solas cuando cambia el catálogo.
        </p>
      ) : (
        <>
          <ul className="space-y-3">
            {pregunta.opciones.map((opcion) => (
              <li key={opcion.idOpcion}>
                <FilaOpcion opcion={opcion} vocabulario={vocabulario} onEjecutar={onEjecutar} />
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-end gap-3 border-t border-neutral-light pt-3">
            <Input
              label="Nueva opción"
              value={nuevaOpcion}
              onChange={(e) => setNuevaOpcion(e.target.value)}
              placeholder="Madera"
              className="min-w-48"
            />
            <Button
              variant="outline"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={async () => {
                if (nuevaOpcion.trim() === '') return;
                await onEjecutar(
                  () =>
                    crearOpcion(pregunta.idPregunta, {
                      texto: nuevaOpcion.trim(),
                      orden: pregunta.opciones.length + 1,
                    }),
                  'Opción creada.',
                );
                setNuevaOpcion('');
              }}
            >
              Agregar opción
            </Button>
          </div>
        </>
      )}
    </article>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
 * Una opción y sus filtros
 * ─────────────────────────────────────────────────────────────────────────── */

const ETIQUETA_DIMENSION: Readonly<Record<DimensionFiltro, string>> = {
  categoria: 'Categoría',
  subcategoria: 'Subcategoría',
  superficie: 'Superficie',
  familia_color: 'Familia de color',
  tipo_resina: 'Tipo de resina',
  linea: 'Línea',
};

function describirEfecto(efecto: EfectoOpcion, vocabulario: ValorVocabulario[]): string {
  if (efecto.tipo === 'filtrar_ambiente') {
    return `Muestra productos de ${efecto.ambiente}`;
  }
  const valor = vocabulario.find(
    (v) => v.dimension === efecto.dimension && v.idValor === efecto.idObjetivo,
  );
  const nombre = valor?.nombre ?? `#${efecto.idObjetivo}`;
  return efecto.tipo === 'filtrar'
    ? `Filtra por ${ETIQUETA_DIMENSION[efecto.dimension].toLowerCase()}: ${nombre}`
    : `Sugiere además productos de ${nombre}`;
}

function FilaOpcion({
  opcion,
  vocabulario,
  onEjecutar,
}: {
  opcion: OpcionAdmin;
  vocabulario: ValorVocabulario[];
  onEjecutar: Ejecutar;
}) {
  const [texto, setTexto] = useState(opcion.texto);
  const [nuevoObjetivo, setNuevoObjetivo] = useState('');
  const [nuevoTipo, setNuevoTipo] = useState<'filtrar' | 'incluir' | 'interior' | 'exterior'>('filtrar');

  const agregarEfecto = async (): Promise<void> => {
    let efecto: EfectoOpcion | null = null;

    if (nuevoTipo === 'interior' || nuevoTipo === 'exterior') {
      efecto = { tipo: 'filtrar_ambiente', ambiente: nuevoTipo };
    } else {
      const valor = vocabulario.find((v) => `${v.dimension}:${v.idValor}` === nuevoObjetivo);
      if (valor === undefined) return;
      if (nuevoTipo === 'incluir') {
        if (valor.dimension !== 'categoria' && valor.dimension !== 'subcategoria') return;
        efecto = { tipo: 'incluir', dimension: valor.dimension, idObjetivo: valor.idValor, requiereOpciones: [] };
      } else {
        efecto = { tipo: 'filtrar', dimension: valor.dimension, idObjetivo: valor.idValor };
      }
    }

    await onEjecutar(
      () => reemplazarEfectos(opcion.idOpcion, [...opcion.efectos, efecto as EfectoOpcion]),
      'Filtros de la opción actualizados.',
    );
    setNuevoObjetivo('');
  };

  const quitarEfecto = (indice: number): Promise<void> =>
    onEjecutar(
      () => reemplazarEfectos(opcion.idOpcion, opcion.efectos.filter((_, i) => i !== indice)),
      'Filtros de la opción actualizados.',
    );

  // El efecto `incluir` solo admite categorías y subcategorías (son los complementos).
  const objetivos =
    nuevoTipo === 'incluir'
      ? vocabulario.filter((v) => v.dimension === 'categoria' || v.dimension === 'subcategoria')
      : vocabulario;

  return (
    <div className={`rounded-md border border-neutral-light p-3 ${opcion.activa ? '' : 'opacity-70'}`}>
      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="Opción"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="min-w-48"
        />
        <Button
          variant="outline"
          onClick={() =>
            onEjecutar(() => editarOpcion(opcion.idOpcion, { texto: texto.trim() }), 'Opción actualizada.')
          }
        >
          Guardar
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            onEjecutar(
              () => editarOpcion(opcion.idOpcion, { activa: !opcion.activa }),
              opcion.activa ? 'Opción desactivada.' : 'Opción activada.',
            )
          }
        >
          {opcion.activa ? 'Desactivar' : 'Activar'}
        </Button>
      </div>

      <div className="mt-3 space-y-2">
        <p className="font-sans text-xs font-medium uppercase tracking-wide text-neutral-medium">
          Qué hace elegir esta opción
        </p>

        {opcion.efectos.length === 0 ? (
          <p className="font-sans text-sm text-neutral-medium">
            No aplica ningún filtro todavía.
          </p>
        ) : (
          <ul className="space-y-1">
            {opcion.efectos.map((efecto, indice) => (
              <li
                key={`${efecto.tipo}-${indice}`}
                className="flex items-center justify-between gap-3 rounded bg-neutral-lightest px-3 py-1.5"
              >
                <span className="font-sans text-sm text-neutral-dark">
                  {describirEfecto(efecto, vocabulario)}
                </span>
                <button
                  type="button"
                  onClick={() => void quitarEfecto(indice)}
                  aria-label={`Quitar: ${describirEfecto(efecto, vocabulario)}`}
                  className="rounded-xs p-1 text-neutral-medium transition-colors hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <Select
            label="Acción"
            value={nuevoTipo}
            onChange={(e) =>
              setNuevoTipo(e.target.value as 'filtrar' | 'incluir' | 'interior' | 'exterior')
            }
            options={[
              { value: 'filtrar', label: 'Filtrar por' },
              { value: 'incluir', label: 'Sugerir además' },
              { value: 'interior', label: 'Productos de interior' },
              { value: 'exterior', label: 'Productos de exterior' },
            ]}
          />

          {nuevoTipo !== 'interior' && nuevoTipo !== 'exterior' && (
            <Select
              label="Del catálogo"
              value={nuevoObjetivo}
              onChange={(e) => setNuevoObjetivo(e.target.value)}
              options={[
                { value: '', label: 'Elige…' },
                ...objetivos.map((v) => ({
                  value: `${v.dimension}:${v.idValor}`,
                  label: `${ETIQUETA_DIMENSION[v.dimension]}: ${v.nombre}`,
                })),
              ]}
            />
          )}

          <Button variant="outline" onClick={() => void agregarEfecto()}>
            Agregar
          </Button>
        </div>
      </div>
    </div>
  );
}
