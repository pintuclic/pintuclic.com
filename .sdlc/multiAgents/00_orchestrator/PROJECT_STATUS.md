> **Proyecto:** Pintu Clic (`pintuclic.com`)
> **Versión Actual:** `v0.2.0` 🥇 (Primer feature del sistema — M20 parcial)
> **Versión Objetivo:** `v0.3.0` (M17 Permisos, cerrando la Ola 1)
> **Última Actualización:** 2026-10-20
> **Fase Activa:** GATE 0 → M20 cerrado en Gate 3B · **seleccionando el siguiente módulo: M17**
> **Agente en Turno:** `00_orchestrator` · **Módulo en curso: ninguno** (siguiente: M17)
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
| **Frontend M20** | Frontend Engineer | SPA Next.js + Design System + Walkthrough | 🟡 PARCIAL — solo infraestructura, 19/19 Vitest | Gate 3B | ✅ **Firmado: 3B de infraestructura, sin revisión visual** |
| **QA Forense M20** | QA Lead & Security | Cuadrantes Q1-Q4 + Zero ANY + Fichas Bugs | 🔵 **DIFERIDO** — se certifica junto a M17 y M04 | Gate 4 | Diferido por acuerdo |
| **Release M??** | DevOps Engineer | Docker + Seeders + Release SemVer `v0.2.0` | ⚪ EN ESPERA | Gate 5 | Pendiente Gate 4 |
| **Kaizen M??** | Comité de Calidad | Ishikawa + Pareto 80/20 + Matriz Priorización | ⚪ EN ESPERA | Gate 6 | Pendiente Gate 5 |

*Leyenda:* 🟢 Completado | 🟡 En Proceso / Parcial | 🔴 Bloqueado (Veto) | ⚪ No Iniciado

---

## 2. Estado de Módulos por Capa (21 Módulos)

> 🗺️ **Orden de construcción y dependencias:** [`RUTA_DEL_PROYECTO.md`](../../../docs/00_SISTEMA/01_ARQUITECTURA/RUTA_DEL_PROYECTO.md)
> — lectura íntegra obligatoria. Antes de iniciar un módulo, verificar en esta tabla que **todos sus
> predecesores del grafo** estén certificados. Si no lo están: detener y reportar.

### Ola 1 — Seguridad y Administración (Núcleo Base)

| Módulo | Spec | Contratos Zod | Backend | Frontend | Tests Vitest | QA | Walkthrough |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **M20 — Seguridad y Auditoría** | ✅ | ✅ | ✅ | 🟡 | ✅ | 🔵 | ✅ |
| **M17 — Admin, Empleados y Permisos** | ✅ | ⚪ | 🟡 | 🟡 | ⚪ | ⚪ | ⚪ |

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
| **M04 — Cuentas, Autenticación y Perfil** | ✅ | ⚪ | 🟡 | 🟡 | ⚪ | ⚪ | ⚪ |
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
