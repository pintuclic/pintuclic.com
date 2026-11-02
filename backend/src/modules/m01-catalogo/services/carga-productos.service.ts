import {
  type BalanceCargaProductos,
  type CatalogoNuevo,
  type CargarProductosRequest,
  type CargarProductosResponse,
  type FilaProductoCarga,
  type MotivoRechazoProducto,
  type ProductoCarga,
  type VarianteCarga,
} from '../dtos/m01-catalogo-carga-masiva.dto';
import { crearProductoRequestSchema, crearVarianteRequestSchema } from '../dtos/m01-catalogo-productos.dto';
import type {
  CargaProductosRepositoryPort,
  CatalogosCarga,
  ColorCarga,
  MedidaReferencia,
  ProductoCargaDatos,
  Referencia,
  RegistroCarga,
  VarianteNuevaDatos,
} from '../interfaces/carga-productos.interface';
import { esViolacionUnica } from './catalogo-base.service';
import { deducirMedida } from './medida-desde-texto';

/** C2 / C9: sin tildes, sin mayúsculas y sin espacios sobrantes. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

interface Rechazo {
  motivo: MotivoRechazoProducto;
  detalle: string;
}

type Resolucion<T> = { ok: true; valor: T } | { ok: false; rechazo: Rechazo };

interface PlanProducto {
  producto: ProductoCargaDatos;
  variantes: VarianteNuevaDatos[];
}

interface Evaluado {
  vista: ProductoCarga;
  plan: PlanProducto | null;
}

type ResultadoProceso = CargarProductosResponse['data'];

/** C16: un registro que este producto va a crear. `clave` lo identifica entre productos del mismo archivo. */
interface Alta extends CatalogoNuevo {
  clave: string;
}

type Hallazgo = { tipo: 'activo'; registro: RegistroCarga } | { tipo: 'ambiguo' } | { tipo: 'inactivo' } | { tipo: 'ninguno' };

/** Busca un nombre entre los registros ya filtrados al ámbito que le toca (marca, categoría…). */
function hallar(registros: readonly RegistroCarga[], nombre: string): Hallazgo {
  const clave = normalizar(nombre);
  const coinciden = registros.filter((r) => normalizar(r.nombre) === clave);
  const activos = coinciden.filter((r) => r.activo);
  const [activo] = activos;
  if (activos.length > 1) return { tipo: 'ambiguo' };
  if (activo !== undefined) return { tipo: 'activo', registro: activo };
  return coinciden.length > 0 ? { tipo: 'inactivo' } : { tipo: 'ninguno' };
}

const rechazo = (motivo: MotivoRechazoProducto, detalle: string): { ok: false; rechazo: Rechazo } => ({
  ok: false,
  rechazo: { motivo, detalle },
});

const ambiguo = (nombre: string, fila: number): { ok: false; rechazo: Rechazo } =>
  rechazo('nombre_ambiguo', `Fila ${fila}: «${nombre}» coincide con más de un registro.`);

const inactivo = (motivo: MotivoRechazoProducto, quien: string, nombre: string, fila: number): { ok: false; rechazo: Rechazo } =>
  rechazo(motivo, `Fila ${fila}: ${quien} «${nombre}» existe pero está inactivo; actívelo en el catálogo antes de cargar.`);

/** Para lo que la carga NO crea (color): el nombre debe existir y estar activo. */
function resolver(
  registros: readonly RegistroCarga[],
  nombre: string,
  motivo: MotivoRechazoProducto,
  quien: string,
  fila: number,
): Resolucion<RegistroCarga> {
  const h = hallar(registros, nombre);
  if (h.tipo === 'activo') return { ok: true, valor: h.registro };
  if (h.tipo === 'ambiguo') return ambiguo(nombre, fila);
  if (h.tipo === 'inactivo') return inactivo(motivo, quien, nombre, fila);
  return rechazo(motivo, `Fila ${fila}: ${quien} «${nombre}» no existe.`);
}

