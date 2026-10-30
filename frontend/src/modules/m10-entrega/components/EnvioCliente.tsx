'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Container } from '@/core/components';
import type { EnvioCliente as EnvioClienteDatos } from '../dtos/m10-entrega.dto';
import { obtenerEnvioCliente } from '../services/entrega-api';
import { ETIQUETA_ESTADO_ENVIO, nombreProveedor } from '../services/presentacion';

/**
 * M10 · R5 · Seguimiento del envío de un pedido propio. No dibuja nada si el pedido no tiene envío (recogida en almacén
 * o aún sin despachar) o si la consulta falla: el detalle del pedido sigue completo sin este bloque.
 */
export function EnvioCliente({ codigo }: { codigo: string }) {
  const [envio, setEnvio] = useState<EnvioClienteDatos | null>(null);

  useEffect(() => {
    let vigente = true;
    obtenerEnvioCliente(codigo)
      .then((e) => vigente && setEnvio(e))
      .catch(() => vigente && setEnvio(null));
    return () => {
      vigente = false;
    };
  }, [codigo]);

  if (envio === null) return null;

  return (
    <div className="bg-neutral-lightest pb-8">
      <Container>
        <section aria-labelledby="envio" className="mx-auto max-w-3xl rounded-card bg-neutral-white p-4 shadow-card">
      <h2 id="envio" className="mb-3 font-title text-base font-bold text-neutral-black">
        Envío
      </h2>
      <dl className="space-y-1.5 text-sm text-neutral-dark">
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-medium">Estado</dt>
          <dd className="font-medium">{ETIQUETA_ESTADO_ENVIO[envio.estado]}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-medium">Servicio</dt>
          <dd>{nombreProveedor(envio.proveedor)}</dd>
        </div>
        {envio.numeroGuia && (
          <div className="flex justify-between gap-3">
            <dt className="text-neutral-medium">Guía</dt>
            <dd className="font-medium">{envio.numeroGuia}</dd>
          </div>
        )}
      </dl>
      {envio.urlSeguimiento && (
        <a
          href={envio.urlSeguimiento}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-action hover:underline"
        >
          Seguir mi envío <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      )}
        </section>
      </Container>
    </div>
  );
}
