# ⛔ SUBROL ELIMINADO — Project Board & Issue Lifecycle Automator

> **Estado:** ELIMINADO — No aplica para Pintu Clic  
> **Fecha de eliminación:** 2026-10-20  
> **Motivo:** Este proyecto no utiliza GitHub Projects V2 ni sincronización automática de tableros.

---

Este subrol ha sido **retirado del kit de DevOps** para Pintu Clic.

Las skills de sincronización con GitHub Projects, creación automática de Issues desde documentación
y gestión de tableros ágiles mediante GraphQL **no forman parte del flujo de trabajo de este repositorio**.

## Lo que aplica en su lugar

La trazabilidad de módulos y el estado del ciclo de vida se gestiona mediante los artefactos en disco:

| Artefacto | Ubicación | Propósito |
| :--- | :--- | :--- |
| **Semáforo de módulos** | [`00_orchestrator/PROJECT_STATUS.md`](file:///multiAgents/00_orchestrator/PROJECT_STATUS.md) | Estado por módulo (spec / backend / frontend / contratos / tests / QA) |
| **Estado activo** | [`.workflow/current_state.json`](file:///.workflow/current_state.json) | Fase y Gate en curso |
| **Bitácora por agente** | `[agente]/WORKLOG.md` | Registro histórico de acciones del rol |
| **Especificaciones funcionales** | [`../docs/02_MODULOS_FUNCIONALES/`](file:///docs/02_MODULOS_FUNCIONALES/) | HUs, RFs y CAs por módulo |

## Aviso de dominio para otros agentes

> ⛔ Los roles Backend Engineer, Frontend Engineer y QA Security Tester tienen **PROHIBIDO ABSOLUTO**
> crear workflows de GitHub Actions, Issues automáticos, o cualquier configuración relacionada con GitHub Projects.
> Si detectas una necesidad de automatización de CI/CD o tableros, repórtala al DevOps designado
> mediante un ticket en `multiAgents/06_devops_release/WORKLOG.md`.
