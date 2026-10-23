import { createHash } from 'node:crypto';
import cookieParser from 'cookie-parser';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { RESPUESTA_RECURSO_NO_DISPONIBLE } from '../../../core/utils/apiResponse';
import { ATRIBUTOS_COOKIE_SESION } from '../../../core/utils/cookieSesion';
import { emitirToken } from '../../../core/utils/jwt';
import type { AutorizacionService } from '../../m20-seguridad/services/autorizacion.service';
import type { SesionService } from '../../m20-seguridad/services/sesion.service';
import { construirModuloM04, PERMISO_VALIDAR_EMPRESAS } from '../m04.routes';

/**
 * BUG-M04-01 (QA v0.4.0) — Broken Function-Level Access Control en /admin/empresas/*.
 *
 * A diferencia de m04.routes.test.ts, que solo comprueba que las rutas existan,
 * estas pruebas ejercen peticiones HTTP reales contra los routers con la cadena de
 * guardas verdadera (sesión → permiso). Sin ellas, la omisión del permiso pasó
 * inadvertida con 116/116 pruebas en verde.
 */

const repoSolicitudes = vi.hoisted(() => ({
  listar: vi.fn(),
  buscarPorId: vi.fn(),
  decidirSolicitud: vi.fn(),
  buscarUltimaPorUsuario: vi.fn(),
  listarRenovaciones: vi.fn(),
  buscarRenovacionPorId: vi.fn(),
  decidirRenovacionNit: vi.fn(),
  buscarUltimaRenovacionPorUsuario: vi.fn(),
}));

const repoDocumentos = vi.hoisted(() => ({
  obtenerDocumentoCompleto: vi.fn(),
}));

vi.mock('../repositories/solicitudes-empresa.repository', () => ({
  PrismaSolicitudesEmpresaRepository: class {
    listar = repoSolicitudes.listar;
    buscarPorId = repoSolicitudes.buscarPorId;
    decidirSolicitud = repoSolicitudes.decidirSolicitud;
    buscarUltimaPorUsuario = repoSolicitudes.buscarUltimaPorUsuario;
    listarRenovaciones = repoSolicitudes.listarRenovaciones;
    buscarRenovacionPorId = repoSolicitudes.buscarRenovacionPorId;
    decidirRenovacionNit = repoSolicitudes.decidirRenovacionNit;
    buscarUltimaRenovacionPorUsuario = repoSolicitudes.buscarUltimaRenovacionPorUsuario;
  },
}));

vi.mock('../repositories/documentos.repository', () => ({
  PrismaDocumentosRepository: class {
    obtenerDocumentoCompleto = repoDocumentos.obtenerDocumentoCompleto;
  },
}));

interface ActorSimulado {
  idUsuario: number;
  idSesion: string;
  tipoSesion: 'admin' | 'cliente';
}

const CLIENTE: ActorSimulado = { idUsuario: 99, idSesion: 'sid-cliente', tipoSesion: 'cliente' };
const STAFF_SIN_PERMISO: ActorSimulado = { idUsuario: 50, idSesion: 'sid-staff', tipoSesion: 'admin' };
const AUTORIZADO: ActorSimulado = { idUsuario: 1, idSesion: 'sid-admin', tipoSesion: 'admin' };

const ID_SOLICITUD = '11111111-1111-4111-8111-111111111111';
const ID_RENOVACION = '22222222-2222-4222-8222-222222222222';
const ID_DOCUMENTO = '33333333-3333-4333-8333-333333333333';

const validarYRenovar = vi.fn();
const exigirPermiso = vi.fn();

interface Ruta {
  nombre: string;
  metodo: 'GET' | 'POST';
  ruta: string;
  cuerpo?: Record<string, unknown>;
}

