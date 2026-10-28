'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  ImagePlus,
  Images,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  AdminPageHeader,
  AdminStatCard,
  Alert,
  Badge,
  Button,
  Input,
  Modal,
  PuntoEnfoque,
  Select,
  Skeleton,
  Textarea,
} from '../components';
import {
  landingBannersAdminApi,
  landingBannersPublicoApi,
  type BannerInicioAdmin,
  type CrearBannerInicioPayload,
  type EstadoBannerInicio,
  type TipoMimeBannerInicio,
} from './landing-banners-api';
import { FOCO_CENTRO, posicionDeFoco, type FocoImagen } from '../utils/foco-imagen';
import heroStorefront from '../../../assets/hero-storefront-D9L_fhlS.png';

const IMAGENES_RESPALDO_ADMIN: ReadonlyArray<string> = [
  heroStorefront.src,
  '/images/landing/hero-slide-colores.png',
  '/images/landing/hero-slide-empresas.png',
];

function obtenerImagenEfectivaBanner(banner: BannerInicioAdmin): string {
  if (banner.tieneImagenPersonalizada) {
    return landingBannersPublicoApi.urlImagen(banner.idBanner, banner.fechaActualizacion);
  }
  const idx = Math.max(0, banner.idBanner - 1);
  return IMAGENES_RESPALDO_ADMIN[idx % IMAGENES_RESPALDO_ADMIN.length] ?? heroStorefront.src;
}

interface FormularioBannerEstado {
  tituloLinea1: string;
  tituloLinea2: string;
  descripcion: string;
  textoBotonPrimario: string;
  enlaceBotonPrimario: string;
  textoBotonSecundario: string;
  enlaceBotonSecundario: string;
  orden: number;
  estado: EstadoBannerInicio;
  imagenBase64?: string;
  imagenMimeType?: TipoMimeBannerInicio;
  vistaPreviaUrl?: string;
  nombreArchivo?: string;
  /** Qué parte de la imagen se conserva al recortarla. */
  foco: FocoImagen;
}

const ESTADO_INICIAL_FORM: FormularioBannerEstado = {
  tituloLinea1: '',
  tituloLinea2: '',
  descripcion: '',
  textoBotonPrimario: 'Explorar catálogo',
  enlaceBotonPrimario: '/productos',
  textoBotonSecundario: 'Centro de ayuda',
  enlaceBotonSecundario: '/centro-de-ayuda',
  orden: 1,
  estado: 'activo',
  foco: FOCO_CENTRO,
};

