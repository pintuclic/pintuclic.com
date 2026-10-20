# 🧪 Guía y Estándar de Mocks y Datos de Prueba - PINTUCLIC

Esta guía define el protocolo oficial para la gestión, siembra y consumo de datos falsos (mocks/fixtures) en el entorno de desarrollo y pruebas de **Pintuclic**. Aplica obligatoriamente para todos los desarrolladores humanos y **Agentes de IA** asignados a la implementación de cualquier módulo del sistema.

---

## 🎯 1. Principio de Origen Único de Mocks (Single Source of Truth)

Queda **terminantemente prohibido** crear carpetas de fixtures aisladas o scripts de datos locales dispersos dentro de los módulos (`src/modules/**/__fixtures__`). 

Todo dato de prueba del sistema reside de forma centralizada e idempotente en:
- 📄 **Script SQL de Datos de Prueba:** [`bd/sql/seed_pintuclic.sql`](../sql/seed_pintuclic.sql)
- ⚙️ **Script Ejecutor TypeScript:** [`backend/src/core/db/seed.ts`](../../backend/src/core/db/seed.ts)

---

## 🚀 2. Comandos de Inicialización Rápida (NPM)

Desde el directorio `backend/`:

| Comando | Acción Realizada |
| :--- | :--- |
| `npm run db` | Lee y ejecuta [`bd/sql/schema_pintuclic.sql`](../sql/schema_pintuclic.sql), creando las 31 tablas, ENUMs e índices. |
| `npm run db:seed` | Lee y ejecuta [`bd/sql/seed_pintuclic.sql`](../sql/seed_pintuclic.sql), sembrando datos de prueba en las 31 tablas e imprimiendo el reporte de filas. |
| `npm run db:reset` | **Comando recomendado:** Despliega el esquema completo y a continuación siembra los mocks (`npm run db && npm run db:seed`). |

---

## 👥 3. Cuentas de Usuario y Credenciales de Prueba

Todos los usuarios de prueba comparten la misma contraseña para facilitar las pruebas locales:

> 🔑 **Contraseña Universal de Pruebas:** `Pintuclic2026`  
> *Todos los registros almacenan el hash criptográfico BCrypt real (costo 12) para que los endpoints de login funcionen exactamente igual que en producción.*

| ID | Nombre | Correo Electrónico | Rol Asignado | Tipo | Estado | Propósito en Pruebas |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- |
| **1** | Admin Pruebas | `admin@pintuclic.co` | `administrador` (1) | `normal` | `activo` | Pruebas de endpoints protegidos, administración, permisos y configuración global. |
| **2** | Cliente Activo | `cliente@pintuclic.co` | `cliente` (2) | `normal` | `activo` | Pruebas de e-commerce B2C, compras, carritos, reservaciones y consentimientos. |
| **3** | Cliente De Baja | `baja@pintuclic.co` | `cliente` (2) | `normal` | `inactivo` | Pruebas de rechazo de autenticación por cuenta desactivada y solicitudes de supresión de datos. |
| **4** | Pinturas del Valle S.A.S. | `contacto@pinturasvalle.co` | `empresa_vip` (3) | `empresa` | `activo` | Pruebas de cliente corporativo B2B con políticas de descuento y facturación empresarial. |

---

## 📦 4. Resumen de Entidades Precargadas en las 31 Tablas

El script `seed_pintuclic.sql` garantiza que **todas las 31 tablas** cuenten con relaciones válidas y consistentes:

```text
[Descuentos & Roles]
  descuento (15% y 10%) ──> sub_rol_empresa (Distribuidor, Contratista) ──> rol (admin, cliente, empresa_vip)
  permisos (5 atómicos) ──> asignacion_permiso (matriz N:M)

[Usuarios & Sesiones]
  usuario (4 cuentas) ──> usuario_rol (1:1)
  usuario ──> sesion (UUIDs fijos activos para admin y cliente con ventanas de inactividad)

[Catálogo Multinivel]
  categoria (Pinturas Arquitectónicas)
    └── subcategorias (Interiores y Exteriores)
          └── sub_subcategorias (Vinilos Base Agua)
                └── linea (Viniltex Avanzado)
                      └── producto (Viniltex Antibacterial, Kit Renovación)
                            ├── color (Blanco Puro, Azul Océano, Gris Titanio) ──> tonos (con recargo)
                            ├── variante (SKUs vendibles a $85.900, $95.900, $115.000)
                            │     └── caracteristica (Rendimiento, Acabado mate)
                            └── combo ──> variante_combo (Kit compuesto por 2 variantes)

[Carrito Vivo]
  carrito (id=1 para cliente autenticado, id=2 anónimo con token_visitante)
    └── linea_carrito (variante vinculada con cantidad)

[Cotizaciones & Órdenes Inmutables]
  cotizacion (aprobada y borrador)
  orden (ORD-2026-0001 pagada vía PSE, ORD-2026-0002 corporativa)
    └── linea_orden (snapshot congelado de productos y precios aplicados)
  metodo_pago (PSE, Tarjeta de Crédito, Transferencia Bancolombia)
  pagos (transacciones completadas)
  factura (factura emitida y pagada)

[Servicios & Citas]
  reservaciones (agendamiento de servicio técnico de aplicación)

[Privacidad y Habeas Data - M20]
  aviso_privacidad (v1.0-2026 vigente, v0.9-2025 histórica)
  consentimiento_usuario (aceptación auditada para admin, cliente y empresa)
  solicitud_supresion (solicitud en estado 'pendiente' para el usuario de baja)
```

---

## 📝 5. Protocolo para Extender Mocks al Desarrollar un Nuevo Módulo

Si un desarrollador o Agente de IA está implementando un nuevo módulo funcional (`M02`, `M05`, `M08`, `M17`, etc.) y requiere datos de prueba adicionales:

1. **Editar Únicamente [`bd/sql/seed_pintuclic.sql`](../sql/seed_pintuclic.sql):**
   - Agrega los nuevos registros en la sección correspondiente.
   - Usa siempre la cláusula `ON CONFLICT (...) DO NOTHING` para mantener la **idempotencia**.
   - Si insertas IDs manuales en columnas autoincrementales (`SERIAL`), actualiza la secuencia correspondiente en el bloque final:
     ```sql
     SELECT setval('nombre_tabla_id_seq', COALESCE((SELECT MAX(id) FROM nombre_tabla), 1));
     ```
2. **Probar la Siembra:**
   - Ejecuta `npm run db:seed` en `backend/` y confirma que la consola reporte que todas las tablas están en estado `✅` con sus conteos actualizados.
3. **Validar Pruebas:**
   - Corre tus tests de integración o pruebas de endpoints HTTP contra estos datos.
4. **Prohibido Crear Subcarpetas de Fixtures:**
   - Cualquier archivo de prueba o mock que no esté en `bd/sql/seed_pintuclic.sql` será rechazado en la revisión del Líder Técnico (Tech Lead).
