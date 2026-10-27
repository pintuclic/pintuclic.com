import { AxiosError, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrdenDetalleGestion, OrdenResumen } from '../dtos/m08-ordenes.dto';

const api = vi.hoisted(() => ({
  listarMisPedidos: vi.fn(),
  listarBandeja: vi.fn(),
  listarBandejaAgrupada: vi.fn(),
  listarHistorialCliente: vi.fn(),
  obtenerDetalleGestion: vi.fn(),
  obtenerResumenGestion: vi.fn(),
  cambiarEstado: vi.fn(),
  crearNota: vi.fn(),
  crearContacto: vi.fn(),
}));
vi.mock('../services/ordenes-api', () => api);

import { hayFiltrosActivos, useGestionStore } from '../store/gestionStore';
import { pedidosVisibles, useMisPedidosStore } from '../store/misPedidosStore';

function resumen(codigo: string, fecha: string, estado: OrdenResumen['estado'] = 'en_preparacion'): OrdenResumen {
  return { codigo, fecha, total: 1000, estado, modoEntrega: 'domicilio' };
}
const PAGINACION = { pagina: 1, limite: 10, total: 3, totalPaginas: 1 };

function detalle(sobrescribir: Partial<OrdenDetalleGestion> = {}): OrdenDetalleGestion {
  return {
    codigo: 'PC-2026-00001',
    fecha: '2026-10-20T00:00:00.000Z',
    total: 90000,
    estado: 'orden_confirmada',
    modoEntrega: 'domicilio',
    origen: 'carrito',
    subTotal: 100000,
    descuento: 10000,
    costoEntrega: 0,
    baseSinImpuesto: null,
    importeIva: null,
    tasaIva: 19,
    cliente: { idUsuario: 7, nombre: 'Ana', correo: 'ana@correo.co', telefono: null },
    direccion: null,
    codigoSolicitud: null,
    idCotizacion: null,
    observaciones: null,
    lineas: [],
    historial: [],
    notas: [],
    contactos: [],
    transicionesPermitidas: ['revision_disponibilidad'],
    ...sobrescribir,
  };
}

function errorApi(status: number, code: string, message: string): AxiosError {
  return new AxiosError('fallo', 'ERR', undefined, undefined, {
    status,
    data: { success: false, error: { code, message, details: null } },
  } as AxiosResponse);
}

