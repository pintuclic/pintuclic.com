'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, FileInput, Input, Skeleton } from '@/core/components';
import {
  renovacionNitFormSchema,
  solicitarAscensoEmpresaFormSchema,
  type EstadoSolicitudEmpresa,
  type RenovacionNitFormData,
  type SolicitarAscensoEmpresaFormData,
} from '../../dtos/m04-cuentas.dto';
import type { MisSolicitudes, PerfilUsuario } from '../../interfaces/api.interfaces';
import { consultarMisSolicitudes, solicitarAscenso, solicitarRenovacionNit } from '../../services/cuentas.service';
import { aErrorCuentas } from '../../services/errores';
import { prepararArchivoRut, RUT_ACCEPT, validarArchivoRut } from './archivo-rut';
import { SeccionPerfil } from './SeccionPerfil';

const ETIQUETA_ESTADO: Record<EstadoSolicitudEmpresa, string> = {
  pendiente: 'en revisión',
  aprobada: 'aprobada',
  rechazada: 'rechazada',
};

function fecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * HU-CUE-06 (06-C) y HU-CUE-10. Una cuenta personal puede pedir el ascenso a
 * empresa; una cuenta empresa ve sus datos aprobados y puede renovar su NIT
 * adjuntando el RUT. El NIT vigente no cambia hasta que el administrador aprueba.
 */
export function EmpresaSection({ perfil }: { perfil: PerfilUsuario }) {
  const [solicitudes, setSolicitudes] = useState<MisSolicitudes | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    try {
      setSolicitudes(await consultarMisSolicitudes());
      setError(null);
    } catch (e) {
      setError(aErrorCuentas(e).mensaje);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  if (error) return <Alert variant="error">{error}</Alert>;
  if (!solicitudes) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-40" />
        <Skeleton className="h-56" />
      </div>
    );
  }

  return perfil.tipo === 'empresa' ? (
    <CuentaEmpresa perfil={perfil} solicitudes={solicitudes} onEnviada={recargar} />
  ) : (
    <AscensoEmpresa perfil={perfil} solicitudes={solicitudes} onEnviada={recargar} />
  );
}

function AscensoEmpresa({
  perfil,
  solicitudes,
  onEnviada,
}: {
  perfil: PerfilUsuario;
  solicitudes: MisSolicitudes;
  onEnviada: () => Promise<void>;
}) {
  const solicitud = solicitudes.solicitudEmpresa;
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SolicitarAscensoEmpresaFormData>({
    resolver: zodResolver(solicitarAscensoEmpresaFormSchema),
    defaultValues: {
      nombreEmpresa: '',
      nit: '',
      nombreRepresentante: perfil.nombre,
      correoEmpresarial: perfil.correo,
      telefono: perfil.telefono ?? '',
    },
  });

  const enviar = handleSubmit(async (datos) => {
    setErrorServidor(null);
    try {
      await solicitarAscenso(datos);
      await onEnviada();
    } catch (error) {
      setErrorServidor(aErrorCuentas(error).mensaje);
    }
  });

  if (solicitud?.estado === 'pendiente') {
    return (
      <SeccionPerfil titulo="Cuenta empresa">
        <Alert variant="info">
          Tu solicitud para convertir tu cuenta en empresa está en revisión desde el {fecha(solicitud.fechaSolicitud)}.
          Te avisaremos por correo cuando el equipo la revise.
        </Alert>
      </SeccionPerfil>
    );
  }

  return (
    <SeccionPerfil
      titulo="Convertir en cuenta empresa"
      descripcion="Compra a nombre de tu empresa. Un administrador valida los datos antes de activar el cambio."
    >
      <form onSubmit={enviar} noValidate className="grid gap-4 sm:grid-cols-2">
        {solicitud?.estado === 'rechazada' && (
          <div className="sm:col-span-2">
            <Alert variant="warning">
              Tu solicitud anterior fue rechazada
              {solicitud.motivoRechazo ? `: ${solicitud.motivoRechazo}` : '.'} Puedes corregir los datos y enviarla de
              nuevo.
            </Alert>
          </div>
        )}
        {errorServidor && (
          <div className="sm:col-span-2">
            <Alert variant="error">{errorServidor}</Alert>
          </div>
        )}
        <Input id="asc-empresa" label="Nombre de la empresa" autoComplete="organization" placeholder="Ej. PintuClic" error={errors.nombreEmpresa?.message} {...register('nombreEmpresa')} />
        <Input id="asc-nit" label="NIT" placeholder="Ej. 899.999.068-1" error={errors.nit?.message} {...register('nit')} />
        <Input id="asc-representante" label="Representante legal" autoComplete="name" error={errors.nombreRepresentante?.message} {...register('nombreRepresentante')} />
        <Input id="asc-correo" label="Correo empresarial" type="email" autoComplete="email" error={errors.correoEmpresarial?.message} {...register('correoEmpresarial')} />
        <Input id="asc-telefono" label="Teléfono" type="tel" autoComplete="tel" error={errors.telefono?.message} {...register('telefono')} />
        <div className="sm:col-span-2">
          <Button type="submit" isLoading={isSubmitting}>
            Enviar solicitud
          </Button>
        </div>
      </form>
    </SeccionPerfil>
  );
}

