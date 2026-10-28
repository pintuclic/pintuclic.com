'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, PauseCircle } from 'lucide-react';
import { apiClient } from '@/core/api/apiClient';
import type { RespuestaExitosa } from '@/core/types/respuesta-api.type';
import { Alert, Button, Select, Skeleton } from '@/core/components';
import { mensajeDeError } from '../../services/mensaje-error';

type TipoIncidente =
  | 'tiempo_agotado'
  | 'no_disponible'
  | 'cuota_agotada'
  | 'respuesta_no_procesable'
  | 'error_configuracion';

interface Incidente {
  idIncidente: number;
  fecha: string;
  servicio: string;
  funcion: 'chat' | 'cuestionario';
  tipo: TipoIncidente;
  intentos: number;
  resultado: 'recuperado' | 'fallido' | 'suspendido';
}

interface EstadoServicioIa {
  configurado: boolean;
  suspendidoHasta: string | null;
  fallosConsecutivos: number;
  alertaActiva: boolean;
  ultimoIncidente: Incidente | null;
}

const ETIQUETA_TIPO: Readonly<Record<TipoIncidente, string>> = {
  tiempo_agotado: 'No respondió a tiempo',
  no_disponible: 'No estaba disponible',
  cuota_agotada: 'Se agotó la cuota',
  respuesta_no_procesable: 'Respuesta inservible',
  error_configuracion: 'Mal configurado',
};

const ETIQUETA_RESULTADO: Readonly<Record<Incidente['resultado'], string>> = {
  recuperado: 'Se recuperó al reintentar',
  fallido: 'Falló',
  suspendido: 'Se rechazó por la pausa',
};

const ETIQUETA_FUNCION: Readonly<Record<Incidente['funcion'], string>> = {
  chat: 'Asistente',
  cuestionario: 'Búsqueda asistida',
};

const fecha = (iso: string): string =>
  new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Estado del servicio de inteligencia artificial y su registro de incidentes (HU-ASE-06).
 *
 * El registro NO guarda lo que la gente escribió ni lo que respondió el modelo: solo qué
 * falló, cuántas veces se intentó y cómo terminó. Se borra solo al pasar los días
 * configurados.
 */
export function ServicioIaPanel() {
  const [estado, setEstado] = useState<EstadoServicioIa | null>(null);
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [total, setTotal] = useState(0);
  const [tipo, setTipo] = useState<'' | TipoIncidente>('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = async (filtro: '' | TipoIncidente): Promise<void> => {
    try {
      const params = new URLSearchParams({ limite: '20' });
      if (filtro !== '') params.set('tipo', filtro);

      const [respEstado, respIncidentes] = await Promise.all([
        apiClient.get<RespuestaExitosa<EstadoServicioIa>>('/admin/asesoria/ia/estado'),
        apiClient.get<{ success: true; data: Incidente[]; pagination: { total: number } }>(
          `/admin/asesoria/incidentes?${params.toString()}`,
        ),
      ]);

      setEstado(respEstado.data.data);
      setIncidentes(respIncidentes.data.data);
      setTotal(respIncidentes.data.pagination.total);
      setError(null);
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No pudimos cargar el estado del servicio.'));
    }
  };

  useEffect(() => {
    void recargar(tipo).finally(() => setCargando(false));
  }, [tipo]);

  if (cargando) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (estado === null) {
    return <Alert variant="error">{error ?? 'No pudimos cargar el estado del servicio.'}</Alert>;
  }

  return (
    <div className="space-y-6">
      {error !== null && <Alert variant="error">{error}</Alert>}

      <EstadoActual estado={estado} />

      <section className="rounded-lg border border-neutral-light bg-white p-4 space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-sans text-base font-semibold text-neutral-dark">
              Qué ha fallado
            </h3>
            <p className="font-sans text-sm text-neutral-medium">
              {total === 0
                ? 'Sin incidentes registrados.'
                : `${total} ${total === 1 ? 'incidente' : 'incidentes'} guardados. No se guarda lo que la gente escribió ni lo que respondió el servicio.`}
            </p>
          </div>

          <div className="flex items-end gap-3">
            <Select
              label="Tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as '' | TipoIncidente)}
              options={[
                { value: '', label: 'Todos' },
                ...Object.entries(ETIQUETA_TIPO).map(([valor, etiqueta]) => ({
                  value: valor,
                  label: etiqueta,
                })),
              ]}
            />
            <Button variant="outline" onClick={() => void recargar(tipo)}>
              Actualizar
            </Button>
          </div>
        </header>

        {incidentes.length === 0 ? (
          <p className="font-sans text-sm text-neutral-medium">
            Nada que mostrar con ese filtro.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-sans text-sm">
              <caption className="sr-only">Incidentes del servicio de inteligencia artificial</caption>
              <thead>
                <tr className="border-b border-neutral-light text-left text-neutral-medium">
                  <th scope="col" className="py-2 pr-4 font-medium">Cuándo</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Dónde</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Qué pasó</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Intentos</th>
                  <th scope="col" className="py-2 font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {incidentes.map((i) => (
                  <tr key={i.idIncidente} className="border-b border-neutral-light/60">
                    <td className="py-2 pr-4 text-neutral-dark">{fecha(i.fecha)}</td>
                    <td className="py-2 pr-4 text-neutral-medium">{ETIQUETA_FUNCION[i.funcion]}</td>
                    <td className="py-2 pr-4 text-neutral-dark">{ETIQUETA_TIPO[i.tipo]}</td>
                    <td className="py-2 pr-4 text-neutral-medium">{i.intentos}</td>
                    <td className="py-2 text-neutral-medium">{ETIQUETA_RESULTADO[i.resultado]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function EstadoActual({ estado }: { estado: EstadoServicioIa }) {
  if (!estado.configurado) {
    return (
      <Alert variant="info" title="El servicio de IA no está configurado">
        Falta la clave del proveedor. El asistente y la búsqueda asistida no se ofrecen, pero la
        calculadora y el cuestionario de preguntas fijas funcionan con normalidad.
      </Alert>
    );
  }

  if (estado.suspendidoHasta !== null) {
    return (
      <Alert variant="warning" title="En pausa porque se agotó la cuota">
        <p className="flex items-center gap-2">
          <PauseCircle className="h-4 w-4" aria-hidden="true" />
          Se vuelve a intentar a partir de las {fecha(estado.suspendidoHasta)}. Mientras tanto el
          resto del sitio sigue funcionando.
        </p>
      </Alert>
    );
  }

  if (estado.alertaActiva) {
    return (
      <Alert variant="error" title="El servicio está fallando">
        <p className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          Lleva {estado.fallosConsecutivos} fallos seguidos. Revisa la tabla de abajo para ver qué
          está pasando.
        </p>
      </Alert>
    );
  }

  return (
    <Alert variant="success" title="El servicio responde con normalidad">
      <p className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        {estado.ultimoIncidente === null
          ? 'No se ha registrado ningún incidente.'
          : `El último incidente fue el ${fecha(estado.ultimoIncidente.fecha)}.`}
      </p>
    </Alert>
  );
}
