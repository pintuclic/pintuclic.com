'use client';

import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Alert, Button, FileInput, Modal, Select, Textarea } from '@/core/components';
import type { Marca } from '../../dtos/m01-catalogo.dto';
import { importacionColoresApi, type ResultadoImportacionApi } from '../../services/catalogo-api';
import {
  aFilaContrato,
  dividirEnBloques,
  leerFilasColores,
  PLANTILLA_COLORES_CSV,
  type FilaLeida,
} from '../../services/importacion-colores';
import { leerErrorCatalogo } from '../../services/mensaje-error';

const MOTIVOS: Record<string, string> = {
  nombre_duplicado_en_bloque: 'El nombre y acabado ya aparecen antes en el archivo.',
  codigo_duplicado: 'El código ya lo usa otro color de la marca.',
  base_no_encontrada: 'La base no existe o está inactiva.',
  acabado_no_encontrado: 'El acabado no existe o está inactivo.',
  familia_no_encontrada: 'La familia no existe o está inactiva.',
};

interface Balance {
  total: number;
  creadas: number;
  actualizadas: number;
  sinCambios: number;
  rechazadas: number;
  sinBase: number;
}

interface Resumen {
  aplicada: boolean;
  balance: Balance;
  rechazos: Array<{ linea: number; nombre: string; motivo: string }>;
  /** Bloques aplicados cuando un bloque posterior falló. */
  bloquesAplicados: number;
  bloquesTotales: number;
  fallo: string | null;
}

const sumar = (a: Balance, b: Balance): Balance => ({
  total: a.total + b.total,
  creadas: a.creadas + b.creadas,
  actualizadas: a.actualizadas + b.actualizadas,
  sinCambios: a.sinCambios + b.sinCambios,
  rechazadas: a.rechazadas + b.rechazadas,
  sinBase: a.sinBase + b.sinBase,
});
const CERO: Balance = { total: 0, creadas: 0, actualizadas: 0, sinCambios: 0, rechazadas: 0, sinBase: 0 };

export interface ImportarColoresModalProps {
  marcas: Marca[];
  idMarcaInicial: string;
  onClose: () => void;
  onAplicada: (texto: string) => void;
}

/**
 * C8: importación por bloques de hasta 500 filas. Primero una vista previa que no escribe nada;
 * después se aplica cada bloque en su propia transacción. Es idempotente: repetir el archivo no duplica.
 */
