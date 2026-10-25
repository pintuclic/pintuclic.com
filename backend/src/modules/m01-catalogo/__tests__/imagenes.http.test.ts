import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ServidorPrueba } from './helpers/servidor-prueba';

/**
 * Imágenes de productos y de medidas (I1 a I5), manos del rendimiento y cambio de tipo de una
 * medida, contra PostgreSQL real por HTTP. Se activa con `M01_TEST_DATABASE_URL`.
 */
const URL_BD = process.env.M01_TEST_DATABASE_URL;
const ALEATORIO = Math.random().toString(36).slice(2, 8);
const PREFIJO = `ZZ-IMG-${ALEATORIO}`;

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);
/** Una imagen distinta de la anterior: PNG con relleno, para comprobar que se sirven los bytes correctos. */
const pngConRelleno = (n: number): Buffer => Buffer.concat([PNG, Buffer.alloc(n, 7)]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32, 1)]);
const base64 = (b: Buffer): string => b.toString('base64');

interface Dato {
  [clave: string]: unknown;
}
type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

describe.skipIf(URL_BD === undefined)('M01 · imágenes, manos y medidas (HTTP + PostgreSQL)', () => {
  let servidor: ServidorPrueba;
  let prisma: (typeof import('../../../core/db/client'))['prisma'];
  const auditoria = { registrarAccesoDenegado: vi.fn() };
  let contador = 0;
  const fx = { marca: 0, linea: 0, subcategoria: 0, resina: 0, tipoVolumen: 0, tipoLongitud: 0, medida: 0 };

  const admin = (m: Metodo, ruta: string, cuerpo?: unknown) => servidor.peticion('admin', m, ruta, cuerpo);
  const dato = (r: { cuerpo: { data?: unknown } }): Dato => r.cuerpo.data as Dato;
  const lista = (r: { cuerpo: { data?: unknown } }): Dato[] => r.cuerpo.data as Dato[];
  const nombre = (base: string): string => `${PREFIJO}-${base}-${++contador}`;

  async function crearId(ruta: string, cuerpo: unknown, campo: string): Promise<number> {
    const r = await admin('POST', ruta, cuerpo);
    expect(r.status, JSON.stringify(r.cuerpo)).toBe(201);
    return dato(r)[campo] as number;
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_BD ?? '';
    const { levantarServidor } = await import('./helpers/servidor-prueba.js');
    ({ prisma } = await import('../../../core/db/client.js'));
    servidor = await levantarServidor(auditoria);
    fx.marca = await crearId(
      '/marcas',
      { nombre: `${PREFIJO}-marca`, logotipoBase64: base64(PNG), logotipoMimeType: 'image/png' },
      'idMarca',
    );
    fx.linea = await crearId('/lineas', { idMarca: fx.marca, nombre: `${PREFIJO}-linea` }, 'idLinea');
    const categoria = await crearId('/categorias', { nombre: `${PREFIJO}-cat` }, 'idCategoria');
    fx.subcategoria = await crearId(
      `/categorias/${categoria}/subcategorias`,
      { nombre: `${PREFIJO}-sub` },
      'idSubcategoria',
    );
    fx.resina = await crearId('/tipos-resina', { nombre: `${PREFIJO}-resina` }, 'idTipoResina');
    fx.tipoVolumen = await crearId(
      '/tipos-medida',
      { nombre: `${PREFIJO}-vol`, abreviatura: `v${ALEATORIO.slice(0, 4)}`, equivalenciaGalones: 1 },
      'idTipoMedida',
    );
    fx.tipoLongitud = await crearId(
      '/tipos-medida',
      { nombre: `${PREFIJO}-lon`, abreviatura: `l${ALEATORIO.slice(0, 4)}` },
      'idTipoMedida',
    );
    fx.medida = await crearId('/medidas', { idTipoMedida: fx.tipoVolumen, valor: 1 }, 'idMedida');
  });

  afterAll(async () => {
    const marcas = await prisma.marca.findMany({
      where: { nombre: { startsWith: PREFIJO } },
      select: { idMarca: true },
    });
    const idsMarca = marcas.map((m) => m.idMarca);
    await prisma.variante.deleteMany({ where: { producto: { idMarca: { in: idsMarca } } } });
    await prisma.producto.deleteMany({ where: { idMarca: { in: idsMarca } } });
    await prisma.linea.deleteMany({ where: { idMarca: { in: idsMarca } } });
    await prisma.marca.deleteMany({ where: { idMarca: { in: idsMarca } } });
    await prisma.medida.deleteMany({ where: { tipoMedida: { nombre: { startsWith: PREFIJO } } } });
    await prisma.tipoMedida.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.subcategoria.deleteMany({ where: { categoria: { nombre: { startsWith: PREFIJO } } } });
    await prisma.categoria.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.tipoResina.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await servidor.cerrar();
    await prisma.$disconnect();
  });

  async function crearProducto(extra: Dato = {}): Promise<number> {
    const r = await admin('POST', '/productos', {
      idMarca: fx.marca,
      idSubcategoria: fx.subcategoria,
      nombre: nombre('prod'),
      ...extra,
    });
    expect(r.status, JSON.stringify(r.cuerpo)).toBe(201);
    return dato(r).idProducto as number;
  }
  const subir = (idProducto: number, bytes: Buffer = PNG, mime = 'image/png') =>
    admin('POST', `/productos/${idProducto}/imagenes`, { imagenBase64: base64(bytes), imagenMimeType: mime });
  async function subirOk(idProducto: number, bytes: Buffer = PNG, mime = 'image/png'): Promise<Dato> {
    const r = await subir(idProducto, bytes, mime);
    expect(r.status, JSON.stringify(r.cuerpo)).toBe(201);
    return dato(r);
  }

  describe('galería del producto (I1 a I3, I5)', () => {
    it('la primera imagen es la principal y las siguientes siguen el orden de subida', async () => {
      const id = await crearProducto();
      const a = await subirOk(id);
      const b = await subirOk(id, JPEG, 'image/jpeg');
      const c = await subirOk(id, pngConRelleno(10));
      expect(a).toMatchObject({ esPrincipal: true, orden: 0, mimeType: 'image/png' });
      expect(b).toMatchObject({ esPrincipal: false, orden: 1, mimeType: 'image/jpeg' });
      expect(c).toMatchObject({ esPrincipal: false, orden: 2 });
      const listadas = lista(await admin('GET', `/productos/${id}/imagenes`));
      expect(listadas.map((i) => i.idImagen)).toEqual([a.idImagen, b.idImagen, c.idImagen]);
      const detalle = dato(await admin('GET', `/productos/${id}`));
      expect((detalle.imagenes as Dato[]).map((i) => i.idImagen)).toEqual([a.idImagen, b.idImagen, c.idImagen]);
      expect(JSON.stringify(detalle)).not.toContain(base64(PNG).slice(0, 40));
    });

    it('sirve los mismos bytes con su Content-Type y no los incluye en el JSON', async () => {
      const id = await crearProducto();
      const img = await subirOk(id, pngConRelleno(50));
      const r = await fetch(`${servidor.baseUrl}/api/v1/admin/catalogo/imagenes/${String(img.idImagen)}`, {
        headers: { 'x-actor': 'admin' },
      });
      expect(r.status).toBe(200);
      expect(r.headers.get('content-type')).toContain('image/png');
      expect(Buffer.from(await r.arrayBuffer()).equals(pngConRelleno(50))).toBe(true);
    });

    it.each([
      ['no es base64', { imagenBase64: '!!!no-es-base64!!!', imagenMimeType: 'image/png' }],
      [
        'declara un tipo que no es (firma de JPEG como PNG)',
        { imagenBase64: base64(JPEG), imagenMimeType: 'image/png' },
      ],
      [
        'es un texto declarado como imagen',
        { imagenBase64: base64(Buffer.from('hola mundo de prueba')), imagenMimeType: 'image/png' },
      ],
    ])('rechaza una imagen que %s', async (_n, cuerpo) => {
      const id = await crearProducto();
      const r = await admin('POST', `/productos/${id}/imagenes`, cuerpo);
      expect([r.status, r.cuerpo.error?.code]).toEqual([400, 'IMAGEN_INVALIDA']);
    });

    it('rechaza un tipo no permitido y una imagen de más de 5 MB', async () => {
      const id = await crearProducto();
      const gif = await admin('POST', `/productos/${id}/imagenes`, {
        imagenBase64: base64(PNG),
        imagenMimeType: 'image/gif',
      });
      expect([gif.status, gif.cuerpo.error?.code]).toEqual([400, 'PARAMETRO_INVALIDO']);
      const grande = await subir(id, pngConRelleno(5 * 1024 * 1024));
      expect([grande.status, grande.cuerpo.error?.code]).toEqual([400, 'PARAMETRO_INVALIDO']);
      expect(grande.cuerpo.error?.message).toBe('La imagen no puede superar 5 MB');
      const vacia = await admin('POST', `/productos/${id}/imagenes`, { imagenBase64: '', imagenMimeType: 'image/png' });
      expect([vacia.status, vacia.cuerpo.error?.message]).toEqual([400, 'Elija una imagen']);
      expect(lista(await admin('GET', `/productos/${id}/imagenes`))).toHaveLength(0);
    });

    it('I1: admite hasta 12 imágenes por producto', async () => {
      const id = await crearProducto();
      for (let i = 0; i < 12; i += 1) await subirOk(id, pngConRelleno(i + 1));
      const r = await subir(id, pngConRelleno(99));
      expect([r.status, r.cuerpo.error?.code]).toEqual([409, 'LIMITE_IMAGENES']);
      expect(lista(await admin('GET', `/productos/${id}/imagenes`))).toHaveLength(12);
    });

    it('I3: reordena con todas las imágenes; una lista incompleta, ajena o repetida se rechaza', async () => {
      const id = await crearProducto();
      const [a, b, c] = [await subirOk(id), await subirOk(id, pngConRelleno(1)), await subirOk(id, pngConRelleno(2))];
      const ids = [c.idImagen, a.idImagen, b.idImagen];
      const r = await admin('PATCH', `/productos/${id}/imagenes/orden`, { idsOrdenados: ids });
      expect(r.status).toBe(200);
      expect(lista(r).map((i) => [i.idImagen, i.orden])).toEqual([
        [c.idImagen, 0],
        [a.idImagen, 1],
        [b.idImagen, 2],
      ]);
      // La principal no cambia al reordenar.
      expect(lista(r).find((i) => i.esPrincipal)?.idImagen).toBe(a.idImagen);

      const incompleta = await admin('PATCH', `/productos/${id}/imagenes/orden`, {
        idsOrdenados: [a.idImagen, b.idImagen],
      });
      expect([incompleta.status, incompleta.cuerpo.error?.code]).toEqual([409, 'RELACION_INVALIDA']);
      const ajena = await admin('PATCH', `/productos/${id}/imagenes/orden`, {
        idsOrdenados: [a.idImagen, b.idImagen, 999999],
      });
      expect(ajena.status).toBe(409);
      const repetida = await admin('PATCH', `/productos/${id}/imagenes/orden`, {
        idsOrdenados: [a.idImagen, a.idImagen, b.idImagen],
      });
      expect([repetida.status, repetida.cuerpo.error?.code]).toEqual([400, 'PARAMETRO_INVALIDO']);
      expect((await admin('PATCH', `/productos/${id}/imagenes/orden`, { idsOrdenados: [] })).status).toBe(400);
    });

    it('I2: marcar otra como principal deja una sola; eliminar la principal pasa la portada a la siguiente', async () => {
      const id = await crearProducto();
      const a = await subirOk(id);
      const b = await subirOk(id, pngConRelleno(1));
      const c = await subirOk(id, pngConRelleno(2));
      const principal = await admin('PATCH', `/imagenes/${String(b.idImagen)}/principal`, {});
      expect(dato(principal)).toMatchObject({ idImagen: b.idImagen, esPrincipal: true });
      const tras = lista(await admin('GET', `/productos/${id}/imagenes`));
      expect(tras.filter((i) => i.esPrincipal).map((i) => i.idImagen)).toEqual([b.idImagen]);

      expect((await admin('DELETE', `/imagenes/${String(b.idImagen)}`)).status).toBe(200);
      const despues = lista(await admin('GET', `/productos/${id}/imagenes`));
      expect(despues.map((i) => i.idImagen)).toEqual([a.idImagen, c.idImagen]);
      expect(despues.find((i) => i.esPrincipal)?.idImagen).toBe(a.idImagen);
      expect(await prisma.imagen.count({ where: { idImagen: b.idImagen as number } })).toBe(0);
    });

    it('I5: no se elimina la única imagen de un producto publicado, pero sí tras despublicarlo', async () => {
      const id = await crearProducto();
      const unica = await subirOk(id);
      await admin('POST', `/productos/${id}/variantes`, { idMedida: fx.medida, precio: 1000 });
      expect((await admin('PATCH', `/productos/${id}/publicacion`, { publicado: true })).status).toBe(200);
      const bloqueado = await admin('DELETE', `/imagenes/${String(unica.idImagen)}`);
      expect([bloqueado.status, bloqueado.cuerpo.error?.code]).toEqual([409, 'NO_PUBLICABLE']);
      const otra = await subirOk(id, pngConRelleno(3));
      expect((await admin('DELETE', `/imagenes/${String(unica.idImagen)}`)).status).toBe(200);
      expect((await admin('DELETE', `/imagenes/${String(otra.idImagen)}`)).status).toBe(409);
      await admin('PATCH', `/productos/${id}/publicacion`, { publicado: false });
      expect((await admin('DELETE', `/imagenes/${String(otra.idImagen)}`)).status).toBe(200);
    });

    it('404 uniforme si el producto o la imagen no existen; 400 con ids inválidos', async () => {
      expect((await subir(999999)).status).toBe(404);
      expect((await admin('GET', '/productos/999999/imagenes')).status).toBe(404);
      expect((await admin('DELETE', '/imagenes/999999')).status).toBe(404);
      expect((await admin('PATCH', '/imagenes/999999/principal', {})).status).toBe(404);
      expect((await admin('GET', '/imagenes/999999')).status).toBe(404);
      expect((await admin('DELETE', '/imagenes/abc')).status).toBe(400);
    });

    it('permisos: el lector solo consulta; el editor sube y elimina; un cliente no ve nada', async () => {
      const id = await crearProducto();
      const img = await subirOk(id);
      const cuerpo = { imagenBase64: base64(PNG), imagenMimeType: 'image/png' };
      expect((await servidor.peticion('lector', 'GET', `/productos/${id}/imagenes`)).status).toBe(200);
      expect((await servidor.peticion('lector', 'POST', `/productos/${id}/imagenes`, cuerpo)).status).toBe(404);
      expect((await servidor.peticion('lector', 'DELETE', `/imagenes/${String(img.idImagen)}`)).status).toBe(404);
      expect((await servidor.peticion('cliente', 'GET', `/productos/${id}/imagenes`)).status).toBe(404);
      expect((await servidor.peticion(null, 'GET', `/imagenes/${String(img.idImagen)}`)).status).toBe(404);
      expect((await servidor.peticion('editor', 'POST', `/productos/${id}/imagenes`, cuerpo)).status).toBe(201);
      expect((await servidor.peticion('editor', 'DELETE', `/imagenes/${String(img.idImagen)}`)).status).toBe(200);
    });
  });

  describe('consulta pública de imágenes', () => {
    it('solo sirve las de productos visibles y expone la galería con la principal primero', async () => {
      const id = await crearProducto();
      const a = await subirOk(id);
      const b = await subirOk(id, pngConRelleno(5));
      await admin('PATCH', `/imagenes/${String(b.idImagen)}/principal`, {});
      await admin('POST', `/productos/${id}/variantes`, { idMedida: fx.medida, precio: 5000 });

      // Sin publicar: no se sirve.
      expect((await servidor.publicaBytes(`/imagenes/${String(a.idImagen)}`)).status).toBe(404);
      await admin('PATCH', `/productos/${id}/publicacion`, { publicado: true });

      const bytes = await servidor.publicaBytes(`/imagenes/${String(b.idImagen)}`);
      expect(bytes.status).toBe(200);
      expect(bytes.tipo).toContain('image/png');
      expect(bytes.cacheControl).toContain('public');
      expect(bytes.bytes.equals(pngConRelleno(5))).toBe(true);

      const ficha = await servidor.publica(`/productos/${id}`);
      expect((dato(ficha).imagenes as Dato[]).map((i) => i.idImagen)).toEqual([b.idImagen, a.idImagen]);
      const tarjetas = await servidor.publica(
        `/productos?idMarca=${fx.marca}&busqueda=${encodeURIComponent(PREFIJO)}&limite=100`,
      );
      expect(lista(tarjetas).find((t) => t.idProducto === id)?.idImagenPrincipal).toBe(b.idImagen);

      await admin('PATCH', `/productos/${id}/estado`, { estado: 'inactivo', confirmar: true });
      expect((await servidor.publicaBytes(`/imagenes/${String(a.idImagen)}`)).status).toBe(404);
      expect((await servidor.publicaBytes('/imagenes/abc')).status).toBe(400);
    });
  });

  describe('ficha: manos del rendimiento', () => {
    const ficha = (extra: Dato = {}): Dato => ({
      idTipoResina: fx.resina,
      rendimientoMin: 30,
      rendimientoMax: 35,
      ...extra,
    });

    it('guarda y devuelve las manos; se pueden editar y quitar', async () => {
      const id = await crearProducto({ idLinea: fx.linea, ficha: ficha({ manos: 2 }) });
      const creado = dato(await admin('GET', `/productos/${id}`));
      expect(creado.ficha).toMatchObject({ rendimientoMin: 30, rendimientoMax: 35, manos: 2 });
      const editado = await admin('PUT', `/productos/${id}`, { ficha: ficha({ manos: 3 }) });
      expect(dato(editado).ficha).toMatchObject({ manos: 3 });
      const sin = await admin('PUT', `/productos/${id}`, { ficha: ficha({ manos: null }) });
      expect(dato(sin).ficha).toMatchObject({ manos: null });
    });

    it('rechaza manos sin rendimiento o fuera de 1 a 10', async () => {
      for (const extra of [
        { manos: 0 },
        { manos: 11 },
        { manos: 1.5 },
        { manos: 2, rendimientoMin: null, rendimientoMax: null },
      ]) {
        const r = await admin('POST', '/productos', {
          idMarca: fx.marca,
          idLinea: fx.linea,
          idSubcategoria: fx.subcategoria,
          nombre: nombre('manos'),
          ficha: ficha(extra),
        });
        expect([r.status, r.cuerpo.error?.code], JSON.stringify(extra)).toEqual([400, 'PARAMETRO_INVALIDO']);
      }
    });

    it('la ficha pública muestra las manos', async () => {
      const id = await crearProducto({ idLinea: fx.linea, ficha: ficha({ manos: 2 }) });
      await subirOk(id);
      await admin('POST', `/productos/${id}/variantes`, { idMedida: fx.medida, precio: 5000 });
      await admin('PATCH', `/productos/${id}/publicacion`, { publicado: true });
      expect(dato(await servidor.publica(`/productos/${id}`))).toMatchObject({ manos: 2 });
    });
  });

  describe('medidas: imagen y cambio de tipo', () => {
    async function nuevaMedida(valor: number, tipo = fx.tipoVolumen): Promise<Dato> {
      const r = await admin('POST', '/medidas', { idTipoMedida: tipo, valor });
      expect(r.status, JSON.stringify(r.cuerpo)).toBe(201);
      return dato(r);
    }

    it('I4: sube, sirve y quita la imagen de una medida', async () => {
      const m = await nuevaMedida(7);
      expect(m.tieneImagen).toBe(false);
      expect((await admin('GET', `/medidas/${String(m.idMedida)}/imagen`)).status).toBe(404);
      const r = await admin('PUT', `/medidas/${String(m.idMedida)}/imagen`, {
        imagenBase64: base64(pngConRelleno(9)),
        imagenMimeType: 'image/png',
      });
      expect(dato(r)).toMatchObject({ idMedida: m.idMedida, tieneImagen: true });
      const bytes = await fetch(`${servidor.baseUrl}/api/v1/admin/catalogo/medidas/${String(m.idMedida)}/imagen`, {
        headers: { 'x-actor': 'admin' },
      });
      expect(Buffer.from(await bytes.arrayBuffer()).equals(pngConRelleno(9))).toBe(true);
      const listada = lista(await admin('GET', `/medidas?idTipoMedida=${fx.tipoVolumen}&limite=100`)).find(
        (x) => x.idMedida === m.idMedida,
      );
      expect(listada).toMatchObject({ tieneImagen: true });
      expect(JSON.stringify(listada)).not.toContain('imagen"');
      expect(dato(await admin('DELETE', `/medidas/${String(m.idMedida)}/imagen`))).toMatchObject({
        tieneImagen: false,
      });
      expect((await admin('GET', `/medidas/${String(m.idMedida)}/imagen`)).status).toBe(404);
    });

    it('rechaza una imagen de medida inválida y exige permiso de edición', async () => {
      const m = await nuevaMedida(8);
      const ruta = `/medidas/${String(m.idMedida)}/imagen`;
      const mala = await admin('PUT', ruta, {
        imagenBase64: base64(Buffer.from('no soy una imagen')),
        imagenMimeType: 'image/webp',
      });
      expect([mala.status, mala.cuerpo.error?.code]).toEqual([400, 'IMAGEN_INVALIDA']);
      const cuerpo = { imagenBase64: base64(PNG), imagenMimeType: 'image/png' };
      expect((await servidor.peticion('lector', 'PUT', ruta, cuerpo)).status).toBe(404);
      expect((await servidor.peticion('lector', 'DELETE', ruta)).status).toBe(404);
      expect((await servidor.peticion('editor', 'PUT', ruta, cuerpo)).status).toBe(200);
      expect((await admin('PUT', '/medidas/999999/imagen', cuerpo)).status).toBe(404);
    });

    it('la imagen de una medida es pública solo si la usa un producto visible', async () => {
      const m = await nuevaMedida(9);
      await admin('PUT', `/medidas/${String(m.idMedida)}/imagen`, {
        imagenBase64: base64(PNG),
        imagenMimeType: 'image/png',
      });
      const id = await crearProducto();
      await subirOk(id);
      await admin('POST', `/productos/${id}/variantes`, { idMedida: m.idMedida, precio: 4000 });
      expect((await servidor.publicaBytes(`/medidas/${String(m.idMedida)}/imagen`)).status).toBe(404);
      await admin('PATCH', `/productos/${id}/publicacion`, { publicado: true });
      const r = await servidor.publicaBytes(`/medidas/${String(m.idMedida)}/imagen`);
      expect([r.status, r.tipo]).toEqual([200, expect.stringContaining('image/png')]);
      const variantes = dato(await servidor.publica(`/productos/${id}`)).variantes as Dato[];
      expect(variantes[0]).toMatchObject({ idMedida: m.idMedida, tieneImagenMedida: true });
    });

    it('se puede cambiar el tipo de una medida; el nombre generado se recalcula', async () => {
      const m = await nuevaMedida(11);
      const abrVol = (await prisma.tipoMedida.findUniqueOrThrow({ where: { idTipoMedida: fx.tipoVolumen } }))
        .abreviatura;
      const abrLon = (await prisma.tipoMedida.findUniqueOrThrow({ where: { idTipoMedida: fx.tipoLongitud } }))
        .abreviatura;
      expect(m.nombre).toBe(`11 ${abrVol}`);
      const r = await admin('PUT', `/medidas/${String(m.idMedida)}`, { idTipoMedida: fx.tipoLongitud });
      expect(r.status, JSON.stringify(r.cuerpo)).toBe(200);
      expect(dato(r)).toMatchObject({ idTipoMedida: fx.tipoLongitud, valor: 11, nombre: `11 ${abrLon}` });
      // Cambiar tipo y valor a la vez.
      const ambos = await admin('PUT', `/medidas/${String(m.idMedida)}`, { idTipoMedida: fx.tipoVolumen, valor: 12 });
      expect(dato(ambos)).toMatchObject({ idTipoMedida: fx.tipoVolumen, valor: 12, nombre: `12 ${abrVol}` });
    });

    it('un nombre escrito a mano se respeta al cambiar de tipo; el tipo debe existir, estar activo y no duplicar', async () => {
      const m = await nuevaMedida(13);
      await admin('PUT', `/medidas/${String(m.idMedida)}`, { nombre: nombre('manual') });
      const manual = dato(await admin('PUT', `/medidas/${String(m.idMedida)}`, { idTipoMedida: fx.tipoLongitud }));
      expect(String(manual.nombre)).toContain('manual');

      const inexistente = await admin('PUT', `/medidas/${String(m.idMedida)}`, { idTipoMedida: 999999 });
      expect([inexistente.status, inexistente.cuerpo.error?.code]).toEqual([404, 'RECURSO_NO_DISPONIBLE']);

      const tipoInactivo = await crearId(
        '/tipos-medida',
        { nombre: nombre('tinact'), abreviatura: `x${ALEATORIO.slice(0, 3)}${contador}` },
        'idTipoMedida',
      );
      await admin('PATCH', `/tipos-medida/${tipoInactivo}/estado`, { estado: 'inactivo', confirmar: true });
      const inactivo = await admin('PUT', `/medidas/${String(m.idMedida)}`, { idTipoMedida: tipoInactivo });
      expect([inactivo.status, inactivo.cuerpo.error?.code]).toEqual([409, 'PADRE_INACTIVO']);

      // Ya existe un valor 13 en el tipo de destino.
      await nuevaMedida(13, fx.tipoLongitud).catch(() => undefined);
      const otra = await nuevaMedida(14);
      await nuevaMedida(14, fx.tipoLongitud);
      const duplicada = await admin('PUT', `/medidas/${String(otra.idMedida)}`, { idTipoMedida: fx.tipoLongitud });
      expect([duplicada.status, duplicada.cuerpo.error?.code]).toEqual([409, 'NOMBRE_DUPLICADO']);
    });
  });
});
