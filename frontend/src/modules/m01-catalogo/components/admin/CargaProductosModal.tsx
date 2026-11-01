'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileSpreadsheet, Plus, X } from 'lucide-react';
import { Alert, Badge, Button, Checkbox, FileInput, Modal, type BadgeVariant } from '@/core/components';
import { formatCOP } from '@/core/utils/moneda';
import { MAXIMO_FILAS_ARCHIVO_PRODUCTOS, type FilaProductoCarga, type ProductoCarga } from '../../dtos/m01-catalogo-carga-masiva.dto';
import { MAXIMO_IMAGENES_PRODUCTO } from '../../dtos/m01-catalogo-productos.dto';
import {
  armarInformeProductos,
  cargaProductosApi,
  guardarArchivoXlsx,
  NOMBRE_INFORME_PRODUCTOS,
  NOMBRE_PLANTILLA_PRODUCTOS,
  type ResultadoCarga,
} from '../../services/carga-productos-api';
import { leerImagen, validarImagen } from '../../services/archivos';
import { imagenesApi } from '../../services/catalogo-api';
import { claveDeProducto, conAlgoQueRevisar } from '../../services/carga-productos-bloques';
import { leerLibroProductos, LibroInvalidoError, type LecturaLibro } from '../../services/carga-productos';
import { leerErrorCatalogo } from '../../services/mensaje-error';

export interface CargaProductosModalProps {
  onClose: () => void;
  /** Se avisa al cerrar si la carga creó productos, para que la lista se actualice. */
  onCargados?: (productos: number) => void;
}

const FILAS_DE_ERROR_VISIBLES = 8;

const ETIQUETA: Record<ProductoCarga['resultado'], { texto: string; variante: BadgeVariant }> = {
  por_crear: { texto: 'Se creará', variante: 'success' },
  creado: { texto: 'Creado', variante: 'success' },
  ya_existe: { texto: 'Ya existe', variante: 'neutral' },
  rechazado: { texto: 'Con error', variante: 'danger' },
};

const plural = (n: number, uno: string, varios: string): string => `${n} ${n === 1 ? uno : varios}`;

/** Miniatura de una imagen elegida; libera su URL temporal al quitarse. */
const Miniatura: React.FC<{ archivo: File; esPrincipal: boolean; onQuitar: () => void }> = ({ archivo, esPrincipal, onQuitar }) => {
  const url = useMemo(() => URL.createObjectURL(archivo), [archivo]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <li className="relative h-16 w-16 overflow-hidden rounded-card border border-neutral-light">
      {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:) */}
      <img src={url} alt={archivo.name} className="h-full w-full object-cover" />
      {esPrincipal && <span className="absolute bottom-0 left-0 right-0 bg-corporate/80 text-center text-[10px] text-neutral-white">Principal</span>}
      <button
        type="button"
        onClick={onQuitar}
        aria-label={`Quitar ${archivo.name}`}
        className="absolute right-0 top-0 rounded-bl bg-neutral-black/70 p-0.5 text-neutral-white"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </li>
  );
};

interface TarjetaProps {
  producto: ProductoCarga;
  /** Imágenes elegidas para este producto; solo se pueden cambiar mientras el producto está por crear. */
  imagenes: File[];
  editable: boolean;
  onAgregar: (archivos: File[]) => void;
  onQuitar: (indice: number) => void;
}

