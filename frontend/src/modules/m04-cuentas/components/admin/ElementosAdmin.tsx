'use client';

import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { Alert, Badge, Button, ButtonLink, type BadgeVariant } from '@/core/components';
import type { EstadoSolicitudEmpresa } from '../../dtos/m04-cuentas.dto';
import type { ErrorCuentas } from '../../services/errores';
import { ETIQUETA_ESTADO } from './formato';

const VARIANTE_ESTADO: Record<EstadoSolicitudEmpresa, BadgeVariant> = {
  pendiente: 'action',
  aprobada: 'success',
  rechazada: 'danger',
};

export function EstadoBadge({ estado }: { estado: EstadoSolicitudEmpresa }) {
  return <Badge variant={VARIANTE_ESTADO[estado]}>{ETIQUETA_ESTADO[estado]}</Badge>;
}

/**
 * Sin el permiso `empresas.validar` el servidor responde un 404 opaco
 * (HU-ADM-03): la vista no distingue "sin permiso" de "no existe".
 */
export function ErrorAdmin({ error }: { error: ErrorCuentas }) {
  if (error.estado === 401) {
    return (
      <div className="flex flex-col items-start gap-3 p-6">
        <Alert variant="warning">Tu sesión expiró. Inicia sesión de nuevo para continuar.</Alert>
        <ButtonLink href="/login?destino=/admin/empresas" size="sm">
          Iniciar sesión
        </ButtonLink>
      </div>
    );
  }
  return (
    <div className="p-6">
      <Alert variant="error">
        {error.estado === 404 || error.estado === 403 ? 'No tienes acceso a esta sección.' : error.mensaje}
      </Alert>
    </div>
  );
}

export function ListaVacia({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-lightest text-neutral-medium">
        <Inbox className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="font-sans text-sm text-neutral-medium">{children}</p>
    </div>
  );
}

export interface PaginacionProps {
  pagina: number;
  limite: number;
  total: number;
  onCambiar: (pagina: number) => void;
}

export function Paginacion({ pagina, limite, total, onCambiar }: PaginacionProps) {
  const paginas = Math.max(1, Math.ceil(total / limite));
  if (total <= limite) return null;
  const desde = (pagina - 1) * limite + 1;
  const hasta = Math.min(pagina * limite, total);

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-light/60 px-6 py-3"
    >
      <p className="font-sans text-xs text-neutral-medium">
        {desde}–{hasta} de {total}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pagina <= 1}
          onClick={() => onCambiar(pagina - 1)}
          leftIcon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
        >
          Anterior
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pagina >= paginas}
          onClick={() => onCambiar(pagina + 1)}
          rightIcon={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
        >
          Siguiente
        </Button>
      </div>
    </nav>
  );
}
