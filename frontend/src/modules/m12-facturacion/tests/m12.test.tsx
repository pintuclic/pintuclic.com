import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Comprobante } from '../dtos/m12-facturacion.dto';
import { AVISO_NO_FACTURA, ComprobanteDocumento } from '../components/ComprobanteDocumento';
import { ETIQUETA_FALTANTE, fechaDelComprobante, textoFaltantes } from '../services/formato-comprobante';

vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: vi.fn() }) }));

const RAIZ = resolve(__dirname, '../../../../../');

const COMPROBANTE: Comprobante = {
  numero: 'CV-000007',
  codigoOrden: 'PC-2026-00001',
  fechaEmision: '2026-10-29T15:30:00.000Z',
  vendedor: { razonSocial: 'Pintu Clic S.A.S.', nit: '900.123.456-7', regimen: 'Responsable de IVA', direccion: 'Calle 10 # 5-20', ciudad: 'Bogotá', telefono: '+57 322 123 4567', correo: 'facturas@pintuclic.com' },
  comprador: { nombre: 'Constructora Andes', documento: '800.111.222-3', correo: 'compras@andes.co', telefono: null, direccion: 'Recogida en almacén' },
  lineas: [
    { descripcion: 'Viniltex Advanced Mate', presentacion: '1 galón', color: 'Azul Brisa', cantidad: 2, precioUnitario: 100000, descuentoUnitario: 10000, totalLinea: 180000 },
    { descripcion: 'Brocha Profesional', presentacion: '3 pulgadas', color: null, cantidad: 1, precioUnitario: 14900, descuentoUnitario: 0, totalLinea: 14900 },
  ],
  subtotal: 214900, descuento: 20000, envio: 0, baseSinIva: 163445.38, tasaIva: 19, iva: 31054.62, total: 194900,
  pieLegal: 'Gracias por su compra.',
};

describe('M12 · el DTO del frontend es espejo del contrato', () => {
  it('dtos/m12-facturacion.dto.ts coincide con contracts/m12-facturacion.contract.ts', () => {
    const limpiar = (t: string) => t.replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
    const contrato = readFileSync(resolve(RAIZ, 'contracts/m12-facturacion.contract.ts'), 'utf8');
    const dto = readFileSync(resolve(__dirname, '../dtos/m12-facturacion.dto.ts'), 'utf8');
    expect(limpiar(dto)).toBe(limpiar(contrato));
  });
});

describe('M12 · el documento del comprobante', () => {
  const html = renderToStaticMarkup(<ComprobanteDocumento comprobante={COMPROBANTE} />).replace(/\u00a0/g, ' ');

  it('lleva vendedor, número, pedido, cliente con su NIT y la dirección de entrega', () => {
    for (const texto of ['Pintu Clic S.A.S.', 'NIT 900.123.456-7', 'CV-000007', 'Pedido PC-2026-00001', 'Constructora Andes', 'NIT 800.111.222-3', 'Recogida en almacén']) {
      expect(html).toContain(texto);
    }
  });

  it('lista cada línea con su presentación y color, y marca el descuento solo donde lo hay', () => {
    expect(html).toContain('Viniltex Advanced Mate');
    expect(html).toContain('1 galón · Azul Brisa');
    expect(html).toContain('3 pulgadas');
    expect(html).toContain('−$ 10.000');
    expect(html).toContain('—');
  });

  it('discrimina descuento, base, IVA y total; el envío solo si lo hay', () => {
    expect(html).toContain('Descuentos');
    expect(html).toContain('Base sin IVA');
    expect(html).toContain('IVA (19 %)');
    expect(html).toContain('$ 194.900');
    expect(html).not.toContain('Envío');
    expect(renderToStaticMarkup(<ComprobanteDocumento comprobante={{ ...COMPROBANTE, envio: 12000 }} />)).toContain('Envío');
  });

  it('al pie: el texto legal del vendedor y siempre que no es factura electrónica', () => {
    expect(html).toContain('Gracias por su compra.');
    expect(html).toContain(AVISO_NO_FACTURA);
    expect(renderToStaticMarkup(<ComprobanteDocumento comprobante={{ ...COMPROBANTE, pieLegal: null }} />)).toContain(AVISO_NO_FACTURA);
  });

  it('es una tabla con título y encabezados de columna (accesible) y no se rompe al imprimir', () => {
    expect(html).toContain('<caption');
    expect(html).toContain('scope="col"');
    expect(html).toContain('comprobante-imprimible');
    expect(html).toContain('print:shadow-none');
  });
});

describe('M12 · textos', () => {
  it('la fecha sale en hora de Colombia', () => {
    expect(fechaDelComprobante('2026-10-29T15:30:00.000Z')).toMatch(/29 de octubre de 2026/);
    expect(fechaDelComprobante('2026-10-29T03:30:00.000Z')).toMatch(/28 de octubre de 2026/);
  });

  it('dice qué falta en la ficha del vendedor', () => {
    expect(textoFaltantes(['razonSocial', 'nit'])).toBe(`${ETIQUETA_FALTANTE.razonSocial}, ${ETIQUETA_FALTANTE.nit}`);
  });
});
