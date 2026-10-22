# WALKTHROUGH DE IMPLEMENTACIÓN — M04 Backend · Motivo de rechazo opcional

> 📌 **Módulo:** `M04 — Cuentas, Autenticación y Perfil` · 🏷️ **Capa:** Backend + contrato + DTO frontend · 🎯 **Fase:** ajuste puntual autorizado durante la Fase 3B
> 🔁 **Complementa:** [`walkthrough_v0.4.1`](./walkthrough_v0.4.1_M04_remediacion_bug_m04_01_backend.md) §8.3

## 1. Metadatos
* **Versión:** `v0.4.2` · **Fecha:** 22/10/2026
* **Autor / Responsable:** DanExl24 (@DanExl24) — con asistencia de un agente de IA
* **Autorización:** instrucción expresa del Director Humano (2026-10-22), registrada en `current_state.json`: "lo de motivo de rechazo queda opcional" y "lo del DTO hazlo antes de empezar esto". El backend estaba congelado por la Fase 3B; el cambio queda trazado en el historial de transiciones.

## 2. Qué cambió y por qué
El DTO firmado en Gate 2 exigía un motivo de **al menos 10 caracteres en todo rechazo**, mientras las HU lo declaran opcional en ascensos y renovaciones (`CA-CUE-09-08`, `CA-CUE-09-06`) y obligatorio solo al rechazar un **registro** de empresa (`RN-CUE-17`, `CA-CUE-09-03`).

| Pieza | Antes | Ahora |
| :--- | :--- | :--- |
| `dictamenSolicitudEmpresaRequestSchema` (contrato rector y DTO backend) | `.refine` exigía ≥ 10 caracteres en cualquier rechazo | Motivo **opcional** (`trim`, máx. 500) |
| `EmpresasService.dictaminarSolicitud` | Exigía motivo no vacío solo en registro | Exige **≥ 10 caracteres** solo en registro (`MOTIVO_RECHAZO_REQUERIDO`, 400). Un motivo vacío o de espacios se guarda como `null` |
| `EmpresasService.dictaminarRenovacionNit` | Guardaba el motivo tal cual | Normaliza el motivo (vacío → `null`) |
| DTO frontend `m04-cuentas.dto.ts` | Un único esquema con la regla de 10 caracteres | `dictamenSolicitudEmpresaFormSchema` (motivo opcional) + `dictamenRegistroEmpresaFormSchema` (obligatorio, ≥ 10) para que el panel aplique la regla correcta según el tipo |

**Por qué la regla del registro vive en el servicio y no en el DTO:** depende del tipo de solicitud, que solo conoce el servidor. El contrato describe la forma del cuerpo; la regla de negocio, el dominio.

## 3. Verificación
| Puerta | Resultado |
| :--- | :---: |
| `npx tsc --noEmit` (backend y frontend) | ✅ 0 errores |
| `npm run lint` · `check:no-any` (backend) | ✅ 0/0 · 0 ANY (102 archivos) |
| Vitest backend | ✅ 20/20 suites · **193/193** (+5: registro con motivo corto, ascenso con motivo en blanco, renovación sin motivo, contrato HTTP de registro/ascenso, rechazo HTTP de renovación sin motivo) |
| Vitest frontend `m04-cuentas/tests/dtos.test.ts` (nuevo) | ✅ 8/8 |
| `npm run test:contracts` | ✅ 16/16 |

## 4. Archivos
```
.sdlc/docs/contracts/m04-cuentas.contract.ts                         # esquema de dictamen: motivo opcional
backend/src/modules/m04-cuentas/dtos/m04-cuentas.dto.ts              # espejo del contrato
backend/src/modules/m04-cuentas/services/empresas.service.ts         # regla RN-CUE-17 y normalización del motivo
backend/src/modules/m04-cuentas/__tests__/empresas.service.test.ts   # +3 pruebas
backend/src/modules/m04-cuentas/__tests__/admin-empresas.acceso.test.ts  # +2 pruebas HTTP
frontend/src/modules/m04-cuentas/dtos/m04-cuentas.dto.ts             # dos esquemas de formulario
frontend/src/modules/m04-cuentas/tests/dtos.test.ts                  # NUEVO · 8 pruebas
```

## 5. Decisiones del Director Humano registradas en la misma instrucción
* Ratifica el cambio de una línea en `backend/src/app.routes.ts` (v0.4.1).
* La verificación del correo del registro de empresa la valida el administrador al aceptar la empresa (no se construye un paso OTP adicional).
* La auditoría de decisiones sigue aplazada (`HU-SEG-04`).
