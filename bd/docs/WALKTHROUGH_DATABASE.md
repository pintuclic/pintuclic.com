# 🚀 Walkthrough de Evolución y Migración de Base de Datos - PINTUCLIC

Este documento registra la evolución histórica del modelo de base de datos de **Pintuclic**, detallando para cada versión las tablas creadas, tablas deprecadas, cambios de tipos de datos, nuevas restricciones (`CONSTRAINTS`), tipos `ENUM`, índices e impactos directos en Backend (Kysely/Express) y Frontend.

---

## 📑 Índice de Versiones
- [Versión 2.7 / v0.3.37.0 (M08: copia histórica de la orden, descuentos por línea y consecutivo - 2026-09-29)](#-versión-27--v03370-2026-09-29)
- [Versión 2.6 / v0.3.34.0 (M08: estados, historial, notas internas y contactos de la orden - 2026-09-29)](#-versión-26--v03340-2026-09-29)
- [Versión 2.5 / v3.29.0 (Sincronización de Modelo ER de Base de Datos - 2026-09-22)](#-versión-25--v3290-2026-09-22)
- [Versión 2.4 (Módulo de Cuentas, Autenticación y Perfil - M04)](#-versión-24-2026-09-05)
- [Versión 2.3 (Módulo de Privacidad, Consentimiento y Habeas Data - HU-SEG-05)](#-versión-23-2026-09-05)
- [Versión 2.2 (Sesiones de Usuario con Control de Inactividad e Invalidación)](#-versión-22-2026-09-05)
- [Versión 2.1 (E-Commerce Inmutable, Cotizaciones y Carrito con Variantes)](#-versión-21-2026-09-04)
- [Versión 2.0 (Página FINAL del ER) - Reestructuración de Catálogo, Variantes y Combos](#-versión-20-2026-09-03)
- [Versión 1.0 (Esquema Inicial Pre-Final) - Base de 21 Tablas](#-versión-10-2026-09-02)

---

## 📦 Versión 2.7 / v0.3.37.0 (2026-09-29)

### 🎯 Resumen Ejecutivo
Segunda tanda del modelo de datos de **M08 Orden de venta**, con visto bueno del líder técnico. Cubre las secciones 3, 4, 5 y 8 de `docs/walkthroughs/M08/PROPUESTA_MODELO_DATOS_M08.md`, lo que el analista confirmó como definido el 29/09. La orden conserva ahora una **copia histórica completa**: modo y costo de entrega, IVA, solicitud de origen y, por línea, color, precio inicial, descuentos, entonado y producto de referencia. Además hay un **consecutivo sin huecos** para el código `PC-AAAA-NNNNN`. La cabecera del script pasa a **esquema 3.9**.
- **Total Tablas:** Pasa de 47 a 49 tablas.
- **Foco de la versión:** Ventas (M08). Cambio aditivo: las órdenes existentes conservan sus datos y los campos nuevos quedan vacíos (`NULL`), sin inventar valores pasados.

---

### 🛑 1. Tablas Deprecadas / Eliminadas
Ninguna en esta versión.

---

### ✨ 2. Tablas Nuevas Creadas
| Nueva Tabla | Clave Primaria (PK) | Claves Foráneas (FK) | Propósito Funcional |
| :--- | :--- | :--- | :--- |
| `linea_orden_descuento` | `id_linea_orden_descuento SERIAL` | `id_linea_orden -> linea_orden` (RESTRICT) | Cada descuento aplicado a una línea con su origen, porcentaje (NULL si es importe fijo), importe y orden de aplicación (RF-ORD-02-02, CA-ORD-02-02). |
| `consecutivo` | `id_consecutivo SERIAL` | Ninguna | Numeración corrida sin huecos por tipo de documento (`orden` → `PC-AAAA-NNNNN`; reutilizable por M07 para `SOL-AAAA-NNNNN`). Se incrementa en la misma transacción que crea el documento (RF-ORD-06-04). |

---

### 🔄 3. Tablas Modificadas y Nuevas Relaciones
- **`orden`:**
  - `codigo_solicitud VARCHAR(20) UNIQUE`: código SOL de M07; sin FK hasta que exista su tabla.
  - `modo_entrega enum_modo_entrega` y `costo_entrega NUMERIC(12,2) DEFAULT 0` (Tanda 12: costo 0 mientras no haya tarifa).
  - `base_sin_impuesto`, `importe_iva` y `tasa_iva`: congelados de la solicitud (D07, CA-ORD-02-05).
  - `direccion` pasa a admitir `NULL` para la recogida en almacén.
- **`linea_orden`:**
  - `color_solicitado` y `precio_inicial`.
  - `id_variante_ref INT`: sin FK a propósito (ADR-05).
  - `es_entonado BOOLEAN DEFAULT false` y `base_consumida` (RF-CUM-01-09).
- **Relación cambiada:** `linea_orden.id_orden -> orden.id_orden` pasa de `ON DELETE CASCADE` a `ON DELETE RESTRICT` (RF-ORD-02-04: los datos de una orden no se eliminan físicamente). Ningún módulo borra órdenes (verificado en `backend/src`).
- **Nueva relación:** `linea_orden_descuento.id_linea_orden -> linea_orden.id_linea_orden` (`ON DELETE RESTRICT`).

---

### 🔒 4. Restricciones (CONSTRAINTS) y Tipos ENUM Agregados
- **Nuevo ENUM:** `enum_modo_entrega ('domicilio', 'recogida')`.
- **Nuevos UNIQUE:** `uq_orden_codigo_solicitud` (una solicitud genera una sola orden) y `uq_lod_orden_aplicacion (id_linea_orden, orden_aplicacion)`.
- **Nuevos CHECK:**
  - `chk_orden_costo_entrega`, `chk_orden_iva` (importes ≥ 0 y tasa entre 0 y 100) y `chk_orden_direccion_domicilio` (a domicilio exige dirección).
  - `chk_lineaorden_precio_inicial`.
  - En `linea_orden_descuento`: `chk_lod_orden_aplicacion`, `chk_lod_origen`, `chk_lod_importe` y `chk_lod_porcentaje`.
  - En `consecutivo`: `chk_consecutivo_valor` y `chk_consecutivo_nombre`.
- **Migración para bases anteriores a v3.9:**
  - `ADD COLUMN IF NOT EXISTS` para cada columna.
  - Restricciones creadas en bloques `DO` que comprueban `pg_constraint`.
  - La FK de `linea_orden` se recrea solo si seguía en `CASCADE`.
  - Los `COMMENT ON COLUMN` van **después** de la migración, para que las columnas ya existan en bases antiguas.
- **Sin redondeo en la base de datos:** la orden guarda los importes congelados de la solicitud. La regla de redondeo (RF-PRE-05-04 frente a D07) sigue pendiente del analista principal y no se fija aquí.

---

### ⚡ 5. Nuevos Índices de Rendimiento
- Los índices únicos de `uq_orden_codigo_solicitud` y `uq_lod_orden_aplicacion` cubren la búsqueda por solicitud y por línea. `consecutivo.nombre` es `UNIQUE`. No se añaden índices adicionales.

---

### 💻 6. Impacto y Acciones Requeridas en Backend y Frontend
#### Backend (Kysely / Express):
- `src/core/db/types.ts`:
  - `EnumModoEntrega`;
  - columnas nuevas en `OrdenTable` y `LineaOrdenTable` (`direccion` pasa a `string | null`);
  - nuevas `LineaOrdenDescuentoTable` y `ConsecutivoTable`.
- Módulos afectados: solo **M08**, que muestra la copia histórica en el detalle y el modo de entrega en la bandeja. Ningún otro módulo lee `orden.direccion`.
- **Servidor desplegado:** el workflow `Deploy` aplica la migración y el seed con `psql -v ON_ERROR_STOP=1`. Las órdenes `ORD-2026-0001` y `0002` quedan con los campos nuevos vacíos, y se añade `ORD-2026-0003` completa.

#### Frontend (Vistas / UI):
- El detalle muestra:
  - el modo de entrega y su costo;
  - el IVA;
  - la solicitud de origen;
  - por línea, el color, el precio inicial, sus descuentos en orden y la marca de producto retirado (sin enlace).

#### Verificación (PostgreSQL 15.19 local, 2026-09-29):
| Prueba | Resultado |
| :--- | :--- |
| Simulación del deploy: base temporal con esquema y seed de `develop` (esquema 3.8), luego esquema y seed nuevos con `psql -v ON_ERROR_STOP=1` | ✅ Código 0; 47 → 49 tablas; órdenes antiguas intactas con campos nuevos en NULL; `ORD-2026-0003` completa; FK de líneas en RESTRICT; 6 restricciones nuevas |
| Segundo deploy seguido | ✅ Código 0, sin duplicados |
| Base nueva desde cero | ✅ 49 tablas; las tres órdenes con copia completa; 3 descuentos; 5 cambios de estado |
| Pruebas de integración de M08 en ambas bases | ✅ Lectura 36/36; escritura con ROLLBACK 17/17 (incluye 6 restricciones nuevas) |

---

## 📦 Versión 2.6 / v0.3.34.0 (2026-09-29)

### 🎯 Resumen Ejecutivo
Primera tanda del modelo de datos de **M08 Orden de venta** (épica #28, propuesta `docs/walkthroughs/M08/PROPUESTA_MODELO_DATOS_M08.md`, secciones 1, 2 y 8), aprobada por el líder técnico. El ciclo de estados de la orden se alinea con HU-ORD-03 y se añaden el historial de transiciones, las notas internas y el registro de contactos. La cabecera del script pasa a **esquema 3.8**.
- **Total Tablas:** Pasa de 44 a 47 tablas.
- **Foco de la versión:** Ventas (M08). Cambio aditivo salvo el renombrado de dos valores del ENUM de estados, que se migra sin pérdida de datos.

---

### 🛑 1. Tablas Deprecadas / Eliminadas
Ninguna en esta versión.

---

### ✨ 2. Tablas Nuevas Creadas
| Nueva Tabla | Clave Primaria (PK) | Claves Foráneas (FK) | Propósito Funcional |
| :--- | :--- | :--- | :--- |
| `historial_estado_orden` | `id_historial_estado_orden SERIAL` | `id_orden -> orden`, `id_usuario_autor -> usuario` (NULL = sistema) | Cada cambio de estado con estado anterior y nuevo, autor, motivo, referencia externa y fecha (HU-ORD-03, CA-ORD-03-03 / 03-04). Solo inserción. |
| `nota_orden` | `id_nota_orden SERIAL` | `id_orden -> orden`, `id_usuario_autor -> usuario` | Notas internas del personal, nunca visibles al cliente y sin borrado (HU-ORD-10). |
| `contacto_orden` | `id_contacto_orden SERIAL` | `id_orden -> orden`, `id_usuario_autor -> usuario` | Constancia de cada contacto con el cliente iniciado desde la orden: medio, detalle, autor y fecha (HU-ORD-09, CA-ORD-09-03). |

---

### 🔄 3. Tablas Modificadas y Nuevas Relaciones
- **`orden`**: `estado` pasa a nacer en `orden_confirmada` (antes `pendiente`, que contradecía RF-ORD-01-01: no existe orden sin pago). Se aplica también a bases existentes con `ALTER TABLE orden ALTER COLUMN estado SET DEFAULT 'orden_confirmada'`.
- **Nuevas Relaciones** (todas `ON UPDATE CASCADE ON DELETE RESTRICT`, porque la orden y su rastro se conservan por obligación legal):
  - `historial_estado_orden.id_orden -> orden.id_orden`
  - `historial_estado_orden.id_usuario_autor -> usuario.id_usuario`
  - `nota_orden.id_orden -> orden.id_orden` y `nota_orden.id_usuario_autor -> usuario.id_usuario`
  - `contacto_orden.id_orden -> orden.id_orden` y `contacto_orden.id_usuario_autor -> usuario.id_usuario`
- Ningún módulo borra usuarios (verificado en `backend/src`), por lo que `RESTRICT` sobre el autor no bloquea flujos existentes.

---

### 🔒 4. Restricciones (CONSTRAINTS) y Tipos ENUM Agregados
- **ENUM modificado:** `enum_estado_orden ('orden_confirmada', 'revision_disponibilidad', 'en_preparacion', 'preparada', 'despachado', 'entregado', 'cancelado', 'devuelto')`.
- **Migración para bases creadas antes de v3.8** (sección 0.1 del script, idempotente):
  - `RENAME VALUE 'pagado' TO 'orden_confirmada'` y `RENAME VALUE 'enviado' TO 'despachado'`, cada uno protegido con `IF EXISTS` / `NOT EXISTS` sobre `pg_enum`.
  - `ADD VALUE IF NOT EXISTS` para `revision_disponibilidad`, `preparada` y `devuelto`.
  - `pendiente` queda sin uso en esas bases: PostgreSQL no permite quitar un valor de un ENUM sin recrear el tipo. `EnumEstadoOrden` en `types.ts` no lo incluye para que ningún módulo lo escriba.
- **Nuevos CHECK:** `chk_historial_estado_cambio CHECK (estado_anterior IS DISTINCT FROM estado_nuevo)`, `chk_nota_orden_texto CHECK (length(trim(texto)) > 0)`, `chk_contacto_orden_medio CHECK (length(trim(medio)) > 0)`.
- Las reglas que dependen de valores del ENUM (motivo obligatorio al volver de `preparada` a `en_preparacion` y al cancelar) las exige el servicio de M08, no un `CHECK`: un `CHECK` con un valor añadido por `ADD VALUE` en la misma transacción falla en bases existentes.

---

### ⚡ 5. Nuevos Índices de Rendimiento
- `CREATE INDEX IF NOT EXISTS idx_historial_estado_orden_fecha ON historial_estado_orden(id_orden, fecha);`
- `CREATE INDEX IF NOT EXISTS idx_historial_estado_autor ON historial_estado_orden(id_usuario_autor);`
- `CREATE INDEX IF NOT EXISTS idx_nota_orden_orden_fecha ON nota_orden(id_orden, fecha);`
- `CREATE INDEX IF NOT EXISTS idx_nota_orden_autor ON nota_orden(id_usuario_autor);`
- `CREATE INDEX IF NOT EXISTS idx_contacto_orden_orden_fecha ON contacto_orden(id_orden, fecha);`
- `CREATE INDEX IF NOT EXISTS idx_contacto_orden_autor ON contacto_orden(id_usuario_autor);`

---

### 💻 6. Impacto y Acciones Requeridas en Backend y Frontend
#### Backend (Kysely / Express):
- `src/core/db/types.ts`: `EnumEstadoOrden` con los 8 estados; nuevas `HistorialEstadoOrdenTable`, `NotaOrdenTable` y `ContactoOrdenTable` en `Database`, con sus tipos `Selectable` / `Insertable` (sin `Updateable`: son de solo inserción).
- Módulos afectados: solo **M08** (lista de estados del DTO y clasificación de Mis pedidos). M20 solo cuenta órdenes por usuario y no depende del estado.
- **Servidor desplegado:** desde v0.3.33.1 el workflow `Deploy` ejecuta `schema_pintuclic.sql` y `seed_pintuclic.sql` con `psql -v ON_ERROR_STOP=1` sobre la base persistente. Al unir esta versión a `develop`, la sección 0.1 migra la base del servidor sin pérdida de datos (`ORD-2026-0001` pasa de `pagado` a `orden_confirmada`) y el seed añade el historial, la nota y el contacto de ejemplo. No hace falta ninguna acción manual.

#### Frontend (Vistas / UI):
- Las etiquetas de estado de la orden cambian (ver el informe de M08 para frontend). `enviado` pasa a `despachado`.

#### Verificación (PostgreSQL 15.19 local, 2026-09-29):
| Prueba | Resultado |
| :--- | :--- |
| `npm run db` sobre una base v3.7 con datos | ✅ 47 tablas; `ORD-2026-0001` pasa de `pagado` a `orden_confirmada`; `DEFAULT 'orden_confirmada'` |
| `npm run db` repetido sobre la misma base | ✅ Sin errores (idempotente) |
| Base recreada desde cero + `npm run db` | ✅ 47 tablas, ENUM con los 8 valores (sin `pendiente`) y 6 índices nuevos |
| `npm run db:seed` en ambas bases | ✅ 4 filas de historial, 1 nota y 1 contacto (191 registros en base nueva) |
| Pruebas de integración de M08 en ambas bases | ✅ 20/20 |
| Simulación del deploy: base temporal con esquema y seed de `develop` v0.3.33.1, luego esquema y seed nuevos con `psql -v ON_ERROR_STOP=1` | ✅ Código de salida 0; 44 → 47 tablas; `ORD-2026-0001` `pagado` → `orden_confirmada`; líneas, pagos y facturas intactos (2/2/2) |
| Segundo deploy seguido con `psql` | ✅ Código de salida 0; historial, notas y contactos siguen en 4/1/1 (sin duplicados) |

---

## 📦 Versión 2.5 / v3.29.0 (2026-09-22)

### 🎯 Resumen Ejecutivo
Actualización y sincronización integral del esquema de base de datos relacional de **Pintuclic** de acuerdo con el diagrama Entidad-Relación (Mermaid ER) actualizado:
- **Total Tablas:** Se consolidan las 36+ tablas relacionales con 0 desajustes en el DDL.
- **Foco de la versión:**
  - Sincronización del bloque fusionado de productos y variantes: `variante` $\rightarrow$ `base` (añadiendo `id_variante` FK y `prefijo`) $\rightarrow$ `color` (vinculado mediante `id_base` FK) $\rightarrow$ `tonos` (incorporando `nombre` y código `hexagesimal`).
  - Sincronización de ventas y carrito: inclusión de `ref_viva` en `linea_carrito`, vinculación de `cotizacion` a `id_usuario` e `id_rol`, y atributo `carrito_o_cotizacion` en `orden`.
- **Integración Backend:** Tipado estricto en Kysely (`backend/src/core/db/types.ts`), script DDL de esquema (`bd/sql/schema_pintuclic.sql`), datos semilla idempotentes (`bd/sql/seed_pintuclic.sql`) y documentación técnica oficial (`bd/docs/DOCUMENTACION_BASE_DATOS.md`).

---

### 🛑 1. Tablas Deprecadas / Eliminadas
Ninguna en esta versión. Todos los cambios de estructura ajustan relaciones y añaden columnas de integridad.

---

### ✨ 2. Estructuras Modificadas y Nuevas Columnas (Versión 2.5)

| Tabla Afectada | Tipo de Cambio | Nuevas Columnas / FKs | Propósito Funcional |
| :--- | :--- | :--- | :--- |
| **`base`** | Modificación | `id_variante INT FK`<br>`prefijo VARCHAR(50)` | Vinculación directa con la variante vendible (`id_variante`) y registro de prefijo identificador de base (e.g. BSA, BSB). |
| **`color`** | Modificación | `id_base INT FK` | Clasificación del catálogo de colores por su base correspondiente (`id_base`). |
| **`tonos`** | Modificación | `nombre VARCHAR(100)`<br>`hexagesimal VARCHAR(10)` | Identificación descriptiva del matiz de tono y su código hexadecimal cromático. |
| **`cotizacion`** | Modificación | `id_usuario INT FK`<br>`id_rol INT FK` | Trazabilidad del usuario y rol comercial que originan o solicitan la cotización. |
| **`linea_carrito`** | Modificación | `ref_viva INT` | Identificador de referencia viva en carrito de compras. |
| **`orden`** | Modificación | `carrito_o_cotizacion VARCHAR(50)` | Identificación explícita del canal o flujo de origen del pedido en checkout. |

---

## 📦 Versión 2.4 (2026-09-05)

### 🎯 Resumen Ejecutivo
Evolución aditiva oficial del modelo relacional requerida para soportar al 100% las Historias de Usuario del módulo **M04 (Cuentas, Autenticación y Perfil)**:
- **Total Tablas:** Pasa de 31 a **36 tablas**.
- **Foco de la versión:** Soporte integral a direcciones físicas de despacho (`HU-CUE-07`), solicitudes corporativas de empresa y actualización de NIT con trazabilidad administrativa (`HU-CUE-03 / HU-CUE-09`), federación de cuentas Google Identity OAuth2 (`HU-CUE-02`) y almacén seguro de códigos OTP con TTL y límite de intentos (`HU-CUE-01 / HU-CUE-05`).
- **Tipos ENUM Agregados (3):**
  - `enum_tipo_solicitud_empresa`: `'registro'`, `'ascenso_particular'`.
  - `enum_estado_solicitud_empresa`: `'pendiente'`, `'aprobada'`, `'rechazada'`.
  - `enum_tipo_codigo_otp`: `'registro'`, `'recuperacion_password'`, `'cambio_correo'`.
- **Integración Backend:** Tipado Kysely centralizado en `backend/src/core/db/types.ts` (`Database`, `DireccionClienteTable`, `SolicitudEmpresaTable`, `SolicitudActualizacionNitTable`, `UsuarioIdentidadExternaTable`, `CodigoVerificacionTable`), script de verificación `setup.ts` (`npm run db`) y datos semilla `seed_pintuclic.sql` (`npm run db:seed`).

---

### 🛑 1. Tablas Deprecadas / Eliminadas
Ninguna en esta versión. Todos los cambios son 100% aditivos y compatibles hacia atrás.

---

### ✨ 2. Tablas Nuevas Creadas (5 Tablas)

| Nueva Tabla (v2.4) | Clave Primaria (PK) | Claves Foráneas (FK) | Propósito Funcional |
| :--- | :--- | :--- | :--- |
| **`direccion_cliente`** | `id_direccion UUID` | `id_usuario` $\rightarrow$ `usuario` (CASCADE) | Almacenamiento de múltiples direcciones físicas de despacho por usuario (`HU-CUE-07`), soporte de coordenadas geográficas (`latitud`, `longitud`), barrio, teléfono y designación de dirección predeterminada. |
| **`solicitud_empresa`** | `id_solicitud UUID` | `id_usuario` $\rightarrow$ `usuario` (CASCADE)<br>`id_admin_revisor` $\rightarrow$ `usuario` (SET NULL) | Gestión del flujo de aprobación corporativa B2B (`HU-CUE-03 / HU-CUE-09`). Permite el registro y ascenso particular a empresa con captura de NIT, razón social, representante, correo empresarial, dictamen y motivo de rechazo. |
| **`solicitud_actualizacion_nit`** | `id_solicitud UUID` | `id_usuario` $\rightarrow$ `usuario` (CASCADE)<br>`id_admin_revisor` $\rightarrow$ `usuario` (SET NULL) | Trámite formal de modificación de NIT empresarial (`RF-CUE-09-07`), con registro de NIT anterior, nuevo NIT y URL del RUT adjunto verificado por un administrador. |
| **`usuario_identidad_externa`** | `id_identidad SERIAL` | `id_usuario` $\rightarrow$ `usuario` (CASCADE) | Federación de identidades con proveedores OAuth2 externos (`HU-CUE-02`), vinculando `proveedor` ('google') y `proveedor_usuario_id` con restricción de unicidad compuesta `UNIQUE(proveedor, proveedor_usuario_id)`. |
| **`codigo_verificacion`** | `id_codigo UUID` | Ninguna (FK desacoplada por correo/TTL) | Almacén transaccional seguro para códigos OTP efímeros (`HU-CUE-01 / HU-CUE-05`), con expiración por TTL, conteo y límite de reintentos, datos payload temporales y restricción `UNIQUE(correo, tipo)`. |

---

## 📦 Versión 2.3 (2026-09-05)

### 🎯 Resumen Ejecutivo
Evolución aditiva del modelo de datos impulsada por la incorporación del diagrama Entidad-Relación actualizado (`ER Pintuclic.drawio.xml` y `ER Pintuclic-Final 1.2.drawio.png`). Se incorporan 3 nuevas entidades orientadas al cumplimiento de normativas de protección de datos personales, Habeas Data y consentimiento informado, desbloqueando los requerimientos funcionales de la historia **HU-SEG-05** del módulo transversal **M20 (Seguridad, Auditoría y Protección de Datos)**.
- **Total Tablas:** Pasa de 28 a **31 tablas**.
- **Foco de la versión:** Privacidad, auditoría de consentimiento y ciclo de vida de peticiones de supresión de datos (derecho al olvido).
- **Preservación de Estado:** La tabla **`sesion`** (incorporada en la v2.2 para el control de sesiones en servidor) se mantiene 100% intacta e integrada en el ecosistema de seguridad.

---

### 🛑 1. Tablas Deprecadas / Eliminadas
Ninguna en esta versión. El cambio es estrictamente aditivo y no altera estructuras previas.

---

### ✨ 2. Tablas Nuevas Creadas (3 Tablas)

| Nueva Tabla (v2.3) | Clave Primaria (PK) | Claves Foráneas (FK) | Propósito Funcional |
| :--- | :--- | :--- | :--- |
| **`aviso_privacidad`** | `id_aviso_privacidad SERIAL` | Ninguna | Registro y control de versiones legales vigentes e históricas de los términos y políticas de tratamiento de datos personales (`version` UNIQUE, `es_vigente`). |
| **`consentimiento_usuario`** | `id_consentimiento SERIAL` | `id_usuario` $\rightarrow$ `usuario` (CASCADE)<br>`id_aviso_privacidad` $\rightarrow$ `aviso_privacidad` (RESTRICT) | Trazabilidad inmutable de la aceptación de la política de datos por parte de cada usuario con marca temporal (`fecha`). Restricción `UNIQUE(id_usuario, id_aviso_privacidad)`. |
| **`solicitud_supresion`** | `id_solicitud_supresion SERIAL` | `id_usuario` $\rightarrow$ `usuario` (CASCADE) | Gestión y seguimiento de peticiones formales de supresión de datos personales / derecho al olvido (Habeas Data) con fechas de radicación, dictamen y estado de resolución. |

**Columnas detalladas de las nuevas tablas:**

#### `aviso_privacidad`:
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id_aviso_privacidad` | `SERIAL PRIMARY KEY` | Identificador interno único del aviso. |
| `version` | `VARCHAR(50) NOT NULL UNIQUE` | Código o identificador semántico de versión (ej: `v1.0`, `2026-A`). |
| `descripcion` | `TEXT NOT NULL` | Cuerpo íntegro del aviso de privacidad o enlace al instrumento legal vinculante. |
| `es_vigente` | `BOOLEAN NOT NULL DEFAULT true` | Flag booleano que indica si la versión es la actualmente exigible a los usuarios. |

#### `consentimiento_usuario`:
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id_consentimiento` | `SERIAL PRIMARY KEY` | Identificador único del registro de consentimiento. |
| `id_usuario` | `INT NOT NULL` | Titular del dato personal que otorga la autorización. |
| `id_aviso_privacidad` | `INT NOT NULL` | Versión específica del aviso de privacidad aceptada. |
| `fecha` | `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP` | Momento exacto de aceptación para efectos probatorios legales. |

#### `solicitud_supresion`:
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id_solicitud_supresion` | `SERIAL PRIMARY KEY` | Identificador único del radicado de supresión. |
| `id_usuario` | `INT NOT NULL` | Usuario solicitante de la supresión o bloqueo de sus datos personales. |
| `fecha_solicitud` | `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP` | Fecha y hora de radicación de la petición. |
| `fecha_resolucion` | `TIMESTAMPTZ` | Fecha y hora en que la administración resuelve la petición (nullable mientras esté en trámite). |
| `estado` | `enum_estado_solicitud_supresion` | Estado del trámite: `'pendiente'`, `'en_proceso'`, `'aprobada'`, `'rechazada'`. Por defecto `'pendiente'`. |

---

### 🔄 3. Tablas Modificadas y Nuevas Relaciones
- **Ninguna tabla existente fue alterada ni recortada.**
- **`sesion`:** Se preserva intacta con su clave primaria `UUID` y ciclo de vida de tokens M20.
- **Nuevas Relaciones:**
  1. `usuario` (1) $\rightarrow$ `consentimiento_usuario` (N): `ON UPDATE CASCADE ON DELETE CASCADE`.
  2. `aviso_privacidad` (1) $\rightarrow$ `consentimiento_usuario` (N): `ON UPDATE CASCADE ON DELETE RESTRICT` (impide borrar avisos que ya cuentan con consentimientos auditados).
  3. `usuario` (1) $\rightarrow$ `solicitud_supresion` (N): `ON UPDATE CASCADE ON DELETE CASCADE`.

---

### 🔒 4. Restricciones (`CONSTRAINTS`) y Tipos `ENUM` Agregados

#### Nuevo Tipo ENUM Nativo:
```sql
enum_estado_solicitud_supresion -- ('pendiente', 'en_proceso', 'aprobada', 'rechazada')
```

#### Nuevas Reglas de Validación (`CHECK` y `UNIQUE`):
- `uq_usuario_aviso`: `UNIQUE(id_usuario, id_aviso_privacidad)` para garantizar que un usuario registre a lo sumo una aceptación por versión de aviso.
- `aviso_privacidad(version)` UNIQUE: impide colisión de códigos de versión.

---

### ⚡ 5. Nuevos Índices de Rendimiento

```sql
CREATE INDEX IF NOT EXISTS idx_consentimiento_usuario ON consentimiento_usuario(id_usuario);
CREATE INDEX IF NOT EXISTS idx_consentimiento_aviso ON consentimiento_usuario(id_aviso_privacidad);
CREATE INDEX IF NOT EXISTS idx_supresion_usuario ON solicitud_supresion(id_usuario);
CREATE INDEX IF NOT EXISTS idx_supresion_estado ON solicitud_supresion(estado);
```

- **`idx_consentimiento_usuario`** y **`idx_consentimiento_aviso`**: optimizan la validación en tiempo de login y registro para constatar si el usuario ha aceptado el aviso vigente.
- **`idx_supresion_usuario`** y **`idx_supresion_estado`**: aceleran la consulta de radicados abiertos por estado para la mesa de ayuda y auditoría legal.

---

### 💻 6. Impacto y Acciones Requeridas en Backend y Frontend

#### Backend (TypeScript / Kysely / Express):
- **`backend/src/core/db/types.ts`**: incorporadas las interfaces `AvisoPrivacidadTable`, `ConsentimientoUsuarioTable`, `SolicitudSupresionTable`, el tipo `EnumEstadoSolicitudSupresion`, registros en la interfaz raíz `Database` y helpers exportados (`AvisoPrivacidad`, `ConsentimientoUsuario`, `SolicitudSupresion`).
- **Módulo M20 (HU-SEG-05 Desbloqueada):** Habilita la creación de repositorios y controladores para registrar consentimientos en el registro/login y tramitar solicitudes de supresión de datos con trazabilidad de auditoría.
- **Módulo M04 (Cuentas):** En el flujo de registro (`HU-CUE-01`), vincular la aceptación de términos guardando una fila en `consentimiento_usuario` referenciando el `id_aviso_privacidad` con `es_vigente = true`.

#### Frontend (UI / Vistas / Componentes):
- Modal/Checkbox obligatorio de aceptación de política de privacidad y tratamiento de datos en el checkout y registro de usuarios.
- Vista de configuración de privacidad en el perfil de usuario para consultar las versiones aceptadas y radicar solicitudes de supresión de datos personales (Habeas Data).

---

---

## 📦 Versión 2.2 (2026-09-05)

### 🎯 Resumen Ejecutivo
Incorporación del estado de sesión de usuario, exigido por la historia **HU-SEG-02** del módulo transversal **M20 (Seguridad, Auditoría y Protección de Datos)**. Hasta esta versión las sesiones eran completamente sin estado (JWT autocontenido), lo que hacía **imposible retirar un token ya emitido**: cerrar sesión, invalidar los accesos tras un cambio de contraseña o expulsar a una cuenta desactivada no tenían soporte en el modelo de datos.
- **Total Tablas:** Pasa de 27 a **28 tablas**.
- **Foco de la versión:** Seguridad y control de acceso.

---

### 🛑 1. Tablas Deprecadas / Eliminadas
Ninguna en esta versión. El cambio es puramente aditivo y no altera ninguna estructura previa.

---

### ✨ 2. Tablas Nuevas Creadas (1 Tabla)

| Nueva Tabla (v2.2) | Clave Primaria (PK) | Claves Foráneas (FK) | Propósito Funcional |
| :--- | :--- | :--- | :--- |
| **`sesion`** | `id_sesion UUID` | `id_usuario` $ightarrow$ `usuario` (CASCADE) | Sesión activa de un usuario en un dispositivo. Permite cerrar una sesión concreta, invalidar todas las de un usuario y aplicar la caducidad por inactividad verificada en servidor. Varias filas por usuario dan soporte a sesiones simultáneas (RF-SEG-02-05). |

> **⚠️ Excepción justificada a la convención de PK.** La guía establece `SERIAL PRIMARY KEY` para toda tabla. `sesion` usa **`UUID` con `gen_random_uuid()`** de forma deliberada: el identificador viaja dentro del JWT como el claim `sid` y llega al navegador, de modo que un entero secuencial permitiría a un tercero enumerar las sesiones del sistema. Es la única tabla del esquema con esta excepción, y responde a un requisito de seguridad (RNF-SEG-02-01), no a una preferencia de estilo.

**Columnas de `sesion`:**

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id_sesion` | `UUID` | PK no enumerable, generada con `gen_random_uuid()`. |
| `id_usuario` | `INT` | Titular de la sesión. |
| `tipo_sesion` | `enum_tipo_sesion` | Determina la ventana de inactividad aplicable (RF-SEG-02-02). |
| `fecha_inicio` | `TIMESTAMPTZ` | Momento de apertura. Por defecto `now()`. |
| `fecha_ultimo_acceso` | `TIMESTAMPTZ` | Se renueva en cada operación del usuario (RF-SEG-02-03). |
| `fecha_expiracion` | `TIMESTAMPTZ` | Último acceso más la ventana de inactividad del tipo de sesión. |
| `estado` | `enum_estado_sesion` | Ciclo de vida. Por defecto `activa`. |
| `motivo_cierre` | `enum_motivo_cierre_sesion` | Causa del cierre; nulo mientras sigue activa. |

---

### 🔄 3. Tablas Modificadas y Nuevas Relaciones
- **Ninguna tabla existente fue modificada.** `usuario` conserva íntegras todas sus columnas de la v2.1, incluida `tipo`.
- **Nueva Relación:** `sesion.id_usuario` $ightarrow$ `usuario.id_usuario` con política `ON UPDATE CASCADE ON DELETE CASCADE`. Al eliminar una cuenta, sus sesiones desaparecen con ella; no tiene sentido conservar la sesión de un usuario inexistente.

---

### 🔒 4. Restricciones (`CONSTRAINTS`) y Tipos `ENUM` Agregados

#### Nuevos Tipos ENUM Nativos (3):
```sql
enum_estado_sesion        -- ('activa', 'cerrada', 'expirada', 'revocada')
enum_tipo_sesion          -- ('admin', 'cliente')
enum_motivo_cierre_sesion -- ('cierre_manual', 'inactividad', 'cambio_contrasena',
                          --  'cuenta_desactivada', 'permisos_retirados')
```

Los cuatro estados **no son intercambiables** y su distinción es funcional, no decorativa:
- `cerrada` — el usuario pulsó cerrar sesión.
- `expirada` — venció la ventana de inactividad.
- `revocada` — un tercero la invalidó: cambio de contraseña, cuenta desactivada o permisos retirados.

El `motivo_cierre` conserva la causa exacta para diagnóstico posterior. Al navegador le llega la misma respuesta en los cuatro casos: revelar si una sesión fue revocada o si simplemente venció también es información.

#### Nuevas Reglas de Validación:
- Ninguna restricción `CHECK` ni `UNIQUE` adicional. Un mismo usuario **debe** poder tener varias filas activas: es lo que permite sesiones simultáneas en distintos dispositivos.

---

### ⚡ 5. Nuevos Índices de Rendimiento

```sql
CREATE INDEX IF NOT EXISTS idx_sesion_usuario_estado ON sesion(id_usuario, estado);
CREATE INDEX IF NOT EXISTS idx_sesion_estado_expiracion ON sesion(estado, fecha_expiracion);
```

- **`idx_sesion_usuario_estado`** cubre la FK `id_usuario` (obligatorio por la Regla de Oro 5) y resuelve las dos consultas más frecuentes: listar las sesiones vigentes de un usuario e invalidarlas en bloque.
- **`idx_sesion_estado_expiracion`** prepara el barrido periódico de sesiones caducadas. Hoy las filas se marcan como `expirada` al intentar usarlas; cuando el volumen lo justifique, una tarea de fondo podrá recorrerlas con este índice.

---

### 💻 6. Impacto y Acciones Requeridas en Backend y Frontend

#### Backend (TypeScript / Kysely / Express):
- **`src/core/db/types.ts`**: añadida la interfaz `SesionTable`, los tipos `EnumEstadoSesion`, `EnumTipoSesion` y `EnumMotivoCierreSesion`, el registro `sesion` en la interfaz raíz `Database` y los helpers `Sesion` / `NewSesion` / `SesionUpdate`. Compilación verificada con `npx tsc --noEmit` sin errores.
- **`src/core/utils/jwt.ts`**: `TokenPayload` incorpora el claim opcional `sid`.
- **Módulo afectado: `M20`** — consume la tabla desde `m20-seguridad/repositories/sesion.repository.ts`. Un token **sin `sid` es rechazado** por el guarda de sesión.
- **Módulo pendiente: `M04`** — su flujo de login debe consumir `serviciosSeguridad.sesion.abrirSesion()` en lugar de firmar JWT por su cuenta, o los tokens que emita no serán aceptados.
- **Módulo pendiente: `M17`** — al revocar permisos debe invocar `invalidarSesionesDeUsuario(id, 'permisos_retirados')`. El motivo ya existe en el ENUM; no se dispara automáticamente, porque una petición denegada no equivale a una revocación.

#### Frontend (UI / Vistas / Componentes):
- El código de error `SESSION_EXPIRED` debe conducir al usuario a autenticarse de nuevo, conservando el destino que pretendía alcanzar (RF-SEG-02-08).
- `GET /api/seguridad/sesiones` habilita una futura pantalla de **"tus dispositivos conectados"**. No expone IP ni `user-agent`: son datos personales y su tratamiento entra en HU-SEG-05, todavía bloqueada.

---

## 📦 Versión 2.1 (2026-09-04)

### 🎯 Resumen Ejecutivo
Evolución mayor del modelo de ventas y carrito impulsada por la incorporación del diagrama Entidad-Relación actualizado (`ER Pintuclic.drawio.xml` y `ER Pintuclic-Final 1.1.drawio.png`).
- **Total Tablas:** Pasa de 25 a **27 tablas**.
- **Foco de la versión:** Implementación del patrón de e-commerce inmutable para pedidos (`orden` y `linea_orden`), incorporación de cotizaciones comerciales B2B/B2C (`cotizacion`), carrito vivo con soporte para visitantes anónimos y vinculación directa a variantes (`linea_carrito`), y clasificación de cuentas de usuario (`enum_tipo_usuario`).

---

### 🛑 1. Tablas Deprecadas / Eliminadas (2 Tablas)

| Tabla Eliminada (v2.0) | Motivo de Deprecación | Reemplazo en v2.1 |
| :--- | :--- | :--- |
| `pedido` | Modelo transaccional previo que carecía de trazabilidad de origen (carrito vs cotización), código visible y snapshot legal desacoplado. | Reemplazado por **`orden`**. |
| `detalle_carrito` | Apuntaba directamente a producto congelando precios en etapa previa a compra; no soportaba variantes en vivo. | Reemplazado por **`linea_carrito`** (apunta a `variante`). |

---

### ✨ 2. Tablas Nuevas Creadas (4 Tablas)

| Nueva Tabla (v2.1) | Clave Primaria (PK) | Claves Foráneas (FK) | Propósito Funcional |
| :--- | :--- | :--- | :--- |
| **`linea_carrito`** | `id_linea_carrito SERIAL` | `id_carrito` $\rightarrow$ `carrito`<br>`id_variante` $\rightarrow$ `variante` | Líneas vivas de productos en carrito. La consulta de total calcula en tiempo real con `variante.precio_vigente`. Restricción `UNIQUE(id_carrito, id_variante)`. |
| **`cotizacion`** | `id_cotizacion SERIAL` | Ninguna | Registro y control de cotizaciones comerciales B2B/B2C previas a la formalización de compra. |
| **`orden`** | `id_orden SERIAL` | `id_usuario` $\rightarrow$ `usuario`<br>`id_cotizacion` $\rightarrow$ `cotizacion` (SET NULL) | Cabecera formal e inmutable de compra con `codigo_visible` amigable (ej: ORD-2026-0001), origen (`carrito` o `cotizacion`), pasarela (`transaccion_pago_id`) y montos finales. |
| **`linea_orden`** | `id_linea_orden SERIAL` | `id_orden` $\rightarrow$ `orden` (CASCADE) | Snapshot histórico inmutable: congela `nombre_producto`, `variante_copia`, `precio_aplicado` y `cantidad` exactos al momento del pago. |

---

### 🔄 3. Tablas Modificadas y Nuevas Relaciones

1. **`usuario`**:
   - Se añadió la columna `tipo enum_tipo_usuario NOT NULL DEFAULT 'normal'` para segregar cuentas de persona natural (`'normal'`) y empresas (`'empresa'`).
   - Se agregó índice `idx_usuario_tipo`.
2. **`variante`**:
   - Se renombró la columna `precio` a **`precio_vigente`** para clarificar que es el valor dinámico de catálogo.
   - Se añadió la columna `estado enum_estado_producto NOT NULL DEFAULT 'activo'`.
   - Se agregó índice `idx_variante_estado`.
3. **`carrito`**:
   - Se añadió la columna `token_visitante VARCHAR(255)` indexada para permitir carritos a usuarios no autenticados (visitantes).
   - Se modificó `id_usuario` a nullable (`INT`), permitiendo carritos de invitados antes del login.
   - Se añadió la columna `fecha_ultima_actividad TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP` para control de expiración.
   - Se eliminó el campo calculado `total` y `estado` ya que el carrito vivo se evalúa bajo demanda mediante `linea_carrito`.
4. **`pagos`**:
   - Se modificó la clave foránea: reemplaza `id_pedido` por **`id_orden INT NOT NULL REFERENCES orden(id_orden) ON UPDATE CASCADE ON DELETE CASCADE`**.
   - Se actualizó el índice a `idx_pagos_orden`.
5. **`factura`**:
   - Se modificó la clave foránea: reemplaza `id_pedido` por **`id_orden INT NOT NULL REFERENCES orden(id_orden) ON UPDATE CASCADE ON DELETE RESTRICT`**.
   - Se actualizó el índice a `idx_factura_orden`.

---

### 🔒 4. Restricciones (`CONSTRAINTS`) y Tipos `ENUM` Agregados

#### Nuevos Tipos ENUM Nativos:
```sql
enum_tipo_usuario      -- ('normal', 'empresa')
enum_origen_orden      -- ('carrito', 'cotizacion')
enum_estado_orden      -- ('pendiente', 'pagado', 'en_preparacion', 'enviado', 'entregado', 'cancelado')
enum_estado_cotizacion -- ('borrador', 'enviada', 'aprobada', 'rechazada', 'vencida')
```

#### Nuevas Reglas de Validación (`CHECK` y `UNIQUE`):
- `uq_carrito_variante`: `UNIQUE(id_carrito, id_variante)`.
- `chk_lineacarrito_cantidad`: `cantidad > 0`.
- `chk_orden_subtotal`: `sub_total >= 0`.
- `chk_orden_descuento`: `descuento >= 0`.
- `chk_orden_total`: `total >= 0`.
- `chk_lineaorden_precio`: `precio_aplicado >= 0`.
- `chk_lineaorden_cantidad`: `cantidad > 0`.
- Restricción de unicidad: `orden(codigo_visible)` UNIQUE y `orden(transaccion_pago_id)` UNIQUE.

---

### ⚡ 5. Nuevos Índices de Rendimiento
- `CREATE INDEX IF NOT EXISTS idx_usuario_tipo ON usuario(tipo);`
- `CREATE INDEX IF NOT EXISTS idx_variante_estado ON variante(estado);`
- `CREATE INDEX IF NOT EXISTS idx_carrito_token ON carrito(token_visitante);`
- `CREATE INDEX IF NOT EXISTS idx_lineacarrito_carrito ON linea_carrito(id_carrito);`
- `CREATE INDEX IF NOT EXISTS idx_lineacarrito_variante ON linea_carrito(id_variante);`
- `CREATE INDEX IF NOT EXISTS idx_orden_codigo ON orden(codigo_visible);`
- `CREATE INDEX IF NOT EXISTS idx_orden_usuario ON orden(id_usuario);`
- `CREATE INDEX IF NOT EXISTS idx_orden_cotizacion ON orden(id_cotizacion);`
- `CREATE INDEX IF NOT EXISTS idx_orden_estado ON orden(estado);`
- `CREATE INDEX IF NOT EXISTS idx_orden_fecha ON orden(fecha);`
- `CREATE INDEX IF NOT EXISTS idx_lineaorden_orden ON linea_orden(id_orden);`
- `CREATE INDEX IF NOT EXISTS idx_pagos_orden ON pagos(id_orden);`
- `CREATE INDEX IF NOT EXISTS idx_factura_orden ON factura(id_orden);`

---

### 💻 6. Impacto y Acciones Requeridas en Backend y Frontend

#### Backend (TypeScript / Kysely / Express):
1. **Actualizar `src/core/db/types.ts`**:
   - Retirar `PedidoTable` y `DetalleCarritoTable`.
   - Incorporar `OrdenTable`, `LineaOrdenTable`, `LineaCarritoTable` y `CotizacionTable`.
   - Modificar `UsuarioTable` (con `tipo`), `VarianteTable` (con `precio_vigente` y `estado`), `CarritoTable` (con `token_visitante` y `fecha_ultima_actividad`), `PagosTable` y `FacturaTable` (con `id_orden`).
   - Declarar tipos literales para `EnumTipoUsuario`, `EnumOrigenOrden`, `EnumEstadoOrden` y `EnumEstadoCotizacion`.
2. **Módulos Afectados**:
   - `M04 Cuentas`: Manejo del campo `tipo` de usuario ('normal' vs 'empresa').
   - `M07 Carrito`: Soporte para tokens de invitados y consulta de líneas vivas.
   - `M08 Órdenes`: Creación inmutable con snapshot de nombres y precios.
   - `M09 Pagos y Facturas`: Vinculación por `id_orden`.

#### Frontend (UI / Vistas / Componentes):
1. **Carrito de Visitantes**:
   - Persistir token anónimo en `localStorage` o cookies para carritos sin autenticación previa.
2. **Detalle de Órdenes**:
   - Mostrar el `codigo_visible` amigable para el usuario y listar ítems basados en `linea_orden`.

---

## 📦 Versión 2.0 (2026-09-03)

### 🎯 Resumen Ejecutivo
Evolución mayor (**MAJOR**) del esquema de base de datos impulsada por la especificación de la página **`FINAL`** del diagrama Entidad-Relación (`ER Pintuco.drawio.xml`).
- **Total Tablas:** Pasa de 21 a **25 tablas**.
- **Foco de la versión:** Desacoplamiento total del catálogo de productos hacia una jerarquía formal de 4 niveles, incorporación de variantes comerciales por color y tono, soporte para combos/kits promocionales, y blindaje con 8 tipos enumerados (`ENUM`).

---

### 🛑 1. Tablas Deprecadas / Eliminadas (6 Tablas)
En la versión 1.0 el catálogo utilizaba una estructura simplificada de fichas técnicas basada en "necesidad", "presentación" y "descripción". Estas tablas fueron completamente retiradas y sustituidas por el modelo relacional de variantes:

| Tabla Eliminada (v1.0) | Motivo de Deprecación | Reemplazo en v2.0 |
| :--- | :--- | :--- |
| `nesesidad` | Modelo rígido y con error tipográfico en origen. | Se absorbe mediante la jerarquía de categorías y características. |
| `presentacion` | Los envases/tamaños no estaban ligados a combinaciones vendibles. | Reemplazado por **`variante`** y **`caracteristica`**. |
| `descripcion` | Textos planos independientes del ciclo de vida del producto. | Reemplazado por **`caracteristica`**. |
| `producto_presentacion` | Tabla intermedia obsoleta al eliminarse `presentacion`. | Reemplazado por **`variante`**. |
| `producto_descripcion` | Tabla intermedia obsoleta al eliminarse `descripcion`. | Reemplazado por **`caracteristica`**. |
| `roll` / `sub_roll_empresa` | Nombres con error ortográfico en inglés/español (*roll*). | Renombradas a **`rol`** y **`sub_rol_empresa`**. |

---

### ✨ 2. Tablas Nuevas Creadas (10 Tablas)

Se incorporaron 10 tablas que conforman el nuevo motor de catálogo, precios dinámicos y empaquetado:

| Nueva Tabla (v2.0) | Clave Primaria | Claves Foráneas (FK) | Propósito Funcional |
| :--- | :--- | :--- | :--- |
| **`categoria`** | `id_categoria SERIAL` | Ninguna | Nivel 1 de la jerarquía de catálogo (e.g. Vinilos, Esmaltes, Maderas). |
| **`subcategorias`** | `id_subcategoria SERIAL` | `id_categoria` $\rightarrow$ `categoria` | Nivel 2 de subdivisión temática. |
| **`sub_subcategorias`** | `id_sub_subcategoria SERIAL` | `id_subcategoria` $\rightarrow$ `subcategorias` | Nivel 3 de refinamiento comercial. |
| **`linea`** | `id_linea SERIAL` | `id_sub_subcategoria` $\rightarrow$ `sub_subcategorias` | Nivel 4 de marca o línea de producto (e.g. Koraza, Viniltex). |
| **`color`** | `id_color SERIAL` | Ninguna | Maestro de familias de color (`nombre` UNIQUE). |
| **`tonos`** | `id_tono SERIAL` | `id_color` $\rightarrow$ `color` | Desglose de matices o códigos de color con cargo de `precio` adicional. |
| **`variante`** | `id_variante SERIAL` | `id_producto`, `id_color` | Unidad vendible (SKU) con precio específico y color opcional. |
| **`caracteristica`** | `id_caracteristica SERIAL` | `id_variante` $\rightarrow$ `variante` | Propiedades técnicas y fichas de aplicación de cada variante. |
| **`combo`** | `id_combo SERIAL` | `id_producto` $\rightarrow$ `producto` | Cabecera de promociones y paquetes especiales. |
| **`variante_combo`** | `id_variante_combo SERIAL` | `id_variante`, `id_combo` | Detalle N:M con `cantidad` de cada variante en el combo. |

---

### 🔄 3. Tablas Modificadas y Cambios de Relaciones

1. **`producto`**:
   - **Antes (v1.0):** Tenía relaciones intermedias con `producto_presentacion` y `producto_descripcion`.
   - **Ahora (v2.0):** Solo se vincula con su línea (`id_linea INT NOT NULL REFERENCES linea`) y expone hijos en cascada hacia `variante`, `combo`, `detalle_carrito` y `reservaciones`.
2. **`usuario_rol`**:
   - **Nueva Restricción:** Se aplicó `UNIQUE (id_usuario)`, impidiendo a nivel de base de datos que un usuario posea múltiples roles de forma simultánea.
3. **`usuario`**:
   - Se mantiene `id_rol` directo como referencia por defecto indexada, complementando a la tabla asociativa `usuario_rol`.
4. **`rol` y `sub_rol_empresa`**:
   - Cambio de nomenclatura estandarizada: se reemplazó la palabra `roll` por `rol` en nombres de tablas, columnas (`id_rol`) e índices.

---

### 🔒 4. Restricciones (`CONSTRAINTS`) y Tipos `ENUM` Agregados

#### Tipos ENUM Nativos Implementados:
```sql
enum_estado_general     -- ('activo', 'inactivo')
enum_estado_usuario     -- ('activo', 'inactivo', 'bloqueado', 'pendiente')
enum_estado_producto    -- ('activo', 'inactivo', 'agotado', 'descontinuado')
enum_estado_reservacion -- ('pendiente', 'confirmada', 'cancelada', 'finalizada')
enum_estado_carrito     -- ('activo', 'abandonado', 'procesado', 'cancelado')
enum_estado_pedido      -- ('pendiente', 'pagado', 'en_preparacion', 'enviado', 'entregado', 'cancelado')
enum_estado_pago        -- ('pendiente', 'completado', 'fallido', 'reembolsado')
enum_estado_factura     -- ('emitida', 'pagada', 'anulada')
```

#### Reglas de Validación (`CHECK` y `UNIQUE`):
- `chk_descuento_porcentaje`: `porcentaje_descuento BETWEEN 0 AND 100`.
- `chk_descuento_tope`: `tope >= 0`.
- `chk_tonos_precio`: `precio >= 0`.
- `chk_variante_precio`: `precio >= 0`.
- `chk_varcombo_cantidad`: `cantidad > 0`.
- `chk_detcarrito_cantidad`: `cantidad > 0`.
- `chk_pagos_monto`: `monto > 0`.
- `uq_variante_combo`: `UNIQUE(id_variante, id_combo)`.
- `uq_rol_permiso`: `UNIQUE(id_rol, id_permiso)`.
- `uq_usr_rol_usuario`: `UNIQUE(id_usuario)`.

---

### ⚡ 5. Nuevos Índices de Rendimiento
Para acelerar consultas y optimizar los `JOIN` en la nueva jerarquía:
- `idx_subcat_categoria ON subcategorias(id_categoria)`
- `idx_subsubcat_subcat ON sub_subcategorias(id_subcategoria)`
- `idx_linea_subsubcat ON linea(id_sub_subcategoria)`
- `idx_producto_linea ON producto(id_linea)`
- `idx_combo_producto ON combo(id_producto)`
- `idx_tonos_color ON tonos(id_color)`
- `idx_variante_producto ON variante(id_producto)`
- `idx_variante_color ON variante(id_color)`
- `idx_caract_variante ON caracteristica(id_variante)`
- `idx_varcombo_variante ON variante_combo(id_variante)`
- `idx_varcombo_combo ON variante_combo(id_combo)`

---

### 💻 6. Impacto y Acciones Requeridas en Backend y Frontend

#### Backend (TypeScript / Kysely / Express):
1. **Actualizar `src/core/db/types.ts`**:
   - Reemplazar las interfaces de `Presentacion`, `Descripcion`, etc., por las nuevas entidades: `CategoriaTable`, `SubcategoriaTable`, `SubSubcategoriaTable`, `LineaTable`, `ColorTable`, `TonoTable`, `VarianteTable`, `CaracteristicaTable`, `ComboTable`, `VarianteComboTable`.
   - Definir los tipos literales correspondientes a los 8 `ENUMs` de PostgreSQL.
2. **Controlador de Productos (Módulo M02)**:
   - Modificar las consultas `selectFrom('producto')` para hacer join con `linea`, `sub_subcategorias`, `subcategorias` y `categoria`.
   - Incluir carga de variantes (`variante`) con su respectivo `color` y `tonos`.

#### Frontend (UI / Vistas / Componentes):
1. **Navegación Multinivel**:
   - Actualizar el menú de catálogo y el explorador de categorías para soportar la jerarquía de 4 niveles.
2. **Página de Detalle de Producto (PDP)**:
   - Implementar el selector de colores y selector de variantes, calculando el precio en función de la variante seleccionada y el tono escogido.

---

## 📦 Versión 1.0 (2026-09-02)

### 🎯 Resumen Ejecutivo
- Versión fundacional del esquema de base de datos extraída del diagrama preliminar `Pre-Final`.
- **Total Tablas:** 21 tablas iniciales.
- Modelo básico de usuarios, roles, permisos, carrito, pedidos, facturación, pagos, reservaciones y catálogo plano estructurado en `linea`, `producto`, `presentacion`, `descripcion` y `nesesidad`.
