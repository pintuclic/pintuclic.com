'use client';

import { useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Clock } from 'lucide-react';
import {
  Alert,
  Button,
  ButtonLink,
  Checkbox,
  Input,
  OtpInput,
  PasswordInput,
  SegmentedTabs,
  Stepper,
  TextButton,
} from '@/core/components';
import { useAuthStore } from '@/core/store/authStore';
import {
  codigoOtpSchema,
  registroClienteFormSchema,
  registroEmpresaFormSchema,
  type RegistroClienteFormData,
  type RegistroEmpresaFormData,
} from '../../dtos/m04-cuentas.dto';
import type { RegistroIniciado } from '../../interfaces/api.interfaces';
import {
  reenviarCodigoRegistro,
  registrarCliente,
  registrarEmpresa,
  verificarRegistro,
} from '../../services/cuentas.service';
import { aErrorCuentas } from '../../services/errores';
import { BotonGoogle } from './BotonGoogle';
import { enmascararCorreo, minutosDesde } from './utilidades';

type TipoRegistro = 'natural' | 'empresa';
type Paso = 'datos' | 'verificacion' | 'cuenta_creada' | 'solicitud_enviada';

const ESPERA_REENVIO_S = 30;

export interface RegistroFlowProps {
  onIrALogin: () => void;
  /** Se invoca al pulsar un enlace de salida (para cerrar el modal si lo hay). */
  onSalir?: () => void;
}

const TERMINOS = (
  <>
    Acepto los <span className="font-medium text-action">Términos y Condiciones</span> y la Política de Tratamiento
    de Datos.
  </>
);

/**
 * HU-CUE-01 / HU-CUE-03 · Registro (mockup VISTAS.pdf, págs. 3–6).
 * Natural: Datos → Verificación → Listo. Empresa (decisión del Director): Datos → Listo,
 * porque el administrador valida la empresa al aprobarla.
 */
export function RegistroFlow({ onIrALogin, onSalir }: RegistroFlowProps) {
  const idPestanas = useId();
  const [tipo, setTipo] = useState<TipoRegistro>('natural');
  const [paso, setPaso] = useState<Paso>('datos');
  const [registro, setRegistro] = useState<RegistroIniciado | null>(null);

  const pasos = tipo === 'natural' ? ['Datos', 'Verificación', 'Listo'] : ['Datos', 'Listo'];
  // En la pantalla final todos los pasos quedan completados (índice fuera de rango).
  const indice = paso === 'datos' ? 0 : paso === 'verificacion' ? 1 : pasos.length;

  return (
    <div className="flex flex-col gap-6">
      <Stepper steps={pasos} current={indice} ariaLabel="Pasos del registro" />

      {paso === 'datos' && (
        <>
          <SegmentedTabs
            options={[
              { value: 'natural', label: 'Natural' },
              { value: 'empresa', label: 'Empresa' },
            ]}
            value={tipo}
            onChange={setTipo}
            ariaLabel="Tipo de cuenta"
            idPrefix={idPestanas}
            panelId={`${idPestanas}-panel`}
          />
          <div role="tabpanel" id={`${idPestanas}-panel`} aria-labelledby={`${idPestanas}-tab-${tipo}`}>
            {tipo === 'natural' ? (
              <FormularioNatural
                onRegistrado={(r) => {
                  setRegistro(r);
                  setPaso('verificacion');
                }}
              />
            ) : (
              <FormularioEmpresa onRegistrado={() => setPaso('solicitud_enviada')} />
            )}
          </div>
          <p className="text-center font-sans text-sm text-neutral-dark">
            ¿Ya tienes cuenta?{' '}
            <TextButton onClick={onIrALogin}>Inicia sesión</TextButton>
          </p>
        </>
      )}

      {paso === 'verificacion' && registro && (
        <PasoVerificacion
          registro={registro}
          onReenviado={setRegistro}
          onVerificado={() => setPaso('cuenta_creada')}
          onVolver={() => setPaso('datos')}
        />
      )}

      {paso === 'cuenta_creada' && (
        <PasoFinal
          titulo="¡Cuenta creada!"
          texto="Tu correo fue verificado. Ya puedes comprar, guardar tus direcciones y hacer seguimiento a tus pedidos."
          principal={{ label: 'Empezar a comprar', href: '/productos' }}
          onSalir={onSalir}
        />
      )}

      {paso === 'solicitud_enviada' && (
        <PasoFinal
          titulo="¡Solicitud enviada!"
          texto="Revisaremos los datos de tu empresa. Te avisaremos por correo cuando la solicitud sea aprobada; desde ese momento podrás iniciar sesión y comprar con condiciones de empresa."
          onSalir={onSalir}
        />
      )}
    </div>
  );
}

