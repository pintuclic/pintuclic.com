import express, { type Express } from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AuditoriaPort } from '../../m20-seguridad/interfaces/auditoria.port';
import {
  AutorizacionService,
  type ResolutorPermisos,
} from '../../m20-seguridad/services/autorizacion.service';
import type { ConfiguracionAsesoria } from '../dtos/cuestionario.dto';
import type {
  CalculadoraRepositoryPort,
  ConfiguracionCalculadoraPort,
  PaginaProductosCalculables,
  ProductoConRendimiento,
} from '../interfaces/calculadora.interface';
import type { ConfiguracionRepositoryPort } from '../interfaces/cuestionario.interface';
import { construirModuloM03 } from '../m03.routes';

/**
 * Pruebas HTTP de la calculadora sobre un Express real, con el MISMO router que monta
 * `app.routes.ts` y repositorios falsos (igual que M16). Sin base de datos.
 *
 * No se monta ningún middleware de sesión: así se comprueba que las rutas son públicas
 * (CA-ASE-02-09).
 */

const CATALOGO: ProductoConRendimiento[] = [
  {
    idProducto: 1,
    nombre: 'Viniltex Máxima Protección',
    marca: 'Pintuco',
    rendimientoMinTexto: '25.00',
    rendimientoMaxTexto: '25.00',
    manosFicha: 2,
    presentaciones: [
      { idVariante: 10, presentacion: '1 galón', valorTexto: '1.000', equivalenciaGalonesTexto: '1.000000000' },
      { idVariante: 11, presentacion: '1/4 de galón', valorTexto: '0.250', equivalenciaGalonesTexto: '1.000000000' },
    ],
  },
];

const repo: CalculadoraRepositoryPort = {
  listarCalculables: async (args): Promise<PaginaProductosCalculables> => {
    const termino = args.q?.toLowerCase();
    const coincide = CATALOGO.filter(
      (p) =>
        termino === undefined ||
        p.nombre.toLowerCase().includes(termino) ||
        p.marca.toLowerCase().includes(termino),
    );
    return {
      total: coincide.length,
      datos: coincide
        .slice((args.pagina - 1) * args.limite, args.pagina * args.limite)
        .map((p) => ({ idProducto: p.idProducto, nombre: p.nombre, marca: p.marca })),
    };
  },
  obtenerConRendimiento: async (id): Promise<ProductoConRendimiento | null> =>
    CATALOGO.find((p) => p.idProducto === id) ?? null,
};

const CONFIGURACION_BASE: ConfiguracionAsesoria = {
  modoCuestionario: 'fijo',
  manosPorDefecto: null,
  guionCuestionario: '',
  guionAsistente: '',
  iaTiempoEsperaMs: 8000,
  iaReintentos: 2,
  iaSuspensionCuotaMinutos: 60,
  iaRetencionIncidentesDias: 90,
  iaFallosConsecutivosAlerta: 5,
  fechaActualizacion: new Date(0).toISOString(),
};

const configuracion: ConfiguracionCalculadoraPort & ConfiguracionRepositoryPort = {
  obtenerManosPorDefecto: async (): Promise<number | null> => null,
  obtener: async (): Promise<ConfiguracionAsesoria> => CONFIGURACION_BASE,
  editar: async (): Promise<ConfiguracionAsesoria> => CONFIGURACION_BASE,
};

let servidor: Server;
let base: string;

