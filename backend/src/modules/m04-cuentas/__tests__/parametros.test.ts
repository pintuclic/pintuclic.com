import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { leerParamUuid } from '../controllers/parametros';

const pedido = (idDireccion: unknown) => ({ params: { idDireccion } }) as unknown as Request;

describe('leerParamUuid', () => {
  it('acepta un UUID v4 y también los ids de semilla que PostgreSQL admite', () => {
    expect(leerParamUuid(pedido('3f2b8c1e-5a47-4d9e-9b61-2c7a1f0e8d34'), 'idDireccion')).toBe(
      '3f2b8c1e-5a47-4d9e-9b61-2c7a1f0e8d34',
    );
    expect(leerParamUuid(pedido('d0000000-0000-0000-0000-000000000001'), 'idDireccion')).toBe(
      'd0000000-0000-0000-0000-000000000001',
    );
  });

  it('devuelve null si falta o si el valor no se puede castear a uuid', () => {
    expect(leerParamUuid(pedido(undefined), 'idDireccion')).toBeNull();
    expect(leerParamUuid(pedido('no-es-un-uuid'), 'idDireccion')).toBeNull();
    expect(leerParamUuid(pedido("1' OR '1'='1"), 'idDireccion')).toBeNull();
  });
});