const RUTAS_ADMINISTRATIVAS: Ruta[] = [
  { nombre: 'listar solicitudes', metodo: 'GET', ruta: '/admin/empresas/solicitudes' },
  { nombre: 'detalle de solicitud', metodo: 'GET', ruta: `/admin/empresas/solicitudes/${ID_SOLICITUD}` },
  {
    nombre: 'dictamen de solicitud',
    metodo: 'POST',
    ruta: `/admin/empresas/solicitudes/${ID_SOLICITUD}/dictamen`,
    cuerpo: { decision: 'aprobar' },
  },
  { nombre: 'listar renovaciones de NIT', metodo: 'GET', ruta: '/admin/empresas/renovaciones' },
  { nombre: 'detalle de renovación de NIT', metodo: 'GET', ruta: `/admin/empresas/renovaciones/${ID_RENOVACION}` },
  {
    nombre: 'dictamen de renovación de NIT',
    metodo: 'POST',
    ruta: `/admin/empresas/renovaciones/${ID_RENOVACION}/dictamen`,
    cuerpo: { decision: 'aprobar' },
  },
  { nombre: 'descarga del RUT', metodo: 'GET', ruta: `/admin/empresas/documentos/${ID_DOCUMENTO}` },
];

const RUTA_LISTAR = RUTAS_ADMINISTRATIVAS[0] as Ruta;
const RUTA_DESCARGA = RUTAS_ADMINISTRATIVAS[6] as Ruta;

let servidor: Server;
let base = '';
let secretoOriginal: string | undefined;

/** Simula la sesión que el servidor resolvería para la cookie recibida. */
function simularSesion(actor: ActorSimulado | null): void {
  validarYRenovar.mockResolvedValue(
    actor === null ? { valida: false } : { valida: true, sesion: actor },
  );
}

async function llamar(ruta: Ruta, opciones: { conCookie: boolean } = { conCookie: true }): Promise<Response> {
  const cabeceras: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opciones.conCookie) {
    cabeceras.Cookie = `${ATRIBUTOS_COOKIE_SESION.nombre}=${emitirToken('sid-prueba', 60)}`;
  }
  return fetch(`${base}${ruta.ruta}`, {
    method: ruta.metodo,
    headers: cabeceras,
    ...(ruta.cuerpo !== undefined ? { body: JSON.stringify(ruta.cuerpo) } : {}),
  });
}

async function pedir(
  ruta: Ruta,
  opciones: { conCookie: boolean } = { conCookie: true },
): Promise<{ estado: number; cuerpo: unknown }> {
  const respuesta = await llamar(ruta, opciones);
  const cuerpo: unknown = await respuesta.json();
  return { estado: respuesta.status, cuerpo };
}

function datosTocados(): boolean {
  return [...Object.values(repoSolicitudes), ...Object.values(repoDocumentos)].some(
    (mock) => mock.mock.calls.length > 0,
  );
}

beforeAll(async () => {
  secretoOriginal = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'secreto-de-prueba-con-mas-de-32-caracteres-ok';

  const sesionService = { validarYRenovar } as unknown as SesionService;
  const autorizacion = { exigirPermiso } as unknown as AutorizacionService;
  const m04 = construirModuloM04(sesionService, autorizacion);

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/admin/empresas', m04.adminEmpresasRouter);
  app.use('/cuentas', m04.cuentasRouter);

  servidor = await new Promise<Server>((resolver) => {
    const instancia = app.listen(0, '127.0.0.1', () => resolver(instancia));
  });
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolver) => servidor.close(() => resolver()));
  if (secretoOriginal === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = secretoOriginal;
  }
});

beforeEach(() => {
  // restoreMocks:true limpia las implementaciones entre pruebas.
  simularSesion(AUTORIZADO);
  exigirPermiso.mockResolvedValue(true);
  repoSolicitudes.listar.mockResolvedValue({ items: [], total: 0 });
  repoSolicitudes.listarRenovaciones.mockResolvedValue({ items: [], total: 0 });
  repoSolicitudes.buscarUltimaPorUsuario.mockResolvedValue(null);
  repoSolicitudes.buscarUltimaRenovacionPorUsuario.mockResolvedValue(null);
});