function resolverLista(
  registros: readonly RegistroCarga[],
  nombres: readonly string[],
  motivo: MotivoRechazoProducto,
  quien: string,
  fila: number,
): Resolucion<number[]> {
  const ids = new Set<number>();
  for (const nombre of nombres) {
    const r = resolver(registros, nombre, motivo, quien, fila);
    if (!r.ok) return r;
    ids.add(r.valor.id);
  }
  return { ok: true, valor: [...ids] };
}

/** Lo que se necesita para resolver o crear un registro de catálogo (C16). */
interface Creable {
  registros: readonly RegistroCarga[];
  nombre: string;
  tipo: CatalogoNuevo['tipo'];
  /** Dónde vive el nombre: '' si es global, la marca para una línea, la categoría para una subcategoría. */
  ambito: string;
  motivo: MotivoRechazoProducto;
  quien: string;
  fila: number;
  /** Largo máximo de la columna en la base de datos. */
  largo: number;
}

/**
 * C16: el nombre se resuelve a un registro existente o, si no existe, a uno por crear. Un nombre repetido dentro del
 * archivo se crea una sola vez, con la grafía de la primera fila que lo trajo.
 */
function resolverOCrear(ctx: Contexto, altas: Alta[], c: Creable): Resolucion<Referencia> {
  const h = hallar(c.registros, c.nombre);
  if (h.tipo === 'activo') return { ok: true, valor: { id: h.registro.id } };
  if (h.tipo === 'ambiguo') return ambiguo(c.nombre, c.fila);
  if (h.tipo === 'inactivo') return inactivo(c.motivo, c.quien, c.nombre, c.fila);

  const limpio = c.nombre.trim().replace(/\s+/g, ' ');
  if (limpio.length > c.largo) {
    return rechazo('dato_invalido', `Fila ${c.fila}: ${c.quien} «${limpio}» supera los ${c.largo} caracteres.`);
  }
  const clave = `${c.tipo}|${c.ambito}|${normalizar(limpio)}`;
  const delProducto = altas.find((a) => a.clave === clave);
  if (delProducto !== undefined) return { ok: true, valor: { nuevo: delProducto.nombre } };
  const deOtroProducto = ctx.pendientes.get(clave);
  if (deOtroProducto !== undefined) return { ok: true, valor: { nuevo: deOtroProducto } };
  altas.push({ tipo: c.tipo, nombre: limpio, clave });
  return { ok: true, valor: { nuevo: limpio } };
}

/** Una lista de nombres a referencias, sin repetir el mismo registro. */
function resolverListaOCrear(
  ctx: Contexto,
  altas: Alta[],
  nombres: readonly string[],
  base: Omit<Creable, 'nombre'>,
): Resolucion<Referencia[]> {
  const vistas = new Set<string>();
  const referencias: Referencia[] = [];
  for (const nombre of nombres) {
    const r = resolverOCrear(ctx, altas, { ...base, nombre });
    if (!r.ok) return r;
    const huella = 'id' in r.valor ? `id:${r.valor.id}` : `nuevo:${normalizar(r.valor.nuevo)}`;
    if (vistas.has(huella)) continue;
    vistas.add(huella);
    referencias.push(r.valor);
  }
  return { ok: true, valor: referencias };
}

/**
 * C16: una medida se busca por nombre; si no existe se deduce su tipo y valor del texto («300 ml», «1/4 de galón») y se
 * busca por (tipo, valor), porque «1 gal» y «1 galón» son la misma medida; solo si tampoco existe se crea.
 */
