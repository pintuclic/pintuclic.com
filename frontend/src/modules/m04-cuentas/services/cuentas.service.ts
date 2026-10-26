import { apiClient } from '@/core/api/apiClient';
import type { RespuestaExitosa } from '@/core/types/respuesta-api.type';
import type {
  ActualizarDatosPerfilFormData,
  DireccionClienteFormData,
  LoginFormData,
  RegistroClienteFormData,
  RegistroEmpresaFormData,
  SolicitarAscensoEmpresaFormData,
} from '../dtos/m04-cuentas.dto';
import type {
  CambioCorreoIniciado,
  Direccion,
  MisSolicitudes,
  PerfilUsuario,
  RegistroIniciado,
  ResultadoLogin,
  UsuarioResumen,
} from '../interfaces/api.interfaces';

/**
 * Servicios HTTP de M04 (cliente). La sesión viaja en la cookie HttpOnly
 * `pc_sid` (ADR-005): ningún método lee ni guarda tokens de sesión.
 */

/* ─── HU-CUE-01 · Registro de persona natural ─── */

export async function registrarCliente(datos: RegistroClienteFormData): Promise<RegistroIniciado> {
  const { data } = await apiClient.post<RespuestaExitosa<RegistroIniciado>>('/cuentas/registro', {
    nombre: datos.nombre,
    correo: datos.correo,
    telefono: datos.telefono,
    contrasena: datos.contrasena,
  });
  return data.data;
}

export async function verificarRegistro(
  idVerificacion: string,
  correo: string,
  codigo: string,
): Promise<UsuarioResumen> {
  const { data } = await apiClient.post<RespuestaExitosa<{ usuario: UsuarioResumen }>>(
    '/cuentas/registro/verificar-otp',
    { idVerificacion, correo, codigo },
  );
  return data.data.usuario;
}

export async function reenviarCodigoRegistro(idVerificacion: string): Promise<RegistroIniciado> {
  const { data } = await apiClient.post<RespuestaExitosa<RegistroIniciado>>(
    '/cuentas/registro/reenviar-otp',
    { idVerificacion },
  );
  return data.data;
}

/* ─── HU-CUE-03 · Registro de empresa ─── */

export async function registrarEmpresa(datos: RegistroEmpresaFormData): Promise<{ idSolicitud: string }> {
  const { data } = await apiClient.post<RespuestaExitosa<{ idSolicitud: string }>>(
    '/cuentas/empresas/registro',
    {
      nombreEmpresa: datos.nombreEmpresa,
      nit: datos.nit,
      nombreRepresentante: datos.nombreRepresentante,
      correoEmpresarial: datos.correoEmpresarial,
      telefono: datos.telefono,
      contrasena: datos.contrasena,
    },
  );
  return data.data;
}

/* ─── HU-CUE-04 · Sesión ─── */

interface RespuestaLogin {
  usuario: Partial<UsuarioResumen> & { idUsuario: number };
  cambioContrasenaPendiente: boolean;
  tokenCambio?: string;
}

export async function iniciarSesion(datos: LoginFormData): Promise<ResultadoLogin> {
  const { data } = await apiClient.post<RespuestaExitosa<RespuestaLogin>>('/cuentas/login', datos);
  const respuesta = data.data;
  if (respuesta.cambioContrasenaPendiente && respuesta.tokenCambio) {
    return { tipo: 'cambio_obligatorio', tokenCambio: respuesta.tokenCambio };
  }
  return { tipo: 'sesion', usuario: respuesta.usuario as UsuarioResumen };
}

export async function cambiarContrasenaPrimerAcceso(
  tokenCambio: string,
  contrasenaActual: string,
  nuevaContrasena: string,
): Promise<UsuarioResumen> {
  const { data } = await apiClient.post<RespuestaExitosa<{ usuario: UsuarioResumen }>>(
    '/cuentas/cambio-password-primer-acceso',
    { tokenCambio, contrasenaActual, nuevaContrasena },
  );
  return data.data.usuario;
}

export async function cerrarSesion(): Promise<void> {
  await apiClient.post('/cuentas/logout', {});
}

/* ─── HU-CUE-05 · Recuperación de contraseña ─── */

export async function solicitarRecuperacion(correo: string): Promise<void> {
  await apiClient.post('/cuentas/recuperar-password/solicitar', { correo });
}

export async function restablecerContrasena(token: string, nuevaContrasena: string): Promise<void> {
  await apiClient.post('/cuentas/recuperar-password/confirmar', { token, nuevaContrasena });
}

/* ─── HU-CUE-06 · Perfil ─── */

