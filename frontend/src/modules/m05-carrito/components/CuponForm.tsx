'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '@/core/components';
import type { ResultadoCupon } from '@/modules/m06-precios/dtos/m06-precios.dto';
import { cuponFormSchema, type CuponFormData } from '../dtos/formularios.dto';
import { textoCupon } from '../services/textos-carrito';

export interface CuponFormProps {
  codigoActual: string | null;
  resultado: ResultadoCupon | null;
  ocupado: boolean;
  onAplicar: (codigo: string | null) => void;
}

/** Campo "Código de descuento" (C8): el resultado lo decide M06 y aquí solo se muestra. */
export function CuponForm({ codigoActual, resultado, ocupado, onAplicar }: CuponFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CuponFormData>({ resolver: zodResolver(cuponFormSchema), defaultValues: { codigo: '' } });

  if (codigoActual !== null) {
    const aplicado = resultado?.aplicado === true;
    return (
      <div className="space-y-2">
        <p className="text-sm font-semibold text-neutral-dark">Código de descuento</p>
        <div className="flex items-center justify-between gap-2 rounded-card border border-neutral-light px-3 py-2">
          <span className="font-semibold text-neutral-black">{resultado?.codigo ?? codigoActual}</span>
          <Button
            variant="ghost"
            size="sm"
            disabled={ocupado}
            onClick={() => {
              reset({ codigo: '' });
              onAplicar(null);
            }}
          >
            Quitar código
          </Button>
        </div>
        {resultado !== null && (
          <p className={`text-sm ${aplicado ? 'text-conversion-hover' : 'text-danger-hover'}`} role="status">
            {aplicado ? 'Código aplicado.' : resultado.motivoRechazo !== null && textoCupon(resultado.motivoRechazo, resultado.montoMinimo)}
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      noValidate
      className="flex items-start gap-2"
      onSubmit={(e) => void handleSubmit((datos) => onAplicar(datos.codigo))(e)}
    >
      <div className="flex-1">
        <Input
          id="codigo-descuento"
          label="Código de descuento"
          placeholder="Escribe tu código"
          autoComplete="off"
          {...register('codigo')}
          {...(errors.codigo?.message === undefined ? {} : { error: errors.codigo.message })}
        />
      </div>
      <Button type="submit" variant="outline" className="mt-7" isLoading={ocupado}>
        Aplicar
      </Button>
    </form>
  );
}
