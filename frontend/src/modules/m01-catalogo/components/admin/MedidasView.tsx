'use client';

import React, { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Power, RotateCcw } from 'lucide-react';
import { Alert, Button, FileInput, Input, Modal, Select } from '@/core/components';
import type { Medida, TipoMedida } from '../../dtos/m01-catalogo.dto';
import {
  formMedidaSchema,
  formTipoMedidaSchema,
  type FormMedida,
  type FormTipoMedida,
} from '../../dtos/formularios.dto';
import { useCargar } from '../../hooks/useCargar';
import { leerImagen, validarImagen } from '../../services/archivos';
import { imagenMedidaApi, medidasApi, tiposMedidaApi } from '../../services/catalogo-api';
import { aCuerpoMedida, aCuerpoTipoMedida } from '../../services/formularios';
import { leerErrorCatalogo } from '../../services/mensaje-error';
import { SelectorBuscable } from './campos';
import {
  AvisoAccion,
  Cargando,
  EstadoBadge,
  MensajeVacio,
  ModalDesactivar,
  Paginador,
  reactivar,
  type Aviso,
} from './comunes';

const ModalTipo: React.FC<{ tipo: TipoMedida | null; onClose: () => void; onGuardado: (t: string) => void }> = ({
  tipo,
  onClose,
  onGuardado,
}) => {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormTipoMedida>({
    resolver: zodResolver(formTipoMedidaSchema),
    defaultValues: {
      nombre: tipo?.nombre ?? '',
      abreviatura: tipo?.abreviatura ?? '',
      equivalenciaGalones: tipo?.equivalenciaGalones == null ? '' : String(tipo.equivalenciaGalones),
    },
  });
  const enviar = handleSubmit(async (valores) => {
    setError(null);
    try {
      const cuerpo = aCuerpoTipoMedida(valores);
      if (tipo === null) await tiposMedidaApi.crear(cuerpo);
      else await tiposMedidaApi.editar(tipo.idTipoMedida, cuerpo);
      onGuardado(tipo === null ? 'Tipo de medida creado.' : 'Tipo de medida actualizado.');
      onClose();
    } catch (err: unknown) {
      setError(leerErrorCatalogo(err, 'No se pudo guardar.').message);
    }
  });
  return (
    <Modal
      isOpen
      closeOnOutsideClick={false}
      onClose={onClose}
      title={tipo === null ? 'Nuevo tipo de medida' : 'Editar tipo de medida'}
      size="md"
    >
      <form onSubmit={(e) => void enviar(e)} noValidate className="space-y-4 py-2">
        {error !== null && <Alert variant="error">{error}</Alert>}
        <Input label="Nombre" {...register('nombre')} error={errors.nombre?.message} autoFocus />
        <Input
          label="Abreviatura"
          {...register('abreviatura')}
          error={errors.abreviatura?.message}
          helperText="Aparece en el nombre de la medida: “3.78 L”."
        />
        <Input
          label="Galones por unidad"
          inputMode="decimal"
          {...register('equivalenciaGalones')}
          error={errors.equivalenciaGalones?.message}
          helperText="Galón = 1, litro = 0.264172, mililitro = 0.000264172. Déjelo vacío si no es de volumen: así no se calcula el rendimiento por presentación."
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

const ModalMedida: React.FC<{
  medida: Medida | null;
  tipos: TipoMedida[];
  onClose: () => void;
  onGuardada: (t: string) => void;
}> = ({ medida, tipos, onClose, onGuardada }) => {
  const [error, setError] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [quitarImagen, setQuitarImagen] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormMedida>({
    resolver: zodResolver(formMedidaSchema),
    defaultValues: {
      idTipoMedida: medida === null ? '' : String(medida.idTipoMedida),
      valor: medida === null ? '' : String(medida.valor),
    },
  });
  const idTipoMedida = watch('idTipoMedida');

  const elegirArchivo = (nuevo: File | null) => {
    setArchivo(nuevo);
    setErrorArchivo(nuevo === null ? null : validarImagen(nuevo));
    if (nuevo !== null) setQuitarImagen(false);
  };

  const enviar = handleSubmit(async (valores) => {
    setError(null);
    if (archivo !== null && validarImagen(archivo) !== null) return;
    try {
      const cuerpo = aCuerpoMedida(valores);
      const guardada =
        medida === null
          ? await medidasApi.crear(cuerpo)
          : await medidasApi.editar(medida.idMedida, { idTipoMedida: cuerpo.idTipoMedida, valor: cuerpo.valor });
      if (archivo !== null) await imagenMedidaApi.reemplazar(guardada.idMedida, await leerImagen(archivo));
      else if (quitarImagen && guardada.tieneImagen) await imagenMedidaApi.quitar(guardada.idMedida);
      onGuardada(medida === null ? 'Medida creada.' : 'Medida actualizada.');
      onClose();
    } catch (err: unknown) {
      setError(leerErrorCatalogo(err, 'No se pudo guardar la medida.').message);
    }
  });
  const imagenActual = medida?.tieneImagen === true && !quitarImagen && archivo === null;

  return (
    <Modal
      isOpen
      closeOnOutsideClick={false}
      onClose={onClose}
      title={medida === null ? 'Nueva medida' : `Editar ${medida.nombre}`}
      size="md"
    >
      <form onSubmit={(e) => void enviar(e)} noValidate className="space-y-4 py-2">
        {error !== null && <Alert variant="error">{error}</Alert>}
        <SelectorBuscable
          label="Tipo de medida"
          value={idTipoMedida}
          onChange={(v) => setValue('idTipoMedida', v, { shouldValidate: true })}
          options={tipos
            .filter((t) => t.estado === 'activo' || t.idTipoMedida === medida?.idTipoMedida)
            .map((t) => ({ value: String(t.idTipoMedida), label: `${t.nombre} (${t.abreviatura})` }))}
          error={errors.idTipoMedida?.message}
          helperText={
            medida !== null ? 'Si cambia el tipo, el nombre generado se recalcula con su abreviatura.' : undefined
          }
        />
        <Input
          label="Valor"
          inputMode="decimal"
          {...register('valor')}
          error={errors.valor?.message}
          helperText="Por ejemplo 3.78 o 0.25. El nombre se genera: “0.25 gal”."
        />
        <div className="space-y-2">
          {imagenActual && medida !== null && (
            <div className="flex items-center gap-3 rounded-card border border-neutral-light bg-neutral-lightest p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagenMedidaApi.url(medida.idMedida)}
                alt={`Imagen de ${medida.nombre}`}
                className="h-16 w-16 object-contain"
              />
              <Button variant="ghost" size="sm" onClick={() => setQuitarImagen(true)}>
                Quitar imagen
              </Button>
            </div>
          )}
          {quitarImagen && <p className="font-sans text-xs text-neutral-medium">La imagen se quitará al guardar.</p>}
          <FileInput
            label={medida?.tieneImagen === true ? 'Reemplazar imagen (opcional)' : 'Imagen de la medida (opcional)'}
            accept="image/jpeg,image/png,image/webp"
            value={archivo}
            onChange={elegirArchivo}
            helperText="Por ejemplo la silueta del envase; se muestra junto a la galería del producto. JPEG, PNG o WebP de hasta 5 MB."
            {...(errorArchivo !== null ? { error: errorArchivo } : {})}
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

/** HU-CAT-03 (medidas) y HU-CAT-12: tipos de medida con su equivalencia en galones, y medidas vendibles. */
export const MedidasView: React.FC = () => {
  const cargarTipos = useCallback(() => tiposMedidaApi.listar(), []);
  const tipos = useCargar(cargarTipos, 'No se pudieron cargar los tipos de medida.');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [pagina, setPagina] = useState(1);
  const cargarMedidas = useCallback(
    () => medidasApi.listar({ idTipoMedida: filtroTipo === '' ? undefined : Number(filtroTipo), pagina, limite: 15 }),
    [filtroTipo, pagina],
  );
  const medidas = useCargar(cargarMedidas, 'No se pudieron cargar las medidas.');
  const [modalTipo, setModalTipo] = useState<{ tipo: TipoMedida | null } | null>(null);
  const [modalMedida, setModalMedida] = useState<{ medida: Medida | null } | null>(null);
  const [tipoADesactivar, setTipoADesactivar] = useState<TipoMedida | null>(null);
  const [medidaADesactivar, setMedidaADesactivar] = useState<Medida | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);
  const exito = (texto: string) => setAviso({ tipo: 'success', texto });
  const fallo = (texto: string) => setAviso({ tipo: 'error', texto });
  const listaTipos = tipos.datos ?? [];
  const nombreTipo = (id: number) => listaTipos.find((t) => t.idTipoMedida === id)?.nombre ?? '';

  return (
    <div className="space-y-8">
      <AvisoAccion aviso={aviso} onCerrar={cerrarAviso} />

      <section aria-labelledby="titulo-tipos-medida" className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="titulo-tipos-medida" className="font-title text-lg font-semibold text-corporate">
              Tipos de medida
            </h2>
            <p className="font-sans text-sm text-neutral-medium">
              Galón, litro, pulgada, metro… con los galones que equivale cada unidad.
            </p>
          </div>
          <Button
            variant="primary-action"
            leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            onClick={() => setModalTipo({ tipo: null })}
          >
            Nuevo tipo
          </Button>
        </div>
        {tipos.error !== null && <Alert variant="error">{tipos.error}</Alert>}
        {tipos.cargando && tipos.datos === null && <Cargando />}
        {tipos.datos !== null && tipos.datos.length === 0 && <MensajeVacio>Aún no hay tipos de medida.</MensajeVacio>}
        {listaTipos.length > 0 && (
          <div className="overflow-x-auto rounded-card border border-neutral-light bg-neutral-white">
            <table className="w-full min-w-[480px] text-left font-sans text-sm">
              <caption className="sr-only">Tipos de medida</caption>
              <thead className="bg-neutral-lightest text-xs uppercase tracking-wide text-neutral-medium">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Nombre
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Abreviatura
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Galones por unidad
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
                {listaTipos.map((t) => (
                  <tr key={t.idTipoMedida}>
                    <td className="px-4 py-3 text-neutral-black">{t.nombre}</td>
                    <td className="px-4 py-3">{t.abreviatura}</td>
                    <td className="px-4 py-3">{t.equivalenciaGalones ?? '—'}</td>
                    <td className="px-4 py-3">
                      <EstadoBadge estado={t.estado} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Editar ${t.nombre}`}
                          onClick={() => setModalTipo({ tipo: t })}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        {t.estado === 'activo' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Desactivar ${t.nombre}`}
                            onClick={() => setTipoADesactivar(t)}
                          >
                            <Power className="h-4 w-4 text-danger" aria-hidden="true" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Reactivar ${t.nombre}`}
                            onClick={() =>
                              void reactivar(
                                () =>
                                  tiposMedidaApi.cambiarEstado(t.idTipoMedida, { estado: 'activo', confirmar: false }),
                                () => {
                                  exito(`Se reactivó ${t.nombre}.`);
                                  tipos.recargar();
                                },
                                fallo,
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
      </section>

      <section aria-labelledby="titulo-medidas" className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="titulo-medidas" className="font-title text-lg font-semibold text-corporate">
              Medidas
            </h2>
            <p className="font-sans text-sm text-neutral-medium">
              Valor + tipo. Las variantes de los productos eligen entre estas medidas.
            </p>
          </div>
          <Button
            variant="primary-action"
            leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            onClick={() => setModalMedida({ medida: null })}
          >
            Nueva medida
          </Button>
        </div>
        <div className="max-w-xs">
          <Select
            label="Filtrar por tipo"
            value={filtroTipo}
            onChange={(e) => {
              setFiltroTipo(e.target.value);
              setPagina(1);
            }}
            options={[
              { value: '', label: 'Todos' },
              ...listaTipos.map((t) => ({ value: String(t.idTipoMedida), label: t.nombre })),
            ]}
          />
        </div>
        {medidas.error !== null && <Alert variant="error">{medidas.error}</Alert>}
        {medidas.cargando && medidas.datos === null && <Cargando />}
        {medidas.datos !== null && medidas.datos.items.length === 0 && (
          <MensajeVacio>No hay medidas con ese filtro.</MensajeVacio>
        )}
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {medidas.datos?.items.map((m) => (
            <li
              key={m.idMedida}
              className="flex items-center justify-between gap-2 rounded-card border border-neutral-light bg-neutral-white px-4 py-3"
            >
              <span className="flex items-center gap-2 font-sans text-sm text-neutral-black">
                {m.tieneImagen && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagenMedidaApi.url(m.idMedida)}
                    alt=""
                    className="h-8 w-8 shrink-0 object-contain"
                    loading="lazy"
                  />
                )}
                <span>
                  {m.nombre} <span className="text-xs text-neutral-medium">{nombreTipo(m.idTipoMedida)}</span>{' '}
                  <EstadoBadge estado={m.estado} />
                </span>
              </span>
              <span className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Editar ${m.nombre}`}
                  onClick={() => setModalMedida({ medida: m })}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
                {m.estado === 'activo' ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Desactivar ${m.nombre}`}
                    onClick={() => setMedidaADesactivar(m)}
                  >
                    <Power className="h-4 w-4 text-danger" aria-hidden="true" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Reactivar ${m.nombre}`}
                    onClick={() =>
                      void reactivar(
                        () => medidasApi.cambiarEstado(m.idMedida, { estado: 'activo', confirmar: false }),
                        () => {
                          exito(`Se reactivó ${m.nombre}.`);
                          medidas.recargar();
                        },
                        fallo,
                      )
                    }
                  >
                    <RotateCcw className="h-4 w-4 text-conversion" aria-hidden="true" />
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
        {medidas.datos !== null && <Paginador paginacion={medidas.datos.paginacion} onCambiar={setPagina} />}
      </section>

      {modalTipo !== null && (
        <ModalTipo
          tipo={modalTipo.tipo}
          onClose={() => setModalTipo(null)}
          onGuardado={(t) => {
            exito(t);
            tipos.recargar();
          }}
        />
      )}
      {modalMedida !== null && (
        <ModalMedida
          medida={modalMedida.medida}
          tipos={listaTipos}
          onClose={() => setModalMedida(null)}
          onGuardada={(t) => {
            exito(t);
            medidas.recargar();
          }}
        />
      )}
      <ModalDesactivar
        objetivo={
          tipoADesactivar === null ? null : { id: tipoADesactivar.idTipoMedida, nombre: tipoADesactivar.nombre }
        }
        queEs="el tipo de medida"
        obtenerImpacto={tiposMedidaApi.impacto}
        desactivar={(id, confirmar) => tiposMedidaApi.cambiarEstado(id, { estado: 'inactivo', confirmar })}
        onClose={() => setTipoADesactivar(null)}
        onHecho={() => {
          exito('Tipo de medida desactivado.');
          tipos.recargar();
          medidas.recargar();
        }}
      />
      <ModalDesactivar
        objetivo={
          medidaADesactivar === null ? null : { id: medidaADesactivar.idMedida, nombre: medidaADesactivar.nombre }
        }
        queEs="la medida"
        obtenerImpacto={medidasApi.impacto}
        desactivar={(id, confirmar) => medidasApi.cambiarEstado(id, { estado: 'inactivo', confirmar })}
        onClose={() => setMedidaADesactivar(null)}
        onHecho={() => {
          exito('Medida desactivada.');
          medidas.recargar();
        }}
      />
    </div>
  );
};