const TIPOS_PERMITIDOS: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export function BannersAdminView() {
  const [banners, setBanners] = useState<BannerInicioAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<BannerInicioAdmin | null>(null);
  const [form, setForm] = useState<FormularioBannerEstado>(ESTADO_INICIAL_FORM);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargarBanners = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const lista = await landingBannersAdminApi.listar();
      setBanners(lista);
    } catch {
      setError('No se pudieron cargar los sliders de la página de inicio.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarBanners();
  }, [cargarBanners]);

  const abrirCrear = () => {
    setEditando(null);
    setErrorForm(null);
    setForm({
      ...ESTADO_INICIAL_FORM,
      orden: banners.length + 1,
      vistaPreviaUrl: IMAGENES_RESPALDO_ADMIN[banners.length % IMAGENES_RESPALDO_ADMIN.length] ?? heroStorefront.src,
    });
    setModalAbierto(true);
  };

  const abrirEditar = (banner: BannerInicioAdmin) => {
    setEditando(banner);
    setErrorForm(null);
    setForm({
      tituloLinea1: banner.tituloLinea1,
      tituloLinea2: banner.tituloLinea2 ?? '',
      descripcion: banner.descripcion,
      textoBotonPrimario: banner.textoBotonPrimario,
      enlaceBotonPrimario: banner.enlaceBotonPrimario,
      textoBotonSecundario: banner.textoBotonSecundario ?? '',
      enlaceBotonSecundario: banner.enlaceBotonSecundario ?? '',
      orden: banner.orden,
      estado: banner.estado,
      vistaPreviaUrl: obtenerImagenEfectivaBanner(banner),
      foco: { x: banner.focoX, y: banner.focoY },
    });
    setModalAbierto(true);
  };

  const manejarSeleccionImagen = (evento: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;

    if (!TIPOS_PERMITIDOS.has(archivo.type)) {
      setErrorForm('Formato no permitido. Usa una imagen PNG, JPG o WEBP.');
      return;
    }
    if (archivo.size > 5 * 1024 * 1024) {
      setErrorForm('La imagen supera el tamaño máximo permitido de 5 MB.');
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      const resultado = typeof lector.result === 'string' ? lector.result : '';
      const coma = resultado.indexOf(',');
      const base64 = coma >= 0 ? resultado.slice(coma + 1) : resultado;
      setErrorForm(null);
      setForm((prev) => ({
        ...prev,
        imagenBase64: base64,
        imagenMimeType: archivo.type as TipoMimeBannerInicio,
        vistaPreviaUrl: resultado,
        nombreArchivo: archivo.name,
      }));
    };
    lector.readAsDataURL(archivo);
  };

  const guardarBanner = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setErrorForm(null);

    if (form.tituloLinea1.trim().length < 3) {
      setErrorForm('El título principal debe tener al menos 3 caracteres.');
      return;
    }
    if (form.descripcion.trim().length < 10) {
      setErrorForm('La descripción debe tener al menos 10 caracteres.');
      return;
    }
    if (form.textoBotonPrimario.trim().length < 2 || !form.enlaceBotonPrimario.trim()) {
      setErrorForm('Completa el texto y el enlace del botón principal.');
      return;
    }

    setGuardando(true);
    try {
      const payloadBase: CrearBannerInicioPayload = {
        tituloLinea1: form.tituloLinea1.trim(),
        tituloLinea2: form.tituloLinea2.trim() || null,
        descripcion: form.descripcion.trim(),
        textoBotonPrimario: form.textoBotonPrimario.trim(),
        enlaceBotonPrimario: form.enlaceBotonPrimario.trim(),
        textoBotonSecundario: form.textoBotonSecundario.trim() || null,
        enlaceBotonSecundario: form.enlaceBotonSecundario.trim() || null,
        orden: Number(form.orden) || 0,
        estado: form.estado,
        focoX: form.foco.x,
        focoY: form.foco.y,
        ...(form.imagenBase64 && form.imagenMimeType
          ? {
              imagenBase64: form.imagenBase64,
              imagenMimeType: form.imagenMimeType,
            }
          : {}),
      };

      if (editando) {
        const { estado: estadoDeseado, ...camposEdicion } = payloadBase;
        await landingBannersAdminApi.editar(editando.idBanner, camposEdicion);
        if (estadoDeseado && estadoDeseado !== editando.estado) {
          await landingBannersAdminApi.cambiarEstado(editando.idBanner, estadoDeseado);
        }
        setExito(`Slider "${form.tituloLinea1.trim()}" actualizado correctamente.`);
      } else {
        await landingBannersAdminApi.crear(payloadBase);
        setExito(`Slider "${form.tituloLinea1.trim()}" creado correctamente.`);
      }

      setModalAbierto(false);
      await cargarBanners();
    } catch (err: unknown) {
      const msgServidor =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ===
          'string'
          ? (err as { response: { data: { error: { message: string } } } }).response.data.error.message
          : null;
      setErrorForm(
        msgServidor ??
          'No se pudo guardar el slider. Verifica que los enlaces comiencen con "/" o "https://" y que la imagen sea válida.',
      );
    } finally {
      setGuardando(false);
    }
  };

  const alternarEstado = async (banner: BannerInicioAdmin) => {
    const nuevoEstado: EstadoBannerInicio = banner.estado === 'activo' ? 'inactivo' : 'activo';
    try {
      await landingBannersAdminApi.cambiarEstado(banner.idBanner, nuevoEstado);
      setExito(
        `Slider "${banner.tituloLinea1}" ${nuevoEstado === 'activo' ? 'activado en la página de inicio' : 'ocultado de la página de inicio'}.`,
      );
      await cargarBanners();
    } catch {
      setError('No se pudo cambiar el estado del slider.');
    }
  };

  const cambiarOrdenRapido = async (indiceActual: number, delta: -1 | 1) => {
    const indiceVecino = indiceActual + delta;
    if (indiceVecino < 0 || indiceVecino >= banners.length) return;
    const reordenados = [...banners];
    const actual = reordenados[indiceActual];
    const vecino = reordenados[indiceVecino];
    if (!actual || !vecino) return;
    reordenados[indiceActual] = vecino;
    reordenados[indiceVecino] = actual;

    try {
      await Promise.all(
        reordenados.map((item, idx) => landingBannersAdminApi.editar(item.idBanner, { orden: idx + 1 })),
      );
      setExito(`Orden actualizado: "${actual.tituloLinea1}" ahora está en la posición #${indiceVecino + 1}.`);
      await cargarBanners();
    } catch {
      setError('No se pudo actualizar el orden del slider.');
    }
  };

  const eliminarBanner = async (banner: BannerInicioAdmin) => {
    try {
      await landingBannersAdminApi.eliminar(banner.idBanner);
      setExito(`Slider "${banner.tituloLinea1}" eliminado.`);
      await cargarBanners();
    } catch {
      setError('No se pudo eliminar el slider.');
    }
  };

  const totalActivos = banners.filter((b) => b.estado === 'activo').length;
  const totalConImagen = banners.filter((b) => b.tieneImagenPersonalizada).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Banners y Sliders de Inicio"
        subtitle="Administra las imágenes, mensajes promocionales y botones de acción del carrusel principal de la página de inicio."
        actions={
          <Button
            variant="primary-action"
            leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            onClick={abrirCrear}
          >
            Nuevo slider
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AdminStatCard
          label="Total de sliders"
          value={String(banners.length)}
          trendText="Registrados"
          trendSubtext="en el carrusel principal"
          trendType="neutral"
          icon={<Images className="h-5 w-5" aria-hidden="true" />}
        />
        <AdminStatCard
          label="Sliders activos"
          value={String(totalActivos)}
          trendText="Visibles"
          trendSubtext="rotando en la página de inicio"
          trendType="positive"
          icon={<Eye className="h-5 w-5" aria-hidden="true" />}
        />
        <AdminStatCard
          label="Con imagen propia"
          value={String(totalConImagen)}
          trendText="Personalizados"
          trendSubtext="subidos desde este panel"
          trendType="neutral"
          icon={<Sparkles className="h-5 w-5" aria-hidden="true" />}
        />
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {exito && <Alert variant="success">{exito}</Alert>}

      {cargando ? (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full" rounded="card" />
          <Skeleton className="h-44 w-full" rounded="card" />
        </div>
      ) : banners.length === 0 ? (
        <div className="rounded-card border border-dashed border-neutral-light bg-neutral-white p-10 text-center">
          <p className="font-title text-base font-semibold text-neutral-black">
            Aún no hay sliders configurados
          </p>
          <p className="mt-1 font-sans text-sm text-neutral-medium">
            Crea el primer banner para mostrar promociones, categorías o anuncios en la portada.
          </p>
          <Button className="mt-4" variant="primary-action" onClick={abrirCrear}>
            Crear primer slider
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {banners.map((banner, indice) => {
            const urlImg = obtenerImagenEfectivaBanner(banner);

            return (
              <article
                key={banner.idBanner}
                className="overflow-hidden rounded-card border border-neutral-light bg-neutral-white shadow-card transition-shadow hover:shadow-card-hover"
              >
                <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr]">
                  {/* Vista previa visual en miniatura del slide */}
                  <div className="relative flex min-h-48 flex-col justify-center overflow-hidden bg-corporate p-6 text-neutral-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={urlImg}
                      alt={banner.tituloLinea1}
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{ objectPosition: banner.tieneImagenPersonalizada ? posicionDeFoco({ x: banner.focoX, y: banner.focoY }) : 'right' }}
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-linear-to-r from-corporate/85 via-corporate/55 to-transparent"
                    />
                    <div className="relative z-10 space-y-1.5">
                      <span className="inline-block rounded-full bg-neutral-white/15 px-2.5 py-0.5 font-title text-[11px] font-medium text-neutral-white">
                        Orden #{banner.orden} ·{' '}
                        {banner.tieneImagenPersonalizada ? 'Imagen personalizada' : 'Arte institucional'}
                      </span>
                      <p className="font-title text-lg font-bold leading-snug text-neutral-white">
                        {banner.tituloLinea1}
                        {banner.tituloLinea2 && (
                          <>
                            <br />
                            <span className="text-highlight">{banner.tituloLinea2}</span>
                          </>
                        )}
                      </p>
                      <p className="line-clamp-2 font-sans text-xs text-neutral-white/85">
                        {banner.descripcion}
                      </p>
                    </div>
                  </div>

                  {/* Metadatos y acciones administrativas */}
                  <div className="flex flex-col justify-between gap-4 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-title text-lg font-semibold text-neutral-black">
                            {banner.tituloLinea1}{' '}
                            {banner.tituloLinea2 ? (
                              <span className="text-action">{banner.tituloLinea2}</span>
                            ) : null}
                          </h2>
                          <Badge variant={banner.estado === 'activo' ? 'success' : 'neutral'}>
                            {banner.estado === 'activo' ? 'Activo en portada' : 'Inactivo'}
                          </Badge>
                        </div>
                        <p className="mt-1 font-sans text-sm text-neutral-dark">
                          {banner.descripcion}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={indice === 0}
                          aria-label={`Subir prioridad de ${banner.tituloLinea1}`}
                          onClick={() => void cambiarOrdenRapido(indice, -1)}
                        >
                          <ArrowUp className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={indice === banners.length - 1}
                          aria-label={`Bajar prioridad de ${banner.tituloLinea1}`}
                          onClick={() => void cambiarOrdenRapido(indice, 1)}
                        >
                          <ArrowDown className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 rounded-card bg-neutral-lightest p-3 font-sans text-xs text-neutral-dark sm:grid-cols-2">
                      <div>
                        <span className="font-semibold text-neutral-black">Botón principal: </span>
                        {banner.textoBotonPrimario} →{' '}
                        <code className="text-action">{banner.enlaceBotonPrimario}</code>
                      </div>
                      <div>
                        <span className="font-semibold text-neutral-black">Botón secundario: </span>
                        {banner.textoBotonSecundario && banner.enlaceBotonSecundario ? (
                          <>
                            {banner.textoBotonSecundario} →{' '}
                            <code className="text-action">{banner.enlaceBotonSecundario}</code>
                          </>
                        ) : (
                          <span className="text-neutral-medium">Sin botón secundario</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-light pt-3">
                      <span className="font-sans text-xs text-neutral-medium">
                        Última edición:{' '}
                        {new Date(banner.fechaActualizacion).toLocaleDateString('es-CO')}
                        {banner.nombreAutor ? ` por ${banner.nombreAutor}` : ''}
                      </span>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Pencil className="h-4 w-4" aria-hidden="true" />}
                          onClick={() => abrirEditar(banner)}
                        >
                          Editar / Subir imagen
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={
                            banner.estado === 'activo' ? (
                              <EyeOff className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <Eye className="h-4 w-4" aria-hidden="true" />
                            )
                          }
                          onClick={() => void alternarEstado(banner)}
                        >
                          {banner.estado === 'activo' ? 'Ocultar' : 'Activar'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Eliminar slider ${banner.tituloLinea1}`}
                          onClick={() => void eliminarBanner(banner)}
                        >
                          <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        size="lg"
        title={editando ? 'Editar slider de inicio' : 'Nuevo slider de inicio'}
      >
        <form onSubmit={(e) => void guardarBanner(e)} className="space-y-4">
          {errorForm && <Alert variant="error">{errorForm}</Alert>}

          {/* Subida y vista previa en vivo de la imagen del slider */}
          <div className="rounded-card border border-neutral-light bg-neutral-lightest p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-title text-sm font-semibold text-neutral-black">
                  Imagen de fondo del slider
                </p>
                <p className="font-sans text-xs text-neutral-medium">
                  Formatos PNG, JPG o WEBP (máximo 5 MB), de cualquier forma y tamaño: marque abajo qué parte debe verse.
                </p>
              </div>
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-btn bg-action px-4 py-2 font-title text-sm font-medium text-neutral-white transition-colors hover:bg-action-hover">
                <Upload className="h-4 w-4" aria-hidden="true" />
                <span>{form.vistaPreviaUrl ? 'Cambiar imagen' : 'Seleccionar imagen'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={manejarSeleccionImagen}
                  className="sr-only"
                />
              </label>
            </div>

            {form.nombreArchivo && (
              <p className="mt-2 flex items-center gap-1.5 font-sans text-xs text-conversion-hover">
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
                Archivo seleccionado: <strong>{form.nombreArchivo}</strong>
              </p>
            )}

            {/* Punto de enfoque: la imagen puede ser de cualquier forma; aquí se marca qué parte debe quedar a la vista. */}
            {form.vistaPreviaUrl && (
              <div className="mt-3">
                <PuntoEnfoque
                  src={form.vistaPreviaUrl}
                  proporcion={2.2}
                  foco={form.foco}
                  onChange={(foco) => setForm((prev) => ({ ...prev, foco }))}
                  nombre="del slider"
                  sinVista
                />
              </div>
            )}

            {/* Previsualización en tiempo real */}
            <div className="relative mt-3 flex h-44 flex-col justify-center overflow-hidden rounded-card bg-corporate p-5 text-neutral-white">
              {form.vistaPreviaUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={form.vistaPreviaUrl}
                  alt="Vista previa del slider"
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ objectPosition: posicionDeFoco(form.foco) }}
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-linear-to-r from-corporate via-action/35 to-corporate"
                />
              )}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-linear-to-r from-corporate/85 via-corporate/55 to-transparent"
              />
              <div className="relative z-10 max-w-md space-y-1">
                <p className="font-title text-xl font-bold leading-tight">
                  {form.tituloLinea1 || 'Título principal del slider'}
                  {form.tituloLinea2 ? (
                    <>
                      <br />
                      <span className="text-highlight">{form.tituloLinea2}</span>
                    </>
                  ) : null}
                </p>
                <p className="line-clamp-2 font-sans text-xs text-neutral-white/90">
                  {form.descripcion ||
                    'Aquí se verá la descripción breve sobre la imagen seleccionada.'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Título principal (línea 1)"
              value={form.tituloLinea1}
              onChange={(e) => setForm((prev) => ({ ...prev, tituloLinea1: e.target.value }))}
              placeholder="Ej. Todo para tu proyecto,"
              required
            />
            <Input
              label="Línea destacada en amarillo (opcional)"
              value={form.tituloLinea2}
              onChange={(e) => setForm((prev) => ({ ...prev, tituloLinea2: e.target.value }))}
              placeholder="Ej. en un solo lugar"
            />
          </div>

          <Textarea
            label="Descripción del banner"
            rows={2}
            value={form.descripcion}
            onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
            placeholder="Describe la promoción, línea de productos o propuesta de valor..."
            required
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Texto del botón principal"
              value={form.textoBotonPrimario}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, textoBotonPrimario: e.target.value }))
              }
              placeholder="Ej. Explorar catálogo"
              required
            />
            <Input
              label="Enlace del botón principal"
              value={form.enlaceBotonPrimario}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, enlaceBotonPrimario: e.target.value }))
              }
              placeholder="Ej. /productos"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Texto del botón secundario (opcional)"
              value={form.textoBotonSecundario}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, textoBotonSecundario: e.target.value }))
              }
              placeholder="Ej. Centro de ayuda"
            />
            <Input
              label="Enlace del botón secundario (opcional)"
              value={form.enlaceBotonSecundario}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, enlaceBotonSecundario: e.target.value }))
              }
              placeholder="Ej. /centro-de-ayuda"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Orden de aparición"
              type="number"
              min={0}
              max={9999}
              value={String(form.orden)}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, orden: Number(e.target.value) || 0 }))
              }
            />
            <Select
              label="Estado inicial"
              value={form.estado}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  estado: e.target.value as EstadoBannerInicio,
                }))
              }
              options={[
                { value: 'activo', label: 'Activo (visible en el Home)' },
                { value: 'inactivo', label: 'Inactivo (oculto)' },
              ]}
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-neutral-light pt-4">
            <Button type="button" variant="outline" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary-action" disabled={guardando}>
              {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear slider'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
