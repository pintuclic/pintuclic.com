import { describe, expect, it } from 'vitest';
import type { CodigoPermiso } from '../dtos/permisos.dto';
import { DEPENDENCIA_DE_CONSULTA, alternarPermiso } from '../services/dependencias-permisos';

const conjunto = (...codigos: CodigoPermiso[]): Set<CodigoPermiso> => new Set(codigos);

describe('alternarPermiso — cascadas de la matriz de permisos (ADR-008)', () => {
  it('marcar un permiso operativo concede su permiso de consulta', () => {
    const resultado = alternarPermiso(conjunto(), 'catalogo.editar');

    expect([...resultado].sort()).toEqual(['catalogo.editar', 'catalogo.ver']);
  });

  it('quitar el permiso de consulta revoca todos los operativos que dependían de él', () => {
    const inicial = conjunto(
      'catalogo.ver',
      'catalogo.crear',
      'catalogo.editar',
      'catalogo.eliminar',
      'productos.crear',
      'ventas.ver',
    );

    const resultado = alternarPermiso(inicial, 'catalogo.ver');

    // Se va el de consulta con toda su cascada; ventas no se toca.
    expect([...resultado]).toEqual(['ventas.ver']);
  });

  it('marcar un permiso de consulta no arrastra ningún operativo', () => {
    const resultado = alternarPermiso(conjunto(), 'atencion.ver');

    expect([...resultado]).toEqual(['atencion.ver']);
  });

  it('quitar un operativo deja intacto su permiso de consulta', () => {
    const resultado = alternarPermiso(conjunto('atencion.ver', 'atencion.editar'), 'atencion.editar');

    expect([...resultado]).toEqual(['atencion.ver']);
  });

  it('atencion.editar concede atencion.ver (M15 · HU-ATC-01)', () => {
    const resultado = alternarPermiso(conjunto(), 'atencion.editar');

    expect(resultado.has('atencion.ver')).toBe(true);
  });

  it('notificaciones.editar concede notificaciones.ver (M18 · HU-NOT-03)', () => {
    const resultado = alternarPermiso(conjunto(), 'notificaciones.editar');

    expect(resultado.has('notificaciones.ver')).toBe(true);
  });

  it('atencion.atender_clientes concede atencion.ver para consultar la bandeja (M15 · R12)', () => {
    const resultado = alternarPermiso(conjunto(), 'atencion.atender_clientes');

    expect([...resultado].sort()).toEqual(['atencion.atender_clientes', 'atencion.ver']);
  });

  it('patrocinios.editar concede patrocinios.ver (M14 · HU-PAT-01)', () => {
    const resultado = alternarPermiso(conjunto(), 'patrocinios.editar');

    expect([...resultado].sort()).toEqual(['patrocinios.editar', 'patrocinios.ver']);
  });

  it('quitar patrocinios.ver revoca patrocinios.editar', () => {
    const resultado = alternarPermiso(conjunto('patrocinios.ver', 'patrocinios.editar'), 'patrocinios.ver');

    expect([...resultado]).toEqual([]);
  });

  it('no muta el conjunto recibido', () => {
    const inicial = conjunto('atencion.ver');

    alternarPermiso(inicial, 'atencion.editar');

    expect([...inicial]).toEqual(['atencion.ver']);
  });

  it('cada permiso de consulta del mapa termina en ".ver"', () => {
    for (const consulta of Object.values(DEPENDENCIA_DE_CONSULTA)) {
      expect(consulta).toMatch(/\.ver$/);
    }
  });

  it('ningún permiso de consulta depende de otro: no hay cadenas', () => {
    const consultas = new Set(Object.values(DEPENDENCIA_DE_CONSULTA));

    for (const consulta of consultas) {
      expect(DEPENDENCIA_DE_CONSULTA[consulta as CodigoPermiso]).toBeUndefined();
    }
  });
});