describe('BUG-M04-01 · /admin/empresas exige sesión y el permiso empresas.validar', () => {
  describe.each(RUTAS_ADMINISTRATIVAS)('$nombre ($metodo $ruta)', (ruta) => {
    it('sin cookie de sesión responde 401 y no consulta permisos ni datos', async () => {
      const { estado } = await pedir(ruta, { conCookie: false });

      expect(estado).toBe(401);
      expect(exigirPermiso).not.toHaveBeenCalled();
      expect(datosTocados()).toBe(false);
    });

    it('con una sesión que ya no es válida responde 401', async () => {
      simularSesion(null);

      const { estado } = await pedir(ruta);

      expect(estado).toBe(401);
      expect(exigirPermiso).not.toHaveBeenCalled();
      expect(datosTocados()).toBe(false);
    });

    it('un cliente ordinario recibe el 404 opaco y no toca ningún dato', async () => {
      simularSesion(CLIENTE);
      exigirPermiso.mockResolvedValue(false);

      const { estado, cuerpo } = await pedir(ruta);

      expect(estado).toBe(404);
      expect(cuerpo).toEqual(RESPUESTA_RECURSO_NO_DISPONIBLE);
      expect(exigirPermiso).toHaveBeenCalledWith(CLIENTE, PERMISO_VALIDAR_EMPRESAS, expect.any(Object));
      expect(datosTocados()).toBe(false);
    });

    it('un colaborador con sesión admin pero sin empresas.validar también es rechazado', async () => {
      // El tipo de sesión no concede el permiso (HU-ADM-03, HU-CUE-09 E2).
      simularSesion(STAFF_SIN_PERMISO);
      exigirPermiso.mockResolvedValue(false);

      const { estado, cuerpo } = await pedir(ruta);

      expect(estado).toBe(404);
      expect(cuerpo).toEqual(RESPUESTA_RECURSO_NO_DISPONIBLE);
      expect(datosTocados()).toBe(false);
    });
  });

  it('la denegación no nombra el permiso requerido (RN-SEG-08, HU-CUE-09 E2)', async () => {
    simularSesion(CLIENTE);
    exigirPermiso.mockResolvedValue(false);

    const { cuerpo } = await pedir(RUTA_LISTAR);

    expect(JSON.stringify(cuerpo)).not.toContain(PERMISO_VALIDAR_EMPRESAS);
  });

  it('todas las rutas administrativas devuelven la misma denegación, sin revelar cuáles existen', async () => {
    simularSesion(CLIENTE);
    exigirPermiso.mockResolvedValue(false);

    const respuestas = await Promise.all(RUTAS_ADMINISTRATIVAS.map((ruta) => pedir(ruta)));

    for (const respuesta of respuestas) {
      expect(respuesta).toEqual({ estado: 404, cuerpo: RESPUESTA_RECURSO_NO_DISPONIBLE });
    }
  });

  it('quien tiene empresas.validar lista las solicitudes y las renovaciones', async () => {
    const solicitudes = await pedir(RUTA_LISTAR);
    const renovaciones = await pedir(RUTAS_ADMINISTRATIVAS[3] as Ruta);

    expect(solicitudes.estado).toBe(200);
    expect(solicitudes.cuerpo).toMatchObject({ success: true, data: { items: [], total: 0 } });
    expect(renovaciones.estado).toBe(200);
    expect(renovaciones.cuerpo).toMatchObject({ success: true, data: { items: [], total: 0 } });
    expect(exigirPermiso).toHaveBeenCalledWith(AUTORIZADO, PERMISO_VALIDAR_EMPRESAS, expect.any(Object));
    expect(repoSolicitudes.listar).toHaveBeenCalledTimes(1);
    expect(repoSolicitudes.listarRenovaciones).toHaveBeenCalledTimes(1);
  });
});

