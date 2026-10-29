import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SolicitudPagadaInput } from '../dtos/m08-ordenes.dto';

/**
 * Repositorios de M08 contra PostgreSQL REAL (transacciones, bloqueo del consecutivo, SQL de la
 * bandeja). Se activa con `M08_TEST_DATABASE_URL`, que debe apuntar a una base DESECHABLE con el
 * esquema y el seed cargados: la prueba escribe órdenes y no las borra (las tablas son de solo inserción).
 */
const URL_BD = process.env.M08_TEST_DATABASE_URL;
const ALEATORIO = Math.random().toString(36).slice(2, 8).toUpperCase();
const ID_CLIENTE = 1;
const ID_EMPLEADO = 2;

let contador = 0;
/** Solo dígitos (formato SOL-AAAA-NNNNN) y distinto en cada ejecución: la prueba puede repetirse en la misma base. */
const BASE_SOLICITUD = String(Date.now() % 1_000_000_000);
function solicitud(sobrescribir: Partial<SolicitudPagadaInput> = {}): SolicitudPagadaInput {
  contador += 1;
  return {
    codigoSolicitud: `SOL-2026-${BASE_SOLICITUD}${String(contador).padStart(2, '0')}`,
    transaccionPagoId: `TX-${ALEATORIO}-${contador}`,
    idUsuario: ID_CLIENTE,
    origen: 'carrito',
    idCotizacion: null,
    modoEntrega: 'domicilio',
    direccion: 'Calle 10 # 20-30, Bogotá',
    costoEntrega: 0,
    subTotal: 100000,
    descuento: 15000,
    total: 85000,
    baseSinImpuesto: 71428.57,
    importeIva: 13571.43,
    tasaIva: 19,
    montoPagado: 85000,
    observaciones: null,
    lineas: [
      {
        nombreProducto: `Vinilo ${ALEATORIO}`,
        varianteCopia: 'Galón',
        colorSolicitado: 'Rojo Colonial',
        skuVendido: 'VIN-GAL-RC',
        cantidad: 1,
        precioInicial: 100000,
        precioAplicado: 85000,
        idVarianteRef: 987654,
        esEntonado: true,
        baseConsumida: 'Base Deep 1 gal',
        descuentos: [
          { ordenAplicacion: 1, origen: 'Promoción', porcentaje: 10, importe: 10000 },
          { ordenAplicacion: 2, origen: 'Cliente frecuente', porcentaje: 5, importe: 5000 },
        ],
      },
    ],
    ...sobrescribir,
  };
}

