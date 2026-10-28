import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ASPECTO_MOVIL,
  UMBRAL_DESLIZAR,
  aspectoEscritorio,
  atributosEnlace,
  conTamano,
  hayImagenMovil,
  indiceAnterior,
  indiceSiguiente,
  indiceTrasDeslizar,
  srcSetDe,
} from '../services/anuncios-publico';
import { aCuerpoActualizarAnuncio, aCuerpoCrearAnuncio, borradorAnuncioVacio, parsearOrden, type BorradorAnuncio } from '../services/anuncios-form';
import { ayudaDeImagen, problemaDeImagen, proporcionDeVista, type ImagenElegida } from '../services/imagenes';
import { avisarMedicion, claveImpresion, reiniciarMedicionCliente } from '../services/medicion-cliente';
import { medicionApi } from '../services/patrocinios-api';
import { formatearCtr, porcentajeDeBarra } from '../components/MedicionView';

const anuncio = (sobre: Partial<Parameters<typeof hayImagenMovil>[0][number]> = {}) => ({
  idAnuncio: 1,
  textoAlternativo: 'Koraza',
  urlClic: '/api/v1/patrocinios/anuncios/1/ir',
  abrirEnNuevaPestana: true,
  urlImagen: '/api/v1/patrocinios/anuncios/imagenes/1?variante=escritorio&v=5',
  urlImagenMovil: null,
  focoEscritorio: { x: 50, y: 50 },
  focoMovil: { x: 50, y: 50 },
  ...sobre,
});

describe('ayudas del slider público', () => {
  it('pide la versión reducida que corresponde sin perder los parámetros', () => {
    expect(conTamano('/img/1?variante=escritorio&v=5', 'pequeno')).toBe('/img/1?variante=escritorio&v=5&tamano=pequeno');
    expect(conTamano('/img/1', 'mediano')).toBe('/img/1?tamano=mediano');
    expect(srcSetDe('/img/1?v=5')).toBe('/img/1?v=5&tamano=pequeno 640w, /img/1?v=5&tamano=mediano 1232w');
  });

  it('reserva la proporción de cada espacio', () => {
    expect(aspectoEscritorio('inicio')).toBe('1232 / 280');
    expect(aspectoEscritorio('catalogo')).toBe('1232 / 200');
    expect(aspectoEscritorio('ficha')).toBe('1232 / 200');
    expect(ASPECTO_MOVIL).toBe('4 / 3');
  });

  it('detecta si algún anuncio trae imagen móvil', () => {
    expect(hayImagenMovil([anuncio(), anuncio({ idAnuncio: 2 })])).toBe(false);
    expect(hayImagenMovil([anuncio(), anuncio({ idAnuncio: 2, urlImagenMovil: '/m' })])).toBe(true);
    expect(hayImagenMovil([])).toBe(false);
  });

  it('el índice da la vuelta en los dos sentidos', () => {
    expect([indiceSiguiente(0, 3), indiceSiguiente(2, 3), indiceAnterior(0, 3), indiceAnterior(2, 3)]).toEqual([1, 0, 2, 1]);
    expect([indiceSiguiente(0, 0), indiceAnterior(0, 0), indiceSiguiente(0, 1)]).toEqual([0, 0, 0]);
  });

  it('deslizar: a la izquierda avanza, a la derecha retrocede, y ni un toque corto ni un gesto vertical cuentan (B12)', () => {
    expect(indiceTrasDeslizar(0, 3, -80, 5)).toBe(1);
    expect(indiceTrasDeslizar(0, 3, 80, 5)).toBe(2);
    expect(indiceTrasDeslizar(1, 3, -(UMBRAL_DESLIZAR - 1), 0)).toBe(1);
    expect(indiceTrasDeslizar(1, 3, -UMBRAL_DESLIZAR, 0)).toBe(2);
    // Un gesto sobre todo vertical es para desplazar la página, no para pasar el anuncio.
    expect(indiceTrasDeslizar(1, 3, -60, 120)).toBe(1);
    expect(indiceTrasDeslizar(0, 1, -80, 0)).toBe(0);
  });

  it('un enlace externo abre en pestaña nueva con sponsored noopener noreferrer; uno interno, en la misma (B6)', () => {
    expect(atributosEnlace({ abrirEnNuevaPestana: true })).toEqual({ target: '_blank', rel: 'sponsored noopener noreferrer' });
    expect(atributosEnlace({ abrirEnNuevaPestana: false })).toEqual({ target: '_self', rel: 'sponsored' });
  });
});

