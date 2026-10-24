'use client';

import React, { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Power, RotateCcw } from 'lucide-react';
import { Alert, Button, Input, Modal, Select } from '@/core/components';
import { formVarianteSchema, type FormVariante } from '../../dtos/formularios.dto';
import type { Variante } from '../../dtos/m01-catalogo-productos.dto';
import { useCargar } from '../../hooks/useCargar';
import type { Referencias } from '../../hooks/useReferencias';
import { productosApi, variantesApi } from '../../services/catalogo-api';
import { aCuerpoVariante, aCuerpoVarianteEditada } from '../../services/formularios';
import { leerErrorCatalogo } from '../../services/mensaje-error';
import { formatCOP } from '@/core/utils/moneda';
import { AvisoAccion, Cargando, EstadoBadge, MensajeVacio, ModalDesactivar, reactivar, type Aviso } from './comunes';

interface FormularioVarianteProps {
  idProducto: number;
  variante: Variante | null;
  referencias: Referencias;
  usadas: number[];
  onClose: () => void;
  onGuardada: (texto: string) => void;
}

const FormularioVariante: React.FC<FormularioVarianteProps> = ({
  idProducto,
  variante,
  referencias,
  usadas,
  onClose,
  onGuardada,
}) => {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormVariante>({
    resolver: zodResolver(formVarianteSchema),
    defaultValues: {
      idMedida: variante === null ? '' : String(variante.idMedida),
      precio: variante === null ? '' : String(variante.precio),
      sku: variante?.sku ?? '',
      existenciaReferencial: variante === null ? '0' : String(variante.existenciaReferencial),
      codigoProveedor: variante?.codigoProveedor ?? '',
    },
  });
  const disponibles = referencias.medidas.filter(
    (m) => !usadas.includes(m.idMedida) || m.idMedida === variante?.idMedida,
  );

  const enviar = handleSubmit(async (valores) => {
    setError(null);
    try {
      if (variante === null) {
        const r = aCuerpoVariante(valores);
        if (!r.ok) return setError(r.mensaje);
        await variantesApi.crear(idProducto, r.valor);
      } else {
        const r = aCuerpoVarianteEditada(valores);
        if (!r.ok) return setError(r.mensaje);
        await variantesApi.editar(variante.idVariante, r.valor);
      }
      onGuardada(variante === null ? 'Variante creada.' : 'Variante actualizada.');
      onClose();
    } catch (err: unknown) {
      setError(leerErrorCatalogo(err, 'No se pudo guardar la variante.').message);
    }
  });

  return (
    <Modal
      isOpen
      closeOnOutsideClick={false}
      onClose={onClose}
      title={variante === null ? 'Nueva variante' : `Editar ${variante.medida}`}
      size="md"
    >
      <form onSubmit={(e) => void enviar(e)} noValidate className="space-y-4 py-2">
        {error !== null && <Alert variant="error">{error}</Alert>}
        <Select
          label="Medida"
          disabled={variante !== null}
          options={[
            { value: '', label: 'Elija…' },
            ...disponibles.map((m) => ({ value: String(m.idMedida), label: m.nombre })),
          ]}
          {...register('idMedida')}
          error={errors.idMedida?.message}
          helperText={
            variante !== null
              ? 'La medida no cambia: para otra medida cree otra variante.'
              : 'Solo se listan las medidas que el producto aún no tiene.'
          }
        />
        <Input
          label="Precio (COP)"
          inputMode="decimal"
          {...register('precio')}
          error={errors.precio?.message}
          helperText="El precio es de la variante, no del color."
        />
        <Input
          label="SKU"
          {...register('sku')}
          error={errors.sku?.message}
          helperText={variante === null ? 'Opcional. Si lo deja vacío se genera: P{producto}-V{variante}.' : undefined}
        />
        <Input
          label="Existencia referencial"
          inputMode="numeric"
          {...register('existenciaReferencial')}
          error={errors.existenciaReferencial?.message}
          helperText="Solo informativa: no bloquea ventas."
        />
        <Input
          label="Código de proveedor"
          {...register('codigoProveedor')}
          error={errors.codigoProveedor?.message}
          helperText="Opcional."
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary-action" type="submit" isLoading={isSubmitting}>
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export interface VariantesModalProps {
  idProducto: number;
  referencias: Referencias;
  onClose: () => void;
  /** Los cambios de variantes pueden despublicar el producto: la lista del padre se refresca. */
  onCambio: () => void;
}

/** HU-CAT-03: variantes de un producto (medida + precio). */
export const VariantesModal: React.FC<VariantesModalProps> = ({ idProducto, referencias, onClose, onCambio }) => {
  const cargador = useCallback(() => productosApi.obtener(idProducto), [idProducto]);
  const { datos, cargando, error, recargar } = useCargar(cargador, 'No se pudo cargar el producto.');
  const [formulario, setFormulario] = useState<{ variante: Variante | null } | null>(null);
  const [aDesactivar, setADesactivar] = useState<Variante | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);
  const cambio = (texto: string) => {
    setAviso({ tipo: 'success', texto });
    recargar();
    onCambio();
  };

  return (
    <>
      {/* El Modal del Core Kit no sabe apilarse (cualquier clic fuera o Escape cierra todos), así que mientras
          se edita una variante o se confirma una baja, la lista queda oculta y solo hay un diálogo abierto. */}
      <Modal
        isOpen={formulario === null && aDesactivar === null}
        onClose={onClose}
        title="Variantes"
        subtitle={datos?.nombre}
        size="lg"
      >
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between gap-3">
            <p className="font-sans text-sm text-neutral-medium">
              Una variante por medida. El color se elige al comprar.
            </p>
            <Button
              variant="primary-action"
              size="sm"
              disabled={datos?.estado !== 'activo'}
              leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
              onClick={() => setFormulario({ variante: null })}
            >
              Nueva variante
            </Button>
          </div>
          {datos !== null && datos.estado !== 'activo' && (
            <Alert variant="info">El producto está inactivo: no admite variantes nuevas.</Alert>
          )}
          <AvisoAccion aviso={aviso} onCerrar={cerrarAviso} />
          {error !== null && <Alert variant="error">{error}</Alert>}
          {cargando && datos === null && <Cargando />}
          {datos !== null && datos.variantes.length === 0 && (
            <MensajeVacio>Este producto aún no tiene variantes.</MensajeVacio>
          )}
          {datos !== null && datos.variantes.length > 0 && (
            <div className="overflow-x-auto rounded-card border border-neutral-light">
              <table className="w-full min-w-[520px] text-left font-sans text-sm">
                <caption className="sr-only">Variantes de {datos.nombre}</caption>
                <thead className="bg-neutral-lightest text-xs uppercase tracking-wide text-neutral-medium">
                  <tr>
                    <th scope="col" className="px-3 py-2">
                      Medida
                    </th>
                    <th scope="col" className="px-3 py-2">
                      SKU
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Precio
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Existencia
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Estado
                    </th>
                    <th scope="col" className="px-3 py-2 text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-light">
                  {datos.variantes.map((v) => (
                    <tr key={v.idVariante}>
                      <td className="px-3 py-2 text-neutral-black">{v.medida}</td>
                      <td className="px-3 py-2">{v.sku}</td>
                      <td className="px-3 py-2">{formatCOP(v.precio)}</td>
                      <td className="px-3 py-2">{v.existenciaReferencial}</td>
                      <td className="px-3 py-2">
                        <EstadoBadge estado={v.estado} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Editar ${v.medida}`}
                            onClick={() => setFormulario({ variante: v })}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          {v.estado === 'activo' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`Desactivar ${v.medida}`}
                              onClick={() => setADesactivar(v)}
                            >
                              <Power className="h-4 w-4 text-danger" aria-hidden="true" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`Reactivar ${v.medida}`}
                              onClick={() =>
                                void reactivar(
                                  () =>
                                    variantesApi.cambiarEstado(v.idVariante, { estado: 'activo', confirmar: false }),
                                  () => cambio(`Se reactivó ${v.medida}.`),
                                  (texto) => setAviso({ tipo: 'error', texto }),
                                )
                              }
                            >
                              <RotateCcw className="h-4 w-4 text-conversion" aria-hidden="true" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      {formulario !== null && datos !== null && (
        <FormularioVariante
          idProducto={idProducto}
          variante={formulario.variante}
          referencias={referencias}
          usadas={datos.variantes.map((v) => v.idMedida)}
          onClose={() => setFormulario(null)}
          onGuardada={cambio}
        />
      )}
      <ModalDesactivar
        objetivo={aDesactivar === null ? null : { id: aDesactivar.idVariante, nombre: aDesactivar.medida }}
        queEs="la variante"
        obtenerImpacto={variantesApi.impacto}
        desactivar={(id, confirmar) => variantesApi.cambiarEstado(id, { estado: 'inactivo', confirmar })}
        onClose={() => setADesactivar(null)}
        onHecho={() =>
          cambio('Variante desactivada. Si era la última de un producto publicado, el producto se despublicó.')
        }
      />
    </>
  );
};
