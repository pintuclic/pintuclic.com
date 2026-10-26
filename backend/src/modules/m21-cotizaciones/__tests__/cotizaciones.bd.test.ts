import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { CotizacionesRepositoryPort } from '../interfaces/cotizaciones.interface';
import type { CotizacionesService } from '../services/cotizaciones.service';

/**
 * M21 de punta a punta contra PostgreSQL real: repositorio Prisma, carrito REAL de M05 con catálogo de M01 y
 * precios de M06 (variantes del seed). Se activa con `M01_TEST_DATABASE_URL`; sin ella se omite (CI sin base).
 */
const URL_BD = process.env.M01_TEST_DATABASE_URL;
const ALEATORIO = Math.random().toString(36).slice(2, 8);

describe.skipIf(URL_BD === undefined)('M21 · cotizaciones (PostgreSQL + M05 + M06 reales)', () => {
  let prisma: (typeof import('../../../core/db/client'))['prisma'];
  let repo: CotizacionesRepositoryPort;
  let servicio: CotizacionesService;
  let carritoDeCuenta: (id: number) => Promise<import('../../m05-carrito/dtos/m05-carrito.dto').Carrito>;
  let cliente = 0;
  let admin = 0;
  const lineasSeed: Array<{ idVariante: number; idColor: number | null }> = [];

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_BD ?? '';
    ({ prisma } = await import('../../../core/db/client.js'));
    const { CotizacionesRepository } = await import('../repositories/cotizaciones.repository.js');
    const { CotizacionesService: Servicio } = await import('../services/cotizaciones.service.js');
    const { CarritoRepository } = await import('../../m05-carrito/repositories/carrito.repository.js');
    const { CarritoService } = await import('../../m05-carrito/services/carrito.service.js');
    const { CatalogoParaCompraService } = await import('../../m01-catalogo/services/catalogo-para-compra.service.js');
    const { CompraRepository } = await import('../../m01-catalogo/repositories/compra.repository.js');
    const { construirModuloM06 } = await import('../../m06-precios/m06.routes.js');
    const { AutorizacionService } = await import('../../m20-seguridad/services/autorizacion.service.js');
    type Sesiones = import('../../m20-seguridad/services/sesion.service').SesionService;

    const catalogo = new CatalogoParaCompraService(new CompraRepository());
    const m06 = construirModuloM06(
      new AutorizacionService({ tienePermiso: () => Promise.resolve(false) }, { registrarAccesoDenegado: () => Promise.resolve() }),
      {
        sesiones: { validarYRenovar: () => Promise.resolve({ valida: false }) } as unknown as Sesiones,
        catalogoCompra: catalogo,
        parametros: { obtenerNumero: (clave) => Promise.resolve(clave === 'comercial.iva_porcentaje' ? 19 : 500_000) },
      },
    );
    const carrito = new CarritoService({ repo: new CarritoRepository(), precios: m06.precios, catalogo });
    carritoDeCuenta = (id) => carrito.carritoDeCuenta(id);
    repo = new CotizacionesRepository();
    servicio = new Servicio({ repo, carrito, parametros: { obtenerNumero: () => Promise.resolve(15) } });

    const usuario = async (n: string): Promise<number> =>
      (await prisma.usuario.create({ data: { nombre: `Cotiza ${n} ${ALEATORIO}`, correo: `${n}-${ALEATORIO}@m21.test`, contrasena: 'x' } }))
        .idUsuario;
    cliente = await usuario('cliente');
    admin = await usuario('admin');

    const candidatas = await prisma.lineaCarrito.findMany({ select: { idVariante: true, idColor: true }, take: 20 });
    for (const r of await catalogo.consultarLineas(candidatas)) {
      if (r.vendible && !lineasSeed.some((l) => l.idVariante === r.idVariante && l.idColor === r.idColor)) {
        lineasSeed.push({ idVariante: r.idVariante, idColor: r.idColor });
      }
      if (lineasSeed.length === 2) break;
    }
    for (const l of lineasSeed) await carrito.agregar({ idUsuario: cliente, tokenVisitante: null }, { ...l, cantidad: 2 });
  });

  afterAll(async () => {
    if (prisma === undefined) return;
    // Las cotizaciones y el carrito caen con sus líneas; el usuario se borra al final.
    await prisma.cotizacion.deleteMany({ where: { idUsuario: { in: [cliente] } } });
    await prisma.usuario.deleteMany({ where: { idUsuario: { in: [cliente, admin] } } });
    await prisma.$disconnect();
  });

  it('el seed tiene dos líneas vendibles para probar', () => {
    expect(lineasSeed).toHaveLength(2);
  });

  it('pide, ajusta, envía y acepta: las líneas vuelven al carrito con el precio acordado', async () => {
    const c = await servicio.crear(cliente, { comentario: 'Obra en Cali' });
    expect(c.codigo).toMatch(/^COT-\d{6}$/);
    expect(c.estado).toBe('solicitada');
    expect(c.lineas).toHaveLength(2);
    expect(c.totalReferencia).toBeGreaterThan(0);

    const [l1, l2] = c.lineas;
    if (l1 === undefined || l2 === undefined) throw new Error('faltan líneas');
    const ajustada = await servicio.actualizar(c.idCotizacion, {
      lineas: [
        { idLinea: l1.idLinea, cantidad: 5, precioAcordado: 1000.5 },
        { idLinea: l2.idLinea, cantidad: 1, precioAcordado: 2000 },
      ],
      notaParaCliente: 'Precio especial',
      fechaVencimiento: null,
    });
    expect(ajustada.lineas.map((l) => l.subtotalAcordado)).toEqual([5002.5, 2000]);

    const enviada = await servicio.enviar(c.idCotizacion, admin);
    expect(enviada).toMatchObject({ estado: 'enviada', totalAcordado: 7002.5 });
    expect(enviada.fechaVencimiento).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const lista = await servicio.listarAdmin({ pagina: 1, limite: 20, busqueda: c.codigo });
    expect(lista.items.map((x) => x.idCotizacion)).toEqual([c.idCotizacion]);
    expect(lista.items[0]?.cliente?.correo).toBe(`cliente-${ALEATORIO}@m21.test`);

    expect((await servicio.aceptar(cliente, c.idCotizacion)).estado).toBe('aprobada');
    const carrito = await carritoDeCuenta(cliente);
    const cotizadas = carrito.lineas.filter((l) => l.idCotizacion === c.idCotizacion);
    expect(cotizadas.map((l) => [l.cantidad, l.precioAcordado, l.precio?.subtotal])).toEqual([
      [5, 1000.5, 5002.5],
      [1, 2000, 2000],
    ]);
  });

  it('después de aceptar, las líneas cotizadas del carrito no se vuelven a cotizar (R2)', async () => {
    await expect(servicio.crear(cliente, {})).rejects.toMatchObject({ code: 'CARRITO_VACIO' });
  });

  it('una enviada con fecha pasada queda vencida al consultarla', async () => {
    const [l1] = lineasSeed;
    if (l1 === undefined) throw new Error('sin datos');
    const id = await repo.crear({
      idUsuario: cliente,
      comentario: null,
      totalReferencia: 10,
      lineas: [{ ...l1, cantidad: 1, precioReferencia: 10, nombreProducto: 'X', marca: null, medida: null, sku: null, colorNombre: null, colorHexadecimal: null }],
    });
    await prisma.cotizacion.update({
      where: { idCotizacion: id },
      data: { estado: 'enviada', fechaVencimiento: new Date('2020-01-01T00:00:00Z') },
    });
    expect((await servicio.obtenerMia(cliente, id)).estado).toBe('vencida');
  });
});
