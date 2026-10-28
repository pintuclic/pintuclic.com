'use client';

import React, { useState } from 'react';
import { Alert, Button, Input, Modal, Select, Textarea } from '@/core/components';
import { solicitarDevolucion } from '../../services/postventa-api';
import { formatearMoneda } from '../../services/presentacion';
import type { SolicitudPostventaDetalle } from '../../dtos/m11-postventa.dto';

export interface LineaOrdenParaDevolucion {
  idLineaOrden?: number;
  nombreProducto: string;
  varianteCopia: string;
  cantidad: number;
  precioAplicado: number;
  esEntonado?: boolean;
}

export interface ModalSolicitarDevolucionProps {
  isOpen: boolean;
  onClose: () => void;
  codigoOrden: string;
  lineas: LineaOrdenParaDevolucion[];
  onExito: (solicitud: SolicitudPostventaDetalle) => void;
}

const OPCIONES_TIPO_POSTVENTA = [
  { value: 'devolucion', label: 'Devolución por derecho de retracto (5 días hábiles)' },
  { value: 'garantia', label: 'Reclamación por garantía o defecto (30 días)' },
];

const OPCIONES_TIPO_CUENTA = [
  { value: 'ahorros', label: 'Cuenta de Ahorros' },
  { value: 'corriente', label: 'Cuenta Corriente' },
];

