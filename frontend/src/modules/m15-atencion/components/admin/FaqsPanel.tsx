'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { Alert, Badge, Button, IconButton, Input, Modal, Skeleton, Textarea } from '@/core/components';
import { faqFormSchema, type FaqFormData } from '../../dtos/m15-atencion.dto';
import type { PreguntaFrecuente } from '../../interfaces/atencion.interface';
import {
  cambiarEstadoFaq,
  crearFaq,
  editarFaq,
  eliminarFaq,
  listarFaqsAdmin,
  reordenarFaqs,
} from '../../services/atencion-api';
import { mensajeDeError } from '../../services/mensaje-error';

const LIMITE = 100;

function agruparPorTema(preguntas: readonly PreguntaFrecuente[]): Map<string, PreguntaFrecuente[]> {
  const grupos = new Map<string, PreguntaFrecuente[]>();
  for (const pregunta of preguntas) {
    const grupo = grupos.get(pregunta.tema);
    if (grupo === undefined) {
      grupos.set(pregunta.tema, [pregunta]);
    } else {
      grupo.push(pregunta);
    }
  }
  return grupos;
}

export function FaqsPanel() {
  const [preguntas, setPreguntas] = useState<PreguntaFrecuente[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [enEdicion, setEnEdicion] = useState<PreguntaFrecuente | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [porEliminar, setPorEliminar] = useState<PreguntaFrecuente | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FaqFormData>({ resolver: zodResolver(faqFormSchema) });

  const cargar = useCallback(async () => {
    try {
      const pagina = await listarFaqsAdmin({ pagina: 1, limite: LIMITE });
      setPreguntas(pagina.items);
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No pudimos cargar las preguntas frecuentes.'));
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const abrirCreacion = () => {
    setEnEdicion(null);
    reset({ tema: '', pregunta: '', respuesta: '', orden: 0 });
    setModalAbierto(true);
  };

  const abrirEdicion = (pregunta: PreguntaFrecuente) => {
    setEnEdicion(pregunta);
    reset({
      tema: pregunta.tema,
      pregunta: pregunta.pregunta,
      respuesta: pregunta.respuesta,
      orden: pregunta.orden,
    });
    setModalAbierto(true);
  };

  const guardar = handleSubmit(async (datos) => {
    setError(null);
    try {
      if (enEdicion === null) {
        await crearFaq(datos);
        setExito('Pregunta creada.');
      } else {
        await editarFaq(enEdicion.idPregunta, datos);
        setExito('Pregunta actualizada.');
      }
      setModalAbierto(false);
      await cargar();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No pudimos guardar la pregunta.'));
    }
  });

  const alternarEstado = async (pregunta: PreguntaFrecuente) => {
    setError(null);
    try {
      await cambiarEstadoFaq(pregunta.idPregunta, !pregunta.activa);
      setExito(pregunta.activa ? 'Pregunta oculta al público.' : 'Pregunta visible al público.');
      await cargar();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No pudimos cambiar el estado de la pregunta.'));
    }
  };

  const confirmarEliminacion = async () => {
    if (porEliminar === null) return;
    setError(null);
    try {
      await eliminarFaq(porEliminar.idPregunta);
      setExito('Pregunta eliminada.');
      setPorEliminar(null);
      await cargar();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No pudimos eliminar la pregunta.'));
    }
  };

  /** Mueve una pregunta dentro de su tema y envía el tema completo reordenado. */
  const mover = async (tema: string, desde: number, hacia: number) => {
    if (preguntas === null) return;
    const delTema = preguntas.filter((p) => p.tema === tema);
    if (hacia < 0 || hacia >= delTema.length) return;

    const ids = delTema.map((p) => p.idPregunta);
    const movido = ids[desde];
    if (movido === undefined) return;
    ids.splice(desde, 1);
    ids.splice(hacia, 0, movido);

    setError(null);
    try {
      await reordenarFaqs(tema, ids);
      await cargar();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No pudimos cambiar el orden.'));
    }
  };

  if (preguntas === null) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Cargando preguntas frecuentes">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const grupos = [...agruparPorTema(preguntas).entries()];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-sans text-sm text-neutral-dark">
          {preguntas.length} {preguntas.length === 1 ? 'pregunta' : 'preguntas'} en {grupos.length}{' '}
          {grupos.length === 1 ? 'tema' : 'temas'}.
        </p>
        <Button
          variant="primary-action"
          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={abrirCreacion}
        >
          Nueva pregunta
        </Button>
      </div>

      {error !== null && <Alert variant="error">{error}</Alert>}
      {exito !== null && <Alert variant="success">{exito}</Alert>}

      {grupos.length === 0 && (
        <p className="font-sans text-sm text-neutral-medium">
          Todavía no hay preguntas. Crea la primera para que aparezca en el centro de ayuda.
        </p>
      )}

      {grupos.map(([tema, delTema]) => (
        <section
          key={tema}
          aria-labelledby={`grupo-${tema}`}
          className="rounded-card border border-neutral-light bg-neutral-white p-4"
        >
          <h3 id={`grupo-${tema}`} className="mb-3 font-title text-base font-semibold text-corporate">
            {tema}
          </h3>

          <ul className="divide-y divide-neutral-light">
            {delTema.map((pregunta, indice) => (
              <li key={pregunta.idPregunta} className="flex flex-wrap items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-sans text-sm font-medium text-neutral-black">
                      {pregunta.pregunta}
                    </p>
                    <Badge variant={pregunta.activa ? 'success' : 'neutral'}>
                      {pregunta.activa ? 'Visible' : 'Oculta'}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 font-sans text-xs text-neutral-medium">
                    {pregunta.respuesta}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <IconButton
                    variant="ghost"
                    aria-label={`Subir "${pregunta.pregunta}"`}
                    disabled={indice === 0}
                    onClick={() => void mover(tema, indice, indice - 1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    variant="ghost"
                    aria-label={`Bajar "${pregunta.pregunta}"`}
                    disabled={indice === delTema.length - 1}
                    onClick={() => void mover(tema, indice, indice + 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    variant="ghost"
                    aria-label={`Editar "${pregunta.pregunta}"`}
                    onClick={() => abrirEdicion(pregunta)}
                  >
                    <Pencil className="h-4 w-4" />
                  </IconButton>
                  <Button variant="outline" size="sm" onClick={() => void alternarEstado(pregunta)}>
                    {pregunta.activa ? 'Ocultar' : 'Mostrar'}
                  </Button>
                  <IconButton
                    variant="ghost"
                    aria-label={`Eliminar "${pregunta.pregunta}"`}
                    onClick={() => setPorEliminar(pregunta)}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Modal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        title={enEdicion === null ? 'Nueva pregunta frecuente' : 'Editar pregunta frecuente'}
        size="lg"
      >
        <form onSubmit={guardar} className="space-y-4" noValidate>
          <Input
            label="Tema"
            placeholder="Envíos y entregas"
            helperText="Agrupa la pregunta en el centro de ayuda."
            error={errors.tema?.message}
            {...register('tema')}
          />
          <Input
            label="Pregunta"
            placeholder="¿A qué ciudades hacen envíos?"
            error={errors.pregunta?.message}
            {...register('pregunta')}
          />
          <Textarea
            label="Respuesta"
            rows={5}
            error={errors.respuesta?.message}
            {...register('respuesta')}
          />
          <Input
            label="Orden"
            type="number"
            min={0}
            helperText="Posición dentro del tema. Puedes ajustarla también con las flechas de la lista."
            error={errors.orden?.message}
            {...register('orden', { valueAsNumber: true })}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary-action" isLoading={isSubmitting}>
              Guardar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={porEliminar !== null}
        onClose={() => setPorEliminar(null)}
        title="Eliminar pregunta"
        size="sm"
      >
        <div className="space-y-4">
          <p className="font-sans text-sm text-neutral-dark">
            Se eliminará «{porEliminar?.pregunta}». Si solo quieres dejar de mostrarla, puedes ocultarla
            y conservarla.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPorEliminar(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => void confirmarEliminacion()}>
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
