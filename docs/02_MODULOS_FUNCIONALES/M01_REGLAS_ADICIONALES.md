# M01. Catálogo — Reglas adicionales y decisiones

Complementa [`M01_ESPECIFICACION_CATALOGO.md`](./M01_ESPECIFICACION_CATALOGO.md). Aquí vive lo que la especificación no dice o contradice.
El detalle técnico de cada entrega está en `contracts/m01-catalogo.contract.ts`.

> Cómo se mantiene este archivo: cuando el Tech Lead cuenta una regla del cliente, se anota aquí (sección 3)
> y, si cambia el comportamiento de la API, también en el contrato.

## 1. Decisiones ya tomadas que están en el DDL (`bd/sql/schema_pintuclic.sql`)

| Tema | Qué dice el DDL | Diferencia con la spec |
| :--- | :--- | :--- |
| Tipo de resina de una base | La tabla `base` **no tiene** tipo de resina; se excluyó a petición explícita del Product Owner. | `RF-CAT-12-01` y `CA-CAT-12-02` exigen tipo de resina en la base. **Gana el DDL.** |
| Logotipo de marca | Se guarda como bytes en la BD (`BYTEA`), máximo 5 MB, jpeg/png/webp, y su tipo MIME. | `RF-CAT-04-02` remite al "Anexo B de la Tanda 2", que no está. El 5 MB es un supuesto aprobado por el Product Owner. |
| Tercer nivel de categorías | Existe la tabla `sub_subcategorias` y la columna `linea.id_sub_subcategoria`. | `RF-CAT-01-02` exige **exactamente dos niveles**. No se usan; son remanente de un diseño anterior. |
| Asociaciones base↔producto y color↔base | Pendientes: dependen de productos y colores. | `RF-CAT-12-02` y `RF-CAT-12-04`; además `RF-CAT-12-12` está marcado como pendiente. |
| Unicidad de nombres | Categoría, marca y tipo de resina: global. Subcategoría: por categoría. Línea y base: por marca. | Alineado con la spec (`RF-CAT-01-03`, `RF-CAT-11-02`, `RF-CAT-12-01`). |
| Presentación | Entidad propia con nombre único y volumen numérico mayor que cero. | `RF-CAT-03-05`. |

## 2. Pendientes de la spec que afectan lo que se construye

| Id | Pendiente | Impacto |
| :--- | :--- | :--- |
| `RF-CAT-12-11` | Cuántas bases tiene cada marca y cómo se llaman. | Se cargan después como datos; el sistema no fija la cantidad. |
| `RF-CAT-12-12` | Qué determina la base que exige un color. | Bloquea la asociación color↔base (entrega con colores). |
| `RF-CAT-05-20` | De dónde sale el valor cromático CIELAB de los colores. | Bloquea la carga masiva de colores. |
| Permisos | La spec habla de «Gestión del catálogo» y «Gestión de productos»; el seed solo tiene `catalogo.ver/crear/editar/eliminar`. | Se usan los del seed (decisión D1 del contrato). |

## 3. Reglas del cliente (dadas por el Tech Lead)

Cada regla con su fecha y quién la dio. Las marcadas ❓ tienen una pregunta abierta en la sección 5.

