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

## 4. Modelo de dominio propuesto (pendiente de confirmar)

```
marca ─┬─ linea (opcional en el producto)
       ├─ base (Tint, Deep, Pastel, Accent)
       └─ color ── base (obligatoria en colores de carta) · acabado (opcional)

categoria = AMBIENTE (Interior, Exterior, Herramientas)
  └─ subcategoria = SUPERFICIE (Paredes y techos, Madera, Metal…)
producto ─ N:M ─ subcategoria          (un producto puede estar en interior y exterior)
producto ── tipo de producto (Pintura, Estuco, Barniz, Herramienta…)
producto ── clase de color: entonable | colores_fijos | sin_color
producto ── ficha de recubrimiento (opcional, no la tienen las herramientas):
            tipo de resina · tipo 1/2/3 · rendimiento m² · acabados (N:M)
producto ─ N:M ─ base                  (solo entonables: define su carta)
producto ─ N:M ─ color                 (solo colores_fijos: sus colores de fábrica)
producto ── variante = medida + precio + SKU base + existencia referencial
medida = valor + tipo de medida (galón, litro, pulgada, metro…)

Línea de venta (carrito y orden) = variante + color elegido (si aplica)
  → SKU final = SKU de la variante + código del color
  → la base que se consume sale del color
```

**Colores que ofrece un producto entonable** = colores activos cuya base está entre las bases del producto
**y** (sin acabado **o** con un acabado que el producto tiene).

## 5. Preguntas abiertas

1. ❓ RC-12: "que por defecto sea blanco" ¿significa **vacío** (sin acabado, aplica a todos)?
2. ❓ RC-13: ¿el **precio cambia según la base o el color**? En colorimetría las bases Deep/Accent suelen costar más. Si cambia, la variante necesita un precio por base.
3. ❓ RC-12: si un producto tiene mate y brillante, ¿el cliente **elige el acabado** al comprar? ¿Cambia el precio?
4. ❓ RC-10: en productos de color de fábrica, ¿el precio o la existencia **cambian por color**? Con variante = medida, la existencia queda por medida y no por color.
5. ❓ RC-14: ¿sirve **categoría = ambiente** y **subcategoría = superficie**, con el tipo de producto como dato del producto?
6. ❓ RC-05: el spec exige CIELAB obligatorio y no hay archivo. ¿Basta con un **hexadecimal** obligatorio y CIELAB opcional?
7. ❓ ¿Las bases son por marca (otras marcas tienen sus propias bases y colores)?
8. ❓ ¿Existe un archivo con la **base de datos que propuso el Tech Lead**? El DDL del repo es distinto (presentación sin unidad, tabla `tonos`, tercer nivel de categorías, variante con base y color).
9. ❓ Unidad y uso del volumen: ¿la medida sirve para **comparar precios** entre productos o es solo informativa?
10. Mayúsculas en nombres (D4) y reactivación sin cascada (D3), del contrato de la entrega 1.
