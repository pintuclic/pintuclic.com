/**
 * Tipos de cliente empresa (sub-roles con su descuento), que administra M06. M04 solo necesita saber cuáles hay
 * activos para ofrecerlos al aprobar una cuenta y validar el que se elige. `TiposClienteService` de M06 cumple
 * esta forma sin que M04 importe nada de M06.
 */
export interface TipoClienteOpcionPort {
  idSubRolEmpresa: number;
  nombre: string;
  porcentaje: number;
  montoMinimoCompra: number;
}

export interface TiposClientePort {
  listarActivos(): Promise<TipoClienteOpcionPort[]>;
  existeActivo(idSubRolEmpresa: number): Promise<boolean>;
}
