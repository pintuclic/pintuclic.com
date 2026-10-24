'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { Alert, Button, Checkbox, Input, Modal, Select, Textarea } from '@/core/components';
import { formProductoSchema, type FilaCaracteristica, type FormProducto } from '../../dtos/formularios.dto';
import { useCargar } from '../../hooks/useCargar';
import type { Referencias } from '../../hooks/useReferencias';
import { lineasApi, productosApi } from '../../services/catalogo-api';
import { aCuerpoProducto, aCuerpoProductoEditado, formDesdeProducto } from '../../services/formularios';
import { leerErrorCatalogo } from '../../services/mensaje-error';
import { Cargando } from './comunes';
import { ListaCheck, SelectorColoresFabrica, type ColorElegido } from './SelectoresProducto';

const VACIO: FormProducto = {
  idMarca: '',
  idLinea: '',
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
};

const conVacio = (vacio: string, lista: Array<{ value: string; label: string }>) => [
  { value: '', label: vacio },
  ...lista,
];

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

/** Cuerpo del formulario, montado cuando ya se conocen los valores iniciales. */
const Formulario: React.FC<{
  idProducto: number | null;
  referencias: Referencias;
  inicial: EstadoInicial;
  onClose: () => void;
  onGuardado: ProductoFormModalProps['onGuardado'];
}> = ({ idProducto, referencias, inicial, onClose, onGuardado }) => {
  const [error, setError] = useState<string | null>(null);
  const [superficies, setSuperficies] = useState(inicial.ids.superficies);
  const [acabados, setAcabados] = useState(inicial.ids.acabados);
  const [bases, setBases] = useState(inicial.ids.bases);
  const [colores, setColores] = useState<ColorElegido[]>(inicial.colores);
  const [caracteristicas, setCaracteristicas] = useState<FilaCaracteristica[]>(inicial.caracteristicas);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormProducto>({ resolver: zodResolver(formProductoSchema), defaultValues: inicial.form });

  const idMarca = watch('idMarca');
  const conFicha = watch('conFicha');
  const editando = idProducto !== null;

  const cargarLineas = useCallback(
    () =>
      idMarca === ''
        ? Promise.resolve(null)
        : lineasApi.listar({ idMarca: Number(idMarca), estado: 'activo', limite: 100 }),
    [idMarca],
  );
  const lineas = useCargar(cargarLineas, 'No se pudieron cargar las líneas.');

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
        onGuardado('Producto creado. Agregue sus variantes y publíquelo.', guardado.idProducto);
      }
      onClose();
    } catch (err: unknown) {
      setError(leerErrorCatalogo(err, 'No se pudo guardar el producto.').message);
    }
  });

  const subcategorias = referencias.categorias.flatMap((c) =>
    c.subcategorias
      .filter((s) => s.estado === 'activo')
      .map((s) => ({ value: String(s.idSubcategoria), label: `${c.nombre} › ${s.nombre}` })),
  );
  const cambiarFila = (indice: number, campo: keyof FilaCaracteristica, valor: string) =>
    setCaracteristicas((filas) => filas.map((f, i) => (i === indice ? { ...f, [campo]: valor } : f)));

  return (
    <form onSubmit={(e) => void enviar(e)} noValidate className="space-y-6 py-2">
      {error !== null && <Alert variant="error">{error}</Alert>}

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-title text-base font-semibold text-corporate">Datos del producto</legend>
        <Select
          label="Marca"
          disabled={editando}
          options={conVacio(
            'Elija…',
            referencias.marcas.map((m) => ({ value: String(m.idMarca), label: m.nombre })),
          )}
          {...register('idMarca')}
          error={errors.idMarca?.message}
          helperText={editando ? 'La marca de un producto no cambia.' : undefined}
        />
        <Select
          label={conFicha ? 'Línea' : 'Línea (opcional)'}
          options={conVacio(
            'Sin línea',
            (lineas.datos?.items ?? []).map((l) => ({ value: String(l.idLinea), label: l.nombre })),
          )}
          {...register('idLinea')}
          helperText={conFicha ? 'Los recubrimientos exigen línea.' : undefined}
        />
        <div className="sm:col-span-2">
          <Input label="Nombre" {...register('nombre')} error={errors.nombre?.message} />
        </div>
        <Select
          label="Subcategoría"
          options={conVacio('Elija…', subcategorias)}
          {...register('idSubcategoria')}
          error={errors.idSubcategoria?.message}
        />
        <Select
          label="Categoría complementaria (opcional)"
          options={conVacio(
            'Ninguna',
            referencias.categorias.map((c) => ({ value: String(c.idCategoria), label: c.nombre })),
          )}
          {...register('idCategoriaComplementaria')}
          helperText="Para sugerir este producto junto a otra categoría."
        />
        <div className="sm:col-span-2">
          <Textarea label="Descripción" rows={3} {...register('descripcion')} error={errors.descripcion?.message} />
        </div>
        <div className="flex flex-wrap gap-6 sm:col-span-2">
          <Checkbox label="Uso interior" {...register('usoInterior')} />
          <Checkbox label="Uso exterior" {...register('usoExterior')} />
          <Checkbox label="Patrocinado" {...register('patrocinado')} />
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
        <Checkbox label="Es un recubrimiento (pintura, estuco, barniz…)" {...register('conFicha')} />
        {conFicha ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                label="Tipo de resina"
                options={conVacio(
                  'Elija…',
                  referencias.resinas.map((r) => ({ value: String(r.idTipoResina), label: r.nombre })),
                )}
                {...register('idTipoResina')}
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
              <Input
                label="Rendimiento mín. (m²/gal)"
                inputMode="decimal"
                {...register('rendimientoMin')}
                error={errors.rendimientoMin?.message}
              />
              <Input
                label="Rendimiento máx. (m²/gal)"
                inputMode="decimal"
                {...register('rendimientoMax')}
                error={errors.rendimientoMax?.message}
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

/** HU-CAT-02, HU-CAT-10, HU-CAT-12: alta y edición de un producto con su ficha y relaciones. */
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
    <Modal isOpen onClose={onClose} title={idProducto === null ? 'Nuevo producto' : 'Editar producto'} size="xl">
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
