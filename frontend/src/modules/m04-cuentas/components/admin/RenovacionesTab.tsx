'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Download, FileText } from 'lucide-react';
import { Alert, Button, Modal, Skeleton } from '@/core/components';
import type { DictamenSolicitudEmpresaFormData, EstadoSolicitudEmpresa } from '../../dtos/m04-cuentas.dto';
import type { ListaPaginada, RenovacionNitAdmin } from '../../interfaces/api.interfaces';
import {
  descargarRut,
  dictaminarRenovacion,
  listarRenovaciones,
  obtenerRenovacion,
} from '../../services/admin-empresas.service';
import { aErrorCuentas, type ErrorCuentas } from '../../services/errores';
import { DictamenPanel } from './DictamenPanel';
import { ErrorAdmin, EstadoBadge, ListaVacia, Paginacion } from './ElementosAdmin';
import { formatoFecha, formatoTamano, motivoObligatorio } from './formato';

const LIMITE = 10;

/** HU-CUE-10 / HU-CUE-09 · Renovaciones de NIT con su RUT adjunto. */
export function RenovacionesTab({ estado }: { estado?: EstadoSolicitudEmpresa }) {
  const [pagina, setPagina] = useState(1);
  const [lista, setLista] = useState<ListaPaginada<RenovacionNitAdmin> | null>(null);
  const [error, setError] = useState<ErrorCuentas | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setLista(await listarRenovaciones({ estado, page: pagina, limit: LIMITE }));
      setError(null);
    } catch (e) {
      setError(aErrorCuentas(e));
    }
  }, [estado, pagina]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cerrar = useCallback(() => setSeleccion(null), []);

  const alDictaminar = async (renovacion: RenovacionNitAdmin, decision: DictamenSolicitudEmpresaFormData['decision']) => {
    setAviso(
      `Renovación a NIT ${renovacion.nitNuevo} ${decision === 'aprobar' ? 'aprobada' : 'rechazada'}.`,
    );
    setSeleccion(null);
    await cargar();
  };

  if (error) return <ErrorAdmin error={error} />;

  return (
    <>
      {aviso && (
        <div className="px-6 pt-4">
          <Alert variant="success">{aviso}</Alert>
        </div>
      )}

      {!lista && (
        <div className="space-y-3 p-6" aria-busy="true">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {lista?.items.length === 0 && <ListaVacia>No hay renovaciones de NIT con este filtro.</ListaVacia>}

      {lista && lista.items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-neutral-light bg-neutral-lightest font-title text-[11px] font-bold uppercase tracking-wider text-neutral-medium">
                <th scope="col" className="px-6 py-3.5">Cuenta</th>
                <th scope="col" className="px-4 py-3.5">Cambio de NIT</th>
                <th scope="col" className="px-4 py-3.5">Recibida</th>
                <th scope="col" className="px-4 py-3.5">Estado</th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-light/60 font-sans text-sm">
              {lista.items.map((r) => (
                <tr key={r.idSolicitud} className="hover:bg-neutral-lightest/60">
                  <td className="whitespace-nowrap px-6 py-4 font-semibold text-neutral-black">Cuenta #{r.idUsuario}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-neutral-dark">
                    {r.nitAnterior}
                    <ArrowRight className="mx-1.5 inline h-3.5 w-3.5 text-neutral-medium" aria-hidden="true" />
                    <span className="sr-only">por </span>
                    <span className="font-medium text-neutral-black">{r.nitNuevo}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-neutral-dark">{formatoFecha(r.fechaSolicitud)}</td>
                  <td className="px-4 py-4">
                    <EstadoBadge estado={r.estado} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant={r.estado === 'pendiente' ? 'primary-action' : 'ghost'}
                      aria-label={`${r.estado === 'pendiente' ? 'Revisar' : 'Ver'} renovación a NIT ${r.nitNuevo}`}
                      onClick={() => {
                        setAviso(null);
                        setSeleccion(r.idSolicitud);
                      }}
                    >
                      {r.estado === 'pendiente' ? 'Revisar' : 'Ver'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {lista && <Paginacion pagina={pagina} limite={LIMITE} total={lista.total} onCambiar={setPagina} />}

      <Modal isOpen={seleccion !== null} onClose={cerrar} size="lg" title="Renovación de NIT">
        {seleccion && <RenovacionDetalle idSolicitud={seleccion} onDictaminada={alDictaminar} />}
      </Modal>
    </>
  );
}

function RenovacionDetalle({
  idSolicitud,
  onDictaminada,
}: {
  idSolicitud: string;
  onDictaminada: (renovacion: RenovacionNitAdmin, decision: DictamenSolicitudEmpresaFormData['decision']) => Promise<void>;
}) {
  const [renovacion, setRenovacion] = useState<RenovacionNitAdmin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    let vigente = true;
    obtenerRenovacion(idSolicitud)
      .then((r) => {
        if (vigente) setRenovacion(r);
      })
      .catch((e: unknown) => {
        if (vigente) setError(aErrorCuentas(e).mensaje);
      });
    return () => {
      vigente = false;
    };
  }, [idSolicitud]);

  if (error) return <Alert variant="error">{error}</Alert>;
  if (!renovacion) return <Skeleton className="h-48 w-full" />;

  const documento = renovacion.documento;
  const idDocumento = documento?.idDocumento ?? renovacion.idDocumento;

  const descargar = async () => {
    if (!idDocumento) return;
    setDescargando(true);
    setError(null);
    try {
      const blob = await descargarRut(idDocumento);
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = documento?.nombreOriginal ?? 'rut';
      enlace.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(aErrorCuentas(e).mensaje);
    } finally {
      setDescargando(false);
    }
  };

  const dictaminar = async (dictamen: DictamenSolicitudEmpresaFormData) => {
    try {
      await dictaminarRenovacion(renovacion.idSolicitud, dictamen);
    } catch (e) {
      throw new Error(aErrorCuentas(e).mensaje);
    }
    await onDictaminada(renovacion, dictamen.decision);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <span className="font-sans text-sm text-neutral-medium">Estado:</span>
        <EstadoBadge estado={renovacion.estado} />
      </div>
      <dl className="grid gap-x-6 gap-y-3 font-sans text-sm sm:grid-cols-2">
        {(
          [
            ['Cuenta', `#${renovacion.idUsuario}`],
            ['NIT vigente', renovacion.nitAnterior],
            ['NIT solicitado', renovacion.nitNuevo],
            ['Recibida', formatoFecha(renovacion.fechaSolicitud)],
            ['Revisada', formatoFecha(renovacion.fechaRevision)],
          ] as const
        ).map(([termino, valor]) => (
          <div key={termino}>
            <dt className="text-neutral-medium">{termino}</dt>
            <dd className="font-medium text-neutral-black">{valor}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-3 rounded-card border border-neutral-light p-4">
        <FileText className="h-6 w-6 shrink-0 text-action" aria-hidden="true" />
        <div className="min-w-0 flex-1 font-sans text-sm">
          <p className="truncate font-medium text-neutral-black">{documento?.nombreOriginal ?? 'Documento RUT'}</p>
          {documento && <p className="text-xs text-neutral-medium">{formatoTamano(documento.tamanoBytes)}</p>}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          isLoading={descargando}
          disabled={!idDocumento}
          leftIcon={<Download className="h-4 w-4" aria-hidden="true" />}
          onClick={descargar}
        >
          Descargar RUT
        </Button>
      </div>

      {renovacion.estado === 'rechazada' && renovacion.motivoRechazo && (
        <Alert variant="warning">Motivo del rechazo: {renovacion.motivoRechazo}</Alert>
      )}
      {renovacion.estado === 'pendiente' && (
        <DictamenPanel motivoObligatorio={motivoObligatorio('renovacion')} onDictaminar={dictaminar} />
      )}
    </div>
  );
}
