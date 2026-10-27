import { describe, expect, it, vi } from 'vitest';
import { UMBRAL_COLOR_CERCANO, type ListarPaletaRequest } from '../dtos/m01-catalogo-paleta.dto';
import type { ColorCatalogo, InstantaneaPaleta, PaletaRepositoryPort } from '../interfaces/paleta.interface';
import { compararColores, normalizarTexto } from '../repositories/paleta.repository';
import { CatalogoError } from '../services/catalogo-base.service';
import { deltaE76, esSinTono, hexAHsl, hexALab, hslAHex, muestrasDeArmonia } from '../services/color-matematica';
import { PaletaService } from '../services/paleta.service';

const hex = (hexadecimal: string, tipo: Parameters<typeof muestrasDeArmonia>[1]): string[] =>
  muestrasDeArmonia(hexadecimal, tipo).map((m) => m.hexadecimal);

describe('matemática del color (P7, P8)', () => {
  it('HSL ida y vuelta conserva el color', () => {
    for (const c of ['#2F6E9E', '#A3161E', '#F7C600', '#1E1E1E', '#FFFFFF', '#000000', '#B8E2C8']) {
      expect(hslAHex(hexAHsl(c))).toBe(c);
    }
  });

  it('los primarios tienen el tono, la saturación y la luminosidad esperados', () => {
    expect(hexAHsl('#FF0000')).toEqual({ h: 0, s: 100, l: 50 });
    expect(hexAHsl('#00FF00').h).toBe(120);
    expect(hexAHsl('#0000FF').h).toBe(240);
    expect(hexAHsl('#808080')).toMatchObject({ s: 0 });
  });

  it('CIELAB con blanco D65: valores de referencia conocidos', () => {
    const blanco = hexALab('#FFFFFF');
    expect([blanco.l, Math.abs(blanco.a), Math.abs(blanco.b)].map((n) => Math.round(n))).toEqual([100, 0, 0]);
    expect(Math.round(hexALab('#000000').l)).toBe(0);
    const rojo = hexALab('#FF0000');
    expect([rojo.l, rojo.a, rojo.b].map((n) => Math.round(n))).toEqual([53, 80, 67]);
  });

  it('ΔE: cero contra sí mismo, simétrica y grande entre colores muy distintos', () => {
    const a = hexALab('#2F6E9E');
    const b = hexALab('#A3161E');
    expect(deltaE76(a, a)).toBe(0);
    expect(deltaE76(a, b)).toBeCloseTo(deltaE76(b, a), 10);
    expect(deltaE76(hexALab('#FFFFFF'), hexALab('#000000'))).toBeCloseTo(100, 0);
    expect(deltaE76(a, b)).toBeGreaterThan(50);
  });

  it('complementario: el tono opuesto', () => {
    expect(hex('#FF0000', 'complementario')).toEqual(['#00FFFF']);
    expect(hex('#0000FF', 'complementario')).toEqual(['#FFFF00']);
  });

  it('análogos: ±30° (en este orden) y tríadico: +120° y +240°', () => {
    expect(hex('#FF0000', 'analogos')).toEqual(['#FF0080', '#FF8000']);
    expect(hex('#FF0000', 'triadico')).toEqual(['#00FF00', '#0000FF']);
  });

  it('monocromático: el mismo tono y saturación con cinco luminosidades de oscuro a claro', () => {
    const muestras = hex('#2F6E9E', 'monocromatico');
    expect(muestras).toHaveLength(5);
    const base = hexAHsl('#2F6E9E');
    const luminosidades = muestras.map((m) => hexAHsl(m).l);
    expect(luminosidades).toEqual([...luminosidades].sort((x, y) => x - y));
    for (const m of muestras) {
      const hsl = hexAHsl(m);
      expect(Math.abs(hsl.h - base.h)).toBeLessThan(3);
    }
  });

  it('un gris no tiene tono: las armonías parten de la luminosidad y se acotan entre 5 y 95', () => {
    expect(esSinTono('#808080')).toBe(true);
    expect(esSinTono('#FFFFFF')).toBe(true);
    expect(esSinTono('#2F6E9E')).toBe(false);
    const l = hexAHsl('#808080').l;
    expect(hexAHsl(hex('#808080', 'complementario')[0] as string).l).toBeCloseTo(100 - l, 0);
    const analogos = hex('#808080', 'analogos').map((m) => hexAHsl(m).l);
    expect(analogos[0]).toBeCloseTo(l - 15, 0);
    expect(analogos[1]).toBeCloseTo(l + 15, 0);
    // Un blanco no se sale de la escala: la luminosidad máxima es 95.
    for (const tipo of ['complementario', 'analogos', 'triadico'] as const) {
      for (const m of hex('#FFFFFF', tipo)) {
        const luz = hexAHsl(m).l;
        expect(luz).toBeGreaterThanOrEqual(4.9);
        expect(luz).toBeLessThanOrEqual(95.1);
      }
    }
  });

  it('el texto de búsqueda ignora tildes y mayúsculas', () => {
    expect(normalizarTexto('  Azul Océano ')).toBe('azul oceano');
  });
});

