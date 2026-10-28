'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Alert, Button, Checkbox, FileInput, Select, Textarea } from '@/core/components';
import { useCargar } from '../hooks/useCargar';
import { dividirEnBloques, decodificarCsv, leerCarga, type FilaArchivo } from '../services/carga-archivo';
import { guardarArchivo } from '../services/descarga';
import { ETIQUETAS_RECHAZO, formatearNumero } from '../services/etiquetas';
import { nuevoIdCarga } from '../services/enlaces';
import { inventarioApi, marcasFiltroApi, type ResultadoCargaApi } from '../services/inventario-api';
import { leerErrorInventario, mensajeDeError } from '../services/mensaje-error';
import type { MotivoRechazo } from '../dtos/m13-inventario.dto';

interface FilaResultado {
  linea: number;
  resultado: 'modificada' | 'sin_cambios' | 'rechazada';
  idVariante: number | null;
  variante: string | null;
  anterior: number | null;
  nueva: number | null;
  rechazo: string | null;
}

interface Balance {
  modificadas: number;
  sinCambios: number;
  rechazadas: number;
}

interface Informe {
  aplicada: boolean;
  balance: Balance;
  filas: FilaResultado[];
  /** Grupos de filas (de hasta 500) que ya se habían aplicado cuando algo falló. */
  gruposHechos: number;
  gruposTotales: number;
  fallo: string | null;
}

const MAXIMO_VISIBLES = 100;
const CERO: Balance = { modificadas: 0, sinCambios: 0, rechazadas: 0 };

const textoRechazo = (motivo: string | null): string =>
  motivo !== null && motivo in ETIQUETAS_RECHAZO ? ETIQUETAS_RECHAZO[motivo as MotivoRechazo] : 'Fila rechazada.';

/** Variantes que quedaron en más de una línea del archivo: la API solo las detecta dentro de un grupo. */
function repetidasEntreGrupos(filas: readonly FilaResultado[]): Array<{ variante: string; lineas: number[] }> {
  const porVariante = new Map<number, FilaResultado[]>();
  for (const f of filas) {
    if (f.resultado === 'rechazada' || f.idVariante === null) continue;
    porVariante.set(f.idVariante, [...(porVariante.get(f.idVariante) ?? []), f]);
  }
  return [...porVariante.values()]
    .filter((grupo) => grupo.length > 1)
    .map((grupo) => ({ variante: grupo[0]?.variante ?? '', lineas: grupo.map((g) => g.linea) }));
}

export interface CargaMasivaViewProps {
  /** Se avisa al terminar una aplicación completa, con el texto de confirmación y el id de la carga. */
  onAplicada: (texto: string, idCarga: string) => void;
}

/**
 * Carga masiva (R5–R10): se descarga la plantilla con todas las variantes, se cambian los números,
 * se sube el archivo, se revisa la vista previa (no escribe) y se aplica por grupos de hasta 500 filas.
 * Repetir el mismo archivo no duplica nada: las filas ya aplicadas quedan "sin cambios".
 */