describe.skipIf(URL_BD === undefined)('M08 · repositorios contra PostgreSQL real', () => {
  let prisma: (typeof import('../../../core/db/client'))['prisma'];
  let creacion: import('../services/creacion.service').CreacionService;
  let estados: import('../services/estados.service').EstadosService;
  let gestion: import('../repositories/gestion.repository').PrismaGestionRepository;
  let consulta: import('../repositories/consulta-cliente.repository').PrismaConsultaClienteRepository;
  let notas: import('../repositories/notas.repository').PrismaNotasRepository;

  /**
   * Último número usado. Sin fila en `consecutivo` la numeración arranca después del mayor código
   * `PC-AAAA-NNNNN` ya existente (el seed trae pedidos con ese formato).
   */
  async function consecutivoActual(): Promise<number> {
    const fila = await prisma.consecutivo.findUnique({ where: { nombre: 'orden' } });
    if (fila) return Number(fila.ultimoValor);
    const sembradas = await prisma.orden.findMany({
      where: { codigoVisible: { startsWith: 'PC-' } },
      select: { codigoVisible: true },
    });
    return Math.max(0, ...sembradas.map((o) => Number(o.codigoVisible.split('-')[2])));
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_BD ?? '';
    ({ prisma } = await import('../../../core/db/client.js'));
    const { CreacionService } = await import('../services/creacion.service.js');
    const { EstadosService } = await import('../services/estados.service.js');
    const { PrismaCreacionRepository } = await import('../repositories/creacion.repository.js');
    const { PrismaEstadosRepository } = await import('../repositories/estados.repository.js');
    const { PrismaGestionRepository } = await import('../repositories/gestion.repository.js');
    const { PrismaConsultaClienteRepository } = await import('../repositories/consulta-cliente.repository.js');
    const { PrismaNotasRepository } = await import('../repositories/notas.repository.js');

    const reloj = { ahora: () => new Date() };
    const notificaciones = {
      notificarOrdenCreada: async () => undefined,
      notificarOrdenDespachada: async () => undefined,
    };
    creacion = new CreacionService(new PrismaCreacionRepository(), notificaciones, reloj);
    estados = new EstadosService(
      new PrismaEstadosRepository(),
      { emitirCambioEstado: async () => undefined },
      notificaciones,
      reloj,
    );
    gestion = new PrismaGestionRepository();
    consulta = new PrismaConsultaClienteRepository();
    notas = new PrismaNotasRepository();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('crea orden, líneas, descuentos e historial inicial en una transacción (HU-ORD-01, 02)', async () => {
    const antes = await consecutivoActual();
    const entrada = solicitud();

    const r = await creacion.crearDesdePagoConfirmado(entrada);

    expect(r).toMatchObject({ creada: true, estado: 'revision_disponibilidad' });
    expect(r.codigo).toBe(`PC-2026-${String(antes + 1).padStart(5, '0')}`);
    expect(await consecutivoActual()).toBe(antes + 1);

    const guardada = await prisma.orden.findUnique({
      where: { codigoVisible: r.codigo },
      include: { lineas: { include: { descuentos: true } }, historial: true },
    });
    expect(guardada?.total.toNumber()).toBe(85000);
    expect(guardada?.tasaIva?.toNumber()).toBe(19);
    expect(guardada?.codigoSolicitud).toBe(entrada.codigoSolicitud);
    expect(guardada?.lineas[0]?.descuentos.map((d) => d.ordenAplicacion).sort()).toEqual([1, 2]);
    expect(guardada?.lineas[0]?.baseConsumida).toBe('Base Deep 1 gal');
    expect(guardada?.historial).toHaveLength(1);
    expect(guardada?.historial[0]).toMatchObject({ estadoAnterior: null, estadoNuevo: 'revision_disponibilidad', idUsuarioAutor: null });
  });

  it('la misma solicitud, repetida o en paralelo, genera una sola orden y no salta números (CA-ORD-01-05)', async () => {
    const antes = await consecutivoActual();
    const entrada = solicitud();

    const resultados = await Promise.all(Array.from({ length: 5 }, () => creacion.crearDesdePagoConfirmado(entrada)));

    expect(new Set(resultados.map((x) => x.codigo)).size).toBe(1);
    expect(resultados.filter((x) => x.creada)).toHaveLength(1);
    expect(await prisma.orden.count({ where: { codigoSolicitud: entrada.codigoSolicitud } })).toBe(1);
    expect(await consecutivoActual()).toBe(antes + 1);
  });

  it('una transacción de pago ya usada por OTRA solicitud es un conflicto, no devuelve la orden ajena (R2)', async () => {
    const primera = solicitud();
    await creacion.crearDesdePagoConfirmado(primera);
    const ordenes = await prisma.orden.count();

    await expect(
      creacion.crearDesdePagoConfirmado(solicitud({ transaccionPagoId: primera.transaccionPagoId })),
    ).rejects.toMatchObject({ codigo: 'CONFLICTO_SOLICITUD' });

    expect(await prisma.orden.count()).toBe(ordenes);
  });

  it('la misma solicitud con otro cliente es un conflicto y no se crea nada', async () => {
    const primera = solicitud();
    await creacion.crearDesdePagoConfirmado(primera);
    const antes = await consecutivoActual();

    await expect(creacion.crearDesdePagoConfirmado({ ...primera, idUsuario: ID_EMPLEADO })).rejects.toMatchObject({
      codigo: 'CONFLICTO_SOLICITUD',
    });

    expect(await consecutivoActual()).toBe(antes);
  });

  it('si otra transacción retiene el bloqueo del consecutivo, la creación falla por tiempo y no espera sin límite', async () => {
    await creacion.crearDesdePagoConfirmado(solicitud()); // asegura que la fila del consecutivo existe
    const antes = await consecutivoActual();
    let liberar: () => void = () => undefined;
    const retenida = new Promise<void>((resolver) => {
      liberar = resolver;
    });
    let bloqueado: () => void = () => undefined;
    const yaBloqueado = new Promise<void>((resolver) => {
      bloqueado = resolver;
    });

    const retenedora = prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id_consecutivo FROM consecutivo WHERE nombre = 'orden' FOR UPDATE`;
        bloqueado();
        await retenida;
      },
      { timeout: 30_000 },
    );
    await yaBloqueado;

    const inicio = Date.now();
    await expect(creacion.crearDesdePagoConfirmado(solicitud())).rejects.toThrow();
    const espera = Date.now() - inicio;
    liberar();
    await retenedora;

    expect(espera).toBeLessThan(12_000);
    expect(await consecutivoActual()).toBe(antes);
  }, 30_000);

  it('si la creación falla a la mitad, se revierte todo y el consecutivo no deja hueco (R3)', async () => {
    const antes = await consecutivoActual();
    const ordenesAntes = await prisma.orden.count();

    await expect(creacion.crearDesdePagoConfirmado(solicitud({ idUsuario: 99999999 }))).rejects.toThrow();

    expect(await consecutivoActual()).toBe(antes);
    expect(await prisma.orden.count()).toBe(ordenesAntes);
    const siguiente = await creacion.crearDesdePagoConfirmado(solicitud());
    expect(siguiente.codigo).toBe(`PC-2026-${String(antes + 1).padStart(5, '0')}`);
  });

  it('las órdenes del seed con otro formato no alteran la numeración PC-AAAA-NNNNN', async () => {
    const sembradas = await prisma.orden.count({ where: { codigoVisible: { startsWith: 'ORD-' } } });
    expect(sembradas).toBeGreaterThan(0);
    expect(await consecutivoActual()).toBeGreaterThan(0);
  });

  it('cambia el estado con candado optimista y deja autor en el historial; solo gana uno si compiten (R8)', async () => {
    const { codigo } = await creacion.crearDesdePagoConfirmado(solicitud());

    const resultados = await Promise.allSettled([
      estados.cambiarEstado(codigo, { estadoActual: 'revision_disponibilidad', estadoNuevo: 'en_preparacion' }, { idUsuario: ID_EMPLEADO }),
      estados.cambiarEstado(codigo, { estadoActual: 'revision_disponibilidad', estadoNuevo: 'en_preparacion' }, { idUsuario: 3 }),
    ]);

    expect(resultados.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    const perdedora = resultados.find((x) => x.status === 'rejected');
    expect(perdedora).toMatchObject({ reason: { codigo: 'ESTADO_CAMBIADO' } });

    const historial = await prisma.historialEstadoOrden.findMany({
      where: { orden: { codigoVisible: codigo } },
      orderBy: { idHistorialEstadoOrden: 'asc' },
    });
    expect(historial.map((h) => h.estadoNuevo)).toEqual(['revision_disponibilidad', 'en_preparacion']);
    expect([ID_EMPLEADO, 3]).toContain(historial[1]?.idUsuarioAutor);
  });

  it('recorre el ciclo de una recogida hasta Entregado sin pasar por Despachado (CA-ORD-03-03)', async () => {
    const { codigo } = await creacion.crearDesdePagoConfirmado(solicitud({ modoEntrega: 'recogida', direccion: null }));
    const actor = { idUsuario: ID_EMPLEADO };

    await estados.cambiarEstado(codigo, { estadoActual: 'revision_disponibilidad', estadoNuevo: 'en_preparacion' }, actor);
    await estados.cambiarEstado(codigo, { estadoActual: 'en_preparacion', estadoNuevo: 'preparada' }, actor);
    await expect(
      estados.cambiarEstado(codigo, { estadoActual: 'preparada', estadoNuevo: 'despachado' }, actor),
    ).rejects.toMatchObject({ codigo: 'TRANSICION_NO_PERMITIDA' });
    await estados.cambiarEstado(codigo, { estadoActual: 'preparada', estadoNuevo: 'entregado' }, actor);

    const orden = await prisma.orden.findUnique({ where: { codigoVisible: codigo } });
    expect(orden?.estado).toBe('entregado');
  });

  it('la bandeja agrupa, filtra y ordena por tiempo en el estado con SQL real (HU-ORD-05, 08)', async () => {
    const correo = (await prisma.usuario.findUnique({ where: { idUsuario: ID_CLIENTE } }))?.correo ?? '';
    const { codigo } = await creacion.crearDesdePagoConfirmado(solicitud());

    const porEstado = await gestion.listar({ orden: 'antiguedad', estados: ['revision_disponibilidad'] });
    expect(porEstado.filas.map((f) => f.codigo)).toContain(codigo);
    const fechas = porEstado.filas.map((f) => f.entradaEstado.getTime());
    expect(fechas).toEqual([...fechas].sort((a, b) => a - b));
    expect(porEstado.total).toBe(porEstado.filas.length);

    const porCodigo = await gestion.listar({ orden: 'reciente', codigo: codigo.toLowerCase() });
    expect(porCodigo.filas.map((f) => f.codigo)).toEqual([codigo]);

    const porCorreo = await gestion.listar({ orden: 'reciente', correo: correo.slice(0, 5), cliente: ID_CLIENTE, pagina: 1, limite: 2 });
    expect(porCorreo.filas.length).toBeLessThanOrEqual(2);
    expect(porCorreo.total).toBeGreaterThanOrEqual(1);

    const esperando = await gestion.listar({ orden: 'antiguedad', diasEsperando: 365 });
    expect(esperando.filas.map((f) => f.codigo)).not.toContain(codigo);
    const hoy = await gestion.listar({ orden: 'antiguedad', diasEsperando: 0 });
    expect(hoy.filas.map((f) => f.codigo)).toContain(codigo);

    const conteo = await gestion.contarPorEstado();
    expect(conteo.find((c) => c.estado === 'revision_disponibilidad')?.cantidad).toBeGreaterThan(0);
  });

  it('un texto de búsqueda con comodines o SQL se trata como texto literal', async () => {
    const antes = await prisma.orden.count();

    const r = await gestion.listar({ orden: 'reciente', codigo: "%'; DROP TABLE orden;--" });
    const comodin = await gestion.listar({ orden: 'reciente', codigo: '%' });

    expect(r.filas).toEqual([]);
    expect(comodin.filas).toEqual([]);
    expect(await prisma.orden.count()).toBe(antes);
  });

  it('el detalle del personal trae cliente, líneas, historial con autor, notas y contactos; el del cliente no (HU-ORD-09, 10)', async () => {
    const { codigo } = await creacion.crearDesdePagoConfirmado(solicitud());
    await estados.cambiarEstado(codigo, { estadoActual: 'revision_disponibilidad', estadoNuevo: 'en_preparacion' }, { idUsuario: ID_EMPLEADO });
    const nota = await notas.agregarNota(codigo, ID_EMPLEADO, 'Cliente pidió llamar antes');
    const contacto = await notas.agregarContacto(codigo, ID_EMPLEADO, 'telefono', 'Se avisó de la demora');

    const detalle = await gestion.buscarDetalle(codigo);

    expect(nota?.idNota).toBeGreaterThan(0);
    expect(contacto?.medio).toBe('telefono');
    expect(detalle?.cliente.idUsuario).toBe(ID_CLIENTE);
    expect(detalle?.direccion).toContain('Calle 10');
    expect(detalle?.lineas[0]).toMatchObject({ esEntonado: true, baseConsumida: 'Base Deep 1 gal' });
    expect(detalle?.historial.map((h) => [h.estadoNuevo, h.autor === null])).toEqual([
      ['revision_disponibilidad', true],
      ['en_preparacion', false],
    ]);
    expect(detalle?.notas.map((n) => n.texto)).toEqual(['Cliente pidió llamar antes']);
    expect(detalle?.contactos).toHaveLength(1);

    const delCliente = await consulta.buscarDetalle(codigo);
    expect(delCliente?.idUsuario).toBe(ID_CLIENTE);
    expect(Object.keys(delCliente ?? {})).not.toContain('notas');
  });

  it('notas y contactos sobre una orden inexistente devuelven null, no error', async () => {
    expect(await notas.agregarNota('PC-2026-99999', ID_EMPLEADO, 'x')).toBeNull();
    expect(await notas.agregarContacto('PC-2026-99999', ID_EMPLEADO, 'correo', null)).toBeNull();
  });

  it('un autor inexistente no se confunde con una orden inexistente: falla y no guarda nada', async () => {
    const { codigo } = await creacion.crearDesdePagoConfirmado(solicitud());

    await expect(notas.agregarNota(codigo, 99999999, 'x')).rejects.toThrow();
    await expect(notas.agregarContacto(codigo, 99999999, 'correo', null)).rejects.toThrow();

    const detalle = await gestion.buscarDetalle(codigo);
    expect(detalle?.notas).toHaveLength(0);
    expect(detalle?.contactos).toHaveLength(0);
  });

  it('el contacto devuelve el medio recibido sin volver a interpretarlo después de guardarlo', async () => {
    const { codigo } = await creacion.crearDesdePagoConfirmado(solicitud());

    const contacto = await notas.agregarContacto(codigo, ID_EMPLEADO, 'correo', 'Aviso de demora');

    expect(contacto).toMatchObject({ medio: 'correo', detalle: 'Aviso de demora' });
  });

  it('filtra por periodo con días AAAA-MM-DD y por nombre del cliente con SQL real (RF-ORD-08-01)', async () => {
    const { codigo } = await creacion.crearDesdePagoConfirmado(solicitud());
    const hoy = new Date().toISOString().slice(0, 10);
    const manana = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const ayer = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const nombre = (await prisma.usuario.findUnique({ where: { idUsuario: ID_CLIENTE } }))?.nombre ?? '';

    const enPeriodo = await gestion.listar({ orden: 'reciente', desde: ayer, hasta: manana });
    const fueraDePeriodo = await gestion.listar({ orden: 'reciente', desde: '2020-01-01', hasta: '2020-12-31' });
    const unDia = await gestion.listar({ orden: 'reciente', desde: hoy, hasta: hoy });
    const porNombre = await gestion.listar({ orden: 'reciente', nombre: nombre.slice(1, 5).toLowerCase() });
    const ajeno = await gestion.listar({ orden: 'reciente', nombre: 'zzz-no-existe' });

    expect(enPeriodo.filas.map((f) => f.codigo)).toContain(codigo);
    expect(fueraDePeriodo.filas).toEqual([]);
    expect(unDia.filas.map((f) => f.codigo)).toContain(codigo);
    expect(porNombre.filas.map((f) => f.codigo)).toContain(codigo);
    expect(ajeno.filas).toEqual([]);
  });

  it('«Mis pedidos» lista solo del titular, busca por producto y pagina (HU-ORD-07)', async () => {
    await creacion.crearDesdePagoConfirmado(solicitud());

    const todas = await consulta.listarPorUsuario(ID_CLIENTE, { pagina: 1, limite: 100 });
    expect(todas.filas.length).toBeGreaterThan(0);
    const porProducto = await consulta.listarPorUsuario(ID_CLIENTE, { q: `vinilo ${ALEATORIO.toLowerCase()}`, pagina: 1, limite: 100 });
    expect(porProducto.total).toBeGreaterThan(0);
    const pagina = await consulta.listarPorUsuario(ID_CLIENTE, { pagina: 1, limite: 1 });
    expect(pagina.filas).toHaveLength(1);
    expect(pagina.total).toBe(todas.total);
    const ajeno = await consulta.listarPorUsuario(ID_EMPLEADO, { q: `vinilo ${ALEATORIO.toLowerCase()}`, pagina: 1, limite: 100 });
    expect(ajeno.total).toBe(0);
  });
});