const TarjetaProducto: React.FC<TarjetaProps> = ({ producto, imagenes, editable, onAgregar, onQuitar }) => {
  const etiqueta = ETIQUETA[producto.resultado];
  const conError = producto.resultado === 'rechazado';
  const entrada = useRef<HTMLInputElement>(null);
  return (
    <li className={`rounded-card border p-3 ${conError ? 'border-danger bg-danger/5' : 'border-neutral-light bg-neutral-white'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-title text-sm font-semibold text-corporate">
            {producto.marca} · {producto.producto}
          </p>
          <p className="font-sans text-xs text-neutral-medium">
            {[producto.categoria, producto.subcategoria, producto.linea].filter((t): t is string => t !== null && t !== '').join(' › ')}
          </p>
        </div>
        <Badge variant={etiqueta.variante}>{etiqueta.texto}</Badge>
      </div>
      {producto.detalle !== null && (
        <p className={`mt-2 font-sans text-sm ${conError ? 'text-danger' : 'text-neutral-medium'}`}>{producto.detalle}</p>
      )}
      <ul className="mt-2 divide-y divide-neutral-light font-sans text-sm text-neutral-dark">
        {producto.variantes.map((v) => (
          <li key={v.fila} className="flex flex-wrap items-baseline justify-between gap-x-3 py-1">
            <span>
              {v.medida}
              {v.sku !== null ? ` · SKU ${v.sku}` : ' · SKU automático'}
              {v.precio !== null ? ` · ${formatCOP(v.precio)}` : ''}
            </span>
            <span className="text-xs text-neutral-medium">fila {v.fila}</span>
            {v.motivo !== null && v.detalle !== null && v.detalle !== producto.detalle && (
              <span className="w-full text-xs text-danger">{v.detalle}</span>
            )}
          </li>
        ))}
      </ul>
      {(editable || imagenes.length > 0) && (
        <div className="mt-3 space-y-1">
          <p className="font-sans text-xs text-neutral-medium">
            {imagenes.length === 0
              ? 'Imágenes del producto: pulse «Agregar imágenes» para elegir las fotos (la primera será la principal). Se suben al cargar el producto.'
              : `${imagenes.length} ${imagenes.length === 1 ? 'imagen' : 'imágenes'} del producto${editable ? ': se suben al cargar el producto.' : '.'}`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
          <ul className="flex flex-wrap gap-2" aria-label={`Imágenes de ${producto.producto}`}>
            {imagenes.map((archivo, i) => (
              <Miniatura key={`${archivo.name}-${archivo.size}-${i}`} archivo={archivo} esPrincipal={i === 0} onQuitar={() => onQuitar(i)} />
            ))}
          </ul>
          {editable && imagenes.length < MAXIMO_IMAGENES_PRODUCTO && (
            <>
              <button
                type="button"
                onClick={() => entrada.current?.click()}
                aria-label={`Agregar imágenes a ${producto.producto}`}
                title="Agregar imágenes"
                className="flex h-16 min-w-16 flex-col items-center justify-center gap-0.5 rounded-card border-2 border-dashed border-neutral-medium px-2 text-neutral-medium transition-colors hover:border-action hover:text-action"
              >
                <Plus className="h-5 w-5" aria-hidden="true" />
                <span className="text-center font-sans text-[11px] leading-tight">Agregar imágenes</span>
              </button>
              <input
                ref={entrada}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  onAgregar(Array.from(e.target.files ?? []));
                  e.target.value = '';
                }}
              />
            </>
          )}
          </div>
        </div>
      )}
    </li>
  );
};

/**
 * Carga masiva de productos (contrato m01-catalogo-carga-masiva): se descarga la plantilla de Excel armada con los
 * catálogos de hoy, se llena y se sube aquí. Al subirla se LISTAN los productos que se crearían, con los errores por
 * fila; solo entonces aparece el botón para cargarlos.
 */
export const CargaProductosModal: React.FC<CargaProductosModalProps> = ({ onClose, onCargados }) => {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [lectura, setLectura] = useState<LecturaLibro | null>(null);
  const [revision, setRevision] = useState<ResultadoCarga | null>(null);
  const [resultado, setResultado] = useState<ResultadoCarga | null>(null);
  const [trabajo, setTrabajo] = useState<'leyendo' | 'revisando' | 'cargando' | null>(null);
  const [progreso, setProgreso] = useState<{ hechos: number; total: number } | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [soloErrores, setSoloErrores] = useState(false);
  // Imágenes elegidas por producto (clave marca+producto). Se suben después de crearlos, cuando ya tienen id.
  const [imagenes, setImagenes] = useState<Record<string, File[]>>({});
  const [avisosImagenes, setAvisosImagenes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const ocupado = trabajo !== null;

  const descargarPlantilla = async () => {
    setError(null);
    setDescargando(true);
    try {
      guardarArchivoXlsx(await cargaProductosApi.descargarPlantilla(), NOMBRE_PLANTILLA_PRODUCTOS);
    } catch (err: unknown) {
      setError(leerErrorCatalogo(err, 'No se pudo descargar la plantilla.').message);
    } finally {
      setDescargando(false);
    }
  };

  const revisar = async (filas: FilaProductoCarga[]) => {
    setTrabajo('revisando');
    try {
      setRevision(await cargaProductosApi.previsualizar(filas, (hechos, total) => setProgreso({ hechos, total })));
    } catch (err: unknown) {
      setError(leerErrorCatalogo(err, 'No se pudo revisar el archivo.').message);
    } finally {
      setTrabajo(null);
      setProgreso(null);
    }
  };

  const subir = async (nuevo: File | null) => {
    setArchivo(nuevo);
    setLectura(null);
    setRevision(null);
    setResultado(null);
    setError(null);
    setSoloErrores(false);
    setImagenes({});
    setAvisosImagenes([]);
    if (nuevo === null) return;
    setTrabajo('leyendo');
    try {
      const leido = await leerLibroProductos(await nuevo.arrayBuffer());
      setLectura(leido);
      if (leido.filas.length > 0) await revisar(leido.filas);
    } catch (err: unknown) {
      setError(err instanceof LibroInvalidoError ? err.message : 'No se pudo leer el archivo. Suba el Excel (.xlsx) de la plantilla.');
    } finally {
      setTrabajo(null);
    }
  };

  const agregarImagenes = (clave: string, nuevas: File[]) => {
    const problemas: string[] = [];
    const validas = nuevas.filter((f) => {
      const invalido = validarImagen(f);
      if (invalido !== null) problemas.push(`${f.name}: ${invalido}`);
      return invalido === null;
    });
    setAvisosImagenes(problemas);
    setImagenes((previas) => ({ ...previas, [clave]: [...(previas[clave] ?? []), ...validas].slice(0, MAXIMO_IMAGENES_PRODUCTO) }));
  };

  const quitarImagen = (clave: string, indice: number) =>
    setImagenes((previas) => ({ ...previas, [clave]: (previas[clave] ?? []).filter((_, i) => i !== indice) }));

  /** Sube las imágenes elegidas a cada producto ya creado, de a una. La primera queda como principal. */
  const subirImagenes = async (productos: readonly ProductoCarga[]) => {
    const problemas: string[] = [];
    for (const p of productos) {
      if (p.resultado !== 'creado' || p.idProducto === null) continue;
      for (const archivo of imagenes[claveDeProducto(p)] ?? []) {
        try {
          await imagenesApi.subir(p.idProducto, await leerImagen(archivo));
        } catch (err: unknown) {
          problemas.push(`${p.producto} · ${archivo.name}: ${leerErrorCatalogo(err, 'no se pudo subir').message}`);
        }
      }
    }
    setAvisosImagenes(problemas);
  };

  const cargar = async () => {
    if (lectura === null) return;
    setError(null);
    setTrabajo('cargando');
    try {
      const aplicada = await cargaProductosApi.aplicar(lectura.filas, (hechos, total) => setProgreso({ hechos, total }));
      setResultado(aplicada);
      await subirImagenes(aplicada.productos);
    } catch (err: unknown) {
      setError(leerErrorCatalogo(err, 'No se pudo completar la carga. Revise cuáles productos se crearon antes de repetirla.').message);
    } finally {
      setTrabajo(null);
      setProgreso(null);
    }
  };

  const descargarInforme = async (productos: readonly ProductoCarga[]) => {
    guardarArchivoXlsx(await armarInformeProductos(productos), NOMBRE_INFORME_PRODUCTOS);
  };

  const cerrar = () => {
    if (resultado !== null && resultado.balance.productosNuevos > 0) onCargados?.(resultado.balance.productosNuevos);
    onClose();
  };

  const mostrado = resultado ?? revision;
  const visibles = mostrado === null ? [] : soloErrores ? mostrado.productos.filter(conAlgoQueRevisar) : mostrado.productos;
  const sinLeerBien = lectura !== null && lectura.errores.length > 0;
  const nuevos = revision?.balance.productosNuevos ?? 0;

  return (
    <Modal
      isOpen
      closeOnOutsideClick={false}
      onClose={cerrar}
      title="Cargar productos desde Excel"
      subtitle="Cree muchos productos de una vez a partir de la plantilla."
      size="xl"
    >
      <div className="space-y-4 py-2">
        <section aria-labelledby="paso-plantilla" className="space-y-2 rounded-card border border-neutral-light bg-neutral-lightest p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 id="paso-plantilla" className="font-title text-sm font-semibold text-corporate">
                1. Descargue la plantilla
              </h3>
              <p className="font-sans text-sm text-neutral-medium">
                Ya trae las marcas, líneas, categorías, medidas y demás catálogos que existen hoy, para que elija de la
                lista en vez de escribirlos.
              </p>
            </div>
            <Button
              variant="outline"
              leftIcon={<Download className="h-4 w-4" aria-hidden="true" />}
              isLoading={descargando}
              onClick={() => void descargarPlantilla()}
            >
              Descargar plantilla
            </Button>
          </div>
          <p className="font-sans text-xs text-neutral-medium">
            Una fila por variante: las filas con la misma marca y producto forman un solo producto. Los productos
            nuevos nacen sin publicar y solo se crean los que no existen.
          </p>
        </section>

        <section aria-labelledby="paso-archivo" className="space-y-3">
          <h3 id="paso-archivo" className="font-title text-sm font-semibold text-corporate">
            2. Suba la plantilla llena
          </h3>
          <FileInput
            label="Archivo de Excel (.xlsx)"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            value={archivo}
            onChange={(f) => void subir(f)}
            disabled={ocupado}
            helperText={`Hasta ${MAXIMO_FILAS_ARCHIVO_PRODUCTOS} filas y 5 MB.`}
          />
        </section>

        {trabajo !== null && (
          <p className="font-sans text-sm text-neutral-medium" role="status">
            {trabajo === 'leyendo' && 'Leyendo el archivo…'}
            {trabajo === 'revisando' && 'Revisando los productos…'}
            {trabajo === 'cargando' && 'Cargando los productos…'}
            {progreso !== null && progreso.total > 1 ? ` (bloque ${Math.min(progreso.hechos + 1, progreso.total)} de ${progreso.total})` : ''}
          </p>
        )}
        {error !== null && <Alert variant="error">{error}</Alert>}

        {lectura !== null && (
          <div className="space-y-3">
            <p className="flex items-center gap-2 font-sans text-sm text-neutral-dark" role="status">
              <FileSpreadsheet className="h-4 w-4 text-action" aria-hidden="true" />
              {plural(lectura.filas.length, 'fila leída', 'filas leídas')} de {plural(lectura.productos, 'producto', 'productos')}
              {lectura.errores.length > 0 ? ` · ${lectura.errores.length} con errores` : ''}.
            </p>
            {sinLeerBien && (
              <Alert variant="warning" title="Filas que no se pueden leer: corríjalas y suba el archivo de nuevo">
                <ul className="list-disc pl-5">
                  {lectura.errores.slice(0, FILAS_DE_ERROR_VISIBLES).map((e) => (
                    <li key={e.fila}>
                      Fila {e.fila}: {e.mensaje}
                    </li>
                  ))}
                  {lectura.errores.length > FILAS_DE_ERROR_VISIBLES && (
                    <li>…y {lectura.errores.length - FILAS_DE_ERROR_VISIBLES} más.</li>
                  )}
                </ul>
              </Alert>
            )}
          </div>
        )}

        {mostrado !== null && (
          <section aria-labelledby="paso-revision" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="paso-revision" className="font-title text-sm font-semibold text-corporate">
                {resultado !== null ? '4. Resultado de la carga' : '3. Revise los productos'}
              </h3>
              <Checkbox label="Solo los que tienen algo que revisar" checked={soloErrores} onChange={(e) => setSoloErrores(e.target.checked)} />
            </div>
            <p className="font-sans text-sm text-neutral-dark" role="status">
              {resultado !== null ? 'Se crearon' : 'Se crearán'} {plural(mostrado.balance.productosNuevos, 'producto', 'productos')} (
              {plural(mostrado.balance.variantesNuevas, 'variante', 'variantes')})
              {mostrado.balance.productosYaExisten > 0 ? ` · ${plural(mostrado.balance.productosYaExisten, 'ya existía', 'ya existían')}` : ''}
              {mostrado.balance.productosRechazados > 0 ? ` · ${mostrado.balance.productosRechazados} con error` : ''}.
            </p>
            {visibles.length === 0 ? (
              <p className="font-sans text-sm text-neutral-medium">No hay productos para mostrar con este filtro.</p>
            ) : (
              <ul className="max-h-96 space-y-2 overflow-y-auto pr-1" aria-label="Productos de la carga">
                {visibles.map((p) => (
                  <TarjetaProducto
                    key={claveDeProducto(p)}
                    producto={p}
                    imagenes={imagenes[claveDeProducto(p)] ?? []}
                    editable={resultado === null && p.resultado === 'por_crear' && !ocupado}
                    onAgregar={(archivos) => agregarImagenes(claveDeProducto(p), archivos)}
                    onQuitar={(i) => quitarImagen(claveDeProducto(p), i)}
                  />
                ))}
              </ul>
            )}
            {avisosImagenes.length > 0 && (
              <Alert variant="warning" title={resultado !== null ? 'Algunas imágenes no se subieron: agréguelas desde el producto' : 'Imágenes que no se pueden usar'}>
                <ul className="list-disc pl-5">
                  {avisosImagenes.slice(0, FILAS_DE_ERROR_VISIBLES).map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </Alert>
            )}
            {resultado !== null && resultado.balance.productosNuevos > 0 && (
              <Alert variant="info">
                Los productos nacen sin publicar y con existencia 0. Los que no tienen imagen necesitan una antes de publicarse: agréguela desde cada producto.
              </Alert>
            )}
          </section>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          {mostrado !== null && mostrado.productos.some(conAlgoQueRevisar) && (
            <Button variant="outline" onClick={() => void descargarInforme(mostrado.productos)}>
              Descargar informe de errores
            </Button>
          )}
          <Button variant="outline" onClick={cerrar} disabled={ocupado}>
            {resultado !== null ? 'Listo' : 'Cerrar'}
          </Button>
          {revision !== null && resultado === null && (
            <Button
              onClick={() => void cargar()}
              isLoading={trabajo === 'cargando'}
              disabled={ocupado || nuevos === 0 || sinLeerBien}
            >
              {nuevos === 0 ? 'No hay productos para cargar' : `Cargar ${plural(nuevos, 'producto', 'productos')}`}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
