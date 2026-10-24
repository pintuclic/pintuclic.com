import {
  ACABADO_POR_DEFECTO,
  type CambiarEstadoRequest,
  type ImpactoDesactivacion,
} from "../dtos/m01-catalogo.dto";
import type {
  BalanceImportacion,
  Color,
  CrearColorRequest,
  EditarColorRequest,
  FilaColorImportacion,
  ImportarColoresRequest,
  ListarColoresRequest,
  ResultadoFilaImportacion,
} from "../dtos/m01-catalogo-productos.dto";
import type {
  AcabadosRepositoryPort,
  BasesRepositoryPort,
  FamiliasColorRepositoryPort,
  MarcasRepositoryPort,
  Pagina,
} from "../interfaces/catalogo.interface";
import type {
  ColoresRepositoryPort,
  CrearColorDatos,
  EditarColorDatos,
  OperacionImportacionColor,
} from "../interfaces/colores.interface";
import {
  errores,
  esViolacionUnica,
  ServicioCatalogoBase,
} from "./catalogo-base.service";
import { derivarFamilia } from "./familia-color";

type MotivoRechazo = NonNullable<ResultadoFilaImportacion["motivoRechazo"]>;

export interface ResultadoImportacion {
  aplicada: boolean;
  balance: BalanceImportacion;
  filas: ResultadoFilaImportacion[];
}

interface Referencia {
  id: number;
  activo: boolean;
}

const minusculas = (texto: string): string => texto.trim().toLowerCase();
const mayusculas = (hex: string): string => hex.toUpperCase();

/** HU-CAT-05: colores de una marca, con base opcional y acabado obligatorio. */
export class ColoresService extends ServicioCatalogoBase {
  constructor(
    private readonly colores: ColoresRepositoryPort,
    private readonly marcas: MarcasRepositoryPort,
    private readonly bases: BasesRepositoryPort,
    private readonly acabados: AcabadosRepositoryPort,
    private readonly familias: FamiliasColorRepositoryPort,
  ) {
    super();
  }

  listar(query: ListarColoresRequest): Promise<Pagina<Color>> {
    return this.colores.listar(query);
  }

  async obtener(id: number): Promise<Color> {
    return this.exigir(await this.colores.obtener(id));
  }

  /* ─── Validación de referencias ─── */

  private async exigirBase(idBase: number): Promise<void> {
    const base = await this.bases.obtener(idBase);
    if (base === null || base.estado !== "activo") {
      throw errores.relacionInvalida(
        "La base no existe o está inactiva.",
        "idBase",
      );
    }
  }

  private async exigirAcabado(idAcabado: number): Promise<void> {
    const acabado = await this.acabados.obtener(idAcabado);
    if (acabado === null || acabado.estado !== "activo") {
      throw errores.relacionInvalida(
        "El acabado no existe o está inactivo.",
        "idAcabado",
      );
    }
  }

  private async exigirFamilia(idFamilia: number): Promise<void> {
    const familia = await this.familias.obtener(idFamilia);
    if (familia === null || familia.estado !== "activo") {
      throw errores.relacionInvalida(
        "La familia de color no existe o está inactiva.",
        "idFamiliaColor",
      );
    }
  }

  private async idAcabadoPorDefecto(): Promise<number> {
    const acabado = await this.acabados.buscarPorNombre(ACABADO_POR_DEFECTO);
    if (acabado === null || acabado.estado !== "activo") {
      throw errores.relacionInvalida(
        `No existe el acabado por defecto (${ACABADO_POR_DEFECTO}).`,
        "idAcabado",
      );
    }
    return acabado.idAcabado;
  }

  private async derivarFamiliaDe(hexadecimal: string): Promise<number | null> {
    const activas = await this.familias.listar({ estado: "activo" });
    return derivarFamilia(hexadecimal, activas);
  }

  /* ─── Altas y cambios ─── */

