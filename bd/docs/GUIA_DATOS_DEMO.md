# Guía: cargar los datos de demostración del catálogo

Pensada para quien administra el servidor (DevOps). No hace falta conocer el proyecto: son **dos pasos con `psql`**.

## Qué es

Un script SQL que deja la tienda con aspecto real para demostraciones y pruebas con el cliente:

| Qué agrega | Cantidad |
|---|---|
| Productos publicados (pinturas, preparación, maderas, impermeabilizantes, aerosoles, herramientas) | 29 |
| Variantes con precio (COP, IVA incluido) y existencia | 42 |
| Colores (carta de Pintuco: 71 brillantes + 12 mate, y 25 colores de fábrica de aerosoles, tintes, impermeabilizantes y esmaltes) | 108 |
| Marcas ficticias nuevas (Colorama, Maderplus, Impermax) y sus líneas | 3 |
| Una ilustración principal por producto (también para los 6 productos del seed) | 35 |
| Historial de ventas de ejemplo: órdenes `DEMO-0001`…`DEMO-0042`, de los últimos 75 días | 42 |

Con eso se ven «Los más vendidos», «Herramientas y más», el catálogo, los filtros, la paleta de color y los paneles del administrador.

**Los productos, marcas ficticias, precios y órdenes son inventados.** No son datos del cliente.

## Garantías

- **Solo agrega.** No modifica ni borra nada de lo que ya existe. Si una fila ya existe (mismo nombre, SKU o código) la deja como está.
- **Se puede correr varias veces** con el mismo resultado (idempotente).
- **Una sola transacción:** si algo falla no queda nada a medias.
- **No requiere reiniciar ni redesplegar la aplicación:** la tienda lee estos datos directamente de la base.
- Requiere el esquema del repositorio ya aplicado (`bd/sql/schema_pintuclic.sql`) y **PostgreSQL 13 o superior**.
- El historial de ventas se asigna a los clientes que ya existan (rol `cliente`). Si no hay ninguno, se omite solo esa parte y avisa.

> ⚠️ **No lo cargue en un entorno con clientes reales** sin avisar: las órdenes `DEMO-xxxx` aparecerían en el panel de pedidos y en los reportes. Está pensado para el entorno de demostración, pruebas o preproducción. Si hay que cargarlo en producción, ver «Solo catálogo, sin órdenes» abajo.

## Paso 0 · Copia de seguridad (recomendado siempre)

```bash
# Ajuste CONTENEDOR, USUARIO y BASE a su entorno (ver `docker ps` y el .env del backend: DATABASE_URL)
docker exec CONTENEDOR pg_dump -U USUARIO -Fc BASE > respaldo_antes_demo_$(date +%F).dump
```

## Paso 1 · Cargar

Desde una copia del repositorio (o copiando solo `bd/sql/demo/datos_demo_catalogo.sql` al servidor):

```bash
# Base en un contenedor Docker (el archivo se pasa por la entrada estándar; no hace falta copiarlo adentro)
docker exec -i CONTENEDOR psql -U USUARIO -d BASE -v ON_ERROR_STOP=1 < bd/sql/demo/datos_demo_catalogo.sql
```

Si la base **no** está en Docker:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f bd/sql/demo/datos_demo_catalogo.sql
```

(`DATABASE_URL` sin el parámetro `?schema=public`, que `psql` no entiende.)

Salida esperada: termina sin errores (puede mostrar avisos `NOTICE`; no son problemas). Si se corre por segunda vez, avisa «El historial de ventas de ejemplo ya estaba cargado: no se repite».

## Paso 2 · Verificar

```bash
docker exec -i CONTENEDOR psql -U USUARIO -d BASE -c "
  SELECT (SELECT count(*) FROM producto WHERE publicado)            AS productos_publicados,
         (SELECT count(*) FROM variante)                            AS variantes,
         (SELECT count(*) FROM color)                               AS colores,
         (SELECT count(*) FROM imagen WHERE es_principal)           AS imagenes,
         (SELECT count(*) FROM orden WHERE codigo_visible LIKE 'DEMO-%') AS ordenes_demo;"
```

En una base recién creada con el seed del repositorio debe dar: **35 productos, 51 variantes, 130 colores, 35 imágenes y 42 órdenes demo** (el seed trae 6 productos, 9 variantes y 22 colores propios). En una base con más datos, los totales serán mayores, pero las filas de demostración son siempre las mismas.

Luego abrir la tienda: en el inicio deben verse «Los más vendidos» y «Herramientas y más para tu obra» con productos e ilustraciones.

## Solo catálogo, sin órdenes de ejemplo

Si no se quieren las órdenes `DEMO-xxxx` (por ejemplo, en producción), cargar y luego retirar solo las órdenes:

```bash
docker exec -i CONTENEDOR psql -U USUARIO -d BASE -v ON_ERROR_STOP=1 < bd/sql/demo/datos_demo_catalogo.sql
docker exec -i CONTENEDOR psql -U USUARIO -d BASE -c "
  BEGIN;
  DELETE FROM historial_estado_orden WHERE id_orden IN (SELECT id_orden FROM orden WHERE codigo_visible LIKE 'DEMO-%');
  DELETE FROM linea_orden WHERE id_orden IN (SELECT id_orden FROM orden WHERE codigo_visible LIKE 'DEMO-%');
  DELETE FROM orden WHERE codigo_visible LIKE 'DEMO-%';
  COMMIT;"
```

Sin ventas, «Los más vendidos» no se muestra en el inicio (es lo esperado).

## Retirar todo (volver al estado anterior)

```bash
docker exec -i CONTENEDOR psql -U USUARIO -d BASE -v ON_ERROR_STOP=1 < bd/sql/demo/retirar_datos_demo.sql
```

Borra únicamente lo que cargó el script de demostración (órdenes `DEMO-xxxx`, productos, colores, imágenes y las tres marcas ficticias). No toca nada anterior. Si algún producto de demostración ya se usó de verdad (quedó en un carrito o en una cotización), el retiro **falla sin borrar nada** y hay que resolverlo a mano.

## Para quien mantiene el proyecto

Los dos `.sql` son **generados**; no se editan a mano. Los datos viven en `bd/script/datos-demo/catalogo.mjs` y las ilustraciones en `ilustraciones.mjs`. Para cambiarlos:

```bash
node bd/script/datos-demo/generar.mjs   # regenera bd/sql/demo/datos_demo_catalogo.sql y retirar_datos_demo.sql
```

El generador usa `sharp` de `backend/node_modules` (hay que haber corrido `npm install` en `backend`). La salida es determinista: con los mismos datos produce los mismos archivos.
