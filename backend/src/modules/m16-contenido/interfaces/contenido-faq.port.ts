import type { FaqPublicaItem } from '../dtos/m16-contenido.dto';

/**
 * Puerto de consulta de Preguntas Frecuentes publicadas (M16 -.-> M15).
 * Permite al módulo de Atención al Cliente (M15) consultar el catálogo vigente
 * de FAQ sin acoplarse al repositorio de M16.
 *
 * Regla de arquitectura: este archivo contiene exclusivamente tipos (0 bytes en runtime).
 */
export interface ContenidoFaqPort {
  listarFaqPublicas(): Promise<FaqPublicaItem[]>;
}
