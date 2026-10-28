'use client';

import React, { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Clock,
  Filter,
  RotateCcw,
  Search,
  CheckCircle2,
  XCircle,
  FileCheck,
  AlertCircle,
} from 'lucide-react';
import {
  AdminPageHeader,
  Alert,
  Button,
  ButtonLink,
  Input,
  Select,
  Skeleton,
} from '@/core/components';
import {
  listarGestion,
  obtenerResumenGestion,
} from '../../services/postventa-api';
import {
  ETIQUETA_ESTADO_POSTVENTA,
  ETIQUETA_TIPO_POSTVENTA,
  formatearFecha,
  formatearMoneda,
} from '../../services/presentacion';
import { EstadoPostventaBadge } from '../EstadoPostventaBadge';
import {
  ESTADOS_POSTVENTA,
  TIPOS_POSTVENTA,
  type EstadoPostventa,
  type TipoPostventa,
  type SolicitudPostventaResumen,
} from '../../dtos/m11-postventa.dto';

const OPCIONES_ESTADO = [
  { value: '', label: 'Todos los estados' },
  ...ESTADOS_POSTVENTA.map((e) => ({
    value: e,
    label: ETIQUETA_ESTADO_POSTVENTA[e],
  })),
];

const OPCIONES_TIPO = [
  { value: '', label: 'Todos los tipos' },
  ...TIPOS_POSTVENTA.map((t) => ({
    value: t,
    label: ETIQUETA_TIPO_POSTVENTA[t],
  })),
];

export function BandejaPostventaView() {
  const [items, setItems] = useState<SolicitudPostventaResumen[]>([]);
  const [resumen, setResumen] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [codigoFiltro, setCodigoFiltro] = useState('');
  const [codigoOrdenFiltro, setCodigoOrdenFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('');
  const [tipoFiltro, setTipoFiltro] = useState<string>('');
  const [, startTransition] = useTransition();

  const cargarDatos = () => {
    setCargando(true);
    setError(null);

    Promise.all([
      listarGestion({
        codigo: codigoFiltro.trim() || undefined,
        codigoOrden: codigoOrdenFiltro.trim() || undefined,
        estado: (estadoFiltro as EstadoPostventa) || undefined,
        tipo: (tipoFiltro as TipoPostventa) || undefined,
      }),
      obtenerResumenGestion(),
    ])
      .then(([listaRes, resumenRes]) => {
        setItems(listaRes.items);
        const conteos: Record<string, number> = {};
        resumenRes.forEach((r) => {
          conteos[r.estado] = r.cantidad;
        });
        setResumen(conteos);
        setCargando(false);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'No pudimos consultar la bandeja de postventa'
        );
        setCargando(false);
      });
  };

  useEffect(() => {
    cargarDatos();
  }, [estadoFiltro, tipoFiltro]);

  const manejarBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      cargarDatos();
    });
  };

  const limpiarFiltros = () => {
    setCodigoFiltro('');
    setCodigoOrdenFiltro('');
    setEstadoFiltro('');
    setTipoFiltro('');
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Postventa y Devoluciones"
        subtitle="Gestione solicitudes de retracto legal, garantías de producto y cancelaciones con liquidación de reembolsos."
      />

      {error && (
        <Alert variant="error" title="Error al cargar bandeja">
          {error}
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {ESTADOS_POSTVENTA.map((estado) => {
          const cantidad = resumen[estado] ?? 0;
          const esActivo = estadoFiltro === estado;

          return (
            <button
              key={estado}
              type="button"
              onClick={() => setEstadoFiltro(esActivo ? '' : estado)}
              className={`p-3 rounded-card text-left transition-all border ${
                esActivo
                  ? 'bg-neutral-white border-primary-500 shadow-md ring-2 ring-primary-200'
                  : 'bg-neutral-white border-neutral-light hover:border-neutral-medium shadow-card'
              }`}
            >
              <div className="text-xs font-semibold text-neutral-medium uppercase tracking-wider">
                {ETIQUETA_ESTADO_POSTVENTA[estado]}
              </div>
              <div className="text-2xl font-bold text-neutral-black mt-1">
                {cantidad}
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters Form */}
      <form
        onSubmit={manejarBuscar}
        className="rounded-card bg-neutral-white p-4 shadow-card space-y-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            label="Código solicitud"
            placeholder="Ej. DEV-2026-00001"
            value={codigoFiltro}
            onChange={(e) => setCodigoFiltro(e.target.value)}
          />
          <Input
            label="Código pedido"
            placeholder="Ej. PC-2026-00010"
            value={codigoOrdenFiltro}
            onChange={(e) => setCodigoOrdenFiltro(e.target.value)}
          />
          <Select
            label="Estado"
            options={OPCIONES_ESTADO}
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
          />
          <Select
            label="Tipo"
            options={OPCIONES_TIPO}
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={limpiarFiltros}>
            Limpiar filtros
          </Button>
          <Button
            type="submit"
            variant="primary-action"
            size="sm"
            leftIcon={<Search className="h-4 w-4" />}
          >
            Buscar
          </Button>
        </div>
      </form>

      {/* Content Table */}
      <div className="rounded-card bg-neutral-white shadow-card overflow-hidden">
        {cargando && (
          <div className="p-4 space-y-3" aria-busy="true">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {!cargando && items.length === 0 && (
          <div className="p-8 text-center text-neutral-medium text-sm">
            No se encontraron solicitudes de postventa con los filtros indicados.
          </div>
        )}

        {!cargando && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-light bg-neutral-lightest text-xs font-bold text-neutral-dark uppercase tracking-wider">
                  <th className="py-3 px-4">Solicitud</th>
                  <th className="py-3 px-4">Pedido</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4 text-right">Reembolso</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-light">
                {items.map((i) => (
                  <tr
                    key={i.idSolicitud}
                    className="hover:bg-neutral-lightest/60 transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-neutral-black">
                      {i.codigo}
                    </td>
                    <td className="py-3 px-4 text-primary-600 font-medium">
                      #{i.codigoOrden}
                    </td>
                    <td className="py-3 px-4 text-neutral-dark">
                      {i.nombreCliente}
                    </td>
                    <td className="py-3 px-4 text-neutral-medium text-xs">
                      {ETIQUETA_TIPO_POSTVENTA[i.tipo]}
                    </td>
                    <td className="py-3 px-4 text-neutral-medium text-xs">
                      {formatearFecha(i.fechaSolicitud)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-neutral-black">
                      {formatearMoneda(i.totalReembolso)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <EstadoPostventaBadge estado={i.estado} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <ButtonLink
                        href={`/admin/postventa/${i.codigo}`}
                        variant="outline"
                        size="sm"
                      >
                        Gestionar
                      </ButtonLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
