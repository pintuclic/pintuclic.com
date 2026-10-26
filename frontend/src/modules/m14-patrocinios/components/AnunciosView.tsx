'use client';

import React, { useCallback, useState } from 'react';
import { Plus, TriangleAlert } from 'lucide-react';
import { Alert, Badge, Button, Input, Select, type BadgeVariant } from '@/core/components';
import {
  DEFINICION_ESPACIOS,
  ESPACIOS_PUBLICITARIOS,
  type Anuncio,
  type Situacion,
} from '../dtos/m14-patrocinios.dto';
import { useCargar, useRetardo } from '../hooks/useCargar';
import { conTamano } from '../services/anuncios-publico';
import { AYUDA_SITUACION, ETIQUETAS_SITUACION, resumenVigencia } from '../services/etiquetas';
import { mensajeDeError } from '../services/mensaje-error';
import { anunciosApi } from '../services/patrocinios-api';
import { AnuncioEditor, AVISO_SIN_MOVIL } from './AnuncioEditor';
import { AvisoAccion, Cargando, MensajeVacio, Paginador, type Aviso } from './comunes';

const VARIANTE_SITUACION: Record<Situacion, BadgeVariant> = {
  vigente: 'success',
  programado: 'action',
  vencido: 'neutral',
  inactivo: 'neutral',
};

type Modo = { tipo: 'lista' } | { tipo: 'editor'; anuncio: Anuncio | null };

