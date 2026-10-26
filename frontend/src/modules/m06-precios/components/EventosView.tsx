'use client';

import React, { useCallback, useState } from 'react';
import { Plus } from 'lucide-react';
import { Alert, Badge, Button, Input, Select, type BadgeVariant } from '@/core/components';
import type { Evento, SituacionEvento } from '../dtos/m06-precios.dto';
import { useCargar, useRetardo } from '../hooks/useCargar';
import {
  AYUDA_SITUACION_EVENTO,
  ETIQUETAS_SITUACION_EVENTO,
  formatearPorcentaje,
  resumenCalendario,
} from '../services/etiquetas';
import { mensajeDeError } from '../services/mensaje-error';
import { eventosApi } from '../services/precios-api';
import { AvisoAccion, Cargando, MensajeVacio, Paginador, type Aviso } from './comunes';
import { EventoEditor } from './EventoEditor';

const VARIANTE_SITUACION: Record<SituacionEvento, BadgeVariant> = {
  en_curso: 'success',
  programado: 'action',
  en_espera: 'neutral',
  vencido: 'neutral',
  inactivo: 'neutral',
};

type Modo = { tipo: 'lista' } | { tipo: 'editor'; evento: Evento | null };

/** Lista de eventos de descuento y su editor (el motor de eventos de M06). */
export const EventosView: React.FC = () => {
  const [modo, setModo] = useState<Modo>({ tipo: 'lista' });
  const [busqueda, setBusqueda] = useState('');
  const [situacion, setSituacion] = useState('');
  const [pagina, setPagina] = useState(1);
  const termino = useRetardo(busqueda);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [abriendo, setAbriendo] = useState<number | null>(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);

  const lista = useCargar(
    useCallback(
      () => eventosApi.listar({ busqueda: termino, situacion, pagina, limite: 15 }),
      [termino, situacion, pagina],
    ),
    'No se pudieron cargar los eventos.',
  );

  const editar = async (idEvento: number): Promise<void> => {
    setAbriendo(idEvento);
    try {
      setModo({ tipo: 'editor', evento: await eventosApi.obtener(idEvento) });
    } catch (err: unknown) {
      setAviso({ tipo: 'error', texto: mensajeDeError(err, 'No se pudo abrir el evento.') });
    } finally {
      setAbriendo(null);
    }
  };

  const alternar = async (idEvento: number, nombre: string, activar: boolean): Promise<void> => {
    try {
      await eventosApi.cambiarEstado(idEvento, activar ? 'activo' : 'inactivo');
      setAviso({ tipo: 'success', texto: `Evento "${nombre}" ${activar ? 'activado' : 'desactivado'}.` });
      lista.recargar();
    } catch (err: unknown) {
      setAviso({ tipo: 'error', texto: mensajeDeError(err, 'No se pudo cambiar el estado.') });
    }
  };

  if (modo.tipo === 'editor') {
    return (
      <EventoEditor
        evento={modo.evento}
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
    <section aria-labelledby="titulo-eventos" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="titulo-eventos" className="font-title text-lg font-semibold text-corporate">
            Eventos de descuento
          </h2>
          <p className="font-sans text-sm text-neutral-medium">
            Descuentos con fechas, días que se repiten y horas, por marca, línea, producto o color, con sus excepciones.
          </p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={() => setModo({ tipo: 'editor', evento: null })}
        >
          Nuevo evento
        </Button>
      </div>

      <AvisoAccion aviso={aviso} onCerrar={cerrarAviso} />

      <div className="grid gap-3 sm:grid-cols-2">
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
            ...(Object.keys(ETIQUETAS_SITUACION_EVENTO) as SituacionEvento[]).map((s) => ({
              value: s,
              label: ETIQUETAS_SITUACION_EVENTO[s],
            })),
          ]}
        />
      </div>

      {lista.error !== null && <Alert variant="error">{lista.error}</Alert>}
      {lista.cargando && lista.datos === null && <Cargando />}
      {lista.datos !== null && lista.datos.items.length === 0 && (
        <MensajeVacio>Todavía no hay eventos con esos filtros. Cree uno con «Nuevo evento».</MensajeVacio>
      )}
      {lista.datos !== null && lista.datos.items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-card border border-neutral-light bg-neutral-white">
            <table className="w-full min-w-[600px] text-left font-sans text-sm">
              <caption className="sr-only">Eventos de descuento</caption>
              <thead className="bg-neutral-lightest text-xs uppercase tracking-wide text-neutral-medium">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Evento
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Cuándo
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Descuento
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Situación
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-light">
                {lista.datos.items.map((e) => (
                  <tr key={e.idEvento}>
                    <td className="px-4 py-3 text-neutral-black">
                      <span className="block">{e.nombre}</span>
                      <Badge
                        variant={VARIANTE_SITUACION[e.situacion]}
                        title={AYUDA_SITUACION_EVENTO[e.situacion]}
                        className="mt-1"
                      >
                        {ETIQUETAS_SITUACION_EVENTO[e.situacion]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-neutral-dark">{resumenCalendario(e.calendario)}</td>
                    <td className="px-4 py-3 text-neutral-dark">
                      <span className="font-title font-semibold text-neutral-black">
                        hasta {formatearPorcentaje(e.porcentajeMaximo)}
                      </span>
                      <span className="block text-xs text-neutral-medium">
                        {e.totalReglas} {e.totalReglas === 1 ? 'descuento' : 'descuentos'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          isLoading={abriendo === e.idEvento}
                          onClick={() => void editar(e.idEvento)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void alternar(e.idEvento, e.nombre, e.estado === 'inactivo')}
                        >
                          {e.estado === 'inactivo' ? 'Activar' : 'Desactivar'}
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
