'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CircleHelp,
  Eye,
  FileText,
  Pencil,
  Plus,
  Search,
} from 'lucide-react';
import {
  AdminPageHeader,
  AdminStatCard,
  Alert,
  Badge,
  Button,
  ButtonLink,
  Input,
  Modal,
  SegmentedTabs,
  Select,
  Skeleton,
  type BadgeVariant,
  type SegmentedOption,
  type SelectOption,
} from '@/core/components';
import { mensajeDeError } from '@/core/utils/errorApi';
import type {
  FaqFormValues,
  PaginaFormValues,
} from '../../dtos/m16-contenido.dto';
import type {
  EstadoFaq,
  EstadoPaginaContenido,
  FaqAdminEntity,
  PaginaAdminEntity,
} from '../../interfaces/contenido.interface';
import {
  cambiarEstadoFaqAdmin,
  cambiarEstadoPaginaAdmin,
  cambiarOrdenFaqAdmin,
  crearFaqAdmin,
  crearPaginaAdmin,
  editarFaqAdmin,
  editarPaginaAdmin,
  listarFaqAdmin,
  listarPaginasAdmin,
} from '../../services/contenido-api';
import { MarkdownContenido } from '../publico/MarkdownContenido';
import { FaqFormModal } from './FaqFormModal';
import { PaginaFormModal } from './PaginaFormModal';

type PestanaContenido = 'paginas' | 'faq';

const OPCIONES_PESTANA: ReadonlyArray<SegmentedOption<PestanaContenido>> = [
  { value: 'paginas', label: 'Páginas Institucionales' },
  { value: 'faq', label: 'Preguntas Frecuentes (FAQ)' },
];

const FILTROS_ESTADO_PAGINA: ReadonlyArray<SelectOption> = [
  { value: '', label: 'Todos los estados' },
  { value: 'publicado', label: 'Publicadas' },
  { value: 'borrador', label: 'En borrador' },
  { value: 'archivado', label: 'Archivadas' },
];

const FILTROS_ESTADO_FAQ: ReadonlyArray<SelectOption> = [
  { value: '', label: 'Todos los estados' },
  { value: 'activo', label: 'Activas' },
  { value: 'inactivo', label: 'Inactivas' },
];

function badgeEstadoPagina(estado: EstadoPaginaContenido): {
  variant: BadgeVariant;
  texto: string;
} {
  switch (estado) {
    case 'publicado':
      return { variant: 'success', texto: 'Publicado' };
    case 'borrador':
      return { variant: 'sponsored', texto: 'Borrador' };
    case 'archivado':
      return { variant: 'neutral', texto: 'Archivado' };
  }
}

function badgeEstadoFaq(estado: EstadoFaq): {
  variant: BadgeVariant;
  texto: string;
} {
  return estado === 'activo'
    ? { variant: 'success', texto: 'Activo' }
    : { variant: 'neutral', texto: 'Inactivo' };
}

function formatearFechaCorta(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function extraerMensajeErrorContenido(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const posibleAxios = err as {
      response?: { data?: { error?: { code?: string; message?: string } } };
    };
    const errorApi = posibleAxios.response?.data?.error;
    if (errorApi?.code === 'SLUG_DUPLICADO' && errorApi.message) {
      return errorApi.message;
    }
    if (errorApi?.code === 'VALIDATION_ERROR' && errorApi.message) {
      return errorApi.message;
    }
  }
  return mensajeDeError(err);
}