function CuentaEmpresa({
  perfil,
  solicitudes,
  onEnviada,
}: {
  perfil: PerfilUsuario;
  solicitudes: MisSolicitudes;
  onEnviada: () => Promise<void>;
}) {
  const empresa = perfil.empresa;
  const renovacion = solicitudes.renovacionNit;

  return (
    <div className="flex flex-col gap-6">
      <SeccionPerfil titulo="Datos de la empresa" descripcion="Aprobados por el equipo de Pintu Clic.">
        {empresa ? (
          <dl className="grid gap-x-6 gap-y-3 font-sans text-sm sm:grid-cols-2">
            {[
              ['Empresa', empresa.nombreEmpresa],
              ['NIT vigente', empresa.nit],
              ['Representante legal', empresa.nombreRepresentante],
              ['Correo empresarial', empresa.correoEmpresarial],
              ['Teléfono', empresa.telefono],
              ['Aprobada el', fecha(empresa.fechaAprobacion)],
            ].map(([termino, valor]) => (
              <div key={termino}>
                <dt className="text-neutral-medium">{termino}</dt>
                <dd className="font-medium text-neutral-black">{valor}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <Alert variant="info">Los datos de tu empresa aún no están disponibles.</Alert>
        )}
      </SeccionPerfil>

      <SeccionPerfil
        titulo="Renovación de NIT"
        descripcion="Adjunta el RUT actualizado. Tu NIT vigente se mantiene hasta que aprobemos el cambio."
      >
        {renovacion && (
          <div className="mb-4">
            <Alert
              variant={
                renovacion.estado === 'pendiente' ? 'info' : renovacion.estado === 'aprobada' ? 'success' : 'warning'
              }
            >
              Tu solicitud para cambiar el NIT {renovacion.nitVigente} por {renovacion.nitSolicitado} está{' '}
              {ETIQUETA_ESTADO[renovacion.estado]} (enviada el {fecha(renovacion.fechaSolicitud)})
              {renovacion.estado === 'rechazada' && renovacion.motivoRechazo ? `. Motivo: ${renovacion.motivoRechazo}` : '.'}
            </Alert>
          </div>
        )}
        {renovacion?.estado !== 'pendiente' && <RenovacionNitForm onEnviada={onEnviada} />}
      </SeccionPerfil>
    </div>
  );
}

function RenovacionNitForm({ onEnviada }: { onEnviada: () => Promise<void> }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RenovacionNitFormData>({
    resolver: zodResolver(renovacionNitFormSchema),
    defaultValues: { nitNuevo: '' },
  });

  const elegirArchivo = (seleccionado: File | null) => {
    setArchivo(seleccionado);
    setErrorArchivo(seleccionado ? validarArchivoRut(seleccionado) : null);
  };

  const enviar = handleSubmit(async ({ nitNuevo }) => {
    setErrorServidor(null);
    const problema = validarArchivoRut(archivo);
    if (problema || !archivo) {
      setErrorArchivo(problema);
      return;
    }
    try {
      await solicitarRenovacionNit(nitNuevo, await prepararArchivoRut(archivo));
      await onEnviada();
    } catch (error) {
      setErrorServidor(aErrorCuentas(error).mensaje);
    }
  });

  return (
    <form onSubmit={enviar} noValidate className="grid gap-4 sm:grid-cols-2">
      {errorServidor && (
        <div className="sm:col-span-2">
          <Alert variant="error">{errorServidor}</Alert>
        </div>
      )}
      <Input id="ren-nit" label="NIT nuevo" placeholder="Ej. 899.999.068-1" error={errors.nitNuevo?.message} {...register('nitNuevo')} />
      <FileInput
        id="ren-rut"
        label="Documento RUT"
        value={archivo}
        onChange={elegirArchivo}
        accept={RUT_ACCEPT}
        helperText="PDF, JPG o PNG de máximo 5 MB."
        error={errorArchivo ?? undefined}
      />
      <div className="sm:col-span-2">
        <Button type="submit" isLoading={isSubmitting}>
          Solicitar renovación
        </Button>
      </div>
    </form>
  );
}
