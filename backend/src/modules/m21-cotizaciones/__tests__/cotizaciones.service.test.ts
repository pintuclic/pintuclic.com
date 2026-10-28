import { beforeEach, describe, expect, it } from 'vitest';
import { cotizacionDetalleSchema, cotizacionResumenSchema } from '../dtos/m21-cotizaciones.dto';
import type { ActualizarCotizacionRequest, CotizacionDetalle } from '../dtos/m21-cotizaciones.dto';
import { CotizacionesError } from '../services/cotizaciones-error';
import { CotizacionesService } from '../services/cotizaciones.service';
import { CarritoEjemplo, CotizacionesMemoriaRepository, NotificacionesEjemplo } from './helpers/dobles';

/** 15:00 UTC = 10:00 en Bogotá del 26 de octubre. */
const AHORA = new Date('2026-10-26T15:00:00.000Z');
const ANA = 50;
const SOL = 60;
const ADMIN = 1;

let ahora: Date;
let repo: CotizacionesMemoriaRepository;
let carrito: CarritoEjemplo;
let avisos: NotificacionesEjemplo;
let dias: number | null;
let servicio: CotizacionesService;

async function errorDe(p: Promise<unknown>): Promise<CotizacionesError> {
  try {
    await p;
  } catch (err: unknown) {
    if (err instanceof CotizacionesError) return err;
    throw err;
  }
  throw new Error('Se esperaba un CotizacionesError');
}

const valida = (c: CotizacionDetalle): CotizacionDetalle => cotizacionDetalleSchema.parse(c);

/** Una cotización pedida por Ana con dos líneas: 2 × 100 000 y 3 × 50 000. */
async function pedida(): Promise<CotizacionDetalle> {
  carrito.lineas = [
    { idVariante: 1, idColor: 13, cantidad: 2, precio: 100_000 },
    { idVariante: 2, cantidad: 3, precio: 50_000 },
  ];
  return servicio.crear(ANA, { comentario: 'Para una obra' });
}

const conPrecios = (c: CotizacionDetalle, precios: readonly number[]): ActualizarCotizacionRequest => ({
  lineas: c.lineas.map((l, i) => ({ idLinea: l.idLinea, cantidad: l.cantidad, precioAcordado: precios[i] ?? null })),
  notaParaCliente: 'Precio por volumen',
  fechaVencimiento: null,
});

async function enviada(): Promise<CotizacionDetalle> {
  const c = await pedida();
  await servicio.actualizar(c.idCotizacion, conPrecios(c, [90_000, 45_000]));
  return servicio.enviar(c.idCotizacion, ADMIN);
}

beforeEach(() => {
  ahora = AHORA;
  repo = new CotizacionesMemoriaRepository(() => ahora);
  carrito = new CarritoEjemplo();
  avisos = new NotificacionesEjemplo();
  dias = 15;
  servicio = new CotizacionesService({
    repo,
    carrito,
    notificaciones: avisos,
    parametros: { obtenerNumero: () => Promise.resolve(dias) },
    reloj: () => ahora,
  });
});

describe('M21 · pedir una cotización (R2–R4)', () => {
  it('copia las líneas vendibles del carrito con su precio de referencia y no toca el carrito', async () => {
    carrito.lineas = [
      { idVariante: 1, idColor: 13, cantidad: 2, precio: 100_000 },
      { idVariante: 2, cantidad: 1, precio: 30_000, vendible: false },
      { idVariante: 3, cantidad: 1, precio: 10_000, idCotizacion: 9 },
      { idVariante: 4, cantidad: 3, precio: 50_000 },
    ];
    const c = valida(await servicio.crear(ANA, { comentario: 'Para una obra' }));
    expect(c).toMatchObject({ codigo: 'COT-000001', estado: 'solicitada', comentarioCliente: 'Para una obra', totalReferencia: 350_000 });
    expect(c.lineas.map((l) => [l.idVariante, l.cantidad, l.precioReferencia, l.precioAcordado])).toEqual([
      [1, 2, 100_000, null],
      [4, 3, 50_000, null],
    ]);
    expect(c.lineas[0]?.producto).toEqual({
      nombre: 'Producto 1',
      marca: 'Pintuco',
      medida: 'Galón',
      sku: 'SKU-1',
      color: { nombre: 'Color 13', hexadecimal: '#FFCC00' },
    });
    expect(c.cliente).toBeNull();
    expect(carrito.agregadas).toHaveLength(0);
  });

  it('sin líneas vendibles responde 400 CARRITO_VACIO', async () => {
    carrito.lineas = [{ idVariante: 2, cantidad: 1, precio: 30_000, vendible: false }];
    const e = await errorDe(servicio.crear(ANA, {}));
    expect([e.status, e.code]).toEqual([400, 'CARRITO_VACIO']);
  });

  it('no deja tener más de 5 abiertas; una respondida ya no cuenta', async () => {
    for (let i = 0; i < 5; i++) await pedida();
    const e = await errorDe(pedida());
    expect([e.status, e.code]).toEqual([409, 'LIMITE_COTIZACIONES']);
    await servicio.rechazarComoAdmin(1, ADMIN, { motivo: 'Sin existencias' });
    await expect(pedida()).resolves.toBeDefined();
  });
});

