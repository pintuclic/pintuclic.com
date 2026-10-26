/**
 * Secciones de "Mi cuenta". Archivo sin `'use client'`: la página de servidor
 * valida aquí el `?seccion=` antes de pasarlo a la vista.
 */
export const SECCIONES_PERFIL = ['datos', 'solicitudes', 'seguridad', 'direcciones', 'empresa', 'cuenta'] as const;
export type SeccionPerfilId = (typeof SECCIONES_PERFIL)[number];

export function esSeccionPerfil(valor: unknown): valor is SeccionPerfilId {
  return typeof valor === 'string' && (SECCIONES_PERFIL as ReadonlyArray<string>).includes(valor);
}