import {
  MAXIMO_FILAS_PLANTILLA,
  type AjustarExistenciaRequest,
  type AjusteInventario,
  type ItemInventario,
  type ListarHistorialRequest,
  type ListarInventarioRequest,
  type PlantillaRequest,
  type ResumenInventario,
} from '../dtos/m13-inventario.dto';
import type { InventarioRepositoryPort, Pagina } from '../interfaces/inventario.interface';
import { errores } from './inventario-error';
import { construirPlantillaCsv } from './plantilla';

export interface ResultadoAjusteManual {
  item: ItemInventario;
  /** null cuando el valor no cambió (R2). */
  ajuste: AjusteInventario | null;
}

/** M13: lectura de existencias, ajuste manual (R2–R4) e historial. */
export class InventarioService {
  constructor(private readonly repo: InventarioRepositoryPort) {}

  resumen(): Promise<ResumenInventario> {
    return this.repo.resumen();
  }

  listar(filtro: ListarInventarioRequest): Promise<Pagina<ItemInventario>> {
    return this.repo.listar(filtro);
  }

  async obtener(idVariante: number): Promise<ItemInventario> {
    const item = await this.repo.obtener(idVariante);
    if (item === null) throw errores.noDisponible();
    return item;
  }

  historial(filtro: ListarHistorialRequest): Promise<Pagina<AjusteInventario>> {
    return this.repo.historial(filtro);
  }

  /** `idUsuario` sale de la sesión verificada, nunca del cuerpo. */
  async ajustar(
    idVariante: number,
    peticion: AjustarExistenciaRequest,
    idUsuario: number,
  ): Promise<ResultadoAjusteManual> {
    const resultado = await this.repo.ajustar(idVariante, {
      existencia: peticion.existencia,
      motivo: peticion.motivo,
      origen: 'manual',
      idUsuario,
      ...(peticion.existenciaEsperada === undefined ? {} : { existenciaEsperada: peticion.existenciaEsperada }),
      ...(peticion.nota === undefined ? {} : { nota: peticion.nota }),
    });
    if (resultado.tipo === 'no_existe') throw errores.noDisponible();
    if (resultado.tipo === 'conflicto') throw errores.conflicto(resultado.existenciaActual);
    const item = await this.obtener(idVariante);
    if (resultado.tipo === 'sin_cambios') return { item, ajuste: null };
    return { item, ajuste: await this.repo.obtenerAjuste(resultado.idAjuste) };
  }

  /** D4 / R6: CSV con todas las variantes y su existencia actual. */
  async plantilla(filtro: PlantillaRequest): Promise<string> {
    const criterio = {
      incluirInactivas: filtro.incluirInactivas === true,
      ...(filtro.idMarca === undefined ? {} : { idMarca: filtro.idMarca }),
    };
    if ((await this.repo.contarParaPlantilla(criterio)) > MAXIMO_FILAS_PLANTILLA) {
      throw errores.plantillaGrande(MAXIMO_FILAS_PLANTILLA);
    }
    return construirPlantillaCsv(await this.repo.filasParaPlantilla(criterio));
  }
}
