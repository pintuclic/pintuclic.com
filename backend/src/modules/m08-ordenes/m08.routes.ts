import { Router, type RequestHandler } from 'express';
import { requirePermission } from '../../core/middlewares/autorizacion.middleware';
import { responderRecursoNoDisponible } from '../../core/utils/apiResponse';
import type { AuditoriaPort } from '../m20-seguridad/interfaces/auditoria.port';
import type { AutorizacionService } from '../m20-seguridad/services/autorizacion.service';
import { PrismaCatalogoDisponibilidadAdapter } from './adapters/catalogo-disponibilidad.adapter';
import {
  RelojSistemaAdapter,
  SinEventosOrdenAdapter,
  SinNotificacionesOrdenAdapter,
} from './adapters/predeterminados.adapter';
import { GestionController } from './controllers/gestion.controller';
import { MisPedidosController } from './controllers/mis-pedidos.controller';
import { NotasController } from './controllers/notas.controller';
import { ipDe } from './controllers/orden-http';
import type { CatalogoDisponibilidadPort, ConsultaClienteRepository } from './interfaces/consulta-cliente.interface';
import type { EstadosRepository } from './interfaces/estados.interface';
import type { CreacionRepository } from './interfaces/ordenes.interface';
import type { EventosOrdenPort } from './interfaces/eventos-orden.port';
import type { GestionRepository } from './interfaces/gestion.interface';
import type { NotasRepository } from './interfaces/notas.interface';
import type { NotificacionesOrdenPort } from './interfaces/notificaciones-orden.port';
import type { RelojPort } from './interfaces/reloj.port';
import { PrismaConsultaClienteRepository } from './repositories/consulta-cliente.repository';
import { PrismaCreacionRepository } from './repositories/creacion.repository';
import { PrismaEstadosRepository } from './repositories/estados.repository';
import { PrismaGestionRepository } from './repositories/gestion.repository';
import { PrismaNotasRepository } from './repositories/notas.repository';
import { ConsultaClienteService } from './services/consulta-cliente.service';
import { CreacionService } from './services/creacion.service';
import { EstadosService } from './services/estados.service';
import { GestionService } from './services/gestion.service';
import { NotasService } from './services/notas.service';

/** Permisos atómicos ya sembrados (seed_pintuclic.sql): consultar y operar pedidos. */
export const PERMISOS_ORDENES = { ver: 'ventas.ver', gestionar: 'ventas.gestionar' } as const;

/**
 * La gestión de pedidos es del personal: una sesión de CLIENTE nunca entra, aunque su rol traiga
 * `ventas.ver` o `ventas.gestionar` (el seed se los daba al rol `empresa_vip`, y los permisos se
 * resuelven por rol). Responde el mismo 404 opaco que un recurso inexistente y deja rastro (M20).
 */
function exigirSesionDePersonal(auditoria?: AuditoriaPort): RequestHandler {
  return async (req, res, next) => {
    const actor = req.actor;
    if (actor?.tipoSesion === 'admin') {
      next();
      return;
    }
    if (actor !== undefined) {
      await auditoria?.registrarAccesoDenegado({
        idUsuario: actor.idUsuario,
        operacionIntentada: `${req.method} ${req.originalUrl.split('?')[0] ?? req.path}`,
        permisoRequerido: null,
        fecha: new Date(),
        ipOrigen: ipDe(req),
      });
    }
    responderRecursoNoDisponible(res);
  };
}

export interface ModuloM08Config {
  /** Puerto de auditoría de M20, para registrar los accesos denegados por tipo de sesión. */
  auditoria?: AuditoriaPort;
  /** Dobles inyectables para pruebas; en producción se usan los de Prisma y los adaptadores por defecto. */
  consultaCliente?: {
    repo?: ConsultaClienteRepository;
    catalogo?: CatalogoDisponibilidadPort;
  };
  gestion?: {
    repo?: GestionRepository;
    catalogo?: CatalogoDisponibilidadPort;
  };
  notas?: {
    repo?: NotasRepository;
  };
  creacion?: {
    repo?: CreacionRepository;
  };
  estados?: {
    repo?: EstadosRepository;
    eventos?: EventosOrdenPort;
    notificaciones?: NotificacionesOrdenPort;
    reloj?: RelojPort;
  };
}

