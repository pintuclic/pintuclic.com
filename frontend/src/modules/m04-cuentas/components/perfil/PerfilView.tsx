'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, KeyRound, LogOut, MapPin, UserRound } from 'lucide-react';
import { Alert, ButtonLink, Container, SectionNav, Skeleton, type SectionNavItem } from '@/core/components';
import { useAuthStore } from '@/core/store/authStore';
import type { PerfilUsuario } from '../../interfaces/api.interfaces';
import { obtenerPerfil } from '../../services/cuentas.service';
import { aErrorCuentas } from '../../services/errores';
import { CuentaSection } from './CuentaSection';
import { DatosSection } from './DatosSection';
import { DireccionesSection } from './DireccionesSection';
import { EmpresaSection } from './EmpresaSection';
import type { SeccionPerfilId } from './secciones';
import { SeguridadSection } from './SeguridadSection';

const SECCIONES: ReadonlyArray<SectionNavItem<SeccionPerfilId>> = [
  { id: 'datos', label: 'Mis datos', icon: UserRound },
  { id: 'seguridad', label: 'Seguridad', icon: KeyRound },
  { id: 'direcciones', label: 'Direcciones', icon: MapPin },
  { id: 'empresa', label: 'Cuenta empresa', icon: Building2 },
  { id: 'cuenta', label: 'Sesión y cuenta', icon: LogOut },
];

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'anonimo'; aviso?: string }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'listo'; perfil: PerfilUsuario };

/**
 * HU-CUE-06 / 07 / 10 · "Mi cuenta". El servidor decide si hay sesión (HU-SEG-03):
 * esta vista solo pinta lo que `GET /cuentas/perfil` devuelve al titular.
 */
export function PerfilView({ seccionInicial = 'datos' }: { seccionInicial?: SeccionPerfilId }) {
  const router = useRouter();
  const usuario = useAuthStore((s) => s.usuario);
  const establecerUsuario = useAuthStore((s) => s.establecerUsuario);
  const limpiarSesion = useAuthStore((s) => s.limpiarSesion);
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });
  const [seccion, setSeccion] = useState<SeccionPerfilId>(seccionInicial);

  const cargar = useCallback(async () => {
    try {
      const perfil = await obtenerPerfil();
      establecerUsuario({ idUsuario: perfil.idUsuario, correo: perfil.correo, nombre: perfil.nombre, tipo: perfil.tipo });
      setEstado({ tipo: 'listo', perfil });
    } catch (error) {
      const { estado: http, mensaje } = aErrorCuentas(error);
      setEstado(http === 401 ? { tipo: 'anonimo' } : { tipo: 'error', mensaje });
    }
  }, [establecerUsuario]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Al iniciar sesión desde el modal (sobre esta misma página) se recarga el perfil.
  useEffect(() => {
    if (estado.tipo === 'anonimo' && usuario) void cargar();
  }, [estado.tipo, usuario, cargar]);

  const actualizarPerfil = (perfil: PerfilUsuario) => {
    setEstado({ tipo: 'listo', perfil });
    establecerUsuario({ idUsuario: perfil.idUsuario, correo: perfil.correo, nombre: perfil.nombre, tipo: perfil.tipo });
  };

  const sesionInvalidada = (aviso: string) => {
    limpiarSesion();
    setEstado({ tipo: 'anonimo', aviso });
  };

  const sesionTerminada = () => {
    limpiarSesion();
    router.replace('/');
  };

  return (
    <Container className="py-8 lg:py-12">
      <h1 className="font-title text-2xl font-bold text-corporate sm:text-3xl">Mi cuenta</h1>

      {estado.tipo === 'cargando' && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]" aria-busy="true">
          <Skeleton className="h-64" />
          <Skeleton className="h-96" />
        </div>
      )}

      {estado.tipo === 'error' && (
        <div className="mt-6 max-w-xl">
          <Alert variant="error">{estado.mensaje}</Alert>
        </div>
      )}

      {estado.tipo === 'anonimo' && (
        <div className="mt-6 flex max-w-xl flex-col gap-4">
          <Alert variant={estado.aviso ? 'success' : 'info'}>
            {estado.aviso ?? 'Inicia sesión para ver y editar tu cuenta.'}
          </Alert>
          <ButtonLink href="/login" className="self-start">
            Iniciar sesión
          </ButtonLink>
        </div>
      )}

      {estado.tipo === 'listo' && (
        <>
          <p className="mt-1 font-sans text-sm text-neutral-medium">Hola, {estado.perfil.nombre}.</p>
          {/* grid-cols-1 = minmax(0, 1fr): sin él, la fila de secciones desborda el ancho en móvil. */}
          <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <SectionNav
              items={SECCIONES}
              value={seccion}
              onChange={setSeccion}
              ariaLabel="Secciones de mi cuenta"
              controlsId="perfil-seccion"
              className="lg:sticky lg:top-6"
            />

            <div id="perfil-seccion" className="min-w-0">
              {seccion === 'datos' && <DatosSection perfil={estado.perfil} onActualizado={actualizarPerfil} />}
              {seccion === 'seguridad' && (
                <SeguridadSection
                  perfil={estado.perfil}
                  onCorreoCambiado={(correo) => actualizarPerfil({ ...estado.perfil, correo })}
                  onSesionInvalidada={sesionInvalidada}
                />
              )}
              {seccion === 'direcciones' && <DireccionesSection />}
              {seccion === 'empresa' && <EmpresaSection perfil={estado.perfil} />}
              {seccion === 'cuenta' && <CuentaSection onSesionTerminada={sesionTerminada} />}
            </div>
          </div>
        </>
      )}
    </Container>
  );
}