  async crear(datos: CrearColorRequest): Promise<Color> {
    const marca = await this.marcas.obtener(datos.idMarca);
    if (marca === null)
      throw errores.relacionInvalida("La marca no existe.", "idMarca");
    if (marca.estado !== "activo") throw errores.padreInactivo("la marca");

    const idAcabado = datos.idAcabado ?? (await this.idAcabadoPorDefecto());
    if (datos.idAcabado !== undefined) await this.exigirAcabado(idAcabado);
    const idBase = datos.idBase ?? null;
    if (idBase !== null) await this.exigirBase(idBase);

    const hexadecimal = mayusculas(datos.hexadecimal);
    let idFamiliaColor: number | null;
    if (datos.idFamiliaColor === undefined) {
      idFamiliaColor = await this.derivarFamiliaDe(hexadecimal);
    } else {
      idFamiliaColor = datos.idFamiliaColor;
      if (idFamiliaColor !== null) await this.exigirFamilia(idFamiliaColor);
    }

    if (
      await this.colores.existeDuplicado({
        idMarca: datos.idMarca,
        nombre: datos.nombre,
        idAcabado,
      })
    ) {
      throw errores.duplicado(
        "un color con ese nombre y acabado en la marca",
        "nombre",
      );
    }
    const codigo = datos.codigo ?? null;
    if (
      codigo !== null &&
      (await this.colores.existeCodigo(datos.idMarca, codigo))
    ) {
      throw errores.duplicado("un color con ese código en la marca", "codigo");
    }

    return this.colores
      .crear({
        idMarca: datos.idMarca,
        nombre: datos.nombre,
        codigo,
        hexadecimal,
        idBase,
        idAcabado,
        idFamiliaColor,
        cielab: datos.cielab ?? null,
      })
      .catch((err: unknown) => {
        throw esViolacionUnica(err)
          ? errores.duplicado(
              "un color con ese nombre, acabado o código",
              "nombre",
            )
          : err;
      });
  }

  async editar(id: number, datos: EditarColorRequest): Promise<Color> {
    const actual = this.exigir(await this.colores.obtener(id));

    if (
      datos.idBase !== undefined &&
      datos.idBase !== null &&
      datos.idBase !== actual.idBase
    ) {
      await this.exigirBase(datos.idBase);
    }
    if (datos.idAcabado !== undefined && datos.idAcabado !== actual.idAcabado) {
      await this.exigirAcabado(datos.idAcabado);
    }
    if (
      datos.idFamiliaColor !== undefined &&
      datos.idFamiliaColor !== null &&
      datos.idFamiliaColor !== actual.idFamiliaColor
    ) {
      await this.exigirFamilia(datos.idFamiliaColor);
    }

    const nombre = datos.nombre ?? actual.nombre;
    const idAcabado = datos.idAcabado ?? actual.idAcabado;
    if (
      (nombre !== actual.nombre || idAcabado !== actual.idAcabado) &&
      (await this.colores.existeDuplicado(
        { idMarca: actual.idMarca, nombre, idAcabado },
        id,
      ))
    ) {
      throw errores.duplicado(
        "un color con ese nombre y acabado en la marca",
        "nombre",
      );
    }
    if (
      datos.codigo !== undefined &&
      datos.codigo !== null &&
      (await this.colores.existeCodigo(actual.idMarca, datos.codigo, id))
    ) {
      throw errores.duplicado("un color con ese código en la marca", "codigo");
    }

    const cambios: EditarColorDatos = {
      ...(datos.nombre !== undefined ? { nombre: datos.nombre } : {}),
      ...(datos.codigo !== undefined ? { codigo: datos.codigo } : {}),
      ...(datos.hexadecimal !== undefined
        ? { hexadecimal: mayusculas(datos.hexadecimal) }
        : {}),
      ...(datos.idBase !== undefined ? { idBase: datos.idBase } : {}),
      ...(datos.idAcabado !== undefined ? { idAcabado: datos.idAcabado } : {}),
      ...(datos.idFamiliaColor !== undefined
        ? { idFamiliaColor: datos.idFamiliaColor }
        : {}),
      ...(datos.cielab !== undefined ? { cielab: datos.cielab } : {}),
    };
    return this.colores.editar(id, cambios);
  }

  async cambiarEstado(
    id: number,
    peticion: CambiarEstadoRequest,
  ): Promise<Color> {
    const actual = this.exigir(await this.colores.obtener(id));
    return this.aplicarCambioEstado({
      actual,
      peticion,
      contarImpacto: () => this.colores.contarImpacto(id),
      padreActivo: () => this.colores.padreActivo(id),
      etiquetaPadre: "la marca, la base o el acabado",
      cambiar: (estado) => this.colores.cambiarEstado(id, estado),
    });
  }

  async impacto(id: number): Promise<ImpactoDesactivacion> {
    this.exigir(await this.colores.obtener(id));
    return this.colores.contarImpacto(id);
  }

  /* ─── Importación por bloques (C8) ─── */

  /** Evalúa el bloque sin escribir nada. */
  async previsualizarImportacion(
    peticion: ImportarColoresRequest,
  ): Promise<ResultadoImportacion> {
    const { filas } = await this.evaluarBloque(peticion);
    return { aplicada: false, balance: this.balance(filas), filas };
  }

