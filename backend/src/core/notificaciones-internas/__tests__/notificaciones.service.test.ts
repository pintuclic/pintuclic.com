import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import ts from 'typescript';
import { TIPOS_NOTIFICACION, type TipoNotificacion } from '../fp02-notificaciones.dto';
import type { NotificacionesRepositoryPort, PublicacionFilas } from '../notificaciones.interface';
import { NotificacionNoDisponibleError, NotificacionesInternasService, componerEnlace, componerTexto } from '../notificaciones.service';

const RAIZ = resolve(__dirname, '../../../../../');

function cuerpo(texto: string): string {
  return texto
    .replace(/^import[\s\S]*?;\s*$/gm, '')
    .replace(/\/\*\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('FP-02 · el DTO del backend es espejo del contrato', () => {
  const contrato = readFileSync(resolve(RAIZ, 'contracts/fp02-notificaciones-internas.contract.ts'), 'utf8');
  const dto = readFileSync(resolve(__dirname, '../fp02-notificaciones.dto.ts'), 'utf8');

  it('fp02-notificaciones.dto.ts coincide con contracts/fp02-notificaciones-internas.contract.ts', () => {
    expect(cuerpo(dto)).toBe(cuerpo(contrato));
  });

  it('importa lo mismo', () => {
    const nombres = (t: string): string[] =>
      ts
        .createSourceFile('x.ts', t, ts.ScriptTarget.ES2022, true)
        .statements.filter(ts.isImportDeclaration)
        .map((d) => (ts.isStringLiteral(d.moduleSpecifier) ? d.moduleSpecifier.text : ''))
        .sort();
    expect(nombres(dto)).toEqual(nombres(contrato));
  });
});

function repoFalso(sobreescribir: Partial<NotificacionesRepositoryPort> = {}): NotificacionesRepositoryPort & {
  publicaciones: PublicacionFilas[];
} {
  const publicaciones: PublicacionFilas[] = [];
  return {
    publicaciones,
    destinatariosDePermiso: vi.fn(async () => [10, 11]),
    publicar: vi.fn(async (p: PublicacionFilas) => {
      publicaciones.push(p);
    }),
    resumen: vi.fn(async () => []),
    listar: vi.fn(async () => ({ filas: [], total: 0 })),
    marcarVistas: vi.fn(async () => 0),
    marcarTodasLeidas: vi.fn(async () => 0),
    marcarSeccionLeida: vi.fn(async () => 0),
    marcarLeida: vi.fn(async () => null),
    borrarLeidosVencidos: vi.fn(async () => 0),
    recortarExcedentes: vi.fn(async () => 0),
    ...sobreescribir,
  };
}

describe('FP-02 · textos del catálogo (R5)', () => {
  const pedidoNuevo: TipoNotificacion = TIPOS_NOTIFICACION.pedido_nuevo;
  it('singular con una y plural con {n}', () => {
    expect(componerTexto(pedidoNuevo, 1, ['PC-1'])).toBe('Llegó un pedido nuevo: PC-1');
    expect(componerTexto(pedidoNuevo, 15, ['PC-9', 'PC-8'])).toBe('Han llegado 15 pedidos nuevos');
  });
  it('el enlace singular lleva el código y el plural, la lista; el código se escapa', () => {
    expect(componerEnlace(pedidoNuevo, 1, ['PC-1'])).toBe('/admin/pedidos/PC-1');
    expect(componerEnlace(pedidoNuevo, 3, ['PC-1'])).toBe('/admin/pedidos');
    expect(componerEnlace(pedidoNuevo, 1, ['../x?y'])).toBe('/admin/pedidos/..%2Fx%3Fy');
  });
  it('todo tipo del catálogo compone sin llaves sueltas y con enlace interno', () => {
    for (const tipo of Object.values(TIPOS_NOTIFICACION) as TipoNotificacion[]) {
      for (const n of [1, 5]) {
        expect(componerTexto(tipo, n, ['PC-1'])).not.toMatch(/[{}]/);
        expect(componerEnlace(tipo, n, ['PC-1'])).toMatch(/^\/[a-z]/);
      }
    }
  });
  it('R9: ningún texto del catálogo pide nombres, correos ni teléfonos', () => {
    for (const tipo of Object.values(TIPOS_NOTIFICACION) as TipoNotificacion[]) {
      expect(`${tipo.singular} ${tipo.plural}`).not.toMatch(/\{(nombre|correo|telefono|email)\}/i);
    }
  });
});

describe('FP-02 · publicar (R3, R4, R10)', () => {
  const ahora = new Date('2026-11-03T12:00:00.000Z');

  it('por permiso: resuelve destinatarios una vez por minuto y agrupa por tipo', async () => {
    const repo = repoFalso();
    const s = new NotificacionesInternasService(repo, { ahora: () => ahora, intervaloLimpiezaMs: 10 ** 9 });
    await s.publicar({ tipo: 'pedido_nuevo', destino: { tipo: 'permiso', permiso: 'ventas.ver' }, referencia: 'PC-1' });
    await s.publicar({ tipo: 'pedido_nuevo', destino: { tipo: 'permiso', permiso: 'ventas.ver' }, referencia: 'PC-2' });
    expect(repo.destinatariosDePermiso).toHaveBeenCalledTimes(1);
    expect(repo.publicaciones).toHaveLength(2);
    expect(repo.publicaciones[0]).toMatchObject({ idsUsuario: [10, 11], claveGrupo: 'pedido_nuevo', nivel: 'novedad', seccion: 'pedidos', referencia: 'PC-1' });
    expect(repo.publicaciones[0]?.limiteVentana.toISOString()).toBe('2026-11-02T12:00:00.000Z');
  });

  it('por entidad: la clave lleva el código de la orden', async () => {
    const repo = repoFalso();
    const s = new NotificacionesInternasService(repo, { ahora: () => ahora, intervaloLimpiezaMs: 10 ** 9 });
    await s.publicar({ tipo: 'pedido_estado', destino: { tipo: 'usuario', idUsuario: 7 }, referencia: 'PC-77' });
    expect(repo.publicaciones[0]).toMatchObject({ idsUsuario: [7], claveGrupo: 'pedido_estado:PC-77', nivel: 'importante', seccion: 'mis_pedidos' });
  });

  it('un aviso de personal no se publica a un usuario y uno de cliente no se publica por permiso (R3)', async () => {
    const repo = repoFalso();
    const registrar = vi.fn();
    const s = new NotificacionesInternasService(repo, { registrarError: registrar, intervaloLimpiezaMs: 10 ** 9 });
    await s.publicar({ tipo: 'pedido_nuevo', destino: { tipo: 'usuario', idUsuario: 7 }, referencia: 'PC-1' });
    await s.publicar({ tipo: 'pedido_estado', destino: { tipo: 'permiso', permiso: 'ventas.ver' }, referencia: 'PC-1' });
    await s.publicar({ tipo: 'pedido_nuevo', destino: { tipo: 'permiso', permiso: 'catalogo.ver' }, referencia: 'PC-1' });
    expect(repo.publicaciones).toHaveLength(0);
    expect(registrar).toHaveBeenCalledTimes(3);
  });

  it('un aviso que necesita referencia y no la trae se descarta sin romper', async () => {
    const repo = repoFalso();
    const registrar = vi.fn();
    const s = new NotificacionesInternasService(repo, { registrarError: registrar, intervaloLimpiezaMs: 10 ** 9 });
    await expect(s.publicar({ tipo: 'pedido_nuevo', destino: { tipo: 'permiso', permiso: 'ventas.ver' } })).resolves.toBeUndefined();
    expect(repo.publicaciones).toHaveLength(0);
    expect(registrar).toHaveBeenCalledTimes(1);
  });

  it('R10: si la base falla, publicar no lanza: lo registra', async () => {
    const repo = repoFalso({ publicar: vi.fn(async () => Promise.reject(new Error('base caída'))) });
    const registrar = vi.fn();
    const s = new NotificacionesInternasService(repo, { registrarError: registrar, intervaloLimpiezaMs: 10 ** 9 });
    await expect(s.publicar({ tipo: 'pedido_nuevo', destino: { tipo: 'permiso', permiso: 'ventas.ver' }, referencia: 'PC-1' })).resolves.toBeUndefined();
    expect(registrar).toHaveBeenCalledTimes(1);
  });

  it('un evento mal formado no lanza', async () => {
    const repo = repoFalso();
    const registrar = vi.fn();
    const s = new NotificacionesInternasService(repo, { registrarError: registrar });
    await expect(s.publicar({ tipo: 'no_existe', destino: { tipo: 'usuario', idUsuario: 1 } } as never)).resolves.toBeUndefined();
    expect(registrar).toHaveBeenCalledTimes(1);
  });

  it('sin destinatarios no escribe nada', async () => {
    const repo = repoFalso({ destinatariosDePermiso: vi.fn(async () => []) });
    const s = new NotificacionesInternasService(repo, { intervaloLimpiezaMs: 10 ** 9 });
    await s.publicar({ tipo: 'pedido_nuevo', destino: { tipo: 'permiso', permiso: 'ventas.ver' }, referencia: 'PC-1' });
    expect(repo.publicar).not.toHaveBeenCalled();
  });
});

describe('FP-02 · resumen (R6)', () => {
  it('el punto del menú suma la cantidad de las novedades; la campanita cuenta avisos; ambos topan en 99', async () => {
    const repo = repoFalso({
      resumen: vi.fn(async () => [
        { nivel: 'novedad' as const, seccion: 'pedidos' as const, filas: 1, cantidad: 15, sinVer: 1 },
        { nivel: 'importante' as const, seccion: 'pedidos' as const, filas: 2, cantidad: 7, sinVer: 1 },
        { nivel: 'novedad' as const, seccion: 'atencion' as const, filas: 1, cantidad: 400, sinVer: 0 },
      ]),
    });
    const r = await new NotificacionesInternasService(repo).resumen(1);
    expect(r.campana).toEqual({ sinVer: 2, sinLeer: 4 });
    expect(r.secciones).toEqual([
      { seccion: 'atencion', cantidad: 99 },
      { seccion: 'pedidos', cantidad: 15 },
    ]);
  });

  it('un importante no pinta punto en el menú', async () => {
    const repo = repoFalso({ resumen: vi.fn(async () => [{ nivel: 'importante' as const, seccion: 'pedidos' as const, filas: 1, cantidad: 3, sinVer: 1 }]) });
    expect((await new NotificacionesInternasService(repo).resumen(1)).secciones).toEqual([]);
  });
});

describe('FP-02 · lista y marcado', () => {
  it('compone texto y enlace, y omite tipos que ya no están en el catálogo', async () => {
    const fecha = new Date('2026-11-03T10:00:00.000Z');
    const base = { nivel: 'novedad' as const, seccion: 'pedidos' as const, referencias: ['PC-3', 'PC-2'], fechaUltima: fecha, fechaVista: null, fechaLectura: null };
    const repo = repoFalso({
      listar: vi.fn(async () => ({
        filas: [
          { ...base, idNotificacion: 'a', tipo: 'pedido_nuevo', cantidad: 2 },
          { ...base, idNotificacion: 'b', tipo: 'tipo_retirado', cantidad: 1 },
        ],
        total: 12,
      })),
    });
    const r = await new NotificacionesInternasService(repo).listar(1, 1, 10);
    expect(r.hayMas).toBe(true);
    expect(r.items).toHaveLength(1);
    expect(r.items[0]).toMatchObject({ texto: 'Han llegado 2 pedidos nuevos', enlace: '/admin/pedidos', vista: false, leida: false, fecha: fecha.toISOString() });
  });

  it('marcar leído un aviso ajeno o inexistente es el 404 opaco', async () => {
    await expect(new NotificacionesInternasService(repoFalso()).marcarLeida(1, 'x')).rejects.toBeInstanceOf(NotificacionNoDisponibleError);
  });
});

describe('FP-02 · limpieza (R8, R13d)', () => {
  it('borra por lotes hasta vaciar y recorta a los destinatarios publicados', async () => {
    const lotes = [500, 500, 20];
    const repo = repoFalso({ borrarLeidosVencidos: vi.fn(async () => lotes.shift() ?? 0), recortarExcedentes: vi.fn(async () => 3) });
    const s = new NotificacionesInternasService(repo, { ahora: () => new Date('2026-11-03T00:00:00.000Z'), intervaloLimpiezaMs: 10 ** 9 });
    await s.publicar({ tipo: 'pedido_nuevo', destino: { tipo: 'permiso', permiso: 'ventas.ver' }, referencia: 'PC-1' });
    const r = await s.limpiar();
    expect(r).toEqual({ vencidos: 1020, excedentes: 3 });
    const limite = vi.mocked(repo.borrarLeidosVencidos).mock.calls[0]?.[0];
    expect(limite?.toISOString()).toBe('2026-10-04T00:00:00.000Z');
    expect(repo.recortarExcedentes).toHaveBeenCalledWith([10, 11], 200, 500);
  });

  it('a lo sumo una limpieza por intervalo, y no en la ruta de la petición', async () => {
    const repo = repoFalso();
    const s = new NotificacionesInternasService(repo, { intervaloLimpiezaMs: 10 ** 9 });
    const e = { tipo: 'pedido_nuevo', destino: { tipo: 'permiso', permiso: 'ventas.ver' }, referencia: 'PC-1' } as const;
    await s.publicar(e);
    expect(repo.borrarLeidosVencidos).not.toHaveBeenCalled();
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    await s.publicar(e);
    await s.publicar(e);
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    expect(repo.borrarLeidosVencidos).toHaveBeenCalledTimes(1);
  });
});
