'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Eye,
  Power,
  Search,
  User,
  UserCheck,
  Users,
} from 'lucide-react';
import { Badge, Button, Input, Skeleton } from '@/core/components';
import type {
  ClienteResumen,
  TipoCuentaCliente,
} from '../../interfaces/clientes-admin.interface';
import { useClientesStore } from '../../store/clientesStore';
import { AdminPagination } from '../AdminPagination';
import { DesactivarClienteModal } from './DesactivarClienteModal';
import { FichaClienteModal } from './FichaClienteModal';

export const ClientesTable: React.FC = () => {
  const {
    clientes,
    total,
    pagina,
    limite,
    totalPaginas,
    cargando,
    error,
    filtroTipo,
    termino,
    fichaSeleccionada,
    cargarClientes,
    establecerTermino,
    establecerFiltroTipo,
    establecerPagina,
    limpiarFiltros,
    verFicha,
    cerrarFicha,
  } = useClientesStore();

  const [clienteADesactivar, setClienteADesactivar] = useState<ClienteResumen | null>(null);

  useEffect(() => {
    void cargarClientes();
  }, [cargarClientes]);

  return (
    <div className="space-y-6">
      {/* ==================================================================== */}
      {/* 1. BARRA SUPERIOR DE BÚSQUEDA Y FILTROS                              */}
      {/* ==================================================================== */}
      <div className="bg-neutral-white border border-neutral-light/70 rounded-card p-4 sm:p-5 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Input de Búsqueda */}
          <div className="flex-1 max-w-md">
            <Input
              id="buscar-clientes"
              type="text"
              value={termino}
              onChange={(e) => establecerTermino(e.target.value)}
              placeholder="Buscar por nombre, correo, NIT o documento..."
              aria-label="Buscar clientes"
              leftIcon={<Search className="w-4 h-4 text-neutral-medium" />}
            />
          </div>

          {/* Filtro por Tipo de Cuenta */}
          <div className="flex items-center gap-2.5 shrink-0">
            <select
              value={filtroTipo}
              onChange={(e) =>
                establecerFiltroTipo(
                  e.target.value as 'todos' | TipoCuentaCliente,
                )
              }
              aria-label="Filtrar por tipo de cliente"
              className="h-10 px-3 text-xs sm:text-sm font-sans bg-neutral-white border border-neutral-light rounded-btn focus:outline-none focus:ring-2 focus:ring-action/20 focus:border-action cursor-pointer text-neutral-dark"
            >
              <option value="todos">Todos los tipos</option>
              <option value="normal">Personas Naturales</option>
              <option value="empresa">Empresas / Corporativos</option>
            </select>

            {(termino || filtroTipo !== 'todos') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={limpiarFiltros}
                className="text-xs text-neutral-medium hover:text-danger min-h-[40px]"
              >
                Limpiar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. TABLA DE CLIENTES                                                 */}
      {/* ==================================================================== */}
      <div className="bg-neutral-white border border-neutral-light/70 rounded-card shadow-card overflow-hidden">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-neutral-light/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-action" />
            <h3 className="font-title font-bold text-base text-neutral-black">
              Directorio de Clientes
            </h3>
            <Badge variant="action">
              {total} clientes
            </Badge>
          </div>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="p-4 bg-danger/10 border-b border-danger/20 text-xs text-danger flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Contenido / Skeleton / Empty state */}
        {cargando ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : clientes.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-neutral-lightest flex items-center justify-center text-neutral-medium mb-3">
              <Users className="w-6 h-6" />
            </div>
            <p className="font-title font-semibold text-base text-neutral-black mb-1">
              No se encontraron clientes
            </p>
            <p className="font-sans text-xs text-neutral-medium max-w-sm mb-4">
              Intenta con un término diferente o restablece los filtros aplicados.
            </p>
            {(termino || filtroTipo !== 'todos') && (
              <Button variant="outline" size="sm" onClick={limpiarFiltros}>
                Restablecer Filtros
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-lightest border-b border-neutral-light text-[11px] font-title font-bold text-neutral-medium uppercase tracking-wider">
                  <th className="px-6 py-3.5">Cliente</th>
                  <th className="px-4 py-3.5">Tipo</th>
                  <th className="px-4 py-3.5">Teléfono</th>
                  <th className="px-4 py-3.5">Estado</th>
                  <th className="px-4 py-3.5">Registro</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-light/50 font-sans text-xs text-neutral-dark">
                {clientes.map((cli) => {
                  const esActivo = cli.estado === 'activo';
                  const esEmpresa = cli.tipo === 'empresa';

                  return (
                    <tr
                      key={cli.idUsuario}
                      className="hover:bg-neutral-lightest/60 transition-colors"
                    >
                      {/* Columna Cliente */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-title font-bold text-xs ${
                              esEmpresa
                                ? 'bg-corporate text-neutral-white'
                                : 'bg-subaction text-action'
                            }`}
                          >
                            {esEmpresa ? (
                              <Building2 className="w-4 h-4" />
                            ) : (
                              <User className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-title font-semibold text-xs text-neutral-black">
                              {cli.nombre}
                            </p>
                            <p className="text-[11px] text-neutral-medium">{cli.correo}</p>
                          </div>
                        </div>
                      </td>

                      {/* Columna Tipo */}
                      <td className="px-4 py-4">
                        <Badge variant="neutral">
                          {cli.tipo}
                        </Badge>
                      </td>

                      {/* Columna Teléfono */}
                      <td className="px-4 py-4 text-neutral-medium">
                        {cli.telefono || 'Sin teléfono'}
                      </td>

                      {/* Columna Estado */}
                      <td className="px-4 py-4">
                        {esActivo ? (
                          <Badge variant="success" icon={<UserCheck className="w-3 h-3" />}>
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="danger">
                            {cli.estado}
                          </Badge>
                        )}
                      </td>

                      {/* Columna Registro */}
                      <td className="px-4 py-4 text-neutral-medium text-[11px]">
                        {new Date(cli.fechaRegistro).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Columna Acciones */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Ver Ficha Completa */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void verFicha(cli.idUsuario)}
                            aria-label="Ver ficha del cliente"
                            className="p-1.5 min-h-[32px] text-action hover:bg-subaction"
                            title="Ver Ficha y Actividad Comercial"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {/* Suspender Cliente (Solo si está activo) */}
                          {esActivo && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setClienteADesactivar(cli)}
                              aria-label="Desactivar cliente"
                              className="p-1.5 min-h-[32px] text-danger hover:bg-danger/10"
                              title="Suspender Cuenta de Cliente"
                            >
                              <Power className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        <AdminPagination
          total={total}
          pagina={pagina}
          limite={limite}
          totalPaginas={totalPaginas}
          etiquetaItem="clientes"
          onCambiarPagina={establecerPagina}
        />
      </div>

      {/* Modales */}
      <FichaClienteModal
        cliente={fichaSeleccionada}
        isOpen={Boolean(fichaSeleccionada)}
        onClose={cerrarFicha}
      />

      <DesactivarClienteModal
        cliente={clienteADesactivar}
        isOpen={Boolean(clienteADesactivar)}
        onClose={() => setClienteADesactivar(null)}
      />
    </div>
  );
};
