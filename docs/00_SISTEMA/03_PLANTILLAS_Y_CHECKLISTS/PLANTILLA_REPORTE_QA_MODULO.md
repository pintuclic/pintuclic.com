# INFORME DE PRUEBAS DE CALIDAD (QA TEST REPORT)

**Proyecto:** PINTU CLIC — Plataforma de Comercio Electrónico  
**Módulo Evaluado:** [MXX - Nombre del Módulo, ej: M04 Cuentas, Autenticación y Perfil]  
**Sprint:** [Sprint X]  
**Responsables QA:** [Nombre del Redactor / Analista QA Tester]  
**Fecha de Ejecución:** [DD/MM/AAAA]  
**Ambiente de Pruebas:** [Local / Staging / Dev] — Base de Datos: [PostgreSQL / SQLite]  
**Estado General de Calidad:** [ ✅ APROBADO (GO) / ⚠️ APROBADO CON OBSERVACIONES / ❌ RECHAZADO (NO-GO) ]

---

## 1. RESUMEN EJECUTIVO DE EJECUCIÓN

| Métrica de Calidad | Total | Porcentaje |
| :--- | :---: | :---: |
| **Historias de Usuario Cubiertas** | [N] | 100% |
| **Casos de Prueba Diseñados** | [N] | 100% |
| **Casos de Prueba Exitosos (Passed)** | [N] | [%] |
| **Casos de Prueba Fallidos (Failed)** | [N] | [%] |
| **Casos Bloqueados / No Ejecutados** | [N] | [%] |
| **Defectos Críticos (Bugs Bloqueantes)** | [N] | - |

### Conclusión Ejecutiva
[Breve párrafo describiendo el estado de madurez del módulo, estabilidad de los endpoints, apego a los diagramas de flujo y cumplimiento de criterios de aceptación.]

---

## 2. ALCANCE Y MATRIZ DE HISTORIAS DE USUARIO EVALUADAS

| ID Historia | Título de la Historia | Prioridad | Endpoints Involucrados | Resultado QA |
| :--- | :--- | :---: | :--- | :---: |
| **HU-[MOD]-01** | [Título de la HU 1] | Must / Should | `POST /api/v1/...` | ✅ PASSED |
| **HU-[MOD]-02** | [Título de la HU 2] | Must / Should | `GET /api/v1/...`, `PUT /api/v1/...` | ⚠️ OBSERVACIÓN |
| **HU-[MOD]-0N** | [Título de la HU N] | Must / Could | `DELETE /api/v1/...` | ❌ FAILED |

---

## 3. ESPECIFICACIÓN Y EJECUCIÓN DE CASOS DE PRUEBA (POR HU)

---

### 🔹 HISTORIA DE USUARIO: HU-[MOD]-01 — [Título de la Historia]

#### A. Información y Criterios de Aceptación
* **Objetivo de la Prueba:** Validar que [descripción funcional del caso].
* **Criterio de Aceptación Evaluado:**
  * **Dado que** [precondición del sistema o usuario].
  * **Cuando** [acción ejecutada en la interfaz o petición HTTP].
  * **Entonces** [resultado esperado en BD, respuesta HTTP y cambios de estado].