export const CargaMasivaView: React.FC<CargaMasivaViewProps> = ({ onAplicada }) => {
  const [idMarca, setIdMarca] = useState('');
  const [inactivas, setInactivas] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [texto, setTexto] = useState('');
  const [idCarga, setIdCarga] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [informe, setInforme] = useState<Informe | null>(null);

  const marcas = useCargar(
    useCallback(() => marcasFiltroApi.listar(), []),
    'No se pudieron cargar las marcas.',
  );
  const lectura = useMemo(() => leerCarga(texto), [texto]);
  const grupos = Math.ceil(lectura.filas.length / 500);
  const repetidas = useMemo(() => (informe === null ? [] : repetidasEntreGrupos(informe.filas)), [informe]);

  const cambiarTexto = (nuevo: string) => {
    setTexto(nuevo);
    setInforme(null);
    setError(null);
    setIdCarga(null);
  };

  const elegirArchivo = async (nuevo: File | null) => {
    setArchivo(nuevo);
    cambiarTexto(nuevo === null ? '' : decodificarCsv(await nuevo.arrayBuffer()));
  };

  const descargarPlantilla = async () => {
    setDescargando(true);
    setError(null);
    try {
      const bytes = await inventarioApi.descargarPlantilla({
        idMarca: idMarca === '' ? undefined : Number(idMarca),
        incluirInactivas: inactivas ? true : undefined,
      });
      guardarArchivo(bytes, 'plantilla-inventario.csv', 'text/csv;charset=utf-8');
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No se pudo descargar la plantilla.'));
    } finally {
      setDescargando(false);
    }
  };

  const ejecutar = async (aplicar: boolean) => {
    setError(null);
    setTrabajando(true);
    const id = idCarga ?? nuevoIdCarga();
    setIdCarga(id);
    const bloques = dividirEnBloques<FilaArchivo>(lectura.filas);
    let balance = CERO;
    const filas: FilaResultado[] = [];
    let hechos = 0;
    const armar = (fallo: string | null): Informe => ({
      aplicada: aplicar,
      balance,
      filas,
      gruposHechos: hechos,
      gruposTotales: bloques.length,
      fallo,
    });
    try {
      for (const bloque of bloques) {
        const cuerpo = bloque.map((f) => f.fila);
        const r: ResultadoCargaApi = aplicar
          ? await inventarioApi.aplicar(id, cuerpo)
          : await inventarioApi.previsualizar(cuerpo);
        balance = {
          modificadas: balance.modificadas + r.balance.modificadas,
          sinCambios: balance.sinCambios + r.balance.sinCambios,
          rechazadas: balance.rechazadas + r.balance.rechazadas,
        };
        for (const f of r.filas) {
          filas.push({
            linea: bloque[f.indice]?.linea ?? 0,
            resultado: f.resultado,
            idVariante: f.idVariante,
            variante: f.variante,
            anterior: f.existenciaAnterior,
            nueva: f.existenciaNueva,
            rechazo: f.motivoRechazo,
          });
        }
        hechos += 1;
      }
      setInforme(armar(null));
      if (aplicar) {
        onAplicada(
          `Carga aplicada: ${balance.modificadas} variantes modificadas, ${balance.sinCambios} sin cambios, ${balance.rechazadas} rechazadas.`,
          id,
        );
      }
    } catch (err: unknown) {
      const mensaje = leerErrorInventario(err, 'No se pudo completar la carga.').message;
      setInforme(armar(mensaje));
      setError(mensaje);
    } finally {
      setTrabajando(false);
    }
  };

  const hayFilas = lectura.filas.length > 0;
  const previaLista = informe !== null && !informe.aplicada && informe.fallo === null;
  const modificadas = informe?.filas.filter((f) => f.resultado === 'modificada') ?? [];
  const rechazadas = informe?.filas.filter((f) => f.resultado === 'rechazada') ?? [];

  return (
    <section aria-labelledby="titulo-carga" className="space-y-5">
      <div>
        <h2 id="titulo-carga" className="font-title text-lg font-semibold text-corporate">
          Carga masiva
        </h2>
        <p className="font-sans text-sm text-neutral-medium">
          Actualice muchas existencias a la vez con la plantilla de Pintu Clic. No necesita códigos internos: cada fila
          se identifica por el SKU o por la marca, el producto y la medida.
        </p>
      </div>

      <section
        aria-labelledby="paso-plantilla"
        className="space-y-3 rounded-card border border-neutral-light bg-neutral-lightest p-4"
      >
        <h3 id="paso-plantilla" className="font-title text-sm font-semibold text-corporate">
          1. Descargue la plantilla
        </h3>
        <p className="font-sans text-sm text-neutral-dark">
          Ya trae todas las variantes con su existencia actual. Cambie solo los números de la columna{' '}
          <strong>existencia</strong>; si deja una celda vacía, esa variante no se modifica.
        </p>
        <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,260px)_auto_auto]">
          <Select
            label="Marca"
            value={idMarca}
            onChange={(e) => setIdMarca(e.target.value)}
            options={[
              { value: '', label: 'Todas las marcas' },
              ...(marcas.datos ?? []).map((m) => ({ value: String(m.idMarca), label: m.nombre })),
            ]}
          />
          <div className="pb-2">
            <Checkbox
              label="Incluir variantes inactivas"
              checked={inactivas}
              onChange={(e) => setInactivas(e.target.checked)}
            />
          </div>
          <Button
            variant="outline"
            isLoading={descargando}
            leftIcon={<Download className="h-4 w-4" aria-hidden="true" />}
            onClick={() => void descargarPlantilla()}
          >
            Descargar plantilla
          </Button>
        </div>
      </section>

      <section aria-labelledby="paso-archivo" className="space-y-3">
        <h3 id="paso-archivo" className="font-title text-sm font-semibold text-corporate">
          2. Suba el archivo
        </h3>
        <FileInput
          label="Archivo CSV"
          accept=".csv,.txt,text/csv,text/plain"
          value={archivo}
          onChange={(f) => void elegirArchivo(f)}
        />
        <Textarea
          label="…o pegue las filas aquí"
          rows={4}
          value={texto}
          onChange={(e) => cambiarTexto(e.target.value)}
          helperText="Puede pegar desde Excel, incluida la fila de encabezados."
        />
        {lectura.formatoInvalido !== null && <Alert variant="error">{lectura.formatoInvalido}</Alert>}
        {texto.trim() !== '' && lectura.formatoInvalido === null && (
          <p role="status" className="font-sans text-sm text-neutral-dark">
            {formatearNumero(lectura.filas.length)} filas listas para revisar
            {grupos > 1 ? ` (en ${grupos} grupos de hasta 500)` : ''}
            {lectura.omitidas > 0 ? ` · ${formatearNumero(lectura.omitidas)} sin existencia (no se modifican)` : ''}
            {lectura.errores.length > 0 ? ` · ${formatearNumero(lectura.errores.length)} con problemas` : ''}.
          </p>
        )}
        {lectura.errores.length > 0 && (
          <Alert variant="warning" title="Líneas que no se enviarán">
            <ul className="max-h-48 list-disc space-y-1 overflow-y-auto pl-5">
              {lectura.errores.slice(0, 20).map((e) => (
                <li key={e.linea}>
                  Línea {e.linea}: {e.mensaje}
                </li>
              ))}
              {lectura.errores.length > 20 && <li>…y {lectura.errores.length - 20} más.</li>}
            </ul>
          </Alert>
        )}
      </section>

      {error !== null && <Alert variant="error">{error}</Alert>}

      <section aria-labelledby="paso-revision" className="space-y-3">
        <h3 id="paso-revision" className="font-title text-sm font-semibold text-corporate">
          3. Revise y aplique
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={!hayFilas || trabajando}
            isLoading={trabajando}
            onClick={() => void ejecutar(false)}
          >
            Ver vista previa
          </Button>
          <Button
            variant="primary-action"
            disabled={!previaLista || trabajando || repetidas.length > 0 || (informe?.balance.modificadas ?? 0) === 0}
            onClick={() => void ejecutar(true)}
          >
            Aplicar cambios
          </Button>
        </div>
        {!hayFilas && texto.trim() === '' && (
          <p className="font-sans text-xs text-neutral-medium">
            Suba o pegue el archivo para ver qué cambiaría. La vista previa no guarda nada.
          </p>
        )}

        {repetidas.length > 0 && (
          <Alert variant="error" title="Hay variantes repetidas en el archivo">
            <ul className="list-disc space-y-1 pl-5">
              {repetidas.slice(0, 8).map((r) => (
                <li key={r.lineas.join('-')}>
                  {r.variante}: líneas {r.lineas.join(', ')}.
                </li>
              ))}
              {repetidas.length > 8 && <li>…y {repetidas.length - 8} más.</li>}
            </ul>
            Deje una sola fila por variante y vuelva a ver la vista previa.
          </Alert>
        )}

        {informe !== null && (
          <div className="space-y-3 rounded-card border border-neutral-light bg-neutral-white p-4">
            <h4 className="font-title text-sm font-semibold text-corporate">
              {informe.aplicada ? 'Resultado de la carga' : 'Vista previa (no se guardó nada)'}
            </h4>
            <dl className="grid grid-cols-3 gap-3 font-sans text-sm">
              {[
                [informe.aplicada ? 'Modificadas' : 'Se modificarán', informe.balance.modificadas],
                ['Sin cambios', informe.balance.sinCambios],
                ['Rechazadas', informe.balance.rechazadas],
              ].map(([etiqueta, valor]) => (
                <div key={String(etiqueta)}>
                  <dt className="text-xs text-neutral-medium">{etiqueta}</dt>
                  <dd className="font-title text-lg font-semibold text-neutral-black">
                    {formatearNumero(Number(valor))}
                  </dd>
                </div>
              ))}
            </dl>

            {modificadas.length > 0 && (
              <div className="overflow-x-auto rounded-card border border-neutral-light">
                <table className="w-full min-w-[480px] text-left font-sans text-sm">
                  <caption className="sr-only">Variantes que cambian</caption>
                  <thead className="bg-neutral-lightest text-xs uppercase tracking-wide text-neutral-medium">
                    <tr>
                      <th scope="col" className="px-3 py-2">
                        Línea
                      </th>
                      <th scope="col" className="px-3 py-2">
                        Variante
                      </th>
                      <th scope="col" className="px-3 py-2 text-right">
                        Antes → después
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-light">
                    {modificadas.slice(0, MAXIMO_VISIBLES).map((f) => (
                      <tr key={f.linea}>
                        <td className="px-3 py-2 text-neutral-medium">{f.linea}</td>
                        <td className="px-3 py-2 text-neutral-black">{f.variante}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          {formatearNumero(f.anterior ?? 0)} <span aria-hidden="true">→</span>
                          <span className="sr-only"> a </span>{' '}
                          <strong className="font-title">{formatearNumero(f.nueva ?? 0)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {modificadas.length > MAXIMO_VISIBLES && (
                  <p className="px-3 py-2 font-sans text-xs text-neutral-medium">
                    …y {formatearNumero(modificadas.length - MAXIMO_VISIBLES)} más.
                  </p>
                )}
              </div>
            )}

            {rechazadas.length > 0 && (
              <Alert variant="warning" title="Filas rechazadas">
                <ul className="max-h-48 list-disc space-y-1 overflow-y-auto pl-5">
                  {rechazadas.slice(0, 20).map((f) => (
                    <li key={f.linea}>
                      Línea {f.linea}
                      {f.variante !== null ? ` (${f.variante})` : ''}: {textoRechazo(f.rechazo)}
                    </li>
                  ))}
                  {rechazadas.length > 20 && <li>…y {rechazadas.length - 20} más.</li>}
                </ul>
                Las filas rechazadas no se aplican; las demás sí.
              </Alert>
            )}

            {informe.fallo !== null && informe.aplicada && (
              <Alert variant="warning">
                Se aplicaron {informe.gruposHechos} de {informe.gruposTotales} grupos de filas antes del error. Corrija
                el motivo y vuelva a cargar el archivo: repetirlo no duplica los cambios ya hechos.
              </Alert>
            )}
          </div>
        )}
      </section>
    </section>
  );
};
