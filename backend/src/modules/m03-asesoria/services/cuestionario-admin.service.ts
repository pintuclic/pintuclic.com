import type {
  ConfiguracionAsesoria,
  CrearOpcionRequest,
  CrearPreguntaRequest,
  CuestionarioAdmin,
  EditarConfiguracionRequest,
  EditarOpcionRequest,
  EditarPreguntaRequest,
  OpcionAdmin,
  PreguntaAdmin,
  ReemplazarEfectosRequest,
} from '../dtos/cuestionario.dto';
import type {
  ConfiguracionRepositoryPort,
  CuestionarioRepositoryPort,
  VocabularioRepositoryPort,
} from '../interfaces/cuestionario.interface';
import { recursoNoDisponible } from './asesoria.error';
import { AuditoriaAsesoria, huellaDeTexto, valorCorto, type ActorAuditoria } from './auditoria-asesoria';

/**
 * Panel del cuestionario (HU-ASE-01 · F1, RF-ASE-01-02).
 *
 * El administrador edita las preguntas, sus opciones y la correspondencia con los filtros sin
 * intervención del equipo de desarrollo, y el cambio vale desde la siguiente petición
 * (CA-ASE-01-09). Nada se borra: se desactiva (F5).
 *
 * Todo cambio queda en el registro inmutable de M20 (A1), con el valor anterior y el nuevo.
 */
export class CuestionarioAdminService {
  constructor(
    private readonly repo: CuestionarioRepositoryPort,
    private readonly vocabulario: VocabularioRepositoryPort,
    private readonly configuracion: ConfiguracionRepositoryPort,
    private readonly auditoria: AuditoriaAsesoria,
  ) {}

  /** GET /admin/asesoria/cuestionario — todo, con inactivos y con el vocabulario (F4). */
  async obtener(): Promise<CuestionarioAdmin> {
    const [preguntas, vocabulario, config] = await Promise.all([
      this.repo.listarTodas(),
      this.vocabulario.obtener(),
      this.configuracion.obtener(),
    ]);
    return { modo: config.modoCuestionario, preguntas, vocabulario };
  }

  async crearPregunta(datos: CrearPreguntaRequest, actor: ActorAuditoria): Promise<PreguntaAdmin> {
    const pregunta = await this.repo.crearPregunta(datos);
    await this.auditoria.registrar({
      actor,
      accion: 'asesoria.pregunta.crear',
      entidad: 'pregunta_asesoria',
      idEntidad: String(pregunta.idPregunta),
      valorAnterior: null,
      valorNuevo: pregunta.texto,
    });
    return pregunta;
  }

  async editarPregunta(
    idPregunta: number,
    datos: EditarPreguntaRequest,
    actor: ActorAuditoria,
  ): Promise<PreguntaAdmin> {
    const antes = await this.repo.obtenerPregunta(idPregunta);
    if (antes === null) throw recursoNoDisponible();

    const despues = await this.repo.editarPregunta(idPregunta, datos);
    if (despues === null) throw recursoNoDisponible();

    await this.auditoria.registrar({
      actor,
      accion: 'asesoria.pregunta.editar',
      entidad: 'pregunta_asesoria',
      idEntidad: String(idPregunta),
      valorAnterior: this.resumenPregunta(antes),
      valorNuevo: this.resumenPregunta(despues),
    });
    return despues;
  }

  async crearOpcion(
    idPregunta: number,
    datos: CrearOpcionRequest,
    actor: ActorAuditoria,
  ): Promise<OpcionAdmin> {
    const opcion = await this.repo.crearOpcion(idPregunta, datos);
    // null = la pregunta no existe o es de familias cromáticas, que no lleva opciones (F3).
    if (opcion === null) throw recursoNoDisponible();

    await this.auditoria.registrar({
      actor,
      accion: 'asesoria.opcion.crear',
      entidad: 'opcion_asesoria',
      idEntidad: String(opcion.idOpcion),
      valorAnterior: null,
      valorNuevo: opcion.texto,
    });
    return opcion;
  }

