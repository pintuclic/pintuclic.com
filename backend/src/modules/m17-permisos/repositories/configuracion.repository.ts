import type { ClaveParametro } from '../dtos/m17-permisos.dto';
import type { ConfiguracionPort, EntidadParametro } from '../interfaces/configuracion.port';

export class AlmacenConfiguracionMemoria implements ConfiguracionPort {
  private parametros: Map<ClaveParametro, EntidadParametro>;

  constructor() {
    this.parametros = new Map<ClaveParametro, EntidadParametro>([
      [
        'auth.vigencia_codigo_registro_minutos',
        {
          clave: 'auth.vigencia_codigo_registro_minutos',
          area: 'autenticacion',
          tipoDato: 'numero',
          valor: 15,
          descripcion: 'Tiempo de vida en minutos del código OTP para confirmación de registro',
          valorPorDefecto: 15,
          rangoMinimo: 5,
          rangoMaximo: 60,
          fechaActualizacion: new Date(),
        },
      ],
      [
        'auth.intentos_codigo_registro',
        {
          clave: 'auth.intentos_codigo_registro',
          area: 'autenticacion',
          tipoDato: 'numero',
          valor: 3,
          descripcion: 'Cantidad máxima de intentos fallidos antes de invalidar el código OTP',
          valorPorDefecto: 3,
          rangoMinimo: 1,
          rangoMaximo: 10,
          fechaActualizacion: new Date(),
        },
      ],
      [
        'auth.complejidad_minima_contrasena',
        {
          clave: 'auth.complejidad_minima_contrasena',
          area: 'autenticacion',
          tipoDato: 'numero',
          valor: 12,
          descripcion: 'Longitud mínima exigida para contraseñas de cuentas',
          valorPorDefecto: 12,
          rangoMinimo: 8,
          rangoMaximo: 32,
          fechaActualizacion: new Date(),
        },
      ],
      [
        'auth.vigencia_enlace_recuperacion_minutos',
        {
          clave: 'auth.vigencia_enlace_recuperacion_minutos',
          area: 'autenticacion',
          tipoDato: 'numero',
          valor: 30,
          descripcion: 'Vigencia máxima del token o enlace para restablecimiento de contraseña',
          valorPorDefecto: 30,
          rangoMinimo: 10,
          rangoMaximo: 120,
          fechaActualizacion: new Date(),
        },
      ],
      [
        'auth.intentos_fallidos_bloqueo',
        {
          clave: 'auth.intentos_fallidos_bloqueo',
          area: 'autenticacion',
          tipoDato: 'numero',
          valor: 5,
          descripcion: 'Número de intentos erróneos consecutivos que disparan el bloqueo temporal',
          valorPorDefecto: 5,
          rangoMinimo: 3,
          rangoMaximo: 10,
          fechaActualizacion: new Date(),
        },
      ],
      [
        'auth.duracion_bloqueo_minutos',
        {
          clave: 'auth.duracion_bloqueo_minutos',
          area: 'autenticacion',
          tipoDato: 'numero',
          valor: 15,
          descripcion: 'Duración en minutos del bloqueo por intentos fallidos de autenticación',
          valorPorDefecto: 15,
          rangoMinimo: 5,
          rangoMaximo: 1440,
          fechaActualizacion: new Date(),
        },
      ],
      [
        'comms.reintentos_envio_transaccional',
        {
          clave: 'comms.reintentos_envio_transaccional',
          area: 'comunicaciones',
          tipoDato: 'numero',
          valor: 3,
          descripcion: 'Reintentos automáticos ante fallas transitorias de entrega SMTP',
          valorPorDefecto: 3,
          rangoMinimo: 1,
          rangoMaximo: 5,
          fechaActualizacion: new Date(),
        },
      ],
      [
        'comercial.iva_porcentaje',
        {
          clave: 'comercial.iva_porcentaje',
          area: 'comercial',
          tipoDato: 'numero',
          valor: 19,
          descripcion: 'Porcentaje general de impuesto al valor agregado (IVA) aplicable a ventas',
          valorPorDefecto: 19,
          rangoMinimo: 0,
          rangoMaximo: 50,
          fechaActualizacion: new Date(),
        },
      ],
      [
        'comercial.costo_envio_base',
        {
          clave: 'comercial.costo_envio_base',
          area: 'comercial',
          tipoDato: 'numero',
          valor: 15000,
          descripcion: 'Tarifa base de despacho estándar a domicilio',
          valorPorDefecto: 15000,
          rangoMinimo: 0,
          fechaActualizacion: new Date(),
        },
      ],
      [
        'comercial.umbral_envio_gratis',
        {
          clave: 'comercial.umbral_envio_gratis',
          area: 'comercial',
          tipoDato: 'numero',
          valor: 200000,
          descripcion: 'Monto mínimo de compra para exoneración de costos de envío',
          valorPorDefecto: 200000,
          rangoMinimo: 0,
          fechaActualizacion: new Date(),
        },
      ],
    ]);
  }

  async listar(): Promise<EntidadParametro[]> {
    return Array.from(this.parametros.values());
  }

  async obtener(clave: ClaveParametro): Promise<EntidadParametro | null> {
    return this.parametros.get(clave) ?? null;
  }

  async actualizar(
    clave: ClaveParametro,
    nuevoValor: number | string | boolean,
  ): Promise<EntidadParametro> {
    const actual = this.parametros.get(clave);
    if (!actual) {
      throw new Error(`Parámetro no reconocido: ${clave}`);
    }

    if (actual.tipoDato === 'numero' && typeof nuevoValor === 'number') {
      if (actual.rangoMinimo !== undefined && nuevoValor < actual.rangoMinimo) {
        throw new Error(
          `El valor ${nuevoValor} es menor que el mínimo permitido (${actual.rangoMinimo})`,
        );
      }
      if (actual.rangoMaximo !== undefined && nuevoValor > actual.rangoMaximo) {
        throw new Error(
          `El valor ${nuevoValor} supera el máximo permitido (${actual.rangoMaximo})`,
        );
      }
    }

    const actualizado: EntidadParametro = {
      ...actual,
      valor: nuevoValor,
      fechaActualizacion: new Date(),
    };

    this.parametros.set(clave, actualizado);
    return actualizado;
  }
}
