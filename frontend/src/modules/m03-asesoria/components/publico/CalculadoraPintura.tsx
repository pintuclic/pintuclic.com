'use client';

import { useEffect, useId, useMemo, useState, type FocusEventHandler, type ReactNode, type Ref } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Armchair,
  Calculator,
  DoorClosed,
  Frame,
  Home,
  Info,
  Minus,
  Plus,
} from 'lucide-react';
import {
  Alert,
  Button,
  ButtonLink,
  Input,
  SegmentedTabs,
  Select,
  Skeleton,
  Stepper,
} from '@/core/components';
import {
  areaDeMedidas,
  formularioCoberturaSchema,
  formularioMedidasSchema,
  type FormularioCobertura,
  type FormularioMedidas,
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
import {
  SUPERFICIES,
  SUPERFICIE_POR_DEFECTO,
  superficiePorId,
  type Superficie,
  type TipoSuperficie,
} from '../../services/superficies';

const SENTIDOS: ReadonlyArray<{ value: SentidoCalculo; label: string }> = [
  { value: 'cantidad', label: 'Cuánto comprar' },
  { value: 'cobertura', label: 'Cuánto rinde' },
];

const PASOS = ['Superficie', 'Medidas', 'Resultado'] as const;

const ICONO: Record<TipoSuperficie, typeof Frame> = {
  paredes: Frame,
  techos: Home,
  puertas: DoorClosed,
  muebles: Armchair,
};

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
  /**
   * Ofrecer un enlace a la ficha junto al resultado. La calculadora general lo activa;
   * la de la ficha no, porque enlazaría a la página en la que ya se está.
   */
  enlaceAlProducto?: boolean;
}

/**
 * HU-ASE-02 — Calculadora de pintura (mockup VISTAS.pdf, pág. 10).
 *
 * Un solo componente para las dos entradas del contrato (D5): la ficha de un producto le
 * pasa su `idProducto` y la calculadora general le pasa el que la persona eligió en el
 * selector. Y los dos sentidos: cuánto comprar y cuánta área cubre una cantidad.
 *
 * «Cuánto comprar» NO pide el área: pide las medidas de la superficie y la calcula. Quien
 * llega aquí sabe que su pared mide 5 × 2,5, no que son 25 m²; pedirle el área le obligaba
 * a hacer a mano justo la multiplicación que venía a buscar.
 *
 * Si el producto no ofrece calculadora, el servidor responde 404 y aquí NO se dibuja nada
 * (RF-ASE-02-07, CA-ASE-02-07): así aparece sola en cada ficha que cumpla, sin tener que
 * montarla producto por producto.
 */
