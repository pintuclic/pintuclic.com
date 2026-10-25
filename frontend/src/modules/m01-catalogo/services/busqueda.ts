/** Minúsculas y sin tildes: "Pasteñ" y "pasten" son lo mismo al buscar. */
export function normalizarBusqueda(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export interface OpcionBuscable {
  value: string;
  label: string;
  /** Texto secundario (por ejemplo la categoría de una subcategoría); también se busca en él. */
  detalle?: string;
}

/** Opciones que contienen todas las palabras escritas, en el nombre o en el detalle. */
export function filtrarOpciones(opciones: readonly OpcionBuscable[], busqueda: string): OpcionBuscable[] {
  const palabras = normalizarBusqueda(busqueda).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return [...opciones];
  return opciones.filter((o) => {
    const texto = normalizarBusqueda(`${o.label} ${o.detalle ?? ''}`);
    return palabras.every((p) => texto.includes(p));
  });
}
