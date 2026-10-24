'use client';

import React, { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileUp, Pencil, Plus, Power, RotateCcw } from 'lucide-react';
import { Alert, Button, Checkbox, Input, Modal, Select } from '@/core/components';
import { ACABADO_POR_DEFECTO } from '../../dtos/m01-catalogo.dto';
import { formColorSchema, type FormColor } from '../../dtos/formularios.dto';
import type { Color } from '../../dtos/m01-catalogo-productos.dto';
import { useCargar, useRetardo } from '../../hooks/useCargar';
import { useReferencias, type Referencias } from '../../hooks/useReferencias';
import { coloresApi } from '../../services/catalogo-api';
import { aCuerpoColor, aCuerpoColorEditado } from '../../services/formularios';
import { leerErrorCatalogo } from '../../services/mensaje-error';
import {
  AvisoAccion,
  Cargando,
  EstadoBadge,
  MensajeVacio,
  ModalDesactivar,
  Muestra,
  Paginador,
  reactivar,
  type Aviso,
} from './comunes';
import { ImportarColoresModal } from './ImportarColoresModal';

const opciones = <T,>(lista: T[], valor: (e: T) => number, texto: (e: T) => string, vacio: string) => [
  { value: '', label: vacio },
  ...lista.map((e) => ({ value: String(valor(e)), label: texto(e) })),
];

interface ModalColorProps {
  color: Color | null;
  referencias: Referencias;
  idMarcaInicial: string;
  onClose: () => void;
  onGuardado: (texto: string) => void;
}

