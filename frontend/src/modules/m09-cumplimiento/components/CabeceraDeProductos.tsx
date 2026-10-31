'use client';

import { useState } from 'react';
import { CheckCheck, Phone, XCircle } from 'lucide-react';
import { Alert, Button, ButtonLink, Skeleton } from '@/core/components';
import type { VerificacionOrden } from '../dtos/m09-cumplimiento.dto';
import { avisoDelEstado, hayProductosConProblema, puedePedirCancelacion, resumenAvance } from '../services/presentacion';
import { useCumplimientoStore } from '../store/cumplimientoStore';
import { CancelarPedidoDialog } from './CancelarPedidoDialog';
import { ContactarClienteDialog, type MedioContacto } from './ContactarClienteDialog';

export interface VistaCabeceraProps {
  verificacion: VerificacionOrden | null;
  cargando: boolean;
  guardando: boolean;
  error: string | null;
  aviso: string | null;
  onMarcarTodas: () => void;
  onContactar: () => void;
  onCancelar: () => void;
}

/**
 * HU-CUM-01, 03 · Lo de arriba de la tarjeta de productos mientras el pedido se revisa o se prepara: cuánto va, el atajo para
 * marcar todo de una vez y, SOLO si hay un producto que falta, los dos botones para resolverlo (R19). Con todo en orden no
 * hay más que el resumen: nada que abrume.
 */
export function VistaCabecera({ verificacion, cargando, guardando, error, aviso, onMarcarTodas, onContactar, onCancelar }: VistaCabeceraProps) {
  if (cargando && verificacion === null) {
    return (
      <div className="mb-4" aria-busy="true" aria-label="Cargando la revisión">
        <Skeleton className="h-12" />
      </div>
    );
  }
  if (verificacion === null) {
    return error ? <Alert variant="error">{error}</Alert> : null;
  }

  const enRevision = verificacion.estado === 'revision_disponibilidad';
  const marcaMasiva = enRevision ? 'disponible' : 'preparada';
  const pendientesDeMarcar = verificacion.lineas.filter((l) => l.estado !== marcaMasiva).length;

  return (
    <div className="mb-4 space-y-3">
      {error && <Alert variant="error">{error}</Alert>}
      {aviso && <Alert variant="success">{aviso}</Alert>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-neutral-dark" aria-live="polite">
          {resumenAvance(verificacion)}
        </p>
        {pendientesDeMarcar > 0 && verificacion.estado !== 'preparada' && (
          <Button
            variant="outline"
            size="sm"
            leftIcon={<CheckCheck className="h-4 w-4" aria-hidden="true" />}
            isLoading={guardando}
            onClick={onMarcarTodas}
          >
            {enRevision ? 'Marcar todos como disponibles' : 'Marcar todos como preparados'}
          </Button>
        )}
      </div>

      {hayProductosConProblema(verificacion.lineas) && (
        <div className="flex flex-wrap items-center gap-2 rounded-input border border-danger/30 bg-danger/5 p-3">
          <p className="mr-auto text-sm text-neutral-dark">Hay productos que faltan. Resuélvalo con el cliente.</p>
          <Button variant="outline" size="sm" leftIcon={<Phone className="h-4 w-4" aria-hidden="true" />} onClick={onContactar}>
            Contactar al cliente
          </Button>
          {puedePedirCancelacion(verificacion) && (
            <Button variant="danger" size="sm" leftIcon={<XCircle className="h-4 w-4" aria-hidden="true" />} onClick={onCancelar}>
              Cancelar pedido
            </Button>
          )}
        </div>
      )}

      {verificacion.cancelacion && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-input border border-neutral-light p-3">
          <p className="text-sm text-neutral-dark">
            Cancelación {verificacion.cancelacion.iniciadaPor === 'tienda' ? 'pedida por la tienda' : 'pedida por el cliente'} (
            {verificacion.cancelacion.codigo}), pendiente de resolver.
          </p>
          <ButtonLink href={`/admin/postventa/${encodeURIComponent(verificacion.cancelacion.codigo)}`} variant="outline" size="sm">
            Ver solicitud
          </ButtonLink>
        </div>
      )}

      <p className="text-xs text-neutral-medium">{avisoDelEstado(verificacion.estado)}</p>
    </div>
  );
}

export interface CabeceraDeProductosProps {
  codigo: string;
  cliente: { nombre: string; correo: string; telefono: string | null };
  /** Deja constancia del contacto en el pedido (M08). */
  onContactar: (medio: MedioContacto) => void;
}

/** La cabecera conectada al store de M09, con los diálogos de contactar y de cancelar el pedido. */
export function CabeceraDeProductos({ codigo, cliente, onContactar }: CabeceraDeProductosProps) {
  const verificacion = useCumplimientoStore((s) => s.verificacion);
  const cargando = useCumplimientoStore((s) => s.cargando);
  const guardando = useCumplimientoStore((s) => s.guardando);
  const solicitando = useCumplimientoStore((s) => s.solicitando);
  const error = useCumplimientoStore((s) => s.error);
  const aviso = useCumplimientoStore((s) => s.aviso);
  const [contactando, setContactando] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  const marcaMasiva = verificacion?.estado === 'revision_disponibilidad' ? 'disponible' : 'preparada';

  return (
    <>
      <VistaCabecera
        verificacion={verificacion}
        cargando={cargando}
        guardando={guardando}
        error={error}
        aviso={aviso}
        onMarcarTodas={() => void useCumplimientoStore.getState().marcarTodas(marcaMasiva)}
        onContactar={() => setContactando(true)}
        onCancelar={() => setCancelando(true)}
      />
      <ContactarClienteDialog abierto={contactando} onCerrar={() => setContactando(false)} cliente={cliente} onContactar={onContactar} />
      {verificacion && (
        <CancelarPedidoDialog
          abierto={cancelando}
          onCerrar={() => setCancelando(false)}
          codigo={codigo}
          lineas={verificacion.lineas}
          enviando={solicitando}
          onConfirmar={(nota) => useCumplimientoStore.getState().pedirCancelacion(nota)}
        />
      )}
    </>
  );
}
