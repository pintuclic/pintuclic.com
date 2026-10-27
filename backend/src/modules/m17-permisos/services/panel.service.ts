import type { ResolutorPermisos } from '../../m20-seguridad/services/autorizacion.service';
import {
  ACCESOS_PANEL_MAXIMO,
  DIAS_CARRITO_ACTIVO,
  DIAS_VENCIMIENTO_CERCANO,
  EXISTENCIA_BAJA_MAXIMA,
  MAXIMO_FILAS_SERIE,
  PERIODO_PANEL_POR_DEFECTO,
  TOP_PRODUCTOS_PANEL,
  type AccesoPanel,
  type ClavePendientePanel,
  type EstadoCotizacionPanel,
  type NegocioPanel,
  type PendientePanel,
  type ResumenPanel,
} from '../dtos/m17-panel-resumen.dto';
import type { PanelRepositoryPort } from '../interfaces/panel.interface';
import {
  armarSerie,
  comparar,
  ctr,
  estadosCompletos,
  rangosDelPeriodo,
  redondearImporte,
  sumarDias,
  tasaAprobacion,
} from './panel-calculos';

const VENTAS = 'ventas.ver';
const CATALOGO = 'catalogo.ver';
const CREAR_CATALOGO = 'catalogo.crear';
const PERSONAL = 'personal.ver';
const PATROCINIOS = 'patrocinios.ver';
const ATENCION = 'atencion.ver';
const EMPRESAS = 'empresas.validar';
const PERMISOS_CONSULTADOS = [VENTAS, CATALOGO, CREAR_CATALOGO, PERSONAL, PATROCINIOS, ATENCION, EMPRESAS] as const;

interface DefinicionPendiente {
  clave: ClavePendientePanel;
  etiqueta: string;
  permiso: string;
  prioridad: 'alta' | 'normal';
  ruta: string;
}

/** R11: en este orden; los de prioridad alta salen primero. */
const PENDIENTES: readonly DefinicionPendiente[] = [
  { clave: 'cotizaciones_por_responder', etiqueta: 'Cotizaciones por responder', permiso: VENTAS, prioridad: 'alta', ruta: '/admin/cotizaciones?estado=solicitada' },
  { clave: 'cotizaciones_por_vencer', etiqueta: 'Cotizaciones enviadas que vencen pronto', permiso: VENTAS, prioridad: 'alta', ruta: '/admin/cotizaciones?estado=enviada' },
  { clave: 'solicitudes_contacto', etiqueta: 'Solicitudes de clientes sin atender', permiso: ATENCION, prioridad: 'normal', ruta: '/admin/atencion' },
  { clave: 'solicitudes_empresa', etiqueta: 'Cuentas de empresa por validar', permiso: EMPRESAS, prioridad: 'normal', ruta: '/admin/empresas' },
  { clave: 'solicitudes_nit', etiqueta: 'Cambios de NIT por revisar', permiso: EMPRESAS, prioridad: 'normal', ruta: '/admin/empresas' },
  { clave: 'variantes_agotadas', etiqueta: 'Presentaciones agotadas', permiso: CATALOGO, prioridad: 'normal', ruta: '/admin/inventario' },
];

interface DefinicionAcceso extends AccesoPanel {
  permiso: string;
}