describe('M21 · el cliente solo ve lo suyo (R1)', () => {
  it('una ajena o inexistente responde 404 opaco, y su lista solo trae las suyas', async () => {
    const c = await pedida();
    for (const p of [servicio.obtenerMia(SOL, c.idCotizacion), servicio.aceptar(SOL, c.idCotizacion), servicio.obtenerMia(ANA, 999)]) {
      const e = await errorDe(p);
      expect([e.status, e.code]).toEqual([404, 'RECURSO_NO_DISPONIBLE']);
    }
    expect((await servicio.listarMias(SOL, { pagina: 1, limite: 20 })).total).toBe(0);
    const mias = await servicio.listarMias(ANA, { pagina: 1, limite: 20 });
    expect(mias.items.map((x) => cotizacionResumenSchema.parse(x).cantidadLineas)).toEqual([2]);
  });
});

describe('M21 · ajuste del admin (R5)', () => {
  it('fija precios y cantidades, quita líneas y recalcula la referencia', async () => {
    const c = await pedida();
    const [l1, l2] = c.lineas;
    if (l1 === undefined || l2 === undefined) throw new Error('faltan líneas');
    const r = valida(
      await servicio.actualizar(c.idCotizacion, {
        lineas: [{ idLinea: l1.idLinea, cantidad: 5, precioAcordado: 90_000 }],
        notaParaCliente: 'Descuento por volumen',
        fechaVencimiento: '2026-11-15',
      }),
    );
    expect(r.lineas).toHaveLength(1);
    expect(r.lineas[0]).toMatchObject({ cantidad: 5, precioAcordado: 90_000, subtotalAcordado: 450_000 });
    expect(r).toMatchObject({ totalReferencia: 500_000, notaParaCliente: 'Descuento por volumen', fechaVencimiento: '2026-11-15' });
    expect(r.cliente?.nombre).toBe('Ana Pérez');
  });

  it('rechaza líneas ajenas y fechas fuera de rango con 400', async () => {
    const c = await pedida();
    const base = conPrecios(c, [1, 1]);
    for (const req of [
      { ...base, lineas: [{ idLinea: 999, cantidad: 1, precioAcordado: 1 }] },
      { ...base, fechaVencimiento: '2026-10-25' },
      { ...base, fechaVencimiento: '2027-12-31' },
    ]) {
      const e = await errorDe(servicio.actualizar(c.idCotizacion, req));
      expect([e.status, e.code]).toEqual([400, 'PARAMETRO_INVALIDO']);
    }
  });

  it('una ya enviada no se edita (409)', async () => {
    const c = await enviada();
    const e = await errorDe(servicio.actualizar(c.idCotizacion, conPrecios(c, [1, 1])));
    expect([e.status, e.code]).toEqual([409, 'ESTADO_NO_PERMITE']);
  });
});

describe('M21 · enviar (R6)', () => {
  it('sin todos los precios responde 400 COTIZACION_INCOMPLETA', async () => {
    const c = await pedida();
    await servicio.actualizar(c.idCotizacion, conPrecios(c, [90_000]));
    const e = await errorDe(servicio.enviar(c.idCotizacion, ADMIN));
    expect([e.status, e.code]).toEqual([400, 'COTIZACION_INCOMPLETA']);
  });

  it('queda enviada con total acordado, vence en los días del parámetro y avisa al cliente', async () => {
    const r = valida(await enviada());
    expect(r).toMatchObject({ estado: 'enviada', totalAcordado: 315_000, fechaVencimiento: '2026-11-10' });
    expect(r.fechaEnvio).toBe(AHORA.toISOString());
    expect(avisos.avisos).toEqual([
      { tipo: 'respondida', evento: expect.objectContaining({ codigo: r.codigo, correoCliente: 'ana@cliente.co', totalAcordado: 315_000 }) },
    ]);
  });

  it('si el parámetro no se puede leer usa 15 días; si M18 falla, igual queda enviada', async () => {
    dias = null;
    avisos.fallar = true;
    expect((await enviada()).fechaVencimiento).toBe('2026-11-10');
    dias = 30;
    avisos.fallar = false;
    expect((await enviada()).fechaVencimiento).toBe('2026-11-25');
  });
});

