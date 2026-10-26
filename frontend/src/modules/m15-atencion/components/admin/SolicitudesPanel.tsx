'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MessageSquare, Star } from 'lucide-react';
import {
  Alert,
  Badge,
  type BadgeVariant,
  Button,
  Select,
  Skeleton,
  Textarea,
} from '@/core/components';
import {
  ESTADOS_SOLICITUD,
  TIPOS_SOLICITUD,
  mensajeSolicitudFormSchema,
  type MensajeSolicitudFormData,
} from '../../dtos/m15-atencion.dto';
import type {
  EstadoSolicitudContacto,
  SolicitudContacto,
  SolicitudContactoDetalle,
  TipoSolicitudContacto,
} from '../../interfaces/atencion.interface';
import {
  cambiarEstadoSolicitud,
  enviarMensajeEquipo,
  listarSolicitudes,
  obtenerSolicitudDetalleAdmin,
} from '../../services/atencion-api';
import { mensajeDeError } from '../../services/mensaje-error';

const LIMITE = 20;

const OPCIONES_TIPO = [
  { value: '', label: 'Todos los tipos' },
  ...TIPOS_SOLICITUD.map(({ valor, etiqueta }) => ({ value: valor, label: etiqueta })),
];

const OPCIONES_ESTADO = [
  { value: '', label: 'Todos los estados' },
  ...ESTADOS_SOLICITUD.map(({ valor, etiqueta }) => ({ value: valor, label: etiqueta })),
];

const ETIQUETA_TIPO = new Map<TipoSolicitudContacto, string>(
  TIPOS_SOLICITUD.map(({ valor, etiqueta }) => [valor, etiqueta]),
);

const ETIQUETA_ESTADO = new Map<EstadoSolicitudContacto, string>(
  ESTADOS_SOLICITUD.map(({ valor, etiqueta }) => [valor, etiqueta]),
);

const VARIANTE_ESTADO: Record<EstadoSolicitudContacto, BadgeVariant> = {
  en_revision: 'sponsored',
  atendida: 'success',
  rechazada: 'danger',
};

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface HiloAdminProps {
  idSolicitud: string;
  onActualizado: (solicitudActualizada: SolicitudContacto) => void;
}