function FormularioNatural({ onRegistrado }: { onRegistrado: (r: RegistroIniciado) => void }) {
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegistroClienteFormData>({
    resolver: zodResolver(registroClienteFormSchema),
    defaultValues: { nombre: '', correo: '', telefono: '', contrasena: '', aceptaTerminos: false },
  });

  const enviar = handleSubmit(async (datos) => {
    setErrorServidor(null);
    try {
      onRegistrado(await registrarCliente(datos));
    } catch (error) {
      setErrorServidor(aErrorCuentas(error).mensaje);
    }
  });

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      {errorServidor && <Alert variant="error">{errorServidor}</Alert>}
      <Input id="reg-nombre" label="Nombre completo" autoComplete="name" placeholder="Ej. Juan Pérez" error={errors.nombre?.message} {...register('nombre')} />
      <Input id="reg-correo" label="Correo electrónico" type="email" autoComplete="email" placeholder="correo@ejemplo.com" error={errors.correo?.message} {...register('correo')} />
      <Input id="reg-telefono" label="Teléfono (WhatsApp)" type="tel" autoComplete="tel" placeholder="300 000 0000" error={errors.telefono?.message} {...register('telefono')} />
      <PasswordInput id="reg-contrasena" label="Contraseña" autoComplete="new-password" placeholder="Mínimo 12 caracteres" helperText="Entre 12 y 128 caracteres." error={errors.contrasena?.message} {...register('contrasena')} />
      <Checkbox id="reg-terminos" label={TERMINOS} checked={watch('aceptaTerminos')} error={errors.aceptaTerminos?.message} {...register('aceptaTerminos')} />
      <Button type="submit" fullWidth isLoading={isSubmitting}>
        Continuar
      </Button>
      <BotonGoogle />
    </form>
  );
}

function FormularioEmpresa({ onRegistrado }: { onRegistrado: () => void }) {
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegistroEmpresaFormData>({
    resolver: zodResolver(registroEmpresaFormSchema),
    defaultValues: {
      nombreEmpresa: '',
      nombreRepresentante: '',
      correoEmpresarial: '',
      telefono: '',
      nit: '',
      contrasena: '',
      aceptaTerminos: false,
    },
  });

  const enviar = handleSubmit(async (datos) => {
    setErrorServidor(null);
    try {
      await registrarEmpresa(datos);
      onRegistrado();
    } catch (error) {
      setErrorServidor(aErrorCuentas(error).mensaje);
    }
  });

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      {errorServidor && <Alert variant="error">{errorServidor}</Alert>}
      <Input id="emp-nombre" label="Nombre Empresa" autoComplete="organization" placeholder="Ej. PintuClic" error={errors.nombreEmpresa?.message} {...register('nombreEmpresa')} />
      <Input id="emp-representante" label="Nombre Representante Legal" autoComplete="name" placeholder="Ej. Juan Pérez" error={errors.nombreRepresentante?.message} {...register('nombreRepresentante')} />
      <Input id="emp-correo" label="Correo electrónico" type="email" autoComplete="email" placeholder="correo@ejemplo.com" error={errors.correoEmpresarial?.message} {...register('correoEmpresarial')} />
      <Input id="emp-telefono" label="Teléfono" type="tel" autoComplete="tel" placeholder="300 000 0000" error={errors.telefono?.message} {...register('telefono')} />
      <Input id="emp-nit" label="NIT" placeholder="Ej. 899.999.068-1" error={errors.nit?.message} {...register('nit')} />
      <PasswordInput id="emp-contrasena" label="Contraseña" autoComplete="new-password" placeholder="Mínimo 12 caracteres" helperText="Entre 12 y 128 caracteres." error={errors.contrasena?.message} {...register('contrasena')} />
      <Checkbox id="emp-terminos" label={TERMINOS} checked={watch('aceptaTerminos')} error={errors.aceptaTerminos?.message} {...register('aceptaTerminos')} />
      <Button type="submit" fullWidth isLoading={isSubmitting}>
        Continuar
      </Button>
    </form>
  );
}

