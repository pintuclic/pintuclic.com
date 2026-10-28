'use client';

import React, { useCallback, useState } from 'react';
import { Alert, Button, Modal } from '@/core/components';
import type { CrearEventoRequest } from '../dtos/m06-precios.dto';
import { useCargar } from '../hooks/useCargar';
import { formatearNumero, formatearPorcentaje } from '../services/etiquetas';
import { eventosApi } from '../services/precios-api';
import { Cargando, MensajeVacio, Paginador } from './comunes';

export interface VistaPreviaEventoProps {
  cuerpo: CrearEventoRequest;
  onClose: () => void;
}

/**
 * Qué productos entrarían con el borrador del evento (D12). No guarda nada y no mira el calendario:
 * sirve para comprobar objetivos y excepciones antes de publicar.
 */
export const VistaPreviaEvento: React.FC<VistaPreviaEventoProps> = ({ cuerpo, onClose }) => {
  const [pagina, setPagina] = useState(1);
  const datos = useCargar(
    useCallback(() => eventosApi.vistaPrevia(cuerpo, pagina, 15), [cuerpo, pagina]),
    'No se pudo calcular la vista previa.',
  );

  return (
    <Modal isOpen onClose={onClose} title="Productos que entran en este evento" subtitle={cuerpo.nombre} size="xl">
      <div className="space-y-3 py-2">
        <p className="font-sans text-sm text-neutral-dark">
          Es una simulación con lo que hay escrito ahora, sin importar las fechas. Un producto entra si alguna de sus
          variantes recibe el descuento. Las excepciones por color se aplican al comprar, cuando ya se sabe el color.
        </p>
        {datos.error !== null && <Alert variant="error">{datos.error}</Alert>}
        {datos.cargando && datos.datos === null && <Cargando />}
        {datos.datos !== null && datos.datos.items.length === 0 && (
          <MensajeVacio>Con estas reglas no entra ningún producto.</MensajeVacio>
        )}
        {datos.datos !== null && datos.datos.items.length > 0 && (
          <>
            <p className="font-sans text-sm font-medium text-neutral-black" role="status">
              Entran {formatearNumero(datos.datos.paginacion.total)} productos.
            </p>
            <div className="overflow-x-auto rounded-card border border-neutral-light bg-neutral-white">
              <table className="w-full min-w-[620px] text-left font-sans text-sm">
                <caption className="sr-only">Productos que entran en el evento</caption>
                <thead className="bg-neutral-lightest text-xs uppercase tracking-wide text-neutral-medium">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Producto
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Línea
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Descuento
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Variantes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-light">
                  {datos.datos.items.map((p) => (
                    <tr key={p.idProducto}>
                      <td className="px-4 py-3">
                        <span className="block text-neutral-black">{p.nombre}</span>
                        <span className="block text-xs text-neutral-medium">{p.marca}</span>
                      </td>
                      <td className="px-4 py-3 text-neutral-dark">{p.linea ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-title font-semibold text-neutral-black">
                        {formatearPorcentaje(p.porcentaje)}
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-dark">
                        {p.variantesConDescuento} de {p.variantesTotales}
                      </td>
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
