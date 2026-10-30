import { describe, expect, it } from 'vitest';
import { ESTADOS_ENVIO, envioClienteSchema, envioDetallePersonalSchema } from '../dtos/m10-entrega.dto';
import { ETIQUETA_ESTADO_ENVIO, nombreProveedor } from '../services/presentacion';

describe('M10 · presentación del envío', () => {
  it('todos los estados del contrato tienen etiqueta', () => {
    for (const estado of ESTADOS_ENVIO) expect(ETIQUETA_ESTADO_ENVIO[estado]).toBeTruthy();
  });

  it('la entrega propia se muestra con su nombre y otro proveedor tal cual', () => {
    expect(nombreProveedor('envio_propio')).toBe('Entrega propia de la tienda');
    expect(nombreProveedor('transportadora_x')).toBe('transportadora_x');
  });

  it('el envío del cliente no admite etiqueta ni error interno: el esquema los descarta', () => {
    const fecha = '2026-10-29T10:00:00.000Z';
    const analizado = envioClienteSchema.parse({
      codigoOrden: 'PC-2026-00001', proveedor: 'envio_propio', estado: 'creado', numeroGuia: null, urlSeguimiento: null,
      urlEtiqueta: 'https://x.example/e', ultimoError: 'secreto', fechaCreacion: fecha, fechaActualizacion: fecha,
    });
    expect(analizado).not.toHaveProperty('urlEtiqueta');
    expect(analizado).not.toHaveProperty('ultimoError');
  });

  it('el detalle de personal acepta un pedido sin envío', () => {
    expect(envioDetallePersonalSchema.parse({ envio: null, novedades: [] })).toEqual({ envio: null, novedades: [] });
  });
});
