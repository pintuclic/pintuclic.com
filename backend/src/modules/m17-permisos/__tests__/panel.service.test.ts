import { describe, expect, it, vi } from 'vitest';
import { resumenPanelSchema, type ClavePendientePanel } from '../dtos/m17-panel-resumen.dto';
import type { AgregadoCotizacionesEstado, PanelRepositoryPort } from '../interfaces/panel.interface';
import { PanelService } from '../services/panel.service';

const AHORA = new Date('2026-10-27T15:00:00Z');

function repoFalso(sobre: Partial<PanelRepositoryPort> = {}): PanelRepositoryPort {
  const agregados = (estados: AgregadoCotizacionesEstado[]) => () => Promise.resolve(estados);
  return {
    cotizacionesPorEstado: vi
      .fn()
      // 1.ª llamada: el periodo actual; 2.ª: el anterior.
      .mockImplementationOnce(
        agregados([
          { estado: 'aprobada', total: 2, sumaReferencia: 1000, sumaAcordado: 800, sumaReferenciaSinAcordado: 0 },
          { estado: 'rechazada', total: 1, sumaReferencia: 300, sumaAcordado: 0, sumaReferenciaSinAcordado: 300 },
          { estado: 'solicitada', total: 4, sumaReferencia: 700, sumaAcordado: 0, sumaReferenciaSinAcordado: 700 },
        ]),
      )
      .mockImplementationOnce(agregados([{ estado: 'aprobada', total: 1, sumaReferencia: 500, sumaAcordado: 0, sumaReferenciaSinAcordado: 500 }])),
    filasCotizaciones: () => Promise.resolve([{ fecha: new Date('2026-10-27T15:00:00Z'), valor: 700 }]),
    topProductosCotizados: () => Promise.resolve([{ nombre: 'Koraza', marca: 'Pintuco', unidades: 9, cotizaciones: 3 }]),
    carritos: () => Promise.resolve({ activos: 3, unidades: 8 }),
    catalogo: () => Promise.resolve({ productosActivos: 10, variantesActivas: 20, variantesAgotadas: 2, variantesExistenciaBaja: 3 }),
    eventosVigentes: () => Promise.resolve(1),
    cuponesVigentes: () => Promise.resolve(2),
    usosCupon: vi.fn().mockResolvedValueOnce({ usos: 5, importe: 1234.5 }).mockResolvedValueOnce({ usos: 2, importe: 100 }),
    personas: () => Promise.resolve({ clientesNaturales: 7, clientesEmpresa: 2, colaboradores: 4 }),
    campaniasVigentes: () => Promise.resolve(1),
    anunciosActivos: () => Promise.resolve(2),
    mediciones: vi.fn().mockResolvedValueOnce({ impresiones: 200, clics: 10 }).mockResolvedValueOnce({ impresiones: 100, clics: 4 }),
    pendientes: (claves: ReadonlySet<ClavePendientePanel>) =>
      Promise.resolve({
        cotizaciones_por_responder: claves.has('cotizaciones_por_responder') ? 4 : 0,
        cotizaciones_por_vencer: 0,
        solicitudes_contacto: claves.has('solicitudes_contacto') ? 2 : 0,
        solicitudes_empresa: 0,
        solicitudes_nit: 0,
        variantes_agotadas: claves.has('variantes_agotadas') ? 2 : 0,
      }),
    ...sobre,
  };
}

const conPermisos = (...codigos: string[]) => ({ tienePermiso: (_id: number, codigo: string) => Promise.resolve(codigos.includes(codigo)) });
const TODOS = ['ventas.ver', 'catalogo.ver', 'catalogo.crear', 'personal.ver', 'patrocinios.ver', 'atencion.ver', 'empresas.validar'];

