'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Alert, Button } from '@/core/components';
import type { EnvioDetallePersonal } from '../dtos/m10-entrega.dto';
import { obtenerEnvioPersonal, reintentarEnvio } from '../services/entrega-api';
import { ETIQUETA_ESTADO_ENVIO, nombreProveedor } from '../services/presentacion';

/**
 * M10 · Envío de un pedido para el personal: estado, guía, enlaces, último error y novedades. Si el envío quedó
 * pendiente o fallido (R4) ofrece reintentarlo. Sin envío (recogida o sin despachar) no dibuja nada.
 */
export function EnvioPersonal({ codigo }: { codigo: string }) {
  const [detalle, setDetalle] = useState<EnvioDetallePersonal | null>(null);
  const [reintentando, setReintentando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setDetalle(await obtenerEnvioPersonal(codigo));
    } catch {
      setDetalle(null);
    }
  }, [codigo]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const reintentar = async () => {
    setReintentando(true);
    setError(null);
    try {
      await reintentarEnvio(codigo);
      await cargar();
    } catch {
      setError('No se pudo reintentar el envío. Inténtalo de nuevo en un momento.');
    } finally {
      setReintentando(false);
    }
  };

  const envio = detalle?.envio ?? null;
  if (detalle === null || envio === null) return null;
  const reintentable = envio.estado === 'pendiente' || envio.estado === 'fallido';

  return (
    <section aria-labelledby="envio" className="rounded-card bg-neutral-white p-4 shadow-card">
      <h2 id="envio" className="mb-3 font-title text-base font-bold text-neutral-black">
        Envío
      </h2>
      {error && <Alert variant="error">{error}</Alert>}
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
      {(envio.urlSeguimiento || envio.urlEtiqueta) && (
        <ul className="mt-3 flex flex-wrap gap-4 text-sm font-medium text-action">
          {envio.urlSeguimiento && (
            <li>
              <a href={envio.urlSeguimiento} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:underline">
                Seguimiento <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </li>
          )}
          {envio.urlEtiqueta && (
            <li>
              <a href={envio.urlEtiqueta} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:underline">
                Etiqueta <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </li>
          )}
        </ul>
      )}
      {envio.ultimoError && (
        <p role="alert" className="mt-3 text-sm text-danger-hover">
          El servicio de envíos respondió con un error: {envio.ultimoError}
        </p>
      )}
      {detalle.novedades.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-neutral-light pt-3 text-sm text-neutral-dark">
          {detalle.novedades.map((n) => (
            <li key={n.idNovedad}>
              <time dateTime={n.fecha} className="text-xs text-neutral-medium">
                {new Date(n.fecha).toLocaleString('es-CO')}
              </time>
              <p>{n.detalle}</p>
            </li>
          ))}
        </ul>
      )}
      {reintentable && (
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={() => void reintentar()} disabled={reintentando}>
            {reintentando ? 'Reintentando…' : 'Reintentar envío'}
          </Button>
        </div>
      )}
    </section>
  );
}
