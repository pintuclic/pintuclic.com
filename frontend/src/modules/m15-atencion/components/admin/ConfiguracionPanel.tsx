'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Checkbox, Input, Skeleton } from '@/core/components';
import { DIAS_SEMANA, canalFormSchema, type CanalFormData } from '../../dtos/m15-atencion.dto';
import type { FranjaHorario } from '../../interfaces/atencion.interface';
import {
  guardarCanal,
  guardarHorario,
  obtenerCanalAdmin,
  obtenerHorarioAdmin,
} from '../../services/atencion-api';
import { mensajeDeError } from '../../services/mensaje-error';

const ETIQUETA_DIA = new Map(DIAS_SEMANA.map(({ valor, etiqueta }) => [valor, etiqueta]));
const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Valida la semana en el formulario para no dejar llegar un error genérico del servidor. */
function revisarFranjas(franjas: readonly FranjaHorario[]): string | null {
  for (const franja of franjas) {
    const dia = ETIQUETA_DIA.get(franja.diaSemana) ?? franja.diaSemana;
    if (!franja.abierto) continue;

    if (franja.horaInicio === null || !HORA_VALIDA.test(franja.horaInicio)) {
      return `Escribe la hora de apertura del ${dia.toLowerCase()} en formato de 24 horas.`;
    }
    if (franja.horaFin === null || !HORA_VALIDA.test(franja.horaFin)) {
      return `Escribe la hora de cierre del ${dia.toLowerCase()} en formato de 24 horas.`;
    }
    if (franja.horaFin <= franja.horaInicio) {
      return `El ${dia.toLowerCase()} la hora de cierre debe ser posterior a la de apertura.`;
    }
  }
  return null;
}