describe('imágenes del anuncio: sin forma ni tamaño obligatorios, con punto de enfoque (B8, B13)', () => {
  it('ya no se rechaza por proporción ni por tamaño mínimo: cuadradas, verticales y pequeñas sirven', () => {
    for (const [ancho] of [[1232], [2464], [1500], [800], [320], [100]] as const) {
      expect(problemaDeImagen('escritorio', ancho)).toBeNull();
      expect(problemaDeImagen('movil', ancho)).toBeNull();
    }
  });

  it('solo se avisa cuando pasa del tope de ancho de seguridad (8000 px)', () => {
    expect(problemaDeImagen('escritorio', 8000)).toBeNull();
    expect(problemaDeImagen('escritorio', 8001)).toContain('máximo es 8000');
    expect(problemaDeImagen('movil', 9000)).toContain('imagen móvil');
  });

  it('la vista previa usa la proporción real del espacio y 4:3 en el celular', () => {
    expect(proporcionDeVista('escritorio', 'inicio')).toBeCloseTo(1232 / 280);
    expect(proporcionDeVista('escritorio', 'catalogo')).toBeCloseTo(1232 / 200);
    expect(proporcionDeVista('movil', 'ficha')).toBeCloseTo(4 / 3);
  });

  it('la ayuda ya no pide una medida, solo tipo y peso', () => {
    expect(ayudaDeImagen('escritorio')).toContain('cualquier forma');
    expect(ayudaDeImagen('escritorio')).not.toMatch(/Recomendada|Mínimo/);
    expect(ayudaDeImagen('movil')).toContain('celular');
  });
});

const imagenElegida = (): ImagenElegida => ({
  imagenBase64: 'AAAA',
  imagenMimeType: 'image/jpeg',
  nombreArchivo: 'a.jpg',
  ancho: 1232,
  alto: 280,
  vistaPrevia: 'data:image/jpeg;base64,AAAA',
});

const borrador = (sobre: Partial<BorradorAnuncio> = {}): BorradorAnuncio => ({
  ...borradorAnuncioVacio('2026-10-26'),
  nombre: 'Banner Pintuco',
  anunciante: 'Pintuco',
  textoAlternativo: 'Koraza protege tu fachada',
  enlace: 'https://pintuco.com/koraza',
  imagen: imagenElegida(),
  ...sobre,
});

