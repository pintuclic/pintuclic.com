# 📄 PLANTILLA: Product Requirements Document (PRD)

> **Documento:** `docs/01_prd.md`  
> **Versión:** 1.0  
> **Autor:** Product Manager Lead  
> **Estado:** [BORRADOR / REVISIÓN / APROBADO]

---

## 1. Visión y Objetivos del Producto
- **Problema de Negocio:** [Descripción del dolor u oportunidad a resolver]
- **Solución Propuesta:** [Enfoque funcional de la plataforma]
- **Objetivos SMART:**
  1. [Objetivo 1 - Medible y acotado en tiempo]
  2. [Objetivo 2 - Medible y acotado en tiempo]

## 2. Marco Legal, Normativo y Regulatorio
- **Normativa / Compliance de Dominio:** [Leyes, estándares, regulaciones aplicables al sector (ej. GDPR, HIPAA, PCI-DSS, regulaciones locales)]
- **Reglas de Retención y Privacidad:** [Lineamientos de auditoría y manejo de datos sensibles]

## 3. Matriz de Actores y Roles (RBAC)
- `admin_general`: [Privilegios de configuración global y tenant management]
- `manager / supervisor`: [Gestión operativa de recursos y aprobaciones]
- `operador / usuario_base`: [Operaciones diarias de lectura y captura de datos]
- `auditor`: [Lectura transversal de registros y trazabilidad]

## 4. Desglose de Módulos y Reglas de Negocio
*(Para cada uno de los módulos aplicables)*
### Módulo [XX]: [Nombre del Módulo]
- **Propósito:** [Misión del módulo]
- **Actores involucrados:** [Roles con acceso]
- **Reglas de Negocio Inmutables (RN):**
  - RN-XX-01: [Regla estricta 1]
  - RN-XX-02: [Regla estricta 2]

## 5. Catálogo de Historias de Usuario (HUs)
### HU-[MODULO]-[NUM]: [Título de la Historia]
- **Como:** [Rol de usuario]
- **Quiero:** [Acción o necesidad específica]
- **Para:** [Beneficio o resultado de valor esperado]
- **Criterios de Aceptación (Gherkin):**
  ```gherkin
  Escenario 1: [Flujo exitoso / Happy Path]
    Dado que [condición previa válida]
    Cuando [el usuario ejecuta la acción]
    Entonces [el sistema responde con éxito y persiste los datos]

  Escenario 2: [Flujo alternativo / Regla de negocio denegada]
    Dado que [condición restrictiva o estado inmutable]
    Cuando [el usuario intenta modificar la entidad]
    Entonces [el sistema bloquea la acción con error 409/403 e informa el motivo]
  ```

## 6. Requisitos No Funcionales (NFRs)
- **Seguridad y Privacidad:** Aislamiento estricto multi-tenant por token JWT, Anti-IDOR, encriptación en reposo y en tránsito.
- **Rendimiento y Tiempos de Respuesta:** Latencia p95 < 200ms para operaciones OLTP estándar.
- **Calidad de Tipado:** Cero uso de `any` (verificado con AST parser).
- **Compatibilidad y Dispositivos:** Responsive Web SPA adaptada a resoluciones de escritorio y móviles.

## 7. Criterio de Aprobación (Stage-Gate 1)
- [ ] Entrevista o requerimientos alineados con el Director Humano.
- [ ] Historias de Usuario bajo estándar INVEST con BDD Gherkin.
- [ ] Revisado y aprobado formalmente por el Director Humano.
