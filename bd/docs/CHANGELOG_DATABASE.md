# 📜 Registro de Cambios y Versiones de Base de Datos (CHANGELOG) - PINTUCLIC

Este documento constituye el registro histórico y oficial del versionamiento del modelo de datos relacional de **Pintuclic** (PostgreSQL + Prisma).

> **Motor:** PostgreSQL 13+ (compatible con PostgreSQL 18)  
> **Script DDL Oficial:** [`../sql/schema_pintuclic.sql`](../sql/schema_pintuclic.sql)  
> **Script Seed Oficial:** [`../sql/seed_pintuclic.sql`](../sql/seed_pintuclic.sql)  
> **Documentación General:** [`./DOCUMENTACION_BASE_DATOS.md`](./DOCUMENTACION_BASE_DATOS.md)  
> **Walkthrough Detallado de Migraciones:** [`./WALKTHROUGH_DATABASE.md`](./WALKTHROUGH_DATABASE.md)  

---

## [v3.12] - 2026-10-26
### Esquema 4.13 (73 Tablas, sin cambios de DDL) - M17: parámetro `comercial.umbral_sugerir_empresa`
- **Seed:** parámetro 12 `comercial.umbral_sugerir_empresa` (área `comercial`, número, 500 000 por defecto, mínimo 0, sin máximo): total del carrito desde el que M06 invita a un cliente registrado a solicitar la cuenta empresa (R12 del contrato de M06). Es editable desde la configuración general; el valor inicial está por confirmar.
- Se agregó la clave a `CLAVES_PARAMETROS` (contrato de M17 y sus dos espejos). Idempotente: no pisa un valor ya modificado.

---

## [v3.11] - 2026-10-26
### Esquema 4.13 (73 Tablas) - M06: eventos de descuento, cupones y tipo de cliente empresa
- **Alcance General:** cinco tablas nuevas, cuatro ENUMs y dos columnas pedidas por el contrato de M06 (`contracts/m06-precios.contract.ts`, cambio C1). Cambio aditivo.
  - **`evento_descuento`**: evento con calendario (R4): `fecha_inicio`/`fecha_fin` (DATE, hora de Colombia), `dias_semana` (`SMALLINT[]`, ISO 1 a 7, vacío = todos) y horas `"HH:mm"` como texto (igual que `horario_atencion`, con `ck_evento_formato_horas` y `ck_evento_horas_coherentes`: las dos horas o ninguna, fin mayor que inicio).
  - **`evento_regla`**: una regla por objetivo (`tipo_objetivo` + `id_objetivo`; ambos NULL = todo el catálogo) con su propio `porcentaje` (mayor que 0 y hasta 100). El `id_objetivo` no lleva FK porque apunta a seis tablas (D10). `UNIQUE (id_regla, id_evento)` permite la FK compuesta de las exclusiones.
  - **`evento_exclusion`**: excepciones de una regla (`id_regla`) o de todo el evento (`id_regla` NULL): marca, línea, categoría, subcategoría, producto, variante, **color** o **familia de color**. La FK compuesta `(id_regla, id_evento)` impide colgar una exclusión de la regla de otro evento. Dos índices únicos parciales evitan repetidas.
  - **`cupon`** y **`cupon_uso`**: código en mayúsculas único (`ck_cupon_codigo`), porcentaje o importe fijo, mínimo de compra, límites de uso total y por persona, audiencia y vigencia. `cupon_uso.referencia` (la orden) es única: registrar dos veces lo mismo no gasta dos usos; `liberado_en` marca los usos de órdenes canceladas. Un cupón con usos no se puede borrar (`ON DELETE RESTRICT`).
  - **`descuento.monto_minimo_compra`** (NUMERIC, no negativo, 0 = sin mínimo): total del carrito desde el que aplica el descuento de empresa.
  - **`cuenta_empresa.id_sub_rol_empresa`** (FK opcional, `ON DELETE SET NULL`): tipo de cliente empresa de la cuenta. `rol.id_sub_rol_empresa` deja de usarse para el descuento. Las cuentas anteriores quedan sin tipo, o sea sin descuento, hasta que un administrador se lo asigne.
  - **`sub_rol_empresa`**: índice único sobre `lower(btrim(nombre))` (los nombres de los tipos no se repiten).
  - **ENUMs nuevos:** `enum_tipo_valor_descuento`, `enum_audiencia_descuento`, `enum_tipo_objetivo_evento` y `enum_tipo_exclusion_evento`.
  - **Seed:** los dos tipos pasan a llamarse "Proveedor" (15 %) y "Constructora" (10 %), sin tope ni mínimo; la cuenta de prueba 4 queda como Proveedor; ejemplos **inactivos** "Miércoles de color" (Viniltex 15 %, Koraza 10 %, miércoles, sin la familia Blancos) y el cupón `BIENVENIDA10`. Ninguno cambia un precio hasta activarlo. En una base ya sembrada los dos tipos conservan el nombre y los topes anteriores: se editan desde el panel de M06 cuando exista.
  - **Bases existentes en 4.12:** `psql "$DATABASE_URL" -f bd/sql/schema_pintuclic.sql` y `npm run db:seed` (idempotentes).
  - **Verificado en PostgreSQL 16:** esquema y seed aplicados sobre una base nueva y repetidos sin errores; 32 pruebas de insertar/actualizar/borrar confirman que los CHECK, las FK, los únicos y la cascada rechazan o aceptan lo que deben.

