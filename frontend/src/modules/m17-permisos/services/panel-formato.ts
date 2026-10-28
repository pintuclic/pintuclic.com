import type { Comparacion, EstadoCotizacionPanel, PuntoSerie } from '../dtos/m17-panel-resumen.dto';

const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const numeros = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });

/** Cantidades enteras con separador de miles: 12345 → «12.345». */
export const formatoEntero = (valor: number): string => numeros.format(valor);

/** Pesos completos hasta un millón y abreviados después: «$ 85.900», «$ 2,3 M», «$ 1.250 M». */
export function formatoPesosCorto(valor: number): string {
  if (Math.abs(valor) < 1_000_000) return pesos.format(valor);
  return `$ ${decimal.format(valor / 1_000_000)} M`;
}

export const formatoPorcentaje = (valor: number): string => `${decimal.format(valor)} %`;

export interface VariacionTexto {
  texto: string;
  /** `positive` sube, `negative` baja, `neutral` no hay cambio o no hay con qué comparar. */
  tipo: 'positive' | 'negative' | 'neutral';
}

/**
 * Cuánto cambió una cifra frente al periodo anterior. Sin periodo anterior con qué comparar no se inventa un porcentaje:
 * se dice «Nuevo» (o «Sin cambio» si ambos son cero).
 */
export function variacion(c: Comparacion): VariacionTexto {
  if (c.anterior === 0) return c.actual === 0 ? { texto: 'Sin cambio', tipo: 'neutral' } : { texto: 'Nuevo', tipo: 'positive' };
  const cambio = Math.round(((c.actual - c.anterior) / c.anterior) * 100);
  if (cambio === 0) return { texto: 'Sin cambio', tipo: 'neutral' };
  return { texto: `${cambio > 0 ? '+' : '−'}${Math.abs(cambio)} %`, tipo: cambio > 0 ? 'positive' : 'negative' };
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** «2026-10-27» → «27 oct». */
export function fechaCorta(dia: string): string {
  const [, mes, d] = dia.split('-');
  return `${Number(d)} ${MESES[Number(mes) - 1] ?? ''}`;
}

/** Cómo se llama cada estado en el panel (como en la pantalla de cotizaciones: «borrador» va con «En revisión»). */
export const ETIQUETA_ESTADO_COTIZACION: Record<EstadoCotizacionPanel, string> = {
  solicitada: 'En revisión',
  borrador: 'En revisión',
  enviada: 'Respondidas',
  aprobada: 'Aceptadas',
  rechazada: 'Rechazadas',
  vencida: 'Vencidas',
};

export interface TramoEstado {
  clave: 'revision' | 'respondidas' | 'aceptadas' | 'rechazadas' | 'vencidas';
  etiqueta: string;
  total: number;
  /** Porcentaje del total de cotizaciones del periodo (0 si no hay ninguna). */
  porcentaje: number;
  /** Estado de cotización al que lleva el enlace «Ver». */
  estado: EstadoCotizacionPanel;
}

/** Los seis estados del contrato en cinco tramos: «solicitada» y «borrador» se muestran juntos como «En revisión». */
export function tramosDeEstado(porEstado: ReadonlyArray<{ estado: EstadoCotizacionPanel; total: number }>): TramoEstado[] {
  const total = (...estados: EstadoCotizacionPanel[]): number => porEstado.filter((e) => estados.includes(e.estado)).reduce((s, e) => s + e.total, 0);
  const suma = porEstado.reduce((s, e) => s + e.total, 0);
  const tramo = (clave: TramoEstado['clave'], etiqueta: string, n: number, estado: EstadoCotizacionPanel): TramoEstado => ({
    clave,
    etiqueta,
    total: n,
    porcentaje: suma === 0 ? 0 : (n / suma) * 100,
    estado,
  });
  return [
    tramo('revision', 'En revisión', total('solicitada', 'borrador'), 'solicitada'),
    tramo('respondidas', 'Respondidas', total('enviada'), 'enviada'),
    tramo('aceptadas', 'Aceptadas', total('aprobada'), 'aprobada'),
    tramo('rechazadas', 'Rechazadas', total('rechazada'), 'rechazada'),
    tramo('vencidas', 'Vencidas', total('vencida'), 'vencida'),
  ];
}

export interface BarraSerie {
  fecha: string;
  cotizaciones: number;
  valor: number;
  x: number;
  y: number;
  ancho: number;
  alto: number;
  esHoy: boolean;
}

/**
 * Las barras del gráfico de cotizaciones por día, dentro de una caja `ancho × alto`. La barra más alta ocupa todo el alto;
 * un día con cotizaciones nunca queda invisible (mínimo 2 px) y un día sin ninguna no pinta barra (alto 0).
 */
export function barrasDeSerie(serie: readonly PuntoSerie[], ancho: number, alto: number): { barras: BarraSerie[]; maximo: number } {
  const maximo = Math.max(1, ...serie.map((p) => p.cotizaciones));
  const paso = serie.length === 0 ? 0 : ancho / serie.length;
  const separacion = Math.min(4, paso * 0.25);
  const barras = serie.map((p, i) => {
    const altoBarra = p.cotizaciones === 0 ? 0 : Math.max(2, (p.cotizaciones / maximo) * alto);
    return {
      fecha: p.fecha,
      cotizaciones: p.cotizaciones,
      valor: p.valor,
      x: i * paso + separacion / 2,
      y: alto - altoBarra,
      ancho: Math.max(1, paso - separacion),
      alto: altoBarra,
      esHoy: i === serie.length - 1,
    };
  });
  return { barras, maximo };
}

/** Frase para lectores de pantalla que resume el gráfico. */
export function resumenAccesibleSerie(serie: readonly PuntoSerie[]): string {
  const total = serie.reduce((s, p) => s + p.cotizaciones, 0);
  if (total === 0) return `Sin cotizaciones en los últimos ${serie.length} días.`;
  const mejor = serie.reduce((a, b) => (b.cotizaciones > a.cotizaciones ? b : a));
  return `${formatoEntero(total)} cotizaciones en los últimos ${serie.length} días; el día con más fue el ${fechaCorta(mejor.fecha)}, con ${mejor.cotizaciones}.`;
}
