import { CODIGOS_ERROR_M18 } from '../dtos/m18-notificaciones.dto';
import type { CambiosPlantilla, EntidadPlantillaNotificacion, PlantillasRepositoryPort } from '../interfaces/plantillas.port';
import type { TipoComunicacion } from '../interfaces/registro-envios.port';
import { NotificacionError } from './notificacion.error';

/** RF-NOT-03-02 / RF-NOT-03-04: convención de placeholder para variables de plantilla. */
function placeholderDe(variable: string): string {
  return `{{${variable}}}`;
}

export class PlantillasService {
  constructor(private readonly plantillasRepo: PlantillasRepositoryPort) {}

  async listar(): Promise<EntidadPlantillaNotificacion[]> {
    return this.plantillasRepo.listar();
  }

  async obtener(tipo: TipoComunicacion): Promise<EntidadPlantillaNotificacion> {
    const plantilla = await this.plantillasRepo.obtenerPorTipo(tipo);
    if (!plantilla) {
      throw new NotificacionError(
        CODIGOS_ERROR_M18.PLANTILLA_NO_ENCONTRADA,
        `No existe una plantilla configurada para "${tipo}".`,
        404,
      );
    }
    return plantilla;
  }

  async actualizar(
    tipo: TipoComunicacion,
    cambios: CambiosPlantilla,
    idAdmin?: number,
  ): Promise<EntidadPlantillaNotificacion> {
    const actual = await this.obtener(tipo);

    const htmlFinal = cambios.contenidoHtml ?? actual.contenidoHtml;
    const textoFinal = cambios.contenidoTexto ?? actual.contenidoTexto;
    const contenidoCombinado = `${htmlFinal}\n${textoFinal}`;

    const variableFaltante = actual.variablesObligatorias.find(
      (variable) => !contenidoCombinado.includes(placeholderDe(variable)),
    );
    if (variableFaltante) {
      throw new NotificacionError(
        CODIGOS_ERROR_M18.VARIABLE_OBLIGATORIA_REQUERIDA,
        `El contenido debe incluir la variable obligatoria "${placeholderDe(variableFaltante)}".`,
        400,
      );
    }

    return this.plantillasRepo.actualizar(tipo, cambios, idAdmin);
  }

  async previsualizar(
    tipo: TipoComunicacion,
    datosEjemplo?: Record<string, string>,
  ): Promise<{ asunto: string; contenidoHtml: string; contenidoTexto: string }> {
    const plantilla = await this.obtener(tipo);

    const sustituir = (contenido: string): string =>
      plantilla.variablesDisponibles.reduce((acc, variable) => {
        const valor = datosEjemplo?.[variable] ?? `[${variable}]`;
        return acc.split(placeholderDe(variable)).join(valor);
      }, contenido);

    return {
      asunto: plantilla.asunto,
      contenidoHtml: sustituir(plantilla.contenidoHtml),
      contenidoTexto: sustituir(plantilla.contenidoTexto),
    };
  }
}
