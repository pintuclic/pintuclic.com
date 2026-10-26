import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { CarritoGuardado, CarritoRepositoryPort, DuenoCarrito } from '../interfaces/carrito.interface';
import type { CarritoService } from '../services/carrito.service';

/**
 * M05 contra PostgreSQL real: el repositorio Prisma, las restricciones de la base y el cálculo REAL de M06 con
 * el catálogo REAL de M01 (variantes del seed). Se activa con `M01_TEST_DATABASE_URL`, como M01 y M06; sin ella
 * se omite (CI sin base de datos).
 */
const URL_BD = process.env.M01_TEST_DATABASE_URL;
const ALEATORIO = Math.random().toString(36).slice(2, 8);

describe.skipIf(URL_BD === undefined)('M05 · carrito (PostgreSQL + M01 + M06 reales)', () => {
  let prisma: (typeof import('../../../core/db/client'))['prisma'];
  let repo: CarritoRepositoryPort;
  let servicio: CarritoService;
  let idUsuario = 0;
  let otroUsuario = 0;
  /** Dos líneas vendibles del seed (variante + color). */
  const lineasSeed: Array<{ idVariante: number; idColor: number | null }> = [];
  const visitante = (n: number): DuenoCarrito => ({ tipo: 'visitante', hashToken: `zz-${ALEATORIO}-${n}`.padEnd(64, '0') });

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_BD ?? '';
    ({ prisma } = await import('../../../core/db/client.js'));
    const { CarritoRepository } = await import('../repositories/carrito.repository.js');
    const { CarritoService: Servicio } = await import('../services/carrito.service.js');
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
    repo = new CarritoRepository();
    servicio = new Servicio({ repo, precios: m06.precios, catalogo });

    const crearUsuario = async (n: string): Promise<number> =>
      (await prisma.usuario.create({ data: { nombre: `Carrito ${n}`, correo: `${n}-${ALEATORIO}@m05.test`, contrasena: 'x' } }))
        .idUsuario;
    idUsuario = await crearUsuario('uno');
    otroUsuario = await crearUsuario('dos');

    // Primeras combinaciones variante + color que M01 da por vendibles.
    const candidatas = await prisma.lineaCarrito.findMany({ select: { idVariante: true, idColor: true }, take: 20 });
    const extra = await prisma.variante.findMany({ where: { estado: 'activo' }, select: { idVariante: true }, take: 40 });
    const consultas = [...candidatas, ...extra.map((v) => ({ idVariante: v.idVariante, idColor: null }))];
    const respuestas = await catalogo.consultarLineas(consultas);
    for (const r of respuestas) {
      if (r.vendible && !lineasSeed.some((l) => l.idVariante === r.idVariante && l.idColor === r.idColor)) {
        lineasSeed.push({ idVariante: r.idVariante, idColor: r.idColor });
      }
      if (lineasSeed.length === 2) break;
    }
  });

  afterAll(async () => {
    if (prisma === undefined) return;
    await prisma.carrito.deleteMany({ where: { tokenVisitante: { startsWith: `zz-${ALEATORIO}` } } });
    // Los carritos de cuenta caen en cascada con el usuario.
    await prisma.usuario.deleteMany({ where: { idUsuario: { in: [idUsuario, otroUsuario] } } });
    await prisma.$disconnect();
  });

  it('el seed tiene al menos dos líneas vendibles para probar', () => {
    expect(lineasSeed).toHaveLength(2);
  });

  it('repositorio: crear es idempotente por dueño y guardar la misma variante y color no duplica', async () => {
    const a = await repo.crear(visitante(1));
    const b = await repo.crear(visitante(1));
    expect(b.idCarrito).toBe(a.idCarrito);
    const [l1] = lineasSeed;
    if (l1 === undefined) throw new Error('sin datos');
    await repo.guardarLinea(a.idCarrito, { ...l1, cantidad: 2 });
    await repo.guardarLinea(a.idCarrito, { ...l1, cantidad: 7 });
    const leido = (await repo.buscar(visitante(1))) as CarritoGuardado;
    expect(leido.lineas.map((l) => l.cantidad)).toEqual([7]);
  });

  it('la base rechaza un segundo carrito para la misma cuenta (uq_carrito_usuario)', async () => {
    await repo.crear({ tipo: 'cuenta', idUsuario: otroUsuario });
    await expect(prisma.carrito.create({ data: { idUsuario: otroUsuario } })).rejects.toThrow();
  });

  it('repositorio: cambiar o quitar una línea de otro carrito no hace nada', async () => {
    const mio = await repo.crear(visitante(2));
    const ajeno = (await repo.buscar(visitante(1))) as CarritoGuardado;
    const idAjena = ajeno.lineas[0]?.idLinea ?? 0;
    expect(await repo.cambiarCantidad(mio.idCarrito, idAjena, 1)).toBe(false);
    expect(await repo.quitarLinea(mio.idCarrito, idAjena)).toBe(false);
    expect(((await repo.buscar(visitante(1))) as CarritoGuardado).lineas[0]?.cantidad).toBe(7);
  });

  it('repositorio: unir suma, agrega y borra el carrito del visitante en una transacción', async () => {
    const [l1, l2] = lineasSeed;
    if (l1 === undefined || l2 === undefined) throw new Error('sin datos');
    const cuenta = await repo.crear({ tipo: 'cuenta', idUsuario });
    await repo.guardarLinea(cuenta.idCarrito, { ...l1, cantidad: 1 });
    const conLinea = (await repo.buscar({ tipo: 'cuenta', idUsuario })) as CarritoGuardado;
    const vis = (await repo.buscar(visitante(1))) as CarritoGuardado;
    await repo.unir({
      idCarritoVisitante: vis.idCarrito,
      idCarritoCuenta: cuenta.idCarrito,
      actualizar: [{ idLinea: conLinea.lineas[0]?.idLinea ?? 0, cantidad: 8 }],
      agregar: [{ ...l2, cantidad: 3 }],
    });
    expect(await repo.buscar(visitante(1))).toBeNull();
    const final = (await repo.buscar({ tipo: 'cuenta', idUsuario })) as CarritoGuardado;
    expect(final.lineas.map((l) => [l.idVariante, l.idColor, l.cantidad])).toEqual([
      [l1.idVariante, l1.idColor, 8],
      [l2.idVariante, l2.idColor, 3],
    ]);
  });

  it('servicio + M06 real: el carrito trae el cálculo de M06 y cumple el contrato', async () => {
    const { carritoSchema } = await import('../dtos/m05-carrito.dto.js');
    const r = await servicio.consultar({ idUsuario, tokenVisitante: null }, 'ZZNOEXISTE');
    const c = carritoSchema.parse(r.datos);
    expect(c.lineas).toHaveLength(2);
    expect(c.calculo).not.toBeNull();
    expect(c.lineas.every((l) => l.precio?.vendible === true && (l.precio.subtotal ?? 0) > 0)).toBe(true);
    expect(c.lineas[0]?.producto.nombre).not.toBeNull();
    expect(c.calculo?.cupon).toMatchObject({ codigo: 'ZZNOEXISTE', aplicado: false, motivoRechazo: 'cupon_no_valido' });
    const suma = c.lineas.reduce((s, l) => s + (l.precio?.subtotal ?? 0), 0);
    expect(Math.round(suma * 100)).toBe(Math.round((c.calculo?.resumen.total ?? 0) * 100));
  });

  it('servicio + M06 real: revalidar lo que se mostró deja continuar', async () => {
    const sol = { idUsuario, tokenVisitante: null };
    const c = (await servicio.consultar(sol)).datos;
    const r = await servicio.revalidar(sol, {
      lineas: c.lineas.map((l) => ({ idLinea: l.idLinea, subtotal: l.precio?.subtotal ?? null })),
      total: c.calculo?.resumen.total ?? 0,
    });
    expect(r.datos).toMatchObject({ cambios: [], puedeContinuar: true });
  });
});
