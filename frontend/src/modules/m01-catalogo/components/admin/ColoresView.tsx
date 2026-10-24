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
        <div className="overflow-x-auto rounded-card border border-neutral-light bg-neutral-white">
          <table className="w-full min-w-[720px] text-left font-sans text-sm">
            <caption className="sr-only">Colores</caption>
            <thead className="bg-neutral-lightest text-xs uppercase tracking-wide text-neutral-medium">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Color
                </th>
                <th scope="col" className="px-4 py-3">
                  Marca
                </th>
                <th scope="col" className="px-4 py-3">
                  Base
                </th>
                <th scope="col" className="px-4 py-3">
                  Acabado
                </th>
                <th scope="col" className="px-4 py-3">
                  Familia
                </th>
                <th scope="col" className="px-4 py-3">
                  Estado
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-light">
              {lista.datos.items.map((c) => (
                <tr key={c.idColor}>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <Muestra hexadecimal={c.hexadecimal} etiqueta={`Muestra de ${c.nombre}`} />
                      <span>
                        <span className="block text-neutral-black">{c.nombre}</span>
                        <span className="block text-xs text-neutral-medium">
                          {c.hexadecimal}
                          {c.codigo !== null && ` · ${c.codigo}`}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3">{c.marca}</td>
                  <td className="px-4 py-3">{c.base ?? <span className="text-neutral-medium">Sin base</span>}</td>
                  <td className="px-4 py-3">{c.acabado}</td>
                  <td className="px-4 py-3">{c.familia ?? '—'}</td>
                  <td className="px-4 py-3">
                    <EstadoBadge estado={c.estado} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Editar ${c.nombre}`}
                        onClick={() => setModal({ color: c })}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      {c.estado === 'activo' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Desactivar ${c.nombre}`}
                          onClick={() => setADesactivar(c)}
                        >
                          <Power className="h-4 w-4 text-danger" aria-hidden="true" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Reactivar ${c.nombre}`}
                          onClick={() =>
                            void reactivar(
                              () => coloresApi.cambiarEstado(c.idColor, { estado: 'activo', confirmar: false }),
                              () => {
                                exito(`Se reactivó ${c.nombre}.`);
                                lista.recargar();
                              },
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
      {lista.datos !== null && <Paginador paginacion={lista.datos.paginacion} onCambiar={setPagina} />}

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