  /** Evalúa y aplica el bloque completo en una transacción. */
  async aplicarImportacion(
    peticion: ImportarColoresRequest,
  ): Promise<ResultadoImportacion> {
    const { filas, operaciones } = await this.evaluarBloque(peticion);
    if (operaciones.length > 0) {
      const ids = await this.colores
        .aplicarImportacion(operaciones)
        .catch((err: unknown) => {
          // Otro proceso creó un color del bloque entre la evaluación y la escritura: nada se aplicó.
          throw esViolacionUnica(err)
            ? errores.duplicado(
                "un color del bloque (cambió mientras se aplicaba)",
                "filas",
              )
            : err;
        });
      for (const fila of filas) {
        const id = ids.get(fila.indice);
        if (id !== undefined) fila.idColor = id;
      }
    }
    return { aplicada: true, balance: this.balance(filas), filas };
  }

  private balance(
    filas: readonly ResultadoFilaImportacion[],
  ): BalanceImportacion {
    const cuenta = (r: ResultadoFilaImportacion["resultado"]): number =>
      filas.filter((f) => f.resultado === r).length;
    return {
      total: filas.length,
      creadas: cuenta("creada"),
      actualizadas: cuenta("actualizada"),
      sinCambios: cuenta("sin_cambios"),
      rechazadas: cuenta("rechazada"),
      sinBase: filas.filter((f) => f.resultado !== "rechazada" && f.sinBase)
        .length,
    };
  }

  private async cargarReferencias(): Promise<{
    bases: Map<string, Referencia>;
    acabados: Map<string, Referencia>;
    familias: Map<string, Referencia>;
    familiasActivas: Array<{ idFamiliaColor: number; hexadecimal: string }>;
    idAcabadoPorDefecto: number;
  }> {
    const [bases, acabados, familias] = await Promise.all([
      this.bases.listar({}),
      this.acabados.listar({}),
      this.familias.listar({}),
    ]);
    const mapa = <T extends { nombre: string; estado: string }>(
      lista: T[],
      id: (e: T) => number,
    ): Map<string, Referencia> =>
      new Map(
        lista.map((e) => [
          minusculas(e.nombre),
          { id: id(e), activo: e.estado === "activo" },
        ]),
      );
    const mapaAcabados = mapa(acabados, (a) => a.idAcabado);
    const porDefecto = mapaAcabados.get(minusculas(ACABADO_POR_DEFECTO));
    if (porDefecto === undefined || !porDefecto.activo) {
      throw errores.relacionInvalida(
        `No existe el acabado por defecto (${ACABADO_POR_DEFECTO}).`,
        "idAcabado",
      );
    }
    return {
      bases: mapa(bases, (b) => b.idBase),
      acabados: mapaAcabados,
      familias: mapa(familias, (f) => f.idFamiliaColor),
      familiasActivas: familias
        .filter((f) => f.estado === "activo")
        .map((f) => ({
          idFamiliaColor: f.idFamiliaColor,
          hexadecimal: f.hexadecimal,
        })),
      idAcabadoPorDefecto: porDefecto.id,
    };
  }

