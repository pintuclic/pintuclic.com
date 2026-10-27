import type { FuncionIa, TipoIncidenteIa } from '../dtos/incidentes.dto';
import { ErrorIa, errorConfiguracion } from './gemini.errores';

/**
 * Degradación del servicio de IA (HU-ASE-06 · I1-I4, I7-I9).
 *
 * Envuelve CADA llamada al proveedor: tiempo de espera, reintentos, suspensión por cuota y
 * registro de incidentes. El resto del módulo no sabe nada de esto; solo recibe el resultado
 * o un `ErrorIa` ya clasificado.
 *
 * La suspensión y la cuenta de fallos viven en MEMORIA (contrato · Q9): valen para un solo
 * servidor, que es el VPS actual. Con varias instancias habría que llevarlas a la base.
 */

export interface ParametrosResiliencia {
  tiempoEsperaMs: number;
  reintentos: number;
  suspensionCuotaMinutos: number;
  fallosConsecutivosAlerta: number;
}

export interface RegistroIncidentes {
  registrar(incidente: {
    funcion: FuncionIa;
    tipo: TipoIncidenteIa;
    intentos: number;
    resultado: 'recuperado' | 'fallido' | 'suspendido';
  }): Promise<void>;
}

/** I9: a quién se avisa cuando el servicio acumula fallos. */
export interface AvisoServicioIa {
  alertar(fallosConsecutivos: number): Promise<void>;
}

export interface EstadoResiliencia {
  suspendidoHasta: Date | null;
  fallosConsecutivos: number;
  alertaActiva: boolean;
}

const esperar = (ms: number): Promise<void> => new Promise((listo) => setTimeout(listo, ms));

export class ResilienciaIa {
  private suspendidoHasta: Date | null = null;
  private fallosConsecutivos = 0;
  private alertaActiva = false;

  constructor(
    private readonly incidentes: RegistroIncidentes,
    private readonly aviso: AvisoServicioIa | null,
    private readonly ahora: () => Date = () => new Date(),
  ) {}

  estado(): EstadoResiliencia {
    return {
      suspendidoHasta: this.estaSuspendido() ? this.suspendidoHasta : null,
      fallosConsecutivos: this.fallosConsecutivos,
      alertaActiva: this.alertaActiva,
    };
  }

  /** I3: mientras dure la suspensión no se llama al proveedor, se rechaza de inmediato. */
  estaSuspendido(): boolean {
    if (this.suspendidoHasta === null) return false;
    if (this.ahora().getTime() >= this.suspendidoHasta.getTime()) {
      this.suspendidoHasta = null;
      return false;
    }
    return true;
  }

  /**
   * Ejecuta la llamada aplicando I1-I4. Devuelve lo que dio el proveedor o lanza el
   * `ErrorIa` final; nunca deja pasar un error sin clasificar.
   */
  async ejecutar<T>(
    funcion: FuncionIa,
    parametros: ParametrosResiliencia,
    llamada: () => Promise<T>,
  ): Promise<T> {
    if (this.estaSuspendido()) {
      await this.incidentes.registrar({
        funcion,
        tipo: 'cuota_agotada',
        intentos: 1,
        resultado: 'suspendido',
      });
      throw new ErrorIa('cuota_agotada', false, 'El servicio de IA está suspendido temporalmente');
    }

    const maximo = 1 + Math.max(0, parametros.reintentos);
    let ultimo: ErrorIa = errorConfiguracion('no se llegó a intentar');

    for (let intento = 1; intento <= maximo; intento += 1) {
      try {
        const resultado = await llamada();
        // I7: si un reintento lo salvó, también queda registrado.
        if (intento > 1) {
          await this.incidentes.registrar({
            funcion,
            tipo: ultimo.tipo,
            intentos: intento,
            resultado: 'recuperado',
          });
        }
        this.alExito();
        return resultado;
      } catch (err: unknown) {
        // Lo que no venga clasificado se trata como una caída del servicio, que sí se reintenta.
        ultimo =
          err instanceof ErrorIa
            ? err
            : new ErrorIa(
                'no_disponible',
                true,
                err instanceof Error ? err.message : 'error desconocido',
              );

        if (ultimo.tipo === 'cuota_agotada') {
          this.suspender(parametros.suspensionCuotaMinutos);
          await this.registrarFallo(funcion, ultimo.tipo, intento, 'suspendido', parametros);
          throw ultimo;
        }

        // I1: solo se reintenta lo que puede salir distinto la próxima vez.
        if (!ultimo.reintentable || intento === maximo) {
          await this.registrarFallo(funcion, ultimo.tipo, intento, 'fallido', parametros);
          throw ultimo;
        }

        // Espera creciente entre intentos, para no golpear un servicio ya caído.
        await esperar(250 * intento);
      }
    }

    throw ultimo;
  }

  private suspender(minutos: number): void {
    this.suspendidoHasta = new Date(this.ahora().getTime() + minutos * 60_000);
  }

  private alExito(): void {
    // I9: un éxito apaga la alerta y reinicia la cuenta.
    this.fallosConsecutivos = 0;
    this.alertaActiva = false;
  }

  private async registrarFallo(
    funcion: FuncionIa,
    tipo: TipoIncidenteIa,
    intentos: number,
    resultado: 'fallido' | 'suspendido',
    parametros: ParametrosResiliencia,
  ): Promise<void> {
    await this.incidentes.registrar({ funcion, tipo, intentos, resultado });

    this.fallosConsecutivos += 1;
    // I9: se avisa UNA vez por racha, al llegar al umbral.
    if (!this.alertaActiva && this.fallosConsecutivos >= parametros.fallosConsecutivosAlerta) {
      this.alertaActiva = true;
      if (this.aviso !== null) {
        try {
          await this.aviso.alertar(this.fallosConsecutivos);
        } catch (err: unknown) {
          // A4: que no se pueda avisar no puede romper la petición en curso.
          console.error('[M03][IA] no se pudo enviar la alerta', {
            motivo: err instanceof Error ? err.message : 'desconocido',
          });
        }
      }
    }
  }
}