const color = (id: number, nombre: string, hexadecimal: string, extra: Partial<ColorCatalogo> = {}): ColorCatalogo => ({
  idColor: id,
  nombre,
  codigo: `C-${String(id)}`,
  hexadecimal,
  idMarca: 1,
  marca: 'Pintuco',
  idFamiliaColor: 1,
  familia: 'Azules',
  ordenFamilia: 1,
  acabado: 'Mate',
  lab: hexALab(hexadecimal),
  luminosidad: hexAHsl(hexadecimal).l,
  textoBusqueda: normalizarTexto(`${nombre} C-${String(id)}`),
  ...extra,
});

function snap(colores: ColorCatalogo[], conteos: Record<number, number> = {}): InstantaneaPaleta {
  return {
    colores: [...colores].sort(compararColores),
    productosPorColor: new Map(colores.map((c) => [c.idColor, conteos[c.idColor] ?? 1])),
    familias: [
      { idFamiliaColor: 1, nombre: 'Azules', hexadecimal: '#2F6E9E', orden: 1 },
      { idFamiliaColor: 2, nombre: 'Rojos', hexadecimal: '#A3161E', orden: 2 },
      { idFamiliaColor: 3, nombre: 'Verdes', hexadecimal: '#2E5E3A', orden: 3 },
    ],
  };
}

const peticion = (extra: Partial<ListarPaletaRequest> = {}): ListarPaletaRequest => ({ pagina: 1, limite: 24, ...extra });

const CARTA: ColorCatalogo[] = [
  color(1, 'Azul Cielo', '#9CC9E8'),
  color(2, 'Azul Océano', '#2F6E9E'),
  color(3, 'Azul Marino', '#1F2F55'),
  color(4, 'Rojo Coral', '#E0654F', { idFamiliaColor: 2, familia: 'Rojos', ordenFamilia: 2 }),
  color(5, 'Rojo Carmesí', '#A3161E', { idFamiliaColor: 2, familia: 'Rojos', ordenFamilia: 2 }),
  color(6, 'Verde Bosque', '#2E5E3A', { idFamiliaColor: 3, familia: 'Verdes', ordenFamilia: 3, idMarca: 2, marca: 'Otra' }),
  color(7, 'Sin Familia', '#C9A16A', { idFamiliaColor: null, familia: null, ordenFamilia: null }),
];

function servicio(colores = CARTA, conteos: Record<number, number> = {}) {
  const construir = vi.fn(() => Promise.resolve(snap(colores, conteos)));
  const repo: PaletaRepositoryPort = { construir };
  let t = 1_000;
  const s = new PaletaService(repo, () => t, 60_000);
  return { s, construir, avanzar: (ms: number) => (t += ms) };
}

