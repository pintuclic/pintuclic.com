'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TarjetaProducto } from '../interfaces/cuestionario.interface';
import {
  enviarMensajeAsistente,
  obtenerEstadoAsistente,
  type EstadoAsistente,
  type TurnoChat,
} from '../services/asistente-api';
import { horaDeChat } from '../services/hora-chat';
import { mensajeDeError } from '../services/mensaje-error';

const MAX_HISTORIAL = 10;

export interface MensajeChat extends TurnoChat {
  /** Hora local, solo para pintarla: no viaja al servidor (H1). */
  hora: string;
  productos?: TarjetaProducto[];
}

export interface AsistenteChat {
  estado: EstadoAsistente | null;
  mensajes: MensajeChat[];
  enviando: boolean;
  error: string | null;
  destacarAsesor: boolean;
  enviar: (pregunta: string) => Promise<void>;
}

/**
 * La conversación con el asistente (HU-ASE-05), sin nada de pintura.
 *
 * Vive aquí para que el panel flotante y cualquier otra pantalla usen la MISMA conversación y
 * no acaben existiendo dos chats que se separan con el tiempo.
 *
 * H1: no se guarda ni en el servidor ni en el navegador. El historial viaja en cada petición
 * y desaparece al recargar la página.
 */
export function useAsistenteChat(): AsistenteChat {
  const [estado, setEstado] = useState<EstadoAsistente | null>(null);
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [destacarAsesor, setDestacarAsesor] = useState(false);
  // Evita que dos envíos a la vez (clic en un atajo mientras ya se enviaba) se pisen.
  const enviandoRef = useRef(false);
  // Espejo de los mensajes para leer el historial sin depender de él en `enviar`, y sin
  // leerlo dentro de un actualizador de estado, que React puede ejecutar dos veces.
  const mensajesRef = useRef<MensajeChat[]>([]);
  mensajesRef.current = mensajes;

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

  const enviar = useCallback(async (pregunta: string): Promise<void> => {
    const texto = pregunta.trim();
    if (texto === '' || enviandoRef.current) return;

    enviandoRef.current = true;
    setEnviando(true);
    setError(null);

    const historial: TurnoChat[] = mensajesRef.current
      .slice(-MAX_HISTORIAL)
      .map((m) => ({ rol: m.rol, texto: m.texto }));

    setMensajes((previos) => [...previos, { rol: 'usuario', texto, hora: horaDeChat(new Date()) }]);

    try {
      const respuesta = await enviarMensajeAsistente(texto, historial);
      setMensajes((previos) => [
        ...previos,
        {
          rol: 'asistente',
          texto: respuesta.respuesta,
          hora: horaDeChat(new Date()),
          productos: respuesta.productos,
        },
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
      enviandoRef.current = false;
      setEnviando(false);
    }
  }, []);

  return { estado, mensajes, enviando, error, destacarAsesor, enviar };
}
