import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { Comprobante, DatosFacturacion } from '../dtos/m12-facturacion.dto';
import { ComprobanteAlCrearOrdenAdapter } from '../adapters/orden-creada.adapter';
import type {
  ComprobanteGuardado,
  ComprobantesRepositoryPort,
  NuevoComprobante,
  OrdenParaFacturar,
} from '../interfaces/facturacion.interface';
import { ComprobantesService } from '../services/comprobantes.service';
import { DatosFacturacionService } from '../services/datos-facturacion.service';
import { FacturacionError } from '../services/facturacion-error';

const RAIZ = resolve(__dirname, '../../../../../');

const DATOS_COMPLETOS: DatosFacturacion = {
  razonSocial: 'Pintu Clic S.A.S.', nit: '900.123.456-7', regimen: 'Responsable de IVA', direccion: 'Calle 10 # 5-20', ciudad: 'Bogotá',
  telefono: '+57 322 123 4567', correo: 'facturas@pintuclic.com', pieLegal: 'Documento sin validez fiscal ante la DIAN.',
  faltantes: [], fechaActualizacion: null, actualizadoPor: null,
};
const DATOS_VACIOS: DatosFacturacion = { ...DATOS_COMPLETOS, razonSocial: null, nit: null, direccion: null, faltantes: ['razonSocial', 'nit', 'direccion'] };

const ORDEN: OrdenParaFacturar = {
  idOrden: 1, codigo: 'PC-2026-00001', idUsuario: 5, direccion: null, costoEntrega: 0, subTotal: 200000, descuento: 20000, total: 180000,
  baseSinImpuesto: 151260.5, importeIva: 28739.5, tasaIva: 19,
  comprador: { nombre: 'Laura Martínez', correo: 'laura@correo.co', telefono: '3001234567', empresa: null },
  lineas: [
    { nombreProducto: 'Viniltex', varianteCopia: '1 galón', colorSolicitado: 'Azul Cielo', cantidad: 2, precioAplicado: 90000, precioInicial: 100000 },
    { nombreProducto: 'Brocha', varianteCopia: '2 pulgadas', colorSolicitado: null, cantidad: 1, precioAplicado: 0, precioInicial: null },
  ],
};

class RepoMemoria implements ComprobantesRepositoryPort {
  guardados = new Map<string, ComprobanteGuardado>();
  consecutivo = 0;
  constructor(private readonly ordenes: OrdenParaFacturar[]) {}

  async buscarPorCodigoOrden(codigo: string) {
    const g = this.guardados.get(codigo);
    return g === undefined ? null : { comprobante: g.comprobante, idUsuarioTitular: g.idUsuarioTitular };
  }
  async leerOrdenParaFacturar(codigo: string) {
    return this.ordenes.find((o) => o.codigo === codigo) ?? null;
  }
  async crear(n: NuevoComprobante): Promise<ComprobanteGuardado> {
    this.consecutivo += 1;
    const comprobante: Comprobante = { ...n, numero: `CV-${String(this.consecutivo).padStart(6, '0')}`, fechaEmision: '2026-10-29T10:00:00.000Z' };
    const g = { comprobante, idUsuarioTitular: this.ordenes.find((o) => o.idOrden === n.idOrden)?.idUsuario ?? 0, creado: true };
    this.guardados.set(n.codigoOrden, g);
    return g;
  }
}

const montar = (datos: DatosFacturacion = DATOS_COMPLETOS, ordenes: OrdenParaFacturar[] = [ORDEN]) => {
  const repo = new RepoMemoria(ordenes);
  const avisar = vi.fn(async () => undefined);
  const servicio = new ComprobantesService(repo, new DatosFacturacionService({ obtener: async () => datos, guardar: async () => datos }), { avisar });
  return { repo, avisar, servicio };
};

