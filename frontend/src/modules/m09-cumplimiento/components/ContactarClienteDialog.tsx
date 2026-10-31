'use client';

import { Mail, Phone } from 'lucide-react';
import { ButtonLink, Modal } from '@/core/components';

export type MedioContacto = 'correo' | 'telefono';

export interface ContactarClienteDialogProps {
  abierto: boolean;
  onCerrar: () => void;
  cliente: { nombre: string; correo: string; telefono: string | null };
  /** Deja constancia en el pedido de que se inició el contacto (M08, R11 de su contrato). */
  onContactar: (medio: MedioContacto) => void;
}

/**
 * R19 · Los datos del cliente para resolver con él lo que falta. Usar un enlace deja constancia en el pedido; el mensaje
 * o la llamada los hace la persona desde su correo o su teléfono: el sistema no envía nada aquí.
 */
export function ContactarClienteDialog({ abierto, onCerrar, cliente, onContactar }: ContactarClienteDialogProps) {
  return (
    <Modal isOpen={abierto} onClose={onCerrar} title="Contactar al cliente" subtitle={cliente.nombre} size="sm">
      <p className="text-sm text-neutral-dark">
        Cuéntele qué producto falta y qué puede hacer: esperar a que llegue o cancelar el pedido. Al usar un enlace queda
        anotado en el pedido que se le contactó.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <ButtonLink
          href={`mailto:${cliente.correo}`}
          variant="outline"
          leftIcon={<Mail className="h-4 w-4" />}
          onClick={() => onContactar('correo')}
        >
          Escribir a {cliente.correo}
        </ButtonLink>
        {cliente.telefono && (
          <ButtonLink
            href={`tel:${cliente.telefono}`}
            variant="outline"
            leftIcon={<Phone className="h-4 w-4" />}
            onClick={() => onContactar('telefono')}
          >
            Llamar al {cliente.telefono}
          </ButtonLink>
        )}
      </div>
    </Modal>
  );
}