export const ImportarColoresModal: React.FC<ImportarColoresModalProps> = ({
  marcas,
  idMarcaInicial,
  onClose,
  onAplicada,
}) => {
  const [idMarca, setIdMarca] = useState(idMarcaInicial);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [texto, setTexto] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);

  const lectura = useMemo(() => leerFilasColores(texto), [texto]);

  const cargarArchivo = async (nuevo: File | null) => {
    setArchivo(nuevo);
    setResumen(null);
    setTexto(nuevo === null ? '' : await nuevo.text());
  };

  const ejecutar = async (aplicar: boolean) => {
    setError(null);
    setTrabajando(true);
    let acumulado = CERO;
    const rechazos: Resumen['rechazos'] = [];
    const bloques = dividirEnBloques(lectura.filas);
    let hechos = 0;
    try {
      for (const [numero, bloque] of bloques.entries()) {
        const cuerpo = { idMarca: Number(idMarca), filas: bloque.map((f: FilaLeida) => aFilaContrato(f.borrador)) };
        const r: ResultadoImportacionApi = aplicar
          ? await importacionColoresApi.aplicar(cuerpo)
          : await importacionColoresApi.previsualizar(cuerpo);
        acumulado = sumar(acumulado, r.balance);
        for (const fila of r.filas) {
          if (fila.resultado !== 'rechazada') continue;
          const origen = bloque[fila.indice];
          rechazos.push({
            linea: origen?.linea ?? 0,
            nombre: origen?.borrador.nombre ?? '',
            motivo: MOTIVOS[fila.motivoRechazo ?? ''] ?? 'Fila rechazada.',
          });
        }
        hechos = numero + 1;
      }
      setResumen({
        aplicada: aplicar,
        balance: acumulado,
        rechazos,
        bloquesAplicados: hechos,
        bloquesTotales: bloques.length,
        fallo: null,
      });
      if (aplicar) {
        onAplicada(
          `Importación aplicada: ${acumulado.creadas} creados, ${acumulado.actualizadas} actualizados, ${acumulado.sinCambios} sin cambios, ${acumulado.rechazadas} rechazados.`,
        );
      }
    } catch (err: unknown) {
      const mensaje = leerErrorCatalogo(err, 'No se pudo completar la importación.').message;
      setResumen({
        aplicada: aplicar,
        balance: acumulado,
        rechazos,
        bloquesAplicados: hechos,
        bloquesTotales: bloques.length,
        fallo: mensaje,
      });
      setError(mensaje);
    } finally {
      setTrabajando(false);
    }
  };

  const descargarPlantilla = () => {
    const url = URL.createObjectURL(new Blob([`﻿${PLANTILLA_COLORES_CSV}`], { type: 'text/csv;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'plantilla-colores.csv';
    enlace.click();
    URL.revokeObjectURL(url);
  };

  const listo = idMarca !== '' && lectura.filas.length > 0;
  const bloques = Math.ceil(lectura.filas.length / 500);

  return (
    <Modal
      isOpen
      closeOnOutsideClick={false}
      onClose={onClose}
      title="Importar colores"
      subtitle="Cree o actualice colores de una marca a partir de un archivo."
      size="xl"
    >
      <div className="space-y-4 py-2">
        <Select
          label="Marca"
          value={idMarca}
          onChange={(e) => {
            setIdMarca(e.target.value);
            setResumen(null);
          }}
          options={[
            { value: '', label: 'Elija…' },
            ...marcas.map((m) => ({ value: String(m.idMarca), label: m.nombre })),
          ]}
        />
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <FileInput
              label="Archivo CSV"
              accept=".csv,.txt,text/csv,text/plain"
              value={archivo}
              onChange={(f) => void cargarArchivo(f)}
              helperText="Columnas: nombre, código, hexadecimal, base, acabado, familia. La base, el acabado y la familia van por nombre."
            />
          </div>
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" aria-hidden="true" />}
            onClick={descargarPlantilla}
          >
            Plantilla
          </Button>
        </div>
        <Textarea
          label="…o pegue las filas aquí"
          rows={5}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setResumen(null);
          }}
          helperText="Puede pegar directamente desde Excel."
        />

        {texto.trim() !== '' && (
          <p className="font-sans text-sm text-neutral-dark" role="status">
            {lectura.filas.length} filas leídas
            {bloques > 1 ? ` (${bloques} bloques de hasta 500)` : ''}
            {lectura.errores.length > 0 ? ` · ${lectura.errores.length} con errores` : ''}.
          </p>
        )}
        {lectura.errores.length > 0 && (
          <Alert variant="warning" title="Líneas que no se enviarán">
            <ul className="list-disc pl-5">
              {lectura.errores.slice(0, 8).map((e) => (
                <li key={e.linea}>
                  Línea {e.linea}: {e.mensaje}
                </li>
              ))}
              {lectura.errores.length > 8 && <li>…y {lectura.errores.length - 8} más.</li>}
            </ul>
          </Alert>
        )}

        {error !== null && <Alert variant="error">{error}</Alert>}

        {resumen !== null && (
          <div className="space-y-3 rounded-card border border-neutral-light bg-neutral-lightest p-4">
            <h3 className="font-title text-sm font-semibold text-corporate">
              {resumen.aplicada ? 'Resultado de la importación' : 'Vista previa (no se guardó nada)'}
            </h3>
            <dl className="grid grid-cols-2 gap-3 font-sans text-sm sm:grid-cols-5">
              {[
                ['Se crearán', resumen.balance.creadas],
                ['Se actualizarán', resumen.balance.actualizadas],
                ['Sin cambios', resumen.balance.sinCambios],
                ['Rechazadas', resumen.balance.rechazadas],
                ['Sin base', resumen.balance.sinBase],
              ].map(([etiqueta, valor]) => (
                <div key={String(etiqueta)}>
                  <dt className="text-xs text-neutral-medium">{etiqueta}</dt>
                  <dd className="font-title text-lg font-semibold text-neutral-black">{valor}</dd>
                </div>
              ))}
            </dl>
            {resumen.balance.sinBase > 0 && (
              <p className="font-sans text-xs text-neutral-medium">
                Los colores sin base solo se ofrecen como colores de fábrica de un producto; puede completarlos después.
              </p>
            )}
            {resumen.rechazos.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 font-sans text-sm text-danger-hover">
                {resumen.rechazos.slice(0, 12).map((r) => (
                  <li key={`${r.linea}-${r.nombre}`}>
                    Línea {r.linea} ({r.nombre}): {r.motivo}
                  </li>
                ))}
                {resumen.rechazos.length > 12 && <li>…y {resumen.rechazos.length - 12} más.</li>}
              </ul>
            )}
            {resumen.fallo !== null && resumen.aplicada && (
              <Alert variant="warning">
                Se aplicaron {resumen.bloquesAplicados} de {resumen.bloquesTotales} bloques antes del error. Corrija el
                motivo y vuelva a importar el archivo: repetir no duplica los colores ya creados.
              </Alert>
            )}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            {resumen?.aplicada === true && resumen.fallo === null ? 'Cerrar' : 'Cancelar'}
          </Button>
          <Button
            variant="outline"
            disabled={!listo || trabajando}
            isLoading={trabajando}
            onClick={() => void ejecutar(false)}
          >
            Vista previa
          </Button>
          <Button
            variant="primary-action"
            disabled={!listo || trabajando || resumen === null || resumen.aplicada || resumen.fallo !== null}
            onClick={() => void ejecutar(true)}
          >
            Aplicar importación
          </Button>
        </div>
      </div>
    </Modal>
  );
};