describe('PaletaService · listar (P1 a P4)', () => {
  it('ordena por familia, de más claro a más oscuro, y deja sin familia al final (P3)', async () => {
    const { s } = servicio();
    const r = await s.listar(peticion());
    expect(r.colores.map((c) => c.nombre)).toEqual([
      'Azul Cielo', 'Azul Océano', 'Azul Marino', 'Rojo Coral', 'Rojo Carmesí', 'Verde Bosque', 'Sin Familia',
    ]);
    expect(r.total).toBe(7);
  });

  it('filtra por familia, por marca y por texto sin tildes ni mayúsculas, combinados con Y', async () => {
    const { s } = servicio();
    expect((await s.listar(peticion({ familia: 2 }))).colores.map((c) => c.idColor)).toEqual([4, 5]);
    expect((await s.listar(peticion({ idMarca: 2 }))).colores.map((c) => c.idColor)).toEqual([6]);
    expect((await s.listar(peticion({ q: 'OCEANO' }))).colores.map((c) => c.idColor)).toEqual([2]);
    expect((await s.listar(peticion({ q: 'c-5' }))).colores.map((c) => c.idColor)).toEqual([5]);
    expect((await s.listar(peticion({ q: 'azul', familia: 2 }))).colores).toEqual([]);
  });

  it('trae el total de productos de cada color (P1)', async () => {
    const { s } = servicio(CARTA, { 2: 7 });
    const r = await s.listar(peticion({ q: 'oceano' }));
    expect(r.colores[0]?.totalProductos).toBe(7);
  });

  it('las familias se cuentan sin el filtro de familia, y las marcas sin el de marca (P2)', async () => {
    const { s } = servicio();
    const r = await s.listar(peticion({ familia: 2 }));
    expect(r.familias.map((f) => [f.nombre, f.total])).toEqual([['Azules', 3], ['Rojos', 2], ['Verdes', 1]]);
    expect(r.marcas.map((m) => [m.nombre, m.total])).toEqual([['Pintuco', 2]]);
    const porMarca = await s.listar(peticion({ idMarca: 1 }));
    expect(porMarca.marcas.map((m) => [m.nombre, m.total])).toEqual([['Otra', 1], ['Pintuco', 6]]);
    // Las familias sí respetan la marca elegida.
    expect(porMarca.familias.map((f) => f.nombre)).toEqual(['Azules', 'Rojos']);
  });

  it('el texto cuenta en las listas de apoyo y los colores sin familia no aparecen como pestaña', async () => {
    const { s } = servicio();
    const r = await s.listar(peticion({ q: 'sin familia' }));
    expect(r.familias).toEqual([]);
    expect(r.colores.map((c) => c.idColor)).toEqual([7]);
  });

  it('pagina el resultado y respeta el total', async () => {
    const { s } = servicio();
    const p1 = await s.listar(peticion({ limite: 3, pagina: 1 }));
    const p3 = await s.listar(peticion({ limite: 3, pagina: 3 }));
    expect(p1.colores).toHaveLength(3);
    expect(p3.colores.map((c) => c.idColor)).toEqual([7]);
    expect(p1.total).toBe(7);
  });

  it('un filtro sin resultados da una lista vacía, no un error', async () => {
    const { s } = servicio();
    const r = await s.listar(peticion({ q: 'zzzz' }));
    expect([r.colores, r.total]).toEqual([[], 0]);
  });
});

describe('PaletaService · memoria de 60 s (P13)', () => {
  it('reconstruye una sola vez dentro de la vigencia y de nuevo al vencer', async () => {
    const { s, construir, avanzar } = servicio();
    await s.listar(peticion());
    await s.listar(peticion({ familia: 1 }));
    await s.armonias(2);
    expect(construir).toHaveBeenCalledTimes(1);
    avanzar(59_000);
    await s.listar(peticion());
    expect(construir).toHaveBeenCalledTimes(1);
    avanzar(2_000);
    await s.listar(peticion());
    expect(construir).toHaveBeenCalledTimes(2);
  });

  it('varias consultas a la vez comparten una sola construcción', async () => {
    const { s, construir } = servicio();
    await Promise.all([s.listar(peticion()), s.listar(peticion()), s.armonias(2)]);
    expect(construir).toHaveBeenCalledTimes(1);
  });

  it('si la construcción falla no deja la memoria envenenada: el siguiente intento reintenta', async () => {
    const construir = vi
      .fn<() => Promise<InstantaneaPaleta>>()
      .mockRejectedValueOnce(new Error('base caída'))
      .mockResolvedValue(snap(CARTA));
    const s = new PaletaService({ construir }, () => 0, 60_000);
    await expect(s.listar(peticion())).rejects.toThrow('base caída');
    expect((await s.listar(peticion())).total).toBe(7);
  });

  it('invalidar fuerza la reconstrucción', async () => {
    const { s, construir } = servicio();
    await s.listar(peticion());
    s.invalidar();
    await s.listar(peticion());
    expect(construir).toHaveBeenCalledTimes(2);
  });
});

