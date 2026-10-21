# 📋 PLANTILLA: Especificación de Criterios de Aceptación ATDD (Three Amigos)

> **Ubicación del Artefacto:** `docs/modules/[XX_MODULO]/01_ATDD_SPEC.md`  
> **Versión:** 1.0.0  
> **Módulo:** [XX_NOMBRE_DEL_MODULO]  
> **Participantes de la Mesa ATDD:**
> - 📋 **Product Manager:** [Nombre / Agente]
> - 🏛️ **Software Architect:** [Nombre / Agente]
> - 🧪 **QA Lead & Security Director:** [Nombre / Agente]

---

## 1. Declaración de Alcance y Reglas del Negocio Inmutables
- **Historia de Usuario Principal:** `HU-[XX]-[YY]` — [Título conciso de la HU bajo formato Como / Quiero / Para].
- **Reglas Normativas Vinculantes:** `RN-DOM-[XX]`, `RN-MOD-[XX]`.
- **Fronteras Operativas:**
  - *In-Scope:* [Comportamientos explícitamente requeridos].
  - *Out-of-Scope:* [Comportamientos expresamente excluidos de esta iteración].

---

## 2. Matriz de Casos de Aceptación (Estándar SQA - 8 Atributos)

| ID Caso | Nombre del Caso | Requerimiento Asociado | Precondición | Descripción / Estímulo | Resultado Esperado | Postcondición | Orden Ejecución |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CA-01** | Happy Path Nominal | `HU-[XX]-[01]` | Usuario autenticado con rol X | Envío de payload válido con campos requeridos | HTTP 201 Created con Envelope `{ success: true, data }` | Registro persistido en BD | 1 |
| **CA-02** | Validación Límite (BVA) | `HU-[XX]-[01]` | Sesión activa | Envío de campo numérico o string en su valor frontera | Aceptación exitosa o error semántico 400 | Sin corrupción de datos | 2 |
| **CA-03** | Rechazo por Regla Inmutable | `RN-MOD-[02]` | Periodo cerrado / estado terminal | Intento de mutación o borrado de registro | HTTP 409 Conflict / 403 Forbidden | Transacción revertida (Rollback) | 3 |
| **CA-04** | Aislamiento Multi-Tenant | `RN-SEC-[01]` | Token JWT de Tenant A | Petición hacia recurso perteneciente a Tenant B | HTTP 404 Not Found (Anti-IDOR) | Acceso denegado y auditado | 4 |

---

## 3. Escenarios Ejecutables BDD (Sintaxis Gherkin)

### Escenario 1: [Flujo Nominal Exitoso]
```gherkin
Característica: [Nombre del Módulo o Funcionalidad]
  Como [Rol de Usuario]
  Quiero [Acción que realiza]
  Para [Beneficio de negocio]

  Escenario: Ejecución exitosa de [Acción]
    Dado que el usuario tiene el rol "[ROL_PERMITIDO]"
    Y existe el registro "[ENTIDAD]" en estado "[ESTADO_VALIDO]"
    Cuando envía una solicitud con los datos válidos
    Entonces el sistema responde con código HTTP 200/201
    Y el cuerpo de la respuesta contiene el envelope "{ success: true }"
    Y el registro queda actualizado con la marca temporal correspondiente.
```

### Escenario 2: [Violación de Valor Límite o Formato Inválido]
```gherkin
  Escenario: Rechazo de solicitud con payload fuera de límites
    Dado que el usuario tiene sesión activa
    Cuando envía el campo "[CAMPO_CRITICO]" con un valor fuera del rango permitido
    Entonces el middleware Zod intercepta la solicitud
    Y responde con código HTTP 400 Bad Request
    Y detalla el campo infractor sin exponer trazas internas del servidor.
```

### Escenario 3: [Intento de Violación de Periodo o Estado Terminal]
```gherkin
  Escenario: Bloqueo de modificación sobre estado cerrado
    Dado que el registro se encuentra en estado inmutable "[ESTADO_CERRADO]"
    Cuando el usuario intenta invocar la mutación "[ACCION_MUTACION]"
    Entonces el servicio de dominio rechaza la operación
    Y responde con código HTTP 409 Conflict o 403 Forbidden
    Y no se produce ningún cambio en la base de datos.
```

---

## 4. Checklist de Testabilidad (Firma de los Three Amigos)

- [ ] **Independencia (INVEST):** La historia puede implementarse y probarse sin bloqueos externos no resueltos.
- [ ] **Determinismo:** Todos los resultados esperados son binarios y reproducibles (Pass / Fail claro).
- [ ] **Contrato Tipado Viable:** El Arquitecto confirma que el esquema Zod y el DDL relacional soportan todos los campos requeridos.
- [ ] **Estrategia de Dobles de Prueba:** QA y Backend acuerdan qué dependencias serán aisladas con Mocks / Fixtures en pruebas unitarias.

### Firmas de Aprobación de la Mesa ATDD:
- **Product Manager Lead:** `[APROBADO]` el AAAA-MM-DD
- **Software Architect:** `[APROBADO]` el AAAA-MM-DD
- **QA Lead & Security Director:** `[APROBADO]` el AAAA-MM-DD
