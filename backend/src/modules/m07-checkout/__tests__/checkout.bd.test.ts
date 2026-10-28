import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { CheckoutService } from '../services/checkout.service';
import type { PasarelaFalsa } from './helpers/dobles';

/**
 * M07 de punta a punta contra PostgreSQL real: repositorio Prisma, carrito REAL de M05 con catálogo de M01 y
 * precios de M06 (variantes del seed), y la creación REAL de la orden de M08. Solo Wompi es un doble. Se activa
 * con `M01_TEST_DATABASE_URL`; sin ella se omite (CI sin base).
 */
const URL_BD = process.env.M01_TEST_DATABASE_URL;
const ALEATORIO = Math.random().toString(36).slice(2, 8);

describe.skipIf(URL_BD === undefined)('M07 · checkout (PostgreSQL + M05, M06 y M08 reales)', () => {
  let prisma: (typeof import('../../../core/db/client'))['prisma'];
  let servicio: CheckoutService;
  let pasarela: PasarelaFalsa;
  let carritoDeCuenta: (id: number) => Promise<import('../../m05-carrito/dtos/m05-carrito.dto').Carrito>;
  let cliente = 0;
  let ahora = new Date();
  const lineasSeed: Array<{ idVariante: number; idColor: number | null }> = [];

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_BD ?? '';
    ({ prisma } = await import('../../../core/db/client.js'));
    const { CheckoutRepository } = await import('../repositories/checkout.repository.js');
    const { CheckoutService: Servicio } = await import('../services/checkout.service.js');
    const { OrdenesM08Adapter } = await import('../adapters/ordenes-m08.adapter.js');
    const { PrismaPerfilCheckoutAdapter } = await import('../adapters/perfil.adapter.js');
    const dobles = await import('./helpers/dobles.js');
    const { CarritoRepository } = await import('../../m05-carrito/repositories/carrito.repository.js');
    const { CarritoService } = await import('../../m05-carrito/services/carrito.service.js');
    const { CatalogoParaCompraService } = await import('../../m01-catalogo/services/catalogo-para-compra.service.js');
    const { CompraRepository } = await import('../../m01-catalogo/repositories/compra.repository.js');
    const { construirModuloM06 } = await import('../../m06-precios/m06.routes.js');
    const { CreacionService } = await import('../../m08-ordenes/services/creacion.service.js');
    const { PrismaCreacionRepository } = await import('../../m08-ordenes/repositories/creacion.repository.js');
    const { RelojSistemaAdapter, SinNotificacionesOrdenAdapter } = await import('../../m08-ordenes/adapters/predeterminados.adapter.js');
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
    pasarela = new dobles.PasarelaFalsa(`tx-${ALEATORIO}`);
    servicio = new Servicio({
      repo: new CheckoutRepository(),
      carrito: {
        carritoDeCuenta: (id, cupon) => carrito.carritoDeCuenta(id, cupon),
        revalidar: (id, pantalla) => carrito.revalidarCuenta(id, pantalla),
        quitarComprado: (id, lineas) => carrito.quitarComprado(id, lineas),
      },
      precios: m06.precios,
      ordenes: new OrdenesM08Adapter(
        new CreacionService(new PrismaCreacionRepository(), new SinNotificacionesOrdenAdapter(), new RelojSistemaAdapter()),
      ),
      pasarela,
      perfil: new PrismaPerfilCheckoutAdapter(),
      parametros: { obtenerNumero: (clave) => Promise.resolve(clave === 'comercial.costo_envio_base' ? 15_000 : 200_000) },
      reloj: () => ahora,
    });

    cliente = (
      await prisma.usuario.create({ data: { nombre: `Compra ${ALEATORIO}`, correo: `compra-${ALEATORIO}@m07.test`, contrasena: 'x' } })
    ).idUsuario;
    const candidatas = await prisma.lineaCarrito.findMany({ select: { idVariante: true, idColor: true }, take: 20 });
    for (const r of await catalogo.consultarLineas(candidatas)) {
      if (r.vendible && !lineasSeed.some((l) => l.idVariante === r.idVariante && l.idColor === r.idColor)) {
        lineasSeed.push({ idVariante: r.idVariante, idColor: r.idColor });
      }
      if (lineasSeed.length === 2) break;
    }
    for (const l of lineasSeed) await carrito.agregar({ idUsuario: cliente, tokenVisitante: null }, { ...l, cantidad: 1 });
  });

  afterAll(async () => {
    if (prisma === undefined) return;
    // La orden de M08 y la solicitud no se borran (son históricas): el usuario de prueba se conserva.
    await prisma.$disconnect();
  });

  it('el seed tiene dos líneas vendibles para comprar', () => {
    expect(lineasSeed).toHaveLength(2);
  });

  it('paga con Nequi aprobado: crea la orden en M08, la enlaza y vacía lo comprado del carrito', async () => {
    const c = await carritoDeCuenta(cliente);
    const pantalla = {
      lineas: c.lineas.map((l) => ({ idLinea: l.idLinea, subtotal: l.precio?.subtotal ?? null })),
      total: c.calculo?.resumen.total ?? 0,
    };
    const s = await servicio.crear(cliente, {
      pantalla,
      modoEntrega: 'domicilio',
      direccion: { direccion: 'Calle 10 # 5-20', barrio: 'Centro', apartamentoCasa: null, nombreRecibe: 'Compra', telefonoRecibe: '3001234567' },
      celularNequi: '3991111111',
      aceptaciones: { tokenAceptacion: 'acc', tokenDatosPersonales: 'pd', aceptaTerminos: true },
    });
    expect(s.codigo).toMatch(/^SOL-\d{4}-\d{5,}$/);
    expect(s.lineas).toHaveLength(2);
    expect(s.totalACobrar).toBeCloseTo((c.calculo?.resumen.total ?? 0) + s.costoEnvio, 2);

    pasarela.resolver(`tx-${ALEATORIO}-1`, 'APPROVED');
    ahora = new Date(ahora.getTime() + 10_000);
    const final = await servicio.obtenerMia(cliente, s.codigo);
    expect(final.estado).toBe('completada');
    expect(final.codigoOrden).toMatch(/^PC-\d{4}-\d{5,}$/);

    const orden = await prisma.orden.findUniqueOrThrow({ where: { codigoSolicitud: s.codigo } });
    expect(orden).toMatchObject({ codigoVisible: final.codigoOrden, transaccionPagoId: `tx-${ALEATORIO}-1`, modoEntrega: 'domicilio', idUsuario: cliente });
    expect(orden.total.toNumber()).toBeCloseTo(s.totalACobrar, 2);
    expect(await prisma.lineaOrden.count({ where: { idOrden: orden.idOrden } })).toBe(2);
    expect((await carritoDeCuenta(cliente)).lineas).toHaveLength(0);
  });
});
