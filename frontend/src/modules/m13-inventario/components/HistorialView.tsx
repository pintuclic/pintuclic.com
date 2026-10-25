'use client';

import React, { useCallback, useState } from 'react';
import { X } from 'lucide-react';
import { Alert, Badge, Button, Select } from '@/core/components';
import { useCargar } from '../hooks/useCargar';
import { origenAjusteSchema } from '../dtos/m13-inventario.dto';
import { ETIQUETAS_MOTIVO, ETIQUETAS_ORIGEN, formatearFecha, formatearNumero } from '../services/etiquetas';
import { inventarioApi } from '../services/inventario-api';
import { Cargando, MensajeVacio, Paginador } from './comunes';

export interface HistorialViewProps {
  /** Filtros que vienen de la URL ("Ver historial", "Ver el historial de esta carga"). */
  idVariante: string;
  idCarga: string;
  onQuitarFiltros: () => void;
}

/** Historial inmutable de ajustes (R14): quién, cuándo, antes y después. */
export const HistorialView: React.FC<HistorialViewProps> = ({ idVariante, idCarga, onQuitarFiltros }) => {
  const [origen, setOrigen] = useState('');
  const [pagina, setPagina] = useState(1);

  const variante = useCargar(
    useCallback(
      () => (idVariante === '' ? Promise.resolve(null) : inventarioApi.obtener(Number(idVariante))),
      [idVariante],
    ),
    'No se pudo cargar la variante.',
  );
  const lista = useCargar(
    useCallback(
      () =>
        inventarioApi.historial({
          idVariante: idVariante === '' ? undefined : Number(idVariante),
          idCarga,
          origen,
          pagina,
          limite: 20,
        }),
      [idVariante, idCarga, origen, pagina],
    ),
    'No se pudo cargar el historial.',
  );
  const hayFiltros = idVariante !== '' || idCarga !== '';

  return (
    <section aria-labelledby="titulo-historial" className="space-y-4">
      <div>
        <h2 id="titulo-historial" className="font-title text-lg font-semibold text-corporate">
          Historial de ajustes
        </h2>
        <p className="font-sans text-sm text-neutral-medium">
          Cada cambio de existencia queda registrado con quién lo hizo, cuándo y el valor antes y después. No se puede
          editar ni borrar.
        </p>
      </div>

      {hayFiltros && (
        <div className="flex flex-wrap items-center gap-2 rounded-card border border-neutral-light bg-neutral-lightest px-3 py-2 font-sans text-sm text-neutral-dark">
          <span>Mostrando:</span>
          {idVariante !== '' && (
            <Badge variant="action">
              {variante.datos === null ? 'Una variante' : `${variante.datos.producto} · ${variante.datos.medida}`}
            </Badge>
          )}
          {idCarga !== '' && <Badge variant="action">Una carga masiva</Badge>}
          <Button
            variant="outline"
            size="sm"
            leftIcon={<X className="h-4 w-4" aria-hidden="true" />}
            onClick={onQuitarFiltros}
          >
            Ver todo el historial
          </Button>
        </div>
      )}

      <div className="max-w-xs">
        <Select
          label="Origen"
          value={origen}
          onChange={(e) => {
            setOrigen(e.target.value);
            setPagina(1);
          }}
          options={[
            { value: '', label: 'Todos' },
            ...origenAjusteSchema.options
              .filter((o) => o !== 'samit')
              .map((o) => ({ value: o, label: ETIQUETAS_ORIGEN[o] })),
          ]}
        />
      </div>

      {lista.error !== null && <Alert variant="error">{lista.error}</Alert>}
      {lista.cargando && lista.datos === null && <Cargando />}
      {lista.datos !== null && lista.datos.items.length === 0 && (
        <MensajeVacio>Todavía no hay ajustes con esos filtros.</MensajeVacio>
      )}
      {lista.datos !== null && lista.datos.items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-card border border-neutral-light bg-neutral-white">
            <table className="w-full min-w-[860px] text-left font-sans text-sm">
              <caption className="sr-only">Historial de ajustes de existencia</caption>
              <thead className="bg-neutral-lightest text-xs uppercase tracking-wide text-neutral-medium">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Fecha
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Variante
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Antes → después
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Motivo
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Hecho por
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-light">
                {lista.datos.items.map((a) => (
                  <tr key={a.idAjuste}>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-dark">{formatearFecha(a.fecha)}</td>
                    <td className="px-4 py-3">
                      <span className="block text-neutral-black">
                        {a.producto} · {a.medida}
                      </span>
                      <span className="block text-xs text-neutral-medium">
                        {a.marca} · {a.sku}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <span className="text-neutral-medium">{formatearNumero(a.existenciaAnterior)}</span>
                      <span aria-hidden="true"> → </span>
                      <span className="sr-only"> a </span>
                      <strong className="font-title text-neutral-black">{formatearNumero(a.existenciaNueva)}</strong>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block text-neutral-dark">{ETIQUETAS_MOTIVO[a.motivo]}</span>
                      <span className="block text-xs text-neutral-medium">
                        {ETIQUETAS_ORIGEN[a.origen]}
                        {a.nota !== null && ` · ${a.nota}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-dark">{a.usuario}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginador paginacion={lista.datos.paginacion} onCambiar={setPagina} />
        </>
      )}
    </section>
  );
};
