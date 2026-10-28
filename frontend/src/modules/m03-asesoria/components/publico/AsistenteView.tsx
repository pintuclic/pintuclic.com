'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Headset, Send } from 'lucide-react';
import { Alert, Button, ButtonLink, Input, Skeleton } from '@/core/components';
import type { TarjetaProducto } from '../../interfaces/cuestionario.interface';
import {
  enviarMensajeAsistente,
  obtenerEstadoAsistente,
  type EstadoAsistente,
  type TurnoChat,
} from '../../services/asistente-api';
import { mensajeDeError } from '../../services/mensaje-error';

const MAX_HISTORIAL = 10;

interface Mensaje extends TurnoChat {
  productos?: TarjetaProducto[];
}

/**
 * HU-ASE-05 — Asistente de pintura.
 *
 * Atiende dudas de pintura, superficies, aplicación y productos de la tienda. No es un
 * asistente de propósito general: fuera de eso lo dice y ofrece hablar con un asesor.
 *
 * La conversación vive SOLO aquí, en memoria: no se guarda en el servidor ni en el
 * navegador. Si el servicio falla, se conserva en pantalla la última respuesta válida y se
 * destaca el botón del asesor, que son las alternativas del contrato (I5).
 */
export function AsistenteView() {
  const [estado, setEstado] = useState<EstadoAsistente | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [destacarAsesor, setDestacarAsesor] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vigente = true;
    obtenerEstadoAsistente()
      .then((e) => {
        if (vigente) setEstado(e);
      })
      .catch(() => {
        if (vigente) setEstado({ disponible: false, motivo: null });
      });
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: 'end' });
  }, [mensajes]);

  const enviar = async (evento: React.FormEvent): Promise<void> => {
    evento.preventDefault();
    const pregunta = texto.trim();
    if (pregunta === '' || enviando) return;

    const historial: TurnoChat[] = mensajes
      .slice(-MAX_HISTORIAL)
      .map((m) => ({ rol: m.rol, texto: m.texto }));

    setMensajes((previos) => [...previos, { rol: 'usuario', texto: pregunta }]);
    setTexto('');
    setEnviando(true);
    setError(null);

    try {
      const respuesta = await enviarMensajeAsistente(pregunta, historial);
      setMensajes((previos) => [
        ...previos,
        { rol: 'asistente', texto: respuesta.respuesta, productos: respuesta.productos },
      ]);
      setDestacarAsesor(respuesta.ofrecerAsesor);
    } catch (err: unknown) {
      // I5: la última respuesta válida se queda en pantalla y se ofrece el asesor.
      setError(
        mensajeDeError(
          err,
          'El asistente no está disponible en este momento. Puedes escribirle a un asesor.',
        ),
      );
      setDestacarAsesor(true);
    } finally {
      setEnviando(false);
    }
  };

  if (estado === null) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!estado.disponible && mensajes.length === 0) {
    return (
      <div className="space-y-4">
        <Alert variant="info" title="El asistente no está disponible ahora">
          Puedes buscar con los filtros del catálogo, usar la búsqueda asistida por preguntas o
          escribirle a un asesor.
        </Alert>
        <BotonAsesor destacado />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="font-sans text-sm text-neutral-medium">
        Pregúntale lo que quieras sobre pintura, preparación de superficies o cómo aplicarla. Para
        saber cuánta necesitas, usa la calculadora.
      </p>

      <div
        className="max-h-96 space-y-3 overflow-y-auto rounded-lg border border-neutral-light bg-white p-4"
        role="log"
        aria-live="polite"
        aria-label="Conversación con el asistente"
      >
        {mensajes.length === 0 && (
          <p className="font-sans text-sm text-neutral-medium">
            Por ejemplo: «¿Qué pintura sirve para un baño con humedad?»
          </p>
        )}

        {mensajes.map((mensaje, indice) => (
          <div
            key={`${mensaje.rol}-${indice}`}
            className={mensaje.rol === 'usuario' ? 'text-right' : 'text-left'}
          >
            <p
              className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-left font-sans text-sm ${
                mensaje.rol === 'usuario'
                  ? 'bg-action/10 text-neutral-dark'
                  : 'bg-neutral-lightest text-neutral-dark'
              }`}
            >
              {mensaje.texto}
            </p>

            {mensaje.productos !== undefined && mensaje.productos.length > 0 && (
              <ul className="mt-2 space-y-1">
                {mensaje.productos.map((p) => (
                  <li key={p.idProducto} className="font-sans text-sm">
                    <Link
                      href={`/productos/${p.idProducto}`}
                      className="rounded-xs font-medium text-action transition-colors hover:text-action-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
                    >
                      {p.nombre}
                    </Link>
                    <span className="ml-2 text-neutral-medium">{p.marca}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        {enviando && <Skeleton className="h-8 w-40" />}
        <div ref={finRef} />
      </div>

      {error !== null && <Alert variant="error">{error}</Alert>}

      <form onSubmit={enviar} noValidate className="flex items-end gap-2">
        <Input
          name="mensaje"
          aria-label="Tu pregunta para el asistente"
          placeholder="Escribe tu pregunta"
          value={texto}
          maxLength={500}
          onChange={(e) => setTexto(e.target.value)}
          disabled={enviando || !estado.disponible}
          className="flex-1"
        />
        <Button
          type="submit"
          isLoading={enviando}
          disabled={!estado.disponible}
          leftIcon={<Send className="h-4 w-4" />}
        >
          Enviar
        </Button>
      </form>

      {/* H7: siempre visible, y destacado cuando el asistente lo sugiere o algo falla. */}
      <BotonAsesor destacado={destacarAsesor} />
    </div>
  );
}

/**
 * H7 — lleva al formulario de contacto de M15, en el centro de ayuda. Ese formulario exige
 * sesión: a quien no la tenga lo llevará M15 al login. M03 no llama a su backend.
 */
function BotonAsesor({ destacado }: { destacado: boolean }) {
  return (
    <div className="rounded-lg border border-neutral-light bg-neutral-lightest p-4">
      <p className="mb-3 font-sans text-sm text-neutral-dark">
        {destacado
          ? '¿Prefieres que te atienda una persona?'
          : '¿Quieres comunicarte con un asesor?'}
      </p>
      <ButtonLink
        href="/centro-de-ayuda"
        variant={destacado ? 'primary-action' : 'outline'}
        leftIcon={<Headset className="h-4 w-4" />}
      >
        Hablar con un asesor
      </ButtonLink>
    </div>
  );
}
