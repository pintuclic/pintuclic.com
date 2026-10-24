'use client';

import React, { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Power, RotateCcw } from 'lucide-react';
import { Alert, Button, Input, Modal } from '@/core/components';
import type { Estado, ImpactoDesactivacion } from '../../dtos/m01-catalogo.dto';
import {
  formCatalogoSimpleSchema,
  formFamiliaColorSchema,
  type FormFamiliaColor,
  type FormSimple,
} from '../../dtos/formularios.dto';
import { useCargar } from '../../hooks/useCargar';
import { aCuerpoFamilia, aCuerpoSimple } from '../../services/formularios';
import { leerErrorCatalogo } from '../../services/mensaje-error';
import {
  AvisoAccion,
  Cargando,
  EstadoBadge,
  MensajeVacio,
  ModalDesactivar,
  Muestra,
  reactivar,
  type Aviso,
  type ObjetivoEstado,
} from './comunes';

/** Lo mínimo que tienen en común superficies, resinas, acabados, bases y familias de color. */
export interface EntidadSimple {
  nombre: string;
  estado: Estado;
  orden?: number;
  hexadecimal?: string;
}

export interface CatalogoSimpleViewProps<E extends EntidadSimple> {
  titulo: string;
  /** "la superficie", "el acabado"… para los textos. */
  articulo: string;
  descripcion: string;
  listar: () => Promise<E[]>;
  obtenerId: (e: E) => number;
  crear: (cuerpo: { nombre: string; orden?: number; hexadecimal?: string }) => Promise<unknown>;
  editar: (id: number, cuerpo: { nombre: string; orden?: number; hexadecimal?: string }) => Promise<unknown>;
  cambiarEstado: (id: number, cuerpo: { estado: Estado; confirmar: boolean }) => Promise<unknown>;
  impacto: (id: number) => Promise<ImpactoDesactivacion>;
  /** Familias de color piden además un hexadecimal de muestra. */
  conHexadecimal?: boolean;
  /** Valores del catálogo protegidos (p. ej. el acabado por defecto): no se pueden desactivar. */
  protegido?: (e: E) => boolean;
}

export interface FormularioSimpleProps {
  titulo: string;
  conHexadecimal: boolean;
  inicial: FormFamiliaColor;
  onGuardar: (valores: FormFamiliaColor) => Promise<void>;
  onClose: () => void;
}