  private async evaluarBloque(
    peticion: ImportarColoresRequest,
  ): Promise<{
    filas: ResultadoFilaImportacion[];
    operaciones: OperacionImportacionColor[];
  }> {
    const marca = this.exigir(await this.marcas.obtener(peticion.idMarca));
    if (marca.estado !== "activo") throw errores.padreInactivo("la marca");
    const ref = await this.cargarReferencias();

    const vistosNombre = new Set<string>();
    const vistosCodigo = new Set<string>();
    const filas: ResultadoFilaImportacion[] = [];
    const operaciones: OperacionImportacionColor[] = [];

    for (const [indice, fila] of peticion.filas.entries()) {
      const rechazo = (motivo: MotivoRechazo): void => {
        filas.push({
          indice,
          resultado: "rechazada",
          idColor: null,
          motivoRechazo: motivo,
          sinBase: false,
        });
      };

      const resuelto = this.resolverReferencias(fila, ref);
      if (typeof resuelto === "string") {
        rechazo(resuelto);
        continue;
      }

      const claveNombre = `${minusculas(fila.nombre)}|${resuelto.idAcabado}`;
      if (vistosNombre.has(claveNombre)) {
        rechazo("nombre_duplicado_en_bloque");
        continue;
      }
      const codigo =
        fila.codigo === undefined || fila.codigo === null ? null : fila.codigo;
      if (codigo !== null && vistosCodigo.has(minusculas(codigo))) {
        rechazo("codigo_duplicado");
        continue;
      }

      const existente = await this.colores.buscarPorClave({
        idMarca: peticion.idMarca,
        nombre: fila.nombre,
        idAcabado: resuelto.idAcabado,
      });
      if (codigo !== null) {
        const otro = await this.colores.buscarPorCodigo(
          peticion.idMarca,
          codigo,
        );
        if (
          otro !== null &&
          (existente === null || otro.idColor !== existente.idColor)
        ) {
          rechazo("codigo_duplicado");
          continue;
        }
      }
      vistosNombre.add(claveNombre);
      if (codigo !== null) vistosCodigo.add(minusculas(codigo));

      const hexadecimal = mayusculas(fila.hexadecimal);

      if (existente === null) {
        const idFamiliaColor =
          resuelto.idFamiliaColor !== undefined
            ? resuelto.idFamiliaColor
            : derivarFamilia(hexadecimal, ref.familiasActivas);
        const datos: CrearColorDatos = {
          idMarca: peticion.idMarca,
          nombre: fila.nombre,
          codigo,
          hexadecimal,
          idBase: resuelto.idBase ?? null,
          idAcabado: resuelto.idAcabado,
          idFamiliaColor,
          cielab: null,
        };
        operaciones.push({ tipo: "crear", indice, datos });
        filas.push({
          indice,
          resultado: "creada",
          idColor: null,
          motivoRechazo: null,
          sinBase: datos.idBase === null,
        });
        continue;
      }

      // Color existente: solo cambia lo que la fila indica (C8).
      const cambios: EditarColorDatos = {
        ...(hexadecimal !== existente.hexadecimal ? { hexadecimal } : {}),
        ...(codigo !== null &&
        minusculas(codigo) !== minusculas(existente.codigo ?? "")
          ? { codigo }
          : {}),
        ...(resuelto.idBase !== undefined &&
        resuelto.idBase !== existente.idBase
          ? { idBase: resuelto.idBase }
          : {}),
        ...(resuelto.idFamiliaColor !== undefined &&
        resuelto.idFamiliaColor !== existente.idFamiliaColor
          ? { idFamiliaColor: resuelto.idFamiliaColor }
          : {}),
      };
      const idBaseFinal =
        cambios.idBase !== undefined ? cambios.idBase : existente.idBase;
      if (Object.keys(cambios).length === 0) {
        filas.push({
          indice,
          resultado: "sin_cambios",
          idColor: existente.idColor,
          motivoRechazo: null,
          sinBase: idBaseFinal === null,
        });
        continue;
      }
      operaciones.push({
        tipo: "actualizar",
        indice,
        idColor: existente.idColor,
        datos: cambios,
      });
      filas.push({
        indice,
        resultado: "actualizada",
        idColor: existente.idColor,
        motivoRechazo: null,
        sinBase: idBaseFinal === null,
      });
    }
    return { filas, operaciones };
  }

  /**
   * Traduce los nombres de base, acabado y familia de una fila a ids. Devuelve el motivo de
   * rechazo si alguno no existe o está inactivo. `undefined` = la fila no lo indica.
   */
  private resolverReferencias(
    fila: FilaColorImportacion,
    ref: Awaited<ReturnType<ColoresService["cargarReferencias"]>>,
  ):
    | MotivoRechazo
    | {
        idAcabado: number;
        idBase: number | undefined;
        idFamiliaColor: number | undefined;
      } {
    let idBase: number | undefined;
    if (
      fila.base !== undefined &&
      fila.base !== null &&
      fila.base.trim() !== ""
    ) {
      const base = ref.bases.get(minusculas(fila.base));
      if (base === undefined || !base.activo) return "base_no_encontrada";
      idBase = base.id;
    }
    let idAcabado = ref.idAcabadoPorDefecto;
    if (
      fila.acabado !== undefined &&
      fila.acabado !== null &&
      fila.acabado.trim() !== ""
    ) {
      const acabado = ref.acabados.get(minusculas(fila.acabado));
      if (acabado === undefined || !acabado.activo)
        return "acabado_no_encontrado";
      idAcabado = acabado.id;
    }
    let idFamiliaColor: number | undefined;
    if (
      fila.familia !== undefined &&
      fila.familia !== null &&
      fila.familia.trim() !== ""
    ) {
      const familia = ref.familias.get(minusculas(fila.familia));
      if (familia === undefined || !familia.activo)
        return "familia_no_encontrada";
      idFamiliaColor = familia.id;
    }
    return { idAcabado, idBase, idFamiliaColor };
  }
}
