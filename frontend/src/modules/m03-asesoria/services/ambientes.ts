import { catalogoAmbientesSchema, type AmbienteSimulador } from '../dtos/m03-asesoria.dto';

/**
 * Los ambientes del simulador de color (contrato M03 · S5), en el orden en que se ofrecen.
 *
 * Lista fija declarada aquí, igual que las superficies de la calculadora: es contenido sin
 * regla de negocio que no merece tabla ni endpoint. Cada `id` tiene su dibujo en
 * `components/publico/simulador/escenas`; añadir un ambiente es una entrada aquí y un
 * componente allí, y la prueba del módulo avisa si falta uno de los dos.
 *
 * Son PUNTOS DE VISTA de espacios de una casa: la misma sala de frente y desde una esquina
 * cuentan como dos.
 */
export const AMBIENTES: readonly AmbienteSimulador[] = catalogoAmbientesSchema.parse([
  { id: 'sala-frente', nombre: 'Sala', tipo: 'interior', alt: 'Sala con un sofá, vista de frente' },
  { id: 'sala-esquina', nombre: 'Sala (esquina)', tipo: 'interior', alt: 'Sala vista desde una esquina, con una butaca y una repisa' },
  { id: 'alcoba', nombre: 'Alcoba', tipo: 'interior', alt: 'Alcoba con la cama de frente y una mesa de noche a cada lado' },
  { id: 'comedor', nombre: 'Comedor', tipo: 'interior', alt: 'Comedor con una mesa, cuatro sillas y una lámpara colgante' },
  { id: 'estudio', nombre: 'Estudio', tipo: 'interior', alt: 'Estudio con un escritorio, una silla y una biblioteca' },
  { id: 'fachada', nombre: 'Fachada', tipo: 'exterior', alt: 'Fachada de una casa con puerta, dos ventanas y un árbol' },
]);

export const AMBIENTE_POR_DEFECTO: AmbienteSimulador['id'] = 'sala-frente';

/** El ambiente con ese id, o el primero si no existe: la pantalla nunca se queda sin imagen. */
export function ambientePorId(id: string): AmbienteSimulador {
  const encontrado = AMBIENTES.find((a) => a.id === id);
  if (encontrado !== undefined) return encontrado;
  // `parse` garantiza al menos uno, pero el tipo de un array indexado no lo sabe.
  return AMBIENTES[0] as AmbienteSimulador;
}
