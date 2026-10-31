'use client';

import { useEffect, useMemo, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ADMIN_NAV_ITEMS, AdminLayout, Skeleton } from '@/core/components';
import { useContadorPedidos } from '@/modules/m08-ordenes/hooks/useContadorPedidos';
import {
  Bienvenida,
  ErrorAcceso,
  SeccionNoDisponible,
  SinAccesos,
} from '@/modules/m17-permisos/components/acceso/PantallasAcceso';
import { filtrarMenu, puedeVerRuta, tieneResumen } from '@/modules/m17-permisos/services/acceso-panel';
import { useAccesoStore } from '@/modules/m17-permisos/store/accesoStore';

/**
 * Cableado del panel: aporta al menú lateral lo que cada módulo quiere mostrar. Vive en `app/` y no en
 * `core/` para que el núcleo no importe módulos.
 *
 * Aquí también se decide qué ve cada persona (M17 R-ACC-9): el menú se arma con sus permisos, el inicio se adapta y una
 * sección que no tiene asignada muestra un aviso en lugar de una pantalla rota. Es usabilidad: el servidor sigue
 * decidiendo en cada petición (RF-SEG-03-06).
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const pedidos = useContadorPedidos();
  const pathname = usePathname() ?? '/admin';
  const router = useRouter();
  const estado = useAccesoStore((s) => s.estado);
  const acceso = useAccesoStore((s) => s.acceso);
  const cargar = useAccesoStore((s) => s.cargar);

  useEffect(() => {
    if (estado === 'sin_cargar') void cargar();
  }, [estado, cargar]);

  // Una cuenta que no es de personal (el servidor responde el 404 opaco) no tiene nada que hacer aquí.
  useEffect(() => {
    if (estado === 'no_personal') router.replace('/');
  }, [estado, router]);

  const menu = useMemo(() => (acceso ? filtrarMenu(ADMIN_NAV_ITEMS, acceso) : []), [acceso]);

  if (estado === 'error') {
    return (
      <AdminLayout navItems={[]}>
        <ErrorAcceso onReintentar={() => void cargar()} />
      </AdminLayout>
    );
  }

  if (acceso === null) {
    // Cargando (o redirigiendo): sin menú ni contenido para no mostrar nada que la persona no pueda usar.
    return (
      <AdminLayout navItems={[]}>
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      </AdminLayout>
    );
  }

  const seccionesPropias = menu.filter((i) => i.href !== '/admin');
  const esInicio = pathname === '/admin';

  let contenido: ReactNode = children;
  if (!acceso.esAdministrador && seccionesPropias.length === 0) {
    contenido = <SinAccesos nombre={primerNombre(acceso.nombre)} />;
  } else if (esInicio && !tieneResumen(acceso)) {
    contenido = <Bienvenida nombre={primerNombre(acceso.nombre)} secciones={seccionesPropias} />;
  } else if (!puedeVerRuta(pathname, acceso)) {
    contenido = <SeccionNoDisponible hayInicio={!esInicio} />;
  }

  return (
    <AdminLayout
      navItems={menu}
      navConteos={{ '/admin/pedidos': pedidos }}
      etiquetaRol={acceso.esAdministrador ? 'Administrador' : 'Colaborador'}
      mostrarOpcionesDeAdministrador={acceso.esAdministrador}
    >
      {contenido}
    </AdminLayout>
  );
}

function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] || 'equipo';
}
