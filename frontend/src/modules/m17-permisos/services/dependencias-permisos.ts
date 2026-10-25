import type { CodigoPermiso } from '../dtos/permisos.dto';

/**
 * Espejo de DEPENDENCIAS_CONSULTA del backend (ADR-008): un permiso operativo
 * exige su permiso de consulta. El servidor lo valida igual; esto evita que el
 * formulario envíe una combinación que el backend va a rechazar.
 *
 * Vive fuera del componente para poder probarlo sin DOM: el proyecto no tiene
 * jsdom ni Testing Library. Un área nueva solo agrega aquí su entrada.
 */
export const DEPENDENCIA_DE_CONSULTA: Partial<Record<CodigoPermiso, CodigoPermiso>> = {
  'catalogo.crear': 'catalogo.ver',
  'catalogo.editar': 'catalogo.ver',
  'catalogo.eliminar': 'catalogo.ver',
  'productos.crear': 'catalogo.ver',
  'productos.eliminar': 'catalogo.ver',
  'ventas.gestionar': 'ventas.ver',
  'ventas.exportar': 'ventas.ver',
  'ordenes.ver': 'ventas.ver',
  'personal.editar': 'personal.ver',
  'personal.desactivar': 'personal.ver',
  'usuarios.gestionar': 'personal.ver',
  'configuracion.editar': 'configuracion.ver',
  'notificaciones.editar': 'notificaciones.ver',
  'atencion.editar': 'atencion.ver',
};

/**
 * Marca o desmarca un permiso aplicando las dependencias en los dos sentidos:
 * marcar un operativo concede su permiso de consulta, y quitar un permiso de
 * consulta revoca todos los operativos que dependían de él.
 */
export function alternarPermiso(
  seleccionados: ReadonlySet<CodigoPermiso>,
  codigo: CodigoPermiso,
): Set<CodigoPermiso> {
  const nuevos = new Set(seleccionados);

  if (nuevos.has(codigo)) {
    nuevos.delete(codigo);

    for (const [operativo, consulta] of Object.entries(DEPENDENCIA_DE_CONSULTA)) {
      if (consulta === codigo) {
        nuevos.delete(operativo as CodigoPermiso);
      }
    }

    return nuevos;
  }

  nuevos.add(codigo);

  const consulta = DEPENDENCIA_DE_CONSULTA[codigo];
  if (consulta) {
    nuevos.add(consulta);
  }

  return nuevos;
}
