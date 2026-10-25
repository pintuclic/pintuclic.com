# 📘 Arquitectura y Documentación del Esquema de Base de Datos - PINTUCLIC

> **Versión Actual:** 3.6 — esquema 4.8 (M15 Atención al cliente: preguntas frecuentes, formulario de contacto, horario y canal de WhatsApp).  
> **Motor de Base de Datos:** PostgreSQL 13+ (`gen_random_uuid()` nativo; compatible con PostgreSQL 18)  
> **Total de Tablas:** 66  
> **Script DDL Oficial:** [`../sql/schema_pintuclic.sql`](../sql/schema_pintuclic.sql)  
> **Script de Mocks / Seed Oficial:** [`../sql/seed_pintuclic.sql`](../sql/seed_pintuclic.sql)  
> **Guía Oficial de Mocks y Datos de Prueba:** [`./GUIA_MOCKS_Y_DATOS_PRUEBA.md`](./GUIA_MOCKS_Y_DATOS_PRUEBA.md)  
> **Walkthrough Detallado de Migraciones:** [`./WALKTHROUGH_DATABASE.md`](./WALKTHROUGH_DATABASE.md)

---

## 📜 Historial Resumido de Versiones (Changelog)

| Versión | Fecha | Tablas Nuevas | Tablas Deprecadas | Cambios Destacados | Detalle Completo |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **v3.6** (esquema 4.8) | 2026-10-25 | `pregunta_frecuente`, `solicitud_contacto`, `horario_atencion`, `configuracion_atencion_whatsapp` (4) | Ninguna | M15 Atención al cliente: preguntas frecuentes administrables agrupadas por tema, solicitudes del formulario de contacto (consulta, cotización o reclamo) sin duplicar datos de contacto, horario de atención humana por día con franja coherente y destino del botón de WhatsApp en fila única. Tres ENUMs nuevos. Seed con 10 preguntas, la semana completa y el canal vigente. Total 66 tablas. | [Ver v3.6](./CHANGELOG_DATABASE.md#v36---2026-10-25) |
| **v3.5** (esquema 4.7) | 2026-10-25 | `ajuste_inventario` (+ `envio_notificacion`, `rebote_notificacion`, `plantilla_notificacion` de M18, esquema 4.6) | Ninguna | M13: historial inmutable de cada cambio de la existencia referencial de una variante, con motivo, origen, nota, usuario y `id_carga` para agrupar cargas masivas. Dos ENUMs nuevos. Total 62 tablas. | [Ver v3.5](./CHANGELOG_DATABASE.md#v35---2026-10-25) |
| **v3.4** (esquema 4.5) | 2026-10-24 | Ninguna | Ninguna | `ficha_recubrimiento.manos` (opcional, 1 a 10): manos con las que se logra el rendimiento. `medida.imagen` e `imagen_mime_type` (opcionales, siempre juntas): imagen de la medida para la galería del producto. Total 58 tablas. | [Ver v3.4](./CHANGELOG_DATABASE.md#v34---2026-10-24) |
| **v3.3** (esquema 4.4) | 2026-10-24 | Ninguna | Ninguna | `tipo_medida.equivalencia_galones` (opcional, mayor que 0): galones que equivale una unidad (litro = 0,264172052). Permite derivar el rendimiento por medida a partir del rendimiento por galón (`RF-CAT-10-03`). Seed: galón, litro y mililitro. Total 58 tablas. | [Ver v3.3](./CHANGELOG_DATABASE.md#v33---2026-10-24) |
| **v3.2** (esquema 4.3) | 2026-10-24 | `superficie`, `acabado`, `familia_color`, `tipo_medida`, `medida`, `ficha_recubrimiento`, `producto_superficie`, `producto_acabado`, `producto_color`, `producto_caracteristica` (10) | `sub_subcategorias`, `tonos`, `presentacion`, `caracteristica`, `producto_subcategoria` (5) | M01 Catálogo rediseñado con las reglas del Tech Lead: color con base opcional, acabado y familia; bases globales; variante = producto + medida con su precio; producto en una subcategoría con superficies y ambiente; color en `linea_carrito` y `sku_vendido` en `linea_orden`. Total 58 tablas. | [Ver v3.2](./CHANGELOG_DATABASE.md#v32---2026-10-24) |
| **v3.1** (esquema 4.2) | 2026-10-23 | Ninguna | Ninguna | Sin cambios de DDL ni de Prisma. Seed: parámetro 11 `auth.vigencia_enlace_activacion_horas` (72 h, rango 1–168). `codigo_verificacion` guarda también el enlace de activación de empleados y los tokens de gobernanza del admin (antes en memoria); la recuperación ya no guarda el valor plano. M17 ya persiste el catálogo con Prisma. | [Ver v3.1](./WALKTHROUGH_DATABASE.md#-versión-31-2026-10-23) |
| **v3.0** (esquema 4.2) | 2026-10-21 | `control_intento_acceso` (1) | Ninguna | M04 Cuentas: aprobados en bloque C-2 y C-4 a C-9 de `RFC-M04-001`. Nueva tabla `control_intento_acceso` (Tabla 53) para control anti-fuerza bruta e indisitnguibilidad (`RN-CUE-06/07`). Unicidad parcial en solicitudes pendientes (`RN-CUE-14/19`). Unicidad y predeterminada única en `direccion_cliente` (`RN-CUE-21`). Hash BCrypt en `codigo_verificacion.codigo_hash` (`RN-CUE-03`). Correo insensible a mayúsculas `uq_usuario_correo_lower` (`RN-CUE-01`). Columna `cambio_contrasena_pendiente` en `usuario`. Permiso 21 `empresas.validar` en el catálogo de permisos. Total 53 tablas. | [Ver v3.0](./WALKTHROUGH_DATABASE.md#-versión-30-2026-10-21) |
| **v2.9** (esquema 4.1) | 2026-10-21 | `parametro_sistema` (1) | Ninguna | M17 Configuración general: el catálogo de parámetros (`HU-ADM-05`, `HU-ADM-07`) pasa de un `Map` en memoria (`ADR-007`) a una tabla con clave única, valor vigente y por defecto en `JSONB`, rango y último autor. **La base impone el tipo y el rango** (`ck_parametro_*`). Seed con las 10 filas del catálogo actual. Nuevos `enum_area_parametro` y `enum_tipo_dato_parametro`. Total 52 tablas. La fecha de última modificación la mantiene un **disparador** (el primero del esquema) y el rango de la complejidad de contraseña queda alineado con el piso de M20 (12–32). **El código de M17 aún lee de memoria** (RFC-M17-001 §5). | [Ver v2.9](./WALKTHROUGH_DATABASE.md#-versión-29-2026-10-21) |
| **v2.8** (esquema 4.0) | 2026-10-21 | `cuenta_empresa`, `documento_soporte` (2) | Ninguna (se depreca la columna `solicitud_actualizacion_nit.documento_adjunto_url`) | M04 Cuentas: `cuenta_empresa` guarda el NIT **vigente** de cada cuenta empresa aprobada (1:1 con `usuario`, `nit` UNIQUE) y deja las solicitudes como historial inmutable. `documento_soporte` almacena el RUT adjunto (PDF/JPG/PNG, hasta 5 MB, huella SHA-256) y `solicitud_actualizacion_nit` lo referencia por `id_documento`. Decisiones del Director Humano sobre el RFC-M04-001 (C-1 y C-3, opción A). Total 51 tablas. | [Ver v2.8](./WALKTHROUGH_DATABASE.md#-versión-28-2026-10-21) |
| **v2.7 / v0.3.37.0** (esquema 3.9) | 2026-09-29 | `linea_orden_descuento`, `consecutivo` (2) | Ninguna | M08 Orden de venta: copia histórica completa. `orden` añade solicitud SOL de origen, modo y costo de entrega, base, importe y tasa de IVA (dirección opcional en recogida). `linea_orden` añade color solicitado, precio inicial, referencia a la variante sin FK, entonado y base consumida, y pasa a `ON DELETE RESTRICT`. Descuentos por línea en orden y consecutivo sin huecos para `PC-AAAA-NNNNN`. Nuevo `enum_modo_entrega`. Total 49 tablas. | [Ver v2.7](./WALKTHROUGH_DATABASE.md#-versión-27--v03370-2026-09-29) |
| **v2.6 / v0.3.34.0** (esquema 3.8) | 2026-09-29 | `historial_estado_orden`, `nota_orden`, `contacto_orden` (3) | Ninguna | M08 Orden de venta: `enum_estado_orden` pasa al ciclo de HU-ORD-03 (`orden_confirmada` … `devuelto`) con migración idempotente para bases existentes (`pagado` → `orden_confirmada`, `enviado` → `despachado`); `orden.estado` nace en `orden_confirmada`; historial de transiciones con autor, notas internas y registro de contactos. Total 47 tablas. | [Ver v2.6](./WALKTHROUGH_DATABASE.md#-versión-26--v03340-2026-09-29) |
| **v2.5 / v3.29.0** | 2026-09-22 | Ninguna (Ajuste estructural de 6 tablas) | Ninguna | Sincronización del modelo ER: bloque fusionado `variante` $\rightarrow$ `base` (`id_variante`, `prefijo`) $\rightarrow$ `color` (`id_base`) $\rightarrow$ `tonos` (`nombre`, `hexagesimal`), `linea_carrito.ref_viva`, `cotizacion.id_usuario/id_rol` y `orden.carrito_o_cotizacion`. Total 44 tablas. | [Ver v2.5](./WALKTHROUGH_DATABASE.md#-versión-25--v3290-2026-09-22) |
| **v2.4** | 2026-09-05 | `direccion_cliente`, `solicitud_empresa`, `solicitud_actualizacion_nit`, `usuario_identidad_externa`, `codigo_verificacion` (5) | Ninguna | Módulo Cuentas y Perfil (M04). Múltiples direcciones (`HU-CUE-07`), flujo B2B corporativo con aprobación admin (`HU-CUE-03/09`), federación Google Identity (`HU-CUE-02`) y almacén OTP efímero con TTL (`HU-CUE-01/05`). Total 36 tablas. | [Ver v2.4](./WALKTHROUGH_DATABASE.md#-versión-24-2026-09-05) |
| **v2.3** | 2026-09-05 | `aviso_privacidad`, `consentimiento_usuario`, `solicitud_supresion` (3) | Ninguna | Protección de datos personales, términos legales y Habeas Data (M20 HU-SEG-05). Trazabilidad de consentimiento inmutable y radicación de supresión de datos. Preserva `sesion` (v2.2). | [Ver v2.3](./WALKTHROUGH_DATABASE.md#-versión-23-2026-09-05) |
| **v2.2** | 2026-09-05 | `sesion` (1) | Ninguna | Estado de sesión persistido para M20: cierre manual, caducidad por inactividad e invalidación en bloque. PK `UUID` no enumerable y 3 ENUMs nuevos. Cambio puramente aditivo. | [Ver v2.2](./WALKTHROUGH_DATABASE.md#-versión-22-2026-09-05) |
| **v2.1** | 2026-09-04 | `linea_carrito`, `cotizacion`, `orden`, `linea_orden` (4) | `pedido`, `detalle_carrito` (2) | Patrón de órdenes inmutables con snapshot de compra, cotizaciones B2B/B2C, carrito vivo desacoplado con soporte de visitantes anónimos (`token_visitante`) y variantes, y clasificación `enum_tipo_usuario`. | [Ver v2.1](./WALKTHROUGH_DATABASE.md#-versión-21-2026-09-04) |
| **v2.0** | 2026-09-03 | `categoria`, `subcategorias`, `sub_subcategorias`, `linea`, `color`, `tonos`, `variante`, `caracteristica`, `combo`, `variante_combo` (10) | `descripcion`, `nesesidad`, `presentacion`, `producto_descripcion`, `producto_presentacion` (5) | Catálogo multinivel de 4 capas, variantes por color/tono, combos, 8 ENUMs nativos y `UNIQUE(id_usuario)` en `usuario_rol`. | [Ver v2.0](./WALKTHROUGH_DATABASE.md#-versión-20-2026-09-03) |
| **v1.0** | 2026-09-02 | 21 tablas iniciales | Ninguna | Esquema fundacional derivado del diagrama `Pre-Final`. | [Ver v1.0](./WALKTHROUGH_DATABASE.md#-versión-10-2026-09-02) |

---

## 🎯 1. Visión General del Sistema

El esquema de base de datos de **Pintuclic** soporta las operaciones integrales de comercio electrónico B2B y B2C, cotizaciones comerciales, catálogo multinivel, colores con base y acabado, variantes por medida, carritos vivos, órdenes inmutables, facturación, pagos y reservación de servicios.

### 🌟 Pilares Arquitectónicos del Modelo:
1. **Catálogo (v3.1):**
   `marca` → `linea` (opcional) → `producto`. El producto pertenece a una `subcategoria` (dos niveles) y se etiqueta con `superficie` y ambiente (`uso_interior`, `uso_exterior`).
2. **Colores, bases y variantes (v3.1):**
   - `color` tiene acabado (por defecto Brillante), familia, hexadecimal y base opcional pero esencial (Tint, Deep, Pastel, Accent, globales).
   - Colores que ofrece un producto = colores de sus bases con un acabado que el producto tiene, más sus colores de fábrica (`producto_color`).
   - `variante` = `producto` + `medida` (valor + `tipo_medida`), con su precio. El color se elige en la venta.
3. **Módulo de Combos y Paquetes Promocionales (v2.0):**  
   `producto` $\rightarrow$ `combo` + `variante` $\rightarrow$ `variante_combo` (especifica variantes y cantidades exactas incluidas en cada combo).
4. **Patrón de E-Commerce Inmutable y Cotizaciones (v2.1):**  
   - Desacoplamiento de carrito vivo (`carrito` + `linea_carrito` vinculadas a `variante`) y carritos de visitantes anónimos vía `token_visitante`.
   - Creación de órdenes formales (`orden`) originadas desde el carrito o desde cotizaciones aprobadas (`cotizacion`).
   - Almacenamiento histórico inmutable en `linea_orden` (preservando nombre de producto, copia de variante y precio cobrado en el momento de la transacción).
5. **Blindaje de Integridad:**  
   - 10 tipos `ENUM` nativos de PostgreSQL para evitar estados inconsistentes o errores tipográficos.
   - Restricción `UNIQUE` en `usuario(correo)`, `rol(nombre)`, `permisos(nombre)`, `asignacion_permiso(id_rol, id_permiso)`, `orden(codigo_visible)` y `variante_combo(id_variante, id_combo)`.
6. **Cuentas B2B con NIT vigente y documentos sensibles (v2.8):**  
   - `cuenta_empresa` guarda el NIT vigente de cada cuenta empresa aprobada; las solicitudes (`solicitud_empresa`, `solicitud_actualizacion_nit`) quedan como historial inmutable.
   - `documento_soporte` almacena el RUT adjunto con tipo y tamaño acotados por `CHECK` y su huella SHA-256, detrás de un puerto de almacenamiento sustituible.
7. **Configuración general persistente (v2.9):**  
   - `parametro_sistema` guarda cada parámetro con su valor vigente, su valor por defecto y su rango; la base impone que el valor sea del tipo correcto y esté dentro del rango.
   - Un parámetro nuevo es una fila nueva en el seed, no un cambio de DDL.

---

## 🗺️ 2. Diagrama Entidad-Relación (Mermaid ER)

```mermaid
erDiagram
    %% ==== Catálogo M01 (esquema 4.3) ====
    Categoria {
        int id_categoria PK
        string nombre UK
        int orden
        enum estado
    }
    Subcategoria {
        int id_subcategoria PK
        int id_categoria FK
        string nombre "UK por categoria"
        int orden
        enum estado
    }
    Superficie {
        int id_superficie PK
        string nombre UK
    }
    Marca {
        int id_marca PK
        string nombre UK
        bytea logotipo
        enum estado
    }
    Linea {
        int id_linea PK
        int id_marca FK
        string nombre "UK por marca"
        string gama_comercial
    }
    tipo_resina {
        int id_tipo_resina PK
        string nombre UK
    }
    Acabado {
        int id_acabado PK
        string nombre UK "Brillante, Mate..."
    }
    Base {
        int id_base PK
        string nombre UK "Tint, Deep, Pastel, Accent"
    }
    FamiliaColor {
        int id_familia_color PK
        string nombre UK
        char hexadecimal
    }
    TipoMedida {
        int id_tipo_medida PK
        string nombre UK "galon, pulgada..."
        string abreviatura UK
        decimal equivalencia_galones "opcional, mayor que 0"
    }
    Medida {
        int id_medida PK
        int id_tipo_medida FK
        decimal valor
        string nombre UK "1 galon"
    }
    Color {
        int id_color PK
        int id_marca FK
        string nombre
        string codigo "UK por marca"
        int id_base FK "opcional pero esencial"
        int id_acabado FK "por defecto Brillante"
        int id_familia_color FK
        char hexadecimal
        decimal cie_l_a_b "opcional"
    }
    Producto {
        int id_producto PK
        int id_marca FK
        int id_linea FK "opcional, misma marca"
        int id_subcategoria FK
        string nombre "UK por marca"
        boolean uso_interior
        boolean uso_exterior
        boolean publicado
    }
    ficha_recubrimiento {
        int id_producto PK, FK
        int id_tipo_resina FK
        smallint tipo_calidad "1, 2 o 3"
        decimal rendimiento_min_max "m2 por galon"
    }
    producto_superficie {
        int id_producto PK, FK
        int id_superficie PK, FK
    }
    producto_acabado {
        int id_producto PK, FK
        int id_acabado PK, FK
    }
    producto_base {
        int id_producto PK, FK
        int id_base PK, FK
    }
    producto_color {
        int id_producto PK, FK
        int id_color PK, FK
    }
    producto_caracteristica {
        int id_caracteristica PK
        int id_producto FK
        string nombre
        string valor
    }
    Variante {
        int id_variante PK
        int id_producto FK
        int id_medida FK "UK con producto"
        string sku UK
        decimal precio_vigente
        int existencia_referencial
        string codigo_proveedor UK "SAMIT futuro"
        enum estado
    }
    imagen {
        int id_imagen PK
        int id_producto FK
        int id_variante FK "nullable"
        int id_color FK "nullable"
        bytea datos
        boolean es_principal "unica por producto"
    }
    Combo {
        int id_combo PK
        int id_producto FK
    }
    variante_Combo {
        int id_variante_combo PK
        int id_variante FK
        int id_combo FK
        int cantidad
    }

    %% ==== Roles, permisos y descuentos ====
    descuento {
        int id_descuento PK
        float tope
        float porcentaje_descuento
        string estado
    }
    sub_roll_empresa {
        int id_sub_roll_empresa PK
        string nombre
        int id_descuento FK
        string estado
    }
    roll {
        int id_roll PK
        string nombre
        int id_sub_roll_empresa FK
        string estado
    }
    permisos {
        int id_permiso PK
        string nombre
        string descripcion
        string estado
    }
    asignacion_permiso {
        int id_asignacion_permiso PK
        int id_roll FK
        int id_permiso FK
    }

    %% ==== Usuarios y privacidad ====
    usuario {
        int id PK
        string nombre
        string telefono
        string correo
        string contrasena
        int id_roll FK
        string estado
        string tipo "normal_o_empresa"
    }
    usuario_rol {
        int id_usuario_rol PK
        int id_usuario FK
        int id_rol FK
    }
    solicitud_supresion {
        int id_solicitud_supresion PK
        int id_usuario FK
        date fecha_solicitud
        string fecha_resolucion
        string estado
    }
    aviso_privacidad {
        int id_aviso_privacidad PK
        string version
        string descripcion
        boolean es_vigente
    }
    consentimiento_usuario {
        int id_consentimiento PK
        int id_usuario FK
        int id_aviso_privacidad FK
        date fecha
    }

    %% ==== Búsqueda: analítica sin identidad de usuario (M02) ====
    busqueda_sin_resultado {
        int id_busqueda PK "BIGSERIAL"
        string termino "normalizado"
        timestamp fecha
    }


    %% ==== M04: cuentas, direcciones, empresa y verificación (v2.4 y v2.8) ====
    direccion_cliente {
        uuid id_direccion PK
        int id_usuario FK
        string direccion
        string barrio
        boolean es_predeterminada
        decimal latitud "nullable"
        decimal longitud "nullable"
    }
    solicitud_empresa {
        uuid id_solicitud PK
        int id_usuario FK
        string nit
        enum tipo_solicitud "registro, ascenso_particular"
        enum estado "pendiente, aprobada, rechazada"
        string motivo_rechazo "nullable"
        int id_admin_revisor FK "nullable"
    }
    cuenta_empresa {
        int id_usuario PK, FK
        string nit UK "NIT VIGENTE (v2.8)"
        string nombre_empresa
        uuid id_solicitud_origen FK "nullable"
    }
    solicitud_actualizacion_nit {
        uuid id_solicitud PK
        int id_usuario FK
        string nit_anterior
        string nit_nuevo
        uuid id_documento FK "v2.8"
        string documento_adjunto_url "deprecada v2.8"
        enum estado "pendiente, aprobada, rechazada"
    }
    documento_soporte {
        uuid id_documento PK
        string tipo_mime "pdf, jpeg, png"
        int tamano_bytes "max 5 MB"
        string sha256
        bytea contenido
    }
    usuario_identidad_externa {
        int id_identidad PK
        int id_usuario FK
        string proveedor "google"
        string id_proveedor "sub"
    }
    codigo_verificacion {
        uuid id_codigo PK
        string correo
        string codigo
        enum tipo "registro, recuperacion_password, cambio_correo"
        timestamp expiracion
        int intentos
    }

    %% ==== M17: configuración general (v2.9) ====
    parametro_sistema {
        int id_parametro PK
        string clave UK "auth.x, comms.x, comercial.x"
        enum area "autenticacion, comunicaciones, comercial"
        enum tipo_dato "numero, texto, booleano"
        jsonb valor "validado por tipo y rango"
        jsonb valor_por_defecto
        decimal rango_minimo "nullable"
        decimal rango_maximo "nullable"
        timestamp fecha_actualizacion
        int id_usuario_actualizo FK "nullable"
    }

    %% ==== Ventas: cotización, carrito, reservas, orden ====
    Cotizacion {
        int id PK
        int id_usuario FK
        int id_rol FK
        string estado "M21_no_analizado"
    }
    Carrito {
        int id PK
        string token_visitante "nullable"
        int cliente_id FK "nullable"
        date fecha_ultima_actividad
    }
    LineaCarrito {
        int id PK
        int carrito_id FK
        int variante_id FK
        int id_color FK "nullable; UK con carrito y variante"
        int ref_viva
        int cantidad
    }
    reservaciones {
        int id_reservacion PK
        int id_producto FK
        int id_usuario FK
        date fecha
        time hora
        string estado
    }
    Orden {
        int id PK "interno"
        string codigo_visible
        int cliente_id FK
        string origen
        int cotizacion_id FK "nullable"
        string carrito_o_cotizacion
        enum estado "M08 v3.8: orden_confirmada, revision_disponibilidad, en_preparacion, preparada, despachado, entregado, cancelado, devuelto"
        int transaccion_pago_id "unico"
        string codigo_solicitud "M08 v3.9: SOL de M07, unico, nullable"
        enum modo_entrega "M08 v3.9: domicilio, recogida"
        decimal costo_entrega "M08 v3.9"
        string direccion "nullable en recogida"
        decimal sub_total
        decimal descuento
        decimal total
        decimal base_sin_impuesto "M08 v3.9"
        decimal importe_iva "M08 v3.9"
        decimal tasa_iva "M08 v3.9"
        string observaciones "nullable"
        date fecha
    }
    LineaOrden {
        int id PK
        int orden_id FK
        string nombre_producto "copia"
        string variante_copia "copia"
        decimal precio_aplicado "copia"
        int cantidad
        string color_solicitado "M08 v3.9, copia"
        decimal precio_inicial "M08 v3.9, copia"
        int id_variante_ref "M08 v3.9, sin FK"
        boolean es_entonado "M08 v3.9"
        string base_consumida "M08 v3.9, copia"
    }
    %% ==== M08 v3.9: descuentos por línea y consecutivo ====
    linea_orden_descuento {
        int id_linea_orden_descuento PK
        int id_linea_orden FK
        int orden_aplicacion
        string origen
        decimal porcentaje "nullable = importe fijo"
        decimal importe
    }
    consecutivo {
        int id_consecutivo PK
        string nombre "unico: orden, solicitud"
        bigint ultimo_valor
    }
    %% ==== M08 v3.8: historial de estados, notas internas y contactos ====
    historial_estado_orden {
        int id_historial_estado_orden PK
        int id_orden FK
        enum estado_anterior "nullable al nacer la orden"
        enum estado_nuevo
        int id_usuario_autor FK "nullable = sistema"
        string motivo "nullable"
        string referencia_externa "nullable"
        timestamp fecha
    }
    nota_orden {
        int id_nota_orden PK
        int id_orden FK
        int id_usuario_autor FK
        string texto "solo insercion, no visible al cliente"
        timestamp fecha
    }
    contacto_orden {
        int id_contacto_orden PK
        int id_orden FK
        int id_usuario_autor FK
        string medio
        string detalle "nullable"
        timestamp fecha
    }
    factura {
        int id_factura PK
        int id_orden FK
        date fecha
        string estado
    }
    pagos {
        int id_pago PK
        int id_orden FK
        int id_metodo_pago FK
        string estado
        float monto
    }
    metodo_pago {
        int id_metodo_pago PK
        string nombre
        string descripcion
        string estado
    }

    %% ================== RELACIONES ==================

    %% Catálogo M01 (esquema 4.3)
    Categoria           ||--o{ Subcategoria            : "divide_en"
    Subcategoria        ||--o{ Producto                : "clasifica"
    Marca               ||--o{ Linea                   : "agrupa"
    Marca               ||--o{ Producto                : "fabrica"
    Linea               |o--o{ Producto                : "agrupa"
    Marca               ||--o{ Color                   : "ofrece"
    Base                |o--o{ Color                   : "prepara"
    Acabado             ||--o{ Color                   : "acaba"
    FamiliaColor        |o--o{ Color                   : "agrupa"
    TipoMedida          ||--o{ Medida                  : "mide"
    Producto            ||--o| ficha_recubrimiento     : "describe"
    tipo_resina         ||--o{ ficha_recubrimiento     : "clasifica"
    Producto            ||--o{ producto_superficie     : "se_aplica_en"
    Superficie          ||--o{ producto_superficie     : "recibe"
    Producto            ||--o{ producto_acabado        : "ofrece"
    Acabado             ||--o{ producto_acabado        : "ofrecido_en"
    Producto            ||--o{ producto_base           : "admite"
    Base                ||--o{ producto_base           : "admitida_en"
    Producto            ||--o{ producto_color          : "trae_de_fabrica"
    Color               ||--o{ producto_color          : "exclusivo_de"
    Producto            ||--o{ producto_caracteristica : "describe"
    Producto            ||--o{ Variante                : "tiene"
    Medida              ||--o{ Variante                : "dimensiona"
    Producto            ||--o{ imagen                  : "tiene"
    Variante            |o--o{ imagen                  : "ilustra"
    Color               |o--o{ imagen                  : "ilustra"
    Producto            ||--o{ Combo                   : "es_un"
    Combo               ||--o{ variante_Combo          : "compuesto_por"
    Variante            ||--o{ variante_Combo          : "incluida_en"
    Variante            ||--o{ LineaCarrito            : "referencia (ref_viva)"
    Color               |o--o{ LineaCarrito            : "elegido_en"

    %% Roles / permisos / descuentos
    descuento          ||--o{ sub_roll_empresa   : "aplica_a"
    sub_roll_empresa   ||--o{ roll               : "agrupa"
    roll               ||--o{ usuario            : "define_perfil"
    roll               ||--o{ asignacion_permiso : "asignado_en"
    permisos           ||--o{ asignacion_permiso : "asignado_en"
    usuario            ||--o{ usuario_rol        : "posee"
    roll               ||--o{ usuario_rol        : "posee"

    %% Usuario y privacidad
    usuario                 ||--o{ solicitud_supresion    : "solicita"
    usuario                 ||--o{ consentimiento_usuario : "puede_tener"
    aviso_privacidad        ||--o{ consentimiento_usuario : "puede_aceptar"

    %% M04: cuentas, empresa y verificación
    usuario                      ||--o{ direccion_cliente            : "guarda"
    usuario                      ||--o{ solicitud_empresa            : "solicita"
    usuario                      ||--o| cuenta_empresa               : "es_empresa (v2.8)"
    solicitud_empresa            |o--o| cuenta_empresa               : "da_origen"
    usuario                      ||--o{ solicitud_actualizacion_nit  : "renueva_nit"
    documento_soporte            |o--o| solicitud_actualizacion_nit  : "adjunta_rut (v2.8)"
    usuario                      ||--o{ usuario_identidad_externa    : "vincula"

    %% M17: configuración general
    usuario                      |o--o{ parametro_sistema            : "modifica (ultimo autor)"

    %% Ventas
    usuario      ||--o{ Cotizacion     : "1:N (realiza)"
    roll         ||--o{ Cotizacion     : "1:N (realiza)"
    usuario      ||--o{ Carrito        : "tiene"
    Cotizacion   ||--o{ Orden          : "origen_opcional"
    Carrito      ||--o{ Orden          : "revalidado_en_checkout"
    usuario      ||--o{ Orden          : "realiza"
    Carrito      ||--o{ LineaCarrito   : "1:N"
    usuario      ||--o{ reservaciones  : "1_0_N (crea)"
    Producto     ||--o{ reservaciones  : "reservado_en"
    Orden        ||--o{ factura        : "emite"
    Orden        ||--o{ pagos          : "registra"
    metodo_pago  ||--o{ pagos          : "utilizado_en"
    Orden        ||--o{ LineaOrden     : "1:N"

    %% M08 v3.8: historial, notas internas y contactos
    Orden        ||--o{ historial_estado_orden : "cambia_de_estado"
    usuario      |o--o{ historial_estado_orden : "registra (nullable = sistema)"
    Orden        ||--o{ nota_orden             : "tiene_notas"
    usuario      ||--o{ nota_orden             : "escribe"
    Orden        ||--o{ contacto_orden         : "registra_contactos"
    usuario      ||--o{ contacto_orden         : "contacta"

    %% M08 v3.9: descuentos por línea
    LineaOrden   ||--o{ linea_orden_descuento  : "aplica_descuentos"
```

---

## 🏛️ 3. Módulos del Sistema y Diccionario de Datos (66 Tablas)

### Módulo 1: Seguridad, Roles y Descuentos (5 Tablas)
| Tabla | PK | FKs | Descripción |
| :--- | :--- | :--- | :--- |
| **`descuento`** | `id_descuento` | Ninguna | Define topes monetarios y porcentajes de descuento (0 a 100%). |
| **`sub_rol_empresa`** | `id_sub_rol_empresa` | `id_descuento` $\rightarrow$ `descuento` | Sub-clasificación de perfiles de clientes comerciales asociados a descuentos. |
| **`rol`** | `id_rol` | `id_sub_rol_empresa` $\rightarrow$ `sub_rol_empresa` | Roles base del sistema (`nombre` UNIQUE). |
| **`permisos`** | `id_permiso` | Ninguna | Permisos atómicos del sistema (`nombre` UNIQUE). |
| **`asignacion_permiso`** | `id_asignacion_permiso` | `id_rol`, `id_permiso` | Matriz N:M con restricción `UNIQUE(id_rol, id_permiso)`. |

### Módulo 2: Cuentas de Usuario y Control de Acceso (3 Tablas)
| Tabla | PK | FKs | Descripción |
| :--- | :--- | :--- | :--- |
| **`usuario`** | `id_usuario` | `id_rol` $\rightarrow$ `rol` | Cuentas con `correo` UNIQUE, hash BCrypt en `contrasena`, tipo (`normal`/`empresa`) y estado. |
| **`usuario_rol`** | `id_usuario_rol` | `id_usuario`, `id_rol` | Asignación con restricción `UNIQUE(id_usuario)` (máximo 1 rol por usuario). |
| **`sesion`** | `id_sesion` (**UUID**) | `id_usuario` $\rightarrow$ `usuario` (CASCADE) | Sesiones abiertas por dispositivo (M20 / HU-SEG-02). Guarda último acceso y expiración. |

### Módulo 3: Catálogo — M01 (23 Tablas, esquema 4.3)
Reglas de negocio: [`M01_REGLAS_ADICIONALES.md`](../../docs/02_MODULOS_FUNCIONALES/M01_REGLAS_ADICIONALES.md).

| Tabla | PK | FKs | Descripción |
| :--- | :--- | :--- | :--- |
| **`categoria`** | `id_categoria` | Ninguna | Qué ES el producto (Pinturas, Maderas, Herramientas…). `nombre` UNIQUE, `orden`, `estado`. |
| **`subcategoria`** | `id_subcategoria` | `id_categoria` (RESTRICT) | Segundo y último nivel. Nombre único por categoría. |
| **`superficie`** | `id_superficie` | Ninguna | Dónde se aplica (Paredes y techos, Madera, Metal…). Etiqueta N:M. |
| **`marca`** | `id_marca` | Ninguna | Marca con logotipo `BYTEA` (máx. 5 MB, jpeg/png/webp). |
| **`linea`** | `id_linea` | `id_marca` (RESTRICT) | Línea comercial; nombre único por marca. `UNIQUE (id_linea, id_marca)` soporta la FK compuesta de producto. |
| **`tipo_resina`** | `id_tipo_resina` | Ninguna | Base agua, base aceite… |
| **`acabado`** | `id_acabado` | Ninguna | Brillante, Mate, Semimate, Satinado, Transparente. |
| **`base`** | `id_base` | Ninguna | Tint, Deep, Pastel, Accent. Global, no depende de la marca. |
| **`familia_color`** | `id_familia_color` | Ninguna | Familias del selector de color, con hexadecimal de muestra. |
| **`tipo_medida`** | `id_tipo_medida` | Ninguna | Galón, litro, mililitro, pulgada, metro, unidad. `equivalencia_galones` (> 0, opcional) deriva el rendimiento por medida (RF-CAT-10-03). |
| **`medida`** | `id_medida` | `id_tipo_medida` (RESTRICT) | Valor + tipo (ej. 1/4 de galón). `UNIQUE (id_tipo_medida, valor)`. |
| **`color`** | `id_color` | `id_marca`, `id_base` (opcional), `id_acabado`, `id_familia_color` (opcional) | Hexadecimal obligatorio; CIELAB opcional y completo o vacío. `UNIQUE (id_marca, nombre, id_acabado)`; código único por marca. |
| **`producto`** | `id_producto` | `id_marca`, `(id_linea, id_marca)` → `linea`, `id_subcategoria`, `id_categoria_complementaria` (SET NULL) | Nombre único por marca; ambiente, publicación y patrocinio. La FK compuesta impide una línea de otra marca. |
| **`ficha_recubrimiento`** | `id_producto` | `id_producto` (CASCADE), `id_tipo_resina` | 1:1 opcional: resina, tipo 1/2/3, rendimiento m²/galón. Las herramientas no tienen. |
| **`producto_superficie`** | `(id_producto, id_superficie)` | ambos | Superficies del producto. |
| **`producto_acabado`** | `(id_producto, id_acabado)` | ambos | Acabados del producto; filtran su carta. |
| **`producto_base`** | `(id_producto, id_base)` | ambos | Bases admitidas: definen la carta del producto. |
| **`producto_color`** | `(id_producto, id_color)` | ambos | Colores de fábrica / exclusivos del producto. |
| **`producto_caracteristica`** | `id_caracteristica` | `id_producto` (CASCADE) | Atributos técnicos nombre/valor. |
| **`variante`** | `id_variante` | `id_producto` (RESTRICT), `id_medida` (RESTRICT) | Producto + medida, `sku` UNIQUE, `precio_vigente`, existencia referencial, `codigo_proveedor` (SAMIT futuro). |
| **`imagen`** | `id_imagen` | `id_producto`, `id_variante`, `id_color` | Imágenes `BYTEA`; una principal por producto. |
| **`combo`** / **`variante_combo`** | `id_combo` / `id_variante_combo` | — | Combos; pendientes de rediseño en su entrega. |

### Módulo 4: Carrito Vivo de Compras (2 Tablas)
| Tabla | PK | FKs | Descripción |
| :--- | :--- | :--- | :--- |
| **`carrito`** | `id_carrito` | `id_usuario` $\rightarrow$ `usuario` (opcional) | Carrito vivo con `token_visitante` para usuarios anónimos y fecha de actividad. |
| **`linea_carrito`** | `id_linea_carrito` | `id_carrito`, `id_variante`, `id_color` (opcional) | Ítem vivo = variante + color elegido ("variante temporal"); `UNIQUE NULLS NOT DISTINCT (id_carrito, id_variante, id_color)`. |

### Módulo 5: Cotizaciones y Órdenes Inmutables (8 Tablas)
| Tabla | PK | FKs | Descripción |
| :--- | :--- | :--- | :--- |
| **`cotizacion`** | `id_cotizacion` | `id_usuario`, `id_rol` | Cotización comercial B2B/B2C vinculada a usuario y rol. |
| **`orden`** | `id_orden` | `id_usuario`, `id_cotizacion` | Orden de compra confirmada con `codigo_visible`, `origen`, `carrito_o_cotizacion`, pasarela y estado (nace en `orden_confirmada`). Desde v3.9 conserva la solicitud SOL de origen (`codigo_solicitud` UNIQUE), el modo y costo de entrega, y la base, el importe y la tasa de IVA; la dirección es opcional en recogida. |
| **`linea_orden`** | `id_linea_orden` | `id_orden` $\rightarrow$ `orden` (RESTRICT) | Snapshot congelado inmutable (`nombre_producto`, `variante_copia`, `precio_aplicado`, `cantidad`). Desde v3.9: `color_solicitado`, `precio_inicial`, `id_variante_ref` sin FK, `es_entonado` y `base_consumida`. |
| **`linea_orden_descuento`** | `id_linea_orden_descuento` | `id_linea_orden` $\rightarrow$ `linea_orden` | Descuentos aplicados a cada línea con origen, porcentaje, importe y orden de aplicación (M08 - RF-ORD-02-02). Solo inserción. |
| **`consecutivo`** | `id_consecutivo` | Ninguna | Numeración corrida sin huecos por tipo de documento (M08 - RF-ORD-06-04; reutilizable por M07). |
| **`historial_estado_orden`** | `id_historial_estado_orden` | `id_orden` $\rightarrow$ `orden`, `id_usuario_autor` $\rightarrow$ `usuario` (NULL = sistema) | Transiciones de la orden con estado anterior y nuevo, autor, motivo, referencia externa y fecha (M08 - HU-ORD-03). Solo inserción. |
| **`nota_orden`** | `id_nota_orden` | `id_orden` $\rightarrow$ `orden`, `id_usuario_autor` $\rightarrow$ `usuario` | Notas internas del personal, nunca visibles al cliente (M08 - HU-ORD-10). Solo inserción. |
| **`contacto_orden`** | `id_contacto_orden` | `id_orden` $\rightarrow$ `orden`, `id_usuario_autor` $\rightarrow$ `usuario` | Contactos con el cliente iniciados desde la orden: medio, detalle, autor y fecha (M08 - HU-ORD-09). Solo inserción. |

### Módulo 6: Pagos y Facturación (3 Tablas)
| Tabla | PK | FKs | Descripción |
| :--- | :--- | :--- | :--- |
| **`metodo_pago`** | `id_metodo_pago` | Ninguna | Pasarelas / métodos habilitados (PSE, Tarjeta, Efectivo). |
| **`pagos`** | `id_pago` | `id_orden`, `id_metodo_pago` | Registro de transacciones financieras con estado (`enum_estado_pago`). |
| **`factura`** | `id_factura` | `id_orden` $\rightarrow$ `orden` | Comprobante fiscal con fecha y estado (`enum_estado_factura`). |

### Módulo 7: Servicios y Reservaciones (1 Tabla)
| Tabla | PK | FKs | Descripción |
| :--- | :--- | :--- | :--- |
| **`reservaciones`** | `id_reservacion` | `id_producto`, `id_usuario` | Citas de asesoría técnica o aplicación con fecha, hora y estado. |

### Módulo 8: Privacidad, Consentimiento y Habeas Data (3 Tablas)
| Tabla | PK | FKs | Descripción |
| :--- | :--- | :--- | :--- |
| **`aviso_privacidad`** | `id_aviso_privacidad` | Ninguna | Versiones normativas y términos de tratamiento de datos personales (`version` UNIQUE, `es_vigente`). |
| **`consentimiento_usuario`** | `id_consentimiento` | `id_usuario`, `id_aviso_privacidad` | Registro de consentimiento informado con fecha exacta de aceptación y restricción `UNIQUE(id_usuario, id_aviso_privacidad)`. |
| **`solicitud_supresion`** | `id_solicitud_supresion` | `id_usuario` $\rightarrow$ `usuario` | Gestión de derechos ARCO y supresión de datos con estado de resolución (`enum_estado_solicitud_supresion`). |

### Módulo 9: Cuentas, Direcciones, Empresa y Verificación — M04 (7 Tablas)
| Tabla | PK | FKs | Descripción |
| :--- | :--- | :--- | :--- |
| **`direccion_cliente`** | `id_direccion` (**UUID**) | `id_usuario` $\rightarrow$ `usuario` (CASCADE) | Libreta de direcciones de entrega con designación de predeterminada y coordenadas opcionales (HU-CUE-07). |
| **`solicitud_empresa`** | `id_solicitud` (**UUID**) | `id_usuario`, `id_admin_revisor` $\rightarrow$ `usuario` | Solicitudes de registro de empresa y de ascenso de particular a empresa, con estado, motivo de rechazo y revisor (HU-CUE-03, HU-CUE-09). |
| **`cuenta_empresa`** *(v2.8)* | `id_usuario` (PK y FK, **1:1**) | `id_usuario` $\rightarrow$ `usuario` (CASCADE), `id_solicitud_origen` $\rightarrow$ `solicitud_empresa` (SET NULL) | **NIT vigente** y datos de la cuenta empresa aprobada. `nit` es `UNIQUE`. La renovación de NIT actualiza esta fila; las solicitudes quedan como historial (HU-CUE-09, HU-CUE-10). |
| **`solicitud_actualizacion_nit`** | `id_solicitud` (**UUID**) | `id_usuario`, `id_admin_revisor` $\rightarrow$ `usuario`; `id_documento` $\rightarrow$ `documento_soporte` (RESTRICT, v2.8) | Renovación de NIT con el RUT adjunto (HU-CUE-09, HU-CUE-10). `documento_adjunto_url` queda **deprecada** desde v2.8. |
| **`documento_soporte`** *(v2.8)* | `id_documento` (**UUID**) | Ninguna | RUT adjunto en `BYTEA`: PDF, JPG o PNG de hasta 5 MB, con huella SHA-256 y verificación de tamaño real por `CHECK`. El contenido nunca se selecciona en listados. |
| **`usuario_identidad_externa`** | `id_identidad` | `id_usuario` $\rightarrow$ `usuario` (CASCADE) | Identidades federadas (Google). `UNIQUE(proveedor, id_proveedor)` y `UNIQUE(id_usuario, proveedor)` (HU-CUE-02). |
| **`codigo_verificacion`** | `id_codigo` (**UUID**) | Ninguna (se identifica por `correo`) | Códigos OTP efímeros con expiración y contador de intentos: registro, recuperación de contraseña y cambio de correo (HU-CUE-01, 05, 06). Desde v3.1 también guarda el enlace de activación de empleados (`recuperacion_password`) y los tokens de sustitución del correo del admin (`cambio_correo`, huella SHA-256). Solo se almacenan hashes, nunca el valor plano. |

### Módulo 10: Configuración General — M17 (1 Tabla)
| Tabla | PK | FKs | Descripción |
| :--- | :--- | :--- | :--- |
| **`parametro_sistema`** *(v2.9)* | `id_parametro` | `id_usuario_actualizo` $\rightarrow$ `usuario` (SET NULL) | Catálogo de parámetros modificables en caliente (HU-ADM-05, HU-ADM-07): `clave` única con prefijo de área, valor vigente y por defecto en `JSONB`, y rango numérico opcional. La base impone el tipo y el rango (`ck_parametro_*`); guarda solo el último autor (el historial completo es de HU-SEG-04) y su fecha de última modificación la mantiene el disparador `trg_parametro_sistema_fecha`. |

### Módulo 11: Búsqueda y Analítica — M02 (1 Tabla)
| Tabla | PK | FKs | Descripción |
| :--- | :--- | :--- | :--- |
| **`busqueda_sin_resultado`** | `id_busqueda` (**BIGSERIAL**) | Ninguna | Analítica de búsquedas sin resultado (M02 HU-BUS-06): una fila por evento, con el `termino` normalizado y su `fecha`, **sin identidad de usuario** (M20 HU-SEG-06). Permite acotar por periodo y agregar repeticiones con `GROUP BY termino`. |

### Módulo 12: Inventario Referencial — M13 (1 Tabla)
| Tabla | PK | FKs | Descripción |
| :--- | :--- | :--- | :--- |
| **`ajuste_inventario`** *(v3.5)* | `id_ajuste` | `id_variante` $\rightarrow$ `variante` (RESTRICT), `id_usuario` $\rightarrow$ `usuario` (SET NULL) | Historial inmutable de cambios de `variante.existencia_referencial`: existencia anterior y nueva (≥ 0 y distintas), `motivo`, `origen` (`manual`, `carga_masiva`, `samit`), nota opcional, `id_carga` (UUID del cliente que agrupa una carga masiva, sin tabla propia) y `fecha`. Solo se inserta, en la misma transacción que el cambio de la variante. El inventario es referencial y no bloquea ventas. |

### Módulo 13: Atención al Cliente — M15 (4 Tablas, esquema 4.8)
| Tabla | PK | FKs | Descripción |
| :--- | :--- | :--- | :--- |
| **`pregunta_frecuente`** *(v3.6)* | `id_pregunta` | Ninguna | Preguntas frecuentes administrables y públicas (HU-ATC-01): `tema` para agruparlas, `orden` (≥ 0) para ordenarlas dentro del tema y `activa` para ocultarlas al público **sin eliminarlas** (CA-ATC-01-02). Cada fila lleva su propia `pregunta` y su `respuesta`. |
| **`solicitud_contacto`** *(v3.6)* | `id_solicitud` (**UUID**) | `id_usuario` $\rightarrow$ `usuario` (CASCADE) | Solicitudes del formulario de contacto, que exige sesión (HU-ATC-02): `tipo` (`consulta`, `cotizacion`, `reclamo`), `descripcion` y `estado` (`pendiente`, `atendida`) para la bandeja del administrador. **No duplica los datos de contacto**: se leen de la cuenta al mostrarla (RF-ATC-02-04). Una solicitud de tipo `cotizacion` es solo intención y nunca genera una cotización formal (RF-ATC-02-07). |
| **`horario_atencion`** *(v3.6)* | `id_horario` | `id_usuario_actualizo` $\rightarrow$ `usuario` (SET NULL) | Horario de atención humana, una fila por día de la semana (`dia_semana` UNIQUE, HU-ATC-04). Las horas son `"HH:mm"` en 24h validadas por `ck_horario_formato_horas`, y `ck_horario_franja_coherente` exige que un día cerrado no lleve horas y que uno abierto tenga `hora_fin > hora_inicio`. Solo condiciona los canales atendidos por personas (RF-ATC-04-04). |
| **`configuracion_atencion_whatsapp`** *(v3.6)* | `id_configuracion` (**fila única**, `ck_whatsapp_fila_unica`) | `id_usuario_actualizo` $\rightarrow$ `usuario` (SET NULL) | Destino del botón de contacto directo por WhatsApp (HU-ATC-03). `destino` admite una URL completa —hoy el canal de difusión de la empresa, que no acepta texto prellenado— o un número de WhatsApp Business cuando exista; en ese caso el botón arma el enlace `wa.me` con `mensaje_base` y la referencia del producto. Es un enlace saliente: el sistema no recibe, almacena ni responde conversaciones (RF-ATC-03-04). |

---

## 🛡️ 4. Tipos Enumerados (ENUMs)

Para asegurar la máxima robustez en PostgreSQL, el esquema utiliza 27 tipos enumerados nativos.
`enum_clase_color` aparece abajo pero **todavía no existe en el DDL**: queda pendiente de la Entrega 2 de M01.

```sql
enum_estado_general     -- ('activo', 'inactivo')
enum_tipo_usuario       -- ('normal', 'empresa')
enum_estado_usuario     -- ('activo', 'inactivo', 'bloqueado', 'pendiente')
enum_estado_producto    -- ('activo', 'inactivo', 'agotado', 'descontinuado')
enum_origen_orden       -- ('carrito', 'cotizacion')
enum_estado_orden       -- ('orden_confirmada', 'revision_disponibilidad', 'en_preparacion', 'preparada',
                        --  'despachado', 'entregado', 'cancelado', 'devuelto')  -- v3.8 (M08)
enum_modo_entrega       -- ('domicilio', 'recogida')  -- v3.9 (M08)
enum_estado_cotizacion  -- ('borrador', 'enviada', 'aprobada', 'rechazada', 'vencida')
enum_estado_pago        -- ('pendiente', 'completado', 'fallido', 'reembolsado')
enum_estado_factura     -- ('emitida', 'pagada', 'anulada')
enum_estado_reservacion -- ('pendiente', 'confirmada', 'cancelada', 'finalizada')

-- Sesiones de usuario (v2.2 - M20)
enum_estado_sesion        -- ('activa', 'cerrada', 'expirada', 'revocada')
enum_tipo_sesion          -- ('admin', 'cliente')
enum_motivo_cierre_sesion -- ('cierre_manual', 'inactividad', 'cambio_contrasena',
                          --  'cuenta_desactivada', 'permisos_retirados')

-- Privacidad y Habeas Data (v2.3 - M20)
enum_estado_solicitud_supresion -- ('pendiente', 'en_proceso', 'aprobada', 'rechazada')

-- Cuentas, empresas y verificación (v2.4 - M04)
enum_tipo_solicitud_empresa   -- ('registro', 'ascenso_particular')
enum_estado_solicitud_empresa -- ('pendiente', 'aprobada', 'rechazada')
enum_tipo_codigo_otp          -- ('registro', 'recuperacion_password', 'cambio_correo')

-- Configuración general (v2.9 - M17)
enum_area_parametro           -- ('autenticacion', 'comunicaciones', 'comercial')
enum_tipo_dato_parametro      -- ('numero', 'texto', 'booleano')

-- Catálogo (M01 - HU-CAT-02, RF-CAT-02-03)
enum_clase_color              -- ('entonable', 'colores_fijos', 'sin_color')

-- Inventario referencial (M13)
enum_motivo_ajuste_inventario -- ('conteo_fisico', 'ingreso_mercancia', 'salida', 'correccion', 'otro', 'carga_masiva')
enum_origen_ajuste_inventario -- ('manual', 'carga_masiva', 'samit')

-- Notificaciones y comunicaciones (M18)
enum_tipo_comunicacion  -- ('registro_otp', 'recuperacion_password', 'activacion_empleado',
                        --  'cambio_correo_otp', 'cambio_correo_confirmado', 'dictamen_empresa')
enum_estado_envio_notificacion -- ('pendiente', 'enviado', 'fallido')

-- Atención al cliente (M15)
enum_tipo_solicitud_contacto   -- ('consulta', 'cotizacion', 'reclamo')
enum_estado_solicitud_contacto -- ('pendiente', 'atendida')
enum_dia_semana         -- ('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo')
```

---

## ⚡ 5. Recomendaciones para el Stack de Desarrollo

### Backend (Node.js / Express / TypeScript / Prisma 6):
1. **Modelo Prisma como contrato tipado:**
   Reflejar cada tabla en `backend/prisma/schema.prisma` (con `@map`/`@@map` al nombre real de la tabla y la columna) y regenerar el cliente con `npm run db:generate`. Los repositorios usan los tipos generados (`Prisma.XxxGetPayload`, `Prisma.XxxCreateInput`), nunca `any`. El archivo es **compartido** entre módulos: aplica la Directiva #3 de `AGENTS.md`.
2. **Uso de Transacciones en Creación de Órdenes:**
   - Abrir `prisma.$transaction(async (tx) => { ... })` para crear la orden, insertar los snapshots en `linea_orden` leyendo el precio vigente actual de cada variante y vaciar las líneas correspondientes de `linea_carrito`.
   - Las consultas complejas usan `prisma.$queryRaw` con `Prisma.sql` (plantilla etiquetada), nunca concatenación de cadenas.
3. **Hashing Seguro:**  
   Las contraseñas de `usuario` deben ser hasheadas con **BCrypt** (costo mínimo 12) antes de persistirse.

### Frontend (React / Vue / Next.js):
1. **Gestión de Carrito Anónimo:**  
   Generar y conservar un `token_visitante` (UUID v4) en `localStorage` o cookie para carritos sin sesión iniciada. Al autenticarse el usuario, invocar endpoint de fusión para asociar el carrito a su `id_usuario`.
2. **Navegación de Catálogo en Cascada:**  
   Aprovechar la jerarquía `categoria` $\rightarrow$ `subcategorias` $\rightarrow$ `sub_subcategorias` $\rightarrow$ `linea` para implementar menús desplegables y filtros dinámicos.
3. **Selector de Variantes y Tonos:**  
   Al seleccionar un producto, cargar sus variantes y si el usuario escoge un color, calcular el precio vigente de la variante más el ajuste del tono seleccionado.

