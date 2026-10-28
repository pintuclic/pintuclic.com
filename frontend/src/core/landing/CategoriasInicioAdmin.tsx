'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ImageOff, Pencil, Upload } from 'lucide-react';
import { Alert, Button, Modal, PuntoEnfoque, Skeleton } from '../components';
import { mensajeDeError } from '../utils/errorApi';
import { FOCO_CENTRO, posicionDeFoco, type FocoImagen } from '../utils/foco-imagen';
import type { TipoMimeBannerInicio } from './landing-banners-api';
import {
  landingCategoriasAdminApi,
  landingCategoriasPublicoApi,
  type CategoriaInicioAdmin,
} from './landing-categorias-api';

const TIPOS_PERMITIDOS: ReadonlySet<string> = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAXIMO_BYTES = 5 * 1024 * 1024;
/** La tarjeta del inicio mide 234 × 164. */
const PROPORCION_TARJETA = 234 / 164;

interface Edicion {
  categoria: CategoriaInicioAdmin;
  foco: FocoImagen;
  /** Imagen nueva elegida (data URL para verla) y lo que se envía; sin ella se edita solo el enfoque de la actual. */
  nueva: { vista: string; base64: string; mime: TipoMimeBannerInicio; nombre: string } | null;
}

const urlActual = (c: CategoriaInicioAdmin): string =>
  landingCategoriasPublicoApi.urlImagen(c.idCategoria, c.fechaActualizacion ?? '0');

/**
 * Imágenes de las tarjetas de «Explora nuestras categorías» del inicio (FP-01 · C1–C6): una por categoría del catálogo, de
 * cualquier forma y tamaño, con el punto de enfoque que decide qué parte se ve al recortarla. Sin imagen, la tarjeta usa
 * su ilustración de siempre.
 */
