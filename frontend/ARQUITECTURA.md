# Arquitectura Frontend — Pintu Clic (v2)

Stack: **Next.js 15 (App Router) + React 19 + TypeScript (strict) + Tailwind CSS v4 + Zustand + React Hook Form + Zod**  
Patrón: **Slicing Vertical por módulo**, espejando la arquitectura del backend.

---

## Estructura de `src/`

```text
frontend/src/
│
├── app/                           # ⚠️ Next.js App Router — ÚNICA zona de páginas y layouts
│   ├── layout.tsx                 # Root layout: HTML, fuentes, globals.css
│   ├── globals.css                # @import "tailwindcss"; @config "../../tailwind.config.ts";
│   ├── (public)/                  # Grupo de rutas: storefront público (sin auth)
│   │   ├── page.tsx               # /  — Página de inicio
│   │   └── catalogo/[slug]/       # /catalogo/[slug] — Detalle de producto
│   ├── (auth)/                    # Grupo de rutas: login, registro, recuperación (sin nav)
│   │   └── login/page.tsx
│   └── (admin)/                   # Grupo de rutas: panel admin (requiere auth + permiso)
│       ├── layout.tsx             # Layout admin con sidebar
│       └── productos/page.tsx
│
├── core/                          # Infraestructura global compartida (NO contiene lógica de negocio)
│   ├── api/
│   │   └── apiClient.ts           # Instancia Axios: baseURL NEXT_PUBLIC_API_URL, interceptor JWT Bearer
│   ├── auth/
│   │   └── useAuth.ts             # Hook de autenticación global (lee authStore)
│   ├── components/                # Design System base reutilizable
│   │   ├── buttons/               # Button.tsx, IconButton.tsx
│   │   ├── forms/                 # Input.tsx, Select.tsx, Checkbox.tsx, Switch.tsx, Textarea.tsx
│   │   ├── feedback/              # Alert.tsx, Toast.tsx, Spinner.tsx, Skeleton.tsx
│   │   ├── overlays/              # Modal.tsx, Drawer.tsx, Dropdown.tsx, Tooltip.tsx
│   │   ├── navigation/            # Tabs.tsx, Breadcrumbs.tsx, Pagination.tsx
│   │   ├── data-display/          # Card.tsx, Table.tsx, Badge.tsx, Avatar.tsx
│   │   ├── layout/                # PageHeader.tsx y piezas estructurales
│   │   └── index.ts               # Barril central: import { Button } from '@/core/components'
│   ├── dtos/                      # DTOs globales Zod (políticas transversales)
│   │   └── seguridad.dto.ts       # contrasenaSchema, correoSchema, telefonoSchema (HU-SEG-01)
│   ├── hooks/                     # Hooks React reutilizables globales
│   │   └── usePermission.ts       # Verifica permisos del usuario autenticado (M17)
│   ├── store/                     # Zustand stores globales
│   │   └── authStore.ts           # Estado de sesión: user, accessToken, setAuth, clearAuth
│   ├── theme/
│   │   ├── colors.ts              # ⚠️ FUENTE ÚNICA de tokens de color (importada por tailwind.config.ts)
│   │   └── GUIA_COLORES.md        # Matriz oficial de tokens y reglas de uso
│   ├── types/
│   │   ├── respuesta-api.type.ts  # ApiResponse<T> { success, data, message }
│   │   ├── usuario.type.ts        # UsuarioAutenticado (desde authStore)
│   │   ├── permiso.type.ts        # Permiso atómico (desde M17)
│   │   └── paginacion.type.ts     # PaginacionMeta
│   └── utils/
│       ├── moneda.ts              # formatCOP(valor): "$ 85.900"
│       └── index.ts               # Barril de utilidades
│
├── modules/                       # Lógica de negocio — convención m[xx]-[nombre]
│   ├── m20-seguridad/             # Middleware de seguridad, guards de ruta Next.js
│   ├── m17-permisos/              # Panel administrativo de empleados y permisos
│   ├── m04-cuentas/               # Auth B2C/B2B, perfil, direcciones
│   ├── m01-catalogo/              # Storefront público + administración del catálogo
│   ├── m02-busqueda/              # Búsqueda, filtros, facetas y ordenamiento
│   ├── m05-carrito-compras/       # Drawer de carrito, líneas, resumen
│   └── m08-ordenes/               # Mis pedidos (cliente) + gestión de órdenes (admin)
│
│   Cada módulo tiene la estructura interna:
│   ├── components/                # Componentes React propios del módulo
│   ├── hooks/                     # Hooks React reutilizables del módulo (useXxx.ts)
│   ├── dtos/                      # Esquemas Zod locales del módulo (formularios y payloads)
│   ├── interfaces/                # Contratos TypeScript puros (0 bytes en runtime)
│   ├── services/                  # Llamadas HTTP al backend vía apiClient de core/api
│   ├── store/                     # Zustand store del módulo (si requiere estado global)
│   └── tests/                     # Tests Vitest del módulo
```

---

## Reglas de Oro de Implementación

| Regla | Descripción |
| :--- | :--- |
| **Cero `any`** | ESLint y `tsc --noEmit` bloquean cualquier `any`. |
| **Solo tokens de color** | Prohibidos hex arbitrarios y colores Tailwind fuera de la paleta oficial. Ver `GUIA_COLORES.md`. |
| **DTOs fuera de componentes** | Todo esquema Zod vive en `dtos/*.dto.ts`. Prohibido definir `z.object({})` inline en un componente. |
| **`interfaces/` = 0 runtime** | Solo tipos TypeScript. Prohibido importar Zod o librerías en `interfaces/`. |
| **Utility-First Tailwind** | Prohibidos estilos CSS customizados si Tailwind lo resuelve. |
| **Mobile-First** | Clases base para móvil, modificadores `sm:` / `md:` / `lg:` para pantallas mayores. |
| **Aislamiento de módulo** | Un módulo no importa componentes ni stores de otro módulo directamente. Comunicación vía `core/`. |
| **Server vs Client Components** | Por defecto todo es Server Component. Agregar `'use client'` solo cuando se necesita estado, efectos o eventos del navegador. |
| **Auth en middleware** | `src/middleware.ts` verifica el JWT antes de servir cualquier ruta protegida — nunca solo en el cliente. |

---

## Flujo de datos

```
Usuario → Server Component (fetch directo) o Client Component
  → hook del módulo (useXxx)
  → service (apiClient con Bearer token)
  → backend API
  → Zustand store actualiza
  → React re-renderiza
```

## Orden de implementación recomendado

1. `core/` completo (apiClient, components, dtos, hooks, store, theme, types, utils)
2. `src/middleware.ts` (protección de rutas — M20)
3. `m17-permisos` (panel admin empleados)
4. `m04-cuentas` (auth B2C/B2B, perfil)
5. `m01-catalogo` (storefront + admin)
6. `m02-busqueda` → `m05-carrito-compras` → `m08-ordenes`