describe('M21 · respuesta del cliente (R8–R10)', () => {
  it('aceptar la deja aprobada y lleva las líneas al carrito con su precio acordado', async () => {
    const c = await enviada();
    const r = valida(await servicio.aceptar(ANA, c.idCotizacion));
    expect(r.estado).toBe('aprobada');
    expect(r.fechaRespuesta).toBe(AHORA.toISOString());
    expect(carrito.agregadas).toEqual([
      {
        idUsuario: ANA,
        idCotizacion: c.idCotizacion,
        lineas: [
          { idVariante: 1, idColor: 13, cantidad: 2, precioAcordado: 90_000 },
          { idVariante: 2, idColor: null, cantidad: 3, precioAcordado: 45_000 },
        ],
      },
    ]);
    const e = await errorDe(servicio.aceptar(ANA, c.idCotizacion));
    expect([e.status, e.code]).toEqual([409, 'ESTADO_NO_PERMITE']);
  });

  it('una solicitada todavía no se puede aceptar', async () => {
    const c = await pedida();
    expect((await errorDe(servicio.aceptar(ANA, c.idCotizacion))).code).toBe('ESTADO_NO_PERMITE');
  });

  it('si el carrito está lleno responde CARRITO_LLENO y la cotización sigue enviada', async () => {
    const c = await enviada();
    carrito.fallo = Object.assign(new Error('lleno'), { code: 'LIMITE_LINEAS_ALCANZADO' });
    const e = await errorDe(servicio.aceptar(ANA, c.idCotizacion));
    expect([e.status, e.code]).toEqual([409, 'CARRITO_LLENO']);
    expect((await servicio.obtenerMia(ANA, c.idCotizacion)).estado).toBe('enviada');
  });

  it('pasada la fecha queda vencida al consultarla y no se puede aceptar', async () => {
    const c = await enviada();
    ahora = new Date('2026-11-11T15:00:00.000Z');
    expect((await servicio.obtenerMia(ANA, c.idCotizacion)).estado).toBe('vencida');
    const e = await errorDe(servicio.aceptar(ANA, c.idCotizacion));
    expect([e.status, e.code]).toEqual([409, 'COTIZACION_VENCIDA']);
  });

  it('el último día todavía vale (hora de Colombia)', async () => {
    const c = await enviada();
    ahora = new Date('2026-11-11T04:59:00.000Z'); // 10 de noviembre, 23:59 en Bogotá
    expect((await servicio.aceptar(ANA, c.idCotizacion)).estado).toBe('aprobada');
  });

  it('rechazar como cliente guarda el motivo', async () => {
    const c = await enviada();
    const r = await servicio.rechazarComoCliente(ANA, c.idCotizacion, { motivo: 'Encontré otro proveedor' });
    expect(r).toMatchObject({ estado: 'rechazada', motivoRechazo: 'Encontré otro proveedor' });
  });
});

describe('M21 · rechazo del admin (R7)', () => {
  it('desde solicitada o enviada, con motivo y aviso; después ya no se puede', async () => {
    const c = await pedida();
    const r = await servicio.rechazarComoAdmin(c.idCotizacion, ADMIN, { motivo: 'Producto descontinuado' });
    expect(r).toMatchObject({ estado: 'rechazada', motivoRechazo: 'Producto descontinuado' });
    expect(avisos.avisos[0]).toMatchObject({ tipo: 'rechazada' });
    const e = await errorDe(servicio.rechazarComoAdmin(c.idCotizacion, ADMIN, { motivo: 'Otra vez' }));
    expect(e.code).toBe('ESTADO_NO_PERMITE');
  });
});

describe('M21 · lista del panel', () => {
  it('filtra por estado y busca por código o cliente', async () => {
    await pedida();
    const enviadaAna = await enviada();
    expect((await servicio.listarAdmin({ pagina: 1, limite: 20, estado: 'enviada' })).items.map((x) => x.codigo)).toEqual([
      enviadaAna.codigo,
    ]);
    expect((await servicio.listarAdmin({ pagina: 1, limite: 20, busqueda: 'COT-000001' })).total).toBe(1);
    const porCliente = await servicio.listarAdmin({ pagina: 1, limite: 20, busqueda: 'ana' });
    expect(porCliente.total).toBe(2);
    expect(porCliente.items[0]?.cliente?.correo).toBe('ana@cliente.co');
  });
});