function HiloSolicitudAdmin({ idSolicitud, onActualizado }: HiloAdminProps) {
  const [detalle, setDetalle] = useState<SolicitudContactoDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MensajeSolicitudFormData>({
    resolver: zodResolver(mensajeSolicitudFormSchema),
    defaultValues: { contenido: '' },
  });

  const cargarDetalle = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await obtenerSolicitudDetalleAdmin(idSolicitud);
      setDetalle(data);
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No pudimos cargar la conversación de esta solicitud.'));
    } finally {
      setCargando(false);
    }
  }, [idSolicitud]);

  useEffect(() => {
    void cargarDetalle();
  }, [cargarDetalle]);

  const responder = handleSubmit(async (datos) => {
    if (detalle === null) return;
    setError(null);
    try {
      const nuevoMensaje = await enviarMensajeEquipo(detalle.idSolicitud, datos.contenido);
      const actualizado: SolicitudContactoDetalle = {
        ...detalle,
        totalMensajes: detalle.totalMensajes + 1,
        mensajes: [...detalle.mensajes, nuevoMensaje],
      };
      setDetalle(actualizado);
      onActualizado(actualizado);
      reset({ contenido: '' });
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No pudimos enviar la respuesta al cliente.'));
    }
  });

  const actualizarEstado = async (nuevoEstado: EstadoSolicitudContacto) => {
    if (detalle === null || detalle.estado === nuevoEstado || cambiandoEstado) return;
    setCambiandoEstado(true);
    setError(null);
    try {
      const actualizada = await cambiarEstadoSolicitud(detalle.idSolicitud, nuevoEstado);
      const detalleActualizado: SolicitudContactoDetalle = {
        ...detalle,
        estado: actualizada.estado,
        calificacion: actualizada.calificacion,
        fechaCalificacion: actualizada.fechaCalificacion,
      };
      setDetalle(detalleActualizado);
      onActualizado(actualizada);
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No pudimos actualizar el estado de la solicitud.'));
    } finally {
      setCambiandoEstado(false);
    }
  };

  if (cargando) {
    return (
      <div className="mt-4 space-y-2 border-t border-neutral-light pt-4" aria-busy="true">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (detalle === null) {
    return (
      <div className="mt-4 border-t border-neutral-light pt-4">
        {error !== null && <Alert variant="error">{error}</Alert>}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4 border-t border-neutral-light pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-neutral-light bg-neutral-lightest p-3">
        <span className="font-sans text-xs text-neutral-dark">
          Cambiar estado de la solicitud:
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={detalle.estado === 'en_revision' ? 'selection' : 'outline'}
            selected={detalle.estado === 'en_revision'}
            size="sm"
            disabled={cambiandoEstado || detalle.estado === 'en_revision'}
            onClick={() => void actualizarEstado('en_revision')}
          >
            En revisión
          </Button>
          <Button
            variant={detalle.estado === 'atendida' ? 'primary-conversion' : 'outline'}
            size="sm"
            disabled={cambiandoEstado || detalle.estado === 'atendida'}
            onClick={() => void actualizarEstado('atendida')}
          >
            Marcar atendida
          </Button>
          <Button
            variant={detalle.estado === 'rechazada' ? 'danger' : 'outline'}
            size="sm"
            disabled={cambiandoEstado || detalle.estado === 'rechazada'}
            onClick={() => void actualizarEstado('rechazada')}
          >
            Rechazar solicitud
          </Button>
        </div>
      </div>

      {detalle.calificacion !== null && (
        <div className="flex items-center gap-2 rounded-card border border-neutral-light bg-neutral-white p-3">
          <Star className="h-4 w-4 fill-highlight text-highlight" aria-hidden="true" />
          <span className="font-sans text-sm text-neutral-dark">
            Calificación del cliente:{' '}
            <strong className="font-title font-semibold text-corporate">
              {detalle.calificacion} de 5 estrellas
            </strong>
          </span>
        </div>
      )}

      <div className="space-y-3 rounded-card bg-neutral-lightest p-4">
        <div className="mr-auto max-w-[85%] rounded-card border border-neutral-light bg-neutral-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-title text-xs font-semibold text-corporate">
              {detalle.remitente.nombre} · Solicitud inicial
            </span>
            <span className="font-sans text-xs text-neutral-medium">
              {formatearFecha(detalle.fechaCreacion)}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-line font-sans text-sm text-neutral-dark">
            {detalle.descripcion}
          </p>
        </div>

        {detalle.mensajes.length === 0 ? (
          <p className="py-2 text-center font-sans text-xs text-neutral-medium">
            Aún no hay respuestas en esta conversación.
          </p>
        ) : (
          detalle.mensajes.map((mensaje) => {
            const esEquipo = mensaje.rolAutor === 'equipo';
            return (
              <div
                key={mensaje.idMensaje}
                className={
                  esEquipo
                    ? 'ml-auto max-w-[85%] rounded-card border border-action/30 bg-subaction/40 p-3'
                    : 'mr-auto max-w-[85%] rounded-card border border-neutral-light bg-neutral-white p-3'
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-title text-xs font-semibold text-corporate">
                    {esEquipo ? `Equipo (${mensaje.nombreAutor})` : mensaje.nombreAutor}
                  </span>
                  <span className="font-sans text-xs text-neutral-medium">
                    {formatearFecha(mensaje.fechaCreacion)}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-line font-sans text-sm text-neutral-dark">
                  {mensaje.contenido}
                </p>
              </div>
            );
          })
        )}
      </div>

      {error !== null && <Alert variant="error">{error}</Alert>}

      <form onSubmit={responder} className="space-y-3" noValidate>
        <Textarea
          label="Responder al cliente"
          rows={3}
          placeholder="Escribe tu respuesta para el cliente..."
          error={errors.contenido?.message}
          {...register('contenido')}
        />
        <div className="flex justify-end">
          <Button type="submit" variant="primary-action" size="sm" isLoading={isSubmitting}>
            Enviar respuesta
          </Button>
        </div>
      </form>
    </div>
  );
}

export function SolicitudesPanel() {
  const [solicitudes, setSolicitudes] = useState<SolicitudContacto[] | null>(null);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [tipo, setTipo] = useState<TipoSolicitudContacto | ''>('');
  const [estado, setEstado] = useState<EstadoSolicitudContacto | ''>('');
  const [idExpandido, setIdExpandido] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const resultado = await listarSolicitudes({
        pagina,
        limite: LIMITE,
        ...(tipo === '' ? {} : { tipo }),
        ...(estado === '' ? {} : { estado }),
      });
      setSolicitudes(resultado.items);
      setTotal(resultado.pagination.total);
      setTotalPaginas(Math.max(resultado.pagination.totalPaginas, 1));
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No pudimos cargar las solicitudes.'));
    }
  }, [pagina, tipo, estado]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const actualizarEnLista = (actualizada: SolicitudContacto) => {
    setSolicitudes((prev) =>
      prev === null
        ? null
        : prev.map((item) =>
            item.idSolicitud === actualizada.idSolicitud
              ? {
                  ...item,
                  estado: actualizada.estado,
                  calificacion: actualizada.calificacion,
                  fechaCalificacion: actualizada.fechaCalificacion,
                  totalMensajes: actualizada.totalMensajes,
                }
              : item,
          ),
    );
  };

  if (solicitudes === null) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Cargando solicitudes">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="Tipo"
          options={OPCIONES_TIPO}
          value={tipo}
          onChange={(evento) => {
            setTipo(evento.target.value as TipoSolicitudContacto | '');
            setPagina(1);
          }}
        />
        <Select
          label="Estado"
          options={OPCIONES_ESTADO}
          value={estado}
          onChange={(evento) => {
            setEstado(evento.target.value as EstadoSolicitudContacto | '');
            setPagina(1);
          }}
        />
        <p className="ml-auto font-sans text-sm text-neutral-dark">
          {total} {total === 1 ? 'solicitud' : 'solicitudes'}
        </p>
      </div>

      {error !== null && <Alert variant="error">{error}</Alert>}

      {solicitudes.length === 0 ? (
        <p className="font-sans text-sm text-neutral-medium">
          No hay solicitudes con estos filtros.
        </p>
      ) : (
        <ul className="space-y-3">
          {solicitudes.map((solicitud) => {
            const expandida = idExpandido === solicitud.idSolicitud;
            return (
              <li
                key={solicitud.idSolicitud}
                className="rounded-card border border-neutral-light bg-neutral-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="action">
                        {ETIQUETA_TIPO.get(solicitud.tipo) ?? solicitud.tipo}
                      </Badge>
                      <Badge variant={VARIANTE_ESTADO[solicitud.estado]}>
                        {ETIQUETA_ESTADO.get(solicitud.estado) ?? solicitud.estado}
                      </Badge>
                      <span className="font-sans text-xs text-neutral-medium">
                        {formatearFecha(solicitud.fechaCreacion)}
                      </span>
                      <span className="inline-flex items-center gap-1 font-sans text-xs text-neutral-medium">
                        <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                        {solicitud.totalMensajes}{' '}
                        {solicitud.totalMensajes === 1 ? 'mensaje' : 'mensajes'}
                      </span>
                      {solicitud.calificacion !== null && (
                        <span className="inline-flex items-center gap-1 font-title text-xs font-semibold text-neutral-dark">
                          <Star
                            className="h-3.5 w-3.5 fill-highlight text-highlight"
                            aria-hidden="true"
                          />
                          {solicitud.calificacion}/5
                        </span>
                      )}
                    </div>

                    <p className="mt-2 whitespace-pre-line font-sans text-sm text-neutral-dark">
                      {solicitud.descripcion}
                    </p>

                    <p className="mt-2 font-sans text-xs text-neutral-medium">
                      {solicitud.remitente.nombre} · {solicitud.remitente.correo}
                      {solicitud.remitente.telefono === null
                        ? ''
                        : ` · ${solicitud.remitente.telefono}`}
                    </p>
                  </div>

                  <Button
                    variant={expandida ? 'selection' : 'outline'}
                    selected={expandida}
                    size="sm"
                    onClick={() =>
                      setIdExpandido((actual) =>
                        actual === solicitud.idSolicitud ? null : solicitud.idSolicitud,
                      )
                    }
                  >
                    {expandida ? 'Ocultar conversación' : 'Responder / Ver hilo'}
                  </Button>
                </div>

                {expandida && (
                  <HiloSolicitudAdmin
                    idSolicitud={solicitud.idSolicitud}
                    onActualizado={actualizarEnLista}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={pagina <= 1}
            onClick={() => setPagina((actual) => actual - 1)}
          >
            Anterior
          </Button>
          <span className="font-sans text-sm text-neutral-dark">
            Página {pagina} de {totalPaginas}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagina >= totalPaginas}
            onClick={() => setPagina((actual) => actual + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}