---

## [v3.10] - 2026-10-25
### Esquema 4.12 (68 Tablas) - M15: hilo de conversación, estados y calificación de solicitudes
- **Alcance General:** Una tabla nueva, un ENUM nuevo y evolución de `solicitud_contacto` pedidos por el contrato de M15 (`contracts/m15-atencion.contract.ts`, R12 y R13).
  - **`enum_estado_solicitud_contacto`**: pasa a `('en_revision', 'atendida', 'rechazada')` con migración idempotente de `'pendiente'` a `'en_revision'`.
  - **`solicitud_contacto`**: agrega `calificacion` (`SMALLINT` opcional, 1 a 5 estrellas con `ck_solicitud_contacto_calificacion`) y `fecha_calificacion` (`TIMESTAMPTZ` opcional).
  - **`mensaje_solicitud_contacto`**: mensajes del hilo de conversación ("ping-pong" libre) entre el cliente titular y el equipo (`rol_autor` en `enum_rol_autor_mensaje_solicitud`: `'cliente' | 'equipo'`), con `ON DELETE CASCADE` e índice `(id_solicitud, fecha_creacion ASC)`.

---

## [v3.9] - 2026-10-25
### Esquema 4.11 (67 Tablas) - M15 Atención al cliente
- **Alcance General:** Tres tablas nuevas pedidas por el contrato de M15 (`contracts/m15-atencion.contract.ts`). Cambio puramente aditivo. **Las preguntas frecuentes NO están aquí:** son de M16 (`faq_entrada`, esquema 4.9) y M15 las consume por el puerto que M16 expone.
  - **`solicitud_contacto`**: solicitudes del formulario de contacto, que exige sesión (HU-ATC-02). Guarda `tipo` (`consulta`, `cotizacion`, `reclamo`), `descripcion` y `estado`; **no duplica los datos de contacto**, que se leen de la cuenta al mostrarla (RF-ATC-02-04). `ON DELETE CASCADE` sobre `usuario`.
  - **`horario_atencion`**: una fila por día de la semana (`dia_semana` UNIQUE, HU-ATC-04). Las horas son texto `"HH:mm"` en 24h —no `TIME`— para que coincidan con el contrato sin convertir husos; `ck_horario_formato_horas` valida el formato y `ck_horario_franja_coherente` exige que un día cerrado no lleve horas y que uno abierto tenga `hora_fin > hora_inicio`.
  - **`configuracion_atencion_whatsapp`**: fila única (`ck_whatsapp_fila_unica`) con el `destino` del botón de contacto directo (HU-ATC-03). Admite una URL completa —hoy el canal de difusión, que no acepta texto prellenado— o un número de WhatsApp Business cuando exista; de ahí que el campo no se llame `numero`.
  - **ENUMs nuevos:** `enum_tipo_solicitud_contacto`, `enum_estado_solicitud_contacto` y `enum_dia_semana`.
  - **Índices:** `id_usuario` y `(estado, fecha_creacion DESC)` para la bandeja de solicitudes.
  - **Permisos nuevos (24-26):** `atencion.ver`, `atencion.editar` y `atencion.atender_clientes`, con área funcional `atencion` y dependencia `editar → ver` en M17. El último queda reservado al escalamiento de HU-ATC-05, bloqueado por M03.
  - **Seed:** la semana completa de horario (lunes a viernes 08:00-18:00, sábado 08:00-13:00, domingo cerrado) y el canal de WhatsApp vigente.
  - **Bases existentes en 4.10:** el DDL crea los tipos y las tablas con `IF NOT EXISTS`. Uso: `psql "$DATABASE_URL" -f bd/sql/schema_pintuclic.sql` y `npm run db:seed`.
  - **Verificado en PostgreSQL 18:** esquema y seed ejecutados sobre una base nueva y repetidos sin errores (idempotentes); las pruebas negativas de los `CHECK` y la FK rechazan los datos inválidos.

---

