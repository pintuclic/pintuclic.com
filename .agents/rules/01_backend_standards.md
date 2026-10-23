# ⚙️ REGLAS TÉCNICAS OBLIGATORIAS: BACKEND

Stack Confirmado: `Express 5` + `Prisma 6` + `Zod 4` + `Vitest 3` + `JWT` + `bcrypt` (sal 12) + `nodemailer` (SMTP).

---

## 1. Calidad y Tipado Estricto (Zero Any / Zero Errors)
1. **Tolerancia Cero a `any`:** Prohibido terminantemente el uso de `any`, tanto explícito como implícito.
2. **Validación Pre-Commit:** Antes de cerrar cualquier tarea, DEBES ejecutar en `backend/`:
   ```bash
   npx tsc --noEmit
   npm run lint
   npm test
   ```
   El código debe pasar con **0 errores y 0 warnings**.

---

## 2. Acceso a Datos y Esquema
1. **Prisma como Fuente Canónica:** Toda interacción con la base de datos se realiza a través de `PrismaClient` usando tipos fuertemente tipados generados por Prisma (`Prisma.XxxGetPayload`, etc.).
2. **Prohibición de Auto-Siembra en Código (Seed Centralizado - Directiva #10):**
   - Prohibido hardcodear datos iniciales o crear funciones en runtime tipo `sembrarPermisos()`, `initData()`, etc.
   - Todo dato maestro o mock reside en `bd/sql/seed_pintuclic.sql` y se gestiona mediante `npm run db:seed`.
   - Las carpetas `interfaces/` son exclusivamente tipos (`interface`, `type`) con **cero runtime y cero datos**.

---

## 3. Seguridad y Arquitectura
1. **Validación Zod Obligatoria:** Todo endpoint valida `req.body`, `req.query` o `req.params` con esquemas Zod en `dtos/`.
2. **Autorización en Servidor (HU-ADM-03):** NUNCA confiar en validaciones del cliente. Comprobar permisos individuales en servidor.
3. **No Exposición de Datos Sensibles (HU-SEG-06):** No retornar hashes, tokens internos o datos privados en respuestas JSON.
4. **Nomenclatura de Carpetas:** Carpetas en `src/modules/` deben nombrarse `m[xx]-[nombre-modulo]` en minúsculas y kebab-case (ej: `m04-cuentas`).