| Id | Fecha | Regla | Dada por |
| :--- | :--- | :--- | :--- |
| RC-01 | 2026-10-23 | El inventario es **solo referencial** ("tomador de notas digital"). SAMIT (sistema de inventarios del cliente) se integrará a largo plazo, con una importación aparte que exige un archivo real de SAMIT. | Tech Lead |
| RC-02 | 2026-10-23 | Jerarquía del producto: **marca → línea (opcional) → producto**. Las herramientas a veces no tienen línea. Ej.: Pintuco → Viniltex → Viniltex Ultralavable. | Tech Lead |
| RC-03 | 2026-10-23 | No solo se venden pinturas: también herramientas y productos relacionados. Las pinturas y los colores son las entidades **más importantes** del sistema. | Tech Lead |
| RC-04 | 2026-10-23 | Medidas: **producto → variante → medida → tipo de medida** (galones, litros, metros, pulgadas, etc.). Es referencial. | Tech Lead |
| RC-05 | 2026-10-23 | La carta tiene **miles de colores** (≈5 000). El archivo de importación aún no se ha encontrado. Los colores deben poder **agregarse a mano e importarse**. | Tech Lead |
| RC-06 | 2026-10-23 | Pintuco no almacena miles de tarros por color: distribuye **4 bases** (Tint, Deep, Pastel, Accent) y prepara el color por **colorimetría**. | Tech Lead |
| RC-07 | 2026-10-23 | **Cada color tiene asignada exactamente una base**, sin importar la línea (ej.: azul cielo siempre sobre base Pastel). El color se asigna a la base, no al producto. Resuelve `RF-CAT-12-12`. | Tech Lead |
| RC-08 | 2026-10-23 | A cada producto de pintura entonable se le **asignan bases**; así se sabe qué colores ofrece: los de sus bases. | Tech Lead |
| RC-09 | 2026-10-23 | Hay productos **transparentes** (resinas, barnices) sin color. | Tech Lead |
| RC-10 | 2026-10-23 | Hay productos que **traen el color de fábrica** (por lote, no por preparación), casi siempre colores exclusivos de ese producto. Los aerosoles también. | Tech Lead |
| RC-11 | 2026-10-23 | Una pintura tiene: color, variantes con SKU, **tipo de resina** (ej. vinilo = base agua), **tipo 1, 2 o 3** (gama; Ultralavable = tipo 1, gama alta), **acabados**, **rendimiento por m²**. Las herramientas no tienen esos campos. | Tech Lead |
| RC-12 | 2026-10-23 ❓ | **Acabados** (mate, brillante, semimate, transparente…): un producto puede tener varios. El color tiene un acabado **opcional**; los colores con acabado (ej. "Negro Mate") solo se habilitan en productos que tengan ese acabado. Los colores sin acabado aplican a todos. | Tech Lead |
| RC-13 | 2026-10-23 ❓ | **Variantes:** no se pueden registrar decenas de miles. Al producto se le agrega una variante = **medida + precio**; la combinación con el color y su SKU se genera **en la venta**. | Tech Lead |
| RC-14 | 2026-10-23 ❓ | Pintuco navega por **ambiente** (Pintura Interior / Exterior / Herramientas) → **superficie** (Paredes y techos, Madera, Metal, Otras) → **tipo de producto** (Pinturas, Estucos) → producto. Hay confusión entre ambiente, categoría y subcategoría. | Tech Lead |
| RC-15 | 2026-10-23 | El 90 % de las pinturas son **entonables y además traen colores de fábrica** (Pintuco distribuye el producto con su catálogo A, B, C, D). Excepción: la línea **ICO**, que solo vende colores de fábrica, sin bases. | Tech Lead |
| RC-16 | 2026-10-23 | Todo color **pertenece a una base**, también los de fábrica (Pintuco publica "Maní" en vez de "Maní-Tint"; Pintu Clic no puede permitirse eso). Los colores "exclusivos" de un producto se registran en la misma tabla de colores, con su base; marcarlos como exclusivos es solo visual. | Tech Lead |
| RC-17 | 2026-10-23 | Las **bases son un estándar internacional** (Tint, Deep, Pastel, Accent): no dependen de la marca. | Tech Lead |
| RC-18 | 2026-10-23 | El acabado del color es obligatorio y por defecto **Brillante**; así sirve para la mayoría de productos. Si el producto tiene acabado mate, al escoger color aparecen también los mates. El cliente puede buscar "mate" en el selector. | Tech Lead |
| RC-19 | 2026-10-23 | Selector de color en el detalle del producto: por **familias** (Blancos, Rojos, Amarillos…) en matriz, o por nombre. Solo muestra los colores que el producto permite. | Tech Lead |
| RC-20 | 2026-10-23 | El **precio es de la variante** (medida), nunca del producto ni del color, por ahora. A futuro podría existir precio por color. | Tech Lead |
| RC-21 | 2026-10-23 | En el carrito, el producto con color es una **variante temporal** identificada por un SKU compuesto, ej. `P1-V2-Rojo` (producto, variante, color). | Tech Lead |
| RC-22 | 2026-10-23 | La tabla `tonos` **se elimina**. | Tech Lead |
| RC-23 | 2026-10-23 ❓ | Para M06: evento **"Miércoles de color"**: descuento semanal en algunas líneas de Pintuco; el descuento "no afecta exclusivamente al blanco". | Tech Lead |