export function ModalSolicitarDevolucion({
  isOpen,
  onClose,
  codigoOrden,
  lineas,
  onExito,
}: ModalSolicitarDevolucionProps) {
  const [tipo, setTipo] = useState<'devolucion' | 'garantia'>('devolucion');
  const [seleccionadas, setSeleccionadas] = useState<Record<number, boolean>>({});
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [motivosLinea, setMotivosLinea] = useState<Record<number, string>>({});

  const [motivoGeneral, setMotivoGeneral] = useState('');
  const [incluirDatosBancarios, setIncluirDatosBancarios] = useState(false);
  const [banco, setBanco] = useState('');
  const [tipoCuenta, setTipoCuenta] = useState<'ahorros' | 'corriente'>('ahorros');
  const [numeroCuenta, setNumeroCuenta] = useState('');
  const [titularNombre, setTitularNombre] = useState('');
  const [titularDocumento, setTitularDocumento] = useState('');

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lineasConId = React.useMemo(
    () =>
      lineas.map((l, idx) => ({
        ...l,
        idLineaOrden: l.idLineaOrden ?? idx + 1,
        esEntonado: Boolean(l.esEntonado),
      })),
    [lineas]
  );

  const toggleSeleccion = (id: number, max: number) => {
    setSeleccionadas((prev) => {
      const nuevo = !prev[id];
      if (nuevo && !cantidades[id]) {
        setCantidades((c) => ({ ...c, [id]: max }));
      }
      return { ...prev, [id]: nuevo };
    });
  };

  const cambiarCantidad = (id: number, cant: number, max: number) => {
    const seguro = Math.max(1, Math.min(cant, max));
    setCantidades((prev) => ({ ...prev, [id]: seguro }));
  };

  const lineasSeleccionadas = lineasConId.filter((l) => seleccionadas[l.idLineaOrden]);
  const hayEntonadoSeleccionado = lineasSeleccionadas.some((l) => l.esEntonado);

  const totalEstimado = lineasSeleccionadas.reduce((sum, l) => {
    const cant = cantidades[l.idLineaOrden] ?? l.cantidad;
    return sum + l.precioAplicado * cant;
  }, 0);

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lineasSeleccionadas.length === 0) {
      setError('Debes seleccionar al menos un producto a devolver o reclamar.');
      return;
    }

    if (tipo === 'devolucion' && hayEntonadoSeleccionado) {
      setError(
        'Las pinturas entonadas o personalizadas no admiten derecho de retracto voluntario (Art. 47 Ley 1480). Selecciona la opción de garantía si el producto presenta fallas.'
      );
      return;
    }

    if (motivoGeneral.trim().length < 10) {
      setError('Por favor explica el motivo general con al menos 10 caracteres.');
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const payloadLineas = lineasSeleccionadas.map((l) => ({
        idLineaOrden: l.idLineaOrden,
        cantidad: cantidades[l.idLineaOrden] ?? l.cantidad,
        motivoEspecifico: motivosLinea[l.idLineaOrden]?.trim() || undefined,
      }));

      const datosReembolso = incluirDatosBancarios
        ? {
            banco: banco.trim(),
            tipoCuenta,
            numeroCuenta: numeroCuenta.trim(),
            titularNombre: titularNombre.trim(),
            titularDocumento: titularDocumento.trim(),
          }
        : undefined;

      const resultado = await solicitarDevolucion({
        codigoOrden,
        tipo,
        motivoGeneral: motivoGeneral.trim(),
        lineas: payloadLineas,
        datosReembolso,
      });

      onExito(resultado);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error al registrar la solicitud.');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Solicitud de postventa"
      subtitle={`Pedido #${codigoOrden}`}
      size="lg"
    >
      <form onSubmit={manejarEnvio} className="space-y-4">
        {error && (
          <Alert variant="error" title="No pudimos registrar tu solicitud">
            {error}
          </Alert>
        )}

        <Select
          label="Tipo de solicitud"
          options={OPCIONES_TIPO_POSTVENTA}
          value={tipo}
          onChange={(e) => setTipo(e.target.value as 'devolucion' | 'garantia')}
        />

        {tipo === 'devolucion' && (
          <div className="text-xs text-neutral-medium bg-neutral-lightest p-3 rounded-lg border border-neutral-light">
            <strong>Derecho de Retracto (Ley 1480 de 2011):</strong> Tienes 5 días hábiles a
            partir de la entrega para solicitar la devolución voluntaria del producto en su
            empaque original cerrado y sin uso. El cliente asume el flete de devolución.
          </div>
        )}

        {tipo === 'garantia' && (
          <div className="text-xs text-neutral-medium bg-neutral-lightest p-3 rounded-lg border border-neutral-light">
            <strong>Garantía Legal (30 días calendario):</strong> Aplica si el producto presenta
            defectos de fábrica, inconsistencias técnicas o daño imputable a la entrega. Pintu
            Clic asume los costos de transporte de la garantía.
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-bold text-neutral-black">
            Selecciona los productos:
          </h4>
          <div className="divide-y divide-neutral-light border border-neutral-light rounded-lg max-h-60 overflow-y-auto">
            {lineasConId.map((l) => {
              const estaSeleccionada = !!seleccionadas[l.idLineaOrden];
              const cant = cantidades[l.idLineaOrden] ?? l.cantidad;

              return (
                <div key={l.idLineaOrden} className="p-3 bg-neutral-white space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex items-start gap-2 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={estaSeleccionada}
                        onChange={() => toggleSeleccion(l.idLineaOrden, l.cantidad)}
                        className="mt-1 h-4 w-4 rounded border-neutral-medium text-action focus:ring-action"
                      />
                      <div>
                        <span className="font-medium text-sm text-neutral-black">
                          {l.nombreProducto}
                        </span>
                        <div className="text-xs text-neutral-medium">
                          {l.varianteCopia} · Unitario: {formatearMoneda(l.precioAplicado)}
                        </div>
                        {l.esEntonado && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Color entonado / personalizado
                          </span>
                        )}
                      </div>
                    </label>

                    {estaSeleccionada && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-neutral-medium">Cant:</label>
                        <input
                          type="number"
                          min={1}
                          max={l.cantidad}
                          value={cant}
                          onChange={(e) =>
                            cambiarCantidad(
                              l.idLineaOrden,
                              parseInt(e.target.value) || 1,
                              l.cantidad
                            )
                          }
                          className="w-16 px-2 py-1 border rounded text-sm text-center"
                        />
                      </div>
                    )}
                  </div>

                  {estaSeleccionada && (
                    <input
                      type="text"
                      placeholder="Observación específica de esta línea (opcional)..."
                      value={motivosLinea[l.idLineaOrden] ?? ''}
                      onChange={(e) =>
                        setMotivosLinea((prev) => ({
                          ...prev,
                          [l.idLineaOrden]: e.target.value,
                        }))
                      }
                      className="w-full text-xs px-2.5 py-1.5 border rounded border-neutral-light focus:outline-none focus:border-action"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {hayEntonadoSeleccionado && tipo === 'devolucion' && (
          <Alert variant="warning" title="Exclusión legal de pinturas entonadas">
            Has seleccionado un producto preparado o entonado a medida. El Art. 47 de la
            Ley 1480 exceptúa de retracto voluntario los bienes confeccionados conforme a las
            especificaciones del consumidor. Para proceder, cambia el tipo de solicitud a
            &quot;Garantía&quot; o desmarca la pintura entonada.
          </Alert>
        )}

        <div className="bg-primary-50 p-3 rounded-lg flex justify-between items-center text-sm font-semibold text-primary-900 border border-primary-200">
          <span>Total estimado a reembolsar:</span>
          <span>{formatearMoneda(totalEstimado)}</span>
        </div>

        <Textarea
          id="motivo-general"
          label="Motivo detallado de la solicitud"
          placeholder="Describe claramente los hechos o razones de tu devolución o garantía (mínimo 10 caracteres)..."
          value={motivoGeneral}
          onChange={(e) => setMotivoGeneral(e.target.value)}
          rows={3}
          required
        />

        <div className="pt-2 border-t border-neutral-light">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-neutral-dark">
            <input
              type="checkbox"
              checked={incluirDatosBancarios}
              onChange={(e) => setIncluirDatosBancarios(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-medium text-action focus:ring-action"
            />
            Registrar cuenta bancaria para pago de reembolso
          </label>
        </div>

        {incluirDatosBancarios && (
          <div className="space-y-3 bg-neutral-lightest p-3 rounded-lg border border-neutral-light">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Banco"
                placeholder="Ej. Bancolombia"
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                required={incluirDatosBancarios}
              />
              <Select
                label="Tipo de cuenta"
                options={OPCIONES_TIPO_CUENTA}
                value={tipoCuenta}
                onChange={(e) =>
                  setTipoCuenta(e.target.value as 'ahorros' | 'corriente')
                }
              />
            </div>
            <Input
              label="Número de cuenta"
              value={numeroCuenta}
              onChange={(e) => setNumeroCuenta(e.target.value)}
              required={incluirDatosBancarios}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Titular de la cuenta"
                value={titularNombre}
                onChange={(e) => setTitularNombre(e.target.value)}
                required={incluirDatosBancarios}
              />
              <Input
                label="Documento del titular"
                value={titularDocumento}
                onChange={(e) => setTitularDocumento(e.target.value)}
                required={incluirDatosBancarios}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={cargando}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary-action"
            disabled={cargando || (tipo === 'devolucion' && hayEntonadoSeleccionado)}
          >
            {cargando ? 'Radicando...' : 'Radicar Solicitud'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
