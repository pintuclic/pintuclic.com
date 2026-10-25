import { describe, expect, it } from 'vitest';
import { MAXIMO_COMPLEMENTARIOS } from '../dtos/m01-catalogo-entrega3.dto';
import type { ProductoPublicoTarjeta } from '../dtos/m01-catalogo-productos.dto';
import type { ConsultaPublicaRepositoryPort } from '../interfaces/consulta-publica.interface';
import { barajar } from '../repositories/consulta-publica.repository';
import { CatalogoError } from '../services/catalogo-base.service';
import { ConsultaPublicaService } from '../services/consulta-publica.service';

/** Lógica de la entrega 3 que no necesita base de datos. */

describe('M01 · entrega 3 · barajar (sorteo de complementarios)', () => {
  it('devuelve una permutación sin tocar la lista original', () => {
    const original = [1, 2, 3, 4, 5, 6];
    const r = barajar(original, () => 0.42);
    expect([...r].sort()).toEqual(original);
    expect(original).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('es determinista con el mismo generador y cambia con otro', () => {
    const lista = [1, 2, 3, 4, 5];
    const fijo = (valor: number) => () => valor;
    expect(barajar(lista, fijo(0))).toEqual(barajar(lista, fijo(0)));
    expect(barajar(lista, fijo(0))).not.toEqual(barajar(lista, fijo(0.99)));
  });

  it('con listas de 0 o 1 elemento no hace nada', () => {
    expect(barajar([], Math.random)).toEqual([]);
    expect(barajar([7], Math.random)).toEqual([7]);
  });

  it('todas las posiciones son posibles (no hay sesgo evidente)', () => {
    const vistos = new Set<number>();
    for (let i = 0; i < 200; i += 1) vistos.add(barajar([1, 2, 3, 4], Math.random)[0] ?? 0);
    expect(vistos).toEqual(new Set([1, 2, 3, 4]));
  });
});

describe('M01 · entrega 3 · ConsultaPublicaService.complementarios', () => {
  const repoCon = (resultado: ProductoPublicoTarjeta[] | null): ConsultaPublicaRepositoryPort => {
    const noUsado = (): never => {
      throw new Error('no debe llamarse');
    };
    return {
      categorias: noUsado,
      filtros: noUsado,
      listar: noUsado,
      ficha: noUsado,
      colores: noUsado,
      imagen: noUsado,
      imagenDerivada: noUsado,
      guardarDerivada: noUsado,
      complementarios: (_id, limite) => {
        expect(limite).toBe(MAXIMO_COMPLEMENTARIOS);
        return Promise.resolve(resultado);
      },
      imagenMedida: noUsado,
      logotipo: noUsado,
    };
  };

  it('pide hasta 4 y devuelve la lista vacía (200) cuando no hay nada que sugerir: la pantalla oculta la sección', async () => {
    expect(await new ConsultaPublicaService(repoCon([])).complementarios(1)).toEqual([]);
  });

  it('un producto no visible es 404 uniforme', async () => {
    const error: unknown = await new ConsultaPublicaService(repoCon(null)).complementarios(1).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CatalogoError);
    expect(error).toMatchObject({ code: 'RECURSO_NO_DISPONIBLE', status: 404 });
  });
});
