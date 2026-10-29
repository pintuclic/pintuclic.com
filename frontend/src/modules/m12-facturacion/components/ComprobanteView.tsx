'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail, Printer } from 'lucide-react';
import { Alert, Button, ButtonLink, Container, Skeleton } from '@/core/components';
import { mensajeDeError } from '@/core/utils/errorApi';
import type { Comprobante } from '../dtos/m12-facturacion.dto';
import { mensajeDeComprobanteNoDisponible, mensajeDelServidor } from '../services/formato-comprobante';
import { obtenerComprobanteDePersonal, obtenerMiComprobante, reenviarComprobante } from '../services/facturacion-api';
import { ComprobanteDocumento } from './ComprobanteDocumento';

/**
 * Al imprimir se deja solo el documento: se oculta todo lo demás de la página (cabecera, menús, pie, botón del asistente,
 * panel del carrito). Así el navegador entrega una hoja limpia, también al guardar como PDF.
 */
const ESTILO_IMPRESION = `
@media print {
  [data-testid='encabezado-fijo'], footer { display: none !important; }
  body * { visibility: hidden !important; }
  .comprobante-imprimible, .comprobante-imprimible * { visibility: visible !important; }
  .comprobante-imprimible { position: absolute; left: 0; top: 0; width: 100%; }
  @page { margin: 14mm; }
}`;

export interface ComprobanteViewProps {
  codigoOrden: string;
  /** `cliente`: su propio pedido. `personal`: cualquier pedido (con opción de reenviar el aviso por correo). */
  modo: 'cliente' | 'personal';
  /** A dónde vuelve el enlace «Volver al pedido». */
  volverA: string;
  esAdmin?: boolean;
}

export const ComprobanteView: React.FC<ComprobanteViewProps> = ({ codigoOrden, modo, volverA, esAdmin = false }) => {
  const [comprobante, setComprobante] = useState<Comprobante | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vigente = true;
    (modo === 'cliente' ? obtenerMiComprobante(codigoOrden) : obtenerComprobanteDePersonal(codigoOrden))
      .then((c) => vigente && setComprobante(c))
      .catch((err: unknown) => {
        if (!vigente) return;
        // Al personal se le dice qué falta (409); al cliente, solo que todavía no está (404 opaco).
        const estado = (err as { response?: { status?: number } }).response?.status;
        setError(estado === 409 || modo === 'personal' ? (mensajeDelServidor(err) ?? mensajeDeError(err)) : mensajeDeComprobanteNoDisponible());
      });
    return () => {
      vigente = false;
    };
  }, [codigoOrden, modo]);

  const reenviar = useCallback(async () => {
    setEnviando(true);
    setAviso(null);
    try {
      await reenviarComprobante(codigoOrden);
      setAviso('Le enviamos al cliente el aviso con el enlace al comprobante.');
    } catch (err: unknown) {
      setError(mensajeDelServidor(err) ?? mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  }, [codigoOrden]);

  return (
    <Container className="space-y-4 py-6">
      <style dangerouslySetInnerHTML={{ __html: ESTILO_IMPRESION }} />
      <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={volverA} className="font-sans text-sm font-medium text-action hover:underline">
          ← Volver al pedido
        </Link>
        {comprobante !== null && (
          <div className="flex flex-wrap gap-2">
            {modo === 'personal' && (
              <Button variant="outline" leftIcon={<Mail className="h-4 w-4" aria-hidden="true" />} onClick={() => void reenviar()} isLoading={enviando}>
                Reenviar por correo
              </Button>
            )}
            <Button variant="primary-action" leftIcon={<Printer className="h-4 w-4" aria-hidden="true" />} onClick={() => window.print()}>
              Imprimir o guardar como PDF
            </Button>
          </div>
        )}
      </div>

      {aviso !== null && (
        <div className="mx-auto max-w-[210mm] print:hidden">
          <Alert variant="success">{aviso}</Alert>
        </div>
      )}
      {error !== null && (
        <div className="mx-auto max-w-[210mm] space-y-3 print:hidden">
          <Alert variant="warning">{error}</Alert>
          {esAdmin && (
            <ButtonLink href="/admin/facturacion" variant="outline" size="sm">
              Ir a los datos de facturación
            </ButtonLink>
          )}
        </div>
      )}
      {comprobante === null && error === null && <Skeleton className="mx-auto h-[60vh] w-full max-w-[210mm]" />}
      {comprobante !== null && <ComprobanteDocumento comprobante={comprobante} />}
    </Container>
  );
};
