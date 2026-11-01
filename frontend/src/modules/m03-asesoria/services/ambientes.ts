import { catalogoAmbientesSchema, type AmbienteSimulador } from '../dtos/m03-asesoria.dto';

/**
 * Los ambientes del simulador de color (contrato M03 · S5), en el orden en que se ofrecen.
 *
 * Lista fija declarada aquí, igual que las superficies de la calculadora: es contenido sin
 * regla de negocio que no merece tabla ni endpoint. Cada ambiente es una fotografía con la
 * pared transparente (S3, S12) en `public/images/ambientes/`; añadir uno es una entrada aquí
 * y una foto allí, y la prueba del módulo avisa si la foto falta o no conserva su alfa.
 *
 * `encuadre` dice dónde está lo importante de la foto: las imágenes son cuadradas y la vista
 * las recorta, así que la sala y la habitación se anclan abajo (el sofá y la cama) en lugar
 * de perder el mueble.
 */
export const AMBIENTES: readonly AmbienteSimulador[] = catalogoAmbientesSchema.parse([
  {
    id: 'sala',
    nombre: 'Sala',
    tipo: 'interior',
    alt: 'Sala con un sofá blanco y cojines',
    imagen: '/images/ambientes/sala.webp',
    encuadre: 'abajo',
  },
  {
    id: 'cocina',
    nombre: 'Cocina',
    tipo: 'interior',
    alt: 'Cocina con muebles blancos, mesón y dos butacos de madera',
    imagen: '/images/ambientes/cocina.webp',
    encuadre: 'centro',
  },
  {
    id: 'habitacion',
    nombre: 'Habitación',
    tipo: 'interior',
    alt: 'Habitación con una cama, cortinas y una lámpara colgante',
    imagen: '/images/ambientes/habitacion.webp',
    encuadre: 'abajo',
  },
  {
    id: 'bano',
    nombre: 'Baño',
    tipo: 'interior',
    alt: 'Baño con lavamanos, espejo redondo, ventana y una repisa con toallas',
    imagen: '/images/ambientes/bano.webp',
    encuadre: 'centro',
  },
  {
    id: 'fachada',
    nombre: 'Fachada',
    tipo: 'exterior',
    alt: 'Fachada de una casa de dos pisos con puerta de madera y ventanas',
    imagen: '/images/ambientes/fachada.webp',
    encuadre: 'centro',
  },
]);

export const AMBIENTE_POR_DEFECTO: AmbienteSimulador['id'] = 'sala';

/** El ambiente con ese id, o el primero si no existe: la pantalla nunca se queda sin imagen. */
export function ambientePorId(id: string): AmbienteSimulador {
  const encontrado = AMBIENTES.find((a) => a.id === id);
  if (encontrado !== undefined) return encontrado;
  // `parse` garantiza al menos uno, pero el tipo de un array indexado no lo sabe.
  return AMBIENTES[0] as AmbienteSimulador;
}
