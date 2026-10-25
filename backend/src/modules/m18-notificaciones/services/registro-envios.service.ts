import type {
  EntidadEnvioNotificacion,
  EntidadRebote,
  EstadoEnvio,
  RegistroEnviosRepositoryPort,
  TipoComunicacion,
} from '../interfaces/registro-envios.port';

export class RegistroEnviosService {
  constructor(private readonly registroRepo: RegistroEnviosRepositoryPort) {}

  async listarEnvios(filtros: {
    pagina: number;
    limite: number;
    tipo?: TipoComunicacion | undefined;
    estado?: EstadoEnvio | undefined;
  }): Promise<{ envios: EntidadEnvioNotificacion[]; total: number }> {
    return this.registroRepo.listarEnvios(filtros);
  }

  async listarRebotes(filtros: { pagina: number; limite: number }): Promise<{
    rebotes: EntidadRebote[];
    total: number;
  }> {
    return this.registroRepo.listarRebotes(filtros);
  }
}