describe('formulario de anuncios', () => {
  it('un anuncio nuevo empieza hoy, dura 30 días y va al inicio', () => {
    expect(borradorAnuncioVacio('2026-10-26')).toMatchObject({ espacio: 'inicio', fechaInicio: '2026-10-26', fechaFin: '2026-11-24', orden: '0' });
  });

  it('crea el cuerpo del contrato con la imagen de escritorio y sin móvil', () => {
    const r = aCuerpoCrearAnuncio(borrador({ enlace: '' }));
    expect(r.ok && r.valor).toMatchObject({
      nombre: 'Banner Pintuco', espacio: 'inicio', enlace: null, orden: 0, imagenMovil: null,
      imagen: { imagenBase64: 'AAAA', imagenMimeType: 'image/jpeg' },
    });
  });

  it('explica en español cada falta', () => {
    const mensaje = (b: Partial<BorradorAnuncio>) => {
      const r = aCuerpoCrearAnuncio(borrador(b));
      return r.ok ? null : r.mensaje;
    };
    expect(mensaje({ nombre: 'ab' })).toContain('nombre del anuncio');
    expect(mensaje({ anunciante: '' })).toContain('anunciante');
    expect(mensaje({ textoAlternativo: '' })).toContain('texto alternativo');
    expect(mensaje({ enlace: 'http://pintuco.com' })).toContain('https://');
    expect(mensaje({ fechaFin: '2026-10-01' })).toContain('fecha fin');
    expect(mensaje({ orden: 'x' })).toContain('orden');
    expect(mensaje({ imagen: null })).toContain('imagen del anuncio');
    expect(mensaje({ enlace: 'javascript:alert(1)' })).toContain('enlace');
  });

  it('al editar, sin imagen nueva el cuerpo no trae imágenes (se conservan) y quitar la móvil viaja aparte', () => {
    const sin = aCuerpoActualizarAnuncio(borrador({ imagen: null }));
    expect(sin.ok && 'imagen' in sin.valor).toBe(false);
    expect(sin.ok && sin.valor.quitarImagenMovil).toBe(false);
    const quita = aCuerpoActualizarAnuncio(borrador({ imagen: null, quitarImagenMovil: true }));
    expect(quita.ok && quita.valor.quitarImagenMovil).toBe(true);
    const con = aCuerpoActualizarAnuncio(borrador({ imagenMovil: imagenElegida() }));
    expect(con.ok && con.valor.imagenMovil).toEqual({ imagenBase64: 'AAAA', imagenMimeType: 'image/jpeg' });
  });

  it('el punto de enfoque empieza en el centro y viaja en el cuerpo de crear y de editar (B8)', () => {
    expect(borradorAnuncioVacio('2026-10-26')).toMatchObject({ focoEscritorio: { x: 50, y: 50 }, focoMovil: { x: 50, y: 50 } });
    const conFoco = { focoEscritorio: { x: 20, y: 80 }, focoMovil: { x: 0, y: 100 } };
    const crear = aCuerpoCrearAnuncio(borrador(conFoco));
    expect(crear.ok && crear.valor).toMatchObject(conFoco);
    const editar = aCuerpoActualizarAnuncio(borrador({ imagen: null, ...conFoco }));
    expect(editar.ok && editar.valor).toMatchObject(conFoco);
  });

  it('un enfoque fuera de 0 a 100 no pasa el esquema del contrato', () => {
    const r = aCuerpoCrearAnuncio(borrador({ focoEscritorio: { x: 120, y: 50 } }));
    expect(r.ok).toBe(false);
  });

  it('el orden es un entero de 0 a 999', () => {
    expect([parsearOrden(''), parsearOrden('7'), parsearOrden('999'), parsearOrden('1000'), parsearOrden('-1'), parsearOrden('1.5')]).toEqual([0, 7, 999, null, null, null]);
  });
});

describe('informe de medición (pantalla)', () => {
  it('el CTR va con coma decimal y sin impresiones no se calcula', () => {
    expect(formatearCtr(12.5)).toBe('12,5 %');
    expect(formatearCtr(0)).toBe('0 %');
    expect(formatearCtr(null)).toBe('—');
  });

  it('las barras son proporcionales al máximo y un día con movimiento nunca queda invisible', () => {
    expect([porcentajeDeBarra(50, 100), porcentajeDeBarra(100, 100), porcentajeDeBarra(0, 100), porcentajeDeBarra(0, 0)]).toEqual([50, 100, 0, 0]);
    expect(porcentajeDeBarra(1, 10_000)).toBe(3);
  });

  it('la dirección del CSV lleva el rango y la entidad, sin parámetros vacíos', () => {
    expect(medicionApi.urlExportar({ desde: '2026-10-01', hasta: '2026-10-26', entidad: 'anuncio' })).toBe(
      '/api/v1/admin/patrocinios/medicion/exportar?desde=2026-10-01&hasta=2026-10-26&entidad=anuncio',
    );
    expect(medicionApi.urlExportar({})).toBe('/api/v1/admin/patrocinios/medicion/exportar');
  });
});