## 4. Modelo de dominio propuesto (versión 2, pendiente de confirmar)

```
marca ── linea (opcional en el producto)
categoria ── subcategoria                 (dos niveles; ver pregunta 1)
producto ─ N:M ─ subcategoria
producto ── ambiente: interior / exterior (puede tener ambos)
producto ── ficha de recubrimiento (opcional; no la tienen las herramientas):
            tipo de resina · tipo 1/2/3 · rendimiento m²
producto ─ N:M ─ acabado                  (Brillante, Mate, Semimate, Satinado, Transparente…)
producto ─ N:M ─ base                     (entonables; ICO no tiene)
producto ─ N:M ─ color "exclusivo"        (colores de fábrica; solo visual, salvo en ICO)

base   = Tint · Deep · Pastel · Accent     (global, no depende de la marca)
color  = marca · nombre · código · base (obligatoria) · acabado (obligatorio, Brillante)
         · familia (Blancos, Rojos…) · hexadecimal (obligatorio) · CIELAB (opcional)

variante = producto + medida + precio + SKU base + existencia referencial
medida   = valor + tipo de medida (galón, litro, pulgada, metro, unidad…)

Línea de carrito / orden = variante + color (si aplica) → SKU compuesto P1-V2-Rojo
                           → la base que se consume sale del color
```

**Colores que ofrece un producto** =
(colores cuya base está entre las bases del producto **y** cuyo acabado está entre los acabados del producto)
**más** sus colores exclusivos. Un producto sin bases ni colores exclusivos no lleva color (herramientas, barnices transparentes).

**Cambios al DDL actual:** se eliminan `tonos`, `sub_subcategorias`, `linea.id_sub_subcategoria`, `presentacion`,
`base.id_marca` y la forma actual de `variante` (producto + base + color + presentación). Se agregan `acabado`,
`familia_color`, `tipo_medida`, `medida`, `producto_acabado`, `producto_color` y el color en la línea del carrito.

## 5. Preguntas abiertas

1. ❓ **Categorías.** El Excel `bd/script/Pintuco_Categorias_y_Subcategorias.xlsx` (9 categorías, 53 subcategorías) clasifica por **uso** (Paredes y techos, Maderas, Metales, Pisos, Automotriz…) y lleva interior/exterior dentro de la subcategoría. Ahí "ambiente" como categoría no funciona para Pisos, Automotriz o Industrial. Propuesta: categorías del Excel y **ambiente como dato del producto**, que alimenta las pestañas "Pintura Interior / Exterior" de la web.
2. ❓ **Colores de ICO** (RC-16): si no se consigue la base de esos colores, no se podrían registrar con la base obligatoria.
3. ❓ **Miércoles de color** (RC-23): ¿significa que el blanco queda **excluido** del descuento?
4. ❓ **Hexadecimal obligatorio y CIELAB opcional** (ver explicación en el chat del 2026-10-23).
5. Mayúsculas en nombres (D4) y reactivación sin cascada (D3), del contrato de la entrega 1.
