import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { ServidorPrueba } from "./helpers/servidor-prueba";

/**
 * Entrega 2 · colores (HU-CAT-05, C1–C8) contra PostgreSQL real, por HTTP.
 * Se activa con `M01_TEST_DATABASE_URL`; sin ella se omite (CI sin base de datos).
 */
const URL_BD = process.env.M01_TEST_DATABASE_URL;
const ALEATORIO = Math.random().toString(36).slice(2, 8);
const PREFIJO = `ZZ-COL-${ALEATORIO}`;

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

interface Dato {
  [clave: string]: unknown;
}

describe.skipIf(URL_BD === undefined)(
  "M01 · entrega 2: colores (HTTP + PostgreSQL)",
  () => {
    let servidor: ServidorPrueba;
    let prisma: (typeof import("../../../core/db/client"))["prisma"];
    const auditoria = { registrarAccesoDenegado: vi.fn() };
    let idMarca = 0;
    let idMarcaInactiva = 0;
    let idBaseTint = 0;
    let idAcabadoBrillante = 0;
    let idAcabadoMate = 0;
    let idFamiliaRojos = 0;
    let contador = 0;

    const admin = (
      m: "GET" | "POST" | "PUT" | "PATCH",
      ruta: string,
      cuerpo?: unknown,
    ) => servidor.peticion("admin", m, ruta, cuerpo);
    const dato = (r: { cuerpo: { data?: unknown } }): Dato =>
      r.cuerpo.data as Dato;
    const nombreUnico = (base: string): string =>
      `${PREFIJO}-${base}-${++contador}`;

    beforeAll(async () => {
      process.env.DATABASE_URL = URL_BD ?? "";
      const { levantarServidor } = await import("./helpers/servidor-prueba.js");
      ({ prisma } = await import("../../../core/db/client.js"));
      servidor = await levantarServidor(auditoria);

      const crearMarca = async (sufijo: string): Promise<number> => {
        const r = await admin("POST", "/marcas", {
          nombre: `${PREFIJO}-${sufijo}`,
          logotipoBase64: PNG_1X1.toString("base64"),
          logotipoMimeType: "image/png",
        });
        return dato(r).idMarca as number;
      };
      idMarca = await crearMarca("marca");
      idMarcaInactiva = await crearMarca("inactiva");
      await admin("PATCH", `/marcas/${idMarcaInactiva}/estado`, {
        estado: "inactivo",
        confirmar: true,
      });

      idBaseTint = (
        await prisma.base.findFirstOrThrow({ where: { nombre: "Tint" } })
      ).idBase;
      idAcabadoBrillante = (
        await prisma.acabado.findFirstOrThrow({
          where: { nombre: "Brillante" },
        })
      ).idAcabado;
      idAcabadoMate = (
        await prisma.acabado.findFirstOrThrow({ where: { nombre: "Mate" } })
      ).idAcabado;
      idFamiliaRojos = (
        await prisma.familiaColor.findFirstOrThrow({
          where: { nombre: "Rojos" },
        })
      ).idFamiliaColor;
    });

    afterAll(async () => {
      const marcas = await prisma.marca.findMany({
        where: { nombre: { startsWith: PREFIJO } },
        select: { idMarca: true },
      });
      const ids = marcas.map((m) => m.idMarca);
      await prisma.color.deleteMany({ where: { idMarca: { in: ids } } });
      await prisma.marca.deleteMany({ where: { idMarca: { in: ids } } });
      await servidor.cerrar();
      await prisma.$disconnect();
    });

    async function crearColor(extra: Dato = {}): Promise<Dato> {
      const r = await admin("POST", "/colores", {
        idMarca,
        nombre: nombreUnico("c"),
        hexadecimal: "#D7263D",
        ...extra,
      });
      expect(r.status).toBe(201);
      return dato(r);
    }

    describe("alta (C1–C6)", () => {
      it("crea con Brillante por defecto, sin base (sinBase), hex en mayúsculas y familia derivada", async () => {
        const c = await crearColor({ hexadecimal: "#d7263d" });
        expect(c).toMatchObject({
          idMarca,
          hexadecimal: "#D7263D",
          idBase: null,
          base: null,
          idAcabado: idAcabadoBrillante,
          acabado: "Brillante",
          idFamiliaColor: idFamiliaRojos,
          estado: "activo",
        });
      });

      it("acepta base y acabado explícitos y respeta la familia indicada", async () => {
        const c = await crearColor({
          idBase: idBaseTint,
          idAcabado: idAcabadoMate,
          idFamiliaColor: null,
        });
        expect(c).toMatchObject({
          idBase: idBaseTint,
          base: "Tint",
          acabado: "Mate",
          idFamiliaColor: null,
        });
      });

      it("guarda CIELAB completo", async () => {
        const c = await crearColor({ cielab: { l: 50, a: 60, b: 30 } });
        expect(c.cielab).toEqual({ l: 50, a: 60, b: 30 });
      });

      it.each([
        ["hex sin #", { hexadecimal: "D7263D" }],
        ["hex corto", { hexadecimal: "#FFF" }],
        ["hex ausente", { hexadecimal: undefined }],
        ["nombre vacío", { nombre: "   " }],
        ["CIELAB incompleto", { cielab: { l: 50, a: 10 } }],
        ["CIELAB fuera de rango", { cielab: { l: 120, a: 0, b: 0 } }],
      ])("rechaza %s con 400", async (_n, extra) => {
        const r = await admin("POST", "/colores", {
          idMarca,
          nombre: nombreUnico("x"),
          hexadecimal: "#D7263D",
          ...extra,
        });
        expect(r.status).toBe(400);
        expect(r.cuerpo.error?.code).toBe("PARAMETRO_INVALIDO");
      });

      it("rechaza marca, base o acabado inexistentes con RELACION_INVALIDA", async () => {
        for (const extra of [
          { idMarca: 999999 },
          { idBase: 999999 },
          { idAcabado: 999999 },
          { idFamiliaColor: 999999 },
        ]) {
          const r = await admin("POST", "/colores", {
            idMarca,
            nombre: nombreUnico("r"),
            hexadecimal: "#D7263D",
            ...extra,
          });
          expect(r.status).toBe(409);
          expect(r.cuerpo.error?.code).toBe("RELACION_INVALIDA");
        }
      });

      it("no permite crear bajo una marca inactiva (PADRE_INACTIVO)", async () => {
        const r = await admin("POST", "/colores", {
          idMarca: idMarcaInactiva,
          nombre: nombreUnico("p"),
          hexadecimal: "#D7263D",
        });
        expect(r.status).toBe(409);
        expect(r.cuerpo.error?.code).toBe("PADRE_INACTIVO");
      });

      it("C6: mismo nombre y acabado duplica (sin distinguir mayúsculas); otro acabado coexiste", async () => {
        const nombre = nombreUnico("dup");
        await crearColor({ nombre });
        const dup = await admin("POST", "/colores", {
          idMarca,
          nombre: nombre.toLowerCase(),
          hexadecimal: "#D7263D",
        });
        expect(dup.status).toBe(409);
        expect(dup.cuerpo.error?.code).toBe("DUPLICADO");

        const mate = await admin("POST", "/colores", {
          idMarca,
          nombre,
          hexadecimal: "#D7263D",
          idAcabado: idAcabadoMate,
        });
        expect(mate.status).toBe(201);
      });

      it("C6: el código es único por marca", async () => {
        const codigo = `K${ALEATORIO}${++contador}`;
        await crearColor({ codigo });
        const r = await admin("POST", "/colores", {
          idMarca,
          nombre: nombreUnico("k"),
          hexadecimal: "#D7263D",
          codigo,
        });
        expect(r.status).toBe(409);
        expect(r.cuerpo.error?.code).toBe("DUPLICADO");
      });
    });

    describe("consulta y edición", () => {
      it("lista paginado y filtra por búsqueda, base, familia y sinBase", async () => {
        const nombre = nombreUnico("buscable");
        await crearColor({ nombre, idBase: idBaseTint });
        const sinBase = await crearColor({
          nombre: nombreUnico("buscable-sb"),
        });

        const porNombre = await admin(
          "GET",
          `/colores?idMarca=${idMarca}&busqueda=${encodeURIComponent("buscable")}&limite=50`,
        );
        expect(porNombre.status).toBe(200);
        expect((porNombre.cuerpo.data as Dato[]).length).toBeGreaterThanOrEqual(
          2,
        );
        expect(porNombre.cuerpo.pagination).toMatchObject({
          pagina: 1,
          limite: 50,
        });

        const conBase = await admin(
          "GET",
          `/colores?idMarca=${idMarca}&idBase=${idBaseTint}&busqueda=buscable`,
        );
        expect(
          (conBase.cuerpo.data as Dato[]).every((c) => c.idBase === idBaseTint),
        ).toBe(true);

        const soloSinBase = await admin(
          "GET",
          `/colores?idMarca=${idMarca}&sinBase=true&busqueda=buscable`,
        );
        const ids = (soloSinBase.cuerpo.data as Dato[]).map((c) => c.idColor);
        expect(ids).toContain(sinBase.idColor);
        expect(
          (soloSinBase.cuerpo.data as Dato[]).every((c) => c.idBase === null),
        ).toBe(true);
      });

      it("sinBase=false no se confunde con true", async () => {
        const r = await admin(
          "GET",
          `/colores?idMarca=${idMarca}&sinBase=false`,
        );
        expect(r.status).toBe(200);
        expect((r.cuerpo.data as Dato[]).every((c) => c.idBase !== null)).toBe(
          true,
        );
      });

      it("obtiene un color y 404 uniforme si no existe", async () => {
        const c = await crearColor();
        const ok = await admin("GET", `/colores/${c.idColor}`);
        expect(ok.status).toBe(200);
        const no = await admin("GET", "/colores/999999");
        expect(no.status).toBe(404);
        expect(no.cuerpo.error?.code).toBe("RECURSO_NO_DISPONIBLE");
        expect((await admin("GET", "/colores/abc")).status).toBe(400);
      });

      it("edición parcial conserva lo no enviado; null limpia base y código", async () => {
        const c = await crearColor({
          idBase: idBaseTint,
          codigo: `E${ALEATORIO}${++contador}`,
        });
        const r = await admin("PUT", `/colores/${c.idColor}`, {
          hexadecimal: "#00aa00",
        });
        expect(r.status).toBe(200);
        expect(dato(r)).toMatchObject({
          hexadecimal: "#00AA00",
          idBase: idBaseTint,
          codigo: c.codigo,
          nombre: c.nombre,
        });

        const limpio = await admin("PUT", `/colores/${c.idColor}`, {
          idBase: null,
          codigo: null,
        });
        expect(dato(limpio)).toMatchObject({
          idBase: null,
          base: null,
          codigo: null,
          hexadecimal: "#00AA00",
        });
      });

      it("rechaza edición vacía y la marca no se puede cambiar", async () => {
        const c = await crearColor();
        expect((await admin("PUT", `/colores/${c.idColor}`, {})).status).toBe(
          400,
        );
        const r = await admin("PUT", `/colores/${c.idColor}`, {
          idMarca: idMarcaInactiva,
          nombre: nombreUnico("n"),
        });
        expect(r.status).toBe(200);
        expect(dato(r).idMarca).toBe(idMarca);
      });

      it("editar a un nombre+acabado ya usado → DUPLICADO; a un código ajeno → DUPLICADO", async () => {
        const a = await crearColor();
        const b = await crearColor({ codigo: `B${ALEATORIO}${++contador}` });
        const r1 = await admin("PUT", `/colores/${b.idColor}`, {
          nombre: a.nombre,
        });
        expect(r1.status).toBe(409);
        const c = await crearColor({ codigo: `C${ALEATORIO}${++contador}` });
        const r2 = await admin("PUT", `/colores/${c.idColor}`, {
          codigo: b.codigo,
        });
        expect(r2.status).toBe(409);
        // Guardarse a sí mismo no es duplicado.
        const r3 = await admin("PUT", `/colores/${b.idColor}`, {
          nombre: b.nombre,
          codigo: b.codigo,
        });
        expect(r3.status).toBe(200);
      });
    });

    describe("estado (C7, R5–R7)", () => {
      it("desactiva y reactiva; reactivar con la marca inactiva falla", async () => {
        const c = await crearColor();
        const off = await admin("PATCH", `/colores/${c.idColor}/estado`, {
          estado: "inactivo",
          confirmar: true,
        });
        expect(off.status).toBe(200);
        expect(dato(off).estado).toBe("inactivo");
        const on = await admin("PATCH", `/colores/${c.idColor}/estado`, {
          estado: "activo",
        });
        expect(on.status).toBe(200);
        expect(dato(on).estado).toBe("activo");

        // Color bajo una marca que luego se desactiva: no se puede reactivar.
        const marca2 = await admin("POST", "/marcas", {
          nombre: `${PREFIJO}-m2`,
          logotipoBase64: PNG_1X1.toString("base64"),
          logotipoMimeType: "image/png",
        });
        const idM2 = dato(marca2).idMarca as number;
        const c2 = dato(
          await admin("POST", "/colores", {
            idMarca: idM2,
            nombre: nombreUnico("h"),
            hexadecimal: "#112233",
          }),
        );
        await admin("PATCH", `/marcas/${idM2}/estado`, {
          estado: "inactivo",
          confirmar: true,
        });
        const bloqueada = await admin(
          "PATCH",
          `/colores/${c2.idColor}/estado`,
          { estado: "activo" },
        );
        expect(bloqueada.status).toBe(409);
        expect(bloqueada.cuerpo.error?.code).toBe("PADRE_INACTIVO");
      });

      it("expone el impacto y exige permisos distintos para activar y desactivar", async () => {
        const c = await crearColor();
        const impacto = await admin(
          "GET",
          `/colores/${c.idColor}/impacto-desactivacion`,
        );
        expect(impacto.status).toBe(200);
        expect(impacto.cuerpo.data).toMatchObject({
          productos: 0,
          variantes: 0,
        });

        const editorDesactiva = await servidor.peticion(
          "editor",
          "PATCH",
          `/colores/${c.idColor}/estado`,
          {
            estado: "inactivo",
            confirmar: true,
          },
        );
        expect(editorDesactiva.status).toBe(404);
        expect(editorDesactiva.cuerpo.error?.code).toBe(
          "RECURSO_NO_DISPONIBLE",
        );
      });
    });

    describe("permisos", () => {
      it("sin sesión, lector, y cliente: todo es 404 uniforme; el lector sí lista", async () => {
        expect((await servidor.peticion(null, "GET", "/colores")).status).toBe(
          404,
        );
        expect(
          (await servidor.peticion("cliente", "GET", "/colores")).status,
        ).toBe(404);
        expect(
          (await servidor.peticion("lector", "GET", "/colores")).status,
        ).toBe(200);
        expect(
          (
            await servidor.peticion("lector", "POST", "/colores", {
              idMarca,
              nombre: "x",
              hexadecimal: "#112233",
            })
          ).status,
        ).toBe(404);
        const imp = {
          idMarca,
          filas: [{ nombre: "x", hexadecimal: "#112233" }],
        };
        expect(
          (
            await servidor.peticion(
              "lector",
              "POST",
              "/colores/importar/aplicar",
              imp,
            )
          ).status,
        ).toBe(404);
        expect(
          (
            await servidor.peticion(
              "editor",
              "POST",
              "/colores/importar/previsualizar",
              imp,
            )
          ).status,
        ).toBe(200);
      });
    });

    describe("importación por bloques (C8)", () => {
      const importar = (modo: "previsualizar" | "aplicar", cuerpo: unknown) =>
        admin("POST", `/colores/importar/${modo}`, cuerpo);

      it("la vista previa no escribe; aplicar crea y es idempotente", async () => {
        const n1 = nombreUnico("imp");
        const n2 = nombreUnico("imp");
        const bloque = {
          idMarca,
          filas: [
            {
              nombre: n1,
              hexadecimal: "#d7263d",
              base: "tint",
              acabado: "mate",
              codigo: `I${ALEATORIO}${++contador}`,
            },
            { nombre: n2, hexadecimal: "#1fa34a" },
          ],
        };
        const previa = await importar("previsualizar", bloque);
        expect(previa.status).toBe(200);
        expect(dato(previa)).toMatchObject({
          aplicada: false,
          balance: { total: 2, creadas: 2, rechazadas: 0, sinBase: 1 },
        });
        expect(
          await prisma.color.count({
            where: { idMarca, nombre: { in: [n1, n2] } },
          }),
        ).toBe(0);

        const aplicada = await importar("aplicar", bloque);
        expect(dato(aplicada)).toMatchObject({
          aplicada: true,
          balance: { creadas: 2, sinBase: 1 },
        });
        const filas = dato(aplicada).filas as Dato[];
        expect(filas.every((f) => typeof f.idColor === "number")).toBe(true);

        const creado = await prisma.color.findFirstOrThrow({
          where: { idMarca, nombre: n1 },
        });
        expect(creado.hexadecimal).toBe("#D7263D");
        expect(creado.idBase).toBe(idBaseTint);
        expect(creado.idAcabado).toBe(idAcabadoMate);

        const otraVez = await importar("aplicar", bloque);
        expect(dato(otraVez)).toMatchObject({
          balance: { creadas: 0, actualizadas: 0, sinCambios: 2 },
        });
        expect(
          await prisma.color.count({
            where: { idMarca, nombre: { in: [n1, n2] } },
          }),
        ).toBe(2);
      });

      it("actualiza solo lo que la fila indica y conserva base, familia y código vacíos", async () => {
        const codigo = `U${ALEATORIO}${++contador}`;
        const c = await crearColor({
          idBase: idBaseTint,
          idFamiliaColor: idFamiliaRojos,
          codigo,
        });
        const r = await importar("aplicar", {
          idMarca,
          filas: [{ nombre: c.nombre, hexadecimal: "#AA0000" }],
        });
        expect(dato(r)).toMatchObject({ balance: { actualizadas: 1 } });
        const despues = await prisma.color.findUniqueOrThrow({
          where: { idColor: c.idColor as number },
        });
        expect(despues).toMatchObject({
          hexadecimal: "#AA0000",
          idBase: idBaseTint,
          idFamiliaColor: idFamiliaRojos,
          codigo,
        });
      });

      it("rechaza por fila: base/acabado/familia desconocidos, duplicados en el bloque y código ajeno", async () => {
        const ocupado = `O${ALEATORIO}${++contador}`;
        await crearColor({ codigo: ocupado });
        const repetido = nombreUnico("rep");
        const bloque = {
          idMarca,
          filas: [
            { nombre: nombreUnico("ok"), hexadecimal: "#112233" },
            {
              nombre: nombreUnico("b"),
              hexadecimal: "#112233",
              base: "NoExiste",
            },
            {
              nombre: nombreUnico("a"),
              hexadecimal: "#112233",
              acabado: "NoExiste",
            },
            {
              nombre: nombreUnico("f"),
              hexadecimal: "#112233",
              familia: "NoExiste",
            },
            { nombre: repetido, hexadecimal: "#112233" },
            { nombre: repetido.toUpperCase(), hexadecimal: "#112233" },
            {
              nombre: nombreUnico("cod"),
              hexadecimal: "#112233",
              codigo: ocupado,
            },
          ],
        };
        const r = await importar("aplicar", bloque);
        const filas = dato(r).filas as Dato[];
        expect(filas.map((f) => f.resultado)).toEqual([
          "creada",
          "rechazada",
          "rechazada",
          "rechazada",
          "creada",
          "rechazada",
          "rechazada",
        ]);
        expect(filas.map((f) => f.motivoRechazo)).toEqual([
          null,
          "base_no_encontrada",
          "acabado_no_encontrado",
          "familia_no_encontrada",
          null,
          "nombre_duplicado_en_bloque",
          "codigo_duplicado",
        ]);
        expect(dato(r).balance).toMatchObject({
          total: 7,
          creadas: 2,
          rechazadas: 5,
        });
      });

      it("el bloque es atómico: si otro proceso gana una fila a mitad, no queda nada y responde DUPLICADO", async () => {
        const n1 = nombreUnico("atom");
        const n2 = nombreUnico("atom");
        // Entre la evaluación y la escritura otro proceso crea n2: la transacción debe revertir también n1.
        const { ColoresRepository } =
          await import("../repositories/colores.repository.js");
        const original = ColoresRepository.prototype.aplicarImportacion;
        const espia = vi
          .spyOn(ColoresRepository.prototype, "aplicarImportacion")
          .mockImplementation(async function (
            this: InstanceType<typeof ColoresRepository>,
            operaciones,
          ) {
            await prisma.color.create({
              data: {
                idMarca,
                nombre: n2,
                hexadecimal: "#000000",
                idAcabado: idAcabadoBrillante,
              },
            });
            return original.call(this, operaciones);
          });
        let r;
        try {
          r = await importar("aplicar", {
            idMarca,
            filas: [
              { nombre: n1, hexadecimal: "#112233" },
              { nombre: n2, hexadecimal: "#112233" },
            ],
          });
        } finally {
          espia.mockRestore();
        }
        expect(r.status).toBe(409);
        expect(r.cuerpo.error?.code).toBe("DUPLICADO");
        expect(
          await prisma.color.count({ where: { idMarca, nombre: n1 } }),
        ).toBe(0);
      });

      it("límites del bloque: vacío y más de 500 filas → 400; marca inactiva → PADRE_INACTIVO", async () => {
        expect((await importar("aplicar", { idMarca, filas: [] })).status).toBe(
          400,
        );
        const muchas = Array.from({ length: 501 }, (_v, i) => ({
          nombre: `n${i}`,
          hexadecimal: "#112233",
        }));
        expect(
          (await importar("previsualizar", { idMarca, filas: muchas })).status,
        ).toBe(400);
        const inactiva = await importar("previsualizar", {
          idMarca: idMarcaInactiva,
          filas: [{ nombre: "x", hexadecimal: "#112233" }],
        });
        expect(inactiva.status).toBe(409);
        expect(inactiva.cuerpo.error?.code).toBe("PADRE_INACTIVO");
        const sinMarca = await importar("previsualizar", {
          idMarca: 999999,
          filas: [{ nombre: "x", hexadecimal: "#112233" }],
        });
        expect(sinMarca.status).toBe(404);
      });

      it("un bloque de 500 filas se aplica completo", async () => {
        const filas = Array.from({ length: 500 }, (_v, i) => ({
          nombre: `${PREFIJO}-masivo-${i}`,
          hexadecimal: `#${(i * 12345 + 1000).toString(16).padStart(6, "0").slice(-6)}`,
        }));
        const r = await importar("aplicar", { idMarca, filas });
        expect(r.status).toBe(200);
        expect(dato(r).balance).toMatchObject({
          total: 500,
          creadas: 500,
          sinBase: 500,
        });
      }, 60_000);
    });
  },
);