function resolverMedida(
  ctx: Contexto,
  altas: Alta[],
  nombre: string,
  fila: number,
): Resolucion<{ ref: MedidaReferencia; huella: string }> {
  const { medidas, tiposMedida } = ctx.catalogos;
  const h = hallar(medidas, nombre);
  if (h.tipo === 'activo') return { ok: true, valor: { ref: { id: h.registro.id }, huella: `id:${h.registro.id}` } };
  if (h.tipo === 'ambiguo') return ambiguo(nombre, fila);
  if (h.tipo === 'inactivo') return inactivo('medida_no_encontrada', 'la medida', nombre, fila);

  const deduccion = deducirMedida(
    nombre,
    tiposMedida.filter((t) => t.activo),
  );
  if (!deduccion.ok) {
    return rechazo('medida_no_encontrada', `Fila ${fila}: la medida «${nombre}» no existe y no se pudo crear: ${deduccion.motivo}.`);
  }
  const { idTipoMedida, valor } = deduccion.valor;
  const igual = medidas.find((m) => m.idTipoMedida === idTipoMedida && Math.abs(m.valor - valor) < 1e-9);
  if (igual !== undefined) {
    if (!igual.activo) return inactivo('medida_no_encontrada', 'la medida', igual.nombre, fila);
    return { ok: true, valor: { ref: { id: igual.id }, huella: `id:${igual.id}` } };
  }

  const limpio = nombre.trim().replace(/\s+/g, ' ');
  if (limpio.length > 60) return rechazo('dato_invalido', `Fila ${fila}: la medida «${limpio}» supera los 60 caracteres.`);
  const clave = `medida|${idTipoMedida}|${valor}`;
  const huella = `v:${idTipoMedida}|${valor}`;
  const delProducto = altas.find((a) => a.clave === clave);
  const canonico = delProducto?.nombre ?? ctx.pendientes.get(clave);
  if (canonico !== undefined) return { ok: true, valor: { ref: { nueva: { nombre: canonico, idTipoMedida, valor } }, huella } };
  altas.push({ tipo: 'medida', nombre: limpio, clave });
  return { ok: true, valor: { ref: { nueva: { nombre: limpio, idTipoMedida, valor } }, huella } };
}

/** Ids de relleno que solo sirven para que el esquema del alta manual valide la forma del producto. */
const RELLENO = 1_000_000_000;
const idDeRelleno = (r: Referencia, indice = 0): number => ('id' in r ? r.id : RELLENO + indice);
const idsDeRelleno = (refs: readonly Referencia[]): number[] => refs.map((r, i) => idDeRelleno(r, i));

const claveProducto = (f: FilaProductoCarga): string => `${normalizar(f.marca)}|${normalizar(f.producto)}`;

const nuloSiVacio = (t: string | null): string | null => (t === null || t.trim() === '' ? null : t.trim());

/** C2: los datos del PRODUCTO deben ser iguales en todas sus filas; esta es su huella. */
function huellaDelProducto(f: FilaProductoCarga): string {
  const lista = (l: readonly string[]): string[] => l.map(normalizar).sort();
  return JSON.stringify([
    normalizar(f.linea ?? ''),
    normalizar(f.categoria),
    normalizar(f.subcategoria),
    nuloSiVacio(f.descripcion) ?? '',
    f.usoInterior,
    f.usoExterior,
    lista(f.superficies),
    lista(f.acabados),
    lista(f.bases),
    lista(f.coloresFabrica),
    f.caracteristicas.map((c) => [normalizar(c.nombre), c.valor.trim()]),
    normalizar(f.tipoResina ?? ''),
    f.tipoCalidad,
    f.rendimientoMin,
    f.rendimientoMax,
    f.manos,
  ]);
}

/** Contexto de una carga: catálogos y lo que ya existe, leído una vez por bloque. */
interface Contexto {
  catalogos: CatalogosCarga;
  colores: ColorCarga[];
  existentes: Map<string, number>;
  skusEnBase: Set<string>;
  codigosEnBase: Set<string>;
  /** SKU y códigos de las variantes ya aceptadas en este bloque (repetidos en el archivo). */
  skusAceptados: Map<string, number>;
  codigosAceptados: Map<string, number>;
  /** C16: lo que los productos ya aceptados de este archivo van a crear (clave → nombre con que se creará). */
  pendientes: Map<string, string>;
}

