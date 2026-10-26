import { beforeEach, describe, expect, it } from 'vitest';
import { calculoSchema } from '../../m06-precios/dtos/m06-precios.dto';
import { CANTIDAD_MAXIMA_POR_LINEA, MAXIMO_LINEAS_CARRITO, carritoSchema, revalidacionSchema } from '../dtos/m05-carrito.dto';
import type { Carrito } from '../dtos/m05-carrito.dto';
import type { Solicitante } from '../interfaces/carrito.interface';
import { CarritoError } from '../services/carrito-error';
import { CarritoService } from '../services/carrito.service';
import { generarTokenVisitante, hashTokenVisitante } from '../services/token-visitante';
import {
  CUPON_VALIDO,
  CarritoMemoriaRepository,
  CatalogoEjemplo,
  ID_USUARIO_EMPRESA,
  ID_USUARIO_PARTICULAR,
  PreciosEjemplo,
} from './helpers/dobles';

const AHORA = new Date('2026-10-26T15:00:00.000Z');
const HACE_31_DIAS = new Date(AHORA.getTime() - 31 * 24 * 60 * 60 * 1000);

let repo: CarritoMemoriaRepository;
let catalogo: CatalogoEjemplo;
let precios: PreciosEjemplo;
let servicio: CarritoService;

const visitante = (token: string | null = null): Solicitante => ({ idUsuario: null, tokenVisitante: token });
const cliente = (idUsuario: number, token: string | null = null): Solicitante => ({ idUsuario, tokenVisitante: token });

/** Cada respuesta debe cumplir el contrato. */
function valido(c: Carrito): Carrito {
  return carritoSchema.parse(c);
}

async function errorDe(p: Promise<unknown>): Promise<CarritoError> {
  try {
    await p;
  } catch (err: unknown) {
    if (err instanceof CarritoError) return err;
    throw err;
  }
  throw new Error('Se esperaba un CarritoError');
}

beforeEach(() => {
  repo = new CarritoMemoriaRepository(() => AHORA);
  catalogo = new CatalogoEjemplo();
  precios = new PreciosEjemplo(catalogo);
  servicio = new CarritoService({ repo, precios, catalogo, reloj: () => AHORA });
});

describe('M05 · doble de precios', () => {
  it('sus cálculos cumplen calculoSchema de M06', async () => {
    const calculo = await precios.calcular({
      lineas: [
        { idVariante: 1, idColor: 13, cantidad: 2 },
        { idVariante: 4, idColor: null, cantidad: 1 },
      ],
      codigoCupon: CUPON_VALIDO,
      contexto: { idUsuario: ID_USUARIO_EMPRESA },
    });
    expect(() => calculoSchema.parse(calculo)).not.toThrow();
  });
});

describe('M05 · HU-CAR-01 carrito de visitante (C2)', () => {
  it('mirar sin carrito no crea nada ni da cookie', async () => {
    const r = await servicio.consultar(visitante());
    expect(valido(r.datos)).toEqual({ lineas: [], cantidadItems: 0, calculo: null, union: null });
    expect(r.cookie).toEqual({ tipo: 'ninguna' });
    expect(repo.carritos).toHaveLength(0);
  });

  it('agregar crea el carrito, da un token opaco y guarda solo su hash', async () => {
    const r = await servicio.agregar(visitante(), { idVariante: 1, idColor: 13, cantidad: 2 });
    expect(r.cookie.tipo).toBe('fijar');
    const token = r.cookie.tipo === 'fijar' ? r.cookie.token : '';
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(repo.carritos[0]?.hashToken).toBe(hashTokenVisitante(token));
    expect(repo.carritos[0]?.hashToken).not.toBe(token);
    expect(valido(r.datos).lineas).toHaveLength(1);
    expect(r.datos.cantidadItems).toBe(2);
  });

  it('con el mismo token vuelve el mismo carrito y no se da otra cookie', async () => {
    const primero = await servicio.agregar(visitante(), { idVariante: 1, idColor: 13, cantidad: 1 });
    const token = primero.cookie.tipo === 'fijar' ? primero.cookie.token : '';
    const segundo = await servicio.agregar(visitante(token), { idVariante: 2, cantidad: 1 });
    expect(segundo.cookie).toEqual({ tipo: 'ninguna' });
    expect(segundo.datos.lineas).toHaveLength(2);
    expect(repo.carritos).toHaveLength(1);
  });

  it('una cookie con otra forma se ignora y se borra', async () => {
    const r = await servicio.consultar(visitante('no-es-un-token'));
    expect(r.cookie).toEqual({ tipo: 'borrar' });
    expect(r.datos.lineas).toHaveLength(0);
  });

  it('C13: un carrito de visitante vencido se ve vacío y se vacía al volver a agregar', async () => {
    const token = generarTokenVisitante();
    repo.sembrar({ tipo: 'visitante', hashToken: hashTokenVisitante(token) }, [{ idVariante: 2, idColor: null, cantidad: 3 }], HACE_31_DIAS);
    expect((await servicio.consultar(visitante(token))).datos.lineas).toHaveLength(0);
    const r = await servicio.agregar(visitante(token), { idVariante: 1, idColor: 13, cantidad: 1 });
    expect(r.datos.lineas.map((l) => l.idVariante)).toEqual([1]);
  });
});

