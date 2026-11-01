# Plan de trabajo — Carga masiva de productos con plantilla Excel (2026-10-31)

Rama: `feature/m01-carga-masiva-productos` (desde `main`). Módulo: **M01 Catálogo**. El contrato nuevo será `contracts/m01-catalogo-carga-masiva.contract.ts` y, cuando exista, manda sobre este plan.

## Objetivo

Que el administrador, o un empleado con permiso, pueda crear muchos productos de una vez: descarga una plantilla `.xlsx` generada a partir de la base de datos, la llena, la sube, revisa una vista previa con los errores fila por fila y aplica la carga.

## Lo que ya existe y condiciona el diseño

| Pieza | Qué hay hoy | Consecuencia |
|---|---|---|
| **M01, carga masiva de colores** (RF-CAT-05-03) | `POST /colores/importar/previsualizar` y `/aplicar`. El navegador lee un CSV y envía JSON en bloques; cada fila vuelve con su resultado (`creada`, `actualizada`, `sin_cambios`, `rechazada`) y un motivo de rechazo; hay balance por carga y plantilla descargable. Código en `ImportarColoresModal.tsx`, `colores.service.ts` y `importarColoresRequestSchema` | **Es el patrón exacto a seguir** para productos. Misma forma de contrato, mismos permisos, mismo comportamiento de la pantalla. Lo que cambia es que ahora la plantilla es Excel y la fila es más compleja |
| **M13, carga de existencias** | Reglas de vista previa y aplicación (R5 a R10): identificar por nombre sin tildes ni mayúsculas, detectar repetidos en un bloque, aplicación idempotente; neutraliza fórmulas (`=`, `+`, `-`, `@`) | Se reutiliza su normalización de texto y sus reglas de repetidos y fórmulas |
| **M01, creación de producto** | `POST /productos` (marca, línea, subcategoría, nombre, descripción, uso interior/exterior, ficha de recubrimiento, listas de superficies, acabados, bases y colores de fábrica, características) y `POST /productos/:id/variantes` (medida, precio, SKU, código de proveedor, peso y medidas) | La carga masiva debe cumplir las mismas reglas P1 a P10 y V1 a V5 que el alta manual. No se duplican reglas: se llama a los servicios existentes |
| **Reglas del modelo** | Producto único por (marca, nombre); variante única por (producto, medida) y por SKU; la línea debe ser de la misma marca; un recubrimiento exige línea; bases exigen al menos un acabado | Son los errores que la vista previa debe mostrar por fila |
| **Librerías** | Ni el backend ni el frontend tienen ninguna para leer o escribir `.xlsx` | Hay que añadir una (propuesta: `exceljs`, mantenida y sin los problemas de seguridad de `xlsx`) |
| **Límite de cuerpo** | `core/middlewares/cuerpoJson.middleware.ts` tiene límites por ruta (general, con documento, con carga, con imágenes) | La carga de productos necesita el suyo (PR general) |
| **Permisos** | `catalogo.ver` y `catalogo.editar` ya existen; la carga de colores usa el de crear | Se reutilizan; no hace falta tocar M17 |

## La plantilla

Un libro Excel con estas hojas, todas generadas desde la base de datos al descargar:

1. **Instrucciones**: qué columnas son obligatorias, formatos, límites y un ejemplo.
2. **Productos**: **una fila por variante**. Las columnas del producto se repiten; las filas con la misma marca y nombre forman un solo producto. Columnas: marca, línea, categoría, subcategoría, producto, descripción, uso interior, uso exterior, medida, SKU, precio, código de proveedor, peso (g), alto, ancho y largo (cm), y las listas de superficies, acabados, bases y colores de fábrica separadas por `;`, las características técnicas en una columna con pares `Nombre: valor` separados por `;`. Para recubrimientos: tipo de resina, calidad, rendimiento mínimo y máximo, manos.
3. **Catálogos** (hojas de solo consulta): marcas, líneas por marca, categorías y subcategorías, medidas por tipo, acabados, bases, superficies, tipos de resina y colores. Alimentan las listas desplegables de la hoja «Productos» para que el usuario elija valores válidos y no escriba nombres a mano.
4. Una celda oculta con la **versión de la plantilla**: una plantilla antigua se rechaza con un mensaje claro.

Se identifica todo **por nombre**, no por id (como M13 R5), ignorando tildes y mayúsculas. Los números aceptan coma decimal.

