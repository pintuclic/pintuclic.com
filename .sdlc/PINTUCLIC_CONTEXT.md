# 🗺️ PINTUCLIC CONTEXT — Mapa de Fuentes de Verdad y Contexto del Proyecto

> **Documento de Inicialización de Contexto para Agentes IA**
> Todo agente que inicie sesión en este proyecto DEBE leer este archivo DESPUÉS de `AGENTS.md`
> y ANTES de consultar cualquier otro artefacto.

---

## 1. Identidad del Proyecto

| Campo | Valor |
| :--- | :--- |
| **Nombre** | Pintu Clic |
| **Dominio** | pintuclic.com |
| **Tipo** | E-commerce especializado en pinturas, revestimientos y suministros |
| **Modelo de Negocio** | B2C (clientes particulares) + B2B (clientes empresariales con NIT/RUT) |
| **Panel Interno** | Panel de control para empleados y administradores |
| **Repositorio** | `pintuclic/pintuclic.com` (rama `main`) |
| **Submodulo SDLC** | `.sdlc/` → `DanExl24/multiagent-sdlc-starter` |
| **Estado SDLC** | Gobernanza inicializada — estructura de módulos existente, contratos Zod pendientes |

---

## 2. Stack Tecnológico Confirmado (NO negociable)

### 2.1. Backend (`../backend/`)
| Componente | Tecnología | Versión |
| :--- | :--- | :--- |
| Runtime | Node.js | LTS |
| Framework HTTP | **Express 5** | `^5.2.1` |
| Lenguaje | TypeScript | `^5.9.3` |
| ORM / Data Layer | **Prisma** | `^6.0.0` |
| Validación | **Zod** | `^4.5.4` |
| Testing | **Vitest** | `^3.2.4` |
| Autenticación | JWT (`jsonwebtoken`) + Google OAuth (`google-auth-library`) | — |
| Hashing | `bcrypt` | — |
| Email | `nodemailer` | — |
| Linter | ESLint 10 + typescript-eslint | — |

> ⚠️ **PROHIBIDO proponer** Fastify, NestJS, Kysely, Knex, Sequelize o cualquier ORM/framework alternativo.
> El stack está bloqueado. Si se detecta una mejora necesaria, abrir un RFC formal.

### 2.2. Frontend (`../frontend/`)
| Componente | Tecnología | Versión |
| :--- | :--- | :--- |
| Framework | **Next.js 15** | `^15.4.2` |
| UI Library | **React 19** | `^19.1.0` |
| Lenguaje | TypeScript | `^5.9.3` |
| Estilos | **Tailwind CSS 4** | `^4.1.11` |
| Estado Global | **Zustand 5** | `^5.0.6` |
| Formularios | **React Hook Form** + `@hookform/resolvers` | `^7.x` |
| Validación | **Zod** | `^4.5.4` |
| HTTP Client | **Axios** | `^1.10.0` |
| Iconos | **Lucide React** | `^0.525.0` |
| Testing | **Vitest** + `@vitejs/plugin-react` | `^3.2.4` |

> ⚠️ **PROHIBIDO proponer** Vue 3, Pinia, Vite standalone, ECharts standalone, ni cualquier framework alternativo.
> Para dataviz, usar librerías compatibles con React/Next.js. RFC obligatorio si se propone una.

### 2.3. Base de Datos
| Componente | Tecnología |
| :--- | :--- |
| Motor | **PostgreSQL** |
| Schema | `../bd/sql/schema_pintuclic.sql` |
| Seed | `../bd/sql/seed_pintuclic.sql` |
| Migraciones | Prisma Migrate (`../backend/prisma/schema.prisma`) |

---

## 3. Mapa de Fuentes de Verdad — pintuclic.com → SDLC

> Axioma: Los documentos de `../docs/` y `../bd/` son la fuente de verdad primaria del proyecto.
> Los documentos en `.sdlc/docs/` son el marco SDLC que los referencia y complementa.

