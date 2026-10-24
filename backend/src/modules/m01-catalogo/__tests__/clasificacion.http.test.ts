import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { ServidorPrueba } from "./helpers/servidor-prueba";

/**
 * HU-CAT-01 contra PostgreSQL real, por HTTP, con la cadena de guardas verdadera.
 * Se activa con `M01_TEST_DATABASE_URL` (una base con el esquema 4.4 y el seed); sin ella
 * se omite, como en el CI, que no tiene base de datos.
 */
const URL_BD = process.env.M01_TEST_DATABASE_URL;
const PREFIJO = `ZZ-TEST-${Date.now().toString(36)}`;

describe.skipIf(URL_BD === undefined)(
  "M01 · categorías y subcategorías (HTTP + PostgreSQL)",
  () => {
    let servidor: ServidorPrueba;
    let prisma: (typeof import("../../../core/db/client"))["prisma"];
    const auditoria = { registrarAccesoDenegado: vi.fn() };

    beforeAll(async () => {
      process.env.DATABASE_URL = URL_BD ?? "";
      const { levantarServidor } = await import("./helpers/servidor-prueba.js");
      ({ prisma } = await import("../../../core/db/client.js"));
      servidor = await levantarServidor(auditoria);
    });

    afterAll(async () => {
      await prisma.producto.deleteMany({
        where: { nombre: { startsWith: PREFIJO } },
      });
      await prisma.subcategoria.deleteMany({
        where: { categoria: { nombre: { startsWith: PREFIJO } } },
      });
      await prisma.categoria.deleteMany({
        where: { nombre: { startsWith: PREFIJO } },
      });
      await servidor.cerrar();
      await prisma.$disconnect();
    });

    async function crearCategoria(
      sufijo: string,
    ): Promise<{ id: number; nombre: string }> {
      const nombre = `${PREFIJO}-${sufijo}`;
      const r = await servidor.peticion("admin", "POST", "/categorias", {
        nombre,
      });
      expect(r.status).toBe(201);
      return {
        id: (r.cuerpo.data as { idCategoria: number }).idCategoria,
        nombre,
      };
    }

    describe("autorización en servidor (R14)", () => {
      it("sin sesión: 404 RECURSO_NO_DISPONIBLE", async () => {
        const r = await servidor.peticion(null, "GET", "/categorias");
        expect(r.status).toBe(404);
        expect(r.cuerpo.error?.code).toBe("RECURSO_NO_DISPONIBLE");
      });

      it("un cliente recibe exactamente la misma respuesta que un recurso inexistente", async () => {
        const denegado = await servidor.peticion(
          "cliente",
          "GET",
          "/categorias",
        );
        const sinSesion = await servidor.peticion(null, "GET", "/categorias");
        expect(denegado.status).toBe(404);
        expect(denegado.cuerpo).toEqual(sinSesion.cuerpo);
      });

      it("el lector consulta pero no crea", async () => {
        expect(
          (await servidor.peticion("lector", "GET", "/categorias")).status,
        ).toBe(200);
        const r = await servidor.peticion("lector", "POST", "/categorias", {
          nombre: `${PREFIJO}-lector`,
        });
        expect(r.status).toBe(404);
        const existe = await prisma.categoria.findFirst({
          where: { nombre: `${PREFIJO}-lector` },
        });
        expect(existe).toBeNull();
      });

      it("un intento denegado se registra en la auditoría", async () => {
        auditoria.registrarAccesoDenegado.mockClear();
        await servidor.peticion("cliente", "POST", "/categorias", {
          nombre: `${PREFIJO}-x`,
        });
        expect(auditoria.registrarAccesoDenegado).toHaveBeenCalledTimes(1);
      });
    });

    describe("consulta", () => {
      it("devuelve el árbol del seed: categorías con sus subcategorías ordenadas", async () => {
        const r = await servidor.peticion("admin", "GET", "/categorias");
        expect(r.status).toBe(200);
        const arbol = r.cuerpo.data as Array<{
          nombre: string;
          subcategorias: Array<{ nombre: string }>;
        }>;
        const pinturas = arbol.find((c) => c.nombre === "Pinturas");
        expect(pinturas?.subcategorias.map((s) => s.nombre)).toContain(
          "Vinilos para muros",
        );
      });

      it("filtra por estado", async () => {
        const r = await servidor.peticion(
          "admin",
          "GET",
          "/categorias?estado=inactivo",
        );
        const arbol = r.cuerpo.data as Array<{ estado: string }>;
        expect(arbol.every((c) => c.estado === "inactivo")).toBe(true);
      });

      it("un estado inválido responde 400", async () => {
        const r = await servidor.peticion(
          "admin",
          "GET",
          "/categorias?estado=otro",
        );
        expect(r.status).toBe(400);
        expect(r.cuerpo.error?.code).toBe("PARAMETRO_INVALIDO");
      });
    });

    describe("categorías (R2, R3)", () => {
      it("crea con trim y orden por defecto 0", async () => {
        const r = await servidor.peticion("admin", "POST", "/categorias", {
          nombre: `  ${PREFIJO}-trim  `,
        });
        expect(r.status).toBe(201);
        expect(r.cuerpo.data).toMatchObject({
          nombre: `${PREFIJO}-trim`,
          orden: 0,
          estado: "activo",
          subcategorias: [],
        });
      });

      it("rechaza un nombre repetido sin distinguir mayúsculas ni espacios (D4)", async () => {
        await crearCategoria("dup");
        const r = await servidor.peticion("admin", "POST", "/categorias", {
          nombre: `  ${PREFIJO}-DUP `,
        });
        expect(r.status).toBe(409);
        expect(r.cuerpo.error?.code).toBe("NOMBRE_DUPLICADO");
      });

      it("rechaza nombre vacío y de más de 100 caracteres", async () => {
        expect(
          (
            await servidor.peticion("admin", "POST", "/categorias", {
              nombre: "   ",
            })
          ).status,
        ).toBe(400);
        expect(
          (
            await servidor.peticion("admin", "POST", "/categorias", {
              nombre: "a".repeat(101),
            })
          ).status,
        ).toBe(400);
      });

      it("editar solo el orden no cambia el nombre; editar con cuerpo vacío es 400", async () => {
        const { id, nombre } = await crearCategoria("orden");
        const r = await servidor.peticion("admin", "PUT", `/categorias/${id}`, {
          orden: 7,
        });
        expect(r.cuerpo.data).toMatchObject({ nombre, orden: 7 });
        expect(
          (await servidor.peticion("admin", "PUT", `/categorias/${id}`, {}))
            .status,
        ).toBe(400);
      });

      it("editar el nombre al de otra categoría es 409; conservar el propio es válido", async () => {
        const a = await crearCategoria("ed-a");
        const b = await crearCategoria("ed-b");
        expect(
          (
            await servidor.peticion("admin", "PUT", `/categorias/${b.id}`, {
              nombre: a.nombre,
            })
          ).status,
        ).toBe(409);
        expect(
          (
            await servidor.peticion("admin", "PUT", `/categorias/${b.id}`, {
              nombre: b.nombre,
            })
          ).status,
        ).toBe(200);
      });

      it("una categoría inexistente o un id inválido", async () => {
        expect(
          (
            await servidor.peticion("admin", "PUT", "/categorias/99999999", {
              nombre: "x",
            })
          ).status,
        ).toBe(404);
        expect(
          (
            await servidor.peticion("admin", "PUT", "/categorias/abc", {
              nombre: "x",
            })
          ).status,
        ).toBe(400);
      });
    });

    describe("subcategorías (R3, R8)", () => {
      it("crea bajo una categoría y rechaza el mismo nombre en el mismo padre", async () => {
        const cat = await crearCategoria("sub1");
        const ok = await servidor.peticion(
          "admin",
          "POST",
          `/categorias/${cat.id}/subcategorias`,
          { nombre: "Interior" },
        );
        expect(ok.status).toBe(201);
        expect(ok.cuerpo.data).toMatchObject({
          idCategoria: cat.id,
          nombre: "Interior",
          orden: 0,
        });
        const dup = await servidor.peticion(
          "admin",
          "POST",
          `/categorias/${cat.id}/subcategorias`,
          { nombre: " interior " },
        );
        expect(dup.status).toBe(409);
        expect(dup.cuerpo.error?.code).toBe("NOMBRE_DUPLICADO");
      });

      it("admite el mismo nombre bajo padres distintos (CA-CAT-01-03)", async () => {
        const a = await crearCategoria("sub-a");
        const b = await crearCategoria("sub-b");
        expect(
          (
            await servidor.peticion(
              "admin",
              "POST",
              `/categorias/${a.id}/subcategorias`,
              { nombre: "Interior" },
            )
          ).status,
        ).toBe(201);
        expect(
          (
            await servidor.peticion(
              "admin",
              "POST",
              `/categorias/${b.id}/subcategorias`,
              { nombre: "Interior" },
            )
          ).status,
        ).toBe(201);
      });

      it("el padre inexistente es 404 y el padre inactivo es 409 PADRE_INACTIVO (R8)", async () => {
        expect(
          (
            await servidor.peticion(
              "admin",
              "POST",
              "/categorias/99999999/subcategorias",
              { nombre: "X" },
            )
          ).status,
        ).toBe(404);
        const cat = await crearCategoria("sub-inactiva");
        await servidor.peticion(
          "admin",
          "PATCH",
          `/categorias/${cat.id}/estado`,
          { estado: "inactivo" },
        );
        const r = await servidor.peticion(
          "admin",
          "POST",
          `/categorias/${cat.id}/subcategorias`,
          { nombre: "X" },
        );
        expect(r.status).toBe(409);
        expect(r.cuerpo.error?.code).toBe("PADRE_INACTIVO");
      });

      it("la subcategoría no cambia de padre al editarla", async () => {
        const a = await crearCategoria("mover-a");
        const b = await crearCategoria("mover-b");
        const sub = await servidor.peticion(
          "admin",
          "POST",
          `/categorias/${a.id}/subcategorias`,
          { nombre: "S" },
        );
        const idSub = (sub.cuerpo.data as { idSubcategoria: number })
          .idSubcategoria;
        const r = await servidor.peticion(
          "admin",
          "PUT",
          `/subcategorias/${idSub}`,
          { nombre: "S2", idCategoria: b.id },
        );
        expect(r.cuerpo.data).toMatchObject({
          idCategoria: a.id,
          nombre: "S2",
        });
      });
    });

    describe("desactivar y reactivar (R4–R7)", () => {
      async function categoriaConProductoVisible(
        sufijo: string,
      ): Promise<{ idCategoria: number; idSubcategoria: number }> {
        const cat = await crearCategoria(sufijo);
        const sub = await servidor.peticion(
          "admin",
          "POST",
          `/categorias/${cat.id}/subcategorias`,
          { nombre: "S" },
        );
        const idSubcategoria = (sub.cuerpo.data as { idSubcategoria: number })
          .idSubcategoria;
        await prisma.producto.create({
          data: {
            idMarca: 1,
            idSubcategoria,
            nombre: `${PREFIJO}-prod-${sufijo}`,
            publicado: true,
          },
        });
        return { idCategoria: cat.id, idSubcategoria };
      }

      it("informa el impacto antes de desactivar (R6)", async () => {
        const { idCategoria } = await categoriaConProductoVisible("impacto");
        const r = await servidor.peticion(
          "admin",
          "GET",
          `/categorias/${idCategoria}/impacto-desactivacion`,
        );
        expect(r.status).toBe(200);
        expect(r.cuerpo.data).toMatchObject({ productos: 1, subcategorias: 1 });
      });

      it("sin confirmar: 409 CONFIRMACION_REQUERIDA con el impacto y NO desactiva", async () => {
        const { idCategoria } =
          await categoriaConProductoVisible("sin-confirmar");
        const r = await servidor.peticion(
          "admin",
          "PATCH",
          `/categorias/${idCategoria}/estado`,
          { estado: "inactivo" },
        );
        expect(r.status).toBe(409);
        expect(r.cuerpo.error?.code).toBe("CONFIRMACION_REQUERIDA");
        expect(r.cuerpo.error?.details).toMatchObject({
          productos: 1,
          subcategorias: 1,
        });
        const fila = await prisma.categoria.findUnique({
          where: { idCategoria },
        });
        expect(fila?.estado).toBe("activo");
      });

      it("confirmando: desactiva en cascada las subcategorías, y el producto deja de ser visible sin darse de baja (R5)", async () => {
        const { idCategoria, idSubcategoria } =
          await categoriaConProductoVisible("cascada");
        const r = await servidor.peticion(
          "admin",
          "PATCH",
          `/categorias/${idCategoria}/estado`,
          {
            estado: "inactivo",
            confirmar: true,
          },
        );
        expect(r.status).toBe(200);
        expect(
          (r.cuerpo.data as { subcategorias: Array<{ estado: string }> })
            .subcategorias[0]?.estado,
        ).toBe("inactivo");
        expect(
          (await prisma.subcategoria.findUnique({ where: { idSubcategoria } }))
            ?.estado,
        ).toBe("inactivo");
        const producto = await prisma.producto.findFirst({
          where: { idSubcategoria },
        });
        expect(producto?.estado).toBe("activo");
        expect(producto?.publicado).toBe(true);
      });

      it("una categoría sin nada afectado se desactiva sin pedir confirmación", async () => {
        const cat = await crearCategoria("vacia");
        const r = await servidor.peticion(
          "admin",
          "PATCH",
          `/categorias/${cat.id}/estado`,
          { estado: "inactivo" },
        );
        expect(r.status).toBe(200);
      });

      it("repetir el estado actual no hace nada ni falla", async () => {
        const cat = await crearCategoria("idempotente");
        const r = await servidor.peticion(
          "admin",
          "PATCH",
          `/categorias/${cat.id}/estado`,
          { estado: "activo" },
        );
        expect(r.status).toBe(200);
      });

      it("reactivar la categoría NO reactiva a sus subcategorías (D3, R7)", async () => {
        const { idCategoria, idSubcategoria } =
          await categoriaConProductoVisible("reactivar");
        await servidor.peticion(
          "admin",
          "PATCH",
          `/categorias/${idCategoria}/estado`,
          { estado: "inactivo", confirmar: true },
        );
        const r = await servidor.peticion(
          "admin",
          "PATCH",
          `/categorias/${idCategoria}/estado`,
          { estado: "activo" },
        );
        expect(r.status).toBe(200);
        expect(
          (await prisma.subcategoria.findUnique({ where: { idSubcategoria } }))
            ?.estado,
        ).toBe("inactivo");
      });

      it("reactivar una subcategoría con la categoría inactiva es 409 PADRE_INACTIVO (RF-CAT-09-04)", async () => {
        const { idCategoria, idSubcategoria } =
          await categoriaConProductoVisible("padre");
        await servidor.peticion(
          "admin",
          "PATCH",
          `/categorias/${idCategoria}/estado`,
          { estado: "inactivo", confirmar: true },
        );
        const r = await servidor.peticion(
          "admin",
          "PATCH",
          `/subcategorias/${idSubcategoria}/estado`,
          { estado: "activo" },
        );
        expect(r.status).toBe(409);
        expect(r.cuerpo.error?.code).toBe("PADRE_INACTIVO");
      });

      it("desactivar exige catalogo.eliminar; el editor sí puede reactivar (D1)", async () => {
        const cat = await crearCategoria("permiso");
        const denegado = await servidor.peticion(
          "editor",
          "PATCH",
          `/categorias/${cat.id}/estado`,
          { estado: "inactivo" },
        );
        expect(denegado.status).toBe(404);
        expect(
          (
            await prisma.categoria.findUnique({
              where: { idCategoria: cat.id },
            })
          )?.estado,
        ).toBe("activo");
        await servidor.peticion(
          "admin",
          "PATCH",
          `/categorias/${cat.id}/estado`,
          { estado: "inactivo" },
        );
        const reactivar = await servidor.peticion(
          "editor",
          "PATCH",
          `/categorias/${cat.id}/estado`,
          { estado: "activo" },
        );
        expect(reactivar.status).toBe(200);
      });

      it("no existe la ruta DELETE: nunca hay borrado físico (R4)", async () => {
        const cat = await crearCategoria("delete");
        const r = await fetch(
          `${servidor.baseUrl}/api/v1/admin/catalogo/categorias/${cat.id}`,
          {
            method: "DELETE",
            headers: { "x-actor": "admin" },
          },
        );
        expect(r.status).toBe(404);
        expect(
          await prisma.categoria.findUnique({ where: { idCategoria: cat.id } }),
        ).not.toBeNull();
      });
    });
  },
);
