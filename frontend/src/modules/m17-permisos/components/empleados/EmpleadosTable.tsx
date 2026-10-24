'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Edit2,
  KeyRound,
  Mail,
  Power,
  RotateCcw,
  Search,
  Shield,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { Badge, Button, Input, Skeleton } from '@/core/components';
import type { EstadoCuentaEmpleado, ResumenEmpleado } from '../../interfaces/empleados.interface';
import { useEmpleadosStore } from '../../store/empleadosStore';
import { AdminPagination } from '../AdminPagination';
import { CrearEmpleadoModal } from './CrearEmpleadoModal';
import { DesactivarEmpleadoModal } from './DesactivarEmpleadoModal';
import { EditarEmpleadoModal } from './EditarEmpleadoModal';
import { PermisosModal } from './PermisosModal';

export const EmpleadosTable: React.FC = () => {
  const {
    empleados,
    total,
    pagina,
    limite,
    totalPaginas,
    cargando,
    error,
    aviso,
    filtroEstado,
    busqueda,
    cargarEmpleados,
    establecerBusqueda,
    establecerFiltroEstado,
    establecerPagina,
    limpiarFiltros,
    reactivar,
    reenviarActivacion,
  } = useEmpleadosStore();

  // Estados de Modales
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [empleadoAEditar, setEmpleadoAEditar] = useState<ResumenEmpleado | null>(null);
  const [empleadoADesactivar, setEmpleadoADesactivar] = useState<ResumenEmpleado | null>(null);
  const [empleadoPermisos, setEmpleadoPermisos] = useState<ResumenEmpleado | null>(null);

  /**
   * El input escribe en un estado local y solo consulta al servidor 300 ms
   * después de la última tecla. Enviar una petición por pulsación saturaba la
   * API y dejaba la tabla a merced del orden en que llegaran las respuestas.
   */
  const [busquedaLocal, setBusquedaLocal] = useState(busqueda);

  useEffect(() => {
    if (busquedaLocal === busqueda) return;
    const temporizador = setTimeout(() => establecerBusqueda(busquedaLocal), 300);
    return () => clearTimeout(temporizador);
  }, [busquedaLocal, busqueda, establecerBusqueda]);

  const handleLimpiarFiltros = () => {
    setBusquedaLocal('');
    limpiarFiltros();
  };

  useEffect(() => {
    void cargarEmpleados();
  }, [cargarEmpleados]);

  const handleReenviarActivacion = async (empleado: ResumenEmpleado) => {
    if (confirm(`¿Enviar a ${empleado.correo} un enlace de activación nuevo? El anterior dejará de funcionar.`)) {
      await reenviarActivacion(empleado.idUsuario, empleado.correo);
    }
  };

  const handleReactivar = async (empleado: ResumenEmpleado) => {
    if (confirm(`¿Reactivar la cuenta de ${empleado.nombre}?`)) {
      await reactivar(empleado.idUsuario);
    }
  };

  return (
    <div className="space-y-6">
      {/* ==================================================================== */}
      {/* 1. BARRA SUPERIOR DE ACCIONES Y FILTROS (Mockup página 3)           */}
      {/* ==================================================================== */}
      <div className="bg-neutral-white border border-neutral-light/70 rounded-card p-4 sm:p-5 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Input de Búsqueda */}
          <div className="flex-1 max-w-md">
            <Input
              id="buscar-empleados"
              type="text"
              value={busquedaLocal}
              onChange={(e) => setBusquedaLocal(e.target.value)}
              placeholder="Buscar por nombre, documento o correo..."
              aria-label="Buscar por nombre, documento o correo"
              leftIcon={<Search className="w-4 h-4 text-neutral-medium" />}
            />
          </div>

          {/* Filtro de Estado + Botón Nuevo Colaborador */}
          <div className="flex items-center gap-2.5 shrink-0">
            <select
              value={filtroEstado || ''}
              onChange={(e) =>
                establecerFiltroEstado(
                  (e.target.value as EstadoCuentaEmpleado) || undefined,
                )
              }
              aria-label="Filtrar por estado"
              className="h-10 px-3 text-xs sm:text-sm font-sans bg-neutral-white border border-neutral-light rounded-btn focus:outline-none focus:ring-2 focus:ring-action/20 focus:border-action cursor-pointer text-neutral-dark"
            >
              <option value="">Todos los estados</option>
              <option value="activo">Solo Activos</option>
              <option value="inactivo">Solo Inactivos</option>
            </select>

            {(busqueda || filtroEstado) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLimpiarFiltros}
                className="text-xs text-neutral-medium hover:text-danger min-h-[40px]"
              >
                Limpiar
              </Button>
            )}

            <Button
              variant="primary-action"
              size="md"
              leftIcon={<UserPlus className="w-4 h-4" />}
              onClick={() => setModalCrearAbierto(true)}
              className="min-h-[40px]"
            >
              + Nuevo Colaborador
            </Button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. TABLA PRINCIPAL DE COLABORADORES                                  */}
      {/* ==================================================================== */}
      <div className="bg-neutral-white border border-neutral-light/70 rounded-card shadow-card overflow-hidden">
        {/* Cabecera del Listado */}
        <div className="px-6 py-4 border-b border-neutral-light/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-action" />
            <h3 className="font-title font-bold text-base text-neutral-black">
              Colaboradores Registrados
            </h3>
            <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-subaction text-action">
              {total} en total
            </span>
          </div>
        </div>

        {aviso && (
          <div role="status" className="p-4 bg-conversion/10 border-b border-conversion/20 text-xs text-conversion flex items-center gap-2 font-medium">
            <Mail className="w-4 h-4 shrink-0" />
            <span>{aviso}</span>
          </div>
        )}

        {/* Mensaje de Error */}
        {error && (
          <div className="p-4 bg-danger/10 border-b border-danger/20 text-xs text-danger flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Estados de Carga / Tabla */}
        {cargando ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : empleados.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-neutral-lightest flex items-center justify-center text-neutral-medium mb-3">
              <Users className="w-6 h-6" />
            </div>
            <p className="font-title font-semibold text-base text-neutral-black mb-1">
              No se encontraron colaboradores
            </p>
            <p className="font-sans text-xs text-neutral-medium max-w-sm mb-4">
              {busqueda || filtroEstado
                ? 'No hay registros que coincidan con los criterios de búsqueda aplicados.'
                : 'Aún no has registrado colaboradores en la plataforma.'}
            </p>
            {busqueda || filtroEstado ? (
              <Button variant="outline" size="sm" onClick={handleLimpiarFiltros}>
                Restablecer Filtros
              </Button>
            ) : (
              <Button
                variant="primary-action"
                size="sm"
                leftIcon={<UserPlus className="w-4 h-4" />}
                onClick={() => setModalCrearAbierto(true)}
              >
                Crear Primer Colaborador
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-lightest border-b border-neutral-light text-[11px] font-title font-bold text-neutral-medium uppercase tracking-wider">
                  <th className="px-6 py-3.5">Colaborador</th>
                  <th className="px-4 py-3.5">Teléfono</th>
                  <th className="px-4 py-3.5">Estado</th>
                  <th className="px-4 py-3.5">Permisos Atómicos</th>
                  <th className="px-4 py-3.5">Último Acceso</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-light/50 font-sans text-xs text-neutral-dark">
                {empleados.map((emp) => {
                  const esActivo = emp.estado === 'activo';

                  return (
                    <tr
                      key={emp.idUsuario}
                      className="hover:bg-neutral-lightest/60 transition-colors"
                    >
                      {/* Columna Colaborador */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-corporate text-neutral-white font-title font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {emp.nombre.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-title font-semibold text-xs text-neutral-black">
                              {emp.nombre}
                            </p>
                            <p className="text-[11px] text-neutral-medium">{emp.correo}</p>
                          </div>
                        </div>
                      </td>

                      {/* Columna Teléfono */}
                      <td className="px-4 py-4 text-neutral-medium">
                        {emp.telefono || 'Sin teléfono'}
                      </td>

                      {/* Columna Estado */}
                      <td className="px-4 py-4">
                        {esActivo ? (
                          <Badge variant="success" icon={<UserCheck className="w-3 h-3" />}>
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="danger">
                            Inactivo
                          </Badge>
                        )}
                      </td>

                      {/* Columna Permisos */}
                      <td className="px-4 py-4">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEmpleadoPermisos(emp)}
                          leftIcon={<Shield className="w-3.5 h-3.5" />}
                          className="text-xs text-action hover:bg-subaction min-h-[32px]"
                          title="Click para ver o editar matriz de permisos"
                        >
                          {emp.cantidadPermisos} permisos
                        </Button>
                      </td>

                      {/* Columna Último Acceso */}
                      <td className="px-4 py-4 text-neutral-medium text-[11px]">
                        {emp.fechaUltimoAcceso
                          ? new Date(emp.fechaUltimoAcceso).toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Primer acceso pendiente'}
                      </td>

                      {/* Columna Acciones */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botón Asignar Permisos */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEmpleadoPermisos(emp)}
                            aria-label="Gestionar permisos"
                            className="p-1.5 min-h-[32px] text-action hover:bg-subaction"
                            title="Gestionar Permisos Atómicos"
                          >
                            <KeyRound className="w-4 h-4" />
                          </Button>

                          {/* Botón Editar Datos */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEmpleadoAEditar(emp)}
                            aria-label="Editar colaborador"
                            className="p-1.5 min-h-[32px] text-neutral-dark hover:bg-neutral-light/50"
                            title="Editar Datos Básicos"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>

                          {/* HU-ADM-01: reenviar el enlace a quien aún no definió su contraseña */}
                          {esActivo && emp.primerAccesoPendiente && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReenviarActivacion(emp)}
                              aria-label="Reenviar enlace de activación"
                              className="p-1.5 min-h-[32px] text-action hover:bg-subaction"
                              title="Reenviar enlace de activación"
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                          )}

                          {/* Botón Desactivar / Reactivar */}
                          {esActivo ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEmpleadoADesactivar(emp)}
                              aria-label="Desactivar colaborador"
                              className="p-1.5 min-h-[32px] text-danger hover:bg-danger/10"
                              title="Desactivar Cuenta (HU-ADM-04)"
                            >
                              <Power className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReactivar(emp)}
                              aria-label="Reactivar colaborador"
                              className="p-1.5 min-h-[32px] text-conversion hover:bg-conversion/10"
                              title="Reactivar Cuenta"
                            >
                              <RotateCcw className="w-4 h-4" />
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

        {/* Paginación Inferior Oficial */}
        <AdminPagination
          total={total}
          pagina={pagina}
          limite={limite}
          totalPaginas={totalPaginas}
          etiquetaItem="colaboradores"
          onCambiarPagina={establecerPagina}
        />
      </div>

      {/* ==================================================================== */}
      {/* 3. MODALES ASOCIADOS                                                 */}
      {/* ==================================================================== */}
      <CrearEmpleadoModal
        isOpen={modalCrearAbierto}
        onClose={() => setModalCrearAbierto(false)}
      />

      <EditarEmpleadoModal
        empleado={empleadoAEditar}
        isOpen={Boolean(empleadoAEditar)}
        onClose={() => setEmpleadoAEditar(null)}
      />

      <DesactivarEmpleadoModal
        empleado={empleadoADesactivar}
        isOpen={Boolean(empleadoADesactivar)}
        onClose={() => setEmpleadoADesactivar(null)}
      />

      <PermisosModal
        empleado={empleadoPermisos}
        isOpen={Boolean(empleadoPermisos)}
        onClose={() => setEmpleadoPermisos(null)}
      />
    </div>
  );
};
