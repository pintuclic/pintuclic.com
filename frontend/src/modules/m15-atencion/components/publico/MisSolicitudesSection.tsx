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
  ButtonLink,
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
  CalificacionAtencion,
  EstadoSolicitudContacto,
  SolicitudContacto,
  SolicitudContactoDetalle,
  TipoSolicitudContacto,
} from '../../interfaces/atencion.interface';
import {
  calificarMiSolicitud,
  enviarMensajeCliente,
  listarMisSolicitudes,
  obtenerMiSolicitudDetalle,
} from '../../services/atencion-api';
import { mensajeDeError } from '../../services/mensaje-error';
import { FormularioContacto } from './FormularioContacto';

const LIMITE = 10;
const ESTRELLAS: readonly CalificacionAtencion[] = [1, 2, 3, 4, 5];

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

interface HiloClienteProps {
  idSolicitud: string;
  onActualizado: (solicitudActualizada: SolicitudContacto) => void;
}

function HiloSolicitudCliente({ idSolicitud, onActualizado }: HiloClienteProps) {
  const [detalle, setDetalle] = useState<SolicitudContactoDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardandoCalificacion, setGuardandoCalificacion] = useState(false);
  const [avisoCalificacion, setAvisoCalificacion] = useState<string | null>(null);

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
      const data = await obtenerMiSolicitudDetalle(idSolicitud);
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

  const enviarMensaje = handleSubmit(async (datos) => {
    if (detalle === null) return;
    setError(null);
    try {
      const nuevoMensaje = await enviarMensajeCliente(detalle.idSolicitud, datos.contenido);
      const actualizado: SolicitudContactoDetalle = {
        ...detalle,
        totalMensajes: detalle.totalMensajes + 1,
        mensajes: [...detalle.mensajes, nuevoMensaje],
      };
      setDetalle(actualizado);
      onActualizado(actualizado);
      reset({ contenido: '' });
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No pudimos enviar tu mensaje.'));
    }
  });

  const seleccionarCalificacion = async (valor: CalificacionAtencion) => {
    if (detalle === null || guardandoCalificacion) return;
    setGuardandoCalificacion(true);
    setError(null);
    setAvisoCalificacion(null);
    try {
      const actualizada = await calificarMiSolicitud(detalle.idSolicitud, valor);
      const detalleActualizado: SolicitudContactoDetalle = {
        ...detalle,
        calificacion: actualizada.calificacion,
        fechaCalificacion: actualizada.fechaCalificacion,
      };
      setDetalle(detalleActualizado);
      onActualizado(actualizada);
      setAvisoCalificacion(
        `Calificaste esta atención con ${valor} de 5 ${valor === 1 ? 'estrella' : 'estrellas'}. ¡Gracias por tu opinión!`,
      );
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No pudimos guardar tu calificación.'));
    } finally {
      setGuardandoCalificacion(false);
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
      <div className="space-y-3 rounded-card bg-neutral-lightest p-4">
        <div className="ml-auto max-w-[85%] rounded-card border border-action/30 bg-subaction/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-title text-xs font-semibold text-corporate">
              Tú · Solicitud inicial
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
            Aún no hay mensajes adicionales en esta conversación.
          </p>
        ) : (
          detalle.mensajes.map((mensaje) => {
            const esCliente = mensaje.rolAutor === 'cliente';
            return (
              <div
                key={mensaje.idMensaje}
                className={
                  esCliente
                    ? 'ml-auto max-w-[85%] rounded-card border border-action/30 bg-subaction/40 p-3'
                    : 'mr-auto max-w-[85%] rounded-card border border-neutral-light bg-neutral-white p-3'
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-title text-xs font-semibold text-corporate">
                    {esCliente ? 'Tú' : `Equipo Pintu Clic (${mensaje.nombreAutor})`}
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

      {detalle.estado === 'en_revision' && (
        detalle.mensajes[detalle.mensajes.length - 1]?.rolAutor === 'cliente' ? (
          <div className="rounded-card border border-neutral-light bg-neutral-lightest p-3 font-sans text-sm text-neutral-dark">
            Ya enviaste un mensaje adicional. Podrás escribir otro mensaje cuando nuestro equipo te
            responda.
          </div>
        ) : (
          <form onSubmit={enviarMensaje} className="space-y-3" noValidate>
            <Textarea
              label="Escribe un mensaje"
              rows={3}
              placeholder="Agrega más información o responde a nuestro equipo..."
              error={errors.contenido?.message}
              {...register('contenido')}
            />
            <div className="flex justify-end">
              <Button type="submit" variant="primary-action" size="sm" isLoading={isSubmitting}>
                Enviar mensaje
              </Button>
            </div>
          </form>
        )
      )}

      {detalle.estado === 'rechazada' && (
        <div className="rounded-card border border-danger/30 bg-danger-subtle p-3 font-sans text-sm text-neutral-dark">
          Esta solicitud fue rechazada porque no corresponde a productos o servicios de Pintu Clic y
          no admite nuevos mensajes.
        </div>
      )}

      {detalle.estado === 'atendida' && (
        <div className="space-y-3">
          <div className="rounded-card border border-neutral-light bg-neutral-lightest p-3 font-sans text-sm text-neutral-dark">
            Esta solicitud fue atendida y quedó cerrada. Si tienes otra inquietud, puedes crear una
            nueva solicitud.
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-neutral-light bg-neutral-white p-4">
            <div>
              <p className="font-title text-sm font-semibold text-corporate">
                ¿Cómo fue mi respuesta el día de hoy?
              </p>
              <p className="font-sans text-xs text-neutral-medium">
                {detalle.calificacion === null
                  ? 'Selecciona de 1 a 5 estrellas para calificar la atención recibida.'
                  : `Tu calificación actual: ${detalle.calificacion} de 5 estrellas.`}
              </p>
            </div>

            <div
              className="flex items-center gap-1"
              role="group"
              aria-label="Calificar atención de 1 a 5 estrellas"
            >
              {ESTRELLAS.map((valor) => {
                const activa = detalle.calificacion !== null && valor <= detalle.calificacion;
                return (
                  <button
                    key={valor}
                    type="button"
                    disabled={guardandoCalificacion}
                    onClick={() => void seleccionarCalificacion(valor)}
                    aria-label={`Calificar con ${valor} ${valor === 1 ? 'estrella' : 'estrellas'}`}
                    aria-pressed={detalle.calificacion === valor}
                    className="rounded-btn p-1.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                  >
                    <Star
                      className={
                        activa
                          ? 'h-6 w-6 fill-highlight text-highlight'
                          : 'h-6 w-6 text-neutral-light hover:text-highlight'
                      }
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {avisoCalificacion !== null && <Alert variant="success">{avisoCalificacion}</Alert>}
        </div>
      )}
    </div>
  );
}

export function MisSolicitudesSection() {
  const [solicitudes, setSolicitudes] = useState<SolicitudContacto[] | null>(null);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [tipo, setTipo] = useState<TipoSolicitudContacto | ''>('');
  const [estado, setEstado] = useState<EstadoSolicitudContacto | ''>('');
  const [idExpandido, setIdExpandido] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const resultado = await listarMisSolicitudes({
        pagina,
        limite: LIMITE,
        ...(tipo === '' ? {} : { tipo }),
        ...(estado === '' ? {} : { estado }),
      });
      setSolicitudes(resultado.items);
      setTotal(resultado.pagination.total);
      setTotalPaginas(Math.max(resultado.pagination.totalPaginas, 1));
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No pudimos cargar tus solicitudes de contacto.'));
    }
  }, [pagina, tipo, estado]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const actualizarSolicitudEnLista = (actualizada: SolicitudContacto) => {
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

  if (solicitudes === null && error === null) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Cargando tus solicitudes">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-title text-xl font-bold text-corporate">
            Mis solicitudes de contacto
          </h2>
          <p className="mt-1 font-sans text-sm text-neutral-medium">
            Revisa el estado de tus consultas, cotizaciones y reclamos, conversa con nuestro equipo y
            califica la atención recibida.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink href="/centro-de-ayuda#contacto-equipo" variant="ghost" size="sm">
            Ir al centro de ayuda
          </ButtonLink>
          <Button
            variant={mostrarFormulario ? 'selection' : 'outline'}
            selected={mostrarFormulario}
            size="sm"
            onClick={() => setMostrarFormulario((actual) => !actual)}
          >
            {mostrarFormulario ? 'Ocultar formulario' : 'Nueva solicitud'}
          </Button>
        </div>
      </div>

      {mostrarFormulario && (
        <div className="rounded-card border border-neutral-light bg-neutral-white p-5 shadow-card">
          <h3 className="mb-1 font-title text-base font-bold text-corporate">
            Nueva solicitud de contacto
          </h3>
          <p className="mb-4 font-sans text-sm text-neutral-medium">
            Cuéntanos qué necesitas y podrás dar seguimiento a la conversación desde aquí mismo.
          </p>
          <FormularioContacto
            mostrarEnlaceMisSolicitudes={false}
            onSolicitudCreada={() => {
              setPagina(1);
              void cargar();
            }}
          />
        </div>
      )}

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

      {solicitudes !== null && solicitudes.length === 0 ? (
        <div className="rounded-card border border-neutral-light bg-neutral-lightest p-6 text-center">
          <p className="font-sans text-sm text-neutral-dark">
            Aún no tienes solicitudes de contacto con estos filtros.
          </p>
          {!mostrarFormulario && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="primary-action"
                size="sm"
                onClick={() => setMostrarFormulario(true)}
              >
                Escribir al equipo
              </Button>
              <ButtonLink href="/centro-de-ayuda#contacto-equipo" variant="outline" size="sm">
                Ver centro de ayuda
              </ButtonLink>
            </div>
          )}
        </div>
      ) : (
        <ul className="space-y-4">
          {(solicitudes ?? []).map((solicitud) => {
            const expandida = idExpandido === solicitud.idSolicitud;
            return (
              <li
                key={solicitud.idSolicitud}
                className="rounded-card border border-neutral-light bg-neutral-white p-4 shadow-2xs"
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
                    {expandida ? 'Ocultar conversación' : 'Ver conversación'}
                  </Button>
                </div>

                {expandida && (
                  <HiloSolicitudCliente
                    idSolicitud={solicitud.idSolicitud}
                    onActualizado={actualizarSolicitudEnLista}
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