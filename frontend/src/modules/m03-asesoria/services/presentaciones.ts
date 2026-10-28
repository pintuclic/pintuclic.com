import type { CalculadoraProducto } from '../interfaces/asesoria.interface';

/**
 * Con qué presentación abre la calculadora.
 *
 * La ficha de producto pasa la que la persona ya eligió allí, para no hacerle elegir dos
 * veces lo mismo. Pero ese id puede no corresponder a este producto —una dirección vieja, o
 * una presentación que se desactivó entre la carga de la ficha y la de la calculadora—, así
 * que se comprueba contra las presentaciones reales antes de usarlo. Si no encaja, se abre
 * con la primera, que es lo que hacía antes de que existiera este dato.
 *
 * Vive fuera del componente para poder probarlo sin DOM, como el resto del módulo.
 */
export function presentacionDeArranque(
  datos: CalculadoraProducto,
  idVarianteInicial: number | null,
): string {
  const pedida = datos.presentaciones.find((p) => p.idVariante === idVarianteInicial);
  if (pedida !== undefined) return String(pedida.idVariante);

  const primera = datos.presentaciones[0];
  return primera === undefined ? '' : String(primera.idVariante);
}
