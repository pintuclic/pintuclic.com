'use client';

import React, { useCallback, useState } from 'react';
import { Plus } from 'lucide-react';
import { Alert, Badge, Button, Modal } from '@/core/components';
import type { TipoClienteEmpresa } from '../dtos/m06-precios.dto';
import { useCargar } from '../hooks/useCargar';
import { formatearNumero, formatearPesos, formatearPorcentaje } from '../services/etiquetas';
import { mensajeDeError } from '../services/mensaje-error';
import { tiposClienteApi } from '../services/precios-api';
import { AvisoAccion, Cargando, MensajeVacio, type Aviso } from './comunes';
import { TipoClienteModal } from './TipoClienteModal';

/**
 * Tipos de cliente empresa y su descuento. El tipo de cada cuenta lo elige quien aprueba la solicitud
 * (en Empresas); aquí solo se administran los tipos y sus porcentajes.
 */
export const ClientesEmpresaView: React.FC = () => {
  const [modal, setModal] = useState<{ tipo: TipoClienteEmpresa | null } | null>(null);
  const [aDesactivar, setADesactivar] = useState<TipoClienteEmpresa | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);
  const lista = useCargar(
    useCallback(() => tiposClienteApi.listar(), []),
    'No se pudieron cargar los tipos de cliente.',
  );

  const cambiarEstado = async (t: TipoClienteEmpresa): Promise<void> => {
    try {
      await tiposClienteApi.cambiarEstado(t.idSubRolEmpresa, t.estado === 'activo' ? 'inactivo' : 'activo');
      setAviso({ tipo: 'success', texto: `Tipo "${t.nombre}" ${t.estado === 'activo' ? 'desactivado' : 'activado'}.` });
      lista.recargar();
    } catch (err: unknown) {
      setAviso({ tipo: 'error', texto: mensajeDeError(err, 'No se pudo cambiar el estado.') });
    }
  };

  /** Desactivar un tipo con cuentas les quita el descuento (R20): se pide confirmación antes. */
  const alternar = (t: TipoClienteEmpresa): void => {
    if (t.estado === 'activo' && t.cuentasAsociadas > 0) setADesactivar(t);
    else void cambiarEstado(t);
  };

  return (
    <section aria-labelledby="titulo-empresa" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="titulo-empresa" className="font-title text-lg font-semibold text-corporate">
            Clientes empresa
          </h2>
          <p className="font-sans text-sm text-neutral-medium">
            Cada cuenta empresa tiene un tipo con su descuento. Se aplica a todo el carrito, después de los eventos, y
            solo si el carrito llega a la compra mínima del tipo.
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={() => setModal({ tipo: null })}>
          Nuevo tipo
        </Button>
      </div>

      <AvisoAccion aviso={aviso} onCerrar={cerrarAviso} />
      {lista.error !== null && <Alert variant="error">{lista.error}</Alert>}
      {lista.cargando && lista.datos === null && <Cargando />}
      {lista.datos !== null && lista.datos.length === 0 && (
        <MensajeVacio>Todavía no hay tipos de cliente empresa.</MensajeVacio>
      )}
      {lista.datos !== null && lista.datos.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-neutral-light bg-neutral-white">
          <table className="w-full min-w-[620px] text-left font-sans text-sm">
            <caption className="sr-only">Tipos de cliente empresa</caption>
            <thead className="bg-neutral-lightest text-xs uppercase tracking-wide text-neutral-medium">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Tipo
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Descuento
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Compra mínima
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Tope de ahorro
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Cuentas
                </th>
                <th scope="col" className="px-4 py-3">
                  Estado
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-light">
              {lista.datos.map((t) => (
                <tr key={t.idSubRolEmpresa}>
                  <td className="px-4 py-3 text-neutral-black">
                    <span className="block">{t.nombre}</span>
                    <Badge variant={t.estado === 'activo' ? 'success' : 'neutral'} className="mt-1">
                      {t.estado === 'activo' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-title font-semibold text-neutral-black">
                    {formatearPorcentaje(t.porcentaje)}
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-dark">
                    {t.montoMinimoCompra === 0 ? 'Sin mínimo' : formatearPesos(t.montoMinimoCompra)}
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-dark">
                    {t.tope === 0 ? 'Sin tope' : formatearPesos(t.tope)}
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-dark">{formatearNumero(t.cuentasAsociadas)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={t.estado === 'activo' ? 'success' : 'neutral'}>
                      {t.estado === 'activo' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setModal({ tipo: t })}>
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => alternar(t)}>
                        {t.estado === 'activo' ? 'Desactivar' : 'Activar'}
                      </Button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {aDesactivar !== null && (
        <Modal isOpen onClose={() => setADesactivar(null)} title={`Desactivar "${aDesactivar.nombre}"`} size="sm">
          <div className="space-y-4 py-2">
            <p className="font-sans text-sm text-neutral-dark">
              {aDesactivar.cuentasAsociadas === 1 ? 'Hay 1 cuenta' : `Hay ${aDesactivar.cuentasAsociadas} cuentas`} con
              este tipo. Si lo desactiva, dejan de recibir su descuento hasta que se les asigne otro tipo.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setADesactivar(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  const t = aDesactivar;
                  setADesactivar(null);
                  void cambiarEstado(t);
                }}
              >
                Desactivar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {modal !== null && (
        <TipoClienteModal
          tipo={modal.tipo}
          onClose={() => setModal(null)}
          onGuardado={(texto) => {
            setAviso({ tipo: 'success', texto });
            lista.recargar();
          }}
        />
      )}
    </section>
  );
};
