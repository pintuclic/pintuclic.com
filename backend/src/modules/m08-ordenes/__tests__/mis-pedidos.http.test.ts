import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Actor } from '../../m20-seguridad/interfaces/actor.interface';
import { AutorizacionService } from '../../m20-seguridad/services/autorizacion.service';
import { ordenClienteResponseEnvelopeSchema, misPedidosResponseEnvelopeSchema } from '../dtos/m08-ordenes.dto';
import type {
  CatalogoDisponibilidadPort,
  ConsultaClienteRepository,
  DetalleOrdenDatos,
  FiltroMisPedidos,
} from '../interfaces/consulta-cliente.interface';
import { construirModuloM08 } from '../m08.routes';

function orden(sobrescribir: Partial<DetalleOrdenDatos>): DetalleOrdenDatos {
  return {
    codigo: 'PC-2026-00001',
    fecha: new Date('2026-05-12T00:00:00Z'),
    total: 287900,
    estado: 'en_preparacion',
    modoEntrega: 'domicilio',
    idUsuario: 7,
    origen: 'carrito',
    subTotal: 300000,
    descuento: 12100,
    costoEntrega: 0,
    baseSinImpuesto: 241932.77,
    importeIva: 45967.23,
    tasaIva: 19,
    lineas: [
      {
        nombreProducto: 'Vinilo Tipo 1',
        varianteCopia: 'Galón',
        colorSolicitado: 'Rojo Colonial',
        skuVendido: 'VIN-GAL-RC',
        cantidad: 1,
        precioInicial: 150000,
        precioAplicado: 137900,
        idVarianteRef: 11,
        descuentos: [
          { ordenAplicacion: 2, origen: 'Cliente frecuente', porcentaje: 3, importe: 4000 },
          { ordenAplicacion: 1, origen: 'Promoción de temporada', porcentaje: 5, importe: 8100 },
        ],
        ultimaMarca: null,
      },
      {
        nombreProducto: 'Esmalte Retirado',
        varianteCopia: 'Cuarto',
        colorSolicitado: null,
        skuVendido: null,
        cantidad: 2,
        precioInicial: 75000,
        precioAplicado: 75000,
        idVarianteRef: 99,
        descuentos: [],
        ultimaMarca: null,
      },
    ],
    historial: [
      { estadoAnterior: null, estadoNuevo: 'orden_confirmada', fecha: new Date('2026-05-12T14:00:00Z') },
      { estadoAnterior: 'orden_confirmada', estadoNuevo: 'en_preparacion', fecha: new Date('2026-05-12T16:00:00Z') },
    ],
    ...sobrescribir,
  };
}

class RepoMemoria implements ConsultaClienteRepository {
  ordenes: DetalleOrdenDatos[] = [];
  ultimoFiltro: FiltroMisPedidos | null = null;

  async listarPorUsuario(idUsuario: number, filtro: FiltroMisPedidos) {
    this.ultimoFiltro = filtro;
    const texto = filtro.q?.toLowerCase();
    const propias = this.ordenes
      .filter((o) => o.idUsuario === idUsuario)
      .filter(
        (o) =>
          texto === undefined ||
          o.codigo.toLowerCase().includes(texto) ||
          o.lineas.some((l) => l.nombreProducto.toLowerCase().includes(texto)),
      )
      .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
    const desde = (filtro.pagina - 1) * filtro.limite;
    return { filas: propias.slice(desde, desde + filtro.limite), total: propias.length };
  }

  async buscarDetalle(codigo: string) {
    return this.ordenes.find((o) => o.codigo === codigo) ?? null;
  }
}

