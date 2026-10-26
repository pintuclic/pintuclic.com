import type {
  Audiencia,
  CalendarioEvento,
  CrearCuponRequest,
  CrearEventoRequest,
  Estado,
  Exclusion,
  PerfilComercial,
  ResultadoUsoCupon,
  TipoValor,
  EntradaUsoCupon,
} from '../dtos/m06-precios.dto';
import type { TipoClienteParaCalcular } from '../services/calculo';
import type { ReglaMotor } from '../services/motor-eventos';

export interface Pagina<T> {
  items: T[];
  total: number;
}

/* ── Catálogo (solo lectura, D7) ─────────────────────────────────────────── */

/** Dónde cae una variante en el catálogo. */
export interface FilaClasificacion {
  idVariante: number;
  idProducto: number;
  idMarca: number;
  idLinea: number | null;
  idSubcategoria: number;
  idCategoria: number;
  /** R2: el producto no recibe descuentos (combos). */
  excluidoDeDescuentos: boolean;
}

/** Variante activa de un producto activo, con lo que hace falta para la vista previa. */
export interface FilaCandidata extends FilaClasificacion {
  nombreProducto: string;
  marca: string;
  linea: string | null;
}

/** Clave estable de una referencia al catálogo: "color:7". */
export const claveReferencia = (r: Exclusion): string => `${r.tipo}:${r.id}`;

export interface CatalogoPreciosRepositoryPort {
  clasificar(idsVariante: readonly number[]): Promise<Map<number, FilaClasificacion>>;
  /** Familia de color de cada color; null si el color no tiene familia. Los colores inexistentes no aparecen. */
  familiasDeColores(idsColor: readonly number[]): Promise<Map<number, number | null>>;
  /** Variantes activas de esos productos, sin importar si el producto se muestra en el catálogo público. */
  variantesActivasDeProductos(idsProducto: readonly number[]): Promise<FilaClasificacion[]>;
  /** Todas las variantes activas de productos activos. */
  variantesActivasDelCatalogo(): Promise<FilaCandidata[]>;
  /** Nombre de cada referencia que existe (clave `claveReferencia`) y las que no existen (R19). */
  nombrar(refs: readonly Exclusion[]): Promise<{ nombres: Map<string, string>; inexistentes: Exclusion[] }>;
}

/* ── Eventos ─────────────────────────────────────────────────────────────── */

export interface FilaEvento {
  idEvento: number;
  nombre: string;
  descripcion: string | null;
  estado: Estado;
  calendario: CalendarioEvento;
  reglas: ReglaMotor[];
  exclusiones: Exclusion[];
  fechaCreacion: Date;
  fechaActualizacion: Date;
  actualizadoPor: string | null;
}

export interface EventosRepositoryPort {
  listarTodos(): Promise<FilaEvento[]>;
  /** Eventos activos que no terminaron antes de `desdeFecha` (AAAA-MM-DD): en curso, en espera o programados. */
  listarActivos(desdeFecha: string): Promise<FilaEvento[]>;
  obtener(idEvento: number): Promise<FilaEvento | null>;
  crear(datos: CrearEventoRequest, idUsuario: number): Promise<number>;
  /** false si el evento no existe. Reemplaza reglas y exclusiones en una transacción. */
  reemplazar(idEvento: number, datos: CrearEventoRequest, idUsuario: number): Promise<boolean>;
  cambiarEstado(idEvento: number, estado: Estado, idUsuario: number): Promise<boolean>;
}

/* ── Cupones ─────────────────────────────────────────────────────────────── */

export interface FilaCupon {
  idCupon: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  tipoValor: TipoValor;
  valor: number;
  montoMinimoCompra: number | null;
  usosMaximos: number | null;
  usosPorUsuario: number | null;
  audiencia: Audiencia;
  fechaInicio: Date;
  fechaFin: Date | null;
  estado: Estado;
  usosActuales: number;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  actualizadoPor: string | null;
}

export interface FilaUsoCupon {
  idCuponUso: number;
  idCupon: number;
  idUsuario: number | null;
  usuario: string | null;
  referencia: string;
  importeDescuento: number;
  fecha: Date;
  liberadoEn: Date | null;
}

export type DatosCupon = Omit<CrearCuponRequest, 'codigo' | 'fechaInicio' | 'fechaFin'> & {
  fechaInicio: Date;
  fechaFin: Date | null;
};

export interface CuponesRepositoryPort {
  listarTodos(): Promise<FilaCupon[]>;
  obtener(idCupon: number): Promise<FilaCupon | null>;
  buscarPorCodigo(codigo: string): Promise<FilaCupon | null>;
  /** null si el código ya existe. */
  crear(codigo: string, datos: DatosCupon, idUsuario: number): Promise<number | null>;
  actualizar(idCupon: number, datos: DatosCupon, idUsuario: number): Promise<boolean>;
  cambiarEstado(idCupon: number, estado: Estado, idUsuario: number): Promise<boolean>;
  contarUsosDeUsuario(idCupon: number, idUsuario: number): Promise<number>;
  listarUsos(idCupon: number, incluirLiberados: boolean, pagina: number, limite: number): Promise<Pagina<FilaUsoCupon>>;
  /** Atómico, idempotente por referencia y sin pasar de `usosMaximos` (R15). */
  registrarUso(entrada: EntradaUsoCupon, ahora: Date): Promise<ResultadoUsoCupon>;
  liberarUso(referencia: string, ahora: Date): Promise<void>;
}

/* ── Tipos de cliente empresa y perfil ───────────────────────────────────── */

export interface FilaTipoCliente {
  idSubRolEmpresa: number;
  nombre: string;
  idDescuento: number;
  porcentaje: number;
  montoMinimoCompra: number;
  tope: number;
  estado: Estado;
  cuentasAsociadas: number;
}

export interface DatosTipoCliente {
  nombre: string;
  porcentaje: number;
  montoMinimoCompra: number;
  tope: number;
}

export interface TiposClienteRepositoryPort {
  listar(): Promise<FilaTipoCliente[]>;
  obtener(idSubRolEmpresa: number): Promise<FilaTipoCliente | null>;
  /** Tipo activo (con su descuento activo) listo para calcular; null si no existe o está inactivo. */
  activoParaCalcular(idSubRolEmpresa: number): Promise<TipoClienteParaCalcular | null>;
  nombreEnUso(nombre: string, exceptoId?: number): Promise<boolean>;
  /** null si el nombre ya existe (carrera con otra petición). */
  crear(datos: DatosTipoCliente): Promise<number | null>;
  /** 'no_existe' | 'nombre_repetido' | 'ok' */
  actualizar(idSubRolEmpresa: number, datos: DatosTipoCliente): Promise<'ok' | 'no_existe' | 'nombre_repetido'>;
  cambiarEstado(idSubRolEmpresa: number, estado: Estado): Promise<boolean>;
}

export interface PerfilRepositoryPort {
  /** Particular si el usuario no existe o no es empresa. */
  perfilDe(idUsuario: number): Promise<PerfilComercial>;
}

/** Parámetros de M17 que M06 lee (R12, R16). */
export interface ParametrosComercialesPort {
  obtenerNumero(clave: 'comercial.iva_porcentaje' | 'comercial.umbral_sugerir_empresa'): Promise<number | null>;
}
