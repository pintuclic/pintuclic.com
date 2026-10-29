'use client';

import React, { useState } from 'react';
import { FileInput, PuntoEnfoque } from '@/core/components';
import type { FocoImagen } from '@/core/utils/foco-imagen';
import type { EspacioPublicitario } from '../dtos/m14-patrocinios.dto';
import { ACEPTAR_IMAGENES, ayudaDeImagen, leerImagen, proporcionDeVista, type ImagenElegida, type VarianteImagen } from '../services/imagenes';

export interface ImagenCampoProps {
  etiqueta: string;
  variante: VarianteImagen;
  espacio: EspacioPublicitario;
  /** La imagen que ya tiene el anuncio (al editar), para mostrarla mientras no se elija otra. */
  actualUrl: string | null;
  elegida: ImagenElegida | null;
  onElegir: (imagen: ImagenElegida | null) => void;
  /** Qué parte de la imagen debe verse cuando el espacio la recorta (B8). */
  foco: FocoImagen;
  onFoco: (foco: FocoImagen) => void;
  disabled?: boolean;
}

/**
 * Selector de una imagen del anuncio. Ya no se exige una forma ni un tamaño (B8): se sube lo que se tenga y se marca el
 * punto de enfoque; la vista «Así se verá» usa la proporción real del espacio (o 4:3 en el celular).
 */
export const ImagenCampo: React.FC<ImagenCampoProps> = ({
  etiqueta,
  variante,
  espacio,
  actualUrl,
  elegida,
  onElegir,
  foco,
  onFoco,
  disabled = false,
}) => {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [leyendo, setLeyendo] = useState(false);

  const cambiar = async (nuevo: File | null): Promise<void> => {
    setError(undefined);
    if (nuevo === null) {
      setArchivo(null);
      onElegir(null);
      return;
    }
    setLeyendo(true);
    const r = await leerImagen(nuevo, variante);
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
    <div className="space-y-3">
      <FileInput
        label={etiqueta}
        value={archivo}
        onChange={(f) => void cambiar(f)}
        accept={ACEPTAR_IMAGENES}
        helperText={leyendo ? 'Revisando la imagen…' : ayudaDeImagen(variante)}
        {...(error === undefined ? {} : { error })}
        disabled={disabled}
      />
      {origen !== null && (
        <>
          <PuntoEnfoque
            src={origen}
            proporcion={proporcionDeVista(variante, espacio)}
            foco={foco}
            onChange={onFoco}
            nombre={variante === 'movil' ? 'para celular' : 'de escritorio'}
            anchoVista={variante === 'movil' ? 'max-w-[240px]' : 'max-w-xl'}
            disabled={disabled}
          />
          <p className="font-sans text-xs text-neutral-medium">
            {elegida !== null
              ? `Nueva: ${elegida.nombreArchivo} (${elegida.ancho} × ${elegida.alto} px).`
              : 'Imagen actual: se conserva si no elige otra. Puede mover su punto de enfoque.'}
          </p>
        </>
      )}
    </div>
  );
};
