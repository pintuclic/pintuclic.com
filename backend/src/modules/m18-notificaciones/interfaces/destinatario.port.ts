/** A quién se le escribe cuando el evento solo trae el id del titular (p. ej. el despacho de M08). */
export interface DestinatarioAviso {
  nombre: string;
  correo: string;
}

export interface BuscadorDestinatarioPort {
  /** null si la cuenta ya no existe. */
  buscar(idUsuario: number): Promise<DestinatarioAviso | null>;
}