export function ConfiguracionPanel() {
  const [franjas, setFranjas] = useState<FranjaHorario[] | null>(null);
  const [errorHorario, setErrorHorario] = useState<string | null>(null);
  const [exitoHorario, setExitoHorario] = useState<string | null>(null);
  const [guardandoHorario, setGuardandoHorario] = useState(false);

  const [errorCanal, setErrorCanal] = useState<string | null>(null);
  const [exitoCanal, setExitoCanal] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CanalFormData>({ resolver: zodResolver(canalFormSchema) });

  useEffect(() => {
    let vigente = true;

    obtenerHorarioAdmin()
      .then((horario) => {
        if (vigente) setFranjas(horario.franjas);
      })
      .catch((err: unknown) => {
        if (vigente) setErrorHorario(mensajeDeError(err, 'No pudimos cargar el horario.'));
      });

    obtenerCanalAdmin()
      .then((canal) => {
        if (vigente) reset({ destino: canal.destino, mensajeBase: canal.mensajeBase ?? '' });
      })
      .catch((err: unknown) => {
        if (vigente) setErrorCanal(mensajeDeError(err, 'No pudimos cargar el canal de atención.'));
      });

    return () => {
      vigente = false;
    };
  }, [reset]);

  const cambiarFranja = (diaSemana: string, cambios: Partial<FranjaHorario>) => {
    setFranjas((actuales) =>
      actuales === null
        ? actuales
        : actuales.map((franja) =>
            franja.diaSemana === diaSemana ? { ...franja, ...cambios } : franja,
          ),
    );
  };

  const enviarHorario = async () => {
    if (franjas === null) return;
    setErrorHorario(null);
    setExitoHorario(null);

    const problema = revisarFranjas(franjas);
    if (problema !== null) {
      setErrorHorario(problema);
      return;
    }

    setGuardandoHorario(true);
    try {
      // Un día cerrado viaja sin horas: así lo exige la base.
      const limpias = franjas.map((franja) =>
        franja.abierto ? franja : { ...franja, horaInicio: null, horaFin: null },
      );
      const horario = await guardarHorario(limpias);
      setFranjas(horario.franjas);
      setExitoHorario('Horario actualizado.');
    } catch (err: unknown) {
      setErrorHorario(mensajeDeError(err, 'No pudimos guardar el horario.'));
    } finally {
      setGuardandoHorario(false);
    }
  };

  const enviarCanal = handleSubmit(async (datos) => {
    setErrorCanal(null);
    setExitoCanal(null);
    try {
      const guardado = await guardarCanal({
        destino: datos.destino,
        mensajeBase:
          datos.mensajeBase === undefined || datos.mensajeBase === '' ? null : datos.mensajeBase,
      });
      reset({ destino: guardado.destino, mensajeBase: guardado.mensajeBase ?? '' });
      setExitoCanal('Canal de atención actualizado.');
    } catch (err: unknown) {
      setErrorCanal(mensajeDeError(err, 'No pudimos guardar el canal de atención.'));
    }
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section
        aria-labelledby="titulo-horario"
        className="rounded-card border border-neutral-light bg-neutral-white p-5"
      >
        <h3 id="titulo-horario" className="mb-1 font-title text-lg font-semibold text-corporate">
          Horario de atención
        </h3>
        <p className="mb-4 font-sans text-sm text-neutral-medium">
          Es el horario en que hay una persona respondiendo. Los clientes lo ven en el centro de ayuda.
        </p>

        {franjas === null ? (
          <Skeleton className="h-64 w-full" aria-label="Cargando el horario" />
        ) : (
          <div className="space-y-3">
            {franjas.map((franja) => (
              <div key={franja.diaSemana} className="flex flex-wrap items-center gap-3">
                <span className="w-24 font-sans text-sm font-medium text-neutral-black">
                  {ETIQUETA_DIA.get(franja.diaSemana) ?? franja.diaSemana}
                </span>

                <Checkbox
                  label="Abierto"
                  checked={franja.abierto}
                  onChange={(evento) =>
                    cambiarFranja(franja.diaSemana, { abierto: evento.target.checked })
                  }
                />

                <Input
                  type="time"
                  aria-label={`Hora de apertura del ${ETIQUETA_DIA.get(franja.diaSemana) ?? franja.diaSemana}`}
                  value={franja.horaInicio ?? ''}
                  disabled={!franja.abierto}
                  onChange={(evento) =>
                    cambiarFranja(franja.diaSemana, { horaInicio: evento.target.value })
                  }
                  className="w-28"
                />
                <Input
                  type="time"
                  aria-label={`Hora de cierre del ${ETIQUETA_DIA.get(franja.diaSemana) ?? franja.diaSemana}`}
                  value={franja.horaFin ?? ''}
                  disabled={!franja.abierto}
                  onChange={(evento) =>
                    cambiarFranja(franja.diaSemana, { horaFin: evento.target.value })
                  }
                  className="w-28"
                />
              </div>
            ))}

            {errorHorario !== null && <Alert variant="error">{errorHorario}</Alert>}
            {exitoHorario !== null && <Alert variant="success">{exitoHorario}</Alert>}

            <Button
              variant="primary-action"
              isLoading={guardandoHorario}
              onClick={() => void enviarHorario()}
            >
              Guardar horario
            </Button>
          </div>
        )}
      </section>

      <section
        aria-labelledby="titulo-canal"
        className="rounded-card border border-neutral-light bg-neutral-white p-5"
      >
        <h3 id="titulo-canal" className="mb-1 font-title text-lg font-semibold text-corporate">
          Contacto directo por WhatsApp
        </h3>
        <p className="mb-4 font-sans text-sm text-neutral-medium">
          A dónde lleva el botón de WhatsApp del catálogo y la ficha de producto.
        </p>

        <form onSubmit={enviarCanal} className="space-y-4" noValidate>
          <Input
            label="Enlace del canal o número"
            placeholder="https://whatsapp.com/channel/… o 3001234567"
            helperText="Con un enlace de canal se abre el canal tal cual. Con un número se abre una conversación con el mensaje de abajo."
            error={errors.destino?.message}
            {...register('destino')}
          />

          <Input
            label="Mensaje con el que inicia la conversación"
            placeholder="Hola, quiero información sobre sus productos."
            helperText="Solo se usa cuando el destino es un número: un canal no admite texto."
            error={errors.mensajeBase?.message}
            {...register('mensajeBase')}
          />

          {errorCanal !== null && <Alert variant="error">{errorCanal}</Alert>}
          {exitoCanal !== null && <Alert variant="success">{exitoCanal}</Alert>}

          <Button type="submit" variant="primary-action" isLoading={isSubmitting}>
            Guardar canal
          </Button>
        </form>
      </section>
    </div>
  );
}
