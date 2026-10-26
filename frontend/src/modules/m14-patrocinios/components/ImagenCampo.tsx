'use client';

import React, { useState } from 'react';
import { FileInput } from '@/core/components';
import type { EspacioPublicitario } from '../dtos/m14-patrocinios.dto';
import {
  ACEPTAR_IMAGENES,
  ayudaDeMedida,
  leerImagen,
  requisitosDeImagen,
  type ImagenElegida,
  type VarianteImagen,
} from '../services/imagenes';

export interface ImagenCampoProps {
  etiqueta: string;
  variante: VarianteImagen;
  espacio: EspacioPublicitario;
  /** La imagen que ya tiene el anuncio (al editar), para mostrarla mientras no se elija otra. */
  actualUrl: string | null;
  elegida: ImagenElegida | null;
  onElegir: (imagen: ImagenElegida | null) => void;
  disabled?: boolean;
}

/**
 * Selector de una imagen del anuncio con vista previa en la proporción real del espacio. Avisa en español, antes de
 * subir, si la imagen no tiene la forma o el tamaño pedidos; el servidor repite las mismas comprobaciones.
 */
export const ImagenCampo: React.FC<ImagenCampoProps> = ({
  etiqueta,
  variante,
  espacio,
  actualUrl,
  elegida,
  onElegir,
  disabled = false,
}) => {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [leyendo, setLeyendo] = useState(false);
  const { proporcion } = requisitosDeImagen(variante, espacio);

  const cambiar = async (nuevo: File | null): Promise<void> => {
    setError(undefined);
    if (nuevo === null) {
      setArchivo(null);
      onElegir(null);
      return;
    }
    setLeyendo(true);
    const r = await leerImagen(nuevo, variante, espacio);
    setLeyendo(false);
    if (!r.ok) {
      setArchivo(null);
      setError(r.mensaje);
      return;
    }
    setArchivo(nuevo);
    onElegir(r.imagen);
  };

  const origen = elegida?.vistaPrevia ?? actualUrl;
  return (
    <div className="space-y-2">
      <FileInput
        label={etiqueta}
        value={archivo}
        onChange={(f) => void cambiar(f)}
        accept={ACEPTAR_IMAGENES}
        helperText={leyendo ? 'Revisando la imagen…' : ayudaDeMedida(variante, espacio)}
        {...(error === undefined ? {} : { error })}
        disabled={disabled}
      />
      {origen !== null && (
        <figure className="space-y-1">
          <div
            style={{ aspectRatio: String(proporcion) }}
            className={`overflow-hidden rounded-card border border-neutral-light bg-neutral-lightest ${
              variante === 'movil' ? 'max-w-[240px]' : 'max-w-xl'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- vista previa de un archivo local (data:) o de la API */}
            <img src={origen} alt={`Vista previa de ${etiqueta.toLowerCase()}`} className="h-full w-full object-cover" />
          </div>
          <figcaption className="font-sans text-xs text-neutral-medium">
            {elegida !== null
              ? `Nueva: ${elegida.nombreArchivo} (${elegida.ancho} × ${elegida.alto} px).`
              : 'Imagen actual: se conserva si no elige otra.'}
          </figcaption>
        </figure>
      )}
    </div>
  );
};
