'use client';

import { useCallback, useEffect, useState } from 'react';
import { MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { Alert, Badge, Button, Modal, Skeleton } from '@/core/components';
import type { DireccionClienteFormData } from '../../dtos/m04-cuentas.dto';
import type { Direccion } from '../../interfaces/api.interfaces';
import {
  actualizarDireccion,
  crearDireccion,
  eliminarDireccion,
  listarDirecciones,
  marcarPredeterminada,
} from '../../services/cuentas.service';
import { aErrorCuentas } from '../../services/errores';
import { DireccionForm } from './DireccionForm';
import { SeccionPerfil } from './SeccionPerfil';

/** HU-CUE-07 E10: la décima se admite, la undécima no. */
export const MAXIMO_DIRECCIONES = 10;

type Edicion = { modo: 'crear' } | { modo: 'editar'; direccion: Direccion };

/** HU-CUE-07 · Direcciones guardadas del cliente. */
export function DireccionesSection() {
  const [direcciones, setDirecciones] = useState<Direccion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const [porEliminar, setPorEliminar] = useState<Direccion | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [marcando, setMarcando] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    try {
      setDirecciones(await listarDirecciones());
      setError(null);
    } catch (e) {
      setError(aErrorCuentas(e).mensaje);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const cerrarEdicion = useCallback(() => setEdicion(null), []);
  const cerrarEliminar = useCallback(() => setPorEliminar(null), []);

  const guardar = async (datos: DireccionClienteFormData) => {
    if (!edicion) return;
    try {
      if (edicion.modo === 'crear') {
        await crearDireccion(datos);
        setAviso('Dirección guardada.');
      } else {
        await actualizarDireccion(edicion.direccion.idDireccion, datos);
        setAviso('Dirección actualizada.');
      }
    } catch (e) {
      throw new Error(aErrorCuentas(e).mensaje);
    }
    setEdicion(null);
    await recargar();
  };

  const confirmarEliminar = async () => {
    if (!porEliminar) return;
    setEliminando(true);
    try {
      await eliminarDireccion(porEliminar.idDireccion);
      setAviso('Dirección eliminada.');
      setPorEliminar(null);
      await recargar();
    } catch (e) {
      setError(aErrorCuentas(e).mensaje);
      setPorEliminar(null);
    } finally {
      setEliminando(false);
    }
  };

  const predeterminar = async (direccion: Direccion) => {
    setMarcando(direccion.idDireccion);
    try {
      await marcarPredeterminada(direccion.idDireccion);
      setAviso('Dirección predeterminada actualizada.');
      await recargar();
    } catch (e) {
      setError(aErrorCuentas(e).mensaje);
    } finally {
      setMarcando(null);
    }
  };

  const total = direcciones?.length ?? 0;
  const enLimite = total >= MAXIMO_DIRECCIONES;

  return (
    <SeccionPerfil
      titulo="Mis direcciones"
      descripcion={`Guarda hasta ${MAXIMO_DIRECCIONES} direcciones para comprar más rápido.`}
      accion={
        <Button
          type="button"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={() => {
            setAviso(null);
            setEdicion({ modo: 'crear' });
          }}
          disabled={direcciones === null || enLimite}
        >
          Agregar dirección
        </Button>
      }
    >
      <div className="flex flex-col gap-4" aria-live="polite">
        {aviso && <Alert variant="success">{aviso}</Alert>}
        {error && <Alert variant="error">{error}</Alert>}
        {enLimite && (
          <Alert variant="info">
            Alcanzaste el máximo de {MAXIMO_DIRECCIONES} direcciones. Elimina una para agregar otra.
          </Alert>
        )}

        {direcciones === null && !error && (
          <div className="grid gap-4 sm:grid-cols-2" aria-busy="true">
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </div>
        )}

        {direcciones?.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-neutral-light px-4 py-10 text-center">
            <MapPin className="h-8 w-8 text-neutral-medium" aria-hidden="true" />
            <p className="font-title text-sm font-semibold text-neutral-black">Aún no tienes direcciones</p>
            <p className="font-sans text-sm text-neutral-medium">La primera que agregues quedará como predeterminada.</p>
          </div>
        )}

        {direcciones && direcciones.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2">
            {direcciones.map((dir) => (
              <li
                key={dir.idDireccion}
                className={`flex flex-col gap-3 rounded-card border p-4 ${
                  dir.esPredeterminada ? 'border-action/60 bg-action/5' : 'border-neutral-light'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-title text-sm font-semibold text-neutral-black">{dir.nombreApellido}</p>
                  {dir.esPredeterminada && <Badge variant="action">Predeterminada</Badge>}
                </div>
                <address className="font-sans text-sm not-italic text-neutral-dark">
                  {dir.direccion}
                  {dir.apartamentoCasa ? `, ${dir.apartamentoCasa}` : ''}
                  <br />
                  {dir.barrio}
                  <br />
                  Tel. {dir.telefono}
                </address>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    leftIcon={<Pencil className="h-4 w-4" aria-hidden="true" />}
                    aria-label={`Editar dirección ${dir.direccion}`}
                    onClick={() => {
                      setAviso(null);
                      setEdicion({ modo: 'editar', direccion: dir });
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    leftIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                    aria-label={`Eliminar dirección ${dir.direccion}`}
                    onClick={() => setPorEliminar(dir)}
                  >
                    Eliminar
                  </Button>
                  {!dir.esPredeterminada && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      isLoading={marcando === dir.idDireccion}
                      leftIcon={<Star className="h-4 w-4" aria-hidden="true" />}
                      aria-label={`Marcar ${dir.direccion} como predeterminada`}
                      onClick={() => predeterminar(dir)}
                    >
                      Predeterminar
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        isOpen={edicion !== null}
        onClose={cerrarEdicion}
        size="lg"
        title={edicion?.modo === 'editar' ? 'Editar dirección' : 'Nueva dirección'}
      >
        {edicion && (
          <DireccionForm
            inicial={edicion.modo === 'editar' ? edicion.direccion : undefined}
            esPrimera={edicion.modo === 'crear' && total === 0}
            onGuardar={guardar}
            onCancelar={cerrarEdicion}
          />
        )}
      </Modal>

      <Modal
        isOpen={porEliminar !== null}
        onClose={cerrarEliminar}
        size="sm"
        title="¿Eliminar esta dirección?"
        subtitle={porEliminar ? `${porEliminar.direccion}, ${porEliminar.barrio}` : undefined}
      >
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="ghost" onClick={cerrarEliminar}>
            Cancelar
          </Button>
          <Button type="button" variant="danger" isLoading={eliminando} onClick={confirmarEliminar}>
            Eliminar
          </Button>
        </div>
      </Modal>
    </SeccionPerfil>
  );
}