describe('M05 · HU-CAR-02 líneas', () => {
  it('C3: la misma variante y color suma; otro color es otra línea', async () => {
    const yo = cliente(ID_USUARIO_PARTICULAR);
    await servicio.agregar(yo, { idVariante: 1, idColor: 13, cantidad: 2 });
    await servicio.agregar(yo, { idVariante: 1, idColor: 13, cantidad: 3 });
    const r = await servicio.agregar(yo, { idVariante: 1, idColor: 14, cantidad: 1 });
    expect(r.datos.lineas.map((l) => [l.idColor, l.cantidad])).toEqual([
      [13, 5],
      [14, 1],
    ]);
  });

  it('C4: pasar de 9 999 al sumar responde 400 y no cambia nada', async () => {
    const yo = cliente(ID_USUARIO_PARTICULAR);
    await servicio.agregar(yo, { idVariante: 2, cantidad: CANTIDAD_MAXIMA_POR_LINEA });
    const e = await errorDe(servicio.agregar(yo, { idVariante: 2, cantidad: 1 }));
    expect([e.status, e.code, e.details]).toEqual([400, 'CANTIDAD_FUERA_DE_RANGO', { cantidadMaxima: 9999 }]);
    expect(repo.lineas[0]?.cantidad).toBe(CANTIDAD_MAXIMA_POR_LINEA);
  });

  it('C4: un combo no admite más de su tope', async () => {
    const yo = cliente(ID_USUARIO_PARTICULAR);
    const e = await errorDe(servicio.agregar(yo, { idVariante: 3, cantidad: 6 }));
    expect([e.status, e.code, e.details]).toEqual([409, 'SIN_EXISTENCIA_SUFICIENTE', { topeUnidades: 5 }]);
    const r = await servicio.agregar(yo, { idVariante: 3, cantidad: 5 });
    const idLinea = r.datos.lineas[0]?.idLinea ?? 0;
    const e2 = await errorDe(servicio.cambiarCantidad(yo, idLinea, { cantidad: 6 }));
    expect(e2.code).toBe('SIN_EXISTENCIA_SUFICIENTE');
  });

  it('C5: no admite más de 100 líneas', async () => {
    const yo = cliente(ID_USUARIO_PARTICULAR);
    for (let i = 0; i < MAXIMO_LINEAS_CARRITO; i++) {
      await repo.crear({ tipo: 'cuenta', idUsuario: ID_USUARIO_PARTICULAR });
      await repo.guardarLinea(1, { idVariante: 2, idColor: 1000 + i, cantidad: 1 });
    }
    const e = await errorDe(servicio.agregar(yo, { idVariante: 2, idColor: 5, cantidad: 1 }));
    expect([e.status, e.code]).toEqual([400, 'LIMITE_LINEAS_ALCANZADO']);
    // Sumar a una línea que ya está sí se puede.
    await expect(servicio.agregar(yo, { idVariante: 2, idColor: 1000, cantidad: 1 })).resolves.toBeDefined();
  });

  it('C6: no se agrega lo que M01 marca no vendible, ni lo que no existe', async () => {
    const yo = cliente(ID_USUARIO_PARTICULAR);
    const e = await errorDe(servicio.agregar(yo, { idVariante: 4, cantidad: 1 }));
    expect([e.status, e.code, e.details]).toEqual([409, 'PRODUCTO_NO_DISPONIBLE', { motivo: 'producto_no_disponible' }]);
    const e2 = await errorDe(servicio.agregar(yo, { idVariante: 999, cantidad: 1 }));
    expect(e2.details).toEqual({ motivo: 'variante_no_existe' });
    expect(repo.carritos).toHaveLength(0);
  });

  it('C6: una línea que deja de venderse se conserva, sin precio y sin sumar', async () => {
    const yo = cliente(ID_USUARIO_PARTICULAR);
    await servicio.agregar(yo, { idVariante: 1, idColor: 13, cantidad: 2 });
    await servicio.agregar(yo, { idVariante: 2, cantidad: 1 });
    catalogo.variantes[2] = { precioBase: 45_000, vendible: false };
    const r = await servicio.consultar(yo);
    const retirada = r.datos.lineas.find((l) => l.idVariante === 2);
    expect(retirada?.precio?.vendible).toBe(false);
    expect(retirada?.precio?.motivoNoVendible).toBe('producto_no_disponible');
    expect(r.datos.cantidadItems).toBe(2);
    expect(r.datos.calculo?.resumen.total).toBe(180_000);
  });

  it('C12: cambiar la cantidad fija el valor; quitar la borra', async () => {
    const yo = cliente(ID_USUARIO_PARTICULAR);
    const r = await servicio.agregar(yo, { idVariante: 2, cantidad: 4 });
    const idLinea = r.datos.lineas[0]?.idLinea ?? 0;
    expect((await servicio.cambiarCantidad(yo, idLinea, { cantidad: 2 })).datos.lineas[0]?.cantidad).toBe(2);
    const vacio = await servicio.quitar(yo, idLinea);
    expect(vacio.datos).toEqual({ lineas: [], cantidadItems: 0, calculo: null, union: null });
  });

  it('C14: una línea de otro carrito responde 404, igual que una que no existe', async () => {
    const otra = await servicio.agregar(cliente(ID_USUARIO_EMPRESA), { idVariante: 2, cantidad: 1 });
    const ajena = otra.datos.lineas[0]?.idLinea ?? 0;
    const yo = cliente(ID_USUARIO_PARTICULAR);
    await servicio.agregar(yo, { idVariante: 1, idColor: 13, cantidad: 1 });
    for (const p of [
      servicio.cambiarCantidad(yo, ajena, { cantidad: 3 }),
      servicio.quitar(yo, ajena),
      servicio.quitar(yo, 123_456),
    ]) {
      const e = await errorDe(p);
      expect([e.status, e.code]).toEqual([404, 'RECURSO_NO_DISPONIBLE']);
    }
    expect(repo.lineas.find((l) => l.idLinea === ajena)?.cantidad).toBe(1);
  });
});