/** R12: orden fijo de importancia. */
const ACCESOS: readonly DefinicionAcceso[] = [
  { clave: 'responder_cotizaciones', etiqueta: 'Responder cotizaciones', descripcion: 'Revisa las solicitudes nuevas y envía tu respuesta.', ruta: '/admin/cotizaciones?estado=solicitada', permiso: VENTAS },
  { clave: 'crear_producto', etiqueta: 'Crear un producto', descripcion: 'Agrega pinturas, herramientas y combos al catálogo.', ruta: '/admin/catalogo', permiso: CREAR_CATALOGO },
  { clave: 'ajustar_inventario', etiqueta: 'Ajustar inventario', descripcion: 'Corrige existencias y revisa el historial de cambios.', ruta: '/admin/inventario', permiso: CATALOGO },
  { clave: 'crear_promocion', etiqueta: 'Crear una promoción', descripcion: 'Eventos de descuento y cupones para vender más.', ruta: '/admin/promociones', permiso: CATALOGO },
  { clave: 'gestionar_campanias', etiqueta: 'Campañas y anuncios', descripcion: 'Destaca productos y publica anuncios en la tienda.', ruta: '/admin/patrocinios', permiso: PATROCINIOS },
  { clave: 'atender_solicitudes', etiqueta: 'Atender clientes', descripcion: 'Responde las solicitudes de contacto.', ruta: '/admin/atencion', permiso: ATENCION },
  { clave: 'validar_empresas', etiqueta: 'Validar empresas', descripcion: 'Aprueba las cuentas de empresa y los cambios de NIT.', ruta: '/admin/empresas', permiso: EMPRESAS },
  { clave: 'ver_clientes', etiqueta: 'Directorio de clientes', descripcion: 'Busca clientes y revisa su historial.', ruta: '/admin/clientes', permiso: PERSONAL },
  { clave: 'gestionar_colaboradores', etiqueta: 'Colaboradores y permisos', descripcion: 'Altas del personal y permisos de cada persona.', ruta: '/admin/empleados', permiso: PERSONAL },
];

export class PanelService {
  constructor(
    private readonly repo: PanelRepositoryPort,
    private readonly permisos: ResolutorPermisos,
    private readonly reloj: () => Date = () => new Date(),
  ) {}

  /**
   * Arma el resumen (contrato M17 · resumen). Devuelve null si la persona no tiene permiso para ningún bloque (R1): la ruta
   * responde entonces el 404 opaco de siempre.
   */
  async resumen(idUsuario: number, dias: 7 | 30 | 90 = PERIODO_PANEL_POR_DEFECTO): Promise<ResumenPanel | null> {
    const concedidos = new Set<string>();
    await Promise.all(
      PERMISOS_CONSULTADOS.map(async (codigo) => {
        if (await this.permisos.tienePermiso(idUsuario, codigo)) concedidos.add(codigo);
      }),
    );
    const tiene = (codigo: string): boolean => concedidos.has(codigo);
    const veNegocio = tiene(VENTAS);
    const veCatalogo = tiene(CATALOGO);
    const vePersonas = tiene(PERSONAL);
    const vePatrocinios = tiene(PATROCINIOS);
    if (!veNegocio && !veCatalogo && !vePersonas && !vePatrocinios) return null;

    const ahora = this.reloj();
    const rangos = rangosDelPeriodo(ahora, dias);
    // Las columnas de fecha (sin hora) se comparan con el día de Colombia a medianoche UTC.
    const hoyFecha = new Date(Date.parse(`${rangos.hoy}T00:00:00.000Z`));
    const desdeDia = new Date(Date.parse(`${sumarDias(rangos.hoy, -(dias - 1))}T00:00:00.000Z`));
    const anteriorDesdeDia = new Date(Date.parse(`${sumarDias(rangos.hoy, -(2 * dias - 1))}T00:00:00.000Z`));
    const anteriorHastaDia = new Date(desdeDia.getTime() - 24 * 60 * 60 * 1000);
    const permitidas = PENDIENTES.filter((p) => tiene(p.permiso));

    const [negocio, carritos, catalogo, descuentos, personas, patrocinios, conteos] = await Promise.all([
      veNegocio ? this.negocio(rangos) : null,
      veNegocio ? this.repo.carritos(new Date(ahora.getTime() - DIAS_CARRITO_ACTIVO * 24 * 60 * 60 * 1000)) : null,
      veCatalogo ? this.repo.catalogo(EXISTENCIA_BAJA_MAXIMA) : null,
      veCatalogo ? this.descuentos(rangos, ahora, hoyFecha) : null,
      vePersonas ? this.repo.personas() : null,
      vePatrocinios ? this.patrocinios(hoyFecha, desdeDia, anteriorDesdeDia, anteriorHastaDia) : null,
      permitidas.length === 0
        ? null
        : this.repo.pendientes(new Set(permitidas.map((p) => p.clave)), new Date(Date.parse(`${sumarDias(rangos.hoy, DIAS_VENCIMIENTO_CERCANO)}T00:00:00.000Z`))),
    ]);

    const pendientes: PendientePanel[] = permitidas
      .map((p) => ({ clave: p.clave, etiqueta: p.etiqueta, total: conteos?.[p.clave] ?? 0, prioridad: p.prioridad, ruta: p.ruta }))
      .filter((p): p is PendientePanel => p.total > 0)
      .sort((a, b) => Number(b.prioridad === 'alta') - Number(a.prioridad === 'alta'));

    const accesos: AccesoPanel[] = ACCESOS.filter((a) => tiene(a.permiso))
      .slice(0, ACCESOS_PANEL_MAXIMO)
      .map((a) => ({ clave: a.clave, etiqueta: a.etiqueta, descripcion: a.descripcion, ruta: a.ruta }));

    return { dias, generadoEn: ahora.toISOString(), negocio, carritos, catalogo, descuentos, personas, patrocinios, pendientes, accesos };
  }

