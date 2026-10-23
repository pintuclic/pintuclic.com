> **Última Actualización:** 2026-10-22
> **Fase Activa:** FASE 0 GOBERNANZA — **M04 cerrado con release `v0.6.1` (Gate 5 firmado por el Director Humano el 2026-10-22)**. Esperando la selección del siguiente módulo.
> **Última entrega:** `v0.6.1` — M04 Cuentas, Autenticación y Perfil validado contra PostgreSQL real y certificado por QA (341/341 pruebas). Integrado en `main` vía PR #10.
> **Deuda abierta de M17:** ✅ **Cerrados y certificados por QA** en `v0.3.2` y `v0.3.3`. Resuelta persistencia relacional con modelo Prisma y eliminación de arrays en memoria (Directiva #10).
> **Agente en Turno:** `00_orchestrator` · **Módulo en curso: ninguno** (M04 cerrado en `v0.6.1`). **Salto de ola autorizado por el Director Humano (2026-10-21):** M04 se construye antes que M18 y antes de cerrar la Ola 2; M18 se incorpora después desacoplado mediante `NotificacionesPort`.
> **Alcance del Sistema:** **21 módulos en 6 olas** — 8 con spec, 13 pendientes de Gate 1
> **Ruta Maestra:** 🗺️ [`RUTA_DEL_PROYECTO.md`](../../../docs/00_SISTEMA/01_ARQUITECTURA/RUTA_DEL_PROYECTO.md) (lectura íntegra obligatoria)
> **Contexto Completo:** Ver [`PINTUCLIC_CONTEXT.md`](../../PINTUCLIC_CONTEXT.md)

---

## 1. Semáforo de Fases (Stage-Gates) — Estado Global

| Fase | Agente Responsable | Entregable Clave | Estado | Gate | Aprobación Humana |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **00. Gobernanza** | Orquestador | Estructura SDLC, stack confirmado, mapa de docs | 🟢 COMPLETADO | Gate 0 | ✅ Aprobado |
| **M20. PRD & Reglas** | Product Manager Lead | Contratos formales BDD Gherkin por módulo | 🟢 COMPLETADO — 5 de 6 HU, 36 escenarios BDD | Gate 1 | ✅ Aprobado |
| **Arquitectura M20** | Software Architect | Contratos Zod API-First (`docs/contracts/`) | 🟢 COMPLETADO — contrato + 4 ADRs, sin cambios de DDL | Gate 2 | ✅ Aprobado |
| **Backend M20** | Backend Engineer | API REST tipada + Lógica + Tests Vitest 100% | 🟢 COMPLETADO — 32 archivos, 36/36 Vitest | Gate 3A | ✅ Pase continuo |
| **Frontend M20** | Frontend Engineer | SPA Next.js + Design System + Walkthrough | 🟢 COMPLETADO — infraestructura core y tokens | Gate 3B | ✅ **Firmado: 3B de infraestructura** |
| **M17. PRD & Reglas** | Product Manager Lead | 7 HU INVEST, 47 BDD Gherkin, Diagramas Mermaid, DoR | 🟢 COMPLETADO | Gate 1 | ✅ Aprobado |
| **Arquitectura M17** | Software Architect | Contratos Zod (`m17-permisos.contract.ts`) + 3 ADRs | 🟢 COMPLETADO | Gate 2 | ✅ Aprobado |
| **Backend M17** | Backend Engineer | API REST tipada + Permisos en DB + Tests Vitest | 🟢 COMPLETADO — 32 tests Vitest, walkthrough emitido | Gate 3A | ✅ Aprobado |
| **Frontend M17** | Frontend Engineer | Vistas Admin Mockup + Permisos + Clientes + Config | 🟢 COMPLETADO — 47 tests Vitest, build limpio | Gate 3B | ✅ **Firmado Gate 3B** |
| **QA Forense M17** | QA Lead & Security | Cuadrantes Q1-Q4 + Zero ANY + Auditoría Determinista | 🟢 COMPLETADO | Gate 4A | ✅ **Certificado (v0.3.1)** |
| **Release M17** | DevOps Engineer | Docker + Seeders + Release SemVer `v0.3.1` | 🟢 AUTORIZADO | Gate 5 | ✅ Listo para release |
| **M04. PRD & Reglas** | Product Manager Lead | 10 HU INVEST, 94 BDD Gherkin, 26 RN-CUE, Diagramas Mermaid | 🟢 COMPLETADO — firmado con la reserva de la mesa ATDD subsanada | Gate 1 | ✅ **Firmado (2026-10-21)** |
| **Arquitectura M04** | Software Architect | Contrato Zod (`m04-cuentas.contract.ts` 16/16 PASS) + 4 ADRs + DDL v4.2 / BD v3.0 (53 tablas) + Prisma + DTOs/puertos | 🟢 COMPLETADO | Gate 2 | ✅ **Firmado (2026-10-21)** |
| **Backend M04** | Backend Engineer | API REST tipada + Lógica 10 HUs + Repositorios Prisma + Tests Vitest | 🟢 COMPLETADO — 205/205 Vitest en v0.6.1 | Gate 3A | ✅ **Certificado (v0.4.1)** |
| **Frontend M04** | Frontend Engineer | Vistas de cuentas, perfil y administración de empresas | 🟢 COMPLETADO — 136/136 Vitest, build 17/17 | Gate 3B | ✅ **Firmado (v0.6.0)** |
| **QA Forense M04** | QA Lead & Security | 341/341 pruebas + Zero ANY + fidelidad visual contra VISTAS.pdf | 🟢 COMPLETADO — E2E y k6 ejecutados por otro agente sin evidencia registrada (declarado por el Director) | Gate 4A | ✅ **Certificado (v0.6.1)** |
| **Release M04** | Orquestador | Release SemVer `v0.6.1` + merge a `main` (PR #10) | 🟢 COMPLETADO | Gate 5 | ✅ **Firmado (2026-10-22)** |

*Leyenda:* 🟢 Completado | 🟡 En Proceso / Parcial | 🔴 Bloqueado (Veto) | ⚪ No Iniciado

---

## 2. Estado de Módulos por Capa (21 Módulos)

> 🗺️ **Orden de construcción y dependencias:** [`RUTA_DEL_PROYECTO.md`](../../../docs/00_SISTEMA/01_ARQUITECTURA/RUTA_DEL_PROYECTO.md)
> — lectura íntegra obligatoria. Antes de iniciar un módulo, verificar en esta tabla que **todos sus
> predecesores del grafo** estén certificados. Si no lo están: detener y reportar.

### Ola 1 — Seguridad y Administración (Núcleo Base)

| Módulo | Spec | Contratos Zod | Backend | Frontend | Tests Vitest | QA | Walkthrough |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **M20 — Seguridad y Auditoría** | ✅ | ✅ | ✅ | ✅ | ✅ | 🔵 | ✅ |
| **M17 — Admin, Empleados y Permisos** | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 | ✅ |

### Ola 2 — Catálogo y Abastecimiento

| Módulo | Spec | Contratos Zod | Backend | Frontend | Tests Vitest | QA | Walkthrough |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **M13 — Inventario / SAMIT (CSV)** | ❌ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| **M01 — Catálogo de Productos** | ✅ | ⚪ | 🟡 | 🟡 | ⚪ | ⚪ | ⚪ |
| **M16 — Contenido Institucional** | ❌ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |

### Ola 3 — Clientes, Búsqueda y Notificaciones

| Módulo | Spec | Contratos Zod | Backend | Frontend | Tests Vitest | QA | Walkthrough |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **M18 — Notificaciones y Comunicaciones** | ✅ | ⚪ | 🟡 | ⚪ | ⚪ | ⚪ | ⚪ |
| **M04 — Cuentas, Autenticación y Perfil** | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 | ✅ |
| **M02 — Búsqueda y Descubrimiento** | ✅ | ⚪ | 🟡 | 🟡 | ⚪ | ⚪ | ⚪ |

### Ola 4 — Intención y Operación

| Módulo | Spec | Contratos Zod | Backend | Frontend | Tests Vitest | QA | Walkthrough |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **M05 — Carrito de Compras** | ✅ | ⚪ | 🟡 | 🟡 | ⚪ | ⚪ | ⚪ |
| **M08 — Orden de Venta** 🔴 | ✅ | ⚪ | 🟡 | 🟡 | ⚪ | ⚪ | ⚪ |
| **M09 — Cumplimiento y Preparación** | ❌ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |

### Ola 5 — Transacciones y Postventa

| Módulo | Spec | Contratos Zod | Backend | Frontend | Tests Vitest | QA | Walkthrough |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **M06 — Precios y Promociones** | ❌ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| **M07 — Checkout y Pago** | ❌ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| **M21 — Cotizaciones** | ❌ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| **M10 — Entrega y Transporte** | ❌ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| **M12 — Facturación** | ❌ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| **M11 — Postventa** | ❌ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |

### Ola 6 — Valor Añadido, Analítica y Asesoría

| Módulo | Spec | Contratos Zod | Backend | Frontend | Tests Vitest | QA | Walkthrough |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **M03 — Asesoría y IA** | ❌ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| **M19 — Reportes y Analítica** | ❌ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| **M14 — Patrocinios y Campañas** | ❌ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| **M15 — Atención al Cliente** | ❌ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |

**Leyenda:** ✅ Completo | 🟡 Estructura inicial | ⚪ No iniciado | ❌ Spec inexistente | 🔴 Nodo crítico

**Resumen:** 8 de 21 módulos con spec y estructura · **13 pendientes de Gate 1** (sin especificación funcional).

> ⛔ Un módulo con spec ❌ **no se implementa**: la especificación es entregable del Product Manager
> en Gate 1. El agente que reciba la orden de codificarlo debe detenerse y reportar.
>
> 🔴 **M08** es el nodo más crítico: habilita 6 módulos (M09, M10, M11, M12, M18, M19).
>
> Las especificaciones funcionales completas viven en `../docs/02_MODULOS_FUNCIONALES/`
> y `../docs/01_TRANSVERSALES/`. Ver mapa en `PINTUCLIC_CONTEXT.md` §3.1.

---

## 3. Historial de Decisiones de Versión (SemVer)

- **v0.1.0 (2026-10-20):** Inicialización de la arquitectura multiagente SDLC sobre pintuclic.com.
  Stack confirmado (Express 5 + Prisma 6 + Next.js 15 + React 19 + Zustand 5 + Zod 4 + Vitest 3).
  `PINTUCLIC_CONTEXT.md` creado como mapa de fuentes de verdad.
  Ruta de construcción del Product Owner registrada: el inventario pasa de 8 a **21 módulos en 6 olas**.
  Nombres alineados a los del PO (M08 pasa de "Órdenes y Envíos" a "Orden de Venta": los envíos son M10).
  Próximo hito: definir módulo inicial para primer ciclo SDLC completo.

---

## 4. Próxima Acción Recomendada (Director Humano)

> ✅ **M20 cerrado en Gate 3B.** Publicada la versión **v0.2.0**, primer feature del sistema.
>
> **Siguiente módulo acordado: `M17` — Administración, Empleados y Permisos**, que cierra la Ola 1.
> Es el único predecesor certificado que tiene (M20), y aporta lo que a M20 le falta: el catálogo de
> permisos atómicos que el validador central consulta, y el almacén de parámetros de `HU-ADM-05` del
> que depende `RF-SEG-02-07`.
>
> Después, **`M04` — Cuentas, Autenticación y Perfil**, que aporta el login. Solo entonces M20 podrá
> ejercitarse end-to-end y los tres se certificarán juntos en Gate 4.
>
> 🎨 **En paralelo:** el Líder Frontend puede empezar ya a montar los componentes base en
> `frontend/src/core/components/`. No depende de ningún gate: M20 dejó el cliente HTTP, el store de
> sesión, los DTOs y el mapeo de errores listos para que las pantallas se apoyen en ellos.

---

## 5. Decisiones Pendientes del Product Owner

| # | Asunto | Impacto | Estado |
| :--- | :--- | :--- | :--- |
| 1 | Ciclo `M18 → M04 → M07 → M08 → M18` en el grafo | Semántica de flechas mezclada (orden de construcción vs. flujo de eventos) | 🛑 Pendiente |
| 2 | `M05` y `M08` (Ola 4) dependen de `M06`, `M07` y `M21` (Ola 5) | **La Ola 4 no puede cerrarse sin construir antes 3 módulos de la Ola 5** | 🛑 Pendiente |
| 3 | `M16` sin dependencias ni dependientes | Indefinido si es independiente o si falta trazar su relación | 🛑 Pendiente |
| 4 | `classDef` de dominio declarados sin aplicar | Sin efecto visual; falta la taxonomía de dominios | 🛑 Pendiente |
| 5 | Especificación funcional de 13 módulos | Ninguno de los 13 puede implementarse sin pasar Gate 1 | 🛑 Pendiente |

> Detalle completo en la [Sección 7 de `RUTA_DEL_PROYECTO.md`](../../../docs/00_SISTEMA/01_ARQUITECTURA/RUTA_DEL_PROYECTO.md).
> La #2 es la más urgente: define si `M06` baja a la Ola 4 o si `M08` sube a la Ola 5.
