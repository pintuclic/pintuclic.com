import type {
  ActualizarTipoClienteRequest,
  CrearTipoClienteRequest,
  Estado,
  TipoClienteEmpresa,
  TiposClienteEmpresaPort,
} from '../dtos/m06-precios.dto';
import type { FilaTipoCliente, TiposClienteRepositoryPort } from '../interfaces/precios.interface';
import { errores } from './precios-error';

function aTipo(f: FilaTipoCliente): TipoClienteEmpresa {
  return {
    idSubRolEmpresa: f.idSubRolEmpresa,
    nombre: f.nombre,
    porcentaje: f.porcentaje,
    montoMinimoCompra: f.montoMinimoCompra,
    tope: f.tope,
    estado: f.estado,
    cuentasAsociadas: f.cuentasAsociadas,
  };
}

/**
 * Tipos de cliente empresa (sub-roles con su descuento, D8). Es también el puerto que M04 usa para ofrecer
 * los tipos al aprobar una cuenta empresa.
 */
export class TiposClienteService implements TiposClienteEmpresaPort {
  constructor(private readonly tipos: TiposClienteRepositoryPort) {}

  async listar(): Promise<TipoClienteEmpresa[]> {
    return (await this.tipos.listar()).map(aTipo);
  }

  async listarActivos(): Promise<TipoClienteEmpresa[]> {
    return (await this.listar()).filter((t) => t.estado === 'activo');
  }

  async existeActivo(idSubRolEmpresa: number): Promise<boolean> {
    const t = await this.tipos.obtener(idSubRolEmpresa);
    return t !== null && t.estado === 'activo';
  }

  async crear(datos: CrearTipoClienteRequest): Promise<TipoClienteEmpresa> {
    if (await this.tipos.nombreEnUso(datos.nombre)) throw errores.nombreTipoClienteDuplicado();
    const id = await this.tipos.crear(datos);
    if (id === null) throw errores.nombreTipoClienteDuplicado();
    return this.obtener(id);
  }

  async actualizar(idSubRolEmpresa: number, datos: ActualizarTipoClienteRequest): Promise<TipoClienteEmpresa> {
    if ((await this.tipos.obtener(idSubRolEmpresa)) === null) throw errores.noDisponible();
    if (await this.tipos.nombreEnUso(datos.nombre, idSubRolEmpresa)) throw errores.nombreTipoClienteDuplicado();
    const r = await this.tipos.actualizar(idSubRolEmpresa, datos);
    if (r === 'no_existe') throw errores.noDisponible();
    if (r === 'nombre_repetido') throw errores.nombreTipoClienteDuplicado();
    return this.obtener(idSubRolEmpresa);
  }

  async cambiarEstado(idSubRolEmpresa: number, estado: Estado): Promise<TipoClienteEmpresa> {
    if (!(await this.tipos.cambiarEstado(idSubRolEmpresa, estado))) throw errores.noDisponible();
    return this.obtener(idSubRolEmpresa);
  }

  async obtener(idSubRolEmpresa: number): Promise<TipoClienteEmpresa> {
    const f = await this.tipos.obtener(idSubRolEmpresa);
    if (f === null) throw errores.noDisponible();
    return aTipo(f);
  }
}