## [v3.8] - 2026-10-25
### Esquema 4.10 (64 Tablas) - M13: movimientos de existencia de combos por orden
- **Alcance General:** Valores de ENUM y una columna pedidos por el puerto `ExistenciaComboPort` (`contracts/m01-catalogo-entrega3.contract.ts`, D8; `contracts/m13-inventario.contract.ts`). Cambio puramente aditivo; no agrega tablas.
  - **`enum_origen_ajuste_inventario`** += `orden`; **`enum_motivo_ajuste_inventario`** += `venta`, `devolucion`: la existencia de un combo baja al crearse la orden y vuelve al cancelarse.
  - **`ajuste_inventario.referencia`** (`VARCHAR(100)` opcional): la orden que movió la existencia. Índice único parcial `uq_ajuste_referencia_variante_motivo (referencia, id_variante, motivo) WHERE referencia IS NOT NULL`: repetir la misma operación no mueve dos veces (idempotencia).
  - **Bases existentes en 4.9:** el DDL agrega los valores con `ADD VALUE IF NOT EXISTS`, la columna y el índice con `IF NOT EXISTS`; no requiere seed. Uso: `psql "$DATABASE_URL" -f bd/sql/schema_pintuclic.sql`.

---

## [v3.7] - 2026-10-25
### Esquema 4.9 (64 Tablas) - M01 entrega 3: combos, complementarios por subcategoría e imágenes con miniaturas
- **Alcance General:** Columnas y valores de ENUM pedidos por el contrato de la entrega 3 de M01 (`contracts/m01-catalogo-entrega3.contract.ts`). Cambio puramente aditivo; no agrega tablas.
  - **`producto.es_combo`** y **`producto.excluido_de_descuentos`** (`BOOLEAN NOT NULL DEFAULT false`): un combo es un producto con una sola variante (K1, K2); la marca de exclusión de descuentos la respeta M06. Las tablas `combo` y `variante_combo` quedan sin uso (D2).
  - **`subcategoria.id_categoria_complementaria`** (`INT` opcional, FK a `categoria` con `ON DELETE SET NULL`): categoría de la que se sugieren complementarios por defecto (D6).
  - **`imagen.miniatura`** y **`imagen.mediana`** (`BYTEA` opcionales, WebP de 320 y 960 px): nulas en imágenes anteriores, se completan al pedirlas (D7). Nuevo `chk_imagen_una_asociacion`: una imagen se asocia a una variante o a un color, no a ambos.
  - **Pendiente (D8):** los valores de ENUM de M13 para los movimientos por orden (`orden`, `venta`, `devolucion`) llegan con el PR de código de M13, junto con su contrato, para no romper el código vigente.
  - **Bases existentes en 4.8:** el DDL agrega todo con `IF NOT EXISTS`; no requiere seed. Uso: `psql "$DATABASE_URL" -f bd/sql/schema_pintuclic.sql`.

---

## [v3.6] - 2026-10-25
### Esquema 4.8 (64 Tablas) - M16 Contenido institucional y Centro de Ayuda / FAQ
- **Alcance General:** Dos tablas nuevas y un ENUM pedidos por el contrato de M16 (`contracts/m16-contenido.contract.ts`). Cambio puramente aditivo.
  - **`pagina_institucional`**: páginas estáticas e institucionales administrables (`slug` único en `kebab-case`, `titulo`, `resumen` opcional, `cuerpo_markdown`, `estado` en `enum_estado_contenido`, `id_autor` con `ON DELETE SET NULL`, `fecha_creacion` y `fecha_actualizacion`). Separada de `aviso_privacidad` (M20 Habeas Data).
  - **`faq_entrada`**: preguntas frecuentes del Centro de Ayuda público y puerto de lectura hacia M15 (`pregunta`, `respuesta_markdown`, `orden` >= 0, `estado` en `enum_estado_general`, `id_autor` con `ON DELETE SET NULL`, `fecha_creacion` y `fecha_actualizacion`).
  - **ENUM nuevo:** `enum_estado_contenido` (`borrador`, `publicado`, `archivado`).
  - **Índices:** `idx_pagina_institucional_estado`, `idx_pagina_institucional_autor`, `idx_faq_entrada_estado_orden` (`(estado, orden, id_faq)`) e `idx_faq_entrada_autor`.
  - **Seed:** 4 páginas institucionales publicadas (`sobre-nosotros`, `terminos-y-condiciones`, `politica-de-privacidad`, `politicas-de-envio`) y 5 entradas FAQ activas iniciales.

---

