'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  FolderTree,
  Lock,
  Save,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Users2,
} from 'lucide-react';
import { Badge, Button, Checkbox, Modal, Skeleton } from '@/core/components';
import type { CodigoPermiso } from '../../dtos/permisos.dto';
import type { ResumenEmpleado } from '../../interfaces/empleados.interface';
import type { ItemPermisoCatalogo } from '../../interfaces/permisos.interface';
import { actualizarPermisos, obtenerMatrizPermisos } from '../../services/permisos.service';
import { mensajeDeError } from '../../services/mensaje-error';
import { useEmpleadosStore } from '../../store/empleadosStore';

export interface PermisosModalProps {
  empleado: ResumenEmpleado | null;
  isOpen: boolean;
  onClose: () => void;
}

interface AreaInfo {
  titulo: string;
  descripcion: string;
  icon: React.ReactNode;
}

const AREAS_METADATA: Record<string, AreaInfo> = {
  catalogo: {
    titulo: 'Catálogo de Productos',
    descripcion: 'Gestión de productos, categorías, imágenes y precios base',
    icon: <FolderTree className="w-4 h-4 text-action" />,
  },
  ventas: {
    titulo: 'Ventas y Pedidos',
    descripcion: 'Consulta y procesamiento de órdenes y exportaciones comerciales',
    icon: <ShoppingCart className="w-4 h-4 text-conversion" />,
  },
  personal: {
    titulo: 'Gestión de Personal',
    descripcion: 'Control de cuentas de colaboradores y administración de personal',
    icon: <Users2 className="w-4 h-4 text-highlight" />,
  },
  seguridad: {
    titulo: 'Seguridad y Privacidad',
    descripcion: 'Matriz de permisos, políticas de sesión y aviso de privacidad',
    icon: <Lock className="w-4 h-4 text-danger" />,
  },
  configuracion: {
    titulo: 'Configuración del Sistema',
    descripcion: 'Parámetros globales operativos, impuestos y costos de envío',
    icon: <Settings2 className="w-4 h-4 text-corporate" />,
  },
  estadisticas: {
    titulo: 'Reportes y Analítica',
    descripcion: 'Métricas de rendimiento, KPIs y visualizaciones del negocio',
    icon: <BarChart3 className="w-4 h-4 text-action" />,
  },
};

