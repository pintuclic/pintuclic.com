export interface UsuarioAutenticado {
  id: number;
  correo: string;
  nombreCompleto: string;
  tipo: 'B2C' | 'B2B' | 'EMPLEADO' | 'ADMIN';
  permisos: string[];
}