/** HU-CAT-02 / HU-CAT-03 en bloque: carga masiva de productos con variantes (contrato `m01-catalogo-carga-masiva`). */
export class CargaProductosService {
  constructor(private readonly repo: CargaProductosRepositoryPort) {}

  previsualizar(peticion: CargarProductosRequest): Promise<ResultadoProceso> {
    return this.procesar(peticion, false);
  }

  /** C7: vuelve a validar todo contra la base de datos antes de escribir. */
  aplicar(peticion: CargarProductosRequest): Promise<ResultadoProceso> {
    return this.procesar(peticion, true);
  }

  private async procesar(peticion: CargarProductosRequest, aplicar: boolean): Promise<ResultadoProceso> {
    const grupos = new Map<string, FilaProductoCarga[]>();
    for (const fila of peticion.filas) {
      const clave = claveProducto(fila);
      grupos.set(clave, [...(grupos.get(clave) ?? []), fila]);
    }

    const catalogos = await this.repo.leerCatalogos();
    const idsMarca = new Set<number>();
    for (const filas of grupos.values()) {
      const [primera] = filas;
      const marca = primera === undefined ? null : hallar(catalogos.marcas, primera.marca);
      if (marca?.tipo === 'activo') idsMarca.add(marca.registro.id);
    }
    const marcas = [...idsMarca];
    const conValor = (t: string | null): t is string => nuloSiVacio(t) !== null;
    const [colores, productos, skusEnBase, codigosEnBase] = await Promise.all([
      this.repo.leerColores(marcas),
      this.repo.productosDeMarcas(marcas),
      this.repo.skusExistentes(peticion.filas.map((f) => f.sku).filter(conValor)),
      this.repo.codigosProveedorExistentes(peticion.filas.map((f) => f.codigoProveedor).filter(conValor)),
    ]);
    const contexto: Contexto = {
      catalogos,
      colores,
      existentes: new Map(productos.map((p) => [`${p.idMarca}|${normalizar(p.nombre)}`, p.idProducto])),
      skusEnBase,
      codigosEnBase,
      skusAceptados: new Map(),
      codigosAceptados: new Map(),
      pendientes: new Map(),
    };

    const resultado: ProductoCarga[] = [];
    for (const filas of grupos.values()) {
      const { vista, plan } = this.evaluar(filas, contexto);
      resultado.push(aplicar && plan !== null ? await this.crear(vista, plan) : vista);
    }
    return { aplicada: aplicar, balance: calcularBalance(resultado), productos: resultado };
  }

  /** Crea el producto con sus variantes. Si otra persona se adelantó (índice único), solo ese producto se rechaza. */
  private async crear(vista: ProductoCarga, plan: PlanProducto): Promise<ProductoCarga> {
    try {
      const idProducto = await this.repo.crearProductoConVariantes(plan.producto, plan.variantes);
      return {
        ...vista,
        resultado: 'creado',
        idProducto,
        variantes: vista.variantes.map((v) => ({ ...v, resultado: 'creada' as const })),
      };
    } catch (err: unknown) {
      if (!esViolacionUnica(err)) throw err;
      return rechazarTodo(vista, {
        motivo: 'producto_rechazado',
        detalle: 'Otra persona creó ese producto, SKU o código de proveedor mientras se cargaba. Vuelva a revisar.',
      });
    }
  }

