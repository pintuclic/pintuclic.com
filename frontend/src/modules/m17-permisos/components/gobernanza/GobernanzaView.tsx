'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Mail,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { Button, Input } from '@/core/components';
import {
  confirmarSustitucionCorreoDto,
  solicitarSustitucionCorreoDto,
  type ConfirmarSustitucionCorreoFormData,
  type SolicitarSustitucionCorreoFormData,
} from '../../dtos/gobernanza.dto';
import {
  confirmarSustitucionCorreo,
  solicitarSustitucionCorreo,
} from '../../services/gobernanza.service';

export const GobernanzaView: React.FC = () => {
  const [paso, setPaso] = useState<'solicitud' | 'confirmacion'>('solicitud');
  const [cargando, setCargando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Formulario Paso 1: Solicitar
  const formSolicitud = useForm<SolicitarSustitucionCorreoFormData>({
    resolver: zodResolver(solicitarSustitucionCorreoDto),
    defaultValues: { nuevoCorreo: '' },
  });

  // Formulario Paso 2: Confirmar
  const formConfirmacion = useForm<ConfirmarSustitucionCorreoFormData>({
    resolver: zodResolver(confirmarSustitucionCorreoDto),
    defaultValues: { tokenConfirmacion: '' },
  });

  const onSolicitar = async (data: SolicitarSustitucionCorreoFormData) => {
    setCargando(true);
    setMensajeError(null);
    setMensajeExito(null);
    try {
      const res = await solicitarSustitucionCorreo(data.nuevoCorreo);
      setMensajeExito(
        `${res.mensaje} Se ha remitido el token de seguridad a ${data.nuevoCorreo} y al buzón actual. Expira en ${res.expiracionMinutos} minutos.`,
      );
      setPaso('confirmacion');
      setCargando(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al solicitar sustitución de correo';
      setMensajeError(msg);
      setCargando(false);
    }
  };

  const onConfirmar = async (data: ConfirmarSustitucionCorreoFormData) => {
    setCargando(true);
    setMensajeError(null);
    setMensajeExito(null);
    try {
      const res = await confirmarSustitucionCorreo(data.tokenConfirmacion);
      setMensajeExito(
        `${res.mensaje} El correo maestro ahora es ${res.correoActualizado}. Todas las sesiones previas han sido revocadas.`,
      );
      setPaso('solicitud');
      formSolicitud.reset();
      formConfirmacion.reset();
      setCargando(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al validar el token de confirmación';
      setMensajeError(msg);
      setCargando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {mensajeExito && (
        <div className="p-4 bg-conversion/10 border border-conversion/30 rounded-card flex items-center gap-2.5 text-xs text-conversion font-medium">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {mensajeError && (
        <div className="p-4 bg-danger/10 border border-danger/30 rounded-card flex items-center gap-2.5 text-xs text-danger font-medium">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{mensajeError}</span>
        </div>
      )}

      {/* Grid de 2 Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Protocolo de Sustitución de Correo Maestro */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-neutral-white border border-neutral-light/70 rounded-card p-6 shadow-card">
            <div className="flex items-center gap-2.5 mb-2">
              <Mail className="w-5 h-5 text-action" />
              <h3 className="font-title font-bold text-base text-neutral-black">
                Sustitución de Correo Maestro (HU-ADM-07)
              </h3>
            </div>
            <p className="font-sans text-xs text-neutral-medium mb-6">
              Procedimiento formal para transferir la titularidad de la cuenta administradora
              principal. Requiere verificación mediante token criptográfico de 64 caracteres.
            </p>

            {paso === 'solicitud' ? (
              <form onSubmit={formSolicitud.handleSubmit(onSolicitar)} className="space-y-4">
                <Input
                  id="nuevo-correo-admin"
                  type="email"
                  label="Nuevo Correo Institucional del Administrador"
                  placeholder="nuevo-administrador@pintuclic.com"
                  required
                  error={formSolicitud.formState.errors.nuevoCorreo?.message}
                  {...formSolicitud.register('nuevoCorreo')}
                />

                <div className="p-3 bg-neutral-lightest border border-neutral-light rounded-btn text-xs text-neutral-medium flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-highlight shrink-0 mt-0.5" />
                  <span>
                    Al emitir la solicitud, se enviará una notificación con acuse de recibo a la
                    cuenta administradora actual y al nuevo correo para evitar apropiaciones indebidas.
                  </span>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="primary-action"
                    size="md"
                    isLoading={cargando}
                    leftIcon={<Mail className="w-4 h-4" />}
                  >
                    Generar Solicitud de Sustitución
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={formConfirmacion.handleSubmit(onConfirmar)} className="space-y-4">
                <Input
                  id="token-confirmacion-admin"
                  label="Token Criptográfico de Confirmación"
                  placeholder="Ingrese el token de confirmación recibido por correo..."
                  required
                  error={formConfirmacion.formState.errors.tokenConfirmacion?.message}
                  {...formConfirmacion.register('tokenConfirmacion')}
                />

                <div className="p-3 bg-conversion/10 border border-conversion/30 rounded-btn text-xs text-conversion-hover flex items-start gap-2">
                  <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    La confirmación actualizará inmediatamente el titular y revocará de forma
                    instantánea todas las sesiones activas asociadas.
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPaso('solicitud')}
                    disabled={cargando}
                  >
                    ← Volver a Ingresar Correo
                  </Button>

                  <Button
                    type="submit"
                    variant="primary-action"
                    size="md"
                    isLoading={cargando}
                    leftIcon={<UserCheck className="w-4 h-4" />}
                  >
                    Confirmar Sustitución
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Columna Derecha: Tarjeta de Principios de Gobernanza */}
        <div className="space-y-4">
          <div className="bg-neutral-white border border-neutral-light/70 rounded-card p-5 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-action" />
              <h4 className="font-title font-bold text-sm text-corporate">
                Reglas Inmutables de Gobernanza
              </h4>
            </div>

            <ul className="space-y-3 font-sans text-xs text-neutral-dark">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-action mt-1.5 shrink-0" />
                <span>
                  <strong>Indesactivable (ADR-007):</strong> La cuenta maestra no puede ser
                  desactivada ni suspendida por ningún usuario del sistema.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-action mt-1.5 shrink-0" />
                <span>
                  <strong>Autoridad Raíz Permanente:</strong> El administrador ostenta
                  autorización automática e incondicional sobre todos los módulos de Pintu Clic.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-action mt-1.5 shrink-0" />
                <span>
                  <strong>Auditoría Criptográfica:</strong> Toda solicitud de cambio de correo
                  genera un token irreversible y un registro de auditoría permanente.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