describe('M05 · C7 precios de M06', () => {
  it('envía las líneas en orden, con el cliente de la sesión y el cupón, y devuelve el cálculo tal cual', async () => {
    const yo = cliente(ID_USUARIO_EMPRESA);
    await servicio.agregar(yo, { idVariante: 1, idColor: 13, cantidad: 2 });
    await servicio.agregar(yo, { idVariante: 2, cantidad: 1 });
    const r = await servicio.consultar(yo, CUPON_VALIDO);
    const ultima = precios.llamadas.at(-1);
    expect(ultima?.contexto).toEqual({ idUsuario: ID_USUARIO_EMPRESA });
    expect(ultima?.codigoCupon).toBe(CUPON_VALIDO);
    expect(ultima?.lineas.map((l) => l.idVariante)).toEqual([1, 2]);

    const c = valido(r.datos);
    expect(c.lineas[0]?.precio?.descuentos.map((d) => d.tipoOrigen)).toEqual(['evento', 'cupon']);
    expect(c.calculo?.cupon?.aplicado).toBe(true);
    expect(c.calculo?.avisos[0]?.tipo).toBe('empresa_falta_monto');
    expect(c.lineas[0]?.producto).toMatchObject({ nombre: 'Producto 1', marca: 'Pintuco', color: { idColor: 13 } });
  });

  it('el cliente particular con un carrito grande recibe la invitación a cuenta empresa', async () => {
    const r = await servicio.agregar(cliente(ID_USUARIO_PARTICULAR), { idVariante: 1, idColor: 13, cantidad: 6 });
    expect(r.datos.calculo?.avisos).toEqual([{ tipo: 'sugerir_cuenta_empresa', umbral: 500_000 }]);
  });

  it('si M06 falla, el carrito se muestra sin precios', async () => {
    const yo = cliente(ID_USUARIO_PARTICULAR);
    await servicio.agregar(yo, { idVariante: 2, cantidad: 1 });
    precios.fallar = true;
    const r = await servicio.consultar(yo);
    expect(valido(r.datos).calculo).toBeNull();
    expect(r.datos.lineas[0]?.precio).toBeNull();
  });
});