export function CategoriasInicioAdmin() {
  const [categorias, setCategorias] = useState<CategoriaInicioAdmin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setCategorias(await landingCategoriasAdminApi.listar());
      setError(null);
    } catch (err: unknown) {
      setError(mensajeDeError(err));
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const abrir = (categoria: CategoriaInicioAdmin) => {
    setErrorForm(null);
    setEdicion({ categoria, foco: { x: categoria.focoX, y: categoria.focoY }, nueva: null });
  };

  const elegirArchivo = (evento: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    if (!TIPOS_PERMITIDOS.has(archivo.type)) {
      setErrorForm('Formato no permitido. Usa una imagen PNG, JPG o WEBP.');
      return;
    }
    if (archivo.size > MAXIMO_BYTES) {
      setErrorForm('La imagen supera el tamaño máximo permitido de 5 MB.');
      return;
    }
    const lector = new FileReader();
    lector.onload = () => {
      const resultado = typeof lector.result === 'string' ? lector.result : '';
      const coma = resultado.indexOf(',');
      setErrorForm(null);
      setEdicion((previa) =>
        previa === null
          ? previa
          : {
              ...previa,
              foco: FOCO_CENTRO,
              nueva: {
                vista: resultado,
                base64: coma >= 0 ? resultado.slice(coma + 1) : resultado,
                mime: archivo.type as TipoMimeBannerInicio,
                nombre: archivo.name,
              },
            },
      );
    };
    lector.readAsDataURL(archivo);
  };

  const guardar = async () => {
    if (edicion === null) return;
    setGuardando(true);
    setErrorForm(null);
    try {
      await landingCategoriasAdminApi.guardar(edicion.categoria.idCategoria, {
        focoX: edicion.foco.x,
        focoY: edicion.foco.y,
        ...(edicion.nueva === null ? {} : { imagenBase64: edicion.nueva.base64, imagenMimeType: edicion.nueva.mime }),
      });
      setExito(`Imagen de «${edicion.categoria.nombre}» guardada: ya se ve en el inicio.`);
      setEdicion(null);
      await cargar();
    } catch (err: unknown) {
      setErrorForm(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async () => {
    if (edicion === null) return;
    setGuardando(true);
    try {
      await landingCategoriasAdminApi.quitar(edicion.categoria.idCategoria);
      setExito(`«${edicion.categoria.nombre}» volvió a su ilustración por defecto.`);
      setEdicion(null);
      await cargar();
    } catch (err: unknown) {
      setErrorForm(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const imagenDelModal = edicion === null ? null : (edicion.nueva?.vista ?? (edicion.categoria.tieneImagen ? urlActual(edicion.categoria) : null));

  return (
    <section aria-labelledby="titulo-categorias-inicio" className="mt-10 space-y-4">
      <div>
        <h2 id="titulo-categorias-inicio" className="font-title text-xl font-semibold text-corporate">
          Tarjetas de categorías
        </h2>
        <p className="font-sans text-sm text-neutral-medium">
          La imagen de cada tarjeta de «Explora nuestras categorías» en el inicio. Sin imagen propia se ve la ilustración por defecto.
        </p>
      </div>

      {exito !== null && <Alert variant="success">{exito}</Alert>}
      {error !== null && <Alert variant="error">{error}</Alert>}

      {categorias === null && error === null ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {categorias?.map((c) => (
            <li key={c.idCategoria} className="overflow-hidden rounded-card border border-neutral-light bg-neutral-white shadow-card">
              <div className="relative aspect-[234/164] bg-neutral-lightest">
                {c.tieneImagen ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={urlActual(c)} alt={`Imagen de la categoría ${c.nombre}`} className="h-full w-full object-cover" style={{ objectPosition: posicionDeFoco({ x: c.focoX, y: c.focoY }) }} />
                ) : (
                  <span className="flex h-full flex-col items-center justify-center gap-1 text-neutral-medium">
                    <ImageOff className="h-6 w-6" aria-hidden="true" />
                    <span className="font-sans text-xs">Ilustración por defecto</span>
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 p-3">
                <p className="truncate font-title text-sm font-semibold text-neutral-black">{c.nombre}</p>
                <Button variant="outline" size="sm" leftIcon={<Pencil className="h-4 w-4" aria-hidden="true" />} onClick={() => abrir(c)} aria-label={`Editar la imagen de ${c.nombre}`}>
                  Editar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal isOpen={edicion !== null} onClose={() => setEdicion(null)} title={edicion === null ? '' : `Imagen de «${edicion.categoria.nombre}»`} size="lg">
        {edicion !== null && (
          <div className="space-y-4">
            {errorForm !== null && <Alert variant="error">{errorForm}</Alert>}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-neutral-light bg-neutral-lightest p-4">
              <p className="font-sans text-xs text-neutral-medium">
                PNG, JPG o WEBP (máximo 5 MB), de cualquier forma y tamaño. Marque abajo qué parte debe verse.
              </p>
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-btn bg-action px-4 py-2 font-title text-sm font-medium text-neutral-white transition-colors hover:bg-action-hover">
                <Upload className="h-4 w-4" aria-hidden="true" />
                <span>{imagenDelModal === null ? 'Seleccionar imagen' : 'Cambiar imagen'}</span>
                <input type="file" aria-label="Seleccionar imagen de la tarjeta" accept="image/png,image/jpeg,image/webp" onChange={elegirArchivo} className="sr-only" />
              </label>
            </div>
            {edicion.nueva !== null && (
              <p className="font-sans text-xs text-conversion-hover">
                Archivo seleccionado: <strong>{edicion.nueva.nombre}</strong>
              </p>
            )}

            {imagenDelModal !== null && (
              <PuntoEnfoque
                src={imagenDelModal}
                proporcion={PROPORCION_TARJETA}
                foco={edicion.foco}
                onChange={(foco) => setEdicion((previa) => (previa === null ? previa : { ...previa, foco }))}
                nombre="de la tarjeta"
                anchoVista="max-w-xs"
              />
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-light pt-4">
              {edicion.categoria.tieneImagen ? (
                <Button variant="outline" onClick={() => void quitar()} disabled={guardando}>
                  Quitar imagen
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEdicion(null)} disabled={guardando}>
                  Cancelar
                </Button>
                <Button variant="primary-action" onClick={() => void guardar()} isLoading={guardando} disabled={imagenDelModal === null}>
                  Guardar
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
