import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fechaBogota } from '../services/fechas';
import type { NombreActor, ServidorPrueba } from './helpers/servidor-prueba';

/**
 * M14 · espacios publicitarios y medición (contrato, secciones B y M) contra PostgreSQL real, por HTTP. Se activa con
 * `M01_TEST_DATABASE_URL`; sin ella se omite (CI sin base de datos).
 */
const URL_BD = process.env.M01_TEST_DATABASE_URL;
const ALEATORIO = Math.random().toString(36).slice(2, 8);
const PREFIJO = `ZZ-ANU-${ALEATORIO}`;
const NAVEGADOR = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

interface Dato {
  [clave: string]: unknown;
}

const dia = (desplazamiento: number): string => fechaBogota(new Date(Date.now() + desplazamiento * 24 * 3600_000));
const AYER = dia(-1);
const HOY = dia(0);
const MANANA = dia(1);
const EN_UNA_SEMANA = dia(7);
const HACE_UNA_SEMANA = dia(-7);

async function imagen(ancho: number, alto: number, formato: 'jpeg' | 'png' | 'webp' = 'jpeg') {
  const bytes = await sharp({ create: { width: ancho, height: alto, channels: 3, background: '#d81b60' } })[formato]().toBuffer();
  return { imagenBase64: bytes.toString('base64'), imagenMimeType: `image/${formato}` as const };
}

