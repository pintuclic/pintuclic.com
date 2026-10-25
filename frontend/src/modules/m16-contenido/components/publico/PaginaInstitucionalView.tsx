'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, CircleHelp, Clock, FileText } from 'lucide-react';
import {
  Badge,
  ButtonLink,
  Container,
  Skeleton,
} from '@/core/components';
import type {
  PaginaPublicaDetalle,
  PaginaPublicaResumen,
} from '../../interfaces/contenido.interface';
import {
  listarPaginasPublicas,
  obtenerPaginaPublicaPorSlug,
} from '../../services/contenido-api';
import { MarkdownContenido } from './MarkdownContenido';

export interface PaginaInstitucionalViewProps {
  slug: string;
}

function formatearFechaPublica(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export const PaginaInstitucionalView: React.FC<PaginaInstitucionalViewProps> = ({
  slug,
}) => {
  const [pagina, setPagina] = useState<PaginaPublicaDetalle | null>(null);
  const [catalogoPaginas, setCatalogoPaginas] = useState<PaginaPublicaResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [noDisponible, setNoDisponible] = useState(false);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setNoDisponible(false);

    Promise.all([
      obtenerPaginaPublicaPorSlug(slug),
      listarPaginasPublicas().catch(() => [] as PaginaPublicaResumen[]),
    ])
      .then(([detalle, lista]) => {
        if (!activo) return;
        setPagina(detalle);
        setCatalogoPaginas(lista);
      })
      .catch(() => {
        if (!activo) return;
        setPagina(null);
        setNoDisponible(true);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [slug]);

  return (
    <div className="bg-neutral-lightest min-h-[70vh] py-8 sm:py-12">
      <Container>
        {/* Breadcrumb accesible */}
        <nav
          aria-label="Ruta de navegación"
          className="mb-6 flex items-center gap-2 text-xs sm:text-sm font-sans text-neutral-medium"
        >
          <Link
            href="/"
            className="hover:text-action transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 rounded-xs"
          >
            Inicio
          </Link>
          <ChevronRight className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="text-neutral-dark font-medium truncate">
            {pagina ? pagina.titulo : 'Información Institucional'}
          </span>
        </nav>

        {cargando ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 bg-neutral-white rounded-card border border-neutral-light p-6 sm:p-8 space-y-4">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div className="lg:col-span-4 space-y-4">
              <Skeleton className="h-48 w-full rounded-card" />
            </div>
          </div>
        ) : noDisponible || !pagina ? (
          <div className="bg-neutral-white rounded-card border border-neutral-light p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-card">
            <div className="w-12 h-12 rounded-pill bg-subaction text-corporate flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="font-title font-bold text-xl sm:text-2xl text-corporate mb-2">
              El recurso solicitado no está disponible
            </h1>
            <p className="font-sans text-sm text-neutral-medium mb-6">
              La página institucional que intentas consultar no existe o no se encuentra publicada en este momento.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <ButtonLink href="/" variant="primary-action">
                Volver al inicio
              </ButtonLink>
              <ButtonLink href="/centro-de-ayuda" variant="outline">
                Ir al Centro de Ayuda
              </ButtonLink>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Contenido principal */}
            <article className="lg:col-span-8 bg-neutral-white rounded-card border border-neutral-light p-6 sm:p-10 shadow-card">
              <header className="border-b border-neutral-light pb-6 mb-6">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge variant="action">Información Oficial Pintu Clic</Badge>
                  {pagina.fechaActualizacion && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-sans text-neutral-medium">
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      Actualizado el {formatearFechaPublica(pagina.fechaActualizacion)}
                    </span>
                  )}
                </div>
                <h1 className="font-title font-bold text-2xl sm:text-3xl text-corporate tracking-tight">
                  {pagina.titulo}
                </h1>
                {pagina.resumen && (
                  <p className="font-sans text-sm sm:text-base text-neutral-medium mt-2">
                    {pagina.resumen}
                  </p>
                )}
              </header>

              <MarkdownContenido markdown={pagina.cuerpoMarkdown} />
            </article>

            {/* Navegación lateral de documentos institucionales */}
            <aside
              aria-label="Otras páginas institucionales"
              className="lg:col-span-4 space-y-6"
            >
              <div className="bg-neutral-white rounded-card border border-neutral-light p-5 shadow-card">
                <h2 className="font-title font-semibold text-base text-corporate mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-action" aria-hidden="true" />
                  Documentos Institucionales
                </h2>
                <ul className="space-y-1.5">
                  {catalogoPaginas.map((item) => {
                    const activa = item.slug === pagina.slug;
                    return (
                      <li key={item.slug}>
                        <Link
                          href={`/paginas/${item.slug}`}
                          aria-current={activa ? 'page' : undefined}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-btn text-sm font-title transition-colors ${
                            activa
                              ? 'bg-subaction text-corporate font-semibold'
                              : 'text-neutral-dark hover:bg-neutral-lightest hover:text-action'
                          }`}
                        >
                          <span>{item.titulo}</span>
                          <ChevronRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="bg-corporate text-neutral-white rounded-card p-5 shadow-card">
                <div className="flex items-center gap-2 mb-2">
                  <CircleHelp className="w-5 h-5 text-highlight shrink-0" aria-hidden="true" />
                  <h2 className="font-title font-semibold text-base">
                    ¿Tienes dudas frecuentes?
                  </h2>
                </div>
                <p className="font-sans text-xs sm:text-sm text-neutral-light mb-4">
                  Consulta nuestro Centro de Ayuda con respuestas rápidas sobre envíos, entonado de colores y cuentas empresa.
                </p>
                <ButtonLink
                  href="/centro-de-ayuda"
                  variant="outline-light"
                  size="sm"
                  fullWidth
                >
                  Ver Preguntas Frecuentes
                </ButtonLink>
              </div>
            </aside>
          </div>
        )}
      </Container>
    </div>
  );
};
