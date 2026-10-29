import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SolicitudPagadaInput } from '../../m08-ordenes/dtos/m08-ordenes.dto';
import { MOTIVO_AVANCE_AUTOMATICO, type EstadoMarca } from '../dtos/m09-cumplimiento.dto';

/**
 * M09 contra PostgreSQL REAL: el SQL de las retenidas, el bloqueo de la fila de la orden, la carrera entre dos
 * empleados y el avance con la función de M08. Se activa con `M09_TEST_DATABASE_URL`, que debe apuntar a una base
 * DESECHABLE con el esquema y el seed cargados: la prueba escribe órdenes y marcas y no las borra (son de solo inserción).
 * Si se corre junto a la de M08 sobre la misma base, usar `--no-file-parallelism`: ambas comparten el consecutivo de
 * órdenes y la de M08 retiene su bloqueo a propósito.
 */
const URL_BD = process.env.M09_TEST_DATABASE_URL;
const ALEATORIO = Math.random().toString(36).slice(2, 8).toUpperCase();
const ID_CLIENTE = 1;
const ID_EMPLEADO = 2;
const OTRO_EMPLEADO = 3;

let contador = 0;
/** Solo dígitos (formato SOL-AAAA-NNNNN) y distinto en cada ejecución: la prueba puede repetirse en la misma base. */
const BASE_SOLICITUD = String(Date.now() % 1_000_000_000);

function lineaSolicitud(nombre: string, sobrescribir: Partial<SolicitudPagadaInput['lineas'][number]> = {}): SolicitudPagadaInput['lineas'][number] {
  return {
    nombreProducto: `${nombre} ${ALEATORIO}`,
    varianteCopia: 'Galón',
    colorSolicitado: null,
    skuVendido: null,
    cantidad: 1,
    precioInicial: 100000,
    precioAplicado: 100000,
    idVarianteRef: null,
    esEntonado: false,
    baseConsumida: null,
    descuentos: [],
    ...sobrescribir,
  };
}

function solicitud(lineas: SolicitudPagadaInput['lineas']): SolicitudPagadaInput {
  contador += 1;
  const subTotal = lineas.reduce((s, l) => s + l.precioAplicado * l.cantidad, 0);
  return {
    codigoSolicitud: `SOL-2026-${BASE_SOLICITUD}${String(contador).padStart(2, '0')}`,
    transaccionPagoId: `TX-M09-${ALEATORIO}-${contador}`,
    idUsuario: ID_CLIENTE,
    origen: 'carrito',
    idCotizacion: null,
    modoEntrega: 'recogida',
    direccion: null,
    costoEntrega: 0,
    subTotal,
    descuento: 0,
    total: subTotal,
    baseSinImpuesto: subTotal,
    importeIva: 0,
    tasaIva: 0,
    montoPagado: subTotal,
    observaciones: null,
    lineas,
  };
}

