# 🐛 PLANTILLA: Ficha Técnica de Defecto / Incidencia (Estándar 10 Campos)

> **Ubicación del Artefacto:** `docs/qa/incidents/BUG-[MODULO]-[NUM].md`  
> **Protocolo Vinculante:** `multiAgents/protocols/HANDOFF_PROTOCOL.md` (Sección 2.2)  
> **Estado del Defecto:** `[NUEVO / ABIERTO / ASIGNADO / DIFERIDO / RECHAZADO / EN_REPRUEBA / REABIERTO / VERIFICADO / CERRADO]`

---

## 1. Ficha Técnica de Identificación (10 Campos Obligatorios)

| N.º | Campo | Detalle Técnico Registrado |
| :---: | :--- | :--- |
| **1** | **Identificador Único** | `BUG-[MODULO]-[NUM]` (ej. `BUG-AUTH-001`, `BUG-NOTAS-003`) |
| **2** | **Título Descriptivo** | [Descripción corta, precisa y unívoca del fallo] |
| **3** | **Reportado Por** | [QA Lead & Security Director / Subrol SDET / E2E Specialist] |
| **4** | **Asignado A** | [Backend Lead Engineer / Frontend Lead Engineer] |
| **5** | **Fecha y Hora de Creación** | AAAA-MM-DD HH:MM:SS (Zona Horaria) |
| **6** | **Nivel de Severidad** | `[S1 - Blocker / S2 - Critical / S3 - Major / S4 - Minor]` |
| **7** | **Aplicación y Versión** | [Backend API / Frontend SPA / Módulo] — Versión `vX.Y.Z` (Commit / Branch) |
| **8** | **Descripción del Defecto** | [Explicación detallada del comportamiento anómalo detectado] |
| **9** | **Método de Reproducción** | Pasos exactos, secuenciales y reproducibles (ver Sección 2) |
| **10** | **Información Adicional** | Payloads, logs del servidor, traza de consola, capturas Playwright |

---

## 2. Método de Reproducción Paso a Paso

### 2.1. Prerrequisitos / Estado Inicial del Sistema
- **Base de datos:** [Seed o fixture necesario, ej. `npm run seed:test`].
- **Usuario autenticado:** [Rol de usuario, token JWT o credenciales utilizadas].
- **URL / Endpoint:** `[POST/PUT/GET/DELETE] /api/v1/[recurso]` o ruta SPA `/dashboard/[vista]`.

### 2.2. Secuencia de Pasos para Disparar el Fallo
1. [Paso 1: Navegar a / Enviar petición a...]
2. [Paso 2: Completar los campos con los valores X...]
3. [Paso 3: Ejecutar la acción / Disparar la mutación...]

### 2.3. Datos de Entrada Exactos (Payload JSON o Form Data)
```json
{
  "campoA": "valor_de_prueba",
  "campoCritico": 1234
}
```

### 2.4. Discrepancia de Resultados
* **Resultado Obtenido (Fallo):**  
  [Código HTTP devuelto, mensaje de error en pantalla, comportamiento errático o excepción no controlada].
* **Resultado Esperado (Comportamiento Conforme):**  
  [Comportamiento según el PRD, contrato Zod o estándar de accesibilidad / seguridad].

---

## 3. Análisis Forense de Causa Raíz (RCA)
- **Agente Evaluado:** `[Backend Engineer / Frontend Engineer / Software Architect]`
- **Causa Raíz Diagnosticada:** [¿Por qué falló el desarrollador? ¿Ignoró la regla inmutable? ¿Falta de tipado Zod? ¿Validación client-side omitida? ¿Uso de `any`?].
- **Impacto en el Sistema:** [Afectación de integridad de datos, seguridad, performance o experiencia de usuario].

---

## 4. Bucle de Resolución y Verificación (Test en Rojo)

### 4.1. Compromiso del Desarrollador (Fase Verde)
- [ ] **Prueba de Reproducción en ROJO:** El desarrollador creó el test unitario o de integración en `tests/` que falla reproduciendo este bug exacto.
  - *Ruta del Test:* `tests/modules/[modulo]/[bug_id].test.ts`
- [ ] **Corrección en VERDE:** Se implementó la solución mínima en el código de producción hasta que la prueba pasa.
- [ ] **Refactorización:** Se limpió el código sin introducir regresiones en la suite general.

### 4.2. Certificación del QA Lead (Cierre de Veto)
- **Fecha de Reprueba:** AAAA-MM-DD
- **Veredicto de QA:** `[VERIFICADO - PASS / REABIERTO - FAIL]`
- **Comentarios de Cierre:** [Evidencia de la suite pasando en verde y levantamiento del veto Stop-the-Line].
