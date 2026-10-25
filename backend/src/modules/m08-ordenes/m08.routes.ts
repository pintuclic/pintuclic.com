import { Router, type RequestHandler } from 'express';
import { requirePermission } from '../../core/middlewares/autorizacion.middleware';
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
import type { CatalogoDisponibilidadPort, ConsultaClienteRepository } from './interfaces/consulta-cliente.interface';
import type { EstadosRepository } from './interfaces/estados.interface';
import type { EventosOrdenPort } from './interfaces/eventos-orden.port';
import type { GestionRepository } from './interfaces/gestion.interface';
import type { NotasRepository } from './interfaces/notas.interface';
import type { NotificacionesOrdenPort } from './interfaces/notificaciones-orden.port';
import type { RelojPort } from './interfaces/reloj.port';
import { PrismaConsultaClienteRepository } from './repositories/consulta-cliente.repository';
import { PrismaEstadosRepository } from './repositories/estados.repository';
import { PrismaGestionRepository } from './repositories/gestion.repository';
import { PrismaNotasRepository } from './repositories/notas.repository';
import { ConsultaClienteService } from './services/consulta-cliente.service';
import { EstadosService } from './services/estados.service';
import { GestionService } from './services/gestion.service';
import { NotasService } from './services/notas.service';

/** Permisos atómicos ya sembrados (seed_pintuclic.sql): consultar y operar pedidos. */
export const PERMISOS_ORDENES = { ver: 'ventas.ver', gestionar: 'ventas.gestionar' } as const;

export interface ModuloM08Config {
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
export function construirModuloM08(autorizacion: AutorizacionService, config?: ModuloM08Config): { router: Router } {
  const reloj = config?.estados?.reloj ?? new RelojSistemaAdapter();
  const catalogoPorDefecto = new PrismaCatalogoDisponibilidadAdapter();

  const consultaCliente = new ConsultaClienteService(
    config?.consultaCliente?.repo ?? new PrismaConsultaClienteRepository(),
    config?.consultaCliente?.catalogo ?? catalogoPorDefecto,
    autorizacion,
  );
  const estados = new EstadosService(
    config?.estados?.repo ?? new PrismaEstadosRepository(),
    config?.estados?.eventos ?? new SinEventosOrdenAdapter(),
    config?.estados?.notificaciones ?? new SinNotificacionesOrdenAdapter(),
    reloj,
  );
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
  return { router };
}
