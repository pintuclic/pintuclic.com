import { Router, type RequestHandler } from 'express';
import { CalculadoraController } from './controllers/calculadora.controller';
import type {
  CalculadoraRepositoryPort,
  ConfiguracionCalculadoraPort,
} from './interfaces/calculadora.interface';
import { PrismaCalculadoraRepository } from './repositories/calculadora.repository';
import { PrismaConfiguracionAsesoriaRepository } from './repositories/configuracion.repository';
import { CalculadoraService } from './services/calculadora.service';

/**
 * M03 — Asesoría y asistencia.
 *
 * Esta entrega monta la CALCULADORA (HU-ASE-02), que es pública y no usa inteligencia
 * artificial. El cuestionario guiado (E3) y el asistente (E4) añaden aquí su propio router
 * público y el de administración, con los permisos `asesoria.ver` / `asesoria.editar` que ya
 * están sembrados.
 */
export function construirModuloM03(
  /** Solo para las pruebas: en producción se omite y se usan los repositorios de Prisma. */
  dependencias: {
    calculadoraRepo?: CalculadoraRepositoryPort;
    configuracionRepo?: ConfiguracionCalculadoraPort;
  } = {},
): {
  publicRouter: Router;
  calculadoraService: CalculadoraService;
} {
  const calculadoraRepo = dependencias.calculadoraRepo ?? new PrismaCalculadoraRepository();
  const configuracionRepo = dependencias.configuracionRepo ?? new PrismaConfiguracionAsesoriaRepository();

  const calculadoraService = new CalculadoraService(calculadoraRepo, configuracionRepo);
  const calculadora = new CalculadoraController(calculadoraService);

  const publicRouter = Router();
  publicRouter.get('/calculadora/productos', calculadora.listarProductos as RequestHandler);
  publicRouter.get(
    '/calculadora/productos/:idProducto',
    calculadora.obtenerDeProducto as RequestHandler,
  );
  publicRouter.post('/calculadora/calcular', calculadora.calcular as RequestHandler);

  return { publicRouter, calculadoraService };
}
