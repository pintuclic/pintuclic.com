# 📘 Arquitectura y Documentación del Esquema de Base de Datos - PINTUCLIC

> **Versión Actual:** 2.7 / v0.3.37.0 — esquema 3.9 (M08: copia histórica de la orden, descuentos por línea y consecutivo)  
> **Motor de Base de Datos:** PostgreSQL 13+ (`gen_random_uuid()` nativo; compatible con PostgreSQL 18)  
> **Total de Tablas:** 49  
> **Script DDL Oficial:** [`../sql/schema_pintuclic.sql`](../sql/schema_pintuclic.sql)  
> **Script de Mocks / Seed Oficial:** [`../sql/seed_pintuclic.sql`](../sql/seed_pintuclic.sql)  
> **Guía Oficial de Mocks y Datos de Prueba:** [`./GUIA_MOCKS_Y_DATOS_PRUEBA.md`](./GUIA_MOCKS_Y_DATOS_PRUEBA.md)  
> **Walkthrough Detallado de Migraciones:** [`./WALKTHROUGH_DATABASE.md`](./WALKTHROUGH_DATABASE.md)

---

## 📜 Historial Resumido de Versiones (Changelog)

| Versión | Fecha | Tablas Nuevas | Tablas Deprecadas | Cambios Destacados | Detalle Completo |
| :---: | :---: | :--- | :--- | :--- | :--- |
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

El esquema de base de datos de **Pintuclic** soporta las operaciones integrales de comercio electrónico B2B y B2C, cotizaciones comerciales, catálogo multinivel, inventario de colores/tonos/variantes, carritos vivos, órdenes inmutables, facturación, pagos y reservación de servicios.

### 🌟 Pilares Arquitectónicos del Modelo:
1. **Reestructuración Completa del Catálogo (v2.0):**  
   Jerarquía precisa de 4 niveles: `categoria` $\rightarrow$ `subcategorias` $\rightarrow$ `sub_subcategorias` $\rightarrow$ `linea` $\rightarrow$ `producto`.
2. **Desglose de Colores, Tonos y Variantes (v2.0):**  
   - `color` $\rightarrow$ `tonos` (con variación de precios por matiz).
   - `producto` $\rightarrow$ `variante` (asociado a un color y precio vigente propio).
   - `variante` $\rightarrow$ `caracteristica` (atributos técnicos de la variante).
3. **Módulo de Combos y Paquetes Promocionales (v2.0):**  
   `producto` $\rightarrow$ `combo` + `variante` $\rightarrow$ `variante_combo` (especifica variantes y cantidades exactas incluidas en cada combo).
4. **Patrón de E-Commerce Inmutable y Cotizaciones (v2.1):**  
   - Desacoplamiento de carrito vivo (`carrito` + `linea_carrito` vinculadas a `variante`) y carritos de visitantes anónimos vía `token_visitante`.
   - Creación de órdenes formales (`orden`) originadas desde el carrito o desde cotizaciones aprobadas (`cotizacion`).
   - Almacenamiento histórico inmutable en `linea_orden` (preservando nombre de producto, copia de variante y precio cobrado en el momento de la transacción).
5. **Blindaje de Integridad:**  
   - 10 tipos `ENUM` nativos de PostgreSQL para evitar estados inconsistentes o errores tipográficos.
   - Restricción `UNIQUE` en `usuario(correo)`, `rol(nombre)`, `permisos(nombre)`, `asignacion_permiso(id_rol, id_permiso)`, `orden(codigo_visible)` y `variante_combo(id_variante, id_combo)`.

---

## 🗺️ 2. Diagrama Entidad-Relación (Mermaid ER)

