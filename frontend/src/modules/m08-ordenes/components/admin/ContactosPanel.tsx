'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Select } from '@/core/components';
import type { ContactoOrden } from '../../dtos/m08-ordenes.dto';
import { contactoFormSchema, type ContactoForm } from '../../dtos/formularios.dto';
import { aContacto } from '../../services/formularios';
import { formatearFechaHora } from '../../services/presentacion';

const OPCIONES_MEDIO = [
  { value: 'correo', label: 'Correo' },
  { value: 'telefono', label: 'Teléfono' },
];

export interface ContactosPanelProps {
  contactos: ReadonlyArray<ContactoOrden>;
  operando: boolean;
  onRegistrar: (contacto: ReturnType<typeof aContacto>) => Promise<boolean>;
}

/**
 * HU-ORD-09-02 · Constancia de que se contactó al cliente desde el pedido. Registrar el contacto no
 * envía ningún mensaje: el empleado usa el enlace de correo o de teléfono del cliente y lo deja anotado.
 */
export function ContactosPanel({ contactos, operando, onRegistrar }: ContactosPanelProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactoForm>({
    resolver: zodResolver(contactoFormSchema),
    defaultValues: { medio: 'telefono', detalle: '' },
  });

  return (
    <div className="space-y-4">
      {contactos.length === 0 ? (
        <p className="text-sm text-neutral-medium">Aún no se ha registrado ningún contacto.</p>
      ) : (
        <ul className="space-y-2 text-sm text-neutral-dark">
          {contactos.map((c) => (
            <li key={c.idContacto}>
              <strong>{c.medio === 'correo' ? 'Correo' : 'Teléfono'}</strong> · {c.autor} · {formatearFechaHora(c.fecha)}
              {c.detalle ? <span className="block text-xs text-neutral-medium">{c.detalle}</span> : null}
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={handleSubmit(async (valores) => {
          if (await onRegistrar(aContacto(valores))) reset({ medio: valores.medio, detalle: '' });
        })}
        className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end"
      >
        <Select label="Medio" options={OPCIONES_MEDIO} error={errors.medio?.message} {...register('medio')} />
        <Input label="Detalle (opcional)" error={errors.detalle?.message} {...register('detalle')} />
        <Button type="submit" variant="outline" isLoading={operando}>
          Registrar contacto
        </Button>
      </form>
    </div>
  );
}