#### B. Endpoints y Contrato de API
* **Método y Ruta:** `POST /api/v1/ejemplo/recurso`
* **Cabeceras Requeridas:** `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Payload de Entrada (Request Body):**
```json
{
  "campoObligatorio": "valor_valido",
  "email": "usuario@test.com"
}
```

#### C. Matriz de Casos de Prueba Detallada

| ID Caso | Tipo de Prueba | Descripción del Escenario | Datos de Entrada | Resultado Esperado | Resultado Obtenido | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-01-01** | Camino Feliz | Registro exitoso con datos válidos | Payload completo válido | `201 Created` + Registro en BD + Código SMTP emitido | `201 Created` idéntico al esperado | **PASSED** |
| **CP-01-02** | Validación Zod | Intento con formato de correo inválido | `email: "invalido"` | `400 Bad Request` con mensaje estructurado | `400 Bad Request` validado por Zod | **PASSED** |
| **CP-01-03** | Caso Borde | Registro con correo ya existente | `email: "duplicado@test.com"` | `409 Conflict` (Política Unicidad HU-CUE-08) | `409 Conflict` | **PASSED** |
| **CP-01-04** | Flujo Diagrama | Verificación de código expirado | `token: "expirado"` | Rechazo y opción de reenvío según diagrama | Rechazo correcto | **PASSED** |

#### D. Evidencias y Capturas de Prueba

##### Evidencia 1: Respuesta del Servidor / API (Camino Feliz)
> *[Insertar aquí captura de Postman / Insomnia / Swagger / Logs de consola]*  
> *(Ruta relativa de imagen: `assets/qa/MXX/evidencia_CP-01-01_postman.png`)*

##### Evidencia 2: Consulta en Base de Datos (Kysely / DB Client)
> *[Insertar aquí captura de la tabla en base de datos con hash BCrypt verificado y estado correcto]*  
> *(Ruta relativa de imagen: `assets/qa/MXX/evidencia_CP-01-01_db.png`)*

##### Evidencia 3: Simulación de Correo / Notificación (SMTP)
> *[Insertar aquí captura del correo recibido en MailHog / Ethereal / Bandeja de prueba]*  
> *(Ruta relativa de imagen: `assets/qa/MXX/evidencia_CP-01-01_smtp.png`)*

---

### 🔹 HISTORIA DE USUARIO: HU-[MOD]-02 — [Título de la Historia]

#### A. Información y Criterios de Aceptación
* **Objetivo de la Prueba:** Validar [descripción].
* **Criterio de Aceptación:**
  * **Dado que** [precondición].
  * **Cuando** [acción].
  * **Entonces** [resultado].

#### B. Matriz de Casos de Prueba

| ID Caso | Tipo de Prueba | Descripción del Escenario | Datos de Entrada | Resultado Esperado | Resultado Obtenido | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-02-01** | Autorización | Acceso con JWT válido y permiso asignado | Token de empleado con permiso | `200 OK` con datos autorizados | `200 OK` | **PASSED** |
| **CP-02-02** | Seguridad M17 | Acceso sin permiso individual en servidor | Token sin permiso específico | `403 Forbidden` genérico (HU-ADM-03) | `403 Forbidden` sin fuga de datos | **PASSED** |

#### C. Evidencias de Prueba
> *[Insertar capturas de pantalla de la prueba aquí]*

---

## 4. VALIDACIÓN DE POLÍTICAS TRANSVERSALES DE INTEGRIDAD (SECURITY & QUALITY GATES)

| Política Evaluada | Requisito Verificado | Método de Prueba | Cumplimiento |
| :--- | :--- | :--- | :---: |
| **HU-CUE-08 (Unicidad)** | No solapamiento de cuentas cliente/empleado/admin | Inserción forzada de correo duplicado | [ ✅ CUMPLE / ❌ NO ] |
| **HU-ADM-03 (Control Servidor)** | Verificación de permisos en backend para cada endpoint | Petición HTTP directa omitiendo frontend | [ ✅ CUMPLE / ❌ NO ] |
| **HU-SEG-01 (Cifrado)** | Contraseñas almacenadas exclusivamente con BCrypt (Salt 12) | Inspección de columna en BD | [ ✅ CUMPLE / ❌ NO ] |
| **HU-SEG-02 (Sesión)** | Expiración de JWT y transporte seguro de cookies | Petición con token vencido | [ ✅ CUMPLE / ❌ NO ] |
| **HU-SEG-06 (Datos Sensibles)** | Cero hashes, tokens o datos sensibles en JSON de respuesta | Inspección de payloads de respuesta | [ ✅ CUMPLE / ❌ NO ] |
| **Apego a Diagramas** | Todas las bifurcaciones y errores del diagrama cubiertas | Pruebas de caminos alternativos | [ ✅ CUMPLE / ❌ NO ] |

---

## 5. REGISTRO DE DEFECTOS Y OBSERVACIONES (BUG TRACKER)

| ID Defecto | HU Afectada | Severidad | Descripción del Defecto | Pasos para Reproducir | Estado Actual |
| :--- | :---: | :---: | :--- | :--- | :---: |
| **BUG-01** | `HU-[MOD]-01` | Crítica / Alta / Media / Baja | [Ej: El endpoint devuelve 500 en lugar de 400 cuando falta un campo Zod] | 1. Enviar POST sin campo X.<br>2. Observar respuesta no controlada. | [Abierto / En Corrección / Resuelto] |
| **BUG-02** | `HU-[MOD]-02` | Media | [Ej: El mensaje de error revela si el usuario existe o no en BD] | 1. Intentar login con email no existente.<br>2. Ver mensaje específico. | [Resuelto] |

---

## 6. FIRMAS DE APROBACIÓN Y CONFORMIDAD

| Rol | Nombre | Firma / Conformidad | Fecha |
| :--- | :--- | :---: | :---: |
| **Analista QA / Tester** | [Nombre Tester] | [ Aprobado / Rechazado ] | [DD/MM/AAAA] |
| **Líder de Desarrollo / Integrador** | [Nombre Líder] | [ Aprobado / Rechazado ] | [DD/MM/AAAA] |
| **Product Owner (PO)** | [Nombre PO] | [ Aceptado / En Revisión ] | [DD/MM/AAAA] |
