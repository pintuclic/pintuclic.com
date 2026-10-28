'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Alert, Button, Skeleton } from '@/core/components';
import type { ResultadoCuestionario } from '../../interfaces/cuestionario.interface';
import {
  pedirTurno,
  type OpcionAsistida,
  type PreguntaAsistida,
  type RespuestaDada,
} from '../../services/cuestionario-api';
import { mensajeDeError } from '../../services/mensaje-error';
import { NoDisponible, Resultado } from './CuestionarioGuiadoView';

/**
 * HU-ASE-01 — Cuestionario guiado en modo `asistido`.
 *
 * Las preguntas las propone el modelo turno a turno, así que no se conocen de antemano: se
 * pide una, se responde y se pide la siguiente. Las respuestas llevan consigo los filtros que
 * el servidor ya validó, porque el flujo es sin estado.
 *
 * El RESULTADO es el mismo componente que usa el modo fijo (contrato · D9): lo único distinto
 * entre los dos modos es quién formula las preguntas.
 */
export function CuestionarioAsistidoFlow() {
  const [respuestas, setRespuestas] = useState<RespuestaDada[]>([]);
  const [pregunta, setPregunta] = useState<PreguntaAsistida | null>(null);
  const [numero, setNumero] = useState(1);
  const [resultado, setResultado] = useState<ResultadoCuestionario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noDisponible, setNoDisponible] = useState(false);

  const avanzar = async (vigentes: RespuestaDada[], finalizar = false): Promise<void> => {
    setCargando(true);
    setError(null);
    try {
      const turno = await pedirTurno(vigentes, finalizar);
      if (turno.fase === 'pregunta') {
        setPregunta(turno.pregunta);
        setNumero(turno.numero);
        setResultado(null);
      } else {
        setPregunta(null);
        setResultado(turno.resultado);
      }
    } catch (err: unknown) {
      // R10: si la IA se cae a mitad del flujo, se ofrece el catálogo en vez de fingir.
      setNoDisponible(true);
      setError(mensajeDeError(err, 'La búsqueda asistida no está disponible en este momento.'));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void avanzar([]);
    // Solo al montar: el primer turno abre la conversación.
  }, []);

  const responder = async (opcion: OpcionAsistida): Promise<void> => {
    if (pregunta === null) return;
    const nuevas: RespuestaDada[] = [
      ...respuestas,
      {
        idPregunta: pregunta.idPregunta,
        texto: pregunta.texto,
        idOpcion: opcion.idOpcion,
        opcionTexto: opcion.texto,
        filtros: opcion.filtros,
        ambiente: opcion.ambiente,
        complementos: opcion.complementos,
        omitida: false,
      },
    ];
    setRespuestas(nuevas);
    await avanzar(nuevas);
  };

  /** R3: omitir no aporta filtros, pero sí cuenta como pregunta ya hecha. */
  const omitir = async (): Promise<void> => {
    if (pregunta === null) return;
    const nuevas: RespuestaDada[] = [
      ...respuestas,
      {
        idPregunta: pregunta.idPregunta,
        texto: pregunta.texto,
        idOpcion: null,
        opcionTexto: null,
        filtros: [],
        ambiente: null,
        complementos: [],
        omitida: true,
      },
    ];
    setRespuestas(nuevas);
    await avanzar(nuevas);
  };

  const atras = async (): Promise<void> => {
    const vigentes = respuestas.slice(0, -1);
    setRespuestas(vigentes);
    await avanzar(vigentes);
  };

  const terminar = async (): Promise<void> => {
    await avanzar(respuestas, true);
  };

  const relajarUltimo = async (): Promise<void> => {
    const vigentes = respuestas.slice(0, -1);
    setRespuestas(vigentes);
    await avanzar(vigentes, true);
  };

  const empezarDeNuevo = async (): Promise<void> => {
    setRespuestas([]);
    setNoDisponible(false);
    await avanzar([]);
  };

  if (noDisponible) return <NoDisponible />;

  if (resultado !== null) {
    return (
      <Resultado
        resultado={resultado}
        onRelajar={() => void relajarUltimo()}
        onEmpezarDeNuevo={() => void empezarDeNuevo()}
        calculando={cargando}
      />
    );
  }

  if (cargando && pregunta === null) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error !== null && <Alert variant="error">{error}</Alert>}

      <p className="flex items-center gap-2 font-sans text-xs font-medium uppercase tracking-wide text-neutral-medium">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        Pregunta {numero}
      </p>

      {pregunta !== null && (
        <fieldset disabled={cargando} className="space-y-4">
          <legend className="font-title text-xl font-semibold text-neutral-dark sm:text-2xl">
            {pregunta.texto}
          </legend>

          <div className="grid gap-3 sm:grid-cols-2">
            {pregunta.opciones.map((opcion) => (
              <button
                key={opcion.idOpcion}
                type="button"
                onClick={() => void responder(opcion)}
                className="rounded-lg border border-neutral-light bg-white p-4 text-left font-sans text-sm font-medium text-neutral-dark transition-colors hover:border-action hover:bg-action/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 disabled:opacity-60"
              >
                {opcion.texto}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {respuestas.length > 0 && (
          <Button
            variant="outline"
            onClick={() => void atras()}
            isLoading={cargando}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Atrás
          </Button>
        )}
        <Button variant="outline" onClick={() => void omitir()} isLoading={cargando}>
          Omitir esta pregunta
        </Button>
        {respuestas.length > 0 && (
          <Button variant="outline" onClick={() => void terminar()} isLoading={cargando}>
            Ver resultados ya
          </Button>
        )}
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