  private evaluar(filas: readonly FilaProductoCarga[], ctx: Contexto): Evaluado {
    const [primera] = filas;
    if (primera === undefined) throw new Error('Un grupo de carga no puede estar vacío.');
    const base = {
      marca: primera.marca,
      producto: primera.producto,
      categoria: primera.categoria,
      subcategoria: primera.subcategoria,
      linea: primera.linea,
      idProducto: null,
      nuevos: [] as CatalogoNuevo[],
    };
    const variantesVista = filas.map(
      (f): VarianteCarga => ({
        fila: f.fila,
        medida: f.medida,
        sku: nuloSiVacio(f.sku),
        precio: f.precio,
        resultado: 'por_crear',
        motivo: null,
        detalle: null,
      }),
    );
    const rechazado = (rechazo: Rechazo): Evaluado => ({
      vista: rechazarTodo({ ...base, resultado: 'rechazado', motivo: null, detalle: null, variantes: variantesVista }, rechazo),
      plan: null,
    });

    const altas: Alta[] = [];
    const marca = resolverOCrear(ctx, altas, {
      registros: ctx.catalogos.marcas,
      nombre: primera.marca,
      tipo: 'marca',
      ambito: '',
      motivo: 'marca_no_encontrada',
      quien: 'la marca',
      fila: primera.fila,
      largo: 100,
    });
    if (!marca.ok) return rechazado(marca.rechazo);

    // Una marca que se va a crear no puede tener productos todavía.
    const idExistente = 'id' in marca.valor ? ctx.existentes.get(`${marca.valor.id}|${normalizar(primera.producto)}`) : undefined;
    if (idExistente !== undefined) {
      return {
        vista: {
          ...base,
          resultado: 'ya_existe',
          motivo: null,
          detalle: 'El producto ya existe en el catálogo; no se modifica.',
          idProducto: idExistente,
          variantes: variantesVista.map((v) => ({ ...v, resultado: 'rechazada' as const })),
        },
        plan: null,
      };
    }

    const distinta = filas.find((f) => huellaDelProducto(f) !== huellaDelProducto(primera));
    if (distinta !== undefined) {
      return rechazado({
        motivo: 'datos_del_producto_distintos',
        detalle: `Las filas ${primera.fila} y ${distinta.fila} son del mismo producto pero sus datos del producto difieren.`,
      });
    }

    const producto = this.armarProducto(primera, marca.valor, altas, ctx);
    if (!producto.ok) return rechazado(producto.rechazo);

    const variantes = this.armarVariantes(filas, variantesVista, ctx, altas);
    if (!variantes.ok) {
      return {
        vista: { ...base, resultado: 'rechazado', motivo: 'producto_rechazado', detalle: variantes.detalle, variantes: variantes.vista },
        plan: null,
      };
    }
    for (const v of variantes.valor) {
      if (v.sku !== null) ctx.skusAceptados.set(v.sku.toLowerCase(), primera.fila);
      if (v.codigoProveedor !== null) ctx.codigosAceptados.set(v.codigoProveedor.toLowerCase(), primera.fila);
    }
    // Solo un producto aceptado deja "reservado" lo que va a crear: los siguientes del archivo lo reutilizan (C16).
    for (const a of altas) ctx.pendientes.set(a.clave, a.nombre);
    return {
      vista: {
        ...base,
        resultado: 'por_crear',
        motivo: null,
        detalle: null,
        nuevos: altas.map(({ tipo, nombre }) => ({ tipo, nombre })),
        variantes: variantesVista,
      },
      plan: { producto: producto.valor, variantes: variantes.valor },
    };
  }

