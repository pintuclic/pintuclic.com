# 🚶 WALKTHROUGH: [Nombre del Módulo] — [vX.Y.Z]

> **Módulo:** `[XX_nombre_modulo]`  
> **Versión:** `vX.Y.Z`  
> **Autor:** Frontend Lead Engineer & Backend Lead Engineer  
> **Revisor:** QA Lead & Security Compliance Director  

---

## 1. Resumen de Funcionalidades Implementadas
- [x] Endpoint REST: `POST /api/v1/[recurso]` con validación Zod.
- [x] Vista: `frontend/src/modules/m[xx]-[nombre]/components/[Modulo]View.tsx`.
- [x] Componente modal y tabla reactiva con estados de carga y empty state.
- [x] Suite Vitest en verde (`npm run test:backend`).
- [x] Comprobador AST Zero ANY en verde (`npm run check:no-any`).

---

## 2. Instrucciones de Reproducción Local
1. Iniciar el servicio backend:
   ```bash
   cd backend && npm run dev
   ```
2. Iniciar el servidor frontend:
   ```bash
   cd frontend && npm run dev
   ```
3. Navegar a: `http://localhost:5173/[ruta_modulo]`.

---

## 3. Guía Visual y Pasos de Verificación Manual
1. **Paso 1:** Iniciar sesión con usuario autorizado.
2. **Paso 2:** Navegar a la pantalla del módulo y verificar renderizado inicial.
3. **Paso 3:** Abrir el modal de creación, diligenciar el formulario y enviar.
4. **Paso 4:** Verificar que la tabla se actualice reactivamente sin recargar la página.
5. **Paso 5:** Verificar rechazo de valores inválidos (boundary check).

---

## 4. Evidencia de Pruebas y Certificación
- **Vitest:** X tests PASS.
- **Playwright E2E:** X tests PASS.
- **A11y (axe-core):** 0 violaciones.
- **Cero ANY AST:** 0 violaciones.