### 3.1. Requerimientos y Especificaciones Funcionales (Gate 1 — Product Manager)

| Artefacto SDLC | Fuente de Verdad en pintuclic.com | Descripción |
| :--- | :--- | :--- |
| `docs/01_prd.md` | `../docs/00_SISTEMA/01_ARQUITECTURA/ARQUITECTURA_GENERAL.md` | Visión del sistema, dominios y actores |
| `docs/modules/M01/` | `../docs/02_MODULOS_FUNCIONALES/M01_ESPECIFICACION_CATALOGO.md` | Spec funcional catálogo |
| `docs/modules/M02/` | `../docs/02_MODULOS_FUNCIONALES/M02_ESPECIFICACION_BUSQUEDA.md` | Spec funcional búsqueda |
| `docs/modules/M04/` | `../docs/02_MODULOS_FUNCIONALES/M04_CUENTAS_AUTH_PERFIL.md` | Spec funcional cuentas/auth |
| `docs/modules/M05/` | `../docs/02_MODULOS_FUNCIONALES/M05_ESPECIFICACION_CARRITO.md` | Spec funcional carrito |
| `docs/modules/M08/` | `../docs/02_MODULOS_FUNCIONALES/M08_ESPECIFICACION_ORDEN.md` | Spec funcional órdenes |
| `docs/modules/M17/` | `../docs/01_TRANSVERSALES/M17_PERMISOS_Y_ROLES.md` | Permisos granulares (sin roles rígidos) |
| `docs/modules/M18/` | `../docs/01_TRANSVERSALES/M18_NOTIFICACIONES.md` | Notificaciones transaccionales |
| `docs/modules/M20/` | `../docs/01_TRANSVERSALES/M20_SEGURIDAD_Y_AUDITORIA.md` | Seguridad y auditoría |
| Políticas de negocio | `../docs/01_TRANSVERSALES/POLITICAS/` | Políticas HU-ADM-03, HU-CUE-08, HU-SEG-06 |
| Diagramas de flujo | `../docs/assets/diagrams/` | Diagramas .drawio.png por módulo |

### 3.2. Arquitectura Técnica (Gate 2 — Software Architect)

| Artefacto SDLC | Fuente de Verdad en pintuclic.com | Descripción |
| :--- | :--- | :--- |
| `docs/02_architecture.md` | `../docs/00_SISTEMA/01_ARQUITECTURA/ARQUITECTURA_BACKEND.md` | Arquitectura backend modular |
| Modelo C4 / Topología | `../docs/00_SISTEMA/01_ARQUITECTURA/ARQUITECTURA_GENERAL.md` | Visión general del sistema |
| Trazabilidad modular | `../docs/00_SISTEMA/01_ARQUITECTURA/MATRIZ_TRAZABILIDAD.md` | Matriz de trazabilidad |
| Schema DDL | `../bd/sql/schema_pintuclic.sql` | DDL completo de la base de datos |
| Seed de datos | `../bd/sql/seed_pintuclic.sql` | Datos semilla de referencia |
| Documentación BD | `../bd/docs/DOCUMENTACION_BASE_DATOS.md` | Documentación completa de la BD |
| Diagrama ER | `../bd/assets/ER Pintuclic-Final 1.2.drawio.png` | Diagrama entidad-relación final |
| Prisma Schema | `../backend/prisma/schema.prisma` | Schema Prisma (fuente de verdad ORM) |
| Contratos Zod API | `docs/contracts/` | A generar por Software Architect |
| ADRs | `docs/adrs/` | Decisiones arquitecturales |

### 3.3. Implementación Backend (Gate 3A — Backend Engineer)

| Artefacto SDLC | Ubicación en pintuclic.com | Descripción |
| :--- | :--- | :--- |
| Código fuente backend | `../backend/src/modules/` | Módulos implementados |
| Estructura por módulo | `controllers/`, `services/`, `repositories/`, `dtos/`, `interfaces/`, `__tests__/` | Patrón ya establecido |
| Estándar de incorporación | `../docs/00_SISTEMA/02_GUIAS_Y_ESTANDARES/ESTANDAR_Y_GUIA_INCORPORACION.md` | Guía para agregar nuevos módulos |

