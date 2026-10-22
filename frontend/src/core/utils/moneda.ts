const formateadorCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** Formatea un monto en pesos colombianos sin decimales: `formatCOP(85900)` → "$ 85.900". */
export function formatCOP(valor: number): string {
  return formateadorCOP.format(valor);
}
