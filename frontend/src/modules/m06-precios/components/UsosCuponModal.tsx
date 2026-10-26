'use client';

import React, { useCallback, useState } from 'react';
import { Alert, Badge, Button, Checkbox, Modal } from '@/core/components';
import type { Cupon } from '../dtos/m06-precios.dto';
import { useCargar } from '../hooks/useCargar';
import { formatearFechaHora, formatearPesos } from '../services/etiquetas';
import { cuponesApi } from '../services/precios-api';
import { Cargando, MensajeVacio, Paginador } from './comunes';

/** Qué órdenes usaron un cupón; las canceladas (liberadas) se pueden mostrar aparte. */
export const UsosCuponModal: React.FC<{ cupon: Cupon; onClose: () => void }> = ({ cupon, onClose }) => {
  const [pagina, setPagina] = useState(1);
  const [liberados, setLiberados] = useState(false);
  const datos = useCargar(
    useCallback(
      () => cuponesApi.usos(cupon.idCupon, { pagina, limite: 15, incluirLiberados: liberados ? true : undefined }),
      [cupon.idCupon, pagina, liberados],
    ),
    'No se pudieron cargar los usos.',
  );
  return (
    <Modal isOpen onClose={onClose} title={`Usos del cupón ${cupon.codigo}`} subtitle={cupon.nombre} size="lg">
      <div className="space-y-3 py-2">
        <Checkbox
          label="Incluir usos liberados (órdenes canceladas)"
          checked={liberados}
          onChange={(e) => {
            setLiberados(e.target.checked);
            setPagina(1);
          }}
        />
        {datos.error !== null && <Alert variant="error">{datos.error}</Alert>}
        {datos.cargando && datos.datos === null && <Cargando />}
        {datos.datos !== null && datos.datos.items.length === 0 && (
          <MensajeVacio>Este cupón todavía no se ha usado.</MensajeVacio>
        )}
        {datos.datos !== null && datos.datos.items.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-card border border-neutral-light bg-neutral-white">
              <table className="w-full min-w-[560px] text-left font-sans text-sm">
                <caption className="sr-only">Usos del cupón</caption>
                <thead className="bg-neutral-lightest text-xs uppercase tracking-wide text-neutral-medium">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Orden
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Cliente
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Descuento
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Fecha
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-light">
                  {datos.datos.items.map((u) => (
                    <tr key={u.idCuponUso}>
                      <td className="px-4 py-3 text-neutral-black">
                        {u.referencia} {u.liberadoEn !== null && <Badge variant="neutral">Liberado</Badge>}
                      </td>
                      <td className="px-4 py-3 text-neutral-dark">{u.usuario ?? 'Usuario eliminado'}</td>
                      <td className="px-4 py-3 text-right text-neutral-black">{formatearPesos(u.importeDescuento)}</td>
                      <td className="px-4 py-3 text-neutral-dark">{formatearFechaHora(u.fecha)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginador paginacion={datos.datos.paginacion} onCambiar={setPagina} />
          </>
        )}
        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
