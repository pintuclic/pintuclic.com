import {
  DESTINO_ES_URL,
  type ActualizarHorarioRequest,
  type CanalWhatsappPublico,
  type ConfiguracionWhatsapp,
  type HorarioAtencion,
} from '../dtos/m15-atencion.dto';
import type { ConfiguracionAtencionRepositoryPort } from '../interfaces/atencion.interface';
import { errores } from './atencion.error';
import { estaAbierto } from './horario';

export class ConfiguracionAtencionService {
  constructor(private readonly repo: ConfiguracionAtencionRepositoryPort) {}

  /** `ahora` se inyecta para poder probar `abiertoAhora` sin depender del reloj. */
  async obtenerHorario(ahora: Date = new Date()): Promise<HorarioAtencion> {
    const franjas = await this.repo.obtenerHorario();
    return { franjas, abiertoAhora: estaAbierto(franjas, ahora) };
  }

  async actualizarHorario(
    datos: ActualizarHorarioRequest,
    idAdmin?: number,
    ahora: Date = new Date(),
  ): Promise<HorarioAtencion> {
    const franjas = await this.repo.reemplazarHorario(datos.franjas, idAdmin);
    return { franjas, abiertoAhora: estaAbierto(franjas, ahora) };
  }

  async obtenerWhatsapp(): Promise<ConfiguracionWhatsapp> {
    const configuracion = await this.repo.obtenerWhatsapp();
    if (configuracion === null) {
      throw errores.noDisponible();
    }
    return configuracion;
  }

  /** Vista pública del canal: lo mínimo para armar el botón (R7). */
  async obtenerCanalPublico(): Promise<CanalWhatsappPublico> {
    const configuracion = await this.obtenerWhatsapp();
    return {
      destino: configuracion.destino,
      mensajeBase: configuracion.mensajeBase,
      destinoEsUrl: DESTINO_ES_URL.test(configuracion.destino),
    };
  }

  async guardarWhatsapp(
    destino: string,
    mensajeBase: string | null,
    idAdmin?: number,
  ): Promise<ConfiguracionWhatsapp> {
    return this.repo.guardarWhatsapp(destino, mensajeBase, idAdmin);
  }
}