```mermaid
erDiagram
    %% ==== Catálogo / Jerarquía de producto ====
    Categoria {
        int UniqueID PK
        string nombre
    }
    Subcategorias {
        int UniqueID PK
        int id_categoria FK
        string nombre
    }
    Sub_Subcategorias {
        int UniqueID PK
        int id_subcategoria FK
        string nombre
    }
    Marca {
        int UniqueID PK
        string nombre
    }
    Linea {
        int UniqueID PK
        int id_sub_subcategoria FK
        string nombre
        string marca
    }
    Producto {
        int UniqueID PK
        int id_linea FK
        string nombre
    }

    %% ==== Bloque fusionado (diagrama 1: Variante -> Bases -> Color -> tonos) ====
    Variante {
        int UniqueID PK
        int id_producto FK
        float precio_vigente
        string estado
    }
    Bases {
        int id_base PK
        string nombre
        int id_variante FK
        string prefijo
    }
    Color {
        int UniqueID PK
        string nombre
        int id_base FK
    }
    tonos {
        int UniqueID PK
        int id_color FK
        string nombre
        string hexagesimal
        float precio
    }

    Caracteristica {
        int UniqueID PK
        int id_variante FK
        string nombre
    }
    Combo {
        int UniqueID PK
        int id_producto FK
    }
    variante_Combo {
        int UniqueID PK
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

    %% Jerarquía de catálogo
    Categoria         ||--o{ Subcategorias        : "divide_en"
    Subcategorias      ||--o{ Sub_Subcategorias     : "subdivide_en"
    Sub_Subcategorias  ||--o{ Linea                 : "agrupa"
    Marca               ||--o{ Linea                 : "agrupa"
    Linea               ||--o{ Producto              : "clasifica"
    Producto            ||--o{ Combo                 : "es_un"

    %% Bloque fusionado: Variante -> Bases -> Color -> tonos
    Producto  ||--o{ Variante          : "tiene"
    Variante  ||--o{ Bases             : "tiene"
    Bases     ||--o{ Color             : "clasifica"
    Color     ||--o{ tonos             : "desglosa_en"
    Variante  ||--o{ Caracteristica    : "describe"
    Combo     ||--o{ variante_Combo    : "compuesto_por"
    Variante  ||--o{ variante_Combo    : "incluida_en"
    Variante  ||--o{ LineaCarrito      : "referencia (ref_viva)"

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

## 🏛️ 3. Módulos del Sistema y Diccionario de Datos (31 Tablas)

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

### Módulo 3: Catálogo Multinivel, Colores, Bases y Variantes (11 Tablas)
| Tabla | PK | FKs | Descripción |
| :--- | :--- | :--- | :--- |
| **`categoria`** | `id_categoria` | Ninguna | Nivel 1 del catálogo (e.g. Pinturas Arquitectónicas, Esmaltes). |
| **`subcategorias`** | `id_subcategoria` | `id_categoria` $\rightarrow$ `categoria` | Nivel 2 de agrupación. |
| **`sub_subcategorias`** | `id_sub_subcategoria` | `id_subcategoria` $\rightarrow$ `subcategorias` | Nivel 3 de agrupación. |
| **`linea`** | `id_linea` | `id_sub_subcategoria` $\rightarrow$ `sub_subcategorias` | Nivel 4: Línea de marca (e.g. Viniltex, Koraza). |
| **`producto`** | `id_producto` | `id_linea` $\rightarrow$ `linea` | Entidad base del producto. |
| **`variante`** | `id_variante` | `id_producto` $\rightarrow$ `producto` | SKU vendible con `precio_vigente`, `estado` comercial y presentación. |
| **`base`** | `id_base` | `id_variante` $\rightarrow$ `variante` | Base vinculada a variante con `prefijo` y nombre. |
| **`color`** | `id_color` | `id_base` $\rightarrow$ `base` | Catálogo de colores clasificados por base (`id_base`). |
| **`tonos`** | `id_tono` | `id_color` $\rightarrow$ `color` | Tonos/matices derivados con `nombre`, `hexagesimal` y precio adicional. |
| **`caracteristica`** | `id_caracteristica` | `id_variante` $\rightarrow$ `variante` | Ficha técnica o especificaciones de la variante. |
| **`combo`** | `id_combo` | `id_producto` $\rightarrow$ `producto` | Paquete comercial ligado a un producto. |
| **`variante_combo`** | `id_variante_combo` | `id_variante`, `id_combo` | Detalle N:M de las variantes y `cantidad` que componen el combo. |

### Módulo 4: Carrito Vivo de Compras (2 Tablas)
| Tabla | PK | FKs | Descripción |
| :--- | :--- | :--- | :--- |
| **`carrito`** | `id_carrito` | `id_usuario` $\rightarrow$ `usuario` (opcional) | Carrito vivo con `token_visitante` para usuarios anónimos y fecha de actividad. |
| **`linea_carrito`** | `id_linea_carrito` | `id_carrito`, `id_variante` | Ítems agregados vivos vinculados a variante con `ref_viva` y `cantidad`. |

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

---

## 🛡️ 4. Tipos Enumerados (ENUMs)

Para asegurar la máxima robustez en PostgreSQL, el esquema utiliza 14 tipos enumerados nativos:

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
```

---

## ⚡ 5. Recomendaciones para el Stack de Desarrollo

### Backend (Node.js / Express / TypeScript / Kysely):
1. **Tipado Kysely Centralizado:**  
   Definir todos los tipos de tablas en `src/core/db/types.ts`. Utilizar `Generated<number>` para las columnas `SERIAL PRIMARY KEY`.
2. **Uso de Transacciones en Creación de Órdenes:**  
   - Iniciar transacción `db.transaction().execute(...)` para crear la orden, insertar los snapshots en `linea_orden` leyendo el precio vigente actual de cada variante y vaciar las líneas correspondientes de `linea_carrito`.
3. **Hashing Seguro:**  
   Las contraseñas de `usuario` deben ser hasheadas con **BCrypt** (costo mínimo 12) antes de persistirse.

### Frontend (React / Vue / Next.js):
1. **Gestión de Carrito Anónimo:**  
   Generar y conservar un `token_visitante` (UUID v4) en `localStorage` o cookie para carritos sin sesión iniciada. Al autenticarse el usuario, invocar endpoint de fusión para asociar el carrito a su `id_usuario`.
2. **Navegación de Catálogo en Cascada:**  
   Aprovechar la jerarquía `categoria` $\rightarrow$ `subcategorias` $\rightarrow$ `sub_subcategorias` $\rightarrow$ `linea` para implementar menús desplegables y filtros dinámicos.
3. **Selector de Variantes y Tonos:**  
   Al seleccionar un producto, cargar sus variantes y si el usuario escoge un color, calcular el precio vigente de la variante más el ajuste del tono seleccionado.

