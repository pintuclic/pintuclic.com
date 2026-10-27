'use client';

import { useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calculator, Info } from 'lucide-react';
import { Alert, Button, Input, SegmentedTabs, Select, Skeleton } from '@/core/components';
import {
  formularioCantidadSchema,
  formularioCoberturaSchema,
  numeroDeCampo,
  type FormularioCantidad,
  type FormularioCobertura,
} from '../../dtos/m03-asesoria.dto';
import type {
  CalculadoraProducto,
  ResultadoCalculo,
  SentidoCalculo,
} from '../../interfaces/asesoria.interface';
import {
  calcularCantidad,
  calcularCobertura,
  obtenerCalculadoraDeProducto,
} from '../../services/asesoria-api';
import {
  esSinCalculadora,
  formatearIntervalo,
  mensajeDeError,
  unidadesDe,
} from '../../services/mensaje-error';

const SENTIDOS: ReadonlyArray<{ value: SentidoCalculo; label: string }> = [
  { value: 'cantidad', label: 'Cuánto comprar' },
  { value: 'cobertura', label: 'Cuánto rinde' },
];

export interface CalculadoraPinturaProps {
  /** Producto sobre el que se calcula. */
  idProducto: number;
  /**
   * Datos ya cargados. La ficha de producto los puede pasar para que la calculadora
   * aparezca sin una segunda petición; si no, se piden aquí.
   */
  datosIniciales?: CalculadoraProducto;
  /** La calculadora general ya muestra el nombre en su selector, así que lo oculta. */
  mostrarNombre?: boolean;
}

/**
 * HU-ASE-02 — Calculadora de pintura.
 *
 * Un solo componente para las dos entradas del contrato (D5): la ficha de un producto le
 * pasa su `idProducto` y la calculadora general le pasa el que la persona eligió en el
 * selector. Y los dos sentidos: cuánto comprar para un área y cuánta área cubre una
 * cantidad.
 *
 * Si el producto no ofrece calculadora, el servidor responde 404 y aquí NO se dibuja nada
 * (RF-ASE-02-07, CA-ASE-02-07): así aparece sola en cada ficha que cumpla, sin tener que
 * montarla producto por producto.
 */