  async editarOpcion(
    idOpcion: number,
    datos: EditarOpcionRequest,
    actor: ActorAuditoria,
  ): Promise<OpcionAdmin> {
    const antes = await this.repo.obtenerOpcion(idOpcion);
    if (antes === null) throw recursoNoDisponible();

    const despues = await this.repo.editarOpcion(idOpcion, datos);
    if (despues === null) throw recursoNoDisponible();

    await this.auditoria.registrar({
      actor,
      accion: 'asesoria.opcion.editar',
      entidad: 'opcion_asesoria',
      idEntidad: String(idOpcion),
      valorAnterior: this.resumenOpcion(antes),
      valorNuevo: this.resumenOpcion(despues),
    });
    return despues;
  }

  /**
   * PUT /admin/asesoria/opciones/:idOpcion/efectos — es la correspondencia entre una opción y
   * su filtro, que es justo lo que RF-ASE-01-02 pide poder cambiar sin desarrollo.
   *
   * Los objetivos se validan contra el vocabulario ANTES de guardar: apuntar a una
   * subcategoría que no existe sería un efecto muerto, y el administrador debe enterarse en
   * el momento, no cuando alguien responda el cuestionario.
   */
  async reemplazarEfectos(
    idOpcion: number,
    datos: ReemplazarEfectosRequest,
    actor: ActorAuditoria,
  ): Promise<OpcionAdmin> {
    const antes = await this.repo.obtenerOpcion(idOpcion);
    if (antes === null) throw recursoNoDisponible();

    const vocabulario = await this.vocabulario.obtener();
    const existe = new Set(vocabulario.map((v) => `${v.dimension}:${v.idValor}`));
    for (const efecto of datos.efectos) {
      if (efecto.tipo === 'filtrar_ambiente') continue;
      if (!existe.has(`${efecto.dimension}:${efecto.idObjetivo}`)) {
        throw recursoNoDisponible();
      }
    }

    const despues = await this.repo.reemplazarEfectos(idOpcion, datos.efectos);
    if (despues === null) throw recursoNoDisponible();

    await this.auditoria.registrar({
      actor,
      accion: 'asesoria.opcion.efectos',
      entidad: 'opcion_asesoria',
      idEntidad: String(idOpcion),
      valorAnterior: this.resumenEfectos(antes),
      valorNuevo: this.resumenEfectos(despues),
    });
    return despues;
  }

  /* ── Configuración ──────────────────────────────────────────────────────── */

  async obtenerConfiguracion(): Promise<ConfiguracionAsesoria> {
    return this.configuracion.obtener();
  }

  async editarConfiguracion(
    datos: EditarConfiguracionRequest,
    actor: ActorAuditoria,
  ): Promise<ConfiguracionAsesoria> {
    const antes = await this.configuracion.obtener();
    const despues = await this.configuracion.editar(datos, actor.idUsuario);

    // Se audita campo por campo: así el registro dice QUÉ cambió, no solo que algo cambió.
    for (const campo of Object.keys(datos) as Array<keyof EditarConfiguracionRequest>) {
      const esGuion = campo === 'guionCuestionario' || campo === 'guionAsistente';
      await this.auditoria.registrar({
        actor,
        accion: esGuion ? 'asesoria.guion.editar' : 'asesoria.configuracion.editar',
        entidad: 'configuracion_asesoria',
        idEntidad: campo,
        // A2: los guiones van por longitud y huella; el resto, entero.
        valorAnterior: esGuion ? huellaDeTexto(String(antes[campo])) : valorCorto(antes[campo]),
        valorNuevo: esGuion ? huellaDeTexto(String(despues[campo])) : valorCorto(despues[campo]),
      });
    }

    return despues;
  }

  /* ── Resúmenes para el registro de auditoría ────────────────────────────── */

  private resumenPregunta(p: PreguntaAdmin): string {
    return `${p.texto} | orden ${p.orden} | ${p.activa ? 'activa' : 'inactiva'}`;
  }

  private resumenOpcion(o: OpcionAdmin): string {
    return `${o.texto} | orden ${o.orden} | ${o.activa ? 'activa' : 'inactiva'}`;
  }

  private resumenEfectos(o: OpcionAdmin): string {
    if (o.efectos.length === 0) return 'sin efectos';
    return o.efectos
      .map((e) =>
        e.tipo === 'filtrar_ambiente'
          ? `ambiente=${e.ambiente}`
          : `${e.tipo}:${e.dimension}=${e.idObjetivo}`,
      )
      .join(', ');
  }
}