  /**
   * Resuelve los nombres del producto (existentes o por crear, C16) y aplica P1 a P3 con el mismo esquema del alta
   * manual (C4).
   */
  private armarProducto(f: FilaProductoCarga, marca: Referencia, altas: Alta[], ctx: Contexto): Resolucion<ProductoCargaDatos> {
    const { catalogos, colores } = ctx;
    const fallo = (motivo: MotivoRechazoProducto, detalle: string): Resolucion<never> => rechazo(motivo, detalle);
    const idMarca = 'id' in marca ? marca.id : null;

    let linea: Referencia | null = null;
    const nombreLinea = nuloSiVacio(f.linea);
    if (nombreLinea !== null) {
      const r = resolverOCrear(ctx, altas, {
        registros: idMarca === null ? [] : catalogos.lineas.filter((l) => l.idMarca === idMarca),
        nombre: nombreLinea,
        tipo: 'linea',
        ambito: normalizar(f.marca),
        motivo: 'linea_no_encontrada',
        quien: 'la línea de esa marca',
        fila: f.fila,
        largo: 100,
      });
      if (!r.ok) return r;
      linea = r.valor;
    }

    const categoria = resolverOCrear(ctx, altas, {
      registros: catalogos.categorias,
      nombre: f.categoria,
      tipo: 'categoria',
      ambito: '',
      motivo: 'categoria_no_encontrada',
      quien: 'la categoría',
      fila: f.fila,
      largo: 100,
    });
    if (!categoria.ok) return categoria;
    const idCategoria = 'id' in categoria.valor ? categoria.valor.id : null;
    const subcategoria = resolverOCrear(ctx, altas, {
      registros: idCategoria === null ? [] : catalogos.subcategorias.filter((s) => s.idCategoria === idCategoria),
      nombre: f.subcategoria,
      tipo: 'subcategoria',
      ambito: normalizar(f.categoria),
      motivo: 'subcategoria_no_encontrada',
      quien: `la subcategoría de «${f.categoria}»`,
      fila: f.fila,
      largo: 100,
    });
    if (!subcategoria.ok) return subcategoria;

    const superficies = resolverListaOCrear(ctx, altas, f.superficies, {
      registros: catalogos.superficies,
      tipo: 'superficie',
      ambito: '',
      motivo: 'superficie_no_encontrada',
      quien: 'la superficie',
      fila: f.fila,
      largo: 100,
    });
    if (!superficies.ok) return superficies;
    const acabados = resolverListaOCrear(ctx, altas, f.acabados, {
      registros: catalogos.acabados,
      tipo: 'acabado',
      ambito: '',
      motivo: 'acabado_no_encontrado',
      quien: 'el acabado',
      fila: f.fila,
      largo: 50,
    });
    if (!acabados.ok) return acabados;
    const bases = resolverListaOCrear(ctx, altas, f.bases, {
      registros: catalogos.bases,
      tipo: 'base',
      ambito: '',
      motivo: 'base_no_encontrada',
      quien: 'la base',
      fila: f.fila,
      largo: 50,
    });
    if (!bases.ok) return bases;
    // Los colores no se crean (necesitan hexadecimal y acabado): una marca nueva no tiene ninguno.
    const coloresFabrica = resolverLista(
      idMarca === null ? [] : colores.filter((c) => c.idMarca === idMarca),
      f.coloresFabrica,
      'color_no_encontrado',
      'el color de esa marca',
      f.fila,
    );
    if (!coloresFabrica.ok) return coloresFabrica;

    const nombresCaracteristica = f.caracteristicas.map((c) => normalizar(c.nombre));
    if (new Set(nombresCaracteristica).size !== nombresCaracteristica.length) {
      return fallo('caracteristica_repetida', `Fila ${f.fila}: hay características con el nombre repetido.`);
    }

    let resina: Referencia | null = null;
    const nombreResina = nuloSiVacio(f.tipoResina);
    if (nombreResina !== null) {
      const r = resolverOCrear(ctx, altas, {
        registros: catalogos.tiposResina,
        nombre: nombreResina,
        tipo: 'tipo_resina',
        ambito: '',
        motivo: 'resina_no_encontrada',
        quien: 'el tipo de resina',
        fila: f.fila,
        largo: 100,
      });
      if (!r.ok) return r;
      resina = r.valor;
    } else if (f.tipoCalidad !== null || f.rendimientoMin !== null || f.rendimientoMax !== null || f.manos !== null) {
      return fallo('dato_invalido', `Fila ${f.fila}: la calidad, el rendimiento y las manos exigen el tipo de resina.`);
    }

    const conFicha = resina !== null;
    if (conFicha && linea === null) {
      return fallo('recubrimiento_sin_linea', `Fila ${f.fila}: un recubrimiento (con tipo de resina) exige línea.`);
    }
    if (!conFicha && (acabados.valor.length > 0 || bases.valor.length > 0 || coloresFabrica.valor.length > 0)) {
      return fallo('acabados_sin_ficha', `Fila ${f.fila}: los acabados, bases y colores de fábrica exigen el tipo de resina.`);
    }
    if (bases.valor.length > 0 && acabados.valor.length === 0) {
      return fallo('bases_sin_acabado', `Fila ${f.fila}: un producto con bases necesita al menos un acabado.`);
    }

    const parseado = crearProductoRequestSchema.safeParse({
      idMarca: idDeRelleno(marca),
      idLinea: linea === null ? null : idDeRelleno(linea),
      idSubcategoria: idDeRelleno(subcategoria.valor),
      nombre: f.producto,
      descripcion: nuloSiVacio(f.descripcion),
      usoInterior: f.usoInterior,
      usoExterior: f.usoExterior,
      ficha:
        resina === null
          ? null
          : {
              idTipoResina: idDeRelleno(resina),
              tipoCalidad: f.tipoCalidad,
              rendimientoMin: f.rendimientoMin,
              rendimientoMax: f.rendimientoMax,
              manos: f.manos,
            },
      idsSuperficies: idsDeRelleno(superficies.valor),
      idsAcabados: idsDeRelleno(acabados.valor),
      idsBases: idsDeRelleno(bases.valor),
      idsColoresFabrica: coloresFabrica.valor,
      caracteristicas: f.caracteristicas.map((c, orden) => ({ nombre: c.nombre, valor: c.valor, orden })),
    });
    if (!parseado.success) {
      return fallo('dato_invalido', `Fila ${f.fila}: ${parseado.error.issues[0]?.message ?? 'datos del producto inválidos'}.`);
    }
    const d = parseado.data;
    return {
      ok: true,
      valor: {
        marca,
        linea,
        categoria: categoria.valor,
        subcategoria: subcategoria.valor,
        nombre: d.nombre,
        descripcion: d.descripcion ?? null,
        usoInterior: d.usoInterior,
        usoExterior: d.usoExterior,
        ficha:
          resina === null || d.ficha === null || d.ficha === undefined
            ? null
            : {
                tipoResina: resina,
                tipoCalidad: d.ficha.tipoCalidad ?? null,
                rendimientoMin: d.ficha.rendimientoMin ?? null,
                rendimientoMax: d.ficha.rendimientoMax ?? null,
                manos: d.ficha.manos ?? null,
              },
        superficies: superficies.valor,
        acabados: acabados.valor,
        bases: bases.valor,
        idsColoresFabrica: coloresFabrica.valor,
        caracteristicas: d.caracteristicas,
      },
    };
  }