describe('Salud de los identificadores: un id mal formado es un 404 opaco, nunca un 500', () => {
  it.each([
    ['detalle de solicitud', 'GET', '/admin/empresas/solicitudes/no-es-un-uuid'],
    ['detalle de renovación', 'GET', '/admin/empresas/renovaciones/123'],
    ['descarga del RUT', 'GET', '/admin/empresas/documentos/no-es-un-uuid'],
  ] as const)('%s con un identificador inválido', async (nombre, metodo, ruta) => {
    const { estado, cuerpo } = await pedir({ nombre, metodo, ruta });

    expect(estado).toBe(404);
    expect(cuerpo).toEqual(RESPUESTA_RECURSO_NO_DISPONIBLE);
    expect(datosTocados()).toBe(false);
  });

  it('el dictamen con un identificador inválido tampoco llega al repositorio', async () => {
    const { estado, cuerpo } = await pedir({
      nombre: 'dictamen',
      metodo: 'POST',
      ruta: '/admin/empresas/solicitudes/abc/dictamen',
      cuerpo: { decision: 'aprobar' },
    });

    expect(estado).toBe(404);
    expect(cuerpo).toEqual(RESPUESTA_RECURSO_NO_DISPONIBLE);
    expect(datosTocados()).toBe(false);
  });
});

describe('HU-CUE-09 · Dictamen', () => {
  const solicitud = {
    idSolicitud: ID_SOLICITUD,
    idUsuario: 7,
    estado: 'pendiente',
    tipoSolicitud: 'registro',
    correoEmpresarial: 'empresa@correo.co',
    nit: '900555666-1',
    nombreEmpresa: 'Empresa SAS',
    nombreRepresentante: 'Ana Pérez',
    telefono: '3001234567',
  };
  const dictamenRechazo = {
    decision: 'rechazar',
    motivoRechazo: 'Documentación incompleta del representante',
  };
  const rutaDictamen: Ruta = {
    nombre: 'dictamen',
    metodo: 'POST',
    ruta: `/admin/empresas/solicitudes/${ID_SOLICITUD}/dictamen`,
    cuerpo: dictamenRechazo,
  };

  it('el revisor del dictamen sale de la sesión del servidor, no del cuerpo enviado', async () => {
    repoSolicitudes.buscarPorId.mockResolvedValue(solicitud);
    repoSolicitudes.decidirSolicitud.mockResolvedValue({
      resultado: 'decidida',
      solicitud: { ...solicitud, estado: 'rechazada' },
    });

    const { estado } = await pedir({
      ...rutaDictamen,
      cuerpo: { ...dictamenRechazo, idAdminRevisor: 12345 },
    });

    expect(estado).toBe(200);
    expect(repoSolicitudes.decidirSolicitud).toHaveBeenCalledWith(
      ID_SOLICITUD,
      expect.objectContaining({ estado: 'rechazada', idAdminRevisor: AUTORIZADO.idUsuario }),
    );
  });

  it('dos decisiones simultáneas: exactamente una prospera y la otra recibe 409 SOLICITUD_YA_DECIDIDA (RNF-CUE-09-01)', async () => {
    repoSolicitudes.buscarPorId.mockResolvedValue(solicitud);
    // El repositorio garantiza la exclusión mutua; aquí se verifica que el contrato
    // HTTP traduce al perdedor en un 409 con el código acordado.
    repoSolicitudes.decidirSolicitud
      .mockResolvedValueOnce({ resultado: 'decidida', solicitud: { ...solicitud, estado: 'rechazada' } })
      .mockResolvedValueOnce({ resultado: 'ya_decidida' });

    const respuestas = await Promise.all([pedir(rutaDictamen), pedir(rutaDictamen)]);
    const estados = respuestas.map((r) => r.estado).sort();

    expect(estados).toEqual([200, 409]);
    const perdedor = respuestas.find((r) => r.estado === 409);
    expect(perdedor?.cuerpo).toMatchObject({
      success: false,
      error: { code: 'RECURSO_NO_ENCONTRADO' },
    });
  });

  it('una solicitud que ya no está pendiente responde 409 sin intentar decidir', async () => {
    repoSolicitudes.buscarPorId.mockResolvedValue({ ...solicitud, estado: 'aprobada' });

    const { estado, cuerpo } = await pedir(rutaDictamen);

    expect(estado).toBe(409);
    expect(cuerpo).toMatchObject({ error: { code: 'RECURSO_NO_ENCONTRADO' } });
    expect(repoSolicitudes.decidirSolicitud).not.toHaveBeenCalled();
  });

  it('el contrato acepta rechazar sin motivo; el servicio lo exige solo en registros (RN-CUE-17)', async () => {
    // Registro: sin motivo -> 400 MOTIVO_RECHAZO_REQUERIDO (no llega a decidir).
    repoSolicitudes.buscarPorId.mockResolvedValue({ ...solicitud, tipoSolicitud: 'registro' });
    const registro = await pedir({ ...rutaDictamen, cuerpo: { decision: 'rechazar' } });
    expect(registro.estado).toBe(400);
    expect(registro.cuerpo).toMatchObject({ error: { code: 'DATOS_INVALIDOS' } });
    expect(repoSolicitudes.decidirSolicitud).not.toHaveBeenCalled();

    // Ascenso: sin motivo -> 200 (opcional).
    repoSolicitudes.buscarPorId.mockResolvedValue({ ...solicitud, tipoSolicitud: 'ascenso_particular' });
    repoSolicitudes.decidirSolicitud.mockResolvedValue({
      resultado: 'decidida',
      solicitud: { ...solicitud, estado: 'rechazada' },
    });
    const ascenso = await pedir({ ...rutaDictamen, cuerpo: { decision: 'rechazar' } });
    expect(ascenso.estado).toBe(200);
  });

  it('rechazar una renovación de NIT sin motivo responde 200 (CA-CUE-09-06)', async () => {
    repoSolicitudes.buscarRenovacionPorId.mockResolvedValue({
      idSolicitud: ID_RENOVACION,
      idUsuario: 7,
      estado: 'pendiente',
      nitAnterior: '900111222-3',
      nitNuevo: '900999888-7',
    });
    repoSolicitudes.decidirRenovacionNit.mockResolvedValue({
      resultado: 'decidida',
      solicitud: { idSolicitud: ID_RENOVACION, estado: 'rechazada' },
    });

    const { estado } = await pedir({
      nombre: 'rechazo de renovación sin motivo',
      metodo: 'POST',
      ruta: `/admin/empresas/renovaciones/${ID_RENOVACION}/dictamen`,
      cuerpo: { decision: 'rechazar' },
    });

    expect(estado).toBe(200);
    expect(repoSolicitudes.decidirRenovacionNit).toHaveBeenCalledWith(
      ID_RENOVACION,
      expect.objectContaining({ estado: 'rechazada', motivoRechazo: null })
    );
  });

  it('un conflicto de NIT al aprobar responde 409 NIT_YA_REGISTRADO', async () => {
    repoSolicitudes.buscarPorId.mockResolvedValue(solicitud);
    repoSolicitudes.decidirSolicitud.mockResolvedValue({ resultado: 'nit_ocupado' });

    const { estado, cuerpo } = await pedir({ ...rutaDictamen, cuerpo: { decision: 'aprobar' } });

    expect(estado).toBe(409);
    expect(cuerpo).toMatchObject({ error: { code: 'NIT_YA_REGISTRADO' } });
  });
});

