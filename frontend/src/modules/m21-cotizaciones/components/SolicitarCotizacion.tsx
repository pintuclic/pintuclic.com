'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText } from 'lucide-react';
import { Alert, Button, ButtonLink, Modal, Textarea } from '@/core/components';
import { useAuthStore } from '@/core/store/authStore';
import type { CotizacionDetalle } from '../dtos/m21-cotizaciones.dto';
import { solicitarFormSchema, type SolicitarFormData } from '../dtos/formularios.dto';
import { cotizacionesApi, mensajeDeError } from '../services/cotizaciones-api';

/**
 * "Solicitar cotización" en el carrito (R1–R3): pide un precio especial con lo que hay en el carrito.
 * Sin sesión lleva a iniciarla y vuelve al carrito. El carrito no cambia.
 */
export function SolicitarCotizacion() {
  const usuario = useAuthStore((s) => s.usuario);
  const [abierto, setAbierto] = useState(false);
  const [creada, setCreada] = useState<CotizacionDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SolicitarFormData>({ resolver: zodResolver(solicitarFormSchema), defaultValues: { comentario: '' } });

  const enviar = async (datos: SolicitarFormData): Promise<void> => {
    setError(null);
    try {
      setCreada(await cotizacionesApi.solicitar(datos.comentario));
      reset({ comentario: '' });
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No fue posible enviar tu solicitud. Intenta de nuevo.'));
    }
  };

  const cerrar = (): void => {
    setAbierto(false);
    setCreada(null);
    setError(null);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-neutral-dark">¿Compras en cantidad? Pide un precio especial para lo que tienes en el carrito.</p>
      {usuario === null ? (
        <ButtonLink
          href={`/login?destino=${encodeURIComponent('/carrito')}`}
          variant="outline"
          fullWidth
          leftIcon={<FileText aria-hidden className="h-4 w-4" />}
        >
          Inicia sesión para solicitar cotización
        </ButtonLink>
      ) : (
        <Button variant="outline" fullWidth leftIcon={<FileText aria-hidden className="h-4 w-4" />} onClick={() => setAbierto(true)}>
          Solicitar cotización
        </Button>
      )}
      <Link href="/cotizaciones" className="block text-center text-sm font-medium text-action hover:text-action-hover">
        Ver mis cotizaciones
      </Link>

      <Modal isOpen={abierto} onClose={cerrar} title="Solicitar cotización" size="md">
        {creada === null ? (
          <form noValidate className="space-y-4 py-2" onSubmit={(e) => void handleSubmit(enviar)(e)}>
            <p className="text-sm text-neutral-dark">
              Enviaremos a nuestro equipo comercial los productos disponibles de tu carrito. Tu carrito no cambia mientras
              esperas la respuesta.
            </p>
            <Textarea
              id="comentario-cotizacion"
              label="Comentario (opcional)"
              placeholder="Ej.: es para una obra, necesito entrega en dos semanas…"
              rows={4}
              {...register('comentario')}
              {...(errors.comentario?.message === undefined ? {} : { error: errors.comentario.message })}
            />
            {error !== null && <Alert variant="error">{error}</Alert>}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={cerrar} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary-conversion" isLoading={isSubmitting}>
                Enviar solicitud
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 py-2">
            <Alert variant="success" title={`Recibimos tu solicitud ${creada.codigo}`}>
              Te avisaremos cuando nuestro equipo la responda. Puedes seguir comprando mientras tanto.
            </Alert>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={cerrar}>
                Seguir en el carrito
              </Button>
              <ButtonLink href={`/cotizaciones/${creada.idCotizacion}`}>Ver mi cotización</ButtonLink>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