describe('Mis pedidos · HTTP (HU-ORD-04, HU-ORD-07)', () => {
  let servidor: Server;
  let baseUrl: string;
  const repo = new RepoMemoria();
  const auditoria = { registrarAccesoDenegado: vi.fn().mockResolvedValue(undefined) };
  const catalogo: CatalogoDisponibilidadPort = {
    variantesDisponibles: async (ids) => new Set(ids.filter((id) => id !== 99)),
  };

  const ACTORES: Record<string, Actor> = {
    cliente: { idUsuario: 7, idSesion: 's7', tipoSesion: 'cliente' },
    otro: { idUsuario: 8, idSesion: 's8', tipoSesion: 'cliente' },
  };

  beforeAll(async () => {
    const autorizacion = new AutorizacionService({ tienePermiso: async () => false }, auditoria);
    const m08 = construirModuloM08(autorizacion, { consultaCliente: { repo, catalogo } });
    const app = express();
    app.use((req, _res, next) => {
      const nombre = req.header('x-actor');
      const actor = nombre ? ACTORES[nombre] : undefined;
      if (actor) req.actor = actor;
      next();
    });
    app.use('/ordenes', m08.router);
    servidor = await new Promise<Server>((resolver) => {
      const s = app.listen(0, '127.0.0.1', () => resolver(s));
    });
    baseUrl = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolver) => servidor.close(() => resolver()));
  });

  beforeEach(() => {
    auditoria.registrarAccesoDenegado.mockClear();
    repo.ordenes = [
      orden({}),
      orden({ codigo: 'PC-2026-00002', fecha: new Date('2026-05-05T00:00:00Z'), estado: 'despachado', total: 154500 }),
      orden({ codigo: 'PC-2026-00003', fecha: new Date('2026-04-22T00:00:00Z'), estado: 'entregado', total: 99900 }),
      orden({ codigo: 'PC-2026-00004', fecha: new Date('2026-04-01T00:00:00Z'), estado: 'cancelado', total: 10000 }),
      orden({ codigo: 'PC-2026-00005', idUsuario: 8, total: 1 }),
    ];
  });

  async function pedir(ruta: string, actor?: string) {
    const respuesta = await fetch(`${baseUrl}/ordenes${ruta}`, { headers: actor ? { 'x-actor': actor } : {} });
    return { status: respuesta.status, texto: await respuesta.text() };
  }
  const json = (r: { texto: string }): unknown => JSON.parse(r.texto);

  it('separa en curso y finalizados con código, fecha, total y estado (CA-ORD-07-01, 07-02)', async () => {
    const r = await pedir('/mis-pedidos', 'cliente');

    expect(r.status).toBe(200);
    const cuerpo = misPedidosResponseEnvelopeSchema.parse(json(r));
    expect(cuerpo.data.enCurso.map((o) => o.codigo)).toEqual(['PC-2026-00001']);
    expect(cuerpo.data.finalizados.map((o) => o.codigo)).toEqual(['PC-2026-00002', 'PC-2026-00003', 'PC-2026-00004']);
    expect(cuerpo.data.enCurso[0]).toEqual({
      codigo: 'PC-2026-00001',
      fecha: '2026-05-12T00:00:00.000Z',
      total: 287900,
      estado: 'en_preparacion',
      modoEntrega: 'domicilio',
    });
    expect(cuerpo.pagination).toEqual({ pagina: 1, limite: 20, total: 4, totalPaginas: 1 });
  });

  it('solo lista los pedidos del titular (Anti-IDOR)', async () => {
    const r = await pedir('/mis-pedidos', 'otro');

    const cuerpo = misPedidosResponseEnvelopeSchema.parse(json(r));
    expect([...cuerpo.data.enCurso, ...cuerpo.data.finalizados].map((o) => o.codigo)).toEqual(['PC-2026-00005']);
  });

  it('filtra por lo que escribe el cliente: código o producto (CA-ORD-07-03)', async () => {
    const porCodigo = misPedidosResponseEnvelopeSchema.parse(json(await pedir('/mis-pedidos?q=00003', 'cliente')));
    expect(porCodigo.data.finalizados.map((o) => o.codigo)).toEqual(['PC-2026-00003']);
    expect(porCodigo.data.enCurso).toEqual([]);

    const porProducto = await pedir('/mis-pedidos?q=vinilo', 'cliente');
    expect(misPedidosResponseEnvelopeSchema.parse(json(porProducto)).pagination.total).toBe(4);
    expect(repo.ultimoFiltro?.q).toBe('vinilo');
  });

  it('pagina el listado', async () => {
    const r = await pedir('/mis-pedidos?pagina=2&limite=3', 'cliente');

    const cuerpo = misPedidosResponseEnvelopeSchema.parse(json(r));
    expect([...cuerpo.data.enCurso, ...cuerpo.data.finalizados]).toHaveLength(1);
    expect(cuerpo.pagination).toEqual({ pagina: 2, limite: 3, total: 4, totalPaginas: 2 });
  });

  it('rechaza una paginación inválida con 400', async () => {
    const r = await pedir('/mis-pedidos?limite=500', 'cliente');
    expect(r.status).toBe(400);
  });

  it('el detalle muestra productos, color, descuentos en orden de aplicación y total (CA-ORD-04-01, 04-02, 02-02)', async () => {
    const r = await pedir('/mis-pedidos/PC-2026-00001', 'cliente');

    expect(r.status).toBe(200);
    const { data } = ordenClienteResponseEnvelopeSchema.parse(json(r));
    expect(data).toMatchObject({ codigo: 'PC-2026-00001', total: 287900, estado: 'en_preparacion', tasaIva: 19 });
    expect(data.lineas[0]).toMatchObject({ colorSolicitado: 'Rojo Colonial', cantidad: 1, precioAplicado: 137900 });
    expect(data.lineas[0]?.descuentos.map((d) => d.ordenAplicacion)).toEqual([1, 2]);
    expect(data.historial.map((h) => h.estadoNuevo)).toEqual(['orden_confirmada', 'en_preparacion']);
  });

  it('un producto retirado conserva sus datos y se marca como no disponible (CA-ORD-04-04)', async () => {
    const r = await pedir('/mis-pedidos/PC-2026-00001', 'cliente');

    const { data } = ordenClienteResponseEnvelopeSchema.parse(json(r));
    expect(data.lineas.map((l) => l.productoDisponible)).toEqual([true, false]);
    expect(data.lineas[1]).toMatchObject({ nombreProducto: 'Esmalte Retirado', cantidad: 2, precioAplicado: 75000 });
  });

  it('cada producto muestra si se está verificando, está confirmado o fue rechazado (RF-CUM-01-13)', async () => {
    const [primera, segunda] = orden({}).lineas;
    if (!primera || !segunda) throw new Error('El ejemplo debe traer dos líneas.');
    repo.ordenes.push(
      orden({
        codigo: 'PC-2026-00006',
        estado: 'revision_disponibilidad',
        lineas: [{ ...primera, ultimaMarca: 'consiguiendo_stock' }, { ...segunda, ultimaMarca: 'no_disponible' }],
      }),
      orden({
        codigo: 'PC-2026-00007',
        estado: 'revision_disponibilidad',
        lineas: [{ ...primera, ultimaMarca: 'disponible' }, { ...segunda, ultimaMarca: null }],
      }),
    );

    const enRevision = ordenClienteResponseEnvelopeSchema.parse(json(await pedir('/mis-pedidos/PC-2026-00006', 'cliente')));
    expect(enRevision.data.lineas.map((l) => l.disponibilidad)).toEqual(['verificando_disponibilidad', 'rechazado']);

    const mezcla = ordenClienteResponseEnvelopeSchema.parse(json(await pedir('/mis-pedidos/PC-2026-00007', 'cliente')));
    expect(mezcla.data.lineas.map((l) => l.disponibilidad)).toEqual(['confirmado', 'verificando_disponibilidad']);
  });

  it('una orden que sigue su curso confirma todo y una cancelada no muestra disponibilidad', async () => {
    const preparada = ordenClienteResponseEnvelopeSchema.parse(json(await pedir('/mis-pedidos/PC-2026-00001', 'cliente')));
    expect(preparada.data.lineas.map((l) => l.disponibilidad)).toEqual(['confirmado', 'confirmado']);

    const cancelada = ordenClienteResponseEnvelopeSchema.parse(json(await pedir('/mis-pedidos/PC-2026-00004', 'cliente')));
    expect(cancelada.data.lineas.map((l) => l.disponibilidad)).toEqual([null, null]);
  });

  it('no expone al cliente el estado interno de la línea ni quién la marcó (M09 R14)', async () => {
    const r = await pedir('/mis-pedidos/PC-2026-00001', 'cliente');

    expect(r.texto).not.toMatch(/estadoLinea|ultimaMarca|consiguiendo_stock|no_disponible|historial.*autor/);
  });

  it('no expone claves internas, notas ni quién hizo cada cambio (RF-ORD-10-01)', async () => {
    const r = await pedir('/mis-pedidos/PC-2026-00001', 'cliente');

    expect(r.texto).not.toMatch(/idOrden|idUsuario|idVarianteRef|notas|autor|motivo|esEntonado|baseConsumida/);
  });

  it('una orden ajena responde igual que una inexistente y deja rastro (CA-ORD-04-03, ADR-003)', async () => {
    const ajena = await pedir('/mis-pedidos/PC-2026-00005', 'cliente');
    expect(auditoria.registrarAccesoDenegado).toHaveBeenCalledTimes(1);
    expect(auditoria.registrarAccesoDenegado).toHaveBeenCalledWith(
      expect.objectContaining({ idUsuario: 7, permisoRequerido: null }),
    );

    const inexistente = await pedir('/mis-pedidos/PC-2026-99999', 'cliente');

    expect(ajena.status).toBe(404);
    expect(inexistente.status).toBe(404);
    expect(ajena.texto).toBe(inexistente.texto);
  });

  it('un código que no existe, sea cual sea su formato, responde el mismo 404 opaco', async () => {
    const abc = await pedir('/mis-pedidos/abc', 'cliente');
    const inexistente = await pedir('/mis-pedidos/PC-2026-99999', 'cliente');

    expect(abc.status).toBe(404);
    expect(abc.texto).toBe(inexistente.texto);
  });

  it('un código de más de 50 caracteres responde 400 sin consultar', async () => {
    const r = await pedir(`/mis-pedidos/${'X'.repeat(51)}`, 'cliente');
    expect(r.status).toBe(400);
  });

  it('sin sesión verificada responde 404 opaco', async () => {
    const listado = await pedir('/mis-pedidos');
    const detalle = await pedir('/mis-pedidos/PC-2026-00001');

    expect(listado.status).toBe(404);
    expect(detalle.status).toBe(404);
  });
});