function PasoVerificacion({
  registro,
  onReenviado,
  onVerificado,
  onVolver,
}: {
  registro: RegistroIniciado;
  onReenviado: (r: RegistroIniciado) => void;
  onVerificado: () => void;
  onVolver: () => void;
}) {
  const establecerUsuario = useAuthStore((s) => s.establecerUsuario);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(ESPERA_REENVIO_S);

  useEffect(() => {
    if (espera <= 0) return;
    const temporizador = window.setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => window.clearTimeout(temporizador);
  }, [espera]);

  const verificar = async () => {
    const validacion = codigoOtpSchema.safeParse(codigo);
    if (!validacion.success) {
      setError(validacion.error.issues[0]?.message ?? 'Código inválido');
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      const usuario = await verificarRegistro(registro.idVerificacion, registro.correo, validacion.data);
      establecerUsuario(usuario);
      onVerificado();
    } catch (e) {
      setError(aErrorCuentas(e).mensaje);
    } finally {
      setEnviando(false);
    }
  };

  const reenviar = async () => {
    setError(null);
    try {
      onReenviado(await reenviarCodigoRegistro(registro.idVerificacion));
      setCodigo('');
      setAviso('Te enviamos un código nuevo. El anterior ya no es válido.');
      setEspera(ESPERA_REENVIO_S);
    } catch (e) {
      setError(aErrorCuentas(e).mensaje);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="font-title text-2xl font-bold text-corporate">Verifica tu correo</h3>
        <p className="mt-2 font-sans text-sm text-neutral-dark">
          Escribe el código de 6 dígitos que enviamos a{' '}
          <span className="font-medium text-neutral-black">{enmascararCorreo(registro.correo)}</span>
        </p>
      </div>
      <OtpInput value={codigo} onChange={setCodigo} label="Código de verificación" error={error ?? undefined} autoFocus />
      <Alert variant="timer">
        El código expira en {minutosDesde(registro.tiempoExpiracionSegundos)} minutos. Tu cuenta se activa al confirmarlo.
      </Alert>
      {aviso && <Alert variant="info">{aviso}</Alert>}
      <p className="text-center font-sans text-sm text-neutral-dark">
        ¿No te llegó?{' '}
        <TextButton tone="corporate" onClick={reenviar} disabled={espera > 0}>
          {espera > 0 ? `Reenviar código (${espera} s)` : 'Reenviar código'}
        </TextButton>
      </p>
      <Button type="button" fullWidth isLoading={enviando} onClick={verificar}>
        Verificar y crear cuenta
      </Button>
      <Button type="button" variant="ghost" fullWidth onClick={onVolver}>
        ← Volver
      </Button>
    </div>
  );
}

function PasoFinal({
  titulo,
  texto,
  principal,
  onSalir,
}: {
  titulo: string;
  texto: string;
  principal?: { label: string; href: string };
  onSalir?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-5 py-2 text-center">
      <span className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-conversion/20 bg-conversion/10">
        {titulo.includes('Solicitud') ? (
          <Clock className="h-10 w-10 text-conversion-hover" aria-hidden="true" />
        ) : (
          <Check className="h-10 w-10 text-conversion-hover" strokeWidth={3} aria-hidden="true" />
        )}
      </span>
      <h3 className="font-title text-3xl font-bold text-corporate">{titulo}</h3>
      <p className="max-w-sm font-sans text-sm text-neutral-dark">{texto}</p>
      {principal && (
        <ButtonLink href={principal.href} fullWidth onClick={onSalir} className="max-w-xs">
          {principal.label}
        </ButtonLink>
      )}
      <ButtonLink href="/" variant="ghost" onClick={onSalir}>
        Volver al inicio
      </ButtonLink>
    </div>
  );
}