## Flujo

1. Descargar la plantilla (`GET`, `catalogo.editar`).
2. Subir el `.xlsx`; el navegador lo lee y lo divide en bloques que **nunca parten un producto** (todas las variantes de un producto van en el mismo bloque).
3. **Vista previa** (`/previsualizar`): no escribe nada. Devuelve por fila su resultado y el motivo de rechazo, como la de colores.
4. **Aplicar** (`/aplicar`): crea los productos válidos. Cada producto con sus variantes va en **una sola transacción**: si falla una variante, ese producto no se crea, pero los demás sí. Es idempotente: repetir la carga deja los productos como «sin cambios».
5. Descargar el **informe de errores** como Excel, con las mismas filas y una columna de motivo, para corregir solo lo que falló.
6. Cada carga se audita en M20.

## Fases

**Fase 0: decisiones** (abajo). Sin ellas no se escribe el contrato.

**Fase 1: contrato** `contracts/m01-catalogo-carga-masiva.contract.ts`: columnas, reglas, esquemas, rutas, motivos de rechazo y límites.

**Fase 2: PR general (archivos compartidos)**: dependencia `exceljs`, límite de cuerpo para la carga en `core/`, montaje de rutas en `app.routes.ts` y, si se decide guardar el historial de cargas, la tabla en SQL y Prisma.

**Fase 3: backend**
- Constructor de la plantilla desde la base de datos (con listas desplegables y versión).
- Validación por fila contra las reglas de M01 y resolución de nombres a ids.
- Vista previa, aplicación por producto, balance y motivos de rechazo.
- Tests con la base de datos real, como en M08.

**Fase 4: frontend**: pantalla (o modal, como la de colores) de carga masiva en el catálogo: descargar plantilla, subir, tabla de vista previa con filtro de errores, aplicar, resultado final e informe de errores descargable. Lectura del `.xlsx` en el navegador con carga diferida de la librería para no engordar el resto del sitio.

**Fase 5: documentación y PR**: sección en la spec de M01 (junto a RF-CAT-05-03), walkthrough y dos PR (general primero).

## Riesgos que el diseño debe cubrir

- **Fórmulas maliciosas** en celdas de entrada y salida: se neutralizan, como en M13.
- **Archivos hostiles o enormes** (zip bombs, miles de filas): límite de tamaño, de filas y de hojas, en el navegador y otra vez en el servidor.
- **Nombres ambiguos o repetidos** (dos marcas casi iguales, la misma variante dos veces en el archivo): se rechazan con su motivo, sin adivinar.
- **Listas desplegables largas**: Excel limita las listas escritas en la celda a 255 caracteres, así que se apuntan a rangos de las hojas de catálogos.
- **Cambios del catálogo entre descargar y subir**: la vista previa y la aplicación validan contra la base de datos, porque otra persona pudo crear o renombrar algo.
- **Producto que no cabe en un bloque**: un producto con muchas variantes no puede partirse; si un solo producto supera el límite del bloque, se rechaza entero.
- **Imágenes**: el catálogo las guarda en la base de datos; no caben en una celda de Excel.

## Decisiones

**Respondidas por el usuario**
1. **Solo crear.** Un producto que ya existe se reporta y no se toca.
2. **Con características técnicas.** Una columna «Características» con pares `Nombre: valor` separados por `;`.
3. **Revisar antes de cargar.** Justo después de subir el Excel se **listan los productos** (con sus variantes y los errores) y solo entonces aparece el botón para cargarlos. Es la vista previa del contrato, pensada por productos y no por filas.

**Tomadas por defecto, a la espera de que alguien las vete** (están en el contrato como D1 a D5)
4. Una fila del Excel es una variante; las filas con la misma marca y producto forman un producto.
5. Los productos nacen **sin publicar** y las variantes con **existencia 0**: publicar exige imagen y la existencia solo la escribe M13.
6. El Excel se lee en el navegador y se envía por bloques, como la carga de colores.
7. Permiso: `catalogo.crear`, el mismo de importar colores.
8. Sin tabla de historial de cargas: queda la auditoría de M20.
9. Máximo 2 000 filas y 5 MB por archivo, en bloques de 500.

**Abiertas para el cliente**
- ¿Hace falta ver el historial de cargas en pantalla? (implica una tabla)
- ¿Quiere cargar también la existencia inicial en la misma plantilla? (las características técnicas ya están incluidas, regla C15)