describe('M05 · C9 unión al iniciar sesión (HU-CAR-04)', () => {
  it('suma las iguales, agrega las demás, borra el carrito del visitante y la cookie', async () => {
    const token = generarTokenVisitante();
    const hash = hashTokenVisitante(token);
    repo.sembrar({ tipo: 'cuenta', idUsuario: ID_USUARIO_PARTICULAR }, [{ idVariante: 1, idColor: 13, cantidad: 2 }], AHORA);
    repo.sembrar(
      { tipo: 'visitante', hashToken: hash },
      [
        { idVariante: 1, idColor: 13, cantidad: 3 },
        { idVariante: 2, idColor: null, cantidad: 1 },
      ],
      AHORA,
    );
    const r = await servicio.consultar(cliente(ID_USUARIO_PARTICULAR, token));
    expect(r.cookie).toEqual({ tipo: 'borrar' });
    expect(r.datos.union).toEqual({ lineasAgregadas: 1, lineasSumadas: 1, lineasDescartadas: 0, cantidadesAjustadas: 0 });
    expect(r.datos.lineas.map((l) => [l.idVariante, l.cantidad])).toEqual([
      [1, 5],
      [2, 1],
    ]);
    expect(repo.carritos.some((c) => c.hashToken === hash)).toBe(false);
    // La siguiente petición ya no une nada.
    expect((await servicio.consultar(cliente(ID_USUARIO_PARTICULAR))).datos.union).toBeNull();
  });

  it('si la cuenta no tenía carrito, el del visitante pasa a ser suyo', async () => {
    const token = generarTokenVisitante();
    const id = repo.sembrar({ tipo: 'visitante', hashToken: hashTokenVisitante(token) }, [{ idVariante: 2, idColor: null, cantidad: 2 }], AHORA);
    const r = await servicio.consultar(cliente(ID_USUARIO_EMPRESA, token));
    expect(r.datos.union?.lineasAgregadas).toBe(1);
    expect(repo.carritos.find((c) => c.idCarrito === id)).toMatchObject({ idUsuario: ID_USUARIO_EMPRESA, hashToken: null });
  });

  it('al sumar respeta el tope de 9 999 e informa el ajuste', async () => {
    const token = generarTokenVisitante();
    repo.sembrar({ tipo: 'cuenta', idUsuario: ID_USUARIO_PARTICULAR }, [{ idVariante: 2, idColor: null, cantidad: 9_000 }], AHORA);
    repo.sembrar({ tipo: 'visitante', hashToken: hashTokenVisitante(token) }, [{ idVariante: 2, idColor: null, cantidad: 2_000 }], AHORA);
    const r = await servicio.consultar(cliente(ID_USUARIO_PARTICULAR, token));
    expect(r.datos.lineas[0]?.cantidad).toBe(CANTIDAD_MAXIMA_POR_LINEA);
    expect(r.datos.union?.cantidadesAjustadas).toBe(1);
  });

  it('un carrito de visitante vencido no se une', async () => {
    const token = generarTokenVisitante();
    repo.sembrar({ tipo: 'visitante', hashToken: hashTokenVisitante(token) }, [{ idVariante: 2, idColor: null, cantidad: 2 }], HACE_31_DIAS);
    const r = await servicio.consultar(cliente(ID_USUARIO_PARTICULAR, token));
    expect(r.datos.union).toBeNull();
    expect(r.datos.lineas).toHaveLength(0);
    expect(r.cookie).toEqual({ tipo: 'borrar' });
  });
});

