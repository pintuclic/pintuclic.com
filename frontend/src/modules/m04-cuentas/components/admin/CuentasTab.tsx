'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Checkbox, Input, Modal, Select, Skeleton } from '@/core/components';
import type { CuentaEmpresaAdmin, ListaPaginada, TipoClienteOpcion } from '../../interfaces/api.interfaces';
import { cambiarTipoCliente, listarCuentasEmpresa, listarTiposCliente } from '../../services/admin-empresas.service';
import { aErrorCuentas, type ErrorCuentas } from '../../services/errores';
import { TipoClienteModal } from '@/modules/m06-precios/components/TipoClienteModal';
import { ErrorAdmin, ListaVacia, Paginacion } from './ElementosAdmin';

const LIMITE = 10;

const porcentaje = (n: number): string => `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(n)} %`;

/**
 * M06 · D8 · Cuentas empresa aprobadas y su tipo de cliente. El tipo fija el descuento de la cuenta en sus compras;
 * una cuenta sin tipo (las anteriores a M06) no recibe descuento hasta que se le asigne uno. Los tipos y sus
 * porcentajes se administran en la pestaña «Tipos de cliente» de este mismo panel.
 */
export function CuentasTab() {
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [termino, setTermino] = useState('');
  const [sinTipo, setSinTipo] = useState(false);
  const [lista, setLista] = useState<ListaPaginada<CuentaEmpresaAdmin> | null>(null);
  const [error, setError] = useState<ErrorCuentas | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cambiando, setCambiando] = useState<CuentaEmpresaAdmin | null>(null);

  // La búsqueda espera 300 ms tras la última tecla.
  useEffect(() => {
    const t = setTimeout(() => {
      setTermino(busqueda);
      setPagina(1);
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  const cargar = useCallback(async () => {
    try {
      setLista(await listarCuentasEmpresa({ busqueda: termino, sinTipo, page: pagina, limit: LIMITE }));
      setError(null);
    } catch (e) {
      setError(aErrorCuentas(e));
    }
  }, [termino, sinTipo, pagina]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (error) return <ErrorAdmin error={error} />;

  return (
    <>
      <div className="grid gap-3 border-b border-neutral-light/60 px-6 py-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <Input
          id="busqueda-cuentas"
          label="Buscar"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          helperText="Nombre de la empresa, representante o NIT."
        />
        <div className="pb-2">
          <Checkbox
            label="Solo cuentas sin tipo (sin descuento)"
            checked={sinTipo}
            onChange={(e) => {
              setSinTipo(e.target.checked);
              setPagina(1);
            }}
          />
        </div>
      </div>

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

      {lista?.items.length === 0 && <ListaVacia>No hay cuentas empresa con este filtro.</ListaVacia>}

      {lista && lista.items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-neutral-light bg-neutral-lightest font-title text-[11px] font-bold uppercase tracking-wider text-neutral-medium">
                <th scope="col" className="px-6 py-3.5">
                  Empresa
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Tipo de cliente
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-light/60 font-sans text-sm">
              {lista.items.map((c) => (
                <tr key={c.idUsuario} className="hover:bg-neutral-lightest/60">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-neutral-black">{c.nombreEmpresa}</p>
                    <p className="text-xs text-neutral-medium">
                      NIT {c.nit} · {c.nombreRepresentante}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    {c.tipoCliente === null ? (
                      <Badge variant="neutral">Sin tipo · sin descuento</Badge>
                    ) : (
                      <>
                        <p className="text-neutral-black">
                          {c.tipoCliente.nombre} · {porcentaje(c.tipoCliente.porcentaje)}
                        </p>
                        {c.tipoCliente.estado === 'inactivo' && (
                          <p className="text-xs text-danger">Tipo desactivado: no recibe descuento</p>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant={c.tipoCliente === null ? 'primary-action' : 'ghost'}
                      aria-label={`${c.tipoCliente === null ? 'Asignar' : 'Cambiar'} el tipo de cliente de ${c.nombreEmpresa}`}
                      onClick={() => {
                        setAviso(null);
                        setCambiando(c);
                      }}
                    >
                      {c.tipoCliente === null ? 'Asignar tipo' : 'Cambiar tipo'}
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
        isOpen={cambiando !== null}
        onClose={() => setCambiando(null)}
        size="md"
        title="Tipo de cliente empresa"
        subtitle={cambiando?.nombreEmpresa}
      >
        {cambiando && (
          <CambiarTipo
            cuenta={cambiando}
            onCancelar={() => setCambiando(null)}
            onGuardado={(texto) => {
              setAviso(texto);
              setCambiando(null);
              void cargar();
            }}
          />
        )}
      </Modal>
    </>
  );
}

function CambiarTipo({
  cuenta,
  onCancelar,
  onGuardado,
}: {
  cuenta: CuentaEmpresaAdmin;
  onCancelar: () => void;
  onGuardado: (texto: string) => void;
}) {
  const [tipos, setTipos] = useState<TipoClienteOpcion[] | null>(null);
  const [idTipo, setIdTipo] = useState(
    cuenta.tipoCliente?.estado === 'activo' ? String(cuenta.tipoCliente.idSubRolEmpresa) : '',
  );
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [creando, setCreando] = useState(false);
  const [version, setVersion] = useState(0);

  // Se vuelve a leer cuando se crea un tipo desde aquí mismo (`version`).
  useEffect(() => {
    let vigente = true;
    listarTiposCliente()
      .then((t) => vigente && setTipos(t))
      .catch((e: unknown) => vigente && setError(aErrorCuentas(e).mensaje));
    return () => {
      vigente = false;
    };
  }, [version]);

  const guardar = async () => {
    setError(null);
    setGuardando(true);
    try {
      const r = await cambiarTipoCliente(cuenta.idUsuario, Number(idTipo));
      onGuardado(`${r.nombreEmpresa}: ahora es ${r.tipoCliente?.nombre ?? 'sin tipo'}.`);
    } catch (e) {
      setError(aErrorCuentas(e).mensaje);
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {error !== null && <Alert variant="error">{error}</Alert>}
      {tipos === null && error === null && (
        <p role="status" className="font-sans text-sm text-neutral-medium">
          Cargando los tipos de cliente…
        </p>
      )}
      {tipos !== null && tipos.length === 0 && (
        <Alert variant="warning">
          No hay tipos de cliente empresa activos. Crea el primero aquí abajo.
        </Alert>
      )}
      {tipos !== null && tipos.length > 0 && (
        <Select
          id="cambiar-tipo-cliente"
          label="Tipo de cliente"
          value={idTipo}
          onChange={(e) => setIdTipo(e.target.value)}
          helperText="El nuevo descuento rige desde la próxima compra de la cuenta."
          options={[
            { value: '', label: 'Elige un tipo…' },
            ...tipos.map((t) => ({
              value: String(t.idSubRolEmpresa),
              label: `${t.nombre} · ${porcentaje(t.porcentaje)} de descuento`,
            })),
          ]}
        />
      )}
      {tipos !== null && (
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => setCreando(true)}>
            Crear un tipo nuevo
          </Button>
          <p className="mt-1 font-sans text-xs text-neutral-medium">
            ¿No está el tipo que necesitas? Créalo con su descuento y elígelo aquí.
          </p>
        </div>
      )}
      {creando && (
        <TipoClienteModal
          tipo={null}
          onClose={() => setCreando(false)}
          onGuardado={() => setVersion((v) => v + 1)}
        />
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="primary-action"
          isLoading={guardando}
          disabled={
            idTipo === '' ||
            (cuenta.tipoCliente !== null &&
              idTipo === String(cuenta.tipoCliente.idSubRolEmpresa) &&
              cuenta.tipoCliente.estado === 'activo')
          }
          onClick={() => void guardar()}
        >
          Guardar tipo
        </Button>
      </div>
    </div>
  );
}
