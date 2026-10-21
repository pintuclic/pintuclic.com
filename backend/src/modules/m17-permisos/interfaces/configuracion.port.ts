import type {
  AreaParametro,
  ClaveParametro,
  TipoDatoParametro,
} from '../dtos/m17-permisos.dto';

export interface EntidadParametro {
  clave: ClaveParametro;
  area: AreaParametro;
  tipoDato: TipoDatoParametro;
  valor: number | string | boolean;
  descripcion: string;
  valorPorDefecto: number | string | boolean;
  rangoMinimo?: number | undefined;
  rangoMaximo?: number | undefined;
  fechaActualizacion: Date;
  idUsuarioActualizo?: number | null | undefined;
}

export interface ConfiguracionPort {
  listar(): Promise<EntidadParametro[]>;
  obtener(clave: ClaveParametro): Promise<EntidadParametro | null>;
  actualizar(
    clave: ClaveParametro,
    nuevoValor: number | string | boolean,
    idAdmin?: number,
  ): Promise<EntidadParametro>;
}