describe('M08 · store de «Mis pedidos» (HU-ORD-07)', () => {
  beforeEach(() => {
    Object.values(api).forEach((m) => m.mockReset());
    useMisPedidosStore.setState({
      enCurso: [],
      finalizados: [],
      total: 0,
      pagina: 1,
      totalPaginas: 1,
      filtro: 'todos',
      busqueda: '',
      cargando: false,
      error: null,
    });
  });

  it('carga en curso y finalizados con la paginación del servidor', async () => {
    api.listarMisPedidos.mockResolvedValue({
      enCurso: [resumen('PC-2026-00003', '2026-05-12T00:00:00.000Z')],
      finalizados: [resumen('PC-2026-00001', '2026-04-22T00:00:00.000Z', 'entregado')],
      paginacion: { ...PAGINACION, totalPaginas: 5, total: 42 },
    });

    await useMisPedidosStore.getState().cargar();

    const s = useMisPedidosStore.getState();
    expect(s.enCurso).toHaveLength(1);
    expect(s.finalizados).toHaveLength(1);
    expect(s.total).toBe(42);
    expect(s.totalPaginas).toBe(5);
    expect(s.cargando).toBe(false);
  });

  it('muestra el mensaje de la API cuando falla la carga', async () => {
    api.listarMisPedidos.mockRejectedValue(errorApi(500, 'ERROR_INTERNO', 'No fue posible completar la operación.'));

    await useMisPedidosStore.getState().cargar();

    expect(useMisPedidosStore.getState().error).toBe('No fue posible completar la operación.');
  });

  it('buscar vuelve a la página 1 y envía el texto recortado (CA-ORD-07-03)', async () => {
    api.listarMisPedidos.mockResolvedValue({ enCurso: [], finalizados: [], paginacion: PAGINACION });
    useMisPedidosStore.setState({ pagina: 4 });

    await useMisPedidosStore.getState().establecerBusqueda('  vinilo ');

    expect(api.listarMisPedidos).toHaveBeenCalledWith({ q: 'vinilo', pagina: 1, limite: 10 });
  });

  it('cambiar de página consulta esa página', async () => {
    api.listarMisPedidos.mockResolvedValue({ enCurso: [], finalizados: [], paginacion: PAGINACION });

    await useMisPedidosStore.getState().establecerPagina(2);

    expect(api.listarMisPedidos).toHaveBeenCalledWith({ pagina: 2, limite: 10 });
  });

  it('el filtro de estado reparte lo cargado sin volver a consultar', () => {
    useMisPedidosStore.getState().establecerFiltro('finalizados');

    expect(useMisPedidosStore.getState().filtro).toBe('finalizados');
    expect(api.listarMisPedidos).not.toHaveBeenCalled();
  });

  it('descarta la respuesta de una consulta anterior que llega tarde', async () => {
    let resolverLenta: (v: unknown) => void = () => undefined;
    api.listarMisPedidos.mockImplementationOnce(() => new Promise((r) => (resolverLenta = r)));
    api.listarMisPedidos.mockResolvedValueOnce({
      enCurso: [resumen('PC-2026-00002', '2026-05-12T00:00:00.000Z')],
      finalizados: [],
      paginacion: PAGINACION,
    });

    const lenta = useMisPedidosStore.getState().cargar();
    await useMisPedidosStore.getState().cargar();
    resolverLenta({ enCurso: [resumen('PC-2026-00009', '2026-01-01T00:00:00.000Z')], finalizados: [], paginacion: PAGINACION });
    await lenta;

    expect(useMisPedidosStore.getState().enCurso.map((o) => o.codigo)).toEqual(['PC-2026-00002']);
  });

  it('«Todos» junta ambos grupos de lo más reciente a lo más antiguo; los otros filtros muestran su grupo', () => {
    const enCurso = [resumen('PC-2026-00003', '2026-05-12T00:00:00.000Z')];
    const finalizados = [
      resumen('PC-2026-00001', '2026-04-22T00:00:00.000Z', 'entregado'),
      resumen('PC-2026-00002', '2026-05-20T00:00:00.000Z', 'despachado'),
    ];

    expect(pedidosVisibles(enCurso, finalizados, 'todos').map((o) => o.codigo)).toEqual([
      'PC-2026-00002',
      'PC-2026-00003',
      'PC-2026-00001',
    ]);
    expect(pedidosVisibles(enCurso, finalizados, 'en_curso')).toHaveLength(1);
    expect(pedidosVisibles(enCurso, finalizados, 'finalizados')).toHaveLength(2);
  });
});

