import * as plantillasHtml from '../adapters/plantillas-html';
import { CODIGOS_ERROR_M18 } from '../dtos/m18-notificaciones.dto';
import type { CambiosPlantilla, EntidadPlantillaNotificacion, PlantillasRepositoryPort } from '../interfaces/plantillas.port';
import type { TipoComunicacion } from '../interfaces/registro-envios.port';
import { NotificacionError } from './notificacion.error';

/** Datos de ejemplo realistas para previsualizar cada tipo sin depender de un envío real. */
function renderizarMuestra(
  tipo: TipoComunicacion,
  asunto: string,
  intro: string,
): { asunto: string; contenidoHtml: string; contenidoTexto: string } {
  switch (tipo) {
    case 'registro_otp':
      return {
        asunto,
        contenidoHtml: plantillasHtml.htmlRegistroOtp(intro, '482910', 15),
        contenidoTexto: plantillasHtml.textoRegistroOtp(intro, '482910', 15),
      };
    case 'recuperacion_password':
      return {
        asunto,
        contenidoHtml: plantillasHtml.htmlRecuperacionPassword(intro, 'https://pintuclic.com/restablecer-contrasena?token=ejemplo', 30),
        contenidoTexto: plantillasHtml.textoRecuperacionPassword(intro, 'https://pintuclic.com/restablecer-contrasena?token=ejemplo', 30),
      };
    case 'activacion_empleado':
      return {
        asunto,
        contenidoHtml: plantillasHtml.htmlActivacionEmpleado(intro, 'Nombre Ejemplo', 'https://pintuclic.com/activar-cuenta?token=ejemplo', 72),
        contenidoTexto: plantillasHtml.textoActivacionEmpleado(intro, 'Nombre Ejemplo', 'https://pintuclic.com/activar-cuenta?token=ejemplo', 72),
      };
    case 'cambio_correo_otp':
      return {
        asunto,
        contenidoHtml: plantillasHtml.htmlCambioCorreoOtp(intro, '918273', 15),
        contenidoTexto: plantillasHtml.textoCambioCorreoOtp(intro, '918273', 15),
      };
    case 'cambio_correo_confirmado':
      return {
        asunto,
        contenidoHtml: plantillasHtml.htmlCambioCorreoConfirmado(intro, 'nuevo-correo@ejemplo.com'),
        contenidoTexto: plantillasHtml.textoCambioCorreoConfirmado(intro, 'nuevo-correo@ejemplo.com'),
      };
    case 'dictamen_empresa':
      return {
        asunto,
        contenidoHtml: plantillasHtml.htmlDictamenEmpresa(intro, true),
        contenidoTexto: plantillasHtml.textoDictamenEmpresa(intro, true),
      };
  }
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
    await this.obtener(tipo);
    return this.plantillasRepo.actualizar(tipo, cambios, idAdmin);
  }

  /** Previsualiza con datos de ejemplo fijos; permite ver cambios de asunto/texto sin guardarlos. */
  async previsualizar(
    tipo: TipoComunicacion,
    overrides?: { asunto?: string | undefined; contenidoTexto?: string | undefined },
  ): Promise<{ asunto: string; contenidoHtml: string; contenidoTexto: string }> {
    const plantilla = await this.obtener(tipo);
    const asunto = overrides?.asunto ?? plantilla.asunto;
    const intro = overrides?.contenidoTexto ?? plantilla.contenidoTexto;
    return renderizarMuestra(tipo, asunto, intro);
  }
}
