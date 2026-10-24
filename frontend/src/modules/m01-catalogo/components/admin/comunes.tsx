'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, Badge, Button, Checkbox, Modal } from '@/core/components';
import type { Estado, ImpactoDesactivacion } from '../../dtos/m01-catalogo.dto';
import type { PaginacionApi } from '../../interfaces/catalogo.interface';
import { leerErrorCatalogo, mensajeDeError } from '../../services/mensaje-error';

export const EstadoBadge: React.FC<{ estado: Estado }> = ({ estado }) => (
  <Badge variant={estado === 'activo' ? 'success' : 'neutral'}>{estado === 'activo' ? 'Activo' : 'Inactivo'}</Badge>
);

/** Muestra de color. El hexadecimal es un dato del catálogo, no un color del diseño. */
export const Muestra: React.FC<{ hexadecimal: string | null; etiqueta?: string }> = ({ hexadecimal, etiqueta }) =>
  hexadecimal === null ? (
    <span className="inline-block h-6 w-6 rounded-full border border-dashed border-neutral-medium" aria-hidden="true" />
  ) : (
    <span
      role="img"
      aria-label={etiqueta ?? `Muestra ${hexadecimal}`}
      className="inline-block h-6 w-6 shrink-0 rounded-full border border-neutral-light"
      style={{ backgroundColor: hexadecimal }}
    />
  );

export const MensajeVacio: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="rounded-card border border-dashed border-neutral-light bg-neutral-lightest px-4 py-8 text-center font-sans text-sm text-neutral-medium">
    {children}
  </p>
);

export const Cargando: React.FC = () => (
  <p role="status" className="px-1 py-6 font-sans text-sm text-neutral-medium">
    Cargando…
  </p>
);

export const Paginador: React.FC<{ paginacion: PaginacionApi; onCambiar: (pagina: number) => void }> = ({
  paginacion,
  onCambiar,
}) => {
  if (paginacion.totalPaginas <= 1) return null;
  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-3 pt-3">
      <p className="font-sans text-xs text-neutral-medium">
        Página {paginacion.pagina} de {paginacion.totalPaginas} · {paginacion.total} registros
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={paginacion.pagina <= 1}
          onClick={() => onCambiar(paginacion.pagina - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={paginacion.pagina >= paginacion.totalPaginas}
          onClick={() => onCambiar(paginacion.pagina + 1)}
        >
          Siguiente
        </Button>
      </div>
    </nav>
  );
};

const ETIQUETAS_IMPACTO: ReadonlyArray<[keyof ImpactoDesactivacion, string]> = [
  ['productos', 'productos'],
  ['variantes', 'variantes'],
  ['subcategorias', 'subcategorías'],
  ['lineas', 'líneas'],
  ['colores', 'colores'],
  ['reglasComerciales', 'reglas comerciales'],
];

export function resumenImpacto(impacto: ImpactoDesactivacion): string[] {
  return ETIQUETAS_IMPACTO.filter(([clave]) => impacto[clave] > 0).map(
    ([clave, texto]) => `${impacto[clave]} ${texto}`,
  );
}

export interface ObjetivoEstado {
  id: number;
  nombre: string;
}

export interface ModalDesactivarProps {
  objetivo: ObjetivoEstado | null;
  /** Qué es lo que se desactiva, en minúsculas: "la marca", "el producto". */
  queEs: string;
  obtenerImpacto: (id: number) => Promise<ImpactoDesactivacion>;
  desactivar: (id: number, confirmar: boolean) => Promise<unknown>;
  onClose: () => void;
  onHecho: () => void;
}

/**
 * R6: antes de desactivar se muestra lo que se afecta y, si hay algo, se pide confirmación
 * explícita; la API vuelve a exigirla (`confirmar: true`) aunque la pantalla se saltara.
 */
export const ModalDesactivar: React.FC<ModalDesactivarProps> = ({
  objetivo,
  queEs,
  obtenerImpacto,
  desactivar,
  onClose,
  onHecho,
}) => {
  const [impacto, setImpacto] = useState<ImpactoDesactivacion | null>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = objetivo?.id;
  // El padre suele pasar funciones nuevas en cada render; la consulta solo debe repetirse si cambia el id.
  const consultarImpacto = useRef(obtenerImpacto);
  consultarImpacto.current = obtenerImpacto;

  useEffect(() => {
    setImpacto(null);
    setConfirmado(false);
    setError(null);
    if (id === undefined) return;
    let vigente = true;
    consultarImpacto
      .current(id)
      .then((r) => vigente && setImpacto(r))
      .catch((err: unknown) => vigente && setError(mensajeDeError(err, 'No se pudo calcular el impacto.')));
    return () => {
      vigente = false;
    };
  }, [id]);

  if (objetivo === null) return null;
  const afectados = impacto === null ? [] : resumenImpacto(impacto);
  const hayImpacto = afectados.length > 0;

  const confirmar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await desactivar(objetivo.id, hayImpacto);
      onHecho();
      onClose();
    } catch (err: unknown) {
      setError(leerErrorCatalogo(err, 'No se pudo desactivar.').message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="md"
      title={
        <span className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-danger" aria-hidden="true" />
          Desactivar {queEs}
        </span>
      }
      subtitle={objetivo.nombre}
    >
      <div className="space-y-4 py-2">
        {error !== null && <Alert variant="error">{error}</Alert>}
        {impacto === null && error === null && (
          <p className="font-sans text-sm text-neutral-medium">Calculando el impacto…</p>
        )}
        {impacto !== null && !hayImpacto && (
          <p className="font-sans text-sm text-neutral-dark">
            No hay elementos afectados. Se puede reactivar cuando se necesite.
          </p>
        )}
        {hayImpacto && (
          <>
            <Alert variant="warning" title="La desactivación afecta otros elementos">
              {afectados.join(', ')}. Los elementos afectados dejan de mostrarse al público; no se eliminan y no se
              reactivan solos si se reactiva {queEs}.
            </Alert>
            <Checkbox
              label="Entiendo el impacto y quiero continuar"
              checked={confirmado}
              onChange={(e) => setConfirmado(e.target.checked)}
            />
          </>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            isLoading={enviando}
            disabled={impacto === null || (hayImpacto && !confirmado)}
            onClick={() => void confirmar()}
          >
            Desactivar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

/** Aviso temporal de éxito o error de una acción de la pantalla. */
export interface Aviso {
  tipo: 'success' | 'error';
  texto: string;
}

export const AvisoAccion: React.FC<{ aviso: Aviso | null; onCerrar: () => void }> = ({ aviso, onCerrar }) => {
  useEffect(() => {
    if (aviso === null) return;
    const t = setTimeout(onCerrar, 6000);
    return () => clearTimeout(t);
  }, [aviso, onCerrar]);
  if (aviso === null) return null;
  return (
    <div role="status" aria-live="polite">
      <Alert variant={aviso.tipo}>{aviso.texto}</Alert>
    </div>
  );
};

/** Reactivar no pide confirmación (R7): la API verifica que el padre esté activo. */
export async function reactivar(
  accion: () => Promise<unknown>,
  alExito: () => void,
  alFallo: (texto: string) => void,
): Promise<void> {
  try {
    await accion();
    alExito();
  } catch (err: unknown) {
    alFallo(leerErrorCatalogo(err, 'No se pudo reactivar.').message);
  }
}