describe('M05 · C11 revalidación (HU-CAR-05)', () => {
  async function pantalla(yo: Solicitante): Promise<Carrito> {
    await servicio.agregar(yo, { idVariante: 1, idColor: 13, cantidad: 2 });
    return (await servicio.agregar(yo, { idVariante: 2, cantidad: 1 })).datos;
  }
  const enPantalla = (c: Carrito) => ({
    lineas: c.lineas.map((l) => ({ idLinea: l.idLinea, subtotal: l.precio?.subtotal ?? null })),
    total: c.calculo?.resumen.total ?? 0,
  });

  it('sin cambios deja continuar', async () => {
    const yo = cliente(ID_USUARIO_PARTICULAR);
    const c = await pantalla(yo);
    const r = await servicio.revalidar(yo, enPantalla(c));
    expect(revalidacionSchema.parse(r.datos)).toMatchObject({ cambios: [], puedeContinuar: true });
  });

  it('un precio que cambió se avisa y no deja continuar', async () => {
    const yo = cliente(ID_USUARIO_PARTICULAR);
    const c = await pantalla(yo);
    catalogo.variantes[2] = { precioBase: 50_000 };
    const r = await servicio.revalidar(yo, enPantalla(c));
    expect(r.datos.puedeContinuar).toBe(false);
    expect(r.datos.cambios).toEqual([
      { tipo: 'precio_cambio', idLinea: c.lineas[1]?.idLinea, subtotalAnterior: 45_000, subtotalNuevo: 50_000 },
      { tipo: 'total_cambio', totalAnterior: 225_000, totalNuevo: 230_000 },
    ]);
  });

  it('una línea no vendible, una quitada en otra pestaña y un cupón que no aplica', async () => {
    const yo = cliente(ID_USUARIO_PARTICULAR);
    const c = await pantalla(yo);
    catalogo.variantes[1] = { precioBase: 100_000, vendible: false };
    const r = await servicio.revalidar(yo, {
      ...enPantalla(c),
      lineas: [...enPantalla(c).lineas, { idLinea: 999, subtotal: 10 }],
      codigoCupon: 'NOEXISTE',
    });
    const tipos = r.datos.cambios.map((x) => x.tipo);
    expect(tipos).toEqual(['linea_no_vendible', 'linea_quitada', 'cupon_no_aplica', 'total_cambio']);
    expect(r.datos.puedeContinuar).toBe(false);
  });

  it('una línea agregada en otra pestaña se avisa', async () => {
    const yo = cliente(ID_USUARIO_PARTICULAR);
    const c = await pantalla(yo);
    await servicio.agregar(yo, { idVariante: 3, cantidad: 1 });
    const r = await servicio.revalidar(yo, enPantalla(c));
    expect(r.datos.cambios.map((x) => x.tipo)).toEqual(['linea_nueva', 'total_cambio']);
  });

  it('un carrito vacío no deja continuar', async () => {
    const r = await servicio.revalidar(cliente(ID_USUARIO_PARTICULAR), { lineas: [], total: 0 });
    expect(r.datos.puedeContinuar).toBe(false);
  });
});

describe('M05 · resumen para el contador del Header', () => {
  it('cantidad de unidades vendibles y total sin cupón', async () => {
    const yo = cliente(ID_USUARIO_PARTICULAR);
    await servicio.agregar(yo, { idVariante: 1, idColor: 13, cantidad: 2 });
    await servicio.agregar(yo, { idVariante: 2, cantidad: 1 });
    expect((await servicio.resumen(yo)).datos).toEqual({ cantidadItems: 3, total: 225_000 });
    expect((await servicio.resumen(visitante())).datos).toEqual({ cantidadItems: 0, total: 0 });
  });
});