export function CalculadoraPintura({
  idProducto,
  datosIniciales,
  mostrarNombre = true,
  enlaceAlProducto = false,
}: CalculadoraPinturaProps) {
  const idPanel = useId();
  const [datos, setDatos] = useState<CalculadoraProducto | null>(datosIniciales ?? null);
  const [cargando, setCargando] = useState(datosIniciales === undefined);
  const [sinCalculadora, setSinCalculadora] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [sentido, setSentido] = useState<SentidoCalculo>('cantidad');

  useEffect(() => {
    if (datosIniciales !== undefined) {
      setDatos(datosIniciales);
      setCargando(false);
      return;
    }

    let vigente = true;
    setCargando(true);
    setSinCalculadora(false);
    setErrorCarga(null);

    obtenerCalculadoraDeProducto(idProducto)
      .then((respuesta) => {
        if (!vigente) return;
        setDatos(respuesta);
      })
      .catch((err: unknown) => {
        if (!vigente) return;
        setDatos(null);
        // K1: «este producto no tiene calculadora» no es un fallo, así que no se avisa.
        // Cualquier otro error sí: callarlo dejaría un hueco sin explicación.
        if (esSinCalculadora(err)) {
          setSinCalculadora(true);
          return;
        }
        setErrorCarga(mensajeDeError(err, 'No pudimos cargar la calculadora. Inténtalo de nuevo.'));
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
    return errorCarga === null ? null : <Alert variant="error">{errorCarga}</Alert>;
  }

  return (
    <section
      aria-labelledby={`${idPanel}-titulo`}
      className="overflow-hidden rounded-lg border border-neutral-light bg-white"
    >
      <header className="flex items-start gap-3 border-b border-neutral-light p-4 sm:p-6">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-subaction">
          <Calculator className="h-5 w-5 text-action" aria-hidden="true" />
        </span>
        <div>
          <h2 id={`${idPanel}-titulo`} className="font-sans text-lg font-semibold text-neutral-dark">
            Calculadora de pintura
          </h2>
          <p className="font-sans text-sm text-neutral-medium">
            Te ayudamos a calcular la cantidad de pintura que necesitas para tu proyecto.
          </p>
          {mostrarNombre && (
            <p className="mt-1 font-sans text-sm font-medium text-neutral-dark">{datos.nombre}</p>
          )}
        </div>
      </header>

      <div className="border-b border-neutral-light p-4 sm:px-6">
        <SegmentedTabs
          options={SENTIDOS}
          value={sentido}
          onChange={setSentido}
          ariaLabel="Qué quieres calcular"
          panelId={`${idPanel}-panel`}
          idPrefix={`${idPanel}-sentido`}
        />
      </div>

      <div id={`${idPanel}-panel`} role="tabpanel" className="p-4 sm:p-6">
        {sentido === 'cantidad' ? (
          <CalculoPorMedidas
            datos={datos}
            idProducto={idProducto}
            enlaceAlProducto={enlaceAlProducto}
          />
        ) : (
          <CalculoPorUnidades datos={datos} idProducto={idProducto} />
        )}
      </div>

      <p className="flex items-start gap-2 border-t border-neutral-light bg-neutral-light/30 p-4 font-sans text-xs text-neutral-medium sm:px-6">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {datos.advertencia}
      </p>
    </section>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
 * CUÁNTO COMPRAR — tres columnas: superficie, medidas y resultado.
 * ─────────────────────────────────────────────────────────────────────────── */

interface PropsMedidas {
  datos: CalculadoraProducto;
  idProducto: number;
  enlaceAlProducto: boolean;
}

function CalculoPorMedidas({ datos, idProducto, enlaceAlProducto }: PropsMedidas) {
  const idGrupo = useId();
  const [tipo, setTipo] = useState<TipoSuperficie>(SUPERFICIE_POR_DEFECTO);
  const [resultado, setResultado] = useState<ResultadoCalculo | null>(null);
  const [manosDelResultado, setManosDelResultado] = useState<number | null>(null);
  const [errorApi, setErrorApi] = useState<string | null>(null);
  /**
   * Con qué datos se obtuvo el resultado que hay en pantalla. Si la persona cambia una
   * medida después de calcular, la cifra de al lado deja de corresponder a lo que está
   * viendo: en vez de dejarla ahí mintiendo, se retira hasta que vuelva a calcular.
   */
  const [datosDelResultado, setDatosDelResultado] = useState<string | null>(null);

  const superficie = superficiePorId(tipo);
  const primera = datos.presentaciones[0];

  // El esquema cambia con la superficie para que el error nombre «el alto» o «el largo».
  // react-hook-form relee `resolver` en cada render, así que basta con recalcularlo.
  const schema = useMemo(
    () => formularioMedidasSchema(superficie.ladoMayor),
    [superficie.ladoMayor],
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<FormularioMedidas>({
    resolver: zodResolver(schema),
    defaultValues: {
      idVariante: primera === undefined ? '' : String(primera.idVariante),
      ancho: '',
      ladoMayor: '',
      repeticiones: '1',
      // K9: vacío a propósito. RF-ASE-02-06 prohíbe suponer las manos.
      manos: '',
    },
  });

  const [idVariante, ancho, ladoMayor, repeticiones, manos] = watch([
    'idVariante',
    'ancho',
    'ladoMayor',
    'repeticiones',
    'manos',
  ]);
  const area = areaDeMedidas(ancho, ladoMayor, repeticiones);

  const firmaActual = JSON.stringify([tipo, idVariante, ancho, ladoMayor, repeticiones, manos]);
  const resultadoVigente = resultado !== null && datosDelResultado === firmaActual;

  const paso = resultadoVigente ? 2 : ancho !== '' || ladoMayor !== '' ? 1 : 0;

  /** Las medidas de una pared no son las de una puerta: al cambiar de superficie se vacían. */
  function cambiarSuperficie(nuevo: TipoSuperficie) {
    setTipo(nuevo);
    resetField('ancho');
    resetField('ladoMayor');
    setResultado(null);
    setErrorApi(null);
  }

  const enviar = handleSubmit(async (valores) => {
    setErrorApi(null);
    try {
      const calculado = await calcularCantidad({
        idProducto,
        idVariante: Number(valores.idVariante),
        area: areaDeMedidas(valores.ancho, valores.ladoMayor, valores.repeticiones),
        manos: Number(valores.manos),
      });
      setResultado(calculado);
      setManosDelResultado(Number(valores.manos));
      setDatosDelResultado(
        JSON.stringify([
          tipo,
          valores.idVariante,
          valores.ancho,
          valores.ladoMayor,
          valores.repeticiones,
          valores.manos,
        ]),
      );
    } catch (err: unknown) {
      setResultado(null);
      setErrorApi(mensajeDeError(err, 'No pudimos calcular la cantidad. Inténtalo de nuevo.'));
    }
  });

  return (
    <form onSubmit={enviar} noValidate>
      <div className="mb-6">
        <Stepper steps={PASOS} current={paso} ariaLabel="Progreso del cálculo" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8 lg:divide-x lg:divide-neutral-light">
        {/* 1 · Superficie ------------------------------------------------- */}
        <fieldset className="lg:pr-8">
          <legend className="mb-3 font-sans text-sm font-semibold text-neutral-dark">
            1. ¿Qué vas a pintar?
          </legend>
          <div className="space-y-2">
            {SUPERFICIES.map((s) => (
              <OpcionSuperficie
                key={s.id}
                superficie={s}
                nombreGrupo={`${idGrupo}-superficie`}
                elegida={s.id === tipo}
                alElegir={cambiarSuperficie}
              />
            ))}
          </div>
        </fieldset>

        {/* 2 · Medidas ---------------------------------------------------- */}
        <div className="lg:px-8">
          <p className="mb-3 font-sans text-sm font-semibold text-neutral-dark">
            2. Ingresa las medidas
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ancho (m)"
              inputMode="decimal"
              placeholder="5.0"
              error={errors.ancho?.message}
              {...register('ancho')}
            />
            <Input
              label={superficie.etiquetaLadoMayor}
              inputMode="decimal"
              placeholder="2.5"
              error={errors.ladoMayor?.message}
              {...register('ladoMayor')}
            />
          </div>

          <div className="mt-4">
            <ContadorPiezas
              etiqueta={superficie.contador}
              valor={repeticiones}
              error={errors.repeticiones?.message}
              alCambiar={(valor) => setValue('repeticiones', valor, { shouldValidate: true })}
              {...register('repeticiones')}
            />
          </div>

          <div className="mt-4">
            <Input
              label="Número de manos"
              inputMode="numeric"
              placeholder="Por ejemplo, 2"
              error={errors.manos?.message}
              {...register('manos')}
            />
            <SugerenciaManos
              manosSugeridas={datos.manosSugeridas}
              alAplicar={(manos) => setValue('manos', manos, { shouldValidate: true })}
            />
          </div>

          <AreaTotal area={area} />
        </div>

        {/* 3 · Resultado -------------------------------------------------- */}
        <div className="lg:pl-8">
          <p className="mb-3 font-sans text-sm font-semibold text-neutral-dark">3. Resultado</p>

          <Select
            label="Presentación"
            options={datos.presentaciones.map((p) => ({
              value: String(p.idVariante),
              label: p.presentacion,
            }))}
            error={errors.idVariante?.message}
            {...register('idVariante')}
          />

          <div className="mt-4">
            <Button type="submit" isLoading={isSubmitting} fullWidth>
              Calcular cuánto comprar
            </Button>
          </div>

          {errorApi !== null && (
            <div className="mt-4">
              <Alert variant="error">{errorApi}</Alert>
            </div>
          )}

          {!resultadoVigente || resultado === null ? (
            errorApi === null && (
              <p className="mt-4 rounded-md border border-dashed border-neutral-light p-4 text-center font-sans text-sm text-neutral-medium">
                Completa las medidas y las manos para ver cuánta pintura necesitas.
              </p>
            )
          ) : (
            <ResultadoCantidad
              resultado={resultado}
              manos={manosDelResultado}
              idProducto={idProducto}
              nombreProducto={datos.nombre}
              enlaceAlProducto={enlaceAlProducto}
            />
          )}
        </div>
      </div>
    </form>
  );
}

/** Una opción de superficie: un radio de verdad, vestido como las tarjetas del mockup. */
function OpcionSuperficie({
  superficie,
  nombreGrupo,
  elegida,
  alElegir,
}: {
  superficie: Superficie;
  nombreGrupo: string;
  elegida: boolean;
  alElegir: (id: TipoSuperficie) => void;
}) {
  const Icono = ICONO[superficie.id];
  return (
    <label
      className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-btn px-3.5 py-2.5 font-title text-sm transition-all duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-action/50 ${
        elegida
          ? 'border-2 border-action bg-subaction font-semibold text-corporate shadow-xs'
          : 'border border-neutral-light bg-neutral-white text-neutral-dark hover:border-action/50 hover:bg-subaction/30'
      }`}
    >
      <input
        type="radio"
        name={nombreGrupo}
        value={superficie.id}
        checked={elegida}
        onChange={() => alElegir(superficie.id)}
        className="sr-only"
      />
      <Icono className="h-5 w-5 shrink-0 text-action" aria-hidden="true" />
      <span>{superficie.etiqueta}</span>
    </label>
  );
}

/**
 * Contador de piezas iguales. El campo real es de texto y queda oculto para lectores de
 * pantalla: lo que se expone es el valor en vivo, para que «+» y «−» se anuncien solos.
 */
function ContadorPiezas({
  etiqueta,
  valor,
  error,
  alCambiar,
  name,
  onBlur,
  ref,
}: {
  etiqueta: string;
  valor: string;
  error?: string;
  alCambiar: (valor: string) => void;
  name?: string;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  ref?: Ref<HTMLInputElement>;
}) {
  const actual = /^\d+$/.test(valor) ? Number(valor) : 1;
  const mover = (delta: number) => alCambiar(String(Math.min(100, Math.max(1, actual + delta))));

  return (
    <div>
      <p className="mb-1.5 font-sans text-sm font-medium text-neutral-dark">{etiqueta}</p>
      <div className="flex items-center gap-3">
        <BotonContador etiqueta={`Quitar una de ${etiqueta.toLowerCase()}`} alPulsar={() => mover(-1)}>
          <Minus className="h-4 w-4" aria-hidden="true" />
        </BotonContador>
        <input
          type="text"
          inputMode="numeric"
          name={name}
          onBlur={onBlur}
          ref={ref}
          value={valor}
          onChange={(e) => alCambiar(e.target.value)}
          aria-label={etiqueta}
          className="min-h-[44px] w-16 rounded-input border border-neutral-light bg-neutral-white text-center font-sans text-sm text-neutral-dark focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
        />
        <BotonContador etiqueta={`Añadir una a ${etiqueta.toLowerCase()}`} alPulsar={() => mover(1)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
        </BotonContador>
      </div>
      {error !== undefined && (
        <p className="mt-1.5 font-sans text-xs text-danger">{error}</p>
      )}
    </div>
  );
}

function BotonContador({
  etiqueta,
  alPulsar,
  children,
}: {
  etiqueta: string;
  alPulsar: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      aria-label={etiqueta}
      className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-btn border border-neutral-light bg-neutral-white text-neutral-dark transition-colors hover:border-action/50 hover:bg-subaction/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
    >
      {children}
    </button>
  );
}

/** El área sale de las medidas y se actualiza mientras se escribe: es la cuenta que se venía a buscar. */
function AreaTotal({ area }: { area: number }) {
  return (
    <div className="mt-4 rounded-md bg-subaction p-4" role="status">
      <p className="font-sans text-sm text-corporate">Área total a pintar</p>
      <p className="font-sans text-2xl font-semibold text-corporate">
        {area > 0 ? `${area.toLocaleString('es-CO')} m²` : '—'}
      </p>
    </div>
  );
}

function ResultadoCantidad({
  resultado,
  manos,
  idProducto,
  nombreProducto,
  enlaceAlProducto,
}: {
  resultado: ResultadoCalculo;
  manos: number | null;
  idProducto: number;
  nombreProducto: string;
  enlaceAlProducto: boolean;
}) {
  const { minimo, maximo, presentacion } = resultado.seleccionada;

  return (
    <div role="status" className="mt-4 rounded-lg border border-action/30 bg-action/5 p-4">
      <p className="font-sans text-sm text-neutral-dark">{nombreProducto}</p>
      <p className="mt-3 font-sans text-sm text-neutral-medium">Necesitas aproximadamente</p>
      <p className="font-sans text-2xl font-semibold text-action">
        {formatearIntervalo(minimo, maximo, unidadesDe(minimo, maximo))} de {presentacion}
      </p>
      {manos !== null && (
        <p className="font-sans text-sm text-neutral-medium">
          (Para {manos} {manos === 1 ? 'mano' : 'manos'})
        </p>
      )}

      {resultado.equivalencias.length > 0 && (
        <div className="mt-4 border-t border-action/20 pt-3">
          <p className="font-sans text-sm font-medium text-neutral-dark">En otras presentaciones</p>
          <ul className="mt-1 space-y-1">
            {resultado.equivalencias.map((e) => (
              <li key={e.idVariante} className="font-sans text-sm text-neutral-medium">
                {e.presentacion}: {formatearIntervalo(e.minimo, e.maximo, unidadesDe(e.minimo, e.maximo))}
              </li>
            ))}
          </ul>
        </div>
      )}

      {enlaceAlProducto && (
        <div className="mt-4">
          <ButtonLink href={`/productos/${idProducto}`} fullWidth>
            Ver producto
          </ButtonLink>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
 * CUÁNTO RINDE — ya tienes la pintura y quieres saber hasta dónde llega.
 * ─────────────────────────────────────────────────────────────────────────── */

function CalculoPorUnidades({
  datos,
  idProducto,
}: {
  datos: CalculadoraProducto;
  idProducto: number;
}) {
  const [resultado, setResultado] = useState<ResultadoCalculo | null>(null);
  const [errorApi, setErrorApi] = useState<string | null>(null);
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
    setErrorApi(null);
    try {
      const calculado = await calcularCobertura({
        idProducto,
        idVariante: Number(valores.idVariante),
        unidades: Number(valores.unidades),
        manos: Number(valores.manos),
      });
      setResultado(calculado);
    } catch (err: unknown) {
      setResultado(null);
      setErrorApi(mensajeDeError(err, 'No pudimos calcular el rendimiento. Inténtalo de nuevo.'));
    }
  });

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <p className="font-sans text-sm text-neutral-medium">
        Rinde {formatearIntervalo(datos.rendimientoMin, datos.rendimientoMax, 'm² por galón')}, por
        cada mano.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Select
          label="Presentación"
          options={datos.presentaciones.map((p) => ({
            value: String(p.idVariante),
            label: p.presentacion,
          }))}
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

      {errorApi !== null && <Alert variant="error">{errorApi}</Alert>}

      {resultado !== null && (
        <div role="status" className="rounded-lg border border-action/30 bg-action/5 p-4">
          <p className="font-sans text-sm text-neutral-medium">Con eso alcanzas a cubrir</p>
          <p className="font-sans text-2xl font-semibold text-action">
            {formatearIntervalo(
              resultado.seleccionada.minimo,
              resultado.seleccionada.maximo,
              'm²',
            )}{' '}
            <span className="text-base font-normal text-neutral-medium">
              con {resultado.seleccionada.presentacion}
            </span>
          </p>
        </div>
      )}
    </form>
  );
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
    <p className="mt-1.5 font-sans text-xs text-neutral-medium">
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
