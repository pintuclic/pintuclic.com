'use client';

import React, { useMemo, useState } from 'react';
import { Alert, Button, Checkbox, Input, Select } from '@/core/components';
import {
  DEFINICION_ESPACIOS,
  ESPACIOS_PUBLICITARIOS,
  type Anuncio,
  type EspacioPublicitario,
} from '../dtos/m14-patrocinios.dto';
import {
  aCuerpoActualizarAnuncio,
  aCuerpoCrearAnuncio,
  borradorAnuncioVacio,
  borradorDesdeAnuncio,
  type BorradorAnuncio,
} from '../services/anuncios-form';
import { hoyBogota } from '../services/etiquetas';
import { leerErrorPatrocinios } from '../services/mensaje-error';
import { anunciosApi } from '../services/patrocinios-api';
import { conTamano } from '../services/anuncios-publico';
import { ImagenCampo } from './ImagenCampo';

export interface AnuncioEditorProps {
  /** Anuncio a editar; null crea uno nuevo. */
  anuncio: Anuncio | null;
  onCancelar: () => void;
  onGuardado: (texto: string) => void;
}

/** Aviso del contrato (B10) cuando un anuncio no trae imagen móvil. */
export const AVISO_SIN_MOVIL = 'Sin imagen móvil: en celulares se verá muy pequeña.';

/**
 * Editor de un anuncio de un espacio publicitario (M14 · sección B): quién es el anunciante, en qué espacio va, la imagen
 * de escritorio (que sirve también para tablet), una imagen móvil opcional, el enlace invisible y la vigencia.
 */
export const AnuncioEditor: React.FC<AnuncioEditorProps> = ({ anuncio, onCancelar, onGuardado }) => {
  const [b, setB] = useState<BorradorAnuncio>(() =>
    anuncio === null ? borradorAnuncioVacio(hoyBogota()) : borradorDesdeAnuncio(anuncio),
  );
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const esNuevo = anuncio === null;

  const cambiar = (parcial: Partial<BorradorAnuncio>): void => setB((previo) => ({ ...previo, ...parcial }));
  const cuerpoCrear = useMemo(() => aCuerpoCrearAnuncio(b), [b]);

  const tieneMovil = b.imagenMovil !== null || (anuncio?.tieneImagenMovil === true && !b.quitarImagenMovil);

  const guardar = async (): Promise<void> => {
    setError(null);
    setGuardando(true);
    try {
      if (anuncio === null) {
        if (!cuerpoCrear.ok) {
          setError(cuerpoCrear.mensaje);
          return;
        }
        const creado = await anunciosApi.crear(cuerpoCrear.valor);
        onGuardado(`Anuncio "${creado.nombre}" creado.`);
        return;
      }
      const cuerpo = aCuerpoActualizarAnuncio(b);
      if (!cuerpo.ok) {
        setError(cuerpo.mensaje);
        return;
      }
      const guardado = await anunciosApi.actualizar(anuncio.idAnuncio, cuerpo.valor);
      onGuardado(`Anuncio "${guardado.nombre}" guardado.`);
    } catch (err: unknown) {
      setError(leerErrorPatrocinios(err, 'No se pudo guardar el anuncio.').message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void guardar();
      }}
      noValidate
      className="space-y-5"
      aria-label={esNuevo ? 'Nuevo anuncio' : `Editar anuncio ${anuncio.nombre}`}
    >
      <div>
        <h2 className="font-title text-lg font-semibold text-corporate">{esNuevo ? 'Nuevo anuncio' : 'Editar anuncio'}</h2>
        <p className="font-sans text-sm text-neutral-medium">
          El anuncio se ve en su espacio con la etiqueta «Publicidad». Toda la imagen es el enlace: quien la toca llega al
          sitio del anunciante. El acuerdo con el anunciante se hace fuera del sistema.
        </p>
      </div>

      {error !== null && <Alert variant="error">{error}</Alert>}

      <section className="grid gap-3 sm:grid-cols-2">
        <Input label="Nombre del anuncio" value={b.nombre} onChange={(e) => cambiar({ nombre: e.target.value })} helperText="Interno: el cliente no lo ve." />
        <Input label="Anunciante" value={b.anunciante} onChange={(e) => cambiar({ anunciante: e.target.value })} helperText="Quién paga el anuncio, p. ej. Pintuco." />
        <Select
          label="Espacio"
          value={b.espacio}
          disabled={!esNuevo}
          onChange={(e) => cambiar({ espacio: e.target.value as EspacioPublicitario, imagen: null, imagenMovil: null })}
          options={ESPACIOS_PUBLICITARIOS.map((e) => ({ value: e, label: DEFINICION_ESPACIOS[e].etiqueta }))}
          helperText={esNuevo ? 'Cada espacio tiene su propia forma de imagen.' : 'No se puede cambiar: cree otro anuncio para otro espacio.'}
        />
        <Input
          label="Orden"
          inputMode="numeric"
          value={b.orden}
          onChange={(e) => cambiar({ orden: e.target.value })}
          helperText="Con varios anuncios en el mismo espacio, el menor va primero."
        />
      </section>

      <section className="space-y-4 rounded-card border border-neutral-light p-4">
        <ImagenCampo
          key={`escritorio-${b.espacio}`}
          etiqueta="Imagen de escritorio y tablet"
          variante="escritorio"
          espacio={b.espacio}
          actualUrl={anuncio === null ? null : conTamano(anuncio.urlImagen, 'mediano')}
          elegida={b.imagen}
          onElegir={(imagen) => cambiar({ imagen })}
        />
        <ImagenCampo
          key={`movil-${b.espacio}`}
          etiqueta="Imagen para celular (opcional)"
          variante="movil"
          espacio={b.espacio}
          actualUrl={anuncio?.urlImagenMovil == null || b.quitarImagenMovil ? null : conTamano(anuncio.urlImagenMovil, 'pequeno')}
          elegida={b.imagenMovil}
          onElegir={(imagenMovil) => cambiar({ imagenMovil, quitarImagenMovil: false })}
        />
        {anuncio?.tieneImagenMovil === true && b.imagenMovil === null && (
          <Checkbox
            label="Quitar la imagen para celular"
            checked={b.quitarImagenMovil}
            onChange={(e) => cambiar({ quitarImagenMovil: e.target.checked })}
          />
        )}
        {!tieneMovil && (
          <Alert variant="warning">
            {AVISO_SIN_MOVIL} Para que se vea bien en celulares, suba una imagen con forma 4:3.
          </Alert>
        )}
      </section>

      <section className="space-y-3 rounded-card border border-neutral-light p-4">
        <Input
          label="Texto alternativo"
          value={b.textoAlternativo}
          maxLength={150}
          onChange={(e) => cambiar({ textoAlternativo: e.target.value })}
          helperText="Obligatorio. Describe el anuncio para quien no ve la imagen y es el nombre del enlace."
        />
        <Input
          label="Enlace (opcional)"
          value={b.enlace}
          onChange={(e) => cambiar({ enlace: e.target.value })}
          helperText="https://… abre en una pestaña nueva; una ruta del sitio, como /productos/5, abre en la misma. Vacío: la imagen no es clicable."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Desde (fecha)" type="date" value={b.fechaInicio} onChange={(e) => cambiar({ fechaInicio: e.target.value })} />
          <Input
            label="Hasta (fecha)"
            type="date"
            value={b.fechaFin}
            onChange={(e) => cambiar({ fechaFin: e.target.value })}
            helperText="Incluida. Todo anuncio termina."
          />
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-light pt-4">
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary-action" isLoading={guardando}>
          {esNuevo ? 'Crear anuncio' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  );
};
