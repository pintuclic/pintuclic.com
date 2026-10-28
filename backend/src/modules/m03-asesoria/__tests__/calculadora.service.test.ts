import { describe, expect, it } from 'vitest';
import { ADVERTENCIA_CALCULO, type CalcularRequest } from '../dtos/m03-asesoria.dto';
import type {
  CalculadoraRepositoryPort,
  ConfiguracionCalculadoraPort,
  PaginaProductosCalculables,
  ProductoConRendimiento,
} from '../interfaces/calculadora.interface';
import { AsesoriaError } from '../services/asesoria.error';
import { CalculadoraService } from '../services/calculadora.service';

/* ───────────────────────────────────────────────────────────────────────────
 * Dobles de prueba. Los decimales llegan como texto, igual que del repositorio.
 * ─────────────────────────────────────────────────────────────────────────── */

const GALON = { valorTexto: '1.000', equivalenciaGalonesTexto: '1.000000000' };
const CUARTO = { valorTexto: '0.250', equivalenciaGalonesTexto: '1.000000000' };
const CINCO_GALONES = { valorTexto: '5.000', equivalenciaGalonesTexto: '1.000000000' };
const LITRO = { valorTexto: '1.000', equivalenciaGalonesTexto: '0.264172052' };

/** Vinilo que rinde 25 m² por galón y por mano, en galón y cuarto de galón. */
const vinilo = (): ProductoConRendimiento => ({
  idProducto: 1,
  nombre: 'Viniltex',
  marca: 'Pintuco',
  rendimientoMinTexto: '25.00',
  rendimientoMaxTexto: '25.00',
  manosFicha: null,
  presentaciones: [
    { idVariante: 10, presentacion: '1 galón', ...GALON },
    { idVariante: 11, presentacion: '1/4 de galón', ...CUARTO },
  ],
});

/** Esmalte con rendimiento de RANGO: de 15 a 20 m² por galón y por mano. */
const esmalte = (): ProductoConRendimiento => ({
  idProducto: 2,
  nombre: 'Pintulux',
  marca: 'Pintuco',
  rendimientoMinTexto: '15.00',
  rendimientoMaxTexto: '20.00',
  manosFicha: 2,
  presentaciones: [{ idVariante: 20, presentacion: '1 galón', ...GALON }],
});

function servicio(
  producto: ProductoConRendimiento | null,
  manosPorDefecto: number | null = null,
): CalculadoraService {
  const repo: CalculadoraRepositoryPort = {
    listarCalculables: async (): Promise<PaginaProductosCalculables> => ({ datos: [], total: 0 }),
    obtenerConRendimiento: async (id): Promise<ProductoConRendimiento | null> =>
      producto !== null && producto.idProducto === id ? producto : null,
  };
  const configuracion: ConfiguracionCalculadoraPort = {
    obtenerManosPorDefecto: async (): Promise<number | null> => manosPorDefecto,
  };
  return new CalculadoraService(repo, configuracion);
}

const cantidad = (idProducto: number, idVariante: number, area: number, manos: number): CalcularRequest => ({
  sentido: 'cantidad',
  idProducto,
  idVariante,
  area,
  manos,
});

const cobertura = (idProducto: number, idVariante: number, unidades: number, manos: number): CalcularRequest => ({
  sentido: 'cobertura',
  idProducto,
  idVariante,
  unidades,
  manos,
});

/* ───────────────────────────────────────────────────────────────────────────
 * Criterios de aceptación de HU-ASE-02
 * ─────────────────────────────────────────────────────────────────────────── */

