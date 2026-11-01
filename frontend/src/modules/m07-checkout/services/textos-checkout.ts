import type { BadgeVariant } from '@/core/components';
import { CANTIDAD_MAXIMA_LINEA } from '@/modules/m06-precios/dtos/m06-precios.dto';
import type { CompraDirecta, EstadoSolicitud, Solicitud } from '../dtos/m07-checkout.dto';

/** Pasos de la compra (UI §4.7): Carrito → Pago → Orden. En la compra directa (R17) el primero es el producto. */
export const PASOS_COMPRA = ['Carrito', 'Pago', 'Orden'] as const;
export const PASOS_COMPRA_DIRECTA = ['Producto', 'Pago', 'Orden'] as const;

/** R17: la compra directa que viene en la dirección (`?idVariante=…&idColor=…&cantidad=…`); null si no la hay. */
export function compraDirectaDeUrl(params: { get(nombre: string): string | null }): CompraDirecta | null {
  const entero = (v: string | null): number | null => {
    const n = Number(v);
    return v !== null && Number.isInteger(n) && n > 0 ? n : null;
  };
  const idVariante = entero(params.get('idVariante'));
  if (idVariante === null) return null;
  return {
    idVariante,
    idColor: entero(params.get('idColor')),
    cantidad: Math.min(entero(params.get('cantidad')) ?? 1, CANTIDAD_MAXIMA_LINEA),
  };
}

export const ETIQUETA_ESTADO: Record<EstadoSolicitud, string> = {
  en_pago: 'Esperando el pago',
  rechazada: 'Pago rechazado',
  pagada: 'Pagada, creando el pedido',
  completada: 'Pedido creado',
  en_revision: 'En revisión',
  vencida: 'Vencida',
  cancelada: 'Cancelada',
};

export const VARIANTE_ESTADO: Record<EstadoSolicitud, BadgeVariant> = {
  en_pago: 'action',
  rechazada: 'danger',
  pagada: 'action',
  completada: 'success',
  en_revision: 'offer',
  vencida: 'neutral',
  cancelada: 'neutral',
};

export const FILTROS_ESTADO: ReadonlyArray<{ valor: EstadoSolicitud | null; etiqueta: string }> = [
  { valor: null, etiqueta: 'Todas' },
  { valor: 'en_revision', etiqueta: 'En revisión' },
  { valor: 'pagada', etiqueta: 'Pagadas sin pedido' },
  { valor: 'en_pago', etiqueta: 'Esperando el pago' },
  { valor: 'completada', etiqueta: 'Con pedido' },
  { valor: 'rechazada', etiqueta: 'Rechazadas' },
  { valor: 'vencida', etiqueta: 'Vencidas' },
  { valor: 'cancelada', etiqueta: 'Canceladas' },
];

export function estadoDeUrl(valor: string | null): EstadoSolicitud | null {
  return FILTROS_ESTADO.find((f) => f.valor !== null && f.valor === valor)?.valor ?? null;
}

