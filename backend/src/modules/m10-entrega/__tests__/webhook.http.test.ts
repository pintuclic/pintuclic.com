import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { EnviosController } from '../controllers/envios.controller';
import type { EnviosService } from '../services/envios.service';

const TOKEN = 'secreto-de-prueba';
const servidores: Server[] = [];

async function montar(token: string | undefined) {
  const recibidos: Array<{ proveedor: string; cuerpo: unknown }> = [];
  const servicio = {
    procesarWebhook: async (proveedor: string, cuerpo: unknown) => {
      recibidos.push({ proveedor, cuerpo });
      return { procesado: true };
    },
  } as unknown as EnviosService;
  const app = express();
  app.use(express.json());
  app.post('/webhook/:proveedor', new EnviosController(servicio, undefined, token).webhook);
  const servidor = await new Promise<Server>((resolver) => {
    const s = app.listen(0, () => resolver(s));
  });
  servidores.push(servidor);
  const url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/webhook/transportadora_x`;
  const enviar = (autorizacion?: string) =>
    fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(autorizacion ? { authorization: autorizacion } : {}) },
      body: JSON.stringify({ evento: 'x' }),
    });
  return { recibidos, enviar };
}

afterEach(async () => {
  await Promise.all(servidores.splice(0).map((s) => new Promise((resolver) => s.close(resolver))));
});

describe('M10 · webhook del servicio de envíos (R7)', () => {
  it('sin token configurado responde 503 PROVEEDOR_NO_CONFIGURADO', async () => {
    const { enviar, recibidos } = await montar(undefined);
    const r = await enviar(`Bearer ${TOKEN}`);
    expect(r.status).toBe(503);
    expect(((await r.json()) as { error: { code: string } }).error.code).toBe('PROVEEDOR_NO_CONFIGURADO');
    expect(recibidos).toEqual([]);
  });

  it('rechaza con 401 un token ausente o equivocado', async () => {
    const { enviar, recibidos } = await montar(TOKEN);
    expect((await enviar()).status).toBe(401);
    expect((await enviar('Bearer otro')).status).toBe(401);
    expect(recibidos).toEqual([]);
  });

  it('con el token correcto entrega el proveedor y el cuerpo al servicio', async () => {
    const { enviar, recibidos } = await montar(TOKEN);
    const r = await enviar(`Bearer ${TOKEN}`);
    expect(r.status).toBe(200);
    expect(recibidos).toEqual([{ proveedor: 'transportadora_x', cuerpo: { evento: 'x' } }]);
  });
});
