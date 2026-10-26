'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Alert, Badge, Button, Input, Select, type BadgeVariant } from '@/core/components';
import type { Campania, Situacion } from '../dtos/m14-patrocinios.dto';
import { useCargar, useRetardo } from '../hooks/useCargar';
import {
  AYUDA_SITUACION,
  ETIQUETAS_SITUACION,
  ETIQUETAS_UBICACION,
  UBICACIONES,
  formatearNumero,
  resumenVigencia,
} from '../services/etiquetas';
import { mensajeDeError } from '../services/mensaje-error';
import { campaniasApi } from '../services/patrocinios-api';
import { AvisoAccion, Cargando, MensajeVacio, Paginador, type Aviso } from './comunes';
import { CampaniaEditor } from './CampaniaEditor';
import { ProductosCubiertosModal } from './ProductosCubiertosModal';

const VARIANTE_SITUACION: Record<Situacion, BadgeVariant> = {
  vigente: 'success',
  programado: 'action',
  vencido: 'neutral',
  inactivo: 'neutral',
};

type Modo = { tipo: 'lista' } | { tipo: 'editor'; campania: Campania | null };

/** Lista de campañas de patrocinio de productos y su editor (M14 · sección A). */
export const CampaniasView: React.FC = () => {
  const [modo, setModo] = useState<Modo>({ tipo: 'lista' });
  const [busqueda, setBusqueda] = useState('');
  const [situacion, setSituacion] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [pagina, setPagina] = useState(1);
  const termino = useRetardo(busqueda);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [abriendo, setAbriendo] = useState<number | null>(null);
  const [verProductos, setVerProductos] = useState<{ idCampania: number; nombre: string } | null>(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);

  const lista = useCargar(
    useCallback(
      () => campaniasApi.listar({ busqueda: termino, situacion, ubicacion, pagina, limite: 15 }),
      [termino, situacion, ubicacion, pagina],
    ),
    'No se pudieron cargar las campañas.',
  );
  const origenProductos = useMemo(
    () => (verProductos === null ? null : ({ tipo: 'guardada', idCampania: verProductos.idCampania } as const)),
    [verProductos],
  );

  const editar = async (idCampania: number): Promise<void> => {
    setAbriendo(idCampania);
    try {
      setModo({ tipo: 'editor', campania: await campaniasApi.obtener(idCampania) });
    } catch (err: unknown) {
      setAviso({ tipo: 'error', texto: mensajeDeError(err, 'No se pudo abrir la campaña.') });
    } finally {
      setAbriendo(null);
    }
  };

  const alternar = async (idCampania: number, nombre: string, activar: boolean): Promise<void> => {
    try {
      await campaniasApi.cambiarEstado(idCampania, activar ? 'activo' : 'inactivo');
      setAviso({ tipo: 'success', texto: `Campaña "${nombre}" ${activar ? 'activada' : 'desactivada'}.` });
      lista.recargar();
    } catch (err: unknown) {
      setAviso({ tipo: 'error', texto: mensajeDeError(err, 'No se pudo cambiar el estado.') });
    }
  };

  if (modo.tipo === 'editor') {
    return (
      <CampaniaEditor
        campania={modo.campania}
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
    <section aria-labelledby="titulo-campanias" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="titulo-campanias" className="font-title text-lg font-semibold text-corporate">
            Campañas de productos
          </h2>
          <p className="font-sans text-sm text-neutral-medium">
            Ponga por delante, con la etiqueta «Patrocinado», productos sueltos o todos los de una línea o una marca.
          </p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={() => setModo({ tipo: 'editor', campania: null })}
        >
          Nueva campaña
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
        <Select
          label="Dónde se muestra"
          value={ubicacion}
          onChange={(e) => {
            setUbicacion(e.target.value);
            setPagina(1);
          }}
          options={[
            { value: '', label: 'Todos los lugares' },
            ...UBICACIONES.map((u) => ({ value: u, label: ETIQUETAS_UBICACION[u] })),
          ]}
        />
      </div>

      {lista.error !== null && <Alert variant="error">{lista.error}</Alert>}
      {lista.cargando && lista.datos === null && <Cargando />}
      {lista.datos !== null && lista.datos.items.length === 0 && (
        <MensajeVacio>Todavía no hay campañas con esos filtros. Cree una con «Nueva campaña».</MensajeVacio>
      )}
      {lista.datos !== null && lista.datos.items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-card border border-neutral-light bg-neutral-white">
            <table className="w-full min-w-[720px] text-left font-sans text-sm">
              <caption className="sr-only">Campañas de patrocinio de productos</caption>
              <thead className="bg-neutral-lightest text-xs uppercase tracking-wide text-neutral-medium">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Campaña
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Vigencia
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Dónde
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Productos
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-light">
                {lista.datos.items.map((c) => (
                  <tr key={c.idCampania}>
                    <td className="px-4 py-3 text-neutral-black">
                      <span className="block">{c.nombre}</span>
                      <Badge variant={VARIANTE_SITUACION[c.situacion]} title={AYUDA_SITUACION[c.situacion]} className="mt-1">
                        {ETIQUETAS_SITUACION[c.situacion]}
                      </Badge>
                      <span className="ml-2 text-xs text-neutral-medium">Prioridad {c.prioridad}</span>
                    </td>
                    <td className="px-4 py-3 text-neutral-dark">{resumenVigencia(c.fechaInicio, c.fechaFin)}</td>
                    <td className="px-4 py-3 text-neutral-dark">
                      {c.ubicaciones.map((u) => ETIQUETAS_UBICACION[u]).join(', ')}
                    </td>
                    <td className="px-4 py-3 text-neutral-dark">
                      <span className="font-title font-semibold text-neutral-black">
                        {formatearNumero(c.totalProductos)}
                      </span>
                      <span className="block text-xs text-neutral-medium">
                        {c.productosVisibles === c.totalProductos
                          ? 'todos se muestran'
                          : `${formatearNumero(c.productosVisibles)} se muestran`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setVerProductos({ idCampania: c.idCampania, nombre: c.nombre })}>
                          Ver productos
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          isLoading={abriendo === c.idCampania}
                          onClick={() => void editar(c.idCampania)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void alternar(c.idCampania, c.nombre, c.estado === 'inactivo')}
                        >
                          {c.estado === 'inactivo' ? 'Activar' : 'Desactivar'}
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

      {verProductos !== null && origenProductos !== null && (
        <ProductosCubiertosModal origen={origenProductos} titulo={verProductos.nombre} onClose={() => setVerProductos(null)} />
      )}
    </section>
  );
};