describe('PaletaService · armonías (P7, P8)', () => {
  it('trae las cuatro armonías en orden, con el número de muestras de cada una', async () => {
    const { s } = servicio();
    const r = await s.armonias(2);
    expect(r.armonias.map((a) => [a.tipo, a.muestras.length])).toEqual([
      ['complementario', 1], ['analogos', 2], ['triadico', 2], ['monocromatico', 5],
    ]);
    expect(r.color).toMatchObject({ idColor: 2, nombre: 'Azul Océano' });
    expect(r.sinTono).toBe(false);
  });

  it('enlaza cada muestra con el color de la carta más parecido, con su ΔE, y nunca con el elegido', async () => {
    const { s } = servicio();
    const r = await s.armonias(2);
    for (const a of r.armonias) {
      for (const m of a.muestras) {
        if (m.cercano === null) continue;
        expect(m.cercano.idColor).not.toBe(2);
        expect(m.cercano.deltaE).toBeLessThanOrEqual(UMBRAL_COLOR_CERCANO);
        const real = deltaE76(hexALab(m.hexadecimal), hexALab(m.cercano.hexadecimal));
        expect(m.cercano.deltaE).toBeCloseTo(Math.round(real * 10) / 10, 5);
      }
    }
    // El monocromático más claro de un azul medio debe parecerse al azul cielo de la carta.
    const claro = r.armonias[3]?.muestras.at(-1);
    expect(claro?.cercano?.nombre).toBe('Azul Cielo');
  });

  it('solo propone colores de la misma marca', async () => {
    const { s } = servicio();
    const r = await s.armonias(5);
    const ids = r.armonias.flatMap((a) => a.muestras.map((m) => m.cercano?.idColor));
    expect(ids).not.toContain(6);
  });

  it('sin color parecido dentro del umbral, `cercano` es null', async () => {
    const solo = [color(1, 'Azul Océano', '#2F6E9E'), color(2, 'Amarillo Sol', '#F7C600', { idFamiliaColor: 2 })];
    const { s } = servicio(solo);
    const r = await s.armonias(1);
    const complementario = r.armonias[0]?.muestras[0];
    expect(complementario?.cercano).toBeNull();
    expect(complementario?.hexadecimal).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('un gris avisa que no tiene tono', async () => {
    const { s } = servicio([color(50, 'Gris Niebla', '#C9CBCB', { idFamiliaColor: 2 }), ...CARTA.slice(0, 2)]);
    expect((await s.armonias(50)).sinTono).toBe(true);
  });

  it('un color que no se ofrece responde 404 RECURSO_NO_DISPONIBLE', async () => {
    const { s } = servicio();
    const error = await s.armonias(999).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CatalogoError);
    expect(error).toMatchObject({ code: 'RECURSO_NO_DISPONIBLE', status: 404 });
  });

  it('en un empate de distancia gana el de menor id', async () => {
    const colores = [
      color(1, 'Elegido', '#2F6E9E'),
      color(9, 'Gemelo B', '#9CC9E8'),
      color(3, 'Gemelo A', '#9CC9E8'),
    ];
    const { s } = servicio(colores);
    const r = await s.armonias(1);
    const mono = r.armonias[3]?.muestras.at(-1)?.cercano;
    expect(mono?.idColor).toBe(3);
  });
});
