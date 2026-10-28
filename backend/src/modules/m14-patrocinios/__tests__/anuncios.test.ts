import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';
import type {
  AnunciosRepositoryPort,
  CampaniasRepositoryPort,
  FilaAnuncio,
  FilaCampania,
  MedicionRepositoryPort,
  RegistroMedicion,
  SumaMedicion,
} from '../interfaces/patrocinios.interface';
import { AnunciosService } from '../services/anuncios.service';
import { celdaCsv, decimalCsv, filaCsv } from '../services/csv';
import { normalizarEnlace } from '../services/enlace-anuncio';
import { prepararImagen } from '../services/imagen-anuncio';
import { esRobot, LimitadorPorMinuto } from '../services/limitador';
import { MedicionService } from '../services/medicion.service';
import { PatrociniosError } from '../services/patrocinios-error';

/** Una imagen sólida del tamaño pedido, en base64, lista para subir. */
async function imagen(ancho: number, alto: number, formato: 'jpeg' | 'png' | 'webp' = 'jpeg') {
  const base = sharp({ create: { width: ancho, height: alto, channels: 3, background: '#0a5bd8' } });
  const bytes = await base[formato]().toBuffer();
  return { imagenBase64: bytes.toString('base64'), imagenMimeType: `image/${formato}` as const };
}

async function codigoDe(promesa: Promise<unknown>): Promise<string | null> {
  try {
    await promesa;
    return null;
  } catch (e) {
    return e instanceof PatrociniosError ? e.code : `otro:${String(e)}`;
  }
}

describe('normalizarEnlace (B6, M2: no es un redirector abierto)', () => {
  it('admite https y rutas internas', () => {
    expect(normalizarEnlace('https://pintuco.com/koraza?x=1')).toBe('https://pintuco.com/koraza?x=1');
    expect(normalizarEnlace('/productos/5')).toBe('/productos/5');
    expect(normalizarEnlace('/productos?marca=3#top')).toBe('/productos?marca=3#top');
    expect(normalizarEnlace('  /ofertas  ')).toBe('/ofertas');
  });

  it.each([
    ['http plano', 'http://pintuco.com'],
    ['javascript', 'javascript:alert(1)'],
    ['data', 'data:text/html,<script>1</script>'],
    ['mismo protocolo (//)', '//evil.com/x'],
    ['barra invertida que el navegador lee como //', '/\\evil.com'],
    ['barra invertida dentro de https', 'https://pintuco.com\\@evil.com'],
    ['salto de línea', '/ok\r\nSet-Cookie: x=1'],
    ['tabulador', '/\tevil.com'],
    ['vacío', '   '],
    ['relativo sin barra', 'evil.com'],
    ['https sin dominio', 'https://'],
  ])('rechaza %s', (_caso, enlace) => {
    expect(normalizarEnlace(enlace)).toBeNull();
  });

  it('deja la dirección en forma segura para la cabecera Location (acentos codificados)', () => {
    expect(normalizarEnlace('https://pintuco.com/pinturas-de-baño')).toBe('https://pintuco.com/pinturas-de-ba%C3%B1o');
    expect(normalizarEnlace('/pinturas-de-baño')).toBe('/pinturas-de-ba%C3%B1o');
  });
});