describe.skipIf(URL_BD === undefined)('M09 · cumplimiento contra PostgreSQL real', () => {
  let prisma: (typeof import('../../../core/db/client'))['prisma'];
  let creacion: import('../../m08-ordenes/services/creacion.service').CreacionService;
  let servicio: import('../services/cumplimiento.service').CumplimientoService;
  const eventos: Array<{ codigo: string; estadoNuevo: string; idUsuarioAutor: number }> = [];

  async function nuevaOrden(lineas: SolicitudPagadaInput['lineas']): Promise<string> {
    return (await creacion.crearDesdePagoConfirmado(solicitud(lineas))).codigo;
  }
  const marcas = (...pares: Array<[number, EstadoMarca]>) => ({ lineas: pares.map(([numeroLinea, estado]) => ({ numeroLinea, estado })) });
  const tres = () => [
    lineaSolicitud('Vinilo', { esEntonado: true, baseConsumida: 'Base Deep 1 gal', colorSolicitado: 'Rojo Colonial', cantidad: 2 }),
    lineaSolicitud('Brocha', { varianteCopia: 'Unidad' }),
    lineaSolicitud('Rodillo', { varianteCopia: 'Unidad', cantidad: 3 }),
  ];

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_BD ?? '';
    ({ prisma } = await import('../../../core/db/client.js'));
    const { CreacionService } = await import('../../m08-ordenes/services/creacion.service.js');
    const { PrismaCreacionRepository } = await import('../../m08-ordenes/repositories/creacion.repository.js');
    const { CumplimientoService } = await import('../services/cumplimiento.service.js');
    const { PrismaCumplimientoRepository } = await import('../repositories/cumplimiento.repository.js');

    const reloj = { ahora: () => new Date() };
    const sinAvisos = { notificarOrdenCreada: async () => undefined, notificarOrdenDespachada: async () => undefined };
    creacion = new CreacionService(new PrismaCreacionRepository(), sinAvisos, reloj);
    servicio = new CumplimientoService(
      new PrismaCumplimientoRepository(),
      { emitirCambioEstado: async (e) => void eventos.push({ codigo: e.codigo, estadoNuevo: e.estadoNuevo, idUsuarioAutor: e.idUsuarioAutor }) },
      reloj,
    );
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('una orden nueva nace en revisión con todas sus líneas pendientes y numeradas en orden', async () => {
    const codigo = await nuevaOrden(tres());

    const v = await servicio.verificacion(codigo);

    expect(v.estado).toBe('revision_disponibilidad');
    expect(v.lineas.map((l) => [l.numeroLinea, l.estado])).toEqual([[1, 'pendiente'], [2, 'pendiente'], [3, 'pendiente']]);
    expect(v.lineas[0]).toMatchObject({ esEntonado: true, baseConsumida: 'Base Deep 1 gal', colorSolicitado: 'Rojo Colonial', cantidad: 2 });
  });

  it('marca de a poco, queda retenida con el motivo y avanza sola al marcar la última (CA-CUM-03-05)', async () => {
    const codigo = await nuevaOrden(tres());

    const parcial = await servicio.marcar(codigo, marcas([1, 'disponible'], [2, 'consiguiendo_stock']), { idUsuario: ID_EMPLEADO });
    expect(parcial.avanzo).toBe(false);

    const { filas } = await servicio.retenidas(1, 100);
    const fila = filas.find((f) => f.codigo === codigo);
    expect(fila).toMatchObject({ lineasSinConfirmar: 2, lineasTotales: 3 });
    expect(fila?.motivos.map((m) => m.estado)).toEqual(['consiguiendo_stock', 'pendiente']);

    const final = await servicio.marcar(codigo, marcas([2, 'disponible'], [3, 'disponible']), { idUsuario: OTRO_EMPLEADO });

    expect(final.avanzo).toBe(true);
    expect(final.verificacion).toMatchObject({ estado: 'en_preparacion', completa: true });
    const orden = await prisma.orden.findUniqueOrThrow({ where: { codigoVisible: codigo }, include: { historial: { orderBy: { idHistorialEstadoOrden: 'asc' } } } });
    expect(orden.estado).toBe('en_preparacion');
    const ultima = orden.historial[orden.historial.length - 1];
    expect(ultima).toMatchObject({ estadoAnterior: 'revision_disponibilidad', estadoNuevo: 'en_preparacion', idUsuarioAutor: OTRO_EMPLEADO, motivo: MOTIVO_AVANCE_AUTOMATICO });
    expect(eventos.filter((e) => e.codigo === codigo)).toEqual([{ codigo, estadoNuevo: 'en_preparacion', idUsuarioAutor: OTRO_EMPLEADO }]);
    expect((await servicio.retenidas(1, 100)).filas.some((f) => f.codigo === codigo)).toBe(false);
  });

  it('corregir conserva todo el rastro y, con la orden ya en preparación, no la hace retroceder (R6)', async () => {
    const codigo = await nuevaOrden([lineaSolicitud('Esmalte')]);
    await servicio.marcar(codigo, marcas([1, 'disponible']), { idUsuario: ID_EMPLEADO });

    const r = await servicio.marcar(codigo, marcas([1, 'consiguiendo_stock']), { idUsuario: OTRO_EMPLEADO });

    expect(r.verificacion.estado).toBe('en_preparacion');
    expect(r.verificacion.lineas[0]?.estado).toBe('consiguiendo_stock');
    expect(r.verificacion.lineas[0]?.historial.map((h) => h.estado)).toEqual(['disponible', 'consiguiendo_stock']);
    expect((await prisma.orden.findUniqueOrThrow({ where: { codigoVisible: codigo } })).estado).toBe('en_preparacion');
  });

  it('marcar dos veces lo mismo no inserta una segunda fila (R3)', async () => {
    const codigo = await nuevaOrden(tres());
    await servicio.marcar(codigo, marcas([1, 'no_disponible']), { idUsuario: ID_EMPLEADO });

    await servicio.marcar(codigo, marcas([1, 'no_disponible']), { idUsuario: ID_EMPLEADO });

    const filas = await prisma.verificacionLineaOrden.count({ where: { linea: { orden: { codigoVisible: codigo } } } });
    expect(filas).toBe(1);
  });

  it('dos empleados confirmando la última línea a la vez: avanza una sola vez y queda una sola marca (bloqueo de la orden)', async () => {
    const codigo = await nuevaOrden([lineaSolicitud('Laca')]);

    const resultados = await Promise.all([
      servicio.marcar(codigo, marcas([1, 'disponible']), { idUsuario: ID_EMPLEADO }),
      servicio.marcar(codigo, marcas([1, 'disponible']), { idUsuario: OTRO_EMPLEADO }),
    ]);

    expect(resultados.filter((r) => r.avanzo)).toHaveLength(1);
    const orden = await prisma.orden.findUniqueOrThrow({ where: { codigoVisible: codigo }, include: { historial: true } });
    expect(orden.historial.filter((h) => h.estadoNuevo === 'en_preparacion')).toHaveLength(1);
    expect(await prisma.verificacionLineaOrden.count({ where: { linea: { orden: { codigoVisible: codigo } } } })).toBe(1);
  });

  it('una línea inexistente en la petición no deja marcas a medias', async () => {
    const codigo = await nuevaOrden(tres());

    await expect(servicio.marcar(codigo, marcas([1, 'disponible'], [9, 'disponible']), { idUsuario: ID_EMPLEADO })).rejects.toMatchObject({
      statusCode: 400,
    });

    expect(await prisma.verificacionLineaOrden.count({ where: { linea: { orden: { codigoVisible: codigo } } } })).toBe(0);
  });

  it('una orden en otro estado responde 409 y una inexistente 404', async () => {
    const codigo = await nuevaOrden([lineaSolicitud('Sellador')]);
    await prisma.orden.update({ where: { codigoVisible: codigo }, data: { estado: 'despachado' } });

    await expect(servicio.verificacion(codigo)).rejects.toMatchObject({ codigo: 'ORDEN_FUERA_DE_CUMPLIMIENTO' });
    await expect(servicio.verificacion('PC-2026-00000')).rejects.toMatchObject({ codigo: 'RECURSO_NO_DISPONIBLE' });
  });

  it('la base rechaza modificar o borrar una marca, aunque se intente directo (R3)', async () => {
    const codigo = await nuevaOrden([lineaSolicitud('Thinner')]);
    await servicio.marcar(codigo, marcas([1, 'consiguiendo_stock']), { idUsuario: ID_EMPLEADO });
    const marca = await prisma.verificacionLineaOrden.findFirstOrThrow({ where: { linea: { orden: { codigoVisible: codigo } } } });

    await expect(prisma.verificacionLineaOrden.update({ where: { idVerificacionLineaOrden: marca.idVerificacionLineaOrden }, data: { estado: 'disponible' } })).rejects.toThrow();
    await expect(prisma.verificacionLineaOrden.delete({ where: { idVerificacionLineaOrden: marca.idVerificacionLineaOrden } })).rejects.toThrow();
  });

  it('la lista de retenidas pagina y ordena de la más antigua a la más reciente', async () => {
    const a = await nuevaOrden([lineaSolicitud('Pintura A')]);
    const b = await nuevaOrden([lineaSolicitud('Pintura B')]);

    const todas = await servicio.retenidas(1, 100);
    const pos = (c: string) => todas.filas.findIndex((f) => f.codigo === c);
    expect(pos(a)).toBeGreaterThanOrEqual(0);
    expect(pos(a)).toBeLessThan(pos(b));

    const pagina = await servicio.retenidas(1, 1);
    expect(pagina.filas).toHaveLength(1);
    expect(pagina.paginacion.total).toBe(todas.paginacion.total);
    expect(pagina.paginacion.totalPaginas).toBe(todas.paginacion.total);
  });

  it('la hoja sale con la base de la línea entonada, sin importes, y también con la orden preparada', async () => {
    const codigo = await nuevaOrden(tres());
    await servicio.marcar(codigo, marcas([1, 'disponible'], [2, 'disponible'], [3, 'disponible']), { idUsuario: ID_EMPLEADO });
    await prisma.orden.update({ where: { codigoVisible: codigo }, data: { estado: 'preparada' } });

    const hoja = await servicio.hoja(codigo);

    expect(hoja.estado).toBe('preparada');
    expect(hoja.lineas[0]).toMatchObject({ numeroLinea: 1, baseConsumida: 'Base Deep 1 gal', colorSolicitado: 'Rojo Colonial', cantidad: 2 });
    expect(hoja.lineas[1]?.baseConsumida).toBeNull();
    expect(JSON.stringify(hoja)).not.toMatch(/precio|descuento|total|importe|iva|pago/i);
  });
});
