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
  medio: 'nequi',
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
    const otra = await servicio.reintentar(CLIENTE, s.codigo, { medio: 'nequi', celularNequi: '3992222222', aceptaciones: peticion.aceptaciones });
    expect(otra.estado).toBe('en_pago');
    expect(otra.intentos).toHaveLength(2);
    expect(pasarela.transacciones.get('tx-2')?.referencia).toBe(`${s.codigo}-2`);
    pasarela.resolver('tx-2', 'ERROR');
    await servicio.reintentar(CLIENTE, s.codigo, { medio: 'nequi', celularNequi: '3991111111', aceptaciones: peticion.aceptaciones });
    pasarela.resolver('tx-3', 'DECLINED');
    expect(await codigoDeError(servicio.reintentar(CLIENTE, s.codigo, { medio: 'nequi', celularNequi: '3991111111', aceptaciones: peticion.aceptaciones }))).toBe('LIMITE_INTENTOS');
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
    expect(await codigoDeError(servicio.reintentar(CLIENTE, s.codigo, { medio: 'nequi', celularNequi: '3991111111', aceptaciones: peticion.aceptaciones }))).toBe('SOLICITUD_VENCIDA');
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

  it('R17: la compra directa paga solo esa línea, queda marcada y no toca el carrito', async () => {
    const p = await servicio.preparar(CLIENTE, undefined, { idVariante: 30, idColor: null, cantidad: 1 });
    expect(p.carrito.lineas.map((l) => l.idVariante)).toEqual([30]);
    const s = await servicio.crear(CLIENTE, {
      ...peticion,
      pantalla: { lineas: [{ idLinea: 1, subtotal: 50_000 }], total: 50_000 },
      directa: { idVariante: 30, idColor: null, cantidad: 1 },
    });
    expect(s.compraDirecta).toBe(true);
    expect(s.totalACobrar).toBe(50_000);
    pasarela.resolver('tx-1', 'APPROVED');
    ahora = new Date(ahora.getTime() + 10_000);
    expect((await servicio.obtenerMia(CLIENTE, s.codigo)).estado).toBe('completada');
    expect(ordenes.recibidas[0]?.origen).toBe('carrito');
    expect(carritoF.quitados).toEqual([]);
  });

  it('R17: un combo pedido por encima de su tope responde 409', async () => {
    carritoF.directa = {
      carrito: carrito([
        lineaCarrito({ idLinea: 1, cantidad: 5, producto: { ...lineaCarrito().producto, esCombo: true, topeUnidades: 2 } }),
      ]),
      cambios: [],
      puedeContinuar: true,
    };
    const r = servicio.crear(CLIENTE, { ...peticion, directa: { idVariante: 11, idColor: 8, cantidad: 5 } });
    expect(await codigoDeError(r)).toBe('PRODUCTO_NO_DISPONIBLE');
    expect(repo.solicitudes).toHaveLength(0);
  });

  it('R3: el cliente cancela solo sin pago en curso', async () => {
    const s = await servicio.crear(CLIENTE, peticion);
    expect(await codigoDeError(servicio.cancelar(CLIENTE, s.codigo))).toBe('ESTADO_NO_PERMITE');
    pasarela.resolver('tx-1', 'DECLINED');
    expect((await servicio.cancelar(CLIENTE, s.codigo)).estado).toBe('cancelada');
  });

  describe('R19 · página de pago de Wompi', () => {
    const enPagina: CrearSolicitudRequest = {
      pantalla: peticion.pantalla,
      modoEntrega: 'recogida',
      direccion: null,
      medio: 'pagina_wompi',
    };

    it('crea el intento sin cobrar y entrega los datos firmados para ir a pagar', async () => {
      const s = await servicio.crear(CLIENTE, enPagina);
      expect(s.estado).toBe('en_pago');
      expect(pasarela.celulares).toEqual([]);
      expect(s.intentos[0]).toMatchObject({ medio: 'pagina_wompi', metodo: null, celularEnmascarado: null, estadoWompi: 'PENDING' });
      expect(s.pagoWompi).toEqual({
        llavePublica: 'pub_test_x',
        referencia: `${s.codigo}-1`,
        montoEnCentavos: 10_000_000,
        moneda: 'COP',
        venceEn: s.venceEn,
        firmaIntegridad: `firma:${s.codigo}-1:10000000:${s.venceEn}`,
        correo: expect.any(String),
        nombre: expect.any(String),
      });
    });

    it('al volver, encuentra la transacción por la referencia, guarda el medio y crea la orden', async () => {
      const s = await servicio.crear(CLIENTE, enPagina);
      pasarela.pagarEnPagina(`${s.codigo}-1`, 10_000_000, 'PENDING', 'PSE');
      ahora = new Date(ahora.getTime() + 10_000);
      const enCurso = await servicio.obtenerMia(CLIENTE, s.codigo);
      expect(enCurso.pagoWompi).toBeNull();
      expect(enCurso.intentos[0]?.metodo).toBe('PSE');
      expect(await codigoDeError(servicio.cancelar(CLIENTE, s.codigo))).toBe('ESTADO_NO_PERMITE');
      pasarela.resolver('tx-1', 'APPROVED');
      ahora = new Date(ahora.getTime() + 10_000);
      expect((await servicio.obtenerMia(CLIENTE, s.codigo)).estado).toBe('completada');
      expect(ordenes.recibidas).toHaveLength(1);
      // Otra transacción de la misma referencia que no se aprobó no pisa el intento aprobado.
      const otra = pasarela.pagarEnPagina(`${s.codigo}-1`, 10_000_000, 'DECLINED');
      await servicio.procesarEvento(
        { event: 'transaction.updated', data: { transaction: { id: otra, status: 'DECLINED', reference: `${s.codigo}-1`, amount_in_cents: 10_000_000, currency: 'COP' } }, signature: { properties: ['transaction.id'], checksum: 'x' }, timestamp: 1 },
        null,
        null,
      );
      expect(repo.solicitudes[0]?.intentos[0]).toMatchObject({ estado: 'APPROVED', idTransaccion: 'tx-1' });
    });

    it('una compra que solo espera en la página de Wompi no bloquea el checkout: la nueva la cancela', async () => {
      const vieja = await servicio.crear(CLIENTE, enPagina);
      expect((await servicio.preparar(CLIENTE)).solicitudEnCurso).toBeNull();
      const nueva = await servicio.crear(CLIENTE, peticion);
      expect(nueva.codigo).not.toBe(vieja.codigo);
      expect(repo.solicitudes.find((x) => x.codigo === vieja.codigo)?.estado).toBe('cancelada');
      expect((await servicio.preparar(CLIENTE)).solicitudEnCurso).toBe(nueva.codigo);
    });

    it('tras un rechazo, otro medio en la misma página de Wompi se reconoce (pendiente y luego aprobado)', async () => {
      const s = await servicio.crear(CLIENTE, enPagina);
      pasarela.pagarEnPagina(`${s.codigo}-1`, 10_000_000, 'ERROR', 'NEQUI');
      ahora = new Date(ahora.getTime() + 10_000);
      expect((await servicio.obtenerMia(CLIENTE, s.codigo)).estado).toBe('rechazada');
      const tarjeta = pasarela.pagarEnPagina(`${s.codigo}-1`, 10_000_000, 'PENDING', 'CARD');
      ahora = new Date(ahora.getTime() + 10_000);
      const enPago = await servicio.obtenerMia(CLIENTE, s.codigo);
      expect(enPago.estado).toBe('en_pago');
      expect(enPago.intentos[0]).toMatchObject({ estadoWompi: 'PENDING', metodo: 'CARD', motivo: null });
      pasarela.resolver(tarjeta, 'APPROVED');
      ahora = new Date(ahora.getTime() + 10_000);
      const lista = await servicio.obtenerMia(CLIENTE, s.codigo);
      expect(lista.estado).toBe('completada');
      expect(lista.intentos[0]).toMatchObject({ estadoWompi: 'APPROVED', metodo: 'CARD' });
    });

    it('sin transacción no hay pago en curso: se puede cancelar y vence', async () => {
      const s = await servicio.crear(CLIENTE, enPagina);
      expect((await servicio.cancelar(CLIENTE, s.codigo)).estado).toBe('cancelada');
      const otra = await servicio.crear(CLIENTE, enPagina);
      ahora = new Date(ahora.getTime() + 31 * 60_000);
      const vencida = await servicio.obtenerMia(CLIENTE, otra.codigo);
      expect(vencida.estado).toBe('vencida');
      expect(vencida.pagoWompi).toBeNull();
    });

    it('un rechazo en la página permite reintentar con Nequi, y un rechazo tardío no pisa el aprobado', async () => {
      const s = await servicio.crear(CLIENTE, enPagina);
      const rechazo = pasarela.pagarEnPagina(`${s.codigo}-1`, 10_000_000, 'DECLINED');
      ahora = new Date(ahora.getTime() + 10_000);
      const rechazada = await servicio.obtenerMia(CLIENTE, s.codigo);
      expect(rechazada.estado).toBe('rechazada');
      expect(rechazada.intentos[0]?.motivo).toContain('Wompi');
      const nequi = await servicio.reintentar(CLIENTE, s.codigo, { medio: 'nequi', celularNequi: '3991111111', aceptaciones: peticion.aceptaciones });
      expect(nequi.intentos[1]).toMatchObject({ medio: 'nequi', celularEnmascarado: '*** *** 1111' });
      const idNequi = [...pasarela.transacciones.keys()].at(-1) ?? '';
      pasarela.resolver(idNequi, 'APPROVED');
      ahora = new Date(ahora.getTime() + 10_000);
      expect((await servicio.obtenerMia(CLIENTE, s.codigo)).estado).toBe('completada');
      // Un evento viejo del intento rechazado no cambia nada.
      await servicio.procesarEvento(
        { event: 'transaction.updated', data: { transaction: { id: rechazo, status: 'DECLINED', reference: `${s.codigo}-1`, amount_in_cents: 10_000_000, currency: 'COP' } }, signature: { properties: ['transaction.id'], checksum: 'x' }, timestamp: 1 },
        null,
        null,
      );
      expect(repo.solicitudes[0]?.estado).toBe('completada');
      expect(repo.solicitudes[0]?.intentos[0]?.estado).toBe('DECLINED');
      expect(repo.solicitudes[0]?.intentos[1]?.estado).toBe('APPROVED');
    });

    it('el aviso de Wompi encuentra un pago de la página por la referencia, aunque la compra se haya cancelado (R8)', async () => {
      const s = await servicio.crear(CLIENTE, enPagina);
      await servicio.cancelar(CLIENTE, s.codigo);
      const id = pasarela.pagarEnPagina(`${s.codigo}-1`, 10_000_000, 'APPROVED', 'DAVIPLATA');
      await servicio.procesarEvento(
        { event: 'transaction.updated', data: { transaction: { id, status: 'APPROVED', reference: `${s.codigo}-1`, amount_in_cents: 10_000_000, currency: 'COP' } }, signature: { properties: ['transaction.id'], checksum: 'x' }, timestamp: 1 },
        null,
        null,
      );
      expect(repo.solicitudes[0]?.estado).toBe('completada');
      expect(repo.solicitudes[0]?.intentos[0]?.metodo).toBe('DAVIPLATA');
    });
  });
});
