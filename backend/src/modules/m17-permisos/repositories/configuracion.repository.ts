import type { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type {
  AreaParametro,
  ClaveParametro,
  TipoDatoParametro,
} from '../dtos/m17-permisos.dto';
import type { ConfiguracionPort, EntidadParametro } from '../interfaces/configuracion.port';

/**
 * Repositorio de configuración persistido en PostgreSQL vía Prisma (RFC-M17-001 / ADR-007).
 *
 * Incluye una caché corta en memoria (TTL por defecto: 30s) para garantizar que lecturas
 * de alta frecuencia (como M20 en cada inicio de sesión) resuelvan en < 1ms sin saturar la BD.
 * La caché se invalida automáticamente ante cualquier actualización.
 */
export class PrismaConfiguracionRepository implements ConfiguracionPort {
  private cacheList: EntidadParametro[] | null = null;
  private cacheExpiracion = 0;
  private readonly ttlMs: number;

  constructor(ttlMs: number = 30_000) {
    this.ttlMs = ttlMs;
  }

  private mapearEntidad(fila: {
    clave: string;
    area: string;
    tipoDato: string;
    descripcion: string;
    valor: Prisma.JsonValue;
    valorPorDefecto: Prisma.JsonValue;
    rangoMinimo: Prisma.Decimal | null;
    rangoMaximo: Prisma.Decimal | null;
    fechaActualizacion: Date;
    idUsuarioActualizo: number | null;
  }): EntidadParametro {
    return {
      clave: fila.clave as ClaveParametro,
      area: fila.area as AreaParametro,
      tipoDato: fila.tipoDato as TipoDatoParametro,
      valor: fila.valor as number | string | boolean,
      descripcion: fila.descripcion,
      valorPorDefecto: fila.valorPorDefecto as number | string | boolean,
      rangoMinimo: fila.rangoMinimo !== null ? Number(fila.rangoMinimo) : undefined,
      rangoMaximo: fila.rangoMaximo !== null ? Number(fila.rangoMaximo) : undefined,
      fechaActualizacion: fila.fechaActualizacion,
      idUsuarioActualizo: fila.idUsuarioActualizo,
    };
  }

  async listar(): Promise<EntidadParametro[]> {
    const ahora = Date.now();
    if (this.cacheList && ahora < this.cacheExpiracion) {
      return [...this.cacheList];
    }

    const filas = await prisma.parametroSistema.findMany({
      orderBy: { idParametro: 'asc' },
    });

    const entidades = filas.map((f) => this.mapearEntidad(f));
    this.cacheList = entidades;
    this.cacheExpiracion = ahora + this.ttlMs;
    return entidades;
  }

  async obtener(clave: ClaveParametro): Promise<EntidadParametro | null> {
    const ahora = Date.now();
    if (this.cacheList && ahora < this.cacheExpiracion) {
      const encontrado = this.cacheList.find((p) => p.clave === clave);
      if (encontrado) return encontrado;
    }

    const fila = await prisma.parametroSistema.findUnique({
      where: { clave },
    });

    if (!fila) return null;
    return this.mapearEntidad(fila);
  }

  async actualizar(
    clave: ClaveParametro,
    nuevoValor: number | string | boolean,
    idAdmin?: number,
  ): Promise<EntidadParametro> {
    const actual = await this.obtener(clave);
    if (!actual) {
      throw new Error(`Parámetro no reconocido: ${clave}`);
    }

    if (actual.tipoDato === 'numero' && typeof nuevoValor === 'number') {
      if (actual.rangoMinimo !== undefined && nuevoValor < actual.rangoMinimo) {
        throw new Error(
          `El valor ${nuevoValor} es menor que el mínimo permitido (${actual.rangoMinimo})`,
        );
      }
      if (actual.rangoMaximo !== undefined && nuevoValor > actual.rangoMaximo) {
        throw new Error(
          `El valor ${nuevoValor} supera el máximo permitido (${actual.rangoMaximo})`,
        );
      }
    }

    const fila = await prisma.parametroSistema.update({
      where: { clave },
      data: {
        valor: nuevoValor,
        idUsuarioActualizo: idAdmin ?? null,
      },
    });

    this.invalidarCache();
    return this.mapearEntidad(fila);
  }

  invalidarCache(): void {
    this.cacheList = null;
    this.cacheExpiracion = 0;
  }
}

/**
 * Adaptador en memoria para tests unitarios y entornos aislados sin base de datos.
 * Cumple Directiva #10: no contiene datos pre-sembrados por defecto. Los fixtures
 * se inyectan en el constructor según el escenario de prueba.
 */
export class AlmacenConfiguracionMemoria implements ConfiguracionPort {
  private readonly parametros: Map<ClaveParametro, EntidadParametro>;

  constructor(iniciales?: EntidadParametro[]) {
    this.parametros = new Map(iniciales?.map((p) => [p.clave, p]) ?? []);
  }

  async listar(): Promise<EntidadParametro[]> {
    return Array.from(this.parametros.values());
  }

  async obtener(clave: ClaveParametro): Promise<EntidadParametro | null> {
    return this.parametros.get(clave) ?? null;
  }

  async actualizar(
    clave: ClaveParametro,
    nuevoValor: number | string | boolean,
    idAdmin?: number,
  ): Promise<EntidadParametro> {
    const actual = this.parametros.get(clave);
    if (!actual) {
      throw new Error(`Parámetro no reconocido: ${clave}`);
    }

    if (actual.tipoDato === 'numero' && typeof nuevoValor === 'number') {
      if (actual.rangoMinimo !== undefined && nuevoValor < actual.rangoMinimo) {
        throw new Error(
          `El valor ${nuevoValor} es menor que el mínimo permitido (${actual.rangoMinimo})`,
        );
      }
      if (actual.rangoMaximo !== undefined && nuevoValor > actual.rangoMaximo) {
        throw new Error(
          `El valor ${nuevoValor} supera el máximo permitido (${actual.rangoMaximo})`,
        );
      }
    }

    const actualizado: EntidadParametro = {
      ...actual,
      valor: nuevoValor,
      fechaActualizacion: new Date(),
      idUsuarioActualizo: idAdmin ?? null,
    };

    this.parametros.set(clave, actualizado);
    return actualizado;
  }
}
