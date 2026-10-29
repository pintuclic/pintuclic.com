import type { Compradores, FacturacionReporte, PostventaReporte, ReporteDescuentos, ResumenVentas, SerieVentas, TopClientes, VentasPor } from '../dtos/m19-reportes.dto';
import { aCsv, type CeldaCsv } from './csv';

/** R11: cada reporte, en las mismas columnas que se ven en pantalla. */
const ESTADOS: Record<string, string> = {
  orden_confirmada: 'Confirmada', revision_disponibilidad: 'Revisando disponibilidad', en_preparacion: 'En alistamiento', preparada: 'Alistada',
  despachado: 'Despachada', entregado: 'Entregada', cancelado: 'Cancelada', devuelto: 'Devuelta',
};

export const csvResumen = (r: ResumenVentas): string =>
  aCsv(
    ['Indicador', `Del ${r.periodo.desde} al ${r.periodo.hasta}`, `Del ${r.periodoAnterior.desde} al ${r.periodoAnterior.hasta}`, 'Variación (%)'],
    [
      ['Órdenes', r.actual.ordenes, r.anterior.ordenes, r.variacion.ordenes],
      ['Unidades', r.actual.unidades, r.anterior.unidades, r.variacion.unidades],
      ['Ventas brutas', r.actual.ventasBrutas, r.anterior.ventasBrutas, null],
      ['Descuentos', r.actual.descuentos, r.anterior.descuentos, null],
      ['Envío', r.actual.envio, r.anterior.envio, null],
      ['Base sin IVA', r.actual.baseSinIva, r.anterior.baseSinIva, null],
      ['IVA', r.actual.iva, r.anterior.iva, null],
      ['Total cobrado', r.actual.totalCobrado, r.anterior.totalCobrado, r.variacion.totalCobrado],
      ['Ticket promedio', r.actual.ticketPromedio, r.anterior.ticketPromedio, r.variacion.ticketPromedio],
      ...r.porEstado.map((e): CeldaCsv[] => [`Órdenes ${ESTADOS[e.estado]?.toLowerCase() ?? e.estado}`, e.ordenes, null, null]),
    ],
  );

export const csvSerie = (s: SerieVentas): string =>
  aCsv(['Inicio del periodo', 'Órdenes', 'Unidades', 'Total cobrado'], s.puntos.map((p) => [p.periodo, p.ordenes, p.unidades, p.totalCobrado]));

export const csvVentasPor = (v: VentasPor): string =>
  aCsv(['Nombre', 'Órdenes', 'Unidades', 'Importe', 'Participación (%)'], v.filas.map((f) => [f.etiqueta, f.ordenes, f.unidades, f.importe, f.participacion]));

export const csvDescuentos = (d: ReporteDescuentos): string =>
  aCsv(['Origen del descuento', 'Líneas afectadas', 'Órdenes', 'Importe'], d.filas.map((f) => [f.origen, f.lineasAfectadas, f.ordenes, f.importe]));

export const csvTopClientes = (t: TopClientes): string =>
  aCsv(['Posición', 'Cliente', 'Tipo', 'Órdenes', 'Unidades', 'Total cobrado'], t.filas.map((f) => [f.posicion, f.nombre, f.tipo === 'empresa' ? 'Empresa' : 'Persona', f.ordenes, f.unidades, f.totalCobrado]));

export const csvCompradores = (c: Compradores): string =>
  aCsv(['Indicador', 'Valor'], [['Compradores', c.compradores], ['Nuevos', c.nuevos], ['Recurrentes', c.recurrentes], ['Compraron más de una vez', c.compraronMasDeUnaVez], ['Órdenes por comprador', c.ordenesPorComprador]]);

export const csvPostventa = (p: PostventaReporte): string =>
  aCsv(
    ['Concepto', 'Detalle', 'Valor'],
    [
      ['Solicitudes', 'Total', p.solicitudes],
      ...p.porTipo.map((t): CeldaCsv[] => ['Por tipo', t.tipo, t.solicitudes]),
      ...p.porEstado.map((e): CeldaCsv[] => ['Por estado', e.estado, e.solicitudes]),
      ['Reembolsos', 'Cantidad', p.reembolsos.cantidad],
      ['Reembolsos', 'Total reembolsado', p.reembolsos.totalReembolsado],
    ],
  );

export const csvFacturacion = (f: FacturacionReporte): string =>
  aCsv(['Indicador', 'Valor'], [['Ventas del periodo', f.ventas], ['Con comprobante', f.conComprobante], ['Sin comprobante', f.sinComprobante], ['Último número emitido', f.ultimoNumero]]);