export function CalculadoraPintura({
  idProducto,
  datosIniciales,
  mostrarNombre = true,
}: CalculadoraPinturaProps) {
  const idPanel = useId();
  const [datos, setDatos] = useState<CalculadoraProducto | null>(datosIniciales ?? null);
  const [cargando, setCargando] = useState(datosIniciales === undefined);
  const [sinCalculadora, setSinCalculadora] = useState(false);
  const [sentido, setSentido] = useState<SentidoCalculo>('cantidad');
  const [resultado, setResultado] = useState<ResultadoCalculo | null>(null);
  const [errorApi, setErrorApi] = useState<string | null>(null);

  useEffect(() => {
    if (datosIniciales !== undefined) {
      setDatos(datosIniciales);
      setCargando(false);
      return;
    }

    let vigente = true;
    setCargando(true);
    setSinCalculadora(false);
    setResultado(null);

    obtenerCalculadoraDeProducto(idProducto)
      .then((respuesta) => {
        if (!vigente) return;
        setDatos(respuesta);
        setErrorApi(null);
      })
      .catch((err: unknown) => {
        if (!vigente) return;
        setDatos(null);
        if (esSinCalculadora(err)) {
          setSinCalculadora(true);
          return;
        }
        setErrorApi(mensajeDeError(err, 'No pudimos cargar la calculadora. Inténtalo de nuevo.'));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [idProducto, datosIniciales]);

  if (cargando) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  // K1: sin calculadora no se ofrece nada, ni un aviso de error.
  if (sinCalculadora) return null;

  if (datos === null) {
    return errorApi === null ? null : <Alert variant="error">{errorApi}</Alert>;
  }

  return (
    <section
      aria-labelledby={`${idPanel}-titulo`}
      className="rounded-lg border border-neutral-light bg-white p-4 sm:p-6"
    >
      <header className="mb-4 flex items-start gap-3">
        <Calculator className="mt-0.5 h-5 w-5 shrink-0 text-action" aria-hidden="true" />
        <div>
          <h2 id={`${idPanel}-titulo`} className="font-sans text-lg font-semibold text-neutral-dark">
            Calculadora de pintura
          </h2>
          {mostrarNombre && (
            <p className="font-sans text-sm text-neutral-medium">{datos.nombre}</p>
          )}
          <p className="font-sans text-sm text-neutral-medium">
            Rinde {formatearIntervalo(datos.rendimientoMin, datos.rendimientoMax, 'm² por galón')}, por
            cada mano.
          </p>
        </div>
      </header>

      <div className="mb-4">
        <SegmentedTabs
          options={SENTIDOS}
          value={sentido}
          onChange={(valor) => {
            setSentido(valor);
            setResultado(null);
            setErrorApi(null);
          }}
          ariaLabel="Qué quieres calcular"
          panelId={`${idPanel}-panel`}
          idPrefix={`${idPanel}-sentido`}
        />
      </div>

      <div id={`${idPanel}-panel`} role="tabpanel">
        {sentido === 'cantidad' ? (
          <FormularioCantidadCalculo
            datos={datos}
            idProducto={idProducto}
            alCalcular={setResultado}
            alFallar={setErrorApi}
          />
        ) : (
          <FormularioCoberturaCalculo
            datos={datos}
            idProducto={idProducto}
            alCalcular={setResultado}
            alFallar={setErrorApi}
          />
        )}
      </div>

      {errorApi !== null && (
        <div className="mt-4">
          <Alert variant="error">{errorApi}</Alert>
        </div>
      )}

      {resultado !== null && <Resultado resultado={resultado} />}
    </section>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
 * Formularios. Las manos se piden siempre y nunca se rellenan solas (K9).
 * ─────────────────────────────────────────────────────────────────────────── */

interface PropsFormulario {
  datos: CalculadoraProducto;
  idProducto: number;
  alCalcular: (resultado: ResultadoCalculo) => void;
  alFallar: (mensaje: string | null) => void;
}

function opcionesPresentacion(datos: CalculadoraProducto): Array<{ value: string; label: string }> {
  return datos.presentaciones.map((p) => ({
    value: String(p.idVariante),
    label: p.presentacion,
  }));
}

/** La sugerencia de manos se ofrece como botón: la persona decide aplicarla (K9). */
function SugerenciaManos({
  manosSugeridas,
  alAplicar,
}: {
  manosSugeridas: number | null;
  alAplicar: (manos: string) => void;
}) {
  if (manosSugeridas === null) return null;
  return (
    <p className="font-sans text-xs text-neutral-medium">
      Para este producto se suelen dar {manosSugeridas} manos.{' '}
      <button
        type="button"
        onClick={() => alAplicar(String(manosSugeridas))}
        className="rounded-xs font-medium text-action underline transition-colors hover:text-action-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
      >
        Usar {manosSugeridas}
      </button>
    </p>
  );
}

function FormularioCantidadCalculo({ datos, idProducto, alCalcular, alFallar }: PropsFormulario) {
  const primera = datos.presentaciones[0];
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormularioCantidad>({
    resolver: zodResolver(formularioCantidadSchema),
    defaultValues: {
      idVariante: primera === undefined ? '' : String(primera.idVariante),
      area: '',
      // K9: vacío a propósito. RF-ASE-02-06 prohíbe suponer las manos.
      manos: '',
    },
  });

  const enviar = handleSubmit(async (valores) => {
    alFallar(null);
    try {
      const resultado = await calcularCantidad({
        idProducto,
        idVariante: Number(valores.idVariante),
        area: numeroDeCampo(valores.area),
        manos: Number(valores.manos),
      });
      alCalcular(resultado);
    } catch (err: unknown) {
      alFallar(mensajeDeError(err, 'No pudimos calcular la cantidad. Inténtalo de nuevo.'));
    }
  });

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Select
          label="Presentación"
          options={opcionesPresentacion(datos)}
          error={errors.idVariante?.message}
          {...register('idVariante')}
        />
        <Input
          label="Área a pintar (m²)"
          inputMode="decimal"
          placeholder="Por ejemplo, 50"
          error={errors.area?.message}
          {...register('area')}
        />
        <Input
          label="Número de manos"
          inputMode="numeric"
          placeholder="Por ejemplo, 2"
          error={errors.manos?.message}
          {...register('manos')}
        />
      </div>

      <SugerenciaManos
        manosSugeridas={datos.manosSugeridas}
        alAplicar={(manos) => setValue('manos', manos, { shouldValidate: true })}
      />

      <Button type="submit" isLoading={isSubmitting}>
        Calcular cuánto comprar
      </Button>
    </form>
  );
}

function FormularioCoberturaCalculo({ datos, idProducto, alCalcular, alFallar }: PropsFormulario) {
  const primera = datos.presentaciones[0];
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormularioCobertura>({
    resolver: zodResolver(formularioCoberturaSchema),
    defaultValues: {
      idVariante: primera === undefined ? '' : String(primera.idVariante),
      unidades: '',
      manos: '',
    },
  });

  const enviar = handleSubmit(async (valores) => {
    alFallar(null);
    try {
      const resultado = await calcularCobertura({
        idProducto,
        idVariante: Number(valores.idVariante),
        unidades: Number(valores.unidades),
        manos: Number(valores.manos),
      });
      alCalcular(resultado);
    } catch (err: unknown) {
      alFallar(mensajeDeError(err, 'No pudimos calcular el rendimiento. Inténtalo de nuevo.'));
    }
  });

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Select
          label="Presentación"
          options={opcionesPresentacion(datos)}
          error={errors.idVariante?.message}
          {...register('idVariante')}
        />
        <Input
          label="Cuántas unidades tienes"
          inputMode="numeric"
          placeholder="Por ejemplo, 2"
          error={errors.unidades?.message}
          {...register('unidades')}
        />
        <Input
          label="Número de manos"
          inputMode="numeric"
          placeholder="Por ejemplo, 2"
          error={errors.manos?.message}
          {...register('manos')}
        />
      </div>

      <SugerenciaManos
        manosSugeridas={datos.manosSugeridas}
        alAplicar={(manos) => setValue('manos', manos, { shouldValidate: true })}
      />

      <Button type="submit" isLoading={isSubmitting}>
        Calcular cuánto rinde
      </Button>
    </form>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
 * Resultado. La advertencia de K7 va siempre junto a la cifra.
 * ─────────────────────────────────────────────────────────────────────────── */

function Resultado({ resultado }: { resultado: ResultadoCalculo }) {
  const esCantidad = resultado.sentido === 'cantidad';
  const unidadDe = (minimo: number, maximo: number): string =>
    esCantidad ? unidadesDe(minimo, maximo) : 'm²';
  const principal = formatearIntervalo(
    resultado.seleccionada.minimo,
    resultado.seleccionada.maximo,
    unidadDe(resultado.seleccionada.minimo, resultado.seleccionada.maximo),
  );

  return (
    <div
      role="status"
      className="mt-6 rounded-lg border border-action/30 bg-action/5 p-4 sm:p-5"
    >
      <p className="font-sans text-sm text-neutral-medium">
        {esCantidad ? 'Necesitas comprar' : 'Con eso alcanzas a cubrir'}
      </p>
      <p className="font-sans text-2xl font-semibold text-neutral-dark">
        {principal}{' '}
        <span className="text-base font-normal text-neutral-medium">
          de {resultado.seleccionada.presentacion}
        </span>
      </p>

      {resultado.equivalencias.length > 0 && (
        <div className="mt-4 border-t border-action/20 pt-3">
          <p className="font-sans text-sm font-medium text-neutral-dark">
            En otras presentaciones
          </p>
          <ul className="mt-1 space-y-1">
            {resultado.equivalencias.map((e) => (
              <li key={e.idVariante} className="font-sans text-sm text-neutral-medium">
                {e.presentacion}: {formatearIntervalo(e.minimo, e.maximo, unidadDe(e.minimo, e.maximo))}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 flex items-start gap-2 font-sans text-xs text-neutral-medium">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {resultado.advertencia}
      </p>
    </div>
  );
}