## [v3.5] - 2026-10-25
### Esquema 4.7 (62 Tablas) - M13 Inventario referencial: historial de ajustes
- **Alcance General:** Tabla nueva pedida por el contrato de M13 (`contracts/m13-inventario.contract.ts`). Cambio puramente aditivo.
  - **`ajuste_inventario`**: una fila por cada cambio real de `variante.existencia_referencial` (anterior y nueva ≥ 0 y distintas), con `motivo`, `origen`, `nota` (hasta 500), `id_carga` (UUID del cliente para agrupar una carga masiva, sin tabla propia), `id_usuario` (NULL si el usuario se elimina) y `fecha`. Nunca se edita ni se borra; la variante no se puede eliminar mientras tenga historial (`ON DELETE RESTRICT`).
  - **ENUMs nuevos:** `enum_motivo_ajuste_inventario` (`conteo_fisico`, `ingreso_mercancia`, `salida`, `correccion`, `otro`, `carga_masiva`) y `enum_origen_ajuste_inventario` (`manual`, `carga_masiva`, `samit`; este último queda reservado a la integración futura).
  - **Índices:** `(id_variante, fecha DESC)` para el historial de una variante, `id_carga` para una carga y `id_usuario`.
  - **Esquema 4.6 (M18):** las 3 tablas de notificaciones (`envio_notificacion`, `rebote_notificacion`, `plantilla_notificacion`) ya estaban en el DDL pero no en estos documentos; el total de 62 las incluye.
  - **Bases existentes en 4.6:** el DDL crea los tipos y la tabla con `IF NOT EXISTS`; no requiere seed. Uso: `psql "$DATABASE_URL" -f bd/sql/schema_pintuclic.sql`.

---

## [v3.4] - 2026-10-24
### Esquema 4.5 (58 Tablas) - M01 Catálogo: manos del rendimiento e imagen de la medida
- **Alcance General:** Dos cambios aditivos pedidos por el contrato de M01.
  - **`ficha_recubrimiento.manos SMALLINT`**, opcional, entre 1 y 10: manos de aplicación con las que se logra el rendimiento (ej. 35 m² por galón a 2 manos).
  - **`medida.imagen BYTEA` y `medida.imagen_mime_type`**, opcionales y siempre juntas (`chk_medida_imagen`): imagen de la medida (ej. la silueta del envase) que se muestra junto a la galería del producto.
  - **Bases existentes en 4.4:** el DDL agrega las columnas con `ADD COLUMN IF NOT EXISTS`; no requiere seed. Uso: `psql "$DATABASE_URL" -f bd/sql/schema_pintuclic.sql`.

---

## [v3.3] - 2026-10-24
### Esquema 4.4 (58 Tablas) - M01 Catálogo: equivalencia en galones
- **Alcance General:** Cambio aditivo pedido por el contrato de M01 (`contracts/m01-catalogo.contract.ts`, decisión D6).
  - **`tipo_medida.equivalencia_galones NUMERIC(12,9)`**, opcional, con `CHECK (> 0)`: cuántos galones equivale una unidad del tipo (galón = 1, litro = 0,264172052, mililitro = 0,000264172; pulgada, metro y unidad quedan en `NULL`). Permite derivar el rendimiento por medida: rendimiento por galón × equivalencia × valor (`RF-CAT-10-03`).
  - **Bases existentes en 4.3:** el DDL agrega la columna con `ADD COLUMN IF NOT EXISTS` y el seed completa galón, litro y mililitro **sin pisar** un valor ya fijado (`WHERE equivalencia_galones IS NULL`). Uso: `psql "$DATABASE_URL" -f bd/sql/schema_pintuclic.sql` y `npm run db:seed`.
  - Probado en PostgreSQL 16: esquema desde cero idéntico al de una base 4.3 actualizada; DDL y seed repetibles.

---

## [v3.2] - 2026-10-24
### Esquema 4.3 (58 Tablas) - M01 Catálogo: rediseño con las reglas del Tech Lead
- **Alcance General:** Rediseño del catálogo antes de construir M01 (ninguna tabla del catálogo tenía código encima). Reglas en [`M01_REGLAS_ADICIONALES.md`](../../docs/02_MODULOS_FUNCIONALES/M01_REGLAS_ADICIONALES.md).
  - **Nuevas (10):** `superficie`, `acabado`, `familia_color`, `tipo_medida`, `medida`, `ficha_recubrimiento`, `producto_superficie`, `producto_acabado`, `producto_color`, `producto_caracteristica`.
  - **Eliminadas (5):** `sub_subcategorias` (solo dos niveles), `tonos`, `presentacion` (reemplazada por `medida` + `tipo_medida`), `caracteristica` (pasa a `producto_caracteristica`), `producto_subcategoria` (el producto tiene una sola subcategoría).
  - **`subcategorias` → `subcategoria`.** `linea` pierde `id_sub_subcategoria`.
  - **`base`** global (sin `id_marca`): Tint, Deep, Pastel, Accent.
  - **`color`:** `id_base` opcional, `id_acabado` obligatorio, `id_familia_color`, `hexadecimal` obligatorio; CIELAB pasa a opcional. Unicidad `(id_marca, nombre, id_acabado)`.
  - **`producto`:** `id_subcategoria` obligatoria, `uso_interior`/`uso_exterior`, FK compuesta `(id_linea, id_marca)`; resina y rendimiento pasan a `ficha_recubrimiento`; desaparece `clase_color` (y `enum_clase_color`): los colores que ofrece se derivan de sus bases, acabados y colores de fábrica.
  - **`variante` = producto + medida** con `sku` UNIQUE y precio; sin base ni color.
  - **`linea_carrito.id_color`** con `UNIQUE NULLS NOT DISTINCT (id_carrito, id_variante, id_color)`; **`linea_orden.sku_vendido`**.
  - **Migración de bases existentes (ej. el VPS):** el DDL trae un bloque que se activa solo si existe `tonos` (catálogo viejo): borra el catálogo anterior, las líneas de carrito y las reservaciones del seed, crea el nuevo y reconecta `linea_carrito` y `reservaciones`. Si el catálogo viejo tiene más filas que el seed anterior, se detiene sin tocar nada. Uso: `psql "$DATABASE_URL" -f bd/sql/schema_pintuclic.sql` y luego `npm run db:seed`. Probado en PostgreSQL 16: el esquema migrado es idéntico al creado desde cero y el DDL se puede repetir.