describe('M08 · store de gestión (HU-ORD-03, 05, 08, 09, 10, 11)', () => {
  beforeEach(() => {
    Object.values(api).forEach((m) => m.mockReset());
    api.obtenerResumenGestion.mockResolvedValue([]);
    useGestionStore.setState({
      filtros: {},
      grupos: [],
      resultados: [],
      paginacion: null,
      resumen: [],
      detalle: null,
      historialCliente: [],
      historialClienteError: false,
      bandejaTruncada: false,
      resumenObsoleto: false,
      cargando: false,
      cargandoDetalle: false,
      operando: false,
      error: null,
      aviso: null,
    });
  });

  it('hayFiltrosActivos distingue la bandeja agrupada de una búsqueda', () => {
    expect(hayFiltrosActivos({})).toBe(false);
    expect(hayFiltrosActivos({ pagina: 2 })).toBe(false);
    expect(hayFiltrosActivos({ nombre: 'Ana' })).toBe(true);
    expect(hayFiltrosActivos({ correo: 'ana@' })).toBe(true);
    expect(hayFiltrosActivos({ estado: 'preparada' })).toBe(true);
  });

  it('sin filtros carga la bandeja agrupada por estado', async () => {
    api.listarBandejaAgrupada.mockResolvedValue({ grupos: [{ estado: 'orden_confirmada', ordenes: [] }], truncada: false });

    await useGestionStore.getState().cargarBandeja();

    expect(useGestionStore.getState().grupos).toHaveLength(1);
    expect(useGestionStore.getState().bandejaTruncada).toBe(false);
    expect(api.listarBandeja).not.toHaveBeenCalled();
  });

  it('recuerda que la bandeja se truncó para avisar al empleado, no la recorta en silencio', async () => {
    api.listarBandejaAgrupada.mockResolvedValue({ grupos: [], truncada: true });

    await useGestionStore.getState().cargarBandeja();

    expect(useGestionStore.getState().bandejaTruncada).toBe(true);
  });

  it('si el contador no se puede actualizar lo marca como desactualizado y lo registra, no lo deja en silencio', async () => {
    const consola = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    api.obtenerResumenGestion.mockRejectedValue(new Error('caído'));

    await useGestionStore.getState().cargarResumen();

    expect(useGestionStore.getState().resumenObsoleto).toBe(true);
    expect(consola).toHaveBeenCalledTimes(1);

    api.obtenerResumenGestion.mockResolvedValue([{ estado: 'orden_confirmada', cantidad: 2 }]);
    await useGestionStore.getState().cargarResumen();
    expect(useGestionStore.getState().resumenObsoleto).toBe(false);
  });

  it('si no se pudo cargar el historial del cliente lo distingue de «sin compras»', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    api.obtenerDetalleGestion.mockResolvedValue(detalle());
    api.listarHistorialCliente.mockRejectedValue(new Error('caído'));

    await useGestionStore.getState().abrirDetalle('PC-2026-00001');

    expect(useGestionStore.getState().historialClienteError).toBe(true);
    expect(useGestionStore.getState().historialCliente).toEqual([]);
  });

  it('descarta el detalle de un pedido que llega tarde cuando ya se abrió otro (no opera sobre el equivocado)', async () => {
    let resolverA: (v: OrdenDetalleGestion) => void = () => undefined;
    api.obtenerDetalleGestion.mockImplementationOnce(() => new Promise((r) => (resolverA = r)));
    api.obtenerDetalleGestion.mockResolvedValueOnce(detalle({ codigo: 'PC-2026-00002' }));
    api.listarHistorialCliente.mockResolvedValue({ filas: [], paginacion: PAGINACION });

    const lenta = useGestionStore.getState().abrirDetalle('PC-2026-00001');
    await useGestionStore.getState().abrirDetalle('PC-2026-00002');
    resolverA(detalle({ codigo: 'PC-2026-00001' }));
    await lenta;

    expect(useGestionStore.getState().detalle?.codigo).toBe('PC-2026-00002');
  });

  it('cerrar el detalle invalida lo que estaba en vuelo: no «resucita» al volver a la bandeja', async () => {
    let resolver: (v: OrdenDetalleGestion) => void = () => undefined;
    api.obtenerDetalleGestion.mockImplementationOnce(() => new Promise((r) => (resolver = r)));

    const enVuelo = useGestionStore.getState().abrirDetalle('PC-2026-00001');
    useGestionStore.getState().cerrarDetalle();
    resolver(detalle());
    await enVuelo;

    expect(useGestionStore.getState().detalle).toBeNull();
    expect(useGestionStore.getState().cargandoDetalle).toBe(false);
  });

  it('una nota que termina de guardarse tras abrir OTRO pedido no se muestra en ese otro', async () => {
    useGestionStore.setState({ detalle: detalle({ codigo: 'PC-2026-00001' }) });
    let terminar: (v: unknown) => void = () => undefined;
    api.crearNota.mockImplementationOnce(() => new Promise((r) => (terminar = r)));

    const guardando = useGestionStore.getState().agregarNota({ texto: 'x' });
    useGestionStore.setState({ detalle: detalle({ codigo: 'PC-2026-00002' }) });
    terminar({ idNota: 1, texto: 'x', autor: 'Luis', fecha: '2026-10-24T15:00:00.000Z' });
    await guardando;

    const actual = useGestionStore.getState().detalle;
    expect(actual?.codigo).toBe('PC-2026-00002');
    expect(actual?.notas).toEqual([]);
    expect(useGestionStore.getState().operando).toBe(false);
  });

  it('mientras hay una operación en curso no admite otra', async () => {
    useGestionStore.setState({ detalle: detalle(), operando: true });

    expect(await useGestionStore.getState().agregarNota({ texto: 'x' })).toBe(false);
    expect(await useGestionStore.getState().agregarContacto({ medio: 'correo' })).toBe(false);
    expect(
      await useGestionStore.getState().cambiarEstado({ estadoActual: 'orden_confirmada', estadoNuevo: 'revision_disponibilidad' }),
    ).toBe(false);
    expect(api.crearNota).not.toHaveBeenCalled();
    expect(api.cambiarEstado).not.toHaveBeenCalled();
  });

  it('tras un conflicto recarga el pedido sin vaciar la pantalla (no parpadea con el esqueleto)', async () => {
    useGestionStore.setState({ detalle: detalle() });
    api.cambiarEstado.mockRejectedValue(errorApi(409, 'ESTADO_CAMBIADO', 'La orden cambió de estado.'));
    api.obtenerDetalleGestion.mockResolvedValue(detalle({ estado: 'revision_disponibilidad' }));
    api.listarHistorialCliente.mockResolvedValue({ filas: [], paginacion: PAGINACION });
    const vistos: Array<string | null> = [];
    const cancelar = useGestionStore.subscribe((s) => vistos.push(s.detalle?.estado ?? null));

    await useGestionStore.getState().cambiarEstado({ estadoActual: 'orden_confirmada', estadoNuevo: 'revision_disponibilidad' });
    cancelar();

    expect(vistos).not.toContain(null);
    expect(useGestionStore.getState().detalle?.estado).toBe('revision_disponibilidad');
  });

  it('con filtros hace una búsqueda paginada desde la página 1 (CA-ORD-08-02)', async () => {
    api.listarBandeja.mockResolvedValue({ filas: [], paginacion: PAGINACION });

    await useGestionStore.getState().establecerFiltros({ correo: 'ana@correo.co' });

    expect(api.listarBandeja).toHaveBeenCalledWith({ orden: 'reciente', correo: 'ana@correo.co', pagina: 1 });
    expect(useGestionStore.getState().grupos).toEqual([]);
  });

  it('limpiar los filtros vuelve a la bandeja agrupada', async () => {
    api.listarBandejaAgrupada.mockResolvedValue({ grupos: [], truncada: false });
    useGestionStore.setState({ filtros: { correo: 'ana@' } });

    await useGestionStore.getState().limpiarFiltros();

    expect(useGestionStore.getState().filtros).toEqual({});
    expect(api.listarBandejaAgrupada).toHaveBeenCalled();
  });

  it('abrir un pedido trae el detalle y las compras anteriores del cliente (CA-ORD-11-01)', async () => {
    api.obtenerDetalleGestion.mockResolvedValue(detalle());
    api.listarHistorialCliente.mockResolvedValue({
      filas: [{ ...resumen('PC-2026-00001', '2026-10-20T00:00:00.000Z'), cliente: 'Ana', segundosEnEstado: 60 }],
      paginacion: PAGINACION,
    });

    await useGestionStore.getState().abrirDetalle('PC-2026-00001');

    const s = useGestionStore.getState();
    expect(s.detalle?.codigo).toBe('PC-2026-00001');
    expect(s.historialCliente).toHaveLength(1);
  });

  it('si el historial del cliente falla, el detalle sigue disponible', async () => {
    api.obtenerDetalleGestion.mockResolvedValue(detalle());
    api.listarHistorialCliente.mockRejectedValue(new Error('caído'));

    await useGestionStore.getState().abrirDetalle('PC-2026-00001');

    expect(useGestionStore.getState().detalle).not.toBeNull();
    expect(useGestionStore.getState().error).toBeNull();
  });

  it('un pedido que no se puede abrir deja el mensaje de la API', async () => {
    api.obtenerDetalleGestion.mockRejectedValue(errorApi(404, 'RECURSO_NO_DISPONIBLE', 'El recurso solicitado no está disponible.'));

    await useGestionStore.getState().abrirDetalle('PC-2026-99999');

    expect(useGestionStore.getState().detalle).toBeNull();
    expect(useGestionStore.getState().error).toBe('El recurso solicitado no está disponible.');
  });

  it('cambiar el estado actualiza el detalle y refresca el contador', async () => {
    useGestionStore.setState({ detalle: detalle() });
    api.cambiarEstado.mockResolvedValue(detalle({ estado: 'revision_disponibilidad' }));

    const ok = await useGestionStore.getState().cambiarEstado({
      estadoActual: 'orden_confirmada',
      estadoNuevo: 'revision_disponibilidad',
    });

    expect(ok).toBe(true);
    expect(useGestionStore.getState().detalle?.estado).toBe('revision_disponibilidad');
    expect(api.cambiarEstado).toHaveBeenCalledWith('PC-2026-00001', {
      estadoActual: 'orden_confirmada',
      estadoNuevo: 'revision_disponibilidad',
    });
    expect(api.obtenerResumenGestion).toHaveBeenCalled();
  });

  it('si un compañero se adelantó, avisa y recarga el estado real (CA-ORD-05-08)', async () => {
    useGestionStore.setState({ detalle: detalle() });
    api.cambiarEstado.mockRejectedValue(errorApi(409, 'ESTADO_CAMBIADO', 'La orden cambió de estado.'));
    api.obtenerDetalleGestion.mockResolvedValue(detalle({ estado: 'revision_disponibilidad' }));
    api.listarHistorialCliente.mockResolvedValue({ filas: [], paginacion: PAGINACION });

    const ok = await useGestionStore.getState().cambiarEstado({
      estadoActual: 'orden_confirmada',
      estadoNuevo: 'revision_disponibilidad',
    });

    expect(ok).toBe(false);
    expect(useGestionStore.getState().detalle?.estado).toBe('revision_disponibilidad');
    expect(useGestionStore.getState().error).toBe('La orden cambió de estado.');
  });

  it('una nota y un contacto nuevos se añaden al detalle sin tocar los anteriores', async () => {
    useGestionStore.setState({ detalle: detalle() });
    api.crearNota.mockResolvedValue({ idNota: 1, texto: 'x', autor: 'Luis', fecha: '2026-10-24T15:00:00.000Z' });
    api.crearContacto.mockResolvedValue({
      idContacto: 2,
      medio: 'correo',
      detalle: null,
      autor: 'Luis',
      fecha: '2026-10-24T15:00:00.000Z',
    });

    expect(await useGestionStore.getState().agregarNota({ texto: 'x' })).toBe(true);
    expect(await useGestionStore.getState().agregarContacto({ medio: 'correo' })).toBe(true);

    const d = useGestionStore.getState().detalle;
    expect(d?.notas).toHaveLength(1);
    expect(d?.contactos).toHaveLength(1);
  });

  it('sin un pedido abierto no opera', async () => {
    expect(await useGestionStore.getState().agregarNota({ texto: 'x' })).toBe(false);
    expect(api.crearNota).not.toHaveBeenCalled();
  });
});
