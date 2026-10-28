import type {
  AplicarCargaRequest,
  BalanceCarga,
  FilaCarga,
  MotivoRechazo,
  PrevisualizarCargaRequest,
  ResultadoFilaCarga,
} from '../dtos/m13-inventario.dto';
import { EXISTENCIA_MAXIMA } from '../dtos/m13-inventario.dto';
import type { CambioCarga, InventarioRepositoryPort, VarianteBuscable } from '../interfaces/inventario.interface';
import { clavePorNombre, normalizar } from './normalizar';

export interface ResultadoCarga {
  aplicada: boolean;
  idCarga: string | null;
  balance: BalanceCarga;
  filas: ResultadoFilaCarga[];
}

interface Evaluacion {
  filas: ResultadoFilaCarga[];
  /** Por índice de fila, lo que hay que escribir (solo filas "modificada"). */
  cambios: Map<number, CambioCarga>;
}

/** Índices de la búsqueda de variantes por SKU y por marca + producto + medida (R5). */
interface Indices {
  porSku: Map<string, VarianteBuscable>;
  porNombre: Map<string, VarianteBuscable | null>;
}

function construirIndices(variantes: readonly VarianteBuscable[]): Indices {
  const porSku = new Map<string, VarianteBuscable>();
  const porNombre = new Map<string, VarianteBuscable | null>();
  for (const v of variantes) {
    porSku.set(normalizar(v.sku), v);
    const clave = clavePorNombre(v.marca, v.producto, v.medida);
    // Dos variantes que se llaman igual una vez normalizadas son ambiguas: no se adivina.
    porNombre.set(clave, porNombre.has(clave) ? null : v);
  }
  return { porSku, porNombre };
}

type Identificacion =
  | { tipo: 'ausente' }
  | { tipo: 'no_encontrada' }
  | { tipo: 'encontrada'; variante: VarianteBuscable };

/** R5: manda el SKU; sin SKU se usa marca + producto + medida completos. */
function identificar(fila: FilaCarga, indices: Indices): Identificacion {
  if (fila.sku !== undefined) {
    const v = indices.porSku.get(normalizar(fila.sku));
    return v === undefined ? { tipo: 'no_encontrada' } : { tipo: 'encontrada', variante: v };
  }
  if (fila.marca === undefined || fila.producto === undefined || fila.medida === undefined) {
    return { tipo: 'ausente' };
  }
  const v = indices.porNombre.get(clavePorNombre(fila.marca, fila.producto, fila.medida));
  return v === undefined || v === null ? { tipo: 'no_encontrada' } : { tipo: 'encontrada', variante: v };
}

const existenciaValida = (n: number): boolean => Number.isInteger(n) && n >= 0 && n <= EXISTENCIA_MAXIMA;

const rotulo = (v: VarianteBuscable): string => `${v.producto} · ${v.medida}`;

function rechazada(indice: number, motivo: MotivoRechazo, v: VarianteBuscable | null): ResultadoFilaCarga {
  return {
    indice,
    resultado: 'rechazada',
    idVariante: v?.idVariante ?? null,
    variante: v === null ? null : rotulo(v),
    existenciaAnterior: v?.existenciaReferencial ?? null,
    existenciaNueva: null,
    motivoRechazo: motivo,
  };
}

/** M13 · carga masiva (R5–R10): se evalúa fila por fila y el bloque se aplica completo o no se aplica. */
export class CargaService {
  constructor(private readonly repo: InventarioRepositoryPort) {}

  /** R8: no escribe nada. */
  async previsualizar(peticion: PrevisualizarCargaRequest): Promise<ResultadoCarga> {
    const { filas } = await this.evaluar(peticion.filas);
    return { aplicada: false, idCarga: null, balance: this.balance(filas), filas };
  }

  /** R7, R8: escribe el bloque en una transacción; repetirlo deja las filas "sin cambios". */
  async aplicar(peticion: AplicarCargaRequest, idUsuario: number): Promise<ResultadoCarga> {
    const { filas, cambios } = await this.evaluar(peticion.filas);
    if (cambios.size > 0) {
      const aplicados = await this.repo.aplicarCarga([...cambios.values()], peticion.idCarga, idUsuario);
      const porVariante = new Map(aplicados.map((a) => [a.idVariante, a]));
      for (const fila of filas) {
        const cambio = cambios.get(fila.indice);
        const real = cambio === undefined ? undefined : porVariante.get(cambio.idVariante);
        if (real === undefined) continue;
        // La existencia que había al bloquear la fila manda sobre la que se vio al evaluar.
        fila.existenciaAnterior = real.existenciaAnterior;
        fila.resultado = real.modificada ? 'modificada' : 'sin_cambios';
      }
    }
    return { aplicada: true, idCarga: peticion.idCarga, balance: this.balance(filas), filas };
  }

  private async evaluar(filas: readonly FilaCarga[]): Promise<Evaluacion> {
    const indices = construirIndices(await this.repo.variantesBuscables());
    const identificadas = filas.map((f) => identificar(f, indices));

    // R10: una variante que aparece más de una vez en el bloque se rechaza en todas sus filas.
    const apariciones = new Map<number, number>();
    for (const i of identificadas) {
      if (i.tipo === 'encontrada') {
        apariciones.set(i.variante.idVariante, (apariciones.get(i.variante.idVariante) ?? 0) + 1);
      }
    }

    const resultado: ResultadoFilaCarga[] = [];
    const cambios = new Map<number, CambioCarga>();
    filas.forEach((fila, indice) => {
      const ident = identificadas[indice];
      if (ident === undefined || ident.tipo === 'ausente') {
        resultado.push(rechazada(indice, 'identificador_ausente', null));
        return;
      }
      if (ident.tipo === 'no_encontrada') {
        resultado.push(rechazada(indice, 'variante_no_encontrada', null));
        return;
      }
      const v = ident.variante;
      if ((apariciones.get(v.idVariante) ?? 0) > 1) {
        resultado.push(rechazada(indice, 'variante_repetida_en_bloque', v));
        return;
      }
      if (!existenciaValida(fila.existencia)) {
        resultado.push(rechazada(indice, 'existencia_invalida', v));
        return;
      }
      const cambia = fila.existencia !== v.existenciaReferencial;
      resultado.push({
        indice,
        resultado: cambia ? 'modificada' : 'sin_cambios',
        idVariante: v.idVariante,
        variante: rotulo(v),
        existenciaAnterior: v.existenciaReferencial,
        existenciaNueva: fila.existencia,
        motivoRechazo: null,
      });
      if (cambia) {
        cambios.set(indice, {
          idVariante: v.idVariante,
          existencia: fila.existencia,
          ...(fila.nota === undefined ? {} : { nota: fila.nota }),
        });
      }
    });
    return { filas: resultado, cambios };
  }

  private balance(filas: readonly ResultadoFilaCarga[]): BalanceCarga {
    const cuenta = (r: ResultadoFilaCarga['resultado']): number => filas.filter((f) => f.resultado === r).length;
    return {
      total: filas.length,
      modificadas: cuenta('modificada'),
      sinCambios: cuenta('sin_cambios'),
      rechazadas: cuenta('rechazada'),
    };
  }
}
