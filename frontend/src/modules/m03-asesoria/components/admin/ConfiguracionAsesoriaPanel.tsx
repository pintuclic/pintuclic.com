'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Input, Select, Skeleton, Textarea } from '@/core/components';
import type { ConfiguracionAsesoria, ModoCuestionario } from '../../interfaces/cuestionario.interface';
import { editarConfiguracion, obtenerConfiguracion } from '../../services/cuestionario-api';
import { mensajeDeError } from '../../services/mensaje-error';

/**
 * Configuración de M03 (contrato · D3, D8, Q1).
 *
 * El interruptor del modo de cuestionario es lo que permite comparar los dos y decidir sin
 * desplegar nada: se cambia aquí y vale desde la siguiente petición del público.
 *
 * Los guiones orientan a la inteligencia artificial, pero no pueden levantar las reglas duras
 * del código (vocabulario cerrado, lista cerrada de productos, nada de precios).
 */
export function ConfiguracionAsesoriaPanel() {
  const [config, setConfig] = useState<ConfiguracionAsesoria | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    obtenerConfiguracion()
      .then((c) => {
        if (vigente) setConfig(c);
      })
      .catch((err: unknown) => {
        if (vigente) setError(mensajeDeError(err, 'No pudimos cargar la configuración.'));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  const guardar = async (cambios: Partial<Omit<ConfiguracionAsesoria, 'fechaActualizacion'>>): Promise<void> => {
    setGuardando(true);
    setError(null);
    setAviso(null);
    try {
      setConfig(await editarConfiguracion(cambios));
      setAviso('Configuración guardada.');
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No pudimos guardar la configuración.'));
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (config === null) {
    return <Alert variant="error">{error ?? 'No pudimos cargar la configuración.'}</Alert>;
  }

  return (
    <div className="space-y-6">
      {error !== null && <Alert variant="error">{error}</Alert>}
      {aviso !== null && <Alert variant="success">{aviso}</Alert>}

      <ModoDeCuestionario modo={config.modoCuestionario} guardando={guardando} onGuardar={guardar} />
      <ManosPorDefecto manos={config.manosPorDefecto} guardando={guardando} onGuardar={guardar} />
      <Guiones config={config} guardando={guardando} onGuardar={guardar} />
      <ParametrosIa config={config} guardando={guardando} onGuardar={guardar} />
    </div>
  );
}

type Guardar = (cambios: Partial<Omit<ConfiguracionAsesoria, 'fechaActualizacion'>>) => Promise<void>;

function Seccion({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-neutral-light bg-white p-4 space-y-4">
      <header>
        <h3 className="font-sans text-base font-semibold text-neutral-dark">{titulo}</h3>
        <p className="font-sans text-sm text-neutral-medium">{descripcion}</p>
      </header>
      {children}
    </section>
  );
}

function ModoDeCuestionario({
  modo,
  guardando,
  onGuardar,
}: {
  modo: ModoCuestionario;
  guardando: boolean;
  onGuardar: Guardar;
}) {
  const [valor, setValor] = useState<ModoCuestionario>(modo);

  return (
    <Seccion
      titulo="Cómo se hacen las preguntas"
      descripcion="Con «Preguntas fijas» el cuestionario usa las preguntas que administras aquí. Con «Asistido por IA» las propone el servicio de inteligencia artificial."
    >
      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="Modo"
          value={valor}
          onChange={(e) => setValor(e.target.value === 'asistido' ? 'asistido' : 'fijo')}
          options={[
            { value: 'fijo', label: 'Preguntas fijas' },
            { value: 'asistido', label: 'Asistido por IA' },
          ]}
        />
        <Button
          isLoading={guardando}
          disabled={valor === modo}
          onClick={() => void onGuardar({ modoCuestionario: valor })}
        >
          Guardar modo
        </Button>
      </div>
    </Seccion>
  );
}

function ManosPorDefecto({
  manos,
  guardando,
  onGuardar,
}: {
  manos: number | null;
  guardando: boolean;
  onGuardar: Guardar;
}) {
  const [valor, setValor] = useState(manos === null ? '' : String(manos));
  const [error, setError] = useState<string | null>(null);

  const guardar = (): void => {
    const limpio = valor.trim();
    if (limpio === '') {
      setError(null);
      void onGuardar({ manosPorDefecto: null });
      return;
    }
    if (!/^\d+$/.test(limpio) || Number(limpio) < 1 || Number(limpio) > 10) {
      setError('Escribe un número entero de 1 a 10, o déjalo vacío');
      return;
    }
    setError(null);
    void onGuardar({ manosPorDefecto: Number(limpio) });
  };

  return (
    <Seccion
      titulo="Manos sugeridas en la calculadora"
      descripcion="Es solo una sugerencia que el cliente aplica con un clic: la calculadora nunca rellena las manos por su cuenta. Déjalo vacío para no sugerir ninguna."
    >
      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="Manos sugeridas"
          inputMode="numeric"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          error={error ?? undefined}
          placeholder="Sin sugerencia"
        />
        <Button isLoading={guardando} onClick={guardar}>
          Guardar
        </Button>
      </div>
    </Seccion>
  );
}

function Guiones({
  config,
  guardando,
  onGuardar,
}: {
  config: ConfiguracionAsesoria;
  guardando: boolean;
  onGuardar: Guardar;
}) {
  const [cuestionario, setCuestionario] = useState(config.guionCuestionario);
  const [asistente, setAsistente] = useState(config.guionAsistente);

  return (
    <Seccion
      titulo="Guiones de la inteligencia artificial"
      descripcion="Orientan el tono y los temas. No pueden saltarse las reglas del sistema: la IA solo propone filtros y productos que existen en el catálogo, y nunca habla de precios ni de existencias."
    >
      <Textarea
        label="Guion del cuestionario asistido"
        rows={4}
        value={cuestionario}
        onChange={(e) => setCuestionario(e.target.value)}
        helperText={`${cuestionario.length} de 4000 caracteres`}
      />
      <Textarea
        label="Guion del asistente"
        rows={6}
        value={asistente}
        onChange={(e) => setAsistente(e.target.value)}
        helperText={`${asistente.length} de 4000 caracteres`}
      />
      <Button
        isLoading={guardando}
        onClick={() =>
          void onGuardar({ guionCuestionario: cuestionario, guionAsistente: asistente })
        }
      >
        Guardar guiones
      </Button>
    </Seccion>
  );
}

function ParametrosIa({
  config,
  guardando,
  onGuardar,
}: {
  config: ConfiguracionAsesoria;
  guardando: boolean;
  onGuardar: Guardar;
}) {
  const [espera, setEspera] = useState(String(config.iaTiempoEsperaMs));
  const [reintentos, setReintentos] = useState(String(config.iaReintentos));
  const [suspension, setSuspension] = useState(String(config.iaSuspensionCuotaMinutos));
  const [retencion, setRetencion] = useState(String(config.iaRetencionIncidentesDias));
  const [fallos, setFallos] = useState(String(config.iaFallosConsecutivosAlerta));

  return (
    <Seccion
      titulo="Servicio de inteligencia artificial"
      descripcion="Cuánto se espera una respuesta, cuántas veces se reintenta y cuándo se avisa de que el servicio está fallando."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          label="Espera máxima (ms)"
          inputMode="numeric"
          value={espera}
          onChange={(e) => setEspera(e.target.value)}
        />
        <Input
          label="Reintentos"
          inputMode="numeric"
          value={reintentos}
          onChange={(e) => setReintentos(e.target.value)}
        />
        <Input
          label="Pausa si se agota la cuota (min)"
          inputMode="numeric"
          value={suspension}
          onChange={(e) => setSuspension(e.target.value)}
        />
        <Input
          label="Guardar incidentes (días)"
          inputMode="numeric"
          value={retencion}
          onChange={(e) => setRetencion(e.target.value)}
        />
        <Input
          label="Avisar tras N fallos seguidos"
          inputMode="numeric"
          value={fallos}
          onChange={(e) => setFallos(e.target.value)}
        />
      </div>
      <Button
        isLoading={guardando}
        onClick={() =>
          void onGuardar({
            iaTiempoEsperaMs: Number(espera) || 0,
            iaReintentos: Number(reintentos) || 0,
            iaSuspensionCuotaMinutos: Number(suspension) || 0,
            iaRetencionIncidentesDias: Number(retencion) || 0,
            iaFallosConsecutivosAlerta: Number(fallos) || 0,
          })
        }
      >
        Guardar parámetros
      </Button>
    </Seccion>
  );
}
