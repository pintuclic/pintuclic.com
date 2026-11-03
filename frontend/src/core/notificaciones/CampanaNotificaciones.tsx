'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, CircleAlert, Sparkles } from 'lucide-react';
import { Button } from '../components/buttons/Button';
import { IconButton } from '../components/buttons/IconButton';
import { TextButton } from '../components/buttons/TextButton';
import { Alert } from '../components/feedback/Alert';
import { Skeleton } from '../components/feedback/Skeleton';
import type { Notificacion } from './fp02-notificaciones.dto';
import { useNotificacionesStore } from './notificacionesStore';
import { horaRelativa, textoContador } from './sondeo';

const ID_PANEL = 'panel-notificaciones';

export function etiquetaDeCampana(sinVer: number, sinLeer: number): string {
  if (sinVer > 0) return `Notificaciones, ${textoContador(sinVer)} sin ver`;
  if (sinLeer > 0) return `Notificaciones, ${textoContador(sinLeer)} sin leer`;
  return 'Notificaciones, sin avisos nuevos';
}

/** Un aviso de la lista. Pura (recibe todo por props) para poder probarla sin la tienda. */
export function FilaNotificacion({ n, ahora, alElegir }: { n: Notificacion; ahora: Date; alElegir: (n: Notificacion) => void }) {
  const importante = n.nivel === 'importante';
  const Icono = importante ? CircleAlert : Sparkles;
  return (
    <li className={n.leida ? '' : 'bg-subaction/40'}>
      <Link
        href={n.enlace}
        onClick={() => alElegir(n)}
        className="flex items-start gap-3 px-4 py-3 font-sans text-sm text-neutral-dark hover:bg-neutral-lightest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-action/50"
      >
        <Icono className={`mt-0.5 h-5 w-5 shrink-0 ${importante ? 'text-offer' : 'text-action'}`} aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={n.leida ? 'font-normal' : 'font-semibold text-neutral-black'}>
            {importante && <span className="sr-only">Importante: </span>}
            {n.texto}
          </span>
          <span className="text-xs text-neutral-medium">
            {horaRelativa(n.fecha, ahora)}
            {!n.leida && <span className="sr-only"> · sin leer</span>}
          </span>
        </span>
        {!n.leida && <span aria-hidden="true" className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-action" />}
      </Link>
    </li>
  );
}

export interface CampanaVistaProps {
  sinVer: number;
  sinLeer: number;
  abierta: boolean;
  lista: ReadonlyArray<Notificacion>;
  hayMas: boolean;
  cargando: boolean;
  hayError: boolean;
  alAbrir: () => void;
  alCerrar: () => void;
  alCargarMas: () => void;
  alLeerTodas: () => void;
  alLeer: (idNotificacion: string) => void;
}

/**
 * Campanita de avisos (FP-02 · R2, R6, R7, R11): un botón con nombre que dice cuántos hay, y una lista que se abre y se
 * cierra con teclado (Escape) sin atrapar el foco. El número es el de AVISOS sin ver (no el de hechos).
 */
export function CampanaVista(props: CampanaVistaProps) {
  const { sinVer, sinLeer, abierta, lista, hayMas, cargando, hayError, alAbrir, alCerrar, alCargarMas, alLeerTodas, alLeer } = props;
  const raiz = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierta) return undefined;
    const alTecla = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        alCerrar();
        boton.current?.focus();
      }
    };
    const alPulsarFuera = (e: PointerEvent): void => {
      if (e.target instanceof Node && !raiz.current?.contains(e.target)) alCerrar();
    };
    window.addEventListener('keydown', alTecla);
    window.addEventListener('pointerdown', alPulsarFuera);
    return () => {
      window.removeEventListener('keydown', alTecla);
      window.removeEventListener('pointerdown', alPulsarFuera);
    };
  }, [abierta, alCerrar]);

  const hayNoLeidos = sinLeer > 0 || lista.some((n) => !n.leida);

  return (
    <div className="relative" ref={raiz}>
      <IconButton
        ref={boton}
        variant="ghost"
        aria-label={etiquetaDeCampana(sinVer, sinLeer)}
        aria-expanded={abierta}
        aria-controls={ID_PANEL}
        aria-haspopup="true"
        onClick={() => (abierta ? alCerrar() : alAbrir())}
        className="relative"
      >
        <Bell className="h-6 w-6" />
      </IconButton>
      {sinVer > 0 && (
        <span
          aria-hidden="true"
          data-testid="campana-numero"
          className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold leading-none text-neutral-white"
        >
          {textoContador(sinVer)}
        </span>
      )}

      {abierta && (
        <div
          id={ID_PANEL}
          role="region"
          aria-label="Notificaciones"
          className="absolute right-0 top-full z-50 mt-2 flex max-h-[70vh] w-[min(92vw,24rem)] flex-col overflow-hidden rounded-card border border-neutral-light bg-neutral-white shadow-card motion-safe:animate-in motion-safe:fade-in"
        >
          <div className="flex items-center justify-between gap-3 border-b border-neutral-light px-4 py-3">
            <h2 className="font-title text-base font-bold text-corporate">Notificaciones</h2>
            <TextButton type="button" disabled={!hayNoLeidos} onClick={alLeerTodas} className="text-sm">
              Marcar todo como leído
            </TextButton>
          </div>

          <div className="overflow-y-auto">
            {hayError && (
              <div className="p-3">
                <Alert variant="error">No pudimos cargar tus avisos. Intenta de nuevo.</Alert>
              </div>
            )}
            {cargando && lista.length === 0 && (
              <div className="space-y-3 p-4" role="status" aria-label="Cargando avisos">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            )}
            {!cargando && !hayError && lista.length === 0 && (
              <p className="px-4 py-8 text-center font-sans text-sm text-neutral-medium">Aún no tienes avisos.</p>
            )}
            {lista.length > 0 && (
              <ul className="divide-y divide-neutral-light">
                {lista.map((n) => (
                  <FilaNotificacion
                    key={n.idNotificacion}
                    n={n}
                    ahora={new Date()}
                    alElegir={(elegida) => {
                      if (!elegida.leida) alLeer(elegida.idNotificacion);
                      alCerrar();
                    }}
                  />
                ))}
              </ul>
            )}
            {hayMas && (
              <div className="border-t border-neutral-light p-3 text-center">
                <Button type="button" variant="ghost" size="sm" isLoading={cargando} onClick={alCargarMas}>
                  Ver anteriores
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** La campanita conectada a los datos del sondeo compartido. Montar dentro de la cabecera de cualquier rol. */
export function CampanaNotificaciones() {
  const resumen = useNotificacionesStore((s) => s.resumen);
  const abierta = useNotificacionesStore((s) => s.abierta);
  const lista = useNotificacionesStore((s) => s.lista);
  const hayMas = useNotificacionesStore((s) => s.hayMas);
  const cargando = useNotificacionesStore((s) => s.cargandoLista);
  const hayError = useNotificacionesStore((s) => s.errorLista);
  const abrir = useNotificacionesStore((s) => s.abrirCampana);
  const cerrar = useNotificacionesStore((s) => s.cerrarCampana);
  const cargarMas = useNotificacionesStore((s) => s.cargarMas);
  const leerTodas = useNotificacionesStore((s) => s.leerTodas);
  const leer = useNotificacionesStore((s) => s.leer);
  return (
    <CampanaVista
      sinVer={resumen.campana.sinVer}
      sinLeer={resumen.campana.sinLeer}
      abierta={abierta}
      lista={lista}
      hayMas={hayMas}
      cargando={cargando}
      hayError={hayError}
      alAbrir={() => void abrir()}
      alCerrar={cerrar}
      alCargarMas={() => void cargarMas()}
      alLeerTodas={() => void leerTodas()}
      alLeer={(id) => void leer(id)}
    />
  );
}
