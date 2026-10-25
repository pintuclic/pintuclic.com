'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { Alert, Button, Input, Modal, Select, Textarea } from '@/core/components';
import { formProductoSchema, type FilaCaracteristica, type FormProducto } from '../../dtos/formularios.dto';
import { useCargar } from '../../hooks/useCargar';
import type { Referencias } from '../../hooks/useReferencias';
import { lineasApi, productosApi } from '../../services/catalogo-api';
import { aCuerpoProducto, aCuerpoProductoEditado, formDesdeProducto } from '../../services/formularios';
import { leerErrorCatalogo } from '../../services/mensaje-error';
import { CampoCheck, SelectorBuscable } from './campos';
import { Cargando } from './comunes';
import { ListaCheck, SelectorColoresFabrica, type ColorElegido } from './SelectoresProducto';

const VACIO: FormProducto = {
  idMarca: '',
  idLinea: '',
  idCategoria: '',
  idSubcategoria: '',
  nombre: '',
  descripcion: '',
  usoInterior: false,
  usoExterior: false,
  patrocinado: false,
  idCategoriaComplementaria: '',
  conFicha: true,
  idTipoResina: '',
  tipoCalidad: '',
  rendimientoMin: '',
  rendimientoMax: '',
  manos: '',
};

export interface ProductoFormModalProps {
  /** null = producto nuevo. */
  idProducto: number | null;
  referencias: Referencias;
  idMarcaInicial: string;
  onClose: () => void;
  onGuardado: (texto: string, idProducto: number) => void;
}

interface EstadoInicial {
  form: FormProducto;
  ids: { superficies: number[]; acabados: number[]; bases: number[] };
  colores: ColorElegido[];
  caracteristicas: FilaCaracteristica[];
}

const INICIAL: EstadoInicial = {
  form: VACIO,
  ids: { superficies: [], acabados: [], bases: [] },
  colores: [],
  caracteristicas: [],
};

/** La categoría a la que pertenece una subcategoría (para precargar el formulario al editar). */
function categoriaDe(referencias: Referencias, idSubcategoria: string): string {
  const categoria = referencias.categorias.find((c) =>
    c.subcategorias.some((s) => String(s.idSubcategoria) === idSubcategoria),
  );
  return categoria === undefined ? '' : String(categoria.idCategoria);
}

