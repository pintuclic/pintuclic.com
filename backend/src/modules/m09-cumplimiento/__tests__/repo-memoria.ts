import type { EstadosTx, FilaHistorialEstado, OrdenParaEstado } from '../../m08-ordenes/interfaces/estados.interface';
import { cambiarEstadoPorCumplimiento } from '../../m08-ordenes/services/estados.service';
import { MOTIVO_AVANCE_AUTOMATICO, MOTIVO_AVANCE_PREPARADA, type EstadoMarca, type EstadoOrden } from '../dtos/m09-cumplimiento.dto';
import type {
  CumplimientoRepository,
  CumplimientoTx,
  DestinoAvance,
  FilaRetenidaDatos,
  LineaDatos,
  MarcaNueva,
  OrdenDatos,
  ResultadoAvance,
} from '../interfaces/cumplimiento.interface';

export const AHORA = new Date('2026-10-30T15:00:00Z');

interface Plantilla {
  nombreProducto: string;
  varianteCopia: string;
  cantidad?: number;
  esEntonado?: boolean;
  baseConsumida?: string | null;
  colorSolicitado?: string | null;
}

export function linea(numeroLinea: number, p: Plantilla): LineaDatos {
  return {
    idLinea: 100 + numeroLinea,
    numeroLinea,
    nombreProducto: p.nombreProducto,
    varianteCopia: p.varianteCopia,
    colorSolicitado: p.colorSolicitado ?? null,
    cantidad: p.cantidad ?? 1,
    esEntonado: p.esEntonado ?? false,
    baseConsumida: p.baseConsumida ?? null,
    registros: [],
  };
}

/** Una orden de tres líneas: un vinilo entonado, una brocha y un rodillo. */
export function ordenDe(codigo: string, estado: EstadoOrden, lineas?: LineaDatos[]): OrdenDatos {
  // Cada orden tiene claves de línea propias, como en la base: `insertarMarcas` busca la línea solo por su clave.
  const desplazamiento = Number(codigo.replace(/\D/g, '')) * 100;
  const conClaveUnica = (ls: LineaDatos[]): LineaDatos[] => ls.map((l) => ({ ...l, idLinea: desplazamiento + l.numeroLinea }));
  return {
    codigo,
    estado,
    idUsuario: 7,
    cancelacion: null,
    lineas: conClaveUnica(lineas ?? [
      linea(1, { nombreProducto: 'Vinilo Tipo 1', varianteCopia: 'Galón', cantidad: 2, esEntonado: true, baseConsumida: 'Base Deep 1 gal', colorSolicitado: 'Rojo Colonial' }),
      linea(2, { nombreProducto: 'Brocha 4"', varianteCopia: 'Unidad' }),
      linea(3, { nombreProducto: 'Rodillo felpa', varianteCopia: 'Unidad', cantidad: 3 }),
    ]),
  };
}

/**
 * Almacén en memoria con la semántica de la transacción real: si el trabajo lanza, no queda nada escrito. El avance
 * a preparación usa la función REAL de M08 (`cambiarEstadoPorCumplimiento`) sobre este mismo almacén.
 */
export class RepoMemoria implements CumplimientoRepository {
  ordenes = new Map<string, OrdenDatos>();
  historial: FilaHistorialEstado[] = [];
  entrada = new Map<string, Date>();
  nombres = new Map<number, string>([[21, 'Luis Gómez'], [22, 'Marta Ruiz']]);
  clientes = new Map<string, string>();
  /** Simula que otra persona (M11, por ejemplo) cambió la orden justo entre la lectura y el avance. */
  perderCarrera = false;
  escrituras = 0;
  private reloj = 0;

  cargar(orden: OrdenDatos, cliente = 'Ana Pérez', entrada = new Date('2026-10-29T15:00:00Z')): void {
    this.ordenes.set(orden.codigo, orden);
    this.clientes.set(orden.codigo, cliente);
    this.entrada.set(orden.codigo, entrada);
  }

