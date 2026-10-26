'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Input, Modal, Textarea } from '@/core/components';
import { formComboSchema, type FormCombo } from '../../dtos/formularios.dto';
import type { Combo } from '../../dtos/m01-catalogo-entrega3.dto';
import type { Referencias } from '../../hooks/useReferencias';
import { combosApi, existenciaDeComboApi } from '../../services/catalogo-api';
import { aCuerpoCombo, aCuerpoComboEditado, existenciaInicialDe, formDeCombo } from '../../services/formularios';
import { leerErrorCatalogo } from '../../services/mensaje-error';
import { CampoCheck, SelectorBuscable } from './campos';

const VACIO: FormCombo = {
  nombre: '',
  idMarca: '',
  idSubcategoria: '',
  idMedida: '',
  precio: '',
  sku: '',
  descripcion: '',
  excluidoDeDescuentos: false,
  idCategoriaComplementaria: '',
  existenciaInicial: '',
};

export interface ComboFormModalProps {
  /** null = combo nuevo. */
  combo: Combo | null;
  referencias: Referencias;
  onClose: () => void;
  /** Recibe el texto de confirmación y el id del combo (para seguir con sus imágenes). */
  onGuardado: (texto: string, idProducto: number) => void;
}

/**
 * HU-CAT-13: un combo es un producto con una sola variante, vendido a precio propio. No hace falta
 * declarar de qué se compone. La existencia se ajusta en Inventario; aquí solo se puede fijar la inicial.
 */
export const ComboFormModal: React.FC<ComboFormModalProps> = ({ combo, referencias, onClose, onGuardado }) => {
  const editando = combo !== null;
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormCombo>({
    resolver: zodResolver(formComboSchema),
    defaultValues: combo === null ? VACIO : formDeCombo(combo),
  });
  const poner = (campo: keyof FormCombo, valor: string) =>
    setValue(campo, valor, { shouldValidate: true, shouldDirty: true });
  const idMarca = watch('idMarca');
  const idSubcategoria = watch('idSubcategoria');
  const idMedida = watch('idMedida');
  const idCategoriaComplementaria = watch('idCategoriaComplementaria');

  const tipoUnidad = referencias.tiposMedida.find((t) => t.nombre.trim().toLowerCase() === 'unidad');
  const unidades = referencias.medidas.filter(
    (m) => tipoUnidad !== undefined && m.idTipoMedida === tipoUnidad.idTipoMedida,
  );
  const categorias = referencias.categorias.filter((c) => c.estado === 'activo');
  const subcategorias = categorias.flatMap((c) =>
    c.subcategorias
      .filter((s) => s.estado === 'activo')
      .map((s) => ({ value: String(s.idSubcategoria), label: `${c.nombre} › ${s.nombre}` })),
  );

  const enviar = handleSubmit(async (valores) => {
    setError(null);
    try {
      if (combo !== null) {
        const r = aCuerpoComboEditado(valores);
        if (!r.ok) return setError(r.mensaje);
        await combosApi.editar(combo.idProducto, r.valor);
        onGuardado('Combo actualizado.', combo.idProducto);
        onClose();
        return;
      }
      const r = aCuerpoCombo(valores);
      if (!r.ok) return setError(r.mensaje);
      const creado = await combosApi.crear(r.valor);
      const existencia = existenciaInicialDe(valores);
      let texto = 'Combo creado. Agregue ahora su imagen para poder publicarlo.';
      if (existencia !== null && existencia > 0) {
        try {
          await existenciaDeComboApi.fijarInicial(creado.idVariante, existencia);
        } catch (err: unknown) {
          // El combo ya existe: se avisa y se deja continuar; la existencia se ajusta en Inventario.
          texto = `Combo creado, pero no se pudo fijar la existencia (${leerErrorCatalogo(err, 'error desconocido').message}). Ajústela en Inventario.`;
        }
      }
      onGuardado(texto, creado.idProducto);
      onClose();
    } catch (err: unknown) {
      setError(leerErrorCatalogo(err, 'No se pudo guardar el combo.').message);
    }
  });

  return (
    <Modal
      isOpen
      closeOnOutsideClick={false}
      onClose={onClose}
      title={editando ? 'Editar combo' : 'Nuevo combo'}
      subtitle="Un paquete a precio propio, vendido como un producto más."
      size="lg"
    >
      <form onSubmit={(e) => void enviar(e)} noValidate className="space-y-4 py-2">
        {error !== null && <Alert variant="error">{error}</Alert>}
        {tipoUnidad === undefined && !editando && (
          <Alert variant="warning">
            Para crear combos primero debe existir un tipo de medida llamado «Unidad» con al menos una medida (por
            ejemplo «1 unidad»). Créelo en la sección Medidas.
          </Alert>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input label="Nombre del combo" {...register('nombre')} error={errors.nombre?.message} />
          </div>
          <SelectorBuscable
            label="Marca"
            value={idMarca}
            onChange={(v) => poner('idMarca', v)}
            options={referencias.marcas.map((m) => ({ value: String(m.idMarca), label: m.nombre }))}
            disabled={editando}
            error={errors.idMarca?.message}
            helperText={
              editando
                ? 'La marca de un combo no cambia.'
                : 'Si el combo mezcla marcas, use una marca propia como «Pintu Clic».'
            }
          />
          <SelectorBuscable
            label="Subcategoría"
            value={idSubcategoria}
            onChange={(v) => poner('idSubcategoria', v)}
            options={subcategorias}
            error={errors.idSubcategoria?.message}
          />
          <SelectorBuscable
            label="Unidad"
            value={idMedida}
            onChange={(v) => poner('idMedida', v)}
            options={unidades.map((m) => ({ value: String(m.idMedida), label: m.nombre }))}
            disabled={editando}
            error={errors.idMedida?.message}
            helperText={
              editando ? 'La unidad de un combo no cambia.' : 'Medida de tipo Unidad, por ejemplo «1 unidad».'
            }
          />
          <Input
            label="Precio (COP)"
            inputMode="decimal"
            {...register('precio')}
            error={errors.precio?.message}
            helperText="El precio es del combo completo."
          />
          <Input
            label="SKU"
            {...register('sku')}
            error={errors.sku?.message}
            helperText={editando ? undefined : 'Opcional. Si lo deja vacío se genera: P{producto}-V{variante}.'}
          />
          {!editando && (
            <Input
              label="Existencia inicial"
              inputMode="numeric"
              {...register('existenciaInicial')}
              error={errors.existenciaInicial?.message}
              helperText="Opcional. Un combo no se puede comprar si su existencia es 0. Después se ajusta en Inventario."
            />
          )}
          <div className="sm:col-span-2">
            <Textarea label="Descripción" rows={3} {...register('descripcion')} error={errors.descripcion?.message} />
          </div>
          <div className="sm:col-span-2">
            <SelectorBuscable
              label="Categoría complementaria (opcional)"
              value={idCategoriaComplementaria}
              onChange={(v) => poner('idCategoriaComplementaria', v)}
              options={categorias.map((c) => ({ value: String(c.idCategoria), label: c.nombre }))}
              textoSinElegir="Ninguna"
              helperText="De esta categoría se sugieren productos en la ficha del combo."
            />
          </div>
          <div className="flex flex-wrap gap-6 sm:col-span-2">
            <CampoCheck control={control} name="excluidoDeDescuentos" label="Excluido de descuentos" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary-action" isLoading={isSubmitting}>
            {editando ? 'Guardar cambios' : 'Crear combo'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