  private async negocio(rangos: ReturnType<typeof rangosDelPeriodo>): Promise<NegocioPanel> {
    const [actual, anterior, filas, top] = await Promise.all([
      this.repo.cotizacionesPorEstado(rangos.desde, rangos.hasta),
      this.repo.cotizacionesPorEstado(rangos.anteriorDesde, rangos.desde),
      this.repo.filasCotizaciones(rangos.desde, rangos.hasta, MAXIMO_FILAS_SERIE),
      this.repo.topProductosCotizados(rangos.desde, rangos.hasta, TOP_PRODUCTOS_PANEL),
    ]);
    const totales = (filasEstado: typeof actual) => ({
      cotizaciones: filasEstado.reduce((s, f) => s + f.total, 0),
      cotizado: filasEstado.reduce((s, f) => s + f.sumaReferencia, 0),
      aprobado: filasEstado.filter((f) => f.estado === 'aprobada').reduce((s, f) => s + f.sumaAcordado + f.sumaReferenciaSinAcordado, 0),
    });
    const a = totales(actual);
    const p = totales(anterior);
    const porEstado = new Map<EstadoCotizacionPanel, number>(actual.map((f) => [f.estado, f.total]));
    return {
      cotizaciones: comparar(a.cotizaciones, p.cotizaciones),
      valorCotizado: comparar(a.cotizado, p.cotizado),
      valorAprobado: comparar(a.aprobado, p.aprobado),
      tasaAprobacion: tasaAprobacion(porEstado),
      porEstado: estadosCompletos(porEstado),
      serie: armarSerie(
        filas.map((f) => ({ fecha: f.fecha, valor: f.valor })),
        rangos,
      ),
      topProductos: top,
    };
  }

  private async descuentos(rangos: ReturnType<typeof rangosDelPeriodo>, ahora: Date, hoy: Date): Promise<NonNullable<ResumenPanel['descuentos']>> {
    const [eventosVigentes, cuponesVigentes, actual, anterior] = await Promise.all([
      this.repo.eventosVigentes(hoy),
      this.repo.cuponesVigentes(ahora),
      this.repo.usosCupon(rangos.desde, rangos.hasta),
      this.repo.usosCupon(rangos.anteriorDesde, rangos.desde),
    ]);
    return {
      eventosVigentes,
      cuponesVigentes,
      usosCupon: comparar(actual.usos, anterior.usos),
      descuentoOtorgado: { actual: redondearImporte(actual.importe), anterior: redondearImporte(anterior.importe) },
    };
  }

  private async patrocinios(
    hoy: Date,
    desdeDia: Date,
    anteriorDesdeDia: Date,
    anteriorHastaDia: Date,
  ): Promise<NonNullable<ResumenPanel['patrocinios']>> {
    const [campaniasVigentes, anunciosActivos, actual, anterior] = await Promise.all([
      this.repo.campaniasVigentes(hoy),
      this.repo.anunciosActivos(hoy),
      this.repo.mediciones(desdeDia, hoy),
      this.repo.mediciones(anteriorDesdeDia, anteriorHastaDia),
    ]);
    return {
      campaniasVigentes,
      anunciosActivos,
      impresiones: comparar(actual.impresiones, anterior.impresiones),
      clics: comparar(actual.clics, anterior.clics),
      ctr: ctr(actual.clics, actual.impresiones),
    };
  }
}
