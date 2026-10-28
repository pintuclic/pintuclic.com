'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bot, Headset, Send, X } from 'lucide-react';
import { useAsistenteChat, type MensajeChat } from '../../hooks/useAsistenteChat';
import { ACCIONES_RAPIDAS, type AccionRapida } from '../../services/acciones-rapidas';
import { EVENTO_ABRIR_ASISTENTE } from '../../services/eventos-asistente';

const LIMITE_MENSAJE = 500;

/**
 * HU-ASE-05 — El asistente como burbuja flotante (mockup VISTAS.pdf, pág. 11).
 *
 * Va montado en el armazón público, así que el botón redondo sigue en pantalla al cambiar de
 * vista y la conversación no se pierde al navegar: Next.js no vuelve a montar el layout entre
 * páginas. Recargar sí la borra, y así debe ser (H1: no se guarda en ninguna parte).
 *
 * No es un diálogo modal: no atrapa el foco ni bloquea el fondo, porque la gracia es poder
 * mirar un producto mientras se pregunta por él. Escape lo cierra y el foco vuelve al botón.
 */
export function AsistenteFlotante() {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const chat = useAsistenteChat();
  const lanzadorRef = useRef<HTMLButtonElement>(null);
  const campoRef = useRef<HTMLInputElement>(null);
  const finRef = useRef<HTMLDivElement>(null);

  const cerrar = useCallback(() => {
    setAbierto(false);
    lanzadorRef.current?.focus();
  }, []);

  // Cualquier punto de la tienda puede pedir que se abra (botón de /asesoria, por ejemplo).
  useEffect(() => {
    const alPedir = (evento: Event): void => {
      evento.preventDefault();
      setAbierto(true);
    };
    window.addEventListener(EVENTO_ABRIR_ASISTENTE, alPedir);
    return () => window.removeEventListener(EVENTO_ABRIR_ASISTENTE, alPedir);
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') cerrar();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [abierto, cerrar]);

  // Al abrir, el cursor ya está donde se escribe.
  useEffect(() => {
    if (abierto) campoRef.current?.focus();
  }, [abierto]);

  useEffect(() => {
    if (abierto) finRef.current?.scrollIntoView({ block: 'end' });
  }, [abierto, chat.mensajes, chat.enviando]);

  const enviarTexto = (e: React.FormEvent): void => {
    e.preventDefault();
    const pregunta = texto;
    setTexto('');
    void chat.enviar(pregunta);
  };

  const usarAccion = (accion: AccionRapida): void => {
    if (accion.tipo === 'pregunta') void chat.enviar(accion.texto);
  };

  // RF-ASE-06-01: si no hay servicio, no se ofrece un chat que no va a responder.
  const sinServicio = chat.estado !== null && !chat.estado.disponible;
  if (sinServicio && chat.mensajes.length === 0) return null;

  return (
    <>
      {abierto && (
        <section
          aria-label="Asistente de Pintu Clic"
          className="fixed bottom-24 right-4 z-[55] flex max-h-[min(40rem,calc(100vh-9rem))] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-modal bg-neutral-white shadow-2xl ring-1 ring-black/5 sm:right-6"
        >
          <Cabecera onCerrar={cerrar} />

          <div
            role="log"
            aria-live="polite"
            aria-label="Conversación con el asistente"
            className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
          >
            <Burbuja
              mensaje={{
                rol: 'asistente',
                texto: '¡Hola! 👋\nSoy el asistente de Pintu Clic.\n¿En qué puedo ayudarte hoy?',
                hora: '',
              }}
            />

            {chat.mensajes.length === 0 && (
              <ul className="space-y-2.5">
                {ACCIONES_RAPIDAS.map((accion) => (
                  <li key={accion.id}>
                    <AtajoRapido accion={accion} onUsar={usarAccion} onNavegar={cerrar} />
                  </li>
                ))}
              </ul>
            )}

            {chat.mensajes.map((mensaje, indice) => (
              <Burbuja key={`${mensaje.rol}-${indice}`} mensaje={mensaje} />
            ))}

            {chat.enviando && <Escribiendo />}

            {chat.error !== null && (
              <p
                role="alert"
                className="rounded-input bg-danger-subtle px-3 py-2 font-sans text-sm text-danger"
              >
                {chat.error}
              </p>
            )}

            {chat.destacarAsesor && <EnlaceAsesor onNavegar={cerrar} />}

            <div ref={finRef} />
          </div>

          <form
            onSubmit={enviarTexto}
            noValidate
            className="flex items-center gap-2 border-t border-neutral-light bg-neutral-white px-3 py-3"
          >
            <input
              ref={campoRef}
              type="text"
              name="mensaje"
              aria-label="Escribe tu mensaje para el asistente"
              placeholder="Escribe tu mensaje..."
              value={texto}
              maxLength={LIMITE_MENSAJE}
              onChange={(e) => setTexto(e.target.value)}
              className="min-h-[44px] flex-1 bg-transparent px-2 font-sans text-sm text-neutral-black placeholder:text-neutral-medium focus:outline-none"
            />
            <button
              type="submit"
              disabled={texto.trim() === '' || chat.enviando}
              aria-label="Enviar mensaje"
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-neutral-lightest text-action transition-colors hover:bg-subaction focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 disabled:cursor-not-allowed disabled:text-neutral-medium"
            >
              <Send className="h-5 w-5" aria-hidden="true" />
            </button>
          </form>
        </section>
      )}

      <button
        ref={lanzadorRef}
        type="button"
        onClick={() => (abierto ? cerrar() : setAbierto(true))}
        aria-expanded={abierto}
        aria-label={abierto ? 'Cerrar el asistente' : 'Abrir el asistente de Pintu Clic'}
        /*
          El aro blanco no es adorno: el pie de página es del mismo azul marino que el botón y
          sin él el círculo desaparece contra el fondo. Sobre fondo claro no se nota.
        */
        className="fixed bottom-6 right-4 z-[55] flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-corporate text-neutral-white shadow-xl ring-2 ring-neutral-white transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action sm:right-6 sm:h-16 sm:w-16"
      >
        {abierto ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <Bot className="h-7 w-7" aria-hidden="true" />
        )}
      </button>
    </>
  );
}

function Cabecera({ onCerrar }: { onCerrar: () => void }) {
  return (
    <header className="flex items-center gap-3 bg-action px-4 py-3.5 text-neutral-white">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-white/15">
        <Bot className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-title text-base font-semibold">Asistente Pintu Clic</p>
        <p className="flex items-center gap-1.5 font-sans text-xs text-neutral-white/90">
          <span className="h-2 w-2 rounded-full bg-conversion" aria-hidden="true" />
          En línea
        </p>
      </div>
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar el asistente"
        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-neutral-white/15 transition-colors hover:bg-neutral-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-white"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </header>
  );
}

function Burbuja({ mensaje }: { mensaje: MensajeChat }) {
  const esUsuario = mensaje.rol === 'usuario';

  return (
    <div className={esUsuario ? 'flex flex-col items-end' : 'flex items-start gap-2'}>
      {!esUsuario && (
        <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-lightest text-action">
          <Bot className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
        </span>
      )}

      <div className={esUsuario ? 'flex max-w-[85%] flex-col items-end' : 'min-w-0 flex-1'}>
        <p
          className={`whitespace-pre-line rounded-card px-4 py-2.5 font-sans text-sm leading-relaxed ${
            esUsuario
              ? 'bg-action text-neutral-white'
              : 'max-w-[92%] bg-neutral-lightest text-neutral-black'
          }`}
        >
          {mensaje.texto}
        </p>

        {mensaje.productos !== undefined && mensaje.productos.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {mensaje.productos.map((p) => (
              <li key={p.idProducto}>
                <Link
                  href={`/productos/${p.idProducto}`}
                  className="block rounded-input border border-neutral-light px-3 py-2 font-sans text-sm transition-colors hover:border-action/50 hover:bg-subaction/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
                >
                  <span className="font-title font-medium text-action">{p.nombre}</span>
                  <span className="ml-2 text-neutral-medium">{p.marca}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {mensaje.hora !== '' && (
          <p className="mt-1 px-1 font-sans text-xs text-neutral-medium">{mensaje.hora}</p>
        )}
      </div>
    </div>
  );
}

function AtajoRapido({
  accion,
  onUsar,
  onNavegar,
}: {
  accion: AccionRapida;
  onUsar: (accion: AccionRapida) => void;
  onNavegar: () => void;
}) {
  const estilo =
    'flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-full border border-neutral-light bg-neutral-white px-4 py-2.5 text-left font-sans text-sm text-action transition-colors hover:border-action/50 hover:bg-subaction/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50';

  const contenido = (
    <>
      <span aria-hidden="true">{accion.icono}</span>
      <span>{accion.etiqueta}</span>
    </>
  );

  // Los atajos de pedido y promociones llevan a la pantalla que sí tiene ese dato: la IA
  // tiene prohibido hablar de órdenes, precios y descuentos (ver acciones-rapidas.ts).
  if (accion.tipo === 'enlace') {
    return (
      <Link href={accion.href} onClick={onNavegar} className={estilo}>
        {contenido}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => onUsar(accion)} className={estilo}>
      {contenido}
    </button>
  );
}

function Escribiendo() {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-lightest text-action">
        <Bot className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
      </span>
      <p className="rounded-card bg-neutral-lightest px-4 py-3" aria-label="El asistente está escribiendo">
        <span className="flex gap-1">
          {[0, 150, 300].map((retraso) => (
            <span
              key={retraso}
              className="h-2 w-2 animate-bounce rounded-full bg-neutral-medium"
              style={{ animationDelay: `${retraso}ms` }}
            />
          ))}
        </span>
      </p>
    </div>
  );
}

/** H7 — lleva al formulario de contacto de M15. M03 no llama a su backend. */
function EnlaceAsesor({ onNavegar }: { onNavegar: () => void }) {
  return (
    <Link
      href="/centro-de-ayuda"
      onClick={onNavegar}
      className="flex min-h-[44px] items-center justify-center gap-2 rounded-btn bg-action px-4 py-2.5 font-title text-sm font-medium text-neutral-white transition-colors hover:bg-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
    >
      <Headset className="h-4 w-4" aria-hidden="true" />
      Hablar con un asesor
    </Link>
  );
}