describe('HU-CUE-09 E14 / RN-CUE-20 · Descarga del RUT', () => {
  const contenido = Buffer.from('%PDF-1.4 contenido-del-rut');
  const documento = {
    idDocumento: ID_DOCUMENTO,
    nombreOriginal: 'mi RUT "final".pdf', // nunca debe llegar a las cabeceras
    tipoMime: 'application/pdf',
    tamanoBytes: contenido.length,
    sha256: createHash('sha256').update(contenido).digest('hex'),
    contenido,
    fechaCarga: new Date('2026-10-21T12:00:00Z'),
  };

  it('entrega el archivo como adjunto, sin sniffing ni caché y con un nombre que no controla el cliente', async () => {
    repoDocumentos.obtenerDocumentoCompleto.mockResolvedValue(documento);

    const respuesta = await llamar(RUTA_DESCARGA);
    const cuerpo = Buffer.from(await respuesta.arrayBuffer());

    expect(respuesta.status).toBe(200);
    expect(cuerpo.equals(contenido)).toBe(true);
    expect(respuesta.headers.get('content-type')).toBe('application/pdf');
    expect(respuesta.headers.get('content-length')).toBe(String(contenido.length));
    expect(respuesta.headers.get('content-disposition')).toBe(`attachment; filename="rut-${ID_DOCUMENTO}.pdf"`);
    expect(respuesta.headers.get('content-disposition')).not.toContain('final');
    expect(respuesta.headers.get('x-content-type-options')).toBe('nosniff');
    expect(respuesta.headers.get('cache-control')).toBe('no-store');
  });

  it('un documento inexistente responde el mismo 404 opaco', async () => {
    repoDocumentos.obtenerDocumentoCompleto.mockResolvedValue(null);

    const { estado, cuerpo } = await pedir(RUTA_DESCARGA);

    expect(estado).toBe(404);
    expect(cuerpo).toEqual(RESPUESTA_RECURSO_NO_DISPONIBLE);
  });

  it('un documento cuya huella no coincide no se entrega', async () => {
    repoDocumentos.obtenerDocumentoCompleto.mockResolvedValue({ ...documento, sha256: 'f'.repeat(64) });

    const { estado, cuerpo } = await pedir(RUTA_DESCARGA);

    expect(estado).toBe(500);
    expect(cuerpo).toMatchObject({ error: { code: 'ARCHIVO_NO_PERMITIDO' } });
    expect(JSON.stringify(cuerpo)).not.toContain('contenido-del-rut');
  });
});

