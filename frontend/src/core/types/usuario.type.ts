/**
 * Usuario autenticado tal como lo expone el backend.
 *
 * ⚠️ Este tipo NO lleva la lista de permisos. RF-ADM-03-03 exige resolverlos en
 * el servidor ante cada operación: una copia en el cliente sobreviviría a su
 * revocación y rompería CA-SEG-02-05. La interfaz puede ocultar opciones por
 * usabilidad, pero eso se consulta aparte y nunca es el control de acceso
 * (RF-SEG-03-06).
 */
export interface UsuarioAutenticado {
  idUsuario: number;
  correo: string;
  nombre: string;
  tipo: TipoCuenta;
}

/** Espejo de `enum_tipo_usuario` en bd/sql/schema_pintuclic.sql. */
export type TipoCuenta = 'normal' | 'empresa';