/** Cuerpo del formulario, montado cuando ya se conocen los valores iniciales. */
const Formulario: React.FC<{
  idProducto: number | null;
  referencias: Referencias;
  inicial: EstadoInicial;
  onClose: () => void;
  onGuardado: ProductoFormModalProps['onGuardado'];
}> = ({ idProducto, referencias, inicial, onClose, onGuardado }) => {
  const [error, setError] = useState<string | null>(null);
  // La categoría se bloquea solo cuando salió de la subcategoría (elegida antes que ella o al editar).
  const [categoriaAutomatica, setCategoriaAutomatica] = useState(inicial.form.idSubcategoria !== '');
  const [superficies, setSuperficies] = useState(inicial.ids.superficies);
  const [acabados, setAcabados] = useState(inicial.ids.acabados);
  const [bases, setBases] = useState(inicial.ids.bases);
  const [colores, setColores] = useState<ColorElegido[]>(inicial.colores);
  const [caracteristicas, setCaracteristicas] = useState<FilaCaracteristica[]>(inicial.caracteristicas);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormProducto>({
    resolver: zodResolver(formProductoSchema),
    defaultValues: {
      ...inicial.form,
      idCategoria: inicial.form.idCategoria || categoriaDe(referencias, inicial.form.idSubcategoria),
    },
  });

  const idMarca = watch('idMarca');
  const idLinea = watch('idLinea');
  const idCategoria = watch('idCategoria');
  const idSubcategoria = watch('idSubcategoria');
  const idCategoriaComplementaria = watch('idCategoriaComplementaria');
  const idTipoResina = watch('idTipoResina');
  const conFicha = watch('conFicha');
  const editando = idProducto !== null;
  const poner = (campo: keyof FormProducto, valor: string) =>
    setValue(campo, valor, { shouldValidate: true, shouldDirty: true });

  const cargarLineas = useCallback(
    () =>
      idMarca === ''
        ? Promise.resolve(null)
        : lineasApi.listar({ idMarca: Number(idMarca), estado: 'activo', limite: 100 }),
    [idMarca],
  );
  const lineas = useCargar(cargarLineas, 'No se pudieron cargar las líneas.');

  // Categoría y subcategoría: con categoría elegida solo salen sus subcategorías; si se elige primero una
  // subcategoría, la categoría se fija a la suya y queda bloqueada hasta quitar la subcategoría.
  const opcionesSubcategoria = useMemo(
    () =>
      referencias.categorias
        .filter((c) => idCategoria === '' || String(c.idCategoria) === idCategoria)
        .flatMap((c) =>
          c.subcategorias
            .filter((s) => s.estado === 'activo')
            .map((s) => ({
              value: String(s.idSubcategoria),
              label: s.nombre,
              detalle: idCategoria === '' ? c.nombre : '',
            })),
        )
        .map((o) => (o.detalle === '' ? { value: o.value, label: o.label } : o)),
    [referencias.categorias, idCategoria],
  );
  const elegirSubcategoria = (valor: string) => {
    poner('idSubcategoria', valor);
    if (valor === '') {
      setCategoriaAutomatica(false);
      return;
    }
    if (idCategoria === '') setCategoriaAutomatica(true);
    poner('idCategoria', categoriaDe(referencias, valor));
  };
  const elegirCategoria = (valor: string) => {
    poner('idCategoria', valor);
    // Una subcategoría de otra categoría ya no corresponde.
    if (idSubcategoria !== '' && categoriaDe(referencias, idSubcategoria) !== valor) poner('idSubcategoria', '');
  };

  const enviar = handleSubmit(async (valores) => {
    setError(null);
    const relaciones = {
      idsSuperficies: superficies,
      idsAcabados: acabados,
      idsBases: bases,
      idsColoresFabrica: colores.map((c) => c.id),
      caracteristicas,
    };
    try {
      if (editando) {
        const r = aCuerpoProductoEditado(valores, relaciones);
        if (!r.ok) return setError(r.mensaje);
        const guardado = await productosApi.editar(idProducto, r.valor);
        onGuardado('Producto actualizado.', guardado.idProducto);
      } else {
        const r = aCuerpoProducto(valores, relaciones);
        if (!r.ok) return setError(r.mensaje);
        const guardado = await productosApi.crear(r.valor);
        onGuardado(
          'Producto creado. Agregue ahora sus imágenes y variantes para poder publicarlo.',
          guardado.idProducto,
        );
      }
      onClose();
    } catch (err: unknown) {
      setError(leerErrorCatalogo(err, 'No se pudo guardar el producto.').message);
    }
  });

  const cambiarFila = (indice: number, campo: keyof FilaCaracteristica, valor: string) =>
    setCaracteristicas((filas) => filas.map((f, i) => (i === indice ? { ...f, [campo]: valor } : f)));

  return (
    <form onSubmit={(e) => void enviar(e)} noValidate className="space-y-6 py-2">
      {error !== null && <Alert variant="error">{error}</Alert>}

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-title text-base font-semibold text-corporate">Datos del producto</legend>
        <SelectorBuscable
          label="Marca"
          value={idMarca}
          onChange={(v) => {
            poner('idMarca', v);
            poner('idLinea', '');
          }}
          options={referencias.marcas.map((m) => ({ value: String(m.idMarca), label: m.nombre }))}
          disabled={editando}
          error={errors.idMarca?.message}
          helperText={editando ? 'La marca de un producto no cambia.' : undefined}
        />
        <SelectorBuscable
          label={conFicha ? 'Línea' : 'Línea (opcional)'}
          value={idLinea}
          onChange={(v) => poner('idLinea', v)}
          options={(lineas.datos?.items ?? []).map((l) => ({ value: String(l.idLinea), label: l.nombre }))}
          placeholder={idMarca === '' ? 'Elija primero la marca' : 'Elija…'}
          disabled={idMarca === ''}
          textoSinElegir={conFicha ? undefined : 'Sin línea'}
          error={errors.idLinea?.message}
          helperText={conFicha ? 'Los recubrimientos exigen línea.' : undefined}
        />
        <div className="sm:col-span-2">
          <Input label="Nombre" {...register('nombre')} error={errors.nombre?.message} />
        </div>
        <SelectorBuscable
          label="Categoría"
          value={idCategoria}
          onChange={elegirCategoria}
          options={referencias.categorias
            .filter((c) => c.estado === 'activo')
            .map((c) => ({ value: String(c.idCategoria), label: c.nombre }))}
          disabled={categoriaAutomatica}
          helperText={
            categoriaAutomatica
              ? 'Se fijó con la subcategoría. Quite la subcategoría para cambiarla.'
              : 'Opcional: filtra las subcategorías.'
          }
        />
        <SelectorBuscable
          label="Subcategoría"
          value={idSubcategoria}
          onChange={elegirSubcategoria}
          options={opcionesSubcategoria}
          textoSinElegir="Sin elegir"
          error={errors.idSubcategoria?.message}
        />
        <SelectorBuscable
          label="Categoría complementaria (opcional)"
          value={idCategoriaComplementaria}
          onChange={(v) => poner('idCategoriaComplementaria', v)}
          options={referencias.categorias
            .filter((c) => c.estado === 'activo')
            .map((c) => ({ value: String(c.idCategoria), label: c.nombre }))}
          textoSinElegir="Ninguna"
          helperText="De esta categoría se sugieren productos en la ficha de este producto."
        />
        <div className="sm:col-span-2">
          <Textarea label="Descripción" rows={3} {...register('descripcion')} error={errors.descripcion?.message} />
        </div>
        <div className="flex flex-wrap gap-6 sm:col-span-2">
          <CampoCheck control={control} name="usoInterior" label="Uso interior" />
          <CampoCheck control={control} name="usoExterior" label="Uso exterior" />
          <CampoCheck control={control} name="patrocinado" label="Patrocinado" />
        </div>
      </fieldset>

      <ListaCheck
        titulo="Superficies donde se aplica"
        opciones={referencias.superficies.map((s) => ({ id: s.idSuperficie, nombre: s.nombre }))}
        seleccionados={superficies}
        onChange={setSuperficies}
        vacio="Aún no hay superficies. Créelas en la sección Atributos."
      />

      <fieldset className="space-y-4 rounded-card border border-neutral-light p-4">
        <legend className="px-1 font-title text-base font-semibold text-corporate">Ficha de recubrimiento</legend>
        <CampoCheck control={control} name="conFicha" label="Es un recubrimiento (pintura, estuco, barniz…)" />
        {conFicha ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectorBuscable
                label="Tipo de resina"
                value={idTipoResina}
                onChange={(v) => poner('idTipoResina', v)}
                options={referencias.resinas.map((r) => ({ value: String(r.idTipoResina), label: r.nombre }))}
                error={errors.idTipoResina?.message}
              />
              <Select
                label="Tipo de calidad"
                options={[
                  { value: '', label: 'Sin definir' },
                  { value: '1', label: 'Tipo 1 (gama alta)' },
                  { value: '2', label: 'Tipo 2' },
                  { value: '3', label: 'Tipo 3' },
                ]}
                {...register('tipoCalidad')}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Rendimiento mínimo (m² por galón)"
                inputMode="decimal"
                {...register('rendimientoMin')}
                error={errors.rendimientoMin?.message}
              />
              <Input
                label="Rendimiento máximo (m² por galón)"
                inputMode="decimal"
                {...register('rendimientoMax')}
                error={errors.rendimientoMax?.message}
              />
              <Input
                label="Manos de aplicación"
                inputMode="numeric"
                {...register('manos')}
                error={errors.manos?.message}
                helperText="Ejemplo: 35 m² por galón a 2 manos."
              />
            </div>
            <ListaCheck
              titulo="Acabados"
              ayuda="Con los acabados y las bases se arma la carta de colores entonables del producto."
              opciones={referencias.acabados.map((a) => ({ id: a.idAcabado, nombre: a.nombre }))}
              seleccionados={acabados}
              onChange={setAcabados}
              vacio="Aún no hay acabados."
            />
            <ListaCheck
              titulo="Bases (si el producto es entonable)"
              opciones={referencias.bases.map((b) => ({ id: b.idBase, nombre: b.nombre }))}
              seleccionados={bases}
              onChange={setBases}
              vacio="Aún no hay bases."
            />
            <SelectorColoresFabrica
              idMarca={idMarca === '' ? null : Number(idMarca)}
              elegidos={colores}
              onChange={setColores}
            />
          </>
        ) : (
          <p className="font-sans text-xs text-neutral-medium">
            Herramientas y accesorios no llevan ficha, acabados, bases ni colores de fábrica.
          </p>
        )}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-title text-base font-semibold text-corporate">Características técnicas</legend>
        {caracteristicas.map((c, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
            <Input label="Nombre" value={c.nombre} onChange={(e) => cambiarFila(i, 'nombre', e.target.value)} />
            <Input label="Valor" value={c.valor} onChange={(e) => cambiarFila(i, 'valor', e.target.value)} />
            <Button
              variant="ghost"
              aria-label={`Quitar característica ${i + 1}`}
              onClick={() => setCaracteristicas((f) => f.filter((_x, j) => j !== i))}
            >
              <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={() => setCaracteristicas((f) => [...f, { nombre: '', valor: '' }])}
        >
          Agregar característica
        </Button>
      </fieldset>

      <div className="flex justify-end gap-2 border-t border-neutral-light pt-4">
        <Button variant="outline" type="button" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="primary-action" type="submit" isLoading={isSubmitting}>
          {editando ? 'Guardar cambios' : 'Crear producto'}
        </Button>
      </div>
    </form>
  );
};

/** Alta y edición de un producto con su ficha y relaciones. */
export const ProductoFormModal: React.FC<ProductoFormModalProps> = ({
  idProducto,
  referencias,
  idMarcaInicial,
  onClose,
  onGuardado,
}) => {
  const [inicial, setInicial] = useState<EstadoInicial | null>(
    idProducto === null ? { ...INICIAL, form: { ...VACIO, idMarca: idMarcaInicial } } : null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (idProducto === null) return;
    let vigente = true;
    productosApi
      .obtener(idProducto)
      .then((p) => {
        if (!vigente) return;
        const { form, relaciones } = formDesdeProducto(p);
        setInicial({
          form,
          ids: { superficies: relaciones.idsSuperficies, acabados: relaciones.idsAcabados, bases: relaciones.idsBases },
          colores: p.coloresFabrica.map((c) => ({ id: c.id, nombre: c.nombre, hexadecimal: null })),
          caracteristicas: relaciones.caracteristicas,
        });
      })
      .catch((err: unknown) => vigente && setError(leerErrorCatalogo(err, 'No se pudo cargar el producto.').message));
    return () => {
      vigente = false;
    };
  }, [idProducto]);

  return (
    <Modal
      isOpen
      closeOnOutsideClick={false}
      onClose={onClose}
      title={idProducto === null ? 'Nuevo producto' : 'Editar producto'}
      size="xl"
    >
      {error !== null && <Alert variant="error">{error}</Alert>}
      {inicial === null && error === null && <Cargando />}
      {inicial !== null && (
        <Formulario
          idProducto={idProducto}
          referencias={referencias}
          inicial={inicial}
          onClose={onClose}
          onGuardado={onGuardado}
        />
      )}
    </Modal>
  );
};
