import { Check } from 'lucide-react';

export interface StepperProps {
  steps: ReadonlyArray<string>;
  /** Índice (0) del paso en curso. Los anteriores se muestran completados. */
  current: number;
  ariaLabel?: string;
}

/**
 * Indicador de pasos (mockup de registro, págs. 3–5): círculos numerados unidos
 * por una línea; completados en verde con check, el actual en azul corporativo.
 */
export function Stepper({ steps, current, ariaLabel = 'Progreso' }: StepperProps) {
  const tramos = Math.max(1, steps.length - 1);
  const avance = Math.min(Math.max(current, 0), tramos) / tramos;

  return (
    <ol aria-label={ariaLabel} className="relative flex w-full items-start">
      {/* Pista entre el centro del primer círculo y el del último; el relleno marca el avance. */}
      <span aria-hidden="true" className="absolute left-4 right-4 top-4 h-0.5 bg-subaction" />
      <span
        aria-hidden="true"
        className="absolute left-4 top-4 h-0.5 bg-corporate transition-[width] duration-300"
        style={{ width: `calc((100% - 2rem) * ${avance})` }}
      />
      {steps.map((paso, indice) => {
        const completado = indice < current;
        const actual = indice === current;
        const ultimo = indice === steps.length - 1;
        // Columnas iguales: con 2 o 3 pasos (registro) los círculos quedan al 0 %, 50 % y 100 %.
        const alineacion = indice === 0 ? 'items-start' : ultimo ? 'items-end' : 'items-center';
        return (
          <li
            key={paso}
            aria-current={actual ? 'step' : undefined}
            className={`relative flex min-w-0 flex-1 basis-0 flex-col ${alineacion}`}
          >
            <span
              className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full font-title text-sm font-semibold ${
                completado
                  ? 'bg-conversion text-neutral-white'
                  : actual
                    ? 'bg-corporate text-neutral-white'
                    : 'bg-subaction text-corporate'
              }`}
            >
              {completado ? <Check className="h-4 w-4" aria-hidden="true" /> : indice + 1}
            </span>
            <span
              className={`mt-1.5 font-sans text-xs ${
                completado ? 'text-conversion-hover' : actual ? 'font-medium text-corporate' : 'text-neutral-medium'
              }`}
            >
              {paso}
              {completado && <span className="sr-only"> (completado)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