export const ContenidoAdminView: React.FC = () => {
  const [pestana, setPestana] = useState<PestanaContenido>('paginas');

  // Estado de páginas institucionales
  const [paginas, setPaginas] = useState<PaginaAdminEntity[]>([]);
  const [filtroEstadoPagina, setFiltroEstadoPagina] = useState<string>('');
  const [busquedaPagina, setBusquedaPagina] = useState('');
  const [cargandoPaginas, setCargandoPaginas] = useState(true);

  // Estado de FAQ
  const [faqs, setFaqs] = useState<FaqAdminEntity[]>([]);
  const [filtroEstadoFaq, setFiltroEstadoFaq] = useState<string>('');
  const [busquedaFaq, setBusquedaFaq] = useState('');
  const [cargandoFaq, setCargandoFaq] = useState(true);

  // Feedback general
  const [avisoExito, setAvisoExito] = useState<string | null>(null);
  const [errorVista, setErrorVista] = useState<string | null>(null);

  // Modales de formulario y vista previa
  const [modalPaginaAbierto, setModalPaginaAbierto] = useState(false);
  const [paginaEnEdicion, setPaginaEnEdicion] =
    useState<PaginaAdminEntity | null>(null);
  const [paginaVistaPrevia, setPaginaVistaPrevia] =
    useState<PaginaAdminEntity | null>(null);
  const [errorModalPagina, setErrorModalPagina] = useState<string | null>(null);

  const [modalFaqAbierto, setModalFaqAbierto] = useState(false);
  const [faqEnEdicion, setFaqEnEdicion] = useState<FaqAdminEntity | null>(null);
  const [errorModalFaq, setErrorModalFaq] = useState<string | null>(null);

  const cargarPaginas = useCallback(async () => {
    setCargandoPaginas(true);
    setErrorVista(null);
    try {
      const lista = await listarPaginasAdmin({
        estado: (filtroEstadoPagina || undefined) as
          | EstadoPaginaContenido
          | undefined,
        busqueda: busquedaPagina,
      });
      setPaginas(lista);
    } catch (err: unknown) {
      setErrorVista(extraerMensajeErrorContenido(err));
    } finally {
      setCargandoPaginas(false);
    }
  }, [filtroEstadoPagina, busquedaPagina]);

  const cargarFaqs = useCallback(async () => {
    setCargandoFaq(true);
    setErrorVista(null);
    try {
      const lista = await listarFaqAdmin({
        estado: (filtroEstadoFaq || undefined) as EstadoFaq | undefined,
        busqueda: busquedaFaq,
      });
      setFaqs(lista);
    } catch (err: unknown) {
      setErrorVista(extraerMensajeErrorContenido(err));
    } finally {
      setCargandoFaq(false);
    }
  }, [filtroEstadoFaq, busquedaFaq]);

  useEffect(() => {
    void cargarPaginas();
  }, [cargarPaginas]);

  useEffect(() => {
    void cargarFaqs();
  }, [cargarFaqs]);

  /* ─── Acciones de Páginas Institucionales (HU-CON-01) ───────────────────── */

  const abrirCrearPagina = () => {
    setPaginaEnEdicion(null);
    setErrorModalPagina(null);
    setModalPaginaAbierto(true);
  };

  const abrirEditarPagina = (pagina: PaginaAdminEntity) => {
    setPaginaEnEdicion(pagina);
    setErrorModalPagina(null);
    setModalPaginaAbierto(true);
  };

  const guardarPagina = async (valores: PaginaFormValues) => {
    setErrorModalPagina(null);
    setAvisoExito(null);
    try {
      if (paginaEnEdicion) {
        await editarPaginaAdmin(paginaEnEdicion.idPagina, {
          titulo: valores.titulo,
          slug: valores.slug,
          resumen: valores.resumen,
          cuerpoMarkdown: valores.cuerpoMarkdown,
        });
        setAvisoExito(`Página "${valores.titulo}" actualizada correctamente.`);
      } else {
        await crearPaginaAdmin(valores);
        setAvisoExito(`Página "${valores.titulo}" creada correctamente.`);
      }
      setModalPaginaAbierto(false);
      await cargarPaginas();
    } catch (err: unknown) {
      setErrorModalPagina(extraerMensajeErrorContenido(err));
    }
  };

  const cambiarEstadoPagina = async (
    pagina: PaginaAdminEntity,
    nuevoEstado: EstadoPaginaContenido,
  ) => {
    setAvisoExito(null);
    setErrorVista(null);
    try {
      await cambiarEstadoPaginaAdmin(pagina.idPagina, nuevoEstado);
      setAvisoExito(
        `Estado de "${pagina.titulo}" cambiado a ${nuevoEstado.toUpperCase()}.`,
      );
      await cargarPaginas();
    } catch (err: unknown) {
      setErrorVista(extraerMensajeErrorContenido(err));
    }
  };

  /* ─── Acciones de FAQ (HU-CON-02) ───────────────────────────────────────── */

  const abrirCrearFaq = () => {
    setFaqEnEdicion(null);
    setErrorModalFaq(null);
    setModalFaqAbierto(true);
  };

  const abrirEditarFaq = (faq: FaqAdminEntity) => {
    setFaqEnEdicion(faq);
    setErrorModalFaq(null);
    setModalFaqAbierto(true);
  };

  const guardarFaq = async (valores: FaqFormValues) => {
    setErrorModalFaq(null);
    setAvisoExito(null);
    try {
      if (faqEnEdicion) {
        await editarFaqAdmin(faqEnEdicion.idFaq, {
          pregunta: valores.pregunta,
          respuestaMarkdown: valores.respuestaMarkdown,
          orden: valores.orden,
        });
        setAvisoExito('Pregunta frecuente actualizada correctamente.');
      } else {
        await crearFaqAdmin(valores);
        setAvisoExito('Pregunta frecuente creada correctamente.');
      }
      setModalFaqAbierto(false);
      await cargarFaqs();
    } catch (err: unknown) {
      setErrorModalFaq(extraerMensajeErrorContenido(err));
    }
  };

  const alternarEstadoFaq = async (faq: FaqAdminEntity) => {
    const nuevoEstado: EstadoFaq =
      faq.estado === 'activo' ? 'inactivo' : 'activo';
    setAvisoExito(null);
    setErrorVista(null);
    try {
      await cambiarEstadoFaqAdmin(faq.idFaq, nuevoEstado);
      setAvisoExito(
        `Pregunta frecuente marcada como ${nuevoEstado.toUpperCase()}.`,
      );
      await cargarFaqs();
    } catch (err: unknown) {
      setErrorVista(extraerMensajeErrorContenido(err));
    }
  };

  const moverOrdenFaq = async (indiceActual: number, delta: -1 | 1) => {
    const indiceVecino = indiceActual + delta;
    if (indiceVecino < 0 || indiceVecino >= faqs.length) return;
    const reordenados = [...faqs];
    const actual = reordenados[indiceActual];
    const vecino = reordenados[indiceVecino];
    if (!actual || !vecino) return;
    reordenados[indiceActual] = vecino;
    reordenados[indiceVecino] = actual;
    setErrorVista(null);
    try {
      await Promise.all(
        reordenados.map((item, idx) => cambiarOrdenFaqAdmin(item.idFaq, idx + 1)),
      );
      await cargarFaqs();
    } catch (err: unknown) {
      setErrorVista(extraerMensajeErrorContenido(err));
    }
  };

  const totalPublicadas = paginas.filter((p) => p.estado === 'publicado').length;
  const totalBorradores = paginas.filter((p) => p.estado === 'borrador').length;
  const totalFaqActivas = faqs.filter((f) => f.estado === 'activo').length;

  return (
    <>
      <div className="space-y-6">
        <AdminPageHeader
          title="Contenido Institucional y Centro de Ayuda"
          subtitle="Administra las páginas informativas de vitrina (Sobre Nosotros, Términos, Privacidad, Envíos) y el catálogo de Preguntas Frecuentes (FAQ)."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {pestana === 'paginas' ? (
                <Button
                  type="button"
                  variant="primary-action"
                  onClick={abrirCrearPagina}
                  leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}
                >
                  Nueva página
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary-action"
                  onClick={abrirCrearFaq}
                  leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}
                >
                  Nueva pregunta FAQ
                </Button>
              )}
            </div>
          }
        />

        {/* Tarjetas de resumen KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <AdminStatCard
            label="Páginas Publicadas"
            value={totalPublicadas}
            icon={<FileText className="w-5 h-5" aria-hidden="true" />}
            trendText="Visibles en tienda"
            trendType="positive"
          />
          <AdminStatCard
            label="Páginas en Borrador"
            value={totalBorradores}
            icon={<Pencil className="w-5 h-5" aria-hidden="true" />}
            trendText="Edición interna"
            trendType="neutral"
          />
          <AdminStatCard
            label="Preguntas FAQ Activas"
            value={totalFaqActivas}
            icon={<CircleHelp className="w-5 h-5" aria-hidden="true" />}
            trendText="Centro de Ayuda público"
            trendType="positive"
          />
        </div>

        {avisoExito && (
          <Alert variant="success" title="Operación exitosa">
            {avisoExito}
          </Alert>
        )}

        {errorVista && (
          <Alert variant="error" title="Atención">
            {errorVista}
          </Alert>
        )}

        {/* Selector de pestaña (Páginas Institucionales | FAQ) */}
        <div className="max-w-md">
          <SegmentedTabs
            options={OPCIONES_PESTANA}
            value={pestana}
            onChange={setPestana}
            ariaLabel="Secciones de contenido institucional"
            panelId="panel-contenido-admin"
            idPrefix="m16-contenido"
          />
        </div>

        {/* Panel activo */}
        <div
          id="panel-contenido-admin"
          role="tabpanel"
          className="bg-neutral-white rounded-card border border-neutral-light p-5 sm:p-6 shadow-card space-y-5"
        >
          {pestana === 'paginas' ? (
            <>
              {/* Filtros de Páginas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    id="admin-busqueda-paginas"
                    label="Buscar por título o slug"
                    placeholder="Ej. sobre-nosotros, términos, envío..."
                    value={busquedaPagina}
                    onChange={(e) => setBusquedaPagina(e.target.value)}
                    leftIcon={<Search className="w-4 h-4" aria-hidden="true" />}
                  />
                </div>
                <Select
                  id="admin-filtro-estado-pagina"
                  label="Filtrar por estado"
                  options={FILTROS_ESTADO_PAGINA}
                  value={filtroEstadoPagina}
                  onChange={(e) => setFiltroEstadoPagina(e.target.value)}
                />
              </div>

              {cargandoPaginas ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full rounded-card" />
                  <Skeleton className="h-16 w-full rounded-card" />
                </div>
              ) : paginas.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="font-title font-semibold text-base text-neutral-black">
                    No se encontraron páginas institucionales
                  </p>
                  <p className="font-sans text-sm text-neutral-medium mt-1">
                    Ajusta los filtros o crea una nueva página institucional.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-light">
                  {paginas.map((pagina) => {
                    const badge = badgeEstadoPagina(pagina.estado);
                    return (
                      <div
                        key={pagina.idPagina}
                        className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-title font-semibold text-base text-corporate">
                              {pagina.titulo}
                            </h2>
                            <Badge variant={badge.variant}>{badge.texto}</Badge>
                            <span className="font-mono text-xs text-neutral-medium bg-neutral-lightest px-2 py-0.5 rounded-xs">
                              /paginas/{pagina.slug}
                            </span>
                          </div>
                          {pagina.resumen && (
                            <p className="font-sans text-xs sm:text-sm text-neutral-dark">
                              {pagina.resumen}
                            </p>
                          )}
                          <p className="font-sans text-xs text-neutral-medium">
                            Última actualización:{' '}
                            {formatearFechaCorta(pagina.fechaActualizacion)}
                            {pagina.nombreAutor
                              ? ` · Autor: ${pagina.nombreAutor}`
                              : ''}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setPaginaVistaPrevia(pagina)}
                            leftIcon={
                              <Eye className="w-4 h-4" aria-hidden="true" />
                            }
                          >
                            Vista previa
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => abrirEditarPagina(pagina)}
                            leftIcon={
                              <Pencil className="w-4 h-4" aria-hidden="true" />
                            }
                          >
                            Editar
                          </Button>

                          {pagina.estado !== 'publicado' && (
                            <Button
                              type="button"
                              variant="primary-conversion"
                              size="sm"
                              onClick={() =>
                                void cambiarEstadoPagina(pagina, 'publicado')
                              }
                            >
                              Publicar
                            </Button>
                          )}

                          {pagina.estado === 'publicado' && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                void cambiarEstadoPagina(pagina, 'borrador')
                              }
                            >
                              Pasar a borrador
                            </Button>
                          )}

                          {pagina.estado !== 'archivado' && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                void cambiarEstadoPagina(pagina, 'archivado')
                              }
                            >
                              Archivar
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Filtros de FAQ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    id="admin-busqueda-faq"
                    label="Buscar en preguntas o respuestas"
                    placeholder="Ej. envío, devolución, empresa..."
                    value={busquedaFaq}
                    onChange={(e) => setBusquedaFaq(e.target.value)}
                    leftIcon={<Search className="w-4 h-4" aria-hidden="true" />}
                  />
                </div>
                <Select
                  id="admin-filtro-estado-faq"
                  label="Filtrar por estado"
                  options={FILTROS_ESTADO_FAQ}
                  value={filtroEstadoFaq}
                  onChange={(e) => setFiltroEstadoFaq(e.target.value)}
                />
              </div>

              {cargandoFaq ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full rounded-card" />
                  <Skeleton className="h-16 w-full rounded-card" />
                </div>
              ) : faqs.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="font-title font-semibold text-base text-neutral-black">
                    No se encontraron preguntas frecuentes
                  </p>
                  <p className="font-sans text-sm text-neutral-medium mt-1">
                    Crea la primera pregunta para el Centro de Ayuda.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-light">
                  {faqs.map((faq, indice) => {
                    const badge = badgeEstadoFaq(faq.estado);
                    return (
                      <div
                        key={faq.idFaq}
                        className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 max-w-3xl">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-corporate bg-subaction px-2 py-0.5 rounded-xs">
                              Orden #{faq.orden}
                            </span>
                            <h2 className="font-title font-semibold text-base text-corporate">
                              {faq.pregunta}
                            </h2>
                            <Badge variant={badge.variant}>{badge.texto}</Badge>
                          </div>
                          <p className="font-sans text-xs sm:text-sm text-neutral-dark line-clamp-2">
                            {faq.respuestaMarkdown}
                          </p>
                          <p className="font-sans text-xs text-neutral-medium">
                            Actualizado:{' '}
                            {formatearFechaCorta(faq.fechaActualizacion)}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Subir prioridad de ${faq.pregunta}`}
                            onClick={() => void moverOrdenFaq(indice, -1)}
                            disabled={indice === 0}
                            leftIcon={
                              <ArrowUp className="w-4 h-4" aria-hidden="true" />
                            }
                          >
                            Subir
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Bajar prioridad de ${faq.pregunta}`}
                            onClick={() => void moverOrdenFaq(indice, 1)}
                            disabled={indice === faqs.length - 1}
                            leftIcon={
                              <ArrowDown className="w-4 h-4" aria-hidden="true" />
                            }
                          >
                            Bajar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => abrirEditarFaq(faq)}
                            leftIcon={
                              <Pencil className="w-4 h-4" aria-hidden="true" />
                            }
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant={
                              faq.estado === 'activo'
                                ? 'ghost'
                                : 'primary-conversion'
                            }
                            size="sm"
                            onClick={() => void alternarEstadoFaq(faq)}
                          >
                            {faq.estado === 'activo' ? 'Desactivar' : 'Activar'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de creación/edición de página */}
      <PaginaFormModal
        isOpen={modalPaginaAbierto}
        onClose={() => setModalPaginaAbierto(false)}
        paginaEditar={paginaEnEdicion}
        onSubmitForm={guardarPagina}
        errorServidor={errorModalPagina}
      />

      {/* Modal de creación/edición de FAQ */}
      <FaqFormModal
        isOpen={modalFaqAbierto}
        onClose={() => setModalFaqAbierto(false)}
        faqEditar={faqEnEdicion}
        ordenSugerido={faqs.length + 1}
        onSubmitForm={guardarFaq}
        errorServidor={errorModalFaq}
      />

      {/* Modal de vista previa de página institucional */}
      <Modal
        isOpen={paginaVistaPrevia !== null}
        onClose={() => setPaginaVistaPrevia(null)}
        size="lg"
        title={paginaVistaPrevia?.titulo ?? 'Vista previa'}
        subtitle={
          paginaVistaPrevia ? `/paginas/${paginaVistaPrevia.slug}` : undefined
        }
      >
        {paginaVistaPrevia && (
          <div className="space-y-4">
            {paginaVistaPrevia.resumen && (
              <p className="font-sans text-sm text-neutral-medium italic border-l-4 border-action pl-3">
                {paginaVistaPrevia.resumen}
              </p>
            )}
            <MarkdownContenido markdown={paginaVistaPrevia.cuerpoMarkdown} />
            <div className="flex items-center justify-between pt-4 border-t border-neutral-light">
              {paginaVistaPrevia.estado === 'publicado' ? (
                <ButtonLink
                  href={`/paginas/${paginaVistaPrevia.slug}`}
                  variant="outline"
                  size="sm"
                >
                  Abrir página pública
                </ButtonLink>
              ) : (
                <span className="font-sans text-xs text-neutral-medium">
                  Esta página está en estado {paginaVistaPrevia.estado} y aún no es pública.
                </span>
              )}
              <Button
                type="button"
                variant="primary-action"
                size="sm"
                onClick={() => setPaginaVistaPrevia(null)}
              >
                Cerrar vista previa
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