export const FormularioSimple: React.FC<FormularioSimpleProps> = ({
  titulo,
  conHexadecimal,
  inicial,
  onGuardar,
  onClose,
}) => {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormFamiliaColor>({
    resolver: zodResolver(conHexadecimal ? formFamiliaColorSchema : formCatalogoSimpleSchema),
    defaultValues: inicial,
  });

  const enviar = handleSubmit(async (valores) => {
    setError(null);
    try {
      await onGuardar(valores);
      onClose();
    } catch (err: unknown) {
      setError(leerErrorCatalogo(err, 'No se pudo guardar.').message);
    }
  });

  return (
    <Modal isOpen onClose={onClose} title={titulo} size="md">
      <form onSubmit={(e) => void enviar(e)} noValidate className="space-y-4 py-2">
        {error !== null && <Alert variant="error">{error}</Alert>}
        <Input label="Nombre" {...register('nombre')} error={errors.nombre?.message} autoFocus />
        {conHexadecimal && (
          <Input
            label="Color de muestra (#RRGGBB)"
            {...register('hexadecimal')}
            error={errors.hexadecimal?.message}
            helperText="Se usa para pintar la muestra de la familia en el selector de color."
          />
        )}
        <Input
          label="Orden"
          inputMode="numeric"
          {...register('orden')}
          error={errors.orden?.message}
          helperText="Opcional. Los más bajos se muestran primero."
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

/**
 * Administración de un catálogo pequeño (D5: se lista completo, sin paginar): alta, edición,
 * desactivación con impacto y reactivación. Una sola vista sirve a cinco catálogos.
 */
export function CatalogoSimpleView<E extends EntidadSimple>({
  titulo,
  articulo,
  descripcion,
  listar,
  obtenerId,
  crear,
  editar,
  cambiarEstado,
  impacto,
  conHexadecimal = false,
  protegido,
}: CatalogoSimpleViewProps<E>) {
  const { datos, cargando, error, recargar } = useCargar(listar, 'No se pudo cargar el catálogo.');
  const [edicion, setEdicion] = useState<{ id: number | null; inicial: FormFamiliaColor } | null>(null);
  const [aDesactivar, setADesactivar] = useState<ObjetivoEstado | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);

  const guardar = async (valores: FormFamiliaColor) => {
    const cuerpo = conHexadecimal ? aCuerpoFamilia(valores) : aCuerpoSimple(valores as FormSimple);
    if (edicion?.id === null || edicion === null) await crear(cuerpo);
    else await editar(edicion.id, cuerpo);
    setAviso({ tipo: 'success', texto: edicion?.id === null ? `Se creó ${articulo}.` : `Se actualizó ${articulo}.` });
    recargar();
  };

  const abrirNuevo = () => setEdicion({ id: null, inicial: { nombre: '', orden: '', hexadecimal: '#' } });
  const abrirEdicion = (e: E) =>
    setEdicion({
      id: obtenerId(e),
      inicial: {
        nombre: e.nombre,
        orden: e.orden === undefined ? '' : String(e.orden),
        hexadecimal: e.hexadecimal ?? '#',
      },
    });

  return (
    <section aria-labelledby={`titulo-${titulo}`} className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={`titulo-${titulo}`} className="font-title text-lg font-semibold text-corporate">
            {titulo}
          </h2>
          <p className="font-sans text-sm text-neutral-medium">{descripcion}</p>
        </div>
        <Button
          variant="primary-action"
          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={abrirNuevo}
        >
          Nuevo
        </Button>
      </div>

      <AvisoAccion aviso={aviso} onCerrar={cerrarAviso} />
      {error !== null && <Alert variant="error">{error}</Alert>}
      {cargando && datos === null && <Cargando />}
      {datos !== null && datos.length === 0 && (
        <MensajeVacio>Aún no hay registros. Cree el primero con “Nuevo”.</MensajeVacio>
      )}

      {datos !== null && datos.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-neutral-light bg-neutral-white">
          <table className="w-full min-w-[420px] text-left font-sans text-sm">
            <caption className="sr-only">{titulo}</caption>
            <thead className="bg-neutral-lightest text-xs uppercase tracking-wide text-neutral-medium">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Nombre
                </th>
                <th scope="col" className="px-4 py-3">
                  Orden
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
              {datos.map((e) => {
                const id = obtenerId(e);
                const bloqueado = protegido?.(e) === true;
                return (
                  <tr key={id}>
                    <td className="px-4 py-3 text-neutral-black">
                      <span className="flex items-center gap-2">
                        {conHexadecimal && (
                          <Muestra hexadecimal={e.hexadecimal ?? null} etiqueta={`Muestra de ${e.nombre}`} />
                        )}
                        {e.nombre}
                        {bloqueado && <span className="text-xs text-neutral-medium">(por defecto)</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-dark">{e.orden ?? '—'}</td>
                    <td className="px-4 py-3">
                      <EstadoBadge estado={e.estado} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Editar ${e.nombre}`}
                          onClick={() => abrirEdicion(e)}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        {e.estado === 'activo' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={bloqueado}
                            aria-label={`Desactivar ${e.nombre}`}
                            onClick={() => setADesactivar({ id, nombre: e.nombre })}
                          >
                            <Power className="h-4 w-4 text-danger" aria-hidden="true" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Reactivar ${e.nombre}`}
                            onClick={() =>
                              void reactivar(
                                () => cambiarEstado(id, { estado: 'activo', confirmar: false }),
                                () => {
                                  setAviso({ tipo: 'success', texto: `Se reactivó ${e.nombre}.` });
                                  recargar();
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {edicion !== null && (
        <FormularioSimple
          titulo={edicion.id === null ? `Nuevo: ${titulo}` : `Editar ${articulo}`}
          conHexadecimal={conHexadecimal}
          inicial={edicion.inicial}
          onGuardar={guardar}
          onClose={() => setEdicion(null)}
        />
      )}
      <ModalDesactivar
        objetivo={aDesactivar}
        queEs={articulo}
        obtenerImpacto={impacto}
        desactivar={(id, confirmar) => cambiarEstado(id, { estado: 'inactivo', confirmar })}
        onClose={() => setADesactivar(null)}
        onHecho={() => {
          setAviso({ tipo: 'success', texto: `Se desactivó ${aDesactivar?.nombre ?? articulo}.` });
          recargar();
        }}
      />
    </section>
  );
}
