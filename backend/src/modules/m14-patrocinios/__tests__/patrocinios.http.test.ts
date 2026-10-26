import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fechaBogota } from '../services/fechas';
import type { NombreActor, ServidorPrueba } from './helpers/servidor-prueba';

/**
 * M14 · patrocinio de productos (contrato, sección A) contra PostgreSQL real, por HTTP y por el puerto. Se activa con
 * `M01_TEST_DATABASE_URL` (la misma base de pruebas que M01); sin ella se omite (CI sin base de datos).
 */
const URL_BD = process.env.M01_TEST_DATABASE_URL;
const ALEATORIO = Math.random().toString(36).slice(2, 8);
const PREFIJO = `ZZ-PAT-${ALEATORIO}`;

interface Dato {
  [clave: string]: unknown;
}

const dia = (desplazamiento: number): string => fechaBogota(new Date(Date.now() + desplazamiento * 24 * 3600_000));
const AYER = dia(-1);
const MANANA = dia(1);
const EN_UNA_SEMANA = dia(7);
const HACE_UN_MES = dia(-30);
const HACE_UNA_SEMANA = dia(-7);

describe.skipIf(URL_BD === undefined)('M14 · patrocinio de productos (HTTP + PostgreSQL)', () => {
  let servidor: ServidorPrueba;
  let prisma: (typeof import('../../../core/db/client'))['prisma'];
  const auditoria = { registrarAccesoDenegado: vi.fn() };
  const ids: Record<NombreActor, number> = { admin: 0, lector: 0, catalogo: 0 };
  const f = { marca: 0, otraMarca: 0, linea: 0, otraLinea: 0, p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, inactivo: 0 };

  const admin = (metodo: 'GET' | 'POST' | 'PUT' | 'PATCH', ruta: string, cuerpo?: unknown) =>
    servidor.admin('admin', metodo, ruta, cuerpo);
  const dato = (r: { cuerpo: { data?: unknown } }): Dato => r.cuerpo.data as Dato;
  const lista = (r: { cuerpo: { data?: unknown } }): Dato[] => r.cuerpo.data as Dato[];
  const nombre = (sufijo: string): string => `${PREFIJO} ${sufijo}`;

  const cuerpo = (extra: Dato = {}): Dato => ({
    nombre: nombre('Campaña'),
    descripcion: null,
    objetivos: [{ tipo: 'marca', id: f.marca }],
    fechaInicio: AYER,
    fechaFin: EN_UNA_SEMANA,
    prioridad: 10,
    ubicaciones: ['listado'],
    ...extra,
  });

  /** Crea una campaña directo en la base (para fijar fechas pasadas, que la API también admite pero así es más claro). */
  const campaniaEnBd = async (
    sufijo: string,
    objetivos: Array<{ tipo: 'producto' | 'linea' | 'marca'; id: number }>,
    sobre: {
      fechaInicio?: string;
      fechaFin?: string;
      prioridad?: number;
      estado?: 'activo' | 'inactivo';
      ubicaciones?: Array<'listado' | 'inicio' | 'complementarios'>;
    } = {},
  ): Promise<number> => {
    const c = await prisma.campaniaPatrocinio.create({
      data: {
        nombre: nombre(sufijo),
        fechaInicio: new Date(`${sobre.fechaInicio ?? AYER}T00:00:00.000Z`),
        fechaFin: new Date(`${sobre.fechaFin ?? EN_UNA_SEMANA}T00:00:00.000Z`),
        prioridad: sobre.prioridad ?? 0,
        estado: sobre.estado ?? 'activo',
        ubicaciones: sobre.ubicaciones ?? ['listado'],
        objetivos: { create: objetivos.map((o) => ({ tipo: o.tipo, idReferencia: o.id })) },
      },
    });
    return c.idCampania;
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_BD ?? '';
    ({ prisma } = await import('../../../core/db/client.js'));
    const usuario = async (rol: string): Promise<number> =>
      (await prisma.usuario.create({ data: { nombre: `Persona ${rol} ${ALEATORIO}`, correo: `${rol}-${ALEATORIO}@m14.test`, contrasena: 'x' } })).idUsuario;
    ids.admin = await usuario('admin');
    ids.lector = await usuario('lector');
    ids.catalogo = await usuario('catalogo');
    const { levantarServidor } = await import('./helpers/servidor-prueba.js');
    servidor = await levantarServidor(auditoria, ids);

    const categoria = await prisma.categoria.create({ data: { nombre: `${PREFIJO}-cat` } });
    const subcategoria = await prisma.subcategoria.create({ data: { idCategoria: categoria.idCategoria, nombre: `${PREFIJO}-sub` } });
    const marca = async (n: string): Promise<number> =>
      (await prisma.marca.create({ data: { nombre: `${PREFIJO}-${n}`, logotipo: Buffer.from('x'), logotipoMimeType: 'image/png' } })).idMarca;
    f.marca = await marca('marca');
    f.otraMarca = await marca('otra');
    f.linea = (await prisma.linea.create({ data: { idMarca: f.marca, nombre: `${PREFIJO}-linea` } })).idLinea;
    f.otraLinea = (await prisma.linea.create({ data: { idMarca: f.marca, nombre: `${PREFIJO}-lineaB` } })).idLinea;
    const producto = async (idMarca: number, idLinea: number | null, n: string, extra: Dato = {}): Promise<number> =>
      (
        await prisma.producto.create({
          data: { idMarca, ...(idLinea === null ? {} : { idLinea }), idSubcategoria: subcategoria.idSubcategoria, nombre: nombre(n), publicado: true, ...extra },
        })
      ).idProducto;
    f.p1 = await producto(f.marca, f.linea, 'P1');
    f.p2 = await producto(f.marca, f.linea, 'P2');
    f.p3 = await producto(f.marca, f.otraLinea, 'P3');
    f.p4 = await producto(f.marca, null, 'P4');
    f.p5 = await producto(f.otraMarca, null, 'P5');
    f.inactivo = await producto(f.marca, f.linea, 'Inactivo', { estado: 'inactivo' });
    // El catálogo público solo muestra productos con algo que comprar: una variante activa.
    const tipo = await prisma.tipoMedida.create({ data: { nombre: `${PREFIJO}-tipo`, abreviatura: `Y${ALEATORIO}` } });
    const galon = await prisma.medida.create({ data: { idTipoMedida: tipo.idTipoMedida, nombre: `${PREFIJO} galón`, valor: 1 } });
    for (const [i, idProducto] of [f.p1, f.p2, f.p3, f.p4, f.p5, f.inactivo].entries())
      await prisma.variante.create({ data: { idProducto, idMedida: galon.idMedida, sku: `${PREFIJO}-V${i}`, precioVigente: 10000 + i } });
  });

  beforeEach(async () => {
    await prisma.campaniaPatrocinio.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
  });

  afterAll(async () => {
    await prisma.campaniaPatrocinio.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.variante.deleteMany({ where: { sku: { startsWith: PREFIJO } } });
    await prisma.producto.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.medida.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.tipoMedida.deleteMany({ where: { nombre: `${PREFIJO}-tipo` } });
    await prisma.linea.deleteMany({ where: { idLinea: { in: [f.linea, f.otraLinea] } } });
    await prisma.marca.deleteMany({ where: { idMarca: { in: [f.marca, f.otraMarca] } } });
    await prisma.subcategoria.deleteMany({ where: { nombre: `${PREFIJO}-sub` } });
    await prisma.categoria.deleteMany({ where: { nombre: `${PREFIJO}-cat` } });
    await prisma.usuario.deleteMany({ where: { idUsuario: { in: Object.values(ids) } } });
    await servidor.cerrar();
    await prisma.$disconnect();
  });

  describe('permisos propios (C1)', () => {
    it('sin sesión responde 404 uniforme', async () => {
      expect((await servidor.admin(null, 'GET', '/campanias')).status).toBe(404);
    });

    it('con `catalogo.*` pero sin `patrocinios.*` responde 404 y se audita', async () => {
      auditoria.registrarAccesoDenegado.mockClear();
      const r = await servidor.admin('catalogo', 'GET', '/campanias');
      expect([r.status, r.cuerpo.error?.code]).toEqual([404, 'RECURSO_NO_DISPONIBLE']);
      expect(auditoria.registrarAccesoDenegado).toHaveBeenCalled();
      expect((await servidor.admin('catalogo', 'POST', '/campanias', cuerpo())).status).toBe(404);
    });

    it('`patrocinios.ver` consulta pero no escribe', async () => {
      const id = await campaniaEnBd('Existente', [{ tipo: 'marca', id: f.marca }]);
      expect((await servidor.admin('lector', 'GET', '/campanias')).status).toBe(200);
      expect((await servidor.admin('lector', 'GET', `/campanias/${id}`)).status).toBe(200);
      expect((await servidor.admin('lector', 'POST', '/campanias', cuerpo())).status).toBe(404);
      expect((await servidor.admin('lector', 'PUT', `/campanias/${id}`, cuerpo())).status).toBe(404);
      expect((await servidor.admin('lector', 'PATCH', `/campanias/${id}/estado`, { estado: 'inactivo' })).status).toBe(404);
    });

    it('`patrocinios.editar` escribe', async () => {
      expect((await admin('POST', '/campanias', cuerpo())).status).toBe(201);
    });
  });

  describe('alta, detalle y edición (A1–A4, A11)', () => {
    it('crea una campaña con objetivos de los tres tipos y la devuelve con nombres y situación', async () => {
      const r = await admin(
        'POST',
        '/campanias',
        cuerpo({
          descripcion: 'Verano',
          objetivos: [{ tipo: 'marca', id: f.otraMarca }, { tipo: 'linea', id: f.linea }, { tipo: 'producto', id: f.p4 }],
          ubicaciones: ['listado', 'inicio'],
          prioridad: 40,
        }),
      );
      expect(r.status).toBe(201);
      const c = dato(r);
      expect(c).toMatchObject({ nombre: nombre('Campaña'), estado: 'activo', situacion: 'vigente', prioridad: 40, ubicaciones: ['listado', 'inicio'], actualizadoPor: `Persona admin ${ALEATORIO}` });
      expect(c.objetivos).toEqual([
        { tipo: 'marca', id: f.otraMarca, nombre: `${PREFIJO}-otra`, existe: true },
        { tipo: 'linea', id: f.linea, nombre: `${PREFIJO}-marca · ${PREFIJO}-linea`, existe: true },
        { tipo: 'producto', id: f.p4, nombre: `${PREFIJO}-marca · ${nombre('P4')}`, existe: true },
      ]);
    });

    it('las fechas de calendario deciden la situación: programada, vigente y vencida', async () => {
      const programada = dato(await admin('POST', '/campanias', cuerpo({ nombre: nombre('Prog'), fechaInicio: MANANA, fechaFin: EN_UNA_SEMANA })));
      const vencida = dato(await admin('POST', '/campanias', cuerpo({ nombre: nombre('Venc'), fechaInicio: HACE_UN_MES, fechaFin: HACE_UNA_SEMANA })));
      expect([programada.situacion, vencida.situacion]).toEqual(['programado', 'vencido']);
    });

    it('rechaza una marca, línea o producto que no existe con 409 y la lista, y no guarda nada (A3)', async () => {
      const r = await admin('POST', '/campanias', cuerpo({ objetivos: [{ tipo: 'marca', id: f.marca }, { tipo: 'producto', id: 2_000_000_000 }, { tipo: 'linea', id: 2_000_000_001 }] }));
      expect([r.status, r.cuerpo.error?.code]).toEqual([409, 'OBJETIVO_NO_EXISTE']);
      expect(r.cuerpo.error?.details).toEqual([{ tipo: 'producto', id: 2_000_000_000 }, { tipo: 'linea', id: 2_000_000_001 }]);
      expect(await prisma.campaniaPatrocinio.count({ where: { nombre: { startsWith: PREFIJO } } })).toBe(0);
    });

    it('el nombre es único sin distinguir mayúsculas ni espacios de los bordes (A11)', async () => {
      await admin('POST', '/campanias', cuerpo());
      const r = await admin('POST', '/campanias', cuerpo({ nombre: `  ${nombre('CAMPAÑA').toLowerCase()}  `, objetivos: [{ tipo: 'marca', id: f.otraMarca }] }));
      expect([r.status, r.cuerpo.error?.code]).toEqual([409, 'NOMBRE_CAMPANIA_DUPLICADO']);
    });

    it('editar conserva su propio nombre y reemplaza objetivos, fechas, prioridad y ubicaciones', async () => {
      const id = dato(await admin('POST', '/campanias', cuerpo())).idCampania;
      const r = await admin('PUT', `/campanias/${id}`, cuerpo({ objetivos: [{ tipo: 'producto', id: f.p1 }], prioridad: 90, ubicaciones: ['inicio', 'complementarios'], fechaFin: dia(20) }));
      expect(r.status).toBe(200);
      expect(dato(r)).toMatchObject({ prioridad: 90, ubicaciones: ['inicio', 'complementarios'], fechaFin: dia(20) });
      expect((dato(r).objetivos as Dato[]).map((o) => `${String(o.tipo)}:${String(o.id)}`)).toEqual([`producto:${f.p1}`]);
    });

    it('editar a un nombre ya usado por OTRA campaña responde 409', async () => {
      await admin('POST', '/campanias', cuerpo({ nombre: nombre('Uno') }));
      const id = dato(await admin('POST', '/campanias', cuerpo({ nombre: nombre('Dos') }))).idCampania;
      const r = await admin('PUT', `/campanias/${id}`, cuerpo({ nombre: nombre('UNO') }));
      expect(r.cuerpo.error?.code).toBe('NOMBRE_CAMPANIA_DUPLICADO');
    });

    it('validaciones del contrato: sin objetivos, fechas invertidas, prioridad fuera de rango, ubicación desconocida, repetidos', async () => {
      const mal = async (extra: Dato) => (await admin('POST', '/campanias', cuerpo(extra))).status;
      expect(await mal({ objetivos: [] })).toBe(400);
      expect(await mal({ fechaInicio: EN_UNA_SEMANA, fechaFin: AYER })).toBe(400);
      expect(await mal({ prioridad: 101 })).toBe(400);
      expect(await mal({ ubicaciones: ['carrito'] })).toBe(400);
      expect(await mal({ ubicaciones: [] })).toBe(400);
      expect(await mal({ objetivos: [{ tipo: 'marca', id: f.marca }, { tipo: 'marca', id: f.marca }] })).toBe(400);
      expect(await mal({ fechaFin: undefined })).toBe(400);
    });

    it('un id inexistente o mal escrito responde 404 o 400', async () => {
      expect((await admin('GET', '/campanias/2000000000')).status).toBe(404);
      expect((await admin('GET', '/campanias/abc')).status).toBe(400);
      expect((await admin('PUT', '/campanias/2000000000', cuerpo())).status).toBe(404);
      expect((await admin('PATCH', '/campanias/2000000000/estado', { estado: 'inactivo' })).status).toBe(404);
    });
  });

  describe('estado, lista y filtros', () => {
    it('desactivar una campaña vigente la deja `inactivo` y reactivarla la devuelve a vigente (no se borra)', async () => {
      const id = dato(await admin('POST', '/campanias', cuerpo())).idCampania;
      expect(dato(await admin('PATCH', `/campanias/${id}/estado`, { estado: 'inactivo' }))).toMatchObject({ estado: 'inactivo', situacion: 'inactivo' });
      expect(dato(await admin('PATCH', `/campanias/${id}/estado`, { estado: 'activo' })).situacion).toBe('vigente');
      expect((await admin('PATCH', `/campanias/${id}/estado`, { estado: 'borrada' })).status).toBe(400);
    });

    it('la lista cuenta productos cubiertos y visibles, y filtra por situación, ubicación y nombre', async () => {
      await campaniaEnBd('Marca', [{ tipo: 'marca', id: f.marca }], { ubicaciones: ['listado'] });
      await campaniaEnBd('Linea', [{ tipo: 'linea', id: f.linea }], { ubicaciones: ['inicio'] });
      await campaniaEnBd('Vieja', [{ tipo: 'producto', id: f.p5 }], { fechaInicio: HACE_UN_MES, fechaFin: HACE_UNA_SEMANA });
      const todas = lista(await admin('GET', `/campanias?busqueda=${PREFIJO}&limite=50`));
      expect(todas).toHaveLength(3);
      const porNombre = Object.fromEntries(todas.map((c) => [String(c.nombre).replace(`${PREFIJO} `, ''), c]));
      // la marca tiene 6 productos propios (P1–P4 y el inactivo… = 5 visibles-o-no): P1, P2, P3, P4 visibles + Inactivo
      expect(porNombre.Marca).toMatchObject({ totalProductos: 5, productosVisibles: 4, situacion: 'vigente' });
      expect(porNombre.Linea).toMatchObject({ totalProductos: 3, productosVisibles: 2 }); // P1, P2 y el inactivo
      expect(porNombre.Vieja).toMatchObject({ totalProductos: 1, productosVisibles: 1, situacion: 'vencido' });
      expect(lista(await admin('GET', `/campanias?busqueda=${PREFIJO}&situacion=vencido`)).map((c) => c.nombre)).toEqual([nombre('Vieja')]);
      expect(lista(await admin('GET', `/campanias?busqueda=${PREFIJO}&ubicacion=inicio`)).map((c) => c.nombre)).toEqual([nombre('Linea')]);
      expect(lista(await admin('GET', `/campanias?busqueda=${PREFIJO.toLowerCase()}-nada`))).toEqual([]);
    });

    it('pagina la lista', async () => {
      for (const n of ['A1', 'A2', 'A3']) await campaniaEnBd(n, [{ tipo: 'producto', id: f.p1 }]);
      const r = await admin('GET', `/campanias?busqueda=${PREFIJO}&limite=2&pagina=2`);
      expect(r.cuerpo.pagination).toMatchObject({ pagina: 2, limite: 2, total: 3, totalPaginas: 2 });
      expect(lista(r)).toHaveLength(1);
    });
  });

  describe('productos cubiertos, vista previa y referencias (A3, A6, A12)', () => {
    it('una marca cubre todos sus productos, también los creados después, y marca los no visibles', async () => {
      const id = await campaniaEnBd('Marca', [{ tipo: 'marca', id: f.marca }]);
      let r = await admin('GET', `/campanias/${id}/productos?limite=50`);
      expect(lista(r).map((p) => p.nombre)).toEqual([nombre('Inactivo'), nombre('P1'), nombre('P2'), nombre('P3'), nombre('P4')]);
      expect(Object.fromEntries(lista(r).map((p) => [String(p.nombre).replace(`${PREFIJO} `, ''), p.visible]))).toEqual({ Inactivo: false, P1: true, P2: true, P3: true, P4: true });
      const nuevo = await prisma.producto.create({ data: { idMarca: f.marca, idSubcategoria: (await prisma.subcategoria.findFirstOrThrow({ where: { nombre: `${PREFIJO}-sub` } })).idSubcategoria, nombre: nombre('P6'), publicado: true } });
      r = await admin('GET', `/campanias/${id}/productos?limite=50`);
      expect(lista(r).map((p) => p.nombre)).toContain(nombre('P6'));
      await prisma.producto.delete({ where: { idProducto: nuevo.idProducto } });
    });

    it('una línea no cubre los productos de otra línea ni los sin línea', async () => {
      const id = await campaniaEnBd('Linea', [{ tipo: 'linea', id: f.linea }]);
      const r = await admin('GET', `/campanias/${id}/productos?limite=50`);
      expect(lista(r).map((p) => p.nombre)).toEqual([nombre('Inactivo'), nombre('P1'), nombre('P2')]);
    });

    it('un producto sin publicar o de una marca inactiva no es visible', async () => {
      await prisma.producto.update({ where: { idProducto: f.p2 }, data: { publicado: false } });
      await prisma.marca.update({ where: { idMarca: f.otraMarca }, data: { estado: 'inactivo' } });
      const id = await campaniaEnBd('Mixta', [{ tipo: 'producto', id: f.p2 }, { tipo: 'producto', id: f.p5 }, { tipo: 'producto', id: f.p1 }]);
      const r = await admin('GET', `/campanias/${id}/productos`);
      expect(Object.fromEntries(lista(r).map((p) => [String(p.nombre).replace(`${PREFIJO} `, ''), p.visible]))).toEqual({ P1: true, P2: false, P5: false });
      await prisma.producto.update({ where: { idProducto: f.p2 }, data: { publicado: true } });
      await prisma.marca.update({ where: { idMarca: f.otraMarca }, data: { estado: 'activo' } });
    });

    it('la vista previa no escribe, pagina, valida los objetivos y responde igual que lo que se guardaría', async () => {
      const objetivos = [{ tipo: 'linea', id: f.linea }, { tipo: 'producto', id: f.p5 }];
      const r = await admin('POST', '/campanias/vista-previa?limite=2&pagina=1', { objetivos });
      expect(r.cuerpo.pagination).toMatchObject({ total: 4, totalPaginas: 2 });
      expect(lista(r)).toHaveLength(2);
      expect(await prisma.campaniaPatrocinio.count({ where: { nombre: { startsWith: PREFIJO } } })).toBe(0);
      const mala = await admin('POST', '/campanias/vista-previa', { objetivos: [{ tipo: 'marca', id: 2_000_000_000 }] });
      expect(mala.cuerpo.error?.code).toBe('OBJETIVO_NO_EXISTE');
      expect((await admin('POST', '/campanias/vista-previa', { objetivos: [] })).status).toBe(400);
    });

    it('el buscador de referencias encuentra productos, líneas y marcas por nombre', async () => {
      const marcas = lista(await admin('GET', `/referencias?tipo=marca&busqueda=${PREFIJO}`));
      expect(marcas.map((m) => m.nombre).sort()).toEqual([`${PREFIJO}-marca`, `${PREFIJO}-otra`]);
      const lineas = lista(await admin('GET', `/referencias?tipo=linea&busqueda=${PREFIJO}-linea`));
      expect(lineas.map((l) => l.nombre).sort()).toEqual([`${PREFIJO}-marca · ${PREFIJO}-linea`, `${PREFIJO}-marca · ${PREFIJO}-lineaB`]);
      const productos = lista(await admin('GET', `/referencias?tipo=producto&busqueda=${PREFIJO}%20P1`));
      expect(productos).toEqual([{ tipo: 'producto', id: f.p1, nombre: `${PREFIJO}-marca · ${nombre('P1')}` }]);
      expect((await admin('GET', '/referencias?tipo=color')).status).toBe(400);
    });
  });

  describe('PatrocinioPort (A1, A4, A5, A7)', () => {
    // Otros archivos de prueba comparten la base y pueden tener campañas vigentes: solo se miran los productos de esta.
    const propios = (): number[] => [f.p1, f.p2, f.p3, f.p4, f.p5, f.inactivo];
    const prioridades = async (ubicacion: 'listado' | 'inicio' | 'complementarios', momento?: string) =>
      Object.fromEntries(
        (await servidor.modulo.patrocinio.prioridadesDeProductos(ubicacion, momento))
          .filter((p) => propios().includes(p.idProducto))
          .map((p) => [p.idProducto, [p.prioridad, p.idCampania]]),
      );

    it('devuelve los productos de campañas vigentes en esa ubicación con la prioridad más alta (A5)', async () => {
      const marca = await campaniaEnBd('Marca', [{ tipo: 'marca', id: f.marca }], { prioridad: 10 });
      const linea = await campaniaEnBd('Linea', [{ tipo: 'linea', id: f.linea }], { prioridad: 70 });
      const r = await prioridades('listado');
      expect(r[f.p1]).toEqual([70, linea]);
      expect(r[f.p2]).toEqual([70, linea]);
      expect(r[f.p3]).toEqual([10, marca]);
      expect(r[f.p4]).toEqual([10, marca]);
      expect(r[f.p5]).toBeUndefined();
    });

    it('cada ubicación ve solo sus campañas', async () => {
      await campaniaEnBd('Inicio', [{ tipo: 'producto', id: f.p1 }], { ubicaciones: ['inicio'] });
      await campaniaEnBd('Comp', [{ tipo: 'producto', id: f.p2 }], { ubicaciones: ['complementarios'] });
      expect(Object.keys(await prioridades('listado'))).toEqual([]);
      expect(Object.keys(await prioridades('inicio'))).toEqual([String(f.p1)]);
      expect(Object.keys(await prioridades('complementarios'))).toEqual([String(f.p2)]);
    });

    it('no cuenta las inactivas, las programadas ni las vencidas, y `momento` fija el «ahora»', async () => {
      await campaniaEnBd('Inactiva', [{ tipo: 'producto', id: f.p1 }], { estado: 'inactivo' });
      await campaniaEnBd('Programada', [{ tipo: 'producto', id: f.p2 }], { fechaInicio: MANANA, fechaFin: EN_UNA_SEMANA });
      await campaniaEnBd('Vencida', [{ tipo: 'producto', id: f.p3 }], { fechaInicio: HACE_UN_MES, fechaFin: HACE_UNA_SEMANA });
      expect(Object.keys(await prioridades('listado'))).toEqual([]);
      // la programada sí cuenta si «ahora» cae dentro de sus fechas; la vencida, si cae en las suyas
      expect(Object.keys(await prioridades('listado', `${MANANA}T15:00:00.000Z`))).toEqual([String(f.p2)]);
      expect(Object.keys(await prioridades('listado', `${HACE_UNA_SEMANA}T15:00:00.000Z`))).toEqual([String(f.p3)]);
    });

    it('caduca sola: el último día cuenta y al siguiente ya no (A2)', async () => {
      await campaniaEnBd('Termina', [{ tipo: 'producto', id: f.p1 }], { fechaInicio: dia(-3), fechaFin: dia(2) });
      expect(Object.keys(await prioridades('listado', `${dia(2)}T22:00:00-05:00`))).toEqual([String(f.p1)]);
      expect(Object.keys(await prioridades('listado', `${dia(3)}T00:10:00-05:00`))).toEqual([]);
    });
  });

  describe('bloque «Productos patrocinados» del inicio (A10)', () => {
    // El bloque es global: se piden hasta 24 y solo se miran los productos de esta prueba.
    const bloque = async (consulta = '?limite=24') => {
      const r = await servidor.publico(`/productos${consulta}`);
      return { r, propios: lista(r).filter((p) => String(p.nombre).startsWith(PREFIJO)) };
    };

    it('sin campañas vigentes no trae productos de esta prueba (y responde 200)', async () => {
      const { r, propios } = await bloque();
      expect([r.status, propios]).toEqual([200, []]);
    });

    it('responde las tarjetas de los productos visibles, con la marca de patrocinio, la campaña y por prioridad', async () => {
      const baja = await campaniaEnBd('Baja', [{ tipo: 'producto', id: f.p4 }], { ubicaciones: ['inicio'], prioridad: 5 });
      const alta = await campaniaEnBd('Alta', [{ tipo: 'producto', id: f.p1 }], { ubicaciones: ['inicio'], prioridad: 90 });
      await campaniaEnBd('Invisible', [{ tipo: 'producto', id: f.inactivo }], { ubicaciones: ['inicio'], prioridad: 100 });
      await campaniaEnBd('Otra ubicacion', [{ tipo: 'producto', id: f.p2 }], { ubicaciones: ['listado'], prioridad: 100 });
      const { r, propios: items } = await bloque();
      expect(r.status).toBe(200);
      expect(items.map((p) => p.idProducto)).toEqual([f.p1, f.p4]);
      expect(items[0]).toMatchObject({ patrocinado: true, idCampania: alta, nombre: nombre('P1'), oferta: null });
      expect(items[1]).toMatchObject({ patrocinado: true, idCampania: baja });
    });

    it('respeta el límite y valida que sea un entero de 1 a 24', async () => {
      await campaniaEnBd('Marca', [{ tipo: 'marca', id: f.marca }], { ubicaciones: ['inicio'] });
      expect(lista(await servidor.publico('/productos?limite=2')).length).toBeLessThanOrEqual(2);
      expect(lista(await servidor.publico('/productos?limite=24')).filter((p) => String(p.nombre).startsWith(PREFIJO)).length).toBeGreaterThanOrEqual(4);
      expect((await servidor.publico('/productos?limite=25')).status).toBe(400);
      expect((await servidor.publico('/productos?limite=0')).status).toBe(400);
    });

    it('es público: no pide sesión ni permisos', async () => {
      expect((await servidor.publico('/productos')).status).toBe(200);
    });
  });

  describe('complementarios de la ficha (A7, R12)', () => {
    const complementarios = async (idProducto: number): Promise<number[]> =>
      lista(await servidor.catalogo(`/productos/${idProducto}/complementarios`)).map((t) => t.idProducto as number);

    it('sin categoría complementaria van primero los de campañas vigentes con esa ubicación, por prioridad, y luego los marcados a mano', async () => {
      // La base de pruebas trae productos con el interruptor manual `patrocinado` (el seed): quedan detrás de las
      // campañas y, entre ellos, en orden aleatorio.
      const baja = await campaniaEnBd('Baja', [{ tipo: 'producto', id: f.p3 }], { ubicaciones: ['complementarios'], prioridad: 10 });
      const alta = await campaniaEnBd('Alta', [{ tipo: 'producto', id: f.p4 }], { ubicaciones: ['complementarios'], prioridad: 90 });
      await campaniaEnBd('Otra ubicacion', [{ tipo: 'producto', id: f.p5 }], { ubicaciones: ['listado'], prioridad: 100 });
      const ids = await complementarios(f.p1);
      expect(ids.slice(0, 2)).toEqual([f.p4, f.p3]);
      expect(ids.length).toBeLessThanOrEqual(4);
      // La etiqueta «Patrocinado» y la campaña viajan con cada tarjeta puesta por una campaña (A9)
      const tarjetas = lista(await servidor.catalogo(`/productos/${f.p1}/complementarios`));
      expect(tarjetas.slice(0, 2)).toMatchObject([
        { idProducto: f.p4, patrocinado: true, idCampania: alta },
        { idProducto: f.p3, patrocinado: true, idCampania: baja },
      ]);
      expect(tarjetas.slice(2).every((t) => t.patrocinado === false && t.idCampania === null)).toBe(true);
    });

    it('nunca sugiere el propio producto ni uno que no se muestra', async () => {
      await campaniaEnBd('Marca', [{ tipo: 'marca', id: f.marca }], { ubicaciones: ['complementarios'] });
      const ids = await complementarios(f.p1);
      expect(ids).not.toContain(f.p1);
      expect(ids).not.toContain(f.inactivo);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('una campaña vencida o inactiva no cuenta', async () => {
      await campaniaEnBd('Inactiva', [{ tipo: 'producto', id: f.p2 }], { ubicaciones: ['complementarios'], estado: 'inactivo' });
      await campaniaEnBd('Vencida', [{ tipo: 'producto', id: f.p3 }], { ubicaciones: ['complementarios'], fechaInicio: HACE_UN_MES, fechaFin: HACE_UNA_SEMANA });
      const ids = await complementarios(f.p1);
      expect(ids).not.toContain(f.p2);
      expect(ids).not.toContain(f.p3);
    });
  });
});