/**
 * M08 · Orden de venta (contracts/m08-ordenes.contract.ts). Se monta bajo `/ordenes`, detrás de
 * la sesión: el cliente titular usa `/mis-pedidos`; el personal usa `/gestion`.
 */
export function construirModuloM08(
  autorizacion: AutorizacionService,
  config?: ModuloM08Config,
): { router: Router; creacion: CreacionService } {
  const reloj = config?.estados?.reloj ?? new RelojSistemaAdapter();
  const notificaciones = config?.estados?.notificaciones ?? new SinNotificacionesOrdenAdapter();
  const catalogoPorDefecto = new PrismaCatalogoDisponibilidadAdapter();

  const consultaCliente = new ConsultaClienteService(
    config?.consultaCliente?.repo ?? new PrismaConsultaClienteRepository(),
    config?.consultaCliente?.catalogo ?? catalogoPorDefecto,
    autorizacion,
  );
  const estados = new EstadosService(
    config?.estados?.repo ?? new PrismaEstadosRepository(),
    config?.estados?.eventos ?? new SinEventosOrdenAdapter(),
    notificaciones,
    reloj,
  );
  /** Punto de entrada de M07: se llama al confirmarse el pago (HU-ORD-01). Sin ruta HTTP (R1). */
  const creacion = new CreacionService(config?.creacion?.repo ?? new PrismaCreacionRepository(), notificaciones, reloj);
  const gestionService = new GestionService(
    config?.gestion?.repo ?? new PrismaGestionRepository(),
    estados,
    config?.gestion?.catalogo ?? catalogoPorDefecto,
    reloj,
  );

  const misPedidos = new MisPedidosController(consultaCliente);
  const gestion = new GestionController(gestionService);
  const notas = new NotasController(new NotasService(config?.notas?.repo ?? new PrismaNotasRepository()));
  const ver = requirePermission(autorizacion, PERMISOS_ORDENES.ver) as RequestHandler;
  const gestionar = requirePermission(autorizacion, PERMISOS_ORDENES.gestionar) as RequestHandler;

  const router = Router();
  router.get('/mis-pedidos', misPedidos.listar);
  router.get('/mis-pedidos/:codigo', misPedidos.detalle);

  // Todo `/gestion` exige sesión de personal antes de comprobar el permiso atómico.
  router.use('/gestion', exigirSesionDePersonal(config?.auditoria));

  // `/gestion/resumen` va antes de `/gestion/:codigo` para que no se tome «resumen» como código.
  router.get('/gestion', ver, gestion.listar);
  router.get('/gestion/resumen', ver, gestion.resumen);
  router.get('/gestion/:codigo', ver, gestion.detalle);
  router.get('/gestion/:codigo/historial-cliente', ver, gestion.historialCliente);
  router.patch('/gestion/:codigo/estado', gestionar, gestion.cambiarEstado);

  // Notas y contactos: solo se añaden (R11). Editar o borrar responde 405 NOTA_INMUTABLE.
  router.post('/gestion/:codigo/notas', gestionar, notas.crearNota);
  router.post('/gestion/:codigo/contactos', gestionar, notas.crearContacto);
  const rutasInmutables = [
    '/gestion/:codigo/notas',
    '/gestion/:codigo/notas/:idNota',
    '/gestion/:codigo/contactos',
    '/gestion/:codigo/contactos/:idContacto',
  ];
  for (const ruta of rutasInmutables) {
    router.put(ruta, gestionar, notas.inmutable);
    router.patch(ruta, gestionar, notas.inmutable);
    router.delete(ruta, gestionar, notas.inmutable);
  }
  return { router, creacion };
}
