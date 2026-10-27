import type {
  CarritosPanel,
  CatalogoPanel,
  ClavePendientePanel,
  EstadoCotizacionPanel,
  PersonasPanel,
  ProductoCotizado,
} from '../dtos/m17-panel-resumen.dto';

/** Lo que suman las cotizaciones creadas en un periodo, por estado (R3). */
export interface AgregadoCotizacionesEstado {
  estado: EstadoCotizacionPanel;
  total: number;
  sumaReferencia: number;
  /** Suma de `totalAcordado` (solo cuenta si lo tiene). */
  sumaAcordado: number;
  /** Suma de la referencia de las que NO tienen total acordado (R3: cuentan por su referencia). */
  sumaReferenciaSinAcordado: number;
}

export interface FilaCotizacion {
  fecha: Date;
  valor: number;
}

export interface UsoCupones {
  usos: number;
  importe: number;
}

export interface MedicionesPeriodo {
  impresiones: number;
  clics: number;
}

/** Los rangos de instantes son [desde, hasta); los de fecha son días de calendario, ambos extremos incluidos. */
export interface PanelRepositoryPort {
  cotizacionesPorEstado(desde: Date, hasta: Date): Promise<AgregadoCotizacionesEstado[]>;
  filasCotizaciones(desde: Date, hasta: Date, limite: number): Promise<FilaCotizacion[]>;
  topProductosCotizados(desde: Date, hasta: Date, limite: number): Promise<ProductoCotizado[]>;
  carritos(desdeActividad: Date): Promise<CarritosPanel>;
  catalogo(existenciaBajaMaxima: number): Promise<CatalogoPanel>;
  eventosVigentes(hoy: Date): Promise<number>;
  cuponesVigentes(ahora: Date): Promise<number>;
  usosCupon(desde: Date, hasta: Date): Promise<UsoCupones>;
  personas(): Promise<PersonasPanel>;
  campaniasVigentes(hoy: Date): Promise<number>;
  anunciosActivos(hoy: Date): Promise<number>;
  mediciones(desdeDia: Date, hastaDia: Date): Promise<MedicionesPeriodo>;
  /** Solo calcula las claves pedidas; devuelve 0 para las demás. `limiteVencer` es el último día de vigencia que cuenta como «pronto». */
  pendientes(claves: ReadonlySet<ClavePendientePanel>, limiteVencer: Date): Promise<Record<ClavePendientePanel, number>>;
}