beforeAll(async () => {
  const app: Express = express();
  app.use(express.json());
  // La calculadora es pública: la autorización no interviene, pero el módulo la pide para
  // montar su panel, así que se le pasa una que nunca concede permisos.
  const resolutor: ResolutorPermisos = { tienePermiso: () => Promise.resolve(false) };
  const auditoria = { registrarAccesoDenegado: vi.fn() } satisfies AuditoriaPort;
  const m03 = construirModuloM03(new AutorizacionService(resolutor, auditoria), {
    calculadoraRepo: repo,
    configuracionRepo: configuracion,
  });
  app.use('/asesoria', m03.publicRouter);

  await new Promise<void>((listo) => {
    servidor = app.listen(0, () => {
      const direccion = servidor.address() as AddressInfo;
      base = `http://127.0.0.1:${direccion.port}`;
      listo();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((listo) => servidor.close(() => listo()));
});

const postCalcular = async (cuerpo: unknown): Promise<Response> =>
  fetch(`${base}/asesoria/calculadora/calcular`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });

describe('Calculadora por HTTP (HU-ASE-02)', () => {
  describe('CA-ASE-02-09: sin sesión', () => {
    it('el listado, la ficha y el cálculo responden sin autenticación', async () => {
      const listado = await fetch(`${base}/asesoria/calculadora/productos`);
      const ficha = await fetch(`${base}/asesoria/calculadora/productos/1`);
      const calculo = await postCalcular({
        sentido: 'cantidad',
        idProducto: 1,
        idVariante: 10,
        area: 50,
        manos: 2,
      });

      expect([listado.status, ficha.status, calculo.status]).toEqual([200, 200, 200]);
    });
  });

  describe('listado de productos con calculadora (K10)', () => {
    it('devuelve el envelope paginado del contrato', async () => {
      const respuesta = await fetch(`${base}/asesoria/calculadora/productos?limite=10`);
      const cuerpo = (await respuesta.json()) as {
        success: boolean;
        data: Array<{ idProducto: number; nombre: string; marca: string }>;
        pagination: { page: number; limit: number; total: number; totalPages: number };
      };

      expect(cuerpo.success).toBe(true);
      expect(cuerpo.data).toEqual([
        { idProducto: 1, nombre: 'Viniltex Máxima Protección', marca: 'Pintuco' },
      ]);
      expect(cuerpo.pagination).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
    });

    it('filtra por el texto del buscador', async () => {
      const conResultado = await fetch(`${base}/asesoria/calculadora/productos?q=pintuco`);
      const sinResultado = await fetch(`${base}/asesoria/calculadora/productos?q=rodillo`);

      const a = (await conResultado.json()) as { data: unknown[] };
      const b = (await sinResultado.json()) as { data: unknown[]; pagination: { total: number } };

      expect(a.data).toHaveLength(1);
      expect(b.data).toHaveLength(0);
      expect(b.pagination.total).toBe(0);
    });

    it('rechaza un límite fuera de rango sin calcular nada', async () => {
      const respuesta = await fetch(`${base}/asesoria/calculadora/productos?limite=500`);
      expect(respuesta.status).toBe(400);
      const cuerpo = (await respuesta.json()) as { error: { code: string } };
      expect(cuerpo.error.code).toBe('PARAMETRO_INVALIDO');
    });
  });

  describe('ficha de la calculadora de un producto', () => {
    it('entrega el rendimiento, las presentaciones y la advertencia', async () => {
      const respuesta = await fetch(`${base}/asesoria/calculadora/productos/1`);
      const cuerpo = (await respuesta.json()) as {
        data: {
          rendimientoMin: number;
          manosSugeridas: number | null;
          presentaciones: Array<{ idVariante: number; rendimientoMin: number }>;
          advertencia: string;
        };
      };

      expect(cuerpo.data.rendimientoMin).toBe(25);
      expect(cuerpo.data.manosSugeridas).toBe(2);
      expect(cuerpo.data.presentaciones).toHaveLength(2);
      expect(cuerpo.data.advertencia).toContain('aproximada');
    });

    it('CA-ASE-02-07: un producto sin calculadora responde 404 opaco', async () => {
      const respuesta = await fetch(`${base}/asesoria/calculadora/productos/999`);
      expect(respuesta.status).toBe(404);
      const cuerpo = (await respuesta.json()) as { error: { code: string; message: string } };
      expect(cuerpo.error.code).toBe('RECURSO_NO_DISPONIBLE');
      expect(cuerpo.error.message).not.toContain('rendimiento');
    });

    it('un identificador que no es un entero positivo responde el mismo 404', async () => {
      const respuesta = await fetch(`${base}/asesoria/calculadora/productos/abc`);
      expect(respuesta.status).toBe(404);
    });
  });

  describe('K8 — validación de la entrada', () => {
    it('CA-ASE-02-06: sin número de manos no calcula y lo exige', async () => {
      const respuesta = await postCalcular({
        sentido: 'cantidad',
        idProducto: 1,
        idVariante: 10,
        area: 50,
      });

      expect(respuesta.status).toBe(400);
      const cuerpo = (await respuesta.json()) as { error: { code: string; message: string } };
      expect(cuerpo.error.code).toBe('PARAMETRO_INVALIDO');
      expect(cuerpo.error.message).toContain('manos');
    });

    it('CA-ASE-02-08: un área de cero o negativa se rechaza', async () => {
      for (const area of [0, -5]) {
        const respuesta = await postCalcular({
          sentido: 'cantidad',
          idProducto: 1,
          idVariante: 10,
          area,
          manos: 2,
        });
        expect(respuesta.status).toBe(400);
        const cuerpo = (await respuesta.json()) as { error: { message: string } };
        expect(cuerpo.error.message).toContain('mayor que cero');
      }
    });

    it('CA-ASE-02-08: unas manos que no son un entero positivo se rechazan', async () => {
      for (const manos of [0, -1, 1.5]) {
        const respuesta = await postCalcular({
          sentido: 'cantidad',
          idProducto: 1,
          idVariante: 10,
          area: 50,
          manos,
        });
        expect(respuesta.status).toBe(400);
      }
    });

    it('un área con más de dos decimales se rechaza', async () => {
      const respuesta = await postCalcular({
        sentido: 'cantidad',
        idProducto: 1,
        idVariante: 10,
        area: 50.123,
        manos: 2,
      });
      expect(respuesta.status).toBe(400);
    });

    it('un sentido desconocido se rechaza', async () => {
      const respuesta = await postCalcular({
        sentido: 'adivinar',
        idProducto: 1,
        idVariante: 10,
        area: 50,
        manos: 2,
      });
      expect(respuesta.status).toBe(400);
    });
  });

  describe('los dos sentidos por HTTP (D5)', () => {
    it('cantidad: 50 m² a 2 manos son 4 galones y trae el equivalente en cuarto', async () => {
      const respuesta = await postCalcular({
        sentido: 'cantidad',
        idProducto: 1,
        idVariante: 10,
        area: 50,
        manos: 2,
      });
      const cuerpo = (await respuesta.json()) as {
        data: {
          sentido: string;
          seleccionada: { minimo: number; maximo: number };
          equivalencias: Array<{ idVariante: number; minimo: number }>;
        };
      };

      expect(cuerpo.data.sentido).toBe('cantidad');
      expect(cuerpo.data.seleccionada).toMatchObject({ minimo: 4, maximo: 4 });
      expect(cuerpo.data.equivalencias).toEqual([
        { idVariante: 11, presentacion: '1/4 de galón', minimo: 16, maximo: 16 },
      ]);
    });

    it('cobertura: 2 galones a 2 manos cubren 25 m²', async () => {
      const respuesta = await postCalcular({
        sentido: 'cobertura',
        idProducto: 1,
        idVariante: 10,
        unidades: 2,
        manos: 2,
      });
      const cuerpo = (await respuesta.json()) as {
        data: { sentido: string; seleccionada: { minimo: number }; equivalencias: unknown[] };
      };

      expect(cuerpo.data.sentido).toBe('cobertura');
      expect(cuerpo.data.seleccionada.minimo).toBe(25);
      expect(cuerpo.data.equivalencias).toEqual([]);
    });

    it('una presentación ajena al producto responde 404', async () => {
      const respuesta = await postCalcular({
        sentido: 'cantidad',
        idProducto: 1,
        idVariante: 777,
        area: 50,
        manos: 2,
      });
      expect(respuesta.status).toBe(404);
    });
  });
});
