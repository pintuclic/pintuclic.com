import type {
  CrearFaqRequest,
  EditarFaqRequest,
  ListarFaqsAdminRequest,
  PreguntaFrecuente,
  PreguntaFrecuentePublica,
  ReordenarFaqsRequest,
} from '../dtos/m15-atencion.dto';
import type { FaqsRepositoryPort, PaginaFaqs } from '../interfaces/atencion.interface';
import { errores } from './atencion.error';

export class FaqsService {
  constructor(private readonly repo: FaqsRepositoryPort) {}

  /** R1/R2: solo activas, ya agrupadas y ordenadas por el repositorio. */
  async listarPublicas(): Promise<PreguntaFrecuentePublica[]> {
    const preguntas = await this.repo.listarPublicas();
    return preguntas.map(({ idPregunta, tema, pregunta, respuesta, orden }) => ({
      idPregunta,
      tema,
      pregunta,
      respuesta,
      orden,
    }));
  }

  async listarAdmin(filtros: ListarFaqsAdminRequest): Promise<PaginaFaqs> {
    return this.repo.listarAdmin({
      ...(filtros.tema === undefined ? {} : { tema: filtros.tema }),
      incluirInactivas: filtros.incluirInactivas,
      pagina: filtros.pagina,
      limite: filtros.limite,
    });
  }

  async crear(datos: CrearFaqRequest): Promise<PreguntaFrecuente> {
    return this.repo.crear(datos);
  }

  async editar(idPregunta: number, datos: EditarFaqRequest): Promise<PreguntaFrecuente> {
    await this.exigirExistente(idPregunta);
    return this.repo.actualizar(idPregunta, datos);
  }

  async cambiarActiva(idPregunta: number, activa: boolean): Promise<PreguntaFrecuente> {
    await this.exigirExistente(idPregunta);
    return this.repo.cambiarActiva(idPregunta, activa);
  }

  async eliminar(idPregunta: number): Promise<void> {
    await this.exigirExistente(idPregunta);
    await this.repo.eliminar(idPregunta);
  }

  /**
   * Reordena un tema completo. Exige la lista íntegra de sus preguntas: si
   * llegara parcial, las ausentes conservarían su `orden` anterior y el tema
   * quedaría con posiciones repetidas.
   */
  async reordenar(datos: ReordenarFaqsRequest): Promise<PreguntaFrecuente[]> {
    const idsDelTema = await this.repo.idsDelTema(datos.tema);
    if (idsDelTema.length === 0) {
      throw errores.noDisponible();
    }

    const recibidos = new Set(datos.ordenIds);
    if (recibidos.size !== datos.ordenIds.length) {
      throw errores.parametroInvalido('La lista de orden no puede repetir preguntas.');
    }

    const esperados = new Set(idsDelTema);
    const coincide =
      recibidos.size === esperados.size && [...recibidos].every((id) => esperados.has(id));
    if (!coincide) {
      throw errores.parametroInvalido(
        'La lista de orden debe traer exactamente las preguntas de ese tema.',
      );
    }

    await this.repo.reordenar(datos.ordenIds);

    const pagina = await this.repo.listarAdmin({
      tema: datos.tema,
      incluirInactivas: true,
      pagina: 1,
      limite: idsDelTema.length,
    });
    return pagina.items;
  }

  private async exigirExistente(idPregunta: number): Promise<PreguntaFrecuente> {
    const pregunta = await this.repo.obtener(idPregunta);
    if (pregunta === null) {
      throw errores.noDisponible();
    }
    return pregunta;
  }
}
