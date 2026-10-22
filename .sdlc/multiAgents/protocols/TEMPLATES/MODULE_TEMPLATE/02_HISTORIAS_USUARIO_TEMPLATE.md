# 📋 PLANTILLA: 02_HISTORIAS_USUARIO — [Nombre del Módulo]

> **Módulo:** [XX. Nombre del Módulo]  
> **Responsable:** Product Manager Agent  
> **Estándar:** INVEST + BDD (Given-When-Then)

---

## 1. Requisitos Funcionales (RF)
- **RF-[MOD]-01:** El sistema debe permitir a [rol] realizar [acción].
- **RF-[MOD]-02:** El sistema debe validar que [condición].

---

## 2. Requisitos No Funcionales (RNF)
- **RNF-[MOD]-01 (Rendimiento):** El tiempo de procesamiento de la operación no debe superar los [X] ms.
- **RNF-[MOD]-02 (Seguridad):** Se debe aplicar prevención anti-IDOR mediante validación del `tenant_id` en sesión.

---

## 3. Catálogo Exhaustivo de Historias de Usuario (HUs)

### HU-[MOD]-01: [Título de la Historia de Usuario]
- **Como:** [Rol de usuario]
- **Quiero:** [Acción o necesidad en el sistema]
- **Para:** [Beneficio o valor de negocio]

#### Criterios de Aceptación (Gherkin):
```gherkin
Escenario 1: Flujo Exitoso Principal
  Dado que [condición previa del sistema o usuario]
  Cuando [el usuario ejecuta la acción con datos válidos]
  Entonces [el sistema guarda el estado y retorna respuesta 200/201]

Escenario 2: Validación de Datos Inválidos
  Dado que [el usuario introduce un dato fuera de rango o formato erróneo]
  Cuando [intenta enviar el formulario]
  Entonces [el sistema rechaza con código 422 y muestra mensaje específico]

Escenario 3: Bloqueo por Regla de Negocio
  Dado que [condición restrictiva, ej. periodo cerrado]
  Cuando [el usuario intenta realizar la acción]
  Entonces [el sistema bloquea con código 409 o 403 e informa el motivo]
```

---

### HU-[MOD]-02: [Siguiente Historia de Usuario]
*(Repetir estructura para cada HU del módulo)*
