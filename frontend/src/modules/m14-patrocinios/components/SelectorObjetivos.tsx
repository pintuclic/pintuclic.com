'use client';

import React, { useCallback, useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';
import { Alert, Badge, Button, IconButton, Input, Select, TextButton } from '@/core/components';
import type { TipoObjetivoPatrocinio } from '../dtos/m14-patrocinios.dto';
import { useRetardo } from '../hooks/useCargar';
import { ETIQUETAS_TIPO_OBJETIVO, TIPOS_OBJETIVO } from '../services/etiquetas';
import type { ObjetivoElegido } from '../services/formularios';
import { mensajeDeError } from '../services/mensaje-error';
import { campaniasApi } from '../services/patrocinios-api';

export interface SelectorObjetivosProps {
  valor: readonly ObjetivoElegido[];
  onChange: (nuevo: ObjetivoElegido[]) => void;
  maximo: number;
}

const mismo = (a: ObjetivoElegido, b: ObjetivoElegido): boolean => a.tipo === b.tipo && a.id === b.id;

/**
 * Busca marcas, líneas y productos del catálogo y deja elegir varios. Una marca o una línea cubre todos sus
 * productos, también los que se creen después (contrato M14 · A3).
 */
export const SelectorObjetivos: React.FC<SelectorObjetivosProps> = ({ valor, onChange, maximo }) => {
  const idLista = useId();
  const [tipo, setTipo] = useState<TipoObjetivoPatrocinio>('marca');
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState<ObjetivoElegido[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const termino = useRetardo(texto);

  useEffect(() => {
    if (!abierto) return;
    let vigente = true;
    campaniasApi
      .buscarReferencias(tipo, termino)
      .then((r) => {
        if (!vigente) return;
        setResultados(r.map((x) => ({ tipo: x.tipo, id: x.id, nombre: x.nombre })));
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
    (r: ObjetivoElegido) => {
      if (valor.some((v) => mismo(v, r))) return;
      onChange([...valor, r]);
      setTexto('');
    },
    [valor, onChange],
  );

  const lleno = valor.length >= maximo;

  return (
    <div className="space-y-2">
      <p className="font-sans text-sm font-medium text-neutral-dark">Qué se patrocina</p>
      <p className="font-sans text-xs text-neutral-medium">
        Una marca o una línea cubre todos sus productos, también los que se creen después. Puede mezclar marcas, líneas
        y productos sueltos.
      </p>

      {valor.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Elegidos">
          {valor.map((v) => (
            <li key={`${v.tipo}:${v.id}`} className="flex items-center gap-1">
              <Badge variant="neutral" className="normal-case">
                <span className="text-neutral-medium">{ETIQUETAS_TIPO_OBJETIVO[v.tipo]}:</span> {v.nombre}
              </Badge>
              <IconButton
                variant="ghost"
                size="sm"
                onClick={() => onChange(valor.filter((x) => !mismo(x, v)))}
                aria-label={`Quitar ${ETIQUETAS_TIPO_OBJETIVO[v.tipo]} ${v.nombre}`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      {lleno ? (
        <p className="font-sans text-xs text-neutral-medium">Llegó al máximo de {maximo} elementos.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
          <Select
            label="Tipo"
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value as TipoObjetivoPatrocinio);
              setAbierto(true);
            }}
            options={TIPOS_OBJETIVO.map((t) => ({ value: t, label: ETIQUETAS_TIPO_OBJETIVO[t] }))}
          />
          <Input
            label={`Buscar ${ETIQUETAS_TIPO_OBJETIVO[tipo].toLowerCase()}`}
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
      )}

      {error !== null && <Alert variant="error">{error}</Alert>}
      {abierto && !lleno && (
        <div id={idLista} className="rounded-card border border-neutral-light bg-neutral-white">
          {resultados.length === 0 ? (
            <p className="px-3 py-3 font-sans text-sm text-neutral-medium">No hay resultados.</p>
          ) : (
            <ul className="max-h-56 divide-y divide-neutral-light overflow-y-auto">
              {resultados.map((r) => {
                const elegido = valor.some((v) => mismo(v, r));
                return (
                  <li key={`${r.tipo}:${r.id}`}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      fullWidth
                      className="justify-between text-left"
                      disabled={elegido}
                      onClick={() => elegir(r)}
                    >
                      <span className="flex w-full items-center justify-between gap-3 text-left">
                        <span>{r.nombre}</span>
                        {elegido && <span className="text-xs">Ya elegido</span>}
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
