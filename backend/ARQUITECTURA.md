# Arquitectura Backend — Pintu Clic (v2)

Stack: **Node.js 24 + TypeScript (strict) + Express 5 + Prisma ORM + PostgreSQL**  
Patrón: **Slicing Vertical por módulo** con principios SOLID aplicados.

---

## Estructura de `src/` y `prisma/`

```text
backend/
├── prisma/
│   ├── schema.prisma              # ⚠️ ÚNICA fuente de la estructura de BD. Prisma genera los tipos.
│   └── migrations/                # Migraciones automáticas generadas por Prisma
│
└── src/
    ├── core/                      # Infraestructura técnica global (NO contiene lógica de negocio)
    │   ├── db/
    │   │   ├── client.ts          # Singleton PrismaClient (instancia global reutilizable)
    │   │   └── seed.ts            # Carga de datos iniciales idempotentes (prisma db seed)
    │   ├── middlewares/
    │   │   ├── auth.middleware.ts # Verifica JWT y adjunta req.user
    │   │   ├── cors.middleware.ts # Configuración restrictiva de orígenes
    │   │   └── errorHandler.ts   # Captura global de errores — respuestas genéricas (HU-SEG-06)
    │   ├── utils/
    │   │   ├── apiResponse.ts     # Helpers de respuesta HTTP { success, data, message }
    │   │   ├── crypto.ts          # BCrypt hash/compare (costo mínimo 12 — HU-SEG-01)
    │   │   ├── jwt.ts             # Emisión y verificación de tokens (HU-SEG-02)
    │   │   └── sanitize.ts        # Sanitización de inputs antes de queries
    │   └── types/
    │       ├── api.types.ts       # Tipos globales de respuesta HTTP
    │       └── global.d.ts        # Extensión de Express.Request con req.user tipado
    │
    ├── modules/                   # Lógica de negocio — un directorio por módulo
    │   ├── m20-seguridad/         # TRANSVERSAL — implementar primero
    │   ├── m17-permisos/          # TRANSVERSAL — depende de m20
    │   ├── m18-notificaciones/    # TRANSVERSAL — depende de m20
    │   ├── m04-cuentas/           # Depende de m20, m17, m18
    │   ├── m01-catalogo/          # Depende de m20, m17
    │   ├── m02-busqueda/          # Depende de m01
    │   ├── m05-carrito-compras/   # Depende de m04, m01
    │   └── m08-ordenes/           # Depende de m05, m04, m18
    │
    │   Cada módulo tiene la estructura interna:
    │   ├── controllers/           # Manejo HTTP: extrae req, valida DTO Zod, delega al service
    │   ├── dtos/                  # Esquemas Zod + tipos inferidos (z.infer<>). Solo validación HTTP
    │   ├── interfaces/            # Contratos TypeScript puros (0 bytes en runtime)
    │   ├── repositories/          # ÚNICA zona que importa PrismaClient. Consultas tipadas.
    │   ├── services/              # Reglas de negocio. No conoce req/res ni Prisma directamente
    │   ├── __tests__/             # Tests Vitest del módulo
    │   └── m[xx].routes.ts        # Ensamblaje: inyección de dependencias y registro de rutas
    │
    ├── app.routes.ts              # Enrutador raíz que monta todos los m[xx].routes.ts
    └── index.ts                   # Composición root: inicializa Express, carga .env, arranca servidor
```

---

## Reglas de Oro de Implementación

| Regla | Descripción |
| :--- | :--- |
| **Un solo `schema.prisma`** | Toda la estructura de BD vive en `prisma/schema.prisma`. Los tipos los genera Prisma automáticamente. Prohibido definir interfaces de entidad de BD manualmente. |
| **Cero SQL crudo** | Solo Prisma Client. Prohibidas las cadenas SQL concatenadas. Para queries avanzadas usar `prisma.$queryRaw` con plantillas literales tipadas. |
| **Cero `any`** | ESLint y `tsc --noEmit` bloquean cualquier `any`. |
| **Zod en cada entrada** | Validar `req.body`, `req.query` y `req.params` en todos los endpoints sin excepción. |
| **Auth siempre en backend** | Ningún endpoint confía en el frontend. `auth.middleware.ts` y `requirePermission()` en cada ruta protegida. |
| **Singleton Prisma** | Usar siempre la instancia exportada desde `core/db/client.ts`. Nunca instanciar `new PrismaClient()` dentro de un módulo. |
| **Stop & Report** | Si un módulo necesita tocar código de otro → detener, reportar al equipo, esperar aprobación. |

---

## Flujo de una petición HTTP

```
Cliente → index.ts → app.routes.ts → m[xx].routes.ts
  → auth.middleware (JWT)
  → controller (extrae req, valida DTO Zod)
  → service (reglas de negocio)
  → repository (Prisma Client → PostgreSQL)
  → service → controller → res JSON
```

## Comandos Prisma clave

```bash
npx prisma generate          # Regenera tipos TypeScript desde schema.prisma
npx prisma migrate dev       # Crea y aplica nueva migración (desarrollo)
npx prisma migrate deploy    # Aplica migraciones pendientes (producción)
npx prisma db seed           # Ejecuta src/core/db/seed.ts
npx prisma studio            # Abre UI visual de la BD
```

## Orden de implementación recomendado

1. `prisma/schema.prisma` + `core/` completo (DB client, middlewares, utils)
2. `m20-seguridad` (seguridad y auditoría base)
3. `m17-permisos` (permisos atómicos de empleados)
4. `m18-notificaciones` (SMTP desacoplado)
5. `m04-cuentas` (auth B2C/B2B)
6. `m01-catalogo` → `m02-busqueda` → `m05-carrito-compras` → `m08-ordenes`
