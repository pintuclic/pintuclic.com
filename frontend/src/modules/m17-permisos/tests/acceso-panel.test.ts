import { describe, expect, it } from 'vitest';
import { ADMIN_NAV_ITEMS } from '@/core/components';
import type { CodigoPermiso } from '../dtos/permisos.dto';
import type { MisPermisosRespuesta } from '../interfaces/permisos.interface';
import {
  cumpleRequisito,
  filtrarMenu,
  puedeVerRuta,
  REQUISITOS_SECCION,
  requisitoDeRuta,
  tieneResumen,
} from '../services/acceso-panel';

const admin: MisPermisosRespuesta = { idUsuario: 1, nombre: 'Admin', esAdministrador: true, permisos: [] };
const empleado = (permisos: CodigoPermiso[]): MisPermisosRespuesta => ({
  idUsuario: 6,
  nombre: 'Patrick Ortiz',
  esAdministrador: false,
  permisos,
});

describe('M17 R-ACC-9 · acceso al panel según los permisos', () => {
  it('cada sección del menú tiene un requisito declarado (no queda ninguna sin decidir)', () => {
    for (const item of ADMIN_NAV_ITEMS) {
      expect(Object.keys(REQUISITOS_SECCION), `falta el requisito de ${item.href}`).toContain(item.href);
    }
  });

  it('el administrador ve todo el menú', () => {
    expect(filtrarMenu(ADMIN_NAV_ITEMS, admin)).toHaveLength(ADMIN_NAV_ITEMS.length);
  });

  it('un empleado sin permisos solo ve el inicio', () => {
    expect(filtrarMenu(ADMIN_NAV_ITEMS, empleado([])).map((i) => i.href)).toEqual(['/admin']);
  });

  it('un empleado solo ve las secciones de sus permisos', () => {
    const rutas = filtrarMenu(ADMIN_NAV_ITEMS, empleado(['ventas.ver', 'catalogo.ver'])).map((i) => i.href);

    expect(rutas).toEqual(
      expect.arrayContaining([
        '/admin',
        '/admin/catalogo',
        '/admin/pedidos',
        '/admin/pagos',
        '/admin/inventario',
        '/admin/promociones',
        '/admin/reportes',
      ]),
    );
    expect(rutas).not.toContain('/admin/empleados');
    expect(rutas).not.toContain('/admin/configuracion');
    expect(rutas).not.toContain('/admin/gobernanza');
  });

  it('Configuración y Gobernanza son solo del administrador, aunque el empleado tenga configuracion.editar', () => {
    const conConfig = empleado(['configuracion.ver', 'configuracion.editar']);

    expect(puedeVerRuta('/admin/configuracion', conConfig)).toBe(false);
    expect(puedeVerRuta('/admin/gobernanza', conConfig)).toBe(false);
    expect(puedeVerRuta('/admin/banners', conConfig)).toBe(true);
    expect(puedeVerRuta('/admin/configuracion', admin)).toBe(true);
  });

  it('las rutas anidadas heredan el requisito de su sección', () => {
    expect(requisitoDeRuta('/admin/pedidos/ORD-2026-0001')).toBe('ventas.ver');
    expect(requisitoDeRuta('/admin/pedidos/ORD-2026-0001/comprobante')).toBe('ventas.ver');
    expect(requisitoDeRuta('/admin/pedidos/retenidas')).toBe('ventas.ver');
    expect(puedeVerRuta('/admin/pedidos/ORD-2026-0001', empleado(['catalogo.ver']))).toBe(false);
  });

  it('una ruta desconocida dentro del panel solo exige ser personal', () => {
    expect(requisitoDeRuta('/admin/algo-nuevo')).toBe(null);
  });

  it('cumpleRequisito: null para cualquiera de personal, "administrador" nunca para un empleado', () => {
    expect(cumpleRequisito(null, empleado([]))).toBe(true);
    expect(cumpleRequisito('administrador', empleado(['personal.ver']))).toBe(false);
    expect(cumpleRequisito('administrador', admin)).toBe(true);
  });

  it('el inicio tiene resumen si la persona ve al menos un bloque', () => {
    expect(tieneResumen(admin)).toBe(true);
    expect(tieneResumen(empleado(['ventas.ver']))).toBe(true);
    expect(tieneResumen(empleado(['catalogo.crear']))).toBe(true);
    expect(tieneResumen(empleado(['notificaciones.ver']))).toBe(false);
    expect(tieneResumen(empleado([]))).toBe(false);
  });
});
