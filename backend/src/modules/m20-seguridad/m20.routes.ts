import { Router } from 'express';
import type { RequestHandler } from 'express';
import { PrivacidadController } from './controllers/privacidad.controller';
import { SesionController } from './controllers/sesion.controller';
import { PrivacidadRepository } from './repositories/privacidad.repository';
import { SesionRepository } from './repositories/sesion.repository';
import { UsuarioRepository } from './repositories/usuario.repository';
import type { AuditoriaPort } from './interfaces/auditoria.port';
import { AuditoriaPersistente } from './services/auditoria.service';
import { ParametrosSeguridadEnv } from './services/parametros-seguridad.service';
import { PrivacidadService } from './services/privacidad.service';
import { SesionService } from './services/sesion.service';

/** Ensamblaje del módulo: inyección de dependencias y registro de rutas. */
export function construirModuloM20(): {
  router: Router;
  sesionService: SesionService;
  auditoria: AuditoriaPort;
} {
  const sesionRepo = new SesionRepository();
  const usuarioRepo = new UsuarioRepository();
  const privacidadRepo = new PrivacidadRepository();

  const parametros = new ParametrosSeguridadEnv();
  /**
   * HU-SEG-04: `registrarAccion` se persiste en `registro_auditoria`, que es inmutable.
   * Los accesos denegados siguen yendo al registro técnico, porque la lista de acciones que
   * se guardan la define el Product Owner (RF-SEG-04-01) y aún no los incluye.
   */
  const auditoria: AuditoriaPort = new AuditoriaPersistente();
  const sesionService = new SesionService(sesionRepo, usuarioRepo, parametros);
  const privacidadService = new PrivacidadService(privacidadRepo);

  const sesionController = new SesionController(sesionService);
  const privacidadController = new PrivacidadController(privacidadService);

  const router = Router();

  // Público (RF-SEG-05-03)
  router.get('/privacidad/aviso-vigente', privacidadController.avisoVigente as RequestHandler);

  // Protegidas: el authMiddleware se monta en app.routes.ts antes de este router.
  router.post('/sesiones/cerrar', sesionController.cerrar as RequestHandler);
  router.post('/privacidad/consentimiento', privacidadController.otorgarConsentimiento as RequestHandler);
  router.post('/privacidad/supresion', privacidadController.solicitarSupresion as RequestHandler);
  router.get('/privacidad/supresion', privacidadController.misSolicitudes as RequestHandler);

  return { router, sesionService, auditoria };
}