describe('M12 · emisión del comprobante', () => {
  it('R3, R7: copia vendedor, comprador, líneas e importes de la orden', async () => {
    const { servicio } = montar();
    const { comprobante, creado } = await servicio.emitir('PC-2026-00001');
    expect(creado).toBe(true);
    expect(comprobante.numero).toBe('CV-000001');
    expect(comprobante.vendedor).toMatchObject({ razonSocial: 'Pintu Clic S.A.S.', nit: '900.123.456-7' });
    expect(comprobante.comprador).toEqual({ nombre: 'Laura Martínez', documento: null, correo: 'laura@correo.co', telefono: '3001234567', direccion: 'Recogida en almacén' });
    expect(comprobante.lineas[0]).toEqual({ descripcion: 'Viniltex', presentacion: '1 galón', color: 'Azul Cielo', cantidad: 2, precioUnitario: 100000, descuentoUnitario: 10000, totalLinea: 180000 });
    expect(comprobante.lineas[1]).toMatchObject({ precioUnitario: 0, descuentoUnitario: 0, totalLinea: 0 });
    expect([comprobante.subtotal, comprobante.descuento, comprobante.baseSinIva, comprobante.iva, comprobante.tasaIva, comprobante.total]).toEqual([200000, 20000, 151260.5, 28739.5, 19, 180000]);
    expect(comprobante.pieLegal).toBe('Documento sin validez fiscal ante la DIAN.');
  });

  it('R7: una cuenta empresa sale con su razón social y su NIT, y el envío con su dirección', async () => {
    const orden = { ...ORDEN, direccion: 'Carrera 7 # 32-16', comprador: { ...ORDEN.comprador, empresa: { nit: '800.111.222-3', nombreEmpresa: 'Constructora Andes' } } };
    const { comprobante } = await montar(DATOS_COMPLETOS, [orden]).servicio.emitir(orden.codigo);
    expect(comprobante.comprador).toMatchObject({ nombre: 'Constructora Andes', documento: '800.111.222-3', direccion: 'Carrera 7 # 32-16' });
  });

  it('R1: emitir dos veces devuelve el mismo comprobante y no gasta otro número', async () => {
    const { servicio, repo } = montar();
    const a = await servicio.emitir('PC-2026-00001');
    const b = await servicio.emitir('PC-2026-00001');
    expect(b.creado).toBe(false);
    expect(b.comprobante.numero).toBe(a.comprobante.numero);
    expect(repo.consecutivo).toBe(1);
  });

  it('R5: una orden sin desglose de IVA, o que no existe, no genera comprobante (404 opaco)', async () => {
    const sinIva = { ...ORDEN, baseSinImpuesto: null };
    await expect(montar(DATOS_COMPLETOS, [sinIva]).servicio.emitir(sinIva.codigo)).rejects.toMatchObject({ status: 404 });
    await expect(montar().servicio.emitir('PC-2026-99999')).rejects.toMatchObject({ status: 404 });
  });

  it('R6: sin datos del vendedor no se emite y se dice qué falta', async () => {
    const { servicio, repo } = montar(DATOS_VACIOS);
    const error = await servicio.emitir('PC-2026-00001').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(FacturacionError);
    expect(error).toMatchObject({ status: 409, code: 'DATOS_VENDEDOR_INCOMPLETOS' });
    expect((error as Error).message).toContain('razonSocial');
    expect(repo.consecutivo).toBe(0);
  });
});

describe('M12 · quién ve el comprobante (R2, R8)', () => {
  it('el titular lo ve; se emite al primer GET si todavía no existía', async () => {
    const { servicio, repo } = montar();
    const c = await servicio.paraTitular(5, 'PC-2026-00001');
    expect(c.numero).toBe('CV-000001');
    expect(repo.consecutivo).toBe(1);
    expect((await servicio.paraTitular(5, 'PC-2026-00001')).numero).toBe('CV-000001');
  });

  it('otro cliente recibe el mismo 404 que si no existiera, con o sin comprobante emitido', async () => {
    const { servicio } = montar();
    await expect(servicio.paraTitular(9, 'PC-2026-00001')).rejects.toMatchObject({ status: 404 });
    await servicio.emitir('PC-2026-00001');
    await expect(servicio.paraTitular(9, 'PC-2026-00001')).rejects.toMatchObject({ status: 404 });
    await expect(servicio.paraTitular(5, 'PC-2026-77777')).rejects.toMatchObject({ status: 404 });
  });

  it('al cliente, la falta de datos del vendedor le sale como 404 (no es asunto suyo); al personal, con el detalle', async () => {
    const { servicio } = montar(DATOS_VACIOS);
    await expect(servicio.paraTitular(5, 'PC-2026-00001')).rejects.toMatchObject({ status: 404 });
    await expect(servicio.paraPersonal('PC-2026-00001')).rejects.toMatchObject({ status: 409 });
  });
});

describe('M12 · aviso por correo (R9)', () => {
  it('al crearse la orden emite el comprobante y avisa una sola vez, con número, total y orden', async () => {
    const { servicio, avisar } = montar();
    const adaptador = new ComprobanteAlCrearOrdenAdapter(servicio);
    await adaptador.notificarOrdenCreada({ codigo: 'PC-2026-00001' });
    await adaptador.notificarOrdenCreada({ codigo: 'PC-2026-00001' });
    expect(avisar).toHaveBeenCalledTimes(1);
    expect(avisar).toHaveBeenCalledWith('laura@correo.co', { nombre: 'Laura Martínez', numero: 'CV-000001', total: expect.stringMatching(/^\$ 180\.000$/), codigoOrden: 'PC-2026-00001' });
  });

  it('si falta algo, el aviso de M08 no falla: queda para el primer GET', async () => {
    const { servicio, avisar } = montar(DATOS_VACIOS);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(new ComprobanteAlCrearOrdenAdapter(servicio).notificarOrdenCreada({ codigo: 'PC-2026-00001' })).resolves.toBeUndefined();
    expect(avisar).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it('reenviar vuelve a avisar sin crear otro comprobante', async () => {
    const { servicio, avisar, repo } = montar();
    await servicio.reenviar('PC-2026-00001');
    await servicio.reenviar('PC-2026-00001');
    expect(avisar).toHaveBeenCalledTimes(2);
    expect(repo.consecutivo).toBe(1);
  });
});

describe('M12 · espejo del contrato', () => {
  it('el DTO del backend es espejo exacto del contrato', () => {
    const limpiar = (t: string) => t.replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
    const contrato = limpiar(readFileSync(resolve(RAIZ, 'contracts/m12-facturacion.contract.ts'), 'utf8'));
    const dto = limpiar(readFileSync(resolve(__dirname, '../dtos/m12-facturacion.dto.ts'), 'utf8'));
    expect(dto).toBe(contrato);
  });
});
