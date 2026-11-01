import {
  type BalanceCargaProductos,
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
  RegistroCarga,
  VarianteNuevaDatos,
} from '../interfaces/carga-productos.interface';
import type { CrearProductoDatos } from '../interfaces/productos.interface';
import { esViolacionUnica } from './catalogo-base.service';

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
  producto: CrearProductoDatos;
  variantes: VarianteNuevaDatos[];
}

interface Evaluado {
  vista: ProductoCarga;
  plan: PlanProducto | null;
}

type ResultadoProceso = CargarProductosResponse['data'];

/** Busca un nombre entre los registros ya filtrados al ámbito que le toca (marca, categoría…). */
function buscar(registros: readonly RegistroCarga[], nombre: string): Resolucion<RegistroCarga> | 'ninguno' {
  const clave = normalizar(nombre);
  const hallados = registros.filter((r) => normalizar(r.nombre) === clave);
  const [primero] = hallados;
  if (primero === undefined) return 'ninguno';
  if (hallados.length > 1) {
    return { ok: false, rechazo: { motivo: 'nombre_ambiguo', detalle: `«${nombre}» coincide con más de un registro.` } };
  }
  return { ok: true, valor: primero };
}

function resolver(
  registros: readonly RegistroCarga[],
  nombre: string,
  motivo: MotivoRechazoProducto,
  quien: string,
  fila: number,
): Resolucion<RegistroCarga> {
  const r = buscar(registros, nombre);
  if (r === 'ninguno') {
    return { ok: false, rechazo: { motivo, detalle: `Fila ${fila}: ${quien} «${nombre}» no existe o está inactivo.` } };
  }
  return r.ok ? r : { ok: false, rechazo: { motivo: r.rechazo.motivo, detalle: `Fila ${fila}: ${r.rechazo.detalle}` } };
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
      const marca = primera === undefined ? 'ninguno' : buscar(catalogos.marcas, primera.marca);
      if (marca !== 'ninguno' && marca.ok) idsMarca.add(marca.valor.id);
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

    const marca = resolver(ctx.catalogos.marcas, primera.marca, 'marca_no_encontrada', 'la marca', primera.fila);
    if (!marca.ok) return rechazado(marca.rechazo);

    const idExistente = ctx.existentes.get(`${marca.valor.id}|${normalizar(primera.producto)}`);
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

    const producto = this.armarProducto(primera, marca.valor.id, ctx);
    if (!producto.ok) return rechazado(producto.rechazo);

    const variantes = this.armarVariantes(filas, variantesVista, ctx);
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
    return {
      vista: { ...base, resultado: 'por_crear', motivo: null, detalle: null, variantes: variantesVista },
      plan: { producto: producto.valor, variantes: variantes.valor },
    };
  }

  /** Resuelve los nombres del producto y aplica P1 a P3 con el mismo esquema del alta manual (C4). */
  private armarProducto(f: FilaProductoCarga, idMarca: number, ctx: Contexto): Resolucion<CrearProductoDatos> {
    const { catalogos, colores } = ctx;
    const fallo = (motivo: MotivoRechazoProducto, detalle: string): Resolucion<never> => ({ ok: false, rechazo: { motivo, detalle } });

    let idLinea: number | null = null;
    const nombreLinea = nuloSiVacio(f.linea);
    if (nombreLinea !== null) {
      const linea = resolver(
        catalogos.lineas.filter((l) => l.idMarca === idMarca),
        nombreLinea,
        'linea_no_encontrada',
        'la línea de esa marca',
        f.fila,
      );
      if (!linea.ok) {
        const deOtra = catalogos.lineas.some((l) => l.idMarca !== idMarca && normalizar(l.nombre) === normalizar(nombreLinea));
        return deOtra ? fallo('linea_de_otra_marca', `Fila ${f.fila}: la línea «${nombreLinea}» no es de la marca «${f.marca}».`) : linea;
      }
      idLinea = linea.valor.id;
    }

    const categoria = resolver(catalogos.categorias, f.categoria, 'categoria_no_encontrada', 'la categoría', f.fila);
    if (!categoria.ok) return categoria;
    const subcategoria = resolver(
      catalogos.subcategorias.filter((s) => s.idCategoria === categoria.valor.id),
      f.subcategoria,
      'subcategoria_no_encontrada',
      `la subcategoría de «${f.categoria}»`,
      f.fila,
    );
    if (!subcategoria.ok) return subcategoria;

    const superficies = resolverLista(catalogos.superficies, f.superficies, 'superficie_no_encontrada', 'la superficie', f.fila);
    if (!superficies.ok) return superficies;
    const acabados = resolverLista(catalogos.acabados, f.acabados, 'acabado_no_encontrado', 'el acabado', f.fila);
    if (!acabados.ok) return acabados;
    const bases = resolverLista(catalogos.bases, f.bases, 'base_no_encontrada', 'la base', f.fila);
    if (!bases.ok) return bases;
    const coloresFabrica = resolverLista(
      colores.filter((c) => c.idMarca === idMarca),
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

    let idTipoResina: number | null = null;
    const nombreResina = nuloSiVacio(f.tipoResina);
    if (nombreResina !== null) {
      const resina = resolver(catalogos.tiposResina, nombreResina, 'resina_no_encontrada', 'el tipo de resina', f.fila);
      if (!resina.ok) return resina;
      idTipoResina = resina.valor.id;
    } else if (f.tipoCalidad !== null || f.rendimientoMin !== null || f.rendimientoMax !== null || f.manos !== null) {
      return fallo('dato_invalido', `Fila ${f.fila}: la calidad, el rendimiento y las manos exigen el tipo de resina.`);
    }

    const conFicha = idTipoResina !== null;
    if (conFicha && idLinea === null) {
      return fallo('recubrimiento_sin_linea', `Fila ${f.fila}: un recubrimiento (con tipo de resina) exige línea.`);
    }
    if (!conFicha && (acabados.valor.length > 0 || bases.valor.length > 0 || coloresFabrica.valor.length > 0)) {
      return fallo('acabados_sin_ficha', `Fila ${f.fila}: los acabados, bases y colores de fábrica exigen el tipo de resina.`);
    }
    if (bases.valor.length > 0 && acabados.valor.length === 0) {
      return fallo('bases_sin_acabado', `Fila ${f.fila}: un producto con bases necesita al menos un acabado.`);
    }

    const parseado = crearProductoRequestSchema.safeParse({
      idMarca,
      idLinea,
      idSubcategoria: subcategoria.valor.id,
      nombre: f.producto,
      descripcion: nuloSiVacio(f.descripcion),
      usoInterior: f.usoInterior,
      usoExterior: f.usoExterior,
      ficha:
        idTipoResina === null
          ? null
          : {
              idTipoResina,
              tipoCalidad: f.tipoCalidad,
              rendimientoMin: f.rendimientoMin,
              rendimientoMax: f.rendimientoMax,
              manos: f.manos,
            },
      idsSuperficies: superficies.valor,
      idsAcabados: acabados.valor,
      idsBases: bases.valor,
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
        idMarca: d.idMarca,
        idLinea: d.idLinea ?? null,
        idSubcategoria: d.idSubcategoria,
        nombre: d.nombre,
        descripcion: d.descripcion ?? null,
        usoInterior: d.usoInterior,
        usoExterior: d.usoExterior,
        idCategoriaComplementaria: null,
        ficha:
          d.ficha === null || d.ficha === undefined
            ? null
            : {
                idTipoResina: d.ficha.idTipoResina,
                tipoCalidad: d.ficha.tipoCalidad ?? null,
                rendimientoMin: d.ficha.rendimientoMin ?? null,
                rendimientoMax: d.ficha.rendimientoMax ?? null,
                manos: d.ficha.manos ?? null,
              },
        idsSuperficies: d.idsSuperficies,
        idsAcabados: d.idsAcabados,
        idsBases: d.idsBases,
        idsColoresFabrica: d.idsColoresFabrica,
        caracteristicas: d.caracteristicas,
      },
    };
  }

  /** V1 a V5: medida, precio, SKU y código de proveedor; repetidos en el archivo y en la base de datos. */
  private armarVariantes(
    filas: readonly FilaProductoCarga[],
    vista: readonly VarianteCarga[],
    ctx: Contexto,
  ): { ok: true; valor: VarianteNuevaDatos[] } | { ok: false; detalle: string; vista: VarianteCarga[] } {
    const medidasVistas = new Set<number>();
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
      const medida = resolver(ctx.catalogos.medidas, f.medida, 'medida_no_encontrada', 'la medida', f.fila);
      if (!medida.ok) return poner(medida.rechazo);
      if (medidasVistas.has(medida.valor.id)) {
        return poner({ motivo: 'variante_repetida_en_archivo', detalle: `Fila ${f.fila}: la medida «${f.medida}» está repetida en este producto.` });
      }
      medidasVistas.add(medida.valor.id);

      const sku = nuloSiVacio(f.sku);
      const codigo = nuloSiVacio(f.codigoProveedor);
      const parseada = crearVarianteRequestSchema.safeParse({
        idMedida: medida.valor.id,
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
      nuevas.push({ idMedida: medida.valor.id, precio: f.precio, sku, codigoProveedor: codigo });
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
