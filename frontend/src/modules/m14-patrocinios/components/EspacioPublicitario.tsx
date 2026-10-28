'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from '@/core/components';
import { posicionDeFoco } from '@/core/utils/foco-imagen';
import {
  SEGUNDOS_ROTACION_ANUNCIO,
  type AnuncioPublico,
  type EspacioPublicitario as Espacio,
} from '../dtos/m14-patrocinios.dto';
import { useImpresion } from '../hooks/useImpresion';
import {
  ASPECTO_MOVIL,
  aspectoEscritorio,
  atributosEnlace,
  hayImagenMovil,
  indiceAnterior,
  indiceSiguiente,
  indiceTrasDeslizar,
  srcSetDe,
} from '../services/anuncios-publico';
import { avisarMedicion } from '../services/medicion-cliente';
import { patrociniosPublicoApi } from '../services/patrocinios-api';

const SIZES = '(min-width: 1280px) 1232px, 100vw';

/** Una diapositiva: la imagen entera es el enlace (B6). Avisa su impresión cuando está a la vista (M3). */
const Diapositiva: React.FC<{
  anuncio: AnuncioPublico;
  indice: number;
  total: number;
  activa: boolean;
  conMovil: boolean;
  prioritaria: boolean;
}> = ({ anuncio, indice, total, activa, conMovil, prioritaria }) => {
  const ref = useRef<HTMLDivElement>(null);
  useImpresion(
    ref,
    useCallback(() => avisarMedicion({ entidad: 'anuncio', tipo: 'impresion', id: anuncio.idAnuncio }), [anuncio.idAnuncio]),
  );
  const tieneMovil = anuncio.urlImagenMovil !== null;
  const imagen = (
    <picture>
      {anuncio.urlImagenMovil !== null && (
        <source media="(max-width: 639px)" srcSet={srcSetDe(anuncio.urlImagenMovil)} sizes="100vw" />
      )}
      {/* Las que no son la primera se cargan al acercarse: el espacio no frena el resto de la página. */}
      <img
        src={`${anuncio.urlImagen}&tamano=mediano`}
        srcSet={srcSetDe(anuncio.urlImagen)}
        sizes={SIZES}
        alt={anuncio.textoAlternativo}
        loading={prioritaria ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        className={`h-full w-full select-none ${conMovil && !tieneMovil ? 'object-contain sm:object-cover' : 'object-cover'} ${
          // B8: en celular, con imagen móvil, manda su enfoque; en el resto, el de escritorio.
          tieneMovil ? '[object-position:var(--foco-movil)] sm:[object-position:var(--foco-escritorio)]' : '[object-position:var(--foco-escritorio)]'
        }`}
        style={{ '--foco-escritorio': posicionDeFoco(anuncio.focoEscritorio), '--foco-movil': posicionDeFoco(anuncio.focoMovil) } as React.CSSProperties}
      />
    </picture>
  );

  return (
    <div
      ref={ref}
      role="group"
      aria-roledescription="anuncio"
      aria-label={`${indice + 1} de ${total}`}
      // Fuera de vista no se puede enfocar ni leer: solo el anuncio visible es alcanzable con el teclado.
      inert={!activa}
      className="relative h-full w-full shrink-0 grow-0 basis-full"
    >
      {conMovil && !tieneMovil && (
        // Un anuncio sin imagen móvil en un espacio 4:3: su imagen de escritorio va entera sobre un fondo suave de sí misma.
        // eslint-disable-next-line @next/next/no-img-element -- fondo decorativo ya reducido, servido por la propia API
        <img
          src={`${anuncio.urlImagen}&tamano=pequeno`}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-xl sm:hidden"
        />
      )}
      {anuncio.urlClic === null ? (
        <div className="relative h-full w-full">{imagen}</div>
      ) : (
        <a
          href={anuncio.urlClic}
          {...atributosEnlace(anuncio)}
          className="relative block h-full w-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-action"
        >
          {imagen}
        </a>
      )}
    </div>
  );
};

export interface EspacioPublicitarioProps {
  espacio: Espacio;
  className?: string;
  /** Solo para pruebas y vistas previas: si se pasa, no consulta al servidor. */
  anuncios?: readonly AnuncioPublico[];
}

/**
 * Espacio publicitario (contrato M14 · B1–B6, B10–B12): un slider de anuncios con la etiqueta «Publicidad». Sin anuncios
 * vigentes (o si la consulta falla) no pinta nada, para no dejar un hueco ni desplazar la página. Reserva su proporción
 * antes de cargar la imagen. Con varios anuncios rota solo, se detiene al pasar el cursor, al enfocar o al tocar, y no se
 * anima si la persona pidió menos movimiento; se desliza con el dedo y tiene puntos de 44×44 px.
 */
export const EspacioPublicitario: React.FC<EspacioPublicitarioProps> = ({ espacio, className = '', anuncios: fijos }) => {
  const [anuncios, setAnuncios] = useState<readonly AnuncioPublico[]>(fijos ?? []);
  const [actual, setActual] = useState(0);
  const [pausadoPorPuntero, setPausadoPorPuntero] = useState(false);
  const [pausadoPorFoco, setPausadoPorFoco] = useState(false);
  const [tocando, setTocando] = useState(false);
  const [menosMovimiento, setMenosMovimiento] = useState(false);
  const inicioToque = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (fijos !== undefined) return;
    let vigente = true;
    patrociniosPublicoApi
      .anunciosDelEspacio(espacio)
      .then((lista) => vigente && setAnuncios(lista))
      .catch(() => vigente && setAnuncios([]));
    return () => {
      vigente = false;
    };
  }, [espacio, fijos]);

  useEffect(() => {
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)');
    const leer = (): void => setMenosMovimiento(consulta.matches);
    leer();
    consulta.addEventListener('change', leer);
    return () => consulta.removeEventListener('change', leer);
  }, []);

  const total = anuncios.length;
  const pausado = pausadoPorPuntero || pausadoPorFoco || tocando;

  useEffect(() => {
    if (total < 2 || pausado || menosMovimiento) return;
    const t = window.setInterval(() => setActual((i) => indiceSiguiente(i, total)), SEGUNDOS_ROTACION_ANUNCIO * 1000);
    return () => window.clearInterval(t);
  }, [total, pausado, menosMovimiento]);

  // Si la lista cambia (otro espacio, menos anuncios), no se queda apuntando a uno que ya no está.
  const indice = total === 0 ? 0 : Math.min(actual, total - 1);
  if (total === 0) return null;

  const conMovil = hayImagenMovil(anuncios);
  const estiloAspecto = {
    '--aspecto-movil': conMovil ? ASPECTO_MOVIL : aspectoEscritorio(espacio),
    '--aspecto-escritorio': aspectoEscritorio(espacio),
  } as React.CSSProperties;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Publicidad"
      data-espacio={espacio}
      className={`relative w-full overflow-hidden rounded-card bg-neutral-lightest ${className}`}
      onMouseEnter={() => setPausadoPorPuntero(true)}
      onMouseLeave={() => setPausadoPorPuntero(false)}
      onFocusCapture={() => setPausadoPorFoco(true)}
      onBlurCapture={() => setPausadoPorFoco(false)}
    >
      <div
        // Reserva la altura antes de cargar: no hay salto de página (B5). `pan-y` deja que el dedo vertical siga desplazando.
        style={estiloAspecto}
        className="relative aspect-[var(--aspecto-movil)] w-full touch-pan-y sm:aspect-[var(--aspecto-escritorio)]"
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t !== undefined) inicioToque.current = { x: t.clientX, y: t.clientY };
          setTocando(true);
        }}
        onTouchEnd={(e) => {
          const inicio = inicioToque.current;
          const t = e.changedTouches[0];
          inicioToque.current = null;
          setTocando(false);
          if (inicio !== null && t !== undefined) {
            setActual(indiceTrasDeslizar(indice, total, t.clientX - inicio.x, t.clientY - inicio.y));
          }
        }}
        onTouchCancel={() => {
          inicioToque.current = null;
          setTocando(false);
        }}
      >
        <div
          className="flex h-full transition-transform duration-500 ease-in-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${indice * 100}%)` }}
          aria-live={pausado ? 'polite' : 'off'}
        >
          {anuncios.map((a, i) => (
            <Diapositiva
              key={a.idAnuncio}
              anuncio={a}
              indice={i}
              total={total}
              activa={i === indice}
              conMovil={conMovil}
              prioritaria={i === 0}
            />
          ))}
        </div>

        <span className="pointer-events-none absolute left-2 top-2 rounded-btn bg-neutral-black/75 px-2 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-wide text-neutral-white">
          Publicidad
        </span>

        {total > 1 && (
          <>
            {/* Las flechas son para el cursor: en pantallas táctiles se desliza con el dedo y no tapan la imagen. */}
            <div className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 sm:block">
              <IconButton
                variant="overlay"
                size="sm"
                aria-label="Anuncio anterior"
                onClick={() => setActual(indiceAnterior(indice, total))}
              >
                <ChevronLeft className="h-5 w-5" />
              </IconButton>
            </div>
            <div className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 sm:block">
              <IconButton
                variant="overlay"
                size="sm"
                aria-label="Anuncio siguiente"
                onClick={() => setActual(indiceSiguiente(indice, total))}
              >
                <ChevronRight className="h-5 w-5" />
              </IconButton>
            </div>
            <div role="group" aria-label="Elegir anuncio" className="absolute inset-x-0 bottom-0 z-10 flex justify-center">
              {anuncios.map((a, i) => (
                // La zona táctil es de 44×44 px (B12); el punto que se ve es pequeño.
                <IconButton
                  key={a.idAnuncio}
                  variant="ghost"
                  aria-label={`Ver anuncio ${i + 1} de ${total}`}
                  aria-current={i === indice}
                  className="focus-visible:ring-neutral-white"
                  onClick={() => setActual(i)}
                >
                  <span
                    className={`block h-2.5 w-2.5 rounded-full ring-1 ring-neutral-black/30 transition-colors ${
                      i === indice ? 'bg-neutral-white' : 'bg-neutral-white/50'
                    }`}
                  />
                </IconButton>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};
