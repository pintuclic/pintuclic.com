import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NombreActor, ServidorPrueba } from './helpers/servidor-prueba';
import { aBogota } from '../services/fechas';

/**
 * M06 (contrato completo) contra PostgreSQL real, por HTTP y por el puerto. Se activa con
 * `M01_TEST_DATABASE_URL` (la misma base de pruebas que M01); sin ella se omite (CI sin base de datos).
 */
const URL_BD = process.env.M01_TEST_DATABASE_URL;
const ALEATORIO = Math.random().toString(36).slice(2, 8);
const PREFIJO = `ZZ-PRE-${ALEATORIO}`;

interface Dato {
  [clave: string]: unknown;
}

const AYER = aBogota(new Date(Date.now() - 24 * 60 * 60 * 1000)).fecha;
const MIERCOLES = '2026-11-04T15:00:00.000Z'; // 10:00 en Bogotá
const JUEVES = '2026-11-05T15:00:00.000Z';

describe.skipIf(URL_BD === undefined)('M06 · precios, eventos y descuentos (HTTP + PostgreSQL)', () => {
  let servidor: ServidorPrueba;
  let prisma: (typeof import('../../../core/db/client'))['prisma'];
  const auditoria = { registrarAccesoDenegado: vi.fn() };

  const ids: Record<NombreActor, number> = {
    admin: 0,
    lector: 0,
    editor: 0,
    cliente: 987_654_321,
    particular: 0,
    empresa: 0,
    empresaMinimo: 0,
  };
  // catálogo de prueba
  const c = {
    marcaA: 0,
    marcaB: 0,
    linea1: 0,
    linea2: 0,
    famBlanco: 0,
    famAzul: 0,
    blanco: 0,
    azul: 0,
    p1: 0,
    p2: 0,
    p3: 0,
    p4: 0,
    p1g: 0,
    p1c: 0,
    p2g: 0,
    p3g: 0,
    p4g: 0,
    tipoProveedor: 0,
    tipoConstructora: 0,
  };
  const admin = (m: 'GET' | 'POST' | 'PUT' | 'PATCH', ruta: string, cuerpo?: unknown) =>
    servidor.admin('admin', m, ruta, cuerpo);
  const publico = (actor: NombreActor | null, ruta: string, cuerpo?: unknown) =>
    servidor.publico(actor, cuerpo === undefined ? 'GET' : 'POST', ruta, cuerpo);
  const dato = (r: { cuerpo: { data?: unknown } }): Dato => r.cuerpo.data as Dato;
  const lista = (r: { cuerpo: { data?: unknown } }): Dato[] => r.cuerpo.data as Dato[];
  const codigo = (r: { cuerpo: { error?: { code: string } } }): string | undefined => r.cuerpo.error?.code;

  const calendarioHoy = {
    fechaInicio: AYER,
    fechaFin: null,
    diasSemana: [] as number[],
    horaInicio: null,
    horaFin: null,
  };
  const evento = (sobre: Dato = {}): Dato => ({
    nombre: `${PREFIJO} evento`,
    descripcion: null,
    calendario: calendarioHoy,
    reglas: [{ objetivo: { tipo: 'linea', id: c.linea1 }, porcentaje: 15, exclusiones: [] }],
    exclusiones: [],
    ...sobre,
  });
  const crearEvento = async (sobre: Dato = {}): Promise<Dato> => {
    const r = await admin('POST', '/eventos', evento(sobre));
    expect(r.status, JSON.stringify(r.cuerpo)).toBe(201);
    return dato(r);
  };
  const calcular = (actor: NombreActor | null, lineas: Dato[], extra: Dato = {}) =>
    publico(actor, '/calcular', { lineas, ...extra });
  const linea = (idVariante: number, cantidad = 1, idColor?: number): Dato => ({
    idVariante,
    cantidad,
    ...(idColor === undefined ? {} : { idColor }),
  });
  const resumen = (r: { cuerpo: { data?: unknown } }): Dato => dato(r).resumen as Dato;
  const lineasDe = (r: { cuerpo: { data?: unknown } }): Dato[] => dato(r).lineas as Dato[];

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_BD ?? '';
    ({ prisma } = await import('../../../core/db/client.js'));
    const { levantarServidor } = await import('./helpers/servidor-prueba.js');

    const usuario = async (rol: string, tipo: 'normal' | 'empresa' = 'normal'): Promise<number> =>
      (
        await prisma.usuario.create({
          data: {
            nombre: `Persona ${rol} ${ALEATORIO}`,
            correo: `${rol}-${ALEATORIO}@m06.test`,
            contrasena: 'x',
            tipo,
          },
        })
      ).idUsuario;
    ids.admin = await usuario('admin');
    ids.lector = await usuario('lector');
    ids.editor = await usuario('editor');
    ids.particular = await usuario('particular');
    ids.empresa = await usuario('empresa', 'empresa');
    ids.empresaMinimo = await usuario('empresamin', 'empresa');

    const tipo = async (nombre: string, porcentaje: number, minimo: number): Promise<number> => {
      const d = await prisma.descuento.create({
        data: { porcentajeDescuento: porcentaje, tope: 0, montoMinimoCompra: minimo },
      });
      return (
        await prisma.subRolEmpresa.create({ data: { nombre: `${PREFIJO} ${nombre}`, idDescuento: d.idDescuento } })
      ).idSubRolEmpresa;
    };
    c.tipoProveedor = await tipo('Proveedor', 15, 0);
    c.tipoConstructora = await tipo('Constructora', 10, 300000);
    const cuenta = (idUsuario: number, idSubRolEmpresa: number, n: number) =>
      prisma.cuentaEmpresa.create({
        data: {
          idUsuario,
          nit: `${PREFIJO}-${n}`,
          nombreEmpresa: `Empresa ${n}`,
          nombreRepresentante: 'Rep',
          correoEmpresarial: `e${n}-${ALEATORIO}@m06.test`,
          telefono: '3000000000',
          idSubRolEmpresa,
        },
      });
    await cuenta(ids.empresa, c.tipoProveedor, 1);
    await cuenta(ids.empresaMinimo, c.tipoConstructora, 2);

    servidor = await levantarServidor(auditoria, ids);

    const categoria = await prisma.categoria.create({ data: { nombre: `${PREFIJO}-cat` } });
    const subcategoria = await prisma.subcategoria.create({
      data: { idCategoria: categoria.idCategoria, nombre: `${PREFIJO}-sub` },
    });
    const logotipo = { logotipo: Buffer.from('x'), logotipoMimeType: 'image/png' };
    c.marcaA = (await prisma.marca.create({ data: { nombre: `${PREFIJO} Marca A`, ...logotipo } })).idMarca;
    c.marcaB = (await prisma.marca.create({ data: { nombre: `${PREFIJO} Marca B`, ...logotipo } })).idMarca;
    c.linea1 = (await prisma.linea.create({ data: { idMarca: c.marcaA, nombre: `${PREFIJO} Viniltex` } })).idLinea;
    c.linea2 = (await prisma.linea.create({ data: { idMarca: c.marcaA, nombre: `${PREFIJO} Koraza` } })).idLinea;
    const tm = await prisma.tipoMedida.create({ data: { nombre: `${PREFIJO}-tipo`, abreviatura: `Z${ALEATORIO}` } });
    const medida = async (nombre: string, valor: number): Promise<number> =>
      (await prisma.medida.create({ data: { idTipoMedida: tm.idTipoMedida, nombre, valor } })).idMedida;
    const galon = await medida(`${PREFIJO} galón`, 1);
    const cuarto = await medida(`${PREFIJO} cuarto`, 0.25);
    c.famBlanco = (
      await prisma.familiaColor.create({ data: { nombre: `${PREFIJO} Blancos`, hexadecimal: '#FFFFFF' } })
    ).idFamiliaColor;
    c.famAzul = (
      await prisma.familiaColor.create({ data: { nombre: `${PREFIJO} Azules`, hexadecimal: '#0000FF' } })
    ).idFamiliaColor;
    const acabado = await prisma.acabado.create({ data: { nombre: `${PREFIJO} mate` } });
    const color = async (nombre: string, idFamiliaColor: number, hexadecimal: string): Promise<number> =>
      (
        await prisma.color.create({
          data: {
            idMarca: c.marcaA,
            nombre: `${PREFIJO} ${nombre}`,
            idAcabado: acabado.idAcabado,
            idFamiliaColor,
            hexadecimal,
          },
        })
      ).idColor;
    c.blanco = await color('Blanco', c.famBlanco, '#FFFFFF');
    c.azul = await color('Azul', c.famAzul, '#0000FF');

    const producto = async (
      idMarca: number,
      idLinea: number | null,
      nombre: string,
      excluido = false,
    ): Promise<number> =>
      (
        await prisma.producto.create({
          data: {
            idMarca,
            ...(idLinea === null ? {} : { idLinea }),
            idSubcategoria: subcategoria.idSubcategoria,
            nombre: `${PREFIJO} ${nombre}`,
            publicado: true,
            excluidoDeDescuentos: excluido,
          },
        })
      ).idProducto;
    c.p1 = await producto(c.marcaA, c.linea1, 'P1');
    c.p2 = await producto(c.marcaA, c.linea2, 'P2');
    c.p3 = await producto(c.marcaA, c.linea1, 'P3 excluido', true);
    c.p4 = await producto(c.marcaB, null, 'P4');
    for (const idColor of [c.blanco, c.azul]) {
      await prisma.productoColor.create({ data: { idProducto: c.p1, idColor } });
    }
    const variante = async (idProducto: number, idMedida: number, sufijo: string, precio: number): Promise<number> =>
      (
        await prisma.variante.create({
          data: { idProducto, idMedida, sku: `${PREFIJO}-${sufijo}`, precioVigente: precio },
        })
      ).idVariante;
    c.p1g = await variante(c.p1, galon, 'P1G', 100000);
    c.p1c = await variante(c.p1, cuarto, 'P1C', 30000);
    c.p2g = await variante(c.p2, galon, 'P2G', 80000);
    c.p3g = await variante(c.p3, galon, 'P3G', 50000);
    c.p4g = await variante(c.p4, galon, 'P4G', 40000);
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    auditoria.registrarAccesoDenegado.mockClear();
    servidor.parametros.iva = 19;
    servidor.parametros.umbralSugerirEmpresa = 500000;
    await prisma.cuponUso.deleteMany({ where: { cupon: { codigo: { startsWith: 'ZZ' } } } });
    await prisma.cupon.deleteMany({ where: { codigo: { startsWith: 'ZZ' } } });
    await prisma.eventoDescuento.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.subRolEmpresa.updateMany({
      where: { idSubRolEmpresa: { in: [c.tipoProveedor, c.tipoConstructora] } },
      data: { estado: 'activo' },
    });
    await prisma.descuento.updateMany({
      where: { subRoles: { some: { idSubRolEmpresa: { in: [c.tipoProveedor, c.tipoConstructora] } } } },
      data: { estado: 'activo' },
    });
  });

  afterAll(async () => {
    const productos = [c.p1, c.p2, c.p3, c.p4];
    await prisma.cuponUso.deleteMany({ where: { cupon: { codigo: { startsWith: 'ZZ' } } } });
    await prisma.cupon.deleteMany({ where: { codigo: { startsWith: 'ZZ' } } });
    await prisma.eventoDescuento.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.variante.deleteMany({ where: { idProducto: { in: productos } } });
    await prisma.productoColor.deleteMany({ where: { idProducto: { in: productos } } });
    await prisma.producto.deleteMany({ where: { idProducto: { in: productos } } });
    await prisma.color.deleteMany({ where: { idColor: { in: [c.blanco, c.azul] } } });
    await prisma.acabado.deleteMany({ where: { nombre: `${PREFIJO} mate` } });
    await prisma.familiaColor.deleteMany({ where: { idFamiliaColor: { in: [c.famBlanco, c.famAzul] } } });
    await prisma.medida.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.tipoMedida.deleteMany({ where: { nombre: `${PREFIJO}-tipo` } });
    await prisma.linea.deleteMany({ where: { idLinea: { in: [c.linea1, c.linea2] } } });
    await prisma.marca.deleteMany({ where: { idMarca: { in: [c.marcaA, c.marcaB] } } });
    await prisma.subcategoria.deleteMany({ where: { nombre: `${PREFIJO}-sub` } });
    await prisma.categoria.deleteMany({ where: { nombre: `${PREFIJO}-cat` } });
    await prisma.cuentaEmpresa.deleteMany({ where: { idUsuario: { in: [ids.empresa, ids.empresaMinimo] } } });
    await prisma.subRolEmpresa.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.descuento.deleteMany({
      where: { subRoles: { none: {} }, porcentajeDescuento: { in: [15, 10, 12, 20] }, tope: 0, idDescuento: { gt: 2 } },
    });
    await prisma.usuario.deleteMany({
      where: { idUsuario: { in: [ids.admin, ids.lector, ids.editor, ids.particular, ids.empresa, ids.empresaMinimo] } },
    });
    await servidor.cerrar();
    await prisma.$disconnect();
  });

  describe('autorización (R21)', () => {
    const rutas: Array<[string, 'GET' | 'POST' | 'PUT' | 'PATCH', string, unknown]> = [
      ['listar eventos', 'GET', '/eventos', undefined],
      ['crear evento', 'POST', '/eventos', {}],
      ['vista previa', 'POST', '/eventos/vista-previa', {}],
      ['obtener evento', 'GET', '/eventos/1', undefined],
      ['actualizar evento', 'PUT', '/eventos/1', {}],
      ['estado evento', 'PATCH', '/eventos/1/estado', { estado: 'inactivo' }],
      ['listar cupones', 'GET', '/cupones', undefined],
      ['crear cupón', 'POST', '/cupones', {}],
      ['obtener cupón', 'GET', '/cupones/1', undefined],
      ['usos de cupón', 'GET', '/cupones/1/usos', undefined],
      ['listar tipos', 'GET', '/tipos-cliente-empresa', undefined],
      ['crear tipo', 'POST', '/tipos-cliente-empresa', {}],
      ['actualizar tipo', 'PUT', '/tipos-cliente-empresa/1', {}],
      ['estado tipo', 'PATCH', '/tipos-cliente-empresa/1/estado', { estado: 'inactivo' }],
      ['simular', 'POST', '/simular', {}],
    ];

    it.each(rutas)('%s: sin sesión responde 404 RECURSO_NO_DISPONIBLE', async (_n, m, ruta, cuerpo) => {
      const r = await servidor.admin(null, m, ruta, cuerpo);
      expect([r.status, codigo(r)]).toEqual([404, 'RECURSO_NO_DISPONIBLE']);
    });

    it.each(rutas)('%s: un cliente sin permisos recibe la misma respuesta 404', async (_n, m, ruta, cuerpo) => {
      const r = await servidor.admin('cliente', m, ruta, cuerpo);
      expect([r.status, codigo(r)]).toEqual([404, 'RECURSO_NO_DISPONIBLE']);
    });

    it('quien solo puede ver (catalogo.ver) consulta y simula pero no escribe', async () => {
      const lector = (m: 'GET' | 'POST' | 'PUT' | 'PATCH', ruta: string, cuerpo?: unknown) =>
        servidor.admin('lector', m, ruta, cuerpo);
      expect((await lector('GET', '/eventos')).status).toBe(200);
      expect((await lector('GET', '/cupones')).status).toBe(200);
      expect((await lector('GET', '/tipos-cliente-empresa')).status).toBe(200);
      expect((await lector('POST', '/eventos/vista-previa', evento())).status).toBe(200);
      expect(
        (
          await lector('POST', '/simular', {
            lineas: [linea(c.p1g)],
            perfil: { tipo: 'particular', idSubRolEmpresa: null },
          })
        ).status,
      ).toBe(200);
      expect((await lector('POST', '/eventos', evento())).status).toBe(404);
      expect((await lector('POST', '/cupones', {})).status).toBe(404);
      expect(
        (
          await lector('POST', '/tipos-cliente-empresa', {
            nombre: `${PREFIJO} x`,
            porcentaje: 5,
            montoMinimoCompra: 0,
            tope: 0,
          })
        ).status,
      ).toBe(404);
      expect(await prisma.eventoDescuento.count({ where: { nombre: { startsWith: PREFIJO } } })).toBe(0);
    });

    it('registra los accesos denegados en la auditoría', async () => {
      await servidor.admin('cliente', 'GET', '/eventos');
      expect(auditoria.registrarAccesoDenegado).toHaveBeenCalled();
    });

    it('lo público no pide sesión', async () => {
      expect((await publico(null, '/eventos-en-curso')).status).toBe(200);
      expect((await calcular(null, [linea(c.p1g)])).status).toBe(200);
    });
  });

  describe('eventos (motor)', () => {
    it('crea un evento con calendario, reglas con porcentaje propio y excepciones; devuelve nombres', async () => {
      const e = await crearEvento({
        nombre: `${PREFIJO} Miércoles de color`,
        calendario: {
          fechaInicio: '2026-11-04',
          fechaFin: null,
          diasSemana: [3],
          horaInicio: '08:00',
          horaFin: '20:00',
        },
        reglas: [
          { objetivo: { tipo: 'linea', id: c.linea1 }, porcentaje: 15, exclusiones: [{ tipo: 'producto', id: c.p3 }] },
          { objetivo: { tipo: 'linea', id: c.linea2 }, porcentaje: 10, exclusiones: [{ tipo: 'color', id: c.azul }] },
        ],
        exclusiones: [{ tipo: 'familia_color', id: c.famBlanco }],
      });
      expect(e).toMatchObject({
        estado: 'activo',
        calendario: { diasSemana: [3], horaInicio: '08:00', horaFin: '20:00' },
      });
      const reglas = e.reglas as Dato[];
      expect(reglas.map((r) => r.porcentaje)).toEqual([15, 10]);
      expect((reglas[0]?.objetivo as Dato).nombre).toContain('Viniltex');
      expect(((reglas[1]?.exclusiones as Dato[])[0] as Dato).tipo).toBe('color');
      expect((e.exclusiones as Dato[])[0]).toMatchObject({ tipo: 'familia_color', nombre: `${PREFIJO} Blancos` });
    });

    it('rechaza referencias que no existen y no guarda nada (R19)', async () => {
      const r = await admin(
        'POST',
        '/eventos',
        evento({
          reglas: [
            { objetivo: { tipo: 'marca', id: 987654 }, porcentaje: 5, exclusiones: [{ tipo: 'color', id: 987655 }] },
          ],
        }),
      );
      expect([r.status, codigo(r)]).toEqual([400, 'OBJETIVO_NO_EXISTE']);
      expect(r.cuerpo.error?.details).toEqual([
        { tipo: 'marca', id: 987654 },
        { tipo: 'color', id: 987655 },
      ]);
      expect(await prisma.eventoDescuento.count({ where: { nombre: { startsWith: PREFIJO } } })).toBe(0);
    });

    it.each([
      ['sin reglas', { reglas: [] }],
      ['porcentaje 0', { reglas: [{ objetivo: null, porcentaje: 0, exclusiones: [] }] }],
      ['fin antes del inicio', { calendario: { ...calendarioHoy, fechaFin: '2000-01-01' } }],
      ['solo hora de inicio', { calendario: { ...calendarioHoy, horaInicio: '08:00' } }],
    ])('valida el cuerpo: %s → 400 PARAMETRO_INVALIDO', async (_n, sobre) => {
      const r = await admin('POST', '/eventos', evento(sobre));
      expect([r.status, codigo(r)]).toEqual([400, 'PARAMETRO_INVALIDO']);
    });

    it('lista con situación derivada, filtros y paginación', async () => {
      await crearEvento({ nombre: `${PREFIJO} hoy` });
      await crearEvento({ nombre: `${PREFIJO} futuro`, calendario: { ...calendarioHoy, fechaInicio: '2099-01-01' } });
      const inactivo = await crearEvento({ nombre: `${PREFIJO} apagado` });
      await admin('PATCH', `/eventos/${String(inactivo.idEvento)}/estado`, { estado: 'inactivo' });
      const todos = await admin('GET', `/eventos?busqueda=${PREFIJO}&limite=50`);
      const porNombre = Object.fromEntries(
        lista(todos).map((e) => [String(e.nombre).replace(`${PREFIJO} `, ''), e.situacion]),
      );
      expect(porNombre).toEqual({ hoy: 'en_curso', futuro: 'programado', apagado: 'inactivo' });
      const soloCurso = await admin('GET', `/eventos?busqueda=${PREFIJO}&situacion=en_curso`);
      expect(lista(soloCurso).map((e) => e.nombre)).toEqual([`${PREFIJO} hoy`]);
      expect((await admin('GET', `/eventos?busqueda=${PREFIJO}&limite=1&pagina=2`)).cuerpo.pagination).toMatchObject({
        pagina: 2,
        limite: 1,
        total: 3,
        totalPaginas: 3,
      });
    });

    it('editar reemplaza reglas y excepciones por completo (R18)', async () => {
      const e = await crearEvento({
        reglas: [
          { objetivo: { tipo: 'linea', id: c.linea1 }, porcentaje: 15, exclusiones: [{ tipo: 'producto', id: c.p3 }] },
        ],
        exclusiones: [{ tipo: 'familia_color', id: c.famBlanco }],
      });
      const r = await admin(
        'PUT',
        `/eventos/${String(e.idEvento)}`,
        evento({ reglas: [{ objetivo: { tipo: 'marca', id: c.marcaB }, porcentaje: 7.5, exclusiones: [] }] }),
      );
      expect(r.status).toBe(200);
      expect((dato(r).reglas as Dato[]).map((x) => x.porcentaje)).toEqual([7.5]);
      expect(dato(r).exclusiones).toEqual([]);
      expect(await prisma.eventoExclusion.count({ where: { idEvento: e.idEvento as number } })).toBe(0);
      expect((await admin('PUT', '/eventos/987654321', evento())).status).toBe(404);
    });

    it('activar y desactivar no toca el resto; un id ajeno o mal escrito no se encuentra', async () => {
      const e = await crearEvento();
      const apagado = await admin('PATCH', `/eventos/${String(e.idEvento)}/estado`, { estado: 'inactivo' });
      expect(dato(apagado)).toMatchObject({ estado: 'inactivo', situacion: 'inactivo', nombre: e.nombre });
      expect((await admin('PATCH', '/eventos/987654321/estado', { estado: 'activo' })).status).toBe(404);
      expect((await admin('GET', '/eventos/abc')).status).toBe(400);
    });

    it('la vista previa muestra qué productos entran, sin guardar nada (D12)', async () => {
      const r = await admin(
        'POST',
        '/eventos/vista-previa?limite=100',
        evento({
          reglas: [
            {
              objetivo: { tipo: 'marca', id: c.marcaA },
              porcentaje: 20,
              exclusiones: [{ tipo: 'producto', id: c.p2 }],
            },
          ],
        }),
      );
      expect(r.status).toBe(200);
      const filas = lista(r).filter((f) => String(f.nombre).startsWith(PREFIJO));
      // entra P1 (dos variantes); sale P2 por excepción y P3 por estar excluido de descuentos; P4 es de otra marca
      expect(
        filas.map((f) => [
          String(f.nombre).replace(`${PREFIJO} `, ''),
          f.porcentaje,
          f.variantesConDescuento,
          f.variantesTotales,
        ]),
      ).toEqual([['P1', 20, 2, 2]]);
      expect(await prisma.eventoDescuento.count({ where: { nombre: { startsWith: PREFIJO } } })).toBe(0);
    });

    it('eventos en curso: solo los que aplican ahora, con su porcentaje máximo', async () => {
      await crearEvento({
        nombre: `${PREFIJO} visible`,
        reglas: [
          { objetivo: { tipo: 'linea', id: c.linea1 }, porcentaje: 15, exclusiones: [] },
          { objetivo: { tipo: 'linea', id: c.linea2 }, porcentaje: 25, exclusiones: [] },
        ],
      });
      await crearEvento({ nombre: `${PREFIJO} futuro`, calendario: { ...calendarioHoy, fechaInicio: '2099-01-01' } });
      const apagado = await crearEvento({ nombre: `${PREFIJO} apagado` });
      await admin('PATCH', `/eventos/${String(apagado.idEvento)}/estado`, { estado: 'inactivo' });
      const r = await publico(null, '/eventos-en-curso');
      expect(
        lista(r)
          .filter((e) => String(e.nombre).startsWith(PREFIJO))
          .map((e) => [e.nombre, e.porcentajeMaximo]),
      ).toEqual([[`${PREFIJO} visible`, 25]]);
    });
  });

  describe('cálculo público (POST /precios/calcular)', () => {
    it('un visitante sin eventos paga el precio base con IVA incluido', async () => {
      const r = await calcular(null, [linea(c.p1g, 2)]);
      expect(r.status).toBe(200);
      expect(lineasDe(r)[0]).toMatchObject({
        vendible: true,
        precioInicial: 100000,
        subtotalInicial: 200000,
        descuentos: [],
        subtotal: 200000,
      });
      expect(resumen(r)).toMatchObject({
        total: 200000,
        tasaIva: 19,
        baseSinImpuesto: 168067.23,
        importeIva: 31932.77,
      });
      expect(dato(r)).toMatchObject({
        cupon: null,
        empresa: null,
        avisos: [],
        perfil: { tipo: 'particular', idSubRolEmpresa: null },
      });
    });

    it('un evento en curso rebaja las líneas que cubre, con su desglose', async () => {
      const e = await crearEvento();
      const r = await calcular(null, [linea(c.p1g), linea(c.p2g), linea(c.p3g)]);
      const l = lineasDe(r);
      expect(l[0]?.descuentos).toEqual([
        {
          ordenAplicacion: 1,
          tipoOrigen: 'evento',
          idRegla: e.idEvento,
          origen: e.nombre,
          porcentaje: 15,
          importe: 15000,
        },
      ]);
      expect(l[0]?.subtotal).toBe(85000);
      expect(l[1]).toMatchObject({ descuentos: [], subtotal: 80000 }); // otra línea comercial
      expect(l[2]).toMatchObject({ descuentos: [], subtotal: 50000, excluidoDeDescuentos: true }); // excluido (R2)
      expect(resumen(r)).toMatchObject({ descuentoEventos: 15000, total: 215000 });
    });

    it('"toda la línea menos este producto / este color" y el blanco excluido del evento', async () => {
      await crearEvento({
        reglas: [
          { objetivo: { tipo: 'marca', id: c.marcaA }, porcentaje: 10, exclusiones: [{ tipo: 'producto', id: c.p2 }] },
        ],
        exclusiones: [{ tipo: 'familia_color', id: c.famBlanco }],
      });
      const r = await calcular(null, [linea(c.p1g, 1, c.azul), linea(c.p1g, 1, c.blanco), linea(c.p2g)]);
      const l = lineasDe(r);
      expect(l[0]).toMatchObject({ subtotal: 90000 }); // azul: sí
      expect(l[1]).toMatchObject({ subtotal: 100000, descuentos: [] }); // blanco: fuera del evento (R6)
      expect(l[2]).toMatchObject({ subtotal: 80000, descuentos: [] }); // P2 excluido de la regla
    });

    it('los eventos no se suman: gana el de mayor porcentaje', async () => {
      await crearEvento({
        nombre: `${PREFIJO} a`,
        reglas: [{ objetivo: { tipo: 'linea', id: c.linea1 }, porcentaje: 15, exclusiones: [] }],
      });
      const mayor = await crearEvento({
        nombre: `${PREFIJO} b`,
        reglas: [{ objetivo: { tipo: 'marca', id: c.marcaA }, porcentaje: 20, exclusiones: [] }],
      });
      const r = await calcular(null, [linea(c.p1g)]);
      expect(lineasDe(r)[0]?.descuentos).toHaveLength(1);
      expect(lineasDe(r)[0]?.descuentos).toMatchObject([{ idRegla: mayor.idEvento, porcentaje: 20, importe: 20000 }]);
    });

    it('un evento apagado o que aún no empieza no cuenta', async () => {
      const apagado = await crearEvento({ nombre: `${PREFIJO} apagado` });
      await admin('PATCH', `/eventos/${String(apagado.idEvento)}/estado`, { estado: 'inactivo' });
      await crearEvento({ nombre: `${PREFIJO} futuro`, calendario: { ...calendarioHoy, fechaInicio: '2099-01-01' } });
      expect(lineasDe(await calcular(null, [linea(c.p1g)]))[0]?.descuentos).toEqual([]);
    });

    it('la jerarquía de la empresa: 100 con evento 10 % = 90 y con empresa 15 % = 76,50 (no 75)', async () => {
      await crearEvento({ reglas: [{ objetivo: { tipo: 'linea', id: c.linea1 }, porcentaje: 10, exclusiones: [] }] });
      const r = await calcular('empresa', [linea(c.p1g)]);
      expect(lineasDe(r)[0]?.descuentos).toMatchObject([
        { ordenAplicacion: 1, tipoOrigen: 'evento', porcentaje: 10, importe: 10000 },
        {
          ordenAplicacion: 2,
          tipoOrigen: 'empresa',
          idRegla: c.tipoProveedor,
          origen: `Descuento empresa · ${PREFIJO} Proveedor`,
          porcentaje: 15,
          importe: 13500,
        },
      ]);
      expect(lineasDe(r)[0]?.subtotal).toBe(76500);
      expect(dato(r).perfil).toEqual({ tipo: 'empresa', idSubRolEmpresa: c.tipoProveedor });
      expect(dato(r).empresa).toMatchObject({ aplicado: true, faltante: null, descuento: 13500, porcentaje: 15 });
    });

    it('el descuento de empresa no aplica a un producto excluido, pero sí al resto del carrito', async () => {
      const r = await calcular('empresa', [linea(c.p3g), linea(c.p4g)]);
      expect(lineasDe(r).map((l) => l.subtotal)).toEqual([50000, 34000]);
    });

    it('con mínimo de compra: por debajo no se aplica y avisa cuánto falta; al llegar, sí', async () => {
      const bajo = await calcular('empresaMinimo', [linea(c.p2g, 3)]); // 240 000 < 300 000
      expect(lineasDe(bajo)[0]?.descuentos).toEqual([]);
      expect(dato(bajo).empresa).toMatchObject({
        aplicado: false,
        faltante: 60000,
        montoMinimoCompra: 300000,
        totalCarrito: 240000,
      });
      expect(dato(bajo).avisos).toEqual([
        {
          tipo: 'empresa_falta_monto',
          tipoCliente: `${PREFIJO} Constructora`,
          porcentaje: 10,
          montoMinimo: 300000,
          faltante: 60000,
        },
      ]);
      const alto = await calcular('empresaMinimo', [linea(c.p2g, 4)]); // 320 000
      expect(lineasDe(alto)[0]?.subtotal).toBe(288000);
      expect(dato(alto).avisos).toEqual([]);
    });

    it('una cuenta empresa cuyo tipo se desactiva deja de recibir el descuento (R20)', async () => {
      const antes = await admin('PATCH', `/tipos-cliente-empresa/${String(c.tipoProveedor)}/estado`, {
        estado: 'inactivo',
      });
      expect(dato(antes).estado).toBe('inactivo');
      const r = await calcular('empresa', [linea(c.p4g)]);
      expect(lineasDe(r)[0]?.descuentos).toEqual([]);
      expect(dato(r).empresa).toBeNull();
      await admin('PATCH', `/tipos-cliente-empresa/${String(c.tipoProveedor)}/estado`, { estado: 'activo' });
      expect(lineasDe(await calcular('empresa', [linea(c.p4g)]))[0]?.subtotal).toBe(34000);
    });

    it('invita a un cliente registrado a pedir la cuenta empresa al pasar el umbral; al visitante no', async () => {
      const lineas = [linea(c.p1g, 6)]; // 600 000
      expect(dato(await calcular('particular', lineas)).avisos).toEqual([
        { tipo: 'sugerir_cuenta_empresa', umbral: 500000 },
      ]);
      expect(dato(await calcular(null, lineas)).avisos).toEqual([]);
      servidor.parametros.umbralSugerirEmpresa = 700000;
      expect(dato(await calcular('particular', lineas)).avisos).toEqual([]);
    });

    it('el IVA sale del parámetro de M17; si falta, 19 %', async () => {
      servidor.parametros.iva = 5;
      expect(resumen(await calcular(null, [linea(c.p4g)]))).toMatchObject({
        tasaIva: 5,
        baseSinImpuesto: 38095.24,
        importeIva: 1904.76,
      });
      servidor.parametros.iva = null;
      expect(resumen(await calcular(null, [linea(c.p4g)])).tasaIva).toBe(19);
    });

    it('una línea no vendible no se precia ni rompe el cálculo (R17)', async () => {
      const r = await calcular(null, [linea(c.p4g), linea(987654321)]);
      expect(r.status).toBe(200);
      expect(lineasDe(r)[1]).toMatchObject({ vendible: false, motivoNoVendible: 'variante_no_existe', subtotal: null });
      expect(resumen(r).total).toBe(40000);
    });

    it('el precio acordado de una cotización NO se acepta por HTTP público (R3)', async () => {
      const r = await calcular(null, [{ ...linea(c.p4g), precioAcordado: 1 }]);
      expect(lineasDe(r)[0]).toMatchObject({ precioAcordado: false, precioInicial: 40000, subtotal: 40000 });
    });

    it.each([
      ['sin líneas', { lineas: [] }],
      ['cantidad 0', { lineas: [{ idVariante: 1, cantidad: 0 }] }],
      ['sin cuerpo', {}],
    ])('valida el cuerpo: %s → 400', async (_n, cuerpo) => {
      const r = await publico(null, '/calcular', cuerpo);
      expect([r.status, codigo(r)]).toEqual([400, 'PARAMETRO_INVALIDO']);
    });
  });

  describe('cupones', () => {
    const cuerpoCupon = (sobre: Dato = {}): Dato => ({
      codigo: 'zzbienvenida',
      nombre: 'Bienvenida',
      descripcion: null,
      tipoValor: 'porcentaje',
      valor: 10,
      montoMinimoCompra: null,
      usosMaximos: null,
      usosPorUsuario: null,
      audiencia: 'todos',
      fechaInicio: new Date(Date.now() - 3600_000).toISOString(),
      fechaFin: null,
      ...sobre,
    });
    const crearCupon = async (sobre: Dato = {}): Promise<Dato> => {
      const r = await admin('POST', '/cupones', cuerpoCupon(sobre));
      expect(r.status, JSON.stringify(r.cuerpo)).toBe(201);
      return dato(r);
    };

    it('crea, normaliza el código a mayúsculas y rechaza el repetido sin distinguir mayúsculas (R14)', async () => {
      const c1 = await crearCupon();
      expect(c1).toMatchObject({ codigo: 'ZZBIENVENIDA', situacion: 'vigente', usosActuales: 0, estado: 'activo' });
      const rep = await admin('POST', '/cupones', cuerpoCupon({ codigo: 'ZZBienvenida' }));
      expect([rep.status, codigo(rep)]).toEqual([409, 'CODIGO_CUPON_DUPLICADO']);
      expect((await admin('POST', '/cupones', cuerpoCupon({ codigo: 'abc' }))).status).toBe(400);
      expect(
        (await admin('POST', '/cupones', cuerpoCupon({ tipoValor: 'porcentaje', valor: 150, codigo: 'ZZOTRO01' })))
          .status,
      ).toBe(400);
    });

    it('editar no cambia el código; activar y desactivar; lista con situación', async () => {
      const c1 = await crearCupon();
      const r = await admin(
        'PUT',
        `/cupones/${String(c1.idCupon)}`,
        cuerpoCupon({ codigo: 'ZZCAMBIADO', nombre: 'Nuevo nombre', valor: 12 }),
      );
      expect(dato(r)).toMatchObject({ codigo: 'ZZBIENVENIDA', nombre: 'Nuevo nombre', valor: 12 });
      await crearCupon({ codigo: 'ZZFUTURO01', fechaInicio: '2099-01-01T00:00:00.000Z' });
      await admin('PATCH', `/cupones/${String(c1.idCupon)}/estado`, { estado: 'inactivo' });
      const l = await admin('GET', '/cupones?busqueda=zz&limite=50');
      expect(Object.fromEntries(lista(l).map((x) => [x.codigo, x.situacion]))).toEqual({
        ZZBIENVENIDA: 'inactivo',
        ZZFUTURO01: 'programado',
      });
      expect((await admin('GET', '/cupones/987654321')).status).toBe(404);
    });

    it('en el cálculo: aplica, se normaliza lo que escribe el cliente y un código malo no es un 400 (R14)', async () => {
      await crearCupon({ montoMinimoCompra: 30000 });
      const ok = await calcular(null, [linea(c.p4g)], { codigoCupon: '  zzbienvenida ' });
      expect(dato(ok).cupon).toMatchObject({ codigo: 'ZZBIENVENIDA', aplicado: true, descuento: 4000 });
      expect(lineasDe(ok)[0]?.descuentos).toMatchObject([
        { ordenAplicacion: 1, tipoOrigen: 'cupon', origen: 'Cupón ZZBIENVENIDA', porcentaje: 10, importe: 4000 },
      ]);
      for (const malo of ['noexiste', 'ab', 'con espacio y símbolos!']) {
        const r = await calcular(null, [linea(c.p4g)], { codigoCupon: malo });
        expect(r.status).toBe(200);
        expect(dato(r).cupon).toMatchObject({ aplicado: false, motivoRechazo: 'cupon_no_valido', descuento: 0 });
      }
      const poco = await calcular(null, [linea(c.p4g)], { codigoCupon: 'ZZBIENVENIDA' });
      expect(dato(poco).cupon).toMatchObject({ aplicado: true });
      const minimo = await calcular(null, [linea(c.p1c)], { codigoCupon: 'zzbienvenida' }); // 30 000 ≥ 30 000
      expect(dato(minimo).cupon).toMatchObject({ aplicado: true });
    });

    it('rechaza por mínimo, vigencia, audiencia y desactivación, sin romper el resto', async () => {
      await crearCupon({ codigo: 'ZZMINIMO01', montoMinimoCompra: 100000 });
      await crearCupon({ codigo: 'ZZFUTURO02', fechaInicio: '2099-01-01T00:00:00.000Z' });
      await crearCupon({ codigo: 'ZZSOLOEMP1', audiencia: 'empresa' });
      const apagado = await crearCupon({ codigo: 'ZZAPAGADO1' });
      await admin('PATCH', `/cupones/${String(apagado.idCupon)}/estado`, { estado: 'inactivo' });
      const motivo = async (cod: string, actor: NombreActor | null = null): Promise<unknown> =>
        (dato(await calcular(actor, [linea(c.p4g)], { codigoCupon: cod })).cupon as Dato).motivoRechazo;
      expect(await motivo('ZZMINIMO01')).toBe('monto_minimo_no_alcanzado');
      expect(await motivo('ZZFUTURO02')).toBe('cupon_no_vigente');
      expect(await motivo('ZZSOLOEMP1')).toBe('audiencia_no_aplica');
      expect(await motivo('ZZSOLOEMP1', 'empresa')).toBeNull();
      expect(await motivo('ZZAPAGADO1')).toBe('cupon_no_valido');
      const conMinimo = await calcular(null, [linea(c.p4g)], { codigoCupon: 'ZZMINIMO01' });
      expect(dato(conMinimo).cupon).toMatchObject({ montoMinimo: 100000, idCupon: null });
      expect(resumen(conMinimo).total).toBe(40000);
    });

    it('un cupón de importe fijo se reparte entre las líneas elegibles y nunca pasa de lo que valen', async () => {
      await crearCupon({ codigo: 'ZZFIJO0001', tipoValor: 'importe_fijo', valor: 12000 });
      const r = await calcular(null, [linea(c.p4g), linea(c.p3g), linea(c.p2g)], { codigoCupon: 'ZZFIJO0001' });
      // P3 está excluido: el reparto es entre P4 (40 000) y P2 (80 000) → 4 000 y 8 000
      expect(lineasDe(r).map((l) => l.subtotal)).toEqual([36000, 50000, 72000]);
      expect(dato(r).cupon).toMatchObject({ aplicado: true, descuento: 12000 });
    });

    it('después del evento y de la empresa: el cupón va último (R1)', async () => {
      await crearEvento({ reglas: [{ objetivo: { tipo: 'linea', id: c.linea1 }, porcentaje: 10, exclusiones: [] }] });
      await crearCupon({ codigo: 'ZZULTIMO01' });
      const r = await calcular('empresa', [linea(c.p1g)], { codigoCupon: 'ZZULTIMO01' });
      expect(lineasDe(r)[0]?.descuentos).toMatchObject([
        { ordenAplicacion: 1, tipoOrigen: 'evento', importe: 10000 },
        { ordenAplicacion: 2, tipoOrigen: 'empresa', importe: 13500 },
        { ordenAplicacion: 3, tipoOrigen: 'cupon', importe: 7650 },
      ]);
      expect(lineasDe(r)[0]?.subtotal).toBe(68850);
    });

    describe('registro de usos (R15)', () => {
      const registrar = (idCupon: number, referencia: string, idUsuario: number | null = null) =>
        servidor.modulo.precios.registrarUsoCupon({ idCupon, idUsuario, referencia, importeDescuento: 1000 });

      it('nunca supera usosMaximos aunque lleguen órdenes a la vez', async () => {
        const cp = await crearCupon({ codigo: 'ZZAGOTAR01', usosMaximos: 2 });
        const idCupon = cp.idCupon as number;
        const resultados = await Promise.all(
          Array.from({ length: 6 }, (_v, i) => registrar(idCupon, `${PREFIJO}-ORD-${i}`)),
        );
        expect(resultados.filter((r) => r.registrado)).toHaveLength(2);
        expect(resultados.filter((r) => r.motivoRechazo === 'cupon_agotado')).toHaveLength(4);
        expect(await prisma.cuponUso.count({ where: { idCupon } })).toBe(2);
        expect(dato(await admin('GET', `/cupones/${String(idCupon)}`))).toMatchObject({ usosActuales: 2 });
        const calculo = await calcular(null, [linea(c.p4g)], { codigoCupon: 'ZZAGOTAR01' });
        expect((dato(calculo).cupon as Dato).motivoRechazo).toBe('cupon_agotado');
      });

      it('repetir la misma referencia no gasta otro uso (idempotente)', async () => {
        const cp = await crearCupon({ codigo: 'ZZIDEMPO01', usosMaximos: 1 });
        const idCupon = cp.idCupon as number;
        expect(await registrar(idCupon, `${PREFIJO}-ORD-A`)).toEqual({ registrado: true, motivoRechazo: null });
        expect(await registrar(idCupon, `${PREFIJO}-ORD-A`)).toEqual({ registrado: true, motivoRechazo: null });
        expect(await prisma.cuponUso.count({ where: { idCupon } })).toBe(1);
        expect((await registrar(idCupon, `${PREFIJO}-ORD-B`)).motivoRechazo).toBe('cupon_agotado');
      });

      it('liberar el uso de una orden cancelada devuelve el cupón; liberar dos veces no hace daño', async () => {
        const cp = await crearCupon({ codigo: 'ZZLIBERA01', usosMaximos: 1 });
        const idCupon = cp.idCupon as number;
        await registrar(idCupon, `${PREFIJO}-ORD-L`);
        await servidor.modulo.precios.liberarUsoCupon(`${PREFIJO}-ORD-L`);
        await servidor.modulo.precios.liberarUsoCupon(`${PREFIJO}-ORD-L`);
        await servidor.modulo.precios.liberarUsoCupon(`${PREFIJO}-NO-EXISTE`);
        expect(dato(await admin('GET', `/cupones/${String(idCupon)}`))).toMatchObject({ usosActuales: 0 });
        expect((await registrar(idCupon, `${PREFIJO}-ORD-M`)).registrado).toBe(true);
        const usos = await admin('GET', `/cupones/${String(idCupon)}/usos?incluirLiberados=true`);
        expect(lista(usos).map((u) => [u.referencia, u.liberadoEn === null])).toEqual([
          [`${PREFIJO}-ORD-M`, true],
          [`${PREFIJO}-ORD-L`, false],
        ]);
        expect(lista(await admin('GET', `/cupones/${String(idCupon)}/usos`))).toHaveLength(1);
      });

      it('el límite por usuario exige sesión y se cuenta por persona', async () => {
        const cp = await crearCupon({ codigo: 'ZZPORUSER1', usosPorUsuario: 1 });
        const idCupon = cp.idCupon as number;
        const sinSesion = await calcular(null, [linea(c.p4g)], { codigoCupon: 'ZZPORUSER1' });
        expect((dato(sinSesion).cupon as Dato).motivoRechazo).toBe('requiere_sesion');
        expect((await registrar(idCupon, `${PREFIJO}-U1`, null)).motivoRechazo).toBe('requiere_sesion');
        expect((await registrar(idCupon, `${PREFIJO}-U2`, ids.particular)).registrado).toBe(true);
        expect((await registrar(idCupon, `${PREFIJO}-U3`, ids.particular)).motivoRechazo).toBe(
          'cupon_usado_por_usuario',
        );
        expect((await registrar(idCupon, `${PREFIJO}-U4`, ids.empresa)).registrado).toBe(true);
        const delUsuario = await calcular('particular', [linea(c.p4g)], { codigoCupon: 'ZZPORUSER1' });
        expect((dato(delUsuario).cupon as Dato).motivoRechazo).toBe('cupon_usado_por_usuario');
        expect(lista(await admin('GET', `/cupones/${String(idCupon)}/usos`)).map((u) => u.usuario)).toEqual([
          `Persona empresa ${ALEATORIO}`,
          `Persona particular ${ALEATORIO}`,
        ]);
      });

      it('un cupón inexistente, apagado o vencido no registra nada', async () => {
        expect((await registrar(987654321, `${PREFIJO}-X1`)).motivoRechazo).toBe('cupon_no_valido');
        const apagado = await crearCupon({ codigo: 'ZZOFF00001' });
        await admin('PATCH', `/cupones/${String(apagado.idCupon)}/estado`, { estado: 'inactivo' });
        expect((await registrar(apagado.idCupon as number, `${PREFIJO}-X2`)).motivoRechazo).toBe('cupon_no_valido');
        const futuro = await crearCupon({ codigo: 'ZZFUT00001', fechaInicio: '2099-01-01T00:00:00.000Z' });
        expect((await registrar(futuro.idCupon as number, `${PREFIJO}-X3`)).motivoRechazo).toBe('cupon_no_vigente');
        expect(await prisma.cuponUso.count({ where: { referencia: { startsWith: `${PREFIJO}-X` } } })).toBe(0);
      });
    });
  });

  describe('tipos de cliente empresa', () => {
    const cuerpo = (sobre: Dato = {}): Dato => ({
      nombre: `${PREFIJO} Nuevo`,
      porcentaje: 12,
      montoMinimoCompra: 100000,
      tope: 0,
      ...sobre,
    });

    it('lista los tipos con cuántas cuentas los tienen', async () => {
      const r = await admin('GET', '/tipos-cliente-empresa');
      const mios = lista(r).filter((t) => String(t.nombre).startsWith(PREFIJO));
      expect(
        mios.map((t) => [
          String(t.nombre).replace(`${PREFIJO} `, ''),
          t.porcentaje,
          t.montoMinimoCompra,
          t.cuentasAsociadas,
        ]),
      ).toEqual([
        ['Proveedor', 15, 0, 1],
        ['Constructora', 10, 300000, 1],
      ]);
    });

    it('crea, edita porcentaje y mínimo, y rechaza el nombre repetido sin distinguir mayúsculas ni espacios', async () => {
      const r = await admin('POST', '/tipos-cliente-empresa', cuerpo());
      expect(r.status).toBe(201);
      const id = dato(r).idSubRolEmpresa as number;
      expect(dato(r)).toMatchObject({
        porcentaje: 12,
        montoMinimoCompra: 100000,
        estado: 'activo',
        cuentasAsociadas: 0,
      });
      const rep = await admin(
        'POST',
        '/tipos-cliente-empresa',
        cuerpo({ nombre: `  ${PREFIJO.toLowerCase()} nuevo ` }),
      );
      expect([rep.status, codigo(rep)]).toEqual([409, 'NOMBRE_TIPO_CLIENTE_DUPLICADO']);
      const ed = await admin(
        'PUT',
        `/tipos-cliente-empresa/${String(id)}`,
        cuerpo({ porcentaje: 20, montoMinimoCompra: 0 }),
      );
      expect(dato(ed)).toMatchObject({ idSubRolEmpresa: id, porcentaje: 20, montoMinimoCompra: 0 });
      const choque = await admin(
        'PUT',
        `/tipos-cliente-empresa/${String(id)}`,
        cuerpo({ nombre: `${PREFIJO} Proveedor` }),
      );
      expect([choque.status, codigo(choque)]).toEqual([409, 'NOMBRE_TIPO_CLIENTE_DUPLICADO']);
      expect((await admin('PUT', '/tipos-cliente-empresa/987654321', cuerpo())).status).toBe(404);
      // misma fila de descuento 1 a 1: no queda huérfana
      expect(await prisma.descuento.count({ where: { subRoles: { some: { idSubRolEmpresa: id } } } })).toBe(1);
    });

    it.each([
      ['0 %', { porcentaje: 0 }],
      ['más de 100 %', { porcentaje: 101 }],
      ['mínimo negativo', { montoMinimoCompra: -1 }],
      ['nombre corto', { nombre: 'ab' }],
    ])('valida el cuerpo: %s → 400', async (_n, sobre) => {
      const r = await admin('POST', '/tipos-cliente-empresa', cuerpo(sobre));
      expect([r.status, codigo(r)]).toEqual([400, 'PARAMETRO_INVALIDO']);
    });

    it('el puerto para M04 solo ofrece los tipos activos', async () => {
      const antes = (await servidor.modulo.tiposCliente.listarActivos()).map((t) => t.idSubRolEmpresa);
      expect(antes).toEqual(expect.arrayContaining([c.tipoProveedor, c.tipoConstructora]));
      await admin('PATCH', `/tipos-cliente-empresa/${String(c.tipoConstructora)}/estado`, { estado: 'inactivo' });
      expect((await servidor.modulo.tiposCliente.listarActivos()).map((t) => t.idSubRolEmpresa)).not.toContain(
        c.tipoConstructora,
      );
      expect(await servidor.modulo.tiposCliente.existeActivo(c.tipoConstructora)).toBe(false);
      expect(await servidor.modulo.tiposCliente.existeActivo(c.tipoProveedor)).toBe(true);
      expect(await servidor.modulo.tiposCliente.existeActivo(987654321)).toBe(false);
    });
  });

  describe('simulador (D12)', () => {
    it('calcula con el perfil y el momento que se le indiquen, sin tocar nada', async () => {
      const e = await crearEvento({
        calendario: { fechaInicio: '2026-11-04', fechaFin: null, diasSemana: [3], horaInicio: null, horaFin: null },
      });
      const cuerpo = (momento: string, perfil: Dato) => ({ lineas: [linea(c.p1g)], perfil, momento });
      const miercoles = await admin(
        'POST',
        '/simular',
        cuerpo(MIERCOLES, { tipo: 'empresa', idSubRolEmpresa: c.tipoProveedor }),
      );
      expect(lineasDe(miercoles)[0]?.descuentos).toMatchObject([
        { tipoOrigen: 'evento', idRegla: e.idEvento },
        { tipoOrigen: 'empresa' },
      ]);
      expect(dato(miercoles).calculadoEn).toBe(MIERCOLES);
      const jueves = await admin('POST', '/simular', cuerpo(JUEVES, { tipo: 'particular', idSubRolEmpresa: null }));
      expect(lineasDe(jueves)[0]?.descuentos).toEqual([]);
      const sugiere = await admin('POST', '/simular', {
        lineas: [linea(c.p1g, 6)],
        perfil: { tipo: 'particular', idSubRolEmpresa: null },
        idUsuario: ids.particular,
      });
      expect((dato(sugiere).avisos as Dato[]).map((a) => a.tipo)).toEqual(['sugerir_cuenta_empresa']);
    });
  });

  describe('puertos para otros módulos', () => {
    const precios = () => servidor.modulo.precios;

    it('calendario real: el miércoles hay oferta y el jueves no (hora de Colombia)', async () => {
      await crearEvento({
        calendario: {
          fechaInicio: '2026-11-04',
          fechaFin: null,
          diasSemana: [3],
          horaInicio: '08:00',
          horaFin: '20:00',
        },
      });
      const consulta = [{ idVariante: c.p1g }];
      expect((await precios().preciosDeVariantes(consulta, MIERCOLES))[0]?.oferta).not.toBeNull();
      expect((await precios().preciosDeVariantes(consulta, JUEVES))[0]?.oferta).toBeNull();
      // miércoles 07:59 y 20:00 en Bogotá quedan fuera de las horas
      expect((await precios().preciosDeVariantes(consulta, '2026-11-04T12:59:00.000Z'))[0]?.oferta).toBeNull();
      expect((await precios().preciosDeVariantes(consulta, '2026-11-05T01:00:00.000Z'))[0]?.oferta).toBeNull();
      expect((await precios().preciosDeVariantes(consulta, '2026-11-04T13:00:00.000Z'))[0]?.oferta).not.toBeNull();
    });

    it('preciosDeVariantes: precio con oferta por unidad, sin empresa ni cupón; respeta la excepción de color', async () => {
      await crearEvento({
        reglas: [
          { objetivo: { tipo: 'linea', id: c.linea1 }, porcentaje: 15, exclusiones: [{ tipo: 'color', id: c.blanco }] },
        ],
      });
      const r = await precios().preciosDeVariantes([
        { idVariante: c.p1g },
        { idVariante: c.p1g, idColor: c.blanco },
        { idVariante: c.p1g, idColor: c.azul },
        { idVariante: c.p3g },
        { idVariante: 987654321 },
      ]);
      expect(r.map((p) => [p.precioBase, p.precioConOferta, p.oferta?.porcentaje ?? null, p.vendible])).toEqual([
        [100000, 85000, 15, true],
        [100000, 100000, null, true], // blanco: excepción de la regla
        [100000, 85000, 15, true],
        [50000, 50000, null, true], // excluido de descuentos
        [null, null, null, false],
      ]);
      expect(r[0]?.oferta).toMatchObject({ precioAntes: 100000, precioConOferta: 85000, nombre: `${PREFIJO} evento` });
    });

    it('ofertasDeProductos: la variante en oferta de menor precio; el excluido y el ajeno, sin oferta', async () => {
      await crearEvento({ reglas: [{ objetivo: { tipo: 'producto', id: c.p1 }, porcentaje: 20, exclusiones: [] }] });
      const r = await precios().ofertasDeProductos([c.p1, c.p2, c.p3, c.p4]);
      expect(r[0]).toMatchObject({
        idProducto: c.p1,
        idVariante: c.p1c,
        oferta: { porcentaje: 20, precioAntes: 30000, precioConOferta: 24000 },
      });
      expect(r.slice(1).map((o) => o.oferta)).toEqual([null, null, null]);
      expect(r.map((o) => o.idProducto)).toEqual([c.p1, c.p2, c.p3, c.p4]);
    });

    it('idsProductosEnOferta: los que hoy tienen oferta (para el filtro de la pestaña Promociones)', async () => {
      expect((await precios().idsProductosEnOferta()).filter((id) => [c.p1, c.p2, c.p3, c.p4].includes(id))).toEqual(
        [],
      );
      await crearEvento({ reglas: [{ objetivo: { tipo: 'marca', id: c.marcaA }, porcentaje: 10, exclusiones: [] }] });
      const ids = (await precios().idsProductosEnOferta()).filter((id) => [c.p1, c.p2, c.p3, c.p4].includes(id));
      expect(ids).toEqual([c.p1, c.p2]); // P3 excluido de descuentos; P4 es de otra marca
    });

    it('calcular con precio acordado (cotización): se respeta y no se revalida con el catálogo (R3)', async () => {
      await crearEvento({ reglas: [{ objetivo: null, porcentaje: 50, exclusiones: [] }] });
      const r = await precios().calcular({
        lineas: [
          { idVariante: 987654321, cantidad: 2, precioAcordado: 70000 },
          { idVariante: c.p4g, cantidad: 1 },
        ],
        contexto: { idUsuario: ids.empresa },
      });
      expect(r.lineas[0]).toMatchObject({ vendible: true, precioAcordado: true, subtotal: 140000, descuentos: [] });
      expect(r.lineas[1]?.subtotal).toBe(17000); // 40 000 − 50 % = 20 000; empresa 15 % → 17 000
    });

    it('rechaza consultas por encima de los máximos del contrato', async () => {
      await expect(
        precios().preciosDeVariantes(Array.from({ length: 501 }, () => ({ idVariante: 1 }))),
      ).rejects.toMatchObject({ status: 400 });
      await expect(precios().ofertasDeProductos(Array.from({ length: 101 }, (_v, i) => i + 1))).rejects.toMatchObject({
        status: 400,
      });
      await expect(
        precios().calcular({
          lineas: Array.from({ length: 101 }, () => ({ idVariante: 1, cantidad: 1 })),
          contexto: { idUsuario: null },
        }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('ImpactoReglasPort: cuenta los eventos activos y no vencidos que tocan el objetivo', async () => {
      const impacto = servidor.modulo.impacto;
      expect(await impacto.contarEventosVigentes([{ tipo: 'linea', id: c.linea1 }])).toBe(0);
      await crearEvento({
        nombre: `${PREFIJO} a`,
        reglas: [{ objetivo: { tipo: 'linea', id: c.linea1 }, porcentaje: 10, exclusiones: [] }],
      });
      await crearEvento({
        nombre: `${PREFIJO} b`,
        calendario: { ...calendarioHoy, fechaInicio: '2099-01-01' },
        reglas: [{ objetivo: { tipo: 'linea', id: c.linea1 }, porcentaje: 5, exclusiones: [] }],
      });
      await crearEvento({
        nombre: `${PREFIJO} vencido`,
        calendario: { ...calendarioHoy, fechaInicio: '2020-01-01', fechaFin: '2020-02-01' },
        reglas: [{ objetivo: { tipo: 'linea', id: c.linea1 }, porcentaje: 5, exclusiones: [] }],
      });
      await crearEvento({ nombre: `${PREFIJO} todo`, reglas: [{ objetivo: null, porcentaje: 5, exclusiones: [] }] });
      const apagado = await crearEvento({
        nombre: `${PREFIJO} apagado`,
        reglas: [{ objetivo: { tipo: 'linea', id: c.linea1 }, porcentaje: 5, exclusiones: [] }],
      });
      await admin('PATCH', `/eventos/${String(apagado.idEvento)}/estado`, { estado: 'inactivo' });
      expect(await impacto.contarEventosVigentes([{ tipo: 'linea', id: c.linea1 }])).toBe(2); // vigente + programado
      expect(
        await impacto.contarEventosVigentes([
          { tipo: 'linea', id: c.linea1 },
          { tipo: 'linea', id: c.linea2 },
        ]),
      ).toBe(2);
      expect(await impacto.contarEventosVigentes([{ tipo: 'marca', id: c.marcaB }])).toBe(0);
      expect(await impacto.contarEventosVigentes([])).toBe(0);
    });
  });
});
