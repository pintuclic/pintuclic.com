import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ServidorPrueba } from './helpers/servidor-prueba';

/**
 * Entrega 3 · combos, complementarios, imágenes por variante/color con miniaturas y el puerto de
 * compra, contra PostgreSQL real, por HTTP. Se activa con `M01_TEST_DATABASE_URL`.
 */
const URL_BD = process.env.M01_TEST_DATABASE_URL;
const ALEATORIO = Math.random().toString(36).slice(2, 8);
const PREFIJO = `ZZ-E3-${ALEATORIO}`;
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

interface Dato {
  [clave: string]: unknown;
}
type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH';

describe.skipIf(URL_BD === undefined)('M01 · entrega 3 (HTTP + PostgreSQL)', () => {
  let servidor: ServidorPrueba;
  let prisma: (typeof import('../../../core/db/client'))['prisma'];
  let CatalogoParaCompraService: (typeof import('../services/catalogo-para-compra.service'))['CatalogoParaCompraService'];
  let CompraRepository: (typeof import('../repositories/compra.repository'))['CompraRepository'];
  const auditoria = { registrarAccesoDenegado: vi.fn() };
  let contador = 0;

  const admin = (m: Metodo, ruta: string, cuerpo?: unknown) => servidor.peticion('admin', m, ruta, cuerpo);
  const lector = (m: Metodo, ruta: string, cuerpo?: unknown) => servidor.peticion('lector', m, ruta, cuerpo);
  const dato = (r: { cuerpo: { data?: unknown } }): Dato => r.cuerpo.data as Dato;
  const lista = (r: { cuerpo: { data?: unknown } }): Dato[] => r.cuerpo.data as Dato[];
  const nombre = (base: string): string => `${PREFIJO}-${base}-${++contador}`;
  const codigo = (): string => `E3${ALEATORIO}${++contador}`.toUpperCase();

  const fx = {
    marca: 0,
    marcaInactiva: 0,
    categoria: 0,
    categoriaComp: 0,
    categoriaCompInactiva: 0,
    subcategoria: 0,
    subcategoriaInactiva: 0,
    acabado: 0,
    medidaUnidad: 0,
    medidaGalon: 0,
  };
  const medidasCreadas: number[] = [];

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
    ({ CatalogoParaCompraService } = await import('../services/catalogo-para-compra.service.js'));
    ({ CompraRepository } = await import('../repositories/compra.repository.js'));
    servidor = await levantarServidor(auditoria);

    fx.marca = await crearMarca('marca');
    fx.marcaInactiva = await crearMarca('inactiva');
    await admin('PATCH', `/marcas/${fx.marcaInactiva}/estado`, { estado: 'inactivo', confirmar: true });
    fx.categoria = await crearId('/categorias', { nombre: `${PREFIJO}-cat` }, 'idCategoria');
    fx.categoriaComp = await crearId('/categorias', { nombre: `${PREFIJO}-comp` }, 'idCategoria');
    fx.categoriaCompInactiva = await crearId('/categorias', { nombre: `${PREFIJO}-compoff` }, 'idCategoria');
    await admin('PATCH', `/categorias/${fx.categoriaCompInactiva}/estado`, { estado: 'inactivo', confirmar: true });
    fx.subcategoria = await crearId(
      `/categorias/${fx.categoria}/subcategorias`,
      { nombre: `${PREFIJO}-sub` },
      'idSubcategoria',
    );
    fx.subcategoriaInactiva = await crearId(
      `/categorias/${fx.categoria}/subcategorias`,
      { nombre: `${PREFIJO}-subbaja` },
      'idSubcategoria',
    );
    await admin('PATCH', `/subcategorias/${fx.subcategoriaInactiva}/estado`, { estado: 'inactivo', confirmar: true });
    fx.acabado = await crearId('/acabados', { nombre: `${PREFIJO}-mate` }, 'idAcabado');

    // K2: la medida de un combo es de tipo "Unidad" (del seed); la de un producto común, de volumen.
    const unidad = await prisma.tipoMedida.findFirstOrThrow({ where: { nombre: 'Unidad' } });
    fx.medidaUnidad = await crearId(
      '/medidas',
      { idTipoMedida: unidad.idTipoMedida, valor: 7000 + Math.floor(Math.random() * 900) },
      'idMedida',
    );
    const volumen = await crearId(
      '/tipos-medida',
      { nombre: `${PREFIJO}-vol`, abreviatura: `v${ALEATORIO.slice(0, 4)}`, equivalenciaGalones: 1 },
      'idTipoMedida',
    );
    fx.medidaGalon = await crearId('/medidas', { idTipoMedida: volumen, valor: 1 }, 'idMedida');
    medidasCreadas.push(fx.medidaUnidad, fx.medidaGalon);
  });

  afterAll(async () => {
    const marcas = await prisma.marca.findMany({
      where: { nombre: { startsWith: PREFIJO } },
      select: { idMarca: true },
    });
    const idsMarca = marcas.map((m) => m.idMarca);
    await prisma.imagen.deleteMany({ where: { producto: { idMarca: { in: idsMarca } } } });
    await prisma.variante.deleteMany({ where: { producto: { idMarca: { in: idsMarca } } } });
    await prisma.producto.deleteMany({ where: { idMarca: { in: idsMarca } } });
    await prisma.color.deleteMany({ where: { idMarca: { in: idsMarca } } });
    await prisma.marca.deleteMany({ where: { idMarca: { in: idsMarca } } });
    await prisma.medida.deleteMany({ where: { idMedida: { in: medidasCreadas } } });
    await prisma.tipoMedida.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.subcategoria.deleteMany({ where: { categoria: { nombre: { startsWith: PREFIJO } } } });
    await prisma.categoria.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.acabado.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await servidor.cerrar();
    await prisma.$disconnect();
  });

  /* ─── Utilidades de datos ─── */

  const subirImagen = async (idProducto: number, extra: Dato = {}): Promise<Dato> => {
    const r = await admin('POST', `/productos/${idProducto}/imagenes`, {
      imagenBase64: PNG_1X1.toString('base64'),
      imagenMimeType: 'image/png',
      ...extra,
    });
    expect(r.status, JSON.stringify(r.cuerpo)).toBe(201);
    return dato(r);
  };

  async function crearCombo(extra: Dato = {}): Promise<Dato> {
    const r = await admin('POST', '/combos', {
      idMarca: fx.marca,
      idSubcategoria: fx.subcategoria,
      nombre: nombre('combo'),
      idMedida: fx.medidaUnidad,
      precio: 59900,
      ...extra,
    });
    expect(r.status, JSON.stringify(r.cuerpo)).toBe(201);
    return dato(r);
  }

  const fijarExistencia = (idVariante: number, existenciaReferencial: number) =>
    prisma.variante.update({ where: { idVariante }, data: { existenciaReferencial } });

  /** Un producto común, publicado, con una variante activa y una imagen (visible en la vitrina). */
  async function productoVisible(
    extra: { idCategoriaComplementaria?: number; idSubcategoria?: number } = {},
  ): Promise<{ idProducto: number; idVariante: number }> {
    const idProducto = await crearId(
      '/productos',
      {
        idMarca: fx.marca,
        idSubcategoria: extra.idSubcategoria ?? fx.subcategoria,
        nombre: nombre('prod'),
        ...(extra.idCategoriaComplementaria !== undefined
          ? { idCategoriaComplementaria: extra.idCategoriaComplementaria }
          : {}),
      },
      'idProducto',
    );
    const v = await admin('POST', `/productos/${idProducto}/variantes`, { idMedida: fx.medidaGalon, precio: 1000 });
    expect(v.status, JSON.stringify(v.cuerpo)).toBe(201);
    await fijarExistencia(dato(v).idVariante as number, 5);
    await subirImagen(idProducto);
    const p = await admin('PATCH', `/productos/${idProducto}/publicacion`, { publicado: true });
    expect(p.status, JSON.stringify(p.cuerpo)).toBe(200);
    return { idProducto, idVariante: dato(v).idVariante as number };
  }

  /** Un combo publicado (con imagen), con la existencia indicada. */
  async function comboVisible(existencia: number, extra: Dato = {}): Promise<Dato> {
    const combo = await crearCombo(extra);
    await subirImagen(combo.idProducto as number);
    await fijarExistencia(combo.idVariante as number, existencia);
    const p = await admin('PATCH', `/productos/${String(combo.idProducto)}/publicacion`, { publicado: true });
    expect(p.status, JSON.stringify(p.cuerpo)).toBe(200);
    return combo;
  }

  const ficha = (id: number) => servidor.publica(`/productos/${id}`);
  const complementarios = (id: number) => servidor.publica(`/productos/${id}/complementarios`);

  /* ─── Combos ─── */

  describe('combos (K1–K10)', () => {
    it('crea el producto y su única variante: sin existencia, sku generado, sin publicar (K1, K2, K7)', async () => {
      const combo = await crearCombo({ descripcion: 'Tres brochas' });
      expect(combo).toMatchObject({
        idMarca: fx.marca,
        idSubcategoria: fx.subcategoria,
        medida: expect.any(String),
        precio: 59900,
        existenciaReferencial: 0,
        disponibilidad: 'agotado',
        excluidoDeDescuentos: false,
        estado: 'activo',
        publicado: false,
        cantidadImagenes: 0,
        descripcion: 'Tres brochas',
      });
      expect(combo.sku).toBe(`P${String(combo.idProducto)}-V${String(combo.idVariante)}`);
      const detalle = dato(await admin('GET', `/productos/${String(combo.idProducto)}`));
      expect(detalle).toMatchObject({ esCombo: true, excluidoDeDescuentos: false, claseColor: 'sin_color' });
      expect(detalle.variantes as Dato[]).toHaveLength(1);
      expect(detalle.ficha).toBeNull();
    });

    it('acepta SKU propio, exclusión de descuentos y categoría complementaria (K4); ya no tiene interruptor de patrocinio', async () => {
      const sku = codigo();
      const combo = await crearCombo({
        sku,
        excluidoDeDescuentos: true,
        // Un cliente viejo que aún lo envíe no lo guarda ni lo recibe de vuelta: el patrocinio es de M14.
        patrocinado: true,
        idCategoriaComplementaria: fx.categoriaComp,
      });
      expect(combo).toMatchObject({
        sku,
        excluidoDeDescuentos: true,
        idCategoriaComplementaria: fx.categoriaComp,
      });
      expect(combo).not.toHaveProperty('patrocinado');
    });

    it.each([
      ['medida que no es de tipo Unidad', () => ({ idMedida: fx.medidaGalon }), 409, 'RELACION_INVALIDA', 'idMedida'],
      ['medida inexistente', () => ({ idMedida: 2147483000 }), 409, 'RELACION_INVALIDA', 'idMedida'],
      ['marca inexistente', () => ({ idMarca: 2147483000 }), 409, 'RELACION_INVALIDA', 'idMarca'],
      ['marca inactiva', () => ({ idMarca: fx.marcaInactiva }), 409, 'PADRE_INACTIVO', undefined],
      ['subcategoría inactiva', () => ({ idSubcategoria: fx.subcategoriaInactiva }), 409, 'PADRE_INACTIVO', undefined],
      ['subcategoría inexistente', () => ({ idSubcategoria: 2147483000 }), 409, 'RELACION_INVALIDA', 'idSubcategoria'],
      [
        'categoría complementaria inactiva',
        () => ({ idCategoriaComplementaria: fx.categoriaCompInactiva }),
        409,
        'RELACION_INVALIDA',
        'idCategoriaComplementaria',
      ],
    ])('rechaza %s', async (_n, extra, status, code, campo) => {
      const r = await admin('POST', '/combos', {
        idMarca: fx.marca,
        idSubcategoria: fx.subcategoria,
        nombre: nombre('malo'),
        idMedida: fx.medidaUnidad,
        precio: 10,
        ...extra(),
      });
      expect([r.status, r.cuerpo.error?.code]).toEqual([status, code]);
      if (campo !== undefined) expect(r.cuerpo.error?.details).toEqual({ campo });
    });

    it.each([
      ['precio negativo', { precio: -1 }],
      ['precio con tres decimales', { precio: 1.234 }],
      ['nombre vacío', { nombre: '   ' }],
      ['sin medida', { idMedida: undefined }],
      ['SKU con caracteres inválidos', { sku: 'a b!' }],
    ])('rechaza con 400 %s y no crea nada', async (_n, extra) => {
      const antes = await prisma.producto.count({ where: { esCombo: true, idMarca: fx.marca } });
      const r = await admin('POST', '/combos', {
        idMarca: fx.marca,
        idSubcategoria: fx.subcategoria,
        nombre: nombre('v'),
        idMedida: fx.medidaUnidad,
        precio: 10,
        ...extra,
      });
      expect([r.status, r.cuerpo.error?.code]).toEqual([400, 'PARAMETRO_INVALIDO']);
      expect(await prisma.producto.count({ where: { esCombo: true, idMarca: fx.marca } })).toBe(antes);
    });

    it('impide repetir el nombre en la marca y el SKU, sin dejar un producto a medias', async () => {
      const a = await crearCombo({ sku: codigo() });
      const mismoNombre = await admin('POST', '/combos', {
        idMarca: fx.marca,
        idSubcategoria: fx.subcategoria,
        nombre: String(a.nombre).toUpperCase(),
        idMedida: fx.medidaUnidad,
        precio: 1,
      });
      expect([mismoNombre.status, mismoNombre.cuerpo.error?.details]).toEqual([409, { campo: 'nombre' }]);
      const nombreNuevo = nombre('dup');
      const mismoSku = await admin('POST', '/combos', {
        idMarca: fx.marca,
        idSubcategoria: fx.subcategoria,
        nombre: nombreNuevo,
        idMedida: fx.medidaUnidad,
        precio: 1,
        sku: String(a.sku).toLowerCase(),
      });
      expect([mismoSku.status, mismoSku.cuerpo.error?.details]).toEqual([409, { campo: 'sku' }]);
      expect(await prisma.producto.count({ where: { nombre: nombreNuevo } })).toBe(0);
    });

    it('la creación es todo o nada: si falla la variante no queda el producto', async () => {
      const nombreNuevo = nombre('atomico');
      // El SKU provisional choca solo en una carrera; se fuerza creando antes una variante con ese SKU exacto.
      const combo = await crearCombo({ sku: codigo() });
      const r = await admin('POST', '/combos', {
        idMarca: fx.marca,
        idSubcategoria: fx.subcategoria,
        nombre: nombreNuevo,
        idMedida: fx.medidaUnidad,
        precio: 1,
        sku: String(combo.sku),
      });
      expect(r.status).toBe(409);
      expect(await prisma.producto.count({ where: { nombre: nombreNuevo } })).toBe(0);
    });

    it('lista con filtros de estado, existencia y búsqueda, y pagina', async () => {
      const etiqueta = nombre('lst');
      const con = await crearCombo({ nombre: `${etiqueta}-con` });
      const sin = await crearCombo({ nombre: `${etiqueta}-sin`, sku: codigo() });
      await fijarExistencia(con.idVariante as number, 4);
      await admin('PATCH', `/productos/${String(sin.idProducto)}/estado`, { estado: 'inactivo', confirmar: true });

      const todos = await admin('GET', `/combos?busqueda=${encodeURIComponent(etiqueta)}&limite=100`);
      expect(lista(todos).map((c) => c.nombre)).toEqual([`${etiqueta}-con`, `${etiqueta}-sin`]);
      const porSku = await admin('GET', `/combos?busqueda=${String(sin.sku)}`);
      expect(lista(porSku).map((c) => c.idProducto)).toEqual([sin.idProducto]);
      const disponibles = await admin(
        'GET',
        `/combos?busqueda=${encodeURIComponent(etiqueta)}&disponibilidad=disponible`,
      );
      expect(lista(disponibles).map((c) => c.idProducto)).toEqual([con.idProducto]);
      const inactivos = await admin('GET', `/combos?busqueda=${encodeURIComponent(etiqueta)}&estado=inactivo`);
      expect(lista(inactivos).map((c) => c.idProducto)).toEqual([sin.idProducto]);
      const pagina = await admin('GET', `/combos?busqueda=${encodeURIComponent(etiqueta)}&limite=1&pagina=2`);
      expect(lista(pagina).map((c) => c.idProducto)).toEqual([sin.idProducto]);
      expect(pagina.cuerpo.pagination).toMatchObject({ pagina: 2, limite: 1, total: 2, totalPaginas: 2 });
      expect((await admin('GET', '/combos?limite=101')).status).toBe(400);
    });

    it('GET /productos separa combos y productos con el filtro esCombo', async () => {
      const combo = await crearCombo();
      const comun = await productoVisible();
      const soloCombos = lista(await admin('GET', `/productos?esCombo=true&limite=100&idMarca=${fx.marca}`));
      expect(soloCombos.map((p) => p.idProducto)).toContain(combo.idProducto);
      expect(soloCombos.map((p) => p.idProducto)).not.toContain(comun.idProducto);
      const sinCombos = lista(await admin('GET', `/productos?esCombo=false&limite=100&idMarca=${fx.marca}`));
      expect(sinCombos.map((p) => p.idProducto)).toContain(comun.idProducto);
      expect(sinCombos.map((p) => p.idProducto)).not.toContain(combo.idProducto);
      expect(soloCombos.find((p) => p.idProducto === combo.idProducto)).toMatchObject({ esCombo: true });
    });

    it('obtiene un combo y responde 404 si el producto no lo es o no existe', async () => {
      const combo = await crearCombo();
      expect(dato(await admin('GET', `/combos/${String(combo.idProducto)}`))).toMatchObject({
        idVariante: combo.idVariante,
      });
      const comun = await productoVisible();
      expect((await admin('GET', `/combos/${comun.idProducto}`)).cuerpo.error?.code).toBe('RECURSO_NO_DISPONIBLE');
      expect((await admin('GET', '/combos/2147483000')).status).toBe(404);
      expect((await admin('GET', '/combos/abc')).status).toBe(400);
    });

    it('edita precio, SKU, nombre y banderas; la marca y la medida no cambian', async () => {
      const combo = await crearCombo();
      const sku = codigo();
      const r = await admin('PUT', `/combos/${String(combo.idProducto)}`, {
        precio: 49900.5,
        sku,
        nombre: nombre('editado'),
        excluidoDeDescuentos: true,
        descripcion: null,
        idMarca: fx.marcaInactiva,
        idMedida: fx.medidaGalon,
      });
      expect(r.status, JSON.stringify(r.cuerpo)).toBe(200);
      expect(dato(r)).toMatchObject({
        precio: 49900.5,
        sku,
        excluidoDeDescuentos: true,
        descripcion: null,
        idMarca: fx.marca,
        idMedida: fx.medidaUnidad,
      });
      expect((await admin('PUT', `/combos/${String(combo.idProducto)}`, {})).status).toBe(400);
    });

    it('al editar valida duplicados, subcategoría y categoría complementaria', async () => {
      const a = await crearCombo({ sku: codigo() });
      const b = await crearCombo({ sku: codigo() });
      const id = String(b.idProducto);
      expect((await admin('PUT', `/combos/${id}`, { nombre: a.nombre })).cuerpo.error?.details).toEqual({
        campo: 'nombre',
      });
      expect((await admin('PUT', `/combos/${id}`, { sku: a.sku })).cuerpo.error?.details).toEqual({ campo: 'sku' });
      expect(
        (await admin('PUT', `/combos/${id}`, { idSubcategoria: fx.subcategoriaInactiva })).cuerpo.error?.code,
      ).toBe('PADRE_INACTIVO');
      expect(
        (await admin('PUT', `/combos/${id}`, { idCategoriaComplementaria: fx.categoriaCompInactiva })).cuerpo.error
          ?.code,
      ).toBe('RELACION_INVALIDA');
      expect(dato(await admin('PUT', `/combos/${id}`, { idCategoriaComplementaria: fx.categoriaComp }))).toMatchObject({
        idCategoriaComplementaria: fx.categoriaComp,
      });
      expect(dato(await admin('PUT', `/combos/${id}`, { idCategoriaComplementaria: null }))).toMatchObject({
        idCategoriaComplementaria: null,
      });
    });

    it('K9: un combo no se edita como producto ni como variante; los productos comunes siguen igual', async () => {
      const combo = await crearCombo();
      const idProducto = String(combo.idProducto);
      const comoProducto = await admin('PUT', `/productos/${idProducto}`, { nombre: nombre('x') });
      expect([comoProducto.status, comoProducto.cuerpo.error?.code, comoProducto.cuerpo.error?.details]).toEqual([
        409,
        'RELACION_INVALIDA',
        { campo: 'idProducto' },
      ]);
      const nuevaVariante = await admin('POST', `/productos/${idProducto}/variantes`, {
        idMedida: fx.medidaGalon,
        precio: 5,
      });
      expect([nuevaVariante.status, nuevaVariante.cuerpo.error?.code]).toEqual([409, 'RELACION_INVALIDA']);
      const comoVariante = await admin('PUT', `/variantes/${String(combo.idVariante)}`, { precio: 5 });
      expect([comoVariante.status, comoVariante.cuerpo.error?.code]).toEqual([409, 'RELACION_INVALIDA']);

      const comun = await productoVisible();
      expect((await admin('PUT', `/productos/${comun.idProducto}`, { descripcion: 'ok' })).status).toBe(200);
      expect((await admin('PUT', `/variantes/${comun.idVariante}`, { precio: 2000 })).status).toBe(200);
    });

    it('estado, publicación e imágenes de un combo usan las rutas de producto; publicar exige imagen', async () => {
      const combo = await crearCombo();
      const id = String(combo.idProducto);
      const sinImagen = await admin('PATCH', `/productos/${id}/publicacion`, { publicado: true });
      expect([sinImagen.status, sinImagen.cuerpo.error?.code]).toEqual([409, 'NO_PUBLICABLE']);
      await subirImagen(combo.idProducto as number);
      expect((await admin('PATCH', `/productos/${id}/publicacion`, { publicado: true })).status).toBe(200);
      expect(dato(await admin('GET', `/combos/${id}`))).toMatchObject({ publicado: true, cantidadImagenes: 1 });
    });

    it('permisos: quien solo ve (catalogo.ver) lista pero no crea ni edita; sin sesión, 404', async () => {
      const combo = await crearCombo();
      expect((await lector('GET', '/combos')).status).toBe(200);
      expect((await lector('GET', `/combos/${String(combo.idProducto)}`)).status).toBe(200);
      const cuerpo = {
        idMarca: fx.marca,
        idSubcategoria: fx.subcategoria,
        nombre: nombre('l'),
        idMedida: fx.medidaUnidad,
        precio: 1,
      };
      expect((await lector('POST', '/combos', cuerpo)).cuerpo.error?.code).toBe('RECURSO_NO_DISPONIBLE');
      expect((await lector('PUT', `/combos/${String(combo.idProducto)}`, { precio: 1 })).status).toBe(404);
      expect((await servidor.peticion(null, 'GET', '/combos')).status).toBe(404);
      expect((await servidor.peticion('cliente', 'POST', '/combos', cuerpo)).status).toBe(404);
    });
  });

  /* ─── Vitrina: combos agotados (K5, K8) ─── */

  describe('vitrina y combos (K5)', () => {
    it('un combo sin existencia se ve agotado y con compra bloqueada; con existencia se puede comprar', async () => {
      const combo = await comboVisible(0);
      const id = combo.idProducto as number;
      const sin = dato(await ficha(id));
      expect(sin).toMatchObject({ esCombo: true, compraBloqueada: true });
      expect((sin.variantes as Dato[])[0]).toMatchObject({ disponibilidad: 'agotado', compraBloqueada: true });
      const tarjeta = lista(
        await servidor.publica(`/productos?busqueda=${encodeURIComponent(String(combo.nombre))}`),
      )[0];
      expect(tarjeta).toMatchObject({ esCombo: true, disponibilidad: 'agotado', compraBloqueada: true });

      await fijarExistencia(combo.idVariante as number, 2);
      expect(dato(await ficha(id))).toMatchObject({ esCombo: true, compraBloqueada: false });
      expect(
        lista(await servidor.publica(`/productos?busqueda=${encodeURIComponent(String(combo.nombre))}`))[0],
      ).toMatchObject({ disponibilidad: 'disponible', compraBloqueada: false });
    });

    it('la vitrina nunca expone la existencia exacta (U7)', async () => {
      const combo = await comboVisible(3);
      const texto = JSON.stringify(dato(await ficha(combo.idProducto as number)));
      expect(texto).not.toContain('existencia');
      expect(texto).not.toContain('topeUnidades');
    });

    it('un producto común agotado sigue siendo comprable: la compra solo se bloquea en combos', async () => {
      const comun = await productoVisible();
      await fijarExistencia(comun.idVariante, 0);
      expect(dato(await ficha(comun.idProducto))).toMatchObject({ esCombo: false, compraBloqueada: false });
    });
  });

  /* ─── Complementarios (X1–X5) ─── */

  describe('productos complementarios (HU-CAT-08)', () => {
    /** Una categoría propia con `cantidad` productos visibles. */
    async function categoriaConProductos(cantidad: number): Promise<{ idCategoria: number; ids: number[] }> {
      const idCategoria = await crearId('/categorias', { nombre: nombre('catc') }, 'idCategoria');
      const idSubcategoria = await crearId(
        `/categorias/${idCategoria}/subcategorias`,
        { nombre: nombre('subc') },
        'idSubcategoria',
      );
      const ids: number[] = [];
      for (let i = 0; i < cantidad; i += 1) {
        ids.push((await productoVisible({ idSubcategoria })).idProducto);
      }
      return { idCategoria, ids };
    }

    it('con categoría complementaria sugiere hasta 4 productos de esa categoría, sin el propio (X1, X2, X4)', async () => {
      const comp = await categoriaConProductos(6);
      const origen = await productoVisible({ idCategoriaComplementaria: comp.idCategoria });
      const r = await complementarios(origen.idProducto);
      expect(r.status).toBe(200);
      const ids = lista(r).map((t) => t.idProducto as number);
      expect(ids).toHaveLength(4);
      expect(new Set(ids).size).toBe(4);
      expect(ids.every((id) => comp.ids.includes(id))).toBe(true);
      expect(ids).not.toContain(origen.idProducto);
      expect(lista(r)[0]).toMatchObject({
        categoria: expect.any(String),
        precioDesde: 1000,
        esCombo: false,
        compraBloqueada: false,
        idImagenPrincipal: expect.any(Number),
      });
    });

    it('es al azar: con varias consultas no siempre devuelve el mismo orden o los mismos productos', async () => {
      const comp = await categoriaConProductos(9);
      const origen = await productoVisible({ idCategoriaComplementaria: comp.idCategoria });
      const vistos = new Set<string>();
      for (let i = 0; i < 12; i += 1) {
        vistos.add(
          lista(await complementarios(origen.idProducto))
            .map((t) => t.idProducto)
            .join(','),
        );
      }
      expect(vistos.size).toBeGreaterThan(1);
    });

    it('sin campañas de patrocinio, el orden es al azar y ninguna tarjeta trae la marca «patrocinado» (X2)', async () => {
      // El orden de los patrocinados por campaña (prioridad, vigencia, ubicación) se prueba con M14 (A7).
      const comp = await categoriaConProductos(6);
      const origen = await productoVisible({ idCategoriaComplementaria: comp.idCategoria });
      const tarjetas = lista(await complementarios(origen.idProducto));
      expect(tarjetas).toHaveLength(4);
      for (const t of tarjetas) expect([t.patrocinado, t.idCampania]).toEqual([false, null]);
    });

    it('sin categoría complementaria solo salen productos de campañas: nunca el propio ni uno sin campaña (X3)', async () => {
      const sinNada = await productoVisible();
      const otroSinCampania = await productoVisible();
      const tarjetas = lista(await complementarios(sinNada.idProducto));
      expect(tarjetas.length).toBeLessThanOrEqual(4);
      // La base compartida puede tener campañas de otras pruebas: lo que salga viene de una campaña, no de un interruptor.
      for (const t of tarjetas) {
        expect(t.patrocinado).toBe(true);
        expect(t.idCampania).toEqual(expect.any(Number));
        expect(t.idProducto).not.toBe(sinNada.idProducto);
        expect(t.idProducto).not.toBe(otroSinCampania.idProducto);
      }
    });

    it('la subcategoría aporta la categoría complementaria por defecto (D6) y la del producto manda', async () => {
      const compSub = await categoriaConProductos(4);
      const compProd = await categoriaConProductos(4);
      const sub = await crearId(
        `/categorias/${fx.categoria}/subcategorias`,
        { nombre: nombre('conc'), idCategoriaComplementaria: compSub.idCategoria },
        'idSubcategoria',
      );
      const heredado = await productoVisible({ idSubcategoria: sub });
      const idsHeredado = lista(await complementarios(heredado.idProducto)).map((t) => t.idProducto as number);
      expect(idsHeredado.sort()).toEqual([...compSub.ids].sort());
      const propio = await productoVisible({ idSubcategoria: sub, idCategoriaComplementaria: compProd.idCategoria });
      const idsPropio = lista(await complementarios(propio.idProducto)).map((t) => t.idProducto as number);
      expect(idsPropio.sort()).toEqual([...compProd.ids].sort());
    });

    it('excluye productos inactivos, sin variantes activas, no publicados y combos agotados (X4)', async () => {
      const comp = await categoriaConProductos(3);
      const [bueno, inactivo, sinVariante] = comp.ids as [number, number, number];
      await admin('PATCH', `/productos/${inactivo}/estado`, { estado: 'inactivo', confirmar: true });
      const v = await prisma.variante.findFirstOrThrow({ where: { idProducto: sinVariante } });
      await prisma.variante.update({ where: { idVariante: v.idVariante }, data: { estado: 'inactivo' } });
      const subcategoria = await prisma.producto.findUniqueOrThrow({ where: { idProducto: bueno } });
      const noPublicado = await crearId(
        '/productos',
        { idMarca: fx.marca, idSubcategoria: subcategoria.idSubcategoria, nombre: nombre('np') },
        'idProducto',
      );
      const comboAgotado = await comboVisible(0, { idSubcategoria: subcategoria.idSubcategoria });
      const comboConStock = await comboVisible(2, { idSubcategoria: subcategoria.idSubcategoria });
      const origen = await productoVisible({ idCategoriaComplementaria: comp.idCategoria });
      const ids = lista(await complementarios(origen.idProducto)).map((t) => t.idProducto as number);
      expect(ids).toContain(bueno);
      expect(ids).toContain(comboConStock.idProducto);
      expect(ids).not.toContain(inactivo);
      expect(ids).not.toContain(sinVariante);
      expect(ids).not.toContain(noPublicado);
      expect(ids).not.toContain(comboAgotado.idProducto);
    });

    it('un producto que no es visible responde 404 y un id inválido, 400 (U1)', async () => {
      const comun = await crearId(
        '/productos',
        { idMarca: fx.marca, idSubcategoria: fx.subcategoria, nombre: nombre('oculto') },
        'idProducto',
      );
      expect((await complementarios(comun)).status).toBe(404);
      expect((await complementarios(2147483000)).cuerpo.error?.code).toBe('RECURSO_NO_DISPONIBLE');
      expect((await complementarios(0)).status).toBe(400);
    });

    it('no requiere sesión y responde con envelope de lista', async () => {
      const comp = await categoriaConProductos(2);
      const origen = await productoVisible({ idCategoriaComplementaria: comp.idCategoria });
      const r = await servidor.publica(`/productos/${origen.idProducto}/complementarios`);
      expect(r.cuerpo.success).toBe(true);
      expect(Array.isArray(r.cuerpo.data)).toBe(true);
    });

    it('subcategoría: la categoría complementaria se valida, se guarda y se puede quitar (D6)', async () => {
      const sub = await crearId(
        `/categorias/${fx.categoria}/subcategorias`,
        { nombre: nombre('cfg') },
        'idSubcategoria',
      );
      const conComp = await admin('PUT', `/subcategorias/${sub}`, { idCategoriaComplementaria: fx.categoriaComp });
      expect(dato(conComp)).toMatchObject({ idCategoriaComplementaria: fx.categoriaComp });
      const arbol = lista(await admin('GET', '/categorias')).find((c) => c.idCategoria === fx.categoria);
      expect((arbol?.subcategorias as Dato[]).find((s) => s.idSubcategoria === sub)).toMatchObject({
        idCategoriaComplementaria: fx.categoriaComp,
      });
      const inactiva = await admin('PUT', `/subcategorias/${sub}`, {
        idCategoriaComplementaria: fx.categoriaCompInactiva,
      });
      expect([inactiva.status, inactiva.cuerpo.error?.details]).toEqual([409, { campo: 'idCategoriaComplementaria' }]);
      const inexistente = await admin('PUT', `/subcategorias/${sub}`, { idCategoriaComplementaria: 2147483000 });
      expect(inexistente.cuerpo.error?.code).toBe('RELACION_INVALIDA');
      expect(dato(await admin('PUT', `/subcategorias/${sub}`, { idCategoriaComplementaria: null }))).toMatchObject({
        idCategoriaComplementaria: null,
      });
      expect((await admin('PUT', `/subcategorias/${sub}`, { nombre: nombre('sinref') })).status).toBe(200);
    });
  });

  /* ─── Imágenes por variante o color y miniaturas (I5–I7) ─── */

  describe('imágenes asociadas y miniaturas (I5–I7)', () => {
    const grande = (ancho: number, alto: number) =>
      sharp({ create: { width: ancho, height: alto, channels: 3, background: '#cc3344' } })
        .png()
        .toBuffer();
    const bytesAdmin = (ruta: string) =>
      fetch(`${servidor.baseUrl}/api/v1/admin/catalogo${ruta}`, { headers: { 'x-actor': 'admin' } });
    const bytesPublicos = (ruta: string) => fetch(`${servidor.baseUrl}/api/v1/catalogo${ruta}`);

    async function colorDeFabrica(idProducto: number): Promise<number> {
      const color = await prisma.color.create({
        data: { idMarca: fx.marca, nombre: nombre('col'), hexadecimal: '#AA2233', idAcabado: fx.acabado },
      });
      await prisma.productoColor.create({ data: { idProducto, idColor: color.idColor } });
      return color.idColor;
    }

    it('sube una imagen asociada a una variante y la devuelve así en la galería y en la ficha pública (I5, I6)', async () => {
      const p = await productoVisible();
      const img = await subirImagen(p.idProducto, { idVariante: p.idVariante });
      expect(img).toMatchObject({ idVariante: p.idVariante, idColor: null });
      const galeria = lista(await admin('GET', `/productos/${p.idProducto}/imagenes`));
      expect(galeria.find((i) => i.idImagen === img.idImagen)).toMatchObject({ idVariante: p.idVariante });
      const publica = (dato(await ficha(p.idProducto)).imagenes as Dato[]).find((i) => i.idImagen === img.idImagen);
      expect(publica).toEqual({ idImagen: img.idImagen, idVariante: p.idVariante, idColor: null });
    });

    it('sube una imagen asociada a un color de fábrica del producto', async () => {
      const p = await productoVisible();
      const idColor = await colorDeFabrica(p.idProducto);
      const img = await subirImagen(p.idProducto, { idColor });
      expect(img).toMatchObject({ idColor, idVariante: null });
    });

    it.each([
      ['una variante de otro producto', 'variante-ajena', 'idVariante'],
      ['un color que el producto no ofrece', 'color-ajeno', 'idColor'],
    ])('rechaza %s con 409 RELACION_INVALIDA', async (_n, caso, campo) => {
      const p = await productoVisible();
      const otro = await productoVisible();
      const extra =
        caso === 'variante-ajena'
          ? { idVariante: otro.idVariante }
          : { idColor: await colorDeFabrica(otro.idProducto) };
      const r = await admin('POST', `/productos/${p.idProducto}/imagenes`, {
        imagenBase64: PNG_1X1.toString('base64'),
        imagenMimeType: 'image/png',
        ...extra,
      });
      expect([r.status, r.cuerpo.error?.code, r.cuerpo.error?.details]).toEqual([409, 'RELACION_INVALIDA', { campo }]);
      expect(await prisma.imagen.count({ where: { idProducto: p.idProducto } })).toBe(1);
    });

    it('un combo no admite imágenes por color (no tiene colores) pero sí por su variante', async () => {
      const combo = await crearCombo();
      const otroColor = await prisma.color.create({
        data: { idMarca: fx.marca, nombre: nombre('colc'), hexadecimal: '#112233', idAcabado: fx.acabado },
      });
      const r = await admin('POST', `/productos/${String(combo.idProducto)}/imagenes`, {
        imagenBase64: PNG_1X1.toString('base64'),
        imagenMimeType: 'image/png',
        idColor: otroColor.idColor,
      });
      expect(r.cuerpo.error?.details).toEqual({ campo: 'idColor' });
      expect(await subirImagen(combo.idProducto as number, { idVariante: combo.idVariante })).toMatchObject({
        idVariante: combo.idVariante,
      });
    });

    it('no admite variante y color a la vez (400)', async () => {
      const p = await productoVisible();
      const idColor = await colorDeFabrica(p.idProducto);
      const r = await admin('POST', `/productos/${p.idProducto}/imagenes`, {
        imagenBase64: PNG_1X1.toString('base64'),
        imagenMimeType: 'image/png',
        idVariante: p.idVariante,
        idColor,
      });
      expect([r.status, r.cuerpo.error?.code]).toEqual([400, 'PARAMETRO_INVALIDO']);
    });

    it('PATCH /imagenes/:id/asociacion cambia, valida y puede dejar la imagen general', async () => {
      const p = await productoVisible();
      const otro = await productoVisible();
      const idColor = await colorDeFabrica(p.idProducto);
      const img = await subirImagen(p.idProducto);
      const ruta = `/imagenes/${String(img.idImagen)}/asociacion`;
      expect(dato(await admin('PATCH', ruta, { idVariante: p.idVariante, idColor: null }))).toMatchObject({
        idVariante: p.idVariante,
        idColor: null,
      });
      expect(dato(await admin('PATCH', ruta, { idVariante: null, idColor }))).toMatchObject({
        idVariante: null,
        idColor,
      });
      expect((await admin('PATCH', ruta, { idVariante: p.idVariante, idColor })).status).toBe(400);
      expect(
        (await admin('PATCH', ruta, { idVariante: otro.idVariante, idColor: null })).cuerpo.error?.details,
      ).toEqual({
        campo: 'idVariante',
      });
      expect(dato(await admin('PATCH', ruta, { idVariante: null, idColor: null }))).toMatchObject({
        idVariante: null,
        idColor: null,
      });
      expect(
        (await admin('PATCH', '/imagenes/2147483000/asociacion', { idVariante: null, idColor: null })).status,
      ).toBe(404);
      expect((await lector('PATCH', ruta, { idVariante: null, idColor: null })).status).toBe(404);
      expect((await admin('PATCH', ruta, {})).status).toBe(400);
    });

    it('al subir se guardan la miniatura (≤ 320 px) y la mediana (≤ 960 px) en WebP; el original no cambia (I7)', async () => {
      const p = await productoVisible();
      const original = await grande(1600, 1200);
      const img = await subirImagen(p.idProducto, {});
      const subida = await admin('POST', `/productos/${p.idProducto}/imagenes`, {
        imagenBase64: original.toString('base64'),
        imagenMimeType: 'image/png',
      });
      const id = dato(subida).idImagen as number;
      expect(subida.status).toBe(201);
      expect(img.idImagen).not.toBe(id);

      const fila = await prisma.imagen.findUniqueOrThrow({ where: { idImagen: id } });
      expect(fila.miniatura).not.toBeNull();
      expect(fila.mediana).not.toBeNull();

      const mini = await bytesAdmin(`/imagenes/${id}?tamano=miniatura`);
      expect([mini.status, mini.headers.get('content-type')]).toEqual([200, 'image/webp']);
      const metaMini = await sharp(Buffer.from(await mini.arrayBuffer())).metadata();
      expect([metaMini.format, metaMini.width, metaMini.height]).toEqual(['webp', 320, 240]);

      const media = await bytesAdmin(`/imagenes/${id}?tamano=mediana`);
      const metaMedia = await sharp(Buffer.from(await media.arrayBuffer())).metadata();
      expect([metaMedia.format, metaMedia.width, metaMedia.height]).toEqual(['webp', 960, 720]);

      const orig = await bytesAdmin(`/imagenes/${id}`);
      expect(Buffer.from(await orig.arrayBuffer()).equals(original)).toBe(true);
      expect(orig.headers.get('content-type')).toBe('image/png');
      expect((await bytesAdmin(`/imagenes/${id}?tamano=original`)).status).toBe(200);
      expect((await bytesAdmin(`/imagenes/${id}?tamano=gigante`)).status).toBe(400);
    });

    it('una imagen pequeña no se agranda', async () => {
      const p = await productoVisible();
      const chica = await grande(100, 60);
      const r = await admin('POST', `/productos/${p.idProducto}/imagenes`, {
        imagenBase64: chica.toString('base64'),
        imagenMimeType: 'image/png',
      });
      const mini = await bytesAdmin(`/imagenes/${String(dato(r).idImagen)}?tamano=miniatura`);
      const meta = await sharp(Buffer.from(await mini.arrayBuffer())).metadata();
      expect([meta.width, meta.height]).toEqual([100, 60]);
    });

    it('la vitrina sirve las miniaturas con caché pública y solo de productos visibles', async () => {
      const p = await productoVisible();
      const img = await subirImagen(p.idProducto);
      const r = await bytesPublicos(`/imagenes/${String(img.idImagen)}?tamano=miniatura`);
      expect([r.status, r.headers.get('content-type'), r.headers.get('cache-control')]).toEqual([
        200,
        'image/webp',
        'public, max-age=86400',
      ]);
      expect((await bytesPublicos(`/imagenes/${String(img.idImagen)}?tamano=mediana`)).status).toBe(200);
      expect((await bytesPublicos(`/imagenes/${String(img.idImagen)}?tamano=xxl`)).status).toBe(400);

      await admin('PATCH', `/productos/${p.idProducto}/publicacion`, { publicado: false });
      expect((await bytesPublicos(`/imagenes/${String(img.idImagen)}?tamano=miniatura`)).status).toBe(404);
      expect((await bytesPublicos(`/imagenes/${String(img.idImagen)}`)).status).toBe(404);
    });

    it('las imágenes anteriores a la entrega 3 generan su miniatura al pedirla y la guardan (D7)', async () => {
      const p = await productoVisible();
      const vieja = await prisma.imagen.create({
        data: {
          idProducto: p.idProducto,
          datos: new Uint8Array(await grande(800, 800)),
          mimeType: 'image/png',
          orden: 99,
        },
      });
      expect((await prisma.imagen.findUniqueOrThrow({ where: { idImagen: vieja.idImagen } })).miniatura).toBeNull();
      const r = await bytesPublicos(`/imagenes/${vieja.idImagen}?tamano=miniatura`);
      const meta = await sharp(Buffer.from(await r.arrayBuffer())).metadata();
      expect([r.status, meta.width]).toEqual([200, 320]);
      const guardada = await prisma.imagen.findUniqueOrThrow({ where: { idImagen: vieja.idImagen } });
      expect(guardada.miniatura).not.toBeNull();
      expect(guardada.mediana).toBeNull();
    });

    it('un archivo con firma de imagen pero dañado se rechaza (400 IMAGEN_INVALIDA) y no se guarda', async () => {
      const p = await productoVisible();
      const danada = Buffer.concat([PNG_1X1.subarray(0, 24), Buffer.alloc(40, 9)]);
      const r = await admin('POST', `/productos/${p.idProducto}/imagenes`, {
        imagenBase64: danada.toString('base64'),
        imagenMimeType: 'image/png',
      });
      expect([r.status, r.cuerpo.error?.code]).toEqual([400, 'IMAGEN_INVALIDA']);
      expect(await prisma.imagen.count({ where: { idProducto: p.idProducto } })).toBe(1);
    });
  });

  /* ─── Puerto CatalogoParaCompraPort (sección 6) ─── */

  describe('CatalogoParaCompraPort', () => {
    const puerto = () => new CatalogoParaCompraService(new CompraRepository());

    it('una variante vendible trae precio base y los datos que se copian a la orden (P1, P3, P5)', async () => {
      const p = await productoVisible();
      const detalle = dato(await admin('GET', `/productos/${p.idProducto}`));
      const [linea] = await puerto().consultarLineas([{ idVariante: p.idVariante }]);
      expect(linea).toMatchObject({
        idVariante: p.idVariante,
        idColor: null,
        idProducto: p.idProducto,
        vendible: true,
        motivoNoVendible: null,
        esCombo: false,
        topeUnidades: null,
        precioBase: 1000,
        excluidoDeDescuentos: false,
        disponibilidad: 'disponible',
        nombreProducto: detalle.nombre,
        marca: `${PREFIJO}-marca`,
        sku: (detalle.variantes as Dato[])[0]?.sku,
        color: null,
        idImagenPrincipal: expect.any(Number),
      });
      expect(linea?.medida).toEqual(expect.any(String));
    });

    it('responde en el mismo orden y marca la variante que no existe sin lanzar error', async () => {
      const a = await productoVisible();
      const b = await productoVisible();
      const r = await puerto().consultarLineas([
        { idVariante: b.idVariante },
        { idVariante: 2147483000 },
        { idVariante: a.idVariante },
        { idVariante: b.idVariante, idColor: null },
      ]);
      expect(r.map((l) => l.idVariante)).toEqual([b.idVariante, 2147483000, a.idVariante, b.idVariante]);
      expect(r[1]).toMatchObject({
        vendible: false,
        motivoNoVendible: 'variante_no_existe',
        idProducto: null,
        precioBase: null,
        nombreProducto: null,
      });
      expect(await puerto().consultarLineas([])).toEqual([]);
    });

    it('explica por qué no se puede vender: variante inactiva, producto no publicado o inactivo (P1)', async () => {
      const inactiva = await productoVisible();
      await prisma.variante.update({ where: { idVariante: inactiva.idVariante }, data: { estado: 'inactivo' } });
      const noPublicado = await productoVisible();
      await admin('PATCH', `/productos/${noPublicado.idProducto}/publicacion`, { publicado: false });
      const productoInactivo = await productoVisible();
      await prisma.producto.update({
        where: { idProducto: productoInactivo.idProducto },
        data: { estado: 'inactivo' },
      });
      const r = await puerto().consultarLineas([
        { idVariante: inactiva.idVariante },
        { idVariante: noPublicado.idVariante },
        { idVariante: productoInactivo.idVariante },
      ]);
      expect(r.map((l) => [l.vendible, l.motivoNoVendible])).toEqual([
        [false, 'variante_inactiva'],
        [false, 'producto_no_disponible'],
        [false, 'producto_no_disponible'],
      ]);
      // Aun así devuelve los datos para mostrar una línea retirada.
      expect(r[1]).toMatchObject({ precioBase: 1000, nombreProducto: expect.any(String) });
    });

    it('una cadena inactiva (marca) también deja de ser vendible', async () => {
      const p = await productoVisible();
      await prisma.marca.update({ where: { idMarca: fx.marca }, data: { estado: 'inactivo' } });
      try {
        const [l] = await puerto().consultarLineas([{ idVariante: p.idVariante }]);
        expect([l?.vendible, l?.motivoNoVendible]).toEqual([false, 'producto_no_disponible']);
      } finally {
        await prisma.marca.update({ where: { idMarca: fx.marca }, data: { estado: 'activo' } });
      }
    });

    it('valida el color: uno de fábrica del producto sí; uno ajeno, inexistente o sobre un producto sin color, no (P2)', async () => {
      const p = await productoVisible();
      const otro = await productoVisible();
      const propio = await prisma.color.create({
        data: { idMarca: fx.marca, nombre: nombre('cp'), codigo: '123', hexadecimal: '#0A0B0C', idAcabado: fx.acabado },
      });
      await prisma.productoColor.create({ data: { idProducto: p.idProducto, idColor: propio.idColor } });
      const ajeno = await prisma.color.create({
        data: { idMarca: fx.marca, nombre: nombre('ca'), hexadecimal: '#0D0E0F', idAcabado: fx.acabado },
      });
      await prisma.productoColor.create({ data: { idProducto: otro.idProducto, idColor: ajeno.idColor } });
      const r = await puerto().consultarLineas([
        { idVariante: p.idVariante, idColor: propio.idColor },
        { idVariante: p.idVariante, idColor: ajeno.idColor },
        { idVariante: p.idVariante, idColor: 2147483000 },
        { idVariante: otro.idVariante, idColor: ajeno.idColor },
      ]);
      expect(r[0]).toMatchObject({
        vendible: true,
        idColor: propio.idColor,
        color: { idColor: propio.idColor, nombre: propio.nombre, codigo: '123', hexadecimal: '#0A0B0C' },
      });
      // El color existe: se informa su nombre para poder avisar "ya no está disponible" en el carrito.
      expect(r[1]).toMatchObject({
        vendible: false,
        motivoNoVendible: 'color_no_ofrecido',
        color: { idColor: ajeno.idColor },
      });
      expect(r[2]).toMatchObject({ vendible: false, motivoNoVendible: 'color_no_ofrecido', color: null });
      expect(r[3]).toMatchObject({ vendible: true });
      await prisma.color.update({ where: { idColor: propio.idColor }, data: { estado: 'inactivo' } });
      const [inactivo] = await puerto().consultarLineas([{ idVariante: p.idVariante, idColor: propio.idColor }]);
      expect(inactivo).toMatchObject({ vendible: false, motivoNoVendible: 'color_no_ofrecido' });
    });

    it('un combo trae su tope de unidades y la exclusión de descuentos; agotado no es vendible (K5, P4)', async () => {
      const combo = await comboVisible(3, { excluidoDeDescuentos: true });
      const [con] = await puerto().consultarLineas([{ idVariante: combo.idVariante as number }]);
      expect(con).toMatchObject({
        vendible: true,
        esCombo: true,
        topeUnidades: 3,
        excluidoDeDescuentos: true,
        precioBase: 59900,
      });
      await fijarExistencia(combo.idVariante as number, 0);
      const [sin] = await puerto().consultarLineas([{ idVariante: combo.idVariante as number }]);
      expect(sin).toMatchObject({
        vendible: false,
        motivoNoVendible: 'combo_agotado',
        topeUnidades: 0,
        disponibilidad: 'agotado',
      });
    });

    it('un producto común sin existencia sigue siendo vendible y no tiene tope', async () => {
      const p = await productoVisible();
      await fijarExistencia(p.idVariante, 0);
      const [l] = await puerto().consultarLineas([{ idVariante: p.idVariante }]);
      expect(l).toMatchObject({ vendible: true, topeUnidades: null, disponibilidad: 'agotado' });
    });

    it('rechaza más de 100 líneas a la vez', async () => {
      const muchas = Array.from({ length: 101 }, () => ({ idVariante: 1 }));
      await expect(puerto().consultarLineas(muchas)).rejects.toMatchObject({ code: 'PARAMETRO_INVALIDO', status: 400 });
      expect(await puerto().consultarLineas(muchas.slice(0, 100))).toHaveLength(100);
    });
  });
});
