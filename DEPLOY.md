# Despliegue de Pintu Clic

> **Stack:** Next.js 15 (frontend) · Express 5 + Prisma 6 (backend) · PostgreSQL
> **Repositorio:** `pintuclic/pintuclic.com` | **Rama principal:** `main`
>
> ⚠️ **Antes de desplegar**, el ciclo SDLC debe haber pasado Gate 4 (certificación QA).
> Ver estado en [`.sdlc/.workflow/current_state.json`](.sdlc/.workflow/current_state.json)
> y semáforo en [`.sdlc/multiAgents/00_orchestrator/PROJECT_STATUS.md`](.sdlc/multiAgents/00_orchestrator/PROJECT_STATUS.md).

---

## 1. Entrega mediante Git

1. Trabajar sobre la rama asignada al módulo (`feature/m[xx]-[nombre]`) y registrar únicamente código, recursos y documentación del alcance aprobado.
2. Ejecutar las validaciones indicadas abajo y sincronizar versión, lockfile, CHANGELOG y walkthrough.
3. No hacer push a `main` directamente. Integrar únicamente mediante PR aprobada tras pasar el Gate 4 del SDLC.
4. Publicar sin `--force`. El remoto `origin` apunta a `https://github.com/pintuclic/pintuclic.com.git`:

```bash
git push origin HEAD:refs/heads/feature/m[xx]-[nombre-modulo]
```

5. Revisar la propuesta de integración contra `main` antes de desplegar el servidor.

---

## 2. Validaciones previas al despliegue

Usar Node 22, como en los Dockerfiles y los workflows.

```bash
# Backend
cd backend
npm ci
npm run lint -- --max-warnings=0
npx tsc --noEmit
npm run build

# Frontend
cd ../frontend
npm ci
npm run lint -- --max-warnings=0
npm run check:types
npm run build
```

Verificaciones adicionales del SDLC (Gate 4):
```bash
# Cero tipo 'any' en backend
cd backend && npm run check:types

# Cero tipo 'any' en frontend
cd frontend && npm run check:types

# Tests unitarios
cd backend && npm test
```

El workflow `01_ci_quality_gates.yml` en `.sdlc/.github/workflows/` ejecuta estas comprobaciones automáticamente en PRs a `main`.

---

## 3. Configuración y base de datos

- Crear `.env` en `backend/` a partir de `backend/.env.example`, con credenciales reales. No incluirlo en Git ni en imágenes Docker.
- Variables de entorno requeridas: credenciales PostgreSQL, `JWT_SECRET`, orígenes HTTP permitidos (CORS), credenciales SMTP para M18 (nodemailer), y `GOOGLE_CLIENT_ID` para Google OAuth (M04).
- Variable de entorno del frontend para Google OAuth: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (prefijo `NEXT_PUBLIC_` para que Next.js la exponga al cliente).
- Preparar el schema y la cuenta administradora antes de habilitar el acceso:

```bash
cd backend
npm run db:migrate     # Aplica migraciones Prisma
npm run db:seed        # Solo en entornos de prueba — ver bd/docs/GUIA_MOCKS_Y_DATOS_PRUEBA.md
```

- `docker-compose.yml` no crea el schema ni aplica el seed automáticamente.
- Conservar el volumen PostgreSQL y hacer respaldo antes de cualquier migración. No usar `down -v` como procedimiento de actualización.

---

## 4. Despliegue con Docker Compose

Desde la raíz del checkout:

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

- **Frontend (Next.js):** puerto `FRONTEND_PORT` (80 por defecto). Nginx resuelve rutas SSR/SPA como `/admin` y `/catalog`.
- **Backend (Express):** `BACKEND_PORT` (3000 por defecto). Nginx dirige `/api/` al servicio backend.
- Verificar `/api/health` por el puerto del backend y las rutas principales por el puerto del frontend.

---

## 5. Si se utiliza Dokploy

Crear/configurar una aplicación de tipo **Docker Compose** que use el compose de este proyecto y su `.env`.
Elegir un solo responsable del despliegue: workflow con runner o Dokploy — no ambos sobre el mismo entorno.
Verificar dominio, puerto interno 80 del frontend y HTTPS.

---

## 6. Release (SemVer)

El esquema de versiones del proyecto es de cuatro segmentos (`X.Y.Z.W`). Ver [CONTRIBUTING.md](CONTRIBUTING.md).

El release se genera automáticamente al fusionar a `main` mediante el workflow de CI. Antes del release:
1. Actualizar `docs/CHANGELOG.md` con la versión y autor real.
2. Actualizar `.sdlc/CHANGELOG.md` con el resumen del ciclo SDLC completado.
3. El tag `vX.Y.Z` se crea automáticamente por el workflow; no crear tags manualmente.

---

## 7. Reversión

Seleccionar el commit conocido anterior, restaurar su configuración compatible y reconstruir el stack tras revisar compatibilidad del schema de Prisma. Un cambio de Git no revierte por sí mismo una migración de base de datos aplicada. Hacer respaldo del volumen PostgreSQL antes de cualquier rollback de migraciones.
