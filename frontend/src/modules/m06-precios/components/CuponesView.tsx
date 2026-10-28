'use client';

import React, { useCallback, useState } from 'react';
import { Plus } from 'lucide-react';
import { Alert, Badge, Button, Input, Select, type BadgeVariant } from '@/core/components';
import type { Cupon, SituacionCupon } from '../dtos/m06-precios.dto';
import { useCargar, useRetardo } from '../hooks/useCargar';
import {
  ETIQUETAS_AUDIENCIA,
  ETIQUETAS_SITUACION_CUPON,
  formatearFechaHora,
  formatearNumero,
  formatearPesos,
  formatearPorcentaje,
} from '../services/etiquetas';
import { mensajeDeError } from '../services/mensaje-error';
import { cuponesApi } from '../services/precios-api';
import { AvisoAccion, Cargando, MensajeVacio, Paginador, type Aviso } from './comunes';
import { CuponModal } from './CuponModal';
import { UsosCuponModal } from './UsosCuponModal';

const VARIANTE_SITUACION: Record<SituacionCupon, BadgeVariant> = {
  vigente: 'success',
  programado: 'action',
  vencido: 'neutral',
  inactivo: 'neutral',
};

type Modal = { tipo: 'editar'; cupon: Cupon | null } | { tipo: 'usos'; cupon: Cupon } | null;

/** Cupones de descuento: lista, alta y edición, activar o desactivar y consulta de usos. */
export const CuponesView: React.FC = () => {
  const [busqueda, setBusqueda] = useState('');
  const [situacion, setSituacion] = useState('');
  const [pagina, setPagina] = useState(1);
  const termino = useRetardo(busqueda);
  const [modal, setModal] = useState<Modal>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);

  const lista = useCargar(
    useCallback(
      () => cuponesApi.listar({ busqueda: termino, situacion, pagina, limite: 15 }),
      [termino, situacion, pagina],
    ),
    'No se pudieron cargar los cupones.',
  );

  const alternar = async (c: Cupon): Promise<void> => {
    try {
      await cuponesApi.cambiarEstado(c.idCupon, c.estado === 'activo' ? 'inactivo' : 'activo');
      setAviso({ tipo: 'success', texto: `Cupón ${c.codigo} ${c.estado === 'activo' ? 'desactivado' : 'activado'}.` });
      lista.recargar();
    } catch (err: unknown) {
      setAviso({ tipo: 'error', texto: mensajeDeError(err, 'No se pudo cambiar el estado.') });
    }
  };

  return (
    <section aria-labelledby="titulo-cupones" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="titulo-cupones" className="font-title text-lg font-semibold text-corporate">
            Cupones
          </h2>
          <p className="font-sans text-sm text-neutral-medium">
            Códigos que el cliente escribe en el carrito. Se aplican al final, sobre el precio ya rebajado.
          </p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={() => setModal({ tipo: 'editar', cupon: null })}
        >
          Nuevo cupón
        </Button>
      </div>

      <AvisoAccion aviso={aviso} onCerrar={cerrarAviso} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Buscar"
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setPagina(1);
          }}
          helperText="Código o nombre."
        />
        <Select
          label="Situación"
          value={situacion}
          onChange={(e) => {
            setSituacion(e.target.value);
            setPagina(1);
          }}
          options={[
            { value: '', label: 'Todas' },
            ...(Object.keys(ETIQUETAS_SITUACION_CUPON) as SituacionCupon[]).map((s) => ({
              value: s,
              label: ETIQUETAS_SITUACION_CUPON[s],
            })),
          ]}
        />
      </div>

      {lista.error !== null && <Alert variant="error">{lista.error}</Alert>}
      {lista.cargando && lista.datos === null && <Cargando />}
      {lista.datos !== null && lista.datos.items.length === 0 && (
        <MensajeVacio>No hay cupones con esos filtros.</MensajeVacio>
      )}
      {lista.datos !== null && lista.datos.items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-card border border-neutral-light bg-neutral-white">
            <table className="w-full min-w-[640px] text-left font-sans text-sm">
              <caption className="sr-only">Cupones de descuento</caption>
              <thead className="bg-neutral-lightest text-xs uppercase tracking-wide text-neutral-medium">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Cupón
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Descuento
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Vigencia
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Usos
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Situación
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-light">
                {lista.datos.items.map((c) => (
                  <tr key={c.idCupon}>
                    <td className="px-4 py-3">
                      <span className="block font-title font-semibold text-neutral-black">{c.codigo}</span>
                      <Badge variant={VARIANTE_SITUACION[c.situacion]} className="my-1">
                        {ETIQUETAS_SITUACION_CUPON[c.situacion]}
                      </Badge>
                      <span className="block text-xs text-neutral-medium">
                        {c.nombre} · {ETIQUETAS_AUDIENCIA[c.audiencia]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-dark">
                      {c.tipoValor === 'porcentaje' ? formatearPorcentaje(c.valor) : formatearPesos(c.valor)}
                      {c.montoMinimoCompra !== null && (
                        <span className="block text-xs text-neutral-medium">
                          Compra mínima {formatearPesos(c.montoMinimoCompra)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-dark">
                      {formatearFechaHora(c.fechaInicio)}
                      <span className="block text-xs text-neutral-medium">
                        {c.fechaFin === null ? 'sin fecha de fin' : `hasta ${formatearFechaHora(c.fechaFin)}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-dark">
                      {formatearNumero(c.usosActuales)}
                      {c.usosMaximos !== null && (
                        <span className="text-neutral-medium"> / {formatearNumero(c.usosMaximos)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setModal({ tipo: 'usos', cupon: c })}>
                          Usos
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setModal({ tipo: 'editar', cupon: c })}>
                          Editar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => void alternar(c)}>
                          {c.estado === 'activo' ? 'Desactivar' : 'Activar'}
                        </Button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginador paginacion={lista.datos.paginacion} onCambiar={setPagina} />
        </>
      )}

      {modal?.tipo === 'editar' && (
        <CuponModal
          cupon={modal.cupon}
          onClose={() => setModal(null)}
          onGuardado={(texto) => {
            setAviso({ tipo: 'success', texto });
            lista.recargar();
          }}
        />
      )}
      {modal?.tipo === 'usos' && <UsosCuponModal cupon={modal.cupon} onClose={() => setModal(null)} />}
    </section>
  );
};