export const PermisosModal: React.FC<PermisosModalProps> = ({ empleado, isOpen, onClose }) => {
  const { cargarEmpleados } = useEmpleadosStore();
  const [permisos, setPermisos] = useState<ItemPermisoCatalogo[]>([]);
  const [seleccionados, setSeleccionados] = useState<Set<CodigoPermiso>>(new Set());
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!empleado || !isOpen) return;

    let montado = true;
    setCargando(true);
    setError(null);
    setMensajeExito(null);

    void obtenerMatrizPermisos(empleado.idUsuario)
      .then((res) => {
        if (!montado) return;
        setPermisos(res.permisos);
        const iniciales = new Set<CodigoPermiso>(
          res.permisos.filter((p) => p.concedido).map((p) => p.codigo),
        );
        setSeleccionados(iniciales);
        setCargando(false);
      })
      .catch((err: unknown) => {
        if (!montado) return;
        const msg = mensajeDeError(err, 'Error al cargar la matriz de permisos');
        setError(msg);
        setCargando(false);
      });

    return () => {
      montado = false;
    };
  }, [empleado, isOpen]);

  if (!empleado) return null;

  // Manejo de cascadas en frontend según ADR-008
  const togglePermiso = (codigo: CodigoPermiso) => {
    const nuevos = new Set(seleccionados);

    if (nuevos.has(codigo)) {
      // Desmarcar
      nuevos.delete(codigo);

      // Si se desmarca un permiso de visualización base, revocar cascada
      if (codigo === 'catalogo.ver') {
        nuevos.delete('catalogo.crear');
        nuevos.delete('catalogo.editar');
        nuevos.delete('catalogo.eliminar');
      }
      if (codigo === 'ventas.ver') {
        nuevos.delete('ventas.gestionar');
        nuevos.delete('ventas.exportar');
      }
      if (codigo === 'personal.ver') {
        nuevos.delete('personal.editar');
        nuevos.delete('personal.desactivar');
      }
      if (codigo === 'configuracion.ver') {
        nuevos.delete('configuracion.editar');
      }
    } else {
      // Marcar
      nuevos.add(codigo);

      // Si se marca un permiso operativo, conceder automáticamente el permiso base
      if (
        codigo === 'catalogo.crear' ||
        codigo === 'catalogo.editar' ||
        codigo === 'catalogo.eliminar'
      ) {
        nuevos.add('catalogo.ver');
      }
      if (codigo === 'ventas.gestionar' || codigo === 'ventas.exportar') {
        nuevos.add('ventas.ver');
      }
      if (codigo === 'personal.editar' || codigo === 'personal.desactivar') {
        nuevos.add('personal.ver');
      }
      if (codigo === 'configuracion.editar') {
        nuevos.add('configuracion.ver');
      }
    }

    setSeleccionados(nuevos);
  };

  const handleGuardar = async () => {
    setGuardando(true);
    setError(null);
    setMensajeExito(null);

    try {
      const arrayPermisos = Array.from(seleccionados);
      const resultado = await actualizarPermisos(empleado.idUsuario, arrayPermisos);
      setMensajeExito(
        `Permisos actualizados con éxito. Total activos: ${resultado.totalPermisosActivos}.`,
      );
      setGuardando(false);
      await cargarEmpleados();
    } catch (err: unknown) {
      const msg = mensajeDeError(err, 'Error al guardar los permisos');
      setError(msg);
      setGuardando(false);
    }
  };

  // Agrupar permisos por área
  const permisosPorArea: Record<string, ItemPermisoCatalogo[]> = {};
  for (const item of permisos) {
    const lista = permisosPorArea[item.area];
    if (lista) {
      lista.push(item);
    } else {
      permisosPorArea[item.area] = [item];
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-action" />
          <span>Matriz Atómica de Permisos Individuales</span>
        </div>
      }
      subtitle={
        <span>
          Asignación granular para <strong>{empleado.nombre}</strong> ({empleado.correo})
        </span>
      }
      size="xl"
      showRainbowStrip
    >
      <div className="space-y-6 py-2">
        {/* Banner informativo de política institucional */}
        <div className="p-3.5 bg-subaction/30 border border-subaction rounded-card flex items-start gap-3 text-xs text-neutral-dark">
          <ShieldCheck className="w-5 h-5 text-action shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-title font-semibold text-corporate">
              Principio de Privilegio Mínimo (M17 / HU-ADM-02)
            </p>
            <p className="font-sans text-neutral-medium">
              Pintu Clic no utiliza roles estáticos heredados. Cada colaborador recibe
              exclusivamente los permisos atómicos necesarios para su labor. Toda modificación es
              auditada y verificada en tiempo real en cada petición al servidor.
            </p>
          </div>
        </div>

        {/* Mensajes de éxito o error */}
        {mensajeExito && (
          <div className="p-3 bg-conversion/10 border border-conversion/30 rounded-btn flex items-center gap-2 text-xs text-conversion font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{mensajeExito}</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-danger/10 border border-danger/30 rounded-btn flex items-center gap-2 text-xs text-danger font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Lista de permisos por Área */}
        {cargando ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(permisosPorArea).map(([area, items]) => {
              const meta = AREAS_METADATA[area] || {
                titulo: area.toUpperCase(),
                descripcion: 'Permisos del área funcional',
                icon: <Settings2 className="w-4 h-4 text-action" />,
              };

              const activosEnArea = items.filter((p) => seleccionados.has(p.codigo)).length;

              return (
                <div
                  key={area}
                  className="bg-neutral-white border border-neutral-light/70 rounded-card p-4 shadow-xs"
                >
                  {/* Encabezado del área */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-light/50">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-neutral-lightest rounded-btn">{meta.icon}</div>
                      <div>
                        <h4 className="font-title font-semibold text-sm text-neutral-black">
                          {meta.titulo}
                        </h4>
                        <p className="font-sans text-xs text-neutral-medium">
                          {meta.descripcion}
                        </p>
                      </div>
                    </div>
                    <Badge variant={activosEnArea > 0 ? 'action' : 'neutral'}>
                      {activosEnArea} de {items.length} activos
                    </Badge>
                  </div>

                  {/* Grid de permisos atómicos */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {items.map((item) => {
                      const estaMarcado = seleccionados.has(item.codigo);

                      return (
                        <label
                          key={item.codigo}
                          htmlFor={`perm-${item.codigo}`}
                          className={`
                            p-3 rounded-btn border transition-all cursor-pointer select-none flex items-start gap-2.5
                            ${
                              estaMarcado
                                ? 'bg-subaction/30 border-action/60 shadow-xs'
                                : 'bg-neutral-white border-neutral-light hover:border-action/40 hover:bg-neutral-lightest/40'
                            }
                          `}
                        >
                          <Checkbox
                            id={`perm-${item.codigo}`}
                            checked={estaMarcado}
                            onChange={() => togglePermiso(item.codigo)}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <span className="font-mono text-xs font-semibold text-corporate block">
                              {item.codigo}
                            </span>
                            <span className="font-sans text-[11px] text-neutral-medium leading-tight block mt-0.5">
                              {item.descripcion || 'Sin descripción detallada'}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer del Modal */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-light/60">
          <div className="text-xs text-neutral-medium">
            <span className="font-semibold text-neutral-dark">{seleccionados.size}</span> permisos
            seleccionados de un total de {permisos.length}
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={guardando}
            >
              Cerrar
            </Button>

            <Button
              type="button"
              variant="primary-action"
              size="md"
              onClick={handleGuardar}
              isLoading={guardando}
              disabled={cargando}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Guardar Permisos
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