describe.skipIf(URL_BD === undefined)('M14 · anuncios y medición (HTTP + PostgreSQL)', () => {
  let servidor: ServidorPrueba;
  let prisma: (typeof import('../../../core/db/client'))['prisma'];
  const auditoria = { registrarAccesoDenegado: vi.fn() };
  const ids: Record<NombreActor, number> = { admin: 0, lector: 0, catalogo: 0 };
  let img: Record<'inicio' | 'catalogo' | 'movil', Awaited<ReturnType<typeof imagen>>>;

  const admin = (metodo: 'GET' | 'POST' | 'PUT' | 'PATCH', ruta: string, cuerpo?: unknown) =>
    servidor.admin('admin', metodo, ruta, cuerpo);
  const dato = (r: { cuerpo: { data?: unknown } }): Dato => r.cuerpo.data as Dato;
  const lista = (r: { cuerpo: { data?: unknown } }): Dato[] => r.cuerpo.data as Dato[];
  const nombre = (sufijo: string): string => `${PREFIJO} ${sufijo}`;

  const cuerpo = (extra: Dato = {}): Dato => ({
    nombre: nombre('Banner'),
    anunciante: 'Pintuco',
    espacio: 'inicio',
    textoAlternativo: 'Koraza protege tu fachada',
    enlace: 'https://pintuco.com/koraza',
    fechaInicio: AYER,
    fechaFin: EN_UNA_SEMANA,
    orden: 0,
    imagen: img.inicio,
    imagenMovil: null,
    ...extra,
  });

  const crear = async (extra: Dato = {}): Promise<Dato> => {
    const r = await admin('POST', '/anuncios', cuerpo(extra));
    expect(r.status, JSON.stringify(r.cuerpo.error)).toBe(201);
    return dato(r);
  };

  /** Anuncio con imágenes mínimas, directo en la base (para fijar fechas y estados sin pasar por el procesamiento). */
  const anuncioEnBd = async (
    sufijo: string,
    sobre: { espacio?: 'inicio' | 'catalogo' | 'ficha'; fechaInicio?: string; fechaFin?: string; estado?: 'activo' | 'inactivo'; orden?: number; enlace?: string | null } = {},
  ): Promise<number> => {
    const a = await prisma.anuncioPublicitario.create({
      data: {
        nombre: nombre(sufijo),
        anunciante: 'Directo',
        espacio: sobre.espacio ?? 'inicio',
        textoAlternativo: 'Texto alternativo',
        enlace: sobre.enlace === undefined ? 'https://pintuco.com/x' : sobre.enlace,
        estado: sobre.estado ?? 'activo',
        fechaInicio: new Date(`${sobre.fechaInicio ?? AYER}T00:00:00.000Z`),
        fechaFin: new Date(`${sobre.fechaFin ?? EN_UNA_SEMANA}T00:00:00.000Z`),
        orden: sobre.orden ?? 0,
      },
    });
    for (const tamano of ['original', 'mediano', 'pequeno'] as const) {
      await prisma.anuncioImagen.create({
        data: { idAnuncio: a.idAnuncio, variante: 'escritorio', tamano, contenido: Buffer.from('x'), mimeType: 'image/webp', ancho: 10, alto: 10 },
      });
    }
    return a.idAnuncio;
  };

  const totales = async (entidad: 'campania' | 'anuncio', idEntidad: number) => {
    const filas = await prisma.medicionPatrocinio.findMany({ where: { entidad, idEntidad } });
    const suma = (evento: 'impresion' | 'clic') => filas.filter((f) => f.evento === evento).reduce((a, f) => a + Number(f.total), 0);
    return { impresiones: suma('impresion'), clics: suma('clic'), filas };
  };

  const ir = (id: number, init: RequestInit = {}) =>
    servidor.crudo(`/anuncios/${id}/ir`, { headers: { 'user-agent': NAVEGADOR }, ...init });

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_BD ?? '';
    ({ prisma } = await import('../../../core/db/client.js'));
    const usuario = async (rol: string): Promise<number> =>
      (await prisma.usuario.create({ data: { nombre: `Persona ${rol} ${ALEATORIO}`, correo: `${rol}-${ALEATORIO}@m14a.test`, contrasena: 'x' } })).idUsuario;
    ids.admin = await usuario('admin');
    ids.lector = await usuario('lector');
    ids.catalogo = await usuario('catalogo');
    const { levantarServidor } = await import('./helpers/servidor-prueba.js');
    // Un tope holgado: las pruebas comparten origen y el tope de 60 por minuto se prueba aparte, con su propio servidor.
    const { LimitadorPorMinuto } = await import('../services/limitador.js');
    servidor = await levantarServidor(auditoria, ids, undefined, new LimitadorPorMinuto(100_000));
    img = { inicio: await imagen(1232, 280), catalogo: await imagen(1232, 200), movil: await imagen(800, 600, 'png') };
  });

  const limpiar = async () => {
    const anuncios = await prisma.anuncioPublicitario.findMany({ where: { nombre: { contains: PREFIJO } }, select: { idAnuncio: true } });
    const idsA = anuncios.map((a) => a.idAnuncio);
    await prisma.medicionPatrocinio.deleteMany({ where: { entidad: 'anuncio', idEntidad: { in: idsA } } });
    await prisma.anuncioPublicitario.deleteMany({ where: { idAnuncio: { in: idsA } } });
    const campanias = await prisma.campaniaPatrocinio.findMany({ where: { nombre: { startsWith: PREFIJO } }, select: { idCampania: true } });
    const idsC = campanias.map((c) => c.idCampania);
    await prisma.medicionPatrocinio.deleteMany({ where: { entidad: 'campania', idEntidad: { in: idsC } } });
    await prisma.campaniaPatrocinio.deleteMany({ where: { idCampania: { in: idsC } } });
  };

  beforeEach(limpiar);

  afterAll(async () => {
    await limpiar();
    await prisma.usuario.deleteMany({ where: { idUsuario: { in: Object.values(ids) } } });
    await servidor.cerrar();
    await prisma.$disconnect();
  });

  describe('permisos propios (C1)', () => {
    it('sin sesión o con `catalogo.*` la administración responde 404 y se audita', async () => {
      expect((await servidor.admin(null, 'GET', '/anuncios')).status).toBe(404);
      auditoria.registrarAccesoDenegado.mockClear();
      const r = await servidor.admin('catalogo', 'GET', '/anuncios');
      expect([r.status, r.cuerpo.error?.code]).toEqual([404, 'RECURSO_NO_DISPONIBLE']);
      expect(auditoria.registrarAccesoDenegado).toHaveBeenCalled();
      expect((await servidor.admin('catalogo', 'POST', '/anuncios', cuerpo())).status).toBe(404);
      expect((await servidor.admin('catalogo', 'GET', '/medicion/resumen')).status).toBe(404);
    });

    it('`patrocinios.ver` consulta anuncios, imágenes y medición pero no escribe', async () => {
      const id = await anuncioEnBd('Existente');
      expect((await servidor.admin('lector', 'GET', '/anuncios')).status).toBe(200);
      expect((await servidor.admin('lector', 'GET', `/anuncios/${id}`)).status).toBe(200);
      expect((await servidor.adminCrudo('lector', `/anuncios/${id}/imagen`)).status).toBe(200);
      expect((await servidor.admin('lector', 'GET', '/medicion/resumen')).status).toBe(200);
      expect((await servidor.adminCrudo('lector', '/medicion/exportar')).status).toBe(200);
      expect((await servidor.admin('lector', 'POST', '/anuncios', cuerpo())).status).toBe(404);
      expect((await servidor.admin('lector', 'PUT', `/anuncios/${id}`, cuerpo())).status).toBe(404);
      expect((await servidor.admin('lector', 'PATCH', `/anuncios/${id}/estado`, { estado: 'inactivo' })).status).toBe(404);
    });
  });

  describe('alta, detalle y edición (B1–B3, B6–B9)', () => {
    it('crea un anuncio con su imagen de escritorio y lo devuelve con vista previa y situación', async () => {
      const a = await crear({ orden: 3 });
      expect(a).toMatchObject({
        nombre: nombre('Banner'), anunciante: 'Pintuco', espacio: 'inicio', estado: 'activo', situacion: 'vigente',
        enlace: 'https://pintuco.com/koraza', orden: 3, tieneImagenMovil: false, urlImagenMovil: null,
        actualizadoPor: `Persona admin ${ALEATORIO}`,
      });
      expect(a.urlImagen).toMatch(new RegExp(`^/api/v1/admin/patrocinios/anuncios/${String(a.idAnuncio)}/imagen\\?variante=escritorio&v=\\d+$`));
      const filas = await prisma.anuncioImagen.findMany({ where: { idAnuncio: a.idAnuncio as number }, orderBy: { tamano: 'asc' } });
      expect(filas.map((f) => [f.variante, f.tamano, f.mimeType, f.ancho])).toEqual([
        ['escritorio', 'original', 'image/jpeg', 1232],
        ['escritorio', 'mediano', 'image/webp', 1232],
        ['escritorio', 'pequeno', 'image/webp', 640],
      ]);
    });

    it('con imagen móvil guarda las tres versiones de cada una', async () => {
      const a = await crear({ imagenMovil: img.movil });
      expect(a).toMatchObject({ tieneImagenMovil: true });
      expect(String(a.urlImagenMovil)).toContain('variante=movil');
      expect(await prisma.anuncioImagen.count({ where: { idAnuncio: a.idAnuncio as number } })).toBe(6);
    });

    it('la situación sale de las fechas: programado, vigente y vencido', async () => {
      const programado = await crear({ nombre: nombre('Prog'), fechaInicio: MANANA, fechaFin: EN_UNA_SEMANA });
      const vencido = await crear({ nombre: nombre('Venc'), fechaInicio: HACE_UNA_SEMANA, fechaFin: AYER });
      const ultimoDia = await crear({ nombre: nombre('Ultimo'), fechaInicio: AYER, fechaFin: HOY });
      expect([programado.situacion, vencido.situacion, ultimoDia.situacion]).toEqual(['programado', 'vencido', 'vigente']);
    });

    it('rechaza una imagen con otra forma que la del espacio (400 con la medida recomendada) y no guarda nada', async () => {
      const r = await admin('POST', '/anuncios', cuerpo({ espacio: 'inicio', imagen: img.catalogo }));
      expect([r.status, r.cuerpo.error?.code]).toEqual([400, 'IMAGEN_PROPORCION_INVALIDA']);
      expect(r.cuerpo.error?.message).toContain('1232×280');
      expect(await prisma.anuncioPublicitario.count({ where: { nombre: { startsWith: PREFIJO } } })).toBe(0);
    });

    it('cada espacio pide su propia forma: la de catálogo sirve en catálogo y en ficha', async () => {
      expect((await admin('POST', '/anuncios', cuerpo({ nombre: nombre('Cat'), espacio: 'catalogo', imagen: img.catalogo }))).status).toBe(201);
      expect((await admin('POST', '/anuncios', cuerpo({ nombre: nombre('Fic'), espacio: 'ficha', imagen: img.catalogo }))).status).toBe(201);
      const r = await admin('POST', '/anuncios', cuerpo({ nombre: nombre('Mal'), espacio: 'ficha', imagen: img.inicio }));
      expect(r.cuerpo.error?.code).toBe('IMAGEN_PROPORCION_INVALIDA');
    });

    it('rechaza una imagen pequeña (IMAGEN_TAMANO_INVALIDO), una móvil de escritorio y un archivo que no es imagen', async () => {
      const pequena = await admin('POST', '/anuncios', cuerpo({ imagen: await imagen(616, 140) }));
      expect(pequena.cuerpo.error?.code).toBe('IMAGEN_TAMANO_INVALIDO');
      const movilMala = await admin('POST', '/anuncios', cuerpo({ imagenMovil: img.inicio }));
      expect(movilMala.cuerpo.error?.code).toBe('IMAGEN_PROPORCION_INVALIDA');
      const falsa = await admin('POST', '/anuncios', cuerpo({ imagen: { imagenBase64: Buffer.from('<svg/>').toString('base64'), imagenMimeType: 'image/png' } }));
      expect([falsa.status, falsa.cuerpo.error?.code]).toEqual([400, 'IMAGEN_INVALIDA']);
      expect(await prisma.anuncioPublicitario.count({ where: { nombre: { startsWith: PREFIJO } } })).toBe(0);
    });

    it('valida los campos: texto alternativo, fechas, espacio y enlaces peligrosos (B6, B9)', async () => {
      const mal = async (extra: Dato) => (await admin('POST', '/anuncios', cuerpo(extra))).cuerpo.error?.code;
      expect(await mal({ textoAlternativo: 'ab' })).toBe('PARAMETRO_INVALIDO');
      expect(await mal({ fechaInicio: EN_UNA_SEMANA, fechaFin: AYER })).toBe('PARAMETRO_INVALIDO');
      expect(await mal({ espacio: 'carrito' })).toBe('PARAMETRO_INVALIDO');
      for (const enlace of ['http://pintuco.com', 'javascript:alert(1)', '//evil.com', '/\\evil.com', 'data:text/html,x']) {
        expect(await mal({ enlace }), enlace).toBe('PARAMETRO_INVALIDO');
      }
      expect(await prisma.anuncioPublicitario.count({ where: { nombre: { startsWith: PREFIJO } } })).toBe(0);
    });

    it('un anuncio puede no tener enlace (la imagen no es clicable)', async () => {
      const a = await crear({ enlace: null });
      expect(a.enlace).toBeNull();
    });

    it('guarda el enlace normalizado', async () => {
      const a = await crear({ enlace: 'https://pintuco.com/baño' });
      expect(a.enlace).toBe('https://pintuco.com/ba%C3%B1o');
    });

    it('editar conserva las imágenes que no vienen, cambia los campos y no cambia el espacio (B2)', async () => {
      const a = await crear({ imagenMovil: img.movil });
      const id = a.idAnuncio as number;
      const antes = await prisma.anuncioImagen.count({ where: { idAnuncio: id } });
      const r = await admin('PUT', `/anuncios/${id}`, {
        nombre: nombre('Editado'), anunciante: 'Otro', textoAlternativo: 'Nuevo texto', enlace: '/productos/5',
        fechaInicio: MANANA, fechaFin: EN_UNA_SEMANA, orden: 9, espacio: 'ficha',
      });
      expect(r.status, JSON.stringify(r.cuerpo.error)).toBe(200);
      expect(dato(r)).toMatchObject({ nombre: nombre('Editado'), anunciante: 'Otro', espacio: 'inicio', enlace: '/productos/5', situacion: 'programado', orden: 9, tieneImagenMovil: true });
      expect(await prisma.anuncioImagen.count({ where: { idAnuncio: id } })).toBe(antes);
    });

    it('editar puede reemplazar la imagen (validada contra el espacio del anuncio) y quitar la móvil', async () => {
      const a = await crear({ imagenMovil: img.movil });
      const id = a.idAnuncio as number;
      const campos = { nombre: nombre('Banner'), anunciante: 'Pintuco', textoAlternativo: 'Koraza protege tu fachada', enlace: null, fechaInicio: AYER, fechaFin: EN_UNA_SEMANA, orden: 0 };
      const mala = await admin('PUT', `/anuncios/${id}`, { ...campos, imagen: img.catalogo });
      expect(mala.cuerpo.error?.code).toBe('IMAGEN_PROPORCION_INVALIDA');
      const nueva = await imagen(2464, 560, 'webp');
      const ok = await admin('PUT', `/anuncios/${id}`, { ...campos, imagen: nueva, quitarImagenMovil: true });
      expect(dato(ok)).toMatchObject({ tieneImagenMovil: false, urlImagenMovil: null });
      const filas = await prisma.anuncioImagen.findMany({ where: { idAnuncio: id } });
      expect(filas.filter((f) => f.variante === 'movil')).toHaveLength(0);
      expect(filas.find((f) => f.variante === 'escritorio' && f.tamano === 'original')).toMatchObject({ mimeType: 'image/webp', ancho: 2464 });
      expect(filas.find((f) => f.variante === 'escritorio' && f.tamano === 'mediano')?.ancho).toBe(1232);
    });

    it('no se puede quitar y subir la imagen móvil a la vez', async () => {
      const a = await crear();
      const r = await admin('PUT', `/anuncios/${String(a.idAnuncio)}`, { nombre: nombre('X'), anunciante: 'Pintuco', textoAlternativo: 'Texto', enlace: null, fechaInicio: AYER, fechaFin: HOY, imagenMovil: img.movil, quitarImagenMovil: true });
      expect(r.cuerpo.error?.code).toBe('PARAMETRO_INVALIDO');
    });

    it('activar y desactivar cambia el estado; no hay DELETE', async () => {
      const id = (await crear()).idAnuncio as number;
      expect(dato(await admin('PATCH', `/anuncios/${id}/estado`, { estado: 'inactivo' }))).toMatchObject({ estado: 'inactivo', situacion: 'inactivo' });
      expect(dato(await admin('PATCH', `/anuncios/${id}/estado`, { estado: 'activo' }))).toMatchObject({ estado: 'activo', situacion: 'vigente' });
      const borrar = await fetch(`http://127.0.0.1:1/`, { method: 'DELETE' }).catch(() => null);
      expect(borrar).toBeNull();
    });

    it('un id que no existe o no es válido responde 404 / 400', async () => {
      expect((await admin('GET', '/anuncios/2000000000')).status).toBe(404);
      expect((await admin('PATCH', '/anuncios/2000000000/estado', { estado: 'inactivo' })).status).toBe(404);
      expect((await admin('PUT', '/anuncios/2000000000', { nombre: nombre('Z'), anunciante: 'Pintuco', textoAlternativo: 'Texto', enlace: null, fechaInicio: AYER, fechaFin: HOY })).status).toBe(404);
      expect((await admin('GET', '/anuncios/abc')).status).toBe(400);
    });

    it('la lista pagina y filtra por espacio, situación y texto', async () => {
      await anuncioEnBd('Uno', { espacio: 'inicio' });
      await anuncioEnBd('Dos', { espacio: 'catalogo' });
      await anuncioEnBd('Tres', { espacio: 'catalogo', fechaFin: AYER, fechaInicio: HACE_UNA_SEMANA });
      await anuncioEnBd('Cuatro', { espacio: 'ficha', estado: 'inactivo' });
      const nombres = (r: { cuerpo: { data?: unknown } }) => lista(r).map((a) => a.nombre).filter((n) => String(n).startsWith(PREFIJO));
      expect(nombres(await admin('GET', `/anuncios?busqueda=${PREFIJO}&limite=100`))).toHaveLength(4);
      expect(nombres(await admin('GET', `/anuncios?busqueda=${PREFIJO}&espacio=catalogo&limite=100`))).toHaveLength(2);
      expect(nombres(await admin('GET', `/anuncios?busqueda=${PREFIJO}&situacion=vencido&limite=100`))).toEqual([nombre('Tres')]);
      expect(nombres(await admin('GET', `/anuncios?busqueda=${PREFIJO}&situacion=inactivo&limite=100`))).toEqual([nombre('Cuatro')]);
      expect(nombres(await admin('GET', `/anuncios?busqueda=${PREFIJO.toLowerCase()}%20uno&limite=100`))).toEqual([nombre('Uno')]);
      const p = await admin('GET', `/anuncios?busqueda=${PREFIJO}&limite=3&pagina=2`);
      expect([lista(p).length, (p.cuerpo.pagination as Dato).total]).toEqual([1, 4]);
    });

    it('la vista previa del panel sirve la imagen aunque el anuncio esté vencido o apagado', async () => {
      const id = await anuncioEnBd('Vencido', { fechaFin: AYER, fechaInicio: HACE_UNA_SEMANA, estado: 'inactivo' });
      const r = await servidor.adminCrudo('admin', `/anuncios/${id}/imagen?variante=escritorio&tamano=pequeno`);
      expect([r.status, r.headers.get('content-type')]).toEqual([200, 'image/webp']);
      expect((await servidor.adminCrudo('admin', `/anuncios/${id}/imagen?variante=movil`)).status).toBe(404);
      expect((await servidor.adminCrudo(null, `/anuncios/${id}/imagen`)).status).toBe(404);
    });

    it('sube dos imágenes de 5 MB en el mismo JSON sin que el límite del cuerpo lo corte (el servicio decide)', async () => {
      // Dos «imágenes» de 5 MB que no son imágenes: llegan al servicio (400 IMAGEN_INVALIDA), no se cortan con 413.
      const grande = { imagenBase64: Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(5 * 1024 * 1024 - 3)]).toString('base64'), imagenMimeType: 'image/jpeg' };
      const r = await admin('POST', '/anuncios', cuerpo({ imagen: grande, imagenMovil: grande }));
      expect([r.status, r.cuerpo.error?.code]).toEqual([400, 'IMAGEN_INVALIDA']);
    });
  });

  describe('entrega pública: slider e imágenes (B4, B7)', () => {
    it('solo salen los anuncios vigentes del espacio, por orden y luego por id, sin la dirección real', async () => {
      const c = await anuncioEnBd('C', { orden: 2 });
      const a = await anuncioEnBd('A', { orden: 1 });
      const b = await anuncioEnBd('B', { orden: 1 });
      await anuncioEnBd('Apagado', { estado: 'inactivo', orden: 0 });
      await anuncioEnBd('Vencido', { fechaFin: AYER, fechaInicio: HACE_UNA_SEMANA, orden: 0 });
      await anuncioEnBd('Programado', { fechaInicio: MANANA, orden: 0 });
      await anuncioEnBd('OtroEspacio', { espacio: 'ficha', orden: 0 });
      const r = await servidor.publico('/anuncios/inicio');
      expect(r.status).toBe(200);
      const propios = lista(r).filter((x) => [a, b, c].includes(x.idAnuncio as number));
      expect(propios.map((x) => x.idAnuncio)).toEqual([a, b, c]);
      expect(JSON.stringify(r.cuerpo)).not.toContain('pintuco.com');
      expect(propios[0]).toMatchObject({
        textoAlternativo: 'Texto alternativo', urlClic: `/api/v1/patrocinios/anuncios/${a}/ir`, abrirEnNuevaPestana: true, urlImagenMovil: null,
      });
    });

    it('muestra como máximo 10 anuncios', async () => {
      for (let i = 0; i < 12; i += 1) await anuncioEnBd(`Muchos${i}`, { espacio: 'ficha', orden: i });
      expect(lista(await servidor.publico('/anuncios/ficha'))).toHaveLength(10);
    });

    it('un espacio sin anuncios responde lista vacía (la pantalla no lo pinta); un espacio que no existe, 400', async () => {
      await prisma.anuncioPublicitario.updateMany({ where: { espacio: 'catalogo' }, data: { estado: 'inactivo' } }).catch(() => null);
      expect((await servidor.publico('/anuncios/carrito')).status).toBe(400);
      expect((await servidor.publico('/anuncios/catalogo')).status).toBe(200);
    });

    it('sirve la imagen de un anuncio vigente en cada tamaño y variante, y 404 si no está vigente', async () => {
      const a = await crear({ imagenMovil: img.movil });
      const id = a.idAnuncio as number;
      const pedir = (q: string) => servidor.crudo(`/anuncios/imagenes/${id}${q}`);
      const mediano = await pedir('?variante=escritorio&tamano=mediano');
      expect([mediano.status, mediano.headers.get('content-type'), mediano.headers.get('x-content-type-options')]).toEqual([200, 'image/webp', 'nosniff']);
      expect(mediano.headers.get('cache-control')).toContain('public');
      expect((await sharp(Buffer.from(await mediano.arrayBuffer())).metadata()).width).toBe(1232);
      const pequeno = await pedir('?tamano=pequeno');
      expect((await sharp(Buffer.from(await pequeno.arrayBuffer())).metadata()).width).toBe(640);
      const original = await pedir('?tamano=original');
      expect(original.headers.get('content-type')).toBe('image/jpeg');
      const movil = await pedir('?variante=movil&tamano=pequeno');
      expect([movil.status, (await sharp(Buffer.from(await movil.arrayBuffer())).metadata()).width]).toEqual([200, 640]);
      await admin('PATCH', `/anuncios/${id}/estado`, { estado: 'inactivo' });
      expect((await pedir('?tamano=mediano')).status).toBe(404);
    });

    it('la imagen móvil de un anuncio que no la tiene y un id inexistente dan 404', async () => {
      const id = (await crear()).idAnuncio as number;
      expect((await servidor.crudo(`/anuncios/imagenes/${id}?variante=movil`)).status).toBe(404);
      expect((await servidor.crudo('/anuncios/imagenes/2000000000')).status).toBe(404);
      expect((await servidor.crudo('/anuncios/imagenes/abc')).status).toBe(400);
      expect((await servidor.crudo(`/anuncios/imagenes/${id}?tamano=enorme`)).status).toBe(400);
    });
  });

  describe('clic por redirección (M2)', () => {
    it('cuenta el clic y responde 302 a la dirección guardada', async () => {
      const id = await anuncioEnBd('Clic', { enlace: 'https://pintuco.com/koraza' });
      const r = await ir(id);
      expect([r.status, r.headers.get('location'), r.headers.get('cache-control')]).toEqual([302, 'https://pintuco.com/koraza', 'no-store']);
      await ir(id);
      const t = await totales('anuncio', id);
      expect([t.clics, t.impresiones]).toEqual([2, 0]);
      expect(t.filas[0]).toMatchObject({ lugar: 'inicio', fecha: expect.any(Date) as Date });
    });

    it('una ruta interna redirige a la misma ruta, en el mismo sitio', async () => {
      const id = await anuncioEnBd('Interno', { enlace: '/productos/5' });
      const r = await ir(id);
      expect([r.status, r.headers.get('location')]).toEqual([302, '/productos/5']);
    });

    it('el destino jamás sale de la petición: parámetros y cabeceras no lo cambian (no es redirector abierto)', async () => {
      const id = await anuncioEnBd('Abierto', { enlace: 'https://pintuco.com/koraza' });
      for (const extra of ['?url=https://evil.com', '?destino=//evil.com', '?next=/\\evil.com']) {
        const r = await servidor.crudo(`/anuncios/${id}/ir${extra}`, { headers: { 'user-agent': NAVEGADOR, host: 'evil.com', 'x-forwarded-host': 'evil.com', referer: 'https://evil.com' } });
        expect(r.headers.get('location')).toBe('https://pintuco.com/koraza');
      }
    });

    it('un enlace inseguro que llegara a la base (cargado a mano) manda al inicio y no cuenta', async () => {
      // La base ya rechaza `//…`, `javascript:` y `http://` (ck_anuncio_enlace); lo que se le escapa es la barra invertida.
      for (const enlace of ['/\\evil.com', '/ok\u0001x']) {
        const id = await anuncioEnBd('Sucio', { enlace });
        const r = await ir(id);
        expect([r.status, r.headers.get('location')], enlace).toEqual([302, '/']);
        expect((await totales('anuncio', id)).clics).toBe(0);
      }
    });

    it('si el anuncio no existe, está apagado, vencido, programado o sin enlace: 302 al inicio, sin contar y sin error', async () => {
      const casos = [
        await anuncioEnBd('Apagado', { estado: 'inactivo' }),
        await anuncioEnBd('Vencido', { fechaFin: AYER, fechaInicio: HACE_UNA_SEMANA }),
        await anuncioEnBd('Programado', { fechaInicio: MANANA }),
        await anuncioEnBd('SinEnlace', { enlace: null }),
        2_000_000_000,
      ];
      for (const id of casos) {
        const r = await ir(id);
        expect([r.status, r.headers.get('location')], String(id)).toEqual([302, '/']);
        expect((await totales('anuncio', id)).clics).toBe(0);
      }
      const invalido = await servidor.crudo('/anuncios/abc/ir');
      expect([invalido.status, invalido.headers.get('location')]).toEqual([302, '/']);
    });

    it('no cuenta a los robots, a quien no se identifica ni las vistas previas (HEAD), pero los lleva a su destino', async () => {
      const id = await anuncioEnBd('Robots', { enlace: 'https://pintuco.com/koraza' });
      for (const agente of ['Googlebot/2.1', 'facebookexternalhit/1.1', 'curl/8.4.0']) {
        const r = await servidor.crudo(`/anuncios/${id}/ir`, { headers: { 'user-agent': agente } });
        expect([r.status, r.headers.get('location')]).toEqual([302, 'https://pintuco.com/koraza']);
      }
      expect((await servidor.crudo(`/anuncios/${id}/ir`, { headers: { 'user-agent': '' } })).status).toBe(302);
      expect((await servidor.crudo(`/anuncios/${id}/ir`, { method: 'HEAD', headers: { 'user-agent': NAVEGADOR } })).status).toBe(302);
      expect((await totales('anuncio', id)).clics).toBe(0);
    });

    it('cada clic suma en el día de Colombia, sin guardar ningún dato de quien lo hizo', async () => {
      const id = await anuncioEnBd('Privacidad');
      await ir(id);
      const columnas = await prisma.$queryRaw<Array<{ column_name: string }>>`SELECT column_name FROM information_schema.columns WHERE table_name = 'medicion_patrocinio'`;
      expect(columnas.map((c) => c.column_name).sort()).toEqual(['entidad', 'evento', 'fecha', 'id_entidad', 'lugar', 'total']);
      const t = await totales('anuncio', id);
      expect((t.filas[0]?.fecha as Date).toISOString().slice(0, 10)).toBe(HOY);
    });

    it('muchos clics a la vez suman todos (sin carreras)', async () => {
      const id = await anuncioEnBd('Carrera');
      // Los de un mismo origen se topan con el límite por minuto (M6): se prueba con el contador de la base directo.
      const { MedicionRepository } = await import('../repositories/medicion.repository.js');
      const repo = new MedicionRepository();
      await Promise.all(Array.from({ length: 25 }, () => repo.sumar(HOY, [{ entidad: 'anuncio', idEntidad: id, lugar: 'inicio', evento: 'clic', total: 1 }])));
      expect((await totales('anuncio', id)).clics).toBe(25);
    });
  });

  describe('avisos de la pantalla (M3-M6)', () => {
    const campaniaVigente = async (sufijo: string, extra: { estado?: 'activo' | 'inactivo'; fechaFin?: string; ubicaciones?: Array<'listado' | 'inicio' | 'complementarios'> } = {}) => {
      const marca = await prisma.marca.findFirst({ select: { idMarca: true } });
      const c = await prisma.campaniaPatrocinio.create({
        data: {
          nombre: nombre(sufijo), fechaInicio: new Date(`${AYER}T00:00:00.000Z`), fechaFin: new Date(`${extra.fechaFin ?? EN_UNA_SEMANA}T00:00:00.000Z`),
          prioridad: 1, estado: extra.estado ?? 'activo', ubicaciones: extra.ubicaciones ?? ['inicio', 'listado'],
          objetivos: { create: marca === null ? [] : [{ tipo: 'marca', idReferencia: marca.idMarca }] },
        },
      });
      return c.idCampania;
    };
    const avisar = (eventos: unknown, agente = NAVEGADOR) => servidor.publicoPost('/medicion', { eventos }, { 'user-agent': agente });

    it('registra impresiones de anuncios y de campañas y clics de campañas, y responde 204 sin cuerpo', async () => {
      const anuncio = await anuncioEnBd('Visto', { espacio: 'catalogo' });
      const campania = await campaniaVigente('Vista');
      const r = await avisar([
        { entidad: 'anuncio', tipo: 'impresion', id: anuncio },
        { entidad: 'campania', tipo: 'impresion', id: campania, ubicacion: 'inicio' },
        { entidad: 'campania', tipo: 'clic', id: campania, ubicacion: 'listado' },
      ]);
      expect([r.status, r.texto]).toEqual([204, '']);
      expect((await totales('anuncio', anuncio)).filas.map((f) => [f.lugar, f.evento, Number(f.total)])).toEqual([['catalogo', 'impresion', 1]]);
      const t = await totales('campania', campania);
      expect(t.filas.map((f) => [f.lugar, f.evento, Number(f.total)]).sort()).toEqual([['inicio', 'impresion', 1], ['listado', 'clic', 1]]);
    });

    it('avisos repetidos se suman, también entre envíos', async () => {
      const campania = await campaniaVigente('Repetida');
      const e = { entidad: 'campania', tipo: 'impresion', id: campania, ubicacion: 'inicio' };
      await avisar([e, e]);
      await avisar([e]);
      expect((await totales('campania', campania)).impresiones).toBe(3);
    });

    it('ignora con 204 lo que no existe, está apagado, vencido o no tiene esa ubicación (M5)', async () => {
      const apagada = await campaniaVigente('Apagada', { estado: 'inactivo' });
      const vencida = await campaniaVigente('Vencida', { fechaFin: AYER });
      const otraUbicacion = await campaniaVigente('Otra', { ubicaciones: ['listado'] });
      const anuncioApagado = await anuncioEnBd('AnuncioApagado', { estado: 'inactivo' });
      const anuncioVencido = await anuncioEnBd('AnuncioVencido', { fechaFin: AYER, fechaInicio: HACE_UNA_SEMANA });
      const r = await avisar([
        { entidad: 'campania', tipo: 'impresion', id: apagada, ubicacion: 'inicio' },
        { entidad: 'campania', tipo: 'clic', id: vencida, ubicacion: 'inicio' },
        { entidad: 'campania', tipo: 'impresion', id: otraUbicacion, ubicacion: 'inicio' },
        { entidad: 'campania', tipo: 'impresion', id: 2_000_000_000, ubicacion: 'inicio' },
        { entidad: 'anuncio', tipo: 'impresion', id: anuncioApagado },
        { entidad: 'anuncio', tipo: 'impresion', id: anuncioVencido },
        { entidad: 'anuncio', tipo: 'impresion', id: 2_000_000_000 },
      ]);
      expect(r.status).toBe(204);
      for (const [entidad, id] of [['campania', apagada], ['campania', vencida], ['campania', otraUbicacion], ['anuncio', anuncioApagado], ['anuncio', anuncioVencido]] as const) {
        expect((await totales(entidad, id)).filas, `${entidad} ${id}`).toHaveLength(0);
      }
    });

    it('un aviso mal formado responde 400; un clic de anuncio no se admite por aquí (lo cuenta la redirección)', async () => {
      const anuncio = await anuncioEnBd('SinClicAqui');
      expect((await avisar([])).status).toBe(400);
      expect((await avisar([{ entidad: 'anuncio', tipo: 'clic', id: anuncio }])).status).toBe(400);
      expect((await avisar(Array.from({ length: 21 }, () => ({ entidad: 'anuncio', tipo: 'impresion', id: anuncio })))).status).toBe(400);
      expect((await servidor.publicoPost('/medicion', { cosa: 1 })).status).toBe(400);
      expect((await totales('anuncio', anuncio)).filas).toHaveLength(0);
    });

    it('no cuenta lo que envía un robot, pero responde 204 igual', async () => {
      const anuncio = await anuncioEnBd('ParaRobot');
      expect((await avisar([{ entidad: 'anuncio', tipo: 'impresion', id: anuncio }], 'Googlebot/2.1')).status).toBe(204);
      expect((await totales('anuncio', anuncio)).filas).toHaveLength(0);
    });

    it('pasado el tope de 60 avisos por minuto de un origen se ignoran, con 204; otro origen sigue contando', async () => {
      const { levantarServidor } = await import('./helpers/servidor-prueba.js');
      const propio = await levantarServidor(auditoria, ids);
      try {
        const anuncio = await anuncioEnBd('Exceso');
        const lote = Array.from({ length: 20 }, () => ({ entidad: 'anuncio', tipo: 'impresion', id: anuncio }));
        const desde = (origen: string, eventos: unknown[]) =>
          propio.publicoPost('/medicion', { eventos }, { 'user-agent': NAVEGADOR, 'x-forwarded-for': origen });
        for (let i = 0; i < 3; i += 1) expect((await desde('203.0.113.7', lote)).status).toBe(204);
        expect((await totales('anuncio', anuncio)).impresiones).toBe(60);
        expect((await desde('203.0.113.7', lote)).status).toBe(204);
        expect((await desde('203.0.113.7', lote.slice(0, 1))).status).toBe(204);
        expect((await totales('anuncio', anuncio)).impresiones).toBe(60);
        // Otro visitante (otra dirección reenviada por el intermediario) tiene su propio tope.
        expect((await desde('203.0.113.8', lote.slice(0, 5))).status).toBe(204);
        expect((await totales('anuncio', anuncio)).impresiones).toBe(65);
      } finally {
        await propio.cerrar();
      }
    });
  });

  describe('informe de medición (M8)', () => {
    const sembrar = async () => {
      const a = await anuncioEnBd('Informe');
      const hoy = new Date(`${HOY}T00:00:00.000Z`);
      const ayer = new Date(`${AYER}T00:00:00.000Z`);
      await prisma.medicionPatrocinio.createMany({
        data: [
          { fecha: ayer, entidad: 'anuncio', idEntidad: a, lugar: 'inicio', evento: 'impresion', total: 200n },
          { fecha: hoy, entidad: 'anuncio', idEntidad: a, lugar: 'inicio', evento: 'impresion', total: 100n },
          { fecha: hoy, entidad: 'anuncio', idEntidad: a, lugar: 'inicio', evento: 'clic', total: 6n },
        ],
      });
      return a;
    };
    const fila = (r: { cuerpo: { data?: unknown } }, id: number) =>
      ((r.cuerpo.data as Dato).filas as Dato[]).find((f) => f.entidad === 'anuncio' && f.id === id);

    it('el resumen suma por anuncio con su CTR y trae el rango usado (por defecto, 30 días hasta hoy)', async () => {
      const id = await sembrar();
      const r = await admin('GET', '/medicion/resumen');
      expect(r.status).toBe(200);
      expect(fila(r, id)).toEqual({ entidad: 'anuncio', id, nombre: nombre('Informe'), impresiones: 300, clics: 6, ctr: 2 });
      expect(dato(r)).toMatchObject({ hasta: HOY, desde: dia(-29) });
    });

    it('incluye también lo que no tuvo movimiento, con CTR nulo', async () => {
      const vacio = await anuncioEnBd('SinMovimiento');
      expect(fila(await admin('GET', '/medicion/resumen'), vacio)).toMatchObject({ impresiones: 0, clics: 0, ctr: null });
    });

    it('filtra por rango y por entidad', async () => {
      const id = await sembrar();
      expect(fila(await admin('GET', `/medicion/resumen?desde=${HOY}&hasta=${HOY}`), id)).toMatchObject({ impresiones: 100, clics: 6, ctr: 6 });
      expect(fila(await admin('GET', `/medicion/resumen?desde=${dia(-20)}&hasta=${dia(-10)}`), id)).toMatchObject({ impresiones: 0, clics: 0 });
      const soloCampanias = await admin('GET', '/medicion/resumen?entidad=campania');
      expect(((soloCampanias.cuerpo.data as Dato).filas as Dato[]).every((f) => f.entidad === 'campania')).toBe(true);
    });

    it('rechaza rangos invertidos o de más de 366 días', async () => {
      expect((await admin('GET', `/medicion/resumen?desde=${HOY}&hasta=${AYER}`)).status).toBe(400);
      expect((await admin('GET', `/medicion/resumen?desde=${dia(-400)}&hasta=${HOY}`)).status).toBe(400);
      expect((await admin('GET', `/medicion/resumen?desde=${dia(-365)}&hasta=${HOY}`)).status).toBe(200);
      expect((await admin('GET', '/medicion/resumen?desde=ayer')).status).toBe(400);
    });

    it('la serie trae un punto por día, con ceros', async () => {
      const id = await sembrar();
      const r = await admin('GET', `/medicion/serie?entidad=anuncio&id=${id}&desde=${dia(-2)}&hasta=${HOY}`);
      expect((dato(r).puntos as Dato[])).toEqual([
        { fecha: dia(-2), impresiones: 0, clics: 0 },
        { fecha: AYER, impresiones: 200, clics: 0 },
        { fecha: HOY, impresiones: 100, clics: 6 },
      ]);
      expect((await admin('GET', '/medicion/serie?entidad=anuncio&id=2000000000')).status).toBe(404);
      expect((await admin('GET', '/medicion/serie?entidad=campania&id=2000000000')).status).toBe(404);
      expect((await admin('GET', '/medicion/serie?entidad=anuncio')).status).toBe(400);
    });

    it('exporta un CSV con «;», BOM UTF-8, encabezado y una fila por día y lugar', async () => {
      const id = await sembrar();
      const r = await servidor.adminCrudo('admin', `/medicion/exportar?entidad=anuncio&desde=${AYER}&hasta=${HOY}`);
      expect([r.status, r.headers.get('content-type')]).toEqual([200, 'text/csv; charset=utf-8']);
      expect(r.headers.get('content-disposition')).toBe(`attachment; filename="medicion-patrocinios-${AYER}_${HOY}.csv"`);
      const bytes = Buffer.from(await r.arrayBuffer());
      expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
      const lineas = bytes.subarray(3).toString('utf8').trimEnd().split('\r\n');
      expect(lineas[0]).toBe('fecha;tipo;id;nombre;lugar;impresiones;clics;ctr_porcentaje');
      expect(lineas.filter((l) => l.includes(`;${id};`))).toEqual([
        `${AYER};anuncio;${id};${nombre('Informe')};inicio;200;0;0`,
        `${HOY};anuncio;${id};${nombre('Informe')};inicio;100;6;6`,
      ]);
    });

    it('un nombre que parece fórmula no se ejecuta al abrir el CSV', async () => {
      const a = await prisma.anuncioPublicitario.create({
        data: { nombre: `=HYPERLINK("x") ${PREFIJO}`, anunciante: 'xx', espacio: 'inicio', textoAlternativo: 'texto', fechaInicio: new Date(`${AYER}T00:00:00Z`), fechaFin: new Date(`${HOY}T00:00:00Z`) },
      });
      await prisma.medicionPatrocinio.create({ data: { fecha: new Date(`${HOY}T00:00:00Z`), entidad: 'anuncio', idEntidad: a.idAnuncio, lugar: 'inicio', evento: 'impresion', total: 1n } });
      const texto = await (await servidor.adminCrudo('admin', `/medicion/exportar?entidad=anuncio&desde=${HOY}&hasta=${HOY}`)).text();
      expect(texto).toContain(`"'=HYPERLINK(""x"") ${PREFIJO}"`);
      expect(texto).not.toMatch(/;=HYPERLINK/);
    });
  });
});
