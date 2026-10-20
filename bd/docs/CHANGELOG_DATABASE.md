# 📜 Registro de Cambios y Versiones de Base de Datos (CHANGELOG) - PINTUCLIC

Este documento constituye el registro histórico y oficial del versionamiento del modelo de datos relacional de **Pintuclic** (PostgreSQL + Kysely).

> **Motor:** PostgreSQL 13+ (compatible con PostgreSQL 18)  
> **Script DDL Oficial:** [`../sql/schema_pintuclic.sql`](../sql/schema_pintuclic.sql)  
> **Script Seed Oficial:** [`../sql/seed_pintuclic.sql`](../sql/seed_pintuclic.sql)  
> **Documentación General:** [`./DOCUMENTACION_BASE_DATOS.md`](./DOCUMENTACION_BASE_DATOS.md)  
> **Walkthrough Detallado de Migraciones:** [`./WALKTHROUGH_DATABASE.md`](./WALKTHROUGH_DATABASE.md)  

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
