# M01. Catálogo — Reglas adicionales y decisiones

Complementa [`M01_ESPECIFICACION_CATALOGO.md`](./M01_ESPECIFICACION_CATALOGO.md). Aquí vive lo que la especificación no dice o contradice.
El detalle técnico de cada entrega está en `contracts/m01-catalogo.contract.ts`.

> Cómo se mantiene este archivo: cuando el Tech Lead cuenta una regla del cliente, se anota aquí (sección 3)
> y, si cambia el comportamiento de la API, también en el contrato.

## 1. Decisiones que traía el DDL anterior (esquema 4.2)

> Historia: así estaba el DDL antes del rediseño. Lo que el esquema 4.3 cambia está en la sección 5.

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
| `RF-CAT-12-11` | Cuántas bases tiene cada marca y cómo se llaman. | ✅ **Resuelto** (RC-17): Tint, Deep, Pastel y Accent; globales. |
| `RF-CAT-12-12` | Qué determina la base que exige un color. | ✅ **Resuelto** (RC-07, RC-24): cada color tiene una base opcional. |
| `RF-CAT-05-20` | De dónde sale el valor cromático CIELAB de los colores. | ✅ **Resuelto** (RC-25): el hexadecimal es obligatorio y el CIELAB opcional. |
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
| RC-23 | 2026-10-24 | Para M06: evento **"Miércoles de color"**: descuento semanal en algunas líneas de Pintuco. **El blanco queda excluido** del descuento. (El blanco se identifica por la familia de color "Blancos".) | Tech Lead |
| RC-24 | 2026-10-24 | La base de un color es **opcional pero muy esencial**: no la tienen el transparente, los colores de ICO ni los aerosoles. Los colores de fábrica sin base se agregan a la tabla de colores sin base. | Tech Lead |
| RC-25 | 2026-10-24 | El hexadecimal del color es obligatorio y el CIELAB es opcional. | Tech Lead |
| RC-26 | 2026-10-24 | El cliente "tomador de notas": el inventario es referencial; SAMIT, a futuro, con importación aparte. El precio de una pintura es por variante (medida). | Tech Lead |

## 4. Modelo de dominio (versión 3, implementado en el esquema 4.3 — PR #14)

```
marca ── linea (opcional en el producto)
categoria ── subcategoria                 (dos niveles)
producto ── UNA subcategoria · superficies N:M · ambiente (usoInterior / usoExterior)
producto ── ficha de recubrimiento (opcional; no la tienen las herramientas):
            tipo de resina · tipo 1/2/3 · rendimiento m² por galón
producto ─ N:M ─ acabado                  (Brillante, Mate, Semimate, Satinado, Transparente…)
producto ─ N:M ─ base                     (entonables; ICO y herramientas no tienen)
producto ─ N:M ─ color de fábrica         (ICO, aerosoles, transparente, exclusivos)

base   = Tint · Deep · Pastel · Accent     (global, no depende de la marca)
color  = marca · nombre · código · base (opcional pero esencial) · acabado (Brillante por defecto)
         · familia (Blancos, Rojos…) · hexadecimal (obligatorio) · CIELAB (opcional)

variante = producto + medida + precio + SKU + existencia referencial
medida   = valor + tipo de medida (galón, litro, pulgada, metro, unidad…)

Línea de carrito / orden = variante + color (si aplica) → SKU compuesto P1-V2-ROJO
```

**Colores que ofrece un producto** = colores activos de su marca cuya base es una de sus bases **y** cuyo
acabado es uno de sus acabados, **más** sus colores de fábrica. Un producto sin bases ni colores de fábrica
no lleva color (herramientas).

**Clase derivada del producto** (ya no se guarda): `entonable` si tiene bases; `colores_fijos` si no tiene bases
pero sí colores de fábrica; `sin_color` si no tiene ninguno.

## 5. Requisitos de la spec que este modelo reemplaza

| Requisito | Qué decía | Qué rige ahora |
| :--- | :--- | :--- |
| `RF-CAT-02-02` | Exige al menos una subcategoría. | **Una** subcategoría; el uso en varios sitios va en superficies y ambiente. |
| `RF-CAT-02-02` | Línea y resina obligatorias a pinturas. | Con ficha de recubrimiento, línea y resina obligatorias; sin ficha, opcionales (decisión D7). |
| `RF-CAT-02-03` | Clase declarada y no cambiable con variantes. | Clase **derivada** de bases y colores de fábrica. |
| `RF-CAT-03-02` | Forma de la variante según la clase (con base/color). | Variante = producto + medida. El color se elige en la venta. |
| `RF-CAT-03-05` | Presentación con nombre y volumen. | Medida = valor + tipo de medida. |
| `RF-CAT-05-02` | CIELAB obligatorio. | Hexadecimal obligatorio, CIELAB opcional. |
| `RF-CAT-05-04`, `RF-CAT-05-05`, `CA-CAT-05-08` | El color identifica variantes de colores fijos y las desactiva. | Los colores de fábrica no forman variantes: desactivar un color solo lo retira de la oferta del producto. |
| `RF-CAT-12-01`, `CA-CAT-12-02` | La base exige tipo de resina. | La base no lleva resina (DDL, decisión del PO). La resina está en la ficha del producto. |
| `RF-CAT-12-04`, `RF-CAT-12-12` | Color asociado a una o varias bases; sin definir de dónde sale. | **Un color, una base opcional** (RC-07, RC-24). Resuelto. |
| `RF-CAT-12-05` | Registrar variante de base consumida en la compra. | La base se deduce del color (`base_consumida` en la línea de orden); M05/M08 la resuelven. |
| `CA-CAT-01-06` | Producto en tres subcategorías. | Una subcategoría (ver arriba). |
| `RF-CAT-02-05` | Publicar exige variante activa e imagen. | En la entrega 2 solo variante activa; la imagen llega con la entrega 3. |

## 6. Preguntas abiertas

1. ❓ **Equivalencia en galones** (D6): para calcular el rendimiento por medida hace falta la columna `equivalencia_galones` en `tipo_medida` (galón = 1, litro = 0,264172, mililitro = 0,000264172). No existe en el PR #14. ¿Se agrega?
2. ❓ **Línea obligatoria con ficha** (D7): las pinturas deben tener línea. ¿Hay productos de recubrimiento sin línea (ej. un estuco genérico)?
3. ❓ **Imágenes antes de publicar** (D9): en la entrega 2 se puede publicar sin imagen. ¿Aceptable mientras llega la entrega 3?
4. ❓ **Familia derivada del hexadecimal** (D8): ¿basta con que el servidor la calcule o la importación del cliente ya trae la familia?
5. ❓ **Colores de ICO y aerosoles**: el cliente no supo precisar cuáles son. El modelo ya los admite sin base; falta la lista.
6. ❓ **Un acabado por color**: el modelo permite un solo acabado por color. ¿Existe un color con el mismo nombre en dos acabados que deba contarse como el mismo?
7. Mayúsculas en nombres (D4) y reactivación sin cascada pero verificando el padre (D3 y R7), del contrato de la entrega 1.