const ModalColor: React.FC<ModalColorProps> = ({ color, referencias, idMarcaInicial, onClose, onGuardado }) => {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormColor>({
    resolver: zodResolver(formColorSchema),
    defaultValues: {
      idMarca: color === null ? idMarcaInicial : String(color.idMarca),
      nombre: color?.nombre ?? '',
      codigo: color?.codigo ?? '',
      hexadecimal: color?.hexadecimal ?? '#',
      idBase: color?.idBase == null ? '' : String(color.idBase),
      idAcabado: color === null ? '' : String(color.idAcabado),
      idFamiliaColor: color?.idFamiliaColor == null ? '' : String(color.idFamiliaColor),
    },
  });
  const hex = watch('hexadecimal');
  const muestra = /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : null;

  const enviar = handleSubmit(async (valores) => {
    setError(null);
    try {
      if (color === null) {
        const r = aCuerpoColor(valores);
        if (!r.ok) return setError(r.mensaje);
        await coloresApi.crear(r.valor);
      } else {
        const r = aCuerpoColorEditado(valores);
        if (!r.ok) return setError(r.mensaje);
        await coloresApi.editar(color.idColor, r.valor);
      }
      onGuardado(color === null ? 'Color creado.' : 'Color actualizado.');
      onClose();
    } catch (err: unknown) {
      setError(leerErrorCatalogo(err, 'No se pudo guardar el color.').message);
    }
  });

  return (
    <Modal
      isOpen
      closeOnOutsideClick={false}
      onClose={onClose}
      title={color === null ? 'Nuevo color' : `Editar ${color.nombre}`}
      size="lg"
    >
      <form onSubmit={(e) => void enviar(e)} noValidate className="space-y-4 py-2">
        {error !== null && <Alert variant="error">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Marca"
            disabled={color !== null}
            options={opciones(
              referencias.marcas,
              (m) => m.idMarca,
              (m) => m.nombre,
              'Elija…',
            )}
            {...register('idMarca')}
            error={errors.idMarca?.message}
          />
          <Input label="Nombre" {...register('nombre')} error={errors.nombre?.message} />
          <Input
            label="Código"
            {...register('codigo')}
            error={errors.codigo?.message}
            helperText="Opcional. Único dentro de la marca."
          />
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Input label="Hexadecimal (#RRGGBB)" {...register('hexadecimal')} error={errors.hexadecimal?.message} />
            </div>
            <Muestra hexadecimal={muestra} etiqueta="Vista previa del color" />
          </div>
          <Select
            label="Base"
            options={opciones(
              referencias.bases,
              (b) => b.idBase,
              (b) => b.nombre,
              'Sin base',
            )}
            {...register('idBase')}
            helperText="Opcional pero esencial: define en qué productos entonables se ofrece el color."
          />
          <Select
            label="Acabado"
            options={opciones(
              referencias.acabados,
              (a) => a.idAcabado,
              (a) => a.nombre,
              `${ACABADO_POR_DEFECTO} (por defecto)`,
            )}
            {...register('idAcabado')}
          />
          <Select
            label="Familia"
            options={opciones(
              referencias.familias,
              (f) => f.idFamiliaColor,
              (f) => f.nombre,
              color === null ? 'Calcular del color' : 'Sin familia',
            )}
            {...register('idFamiliaColor')}
            helperText="Si la deja vacía al crear, se calcula a partir del hexadecimal."
          />
        </div>
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

const Dato: React.FC<{ etiqueta: string; children: React.ReactNode }> = ({ etiqueta, children }) => (
  <div className="rounded-input bg-neutral-lightest px-3 py-2">
    <dt className="font-sans text-xs text-neutral-medium">{etiqueta}</dt>
    <dd className="font-title text-sm font-medium text-neutral-black">{children}</dd>
  </div>
);

/** Ficha de un color: todo lo que no cabe en la tarjeta, con sus acciones. */
const DetalleColorModal: React.FC<{
  color: Color;
  onClose: () => void;
  onEditar: () => void;
  onDesactivar: () => void;
  onReactivar: () => void;
}> = ({ color, onClose, onEditar, onDesactivar, onReactivar }) => (
  <Modal
    isOpen
    onClose={onClose}
    title={color.nombre}
    subtitle={color.codigo === null ? 'Sin código' : `Código ${color.codigo}`}
    size="md"
  >
    <div className="space-y-4 py-2">
      <span
        role="img"
        aria-label={`Muestra de ${color.nombre}`}
        className="block h-28 w-full rounded-card border border-neutral-light"
        style={{ backgroundColor: color.hexadecimal }}
      />
      <dl className="grid grid-cols-2 gap-2">
        <Dato etiqueta="Hexadecimal">{color.hexadecimal}</Dato>
        <Dato etiqueta="Estado">
          <EstadoBadge estado={color.estado} />
        </Dato>
        <Dato etiqueta="Marca">{color.marca}</Dato>
        <Dato etiqueta="Acabado">{color.acabado}</Dato>
        <Dato etiqueta="Base">{color.base ?? 'Sin base'}</Dato>
        <Dato etiqueta="Familia">{color.familia ?? 'Sin familia'}</Dato>
        {color.cielab !== null && (
          <Dato etiqueta="CIELAB">
            L {color.cielab.l} · a {color.cielab.a} · b {color.cielab.b}
          </Dato>
        )}
      </dl>
      {color.base === null && (
        <p className="font-sans text-xs text-neutral-medium">
          Sin base, este color solo se ofrece como color de fábrica de un producto. Asígnele una base para que salga en
          los productos entonables.
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-light pt-4">
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
        {color.estado === 'activo' ? (
          <Button
            variant="outline"
            leftIcon={<Power className="h-4 w-4 text-danger" aria-hidden="true" />}
            onClick={onDesactivar}
          >
            Desactivar
          </Button>
        ) : (
          <Button
            variant="outline"
            leftIcon={<RotateCcw className="h-4 w-4 text-conversion" aria-hidden="true" />}
            onClick={onReactivar}
          >
            Reactivar
          </Button>
        )}
        <Button
          variant="primary-action"
          leftIcon={<Pencil className="h-4 w-4" aria-hidden="true" />}
          onClick={onEditar}
        >
          Editar
        </Button>
      </div>
    </div>
  </Modal>
);

/** HU-CAT-05: colores de cada marca, con importación por bloques. */
export const ColoresView: React.FC = () => {
  const { referencias, error: errorRef } = useReferencias();
  const [idMarca, setIdMarca] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [idFamilia, setIdFamilia] = useState('');
  const [soloSinBase, setSoloSinBase] = useState(false);
  const [estado, setEstado] = useState('activo');
  const [pagina, setPagina] = useState(1);
  const termino = useRetardo(busqueda);
  const cargador = useCallback(
    () =>
      coloresApi.listar({
        idMarca: idMarca === '' ? undefined : Number(idMarca),
        busqueda: termino,
        idFamiliaColor: idFamilia === '' ? undefined : Number(idFamilia),
        sinBase: soloSinBase ? true : undefined,
        estado: estado === '' ? undefined : estado,
        pagina,
        limite: 20,
      }),
    [idMarca, termino, idFamilia, soloSinBase, estado, pagina],
  );
  const lista = useCargar(cargador, 'No se pudieron cargar los colores.');
  const [modal, setModal] = useState<{ color: Color | null } | null>(null);
  const [importando, setImportando] = useState(false);
  const [detalle, setDetalle] = useState<Color | null>(null);
  const [aDesactivar, setADesactivar] = useState<Color | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);
  const exito = (texto: string) => setAviso({ tipo: 'success', texto });
  const restablecer =
    <T,>(fijar: (v: T) => void) =>
    (v: T) => {
      fijar(v);
      setPagina(1);
    };

  return (
    <section aria-labelledby="titulo-colores" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="titulo-colores" className="font-title text-lg font-semibold text-corporate">
            Colores
          </h2>
          <p className="font-sans text-sm text-neutral-medium">
            Cada color es de una marca y lleva su hexadecimal. Con la base y el acabado se decide en qué productos se
            ofrece.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            leftIcon={<FileUp className="h-4 w-4" aria-hidden="true" />}
            onClick={() => setImportando(true)}
            disabled={referencias === null}
          >
            Importar
          </Button>
          <Button
            variant="primary-action"
            leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            onClick={() => setModal({ color: null })}
            disabled={referencias === null}
          >
            Nuevo color
          </Button>
        </div>
      </div>

      <AvisoAccion aviso={aviso} onCerrar={cerrarAviso} />
      {errorRef !== null && <Alert variant="error">{errorRef}</Alert>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="Marca"
          value={idMarca}
          onChange={(e) => restablecer(setIdMarca)(e.target.value)}
          options={opciones(
            referencias?.marcas ?? [],
            (m) => m.idMarca,
            (m) => m.nombre,
            'Todas',
          )}
        />
        <Select
          label="Familia"
          value={idFamilia}
          onChange={(e) => restablecer(setIdFamilia)(e.target.value)}
          options={opciones(
            referencias?.familias ?? [],
            (f) => f.idFamiliaColor,
            (f) => f.nombre,
            'Todas',
          )}
        />
        <Select
          label="Estado"
          value={estado}
          onChange={(e) => restablecer(setEstado)(e.target.value)}
          options={[
            { value: 'activo', label: 'Activos' },
            { value: 'inactivo', label: 'Inactivos' },
            { value: '', label: 'Todos' },
          ]}
        />
        <Input
          label="Buscar por nombre o código"
          value={busqueda}
          onChange={(e) => restablecer(setBusqueda)(e.target.value)}
        />
      </div>
      <Checkbox
        label="Solo colores sin base (por completar)"
        checked={soloSinBase}
        onChange={(e) => restablecer(setSoloSinBase)(e.target.checked)}
      />

      {lista.error !== null && <Alert variant="error">{lista.error}</Alert>}
      {lista.cargando && lista.datos === null && <Cargando />}
      {lista.datos !== null && lista.datos.items.length === 0 && (
        <MensajeVacio>No hay colores con esos filtros.</MensajeVacio>
      )}
      {lista.datos !== null && lista.datos.items.length > 0 && (
        <ul
          aria-label="Colores"
          className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] overflow-hidden rounded-card border-l border-t border-neutral-light bg-neutral-white"
        >
          {lista.datos.items.map((c) => (
            <li key={c.idColor} className="min-w-0">
              <button
                type="button"
                onClick={() => setDetalle(c)}
                aria-label={`Ver ${c.nombre}${c.codigo === null ? '' : `, código ${c.codigo}`}${c.estado === 'inactivo' ? ', inactivo' : ''}`}
                className="group block w-full border-b border-r border-neutral-light text-left focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
              >
                <span
                  className={`relative block h-20 ${c.estado === 'inactivo' ? 'opacity-40' : ''}`}
                  style={{ backgroundColor: c.hexadecimal }}
                >
                  {c.idBase === null && (
                    <span className="absolute right-1 top-1 rounded-full bg-neutral-white px-1.5 py-0.5 font-sans text-[10px] font-medium text-neutral-dark">
                      Sin base
                    </span>
                  )}
                </span>
                <span className="block px-2 py-1.5">
                  <span className="block truncate font-title text-xs font-semibold text-neutral-black group-hover:text-action">
                    {c.nombre}
                  </span>
                  <span className="block truncate font-sans text-[11px] text-neutral-medium">
                    {c.codigo ?? 'Sin código'}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {lista.datos !== null && <Paginador paginacion={lista.datos.paginacion} onCambiar={setPagina} />}

      {detalle !== null && (
        <DetalleColorModal
          color={detalle}
          onClose={() => setDetalle(null)}
          onEditar={() => {
            setModal({ color: detalle });
            setDetalle(null);
          }}
          onDesactivar={() => {
            setADesactivar(detalle);
            setDetalle(null);
          }}
          onReactivar={() =>
            void reactivar(
              () => coloresApi.cambiarEstado(detalle.idColor, { estado: 'activo', confirmar: false }),
              () => {
                exito(`Se reactivó ${detalle.nombre}.`);
                setDetalle(null);
                lista.recargar();
              },
              (texto) => {
                setAviso({ tipo: 'error', texto });
                setDetalle(null);
              },
            )
          }
        />
      )}
      {modal !== null && referencias !== null && (
        <ModalColor
          color={modal.color}
          referencias={referencias}
          idMarcaInicial={idMarca}
          onClose={() => setModal(null)}
          onGuardado={(texto) => {
            exito(texto);
            lista.recargar();
          }}
        />
      )}
      {importando && referencias !== null && (
        <ImportarColoresModal
          marcas={referencias.marcas}
          idMarcaInicial={idMarca}
          onClose={() => setImportando(false)}
          onAplicada={(texto) => {
            exito(texto);
            lista.recargar();
          }}
        />
      )}
      <ModalDesactivar
        objetivo={aDesactivar === null ? null : { id: aDesactivar.idColor, nombre: aDesactivar.nombre }}
        queEs="el color"
        obtenerImpacto={coloresApi.impacto}
        desactivar={(id, confirmar) => coloresApi.cambiarEstado(id, { estado: 'inactivo', confirmar })}
        onClose={() => setADesactivar(null)}
        onHecho={() => {
          exito('Color desactivado.');
          lista.recargar();
        }}
      />
    </section>
  );
};
