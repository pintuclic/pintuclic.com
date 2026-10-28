import React from 'react';

export interface MarkdownContenidoProps {
  markdown: string;
  className?: string;
}

/**
 * Renderiza texto en línea reconociendo segmentos en negrita (`**texto**`) sin usar
 * `dangerouslySetInnerHTML` (prevención estricta de XSS).
 */
function renderizarTextoEnLinea(texto: string): React.ReactNode[] {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);
  return partes.map((parte, indice) => {
    if (parte.startsWith('**') && parte.endsWith('**') && parte.length > 4) {
      return (
        <strong key={indice} className="font-semibold text-neutral-black">
          {parte.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={indice}>{parte}</React.Fragment>;
  });
}

interface BloqueMarkdown {
  tipo: 'h2' | 'h3' | 'ul' | 'p';
  texto?: string;
  items?: string[];
}

export function parsearBloquesMarkdown(markdown: string): BloqueMarkdown[] {
  const lineas = markdown.replace(/\r\n/g, '\n').split('\n');
  const bloques: BloqueMarkdown[] = [];
  let listaActual: string[] = [];
  let parrafoActual: string[] = [];

  const cerrarParrafo = () => {
    if (parrafoActual.length > 0) {
      bloques.push({ tipo: 'p', texto: parrafoActual.join(' ') });
      parrafoActual = [];
    }
  };

  const cerrarLista = () => {
    if (listaActual.length > 0) {
      bloques.push({ tipo: 'ul', items: [...listaActual] });
      listaActual = [];
    }
  };

  for (const lineaCruda of lineas) {
    const linea = lineaCruda.trim();

    if (linea.length === 0) {
      cerrarParrafo();
      cerrarLista();
      continue;
    }

    if (linea.startsWith('### ')) {
      cerrarParrafo();
      cerrarLista();
      bloques.push({ tipo: 'h3', texto: linea.slice(4).trim() });
      continue;
    }

    if (linea.startsWith('## ')) {
      cerrarParrafo();
      cerrarLista();
      bloques.push({ tipo: 'h2', texto: linea.slice(3).trim() });
      continue;
    }

    if (linea.startsWith('# ')) {
      cerrarParrafo();
      cerrarLista();
      bloques.push({ tipo: 'h2', texto: linea.slice(2).trim() });
      continue;
    }

    if (linea.startsWith('- ') || linea.startsWith('* ')) {
      cerrarParrafo();
      listaActual.push(linea.slice(2).trim());
      continue;
    }

    cerrarLista();
    parrafoActual.push(linea);
  }

  cerrarParrafo();
  cerrarLista();

  return bloques;
}

/**
 * Renderizador seguro de Markdown editorial para páginas institucionales y respuestas FAQ.
 */
export const MarkdownContenido: React.FC<MarkdownContenidoProps> = ({
  markdown,
  className = '',
}) => {
  const bloques = parsearBloquesMarkdown(markdown);

  return (
    <div className={`space-y-4 font-sans text-neutral-dark leading-relaxed ${className}`}>
      {bloques.map((bloque, idx) => {
        if (bloque.tipo === 'h2') {
          return (
            <h2
              key={idx}
              className="font-title font-bold text-lg sm:text-xl text-corporate pt-2"
            >
              {renderizarTextoEnLinea(bloque.texto ?? '')}
            </h2>
          );
        }
        if (bloque.tipo === 'h3') {
          return (
            <h3
              key={idx}
              className="font-title font-semibold text-base sm:text-lg text-neutral-black pt-1"
            >
              {renderizarTextoEnLinea(bloque.texto ?? '')}
            </h3>
          );
        }
        if (bloque.tipo === 'ul') {
          return (
            <ul key={idx} className="list-disc pl-6 space-y-2 text-sm sm:text-base">
              {(bloque.items ?? []).map((item, itemIdx) => (
                <li key={itemIdx} className="text-neutral-dark">
                  {renderizarTextoEnLinea(item)}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={idx} className="text-sm sm:text-base text-neutral-dark">
            {renderizarTextoEnLinea(bloque.texto ?? '')}
          </p>
        );
      })}
    </div>
  );
};
