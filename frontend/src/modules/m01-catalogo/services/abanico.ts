import { ABANICO_LAMINAS_MOVIL, COLORES_EN_ABANICO } from '../dtos/m01-catalogo-paleta.dto';

/** Ancho (px) por debajo del cual el abanico muestra menos láminas (contrato M01 · P14b; = punto de quiebre `sm`). */
export const ANCHO_ABANICO_ANGOSTO = 640;
/** Arco máximo del abanico, en grados a cada lado del centro. */
export const ARCO_MAXIMO_GRADOS = 62;

export interface GeometriaAbanico {
  visibles: number;
  anchoLamina: number;
  altoLamina: number;
  /** Grados entre una lámina y la siguiente. */
  paso: number;
  /** Píxeles de arrastre que equivalen a pasar una lámina. */
  pxPorLamina: number;
}

export const laminasVisibles = (anchoPx: number): number =>
  anchoPx < ANCHO_ABANICO_ANGOSTO ? ABANICO_LAMINAS_MOVIL : COLORES_EN_ABANICO;

const acotar = (v: number, minimo: number, maximo: number): number => Math.min(maximo, Math.max(minimo, v));

/**
 * P14b y P14c: la forma del abanico para el espacio disponible. Las láminas salen de un mismo punto inferior; el arco se
 * limita para que las láminas de los extremos no se salgan por los lados (el abanico nunca desborda horizontalmente).
 */
export function geometriaAbanico(ancho: number, alto: number): GeometriaAbanico {
  const visibles = laminasVisibles(ancho);
  const altoLamina = Math.max(180, alto * 0.88);
  const anchoLamina = acotar(Math.round(altoLamina * 0.15), 44, 88);
  const horizontal = Math.max(0, (ancho - anchoLamina) / 2 - 4);
  const seno = Math.min(1, horizontal / altoLamina);
  const medio = Math.min(ARCO_MAXIMO_GRADOS, (Math.asin(seno) * 180) / Math.PI);
  const paso = visibles > 1 ? (2 * medio) / (visibles - 1) : 0;
  return { visibles, anchoLamina, altoLamina, paso, pxPorLamina: Math.max(34, ancho / visibles) };
}

/** Ángulo de la lámina `indice` cuando `centro` (puede ser fraccionario mientras se arrastra) está al medio. */
export const anguloDeLamina = (indice: number, centro: number, paso: number): number => (indice - centro) * paso;

/** ¿La lámina entra en la ventana de `visibles` láminas alrededor de `centro`? Las demás se esconden. */
export const laminaVisible = (indice: number, centro: number, visibles: number): boolean =>
  Math.abs(indice - centro) <= (visibles - 1) / 2 + 0.5;

/**
 * Entre qué valores puede estar el centro de la ventana: con más colores que láminas visibles, de manera que la ventana
 * nunca muestre huecos a los lados (la primera lámina queda en el borde izquierdo y la última en el derecho); con
 * menos, el abanico queda fijo y centrado, completamente abierto.
 */
export function limitesCentro(total: number, visibles: number): { minimo: number; maximo: number } {
  if (total <= visibles) {
    const medio = Math.max(0, (total - 1) / 2);
    return { minimo: medio, maximo: medio };
  }
  const mitad = (visibles - 1) / 2;
  return { minimo: mitad, maximo: total - 1 - mitad };
}

export const acotarCentro = (centro: number, total: number, visibles: number): number => {
  const { minimo, maximo } = limitesCentro(total, visibles);
  return acotar(centro, minimo, maximo);
};

/** El centro tras arrastrar `dx` píxeles (hacia la izquierda avanza), sin salirse de los límites. */
export function centroTrasArrastre(centroInicial: number, dx: number, pxPorLamina: number, total: number, visibles: number): number {
  return acotarCentro(centroInicial - dx / pxPorLamina, total, visibles);
}

/** El centro al soltar: con inercia leve según la velocidad (px/ms), o el más cercano sin ella; siempre en una lámina entera. */
export function centroAlSoltar(
  centro: number,
  velocidadPxMs: number,
  pxPorLamina: number,
  total: number,
  visibles: number,
  conInercia: boolean,
): number {
  const empuje = conInercia ? (-velocidadPxMs * 220) / pxPorLamina : 0;
  const { minimo, maximo } = limitesCentro(total, visibles);
  const destino = Math.round(centro + acotar(empuje, -6, 6));
  // Si los límites no son enteros (cantidad par), el extremo es el límite mismo.
  return acotar(destino, minimo, maximo);
}

/** La lámina que queda «al medio» de lo que se ve: la más cercana al centro, dentro de la lista. */
export const laminaCentral = (centro: number, total: number): number =>
  acotar(Math.round(centro), 0, Math.max(0, total - 1));

/** ¿Hay que pedir la siguiente página? Cuando el borde derecho de la ventana se acerca al final de lo cargado. */
export const necesitaMasColores = (centro: number, cargados: number, total: number, visibles: number): boolean =>
  cargados < total && centro >= cargados - 1 - (visibles - 1) / 2 - 3;

/** Cuánta rueda horizontal (px) cuenta como pasar una lámina. */
export const PX_RUEDA_POR_LAMINA = 70;

/** Las teclas del abanico (P14b): cuánto mueven el centro; null si la tecla no es suya. */
export function pasoDeTecla(tecla: string, centro: number, total: number): number | null {
  const ultimo = Math.max(0, total - 1);
  if (tecla === 'ArrowRight' || tecla === 'ArrowDown') return acotar(centro + 1, 0, ultimo);
  if (tecla === 'ArrowLeft' || tecla === 'ArrowUp') return acotar(centro - 1, 0, ultimo);
  if (tecla === 'Home') return 0;
  if (tecla === 'End') return ultimo;
  return null;
}
