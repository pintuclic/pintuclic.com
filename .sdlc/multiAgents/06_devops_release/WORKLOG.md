# 📝 WORKLOG — 06_DEVOPS_RELEASE

## Bitácora de Acciones
- **[Inicialización]:** Rol preparado para contenerización Docker, seeders de datos, observabilidad de salud y pipeline CI/CD con GitHub Projects.

---

## 2026-10-21 — Incidencia elevada desde Fase 3A (M20)

> Reportada por `03_backend_engineer`. **No se tocó nada**: `.env.example`, `Dockerfile` y
> `.dockerignore` son dominio exclusivo del DevOps designado (`AGENTS.md` §3.6).

**`backend/.env.example` no corresponde al código.** Tras implementar M20, las variables que el
backend lee realmente son:

| Declarada en `.env.example` | ¿La lee el código? |
| :--- | :--- |
| `DATABASE_URL`, `PORT`, `NODE_ENV`, `JWT_SECRET`, `CORS_ORIGIN` | ✅ sí |
| `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_EXPIRES` | ❌ **no existen**: la vigencia la fija la ventana de inactividad de la sesión, no el token |
| `SMTP_*`, `GOOGLE_*` | ⏳ aún no: son de M18 y M04 |

**Faltan por declarar**, y sin ellas el arranque usa valores por defecto silenciosos:
- `BCRYPT_COST` — coste de derivación (RNF-SEG-01-02). Mínimo exigido: 12.
- `SESION_INACTIVIDAD_ADMIN_SEG` — por defecto `1800` (30 min, RF-SEG-02-02).
- `SESION_INACTIVIDAD_CLIENTE_SEG` — por defecto `2592000` (30 días).

⚠️ `JWT_SECRET` ahora **aborta el arranque** si falta o tiene menos de 32 caracteres, y `CORS_ORIGIN`
también, porque M20 no admite una política de origen abierta. El `.env.example` debería reflejarlo.