### 3.4. Implementación Frontend (Gate 3B — Frontend Engineer)

| Artefacto SDLC | Ubicación en pintuclic.com | Descripción |
| :--- | :--- | :--- |
| Código fuente frontend | `../frontend/src/modules/` | Módulos implementados |
| Design System tokens | `../frontend/src/core/theme/colors.ts` | **Paleta oficial de colores** |
| Guía de colores | `../frontend/src/core/theme/GUIA_COLORES.md` | Guía de uso de la paleta |
| Componentes base | `../frontend/src/core/components/` | Core components (buttons, forms, layout, etc.) |
| API Client | `../frontend/src/core/api/apiClient.ts` | Cliente HTTP centralizado (Axios) |
| Auth Store | `../frontend/src/core/store/authStore.ts` | Store global de autenticación (Zustand) |
| Tipos globales | `../frontend/src/core/types/` | Tipos compartidos |

### 3.5. QA y Walkthroughs

| Artefacto SDLC | Ubicación en pintuclic.com | Descripción |
| :--- | :--- | :--- |
| Plantilla QA | `../docs/00_SISTEMA/03_PLANTILLAS_Y_CHECKLISTS/PLANTILLA_REPORTE_QA_MODULO.md` | Template para reportes QA |
| Checklist cierre | `../docs/00_SISTEMA/03_PLANTILLAS_Y_CHECKLISTS/CHECKLIST_CIERRE_MODULOS.md` | Checklist de cierre por módulo |
| Guía walkthroughs | `../docs/00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_VERSIONADO_Y_WALKTHROUGHS.md` | Cómo versionar walkthroughs |
| Walkthrough template | `.sdlc/walkthroughs/WALKTHROUGH_TEMPLATE.md` | Template estándar SDLC |
| CHANGELOG BD | `../bd/docs/CHANGELOG_DATABASE.md` | Historial de cambios de BD |

### 3.6. Estándares de Git y Versionado

| Protocolo SDLC | Fuente en pintuclic.com | Descripción |
| :--- | :--- | :--- |
| `protocols/GIT_COMMIT_CONVENTION.md` | `../docs/00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_GIT_COMMITS_Y_PUSH.md` | **Ambos deben aplicarse conjuntamente** |
| `protocols/SEMVER_CHANGELOG_PROTOCOL.md` | `../docs/00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_VERSIONADO_Y_WALKTHROUGHS.md` | Versionado SemVer del proyecto |

> ⚠️ **En materia de nomenclatura de commits, tipos permitidos y scopes, la guía del proyecto
> prevalece sobre el protocolo SDLC.** Pintu Clic tiene CI activo (`pr-title-lint.yml`, `version.yml`)
> y versionado de cuatro segmentos: el commit NO lleva prefijo de versión y `feat` exige citar una HU
> satisfecha end-to-end. En lo demás (Stage-Gates, roles, Reglas de Oro), los protocolos SDLC prevalecen.

---

## 4. Registro de Módulos del Sistema (21 Módulos)

> 🗺️ **Inventario y orden de construcción autoritativos:**
> [`../docs/00_SISTEMA/01_ARQUITECTURA/RUTA_DEL_PROYECTO.md`](../docs/00_SISTEMA/01_ARQUITECTURA/RUTA_DEL_PROYECTO.md)
> — grafo de dependencias, 6 olas y camino crítico. **Lectura íntegra obligatoria** antes de codificar.
> Los nombres de esta tabla son los del Product Owner; prohibido renombrarlos.