/** Lista de anuncios de los espacios publicitarios y su editor (M14 · sección B). */
export const AnunciosView: React.FC = () => {
  const [modo, setModo] = useState<Modo>({ tipo: 'lista' });
  const [busqueda, setBusqueda] = useState('');
  const [espacio, setEspacio] = useState('');
  const [situacion, setSituacion] = useState('');
  const [pagina, setPagina] = useState(1);
  const termino = useRetardo(busqueda);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [abriendo, setAbriendo] = useState<number | null>(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);

  const lista = useCargar(
    useCallback(
      () => anunciosApi.listar({ busqueda: termino, espacio, situacion, pagina, limite: 15 }),
      [termino, espacio, situacion, pagina],
    ),
    'No se pudieron cargar los anuncios.',
  );

  const editar = async (idAnuncio: number): Promise<void> => {
    setAbriendo(idAnuncio);
    try {
      setModo({ tipo: 'editor', anuncio: await anunciosApi.obtener(idAnuncio) });
    } catch (err: unknown) {
      setAviso({ tipo: 'error', texto: mensajeDeError(err, 'No se pudo abrir el anuncio.') });
    } finally {
      setAbriendo(null);
    }
  };

  const alternar = async (a: Anuncio, activar: boolean): Promise<void> => {
    try {
      await anunciosApi.cambiarEstado(a.idAnuncio, activar ? 'activo' : 'inactivo');
      setAviso({ tipo: 'success', texto: `Anuncio "${a.nombre}" ${activar ? 'activado' : 'desactivado'}.` });
      lista.recargar();
    } catch (err: unknown) {
      setAviso({ tipo: 'error', texto: mensajeDeError(err, 'No se pudo cambiar el estado.') });
    }
  };

  if (modo.tipo === 'editor') {
    return (
      <AnuncioEditor
        anuncio={modo.anuncio}
        onCancelar={() => setModo({ tipo: 'lista' })}
        onGuardado={(texto) => {
          setAviso({ tipo: 'success', texto });
          setModo({ tipo: 'lista' });
          lista.recargar();
        }}
      />
    );
  }

  return (
    <section aria-labelledby="titulo-anuncios" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="titulo-anuncios" className="font-title text-lg font-semibold text-corporate">
            Anuncios
          </h2>
          <p className="font-sans text-sm text-neutral-medium">
            Imágenes con enlace en tres espacios del sitio: el inicio, el catálogo y la ficha del producto. Si un espacio no
            tiene anuncios vigentes, simplemente no se muestra.
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={() => setModo({ tipo: 'editor', anuncio: null })}>
          Nuevo anuncio
        </Button>
      </div>

      <AvisoAccion aviso={aviso} onCerrar={cerrarAviso} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label="Buscar"
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setPagina(1);
          }}
        />
        <Select
          label="Espacio"
          value={espacio}
          onChange={(e) => {
            setEspacio(e.target.value);
            setPagina(1);
          }}
          options={[
            { value: '', label: 'Todos los espacios' },
            ...ESPACIOS_PUBLICITARIOS.map((x) => ({ value: x, label: DEFINICION_ESPACIOS[x].etiqueta })),
          ]}
        />
        <Select
          label="Situación"
          value={situacion}
          onChange={(e) => {
            setSituacion(e.target.value);
            setPagina(1);
          }}
          options={[
            { value: '', label: 'Todas' },
            ...(Object.keys(ETIQUETAS_SITUACION) as Situacion[]).map((s) => ({ value: s, label: ETIQUETAS_SITUACION[s] })),
          ]}
        />
      </div>

      {lista.error !== null && <Alert variant="error">{lista.error}</Alert>}
      {lista.cargando && lista.datos === null && <Cargando />}
      {lista.datos !== null && lista.datos.items.length === 0 && (
        <MensajeVacio>Todavía no hay anuncios con esos filtros. Cree uno con «Nuevo anuncio».</MensajeVacio>
      )}
      {lista.datos !== null && lista.datos.items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-card border border-neutral-light bg-neutral-white">
            <table className="w-full min-w-[760px] text-left font-sans text-sm">
              <caption className="sr-only">Anuncios de los espacios publicitarios</caption>
              <thead className="bg-neutral-lightest text-xs uppercase tracking-wide text-neutral-medium">
                <tr>
                  <th scope="col" className="px-4 py-3">Imagen</th>
                  <th scope="col" className="px-4 py-3">Anuncio</th>
                  <th scope="col" className="px-4 py-3">Espacio</th>
                  <th scope="col" className="px-4 py-3">Vigencia</th>
                  <th scope="col" className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-light">
                {lista.datos.items.map((a) => (
                  <tr key={a.idAnuncio}>
                    <td className="px-4 py-3">
                      {/* eslint-disable-next-line @next/next/no-img-element -- imagen servida por la propia API, ya reducida */}
                      <img
                        src={conTamano(a.urlImagen, 'pequeno')}
                        alt={a.textoAlternativo}
                        loading="lazy"
                        className="h-12 w-28 rounded-btn border border-neutral-light object-cover"
                      />
                    </td>
                    <td className="px-4 py-3 text-neutral-black">
                      <span className="block">{a.nombre}</span>
                      <span className="block text-xs text-neutral-medium">{a.anunciante}</span>
                      <Badge variant={VARIANTE_SITUACION[a.situacion]} title={AYUDA_SITUACION[a.situacion]} className="mt-1">
                        {ETIQUETAS_SITUACION[a.situacion]}
                      </Badge>
                      {!a.tieneImagenMovil && (
                        <Badge variant="neutral" icon={<TriangleAlert className="h-3 w-3" aria-hidden="true" />} title={AVISO_SIN_MOVIL} className="ml-1 mt-1">
                          Sin imagen móvil
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-dark">
                      {DEFINICION_ESPACIOS[a.espacio].etiqueta}
                      <span className="block text-xs text-neutral-medium">Orden {a.orden}</span>
                    </td>
                    <td className="px-4 py-3 text-neutral-dark">{resumenVigencia(a.fechaInicio, a.fechaFin)}</td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap justify-end gap-2">
                        <Button variant="outline" size="sm" isLoading={abriendo === a.idAnuncio} onClick={() => void editar(a.idAnuncio)}>
                          Editar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => void alternar(a, a.estado === 'inactivo')}>
                          {a.estado === 'inactivo' ? 'Activar' : 'Desactivar'}
                        </Button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginador paginacion={lista.datos.paginacion} onCambiar={setPagina} />
        </>
      )}
    </section>
  );
};
