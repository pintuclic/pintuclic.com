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

## 3. Reglas del cliente (a completar por el Tech Lead)

Anotar aquí cada regla con su fecha y quién la dio.

| Fecha | Regla | Dada por | ¿Está en el contrato? |
| :--- | :--- | :--- | :--- |
| 2026-10-23 | El inventario de Pintu Clic es **solo referencial** ("tomador de notas digital"). SAMIT se integrará a largo plazo; su importación será aparte y requiere un archivo de SAMIT. | Tech Lead | No aplica a la entrega 1 (existencia llega con variantes). |

## 4. Preguntas abiertas de la entrega 1

1. **Unidad del volumen de una presentación.** La BD guarda un número, sin unidad. ¿Litros? ¿Galones? Se usa para comparar precios entre productos.
2. **Mayúsculas en nombres.** Se propone tratar "Viniltex" y "viniltex" como el mismo nombre (decisión D4).
3. **Reactivación.** Se propone que reactivar una categoría o marca **no** reactive sus hijos (decisión D3).
4. **Quién ve el logotipo.** Hoy solo hay ruta de administración; la consulta pública llega con `HU-CAT-06`.
5. **Tipos de resina.** La spec los llama catálogo administrable (`RF-CAT-02-04`); se incluyen en esta entrega porque los productos los usarán.
