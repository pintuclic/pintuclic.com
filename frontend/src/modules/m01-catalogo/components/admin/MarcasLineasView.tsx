'use client';

import React, { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { ImagePlus, Layers, Package, Pencil, Plus, Power, RotateCcw } from 'lucide-react';
import { Alert, Button, FileInput, Input, Modal } from '@/core/components';
import type { Linea, Marca } from '../../dtos/m01-catalogo.dto';
import { formLineaSchema, formMarcaSchema, type FormLinea, type FormMarca } from '../../dtos/formularios.dto';
import { useCargar, useRetardo } from '../../hooks/useCargar';
import { enlaceProductos } from '../../services/enlaces';
import { leerLogotipo, validarLogotipo } from '../../services/archivos';
import { lineasApi, marcasApi } from '../../services/catalogo-api';
import { aCuerpoLinea, aCuerpoLineaNueva } from '../../services/formularios';
import { leerErrorCatalogo } from '../../services/mensaje-error';
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

interface ModalMarcaProps {
  marca: Marca | null;
  onClose: () => void;
  onGuardada: (texto: string) => void;
}

/** Alta (con logotipo obligatorio) y edición de una marca; en edición el logotipo se puede reemplazar. */
const ModalMarca: React.FC<ModalMarcaProps> = ({ marca, onClose, onGuardada }) => {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormMarca>({ resolver: zodResolver(formMarcaSchema), defaultValues: { nombre: marca?.nombre ?? '' } });

  const elegir = (nuevo: File | null) => {
    setArchivo(nuevo);
    setErrorArchivo(nuevo === null ? null : validarLogotipo(nuevo));
  };

  const enviar = handleSubmit(async (valores) => {
    setError(null);
    if (marca === null && archivo === null) {
      setErrorArchivo('El logotipo es obligatorio.');
      return;
    }
    if (archivo !== null && validarLogotipo(archivo) !== null) return;
    try {
      const logotipo = archivo === null ? null : await leerLogotipo(archivo);
      if (marca === null && logotipo !== null) {
        await marcasApi.crear({ nombre: valores.nombre.trim(), ...logotipo });
        onGuardada('Marca creada.');
      } else if (marca !== null) {
        if (valores.nombre.trim() !== marca.nombre)
          await marcasApi.editar(marca.idMarca, { nombre: valores.nombre.trim() });
        if (logotipo !== null) await marcasApi.reemplazarLogotipo(marca.idMarca, logotipo);
        onGuardada('Marca actualizada.');
      }
      onClose();
    } catch (err: unknown) {
      setError(leerErrorCatalogo(err, 'No se pudo guardar la marca.').message);
    }
  });

  return (
    <Modal
      isOpen
      closeOnOutsideClick={false}
      onClose={onClose}
      title={marca === null ? 'Nueva marca' : 'Editar marca'}
      size="md"
    >
      <form onSubmit={(e) => void enviar(e)} noValidate className="space-y-4 py-2">
        {error !== null && <Alert variant="error">{error}</Alert>}
        <Input label="Nombre" {...register('nombre')} error={errors.nombre?.message} autoFocus />
        <FileInput
          label={marca === null ? 'Logotipo' : 'Reemplazar logotipo (opcional)'}
          accept="image/jpeg,image/png,image/webp"
          value={archivo}
          onChange={elegir}
          helperText="JPEG, PNG o WebP de hasta 5 MB."
          {...(errorArchivo !== null ? { error: errorArchivo } : {})}
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

interface ModalLineaProps {
  marca: Marca;
  linea: Linea | null;
  onClose: () => void;
  onGuardada: (texto: string) => void;
}

const ModalLinea: React.FC<ModalLineaProps> = ({ marca, linea, onClose, onGuardada }) => {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormLinea>({
    resolver: zodResolver(formLineaSchema),
    defaultValues: { nombre: linea?.nombre ?? '', gamaComercial: linea?.gamaComercial ?? '' },
  });

  const enviar = handleSubmit(async (valores) => {
    setError(null);
    try {
      if (linea === null) await lineasApi.crear(aCuerpoLineaNueva(marca.idMarca, valores));
      else await lineasApi.editar(linea.idLinea, aCuerpoLinea(valores));
      onGuardada(linea === null ? 'Línea creada.' : 'Línea actualizada.');
      onClose();
    } catch (err: unknown) {
      setError(leerErrorCatalogo(err, 'No se pudo guardar la línea.').message);
    }
  });

  return (
    <Modal
      isOpen
      closeOnOutsideClick={false}
      onClose={onClose}
      title={linea === null ? `Nueva línea de ${marca.nombre}` : 'Editar línea'}
      size="md"
    >
      <form onSubmit={(e) => void enviar(e)} noValidate className="space-y-4 py-2">
        {error !== null && <Alert variant="error">{error}</Alert>}
        <Input label="Nombre" {...register('nombre')} error={errors.nombre?.message} autoFocus />
        <Input
          label="Gama comercial"
          {...register('gamaComercial')}
          error={errors.gamaComercial?.message}
          helperText="Opcional. Por ejemplo: Alta, Media, Económica."
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

/** HU-CAT-04 y HU-CAT-11: marcas con logotipo y las líneas de cada marca. */
export const MarcasLineasView: React.FC = () => {
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const termino = useRetardo(busqueda);
  const cargadorMarcas = useCallback(
    () => marcasApi.listar({ busqueda: termino, pagina, limite: 10 }),
    [termino, pagina],
  );
  const marcas = useCargar(cargadorMarcas, 'No se pudieron cargar las marcas.');
  const [marcaActiva, setMarcaActiva] = useState<Marca | null>(null);
  const cargadorLineas = useCallback(
    () =>
      marcaActiva === null ? Promise.resolve(null) : lineasApi.listar({ idMarca: marcaActiva.idMarca, limite: 100 }),
    [marcaActiva],
  );
  const lineas = useCargar(cargadorLineas, 'No se pudieron cargar las líneas.');
  const [modalMarca, setModalMarca] = useState<{ marca: Marca | null } | null>(null);
  const [modalLinea, setModalLinea] = useState<{ linea: Linea | null } | null>(null);
  const [marcaADesactivar, setMarcaADesactivar] = useState<Marca | null>(null);
  const [lineaADesactivar, setLineaADesactivar] = useState<Linea | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);
  const exito = (texto: string) => setAviso({ tipo: 'success', texto });
  const fallo = (texto: string) => setAviso({ tipo: 'error', texto });

  return (
    <section aria-labelledby="titulo-marcas" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="titulo-marcas" className="font-title text-lg font-semibold text-corporate">
            Marcas y líneas
          </h2>
          <p className="font-sans text-sm text-neutral-medium">
            Marca → línea → producto. Todo producto tiene marca; la línea es opcional salvo en los recubrimientos.
          </p>
        </div>
        <Button
          variant="primary-action"
          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={() => setModalMarca({ marca: null })}
        >
          Nueva marca
        </Button>
      </div>

      <AvisoAccion aviso={aviso} onCerrar={cerrarAviso} />
      <Input
        label="Buscar marca"
        value={busqueda}
        onChange={(e) => {
          setBusqueda(e.target.value);
          setPagina(1);
        }}
      />
      {marcas.error !== null && <Alert variant="error">{marcas.error}</Alert>}
      {marcas.cargando && marcas.datos === null && <Cargando />}
      {marcas.datos !== null && marcas.datos.items.length === 0 && (
        <MensajeVacio>No hay marcas con ese criterio.</MensajeVacio>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {marcas.datos?.items.map((m) => (
          <li
            key={m.idMarca}
            className={`rounded-card border bg-neutral-white p-4 ${marcaActiva?.idMarca === m.idMarca ? 'border-action' : 'border-neutral-light'}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-input bg-neutral-lightest">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={marcasApi.urlLogotipo(m.idMarca)}
                  alt={`Logotipo de ${m.nombre}`}
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-title text-sm font-semibold text-neutral-black">{m.nombre}</p>
                <EstadoBadge estado={m.estado} />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Layers className="h-4 w-4" aria-hidden="true" />}
                onClick={() => setMarcaActiva(m)}
              >
                Líneas
              </Button>
              <Link
                href={enlaceProductos({ marca: m.idMarca })}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-btn px-3 py-1.5 font-title text-xs font-medium text-action hover:bg-subaction focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
              >
                <Package className="h-4 w-4" aria-hidden="true" />
                Ver productos
              </Link>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Editar ${m.nombre}`}
                leftIcon={<ImagePlus className="h-4 w-4" aria-hidden="true" />}
                onClick={() => setModalMarca({ marca: m })}
              >
                Editar
              </Button>
              {m.estado === 'activo' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Desactivar ${m.nombre}`}
                  onClick={() => setMarcaADesactivar(m)}
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
                      () => marcasApi.cambiarEstado(m.idMarca, { estado: 'activo', confirmar: false }),
                      () => {
                        exito(`Se reactivó ${m.nombre}.`);
                        marcas.recargar();
                      },
                      fallo,
                    )
                  }
                >
                  <RotateCcw className="h-4 w-4 text-conversion" aria-hidden="true" />
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {marcas.datos !== null && <Paginador paginacion={marcas.datos.paginacion} onCambiar={setPagina} />}

      {marcaActiva !== null && (
        <div className="space-y-3 rounded-card border border-neutral-light bg-neutral-lightest p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-title text-base font-semibold text-corporate">Líneas de {marcaActiva.nombre}</h3>
            <div className="flex gap-2">
              <Button
                variant="primary-action"
                size="sm"
                disabled={marcaActiva.estado !== 'activo'}
                leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
                onClick={() => setModalLinea({ linea: null })}
              >
                Nueva línea
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setMarcaActiva(null)}>
                Cerrar
              </Button>
            </div>
          </div>
          {lineas.error !== null && <Alert variant="error">{lineas.error}</Alert>}
          {lineas.datos !== null && lineas.datos.items.length === 0 && (
            <MensajeVacio>Esta marca aún no tiene líneas.</MensajeVacio>
          )}
          <ul className="divide-y divide-neutral-light rounded-card bg-neutral-white">
            {lineas.datos?.items.map((l) => (
              <li key={l.idLinea} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span className="font-sans text-sm text-neutral-black">
                  {l.nombre}
                  {l.gamaComercial !== null && (
                    <span className="ml-2 text-xs text-neutral-medium">{l.gamaComercial}</span>
                  )}{' '}
                  <EstadoBadge estado={l.estado} />
                </span>
                <span className="flex items-center gap-1">
                  <Link
                    href={enlaceProductos({ marca: marcaActiva.idMarca, linea: l.idLinea })}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-btn px-3 py-1.5 font-title text-xs font-medium text-action hover:bg-subaction focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
                  >
                    <Package className="h-4 w-4" aria-hidden="true" />
                    Ver productos
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Editar ${l.nombre}`}
                    onClick={() => setModalLinea({ linea: l })}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  {l.estado === 'activo' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Desactivar ${l.nombre}`}
                      onClick={() => setLineaADesactivar(l)}
                    >
                      <Power className="h-4 w-4 text-danger" aria-hidden="true" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Reactivar ${l.nombre}`}
                      onClick={() =>
                        void reactivar(
                          () => lineasApi.cambiarEstado(l.idLinea, { estado: 'activo', confirmar: false }),
                          () => {
                            exito(`Se reactivó ${l.nombre}.`);
                            lineas.recargar();
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
        </div>
      )}

      {modalMarca !== null && (
        <ModalMarca
          marca={modalMarca.marca}
          onClose={() => setModalMarca(null)}
          onGuardada={(texto) => {
            exito(texto);
            marcas.recargar();
          }}
        />
      )}
      {modalLinea !== null && marcaActiva !== null && (
        <ModalLinea
          marca={marcaActiva}
          linea={modalLinea.linea}
          onClose={() => setModalLinea(null)}
          onGuardada={(texto) => {
            exito(texto);
            lineas.recargar();
          }}
        />
      )}
      <ModalDesactivar
        objetivo={marcaADesactivar === null ? null : { id: marcaADesactivar.idMarca, nombre: marcaADesactivar.nombre }}
        queEs="la marca"
        obtenerImpacto={marcasApi.impacto}
        desactivar={(id, confirmar) => marcasApi.cambiarEstado(id, { estado: 'inactivo', confirmar })}
        onClose={() => setMarcaADesactivar(null)}
        onHecho={() => {
          exito('Marca desactivada.');
          marcas.recargar();
          lineas.recargar();
        }}
      />
      <ModalDesactivar
        objetivo={lineaADesactivar === null ? null : { id: lineaADesactivar.idLinea, nombre: lineaADesactivar.nombre }}
        queEs="la línea"
        obtenerImpacto={lineasApi.impacto}
        desactivar={(id, confirmar) => lineasApi.cambiarEstado(id, { estado: 'inactivo', confirmar })}
        onClose={() => setLineaADesactivar(null)}
        onHecho={() => {
          exito('Línea desactivada.');
          lineas.recargar();
        }}
      />
    </section>
  );
};
