'use client';

import React, { useCallback, useState } from 'react';
import { Download } from 'lucide-react';
import { Alert, Badge, Button, Input, Select } from '@/core/components';
import { getButtonClassName } from '@/core/components/buttons/button-styles';
import { DIAS_INFORME_MAXIMO, type FilaMedicion } from '../dtos/m14-patrocinios.dto';
import { useCargar } from '../hooks/useCargar';
import { formatearFecha, formatearNumero, hoyBogota, sumarDias } from '../services/etiquetas';
import { medicionApi } from '../services/patrocinios-api';
import { Cargando, MensajeVacio } from './comunes';

const ETIQUETA_ENTIDAD = { campania: 'Campaña', anuncio: 'Anuncio' } as const;

/** 12,5 % con coma decimal; «—» si no hubo impresiones (no se puede calcular). */
export const formatearCtr = (ctr: number | null): string =>
  ctr === null ? '—' : `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(ctr)} %`;

/** El día de la serie por el que va la barra: proporcional al máximo del rango. */
export const porcentajeDeBarra = (valor: number, maximo: number): number =>
  maximo <= 0 ? 0 : Math.max(valor > 0 ? 3 : 0, Math.round((valor / maximo) * 100));

/** Serie diaria de una campaña o un anuncio: barras de impresiones y el dato en texto (no depende del color). */
const SerieDiaria: React.FC<{ fila: FilaMedicion; desde: string; hasta: string }> = ({ fila, desde, hasta }) => {
  const serie = useCargar(
    useCallback(() => medicionApi.serie({ entidad: fila.entidad, id: fila.id, desde, hasta }), [fila.entidad, fila.id, desde, hasta]),
    'No se pudo cargar la serie diaria.',
  );
  if (serie.error !== null) return <Alert variant="error">{serie.error}</Alert>;
  if (serie.datos === null) return <Cargando />;
  const maximo = Math.max(...serie.datos.puntos.map((p) => p.impresiones), 0);
  return (
    <div className="max-h-72 overflow-y-auto rounded-card border border-neutral-light bg-neutral-white">
      <table className="w-full text-left font-sans text-xs">
        <caption className="sr-only">Impresiones y clics por día de {fila.nombre}</caption>
        <thead className="sticky top-0 bg-neutral-lightest text-neutral-medium">
          <tr>
            <th scope="col" className="px-3 py-2">Día</th>
            <th scope="col" className="px-3 py-2">Impresiones</th>
            <th scope="col" className="px-3 py-2 text-right">Clics</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-light">
          {serie.datos.puntos.map((p) => (
            <tr key={p.fecha}>
              <th scope="row" className="whitespace-nowrap px-3 py-1.5 font-normal text-neutral-dark">{formatearFecha(p.fecha)}</th>
              <td className="px-3 py-1.5">
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className="h-2 rounded-full bg-action" style={{ width: `${porcentajeDeBarra(p.impresiones, maximo) * 0.6}%` }} />
                  <span className="text-neutral-black">{formatearNumero(p.impresiones)}</span>
                </span>
              </td>
              <td className="px-3 py-1.5 text-right text-neutral-black">{formatearNumero(p.clics)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Medición de campañas y anuncios (contrato M14 · M1–M9): impresiones, clics y CTR por rango de fechas, serie diaria y
 * CSV. Son totales por día, sin saber quién ni desde dónde; las cifras son indicativas, para conversar con la marca.
 */
export const MedicionView: React.FC = () => {
  const [hoy] = useState(() => hoyBogota());
  const [desde, setDesde] = useState(() => sumarDias(hoyBogota(), -29));
  const [hasta, setHasta] = useState(hoy);
  const [entidad, setEntidad] = useState<'' | 'campania' | 'anuncio'>('');
  const [abierta, setAbierta] = useState<string | null>(null);

  const rangoValido = desde !== '' && hasta !== '' && desde <= hasta;
  const filtro = { desde, hasta, ...(entidad === '' ? {} : { entidad }) };
  const informe = useCargar(
    useCallback(
      () => (rangoValido ? medicionApi.resumen({ desde, hasta, ...(entidad === '' ? {} : { entidad }) }) : Promise.resolve(null)),
      [rangoValido, desde, hasta, entidad],
    ),
    'No se pudo cargar la medición.',
  );

  return (
    <section aria-labelledby="titulo-medicion" className="space-y-4">
      <div>
        <h2 id="titulo-medicion" className="font-title text-lg font-semibold text-corporate">
          Medición
        </h2>
        <p className="font-sans text-sm text-neutral-medium">
          Cuántas veces se mostró y cuántos clics tuvo cada campaña y cada anuncio, por día. No se guarda quién ni desde
          dónde: son totales. Las cifras son <strong>indicativas</strong>, útiles para conversar con la marca; no son una
          auditoría (alguien podría inflarlas y algunos bloqueadores de anuncios impiden contar las impresiones).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Input label="Desde" type="date" value={desde} max={hasta || hoy} onChange={(e) => setDesde(e.target.value)} />
        <Input label="Hasta" type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} />
        <Select
          label="Qué mostrar"
          value={entidad}
          onChange={(e) => setEntidad(e.target.value as typeof entidad)}
          options={[
            { value: '', label: 'Campañas y anuncios' },
            { value: 'campania', label: 'Solo campañas de productos' },
            { value: 'anuncio', label: 'Solo anuncios' },
          ]}
        />
        <div className="flex items-end">
          {rangoValido ? (
            <a href={medicionApi.urlExportar(filtro)} download className={getButtonClassName({ variant: 'outline', size: 'md', fullWidth: true })}>
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>Descargar CSV</span>
            </a>
          ) : (
            <Button variant="outline" fullWidth disabled leftIcon={<Download className="h-4 w-4" aria-hidden="true" />}>
              Descargar CSV
            </Button>
          )}
        </div>
      </div>
      <p className="font-sans text-xs text-neutral-medium">
        Hasta {DIAS_INFORME_MAXIMO} días por consulta. El CSV se abre en Excel y trae una fila por día y lugar.
      </p>

      {!rangoValido && <Alert variant="warning">Elija un rango válido: la fecha «Desde» no puede ser posterior a «Hasta».</Alert>}
      {informe.error !== null && <Alert variant="error">{informe.error}</Alert>}
      {rangoValido && informe.cargando && informe.datos === null && <Cargando />}
      {informe.datos !== null && informe.datos.filas.length === 0 && (
        <MensajeVacio>Todavía no hay campañas ni anuncios para medir.</MensajeVacio>
      )}
      {informe.datos !== null && informe.datos.filas.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-neutral-light bg-neutral-white">
          <table className="w-full min-w-[640px] text-left font-sans text-sm">
            <caption className="sr-only">
              Impresiones, clics y CTR del {formatearFecha(informe.datos.desde)} al {formatearFecha(informe.datos.hasta)}
            </caption>
            <thead className="bg-neutral-lightest text-xs uppercase tracking-wide text-neutral-medium">
              <tr>
                <th scope="col" className="px-4 py-3">Nombre</th>
                <th scope="col" className="px-4 py-3 text-right">Impresiones</th>
                <th scope="col" className="px-4 py-3 text-right">Clics</th>
                <th scope="col" className="px-4 py-3 text-right" title="Clics ÷ impresiones">CTR</th>
                <th scope="col" className="px-4 py-3 text-right">Por día</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-light">
              {informe.datos.filas.map((f) => {
                const clave = `${f.entidad}:${f.id}`;
                const abiertaAhora = abierta === clave;
                return (
                  <React.Fragment key={clave}>
                    <tr>
                      <td className="px-4 py-3 text-neutral-black">
                        <Badge variant={f.entidad === 'anuncio' ? 'action' : 'neutral'} className="mr-2">
                          {ETIQUETA_ENTIDAD[f.entidad]}
                        </Badge>
                        {f.nombre}
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-black">{formatearNumero(f.impresiones)}</td>
                      <td className="px-4 py-3 text-right text-neutral-black">{formatearNumero(f.clics)}</td>
                      <td className="px-4 py-3 text-right text-neutral-black">{formatearCtr(f.ctr)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          aria-expanded={abiertaAhora}
                          onClick={() => setAbierta(abiertaAhora ? null : clave)}
                        >
                          {abiertaAhora ? 'Ocultar' : 'Ver por día'}
                        </Button>
                      </td>
                    </tr>
                    {abiertaAhora && (
                      <tr>
                        <td colSpan={5} className="bg-neutral-lightest px-4 py-3">
                          <SerieDiaria fila={f} desde={informe.datos?.desde ?? desde} hasta={informe.datos?.hasta ?? hasta} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
