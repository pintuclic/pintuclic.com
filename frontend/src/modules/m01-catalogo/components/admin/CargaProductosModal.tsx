'use client';

import React, { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Alert, Button, FileInput, Modal } from '@/core/components';
import { MAXIMO_FILAS_ARCHIVO_PRODUCTOS } from '../../dtos/m01-catalogo-carga-masiva.dto';
import { cargaProductosApi, guardarArchivoXlsx, NOMBRE_PLANTILLA_PRODUCTOS } from '../../services/carga-productos-api';
import { leerLibroProductos, LibroInvalidoError, type LecturaLibro } from '../../services/carga-productos';
import { leerErrorCatalogo } from '../../services/mensaje-error';

export interface CargaProductosModalProps {
  onClose: () => void;
}

const FILAS_DE_ERROR_VISIBLES = 8;

/**
 * Carga masiva de productos (contrato m01-catalogo-carga-masiva): se descarga la plantilla de Excel armada con los
 * catálogos de hoy, se llena y se sube aquí. El archivo se lee en el navegador; nada se guarda todavía.
 */
export const CargaProductosModal: React.FC<CargaProductosModalProps> = ({ onClose }) => {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [lectura, setLectura] = useState<LecturaLibro | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const subir = async (nuevo: File | null) => {
    setArchivo(nuevo);
    setLectura(null);
    setError(null);
    if (nuevo === null) return;
    setLeyendo(true);
    try {
      setLectura(await leerLibroProductos(await nuevo.arrayBuffer()));
    } catch (err: unknown) {
      setError(err instanceof LibroInvalidoError ? err.message : 'No se pudo leer el archivo. Suba el Excel (.xlsx) de la plantilla.');
    } finally {
      setLeyendo(false);
    }
  };

  return (
    <Modal
      isOpen
      closeOnOutsideClick={false}
      onClose={onClose}
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
            helperText={`Hasta ${MAXIMO_FILAS_ARCHIVO_PRODUCTOS} filas y 5 MB.`}
          />
        </section>

        {leyendo && (
          <p className="font-sans text-sm text-neutral-medium" role="status">
            Leyendo el archivo…
          </p>
        )}
        {error !== null && <Alert variant="error">{error}</Alert>}

        {lectura !== null && (
          <div className="space-y-3">
            <p className="flex items-center gap-2 font-sans text-sm text-neutral-dark" role="status">
              <FileSpreadsheet className="h-4 w-4 text-action" aria-hidden="true" />
              {lectura.filas.length} {lectura.filas.length === 1 ? 'fila leída' : 'filas leídas'} de {lectura.productos}{' '}
              {lectura.productos === 1 ? 'producto' : 'productos'}
              {lectura.errores.length > 0 ? ` · ${lectura.errores.length} con errores` : ''}.
            </p>
            {lectura.errores.length > 0 && (
              <Alert variant="warning" title="Filas que no se pueden leer">
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

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
