'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Mail,
  RefreshCw,
  Save,
  Shield,
  ShoppingBag,
} from 'lucide-react';
import { Badge, Button, Input, Modal, Skeleton } from '@/core/components';
import {
  type ClaveParametro,
  editarParametroFormSchema,
  type EditarParametroFormData,
  validarValorParametro,
} from '../../dtos/configuracion.dto';
import type {
  AreaParametro,
  ParametroConfiguracion,
} from '../../interfaces/configuracion.interface';
import { useConfiguracionStore } from '../../store/configuracionStore';

export const ConfiguracionView: React.FC = () => {
  const {
    parametros,
    areaActiva,
    cargando,
    actualizando,
    error,
    exitoMensaje,
    cargarParametros,
    establecerAreaActiva,
    guardarParametro,
    limpiarMensajes,
  } = useConfiguracionStore();

  const [parametroEditando, setParametroEditando] = useState<ParametroConfiguracion | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: { errors },
  } = useForm<EditarParametroFormData>({
    resolver: zodResolver(editarParametroFormSchema),
    defaultValues: { valor: '' },
  });

  useEffect(() => {
    void cargarParametros();
  }, [cargarParametros]);

  const abrirEdicion = (param: ParametroConfiguracion) => {
    setParametroEditando(param);
    reset({ valor: String(param.valor) });
  };

  const onSubmit = async (data: EditarParametroFormData) => {
    if (!parametroEditando) return;

    const validacion = validarValorParametro(parametroEditando, data.valor);
    if (!validacion.valido) {
      setFormError('valor', { message: validacion.error });
      return;
    }

    const ok = await guardarParametro(parametroEditando.clave as ClaveParametro, validacion.valor);
    if (ok) {
      setParametroEditando(null);
    }
  };

  const areas: { id: AreaParametro | 'todas'; label: string; icon: React.ReactNode }[] = [
    { id: 'todas', label: 'Todos (10)', icon: <RefreshCw className="w-4 h-4" /> },
    { id: 'autenticacion', label: 'Autenticación (6)', icon: <Shield className="w-4 h-4 text-action" /> },
    { id: 'comunicaciones', label: 'Comunicaciones (1)', icon: <Mail className="w-4 h-4 text-conversion" /> },
    { id: 'comercial', label: 'Comercial (3)', icon: <ShoppingBag className="w-4 h-4 text-highlight" /> },
  ];

  const parametrosFiltrados =
    areaActiva === 'todas' ? parametros : parametros.filter((p) => p.area === areaActiva);

  return (
    <div className="space-y-6">
      {/* ==================================================================== */}
      {/* 1. CABECERA Y SELECTOR DE ÁREAS                                      */}
      {/* ==================================================================== */}
      <div className="bg-neutral-white border border-neutral-light/70 rounded-card p-5 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
          {areas.map((area) => {
            const activa = areaActiva === area.id;
            return (
              <Button
                key={area.id}
                type="button"
                variant={activa ? 'primary-action' : 'outline'}
                size="sm"
                onClick={() => {
                  limpiarMensajes();
                  establecerAreaActiva(area.id);
                }}
                leftIcon={area.icon}
                className="shrink-0 text-xs"
              >
                {area.label}
              </Button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void cargarParametros()}
          isLoading={cargando}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          className="text-xs"
        >
          Recargar Catálogo
        </Button>
      </div>

      {/* Alertas globales de éxito o error */}
      {exitoMensaje && (
        <div className="p-3.5 bg-conversion/10 border border-conversion/30 rounded-card flex items-center justify-between text-xs text-conversion font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{exitoMensaje}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={limpiarMensajes}
            aria-label="Cerrar mensaje de éxito"
            className="text-xs text-conversion hover:bg-conversion/10 p-1"
          >
            Cerrar
          </Button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-danger/10 border border-danger/30 rounded-card flex items-center justify-between text-xs text-danger font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={limpiarMensajes}
            aria-label="Cerrar mensaje de error"
            className="text-xs text-danger hover:bg-danger/10 p-1"
          >
            Cerrar
          </Button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. GRID DE PARÁMETROS DEL SISTEMA                                    */}
      {/* ==================================================================== */}
      {cargando ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {parametrosFiltrados.map((param) => (
            <div
              key={param.clave}
              className="bg-neutral-white border border-neutral-light/70 rounded-card p-5 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-corporate">
                    {param.clave}
                  </span>
                  <Badge variant="action">{param.area}</Badge>
                </div>

                <p className="font-sans text-xs text-neutral-medium mb-4 leading-relaxed">
                  {param.descripcion}
                </p>
              </div>

              <div className="pt-3 border-t border-neutral-light/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-title font-bold text-neutral-medium block">
                    Valor Actual
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-title font-bold text-xl text-neutral-black">
                      {String(param.valor)}
                    </span>
                    {param.tipoDato === 'numero' && (
                      <span className="font-sans text-[11px] text-neutral-medium">
                        (min: {param.rangoMinimo ?? 0} | max: {param.rangoMaximo ?? '∞'})
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => abrirEdicion(param)}
                  leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                  className="text-xs min-h-[36px]"
                >
                  Modificar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. MODAL DE EDICIÓN DE PARÁMETRO                                     */}
      {/* ==================================================================== */}
      <Modal
        isOpen={Boolean(parametroEditando)}
        onClose={() => setParametroEditando(null)}
        title={
          <span className="flex items-center gap-2 text-corporate">
            <Edit3 className="w-5 h-5 text-action" /> Modificar Parámetro Global
          </span>
        }
        subtitle={parametroEditando?.clave}
        size="md"
        showRainbowStrip
      >
        {parametroEditando && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="p-3 bg-neutral-lightest border border-neutral-light rounded-btn">
              <p className="font-sans text-xs text-neutral-dark">
                {parametroEditando.descripcion}
              </p>
              <div className="mt-2 text-[11px] text-neutral-medium flex items-center justify-between">
                <span>Tipo: <strong>{parametroEditando.tipoDato}</strong></span>
                <span>Valor por defecto: <strong>{String(parametroEditando.valorPorDefecto)}</strong></span>
              </div>
            </div>

            <div>
              <Input
                id="input-parametro"
                label="Nuevo Valor"
                error={errors.valor?.message}
                helperText={
                  parametroEditando.tipoDato === 'numero'
                    ? `Rango permitido: ${parametroEditando.rangoMinimo ?? 0} a ${parametroEditando.rangoMaximo ?? 'ilimitado'}`
                    : undefined
                }
                {...register('valor')}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-light/50">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setParametroEditando(null)}
                disabled={actualizando}
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                variant="primary-action"
                size="md"
                isLoading={actualizando}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Guardar Parámetro
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
