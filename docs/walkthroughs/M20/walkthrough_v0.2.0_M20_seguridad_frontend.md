# WALKTHROUGH DE IMPLEMENTACIÓN — M20 Frontend (acotado)

## 1. METADATOS

* **Versión Generada:** `v0.2.0` *(propuesta; sujeta a la mecánica de versionado que fije DevOps)*
* **Módulo de Origen:** `M20 — Seguridad, Auditoría y Protección de Datos`
* **Capa:** Frontend (Fase 3B)
* **Fecha de Entrega:** 21/10/2026
* **Autor / Responsable:** DanExl24 (@DanExl24) — con asistencia de un agente de IA
* **Estado:** ⚠️ **PARCIAL POR DECRETO DEL PRODUCT OWNER**

---

## 2. ALCANCE DE ESTA ENTREGA

El Product Owner acotó la Fase 3B: M20 entrega **solo infraestructura de seguridad y el servicio
tipado de privacidad**. No se construyen componentes ni pantallas — un Líder Frontend dejará el
design system listo en `core/components/`.

| Entregado | HU |
| :--- | :--- |
| `src/middleware.ts` — guarda de rutas protegidas con retorno al destino | SEG-02 / SEG-03 |
| `core/api/apiClient.ts` — `withCredentials` + interceptor `401` | SEG-02 |
| `core/dtos/seguridad.dto.ts` — contraseña, correo y confirmación | SEG-01 |
| `core/utils/errorApi.ts` — traducción de errores sin filtrar detalle interno | SEG-06 |
| `core/store/authStore.ts` — sin token y sin permisos cacheados | SEG-02 |
| `modules/m20-seguridad/` — interfaces, DTOs y 2 servicios tipados | SEG-02 / SEG-05 |

**No entregado (y por qué):** componentes y pantallas de privacidad — decretado por el PO para más
adelante; consulta de auditoría — HU-SEG-04 aplazada; ocultación fina de opciones por permiso
(`RF-SEG-03-06`) — el hook `usePermission` pertenece a M17.

---

## 3. REGLAS Y POLÍTICAS APLICADAS

- 🔒 **`RNF-SEG-02-01` / ADR-005:** el identificador de sesión viaja en cookie `HttpOnly`. Ni el
  cliente HTTP ni el store lo tocan. Una prueba verifica que el store no contiene ninguna clave que
  se parezca a un token.
- 🛡️ **`RF-SEG-03-06`:** el middleware es **usabilidad, no control de acceso**. Solo comprueba que
  exista la cookie; no puede validarla. La autoridad está en el servidor y así queda documentado en
  el propio archivo.
- 👁️ **`HU-SEG-06`:** `mensajeDeError` nunca devuelve el mensaje de una excepción cruda. Ante
  cualquier forma que no reconozca, cae al genérico.
- 🆔 **`CA-SEG-02-05`:** el tipo `UsuarioAutenticado` **no lleva permisos**. Una copia en el cliente
  sobreviviría a su revocación.
- 📋 **Directiva #12:** cero Zod inline; `interfaces/` con cero runtime.

---

## 4. VERIFICACIÓN

| Comprobación | Resultado |
| :--- | :--- |
| `tsc --noEmit` | ✅ |
| `eslint` / `next lint --max-warnings=0` | ✅ 0 errores, 0 advertencias |
| `check:no-any` | ✅ 58 archivos en todo el repo |
| **Vitest frontend** | ✅ **19/19** |
| `next build` | ✅ |
| Vitest backend (no regresión) | ✅ 36/36 |

**Pruebas de mutación:** se hizo que `errorApi` devolviera el mensaje crudo de la excepción y que el
destino pendiente no se consumiera. Ambas pruebas fallaron y volvieron a pasar al restaurar.

---

## 5. DEPENDENCIAS

### Hacia atrás — qué necesita para operar al 100 %
- **M04 (Cuentas):** aporta el **login**. Sin él no existe forma de abrir sesión, de modo que el
  middleware, el interceptor `401` y el cierre de sesión **no pueden ejercitarse end-to-end todavía**.
- **M17 (Permisos):** aporta el catálogo y el hook `usePermission` para la ocultación fina.
- **Líder Frontend:** `core/components/` para que existan pantallas que consuman estos servicios.
- **Infraestructura:** TLS en producción — la cookie es `Secure` y el navegador no la enviará por HTTP.

### Hacia adelante — a quién habilita
- **M04** puede validar contraseñas con `core/dtos/seguridad.dto.ts` y proteger rutas sin escribir
  nada propio de seguridad.
- **M17** y **todo módulo posterior** heredan el cliente HTTP con sesión por cookie y el mapeo de
  errores sin fugas.

---

## 6. ARCHIVOS CREADOS / MODIFICADOS

| Acción | Ruta |
| :---: | :--- |
| NUEVO | `frontend/src/middleware.ts` |
| NUEVO | `frontend/src/core/dtos/seguridad.dto.ts` |
| NUEVO | `frontend/src/core/utils/errorApi.ts` |
| MOD | `frontend/src/core/api/apiClient.ts` |
| NUEVO | `frontend/src/modules/m20-seguridad/interfaces/{privacidad,sesion}.interface.ts` |
| NUEVO | `frontend/src/modules/m20-seguridad/dtos/privacidad.dto.ts` |
| NUEVO | `frontend/src/modules/m20-seguridad/services/{privacidad,sesion}.service.ts` |
| NUEVO | `frontend/src/modules/m20-seguridad/tests/` — 5 archivos, 19 pruebas |
| NUEVO | `frontend/vitest.config.ts` |
| MOD | `frontend/package.json` — `lint` con `--max-warnings=0` |

Todos dentro de `m20-seguridad` o de `core/`, cuyo uso autorizó el Product Owner por ser M20 el
módulo transversal.

---

## 7. DICTAMEN

* **Apego al contrato de Gate 2:** ✅ los 6 endpoints del contrato tienen cliente tipado.
* **Apego al diagrama:** ✅ en lo que alcanza esta capa (retorno al destino, aviso de expiración).
* **Revisión visual de Gate 3B:** ⚠️ **no procede** — esta entrega no contiene interfaz visible.
