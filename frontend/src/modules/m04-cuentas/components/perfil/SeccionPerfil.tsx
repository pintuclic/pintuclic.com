import type { ReactNode } from 'react';

export interface SeccionPerfilProps {
  titulo: string;
  descripcion?: ReactNode;
  /** Acción alineada a la derecha del encabezado (p. ej. "Agregar dirección"). */
  accion?: ReactNode;
  children: ReactNode;
}

/** Tarjeta de una sección del perfil (UI Spec: tarjeta 6–10px, sombra base). */
export function SeccionPerfil({ titulo, descripcion, accion, children }: SeccionPerfilProps) {
  return (
    <section className="rounded-card border border-neutral-light/70 bg-neutral-white p-5 shadow-card sm:p-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-title text-lg font-semibold text-neutral-black">{titulo}</h2>
          {descripcion && <p className="mt-1 font-sans text-sm text-neutral-medium">{descripcion}</p>}
        </div>
        {accion}
      </header>
      {children}
    </section>
  );
}
