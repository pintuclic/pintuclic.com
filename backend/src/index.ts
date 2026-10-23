import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import { construirAppRoutes } from './app.routes';
import { construirCors } from './core/middlewares/cors.middleware';
import { construirParserJson } from './core/middlewares/cuerpoJson.middleware';
import { errorHandler, rutaNoEncontrada } from './core/middlewares/errorHandler';

/** Composición root. */
export function construirApp(): express.Express {
  const app = express();

  app.disable('x-powered-by'); // RF-SEG-06-04: no revelar componentes.
  app.use(construirCors());
  // 100 kb en toda la API; 7 MB solo donde viaja el RUT en base64 (HU-CUE-10).
  app.use(construirParserJson());
  app.use(cookieParser());

  app.use('/api/v1', construirAppRoutes());

  app.use(rutaNoEncontrada);
  app.use(errorHandler);

  return app;
}

if (require.main === module) {
  const puerto = Number.parseInt(process.env.PORT ?? '3000', 10);
  construirApp().listen(puerto, () => {
    console.log(`[pintuclic] API escuchando en el puerto ${puerto}`);
  });
}
