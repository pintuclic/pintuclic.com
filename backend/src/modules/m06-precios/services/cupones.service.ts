import type {
  ActualizarCuponRequest,
  Cupon,
  CrearCuponRequest,
  Estado,
  ListarCuponesRequest,
  ListarUsosCuponRequest,
  SituacionCupon,
  UsoCupon,
} from '../dtos/m06-precios.dto';
import type { CuponesRepositoryPort, DatosCupon, FilaCupon, Pagina } from '../interfaces/precios.interface';
import { errores } from './precios-error';

export function situacionCupon(c: Pick<FilaCupon, 'estado' | 'fechaInicio' | 'fechaFin'>, ahora: Date): SituacionCupon {
  if (c.estado === 'inactivo') return 'inactivo';
  if (ahora < c.fechaInicio) return 'programado';
  if (c.fechaFin !== null && ahora > c.fechaFin) return 'vencido';
  return 'vigente';
}

function aCupon(f: FilaCupon, ahora: Date): Cupon {
  return {
    idCupon: f.idCupon,
    codigo: f.codigo,
    nombre: f.nombre,
    descripcion: f.descripcion,
    tipoValor: f.tipoValor,
    valor: f.valor,
    montoMinimoCompra: f.montoMinimoCompra,
    usosMaximos: f.usosMaximos,
    usosPorUsuario: f.usosPorUsuario,
    audiencia: f.audiencia,
    fechaInicio: f.fechaInicio.toISOString(),
    fechaFin: f.fechaFin === null ? null : f.fechaFin.toISOString(),
    estado: f.estado,
    situacion: situacionCupon(f, ahora),
    usosActuales: f.usosActuales,
    fechaCreacion: f.fechaCreacion.toISOString(),
    fechaActualizacion: f.fechaActualizacion.toISOString(),
    actualizadoPor: f.actualizadoPor,
  };
}

function aDatos(d: ActualizarCuponRequest): DatosCupon {
  return {
    nombre: d.nombre,
    descripcion: d.descripcion,
    tipoValor: d.tipoValor,
    valor: d.valor,
    montoMinimoCompra: d.montoMinimoCompra,
    usosMaximos: d.usosMaximos,
    usosPorUsuario: d.usosPorUsuario,
    audiencia: d.audiencia,
    fechaInicio: new Date(d.fechaInicio),
    fechaFin: d.fechaFin === null ? null : new Date(d.fechaFin),
  };
}

/** Administración de cupones (R13–R15). El cálculo y el registro de usos viven en `PreciosService`. */
export class CuponesService {
  constructor(
    private readonly cupones: CuponesRepositoryPort,
    private readonly reloj: () => Date = () => new Date(),
  ) {}

  async listar(filtro: ListarCuponesRequest): Promise<Pagina<Cupon>> {
    const ahora = this.reloj();
    const busqueda = filtro.busqueda?.toLowerCase();
    const filas = (await this.cupones.listarTodos())
      .map((f) => aCupon(f, ahora))
      .filter((c) => filtro.situacion === undefined || c.situacion === filtro.situacion)
      .filter(
        (c) =>
          busqueda === undefined ||
          c.codigo.toLowerCase().includes(busqueda) ||
          c.nombre.toLowerCase().includes(busqueda),
      );
    const desde = (filtro.pagina - 1) * filtro.limite;
    return { total: filas.length, items: filas.slice(desde, desde + filtro.limite) };
  }

  async obtener(idCupon: number): Promise<Cupon> {
    const f = await this.cupones.obtener(idCupon);
    if (f === null) throw errores.noDisponible();
    return aCupon(f, this.reloj());
  }

  async crear(datos: CrearCuponRequest, idUsuario: number): Promise<Cupon> {
    const id = await this.cupones.crear(datos.codigo, aDatos(datos), idUsuario);
    if (id === null) throw errores.codigoCuponDuplicado();
    return this.obtener(id);
  }

  async actualizar(idCupon: number, datos: ActualizarCuponRequest, idUsuario: number): Promise<Cupon> {
    if (!(await this.cupones.actualizar(idCupon, aDatos(datos), idUsuario))) throw errores.noDisponible();
    return this.obtener(idCupon);
  }

  async cambiarEstado(idCupon: number, estado: Estado, idUsuario: number): Promise<Cupon> {
    if (!(await this.cupones.cambiarEstado(idCupon, estado, idUsuario))) throw errores.noDisponible();
    return this.obtener(idCupon);
  }

  async usos(idCupon: number, filtro: ListarUsosCuponRequest): Promise<Pagina<UsoCupon>> {
    if ((await this.cupones.obtener(idCupon)) === null) throw errores.noDisponible();
    const { items, total } = await this.cupones.listarUsos(
      idCupon,
      filtro.incluirLiberados ?? false,
      filtro.pagina,
      filtro.limite,
    );
    return {
      total,
      items: items.map((u) => ({
        ...u,
        fecha: u.fecha.toISOString(),
        liberadoEn: u.liberadoEn === null ? null : u.liberadoEn.toISOString(),
      })),
    };
  }
}
