import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ServidorPrueba } from './helpers/servidor-prueba';

/**
 * Entrega 2 · consulta pública (HU-CAT-06, U1–U7) contra PostgreSQL real, por HTTP y SIN sesión.
 * Se activa con `M01_TEST_DATABASE_URL`.
 */
const URL_BD = process.env.M01_TEST_DATABASE_URL;
const ALEATORIO = Math.random().toString(36).slice(2, 8);
const PREFIJO = `ZZ-PUB-${ALEATORIO}`;
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

interface Dato {
  [clave: string]: unknown;
}
type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH';

describe.skipIf(URL_BD === undefined)('M01 · entrega 2: consulta pública (HTTP + PostgreSQL)', () => {
  let servidor: ServidorPrueba;
  let prisma: (typeof import('../../../core/db/client'))['prisma'];
  const auditoria = { registrarAccesoDenegado: vi.fn() };
  let contador = 0;

  const admin = (m: Metodo, ruta: string, cuerpo?: unknown) => servidor.peticion('admin', m, ruta, cuerpo);
  const dato = (r: { cuerpo: { data?: unknown } }): Dato => r.cuerpo.data as Dato;
  const lista = (r: { cuerpo: { data?: unknown } }): Dato[] => r.cuerpo.data as Dato[];
  const nombre = (base: string): string => `${PREFIJO}-${base}-${++contador}`;

  const fx = {
    marca: 0,
    linea: 0,
    categoria: 0,
    categoriaVacia: 0,
    subcategoria: 0,
    resina: 0,
    superficie: 0,
    acabado: 0,
    base: 0,
    medidaGalon: 0,
    medidaCuarto: 0,
    medidaMetro: 0,
    familiaRojos: 0,
  };

  async function crearId(ruta: string, cuerpo: unknown, campoId: string): Promise<number> {
    const r = await admin('POST', ruta, cuerpo);
    expect(r.status, JSON.stringify(r.cuerpo)).toBe(201);
    return dato(r)[campoId] as number;
  }
  const crearMarca = (sufijo: string) =>
    crearId(
      '/marcas',
      { nombre: `${PREFIJO}-${sufijo}`, logotipoBase64: PNG_1X1.toString('base64'), logotipoMimeType: 'image/png' },
      'idMarca',
    );

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_BD ?? '';
    const { levantarServidor } = await import('./helpers/servidor-prueba.js');
    ({ prisma } = await import('../../../core/db/client.js'));
    servidor = await levantarServidor(auditoria);

    fx.marca = await crearMarca('marca');
    fx.linea = await crearId('/lineas', { idMarca: fx.marca, nombre: `${PREFIJO}-linea` }, 'idLinea');
    fx.categoria = await crearId('/categorias', { nombre: `${PREFIJO}-cat` }, 'idCategoria');
    fx.categoriaVacia = await crearId('/categorias', { nombre: `${PREFIJO}-vacia` }, 'idCategoria');
    await crearId(`/categorias/${fx.categoriaVacia}/subcategorias`, { nombre: `${PREFIJO}-sinprod` }, 'idSubcategoria');
    fx.subcategoria = await crearId(
      `/categorias/${fx.categoria}/subcategorias`,
      { nombre: `${PREFIJO}-sub` },
      'idSubcategoria',
    );
    fx.resina = await crearId('/tipos-resina', { nombre: `${PREFIJO}-resina` }, 'idTipoResina');
    fx.superficie = await crearId('/superficies', { nombre: `${PREFIJO}-sup` }, 'idSuperficie');
    fx.acabado = await crearId('/acabados', { nombre: `${PREFIJO}-mate` }, 'idAcabado');
    fx.base = await crearId('/bases', { nombre: `${PREFIJO}-base` }, 'idBase');
    const volumen = await crearId(
      '/tipos-medida',
      { nombre: `${PREFIJO}-vol`, abreviatura: `v${ALEATORIO.slice(0, 4)}`, equivalenciaGalones: 1 },
      'idTipoMedida',
    );
    const longitud = await crearId(
      '/tipos-medida',
      { nombre: `${PREFIJO}-lon`, abreviatura: `l${ALEATORIO.slice(0, 4)}` },
      'idTipoMedida',
    );
    fx.medidaGalon = await crearId('/medidas', { idTipoMedida: volumen, valor: 1 }, 'idMedida');
    fx.medidaCuarto = await crearId('/medidas', { idTipoMedida: volumen, valor: 0.25 }, 'idMedida');
    fx.medidaMetro = await crearId('/medidas', { idTipoMedida: longitud, valor: 2 }, 'idMedida');
    fx.familiaRojos = (await prisma.familiaColor.findFirstOrThrow({ where: { nombre: 'Rojos' } })).idFamiliaColor;
  });

  afterAll(async () => {
    const marcas = await prisma.marca.findMany({
      where: { nombre: { startsWith: PREFIJO } },
      select: { idMarca: true },
    });
    const idsMarca = marcas.map((m) => m.idMarca);
    await prisma.variante.deleteMany({ where: { producto: { idMarca: { in: idsMarca } } } });
    await prisma.producto.deleteMany({ where: { idMarca: { in: idsMarca } } });
    await prisma.color.deleteMany({ where: { idMarca: { in: idsMarca } } });
    await prisma.linea.deleteMany({ where: { idMarca: { in: idsMarca } } });
    await prisma.marca.deleteMany({ where: { idMarca: { in: idsMarca } } });
    await prisma.medida.deleteMany({ where: { tipoMedida: { nombre: { startsWith: PREFIJO } } } });
    await prisma.tipoMedida.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.subcategoria.deleteMany({ where: { categoria: { nombre: { startsWith: PREFIJO } } } });
    await prisma.categoria.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.superficie.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.tipoResina.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.acabado.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.base.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await servidor.cerrar();
    await prisma.$disconnect();
  });

  const subirImagen = async (id: number): Promise<void> => {
    const r = await admin('POST', `/productos/${id}/imagenes`, {
      imagenBase64: PNG_1X1.toString('base64'),
      imagenMimeType: 'image/png',
    });
    expect(r.status, JSON.stringify(r.cuerpo)).toBe(201);
  };

  /** Crea una pintura entonable con variantes y la deja publicada. */
  async function pinturaPublicada(
    extra: Dato = {},
    variantes: Array<Dato> = [{ idMedida: fx.medidaGalon, precio: 100000, existenciaReferencial: 5 }],
  ): Promise<number> {
    const r = await admin('POST', '/productos', {
      idMarca: fx.marca,
      idLinea: fx.linea,
      idSubcategoria: fx.subcategoria,
      nombre: nombre('prod'),
      usoInterior: true,
      ficha: { idTipoResina: fx.resina, tipoCalidad: 1, rendimientoMin: 20, rendimientoMax: 30 },
      idsSuperficies: [fx.superficie],
      idsAcabados: [fx.acabado],
      idsBases: [fx.base],
      ...extra,
    });
    expect(r.status, JSON.stringify(r.cuerpo)).toBe(201);
    const id = dato(r).idProducto as number;
    for (const { existenciaReferencial, ...v } of variantes) {
      const rv = await admin('POST', `/productos/${id}/variantes`, v);
      expect(rv.status, JSON.stringify(rv.cuerpo)).toBe(201);
      // M01 ya no escribe la existencia (la escribe M13): se fija directo para probar la disponibilidad pública.
      if (typeof existenciaReferencial === 'number') {
        await prisma.variante.update({
          where: { idVariante: dato(rv).idVariante as number },
          data: { existenciaReferencial },
        });
      }
    }
    await subirImagen(id);
    const p = await admin('PATCH', `/productos/${id}/publicacion`, { publicado: true });
    expect(p.status, JSON.stringify(p.cuerpo)).toBe(200);
    return id;
  }
  const ficha = (id: number) => servidor.publica(`/productos/${id}`);

  describe('ficha (U1, U5, U6, U7)', () => {
    it('muestra la ficha pública sin sesión, con variantes activas ordenadas y rendimiento aproximado', async () => {
      const id = await pinturaPublicada(
        { descripcion: 'Pintura lavable', caracteristicas: [{ nombre: 'Secado', valor: '2 h', orden: 1 }] },
        [
          {
            idMedida: fx.medidaGalon,
            precio: 100000,
            existenciaReferencial: 5,
            sku: `G${ALEATORIO}`,
            codigoProveedor: `PRV${ALEATORIO}`,
          },
          { idMedida: fx.medidaCuarto, precio: 30000, existenciaReferencial: 0 },
        ],
      );
      const r = await ficha(id);
      expect(r.status).toBe(200);
      expect(dato(r)).toMatchObject({
        idProducto: id,
        descripcion: 'Pintura lavable',
        marca: `${PREFIJO}-marca`,
        linea: `${PREFIJO}-linea`,
        categoria: `${PREFIJO}-cat`,
        subcategoria: `${PREFIJO}-sub`,
        usoInterior: true,
        usoExterior: false,
        claseColor: 'entonable',
        tipoResina: `${PREFIJO}-resina`,
        tipoCalidad: 1,
        superficies: [`${PREFIJO}-sup`],
        acabados: [{ id: fx.acabado, nombre: `${PREFIJO}-mate` }],
        caracteristicas: [{ nombre: 'Secado', valor: '2 h', orden: 1 }],
        manos: null,
        imagenes: [{ idImagen: expect.any(Number) }],
      });
      const variantes = dato(r).variantes as Dato[];
      // Ordenadas por tamaño (cuarto antes que galón); U5: solo disponible/agotado.
      expect(variantes.map((v) => v.idMedida)).toEqual([fx.medidaCuarto, fx.medidaGalon]);
      expect(variantes[0]).toMatchObject({
        precio: 30000,
        disponibilidad: 'agotado',
        rendimiento: { min: 5, max: 7.5, aproximado: true },
      });
      expect(variantes[1]).toMatchObject({
        precio: 100000,
        sku: `G${ALEATORIO}`,
        disponibilidad: 'disponible',
        rendimiento: { min: 20, max: 30, aproximado: true },
      });
      // U7: nada de existencias exactas ni códigos de proveedor.
      const texto = JSON.stringify(r.cuerpo);
      expect(texto).not.toContain('existenciaReferencial');
      expect(texto).not.toContain('codigoProveedor');
      expect(texto).not.toContain(`PRV${ALEATORIO}`);
    });

    it('U6: sin equivalencia en galones o sin rendimiento la medida no lleva rendimiento', async () => {
      const id = await pinturaPublicada({}, [
        { idMedida: fx.medidaGalon, precio: 1000 },
        { idMedida: fx.medidaMetro, precio: 2000 },
      ]);
      const variantes = dato(await ficha(id)).variantes as Dato[];
      expect(variantes.find((v) => v.idMedida === fx.medidaMetro)?.rendimiento).toBeNull();
      expect(variantes.find((v) => v.idMedida === fx.medidaGalon)?.rendimiento).not.toBeNull();

      const sinRend = await pinturaPublicada({ ficha: { idTipoResina: fx.resina } });
      expect(((dato(await ficha(sinRend)).variantes as Dato[])[0] as Dato).rendimiento).toBeNull();
    });

    it('un accesorio sin ficha ni línea se muestra sin resina ni calidad', async () => {
      const r = await admin('POST', '/productos', {
        idMarca: fx.marca,
        idSubcategoria: fx.subcategoria,
        nombre: nombre('brocha'),
      });
      const id = dato(r).idProducto as number;
      await admin('POST', `/productos/${id}/variantes`, { idMedida: fx.medidaMetro, precio: 9000 });
      await subirImagen(id);
      await admin('PATCH', `/productos/${id}/publicacion`, { publicado: true });
      expect(dato(await ficha(id))).toMatchObject({
        linea: null,
        tipoResina: null,
        tipoCalidad: null,
        claseColor: 'sin_color',
      });
    });

    it('oculta las variantes inactivas y las superficies o acabados inactivos', async () => {
      const id = await pinturaPublicada({}, [
        { idMedida: fx.medidaGalon, precio: 100 },
        { idMedida: fx.medidaCuarto, precio: 50 },
      ]);
      const detalle = dato(await admin('GET', `/productos/${id}`));
      const cuarto = (detalle.variantes as Dato[]).find((v) => v.idMedida === fx.medidaCuarto);
      await admin('PATCH', `/variantes/${String(cuarto?.idVariante)}/estado`, { estado: 'inactivo' });
      await admin('PATCH', `/superficies/${fx.superficie}/estado`, { estado: 'inactivo', confirmar: true });
      try {
        const r = dato(await ficha(id));
        expect((r.variantes as Dato[]).map((v) => v.idMedida)).toEqual([fx.medidaGalon]);
        expect(r.superficies).toEqual([]);
      } finally {
        await admin('PATCH', `/superficies/${fx.superficie}/estado`, { estado: 'activo' });
      }
    });

    it('U1: 404 uniforme si no existe, no está publicado o algún padre está inactivo', async () => {
      const noExiste = await ficha(999999);
      expect([noExiste.status, noExiste.cuerpo.error?.code]).toEqual([404, 'RECURSO_NO_DISPONIBLE']);
      expect((await ficha(0)).status).toBe(400);
      expect((await servidor.publica('/productos/abc')).status).toBe(400);

      // Sin publicar.
      const borrador = dato(
        await admin('POST', '/productos', {
          idMarca: fx.marca,
          idSubcategoria: fx.subcategoria,
          nombre: nombre('borrador'),
        }),
      );
      expect((await ficha(borrador.idProducto as number)).status).toBe(404);

      const id = await pinturaPublicada();
      expect((await ficha(id)).status).toBe(200);

      // Producto inactivo.
      await admin('PATCH', `/productos/${id}/estado`, { estado: 'inactivo', confirmar: true });
      expect((await ficha(id)).status).toBe(404);
      await admin('PATCH', `/productos/${id}/estado`, { estado: 'activo' });
      expect((await ficha(id)).status).toBe(200);

      // Línea, subcategoría, categoría y marca inactivas: R5 los oculta sin darlos de baja.
      const marca2 = await crearMarca('m2');
      const linea2 = await crearId('/lineas', { idMarca: marca2, nombre: nombre('l2') }, 'idLinea');
      const cat2 = await crearId('/categorias', { nombre: nombre('c2') }, 'idCategoria');
      const sub2 = await crearId(`/categorias/${cat2}/subcategorias`, { nombre: nombre('s2') }, 'idSubcategoria');
      const base = {
        idMarca: marca2,
        idLinea: linea2,
        idSubcategoria: sub2,
        ficha: { idTipoResina: fx.resina },
      };
      const idp = await pinturaPublicada(base);
      expect((await ficha(idp)).status).toBe(200);
      // Desactivar un padre oculta el producto; reactivarlo NO reactiva a los hijos que la cascada
      // desactivó (D3), así que el producto sigue oculto hasta reactivar también a esos hijos (R5).
      const casos: Array<[string, string[]]> = [
        [`/lineas/${linea2}`, []],
        [`/subcategorias/${sub2}`, []],
        [`/categorias/${cat2}`, [`/subcategorias/${sub2}`]],
        [`/marcas/${marca2}`, [`/lineas/${linea2}`]],
      ];
      for (const [ruta, hijos] of casos) {
        await admin('PATCH', `${ruta}/estado`, { estado: 'inactivo', confirmar: true });
        const oculto = await ficha(idp);
        expect([ruta, oculto.status, oculto.cuerpo.error?.code]).toEqual([ruta, 404, 'RECURSO_NO_DISPONIBLE']);
        await admin('PATCH', `${ruta}/estado`, { estado: 'activo' });
        for (const hijo of hijos) {
          expect((await ficha(idp)).status, `${ruta} reactivado sin sus hijos`).toBe(404);
          await admin('PATCH', `${hijo}/estado`, { estado: 'activo' });
        }
        expect((await ficha(idp)).status, ruta).toBe(200);
      }
    });
  });

  describe('listado (U1, U2, U3, U5)', () => {
    it('lista solo lo visible, con tarjeta mínima y paginado', async () => {
      const etiqueta = nombre('lst');
      const a = await pinturaPublicada({ nombre: `${etiqueta}-a` }, [
        { idMedida: fx.medidaGalon, precio: 90000, existenciaReferencial: 3 },
        { idMedida: fx.medidaCuarto, precio: 25000, existenciaReferencial: 0 },
      ]);
      const b = await pinturaPublicada({ nombre: `${etiqueta}-b`, idsBases: [], idsAcabados: [] }, [
        { idMedida: fx.medidaGalon, precio: 50000, existenciaReferencial: 0 },
      ]);
      await admin('POST', '/productos', {
        idMarca: fx.marca,
        idSubcategoria: fx.subcategoria,
        nombre: `${etiqueta}-borrador`,
      });

      const r = await servidor.publica(`/productos?idMarca=${fx.marca}&busqueda=${etiqueta}`);
      expect(r.status).toBe(200);
      expect(lista(r).map((x) => x.nombre)).toEqual([`${etiqueta}-a`, `${etiqueta}-b`]);
      expect(r.cuerpo.pagination).toMatchObject({ pagina: 1, limite: 20, total: 2, totalPaginas: 1 });
      expect(lista(r)[0]).toEqual({
        idProducto: a,
        nombre: `${etiqueta}-a`,
        marca: `${PREFIJO}-marca`,
        linea: `${PREFIJO}-linea`,
        categoria: `${PREFIJO}-cat`,
        subcategoria: `${PREFIJO}-sub`,
        precioDesde: 25000,
        tieneColor: true,
        disponibilidad: 'disponible',
        idImagenPrincipal: expect.any(Number),
        esCombo: false,
        oferta: null,
        compraBloqueada: false,
      });
      expect(lista(r)[1]).toMatchObject({
        idProducto: b,
        precioDesde: 50000,
        tieneColor: false,
        disponibilidad: 'agotado',
      });

      const paginaDos = await servidor.publica(`/productos?idMarca=${fx.marca}&busqueda=${etiqueta}&limite=1&pagina=2`);
      expect(lista(paginaDos).map((x) => x.nombre)).toEqual([`${etiqueta}-b`]);
      expect(paginaDos.cuerpo.pagination).toMatchObject({ total: 2, totalPaginas: 2 });
    });

    it('ordena por nombre y por precio mínimo', async () => {
      const etiqueta = nombre('ord');
      await pinturaPublicada({ nombre: `${etiqueta}-a` }, [{ idMedida: fx.medidaGalon, precio: 300 }]);
      await pinturaPublicada({ nombre: `${etiqueta}-b` }, [
        { idMedida: fx.medidaGalon, precio: 500 },
        { idMedida: fx.medidaCuarto, precio: 100 },
      ]);
      await pinturaPublicada({ nombre: `${etiqueta}-c` }, [{ idMedida: fx.medidaGalon, precio: 200 }]);
      const base = `/productos?idMarca=${fx.marca}&busqueda=${etiqueta}`;
      const orden = async (ordenar: string): Promise<string[]> =>
        lista(await servidor.publica(`${base}&ordenar=${ordenar}`)).map(
          (x) => (x.nombre as string).split('-').pop() ?? '',
        );
      expect(await orden('nombre')).toEqual(['a', 'b', 'c']);
      expect(await orden('precio_asc')).toEqual(['b', 'c', 'a']);
      expect(await orden('precio_desc')).toEqual(['a', 'c', 'b']);
      const pagina = await servidor.publica(`${base}&ordenar=precio_asc&limite=1&pagina=2`);
      expect(lista(pagina).map((x) => x.precioDesde)).toEqual([200]);
      expect(pagina.cuerpo.pagination).toMatchObject({ total: 3, totalPaginas: 3 });
    });

    it('filtra por marca, línea, categoría, subcategoría, superficie, ambiente y búsqueda', async () => {
      const etiqueta = nombre('flt');
      const marca2 = await crearMarca('marcaflt');
      const linea2 = await crearId('/lineas', { idMarca: marca2, nombre: nombre('fl') }, 'idLinea');
      const superficie2 = await crearId('/superficies', { nombre: nombre('fs') }, 'idSuperficie');
      const cat2 = await crearId('/categorias', { nombre: nombre('fc') }, 'idCategoria');
      const sub2 = await crearId(`/categorias/${cat2}/subcategorias`, { nombre: nombre('fsub') }, 'idSubcategoria');
      const interior = await pinturaPublicada({ nombre: `${etiqueta}-int` });
      const exterior = await pinturaPublicada({
        nombre: `${etiqueta}-ext`,
        usoInterior: false,
        usoExterior: true,
        idsSuperficies: [superficie2],
      });
      const otra = await pinturaPublicada({
        nombre: `${etiqueta}-otra`,
        idMarca: marca2,
        idLinea: linea2,
        idSubcategoria: sub2,
      });
      const ids = async (consulta: string): Promise<number[]> =>
        lista(await servidor.publica(`/productos?busqueda=${etiqueta}&${consulta}`)).map((x) => x.idProducto as number);

      expect((await ids('')).sort()).toEqual([interior, exterior, otra].sort());
      expect(await ids(`idMarca=${marca2}`)).toEqual([otra]);
      expect(await ids(`idLinea=${linea2}`)).toEqual([otra]);
      expect(await ids(`idCategoria=${cat2}`)).toEqual([otra]);
      expect(await ids(`idSubcategoria=${sub2}`)).toEqual([otra]);
      expect(await ids(`idSuperficie=${superficie2}`)).toEqual([exterior]);
      expect((await ids('ambiente=interior')).sort()).toEqual([interior, otra].sort());
      expect(await ids('ambiente=exterior')).toEqual([exterior]);
      // La búsqueda también alcanza el nombre de la marca.
      const porMarca = await servidor.publica(`/productos?busqueda=${encodeURIComponent(`${PREFIJO}-marcaflt`)}`);
      expect(lista(porMarca).map((x) => x.idProducto)).toEqual([otra]);
    });

    it('un producto con todas sus variantes inactivas deja de listarse', async () => {
      const etiqueta = nombre('sinvar');
      const id = await pinturaPublicada({ nombre: etiqueta });
      expect(lista(await servidor.publica(`/productos?busqueda=${etiqueta}`))).toHaveLength(1);
      const v = (dato(await admin('GET', `/productos/${id}`)).variantes as Dato[])[0];
      await admin('PATCH', `/variantes/${String(v?.idVariante)}/estado`, { estado: 'inactivo', confirmar: true });
      expect(lista(await servidor.publica(`/productos?busqueda=${etiqueta}`))).toHaveLength(0);
      expect((await ficha(id)).status).toBe(404);
    });

    it('rechaza parámetros inválidos con 400', async () => {
      for (const consulta of ['ambiente=sotano', 'ordenar=azar', 'limite=0', 'pagina=0', 'idMarca=x', 'limite=101']) {
        const r = await servidor.publica(`/productos?${consulta}`);
        expect([consulta, r.status, r.cuerpo.error?.code]).toEqual([consulta, 400, 'PARAMETRO_INVALIDO']);
      }
    });
  });

  describe('categorías y filtros (U2)', () => {
    it('solo muestra categorías y subcategorías con productos visibles, con su conteo', async () => {
      const antes = lista(await servidor.publica('/categorias')).find((c) => c.nombre === `${PREFIJO}-cat`);
      const id = await pinturaPublicada();
      const r = await servidor.publica('/categorias');
      expect(r.status).toBe(200);
      const nuestra = lista(r).find((c) => c.nombre === `${PREFIJO}-cat`);
      expect(nuestra).toBeDefined();
      const sub = (nuestra?.subcategorias as Dato[]).find((s) => s.nombre === `${PREFIJO}-sub`);
      const previo = ((antes?.subcategorias as Dato[] | undefined)?.find((s) => s.nombre === `${PREFIJO}-sub`)
        ?.totalProductos ?? 0) as number;
      expect(sub?.totalProductos).toBe(previo + 1);
      // Categoría sin productos: oculta.
      expect(lista(r).some((c) => c.nombre === `${PREFIJO}-vacia`)).toBe(false);
      expect(JSON.stringify(r.cuerpo)).not.toContain(`${PREFIJO}-sinprod`);

      // Sin el producto vuelve a su conteo anterior.
      await admin('PATCH', `/productos/${id}/publicacion`, { publicado: false });
      const despues = lista(await servidor.publica('/categorias')).find((c) => c.nombre === `${PREFIJO}-cat`);
      const subDespues = (despues?.subcategorias as Dato[] | undefined)?.find((s) => s.nombre === `${PREFIJO}-sub`);
      expect((subDespues?.totalProductos ?? 0) as number).toBe(previo);
    });

    it('una categoría inactiva desaparece del árbol público', async () => {
      const cat = await crearId('/categorias', { nombre: nombre('cinact') }, 'idCategoria');
      const sub = await crearId(`/categorias/${cat}/subcategorias`, { nombre: nombre('sinact') }, 'idSubcategoria');
      await pinturaPublicada({ idSubcategoria: sub });
      expect(lista(await servidor.publica('/categorias')).some((c) => c.idCategoria === cat)).toBe(true);
      await admin('PATCH', `/categorias/${cat}/estado`, { estado: 'inactivo', confirmar: true });
      expect(lista(await servidor.publica('/categorias')).some((c) => c.idCategoria === cat)).toBe(false);
    });

    it('filtros: marcas, superficies y ambientes presentes en lo visible', async () => {
      const marcaSola = await crearMarca('solo');
      const superficieSola = await crearId('/superficies', { nombre: nombre('fsolo') }, 'idSuperficie');
      let r = dato(await servidor.publica('/filtros'));
      expect((r.marcas as Dato[]).some((m) => m.id === marcaSola)).toBe(false);
      expect((r.superficies as Dato[]).some((s) => s.id === superficieSola)).toBe(false);

      await pinturaPublicada({
        idMarca: marcaSola,
        idLinea: undefined,
        ficha: undefined,
        idsAcabados: [],
        idsBases: [],
        idsSuperficies: [superficieSola],
        usoExterior: true,
      });
      r = dato(await servidor.publica('/filtros'));
      expect(r.marcas).toContainEqual({ id: marcaSola, nombre: `${PREFIJO}-solo` });
      expect(r.superficies).toContainEqual({ id: superficieSola, nombre: expect.any(String) });
      expect(r.ambientes).toEqual(expect.arrayContaining(['exterior']));
      expect((r.ambientes as string[]).every((a) => a === 'interior' || a === 'exterior')).toBe(true);
    });
  });

  describe('carta de colores (U3, U4)', () => {
    it('devuelve los colores que ofrece el producto, paginados y con sus familias', async () => {
      const rojo1 = dato(
        await admin('POST', '/colores', {
          idMarca: fx.marca,
          nombre: nombre('r1'),
          hexadecimal: '#D7263D',
          idBase: fx.base,
          idAcabado: fx.acabado,
          idFamiliaColor: fx.familiaRojos,
        }),
      );
      const rojo2 = dato(
        await admin('POST', '/colores', {
          idMarca: fx.marca,
          nombre: nombre('r2'),
          hexadecimal: '#C0152B',
          idBase: fx.base,
          idAcabado: fx.acabado,
          idFamiliaColor: fx.familiaRojos,
        }),
      );
      const ajeno = dato(
        await admin('POST', '/colores', {
          idMarca: fx.marca,
          nombre: nombre('aj'),
          hexadecimal: '#112233',
          idAcabado: fx.acabado,
        }),
      );
      const id = await pinturaPublicada();

      const r = await servidor.publica(`/productos/${id}/colores?limite=100`);
      expect(r.status).toBe(200);
      expect(
        lista(r)
          .map((c) => c.idColor)
          .sort(),
      ).toEqual([rojo1.idColor, rojo2.idColor].sort());
      expect(lista(r).map((c) => c.idColor)).not.toContain(ajeno.idColor);
      expect(lista(r)[0]).toMatchObject({
        hexadecimal: expect.stringMatching(/^#[0-9A-F]{6}$/),
        familia: 'Rojos',
        esDeFabrica: false,
      });
      expect((r.cuerpo as unknown as { familias: Dato[] }).familias).toEqual([
        { idFamiliaColor: fx.familiaRojos, nombre: 'Rojos', hexadecimal: expect.any(String), total: 2 },
      ]);
      const unoPorPagina = await servidor.publica(`/productos/${id}/colores?limite=1&pagina=2`);
      expect(lista(unoPorPagina)).toHaveLength(1);
      expect(unoPorPagina.cuerpo.pagination).toMatchObject({ total: 2, totalPaginas: 2 });
      const buscado = await servidor.publica(
        `/productos/${id}/colores?busqueda=${encodeURIComponent('-r2-')}&idFamiliaColor=${fx.familiaRojos}`,
      );
      expect(lista(buscado).map((c) => c.idColor)).toEqual([rojo2.idColor]);
      // U7: sin datos de proveedor ni CIELAB internos.
      expect(JSON.stringify(r.cuerpo)).not.toContain('cielab');
    });

    it('404 si el producto no es visible; 400 con parámetros inválidos', async () => {
      const borrador = dato(
        await admin('POST', '/productos', { idMarca: fx.marca, idSubcategoria: fx.subcategoria, nombre: nombre('bc') }),
      );
      expect((await servidor.publica(`/productos/${String(borrador.idProducto)}/colores`)).status).toBe(404);
      expect((await servidor.publica('/productos/999999/colores')).status).toBe(404);
      expect((await servidor.publica('/productos/abc/colores')).status).toBe(400);
      const id = await pinturaPublicada();
      expect((await servidor.publica(`/productos/${id}/colores?limite=0`)).status).toBe(400);
    });
  });

  describe('logotipo de marca', () => {
    it('sirve los bytes con su tipo y caché; una marca inactiva responde 404', async () => {
      const r = await servidor.publicaBytes(`/marcas/${fx.marca}/logotipo`);
      expect(r.status).toBe(200);
      expect(r.tipo).toContain('image/png');
      expect(r.bytes.equals(PNG_1X1)).toBe(true);
      expect(r.cacheControl).toContain('max-age');

      const inactiva = await crearMarca('logoinact');
      await admin('PATCH', `/marcas/${inactiva}/estado`, { estado: 'inactivo', confirmar: true });
      expect((await servidor.publicaBytes(`/marcas/${inactiva}/logotipo`)).status).toBe(404);
      expect((await servidor.publicaBytes('/marcas/999999/logotipo')).status).toBe(404);
      expect((await servidor.publicaBytes('/marcas/abc/logotipo')).status).toBe(400);
    });
  });

  describe('solo lectura', () => {
    it('la consulta pública no expone escritura', async () => {
      for (const metodo of ['POST', 'PUT', 'PATCH', 'DELETE']) {
        const r = await fetch(`${servidor.baseUrl}/api/v1/catalogo/productos`, { method: metodo });
        expect([metodo, r.status]).toEqual([metodo, 404]);
      }
    });
  });
});
