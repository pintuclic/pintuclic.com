import { beforeEach, describe, expect, it } from 'vitest';
import type { CrearSolicitudRequest } from '../dtos/m07-checkout.dto';
import { CheckoutError, OrdenDefinitivaError } from '../services/checkout-error';
import { CheckoutService } from '../services/checkout.service';
import {
  CarritoFalso,
  carrito,
  lineaCarrito,
  OrdenesFalsas,
  PasarelaFalsa,
  perfilFalso,
  PreciosFalso,
  RepoMemoria,
} from './helpers/dobles';

const CLIENTE = 2;
const peticion: CrearSolicitudRequest = {
  pantalla: { lineas: [{ idLinea: 1, subtotal: 100_000 }], total: 100_000 },
  modoEntrega: 'recogida',
  direccion: null,
  celularNequi: '3991111111',
  aceptaciones: { tokenAceptacion: 'acc', tokenDatosPersonales: 'pd', aceptaTerminos: true },
};

async function codigoDeError(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof CheckoutError) return e.code;
    throw e;
  }
  return 'SIN_ERROR';
}

describe('M07 · CheckoutService', () => {
  let repo: RepoMemoria;
  let carritoF: CarritoFalso;
  let precios: PreciosFalso;
  let ordenes: OrdenesFalsas;
  let pasarela: PasarelaFalsa;
  let ahora: Date;
  let servicio: CheckoutService;

  beforeEach(() => {
    repo = new RepoMemoria();
    carritoF = new CarritoFalso();
    precios = new PreciosFalso();
    ordenes = new OrdenesFalsas();
    pasarela = new PasarelaFalsa();
    ahora = new Date('2026-10-27T15:00:00Z');
    servicio = new CheckoutService({
      repo,
      carrito: carritoF,
      precios,
      ordenes,
      pasarela,
      perfil: perfilFalso,
      parametros: { obtenerNumero: async (clave) => (clave === 'comercial.costo_envio_base' ? 15_000 : 200_000) },
      reloj: () => ahora,
    });
  });

  it('preparar: envío por modo, celular sugerido del perfil y términos de Wompi', async () => {
    const p = await servicio.preparar(CLIENTE);
    expect(p.envio).toEqual({ domicilio: 15_000, recogida: 0, umbralEnvioGratis: 200_000 });
    expect(p.celularSugerido).toBe('3001234567');
    expect(p.terminos?.tokenAceptacion).toBe('acc');
    pasarela.caida = true;
    expect((await servicio.preparar(CLIENTE)).terminos).toBeNull();
  });

  it('R2: congela el carrito, suma el envío, registra el cupón y crea el intento PENDING', async () => {
    carritoF.revalidacion = { carrito: carrito([lineaCarrito()], { idCupon: 5, descuento: 5_000 }), cambios: [], puedeContinuar: true };
    const s = await servicio.crear(CLIENTE, { ...peticion, modoEntrega: 'domicilio', direccion: { direccion: 'Calle 1 # 2-3', barrio: 'Centro', apartamentoCasa: null, nombreRecibe: 'Ana', telefonoRecibe: '3001234567' } });
    expect(s.codigo).toBe('SOL-2026-00001');
    expect(s.estado).toBe('en_pago');
    expect(s.costoEnvio).toBe(15_000);
    expect(s.totalACobrar).toBe(110_000);
    expect(s.direccion).toBe('Calle 1 # 2-3, Centro · Recibe: Ana, 3001234567');
    expect(s.intentos).toMatchObject([{ numero: 1, estadoWompi: 'PENDING', celularEnmascarado: '*** *** 1111' }]);
    expect(precios.registrados.get('SOL-2026-00001')).toBe(5);
    expect(pasarela.transacciones.get('tx-1')).toMatchObject({ referencia: 'SOL-2026-00001-1', montoEnCentavos: 11_000_000 });
    // R12: el número completo no queda guardado.
    expect(JSON.stringify(repo.solicitudes)).not.toContain('3991111111');
  });

  it('R2 a, b: carrito vacío, carrito que cambió y varias cotizaciones', async () => {
    carritoF.revalidacion = { carrito: carrito([]), cambios: [], puedeContinuar: false };
    expect(await codigoDeError(servicio.crear(CLIENTE, peticion))).toBe('CARRITO_VACIO');
    carritoF.revalidacion = { carrito: carrito(), cambios: [{ tipo: 'total_cambio', totalAnterior: 90_000, totalNuevo: 100_000 }], puedeContinuar: false };
    expect(await codigoDeError(servicio.crear(CLIENTE, peticion))).toBe('CARRITO_CAMBIO');
    carritoF.revalidacion = {
      carrito: carrito([lineaCarrito({ idLinea: 1, idCotizacion: 4 }), lineaCarrito({ idLinea: 2, idCotizacion: 5 })]),
      cambios: [],
      puedeContinuar: true,
    };
    expect(await codigoDeError(servicio.crear(CLIENTE, peticion))).toBe('VARIAS_COTIZACIONES');
    expect(repo.solicitudes).toHaveLength(0);
  });

  it('R2 c: con un pago en curso no empieza otro; una rechazada se cancela y libera su cupón', async () => {
    carritoF.revalidacion = { carrito: carrito([lineaCarrito()], { idCupon: 5, descuento: 5_000 }), cambios: [], puedeContinuar: true };
    await servicio.crear(CLIENTE, peticion);
    expect(await codigoDeError(servicio.crear(CLIENTE, peticion))).toBe('PAGO_EN_CURSO');
    pasarela.resolver('tx-1', 'DECLINED');
    const nueva = await servicio.crear(CLIENTE, peticion);
    expect(nueva.codigo).toBe('SOL-2026-00002');
    expect(repo.solicitudes[0]?.estado).toBe('cancelada');
    expect(precios.liberados).toEqual(['SOL-2026-00001']);
  });

  it('R2 e: cupón agotado al registrarlo → 409 y la solicitud queda cancelada sin cobrar', async () => {
    carritoF.revalidacion = { carrito: carrito([lineaCarrito()], { idCupon: 5, descuento: 5_000 }), cambios: [], puedeContinuar: true };
    precios.agotado = true;
    expect(await codigoDeError(servicio.crear(CLIENTE, peticion))).toBe('CUPON_NO_DISPONIBLE');
    expect(repo.solicitudes[0]?.estado).toBe('cancelada');
    expect(pasarela.transacciones.size).toBe(0);
  });

  it('R2 f: si Wompi no responde, 503 y la solicitud queda rechazada para reintentar', async () => {
    pasarela.caida = true;
    expect(await codigoDeError(servicio.crear(CLIENTE, peticion))).toBe('PASARELA_NO_DISPONIBLE');
    expect(repo.solicitudes[0]?.estado).toBe('rechazada');
  });

  it('R5, R6, R7: aprobado → pagada → orden en M08 → completada, y se quita lo comprado del carrito', async () => {
    const s = await servicio.crear(CLIENTE, peticion);
    pasarela.resolver('tx-1', 'APPROVED');
    ahora = new Date(ahora.getTime() + 10_000);
    const final = await servicio.obtenerMia(CLIENTE, s.codigo);
    expect(final.estado).toBe('completada');
    expect(final.codigoOrden).toBe('PC-2026-00001');
    expect(ordenes.recibidas[0]).toMatchObject({
      codigoSolicitud: s.codigo,
      transaccionPagoId: 'tx-1',
      idUsuario: CLIENTE,
      origen: 'carrito',
      modoEntrega: 'recogida',
      total: 100_000,
      montoPagado: 100_000,
      lineas: [{ nombreProducto: 'Viniltex Ultralavable', varianteCopia: 'Galón', colorSolicitado: 'Amarillo Sol', cantidad: 2, idVarianteRef: 11 }],
    });
    expect(carritoF.quitados).toEqual([{ idVariante: 11, idColor: 8 }]);
  });

  it('R5: la pantalla no pregunta a Wompi más de una vez cada pocos segundos', async () => {
    const s = await servicio.crear(CLIENTE, peticion);
    pasarela.resolver('tx-1', 'APPROVED');
    expect((await servicio.obtenerMia(CLIENTE, s.codigo)).estado).toBe('en_pago');
    ahora = new Date(ahora.getTime() + 6_000);
    expect((await servicio.obtenerMia(CLIENTE, s.codigo)).estado).toBe('completada');
  });

  it('R6: un pago aprobado que no coincide con el total queda en revisión y no crea orden', async () => {
    const s = await servicio.crear(CLIENTE, peticion);
    pasarela.resolver('tx-1', 'APPROVED', { montoEnCentavos: 100 });
    ahora = new Date(ahora.getTime() + 10_000);
    expect((await servicio.obtenerMia(CLIENTE, s.codigo)).estado).toBe('en_revision');
    expect(ordenes.recibidas).toHaveLength(0);
  });

  it('R4: rechazado → reintentar con otro celular; tras el máximo, 409', async () => {
    const s = await servicio.crear(CLIENTE, peticion);
    pasarela.resolver('tx-1', 'DECLINED');
    ahora = new Date(ahora.getTime() + 10_000);
    const rechazada = await servicio.obtenerMia(CLIENTE, s.codigo);
    expect(rechazada.estado).toBe('rechazada');
    expect(rechazada.intentos[0]?.motivo).toContain('Nequi no aprobó');
    const otra = await servicio.reintentar(CLIENTE, s.codigo, { celularNequi: '3992222222', aceptaciones: peticion.aceptaciones });
    expect(otra.estado).toBe('en_pago');
    expect(otra.intentos).toHaveLength(2);
    expect(pasarela.transacciones.get('tx-2')?.referencia).toBe(`${s.codigo}-2`);
    pasarela.resolver('tx-2', 'ERROR');
    await servicio.reintentar(CLIENTE, s.codigo, { celularNequi: '3991111111', aceptaciones: peticion.aceptaciones });
    pasarela.resolver('tx-3', 'DECLINED');
    expect(await codigoDeError(servicio.reintentar(CLIENTE, s.codigo, { celularNequi: '3991111111', aceptaciones: peticion.aceptaciones }))).toBe('LIMITE_INTENTOS');
  });

  it('R3: vence sin pago en curso y libera el cupón; con el pago en curso no vence', async () => {
    carritoF.revalidacion = { carrito: carrito([lineaCarrito()], { idCupon: 5, descuento: 5_000 }), cambios: [], puedeContinuar: true };
    const s = await servicio.crear(CLIENTE, peticion);
    ahora = new Date(ahora.getTime() + 31 * 60_000);
    expect((await servicio.obtenerMia(CLIENTE, s.codigo)).estado).toBe('en_pago');
    pasarela.resolver('tx-1', 'DECLINED');
    ahora = new Date(ahora.getTime() + 10_000);
    expect((await servicio.obtenerMia(CLIENTE, s.codigo)).estado).toBe('vencida');
    expect(precios.liberados).toEqual([s.codigo]);
    expect(await codigoDeError(servicio.reintentar(CLIENTE, s.codigo, { celularNequi: '3991111111', aceptaciones: peticion.aceptaciones }))).toBe('SOLICITUD_VENCIDA');
  });

  it('R8: un aprobado que llega a una solicitud cancelada se respeta y crea la orden', async () => {
    const s = await servicio.crear(CLIENTE, peticion);
    await repo.actualizar(1, { estado: 'cancelada' });
    pasarela.resolver('tx-1', 'APPROVED');
    await servicio.procesarEvento({ event: 'transaction.updated', data: { transaction: { id: 'tx-1', status: 'APPROVED', reference: `${s.codigo}-1`, amount_in_cents: 10_000_000, currency: 'COP' } }, signature: { properties: ['transaction.id'], checksum: 'x' }, timestamp: 1 }, null, null);
    expect(repo.solicitudes[0]?.estado).toBe('completada');
    expect(ordenes.recibidas).toHaveLength(1);
  });

  it('R5 a: evento con firma inválida → 401 sin tocar nada; repetido → sin efecto', async () => {
    const s = await servicio.crear(CLIENTE, peticion);
    pasarela.firmaOk = false;
    expect(await codigoDeError(servicio.procesarEvento({}, 'x', null))).toBe('FIRMA_INVALIDA');
    pasarela.firmaOk = true;
    pasarela.resolver('tx-1', 'APPROVED');
    const evento = { event: 'transaction.updated', data: { transaction: { id: 'tx-1', status: 'APPROVED', reference: `${s.codigo}-1`, amount_in_cents: 10_000_000, currency: 'COP' } }, signature: { properties: ['transaction.id'], checksum: 'x' }, timestamp: 1 };
    await servicio.procesarEvento(evento, null, null);
    await servicio.procesarEvento(evento, null, null);
    expect(ordenes.recibidas).toHaveLength(1);
  });

  it('R6: un fallo pasajero de M08 se reintenta más tarde; uno definitivo va a revisión', async () => {
    const s = await servicio.crear(CLIENTE, peticion);
    pasarela.resolver('tx-1', 'APPROVED');
    ordenes.falla = new Error('lock timeout');
    ahora = new Date(ahora.getTime() + 10_000);
    const r1 = await servicio.obtenerMia(CLIENTE, s.codigo);
    expect(r1.estado).toBe('pagada');
    expect(repo.solicitudes[0]?.proximoIntentoOrden?.getTime()).toBe(ahora.getTime() + 60_000);
    ordenes.falla = null;
    ahora = new Date(ahora.getTime() + 61_000);
    await servicio.procesarPendientes();
    expect(repo.solicitudes[0]?.estado).toBe('completada');

    const s2 = await servicio.crear(CLIENTE, peticion);
    pasarela.resolver('tx-2', 'APPROVED');
    ordenes.falla = new OrdenDefinitivaError('CONFLICTO_SOLICITUD: no coincide');
    ahora = new Date(ahora.getTime() + 10_000);
    expect((await servicio.obtenerMia(CLIENTE, s2.codigo)).estado).toBe('en_revision');
    ordenes.falla = null;
    const admin = await servicio.reintentarOrden(s2.codigo, 1, null);
    expect(admin.estado).toBe('completada');
  });

  it('R1: la solicitud de otro cliente responde igual que una inexistente', async () => {
    const s = await servicio.crear(CLIENTE, peticion);
    expect(await codigoDeError(servicio.obtenerMia(99, s.codigo))).toBe('RECURSO_NO_DISPONIBLE');
    expect(await codigoDeError(servicio.obtenerMia(CLIENTE, 'SOL-2026-99999'))).toBe('RECURSO_NO_DISPONIBLE');
  });

  it('R3: el cliente cancela solo sin pago en curso', async () => {
    const s = await servicio.crear(CLIENTE, peticion);
    expect(await codigoDeError(servicio.cancelar(CLIENTE, s.codigo))).toBe('ESTADO_NO_PERMITE');
    pasarela.resolver('tx-1', 'DECLINED');
    expect((await servicio.cancelar(CLIENTE, s.codigo)).estado).toBe('cancelada');
  });
});