| Módulo | Nombre | Ola | Scope | Spec | Backend | Frontend | Contratos Zod | Estado |
| :--- | :--- | :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **M01** | Catálogo de Productos | 2 | `m01-catalogo` | ✅ | 🟡 Estructura | 🟡 Estructura | ⚪ | En desarrollo |
| **M02** | Búsqueda, Filtros y Descubrimiento | 3 | `m02-busqueda` | ✅ | 🟡 Estructura | 🟡 Estructura | ⚪ | En desarrollo |
| **M03** | Asesoría y IA (Simulador/Chatbot) | 6 | `m03-asesoria` | ❌ | ⚪ | ⚪ | ⚪ | Pendiente Gate 1 |
| **M04** | Cuentas, Autenticación y Perfil | 3 | `m04-cuentas` | ✅ | 🟡 Estructura | 🟡 Estructura | ⚪ | En desarrollo |
| **M05** | Carrito de Compras | 4 | `m05-carrito` | ✅ | 🟡 Estructura | 🟡 Estructura | ⚪ | En desarrollo |
| **M06** | Precios, Promociones y Descuentos | 5 | `m06-precios` | ❌ | ⚪ | ⚪ | ⚪ | Pendiente Gate 1 |
| **M07** | Checkout y Pago | 5 | `m07-checkout` | ❌ | ⚪ | ⚪ | ⚪ | Pendiente Gate 1 |
| **M08** | Orden de Venta | 4 | `m08-ordenes` | ✅ | 🟡 Estructura | 🟡 Estructura | ⚪ | En desarrollo |
| **M09** | Cumplimiento y Preparación | 4 | `m09-cumplimiento` | ❌ | ⚪ | ⚪ | ⚪ | Pendiente Gate 1 |
| **M10** | Entrega y Transporte | 5 | `m10-entrega` | ❌ | ⚪ | ⚪ | ⚪ | Pendiente Gate 1 |
| **M11** | Postventa (Devoluciones/Reembolsos) | 5 | `m11-postventa` | ❌ | ⚪ | ⚪ | ⚪ | Pendiente Gate 1 |
| **M12** | Facturación | 5 | `m12-facturacion` | ❌ | ⚪ | ⚪ | ⚪ | Pendiente Gate 1 |
| **M13** | Inventario e Integración SAMIT (CSV) | 2 | `m13-inventario` | ❌ | ⚪ | ⚪ | ⚪ | Pendiente Gate 1 |
| **M14** | Patrocinios y Campañas | 6 | `m14-patrocinios` | ❌ | ⚪ | ⚪ | ⚪ | Pendiente Gate 1 |
| **M15** | Atención al Cliente (WhatsApp/FAQ) | 6 | `m15-atencion` | ❌ | ⚪ | ⚪ | ⚪ | Pendiente Gate 1 |
| **M16** | Contenido Institucional | 2 | `m16-contenido` | ❌ | ⚪ | ⚪ | ⚪ | Pendiente Gate 1 |
| **M17** | Administración, Empleados y Permisos | 1 | `m17-permisos` | ✅ | 🟡 Estructura | 🟡 Estructura | ⚪ | En desarrollo |
| **M18** | Notificaciones y Comunicaciones | 3 | `m18-notificaciones` | ✅ | 🟡 Estructura | ⚪ | ⚪ | En desarrollo |
| **M19** | Reportes y Analítica | 6 | `m19-reportes` | ❌ | ⚪ | ⚪ | ⚪ | Pendiente Gate 1 |
| **M20** | Seguridad, Auditoría y Protección de Datos | 1 | `m20-seguridad` | ✅ | 🟡 Estructura | 🟡 Estructura | ⚪ | En desarrollo |
| **M21** | Cotizaciones | 5 | `m21-cotizaciones` | ❌ | ⚪ | ⚪ | ⚪ | Pendiente Gate 1 |

**Leyenda:** ✅ Completo | 🟡 Estructura inicial (carpetas + archivos base) | ⚪ No iniciado | ❌ No existe

**Resumen:** 8 módulos con spec funcional y estructura de código · **13 pendientes de Gate 1** (sin especificación funcional).

