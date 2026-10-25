'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Select, Skeleton } from '@/core/components';
import { TIPOS_SOLICITUD } from '../../dtos/m15-atencion.dto';
import type {
  EstadoSolicitudContacto,
  SolicitudContacto,
  TipoSolicitudContacto,
} from '../../interfaces/atencion.interface';
import { listarSolicitudes, marcarSolicitudAtendida } from '../../services/atencion-api';
import { mensajeDeError } from '../../services/mensaje-error';

const LIMITE = 20;

const OPCIONES_TIPO = [
  { value: '', label: 'Todos los tipos' },
  ...TIPOS_SOLICITUD.map(({ valor, etiqueta }) => ({ value: valor, label: etiqueta })),
];

const OPCIONES_ESTADO = [
  { value: '', label: 'Todos los estados' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'atendida', label: 'Atendidas' },
];

const ETIQUETA_TIPO = new Map(TIPOS_SOLICITUD.map(({ valor, etiqueta }) => [valor, etiqueta]));

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SolicitudesPanel() {
  const [solicitudes, setSolicitudes] = useState<SolicitudContacto[] | null>(null);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [tipo, setTipo] = useState<TipoSolicitudContacto | ''>('');
  const [estado, setEstado] = useState<EstadoSolicitudContacto | ''>('');
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

  const atender = async (idSolicitud: string) => {
    setError(null);
    try {
      await marcarSolicitudAtendida(idSolicitud);
      await cargar();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No pudimos marcar la solicitud como atendida.'));
    }
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
          {solicitudes.map((solicitud) => (
            <li
              key={solicitud.idSolicitud}
              className="rounded-card border border-neutral-light bg-neutral-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="action">
                      {ETIQUETA_TIPO.get(solicitud.tipo) ?? solicitud.tipo}
                    </Badge>
                    <Badge variant={solicitud.estado === 'pendiente' ? 'offer' : 'success'}>
                      {solicitud.estado === 'pendiente' ? 'Pendiente' : 'Atendida'}
                    </Badge>
                    <span className="font-sans text-xs text-neutral-medium">
                      {formatearFecha(solicitud.fechaCreacion)}
                    </span>
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

                {solicitud.estado === 'pendiente' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void atender(solicitud.idSolicitud)}
                  >
                    Marcar atendida
                  </Button>
                )}
              </div>
            </li>
          ))}
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
