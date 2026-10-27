import { z } from 'zod';
import type { ProductoPublicoTarjeta } from '../../m01-catalogo/dtos/m01-catalogo-productos.dto';
import type { EstadoAsistente, EstadoServicioIa } from '../dtos/incidentes.dto';
import { CODIGOS_ERROR_M03 } from '../dtos/m03-asesoria.dto';
import type { GeminiClient } from '../gemini/gemini.client';
import { ErrorIa } from '../gemini/gemini.errores';
import {
  ESQUEMA_RESPUESTA_ASISTENTE,
  instruccionesAsistente,
  type ProductoContexto,
} from '../gemini/instrucciones';
import type { ResilienciaIa } from '../gemini/resiliencia-ia';
import type { ConfiguracionRepositoryPort } from '../interfaces/cuestionario.interface';
import type { IncidentesRepositoryPort } from '../repositories/incidentes.repository';
import { AsesoriaError } from './asesoria.error';

export const CHAT_MAX_TURNOS_HISTORIAL = 10;
export const CHAT_MAX_PRODUCTOS_CONTEXTO = 5;

/** H3: la lista cerrada de productos de una consulta, y su tarjeta para la pantalla. */
export interface ContextoDeConsulta {
  /** Lo que ve el modelo: sin precios ni existencias (H4). */
  resumen: ProductoContexto[];
  /** La tarjeta de cada uno, de la misma búsqueda, para no consultar dos veces. */
  tarjetas: Map<number, ProductoPublicoTarjeta>;
}

/** H3: de dónde salen los productos que el asistente puede mencionar. */
export interface ContextoCatalogoPort {
  buscarParaAsistente(texto: string, limite: number): Promise<ContextoDeConsulta>;
}

export interface TurnoChat {
  rol: 'usuario' | 'asistente';
  texto: string;
}

export interface RespuestaAsistente {
  respuesta: string;
  productos: ProductoPublicoTarjeta[];
  ofrecerAsesor: boolean;
}

/** H5: lo que se le exige al modelo. Lo que no cumpla se descarta (I4). */
const salidaModeloSchema = z.object({
  respuesta: z.string().trim().min(1).max(1500),
  idsProductos: z.array(z.number().int().positive()).max(CHAT_MAX_PRODUCTOS_CONTEXTO).default([]),
  ofrecerAsesor: z.boolean().default(false),
});

/**
 * HU-ASE-05 — Asistente de pintura.
 *
 * Atiende las necesidades del cliente dentro del negocio: pintura, superficies, aplicación y
 * los productos de la tienda. NO es un asistente de propósito general (contrato · D6).
 *
 * Sin estado en el servidor (H1): el frontend manda el historial, que conserva solo en
 * memoria. Aquí no se guarda ninguna conversación.
 */
export class AsistenteService {
  constructor(
    private readonly gemini: GeminiClient | null,
    private readonly resiliencia: ResilienciaIa,
    private readonly configuracion: ConfiguracionRepositoryPort,
    private readonly catalogo: ContextoCatalogoPort,
    private readonly incidentes: IncidentesRepositoryPort,
  ) {}

  /** GET /asesoria/asistente/estado — la pantalla no ofrece el chat si no está disponible. */
  estadoPublico(): EstadoAsistente {
    if (this.gemini === null) return { disponible: false, motivo: 'no_configurado' };
    if (this.resiliencia.estaSuspendido()) return { disponible: false, motivo: 'suspendido' };
    return { disponible: true, motivo: null };
  }

  /** GET /admin/asesoria/ia/estado — lo que ve quien administra. */
  async estadoAdmin(): Promise<EstadoServicioIa> {
    const estado = this.resiliencia.estado();
    return {
      configurado: this.gemini !== null,
      suspendidoHasta: estado.suspendidoHasta?.toISOString() ?? null,
      fallosConsecutivos: estado.fallosConsecutivos,
      alertaActiva: estado.alertaActiva,
      ultimoIncidente: await this.incidentes.ultimo(),
    };
  }

