'use client';

import { Building2 } from 'lucide-react';
import { ButtonLink } from '@/core/components';
import { useAuthStore } from '@/core/store/authStore';
import type { UsuarioAutenticado } from '@/core/types/usuario.type';

/**
 * Invitación a pedir una cuenta empresa. Solo la ve el cliente registrado como particular: el visitante todavía
 * no tiene cuenta y la empresa ya tiene la suya. Lleva a la sección «Cuenta empresa» del perfil, donde está el
 * ascenso de cuenta (M04).
 */
export function EmpresaCta() {
  const usuario = useAuthStore((s) => s.usuario);
  return debeInvitarEmpresa(usuario) ? <InvitacionEmpresa /> : null;
}

/** Cliente registrado como particular (ni empresa ni personal del panel). */
export function debeInvitarEmpresa(usuario: Pick<UsuarioAutenticado, 'tipo' | 'esAdmin'> | null): boolean {
  return usuario !== null && usuario.tipo === 'normal' && usuario.esAdmin !== true;
}

export function InvitacionEmpresa() {
  return (
    <section
      aria-labelledby="titulo-empresa-cta"
      className="flex flex-col gap-4 rounded-card border border-action/30 bg-subaction/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <Building2 className="mt-0.5 h-7 w-7 shrink-0 text-corporate" strokeWidth={1.75} aria-hidden="true" />
        <div>
          <h2 id="titulo-empresa-cta" className="font-title text-base font-semibold text-corporate">
            ¿Tienes empresa? Regístrate
          </h2>
          <p className="font-sans text-sm text-neutral-dark">
            Las constructoras y los proveedores reciben un descuento especial en sus compras.
          </p>
        </div>
      </div>
      <ButtonLink href="/perfil?seccion=empresa" variant="primary-conversion" className="shrink-0 max-sm:min-h-11">
        ¿Tienes empresa? Regístrate
      </ButtonLink>
    </section>
  );
}
