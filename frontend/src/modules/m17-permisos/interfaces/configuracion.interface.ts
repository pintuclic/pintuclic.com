import type { ClaveParametro } from '../dtos/configuracion.dto';

/**
 * ==============================================================================
 * Contratos de Tipado para Configuración Global — M17 (Frontend)
 * ==============================================================================
 * CERO RUNTIME. Solo definiciones de TypeScript.
 */

export type AreaParametro = 'autenticacion' | 'comunicaciones' | 'comercial';
export type TipoDatoParametro = 'numero' | 'texto' | 'booleano';

export interface ParametroConfiguracion {
  clave: ClaveParametro;
  area: AreaParametro;
  tipoDato: TipoDatoParametro;
  valor: number | string | boolean;
  descripcion: string;
  valorPorDefecto: number | string | boolean;
  rangoMinimo?: number;
  rangoMaximo?: number;
  fechaActualizacion: string;
}

export interface CatalogoParametrosRespuesta {
  parametros: ParametroConfiguracion[];
}

export interface ActualizarParametroRespuesta {
  clave: ClaveParametro;
  valorAnterior: number | string | boolean;
  valorNuevo: number | string | boolean;
  fechaActualizacion: string;
}
