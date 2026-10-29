import type { Comprobante, DatosFacturacion, EditarDatosFacturacionRequest } from '../dtos/m12-facturacion.dto';

/** La orden tal como M08 la guardó, con lo que hace falta para emitir su comprobante (solo lectura). */
export interface OrdenParaFacturar {
  idOrden: number;
  codigo: string;
  idUsuario: number;
  direccion: string | null;
  costoEntrega: number;
  subTotal: number;
  descuento: number;
  total: number;
  baseSinImpuesto: number | null;
  importeIva: number | null;
  tasaIva: number | null;
  comprador: {
    nombre: string;
    correo: string;
    telefono: string | null;
    /** NIT y razón social si la cuenta es de empresa. */
    empresa: { nit: string; nombreEmpresa: string } | null;
  };
  lineas: ReadonlyArray<{
    nombreProducto: string;
    varianteCopia: string;
    colorSolicitado: string | null;
    cantidad: number;
    precioAplicado: number;
    precioInicial: number | null;
  }>;
}

/** Lo que se congela al emitir (M12 · R3). El número lo asigna el repositorio dentro de la transacción (R4). */
export type NuevoComprobante = Omit<Comprobante, 'numero' | 'fechaEmision' | 'codigoOrden'> & { idOrden: number; codigoOrden: string };

export interface ComprobanteGuardado {
  comprobante: Comprobante;
  /** Cliente titular de la orden: de él es el comprobante (R8). */
  idUsuarioTitular: number;
  /** false si ya existía (R1: emitir es idempotente). */
  creado: boolean;
}

export interface ComprobantesRepositoryPort {
  buscarPorCodigoOrden(codigoOrden: string): Promise<Omit<ComprobanteGuardado, 'creado'> | null>;
  leerOrdenParaFacturar(codigoOrden: string): Promise<OrdenParaFacturar | null>;
  /** Crea el comprobante con su número en una sola transacción; si la orden ya tenía uno (carrera), devuelve ese. */
  crear(nuevo: NuevoComprobante): Promise<ComprobanteGuardado>;
}

export interface DatosFacturacionRepositoryPort {
  obtener(): Promise<DatosFacturacion>;
  guardar(datos: EditarDatosFacturacionRequest, idAutor: number | null): Promise<DatosFacturacion>;
}

/** Quien avisa al cliente por correo (M18 · `comprobante_venta`). Su fallo nunca impide emitir (R9). */
export interface AvisoComprobantePort {
  avisar(correo: string, datos: { nombre: string; numero: string; total: string; codigoOrden: string }): Promise<void>;
}
