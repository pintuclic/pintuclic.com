'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Modal, Skeleton } from '@/core/components';
import type { DictamenSolicitudEmpresaFormData, EstadoSolicitudEmpresa } from '../../dtos/m04-cuentas.dto';
import type { ListaPaginada, SolicitudEmpresaAdmin, TipoClienteOpcion } from '../../interfaces/api.interfaces';
import { dictaminarSolicitud, listarSolicitudes, listarTiposCliente } from '../../services/admin-empresas.service';
import { aErrorCuentas, type ErrorCuentas } from '../../services/errores';
import { DictamenPanel } from './DictamenPanel';
import { ErrorAdmin, EstadoBadge, ListaVacia, Paginacion } from './ElementosAdmin';
import { ETIQUETA_TIPO, formatoFecha, motivoObligatorio } from './formato';

const LIMITE = 10;

/** HU-CUE-09 · Registros nuevos y ascensos de cuentas personales a empresa. */
export function SolicitudesTab({ estado }: { estado?: EstadoSolicitudEmpresa }) {
  const [pagina, setPagina] = useState(1);
  const [lista, setLista] = useState<ListaPaginada<SolicitudEmpresaAdmin> | null>(null);
  const [error, setError] = useState<ErrorCuentas | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<SolicitudEmpresaAdmin | null>(null);

  const cargar = useCallback(async () => {
    try {
      setLista(await listarSolicitudes({ estado, page: pagina, limit: LIMITE }));
      setError(null);
    } catch (e) {
      setError(aErrorCuentas(e));
    }
  }, [estado, pagina]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cerrar = useCallback(() => setSeleccion(null), []);

  const dictaminar = async (dictamen: DictamenSolicitudEmpresaFormData) => {
    if (!seleccion) return;
    try {
      await dictaminarSolicitud(seleccion.idSolicitud, dictamen);
    } catch (e) {
      throw new Error(aErrorCuentas(e).mensaje);
    }
    setAviso(`Solicitud de ${seleccion.nombreEmpresa} ${dictamen.decision === 'aprobar' ? 'aprobada' : 'rechazada'}.`);
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
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {lista?.items.length === 0 && <ListaVacia>No hay solicitudes con este filtro.</ListaVacia>}

      {lista && lista.items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-neutral-light bg-neutral-lightest font-title text-[11px] font-bold uppercase tracking-wider text-neutral-medium">
                <th scope="col" className="px-6 py-3.5">Empresa</th>
                <th scope="col" className="px-4 py-3.5">Representante</th>
                <th scope="col" className="px-4 py-3.5">Tipo</th>
                <th scope="col" className="px-4 py-3.5">Recibida</th>
                <th scope="col" className="px-4 py-3.5">Estado</th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-light/60 font-sans text-sm">
              {lista.items.map((s) => (
                <tr key={s.idSolicitud} className="hover:bg-neutral-lightest/60">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-neutral-black">{s.nombreEmpresa}</p>
                    <p className="text-xs text-neutral-medium">NIT {s.nit}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-neutral-dark">{s.nombreRepresentante}</p>
                    <p className="text-xs text-neutral-medium">{s.correoEmpresarial}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-neutral-dark">{ETIQUETA_TIPO[s.tipoSolicitud]}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-neutral-dark">{formatoFecha(s.fechaSolicitud)}</td>
                  <td className="px-4 py-4">
                    <EstadoBadge estado={s.estado} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant={s.estado === 'pendiente' ? 'primary-action' : 'ghost'}
                      aria-label={`${s.estado === 'pendiente' ? 'Revisar' : 'Ver'} solicitud de ${s.nombreEmpresa}`}
                      onClick={() => {
                        setAviso(null);
                        setSeleccion(s);
                      }}
                    >
                      {s.estado === 'pendiente' ? 'Revisar' : 'Ver'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {lista && <Paginacion pagina={pagina} limite={LIMITE} total={lista.total} onCambiar={setPagina} />}

      <Modal
        isOpen={seleccion !== null}
        onClose={cerrar}
        size="lg"
        title={seleccion ? seleccion.nombreEmpresa : ''}
        subtitle={seleccion ? ETIQUETA_TIPO[seleccion.tipoSolicitud] : undefined}
      >
        {seleccion && <SolicitudDetalle solicitud={seleccion} onDictaminar={dictaminar} />}
      </Modal>
    </>
  );
}

function SolicitudDetalle({
  solicitud,
  onDictaminar,
}: {
  solicitud: SolicitudEmpresaAdmin;
  onDictaminar: (dictamen: DictamenSolicitudEmpresaFormData) => Promise<void>;
}) {
  // M06 · D8: al aprobar se elige el tipo de cliente; se cargan solo si la solicitud está pendiente.
  const [tipos, setTipos] = useState<TipoClienteOpcion[] | null>(null);
  const [errorTipos, setErrorTipos] = useState<string | null>(null);
  const pendiente = solicitud.estado === 'pendiente';
  useEffect(() => {
    if (!pendiente) return;
    let vigente = true;
    listarTiposCliente()
      .then((t) => vigente && setTipos(t))
      .catch((e: unknown) => vigente && setErrorTipos(aErrorCuentas(e).mensaje));
    return () => {
      vigente = false;
    };
  }, [pendiente]);

  const filas: ReadonlyArray<[string, string]> = [
    ['NIT', solicitud.nit],
    ['Representante legal', solicitud.nombreRepresentante],
    ['Correo empresarial', solicitud.correoEmpresarial],
    ['Teléfono', solicitud.telefono],
    ['Recibida', formatoFecha(solicitud.fechaSolicitud)],
    ['Revisada', formatoFecha(solicitud.fechaRevision)],
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <span className="font-sans text-sm text-neutral-medium">Estado:</span>
        <EstadoBadge estado={solicitud.estado} />
      </div>
      <dl className="grid gap-x-6 gap-y-3 font-sans text-sm sm:grid-cols-2">
        {filas.map(([termino, valor]) => (
          <div key={termino}>
            <dt className="text-neutral-medium">{termino}</dt>
            <dd className="font-medium text-neutral-black">{valor}</dd>
          </div>
        ))}
      </dl>
      {solicitud.estado === 'rechazada' && solicitud.motivoRechazo && (
        <Alert variant="warning">Motivo del rechazo: {solicitud.motivoRechazo}</Alert>
      )}
      {pendiente && errorTipos !== null && <Alert variant="error">{errorTipos}</Alert>}
      {pendiente && (
        <DictamenPanel
          motivoObligatorio={motivoObligatorio(solicitud.tipoSolicitud)}
          onDictaminar={onDictaminar}
          tiposCliente={tipos}
        />
      )}
    </div>
  );
}