describe('prepararImagen (B7, B8, B11, B13)', () => {
  it('guarda el original y las versiones de 640 y 1232 de ancho en WEBP', async () => {
    const p = await prepararImagen(await imagen(1232, 280), 'escritorio');
    expect(p.mimeType).toBe('image/jpeg');
    expect(p.original).toMatchObject({ ancho: 1232, alto: 280 });
    expect(p.mediano).toMatchObject({ ancho: 1232, alto: 280 });
    expect(p.pequeno).toMatchObject({ ancho: 640, alto: 145 });
    for (const reducida of [p.pequeno, p.mediano]) {
      expect((await sharp(reducida.bytes).metadata()).format).toBe('webp');
    }
  });

  it('una imagen del doble (alta densidad) se reduce a 1232 de ancho y no se agranda nunca', async () => {
    const p = await prepararImagen(await imagen(2464, 560), 'escritorio');
    expect([p.original.ancho, p.mediano.ancho, p.pequeno.ancho]).toEqual([2464, 1232, 640]);
    const chica = await prepararImagen(await imagen(900, 300), 'escritorio');
    expect([chica.mediano.ancho, chica.pequeno.ancho]).toEqual([900, 640]);
  });

  it('acepta PNG y WEBP además de JPEG', async () => {
    expect((await prepararImagen(await imagen(1232, 280, 'png'), 'escritorio')).mimeType).toBe('image/png');
    expect((await prepararImagen(await imagen(1232, 280, 'webp'), 'escritorio')).mimeType).toBe('image/webp');
  });

  it('B8: ya no exige proporción ni tamaño mínimo: cuadradas, verticales, panorámicas y chicas entran', async () => {
    for (const [ancho, alto] of [[1500, 1500], [800, 1200], [3000, 400], [320, 240], [100, 100]] as const) {
      const p = await prepararImagen(await imagen(ancho, alto), 'escritorio');
      expect(p.original).toMatchObject({ ancho, alto });
    }
    // La móvil tampoco es de una forma fija.
    expect((await prepararImagen(await imagen(1232, 280), 'movil')).original.ancho).toBe(1232);
  });

  it('B13: solo se rechaza lo que pasa del tope de ancho de seguridad', async () => {
    expect(await codigoDe(prepararImagen(await imagen(8200, 400), 'escritorio'))).toBe('IMAGEN_TAMANO_INVALIDO');
    expect((await prepararImagen(await imagen(8000, 300), 'escritorio')).original.ancho).toBe(8000);
  });

  it('rechaza lo que no es una imagen del tipo declarado (por la firma, no por el nombre)', async () => {
    const png = await imagen(1232, 280, 'png');
    expect(await codigoDe(prepararImagen({ ...png, imagenMimeType: 'image/jpeg' }, 'escritorio'))).toBe('IMAGEN_INVALIDA');
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString('base64');
    expect(await codigoDe(prepararImagen({ imagenBase64: svg, imagenMimeType: 'image/png' }, 'escritorio'))).toBe('IMAGEN_INVALIDA');
    expect(await codigoDe(prepararImagen({ imagenBase64: 'esto no es base64!', imagenMimeType: 'image/png' }, 'escritorio'))).toBe('IMAGEN_INVALIDA');
  });

  it('un archivo con la firma de JPEG pero dañado responde IMAGEN_INVALIDA, no un 500', async () => {
    const dañado = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('basura que no es un jpeg')]);
    expect(await codigoDe(prepararImagen({ imagenBase64: dañado.toString('base64'), imagenMimeType: 'image/jpeg' }, 'escritorio'))).toBe('IMAGEN_INVALIDA');
  });

  it('rechaza más de 5 MB', async () => {
    const grande = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(5 * 1024 * 1024)]);
    expect(await codigoDe(prepararImagen({ imagenBase64: grande.toString('base64'), imagenMimeType: 'image/jpeg' }, 'escritorio'))).toBe('IMAGEN_INVALIDA');
  });
});

describe('LimitadorPorMinuto (M6)', () => {
  it('deja pasar hasta el tope por minuto y bloquea el resto, por origen', () => {
    let t = 1_000_000;
    const l = new LimitadorPorMinuto(60, () => t);
    expect(l.permitir('a', 60)).toBe(true);
    expect(l.permitir('a', 1)).toBe(false);
    expect(l.permitir('b', 1)).toBe(true);
    t += 59_999;
    expect(l.permitir('a', 1)).toBe(false);
    t += 1;
    expect(l.permitir('a', 1)).toBe(true);
  });

  it('un aviso que pasaría del tope se rechaza completo y no consume cupo', () => {
    const l = new LimitadorPorMinuto(60, () => 5);
    expect(l.permitir('a', 50)).toBe(true);
    expect(l.permitir('a', 11)).toBe(false);
    expect(l.permitir('a', 10)).toBe(true);
  });

  it('un solo aviso más grande que el tope nunca pasa', () => {
    expect(new LimitadorPorMinuto(5, () => 0).permitir('a', 6)).toBe(false);
  });
});

describe('esRobot (M6)', () => {
  it.each([
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; bingbot/2.0)',
    'facebookexternalhit/1.1',
    'Mozilla/5.0 AppleWebKit HeadlessChrome/120',
    'curl/8.4.0',
    'WhatsApp/2.23 (link preview)',
    '',
    undefined,
  ])('detecta %s', (agente) => {
    expect(esRobot(agente)).toBe(true);
  });

  it.each([
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36',
  ])('no confunde un navegador de verdad: %s', (agente) => {
    expect(esRobot(agente)).toBe(false);
  });
});

