import type { CodigoPermiso } from '../dtos/permisos.dto';
import type { MisPermisosRespuesta } from '../interfaces/permisos.interface';

/**
 * M17 R-ACC-9. Qué sección del panel puede ver cada persona.
 *
 * ⚠️ Esto es usabilidad, no control de acceso (RF-SEG-03-06): ocultar una opción no protege nada, el servidor decide
 * en cada petición. Cada requisito repite el permiso que exige el endpoint de LECTURA de esa pantalla; si el backend
 * cambia el suyo, cambia aquí. `'administrador'` marca lo que el servidor reserva a la cuenta administradora.
 */
export type RequisitoSeccion = CodigoPermiso | 'administrador' | null;

/** Prefijo de ruta → requisito. Se busca el prefijo más largo; `null` = cualquier persona de personal. */
export const REQUISITOS_SECCION: Readonly<Record<string, RequisitoSeccion>> = {
  '/admin': null,
  '/admin/catalogo': 'catalogo.ver',
  '/admin/pedidos': 'ventas.ver',
  '/admin/pagos': 'ventas.ver',
  '/admin/facturacion': 'ventas.ver',
  '/admin/reportes': 'ventas.ver',
  '/admin/postventa': 'ventas.ver',
  '/admin/cotizaciones': 'ventas.ver',
  '/admin/inventario': 'catalogo.ver',
  '/admin/promociones': 'catalogo.ver',
  '/admin/patrocinios': 'patrocinios.ver',
  '/admin/empleados': 'personal.ver',
  '/admin/clientes': 'personal.ver',
  '/admin/empresas': 'empresas.validar',
  '/admin/banners': 'configuracion.ver',
  '/admin/contenido': 'configuracion.ver',
  '/admin/configuracion': 'administrador',
  '/admin/notificaciones': 'notificaciones.ver',
  '/admin/atencion': 'atencion.ver',
  '/admin/asesoria': 'asesoria.ver',
  '/admin/gobernanza': 'administrador',
};

/**
 * Permisos que alimentan el resumen del inicio (espejo de `PERMISOS_CONSULTADOS` de `panel.service.ts`). Sin ninguno,
 * el servidor responde que no hay nada que mostrar y la interfaz da la bienvenida con los accesos de la persona.
 */
export const PERMISOS_DEL_RESUMEN: readonly CodigoPermiso[] = [
  'ventas.ver',
  'catalogo.ver',
  'catalogo.crear',
  'personal.ver',
  'patrocinios.ver',
  'atencion.ver',
  'empresas.validar',
];

export function requisitoDeRuta(ruta: string): RequisitoSeccion {
  const prefijos = Object.keys(REQUISITOS_SECCION)
    .filter((p) => ruta === p || ruta.startsWith(`${p}/`))
    .sort((a, b) => b.length - a.length);
  const mejor = prefijos[0];
  return mejor === undefined ? null : (REQUISITOS_SECCION[mejor] ?? null);
}

export function cumpleRequisito(requisito: RequisitoSeccion, acceso: MisPermisosRespuesta): boolean {
  if (acceso.esAdministrador) return true;
  if (requisito === null) return true;
  if (requisito === 'administrador') return false;
  return acceso.permisos.includes(requisito);
}

export function puedeVerRuta(ruta: string, acceso: MisPermisosRespuesta): boolean {
  return cumpleRequisito(requisitoDeRuta(ruta), acceso);
}

/** Los elementos del menú que la persona puede abrir, en el mismo orden. */
export function filtrarMenu<T extends { href: string }>(items: ReadonlyArray<T>, acceso: MisPermisosRespuesta): T[] {
  return items.filter((item) => puedeVerRuta(item.href, acceso));
}

/** El inicio tiene resumen si la persona ve al menos un bloque (misma regla R1 del servidor). */
export function tieneResumen(acceso: MisPermisosRespuesta): boolean {
  return acceso.esAdministrador || PERMISOS_DEL_RESUMEN.some((p) => acceso.permisos.includes(p));
}