describe('PanelService · resumen del panel', () => {
  it('con todos los permisos arma todos los bloques y el resultado cumple el contrato', async () => {
    const r = await new PanelService(repoFalso(), conPermisos(...TODOS), () => AHORA).resumen(1, 30);
    expect(r).not.toBeNull();
    expect(() => resumenPanelSchema.parse(r)).not.toThrow();
    expect(r?.dias).toBe(30);
    expect(r?.generadoEn).toBe(AHORA.toISOString());
  });

  it('negocio: cuenta, suma, compara con el periodo anterior y calcula la tasa', async () => {
    const r = await new PanelService(repoFalso(), conPermisos(...TODOS), () => AHORA).resumen(1, 30);
    expect(r?.negocio?.cotizaciones).toEqual({ actual: 7, anterior: 1 });
    expect(r?.negocio?.valorCotizado).toEqual({ actual: 2000, anterior: 500 });
    // Aprobadas: lo acordado (800) y, si no hay acordado, la referencia: en el periodo anterior, 500.
    expect(r?.negocio?.valorAprobado).toEqual({ actual: 800, anterior: 500 });
    // 2 aprobadas ÷ (2 + 1 rechazada + 0 vencidas) = 66,7 %.
    expect(r?.negocio?.tasaAprobacion).toBe(66.7);
    expect(r?.negocio?.porEstado.find((e) => e.estado === 'solicitada')?.total).toBe(4);
    expect(r?.negocio?.serie).toHaveLength(30);
    expect(r?.negocio?.topProductos[0]?.nombre).toBe('Koraza');
  });

  it('descuentos y patrocinios traen su comparación y el CTR', async () => {
    const r = await new PanelService(repoFalso(), conPermisos(...TODOS), () => AHORA).resumen(1, 30);
    expect(r?.descuentos?.usosCupon).toEqual({ actual: 5, anterior: 2 });
    expect(r?.descuentos?.descuentoOtorgado).toEqual({ actual: 1234.5, anterior: 100 });
    expect(r?.patrocinios?.impresiones).toEqual({ actual: 200, anterior: 100 });
    expect(r?.patrocinios?.ctr).toBe(5);
  });

  it('R1: sin permiso para ningún bloque no hay resumen (la ruta responde 404)', async () => {
    expect(await new PanelService(repoFalso(), conPermisos(), () => AHORA).resumen(99)).toBeNull();
    // Solo atención o empresas no alcanza: ningún bloque de cifras depende de ellos.
    expect(await new PanelService(repoFalso(), conPermisos('atencion.ver', 'empresas.validar'), () => AHORA).resumen(99)).toBeNull();
  });

  it('R1: cada bloque llega solo con su permiso y no consulta lo demás', async () => {
    const repo = repoFalso();
    const r = await new PanelService(repo, conPermisos('catalogo.ver'), () => AHORA).resumen(2);
    expect(r?.catalogo).not.toBeNull();
    expect(r?.descuentos).not.toBeNull();
    expect(r?.negocio).toBeNull();
    expect(r?.carritos).toBeNull();
    expect(r?.personas).toBeNull();
    expect(r?.patrocinios).toBeNull();
    // Lo que no puede ver ni siquiera se consulta.
    expect(vi.mocked(repo.cotizacionesPorEstado)).not.toHaveBeenCalled();
  });

  it('R11: solo trae pendientes con total y con permiso; los de prioridad alta van primero', async () => {
    const r = await new PanelService(repoFalso(), conPermisos(...TODOS), () => AHORA).resumen(1);
    expect(r?.pendientes.map((p) => p.clave)).toEqual(['cotizaciones_por_responder', 'solicitudes_contacto', 'variantes_agotadas']);
    expect(r?.pendientes[0]).toMatchObject({ total: 4, prioridad: 'alta', ruta: '/admin/cotizaciones?estado=solicitada' });
    const soloCatalogo = await new PanelService(repoFalso(), conPermisos('catalogo.ver'), () => AHORA).resumen(1);
    expect(soloCatalogo?.pendientes.map((p) => p.clave)).toEqual(['variantes_agotadas']);
  });

  it('R12: los accesos dependen del permiso, en orden fijo y con tope', async () => {
    const todos = await new PanelService(repoFalso(), conPermisos(...TODOS), () => AHORA).resumen(1);
    expect(todos?.accesos).toHaveLength(6);
    expect(todos?.accesos[0]?.clave).toBe('responder_cotizaciones');
    const lector = await new PanelService(repoFalso(), conPermisos('catalogo.ver'), () => AHORA).resumen(1);
    expect(lector?.accesos.map((a) => a.clave)).toEqual(['ajustar_inventario', 'crear_promocion']);
    expect(lector?.accesos.every((a) => a.ruta.startsWith('/admin'))).toBe(true);
  });

  it('usa 30 días por defecto', async () => {
    const r = await new PanelService(repoFalso(), conPermisos(...TODOS), () => AHORA).resumen(1);
    expect(r?.dias).toBe(30);
  });
});