describe('CSV (M8)', () => {
  it('entrecomilla lo que trae separador, comillas o saltos de línea', () => {
    expect(celdaCsv('Hola; mundo')).toBe('"Hola; mundo"');
    expect(celdaCsv('Dice "hola"')).toBe('"Dice ""hola"""');
    expect(celdaCsv('a\nb')).toBe('"a\nb"');
    expect(celdaCsv('simple')).toBe('simple');
    expect(celdaCsv(null)).toBe('');
    expect(celdaCsv(7)).toBe('7');
  });

  it('neutraliza las fórmulas de Excel en los textos', () => {
    expect(celdaCsv('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(celdaCsv('+57 300')).toBe("'+57 300");
    expect(celdaCsv('@suma')).toBe("'@suma");
    expect(celdaCsv('-1+1')).toBe("'-1+1");
  });

  it('la fila usa «;» y el CTR lleva coma decimal', () => {
    expect(filaCsv(['2026-10-01', 'campaña', 3, 'Verano', 'inicio', 10, 2, decimalCsv(20)])).toBe('2026-10-01;campaña;3;Verano;inicio;10;2;20');
    expect(decimalCsv(12.5)).toBe('12,5');
    expect(decimalCsv(null)).toBe('');
  });
});

/* ── Servicios con puertos en memoria ────────────────────────────────────── */

const AHORA = new Date('2026-10-26T15:00:00Z'); // 10:00 en Colombia
const HOY = '2026-10-26';

const campania = (sobre: Partial<FilaCampania> = {}): FilaCampania => ({
  idCampania: 1,
  nombre: 'Verano',
  descripcion: null,
  estado: 'activo',
  fechaInicio: '2026-10-01',
  fechaFin: '2026-10-31',
  prioridad: 10,
  ubicaciones: ['inicio', 'listado'],
  objetivos: [],
  fechaCreacion: AHORA,
  fechaActualizacion: AHORA,
  actualizadoPor: null,
  ...sobre,
});

const anuncio = (sobre: Partial<FilaAnuncio> = {}): FilaAnuncio => ({
  idAnuncio: 1,
  nombre: 'Banner Pintuco',
  anunciante: 'Pintuco',
  espacio: 'inicio',
  textoAlternativo: 'Koraza protege tu fachada',
  enlace: 'https://pintuco.com/koraza',
  estado: 'activo',
  fechaInicio: '2026-10-01',
  fechaFin: '2026-10-31',
  orden: 0,
  focoEscritorio: { x: 50, y: 50 },
  focoMovil: { x: 50, y: 50 },
  tieneImagenMovil: false,
  fechaCreacion: AHORA,
  fechaActualizacion: new Date('2026-10-20T12:00:00Z'),
  actualizadoPor: null,
  ...sobre,
});

function repos(c: FilaCampania[], a: FilaAnuncio[]) {
  const sumas: Array<{ fecha: string; suma: SumaMedicion }> = [];
  let registros: RegistroMedicion[] = [];
  const medicion: MedicionRepositoryPort = {
    sumar: vi.fn((fecha: string, lista: readonly SumaMedicion[]) => {
      for (const suma of lista) sumas.push({ fecha, suma });
      return Promise.resolve();
    }),
    leer: vi.fn((desde: string, hasta: string, f = {}) =>
      Promise.resolve(
        registros.filter(
          (r) =>
            r.fecha >= desde &&
            r.fecha <= hasta &&
            (f.entidad === undefined || r.entidad === f.entidad) &&
            (f.idEntidad === undefined || r.idEntidad === f.idEntidad),
        ),
      ),
    ),
  };
  const campanias = {
    listarTodas: () => Promise.resolve(c),
    obtener: (id: number) => Promise.resolve(c.find((x) => x.idCampania === id) ?? null),
  } as unknown as CampaniasRepositoryPort;
  const anuncios = {
    listarTodos: () => Promise.resolve(a),
    obtener: (id: number) => Promise.resolve(a.find((x) => x.idAnuncio === id) ?? null),
    vigentes: () => Promise.resolve(a),
  } as unknown as AnunciosRepositoryPort;
  return { medicion, campanias, anuncios, sumas, poner: (r: RegistroMedicion[]) => (registros = r) };
}

describe('AnunciosService · clic por redirección (M2) y entrega pública (B4)', () => {
  it('suma un clic y manda a la dirección guardada si el anuncio está vigente', async () => {
    const r = repos([], [anuncio()]);
    const s = new AnunciosService(r.anuncios, r.medicion, () => AHORA);
    expect(await s.resolverClic(1, true)).toBe('https://pintuco.com/koraza');
    expect(r.sumas).toEqual([{ fecha: HOY, suma: { entidad: 'anuncio', idEntidad: 1, lugar: 'inicio', evento: 'clic', total: 1 } }]);
  });

  it('manda al inicio y NO cuenta si no existe, está apagado, vencido, programado o sin enlace', async () => {
    const casos: Array<Partial<FilaAnuncio>> = [
      { estado: 'inactivo' },
      { fechaFin: '2026-10-25' },
      { fechaInicio: '2026-10-27' },
      { enlace: null },
    ];
    for (const caso of casos) {
      const r = repos([], [anuncio(caso)]);
      const s = new AnunciosService(r.anuncios, r.medicion, () => AHORA);
      expect(await s.resolverClic(1, true)).toBe('/');
      expect(r.sumas).toHaveLength(0);
    }
    const r = repos([], []);
    expect(await new AnunciosService(r.anuncios, r.medicion, () => AHORA).resolverClic(99, true)).toBe('/');
  });

  it('sin `contar` (robots, HEAD, exceso) llega al destino pero no suma', async () => {
    const r = repos([], [anuncio()]);
    const s = new AnunciosService(r.anuncios, r.medicion, () => AHORA);
    expect(await s.resolverClic(1, false)).toBe('https://pintuco.com/koraza');
    expect(r.sumas).toHaveLength(0);
  });

  it('si no se pudo contar, el cliente llega igual a su destino', async () => {
    const r = repos([], [anuncio({ enlace: '/productos/5' })]);
    r.medicion.sumar = vi.fn(() => Promise.reject(new Error('base caída')));
    const s = new AnunciosService(r.anuncios, r.medicion, () => AHORA);
    expect(await s.resolverClic(1, true)).toBe('/productos/5');
  });

  it('un enlace inseguro que estuviera guardado nunca se sigue (no es un redirector abierto)', async () => {
    for (const enlace of ['/\\evil.com', '//evil.com', 'javascript:alert(1)', 'http://evil.com']) {
      const r = repos([], [anuncio({ enlace })]);
      expect(await new AnunciosService(r.anuncios, r.medicion, () => AHORA).resolverClic(1, true)).toBe('/');
      expect(r.sumas).toHaveLength(0);
    }
  });

  it('el día del clic es el de Colombia, no el de UTC', async () => {
    const r = repos([], [anuncio()]);
    // 02:30 UTC del 27 = 21:30 del 26 en Colombia.
    await new AnunciosService(r.anuncios, r.medicion, () => new Date('2026-10-27T02:30:00Z')).resolverClic(1, true);
    expect(r.sumas[0]?.fecha).toBe('2026-10-26');
  });

  it('el slider publica la redirección, no la dirección real, y avisa si abre en pestaña nueva', async () => {
    const r = repos([], [
      anuncio({ idAnuncio: 1 }),
      anuncio({ idAnuncio: 2, enlace: '/productos/5', tieneImagenMovil: true }),
      anuncio({ idAnuncio: 3, enlace: null }),
    ]);
    const lista = await new AnunciosService(r.anuncios, r.medicion, () => AHORA).publicos('inicio');
    expect(lista.map((a) => [a.idAnuncio, a.urlClic, a.abrirEnNuevaPestana, a.urlImagenMovil !== null])).toEqual([
      [1, '/api/v1/patrocinios/anuncios/1/ir', true, false],
      [2, '/api/v1/patrocinios/anuncios/2/ir', false, true],
      [3, null, false, false],
    ]);
    expect(JSON.stringify(lista)).not.toContain('pintuco.com');
    expect(lista[0]?.urlImagen).toMatch(/^\/api\/v1\/patrocinios\/anuncios\/imagenes\/1\?variante=escritorio&v=\d+$/);
  });
});

describe('MedicionService · avisos (M3-M5)', () => {
  const servicio = (c: FilaCampania[], a: FilaAnuncio[], reloj: () => Date = () => AHORA) => {
    const r = repos(c, a);
    return { r, s: new MedicionService(r.medicion, r.campanias, r.anuncios, reloj) };
  };

  it('suma impresiones y clics de campañas vigentes y las impresiones de anuncios vigentes', async () => {
    const { r, s } = servicio([campania()], [anuncio({ espacio: 'catalogo' })]);
    await s.registrar([
      { entidad: 'campania', tipo: 'impresion', id: 1, ubicacion: 'inicio' },
      { entidad: 'campania', tipo: 'clic', id: 1, ubicacion: 'listado' },
      { entidad: 'anuncio', tipo: 'impresion', id: 1 },
    ]);
    expect(r.sumas.map((x) => x.suma)).toEqual([
      { entidad: 'campania', idEntidad: 1, lugar: 'inicio', evento: 'impresion', total: 1 },
      { entidad: 'campania', idEntidad: 1, lugar: 'listado', evento: 'clic', total: 1 },
      { entidad: 'anuncio', idEntidad: 1, lugar: 'catalogo', evento: 'impresion', total: 1 },
    ]);
  });

  it('suma los avisos repetidos de un mismo envío en una sola fila', async () => {
    const { r, s } = servicio([campania()], []);
    const e = { entidad: 'campania', tipo: 'impresion', id: 1, ubicacion: 'inicio' } as const;
    await s.registrar([e, e, e]);
    expect(r.sumas).toHaveLength(1);
    expect(r.sumas[0]?.suma.total).toBe(3);
  });

  it('ignora sin error lo inexistente, apagado, vencido, programado o de otra ubicación (M5)', async () => {
    const { r, s } = servicio(
      [
        campania({ idCampania: 1 }),
        campania({ idCampania: 2, estado: 'inactivo' }),
        campania({ idCampania: 3, fechaFin: '2026-10-25' }),
        campania({ idCampania: 4, fechaInicio: '2026-10-27' }),
      ],
      [anuncio({ idAnuncio: 1, estado: 'inactivo' }), anuncio({ idAnuncio: 2, fechaFin: '2026-10-25' })],
    );
    await s.registrar([
      { entidad: 'campania', tipo: 'impresion', id: 2, ubicacion: 'inicio' },
      { entidad: 'campania', tipo: 'impresion', id: 3, ubicacion: 'inicio' },
      { entidad: 'campania', tipo: 'impresion', id: 4, ubicacion: 'inicio' },
      { entidad: 'campania', tipo: 'impresion', id: 99, ubicacion: 'inicio' },
      // La campaña 1 no tiene la ubicación «complementarios».
      { entidad: 'campania', tipo: 'impresion', id: 1, ubicacion: 'complementarios' },
      { entidad: 'anuncio', tipo: 'impresion', id: 1 },
      { entidad: 'anuncio', tipo: 'impresion', id: 2 },
      { entidad: 'anuncio', tipo: 'impresion', id: 99 },
    ]);
    expect(r.sumas).toHaveLength(0);
  });

  it('un clic de campaña en el último día de vigencia (inclusive) cuenta', async () => {
    const { r, s } = servicio([campania({ fechaFin: HOY })], []);
    await s.registrar([{ entidad: 'campania', tipo: 'clic', id: 1, ubicacion: 'inicio' }]);
    expect(r.sumas).toHaveLength(1);
  });
});

describe('MedicionService · informe (M8)', () => {
  const montar = () => {
    const r = repos([campania({ idCampania: 1, nombre: 'Verano' }), campania({ idCampania: 2, nombre: 'Sin movimiento' })], [anuncio({ idAnuncio: 7, nombre: '=SUMA(1)' })]);
    r.poner([
      { fecha: '2026-10-20', entidad: 'campania', idEntidad: 1, lugar: 'inicio', evento: 'impresion', total: 200 },
      { fecha: '2026-10-20', entidad: 'campania', idEntidad: 1, lugar: 'listado', evento: 'impresion', total: 100 },
      { fecha: '2026-10-21', entidad: 'campania', idEntidad: 1, lugar: 'inicio', evento: 'clic', total: 9 },
      { fecha: '2026-10-21', entidad: 'anuncio', idEntidad: 7, lugar: 'inicio', evento: 'impresion', total: 3 },
      { fecha: '2026-10-21', entidad: 'anuncio', idEntidad: 7, lugar: 'inicio', evento: 'clic', total: 1 },
      { fecha: '2025-01-01', entidad: 'anuncio', idEntidad: 7, lugar: 'inicio', evento: 'clic', total: 500 },
    ]);
    return { r, s: new MedicionService(r.medicion, r.campanias, r.anuncios, () => AHORA) };
  };

  it('el rango por defecto son los últimos 30 días que terminan hoy', () => {
    const { s } = montar();
    expect(s.rango({})).toEqual({ desde: '2026-09-27', hasta: HOY });
    expect(s.rango({ hasta: '2026-03-31' })).toEqual({ desde: '2026-03-02', hasta: '2026-03-31' });
    expect(s.rango({ desde: '2026-10-01' })).toEqual({ desde: '2026-10-01', hasta: HOY });
  });

  it('rechaza un rango invertido o de más de 366 días', () => {
    const { s } = montar();
    expect(() => s.rango({ desde: '2026-10-02', hasta: '2026-10-01' })).toThrow(PatrociniosError);
    expect(() => s.rango({ desde: '2025-01-01', hasta: '2026-01-02' })).toThrow(PatrociniosError);
    expect(s.rango({ desde: '2025-10-26', hasta: HOY })).toEqual({ desde: '2025-10-26', hasta: HOY });
  });

  it('el resumen trae una fila por campaña y anuncio, con CTR, e incluye las que no tuvieron movimiento', async () => {
    const { s } = montar();
    const { filas } = await s.resumen({});
    expect(filas).toEqual([
      { entidad: 'anuncio', id: 7, nombre: '=SUMA(1)', impresiones: 3, clics: 1, ctr: 33.33 },
      { entidad: 'campania', id: 1, nombre: 'Verano', impresiones: 300, clics: 9, ctr: 3 },
      { entidad: 'campania', id: 2, nombre: 'Sin movimiento', impresiones: 0, clics: 0, ctr: null },
    ]);
  });

  it('el resumen filtra por entidad y respeta el rango (lo de 2025 no entra)', async () => {
    const { s } = montar();
    expect((await s.resumen({ entidad: 'anuncio' })).filas.map((f) => f.id)).toEqual([7]);
    const anual = await s.resumen({ entidad: 'anuncio', desde: '2025-01-01', hasta: '2025-12-31' });
    expect(anual.filas[0]).toMatchObject({ impresiones: 0, clics: 500, ctr: null });
  });

  it('la serie trae todos los días del rango, con ceros, y 404 si la entidad no existe', async () => {
    const { s } = montar();
    const { puntos } = await s.serie({ entidad: 'campania', id: 1, desde: '2026-10-19', hasta: '2026-10-22' });
    expect(puntos).toEqual([
      { fecha: '2026-10-19', impresiones: 0, clics: 0 },
      { fecha: '2026-10-20', impresiones: 300, clics: 0 },
      { fecha: '2026-10-21', impresiones: 0, clics: 9 },
      { fecha: '2026-10-22', impresiones: 0, clics: 0 },
    ]);
    expect(await codigoDe(s.serie({ entidad: 'campania', id: 99 }))).toBe('RECURSO_NO_DISPONIBLE');
    expect(await codigoDe(s.serie({ entidad: 'anuncio', id: 99 }))).toBe('RECURSO_NO_DISPONIBLE');
  });

  it('las filas del CSV van por día y por lugar, solo con movimiento', async () => {
    const { s } = montar();
    const { filas } = await s.filasDiarias({ desde: '2026-10-20', hasta: '2026-10-21' });
    expect(filas.map((f) => [f.fecha, f.entidad, f.id, f.lugar, f.impresiones, f.clics, f.ctr])).toEqual([
      ['2026-10-20', 'campania', 1, 'inicio', 200, 0, 0],
      ['2026-10-20', 'campania', 1, 'listado', 100, 0, 0],
      ['2026-10-21', 'campania', 1, 'inicio', 0, 9, null],
      ['2026-10-21', 'anuncio', 7, 'inicio', 3, 1, 33.33],
    ]);
  });
});
