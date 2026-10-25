import { Router } from 'express';
import type { AutorizacionService } from '../m20-seguridad/services/autorizacion.service';
import { PrismaCatalogoDisponibilidadAdapter } from './adapters/catalogo-disponibilidad.adapter';
import { MisPedidosController } from './controllers/mis-pedidos.controller';
import type { CatalogoDisponibilidadPort, ConsultaClienteRepository } from './interfaces/consulta-cliente.interface';
import { PrismaConsultaClienteRepository } from './repositories/consulta-cliente.repository';
import { ConsultaClienteService } from './services/consulta-cliente.service';

export interface ModuloM08Config {
  /** Dobles inyectables para pruebas; en producción se usan los de Prisma. */
  consultaCliente?: {
    repo?: ConsultaClienteRepository;
    catalogo?: CatalogoDisponibilidadPort;
  };
}

/**
 * M08 · Orden de venta (contracts/m08-ordenes.contract.ts). Se monta bajo `/ordenes`, detrás de
 * la sesión: el cliente titular usa `/mis-pedidos`; el personal usará `/gestion`.
 */
export function construirModuloM08(autorizacion: AutorizacionService, config?: ModuloM08Config): { router: Router } {
  const consultaCliente = new ConsultaClienteService(
    config?.consultaCliente?.repo ?? new PrismaConsultaClienteRepository(),
    config?.consultaCliente?.catalogo ?? new PrismaCatalogoDisponibilidadAdapter(),
    autorizacion,
  );
  const misPedidos = new MisPedidosController(consultaCliente);

  const router = Router();
  router.get('/mis-pedidos', misPedidos.listar);
  router.get('/mis-pedidos/:codigo', misPedidos.detalle);
  return { router };
}