describe('avisos de medición del navegador (M3, M4)', () => {
  const enviados: Array<{ eventos: unknown[] }> = [];
  let beacon: ReturnType<typeof vi.fn>;
  const escuchas = new Map<string, () => void>();

  beforeEach(() => {
    vi.useFakeTimers();
    enviados.length = 0;
    escuchas.clear();
    reiniciarMedicionCliente();
    beacon = vi.fn((_url: string, blob: Blob) => {
      void blob.text().then((t) => enviados.push(JSON.parse(t) as { eventos: unknown[] }));
      return true;
    });
    vi.stubGlobal('window', { addEventListener: (n: string, f: () => void) => escuchas.set(n, f) });
    vi.stubGlobal('document', { addEventListener: vi.fn(), visibilityState: 'visible' });
    vi.stubGlobal('navigator', { sendBeacon: beacon });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const esperar = async () => {
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(0);
  };

  it('agrupa los avisos de una pantalla en un solo envío por sendBeacon', async () => {
    avisarMedicion({ entidad: 'anuncio', tipo: 'impresion', id: 1 });
    avisarMedicion({ entidad: 'campania', tipo: 'impresion', id: 2, ubicacion: 'inicio' });
    expect(beacon).not.toHaveBeenCalled();
    await esperar();
    expect(beacon).toHaveBeenCalledTimes(1);
    expect(beacon.mock.calls[0]?.[0]).toBe('/api/v1/patrocinios/medicion');
    expect(enviados[0]?.eventos).toHaveLength(2);
  });

  it('cuenta una impresión una sola vez por elemento y carga de página, pero cada clic', async () => {
    const imp = { entidad: 'campania', tipo: 'impresion', id: 2, ubicacion: 'listado' } as const;
    avisarMedicion(imp);
    avisarMedicion(imp);
    avisarMedicion({ ...imp, ubicacion: 'inicio' });
    avisarMedicion({ entidad: 'campania', tipo: 'clic', id: 2, ubicacion: 'listado' });
    avisarMedicion({ entidad: 'campania', tipo: 'clic', id: 2, ubicacion: 'listado' });
    await esperar();
    expect(enviados.flatMap((e) => e.eventos)).toHaveLength(4);
  });

  it('parte los envíos de a 20 avisos (el máximo del contrato)', async () => {
    for (let i = 1; i <= 45; i += 1) avisarMedicion({ entidad: 'anuncio', tipo: 'impresion', id: i });
    await esperar();
    expect(enviados.map((e) => e.eventos.length)).toEqual([20, 20, 5]);
  });

  it('envía lo pendiente al cerrar o cambiar de página', async () => {
    avisarMedicion({ entidad: 'anuncio', tipo: 'impresion', id: 9 });
    escuchas.get('pagehide')?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(beacon).toHaveBeenCalledTimes(1);
  });

  it('si el navegador rechaza sendBeacon usa fetch con keepalive y nunca lanza un error', async () => {
    beacon.mockReturnValue(false);
    const fetchFalso = vi.fn(() => Promise.reject(new Error('sin red')));
    vi.stubGlobal('fetch', fetchFalso);
    avisarMedicion({ entidad: 'anuncio', tipo: 'impresion', id: 3 });
    await esperar();
    expect(fetchFalso).toHaveBeenCalledWith('/api/v1/patrocinios/medicion', expect.objectContaining({ method: 'POST', keepalive: true }));
  });

  it('la clave de una impresión distingue la ubicación de la campaña', () => {
    expect(claveImpresion({ entidad: 'campania', tipo: 'impresion', id: 1, ubicacion: 'inicio' })).not.toBe(
      claveImpresion({ entidad: 'campania', tipo: 'impresion', id: 1, ubicacion: 'listado' }),
    );
  });
});
