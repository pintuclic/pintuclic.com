import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ServidorPrueba } from './helpers/servidor-prueba';

/**
 * Entrega 2 · productos, variantes y colores que ofrece un producto (P1–P11, V1–V6)
 * contra PostgreSQL real, por HTTP. Se activa con `M01_TEST_DATABASE_URL`.
 */
const URL_BD = process.env.M01_TEST_DATABASE_URL;
const ALEATORIO = Math.random().toString(36).slice(2, 8);
const PREFIJO = `ZZ-PRD-${ALEATORIO}`;
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

interface Dato {
  [clave: string]: unknown;
}
type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH';

describe.skipIf(URL_BD === undefined)('M01 · entrega 2: productos y variantes (HTTP + PostgreSQL)', () => {
  let servidor: ServidorPrueba;
  let prisma: (typeof import('../../../core/db/client'))['prisma'];
  const auditoria = { registrarAccesoDenegado: vi.fn() };
  let contador = 0;

  const admin = (m: Metodo, ruta: string, cuerpo?: unknown) => servidor.peticion('admin', m, ruta, cuerpo);
  const dato = (r: { cuerpo: { data?: unknown } }): Dato => r.cuerpo.data as Dato;
  const lista = (r: { cuerpo: { data?: unknown } }): Dato[] => r.cuerpo.data as Dato[];
  const nombre = (base: string): string => `${PREFIJO}-${base}-${++contador}`;
  const ids = (r: unknown): number[] => (r as Array<{ id: number }>).map((x) => x.id);

  /** Fixture compartida; cada prueba crea sus propios productos. */
  const fx = {
    marca: 0,
    otraMarca: 0,
    linea: 0,
    lineaOtraMarca: 0,
    subcategoria: 0,
    categoria: 0,
    categoria2: 0,
    resina: 0,
    superficie: 0,
    superficie2: 0,
    acabadoMate: 0,
    acabadoSatin: 0,
    baseA: 0,
    baseB: 0,
    medidaGalon: 0,
    medidaCuarto: 0,
    familiaRojos: 0,
    familiaAzules: 0,
  };

  async function crearId(ruta: string, cuerpo: unknown, campoId: string): Promise<number> {
    const r = await admin('POST', ruta, cuerpo);
    expect(r.status, JSON.stringify(r.cuerpo)).toBe(201);
    return dato(r)[campoId] as number;
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_BD ?? '';
    const { levantarServidor } = await import('./helpers/servidor-prueba.js');
    ({ prisma } = await import('../../../core/db/client.js'));
    servidor = await levantarServidor(auditoria);

    const marca = (sufijo: string) =>
      crearId(
        '/marcas',
        {
          nombre: `${PREFIJO}-${sufijo}`,
          logotipoBase64: PNG_1X1.toString('base64'),
          logotipoMimeType: 'image/png',
        },
        'idMarca',
      );
    fx.marca = await marca('marca');
    fx.otraMarca = await marca('otra');
    fx.linea = await crearId('/lineas', { idMarca: fx.marca, nombre: `${PREFIJO}-linea` }, 'idLinea');
    fx.lineaOtraMarca = await crearId('/lineas', { idMarca: fx.otraMarca, nombre: `${PREFIJO}-linea-otra` }, 'idLinea');
    fx.categoria = await crearId('/categorias', { nombre: `${PREFIJO}-cat` }, 'idCategoria');
    fx.categoria2 = await crearId('/categorias', { nombre: `${PREFIJO}-cat2` }, 'idCategoria');
    fx.subcategoria = await crearId(
      `/categorias/${fx.categoria}/subcategorias`,
      { nombre: `${PREFIJO}-sub` },
      'idSubcategoria',
    );
    fx.resina = await crearId('/tipos-resina', { nombre: `${PREFIJO}-resina` }, 'idTipoResina');
    fx.superficie = await crearId('/superficies', { nombre: `${PREFIJO}-sup1` }, 'idSuperficie');
    fx.superficie2 = await crearId('/superficies', { nombre: `${PREFIJO}-sup2` }, 'idSuperficie');
    fx.acabadoMate = await crearId('/acabados', { nombre: `${PREFIJO}-mate` }, 'idAcabado');
    fx.acabadoSatin = await crearId('/acabados', { nombre: `${PREFIJO}-satin` }, 'idAcabado');
    fx.baseA = await crearId('/bases', { nombre: `${PREFIJO}-A` }, 'idBase');
    fx.baseB = await crearId('/bases', { nombre: `${PREFIJO}-B` }, 'idBase');
    const tipo = await crearId(
      '/tipos-medida',
      {
        nombre: `${PREFIJO}-tm`,
        abreviatura: `z${ALEATORIO.slice(0, 4)}`,
        equivalenciaGalones: 1,
      },
      'idTipoMedida',
    );
    fx.medidaGalon = await crearId('/medidas', { idTipoMedida: tipo, valor: 1 }, 'idMedida');
    fx.medidaCuarto = await crearId('/medidas', { idTipoMedida: tipo, valor: 0.25 }, 'idMedida');
    fx.familiaRojos = (
      await prisma.familiaColor.findFirstOrThrow({
        where: { nombre: 'Rojos' },
      })
    ).idFamiliaColor;
    fx.familiaAzules = (
      await prisma.familiaColor.findFirstOrThrow({
        where: { nombre: 'Azules' },
      })
    ).idFamiliaColor;
  });

  afterAll(async () => {
    const marcas = await prisma.marca.findMany({
      where: { nombre: { startsWith: PREFIJO } },
      select: { idMarca: true },
    });
    const idsMarca = marcas.map((m) => m.idMarca);
    await prisma.variante.deleteMany({
      where: { producto: { idMarca: { in: idsMarca } } },
    });
    await prisma.producto.deleteMany({
      where: { idMarca: { in: idsMarca } },
    });
    await prisma.color.deleteMany({ where: { idMarca: { in: idsMarca } } });
    await prisma.linea.deleteMany({ where: { idMarca: { in: idsMarca } } });
    await prisma.marca.deleteMany({ where: { idMarca: { in: idsMarca } } });
    await prisma.medida.deleteMany({
      where: { tipoMedida: { nombre: { startsWith: PREFIJO } } },
    });
    await prisma.tipoMedida.deleteMany({
      where: { nombre: { startsWith: PREFIJO } },
    });
    await prisma.subcategoria.deleteMany({
      where: { categoria: { nombre: { startsWith: PREFIJO } } },
    });
    await prisma.categoria.deleteMany({
      where: { nombre: { startsWith: PREFIJO } },
    });
    await prisma.superficie.deleteMany({
      where: { nombre: { startsWith: PREFIJO } },
    });
    await prisma.tipoResina.deleteMany({
      where: { nombre: { startsWith: PREFIJO } },
    });
    await prisma.acabado.deleteMany({
      where: { nombre: { startsWith: PREFIJO } },
    });
    await prisma.base.deleteMany({
      where: { nombre: { startsWith: PREFIJO } },
    });
    await servidor.cerrar();
    await prisma.$disconnect();
  });

  /** Cuerpo mínimo válido: pintura entonable completa. */
  const cuerpoPintura = (extra: Dato = {}): Dato => ({
    idMarca: fx.marca,
    idLinea: fx.linea,
    idSubcategoria: fx.subcategoria,
    nombre: nombre('prod'),
    usoInterior: true,
    ficha: {
      idTipoResina: fx.resina,
      tipoCalidad: 1,
      rendimientoMin: 20,
      rendimientoMax: 30,
    },
    idsSuperficies: [fx.superficie],
    idsAcabados: [fx.acabadoMate],
    idsBases: [fx.baseA],
    ...extra,
  });
  async function crearProducto(extra: Dato = {}): Promise<Dato> {
    const r = await admin('POST', '/productos', cuerpoPintura(extra));
    expect(r.status, JSON.stringify(r.cuerpo)).toBe(201);
    return dato(r);
  }
  async function crearVariante(idProducto: unknown, extra: Dato = {}): Promise<Dato> {
    const r = await admin('POST', `/productos/${idProducto}/variantes`, {
      idMedida: fx.medidaGalon,
      precio: 100000,
      ...extra,
    });
    expect(r.status, JSON.stringify(r.cuerpo)).toBe(201);
    return dato(r);
  }
  /** Una imagen mínima: publicar exige al menos una. */
  async function subirImagen(idProducto: unknown): Promise<Dato> {
    const r = await admin('POST', `/productos/${String(idProducto)}/imagenes`, {
      imagenBase64: PNG_1X1.toString('base64'),
      imagenMimeType: 'image/png',
    });
    expect(r.status, JSON.stringify(r.cuerpo)).toBe(201);
    return dato(r);
  }
  async function crearColor(extra: Dato = {}): Promise<Dato> {
    const r = await admin('POST', '/colores', {
      idMarca: fx.marca,
      nombre: nombre('col'),
      hexadecimal: '#D7263D',
      ...extra,
    });
    expect(r.status, JSON.stringify(r.cuerpo)).toBe(201);
    return dato(r);
  }

  describe('alta (P1–P4, P6)', () => {
    it('crea una pintura entonable con ficha, relaciones y clase derivada', async () => {
      const p = await crearProducto({
        descripcion: 'Descripción',
        caracteristicas: [
          { nombre: 'Secado', valor: '2 horas', orden: 1 },
          { nombre: 'Lavable', valor: 'Sí' },
        ],
      });
      expect(p).toMatchObject({
        idMarca: fx.marca,
        idLinea: fx.linea,
        claseColor: 'entonable',
        estado: 'activo',
        publicado: false,
        usoInterior: true,
        usoExterior: false,
        patrocinado: false,
        variantesActivas: 0,
        descripcion: 'Descripción',
        ficha: {
          idTipoResina: fx.resina,
          tipoCalidad: 1,
          rendimientoMin: 20,
          rendimientoMax: 30,
        },
      });
      expect(ids(p.superficies)).toEqual([fx.superficie]);
      expect(ids(p.acabados)).toEqual([fx.acabadoMate]);
      expect(ids(p.bases)).toEqual([fx.baseA]);
      expect(p.caracteristicas).toEqual([
        { nombre: 'Lavable', valor: 'Sí', orden: 0 },
        { nombre: 'Secado', valor: '2 horas', orden: 1 },
      ]);
      expect(p.variantes).toEqual([]);
    });

    it('P4: colores_fijos con colores de fábrica y sin_color para un accesorio sin ficha ni línea', async () => {
      const color = await crearColor();
      const fijo = await crearProducto({
        idsBases: [],
        idsColoresFabrica: [color.idColor],
      });
      expect(fijo.claseColor).toBe('colores_fijos');
      const accesorio = await admin('POST', '/productos', {
        idMarca: fx.marca,
        idSubcategoria: fx.subcategoria,
        nombre: nombre('brocha'),
      });
      expect(accesorio.status).toBe(201);
      expect(dato(accesorio)).toMatchObject({
        claseColor: 'sin_color',
        idLinea: null,
        ficha: null,
        linea: null,
      });
    });

    it('normaliza el nombre (espacios) y acepta la categoría complementaria', async () => {
      const p = await crearProducto({
        nombre: `  ${nombre('esp')}  `,
        idCategoriaComplementaria: fx.categoria2,
      });
      expect(p.nombre).toBe((p.nombre as string).trim());
      expect(p.idCategoriaComplementaria).toBe(fx.categoria2);
    });

    it.each([
      ['ficha sin línea (P2)', { idLinea: undefined }],
      ['acabados sin ficha (P2)', { ficha: undefined, idLinea: undefined, idsBases: [] }],
      ['bases sin acabados (P3)', { idsAcabados: [] }],
      ['ids repetidos', { idsSuperficies: [1, 1] }],
      [
        'características con nombre repetido',
        {
          caracteristicas: [
            { nombre: 'A', valor: '1' },
            { nombre: 'a', valor: '2' },
          ],
        },
      ],
      ['rendimiento incompleto', { ficha: { idTipoResina: 1, rendimientoMin: 20 } }],
      [
        'rendimiento invertido',
        {
          ficha: { idTipoResina: 1, rendimientoMin: 30, rendimientoMax: 20 },
        },
      ],
      ['calidad fuera de 1–3', { ficha: { idTipoResina: 1, tipoCalidad: 4 } }],
      ['nombre vacío', { nombre: '  ' }],
    ])('rechaza %s con 400', async (_n, extra) => {
      const r = await admin('POST', '/productos', cuerpoPintura(extra));
      expect(r.status).toBe(400);
      expect(r.cuerpo.error?.code).toBe('PARAMETRO_INVALIDO');
    });

    it('rechaza relaciones que no existen o no sirven con RELACION_INVALIDA / PADRE_INACTIVO', async () => {
      const otroColor = await admin('POST', '/colores', {
        idMarca: fx.otraMarca,
        nombre: nombre('ajeno'),
        hexadecimal: '#112233',
      });
      const casos: Array<[Dato, number, string, string | undefined]> = [
        [{ idMarca: 999999 }, 409, 'RELACION_INVALIDA', 'idMarca'],
        [{ idLinea: fx.lineaOtraMarca }, 409, 'RELACION_INVALIDA', 'idLinea'],
        [{ idLinea: 999999 }, 409, 'RELACION_INVALIDA', 'idLinea'],
        [{ idSubcategoria: 999999 }, 409, 'RELACION_INVALIDA', 'idSubcategoria'],
        [{ idsSuperficies: [999999] }, 409, 'RELACION_INVALIDA', 'idsSuperficies'],
        [{ idsAcabados: [999999] }, 409, 'RELACION_INVALIDA', 'idsAcabados'],
        [{ idsBases: [999999] }, 409, 'RELACION_INVALIDA', 'idsBases'],
        [{ ficha: { idTipoResina: 999999 } }, 409, 'RELACION_INVALIDA', 'idTipoResina'],
        [{ idCategoriaComplementaria: 999999 }, 409, 'RELACION_INVALIDA', 'idCategoriaComplementaria'],
        // P6: color de fábrica de otra marca.
        [{ idsColoresFabrica: [dato(otroColor).idColor] }, 409, 'RELACION_INVALIDA', 'idsColoresFabrica'],
      ];
      for (const [extra, status, code, campo] of casos) {
        const r = await admin('POST', '/productos', cuerpoPintura(extra));
        expect([r.status, r.cuerpo.error?.code, r.cuerpo.error?.details], JSON.stringify(extra)).toEqual([
          status,
          code,
          campo === undefined ? null : { campo },
        ]);
      }
    });

    it('no crea bajo marca, línea o subcategoría inactivas (PADRE_INACTIVO)', async () => {
      const marca = await crearId(
        '/marcas',
        {
          nombre: nombre('mi'),
          logotipoBase64: PNG_1X1.toString('base64'),
          logotipoMimeType: 'image/png',
        },
        'idMarca',
      );
      const linea = await crearId('/lineas', { idMarca: fx.marca, nombre: nombre('li') }, 'idLinea');
      const sub = await crearId(
        `/categorias/${fx.categoria}/subcategorias`,
        { nombre: nombre('si') },
        'idSubcategoria',
      );
      await admin('PATCH', `/marcas/${marca}/estado`, {
        estado: 'inactivo',
        confirmar: true,
      });
      await admin('PATCH', `/lineas/${linea}/estado`, {
        estado: 'inactivo',
        confirmar: true,
      });
      await admin('PATCH', `/subcategorias/${sub}/estado`, {
        estado: 'inactivo',
        confirmar: true,
      });
      for (const extra of [
        {
          idMarca: marca,
          idLinea: undefined,
          ficha: undefined,
          idsAcabados: [],
          idsBases: [],
        },
        { idLinea: linea },
        { idSubcategoria: sub },
      ]) {
        const r = await admin('POST', '/productos', cuerpoPintura(extra));
        expect([r.status, r.cuerpo.error?.code], JSON.stringify(extra)).toEqual([409, 'PADRE_INACTIVO']);
      }
    });

    it('el nombre es único por marca sin distinguir mayúsculas; otra marca puede repetirlo', async () => {
      const p = await crearProducto();
      const dup = await admin('POST', '/productos', cuerpoPintura({ nombre: (p.nombre as string).toUpperCase() }));
      expect([dup.status, dup.cuerpo.error?.code, dup.cuerpo.error?.details]).toEqual([
        409,
        'DUPLICADO',
        { campo: 'nombre' },
      ]);
      const otra = await admin('POST', '/productos', {
        idMarca: fx.otraMarca,
        idSubcategoria: fx.subcategoria,
        nombre: p.nombre,
      });
      expect(otra.status).toBe(201);
    });
  });

  describe('consulta y edición (P1, P11)', () => {
    it('obtiene el detalle y 404 uniforme si no existe', async () => {
      const p = await crearProducto();
      const ok = await admin('GET', `/productos/${p.idProducto}`);
      expect(ok.status).toBe(200);
      expect(dato(ok).nombre).toBe(p.nombre);
      const no = await admin('GET', '/productos/999999');
      expect([no.status, no.cuerpo.error?.code]).toEqual([404, 'RECURSO_NO_DISPONIBLE']);
      expect((await admin('GET', '/productos/abc')).status).toBe(400);
    });

    it('lista paginado con filtros de búsqueda, clase, estado y publicación', async () => {
      const unico = nombre('listable');
      const ent = await crearProducto({ nombre: `${unico}-ent` });
      const color = await crearColor();
      await crearProducto({
        nombre: `${unico}-fij`,
        idsBases: [],
        idsColoresFabrica: [color.idColor],
      });
      await admin('POST', '/productos', {
        idMarca: fx.marca,
        idSubcategoria: fx.subcategoria,
        nombre: `${unico}-sin`,
      });
      await crearVariante(ent.idProducto);

      const todos = await admin(
        'GET',
        `/productos?idMarca=${fx.marca}&busqueda=${encodeURIComponent(unico)}&limite=50`,
      );
      expect(lista(todos).map((x) => x.nombre)).toEqual([`${unico}-ent`, `${unico}-fij`, `${unico}-sin`]);
      expect(todos.cuerpo.pagination).toMatchObject({
        pagina: 1,
        limite: 50,
        total: 3,
      });
      expect(lista(todos).find((x) => x.nombre === `${unico}-ent`)).toMatchObject({
        variantesActivas: 1,
        claseColor: 'entonable',
        marca: expect.any(String),
        categoria: `${PREFIJO}-cat`,
      });

      for (const [clase, sufijo] of [
        ['entonable', 'ent'],
        ['colores_fijos', 'fij'],
        ['sin_color', 'sin'],
      ] as const) {
        const r = await admin('GET', `/productos?idMarca=${fx.marca}&busqueda=${unico}&claseColor=${clase}`);
        expect(lista(r).map((x) => x.nombre)).toEqual([`${unico}-${sufijo}`]);
      }
      const sinPublicar = await admin('GET', `/productos?busqueda=${unico}&publicado=false&estado=activo`);
      expect(lista(sinPublicar)).toHaveLength(3);
      const publicados = await admin('GET', `/productos?busqueda=${unico}&publicado=true`);
      expect(lista(publicados)).toHaveLength(0);
      const pagina2 = await admin('GET', `/productos?idMarca=${fx.marca}&busqueda=${unico}&limite=2&pagina=2`);
      expect(lista(pagina2)).toHaveLength(1);
      expect((await admin('GET', '/productos?claseColor=otra')).status).toBe(400);
    });

    it('edición parcial conserva lo no enviado y la marca no cambia', async () => {
      const p = await crearProducto({
        caracteristicas: [{ nombre: 'Secado', valor: '2 h' }],
      });
      const r = await admin('PUT', `/productos/${p.idProducto}`, {
        descripcion: 'Nueva',
        patrocinado: true,
        idMarca: fx.otraMarca,
      });
      expect(r.status).toBe(200);
      expect(dato(r)).toMatchObject({
        descripcion: 'Nueva',
        patrocinado: true,
        idMarca: fx.marca,
        nombre: p.nombre,
        idLinea: fx.linea,
        claseColor: 'entonable',
      });
      expect(ids(dato(r).bases)).toEqual([fx.baseA]);
      expect(dato(r).caracteristicas).toEqual(p.caracteristicas);
      expect((await admin('PUT', `/productos/${p.idProducto}`, {})).status).toBe(400);
      expect((await admin('PUT', '/productos/999999', { descripcion: 'x' })).status).toBe(404);
    });

    it('D11: las listas enviadas reemplazan a las actuales; la clase se recalcula', async () => {
      const p = await crearProducto();
      const r = await admin('PUT', `/productos/${p.idProducto}`, {
        idsSuperficies: [fx.superficie, fx.superficie2],
        idsAcabados: [fx.acabadoSatin],
        idsBases: [fx.baseB],
        caracteristicas: [{ nombre: 'Nuevo', valor: 'v' }],
      });
      expect(r.status).toBe(200);
      expect(ids(dato(r).superficies).sort()).toEqual([fx.superficie, fx.superficie2].sort());
      expect(ids(dato(r).acabados)).toEqual([fx.acabadoSatin]);
      expect(ids(dato(r).bases)).toEqual([fx.baseB]);
      expect(dato(r).caracteristicas).toEqual([{ nombre: 'Nuevo', valor: 'v', orden: 0 }]);

      const sinBases = await admin('PUT', `/productos/${p.idProducto}`, {
        idsBases: [],
      });
      expect(dato(sinBases).claseColor).toBe('sin_color');
    });

    it('P2/P3 se comprueban sobre el estado resultante', async () => {
      const p = await crearProducto();
      // Retirar la ficha dejando acabados y bases: inválido.
      const a = await admin('PUT', `/productos/${p.idProducto}`, {
        ficha: null,
      });
      expect([a.status, a.cuerpo.error?.code]).toEqual([400, 'PARAMETRO_INVALIDO']);
      // Quitar los acabados dejando bases: inválido.
      const b = await admin('PUT', `/productos/${p.idProducto}`, {
        idsAcabados: [],
      });
      expect(b.status).toBe(400);
      // Retirar la línea con ficha: inválido.
      const c = await admin('PUT', `/productos/${p.idProducto}`, {
        idLinea: null,
      });
      expect(c.status).toBe(400);
      // Convertirlo en accesorio en un solo paso: válido.
      const d = await admin('PUT', `/productos/${p.idProducto}`, {
        ficha: null,
        idLinea: null,
        idsAcabados: [],
        idsBases: [],
      });
      expect(d.status).toBe(200);
      expect(dato(d)).toMatchObject({
        ficha: null,
        idLinea: null,
        claseColor: 'sin_color',
      });
    });

    it('edita la ficha, valida relaciones nuevas y respeta las ya existentes aunque se hayan desactivado', async () => {
      const p = await crearProducto({
        idsBases: [fx.baseA, fx.baseB],
        idsAcabados: [fx.acabadoMate, fx.acabadoSatin],
      });
      const ficha = await admin('PUT', `/productos/${p.idProducto}`, {
        ficha: { idTipoResina: fx.resina, tipoCalidad: 2 },
      });
      expect(dato(ficha).ficha).toMatchObject({
        tipoCalidad: 2,
        rendimientoMin: null,
        rendimientoMax: null,
      });

      const nueva = await admin('PUT', `/productos/${p.idProducto}`, {
        idsBases: [fx.baseA, 999999],
      });
      expect([nueva.status, nueva.cuerpo.error?.details]).toEqual([409, { campo: 'idsBases' }]);

      const baseTemporal = await crearId('/bases', { nombre: nombre('tmp') }, 'idBase');
      await admin('PUT', `/productos/${p.idProducto}`, {
        idsBases: [fx.baseA, baseTemporal],
      });
      await admin('PATCH', `/bases/${baseTemporal}/estado`, {
        estado: 'inactivo',
        confirmar: true,
      });
      const reenvio = await admin('PUT', `/productos/${p.idProducto}`, {
        idsBases: [fx.baseA, baseTemporal],
        nombre: nombre('ren'),
      });
      expect(reenvio.status, JSON.stringify(reenvio.cuerpo)).toBe(200);
      const otroProd = await crearProducto();
      const intento = await admin('PUT', `/productos/${otroProd.idProducto}`, { idsBases: [baseTemporal] });
      expect([intento.status, intento.cuerpo.error?.code]).toEqual([409, 'RELACION_INVALIDA']);
    });

    it('cambia línea y subcategoría validando marca y estado; nombre duplicado → DUPLICADO', async () => {
      const a = await crearProducto();
      const b = await crearProducto();
      const mala = await admin('PUT', `/productos/${a.idProducto}`, {
        idLinea: fx.lineaOtraMarca,
      });
      expect([mala.status, mala.cuerpo.error?.details]).toEqual([409, { campo: 'idLinea' }]);
      const lineaNueva = await crearId('/lineas', { idMarca: fx.marca, nombre: nombre('ln') }, 'idLinea');
      const subNueva = await crearId(
        `/categorias/${fx.categoria2}/subcategorias`,
        { nombre: nombre('sn') },
        'idSubcategoria',
      );
      const ok = await admin('PUT', `/productos/${a.idProducto}`, {
        idLinea: lineaNueva,
        idSubcategoria: subNueva,
      });
      expect(dato(ok)).toMatchObject({
        idLinea: lineaNueva,
        idSubcategoria: subNueva,
        categoria: `${PREFIJO}-cat2`,
      });
      const dup = await admin('PUT', `/productos/${a.idProducto}`, {
        nombre: (b.nombre as string).toLowerCase(),
      });
      expect([dup.status, dup.cuerpo.error?.code]).toEqual([409, 'DUPLICADO']);
      const propio = await admin('PUT', `/productos/${a.idProducto}`, {
        nombre: (a.nombre as string).toUpperCase(),
      });
      expect(propio.status).toBe(200);
    });
  });

  describe('variantes (V1–V6)', () => {
    it('crea con SKU generado P{producto}-V{variante}, precio y existencia 0', async () => {
      const p = await crearProducto();
      const v = await crearVariante(p.idProducto, { precio: 123456.5 });
      expect(v).toMatchObject({
        idProducto: p.idProducto,
        idMedida: fx.medidaGalon,
        medida: '1 ' + (v.medida as string).split(' ')[1],
        precio: 123456.5,
        existenciaReferencial: 0,
        codigoProveedor: null,
        estado: 'activo',
        sku: `P${p.idProducto}-V${v.idVariante}`,
      });
      const detalle = await admin('GET', `/productos/${p.idProducto}`);
      expect((dato(detalle).variantes as Dato[]).map((x) => x.idVariante)).toEqual([v.idVariante]);
      expect(dato(detalle).variantesActivas).toBe(1);
    });

    it('acepta SKU y código de proveedor propios, e ignora una existencia enviada (la escribe M13)', async () => {
      const p = await crearProducto();
      const v = await crearVariante(p.idProducto, {
        sku: `S${ALEATORIO}-1`,
        existenciaReferencial: 7,
        codigoProveedor: `CP${ALEATORIO}-1`,
      });
      expect(v).toMatchObject({
        sku: `S${ALEATORIO}-1`,
        existenciaReferencial: 0,
        codigoProveedor: `CP${ALEATORIO}-1`,
      });
    });

    it.each([
      ['precio negativo', { precio: -1 }],
      ['precio con tres decimales', { precio: 10.123 }],
      ['precio ausente', { precio: undefined }],
      ['SKU con caracteres inválidos', { sku: 'a b!' }],
      ['medida ausente', { idMedida: undefined }],
    ])('rechaza %s con 400', async (_n, extra) => {
      const p = await crearProducto();
      const r = await admin('POST', `/productos/${p.idProducto}/variantes`, {
        idMedida: fx.medidaGalon,
        precio: 1,
        ...extra,
      });
      expect(r.status).toBe(400);
    });

    it('V1/V3: una variante por producto y medida; SKU y código de proveedor únicos', async () => {
      const p = await crearProducto();
      await crearVariante(p.idProducto, {
        sku: `U${ALEATORIO}-1`,
        codigoProveedor: `PU${ALEATORIO}`,
      });
      const q = await crearProducto();
      const casos: Array<[number | unknown, Dato, string]> = [
        [p.idProducto, { idMedida: fx.medidaGalon }, 'idMedida'],
        [q.idProducto, { sku: `u${ALEATORIO}-1` }, 'sku'],
        [q.idProducto, { codigoProveedor: `pu${ALEATORIO}` }, 'codigoProveedor'],
      ];
      for (const [idProducto, extra, campo] of casos) {
        const r = await admin('POST', `/productos/${idProducto}/variantes`, {
          idMedida: fx.medidaCuarto,
          precio: 5,
          ...extra,
        });
        expect([r.status, r.cuerpo.error?.code, r.cuerpo.error?.details], campo).toEqual([409, 'DUPLICADO', { campo }]);
      }
      // La misma medida en otro producto sí puede.
      expect(
        (
          await admin('POST', `/productos/${q.idProducto}/variantes`, {
            idMedida: fx.medidaGalon,
            precio: 5,
          })
        ).status,
      ).toBe(201);
    });

    it('V5: medida inexistente o inactiva, y producto inexistente o inactivo', async () => {
      const p = await crearProducto();
      const sinMedida = await admin('POST', `/productos/${p.idProducto}/variantes`, { idMedida: 999999, precio: 1 });
      expect([sinMedida.status, sinMedida.cuerpo.error?.code]).toEqual([409, 'RELACION_INVALIDA']);

      const tipo = await crearId(
        '/tipos-medida',
        {
          nombre: nombre('tmi'),
          abreviatura: `y${ALEATORIO.slice(0, 4)}${contador}`,
        },
        'idTipoMedida',
      );
      const medida = await crearId('/medidas', { idTipoMedida: tipo, valor: 3 }, 'idMedida');
      await admin('PATCH', `/medidas/${medida}/estado`, {
        estado: 'inactivo',
        confirmar: true,
      });
      const inactiva = await admin('POST', `/productos/${p.idProducto}/variantes`, { idMedida: medida, precio: 1 });
      expect([inactiva.status, inactiva.cuerpo.error?.code]).toEqual([409, 'PADRE_INACTIVO']);

      expect(
        (
          await admin('POST', '/productos/999999/variantes', {
            idMedida: fx.medidaGalon,
            precio: 1,
          })
        ).status,
      ).toBe(404);
      await admin('PATCH', `/productos/${p.idProducto}/estado`, {
        estado: 'inactivo',
        confirmar: true,
      });
      const prodInactivo = await admin('POST', `/productos/${p.idProducto}/variantes`, {
        idMedida: fx.medidaGalon,
        precio: 1,
      });
      expect([prodInactivo.status, prodInactivo.cuerpo.error?.code]).toEqual([409, 'PADRE_INACTIVO']);
    });

    it('edita precio, SKU y código; la medida no cambia y la existencia enviada se ignora', async () => {
      const p = await crearProducto();
      const v = await crearVariante(p.idProducto, {
        codigoProveedor: `ED${ALEATORIO}`,
      });
      const r = await admin('PUT', `/variantes/${v.idVariante}`, {
        precio: 99.99,
        sku: `N${ALEATORIO}-1`,
        existenciaReferencial: 12,
        idMedida: fx.medidaCuarto,
      });
      expect(r.status).toBe(200);
      expect(dato(r)).toMatchObject({
        precio: 99.99,
        sku: `N${ALEATORIO}-1`,
        existenciaReferencial: 0,
        idMedida: fx.medidaGalon,
      });
      const limpio = await admin('PUT', `/variantes/${v.idVariante}`, {
        codigoProveedor: null,
      });
      expect(dato(limpio).codigoProveedor).toBeNull();
      expect((await admin('PUT', `/variantes/${v.idVariante}`, {})).status).toBe(400);
      expect((await admin('PUT', '/variantes/999999', { precio: 1 })).status).toBe(404);
      // Su propio SKU no es duplicado; el de otra variante sí.
      expect(
        (
          await admin('PUT', `/variantes/${v.idVariante}`, {
            sku: `n${ALEATORIO}-1`,
          })
        ).status,
      ).toBe(200);
      const otra = await crearVariante((await crearProducto()).idProducto);
      const dup = await admin('PUT', `/variantes/${v.idVariante}`, {
        sku: otra.sku,
      });
      expect([dup.status, dup.cuerpo.error?.details]).toEqual([409, { campo: 'sku' }]);
    });
  });

  describe('publicación y estado (P7–P10, V6)', () => {
    it('P7: publicar exige variante activa y producto activo; despublicar siempre', async () => {
      const p = await crearProducto();
      const sinVariante = await admin('PATCH', `/productos/${p.idProducto}/publicacion`, { publicado: true });
      expect([sinVariante.status, sinVariante.cuerpo.error?.code]).toEqual([409, 'NO_PUBLICABLE']);

      const v = await crearVariante(p.idProducto);
      const sinImagen = await admin('PATCH', `/productos/${p.idProducto}/publicacion`, { publicado: true });
      expect([sinImagen.status, sinImagen.cuerpo.error?.code]).toEqual([409, 'NO_PUBLICABLE']);
      await subirImagen(p.idProducto);
      const ok = await admin('PATCH', `/productos/${p.idProducto}/publicacion`, { publicado: true });
      expect(dato(ok)).toMatchObject({ publicado: true });
      expect(
        dato(
          await admin('PATCH', `/productos/${p.idProducto}/publicacion`, {
            publicado: true,
          }),
        ).publicado,
      ).toBe(true);
      expect(
        dato(
          await admin('PATCH', `/productos/${p.idProducto}/publicacion`, {
            publicado: false,
          }),
        ).publicado,
      ).toBe(false);

      // Variante inactiva no cuenta.
      await admin('PATCH', `/variantes/${v.idVariante}/estado`, {
        estado: 'inactivo',
      });
      const inactiva = await admin('PATCH', `/productos/${p.idProducto}/publicacion`, { publicado: true });
      expect([inactiva.status, inactiva.cuerpo.error?.code]).toEqual([409, 'NO_PUBLICABLE']);
      expect(
        (
          await admin('PATCH', `/productos/${p.idProducto}/publicacion`, {
            publicado: 'si',
          })
        ).status,
      ).toBe(400);
    });

    it('P7: un producto inactivo no se publica', async () => {
      const p = await crearProducto();
      await crearVariante(p.idProducto);
      await admin('PATCH', `/productos/${p.idProducto}/estado`, {
        estado: 'inactivo',
        confirmar: true,
      });
      const r = await admin('PATCH', `/productos/${p.idProducto}/publicacion`, { publicado: true });
      expect([r.status, r.cuerpo.error?.code]).toEqual([409, 'NO_PUBLICABLE']);
    });

    it('P8: desactivar la última variante activa de un producto publicado pide confirmación y lo despublica', async () => {
      const p = await crearProducto();
      const v1 = await crearVariante(p.idProducto);
      const v2 = await crearVariante(p.idProducto, {
        idMedida: fx.medidaCuarto,
      });
      await subirImagen(p.idProducto);
      await admin('PATCH', `/productos/${p.idProducto}/publicacion`, {
        publicado: true,
      });

      // No es la última: sin confirmación.
      const impacto1 = await admin('GET', `/variantes/${v1.idVariante}/impacto-desactivacion`);
      expect(impacto1.cuerpo.data).toMatchObject({ productos: 0 });
      const primera = await admin('PATCH', `/variantes/${v1.idVariante}/estado`, { estado: 'inactivo' });
      expect(primera.status).toBe(200);
      expect((await admin('GET', `/productos/${p.idProducto}`)).cuerpo.data).toMatchObject({
        publicado: true,
        variantesActivas: 1,
      });

      // Es la última.
      const impacto2 = await admin('GET', `/variantes/${v2.idVariante}/impacto-desactivacion`);
      expect(impacto2.cuerpo.data).toMatchObject({ productos: 1 });
      const sinConfirmar = await admin('PATCH', `/variantes/${v2.idVariante}/estado`, { estado: 'inactivo' });
      expect([sinConfirmar.status, sinConfirmar.cuerpo.error?.code]).toEqual([409, 'CONFIRMACION_REQUERIDA']);
      expect(sinConfirmar.cuerpo.error?.details).toMatchObject({
        productos: 1,
      });
      const confirmada = await admin('PATCH', `/variantes/${v2.idVariante}/estado`, {
        estado: 'inactivo',
        confirmar: true,
      });
      expect(dato(confirmada).estado).toBe('inactivo');
      const despues = await admin('GET', `/productos/${p.idProducto}`);
      expect(dato(despues)).toMatchObject({
        publicado: false,
        estado: 'activo',
        variantesActivas: 0,
      });
    });

    it('desactivar la última variante de un producto sin publicar no pide confirmación', async () => {
      const p = await crearProducto();
      const v = await crearVariante(p.idProducto);
      const r = await admin('PATCH', `/variantes/${v.idVariante}/estado`, {
        estado: 'inactivo',
      });
      expect(r.status).toBe(200);
    });

    it('reactivar una variante exige producto y medida activos', async () => {
      const p = await crearProducto();
      const v = await crearVariante(p.idProducto);
      await admin('PATCH', `/variantes/${v.idVariante}/estado`, {
        estado: 'inactivo',
      });
      await admin('PATCH', `/productos/${p.idProducto}/estado`, {
        estado: 'inactivo',
        confirmar: true,
      });
      const r = await admin('PATCH', `/variantes/${v.idVariante}/estado`, {
        estado: 'activo',
      });
      expect([r.status, r.cuerpo.error?.code]).toEqual([409, 'PADRE_INACTIVO']);
      await admin('PATCH', `/productos/${p.idProducto}/estado`, {
        estado: 'activo',
      });
      expect(
        dato(
          await admin('PATCH', `/variantes/${v.idVariante}/estado`, {
            estado: 'activo',
          }),
        ).estado,
      ).toBe('activo');
    });

    it('P9: desactivar un producto informa su impacto y exige confirmación si tiene variantes activas', async () => {
      const p = await crearProducto();
      const vacio = await admin('GET', `/productos/${p.idProducto}/impacto-desactivacion`);
      expect(vacio.cuerpo.data).toMatchObject({ variantes: 0 });
      await crearVariante(p.idProducto);
      const impacto = await admin('GET', `/productos/${p.idProducto}/impacto-desactivacion`);
      expect(impacto.cuerpo.data).toMatchObject({ variantes: 1 });
      const sin = await admin('PATCH', `/productos/${p.idProducto}/estado`, {
        estado: 'inactivo',
      });
      expect([sin.status, sin.cuerpo.error?.code]).toEqual([409, 'CONFIRMACION_REQUERIDA']);
      expect(sin.cuerpo.error?.details).toMatchObject({ variantes: 1 });
      const ok = await admin('PATCH', `/productos/${p.idProducto}/estado`, {
        estado: 'inactivo',
        confirmar: true,
      });
      expect(dato(ok).estado).toBe('inactivo');
      // Sus variantes no se tocan (no afecta órdenes).
      expect((dato(await admin('GET', `/productos/${p.idProducto}`)).variantes as Dato[])[0]?.estado).toBe('activo');
    });

    it('P10: reactivar verifica marca, línea, subcategoría y categoría', async () => {
      const marca = await crearId(
        '/marcas',
        {
          nombre: nombre('mr'),
          logotipoBase64: PNG_1X1.toString('base64'),
          logotipoMimeType: 'image/png',
        },
        'idMarca',
      );
      const accesorio = dato(
        await admin('POST', '/productos', {
          idMarca: marca,
          idSubcategoria: fx.subcategoria,
          nombre: nombre('acc'),
        }),
      );
      await admin('PATCH', `/productos/${accesorio.idProducto}/estado`, {
        estado: 'inactivo',
        confirmar: true,
      });
      await admin('PATCH', `/marcas/${marca}/estado`, {
        estado: 'inactivo',
        confirmar: true,
      });
      const r = await admin('PATCH', `/productos/${accesorio.idProducto}/estado`, { estado: 'activo' });
      expect([r.status, r.cuerpo.error?.code]).toEqual([409, 'PADRE_INACTIVO']);
      await admin('PATCH', `/marcas/${marca}/estado`, { estado: 'activo' });
      expect(
        dato(
          await admin('PATCH', `/productos/${accesorio.idProducto}/estado`, {
            estado: 'activo',
          }),
        ).estado,
      ).toBe('activo');
    });
  });

  describe('colores que ofrece un producto (P5)', () => {
    it('combina base∧acabado del producto con sus colores de fábrica y excluye el resto', async () => {
      const ok = await crearColor({
        nombre: nombre('ok'),
        idBase: fx.baseA,
        idAcabado: fx.acabadoMate,
        idFamiliaColor: fx.familiaRojos,
      });
      const okAzul = await crearColor({
        nombre: nombre('ok-azul'),
        idBase: fx.baseA,
        idAcabado: fx.acabadoMate,
        idFamiliaColor: fx.familiaAzules,
        hexadecimal: '#3B6EA5',
      });
      const otroAcabado = await crearColor({
        nombre: nombre('acab'),
        idBase: fx.baseA,
        idAcabado: fx.acabadoSatin,
      });
      const otraBase = await crearColor({
        nombre: nombre('base'),
        idBase: fx.baseB,
        idAcabado: fx.acabadoMate,
      });
      const sinBase = await crearColor({
        nombre: nombre('sinbase'),
        idAcabado: fx.acabadoMate,
      });
      const fabrica = await crearColor({
        nombre: nombre('fabrica'),
        idAcabado: fx.acabadoSatin,
        idFamiliaColor: fx.familiaRojos,
      });
      const inactivo = await crearColor({
        nombre: nombre('inact'),
        idBase: fx.baseA,
        idAcabado: fx.acabadoMate,
      });
      await admin('PATCH', `/colores/${inactivo.idColor}/estado`, {
        estado: 'inactivo',
        confirmar: true,
      });
      const ajeno = dato(
        await admin('POST', '/colores', {
          idMarca: fx.otraMarca,
          nombre: nombre('ajeno'),
          hexadecimal: '#112233',
          idBase: fx.baseA,
          idAcabado: fx.acabadoMate,
        }),
      );

      const p = await crearProducto({ idsColoresFabrica: [fabrica.idColor] });
      const r = await admin('GET', `/productos/${p.idProducto}/colores?limite=100`);
      expect(r.status).toBe(200);
      const devueltos = lista(r).map((c) => c.idColor);
      expect(devueltos.sort()).toEqual([ok.idColor, okAzul.idColor, fabrica.idColor].sort());
      for (const excluido of [otroAcabado, otraBase, sinBase, inactivo, ajeno]) {
        expect(devueltos).not.toContain(excluido.idColor);
      }
      expect(lista(r).find((c) => c.idColor === fabrica.idColor)).toMatchObject({
        esDeFabrica: true,
        acabado: `${PREFIJO}-satin`,
      });
      expect(lista(r).find((c) => c.idColor === ok.idColor)).toMatchObject({
        esDeFabrica: false,
        familia: 'Rojos',
        hexadecimal: '#D7263D',
      });
      expect(r.cuerpo.pagination).toMatchObject({ total: 3 });

      const familias = (r.cuerpo as unknown as { familias: Dato[] }).familias;
      expect(familias.map((f) => [f.nombre, f.total])).toEqual(
        expect.arrayContaining([
          ['Rojos', 2],
          ['Azules', 1],
        ]),
      );
      expect(familias[0]).toMatchObject({
        idFamiliaColor: expect.any(Number),
        hexadecimal: expect.stringMatching(/^#[0-9A-F]{6}$/),
      });

      // Filtros: familia (las familias del selector no se reducen), acabado y búsqueda.
      const rojos = await admin('GET', `/productos/${p.idProducto}/colores?idFamiliaColor=${fx.familiaRojos}`);
      expect(
        lista(rojos)
          .map((c) => c.idColor)
          .sort(),
      ).toEqual([ok.idColor, fabrica.idColor].sort());
      expect((rojos.cuerpo as unknown as { familias: Dato[] }).familias).toHaveLength(familias.length);
      const satin = await admin('GET', `/productos/${p.idProducto}/colores?idAcabado=${fx.acabadoSatin}`);
      expect(lista(satin).map((c) => c.idColor)).toEqual([fabrica.idColor]);
      const busqueda = await admin(
        'GET',
        `/productos/${p.idProducto}/colores?busqueda=${encodeURIComponent('ok-azul')}`,
      );
      expect(lista(busqueda).map((c) => c.idColor)).toEqual([okAzul.idColor]);
      const paginado = await admin('GET', `/productos/${p.idProducto}/colores?limite=2&pagina=2`);
      expect(lista(paginado)).toHaveLength(1);
      expect(paginado.cuerpo.pagination).toMatchObject({
        total: 3,
        totalPaginas: 2,
      });
    });

    it('una base o un acabado inactivos retiran sus colores; desactivar un color los quita', async () => {
      const base = await crearId('/bases', { nombre: nombre('bx') }, 'idBase');
      const color = await crearColor({
        nombre: nombre('cx'),
        idBase: base,
        idAcabado: fx.acabadoMate,
      });
      const p = await crearProducto({ idsBases: [base] });
      expect(lista(await admin('GET', `/productos/${p.idProducto}/colores`)).map((c) => c.idColor)).toEqual([
        color.idColor,
      ]);
      await admin('PATCH', `/bases/${base}/estado`, {
        estado: 'inactivo',
        confirmar: true,
      });
      expect(lista(await admin('GET', `/productos/${p.idProducto}/colores`))).toEqual([]);
      await admin('PATCH', `/bases/${base}/estado`, { estado: 'activo' });
      expect(lista(await admin('GET', `/productos/${p.idProducto}/colores`))).toHaveLength(1);
      await admin('PATCH', `/colores/${color.idColor}/estado`, {
        estado: 'inactivo',
        confirmar: true,
      });
      expect(lista(await admin('GET', `/productos/${p.idProducto}/colores`))).toEqual([]);
    });

    it('el impacto de desactivar un color cuenta los productos que lo ofrecen (C7)', async () => {
      const color = await crearColor({
        nombre: nombre('imp'),
        idBase: fx.baseA,
        idAcabado: fx.acabadoMate,
      });
      const p = await crearProducto();
      await crearVariante(p.idProducto);
      await subirImagen(p.idProducto);
      // El impacto solo cuenta productos visibles al público: publicado y con cadena activa.
      await admin('PATCH', `/productos/${p.idProducto}/publicacion`, {
        publicado: true,
      });
      const impacto = await admin('GET', `/colores/${color.idColor}/impacto-desactivacion`);
      expect((impacto.cuerpo.data as Dato).productos).toBeGreaterThanOrEqual(1);
    });

    it('404 si el producto no existe y 400 con parámetros inválidos', async () => {
      expect((await admin('GET', '/productos/999999/colores')).status).toBe(404);
      const p = await crearProducto();
      expect((await admin('GET', `/productos/${p.idProducto}/colores?limite=0`)).status).toBe(400);
    });
  });

  describe('permisos', () => {
    it('lector solo consulta; editor crea, edita y publica pero no desactiva; cliente y anónimo no ven nada', async () => {
      const p = await crearProducto();
      const v = await crearVariante(p.idProducto);
      await subirImagen(p.idProducto);
      const ver = (actor: 'lector' | 'cliente' | null) => servidor.peticion(actor, 'GET', `/productos/${p.idProducto}`);
      expect((await ver('lector')).status).toBe(200);
      expect((await ver('cliente')).status).toBe(404);
      expect((await ver(null)).status).toBe(404);

      expect((await servidor.peticion('lector', 'POST', '/productos', cuerpoPintura())).status).toBe(404);
      expect(
        (await servidor.peticion('lector', 'PUT', `/productos/${p.idProducto}`, { descripcion: 'x' })).status,
      ).toBe(404);
      expect(
        (
          await servidor.peticion('lector', 'POST', `/productos/${p.idProducto}/variantes`, {
            idMedida: fx.medidaCuarto,
            precio: 1,
          })
        ).status,
      ).toBe(404);
      expect(
        (await servidor.peticion('lector', 'PATCH', `/productos/${p.idProducto}/publicacion`, { publicado: true }))
          .status,
      ).toBe(404);

      expect((await servidor.peticion('editor', 'POST', '/productos', cuerpoPintura())).status).toBe(201);
      expect((await servidor.peticion('editor', 'PUT', `/variantes/${v.idVariante}`, { precio: 5 })).status).toBe(200);
      expect(
        (await servidor.peticion('editor', 'PATCH', `/productos/${p.idProducto}/publicacion`, { publicado: true }))
          .status,
      ).toBe(200);
      for (const ruta of [`/productos/${p.idProducto}/estado`, `/variantes/${v.idVariante}/estado`]) {
        const r = await servidor.peticion('editor', 'PATCH', ruta, {
          estado: 'inactivo',
          confirmar: true,
        });
        expect([r.status, r.cuerpo.error?.code]).toEqual([404, 'RECURSO_NO_DISPONIBLE']);
      }
      // El editor sí puede reactivar (D1).
      await admin('PATCH', `/productos/${p.idProducto}/estado`, {
        estado: 'inactivo',
        confirmar: true,
      });
      expect(
        (await servidor.peticion('editor', 'PATCH', `/productos/${p.idProducto}/estado`, { estado: 'activo' })).status,
      ).toBe(200);
    });
  });
});
