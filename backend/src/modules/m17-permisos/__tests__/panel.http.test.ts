import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resumenPanelResponseEnvelopeSchema, type ResumenPanel } from '../dtos/m17-panel-resumen.dto';

/**
 * M17 · resumen del panel contra PostgreSQL real, por HTTP. Se activa con `M01_TEST_DATABASE_URL`. La base se comparte con
 * otras pruebas, así que se compara el resumen ANTES y DESPUÉS de crear datos propios (con prefijo): lo que cambia es lo
 * que la prueba sembró.
 */
const URL_BD = process.env.M01_TEST_DATABASE_URL;
const PREFIJO = `ZZ-PNL-${Math.random().toString(36).slice(2, 8)}`;

describe.skipIf(URL_BD === undefined)('M17 · resumen del panel (HTTP + PostgreSQL)', () => {
  let servidor: Server;
  let base: string;
  let prisma: (typeof import('../../../core/db/client'))['prisma'];
  let permisos: Record<number, string[]>;
  const sembrado: { cotizaciones: number[] } = { cotizaciones: [] };

  const pedir = async (idUsuario: number, ruta = ''): Promise<{ status: number; cuerpo: { success: boolean; data?: ResumenPanel; error?: { code: string } } }> => {
    const r = await fetch(`${base}/admin/resumen${ruta}`, { headers: { 'x-usuario': String(idUsuario) } });
    return { status: r.status, cuerpo: (await r.json()) as never };
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_BD ?? '';
    ({ prisma } = await import('../../../core/db/client.js'));
    const { PanelRepository } = await import('../repositories/panel.repository.js');
    const { PanelService } = await import('../services/panel.service.js');
    const { PanelController } = await import('../controllers/panel.controller.js');

    permisos = { 1: ['ventas.ver', 'catalogo.ver', 'personal.ver', 'patrocinios.ver', 'atencion.ver', 'empresas.validar', 'catalogo.crear'], 2: ['catalogo.ver'], 99: [] };
    const servicio = new PanelService(new PanelRepository(), { tienePermiso: (id, codigo) => Promise.resolve(permisos[id]?.includes(codigo) ?? false) });
    const controlador = new PanelController(servicio);
    const app = express();
    app.get('/admin/resumen', (req, _res, next) => {
      const id = Number(req.header('x-usuario'));
      if (Number.isFinite(id)) req.actor = { idUsuario: id, idSesion: 's', tipoSesion: 'admin' };
      next();
    }, controlador.resumen);
    servidor = await new Promise((resolver) => {
      const s = app.listen(0, () => resolver(s));
    });
    base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    if (prisma !== undefined) {
      await prisma.lineaCotizacion.deleteMany({ where: { nombreProducto: { startsWith: PREFIJO } } });
      await prisma.cotizacion.deleteMany({ where: { idCotizacion: { in: sembrado.cotizaciones } } });
    }
    await new Promise<void>((r) => (servidor === undefined ? r() : servidor.close(() => r())));
  });

  it('el resumen cumple el contrato y trae los bloques que el permiso da', async () => {
    const r = await pedir(1);
    expect(r.status).toBe(200);
    expect(() => resumenPanelResponseEnvelopeSchema.parse(r.cuerpo)).not.toThrow();
    const d = r.cuerpo.data as ResumenPanel;
    expect(d.dias).toBe(30);
    expect(d.negocio?.serie).toHaveLength(30);
    expect(d.catalogo).not.toBeNull();
    expect(d.accesos.length).toBeGreaterThan(0);
  });

  it('R1: sin permiso es el 404 opaco; con solo catálogo no hay bloques de ventas', async () => {
    const sin = await pedir(99);
    expect(sin.status).toBe(404);
    expect(sin.cuerpo.error?.code).toBe('RECURSO_NO_DISPONIBLE');
    const lector = (await pedir(2)).cuerpo.data as ResumenPanel;
    expect(lector.negocio).toBeNull();
    expect(lector.carritos).toBeNull();
    expect(lector.personas).toBeNull();
    expect(lector.catalogo).not.toBeNull();
  });

  it('R2: acepta 7, 30 y 90 días y rechaza otro valor con 400', async () => {
    for (const dias of [7, 30, 90]) {
      const r = await pedir(1, `?dias=${dias}`);
      expect(r.cuerpo.data?.dias).toBe(dias);
      expect(r.cuerpo.data?.negocio?.serie).toHaveLength(dias);
    }
    const mal = await pedir(1, '?dias=15');
    expect(mal.status).toBe(400);
    expect(mal.cuerpo.error?.code).toBe('PARAMETRO_INVALIDO');
  });

  it('las cotizaciones, el valor, el top de productos y los pendientes reflejan lo que se crea', async () => {
    const antes = (await pedir(1)).cuerpo.data as ResumenPanel;

    // Solo se siembran cotizaciones (con una variante que ya existe): la base se comparte con otras pruebas y crear productos,
    // variantes o cuentas movería los conteos globales que ellas verifican.
    const variante = await prisma.variante.findFirstOrThrow();

    const nueva = async (estado: 'solicitada' | 'enviada' | 'aprobada' | 'rechazada', referencia: number, acordado: number | null, cantidad: number, vence?: Date): Promise<void> => {
      const c = await prisma.cotizacion.create({
        data: {
          estado,
          totalReferencia: referencia,
          totalAcordado: acordado,
          ...(vence === undefined ? {} : { fechaVencimiento: vence }),
          lineas: {
            create: [{ idVariante: variante.idVariante, cantidad, precioReferencia: referencia / cantidad, nombreProducto: `${PREFIJO} Pintura`, marca: 'Prueba' }],
          },
        },
      });
      sembrado.cotizaciones.push(c.idCotizacion);
    };
    await nueva('solicitada', 1000, null, 2);
    await nueva('aprobada', 3000, 2500, 3);
    await nueva('rechazada', 500, null, 1);
    // Enviadas: una vence en 2 días (cuenta como «pronto») y otra en 20 (no).
    const en = (dias: number): Date => new Date(Date.parse(`${new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10)}T00:00:00.000Z`) + dias * 86400_000);
    await nueva('enviada', 200, null, 1, en(2));
    await nueva('enviada', 200, null, 1, en(20));

    const despues = (await pedir(1)).cuerpo.data as ResumenPanel;
    const n0 = antes.negocio;
    const n1 = despues.negocio;
    expect(n1?.cotizaciones.actual).toBe((n0?.cotizaciones.actual ?? 0) + 5);
    expect(n1?.valorCotizado.actual).toBe((n0?.valorCotizado.actual ?? 0) + 4900);
    // La aprobada cuenta por lo acordado (2500), no por su referencia.
    expect(n1?.valorAprobado.actual).toBe((n0?.valorAprobado.actual ?? 0) + 2500);
    const estado = (r: ResumenPanel | null, e: string): number => r?.negocio?.porEstado.find((x) => x.estado === e)?.total ?? 0;
    expect(estado(despues, 'solicitada')).toBe(estado(antes, 'solicitada') + 1);
    expect(estado(despues, 'aprobada')).toBe(estado(antes, 'aprobada') + 1);
    expect(estado(despues, 'rechazada')).toBe(estado(antes, 'rechazada') + 1);
    // Hoy, en el último punto de la serie.
    const hoy0 = n0?.serie.at(-1);
    const hoy1 = n1?.serie.at(-1);
    expect(hoy1?.cotizaciones).toBe((hoy0?.cotizaciones ?? 0) + 5);

    const propio = n1?.topProductos.find((p) => p.nombre === `${PREFIJO} Pintura`);
    expect(propio).toMatchObject({ unidades: 8, cotizaciones: 5 });

    const porResponder = (r: ResumenPanel): number => r.pendientes.find((p) => p.clave === 'cotizaciones_por_responder')?.total ?? 0;
    expect(porResponder(despues)).toBe(porResponder(antes) + 1);
    const porVencer = (r: ResumenPanel): number => r.pendientes.find((p) => p.clave === 'cotizaciones_por_vencer')?.total ?? 0;
    expect(porVencer(despues)).toBe(porVencer(antes) + 1);
  });

  it('catálogo, personas y pendientes coinciden con lo que hay en la base en ese momento', async () => {
    // Otras pruebas crean y borran filas a la vez: el valor debe quedar entre el conteo de antes y el de después.
    const entre = (valor: number | undefined, a: number, b: number): boolean => valor !== undefined && valor >= Math.min(a, b) && valor <= Math.max(a, b);
    const contar = async () => ({
      productos: await prisma.producto.count({ where: { estado: 'activo' } }),
      variantes: await prisma.variante.count({ where: { estado: 'activo' } }),
      agotadas: await prisma.variante.count({ where: { estado: 'activo', existenciaReferencial: { lte: 0 } } }),
      colaboradores: await prisma.usuario.count({ where: { estado: 'activo', usuarioRol: { isNot: null } } }),
      clientes: await prisma.usuario.count({ where: { estado: 'activo', usuarioRol: null } }),
    });
    const a = await contar();
    const r = (await pedir(1)).cuerpo.data as ResumenPanel;
    const b = await contar();
    expect(entre(r.catalogo?.productosActivos, a.productos, b.productos)).toBe(true);
    expect(entre(r.catalogo?.variantesActivas, a.variantes, b.variantes)).toBe(true);
    expect(entre(r.catalogo?.variantesAgotadas, a.agotadas, b.agotadas)).toBe(true);
    expect(entre(r.personas?.colaboradores, a.colaboradores, b.colaboradores)).toBe(true);
    expect(entre((r.personas?.clientesNaturales ?? 0) + (r.personas?.clientesEmpresa ?? 0), a.clientes, b.clientes)).toBe(true);
  });
});
