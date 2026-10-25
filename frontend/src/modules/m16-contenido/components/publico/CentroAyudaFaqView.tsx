'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleHelp,
  FileText,
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

export const CentroAyudaFaqView: React.FC = () => {
  const [items, setItems] = useState<FaqPublicaItem[]>([]);
  const [paginas, setPaginas] = useState<PaginaPublicaResumen[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [abiertaId, setAbiertaId] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    setCargando(true);

    Promise.all([
      listarFaqPublicas().catch(() => [] as FaqPublicaItem[]),
      listarPaginasPublicas().catch(() => [] as PaginaPublicaResumen[]),
    ])
      .then(([listaFaq, listaPaginas]) => {
        if (!activo) return;
        setItems(listaFaq);
        setPaginas(listaPaginas);
        if (listaFaq[0]) {
          setAbiertaId(listaFaq[0].idFaq);
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  const itemsFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return items;
    return items.filter(
      (f) =>
        f.pregunta.toLowerCase().includes(termino) ||
        f.respuestaMarkdown.toLowerCase().includes(termino),
    );
  }, [items, busqueda]);

  return (
    <section
      id="preguntas-frecuentes"
      aria-labelledby="titulo-preguntas-frecuentes"
      className="scroll-mt-24"
    >
      <Container>
        {/* Cabecera de la sección. El título y la ruta de la página los pone el centro de ayuda. */}
        <div className="bg-neutral-white rounded-card border border-neutral-light p-6 sm:p-8 shadow-card mb-8">
          <div className="max-w-2xl">
            <h2
              id="titulo-preguntas-frecuentes"
              className="font-title font-bold text-xl sm:text-2xl text-corporate tracking-tight"
            >
              Preguntas frecuentes
            </h2>
            <p className="font-sans text-sm sm:text-base text-neutral-medium mt-2">
              Encuentra respuestas rápidas sobre pedidos, modalidades de entrega, colores entonados y cuentas empresariales B2B.
            </p>
            <div className="mt-5 max-w-md">
              <Input
                id="busqueda-faq-publica"
                label="Buscar en preguntas frecuentes"
                placeholder="Ej. envío gratis, color entonado, NIT..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                leftIcon={<Search className="w-4 h-4" aria-hidden="true" />}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Lista de acordeones FAQ */}
          <div className="lg:col-span-8 space-y-3">
            {cargando ? (
              <>
                <Skeleton className="h-20 w-full rounded-card" />
                <Skeleton className="h-20 w-full rounded-card" />
                <Skeleton className="h-20 w-full rounded-card" />
              </>
            ) : itemsFiltrados.length === 0 ? (
              <div className="bg-neutral-white rounded-card border border-neutral-light p-8 text-center shadow-card">
                <CircleHelp
                  className="w-8 h-8 text-neutral-medium mx-auto mb-2"
                  aria-hidden="true"
                />
                <h3 className="font-title font-semibold text-base text-neutral-black">
                  No encontramos preguntas que coincidan con tu búsqueda
                </h3>
                <p className="font-sans text-sm text-neutral-medium mt-1">
                  Intenta con otra palabra clave o explora nuestras páginas institucionales.
                </p>
              </div>
            ) : (
              itemsFiltrados.map((faq) => {
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
              })
            )}
          </div>

          {/* Enlaces a páginas institucionales */}
          <aside
            aria-label="Enlaces institucionales"
            className="lg:col-span-4 space-y-4"
          >
            <div className="bg-neutral-white rounded-card border border-neutral-light p-5 shadow-card">
              <h3 className="font-title font-semibold text-base text-corporate mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-action" aria-hidden="true" />
                Políticas e Información
              </h3>
              <ul className="space-y-1.5">
                {paginas.map((p) => (
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
          </aside>
        </div>
      </Container>
    </section>
  );
};
