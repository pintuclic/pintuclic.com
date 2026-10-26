'use client';

import React, { useCallback, useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';
import { Alert, Badge, Button, IconButton, Input, Select, TextButton } from '@/core/components';
import type { ReferenciaCatalogo, TipoExclusion } from '../dtos/m06-precios.dto';
import { useRetardo } from '../hooks/useCargar';
import { ETIQUETAS_TIPO_REFERENCIA } from '../services/etiquetas';
import { mensajeDeError } from '../services/mensaje-error';
import { eventosApi } from '../services/precios-api';

export interface SelectorReferenciaProps {
  /** Qué tipos se pueden buscar. Con uno solo, no se muestra el selector de tipo. */
  tipos: readonly TipoExclusion[];
  /** Lo ya elegido. */
  valor: readonly ReferenciaCatalogo[];
  onChange: (nuevo: ReferenciaCatalogo[]) => void;
  /** Con `1` elegir otro reemplaza al anterior. */
  maximo?: number;
  etiqueta: string;
  ayuda?: string;
}

const mismaReferencia = (a: ReferenciaCatalogo, b: ReferenciaCatalogo): boolean => a.tipo === b.tipo && a.id === b.id;

/**
 * Busca en el catálogo (marcas, líneas, productos, variantes, colores…) y deja elegir una o varias
 * referencias. Lo usan los objetivos y las excepciones del editor de eventos.
 */
export const SelectorReferencia: React.FC<SelectorReferenciaProps> = ({
  tipos,
  valor,
  onChange,
  maximo,
  etiqueta,
  ayuda,
}) => {
  const idLista = useId();
  const [tipo, setTipo] = useState<TipoExclusion>(tipos[0] ?? 'marca');
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState<ReferenciaCatalogo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const termino = useRetardo(texto);

  // Si el tipo permitido cambia desde fuera (otra fila), se vuelve a uno válido.
  useEffect(() => {
    if (!tipos.includes(tipo)) setTipo(tipos[0] ?? 'marca');
  }, [tipos, tipo]);

  useEffect(() => {
    if (!abierto) return;
    let vigente = true;
    eventosApi
      .buscarReferencias(tipo, termino)
      .then((r) => {
        if (!vigente) return;
        setResultados(r);
        setError(null);
      })
      .catch((err: unknown) => {
        if (vigente) setError(mensajeDeError(err, 'No se pudo buscar en el catálogo.'));
      });
    return () => {
      vigente = false;
    };
  }, [tipo, termino, abierto]);

  const elegir = useCallback(
    (r: ReferenciaCatalogo) => {
      if (valor.some((v) => mismaReferencia(v, r))) return;
      onChange(maximo === 1 ? [r] : [...valor, r]);
      if (maximo === 1) setAbierto(false);
      setTexto('');
    },
    [valor, onChange, maximo],
  );

  const quitar = (r: ReferenciaCatalogo): void => onChange(valor.filter((v) => !mismaReferencia(v, r)));
  const lleno = maximo !== undefined && valor.length >= maximo && maximo !== 1;

  return (
    <div className="space-y-2">
      <p className="font-sans text-sm font-medium text-neutral-dark">{etiqueta}</p>
      {ayuda !== undefined && <p className="font-sans text-xs text-neutral-medium">{ayuda}</p>}

      {valor.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={`${etiqueta}: elegidos`}>
          {valor.map((v) => (
            <li key={`${v.tipo}:${v.id}`} className="flex items-center gap-1">
              <Badge variant="neutral" className="normal-case">
                <span className="text-neutral-medium">{ETIQUETAS_TIPO_REFERENCIA[v.tipo]}:</span> {v.nombre}
              </Badge>
              <IconButton
                variant="ghost"
                size="sm"
                onClick={() => quitar(v)}
                aria-label={`Quitar ${ETIQUETAS_TIPO_REFERENCIA[v.tipo]} ${v.nombre}`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      {!lleno && (
        <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
          {tipos.length > 1 && (
            <Select
              label="Tipo"
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value as TipoExclusion);
                setAbierto(true);
              }}
              options={tipos.map((t) => ({ value: t, label: ETIQUETAS_TIPO_REFERENCIA[t] }))}
            />
          )}
          <div className={tipos.length > 1 ? '' : 'sm:col-span-2'}>
            <Input
              label={`Buscar ${ETIQUETAS_TIPO_REFERENCIA[tipo].toLowerCase()}`}
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setAbierto(true);
              }}
              onFocus={() => setAbierto(true)}
              aria-controls={idLista}
              autoComplete="off"
            />
          </div>
        </div>
      )}

      {error !== null && <Alert variant="error">{error}</Alert>}
      {abierto && !lleno && (
        <div id={idLista} className="rounded-card border border-neutral-light bg-neutral-white">
          {resultados.length === 0 ? (
            <p className="px-3 py-3 font-sans text-sm text-neutral-medium">No hay resultados.</p>
          ) : (
            <ul className="max-h-56 divide-y divide-neutral-light overflow-y-auto">
              {resultados.map((r) => {
                const elegida = valor.some((v) => mismaReferencia(v, r));
                return (
                  <li key={`${r.tipo}:${r.id}`}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      fullWidth
                      className="justify-between text-left"
                      disabled={elegida}
                      onClick={() => elegir(r)}
                    >
                      <span className="flex w-full items-center justify-between gap-3 text-left">
                        <span>{r.nombre}</span>
                        {elegida && <span className="text-xs">Ya elegido</span>}
                      </span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="border-t border-neutral-light px-3 py-2 text-right">
            <TextButton className="text-xs" onClick={() => setAbierto(false)}>
              Cerrar la lista
            </TextButton>
          </div>
        </div>
      )}
    </div>
  );
};