export async function obtenerPerfil(): Promise<PerfilUsuario> {
  const { data } = await apiClient.get<RespuestaExitosa<PerfilUsuario>>('/cuentas/perfil');
  return data.data;
}

export async function actualizarPerfil(datos: ActualizarDatosPerfilFormData): Promise<PerfilUsuario> {
  const { data } = await apiClient.put<RespuestaExitosa<PerfilUsuario>>('/cuentas/perfil', datos);
  return data.data;
}

/** Invalida TODAS las sesiones, incluida la actual (DP-16): hay que volver a iniciar sesión. */
export async function cambiarContrasena(contrasenaActual: string, nuevaContrasena: string): Promise<void> {
  await apiClient.put('/cuentas/perfil/password', { contrasenaActual, nuevaContrasena });
}

export async function solicitarCambioCorreo(nuevoCorreo: string, contrasena: string): Promise<CambioCorreoIniciado> {
  const { data } = await apiClient.post<RespuestaExitosa<CambioCorreoIniciado>>(
    '/cuentas/perfil/cambio-correo/solicitar',
    { nuevoCorreo, contrasena },
  );
  return data.data;
}

export async function confirmarCambioCorreo(nuevoCorreo: string, codigo: string): Promise<string> {
  const { data } = await apiClient.post<RespuestaExitosa<{ nuevoCorreo: string }>>(
    '/cuentas/perfil/cambio-correo/confirmar',
    { nuevoCorreo, codigo },
  );
  return data.data.nuevoCorreo;
}

export async function desactivarCuenta(contrasena: string): Promise<void> {
  await apiClient.post('/cuentas/perfil/desactivar', { contrasena });
}

/* ─── HU-CUE-07 · Direcciones ─── */

export async function listarDirecciones(): Promise<Direccion[]> {
  const { data } = await apiClient.get<RespuestaExitosa<Direccion[]>>('/cuentas/direcciones');
  return data.data;
}

/** Quita los opcionales vacíos: el backend rechaza cadenas vacías donde espera ausencia. */
function cuerpoDireccion(datos: DireccionClienteFormData) {
  return {
    direccion: datos.direccion,
    barrio: datos.barrio,
    nombreApellido: datos.nombreApellido,
    telefono: datos.telefono,
    esPredeterminada: datos.esPredeterminada,
    ...(datos.apartamentoCasa ? { apartamentoCasa: datos.apartamentoCasa } : {}),
    ...(datos.latitud !== undefined && datos.longitud !== undefined
      ? { latitud: datos.latitud, longitud: datos.longitud }
      : {}),
  };
}

export async function crearDireccion(datos: DireccionClienteFormData): Promise<Direccion> {
  const { data } = await apiClient.post<RespuestaExitosa<Direccion>>('/cuentas/direcciones', cuerpoDireccion(datos));
  return data.data;
}

export async function actualizarDireccion(idDireccion: string, datos: DireccionClienteFormData): Promise<Direccion> {
  const { data } = await apiClient.put<RespuestaExitosa<Direccion>>(
    `/cuentas/direcciones/${encodeURIComponent(idDireccion)}`,
    // Al editar, sin ubicación en el formulario se envía null para borrar la que estaba guardada.
    { latitud: null, longitud: null, ...cuerpoDireccion(datos) },
  );
  return data.data;
}

export async function eliminarDireccion(idDireccion: string): Promise<void> {
  await apiClient.delete(`/cuentas/direcciones/${encodeURIComponent(idDireccion)}`);
}

/* ─── HU-CUE-06 (06-C) y HU-CUE-10 · Empresa ─── */

export async function consultarMisSolicitudes(): Promise<MisSolicitudes> {
  const { data } = await apiClient.get<RespuestaExitosa<MisSolicitudes>>('/cuentas/empresas/solicitudes/mias');
  return data.data;
}

export async function solicitarAscenso(datos: SolicitarAscensoEmpresaFormData): Promise<{ idSolicitud: string }> {
  const { data } = await apiClient.post<RespuestaExitosa<{ idSolicitud: string }>>('/cuentas/empresas/ascenso', datos);
  return data.data;
}

export interface ArchivoRut {
  nombreOriginal: string;
  tipoMime: 'application/pdf' | 'image/jpeg' | 'image/png';
  tamanoBytes: number;
  sha256: string;
  contenidoBase64: string;
}

export async function solicitarRenovacionNit(nitNuevo: string, rut: ArchivoRut): Promise<{ idSolicitud: string }> {
  const { data } = await apiClient.post<RespuestaExitosa<{ idSolicitud: string }>>(
    '/cuentas/empresas/renovacion-nit',
    { nitNuevo, ...rut },
  );
  return data.data;
}
