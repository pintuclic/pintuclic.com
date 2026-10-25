'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleHelp,
  FileText,
  MessageSquare,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  Button,
  Container,
  Input,
  Skeleton,
} from '@/core/components';
import type {
  FaqPublicaItem,
  PaginaPublicaResumen,
} from '../../interfaces/contenido.interface';
import {
  listarFaqPublicas,
  listarPaginasPublicas,
} from '../../services/contenido-api';
import { MarkdownContenido } from './MarkdownContenido';

/** Enlaces institucionales canónicos de respaldo si la consulta aún no responde. */
const PAGINAS_INSTITUCIONALES_BASE: readonly Pick<PaginaPublicaResumen, 'slug' | 'titulo'>[] = [
  { slug: 'sobre-nosotros', titulo: 'Sobre Nosotros' },
  { slug: 'terminos-y-condiciones', titulo: 'Términos y Condiciones' },
  { slug: 'politica-de-privacidad', titulo: 'Política de Privacidad y Tratamiento de Datos' },
  { slug: 'politicas-de-envio', titulo: 'Políticas de Envío y Entregas' },
];

export const CentroAyudaFaqView: React.FC = () => {
  const [items, setItems] = useState<FaqPublicaItem[]>([]);
  const [paginas, setPaginas] = useState<PaginaPublicaResumen[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [abiertaId, setAbiertaId] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorFaq, setErrorFaq] = useState(false);

  const cargarContenido = useCallback(() => {
    let activo = true;
    setCargando(true);
    setErrorFaq(false);

    Promise.all([
      listarFaqPublicas().then(
        (lista) => ({ ok: true as const, lista }),
        () => ({ ok: false as const, lista: [] as FaqPublicaItem[] }),
      ),
      listarPaginasPublicas().catch(() => [] as PaginaPublicaResumen[]),
    ])
      .then(([resultadoFaq, listaPaginas]) => {
        if (!activo) return;
        setErrorFaq(!resultadoFaq.ok);
        setItems(resultadoFaq.lista);
        setPaginas(listaPaginas);
        if (resultadoFaq.lista[0]) {
          setAbiertaId(resultadoFaq.lista[0].idFaq);
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    const cancelar = cargarContenido();
    return cancelar;
  }, [cargarContenido]);

  const TerminoBusqueda = busqueda.trim().toLowerCase();

  const itemsFiltrados = useMemo(() => {
    if (!TerminoBusqueda) return items;
    return items.filter(
      (f) =>
        f.pregunta.toLowerCase().includes(TerminoBusqueda) ||
        f.respuestaMarkdown.toLowerCase().includes(TerminoBusqueda),
    );
  }, [items, TerminoBusqueda]);

  const enlacesPaginas = paginas.length > 0 ? paginas : PAGINAS_INSTITUCIONALES_BASE;

  return (
    <section
      id="preguntas-frecuentes"
      aria-labelledby="titulo-preguntas-frecuentes"
      className="scroll-mt-24"
    >
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Columna principal: buscador + acordeones FAQ */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-neutral-white rounded-card border border-neutral-light p-6 shadow-card">
              <div className="mb-4">
                <h2
                  id="titulo-preguntas-frecuentes"
                  className="font-title font-bold text-xl sm:text-2xl text-corporate tracking-tight"
                >
                  Preguntas frecuentes
                </h2>
                <p className="font-sans text-sm text-neutral-medium mt-1">
                  Filtra por palabra clave o selecciona una pregunta para ver la respuesta completa.
                </p>
              </div>

              <Input
                id="busqueda-faq-publica"
                label="Buscar en preguntas frecuentes"
                placeholder="Ej. envío gratis, color entonado, NIT..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                leftIcon={<Search className="w-4 h-4" aria-hidden="true" />}
              />
            </div>

            {cargando ? (
              <div className="space-y-3" aria-label="Cargando preguntas frecuentes">
                <Skeleton className="h-20 w-full rounded-card" />
                <Skeleton className="h-20 w-full rounded-card" />
                <Skeleton className="h-20 w-full rounded-card" />
              </div>
            ) : errorFaq ? (
              <div className="bg-neutral-white rounded-card border border-neutral-light p-8 text-center shadow-card">
                <CircleHelp
                  className="w-8 h-8 text-neutral-medium mx-auto mb-2"
                  aria-hidden="true"
                />
                <h3 className="font-title font-semibold text-base text-neutral-black">
                  No pudimos cargar las preguntas frecuentes en este momento
                </h3>
                <p className="font-sans text-sm text-neutral-medium mt-1 mb-4">
                  Intenta cargar de nuevo o escríbenos directamente en la sección de contacto más abajo.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    cargarContenido();
                  }}
                  leftIcon={<RefreshCw className="w-4 h-4" aria-hidden="true" />}
                >
                  Reintentar
                </Button>
              </div>
            ) : itemsFiltrados.length === 0 ? (
              <div className="bg-neutral-white rounded-card border border-neutral-light p-8 text-center shadow-card">
                <CircleHelp
                  className="w-8 h-8 text-neutral-medium mx-auto mb-2"
                  aria-hidden="true"
                />
                {TerminoBusqueda.length > 0 ? (
                  <>
                    <h3 className="font-title font-semibold text-base text-neutral-black">
                      No encontramos preguntas que coincidan con tu búsqueda
                    </h3>
                    <p className="font-sans text-sm text-neutral-medium mt-1 mb-4">
                      Intenta con otra palabra clave o explora todas las preguntas disponibles.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setBusqueda('')}
                    >
                      Limpiar búsqueda
                    </Button>
                  </>
                ) : (
                  <>
                    <h3 className="font-title font-semibold text-base text-neutral-black">
                      Aún no hay preguntas frecuentes publicadas
                    </h3>
                    <p className="font-sans text-sm text-neutral-medium mt-1">
                      Puedes enviarnos tu consulta desde el formulario de contacto o escribirnos por WhatsApp.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {itemsFiltrados.map((faq) => {
                  const expandida = abiertaId === faq.idFaq;
                  const panelId = `faq-panel-${faq.idFaq}`;
                  return (
                    <div
                      key={faq.idFaq}
                      className="bg-neutral-white rounded-card border border-neutral-light shadow-card overflow-hidden"
                    >
                      <h3 className="m-0">
                        <Button
                          type="button"
                          variant="ghost"
                          fullWidth
                          aria-expanded={expandida}
                          aria-controls={panelId}
                          onClick={() =>
                            setAbiertaId(expandida ? null : faq.idFaq)
                          }
                          rightIcon={
                            expandida ? (
                              <ChevronUp className="w-4 h-4 text-action" aria-hidden="true" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-neutral-medium" aria-hidden="true" />
                            )
                          }
                          className="justify-between text-left px-5 py-4 font-title font-semibold text-sm sm:text-base text-corporate"
                        >
                          {faq.pregunta}
                        </Button>
                      </h3>
                      {expandida && (
                        <div
                          id={panelId}
                          role="region"
                          aria-label={faq.pregunta}
                          className="px-5 pb-5 pt-2 border-t border-neutral-light/70 bg-neutral-lightest/40"
                        >
                          <MarkdownContenido markdown={faq.respuestaMarkdown} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Columna lateral: enlaces institucionales y atajo a contacto */}
          <aside
            aria-label="Enlaces institucionales"
            className="lg:col-span-4 space-y-6"
          >
            <div className="bg-neutral-white rounded-card border border-neutral-light p-6 shadow-card">
              <h3 className="font-title font-semibold text-base text-corporate mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-action" aria-hidden="true" />
                Políticas e Información
              </h3>
              <p className="font-sans text-xs text-neutral-medium mb-3">
                Consulta nuestros lineamientos de servicio, envíos y tratamiento de datos.
              </p>
              <ul className="space-y-1.5">
                {enlacesPaginas.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/paginas/${p.slug}`}
                      className="flex items-center justify-between px-3 py-2.5 rounded-btn text-sm font-title text-neutral-dark hover:bg-subaction hover:text-corporate transition-colors"
                    >
                      <span>{p.titulo}</span>
                      <ChevronRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-neutral-white rounded-card border border-neutral-light p-6 shadow-card">
              <h3 className="font-title font-semibold text-base text-corporate mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-action" aria-hidden="true" />
                ¿No encontraste tu respuesta?
              </h3>
              <p className="font-sans text-sm text-neutral-dark mb-4">
                Escríbenos desde tu cuenta o habla con un asesor por WhatsApp dentro de nuestro horario de atención.
              </p>
              <a
                href="#contacto-equipo"
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-btn border border-action px-4 py-2 font-title text-sm font-semibold text-action transition-colors hover:bg-subaction focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
              >
                Ir a canales de contacto
              </a>
            </div>
          </aside>
        </div>
      </Container>
    </section>
  );
};