export function paginaDeUrl(valor: string | null): number {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

/** Paso del Stepper según el estado: 1 = pago, 2 = orden. */
export function pasoDe(estado: EstadoSolicitud): number {
  return estado === 'completada' ? 2 : 1;
}

/** Mientras la pantalla deba seguir preguntando por la compra. */
export function sigueEnCurso(s: Pick<Solicitud, 'estado' | 'intentos'>): boolean {
  if (s.estado === 'pagada') return true;
  return s.estado === 'en_pago' && s.intentos.at(-1)?.estadoWompi === 'PENDING';
}

export function fechaHora(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(
    new Date(iso),
  );
}

/** Texto del envío en el resumen. */
export function textoEnvio(costo: number, formato: (n: number) => string): string {
  return costo === 0 ? 'Gratis' : formato(costo);
}

/* ── Periodo del panel de pagos (R18) ──────────────────────────────────── */

export type PeriodoRapido = 'hoy' | 'ayer' | 'ultimos7' | 'esteMes' | 'mesAnterior';

export const PERIODOS_RAPIDOS: ReadonlyArray<{ valor: PeriodoRapido; etiqueta: string }> = [
  { valor: 'hoy', etiqueta: 'Hoy' },
  { valor: 'ayer', etiqueta: 'Ayer' },
  { valor: 'ultimos7', etiqueta: 'Últimos 7 días' },
  { valor: 'esteMes', etiqueta: 'Este mes' },
  { valor: 'mesAnterior', etiqueta: 'Mes anterior' },
];

/** Días de Colombia `AAAA-MM-DD`; null en un extremo = sin límite por ese lado. */
export interface Periodo {
  desde: string | null;
  hasta: string | null;
}

export const SIN_PERIODO: Periodo = { desde: null, hasta: null };

/** Un día válido de la URL, o null (una fecha mal escrita se ignora en vez de romper la lista). */
export function diaDeUrl(valor: string | null): string | null {
  if (valor === null || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const dia = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(dia.getTime()) && dia.toISOString().slice(0, 10) === valor ? valor : null;
}

/** El periodo de la URL; si viene al revés se descarta el final. */
export function periodoDeUrl(params: { get(nombre: string): string | null }): Periodo {
  const desde = diaDeUrl(params.get('desde'));
  const hasta = diaDeUrl(params.get('hasta'));
  return { desde, hasta: desde !== null && hasta !== null && hasta < desde ? null : hasta };
}

export function idDeUrl(valor: string | null): number | null {
  const n = Number(valor);
  return valor !== null && Number.isInteger(n) && n > 0 ? n : null;
}

/** Hoy en Colombia, aunque el navegador esté en otra zona. */
export function hoyColombia(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
}

function sumarDias(dia: string, dias: number): string {
  const fecha = new Date(`${dia}T00:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

/** `AAAA-MM` → del primer al último día de ese mes. */
export function mesCompleto(mes: string): Periodo {
  const [anio, numero] = mes.split('-').map(Number) as [number, number];
  const ultimo = new Date(Date.UTC(anio, numero, 0)).getUTCDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${String(ultimo).padStart(2, '0')}` };
}

export function rangoDePeriodo(periodo: PeriodoRapido, hoy: string): Periodo {
  const inicioMes = `${hoy.slice(0, 7)}-01`;
  switch (periodo) {
    case 'hoy':
      return { desde: hoy, hasta: hoy };
    case 'ayer': {
      const ayer = sumarDias(hoy, -1);
      return { desde: ayer, hasta: ayer };
    }
    case 'ultimos7':
      return { desde: sumarDias(hoy, -6), hasta: hoy };
    case 'esteMes':
      return { desde: inicioMes, hasta: hoy };
    case 'mesAnterior':
      return mesCompleto(sumarDias(inicioMes, -1).slice(0, 7));
  }
}

/** Qué botón rápido corresponde al periodo, para marcarlo activo. */
export function periodoRapidoDe(p: Periodo, hoy: string): PeriodoRapido | null {
  return (
    PERIODOS_RAPIDOS.find((r) => {
      const rango = rangoDePeriodo(r.valor, hoy);
      return rango.desde === p.desde && rango.hasta === p.hasta;
    })?.valor ?? null
  );
}

/** El mes `AAAA-MM` si el periodo es exactamente ese mes completo. */
export function mesDe(p: Periodo): string | null {
  if (p.desde === null || p.hasta === null) return null;
  const mes = p.desde.slice(0, 7);
  const completo = mesCompleto(mes);
  return completo.desde === p.desde && completo.hasta === p.hasta ? mes : null;
}

function diaLegible(dia: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${dia}T12:00:00Z`));
}

/** "Todas las fechas", "15 oct 2026", "1 oct 2026 – 31 oct 2026", "Desde 1 oct 2026"… */
export function textoPeriodo(p: Periodo): string {
  if (p.desde === null && p.hasta === null) return 'Todas las fechas';
  if (p.desde === null) return `Hasta ${diaLegible(p.hasta ?? '')}`;
  if (p.hasta === null) return `Desde ${diaLegible(p.desde)}`;
  return p.desde === p.hasta ? diaLegible(p.desde) : `${diaLegible(p.desde)} – ${diaLegible(p.hasta)}`;
}

/** Los últimos `cantidad` meses hasta el de `hoy`, del más reciente al más antiguo: «octubre de 2026». */
export function ultimosMeses(hoy: string, cantidad = 24): Array<{ value: string; label: string }> {
  const [anio, mes] = hoy.split('-').map(Number) as [number, number];
  const formato = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return Array.from({ length: cantidad }, (_, i) => {
    const fecha = new Date(Date.UTC(anio, mes - 1 - i, 1));
    return { value: fecha.toISOString().slice(0, 7), label: formato.format(fecha) };
  });
}
