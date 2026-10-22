import { z } from 'zod';

/**
 * ==============================================================================
 * DTOs de Permisos Atómicos — M17 (Frontend)
 * ==============================================================================
 * Catálogo Maestro Oficial de 20 Códigos de Permiso Atómicos (seed_pintuclic.sql §1.4).
 */

export const CODIGOS_PERMISO = [
  'catalogo.ver',
  'catalogo.crear',
  'catalogo.editar',
  'catalogo.eliminar',
  'ventas.ver',
  'ventas.gestionar',
  'ventas.exportar',
  'personal.ver',
  'personal.editar',
  'personal.desactivar',
  'seguridad.configurar_sesion',
  'seguridad.gestionar_permisos',
  'seguridad.gestionar_privacidad',
  'configuracion.ver',
  'configuracion.editar',
  'estadisticas.consultar',
  'empresas.validar',
  'productos.crear',
  'productos.eliminar',
  'ordenes.ver',
  'usuarios.gestionar',
] as const;

export const codigoPermisoSchema = z.enum(CODIGOS_PERMISO);
export type CodigoPermiso = z.infer<typeof codigoPermisoSchema>;

export const AREA_FUNCIONAL = [
  'catalogo',
  'ventas',
  'personal',
  'seguridad',
  'configuracion',
  'estadisticas',
] as const;
export const areaFuncionalSchema = z.enum(AREA_FUNCIONAL);
export type AreaFuncional = z.infer<typeof areaFuncionalSchema>;

/** HU-ADM-02: Formulario de actualización de matriz de permisos */
export const actualizarPermisosDto = z.object({
  permisos: z.array(codigoPermisoSchema),
});
export type ActualizarPermisosFormData = z.infer<typeof actualizarPermisosDto>;
