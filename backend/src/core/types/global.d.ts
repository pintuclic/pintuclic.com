import type { Actor } from '../../modules/m20-seguridad/interfaces/actor.interface';

declare global {
  namespace Express {
    interface Request {
      /**
       * Actor autenticado, inyectado por auth.middleware desde la sesión
       * verificada en el servidor. Regla Anti-IDOR: jamás proviene del cliente.
       */
      actor?: Actor;
    }
  }
}

export {};
