# 📄 PLANTILLA: 01_SPEC_FUNCIONAL — [Nombre del Módulo]

> **Módulo:** [XX. Nombre del Módulo]  
> **Dominio:** [Autenticación / Core / Operaciones / Facturación / Reportes / Analytics]  
> **Responsable:** Product Manager Lead  
> **Estado:** [BORRADOR / REVISIÓN / APROBADO]

---

## 1. Visión y Propósito del Módulo
- **¿Qué es este módulo?:**  
  [Descripción clara y sintética del módulo en el contexto del sistema].
- **¿Qué vacío del sistema llena?:**  
  [Qué problema operativo resuelve o qué proceso manual sustituye].
- **Objetivos de Negocio:**  
  1. [Objetivo 1]
  2. [Objetivo 2]

---

## 2. Mapa Topológico de Dependencias
```mermaid
graph LR
    subgraph Módulos Requeridos (Entradas)
        REQ1[Módulo XX]
        REQ2[Módulo YY]
    end

    MOD[Módulo Actual: XX]

    subgraph Módulos que Alimenta (Salidas)
        OUT1[Módulo AA]
        OUT2[Módulo BB]
    end

    REQ1 --> MOD
    REQ2 --> MOD
    MOD --> OUT1
    MOD --> OUT2
```

- **Dependencias Entrantes:**  
  - *Módulo XX:* [Para qué lo necesita].
- **Dependencias Salientes:**  
  - *Módulo YY:* [Qué información le suministra].

---

## 3. Matriz de Actores y Permisos (RBAC)

| Rol | Ver / Consultar | Crear / Registrar | Modificar | Anular / Eliminar |
| :--- | :---: | :---: | :---: | :---: |
| `admin_general` | [Sí/No] | [Sí/No] | [Sí/No] | [Sí/No] |
| `manager` | [Sí/No] | [Sí/No] | [Sí/No] | [Sí/No] |
| `operador` | [Sí/No] | [Sí/No] | [Sí/No] | [Sí/No] |
| `auditor` | [Sí/No] | [Sí/No] | [Sí/No] | [Sí/No] |

---

## 4. Reglas de Negocio Inmutables (RN)
- **RN-[MOD]-01:** [Descripción de la regla inmutable].
- **RN-[MOD]-02:** [Descripción de la regla inmutable].
- **RN-[MOD]-03 (Cumplimiento Regulatorio / Legal):** [Norma, estándar o política aplicable de dominio].