---

## [v3.1] - 2026-10-23
### Esquema 4.2 sin cambios (53 Tablas) - Seed: vigencia del enlace de activación de empleados
- **Alcance General:** Sin cambios de DDL ni del modelo Prisma. Acompaña a la versión de aplicación v0.7.0 ([`docs/CHANGELOG.md`](../../docs/CHANGELOG.md)):
  - **Nuevo parámetro (seed):** fila `id_parametro = 11`, `auth.vigencia_enlace_activacion_horas` (área `autenticacion`, tipo `numero`, 72 por defecto, rango 1–168). Como previó la v2.9, un parámetro nuevo es una fila nueva, sin DDL. `ON CONFLICT (clave) DO NOTHING`: re-ejecutar el seed no pisa el valor que fije el administrador.
  - **Nuevos usos de `codigo_verificacion`, sin cambio de esquema:** el enlace de activación de empleados usa `tipo = 'recuperacion_password'`; la recuperación de contraseña ya no guarda el valor plano del enlace en `datos_temporales`; los tokens de sustitución del correo del admin (M17) pasan de memoria a esta tabla, con `tipo = 'cambio_correo'` y la huella SHA-256 en `codigo_hash`.
  - **`usuario.cambio_contrasena_pendiente`:** los empleados que crea M17 nacen con `true` y pasa a `false` cuando definen su contraseña con el enlace.
  - **NIT con guion (decisión del PO, 2026-10-23):** la regla vive en el contrato Zod, no en la base. Todos los NIT del seed ya la cumplen.
  - **Cierra el pendiente de la v2.9:** M17 ya lee y escribe el catálogo con Prisma (`PrismaConfiguracionRepository`, caché de 30 s).
  - **Bases existentes:** `docker-entrypoint-initdb.d` solo siembra un volumen vacío, así que en una base ya creada la fila se agrega a mano. En el VPS se hizo el 2026-10-23.
  - 🔗 **Detalle:** [WALKTHROUGH_DATABASE.md#📦-versión-31-2026-10-23](./WALKTHROUGH_DATABASE.md#-versión-31-2026-10-23)

---

## [v3.0] - 2026-10-21
### Esquema 4.2 (53 Tablas) - M04 Cuentas: Unicidad, hash OTP, anti-fuerza bruta y cambio de clave
- **Alcance General:** Aprobación en bloque del Director Humano sobre los cambios C-2 y C-4 a C-9 de `RFC-M04-001` (`.sdlc/docs/modules/M04/`) para sincronizar DDL y modelo Prisma de M04:
  - **Nueva tabla `control_intento_acceso` (C-6, Tabla 53):** Contador y bloqueo temporal por correo normalizado (`RN-CUE-07`), permitiendo indistinguibilidad y anti-enumeración de cuentas (`RN-CUE-06`). Índice en `bloqueado_hasta`.
  - **Unicidad de solicitudes pendientes (C-2, `RN-CUE-14`, `RN-CUE-19`):** Índices parciales `uq_solicitud_empresa_nit_pendiente`, `uq_solicitud_empresa_usuario_pendiente`, `uq_solicitud_nit_usuario_pendiente`, `uq_solicitud_nit_nuevo_pendiente`.
  - **Direcciones: predeterminada única y sin duplicados (C-4, `RN-CUE-21`):** Índice único parcial `uq_direccion_predeterminada_unica` e índice único multi-columna `uq_direccion_no_duplicada` sobre `(id_usuario, lower(direccion), lower(barrio), lower(coalesce(apartamento_casa, '')))`.
  - **Códigos OTP derivados (C-5, `RN-CUE-03`):** Columna `codigo` renombrada a `codigo_hash VARCHAR(255)` en `codigo_verificacion`. Seed actualizado con hash BCrypt costo 12.
  - **Correo insensible a mayúsculas (C-7, `RN-CUE-01`):** Índice único funcional `uq_usuario_correo_lower` sobre `usuario (lower(correo))`.
  - **Marca de cambio forzoso de clave (C-8, `CA-ADM-01-03`, `RN-CUE-04`):** Columna `cambio_contrasena_pendiente BOOLEAN NOT NULL DEFAULT false` en `usuario`.
  - **Permiso `empresas.validar` (C-9, `DP-09`):** Permiso 21 añadido a `permisos` y asignado al rol 1 (administrador).
  - 🔗 **Detalle y DDL:** [WALKTHROUGH_DATABASE.md#📦-versión-30-2026-10-21](./WALKTHROUGH_DATABASE.md#-versión-30-2026-10-21)

---

## [v2.9] - 2026-10-21
### Esquema 4.1 (52 Tablas) - M17 Configuración general: tabla de parámetros
- **Alcance General:** Aprobado por el Director Humano mediante `RFC-M17-001` (`.sdlc/docs/modules/M17/`), que cumple el punto 4 de `ADR-007`:
  - **Nueva tabla `parametro_sistema`:** `clave` única con prefijo de área, `area` y `tipo_dato` (nuevos `enum_area_parametro` y `enum_tipo_dato_parametro`), `valor` y `valor_por_defecto` en `JSONB`, rango numérico opcional, fecha y último autor.
  - **La base de datos impone el tipo y el rango (`RF-ADM-05-05/06`):** el valor nunca es nulo, del tipo equivocado ni está fuera de rango. Un parámetro nuevo es una fila nueva, sin DDL.
  - **Seed:** las 10 filas del catálogo actual de M17, leídas del código y no transcritas. `ON CONFLICT DO NOTHING`: re-ejecutar el seed no pisa valores que un administrador ya modificó.
  - **Disparador de `fecha_actualizacion`:** `fn_parametro_sistema_fecha()` y `trg_parametro_sistema_fecha`, los primeros del esquema. Solo mueven la fecha cuando cambia `valor`.
  - **Rango de contraseña alineado:** `auth.complejidad_minima_contrasena` pasa de 8–32 a **12–32**, el piso de M20 (`RN-SEG-01`). El seed lo corrige también en bases ya sembradas.
  - **Limpieza:** se elimina la definición duplicada de `presentacion` (sin cambio de esquema, verificado con `pg_dump`).
  - **Migración idempotente:** probada sobre una instalación limpia y sobre bases en v4.0 y v3.9.
  - **⚠️ Pendiente:** el código de M17 **todavía lee el catálogo de memoria**. Falta el modelo Prisma y el repositorio que sustituye a `AlmacenConfiguracionMemoria` (RFC-M17-001 §5).
  - 🔗 **Detalle y DDL:** [WALKTHROUGH_DATABASE.md#📦-versión-29-2026-10-21](./WALKTHROUGH_DATABASE.md#-versión-29-2026-10-21)

---

## [v2.8] - 2026-10-21
### Esquema 4.0 (51 Tablas) - M04 Cuentas: NIT vigente de la cuenta empresa y RUT adjunto almacenado
- **Alcance General:** Dos decisiones del Director Humano sobre el RFC-M04-001 (`.sdlc/docs/modules/M04/`), tomadas durante el Gate 2 de **M04**:
  - **NIT vigente (`RN-CUE-13`, `RN-CUE-19`, C-1):** nueva tabla `cuenta_empresa`, 1:1 con `usuario`, con el NIT vigente (`UNIQUE`) y los datos de la empresa aprobada. Hasta ahora el NIT solo existía en `solicitud_empresa`, de modo que renovarlo obligaba a mutar una solicitud histórica.
  - **RUT adjunto (`RN-CUE-20`, C-3, opción A):** nueva tabla `documento_soporte` (`BYTEA`; PDF, JPG o PNG de hasta 5 MB; huella SHA-256; tamaño real verificado por `CHECK`). `solicitud_actualizacion_nit` añade `id_documento` (FK `RESTRICT`) y su columna `documento_adjunto_url` queda **deprecada** (pierde `NOT NULL`).
  - **Restricción transitoria:** `ck_solicitud_nit_adjunto` exige que toda solicitud aporte el RUT por `id_documento` o por la URL antigua, hasta que esta última se retire.
  - **Migración idempotente:** probada sobre una instalación limpia y sobre una base creada con el esquema 3.9. Las solicitudes anteriores conservan su URL.
  - **Seed:** `cuenta_empresa` se rellena desde las solicitudes aprobadas y el RUT de ejemplo pasa a `documento_soporte`.
  - **No incluido:** el resto de cambios del RFC (C-2 y C-4 a C-9) siguen pendientes de decisión.
  - 🔗 **Detalle y DDL:** [WALKTHROUGH_DATABASE.md#📦-versión-28-2026-10-21](./WALKTHROUGH_DATABASE.md#-versión-28-2026-10-21)

---

## [v2.7 / v0.3.37.0] - 2026-09-29
### Esquema 3.9 (49 Tablas) - M08 Orden de Venta: copia histórica, descuentos por línea y consecutivo
- **Alcance General:** Segunda tanda del modelo de datos de **M08** (épica #28), con visto bueno del líder técnico y definida por el análisis:
  - **Copia histórica de la orden (`HU-ORD-02`, `RF-ORD-05-05`):** `orden` añade:
    - `codigo_solicitud` (SOL de M07, UNIQUE);
    - `modo_entrega` (nuevo `enum_modo_entrega`) y `costo_entrega` (0 por ahora);
    - `base_sin_impuesto`, `importe_iva` y `tasa_iva`.

    La dirección pasa a ser opcional en la recogida.
  - **Copia histórica de las líneas (`RF-ORD-02-01`, `RF-ORD-04-03`, `RF-CUM-01-09`):** `linea_orden` añade `color_solicitado`, `precio_inicial`, `id_variante_ref` (sin FK), `es_entonado` y `base_consumida`, y deja de borrarse en cascada (`ON DELETE RESTRICT`, `RF-ORD-02-04`).
  - **Descuentos por línea (`RF-ORD-02-02`):** tabla `linea_orden_descuento` con origen, porcentaje, importe y orden de aplicación.
  - **Consecutivo sin huecos (`RF-ORD-06-04`):** tabla `consecutivo` para `PC-AAAA-NNNNN`, reutilizable por M07 para `SOL-AAAA-NNNNN`.
  - **Migración idempotente:** las órdenes existentes conservan sus datos con los campos nuevos en `NULL`. El seed añade `ORD-2026-0003` con la copia completa.
  - 🔗 **Detalle y DDL:** [WALKTHROUGH_DATABASE.md#📦-versión-27--v03370-2026-09-29](./WALKTHROUGH_DATABASE.md#-versión-27--v03370-2026-09-29)

---

## [v2.6 / v0.3.34.0] - 2026-09-29
### Esquema 3.8 (47 Tablas) - M08 Orden de Venta: estados, historial, notas internas y contactos
- **Alcance General:** Primera tanda del modelo de datos de **M08** (épica #28), aprobada por el líder técnico:
  - **Ciclo de estados (`HU-ORD-03`):** `enum_estado_orden` pasa a `orden_confirmada`, `revision_disponibilidad`, `en_preparacion`, `preparada`, `despachado`, `entregado`, `cancelado` y `devuelto`. Migración idempotente para bases existentes (`pagado` → `orden_confirmada`, `enviado` → `despachado`, sin pérdida de datos). `orden.estado` nace en `orden_confirmada`.
  - **Historial de transiciones (`CA-ORD-03-03 / 03-04`):** tabla `historial_estado_orden` con estado anterior y nuevo, autor (NULL = sistema), motivo, referencia externa y fecha.
  - **Notas internas (`HU-ORD-10`):** tabla `nota_orden`, nunca visible al cliente.
  - **Registro de contactos (`CA-ORD-09-03`):** tabla `contacto_orden` con medio, detalle, autor y fecha.
  - **Infraestructura Kysely y seed:** tipos en `types.ts`; historial, nota y contacto de ejemplo en `seed_pintuclic.sql`.
  - 🔗 **Detalle y DDL:** [WALKTHROUGH_DATABASE.md#📦-versión-26--v03340-2026-09-29](./WALKTHROUGH_DATABASE.md#-versión-26--v03340-2026-09-29)

---

## [v2.4] - 2026-09-05
### Esquema Relacional Oficial v2.4 (36 Tablas) - M04 Cuentas, Autenticación y Perfil
- **Alcance General:** Evolución aditiva y oficial del modelo relacional de base de datos para soportar los requerimientos de datos del módulo **M04 (Cuentas, Autenticación y Perfil)**:
  - **Múltiples Direcciones (`HU-CUE-07`):** Creación de la tabla `direccion_cliente` (UUID) con soporte de coordenadas, barrio, predeterminada y clave foránea `id_usuario`.
  - **Trámites Corporativos B2B y Dictamen (`HU-CUE-03 / HU-CUE-09`):** Creación de la tabla `solicitud_empresa` (UUID) con tipos ENUM `enum_tipo_solicitud_empresa` y `enum_estado_solicitud_empresa`, capturando NIT, razón social, representante, correo empresarial, dictamen y motivo de rechazo.
  - **Actualización Formal de NIT (`RF-CUE-09-07`):** Creación de la tabla `solicitud_actualizacion_nit` (UUID) con soporte de URL de RUT adjunto y trazabilidad por administrador revisor.
  - **Federación Google Identity OAuth2 (`HU-CUE-02`):** Creación de la tabla `usuario_identidad_externa` con unicidad compuesta `UNIQUE(proveedor, proveedor_usuario_id)`.
  - **Almacén OTP Efímero con TTL (`HU-CUE-01 / HU-CUE-05`):** Creación de la tabla `codigo_verificacion` (UUID) con ENUM `enum_tipo_codigo_otp`, límite de intentos y fecha de expiración.
  - **Infraestructura Kysely (`types.ts` & `setup.ts`):** Centralización de contratos tipados Kysely (`Database`, `DireccionClienteTable`, `SolicitudEmpresaTable`, `SolicitudActualizacionNitTable`, `UsuarioIdentidadExternaTable`, `CodigoVerificacionTable`), script de verificación con `npm run db` y mocks en `seed_pintuclic.sql` gestionados con `npm run db:seed`.
  - 🔗 **Detalle y DDL:** [WALKTHROUGH_DATABASE.md#📦-versión-24-2026-09-05](./WALKTHROUGH_DATABASE.md#-versión-24-2026-09-05)

---

## [v2.3] - 2026-09-05
### Protección de Datos Personales, Consentimiento y Habeas Data (31 Tablas) - M20 Seguridad
- **Alcance General:** Incorporación de 3 entidades para normativas de privacidad y derechos ARCO (Habeas Data) para la historia **HU-SEG-05**:
  - `aviso_privacidad`: Versiones legales y vigencia de términos y políticas.
  - `consentimiento_usuario`: Registro auditable e inmutable de aceptación de términos por usuario.
  - `solicitud_supresion`: Radicación, ciclo de vida y dictamen de peticiones de derecho al olvido.
  - 🔗 **Detalle y DDL:** [WALKTHROUGH_DATABASE.md#📦-versión-23-2026-09-05](./WALKTHROUGH_DATABASE.md#-versión-23-2026-09-05)

---

## [v2.2] - 2026-09-05
### Control de Sesiones de Usuario e Invalidación en Bloque (28 Tablas) - M20 Seguridad
- **Alcance General:** Incorporación de la tabla `sesion` (UUID) para soportar el ciclo de vida de sesiones de usuario en servidor (`HU-SEG-02`):
  - Control de inactividad, último acceso, revocación selectiva y cierre forzado de sesiones al actualizar contraseñas.
  - 🔗 **Detalle y DDL:** [WALKTHROUGH_DATABASE.md#📦-versión-22-2026-09-05](./WALKTHROUGH_DATABASE.md#-versión-22-2026-09-05)

---

## [v2.1] - 2026-09-04
### E-Commerce Inmutable, Cotizaciones y Carrito con Variantes (27 Tablas)
- **Alcance General:** Reestructuración transaccional de órdenes de compra, carritos y cotizaciones:
  - Patrón de órdenes inmutables (`orden` y `linea_orden`).
  - Carrito vivo desacoplado (`carrito` y `linea_carrito`) con soporte para visitantes anónimos (`token_visitante`).
  - Cotizaciones comerciales B2B/B2C (`cotizacion`).
  - 🔗 **Detalle y DDL:** [WALKTHROUGH_DATABASE.md#📦-versión-21-2026-09-04](./WALKTHROUGH_DATABASE.md#-versión-21-2026-09-04)

---

## [v2.0] - 2026-09-03
### Catálogo de 4 Niveles, Variantes, Colores, Tonos y Combos (25 Tablas)
- **Alcance General:** Rediseño estructural de productos para ferretería y pinturas:
  - Jerarquía: `categoria` $\rightarrow$ `subcategorias` $\rightarrow$ `sub_subcategorias` $\rightarrow$ `linea` $\rightarrow$ `producto`.
  - Matriz de `color`, `tonos`, `variante` y `caracteristica`.
  - Sistema de paquetes `combo` y `variante_combo`.
  - 🔗 **Detalle y DDL:** [WALKTHROUGH_DATABASE.md#📦-versión-20-2026-09-03](./WALKTHROUGH_DATABASE.md#-versión-20-2026-09-03)

---

## [v1.0] - 2026-09-02
### Esquema Relacional Fundacional (21 Tablas)
- **Alcance General:** Estructura base de tablas para usuarios, roles, permisos y catálogo inicial.
  - 🔗 **Detalle y DDL:** [WALKTHROUGH_DATABASE.md#📦-versión-10-2026-09-02](./WALKTHROUGH_DATABASE.md#-versión-10-2026-09-02)