  /** V1 a V5: medida, precio, SKU y código de proveedor; repetidos en el archivo y en la base de datos. */
  private armarVariantes(
    filas: readonly FilaProductoCarga[],
    vista: readonly VarianteCarga[],
    ctx: Contexto,
    altas: Alta[],
  ): { ok: true; valor: VarianteNuevaDatos[] } | { ok: false; detalle: string; vista: VarianteCarga[] } {
    const medidasVistas = new Set<string>();
    const skusLocales = new Set<string>();
    const codigosLocales = new Set<string>();
    const nuevas: VarianteNuevaDatos[] = [];
    const marcadas: VarianteCarga[] = vista.map((v) => ({ ...v, resultado: 'rechazada' as const }));
    const errores: string[] = [];

    filas.forEach((f, i) => {
      const poner = (rechazo: Rechazo): void => {
        marcadas[i] = { ...(marcadas[i] as VarianteCarga), motivo: rechazo.motivo, detalle: rechazo.detalle };
        errores.push(rechazo.detalle);
      };
      const medida = resolverMedida(ctx, altas, f.medida, f.fila);
      if (!medida.ok) return poner(medida.rechazo);
      if (medidasVistas.has(medida.valor.huella)) {
        return poner({ motivo: 'variante_repetida_en_archivo', detalle: `Fila ${f.fila}: la medida «${f.medida}» está repetida en este producto.` });
      }
      medidasVistas.add(medida.valor.huella);

      const sku = nuloSiVacio(f.sku);
      const codigo = nuloSiVacio(f.codigoProveedor);
      const parseada = crearVarianteRequestSchema.safeParse({
        idMedida: 'id' in medida.valor.ref ? medida.valor.ref.id : RELLENO,
        precio: f.precio,
        ...(sku === null ? {} : { sku }),
        codigoProveedor: codigo,
      });
      if (!parseada.success) {
        const issue = parseada.error.issues[0];
        return poner({
          motivo: issue?.path[0] === 'sku' ? 'sku_invalido' : 'dato_invalido',
          detalle: `Fila ${f.fila}: ${issue?.message ?? 'datos de la variante inválidos'}.`,
        });
      }
      if (sku !== null) {
        const clave = sku.toLowerCase();
        if (skusLocales.has(clave) || ctx.skusAceptados.has(clave)) {
          return poner({ motivo: 'sku_repetido_en_archivo', detalle: `Fila ${f.fila}: el SKU «${sku}» está repetido en el archivo.` });
        }
        if (ctx.skusEnBase.has(clave)) {
          return poner({ motivo: 'sku_ya_existe', detalle: `Fila ${f.fila}: el SKU «${sku}» ya existe en el catálogo.` });
        }
        skusLocales.add(clave);
      }
      if (codigo !== null) {
        const clave = codigo.toLowerCase();
        if (codigosLocales.has(clave) || ctx.codigosAceptados.has(clave)) {
          return poner({ motivo: 'dato_invalido', detalle: `Fila ${f.fila}: el código de proveedor «${codigo}» está repetido en el archivo.` });
        }
        if (ctx.codigosEnBase.has(clave)) {
          return poner({ motivo: 'dato_invalido', detalle: `Fila ${f.fila}: el código de proveedor «${codigo}» ya existe en el catálogo.` });
        }
        codigosLocales.add(clave);
      }
      nuevas.push({ medida: medida.valor.ref, precio: f.precio, sku, codigoProveedor: codigo });
    });

    const [primerError] = errores;
    if (primerError !== undefined) {
      // Las variantes sin problema propio quedan rechazadas por el producto (C5).
      const vistaFinal = marcadas.map((v) =>
        v.motivo === null ? { ...v, motivo: 'producto_rechazado' as const, detalle: 'Otra variante de este producto tiene un error.' } : v,
      );
      return { ok: false, detalle: primerError, vista: vistaFinal };
    }
    return { ok: true, valor: nuevas };
  }
}

function rechazarTodo(vista: ProductoCarga, rechazo: Rechazo): ProductoCarga {
  return {
    ...vista,
    resultado: 'rechazado',
    motivo: rechazo.motivo,
    detalle: rechazo.detalle,
    nuevos: [],
    variantes: vista.variantes.map((v) => ({
      ...v,
      resultado: 'rechazada' as const,
      motivo: v.motivo ?? 'producto_rechazado',
      detalle: v.detalle ?? 'El producto fue rechazado.',
    })),
  };
}

function calcularBalance(productos: readonly ProductoCarga[]): BalanceCargaProductos {
  const variantes = productos.flatMap((p) => p.variantes);
  const nuevos = (p: ProductoCarga): boolean => p.resultado === 'por_crear' || p.resultado === 'creado';
  return {
    productos: productos.length,
    productosNuevos: productos.filter(nuevos).length,
    productosYaExisten: productos.filter((p) => p.resultado === 'ya_existe').length,
    productosRechazados: productos.filter((p) => p.resultado === 'rechazado').length,
    variantes: variantes.length,
    variantesNuevas: variantes.filter((v) => v.resultado !== 'rechazada').length,
    variantesRechazadas: variantes.filter((v) => v.resultado === 'rechazada').length,
  };
}
