'use client';

import React, { useCallback, useState } from 'react';
import { Boxes, PackageCheck, PackageX } from 'lucide-react';
import { AdminStatCard, Alert, Badge, Button, Checkbox, Input, Select } from '@/core/components';
import { useCargar, useRetardo } from '../hooks/useCargar';
import type { ItemInventario } from '../dtos/m13-inventario.dto';
import { formatearFecha, formatearNumero } from '../services/etiquetas';
import { inventarioApi, marcasFiltroApi } from '../services/inventario-api';
import { AjustarModal } from './AjustarModal';
import { AvisoAccion, Cargando, MensajeVacio, Paginador, type Aviso } from './comunes';

export interface ExistenciasViewProps {
  onVerHistorial: (idVariante: number) => void;
}

/** Existencias referenciales por variante (R11, R12): lista con filtros y ajuste manual. */
export const ExistenciasView: React.FC<ExistenciasViewProps> = ({ onVerHistorial }) => {
  const [busqueda, setBusqueda] = useState('');
  const [idMarca, setIdMarca] = useState('');
  const [estado, setEstado] = useState('');
  const [inactivas, setInactivas] = useState(false);
  const [pagina, setPagina] = useState(1);
  const termino = useRetardo(busqueda);
  const [aAjustar, setAAjustar] = useState<ItemInventario | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);

  const marcas = useCargar(
    useCallback(() => marcasFiltroApi.listar(), []),
    'No se pudieron cargar las marcas.',
  );
  const resumen = useCargar(
    useCallback(() => inventarioApi.resumen(), []),
    'No se pudo cargar el resumen.',
  );
  const lista = useCargar(
    useCallback(
      () =>
        inventarioApi.listar({
          busqueda: termino,
          idMarca: idMarca === '' ? undefined : Number(idMarca),
          estadoExistencia: estado,
          incluirInactivas: inactivas ? true : undefined,
          pagina,
          limite: 15,
        }),
      [termino, idMarca, estado, inactivas, pagina],
    ),
    'No se pudieron cargar las existencias.',
  );
  const filtro =
    <T,>(fijar: (v: T) => void) =>
    (v: T) => {
      fijar(v);
      setPagina(1);
    };

  const r = resumen.datos;
  return (
    <section aria-labelledby="titulo-existencias" className="space-y-4">
      <div>
        <h2 id="titulo-existencias" className="font-title text-lg font-semibold text-corporate">
          Existencias
        </h2>
        <p className="font-sans text-sm text-neutral-medium">
          La existencia es una nota de referencia por variante: no bloquea las ventas. Cada cambio queda en el
          historial.
        </p>
      </div>

      <AvisoAccion aviso={aviso} onCerrar={cerrarAviso} />

      {resumen.error !== null && <Alert variant="error">{resumen.error}</Alert>}
      {r !== null && (
        <div className="grid gap-3 sm:grid-cols-3">
          <AdminStatCard
            label="Variantes activas"
            value={formatearNumero(r.totalVariantes)}
            trendType="neutral"
            trendText={
              r.ultimoAjuste === null ? 'Sin ajustes todavía' : `Último ajuste: ${formatearFecha(r.ultimoAjuste)}`
            }
            icon={<Boxes className="h-5 w-5" aria-hidden="true" />}
          />
          <AdminStatCard
            label="Con existencia"
            value={formatearNumero(r.disponibles)}
            trendType="positive"
            trendText={`${formatearNumero(r.sinAjustes)} sin ningún ajuste`}
            icon={<PackageCheck className="h-5 w-5" aria-hidden="true" />}
          />
          <AdminStatCard
            label="Agotadas"
            value={formatearNumero(r.agotadas)}
            trendType={r.agotadas > 0 ? 'negative' : 'neutral'}
            trendText="Existencia en 0"
            icon={<PackageX className="h-5 w-5" aria-hidden="true" />}
          />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="Buscar"
          value={busqueda}
          onChange={(e) => filtro(setBusqueda)(e.target.value)}
          helperText="Producto, marca, medida o SKU."
        />
        <Select
          label="Marca"
          value={idMarca}
          onChange={(e) => filtro(setIdMarca)(e.target.value)}
          options={[
            { value: '', label: 'Todas' },
            ...(marcas.datos ?? []).map((m) => ({ value: String(m.idMarca), label: m.nombre })),
          ]}
        />
        <Select
          label="Existencia"
          value={estado}
          onChange={(e) => filtro(setEstado)(e.target.value)}
          options={[
            { value: '', label: 'Todas' },
            { value: 'disponible', label: 'Con existencia' },
            { value: 'agotado', label: 'Agotadas' },
          ]}
        />
        <div className="flex items-end pb-2">
          <Checkbox
            label="Incluir variantes inactivas"
            checked={inactivas}
            onChange={(e) => filtro(setInactivas)(e.target.checked)}
          />
        </div>
      </div>

      {lista.error !== null && <Alert variant="error">{lista.error}</Alert>}
      {lista.cargando && lista.datos === null && <Cargando />}
      {lista.datos !== null && lista.datos.items.length === 0 && (
        <MensajeVacio>No hay variantes con esos filtros.</MensajeVacio>
      )}
      {lista.datos !== null && lista.datos.items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-card border border-neutral-light bg-neutral-white">
            <table className="w-full min-w-[760px] text-left font-sans text-sm">
              <caption className="sr-only">Existencias por variante</caption>
              <thead className="bg-neutral-lightest text-xs uppercase tracking-wide text-neutral-medium">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Producto
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Medida
                  </th>
                  <th scope="col" className="px-4 py-3">
                    SKU
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Existencia
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Último ajuste
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-light">
                {lista.datos.items.map((v) => (
                  <tr key={v.idVariante}>
                    <td className="px-4 py-3">
                      <span className="block text-neutral-black">{v.producto}</span>
                      <span className="block text-xs text-neutral-medium">
                        {v.marca}
                        {v.estadoVariante === 'inactivo' && ' · Variante inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-dark">{v.medida}</td>
                    <td className="px-4 py-3 text-neutral-dark">{v.sku}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center justify-end gap-2">
                        {v.estadoExistencia === 'agotado' && <Badge variant="danger">Agotado</Badge>}
                        <span className="font-title font-semibold text-neutral-black">
                          {formatearNumero(v.existenciaReferencial)}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-dark">
                      {v.ultimoAjuste === null ? 'Nunca' : formatearFecha(v.ultimoAjuste)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setAAjustar(v)}>
                          Ajustar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => onVerHistorial(v.idVariante)}>
                          Ver historial
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

      {aAjustar !== null && (
        <AjustarModal
          item={aAjustar}
          onClose={() => setAAjustar(null)}
          onGuardado={(texto) => {
            setAviso({ tipo: 'success', texto });
            lista.recargar();
            resumen.recargar();
          }}
        />
      )}
    </section>
  );
};
