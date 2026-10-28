'use client';

import React, { useState } from 'react';
import { Bold, Eye, Heading2, Heading3, List, ListOrdered, Pencil } from 'lucide-react';
import { Button } from '@/core/components';
import { MarkdownContenido } from '../publico/MarkdownContenido';

export interface BarraFormatoTextoProps {
  textareaId: string;
  valor: string;
  onChangeValor: (nuevoValor: string) => void;
  children: React.ReactNode;
}

/**
 * Barra de herramientas visual (tipo procesador de texto) para que el administrador
 * aplique títulos, subtítulos, negritas y listas con un clic sobre el texto seleccionado
 * y pueda alternar entre edición y vista previa formateada sin memorizar sintaxis Markdown.
 */
export const BarraFormatoTexto: React.FC<BarraFormatoTextoProps> = ({
  textareaId,
  valor,
  onChangeValor,
  children,
}) => {
  const [modoVistaPrevia, setModoVistaPrevia] = useState(false);

  const aplicarFormato = (tipo: 'h2' | 'h3' | 'bold' | 'ul' | 'ol') => {
    const el = document.getElementById(textareaId) as HTMLTextAreaElement | null;
    const textoActual = valor ?? '';
    const inicio = el?.selectionStart ?? textoActual.length;
    const fin = el?.selectionEnd ?? textoActual.length;
    const seleccion = textoActual.slice(inicio, fin);

    let reemplazo = '';
    let nuevoCursorInicio = inicio;
    let nuevoCursorFin = fin;

    if (tipo === 'bold') {
      const contenido = seleccion || 'texto en negrita';
      reemplazo = `**${contenido}**`;
      nuevoCursorInicio = inicio + 2;
      nuevoCursorFin = inicio + 2 + contenido.length;
    } else if (tipo === 'h2') {
      const contenido = seleccion || 'Título de sección';
      const prefijo = inicio > 0 && textoActual[inicio - 1] !== '\n' ? '\n\n## ' : '## ';
      reemplazo = `${prefijo}${contenido}`;
      nuevoCursorInicio = inicio + prefijo.length;
      nuevoCursorFin = nuevoCursorInicio + contenido.length;
    } else if (tipo === 'h3') {
      const contenido = seleccion || 'Subtítulo';
      const prefijo = inicio > 0 && textoActual[inicio - 1] !== '\n' ? '\n\n### ' : '### ';
      reemplazo = `${prefijo}${contenido}`;
      nuevoCursorInicio = inicio + prefijo.length;
      nuevoCursorFin = nuevoCursorInicio + contenido.length;
    } else if (tipo === 'ul') {
      const lineas = (seleccion || 'Elemento de la lista').split('\n');
      const formateadas = lineas.map((l) => (l.trim().startsWith('- ') ? l : `- ${l}`)).join('\n');
      const prefijo = inicio > 0 && textoActual[inicio - 1] !== '\n' ? '\n' : '';
      reemplazo = `${prefijo}${formateadas}`;
      nuevoCursorInicio = inicio + prefijo.length;
      nuevoCursorFin = nuevoCursorInicio + formateadas.length;
    } else if (tipo === 'ol') {
      const lineas = (seleccion || 'Primer paso\nSegundo paso').split('\n');
      const formateadas = lineas.map((l, idx) => `${idx + 1}. ${l.replace(/^\d+\.\s*/, '')}`).join('\n');
      const prefijo = inicio > 0 && textoActual[inicio - 1] !== '\n' ? '\n' : '';
      reemplazo = `${prefijo}${formateadas}`;
      nuevoCursorInicio = inicio + prefijo.length;
      nuevoCursorFin = nuevoCursorInicio + formateadas.length;
    }

    const siguiente = textoActual.slice(0, inicio) + reemplazo + textoActual.slice(fin);
    onChangeValor(siguiente);
    setModoVistaPrevia(false);

    requestAnimationFrame(() => {
      const input = document.getElementById(textareaId) as HTMLTextAreaElement | null;
      if (input) {
        input.focus();
        input.setSelectionRange(nuevoCursorInicio, nuevoCursorFin);
      }
    });
  };

  return (
    <div className="space-y-2">
      <div
        role="toolbar"
        aria-label="Herramientas de formato de texto"
        className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-neutral-light bg-neutral-lightest px-3 py-2"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => aplicarFormato('bold')}
            leftIcon={<Bold className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Negrita
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => aplicarFormato('h2')}
            leftIcon={<Heading2 className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Título
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => aplicarFormato('h3')}
            leftIcon={<Heading3 className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Subtítulo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => aplicarFormato('ul')}
            leftIcon={<List className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Lista
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => aplicarFormato('ol')}
            leftIcon={<ListOrdered className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Numerada
          </Button>
        </div>

        <Button
          type="button"
          variant={modoVistaPrevia ? 'primary-action' : 'ghost'}
          size="sm"
          onClick={() => setModoVistaPrevia((prev) => !prev)}
          leftIcon={
            modoVistaPrevia ? (
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            )
          }
        >
          {modoVistaPrevia ? 'Seguir editando' : 'Ver cómo queda'}
        </Button>
      </div>

      {modoVistaPrevia ? (
        <div className="min-h-44 rounded-card border border-neutral-light bg-neutral-white p-4">
          {valor.trim() ? (
            <MarkdownContenido markdown={valor} />
          ) : (
            <p className="font-sans text-sm text-neutral-medium italic">
              Aún no has escrito contenido para previsualizar.
            </p>
          )}
        </div>
      ) : (
        children
      )}
    </div>
  );
};
