import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ServidorPrueba } from './helpers/servidor-prueba';

/**
 * Entrega 1 (marcas, líneas, catálogos pequeños y medidas) contra PostgreSQL real, por HTTP.
 * Se activa con `M01_TEST_DATABASE_URL`; sin ella se omite (CI sin base de datos).
 */
const URL_BD = process.env.M01_TEST_DATABASE_URL;
const ALEATORIO = Math.random().toString(36).slice(2, 8);
const PREFIJO = `ZZ-TEST-${ALEATORIO}`;

/** PNG válido de 1×1 píxel. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);
/** Relleno hasta `bytes` conservando la firma PNG (basta para la validación por firma). */
const pngDe = (bytes: number): Buffer => Buffer.concat([PNG_1X1, Buffer.alloc(bytes - PNG_1X1.length, 1)]);
const base64 = (b: Buffer): string => b.toString('base64');

let contadorAbreviatura = 0;

interface Dato {
  [clave: string]: unknown;
}

describe.skipIf(URL_BD === undefined)('M01 · entrega 1: catálogos base (HTTP + PostgreSQL)', () => {
  let servidor: ServidorPrueba;
  let prisma: (typeof import('../../../core/db/client'))['prisma'];
  const auditoria = { registrarAccesoDenegado: vi.fn() };

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_BD ?? '';
    const { levantarServidor } = await import('./helpers/servidor-prueba.js');
    ({ prisma } = await import('../../../core/db/client.js'));
    servidor = await levantarServidor(auditoria);
  });

  afterAll(async () => {
    const marcas = await prisma.marca.findMany({ where: { nombre: { startsWith: PREFIJO } }, select: { idMarca: true } });
    const idsMarca = marcas.map((m) => m.idMarca);
    await prisma.producto.deleteMany({ where: { OR: [{ nombre: { startsWith: PREFIJO } }, { idMarca: { in: idsMarca } }] } });
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
    await prisma.familiaColor.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await servidor.cerrar();
    await prisma.$disconnect();
  });

  const admin = (m: 'GET' | 'POST' | 'PUT' | 'PATCH', ruta: string, cuerpo?: unknown) =>
    servidor.peticion('admin', m, ruta, cuerpo);
  const dato = (r: { cuerpo: { data?: unknown } }): Dato => r.cuerpo.data as Dato;

  async function crearMarca(sufijo: string): Promise<number> {
    const r = await admin('POST', '/marcas', {
      nombre: `${PREFIJO}-${sufijo}`,
      logotipoBase64: base64(PNG_1X1),
      logotipoMimeType: 'image/png',
    });
    expect(r.status).toBe(201);
    return dato(r).idMarca as number;
  }

  /* ─── Marcas ─── */
  describe('marcas (HU-CAT-04, R9)', () => {
    it('crea con logotipo y no devuelve los bytes', async () => {
      const r = await admin('POST', '/marcas', {
        nombre: `  ${PREFIJO}-m1 `,
        logotipoBase64: base64(PNG_1X1),
        logotipoMimeType: 'image/png',
      });
      expect(r.status).toBe(201);
      expect(r.cuerpo.data).toEqual({
        idMarca: expect.any(Number),
        nombre: `${PREFIJO}-m1`,
        estado: 'activo',
        logotipoMimeType: 'image/png',
      });
    });

    it('sirve el logotipo con su Content-Type y los mismos bytes', async () => {
      const id = await crearMarca('m-logo');
      const r = await fetch(`${servidor.baseUrl}/api/v1/admin/catalogo/marcas/${id}/logotipo`, {
        headers: { 'x-actor': 'admin' },
      });
      expect(r.status).toBe(200);
      expect(r.headers.get('content-type')).toContain('image/png');
      expect(Buffer.from(await r.arrayBuffer()).equals(PNG_1X1)).toBe(true);
    });

    it('sin logotipo o con tipo no permitido: 400', async () => {
      expect((await admin('POST', '/marcas', { nombre: `${PREFIJO}-x` })).status).toBe(400);
      const gif = await admin('POST', '/marcas', {
        nombre: `${PREFIJO}-gif`,
        logotipoBase64: base64(PNG_1X1),
        logotipoMimeType: 'image/gif',
      });
      expect(gif.status).toBe(400);
    });

    it('rechaza base64 inválido y archivos que no son de la imagen declarada (por firma)', async () => {
      const basura = await admin('POST', '/marcas', {
        nombre: `${PREFIJO}-b1`,
        logotipoBase64: 'esto no es base64!!',
        logotipoMimeType: 'image/png',
      });
      expect(basura.status).toBe(400);
      expect(basura.cuerpo.error?.code).toBe('LOGOTIPO_INVALIDO');
      const texto = await admin('POST', '/marcas', {
        nombre: `${PREFIJO}-b2`,
        logotipoBase64: base64(Buffer.from('<?php echo 1; ?>')),
        logotipoMimeType: 'image/png',
      });
      expect(texto.cuerpo.error?.code).toBe('LOGOTIPO_INVALIDO');
      const pngComoJpeg = await admin('POST', '/marcas', {
        nombre: `${PREFIJO}-b3`,
        logotipoBase64: base64(PNG_1X1),
        logotipoMimeType: 'image/jpeg',
      });
      expect(pngComoJpeg.cuerpo.error?.code).toBe('LOGOTIPO_INVALIDO');
    });

    it('límite de 5 MB: justo 5 MB se acepta; unos bytes más, no', async () => {
      const exacto = await admin('POST', '/marcas', {
        nombre: `${PREFIJO}-5mb`,
        logotipoBase64: base64(pngDe(5 * 1024 * 1024)),
        logotipoMimeType: 'image/png',
      });
      expect(exacto.status).toBe(201);
      const demas = await admin('POST', '/marcas', {
        nombre: `${PREFIJO}-5mb-mas`,
        logotipoBase64: base64(pngDe(5 * 1024 * 1024 + 10)),
        logotipoMimeType: 'image/png',
      });
      expect(demas.status).toBe(400);
      expect(await prisma.marca.findFirst({ where: { nombre: `${PREFIJO}-5mb-mas` } })).toBeNull();
    });

    it('rechaza un nombre repetido sin distinguir mayúsculas (409)', async () => {
      await crearMarca('m-dup');
      const r = await admin('POST', '/marcas', {
        nombre: ` ${PREFIJO}-M-DUP`,
        logotipoBase64: base64(PNG_1X1),
        logotipoMimeType: 'image/png',
      });
      expect(r.status).toBe(409);
      expect(r.cuerpo.error?.code).toBe('NOMBRE_DUPLICADO');
    });

    it('lista paginada con búsqueda y sin bytes', async () => {
      await crearMarca('m-lista');
      const r = await admin('GET', `/marcas?busqueda=${PREFIJO}-m-lista&limite=5`);
      expect(r.status).toBe(200);
      expect(r.cuerpo.pagination).toEqual({ pagina: 1, limite: 5, total: 1, totalPaginas: 1 });
      expect(Object.keys((r.cuerpo.data as Dato[])[0] ?? {}).sort()).toEqual(['estado', 'idMarca', 'logotipoMimeType', 'nombre']);
    });

    it('reemplaza el logotipo y edita el nombre', async () => {
      const id = await crearMarca('m-edit');
      const nuevo = pngDe(100);
      expect((await admin('PUT', `/marcas/${id}/logotipo`, { logotipoBase64: base64(nuevo), logotipoMimeType: 'image/png' })).status).toBe(200);
      expect((await prisma.marca.findUnique({ where: { idMarca: id } }))?.logotipo.length).toBe(100);
      const r = await admin('PUT', `/marcas/${id}`, { nombre: `${PREFIJO}-m-edit2` });
      expect(r.cuerpo.data).toMatchObject({ nombre: `${PREFIJO}-m-edit2` });
    });

    it('una marca inexistente: 404; id inválido: 400', async () => {
      expect((await admin('GET', '/marcas/99999999')).status).toBe(404);
      expect((await admin('GET', '/marcas/abc')).status).toBe(400);
    });

    it('desactivar informa líneas, colores y productos; confirmando, desactiva líneas y colores (R5, R6)', async () => {
      const idMarca = await crearMarca('m-estado');
      const linea = await prisma.linea.create({ data: { idMarca, nombre: 'L1' } });
      await prisma.color.create({ data: { idMarca, nombre: 'C1', idAcabado: 1, hexadecimal: '#112233' } });
      const cat = await prisma.categoria.create({ data: { nombre: `${PREFIJO}-cat-m` } });
      const sub = await prisma.subcategoria.create({ data: { idCategoria: cat.idCategoria, nombre: 'S' } });
      const producto = await prisma.producto.create({
        data: { idMarca, idLinea: linea.idLinea, idSubcategoria: sub.idSubcategoria, nombre: `${PREFIJO}-prod-m`, publicado: true },
      });

      const impacto = await admin('GET', `/marcas/${idMarca}/impacto-desactivacion`);
      expect(impacto.cuerpo.data).toMatchObject({ lineas: 1, colores: 1, productos: 1 });

      const sin = await admin('PATCH', `/marcas/${idMarca}/estado`, { estado: 'inactivo' });
      expect(sin.status).toBe(409);
      expect(sin.cuerpo.error?.code).toBe('CONFIRMACION_REQUERIDA');

      const con = await admin('PATCH', `/marcas/${idMarca}/estado`, { estado: 'inactivo', confirmar: true });
      expect(con.status).toBe(200);
      expect((await prisma.linea.findUnique({ where: { idLinea: linea.idLinea } }))?.estado).toBe('inactivo');
      expect((await prisma.color.findFirst({ where: { idMarca } }))?.estado).toBe('inactivo');
      const p = await prisma.producto.findUnique({ where: { idProducto: producto.idProducto } });
      expect(p).toMatchObject({ estado: 'activo', publicado: true });

      // Reactivar la marca no reactiva a sus hijos (D3).
      expect((await admin('PATCH', `/marcas/${idMarca}/estado`, { estado: 'activo' })).status).toBe(200);
      expect((await prisma.linea.findUnique({ where: { idLinea: linea.idLinea } }))?.estado).toBe('inactivo');
    });
  });

  /* ─── Líneas ─── */
  describe('líneas (HU-CAT-11, R3, R7, R8)', () => {
    it('crea bajo una marca; la gama vacía se guarda como null', async () => {
      const idMarca = await crearMarca('l1');
      const r = await admin('POST', '/lineas', { idMarca, nombre: 'Viniltex', gamaComercial: '   ' });
      expect(r.status).toBe(201);
      expect(r.cuerpo.data).toMatchObject({ idMarca, nombre: 'Viniltex', gamaComercial: null, estado: 'activo' });
    });

    it('rechaza el mismo nombre en la misma marca y lo admite en otra (CA-CAT-11-03)', async () => {
      const a = await crearMarca('l-a');
      const b = await crearMarca('l-b');
      expect((await admin('POST', '/lineas', { idMarca: a, nombre: 'Koraza' })).status).toBe(201);
      const dup = await admin('POST', '/lineas', { idMarca: a, nombre: ' KORAZA ' });
      expect(dup.status).toBe(409);
      expect(dup.cuerpo.error?.code).toBe('NOMBRE_DUPLICADO');
      expect((await admin('POST', '/lineas', { idMarca: b, nombre: 'Koraza' })).status).toBe(201);
    });

    it('marca inexistente: 404; marca inactiva: 409 PADRE_INACTIVO', async () => {
      expect((await admin('POST', '/lineas', { idMarca: 99999999, nombre: 'X' })).status).toBe(404);
      const id = await crearMarca('l-inactiva');
      await admin('PATCH', `/marcas/${id}/estado`, { estado: 'inactivo' });
      const r = await admin('POST', '/lineas', { idMarca: id, nombre: 'X' });
      expect(r.status).toBe(409);
      expect(r.cuerpo.error?.code).toBe('PADRE_INACTIVO');
    });

    it('editar no cambia la marca y puede quitar la gama (null)', async () => {
      const a = await crearMarca('l-ed-a');
      const b = await crearMarca('l-ed-b');
      const linea = dato(await admin('POST', '/lineas', { idMarca: a, nombre: 'L', gamaComercial: 'Alta' })).idLinea;
      const r = await admin('PUT', `/lineas/${linea}`, { idMarca: b, gamaComercial: null });
      expect(r.cuerpo.data).toMatchObject({ idMarca: a, gamaComercial: null, nombre: 'L' });
      expect((await admin('PUT', `/lineas/${linea}`, {})).status).toBe(400);
    });

    it('filtra por marca, pagina y reactivar con la marca inactiva es 409 (RF-CAT-09-04)', async () => {
      const idMarca = await crearMarca('l-lista');
      for (const n of ['A', 'B', 'C']) await admin('POST', '/lineas', { idMarca, nombre: n });
      const r = await admin('GET', `/lineas?idMarca=${idMarca}&limite=2&pagina=2`);
      expect(r.cuerpo.pagination).toEqual({ pagina: 2, limite: 2, total: 3, totalPaginas: 2 });
      expect((r.cuerpo.data as Dato[]).length).toBe(1);

      const linea = ((await admin('GET', `/lineas?idMarca=${idMarca}`)).cuerpo.data as Dato[])[0]?.idLinea;
      await admin('PATCH', `/lineas/${linea}/estado`, { estado: 'inactivo' });
      await admin('PATCH', `/marcas/${idMarca}/estado`, { estado: 'inactivo', confirmar: true });
      const re = await admin('PATCH', `/lineas/${linea}/estado`, { estado: 'activo' });
      expect(re.status).toBe(409);
      expect(re.cuerpo.error?.code).toBe('PADRE_INACTIVO');
    });

    it('desactivar una línea con productos visibles pide confirmación', async () => {
      const idMarca = await crearMarca('l-prod');
      const linea = dato(await admin('POST', '/lineas', { idMarca, nombre: 'L' })).idLinea as number;
      const cat = await prisma.categoria.create({ data: { nombre: `${PREFIJO}-cat-l` } });
      const sub = await prisma.subcategoria.create({ data: { idCategoria: cat.idCategoria, nombre: 'S' } });
      await prisma.producto.create({
        data: { idMarca, idLinea: linea, idSubcategoria: sub.idSubcategoria, nombre: `${PREFIJO}-prod-l`, publicado: true },
      });
      const r = await admin('PATCH', `/lineas/${linea}/estado`, { estado: 'inactivo' });
      expect(r.status).toBe(409);
      expect(r.cuerpo.error?.details).toMatchObject({ productos: 1 });
    });
  });

  /* ─── Catálogos pequeños ─── */
  describe.each([
    { ruta: 'superficies', cuerpo: (n: string) => ({ nombre: n, orden: 3 }), conOrden: true },
    { ruta: 'tipos-resina', cuerpo: (n: string) => ({ nombre: n }), conOrden: false },
    { ruta: 'acabados', cuerpo: (n: string) => ({ nombre: n, orden: 3 }), conOrden: true },
    { ruta: 'bases', cuerpo: (n: string) => ({ nombre: n, orden: 3 }), conOrden: true },
    { ruta: 'familias-color', cuerpo: (n: string) => ({ nombre: n, hexadecimal: '#abcdef', orden: 3 }), conOrden: true },
    { ruta: 'tipos-medida', cuerpo: (n: string) => ({ nombre: n, abreviatura: `z${ALEATORIO}${++contadorAbreviatura}` }), conOrden: false },
  ])('catálogo pequeño /$ruta', ({ ruta, cuerpo, conOrden }) => {
    const nombre = (s: string): string => `${PREFIJO}-${ruta}-${s}`.slice(0, 50);

    it('crea, lista completo (sin paginar) y rechaza un duplicado sin distinguir mayúsculas', async () => {
      const crear = await admin('POST', `/${ruta}`, cuerpo(nombre('a')));
      expect(crear.status).toBe(201);
      const lista = await admin('GET', `/${ruta}`);
      expect(lista.status).toBe(200);
      expect(lista.cuerpo.pagination).toBeUndefined();
      expect((lista.cuerpo.data as Dato[]).some((e) => e.nombre === nombre('a'))).toBe(true);
      const dup = await admin('POST', `/${ruta}`, { ...cuerpo(nombre('a')), nombre: `  ${nombre('a').toUpperCase()} `, abreviatura: `y${ALEATORIO}` });
      expect(dup.status).toBe(409);
      expect(dup.cuerpo.error?.code).toBe('NOMBRE_DUPLICADO');
    });

    it('valida: nombre vacío, id inválido, cuerpo de edición vacío', async () => {
      expect((await admin('POST', `/${ruta}`, { ...cuerpo(nombre('v')), nombre: '  ' })).status).toBe(400);
      expect((await admin('PUT', `/${ruta}/abc`, { nombre: 'x' })).status).toBe(400);
      const creado = dato(await admin('POST', `/${ruta}`, cuerpo(nombre('v')))) as Dato;
      const id = Object.entries(creado).find(([k]) => k.startsWith('id'))?.[1];
      expect((await admin('PUT', `/${ruta}/${id}`, {})).status).toBe(400);
      expect((await admin('PUT', `/${ruta}/99999999`, { nombre: 'x' })).status).toBe(404);
    });

    it('edita, desactiva, reactiva y exige el permiso correcto', async () => {
      const creado = dato(await admin('POST', `/${ruta}`, cuerpo(nombre('e')))) as Dato;
      const id = Object.entries(creado).find(([k]) => k.startsWith('id'))?.[1];
      const ed = await admin('PUT', `/${ruta}/${id}`, { nombre: nombre('e2') });
      expect(ed.cuerpo.data).toMatchObject({ nombre: nombre('e2') });
      if (conOrden) {
        expect((await admin('PUT', `/${ruta}/${id}`, { orden: 9 })).cuerpo.data).toMatchObject({ nombre: nombre('e2'), orden: 9 });
      }
      expect((await servidor.peticion('editor', 'PATCH', `/${ruta}/${id}/estado`, { estado: 'inactivo' })).status).toBe(404);
      expect((await admin('PATCH', `/${ruta}/${id}/estado`, { estado: 'inactivo' })).cuerpo.data).toMatchObject({ estado: 'inactivo' });
      expect((await servidor.peticion('editor', 'PATCH', `/${ruta}/${id}/estado`, { estado: 'activo' })).status).toBe(200);
      expect((await admin('GET', `/${ruta}/${id}/impacto-desactivacion`)).status).toBe(200);
    });

    it('un lector no puede crear', async () => {
      expect((await servidor.peticion('lector', 'POST', `/${ruta}`, cuerpo(nombre('l')))).status).toBe(404);
    });
  });

  describe('reglas propias de los catálogos pequeños', () => {
    it('el acabado Brillante no se renombra ni se desactiva (R11)', async () => {
      const brillante = (await prisma.acabado.findFirstOrThrow({ where: { nombre: 'Brillante' } })).idAcabado;
      try {
        const renombrar = await admin('PUT', `/acabados/${brillante}`, { nombre: 'Lustroso' });
        expect(renombrar.status).toBe(409);
        expect(renombrar.cuerpo.error?.code).toBe('ACABADO_PROTEGIDO');
        const desactivar = await admin('PATCH', `/acabados/${brillante}/estado`, { estado: 'inactivo', confirmar: true });
        expect(desactivar.status).toBe(409);
        expect(desactivar.cuerpo.error?.code).toBe('ACABADO_PROTEGIDO');
        expect((await prisma.acabado.findUniqueOrThrow({ where: { idAcabado: brillante } })).estado).toBe('activo');
        // Cambiar solo mayúsculas del mismo nombre es válido.
        expect((await admin('PUT', `/acabados/${brillante}`, { nombre: 'BRILLANTE', orden: 1 })).status).toBe(200);
      } finally {
        // El seed no debe quedar alterado aunque la prueba falle.
        await prisma.acabado.update({ where: { idAcabado: brillante }, data: { nombre: 'Brillante', estado: 'activo' } });
      }
    });

    it('la familia guarda el hexadecimal en mayúsculas y rechaza uno inválido (R13)', async () => {
      const r = await admin('POST', '/familias-color', { nombre: `${PREFIJO}-hex`, hexadecimal: '#abcdef' });
      expect(r.cuerpo.data).toMatchObject({ hexadecimal: '#ABCDEF' });
      expect((await admin('POST', '/familias-color', { nombre: `${PREFIJO}-hex2`, hexadecimal: 'rojo' })).status).toBe(400);
    });

    it('seguridad de datos: una base del seed no se puede duplicar (Tint)', async () => {
      const r = await admin('POST', '/bases', { nombre: 'tint' });
      expect(r.status).toBe(409);
    });

    it('tipo de medida: abreviatura única, equivalencia opcional y mayor que 0 (D6)', async () => {
      const abre = `u${ALEATORIO}`;
      const ok = await admin('POST', '/tipos-medida', { nombre: `${PREFIJO}-tm`, abreviatura: abre, equivalenciaGalones: 0.5 });
      expect(ok.cuerpo.data).toMatchObject({ abreviatura: abre, equivalenciaGalones: 0.5 });
      const dup = await admin('POST', '/tipos-medida', { nombre: `${PREFIJO}-tm2`, abreviatura: abre.toUpperCase() });
      expect(dup.status).toBe(409);
      expect((await admin('POST', '/tipos-medida', { nombre: `${PREFIJO}-tm3`, abreviatura: 'q', equivalenciaGalones: 0 })).status).toBe(400);
      const sin = await admin('POST', '/tipos-medida', { nombre: `${PREFIJO}-tm4`, abreviatura: `v${ALEATORIO}` });
      expect(sin.cuerpo.data).toMatchObject({ equivalenciaGalones: null });
      const id = dato(ok).idTipoMedida;
      expect((await admin('PUT', `/tipos-medida/${id}`, { equivalenciaGalones: null })).cuerpo.data).toMatchObject({ equivalenciaGalones: null });
    });

    it('desactivar un tipo de medida desactiva sus medidas y pide confirmación si hay variantes (R5, R6)', async () => {
      const tipo = dato(await admin('POST', '/tipos-medida', { nombre: `${PREFIJO}-tm-casc`, abreviatura: `c${ALEATORIO}` })).idTipoMedida as number;
      const medida = dato(await admin('POST', '/medidas', { idTipoMedida: tipo, valor: 3 })).idMedida as number;
      const cat = await prisma.categoria.create({ data: { nombre: `${PREFIJO}-cat-tm` } });
      const sub = await prisma.subcategoria.create({ data: { idCategoria: cat.idCategoria, nombre: 'S' } });
      const prod = await prisma.producto.create({ data: { idMarca: 1, idSubcategoria: sub.idSubcategoria, nombre: `${PREFIJO}-prod-tm` } });
      await prisma.variante.create({ data: { idProducto: prod.idProducto, idMedida: medida, sku: `${PREFIJO}-SKU`, precioVigente: 1 } });

      const sin = await admin('PATCH', `/tipos-medida/${tipo}/estado`, { estado: 'inactivo' });
      expect(sin.status).toBe(409);
      expect(sin.cuerpo.error?.details).toMatchObject({ variantes: 1 });
      await admin('PATCH', `/tipos-medida/${tipo}/estado`, { estado: 'inactivo', confirmar: true });
      expect((await prisma.medida.findUniqueOrThrow({ where: { idMedida: medida } })).estado).toBe('inactivo');
      await prisma.variante.deleteMany({ where: { sku: `${PREFIJO}-SKU` } });
    });
  });

  /* ─── Medidas ─── */
  describe('medidas (R3, R8, R12)', () => {
    async function crearTipo(sufijo: string, abreviatura: string): Promise<number> {
      const r = await admin('POST', '/tipos-medida', { nombre: `${PREFIJO}-t-${sufijo}`, abreviatura });
      expect(r.status).toBe(201);
      return dato(r).idTipoMedida as number;
    }

    it('genera el nombre con la abreviatura si no se envía (R12)', async () => {
      const tipo = await crearTipo('m1', `m${ALEATORIO}`);
      const r = await admin('POST', '/medidas', { idTipoMedida: tipo, valor: 0.25 });
      expect(r.status).toBe(201);
      expect(r.cuerpo.data).toMatchObject({ idTipoMedida: tipo, valor: 0.25, nombre: `0.25 m${ALEATORIO}` });
    });

    it('respeta el nombre escrito a mano', async () => {
      const tipo = await crearTipo('m2', `n${ALEATORIO}`);
      const r = await admin('POST', '/medidas', { idTipoMedida: tipo, valor: 0.25, nombre: `${PREFIJO}-un cuarto` });
      expect(r.cuerpo.data).toMatchObject({ nombre: `${PREFIJO}-un cuarto` });
    });

    it('rechaza el mismo valor en el mismo tipo, y un nombre repetido', async () => {
      const tipo = await crearTipo('m3', `o${ALEATORIO}`);
      expect((await admin('POST', '/medidas', { idTipoMedida: tipo, valor: 5 })).status).toBe(201);
      const dup = await admin('POST', '/medidas', { idTipoMedida: tipo, valor: 5, nombre: `${PREFIJO}-otro` });
      expect(dup.status).toBe(409);
      const nombreDup = await admin('POST', '/medidas', { idTipoMedida: tipo, valor: 6, nombre: `5 O${ALEATORIO}` });
      expect(nombreDup.status).toBe(409);
    });

    it('valor 0 o negativo: 400; tipo inexistente: 404; tipo inactivo: 409', async () => {
      const tipo = await crearTipo('m4', `p${ALEATORIO}`);
      expect((await admin('POST', '/medidas', { idTipoMedida: tipo, valor: 0 })).status).toBe(400);
      expect((await admin('POST', '/medidas', { idTipoMedida: tipo, valor: -1 })).status).toBe(400);
      expect((await admin('POST', '/medidas', { idTipoMedida: 99999999, valor: 1 })).status).toBe(404);
      await admin('PATCH', `/tipos-medida/${tipo}/estado`, { estado: 'inactivo' });
      const r = await admin('POST', '/medidas', { idTipoMedida: tipo, valor: 1 });
      expect(r.status).toBe(409);
      expect(r.cuerpo.error?.code).toBe('PADRE_INACTIVO');
    });

    it('editar el valor regenera el nombre generado, pero respeta uno manual', async () => {
      const tipo = await crearTipo('m5', `q${ALEATORIO}`);
      const auto = dato(await admin('POST', '/medidas', { idTipoMedida: tipo, valor: 1 })).idMedida;
      expect((await admin('PUT', `/medidas/${auto}`, { valor: 2 })).cuerpo.data).toMatchObject({ valor: 2, nombre: `2 q${ALEATORIO}` });
      const manual = dato(await admin('POST', '/medidas', { idTipoMedida: tipo, valor: 7, nombre: `${PREFIJO}-siete` })).idMedida;
      expect((await admin('PUT', `/medidas/${manual}`, { valor: 8 })).cuerpo.data).toMatchObject({ valor: 8, nombre: `${PREFIJO}-siete` });
      expect((await admin('PUT', `/medidas/${manual}`, { valor: 2 })).status).toBe(409);
      expect((await admin('PUT', `/medidas/${auto}`, {})).status).toBe(400);
    });

    it('lista paginada filtrando por tipo; reactivar con el tipo inactivo es 409', async () => {
      const tipo = await crearTipo('m6', `r${ALEATORIO}`);
      for (const v of [1, 2, 3]) await admin('POST', '/medidas', { idTipoMedida: tipo, valor: v });
      const r = await admin('GET', `/medidas?idTipoMedida=${tipo}&limite=2`);
      expect(r.cuerpo.pagination).toEqual({ pagina: 1, limite: 2, total: 3, totalPaginas: 2 });
      const id = (r.cuerpo.data as Dato[])[0]?.idMedida;
      await admin('PATCH', `/medidas/${id}/estado`, { estado: 'inactivo' });
      await admin('PATCH', `/tipos-medida/${tipo}/estado`, { estado: 'inactivo', confirmar: true });
      const re = await admin('PATCH', `/medidas/${id}/estado`, { estado: 'activo' });
      expect(re.status).toBe(409);
      expect(re.cuerpo.error?.code).toBe('PADRE_INACTIVO');
    });
  });
});