describe('HU-CUE-03 E6 / HU-CUE-10 E3 · GET /cuentas/empresas/solicitudes/mias', () => {
  const rutaMias: Ruta = { nombre: 'mis solicitudes', metodo: 'GET', ruta: '/cuentas/empresas/solicitudes/mias' };

  it('exige sesión', async () => {
    const { estado } = await pedir(rutaMias, { conCookie: false });

    expect(estado).toBe(401);
    expect(repoSolicitudes.buscarUltimaPorUsuario).not.toHaveBeenCalled();
  });

  it('un cliente ordinario consulta SUS solicitudes sin necesitar permisos administrativos', async () => {
    simularSesion(CLIENTE);
    exigirPermiso.mockResolvedValue(false);
    repoSolicitudes.buscarUltimaPorUsuario.mockResolvedValue({
      idSolicitud: ID_SOLICITUD,
      idUsuario: CLIENTE.idUsuario,
      tipoSolicitud: 'ascenso_particular',
      estado: 'rechazada',
      motivoRechazo: 'NIT no coincide con el RUT',
      idAdminRevisor: 1,
      correoEmpresarial: 'interno@correo.co',
      fechaSolicitud: new Date('2026-10-20T10:00:00Z'),
      fechaRevision: new Date('2026-10-21T10:00:00Z'),
    });

    const { estado, cuerpo } = await pedir(rutaMias);

    expect(estado).toBe(200);
    expect(cuerpo).toMatchObject({
      success: true,
      data: {
        solicitudEmpresa: {
          estado: 'rechazada',
          motivoRechazo: 'NIT no coincide con el RUT',
          tipoSolicitud: 'ascenso_particular',
        },
        renovacionNit: null,
      },
    });
    // No se filtran datos internos del revisor ni el correo.
    const texto = JSON.stringify(cuerpo);
    expect(texto).not.toContain('idAdminRevisor');
    expect(texto).not.toContain('interno@correo.co');
    // No requiere el permiso administrativo.
    expect(exigirPermiso).not.toHaveBeenCalled();
  });

  it('la titularidad sale de la sesión: un idUsuario enviado por query se ignora (anti-IDOR)', async () => {
    simularSesion(CLIENTE);

    await pedir({ ...rutaMias, ruta: `${rutaMias.ruta}?idUsuario=1` });

    expect(repoSolicitudes.buscarUltimaPorUsuario).toHaveBeenCalledWith(CLIENTE.idUsuario);
    expect(repoSolicitudes.buscarUltimaRenovacionPorUsuario).toHaveBeenCalledWith(CLIENTE.idUsuario);
  });
});