  private copia(o: OrdenDatos): OrdenDatos {
    return { ...o, lineas: o.lineas.map((l) => ({ ...l, registros: l.registros.map((r) => ({ ...r })) })) };
  }

  async cargarOrden(codigo: string): Promise<OrdenDatos | null> {
    const o = this.ordenes.get(codigo);
    return o ? this.copia(o) : null;
  }

  async listarRetenidas(pagina: number, limite: number): Promise<{ filas: FilaRetenidaDatos[]; total: number }> {
    const todas = [...this.ordenes.values()]
      .filter((o) => o.estado === 'revision_disponibilidad')
      .filter((o) => o.lineas.some((l) => (l.registros[l.registros.length - 1]?.estado ?? 'pendiente') !== 'disponible'))
      .sort((a, b) => (this.entrada.get(a.codigo)?.getTime() ?? 0) - (this.entrada.get(b.codigo)?.getTime() ?? 0));
    const filas = todas.slice((pagina - 1) * limite, pagina * limite).map((o) => ({
      codigo: o.codigo,
      cliente: this.clientes.get(o.codigo) ?? 'Cliente',
      fecha: new Date('2026-10-28T00:00:00Z'),
      entradaEstado: this.entrada.get(o.codigo) ?? AHORA,
      lineas: this.copia(o).lineas,
    }));
    return { filas, total: todas.length };
  }

  async enTransaccion<T>(trabajo: (tx: CumplimientoTx) => Promise<T>): Promise<T> {
    const antesOrdenes = new Map([...this.ordenes].map(([k, v]) => [k, this.copia(v)]));
    const antesHistorial = [...this.historial];
    const antesEscrituras = this.escrituras;
    const estadosTx: EstadosTx = {
      buscarOrden: async (codigo): Promise<OrdenParaEstado | null> => {
        const o = this.ordenes.get(codigo);
        return o ? { codigo: o.codigo, estado: o.estado, modoEntrega: 'domicilio', idUsuario: o.idUsuario } : null;
      },
      actualizarEstadoSiCoincide: async (codigo, desde, hacia) => {
        const o = this.ordenes.get(codigo);
        if (this.perderCarrera || !o || o.estado !== desde) return false;
        o.estado = hacia;
        return true;
      },
      registrarHistorial: async (fila) => {
        this.historial.push(fila);
      },
      reiniciarMarcasPreparadas: async () => undefined,
    };
    const tx: CumplimientoTx = {
      cargarOrden: (codigo) => this.cargarOrden(codigo),
      insertarMarcas: async (marcas: readonly MarcaNueva[], idUsuarioAutor: number) => {
        for (const m of marcas) {
          const l = [...this.ordenes.values()].flatMap((o) => o.lineas).find((x) => x.idLinea === m.idLinea);
          if (!l) throw new Error(`Línea ${m.idLinea} inexistente`);
          this.reloj += 1;
          l.registros.push({
            estado: m.estado satisfies EstadoMarca,
            autor: this.nombres.get(idUsuarioAutor) ?? `Usuario ${idUsuarioAutor}`,
            fecha: new Date(AHORA.getTime() + this.reloj * 1000),
          });
          this.escrituras += 1;
        }
      },
      avanzar: async (codigo, hacia: DestinoAvance, idUsuarioAutor): Promise<ResultadoAvance> => {
        const motivo = hacia === 'preparada' ? MOTIVO_AVANCE_PREPARADA : MOTIVO_AVANCE_AUTOMATICO;
        const r = await cambiarEstadoPorCumplimiento(estadosTx, codigo, hacia, motivo, idUsuarioAutor);
        return r.ok ? { ok: true } : { ok: false, razon: r.razon };
      },
    };
    try {
      return await trabajo(tx);
    } catch (error) {
      this.ordenes = antesOrdenes;
      this.historial = antesHistorial;
      this.escrituras = antesEscrituras;
      throw error;
    }
  }
}
