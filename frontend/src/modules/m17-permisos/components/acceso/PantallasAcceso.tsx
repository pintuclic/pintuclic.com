'use client';

import React from 'react';
import Link from 'next/link';
import { Alert, Button } from '@/core/components';

/**
 * M17 R-ACC-9 · Lo que se ve cuando la persona no puede usar lo que pidió. Siempre un mensaje claro y un camino de
 * vuelta, nunca una pantalla rota ni un error técnico.
 */

export interface SeccionAccesible {
  href: string;
  label: string;
}

/** Inicio de quien todavía no tiene accesos: el administrador debe asignárselos. */
export const SinAccesos: React.FC<{ nombre: string }> = ({ nombre }) => (
  <div className="mx-auto max-w-xl space-y-4 py-10">
    <Alert variant="info" title={`Hola, ${nombre}`}>
      Tu cuenta ya está activa, pero todavía no tienes secciones asignadas. Pide a la persona que administra la tienda que te
      dé los accesos que necesites y vuelve a entrar.
    </Alert>
    <Link href="/" className="inline-block font-sans text-sm text-action underline underline-offset-2">
      Ir a la tienda
    </Link>
  </div>
);

/** Inicio de quien tiene accesos pero ninguno alimenta el resumen: se le ofrecen sus secciones. */
export const Bienvenida: React.FC<{ nombre: string; secciones: ReadonlyArray<SeccionAccesible> }> = ({ nombre, secciones }) => (
  <div className="space-y-6">
    <div>
      <h1 className="font-title text-2xl font-bold text-corporate">¡Hola, {nombre}!</h1>
      <p className="font-sans text-sm text-neutral-medium">Estas son las secciones a las que tienes acceso.</p>
    </div>
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {secciones.map((s) => (
        <li key={s.href}>
          <Link
            href={s.href}
            className="block rounded-card border border-neutral-light/70 bg-neutral-white p-4 font-title text-sm font-semibold text-corporate shadow-xs transition-colors hover:border-action/50 hover:text-action"
          >
            {s.label}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

/** La persona escribió la dirección de una sección que no tiene asignada. */
export const SeccionNoDisponible: React.FC<{ hayInicio: boolean }> = ({ hayInicio }) => (
  <div className="mx-auto max-w-xl space-y-4 py-10">
    <Alert variant="warning" title="No tienes acceso a esta sección">
      Tu cuenta no tiene asignado este apartado. Si lo necesitas para tu trabajo, pídele acceso a la persona que administra la
      tienda.
    </Alert>
    {hayInicio && (
      <Link href="/admin">
        <Button variant="outline" size="sm">
          Volver al inicio
        </Button>
      </Link>
    )}
  </div>
);

/** No se pudo saber qué puede hacer la persona (red, servidor): se puede reintentar sin recargar. */
export const ErrorAcceso: React.FC<{ onReintentar: () => void }> = ({ onReintentar }) => (
  <div className="mx-auto max-w-xl space-y-4 py-10">
    <Alert variant="error">No se pudo cargar tu acceso al panel. Revisa tu conexión e inténtalo de nuevo.</Alert>
    <Button variant="outline" size="sm" onClick={onReintentar}>
      Reintentar
    </Button>
  </div>
);
