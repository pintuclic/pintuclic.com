import {
  CODIGOS_ERROR_M17,
  type ActualizarParametroInput,
  type ActualizarParametroOutput,
  type CatalogoParametrosOutput,
  type ClaveParametro,
  type ParametroConfiguracion,
} from '../dtos/m17-permisos.dto';
import type { ConfiguracionPort } from '../interfaces/configuracion.port';
import { EmpleadoError } from './empleados.service';

export class ConfiguracionService {
  constructor(private readonly configPort: ConfiguracionPort) {}

  async obtenerCatalogo(): Promise<CatalogoParametrosOutput> {
    const entidades = await this.configPort.listar();
    const parametros: ParametroConfiguracion[] = entidades.map((e) => ({
      clave: e.clave,
      area: e.area,
      tipoDato: e.tipoDato,
      valor: e.valor,
      descripcion: e.descripcion,
      valorPorDefecto: e.valorPorDefecto,
      rangoMinimo: e.rangoMinimo,
      rangoMaximo: e.rangoMaximo,
      fechaActualizacion: e.fechaActualizacion.toISOString(),
    }));

    return { parametros };
  }

  async actualizarParametro(
    clave: ClaveParametro,
    input: ActualizarParametroInput,
    idAdmin?: number,
  ): Promise<ActualizarParametroOutput> {
    const actual = await this.configPort.obtener(clave);
    if (!actual) {
      throw new EmpleadoError(
        CODIGOS_ERROR_M17.PARAMETRO_INVALIDO,
        `El parámetro "${clave}" no existe en el catálogo del sistema.`,
        404,
      );
    }

    if (input.valor === null || input.valor === undefined) {
      throw new EmpleadoError(
        CODIGOS_ERROR_M17.PARAMETRO_INVALIDO,
        'El valor del parámetro no puede ser nulo (RN-ADM-15).',
        400,
      );
    }

    try {
      const valorAnterior = actual.valor;
      const actualizado = await this.configPort.actualizar(clave, input.valor, idAdmin);

      return {
        clave,
        valorAnterior,
        valorNuevo: actualizado.valor,
        fechaActualizacion: actualizado.fechaActualizacion.toISOString(),
      };
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'Valor fuera de rango permitido.';
      throw new EmpleadoError(CODIGOS_ERROR_M17.PARAMETRO_INVALIDO, mensaje, 400);
    }
  }
}
