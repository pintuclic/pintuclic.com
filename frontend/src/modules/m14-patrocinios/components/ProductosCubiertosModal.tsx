'use client';

import React, { useCallback, useState } from 'react';
import { Alert, Badge, Button, Modal } from '@/core/components';
import type { ObjetivoPatrocinio } from '../dtos/m14-patrocinios.dto';
import { useCargar } from '../hooks/useCargar';
import { formatearNumero } from '../services/etiquetas';
import { campaniasApi } from '../services/patrocinios-api';
import { Cargando, MensajeVacio, Paginador } from './comunes';

export type OrigenProductos =
  | { tipo: 'guardada'; idCampania: number }
  | { tipo: 'borrador'; objetivos: readonly ObjetivoPatrocinio[] };

export interface ProductosCubiertosModalProps {
  origen: OrigenProductos;
  titulo: string;
  onClose: () => void;
}

/**
 * Qué productos cubre una campaña, guardada o todavía en borrador (A12). No escribe nada. Los que no se mostrarían hoy
 * (inactivos, sin publicar, sin variantes activas o con la marca, línea o categoría apagadas) salen marcados.
 */
export const ProductosCubiertosModal: React.FC<ProductosCubiertosModalProps> = ({ origen, titulo, onClose }) => {
  const [pagina, setPagina] = useState(1);
  const datos = useCargar(
    useCallback(
      () =>
        origen.tipo === 'guardada'
          ? campaniasApi.productos(origen.idCampania, pagina, 15)
          : campaniasApi.vistaPrevia(origen.objetivos, pagina, 15),
      [origen, pagina],
    ),
    'No se pudieron cargar los productos.',
  );
  const visibles = datos.datos?.items.filter((p) => p.visible).length ?? 0;

  return (
    <Modal isOpen onClose={onClose} title="Productos de la campaña" subtitle={titulo} size="xl">
      <div className="space-y-3 py-2">
        <p className="font-sans text-sm text-neutral-dark">
          Estos son los productos que cubre hoy lo elegido. Si se crea un producto nuevo de esa marca o línea, entra
          solo. Los marcados «No se muestra» no aparecen en el sitio aunque la campaña esté vigente.
        </p>
        {datos.error !== null && <Alert variant="error">{datos.error}</Alert>}
        {datos.cargando && datos.datos === null && <Cargando />}
        {datos.datos !== null && datos.datos.items.length === 0 && (
          <MensajeVacio>Lo elegido no cubre ningún producto.</MensajeVacio>
        )}
        {datos.datos !== null && datos.datos.items.length > 0 && (
          <>
            <p className="font-sans text-sm font-medium text-neutral-black" role="status">
              Cubre {formatearNumero(datos.datos.paginacion.total)} productos
              {datos.datos.paginacion.totalPaginas > 1 ? ` (en esta página, ${visibles} se muestran)` : ` y ${visibles} se muestran`}.
            </p>
            <div className="overflow-x-auto rounded-card border border-neutral-light bg-neutral-white">
              <table className="w-full min-w-[560px] text-left font-sans text-sm">
                <caption className="sr-only">Productos que cubre la campaña</caption>
                <thead className="bg-neutral-lightest text-xs uppercase tracking-wide text-neutral-medium">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Producto
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Línea
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Categoría
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      ¿Se muestra?
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
                      <td className="px-4 py-3 text-neutral-dark">{p.subcategoria}</td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant={p.visible ? 'success' : 'neutral'}>{p.visible ? 'Sí' : 'No se muestra'}</Badge>
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
