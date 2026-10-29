'use client';

import { useId, useState } from 'react';
import { Check, Home, Info } from 'lucide-react';
import { colorDeTexto, esColorMuyClaro } from '@/core/utils/color-muestra';
import { ADVERTENCIA_SIMULADOR, type AmbienteSimulador } from '../../../dtos/m03-asesoria.dto';
import { AMBIENTE_POR_DEFECTO, AMBIENTES, ambientePorId } from '../../../services/ambientes';
import { leyendaDeVista, rotuloDeColor, sePuedeSimular, textoAccesible } from '../../../services/simulador';
import { EscenaAmbiente } from './EscenaAmbiente';

export interface SimuladorColorProps {
  /**
   * El color elegido en el abanico, o `null` mientras no haya ninguno. Es lo único que M01 le
   * entrega (contrato M03 · S1, S2): ningún otro dato de la paleta le hace falta.
   */
  color: { hexadecimal: string; nombre: string; codigo: string | null } | null;
}

/**
 * HU-ASE-03 — Simulador de color (contrato M03 · S1-S11).
 *
 * El color elegido en la paleta, pintado sobre las paredes de unos ambientes ilustrados, en
 * varios puntos de vista. Vive entero en el navegador: no llama a ningún servicio, ni a la IA, y
 * cambiar de color o de ambiente no espera a la red.
 *
 * Ocupa la pestaña «En tu espacio» de `/paleta-de-color` (M01 · P6). Mientras no haya color
 * elegido, o si el que llega no es un `#RRGGBB`, no dibuja nada salvo la invitación a elegir uno.
 */
export function SimuladorColor({ color }: SimuladorColorProps) {
  const [idAmbiente, setIdAmbiente] = useState<string>(AMBIENTE_POR_DEFECTO);
  const nombreGrupo = useId();

  if (!sePuedeSimular(color)) return <Invitacion />;

  const ambiente = ambientePorId(idAmbiente);
  const colorSimulado = { hexadecimal: color.hexadecimal, nombre: color.nombre, codigo: color.codigo };

  return (
    // El panel de la paleta es ancho; sin tope, la ilustración llenaría la pantalla de lado a lado
    // y empujaría el selector y el aviso fuera de la vista.
    <div className="mx-auto max-w-4xl space-y-3" data-testid="simulador-color">
      <div className="relative overflow-hidden rounded-card border border-neutral-light bg-neutral-lightest">
        <EscenaAmbiente
          idAmbiente={ambiente.id}
          color={color.hexadecimal}
          etiqueta={textoAccesible(ambiente, color)}
          className="block aspect-[8/5] w-full"
        />
        {/* S8: el color siempre identificado, legible sobre su propio color. */}
        <p
          className={`absolute left-3 top-3 max-w-[70%] rounded-md px-3 py-2 font-title text-sm font-semibold leading-tight shadow-sm ${
            esColorMuyClaro(color.hexadecimal) ? 'ring-1 ring-neutral-light' : ''
          }`}
          style={{ background: color.hexadecimal, color: colorDeTexto(color.hexadecimal) }}
        >
          {rotuloDeColor(color)}
        </p>
      </div>

      <p role="status" className="font-sans text-sm text-neutral-dark">
        {leyendaDeVista(ambiente, color)}
      </p>

      {/* S6: un grupo de radio de verdad; cada miniatura es el mismo dibujo ya pintado. */}
      {/* `min-w-0`: un fieldset mide por defecto lo que mide su contenido, y la fila de miniaturas se saldría de la pantalla en vez de desplazarse. */}
      <fieldset className="min-w-0">
        <legend className="mb-2 font-title text-sm font-semibold text-corporate">Selecciona el ambiente:</legend>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {AMBIENTES.map((a) => (
            <Miniatura
              key={a.id}
              ambiente={a}
              color={colorSimulado}
              nombreGrupo={nombreGrupo}
              activo={a.id === ambiente.id}
              alElegir={setIdAmbiente}
            />
          ))}
        </div>
      </fieldset>

      {/* S7: lo que el simulador no promete. */}
      <p className="flex items-start gap-2 font-sans text-xs text-neutral-medium">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {ADVERTENCIA_SIMULADOR}
      </p>
    </div>
  );
}

function Miniatura({
  ambiente,
  color,
  nombreGrupo,
  activo,
  alElegir,
}: {
  ambiente: AmbienteSimulador;
  color: { hexadecimal: string };
  nombreGrupo: string;
  activo: boolean;
  alElegir: (id: string) => void;
}) {
  return (
    // `relative`: el radio oculto con `sr-only` es absoluto y, sin un ancestro posicionado dentro de la fila,
    // el recorte de su `overflow-x-auto` no lo alcanza y ensancha toda la página.
    <label className="group relative flex w-24 shrink-0 cursor-pointer flex-col gap-1.5 sm:w-28">
      <input
        type="radio"
        name={nombreGrupo}
        value={ambiente.id}
        checked={activo}
        onChange={() => alElegir(ambiente.id)}
        className="peer sr-only"
      />
      {/* El borde del activo no es lo único que lo distingue: lleva también una marca (S6). */}
      <span
        className={`relative block overflow-hidden rounded-md border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-action/60 peer-focus-visible:ring-offset-2 ${
          activo ? 'border-action' : 'border-neutral-light group-hover:border-action/50'
        }`}
      >
        <EscenaAmbiente idAmbiente={ambiente.id} color={color.hexadecimal} className="block aspect-[8/5] w-full" />
        {activo && (
          <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-action text-neutral-white">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        )}
      </span>
      <span className={`text-center font-sans text-xs ${activo ? 'font-semibold text-corporate' : 'text-neutral-dark'}`}>
        {ambiente.nombre}
      </span>
    </label>
  );
}

/** S2, S9: sin un color válido no hay nada que simular. */
function Invitacion() {
  return (
    <div
      data-testid="simulador-invitacion"
      className="flex flex-col items-center gap-3 rounded-card border border-dashed border-neutral-light bg-neutral-lightest px-6 py-10 text-center"
    >
      <span
        aria-hidden="true"
        className="flex h-14 w-14 items-center justify-center rounded-full border border-neutral-light bg-neutral-white text-neutral-medium"
      >
        <Home className="h-7 w-7" />
      </span>
      <p className="font-title text-base font-semibold text-corporate">Elige un color para verlo en tu espacio</p>
      <p className="max-w-sm font-sans text-sm text-neutral-medium">
        Elige un color en el abanico y aquí lo verás pintado en una sala, una alcoba, un comedor, un estudio o una
        fachada.
      </p>
    </div>
  );
}
