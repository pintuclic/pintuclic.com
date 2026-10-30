import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { RegistroEnviosEnMemoria } from '../adapters/notificaciones.adapter';
import { RebotesWebhookController } from '../controllers/rebotes-webhook.controller';
import { RebotesService } from '../services/rebotes.service';

const TOKEN = 'secreto-de-prueba';
const servidores: Server[] = [];

async function montar(token: string | undefined) {
  const registro = new RegistroEnviosEnMemoria();
  const app = express();
  app.use(express.json());
  app.post('/rebotes', new RebotesWebhookController(new RebotesService(registro), token).recibir);
  const servidor = await new Promise<Server>((resolver) => {
    const s = app.listen(0, () => resolver(s));
  });
  servidores.push(servidor);
  const url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/rebotes`;
  const enviar = (cuerpo: unknown, autorizacion?: string) =>
    fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(autorizacion ? { authorization: autorizacion } : {}) },
      body: JSON.stringify(cuerpo),
    });
  return { registro, enviar };
}

afterEach(async () => {
  await Promise.all(servidores.splice(0).map((s) => new Promise((resolver) => s.close(resolver))));
});

describe('M18 · webhook de rebotes (RF-NOT-04-04)', () => {
  it('sin token configurado responde 503', async () => {
    const { enviar } = await montar(undefined);
    expect((await enviar({ event: 'hard_bounce', email: 'a@b.co' }, `Bearer ${TOKEN}`)).status).toBe(503);
  });

  it('rechaza con 401 un token ausente o equivocado y no registra nada', async () => {
    const { enviar, registro } = await montar(TOKEN);
    expect((await enviar({ event: 'hard_bounce', email: 'a@b.co' })).status).toBe(401);
    expect((await enviar({ event: 'hard_bounce', email: 'a@b.co' }, 'Bearer otro')).status).toBe(401);
    expect(registro.rebotes).toEqual([]);
  });

  it('registra el rebote enlazado al último envío a esa dirección', async () => {
    const { enviar, registro } = await montar(TOKEN);
    await registro.registrarResultado({ tipo: 'registro_otp', destinatario: 'laura@pintuclic.co', estado: 'enviado', intentos: 1, maxIntentos: 3 });

    const r = await enviar({ event: 'hard_bounce', email: 'Laura@PintuClic.co', reason: 'mailbox does not exist' }, `Bearer ${TOKEN}`);

    expect(r.status).toBe(200);
    expect(((await r.json()) as { data: unknown }).data).toEqual({ registrados: 1, ignorados: 0 });
    expect(registro.rebotes).toEqual([{ idEnvio: 'memoria-1', destinatario: 'laura@pintuclic.co', motivo: 'hard_bounce: mailbox does not exist' }]);
  });

  it('en un lote guarda solo los rebotes e ignora entregas y aperturas con 200', async () => {
    const { enviar, registro } = await montar(TOKEN);
    const r = await enviar(
      [
        { event: 'delivered', email: 'a@b.co' },
        { event: 'opened', email: 'a@b.co' },
        { event: 'blocked', email: 'c@d.co' },
      ],
      `Bearer ${TOKEN}`,
    );
    expect(((await r.json()) as { data: unknown }).data).toEqual({ registrados: 1, ignorados: 2 });
    expect(registro.rebotes).toEqual([{ idEnvio: null, destinatario: 'c@d.co', motivo: 'blocked' }]);
  });

  it('un cuerpo sin evento responde 400', async () => {
    const { enviar } = await montar(TOKEN);
    expect((await enviar({ email: 'a@b.co' }, `Bearer ${TOKEN}`)).status).toBe(400);
  });
});
