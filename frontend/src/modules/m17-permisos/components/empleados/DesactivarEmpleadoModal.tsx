'use client';

import React, { useState } from 'react';
import { AlertTriangle, Clock, Power, ShieldAlert } from 'lucide-react';
import { Button, Checkbox, Modal } from '@/core/components';
import type { ResumenEmpleado } from '../../interfaces/empleados.interface';
import { useEmpleadosStore } from '../../store/empleadosStore';

export interface DesactivarEmpleadoModalProps {
  empleado: ResumenEmpleado | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DesactivarEmpleadoModal: React.FC<DesactivarEmpleadoModalProps> = ({
  empleado,
  isOpen,
  onClose,
}) => {
  const { desactivar, cargando } = useEmpleadosStore();
  const [confirmado, setConfirmado] = useState(false);

  if (!empleado) return null;

  const handleDesactivar = async () => {
    if (!confirmado) return;
    const ok = await desactivar(empleado.idUsuario);
    if (ok) {
      setConfirmado(false);
      onClose();
    }
  };

  const handleCerrar = () => {
    setConfirmado(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCerrar}
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-danger/10 border border-danger/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-danger" />
          </div>
          <div>
            <h3 className="font-title font-semibold text-lg text-neutral-black leading-snug">
              ¿Desactivar colaborador?
            </h3>
            <p className="font-sans text-xs text-neutral-medium">
              Estás a punto de suspender el acceso administrativo de este usuario (HU-ADM-04).
            </p>
          </div>
        </div>
      }
      size="md"
      showRainbowStrip
    >
      <div className="space-y-4 py-2">
        {/* Tarjeta de preview del empleado */}
        <div className="p-3.5 bg-neutral-lightest border border-neutral-light/70 rounded-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-corporate text-neutral-white font-title font-bold text-xs flex items-center justify-center shrink-0">
              {empleado.nombre.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-title font-semibold text-sm text-neutral-black">
                {empleado.nombre}
              </p>
              <p className="font-sans text-xs text-neutral-medium">{empleado.correo}</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-danger/10 text-danger border border-danger/20">
            ID #{empleado.idUsuario}
          </span>
        </div>

        {/* Métricas de impacto (estilo página 13 del mockup) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-neutral-white border border-neutral-light/60 rounded-card shadow-xs">
            <div className="flex items-center gap-1.5 text-danger mb-1">
              <Clock className="w-4 h-4 shrink-0" />
              <span className="font-title font-semibold text-xs">Sesión Activa</span>
            </div>
            <p className="font-title font-bold text-base text-neutral-black">
              0 ms
            </p>
            <p className="font-sans text-[11px] text-neutral-medium">
              Revocación inmediata de tokens en servidor
            </p>
          </div>

          <div className="p-3 bg-neutral-white border border-neutral-light/60 rounded-card shadow-xs">
            <div className="flex items-center gap-1.5 text-action mb-1">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span className="font-title font-semibold text-xs">Permisos</span>
            </div>
            <p className="font-title font-bold text-base text-neutral-black">
              {empleado.cantidadPermisos} permisos
            </p>
            <p className="font-sans text-[11px] text-neutral-medium">
              Congelados y retenidos para reactivación
            </p>
          </div>
        </div>

        {/* Cuadro de advertencia informativo */}
        <div className="p-3 bg-highlight/10 border border-highlight/30 rounded-card flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-highlight shrink-0 mt-0.5" />
          <p className="font-sans text-xs text-neutral-dark leading-relaxed">
            El colaborador no podrá iniciar sesión ni realizar ninguna operación en ningún módulo.
            Su historial de actividad y auditoría permanece intacto y la cuenta podrá reactivarse
            posteriormente si se requiere.
          </p>
        </div>

        {/* Checkbox de confirmación obligatoria (requisito de seguridad del mockup) */}
        <div className="pt-2">
          <Checkbox
            id="confirmar-desactivacion"
            label={
              <span className="font-medium text-xs text-neutral-dark">
                Entiendo el impacto de esta acción y deseo suspender el acceso de este colaborador.
              </span>
            }
            checked={confirmado}
            onChange={(e) => setConfirmado(e.target.checked)}
          />
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-light/50">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleCerrar}
            disabled={cargando}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="danger"
            size="md"
            disabled={!confirmado || cargando}
            isLoading={cargando}
            onClick={handleDesactivar}
            leftIcon={<Power className="w-4 h-4" />}
          >
            Desactivar Colaborador
          </Button>
        </div>
      </div>
    </Modal>
  );
};