  /** POST /asesoria/asistente/mensajes — un turno de conversación. */
  async responder(mensaje: string, historial: readonly TurnoChat[]): Promise<RespuestaAsistente> {
    const cliente = this.gemini;
    if (cliente === null) throw this.noDisponible('no_configurado');

    const config = await this.configuracion.obtener();

    // H3: el contexto es una lista CERRADA; el modelo no puede nombrar nada fuera de ella.
    const contexto = await this.catalogo.buscarParaAsistente(mensaje, CHAT_MAX_PRODUCTOS_CONTEXTO);

    const turnos = [
      ...historial.slice(-CHAT_MAX_TURNOS_HISTORIAL),
      { rol: 'usuario' as const, texto: mensaje },
    ];

    let salida: z.infer<typeof salidaModeloSchema>;
    try {
      const crudo = await this.resiliencia.ejecutar(
        'chat',
        {
          tiempoEsperaMs: config.iaTiempoEsperaMs,
          reintentos: config.iaReintentos,
          suspensionCuotaMinutos: config.iaSuspensionCuotaMinutos,
          fallosConsecutivosAlerta: config.iaFallosConsecutivosAlerta,
        },
        () =>
          cliente.generarJson({
            instruccionesSistema: instruccionesAsistente(config.guionAsistente, contexto.resumen),
            turnos,
            esquemaRespuesta: ESQUEMA_RESPUESTA_ASISTENTE,
            tiempoEsperaMs: config.iaTiempoEsperaMs,
          }),
      );

      const analizado = salidaModeloSchema.safeParse(crudo);
      // I4: una respuesta que no cumple el esquema se descarta, no se arregla.
      if (!analizado.success) throw new ErrorIa('respuesta_no_procesable', false, 'no cumple el esquema');
      salida = analizado.data;
    } catch (err: unknown) {
      void this.purgarEnSegundoPlano(config.iaRetencionIncidentesDias);
      throw this.deErrorIa(err);
    }

    void this.purgarEnSegundoPlano(config.iaRetencionIncidentesDias);

    // D4: los identificadores que no estaban en el contexto se descartan sin más.
    const productos: ProductoPublicoTarjeta[] = [];
    for (const id of salida.idsProductos) {
      const tarjeta = contexto.tarjetas.get(id);
      if (tarjeta !== undefined) productos.push(tarjeta);
    }

    return { respuesta: salida.respuesta, productos, ofrecerAsesor: salida.ofrecerAsesor };
  }

  /** I8: la purga no debe hacer esperar a quien está conversando. */
  private async purgarEnSegundoPlano(dias: number): Promise<void> {
    try {
      await this.incidentes.purgar(dias);
    } catch (err: unknown) {
      console.error('[M03][IA] no se pudo purgar el registro de incidentes', {
        motivo: err instanceof Error ? err.message : 'desconocido',
      });
    }
  }

  /** I2, I3: mensaje comprensible, sin códigos ni trazas (RF-ASE-06-01). */
  private deErrorIa(err: unknown): AsesoriaError {
    if (err instanceof ErrorIa && err.tipo === 'cuota_agotada') return this.noDisponible('suspendido');
    return this.noDisponible('fallo');
  }

  private noDisponible(motivo: 'no_configurado' | 'suspendido' | 'fallo'): AsesoriaError {
    if (motivo === 'suspendido') {
      return new AsesoriaError(
        CODIGOS_ERROR_M03.SERVICIO_IA_SUSPENDIDO,
        'El asistente no está disponible en este momento. Puedes escribirle a un asesor o seguir navegando por el catálogo.',
        503,
      );
    }
    return new AsesoriaError(
      CODIGOS_ERROR_M03.SERVICIO_IA_NO_DISPONIBLE,
      'El asistente no está disponible en este momento. Puedes escribirle a un asesor o seguir navegando por el catálogo.',
      503,
    );
  }
}