> ⛔ **Un módulo con spec ❌ no se implementa.** La especificación funcional es entregable del
> Product Manager Lead en Gate 1. Un agente que reciba la orden de codificar uno de los 13 módulos
> pendientes DEBE detenerse y reportarlo.
>
> ⚠️ El diagrama de la ruta tiene cuatro inconsistencias registradas (ciclo `M18 → M04 → M07 → M08 → M18`,
> módulos de Ola 4 que dependen de Ola 5, `M16` sin conexiones y `classDef` sin aplicar). El Product Owner
> las corregirá; hasta entonces la ruta se respeta tal como está y se reporta cualquier bloqueo.

---

## 5. Actores del Sistema (RBAC de Pintu Clic)

> Reemplaza la tabla genérica de `docs/01_prd.md`. Esta es la definición oficial.

| Actor | Descripción | Permisos |
| :--- | :--- | :--- |
| **Visitante (Anónimo)** | Usuario no autenticado | Solo exploración de catálogo, inicio de registro/login |
| **Cliente B2C** | Usuario con cuenta personal verificada por email o Google | Compras, carrito, órdenes, perfil |
| **Cliente B2B** | Empresa con NIT/RUT validado y aprobado por admin | Precios mayoristas, condiciones comerciales especiales |
| **Empleado** | Personal interno con permisos individuales (NO roles rígidos) | Permisos atómicos específicos (`hasPermission('PERMISO')`) |
| **Administrador** | Control total del sistema | Configuración operativa y gobernanza de cuentas |
| **Sistema** | Procesos automáticos | Triggers de auditoría, envío de correos vía M18 |

> ⚠️ **Regla crítica de permisos:** PROHIBIDO codificar condicionales basados en roles hardcodeados
> (`if user.role == 'admin'`). Se valida el **permiso atómico específico** (`hasPermission('X')`).
> Ver: `../docs/01_TRANSVERSALES/M17_PERMISOS_Y_ROLES.md`

---

## 6. Principios de Dominio de Pintu Clic (Complementan las 11 Reglas de Oro)

1. **Desacoplamiento de notificaciones:** Ningún módulo envía emails directamente por SMTP.
   Los módulos emiten eventos que M18 procesa de forma asíncrona.
   Ver: `../docs/01_TRANSVERSALES/M18_NOTIFICACIONES.md`

2. **Trazabilidad e inmutabilidad:** Toda acción administrativa o cambio de estado sensible
   se registra en la bitácora de auditoría con fecha, actor, IP y valor modificado.
   Ver: `../docs/01_TRANSVERSALES/M20_SEGURIDAD_Y_AUDITORIA.md`

3. **Permisos estrictamente individuales:** No existen roles rígidos preestablecidos para empleados.
   Cada empleado tiene un conjunto de permisos atómicos asignados individualmente.
   Ver: `../docs/01_TRANSVERSALES/M17_PERMISOS_Y_ROLES.md`

4. **Estructura modular espejo:** Backend y frontend siguen la misma numeración de módulos
   (`m01-catalogo`, `m02-busqueda`, etc.) para facilitar la trazabilidad entre capas.

5. **Envelope canónico de respuesta (heredado del SDLC):**
   ```typescript
   // Éxito
   { success: true, data: T, message?: string }
   // Error
   { success: false, error: { code: string, message: string, details?: unknown } }
   ```

---

## 7. Protocolo de Lectura para Agentes IA — Orden Obligatorio

Al iniciar una sesión en este proyecto, el orden de lectura es:

```
1. AGENTS.md                          ← Manual rector de la metodología SDLC
2. PINTUCLIC_CONTEXT.md               ← Este archivo (identidad, stack, mapeo de docs)
3. .workflow/current_state.json        ← Estado actual del ciclo de vida
4. multiAgents/00_orchestrator/PROJECT_STATUS.md  ← Semáforo de módulos
5. multiAgents/[tu_rol]/ROLE.md        ← Manual de tu rol específico
6. Fuente de verdad relevante en ../docs/ o ../bd/ según la tarea
```
