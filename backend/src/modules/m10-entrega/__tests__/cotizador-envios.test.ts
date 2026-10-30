import { describe, expect, it, vi } from 'vitest';
import { EnvioPropioAdapter } from '../adapters/envio-propio.adapter';
import type { OpcionEnvio, ServicioEnviosPort } from '../dtos/m10-entrega.dto';
import type { VarianteParaEnvio } from '../interfaces/entrega.interface';
import { CotizadorEnvios } from '../services/cotizador-envios';
import { ProveedorEnvioError } from '../services/envio.error';

const DIRECCION = 'Calle 10 # 5-20, Centro · Recibe: Laura Pérez, 3151234567 · Municipio: Bogotá · Departamento: Cundinamarca';
const ORIGEN = { nombre: 'Pintu Clic', direccion: 'Cra 1 # 2-3', ciudad: 'Bogotá', telefono: null, correo: null };
const entrada = { direccion: DIRECCION, totalMercancia: 90_000, lineas: [{ idVariante: 1, cantidad: 2, valor: 45_000 }] };

const conPeso: VarianteParaEnvio = { descripcion: 'Viniltex · Galón', pesoGramos: 4200, altoCm: 20, anchoCm: 18, largoCm: 18 };
const sinPeso: VarianteParaEnvio = { ...conPeso, pesoGramos: null };

const propio = () => new EnvioPropioAdapter({ obtenerNumero: async () => null });

function proveedor(cotizar: ServicioEnviosPort['cotizar'], nombre = 'transportadora_x'): ServicioEnviosPort {
  return { proveedor: nombre, cotizar, crearEnvio: vi.fn(), consultarSeguimiento: vi.fn(), interpretarWebhook: vi.fn() };
}

const cotizador = (p: ServicioEnviosPort, variante: VarianteParaEnvio = conPeso, tiempoMs = 50) =>
  new CotizadorEnvios(p, propio(), { porIds: async () => new Map([[1, variante]]) }, { obtener: async () => ORIGEN }, tiempoMs);

describe('CotizadorEnvios · el proveedor calcula el costo', () => {
  it('le entrega origen, destino con municipio y bultos con peso y medidas, y devuelve la opción más barata', async () => {
    const cotizar = vi.fn<ServicioEnviosPort['cotizar']>(async () => [
      { proveedor: 'transportadora_x', servicio: 'Express', costo: 18_000, diasEstimados: 1 },
      { proveedor: 'transportadora_x', servicio: 'Económico', costo: 11_000, diasEstimados: 4 },
    ]);

    const r = await cotizador(proveedor(cotizar)).cotizarDomicilio(entrada);

    expect(r).toEqual({ costo: 11_000, servicio: 'Económico', proveedor: 'transportadora_x', esEstimado: false });
    expect(cotizar).toHaveBeenCalledWith(
      expect.objectContaining({
        origen: ORIGEN,
        destino: expect.objectContaining({ municipio: 'Bogotá', departamento: 'Cundinamarca' }),
        bultos: [expect.objectContaining({ cantidad: 2, pesoGramos: 4200, altoCm: 20 })],
      }),
    );
  });

  it('si el proveedor falla cae a la tarifa de respaldo y marca la cotización como estimada', async () => {
    const r = await cotizador(proveedor(async () => { throw new ProveedorEnvioError('503'); })).cotizarDomicilio(entrada);
    expect(r).toMatchObject({ costo: 15_000, proveedor: 'envio_propio', esEstimado: true });
  });

  it('si el proveedor tarda más del tiempo máximo cae al respaldo', async () => {
    const lento = proveedor(() => new Promise<OpcionEnvio[]>(() => undefined));
    expect(await cotizador(lento, conPeso, 20).cotizarDomicilio(entrada)).toMatchObject({ proveedor: 'envio_propio', esEstimado: true });
  });

  it('si el proveedor no ofrece opciones cae al respaldo', async () => {
    expect(await cotizador(proveedor(async () => [])).cotizarDomicilio(entrada)).toMatchObject({ esEstimado: true });
  });

  it('un proveedor real no cotiza si falta el peso de un producto o el municipio: usa el respaldo sin llamarlo', async () => {
    const cotizar = vi.fn<ServicioEnviosPort['cotizar']>(async () => [{ proveedor: 'x', servicio: 's', costo: 1, diasEstimados: null }]);

    expect(await cotizador(proveedor(cotizar), sinPeso).cotizarDomicilio(entrada)).toMatchObject({ proveedor: 'envio_propio', esEstimado: true });
    expect(await cotizador(proveedor(cotizar)).cotizarDomicilio({ ...entrada, direccion: 'Calle 10 # 5-20, Centro · Recibe: Laura, 315' })).toMatchObject({ esEstimado: true });
    expect(cotizar).not.toHaveBeenCalled();
  });
});

describe('CotizadorEnvios · con la entrega propia (hoy)', () => {
  it('cobra la tarifa plana sin exigir peso ni municipio, y no la marca como estimada', async () => {
    const c = cotizador(propio(), sinPeso);
    expect(await c.cotizarDomicilio({ ...entrada, direccion: null })).toEqual({
      costo: 15_000,
      servicio: 'Entrega propia',
      proveedor: 'envio_propio',
      esEstimado: false,
    });
  });

  it('es gratis al alcanzar el umbral de compra', async () => {
    expect((await cotizador(propio()).cotizarDomicilio({ ...entrada, totalMercancia: 200_000 })).costo).toBe(0);
  });
});