describe('CalculadoraService (HU-ASE-02)', () => {
  describe('K3 — cuánto comprar', () => {
    it('CA-ASE-02-01: 25 m² por galón, 50 m² y 2 manos son 4 galones', async () => {
      const resultado = await servicio(vinilo()).calcular(cantidad(1, 10, 50, 2));

      expect(resultado.seleccionada.minimo).toBe(4);
      expect(resultado.seleccionada.maximo).toBe(4);
      expect(resultado.seleccionada.presentacion).toBe('1 galón');
    });

    it('CA-ASE-02-02: con rango de 15 a 20, 60 m² y 2 manos son entre 6 y 8 galones', async () => {
      const resultado = await servicio(esmalte()).calcular(cantidad(2, 20, 60, 2));

      // El mínimo sale del rendimiento MÁXIMO (120/20) y el máximo del mínimo (120/15).
      expect(resultado.seleccionada.minimo).toBe(6);
      expect(resultado.seleccionada.maximo).toBe(8);
    });

    it('CA-ASE-02-03: 30 m² a 1 mano con 25 de rendimiento son 2 galones, no 1,2', async () => {
      const resultado = await servicio(vinilo()).calcular(cantidad(1, 10, 30, 1));

      expect(resultado.seleccionada.minimo).toBe(2);
      expect(Number.isInteger(resultado.seleccionada.minimo)).toBe(true);
    });

    it('CA-ASE-02-04: el equivalente en cuarto de galón se calcula sobre su volumen', async () => {
      const resultado = await servicio(vinilo()).calcular(cantidad(1, 10, 50, 2));

      const cuarto = resultado.equivalencias.find((e) => e.idVariante === 11);
      // Un cuarto rinde 25 × 0,25 = 6,25 m² por mano: 100 / 6,25 = 16 exactos.
      expect(cuarto).toMatchObject({ presentacion: '1/4 de galón', minimo: 16, maximo: 16 });
    });

    it('CA-ASE-02-05: toda respuesta lleva la advertencia de que es aproximada', async () => {
      const resultado = await servicio(vinilo()).calcular(cantidad(1, 10, 50, 2));
      const ficha = await servicio(vinilo()).obtenerDeProducto(1);

      expect(resultado.advertencia).toBe(ADVERTENCIA_CALCULO);
      expect(ficha.advertencia).toBe(ADVERTENCIA_CALCULO);
    });

    it('K6: devuelve el equivalente en las demás presentaciones, sin repetir la elegida', async () => {
      const resultado = await servicio(vinilo()).calcular(cantidad(1, 10, 50, 2));

      expect(resultado.equivalencias.map((e) => e.idVariante)).toEqual([11]);
    });

    it('las manos multiplican: dar dos manos pide el doble que una', async () => {
      const una = await servicio(vinilo()).calcular(cantidad(1, 10, 100, 1));
      const dos = await servicio(vinilo()).calcular(cantidad(1, 10, 100, 2));

      expect(una.seleccionada.minimo).toBe(4);
      expect(dos.seleccionada.minimo).toBe(8);
    });
  });

  describe('K5 — aritmética exacta, sin coma flotante', () => {
    it('una división que da justo no se pasa a la unidad siguiente', async () => {
      // 50 × 2 / 25 = 4 exacto. Con `number` esto puede dar 4,000000000000001 y el techo
      // lo convertiría en 5 galones, que es justo lo que K5 prohíbe.
      const resultado = await servicio(vinilo()).calcular(cantidad(1, 10, 50, 2));
      expect(resultado.seleccionada.minimo).toBe(4);
    });

    it('un envase en litros, con equivalencia no redonda, no arrastra error', async () => {
      const producto: ProductoConRendimiento = {
        ...vinilo(),
        presentaciones: [{ idVariante: 30, presentacion: '1 litro', ...LITRO }],
      };
      // Un litro son 0,264172052 galones; a 25 m²/galón rinde 6,6043013 m² por mano.
      // Para 6,6 m² a 1 mano basta 1 litro; para 6,61 ya hacen falta 2.
      const justo = await servicio(producto).calcular(cantidad(1, 30, 6.6, 1));
      const unPoquitoMas = await servicio(producto).calcular(cantidad(1, 30, 6.61, 1));

      expect(justo.seleccionada.minimo).toBe(1);
      expect(unPoquitoMas.seleccionada.minimo).toBe(2);
    });

    it('acepta un área con dos decimales sin desviarse', async () => {
      // 12,50 × 2 / 25 = 1 exacto.
      const resultado = await servicio(vinilo()).calcular(cantidad(1, 10, 12.5, 2));
      expect(resultado.seleccionada.minimo).toBe(1);
    });
  });

  describe('K4 — cuánta área cubre', () => {
    it('2 galones a 2 manos con 25 de rendimiento cubren 25 m²', async () => {
      const resultado = await servicio(vinilo()).calcular(cobertura(1, 10, 2, 2));

      expect(resultado.seleccionada.minimo).toBe(25);
      expect(resultado.seleccionada.maximo).toBe(25);
    });

    it('con rango, el mínimo usa el rendimiento mínimo y el máximo el máximo', async () => {
      const resultado = await servicio(esmalte()).calcular(cobertura(2, 20, 3, 1));

      expect(resultado.seleccionada.minimo).toBe(45); // 3 × 15
      expect(resultado.seleccionada.maximo).toBe(60); // 3 × 20
    });

    it('recorta hacia abajo: no promete más área de la que cubre', async () => {
      const producto: ProductoConRendimiento = {
        ...vinilo(),
        presentaciones: [{ idVariante: 30, presentacion: '1 litro', ...LITRO }],
      };
      // 1 litro rinde 6,6043013 m² por mano: se publica 6,6, nunca 6,7.
      const resultado = await servicio(producto).calcular(cobertura(1, 30, 1, 1));

      expect(resultado.seleccionada.minimo).toBe(6.6);
    });

    it('no devuelve equivalencias: el equivalente solo tiene sentido al comprar (K6)', async () => {
      const resultado = await servicio(vinilo()).calcular(cobertura(1, 10, 2, 2));
      expect(resultado.equivalencias).toEqual([]);
    });

    it('5 galones a 2 manos cubren la mitad que a 1 mano', async () => {
      const producto: ProductoConRendimiento = {
        ...vinilo(),
        presentaciones: [{ idVariante: 40, presentacion: '5 galones', ...CINCO_GALONES }],
      };
      const unaMano = await servicio(producto).calcular(cobertura(1, 40, 1, 1));
      const dosManos = await servicio(producto).calcular(cobertura(1, 40, 1, 2));

      expect(unaMano.seleccionada.minimo).toBe(125);
      expect(dosManos.seleccionada.minimo).toBe(62.5);
    });
  });

  describe('K1 y K2 — qué producto ofrece calculadora', () => {
    it('CA-ASE-02-07: un producto sin rendimiento no la ofrece (404 opaco)', async () => {
      // El repositorio devuelve null porque el rodillo no cumple K1.
      await expect(servicio(null).obtenerDeProducto(99)).rejects.toMatchObject({
        code: 'RECURSO_NO_DISPONIBLE',
        status: 404,
      });
    });

    it('el 404 es idéntico para un producto inexistente y para uno sin calculadora', async () => {
      const inexistente = await servicio(vinilo())
        .obtenerDeProducto(12345)
        .catch((e: unknown) => e);
      const sinCalculadora = await servicio(null)
        .obtenerDeProducto(99)
        .catch((e: unknown) => e);

      expect(inexistente).toBeInstanceOf(AsesoriaError);
      expect((inexistente as AsesoriaError).message).toBe((sinCalculadora as AsesoriaError).message);
    });

    it('K2: el rendimiento de cada presentación se deriva de su volumen', async () => {
      const ficha = await servicio(vinilo()).obtenerDeProducto(1);

      expect(ficha.rendimientoMin).toBe(25);
      expect(ficha.presentaciones).toEqual([
        { idVariante: 10, presentacion: '1 galón', volumenGalones: 1, rendimientoMin: 25, rendimientoMax: 25 },
        { idVariante: 11, presentacion: '1/4 de galón', volumenGalones: 0.25, rendimientoMin: 6.25, rendimientoMax: 6.25 },
      ]);
    });

    it('una presentación de otro producto se rechaza con el mismo 404', async () => {
      await expect(servicio(vinilo()).calcular(cantidad(1, 999, 50, 2))).rejects.toMatchObject({
        code: 'RECURSO_NO_DISPONIBLE',
        status: 404,
      });
    });
  });

  describe('K9 — las manos las resuelve el servidor', () => {
    // El Product Owner decidió el 2026-10-27 quitar el campo de la pantalla, así que el
    // servidor SIEMPRE tiene que entregar un número: no hay nadie a quien preguntárselo.
    it('manda la ficha del producto cuando la trae', async () => {
      const ficha = await servicio(esmalte(), 3).obtenerDeProducto(2);
      expect(ficha.manosAplicadas).toBe(2);
    });

    it('si la ficha no las trae, usa la configuración del panel', async () => {
      const ficha = await servicio(vinilo(), 3).obtenerDeProducto(1);
      expect(ficha.manosAplicadas).toBe(3);
    });

    it('sin ficha ni configuración aplica dos, nunca se queda sin número', async () => {
      const ficha = await servicio(vinilo(), null).obtenerDeProducto(1);
      expect(ficha.manosAplicadas).toBe(2);
    });

    it('una configuración fuera de rango no se usa: vuelve a dos', async () => {
      const ficha = await servicio(vinilo(), 99).obtenerDeProducto(1);
      expect(ficha.manosAplicadas).toBe(2);
    });
  });
});
