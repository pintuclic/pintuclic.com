'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Printer } from 'lucide-react';
import { Alert, Button, Container, Skeleton } from '@/core/components';
import { mensajeDeError } from '../services/mensaje-error';
import type { HojaPreparacion } from '../dtos/m09-cumplimiento.dto';
import { obtenerHoja } from '../services/cumplimiento-api';
import { HojaDocumento } from './HojaDocumento';

/**
 * Al imprimir se deja solo la hoja: se oculta todo lo demás de la página (cabecera, menús, pie, botón del asistente),
 * de modo que el navegador entrega una hoja limpia, también al guardar como PDF. Es el mismo recurso del comprobante (M12).
 */
const ESTILO_IMPRESION = `
@media print {
  [data-testid='encabezado-fijo'], footer { display: none !important; }
  body * { visibility: hidden !important; }
  .hoja-imprimible, .hoja-imprimible * { visibility: visible !important; }
  .hoja-imprimible { position: absolute; left: 0; top: 0; width: 100%; }
  @page { margin: 14mm; }
}`;

export interface HojaPreparacionViewProps {
  codigoOrden: string;
  /** A dónde vuelve el enlace «Volver al pedido». */
  volverA: string;
}

/** HU-CUM-06 · Genera la hoja de preparación del pedido en el momento de abrirla (lleva su fecha y estado). */
export function HojaPreparacionView({ codigoOrden, volverA }: HojaPreparacionViewProps) {
  const [hoja, setHoja] = useState<HojaPreparacion | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    obtenerHoja(codigoOrden)
      .then((h) => vigente && setHoja(h))
      .catch((err: unknown) => vigente && setError(mensajeDeError(err)));
    return () => {
      vigente = false;
    };
  }, [codigoOrden]);

  return (
    <Container className="space-y-4 py-6">
      <style dangerouslySetInnerHTML={{ __html: ESTILO_IMPRESION }} />
      <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={volverA} className="font-sans text-sm font-medium text-action hover:underline">
          ← Volver al pedido
        </Link>
        {hoja !== null && (
          <Button variant="primary-action" leftIcon={<Printer className="h-4 w-4" aria-hidden="true" />} onClick={() => window.print()}>
            Imprimir hoja
          </Button>
        )}
      </div>

      {error !== null && (
        <div className="mx-auto max-w-[210mm] print:hidden">
          <Alert variant="warning">{error}</Alert>
        </div>
      )}
      {hoja === null && error === null && <Skeleton className="mx-auto h-[50vh] w-full max-w-[210mm]" />}
      {hoja !== null && <HojaDocumento hoja={hoja} />}
    </Container>
  );
}
