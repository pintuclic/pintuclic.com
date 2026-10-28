'use client';

import React, { useCallback, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, Star, Trash2 } from 'lucide-react';
import { Alert, Badge, Button, Modal, Select } from '@/core/components';
import { MAXIMO_IMAGENES_PRODUCTO, type ImagenProducto } from '../../dtos/m01-catalogo-productos.dto';
import { useCargar } from '../../hooks/useCargar';
import {
  aAsociacion,
  etiquetaDeAsociacion,
  opcionesAsociacion,
  valorDeAsociacion,
} from '../../services/asociacion-imagen';
import { leerImagen, validarImagen } from '../../services/archivos';
import { imagenesApi, productosApi } from '../../services/catalogo-api';
import { leerErrorCatalogo } from '../../services/mensaje-error';
import { AvisoAccion, Cargando, MensajeVacio, type Aviso } from './comunes';

export interface ImagenesModalProps {
  idProducto: number;
  onClose: () => void;
  /** Los cambios de la galería pueden afectar si el producto se puede publicar. */
  onCambio: () => void;
  /** Si se pasa, aparece el botón para seguir con el siguiente paso (por ejemplo las variantes). */
  textoSiguiente?: string;
  onSiguiente?: () => void;
}

/** Galería de un producto: varias imágenes, una principal y un orden (es el del carrusel de la vitrina). */
export const ImagenesModal: React.FC<ImagenesModalProps> = ({
  idProducto,
  onClose,
  onCambio,
  textoSiguiente,
  onSiguiente,
}) => {
  const cargador = useCallback(async () => {
    const [producto, imagenes] = await Promise.all([productosApi.obtener(idProducto), imagenesApi.listar(idProducto)]);
    const destinos = {
      variantes: producto.variantes.map((v) => ({ idVariante: v.idVariante, medida: v.medida })),
      colores: producto.coloresFabrica,
    };
    return { nombre: producto.nombre, publicado: producto.publicado, imagenes, destinos };
  }, [idProducto]);
  const { datos, cargando, error, recargar } = useCargar(cargador, 'No se pudo cargar la galería.');
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);
  const [subiendo, setSubiendo] = useState(false);
  // I5: a qué se asocian las imágenes que se suban ahora ('' = todo el producto).
  const [asociarA, setAsociarA] = useState('');
  const [aEliminar, setAEliminar] = useState<ImagenProducto | null>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const idEntrada = useId();
  const imagenes = datos?.imagenes ?? [];
  const lleno = imagenes.length >= MAXIMO_IMAGENES_PRODUCTO;

  const cambio = (texto: string) => {
    setAviso({ tipo: 'success', texto });
    recargar();
    onCambio();
  };
  const fallo = (err: unknown, respaldo: string) =>
    setAviso({ tipo: 'error', texto: leerErrorCatalogo(err, respaldo).message });

  const subir = async (archivos: FileList | null) => {
    if (archivos === null || archivos.length === 0) return;
    const lista = Array.from(archivos).slice(0, MAXIMO_IMAGENES_PRODUCTO - imagenes.length);
    const omitidas = archivos.length - lista.length;
    setSubiendo(true);
    let subidas = 0;
    const problemas: string[] = [];
    for (const archivo of lista) {
      const invalido = validarImagen(archivo);
      if (invalido !== null) {
        problemas.push(`${archivo.name}: ${invalido}`);
        continue;
      }
      try {
        await imagenesApi.subir(idProducto, { ...(await leerImagen(archivo)), ...aAsociacion(asociarA) });
        subidas += 1;
      } catch (err: unknown) {
        problemas.push(`${archivo.name}: ${leerErrorCatalogo(err, 'No se pudo subir.').message}`);
      }
    }
    if (omitidas > 0) problemas.push(`Solo caben ${MAXIMO_IMAGENES_PRODUCTO} imágenes: se omitieron ${omitidas}.`);
    setSubiendo(false);
    if (entrada.current !== null) entrada.current.value = '';
    if (subidas > 0) {
      onCambio();
      recargar();
    }
    setAviso(
      problemas.length === 0
        ? { tipo: 'success', texto: subidas === 1 ? 'Imagen agregada.' : `${subidas} imágenes agregadas.` }
        : { tipo: 'error', texto: `${subidas > 0 ? `${subidas} subidas. ` : ''}${problemas.join(' ')}` },
    );
  };

  const mover = async (indice: number, paso: -1 | 1) => {
    const destino = indice + paso;
    if (destino < 0 || destino >= imagenes.length) return;
    const ids = imagenes.map((i) => i.idImagen);
    const [movida] = ids.splice(indice, 1);
    if (movida === undefined) return;
    ids.splice(destino, 0, movida);
    try {
      await imagenesApi.ordenar(idProducto, ids);
      recargar();
    } catch (err: unknown) {
      fallo(err, 'No se pudo cambiar el orden.');
    }
  };

  const cambiarAsociacion = async (imagen: ImagenProducto, valor: string) => {
    try {
      await imagenesApi.cambiarAsociacion(imagen.idImagen, aAsociacion(valor));
      cambio('La imagen quedó asociada.');
    } catch (err: unknown) {
      fallo(err, 'No se pudo cambiar a qué pertenece la imagen.');
    }
  };

  const hacerPrincipal = async (imagen: ImagenProducto) => {
    try {
      await imagenesApi.marcarPrincipal(imagen.idImagen);
      cambio('La imagen principal cambió.');
    } catch (err: unknown) {
      fallo(err, 'No se pudo cambiar la imagen principal.');
    }
  };

  const eliminar = async () => {
    if (aEliminar === null) return;
    try {
      await imagenesApi.eliminar(aEliminar.idImagen);
      setAEliminar(null);
      cambio('Imagen eliminada.');
    } catch (err: unknown) {
      setAEliminar(null);
      fallo(err, 'No se pudo eliminar la imagen.');
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Imágenes del producto" subtitle={datos?.nombre} size="xl">
      <div className="space-y-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-sans text-sm text-neutral-medium">
            La primera es la portada; el orden es el del carrusel de la ficha. {imagenes.length} de{' '}
            {MAXIMO_IMAGENES_PRODUCTO} · JPEG, PNG o WebP de hasta 5 MB.
          </p>
          <div>
            <input
              ref={entrada}
              id={idEntrada}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={lleno || subiendo}
              onChange={(e) => void subir(e.target.files)}
            />
            <label
              htmlFor={idEntrada}
              className={`inline-flex min-h-11 items-center gap-2 rounded-btn px-4 py-2.5 font-title text-sm font-medium focus-within:ring-2 ${
                lleno || subiendo
                  ? 'cursor-not-allowed bg-neutral-light text-neutral-medium'
                  : 'cursor-pointer bg-action text-neutral-white hover:bg-action-hover'
              }`}
            >
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
              {subiendo ? 'Subiendo…' : 'Agregar imágenes'}
            </label>
          </div>
        </div>

        {datos !== null && opcionesAsociacion(datos.destinos).length > 1 && (
          <div className="max-w-sm">
            <Select
              label="Las imágenes nuevas pertenecen a"
              value={asociarA}
              onChange={(e) => setAsociarA(e.target.value)}
              options={opcionesAsociacion(datos.destinos)}
              helperText="Al elegir esa presentación o color en la ficha se muestra su imagen."
            />
          </div>
        )}

        <AvisoAccion aviso={aviso} onCerrar={cerrarAviso} />
        {datos !== null && !datos.publicado && imagenes.length === 0 && (
          <Alert variant="info">
            Un producto necesita al menos una imagen y una variante activa para poder publicarse.
          </Alert>
        )}
        {error !== null && <Alert variant="error">{error}</Alert>}
        {cargando && datos === null && <Cargando />}
        {datos !== null && imagenes.length === 0 && <MensajeVacio>Este producto aún no tiene imágenes.</MensajeVacio>}

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {imagenes.map((imagen, indice) => (
            <li
              key={imagen.idImagen}
              className="overflow-hidden rounded-card border border-neutral-light bg-neutral-white"
            >
              <div className="relative flex h-36 items-center justify-center bg-neutral-lightest">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagenesApi.url(imagen.idImagen, 'miniatura')}
                  alt={`Imagen ${indice + 1} de ${datos?.nombre ?? 'el producto'}`}
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                />
                {imagen.esPrincipal && (
                  <span className="absolute left-2 top-2">
                    <Badge variant="action">Principal</Badge>
                  </span>
                )}
              </div>
              {datos !== null && opcionesAsociacion(datos.destinos).length > 1 && (
                <div className="border-t border-neutral-light px-2 pt-2">
                  <Select
                    label={`Pertenece a (imagen ${indice + 1})`}
                    hideLabel
                    value={valorDeAsociacion(imagen)}
                    onChange={(e) => void cambiarAsociacion(imagen, e.target.value)}
                    options={opcionesAsociacion(datos.destinos)}
                    title={etiquetaDeAsociacion(imagen, datos.destinos)}
                  />
                </div>
              )}
              <div className="flex items-center justify-between gap-1 p-2">
                <span className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Mover la imagen ${indice + 1} a la izquierda`}
                    disabled={indice === 0}
                    onClick={() => void mover(indice, -1)}
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Mover la imagen ${indice + 1} a la derecha`}
                    disabled={indice === imagenes.length - 1}
                    onClick={() => void mover(indice, 1)}
                  >
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </span>
                <span className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Usar la imagen ${indice + 1} como principal`}
                    disabled={imagen.esPrincipal}
                    onClick={() => void hacerPrincipal(imagen)}
                  >
                    <Star className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Eliminar la imagen ${indice + 1}`}
                    onClick={() => setAEliminar(imagen)}
                  >
                    <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
                  </Button>
                </span>
              </div>
            </li>
          ))}
        </ul>

        {aEliminar !== null && (
          <Alert variant="warning" title="¿Eliminar esta imagen?">
            <p>El archivo se borra definitivamente.</p>
            <div className="mt-3 flex gap-2">
              <Button variant="danger" size="sm" onClick={() => void eliminar()}>
                Eliminar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAEliminar(null)}>
                Cancelar
              </Button>
            </div>
          </Alert>
        )}

        <div className="flex justify-end gap-2 border-t border-neutral-light pt-4">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {onSiguiente !== undefined && (
            <Button variant="primary-action" onClick={onSiguiente}>
              {textoSiguiente ?? 'Continuar'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
