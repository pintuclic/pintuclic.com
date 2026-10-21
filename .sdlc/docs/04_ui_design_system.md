# 🎨 Sistema de Diseño Institucional y Especificación de UI (Design System)

> **Proyecto:** Pintu Clic
> **Versión:** 1.0.0
> **Responsable:** Frontend Lead Engineer & UI/UX Specialist (Fase 3B)
> **Estado:** TOKENS DEFINIDOS — Componentes base en desarrollo
> **Fuente de Verdad Principal:** `../frontend/src/core/theme/colors.ts`

---

> ⚠️ **INSTRUCCIÓN PARA EL AGENTE FRONTEND ENGINEER:**
> Los tokens de color oficiales de Pintu Clic ya están definidos.
> **Fuente de verdad de colores:** [`../frontend/src/core/theme/colors.ts`](../frontend/src/core/theme/colors.ts)
> **Guía de uso:** [`../frontend/src/core/theme/GUIA_COLORES.md`](../frontend/src/core/theme/GUIA_COLORES.md)
>
> PROHIBIDO usar colores arbitrarios. Todo color debe venir de estos tokens o de las
> clases Tailwind que los implementen. Si faltan tokens, proponer via RFC.

---

## 1. Filosofía de Diseño

- **Claridad y especialización:** Interfaz optimizada para la venta de pinturas — los atributos técnicos (base, rendimiento, acabado, entonado) deben ser legibles y comparables a primera vista.
- **Densidad informativa:** Las vistas de catálogo y administración manejan alta densidad de datos; la tipografía y los espaciados deben priorizar la legibilidad en jornadas prolongadas.
- **Cero Colores Hardcodeados:** Todos los estilos emplean tokens semánticos del sistema. Prohibidos los valores hexadecimales aislados en componentes.
- **Accesibilidad Innegociable (WCAG 2.1 AA):** Ratios de contraste superiores a 4.5:1 para texto normal y soporte de navegación por teclado.

---

## 2. Paleta Oficial — Fuente de Verdad

> Los tokens canónicos viven en `../frontend/src/core/theme/colors.ts`.
> Esta tabla es un resumen orientativo; en caso de conflicto, `colors.ts` tiene prioridad.

`tailwind.config.ts` importa `PINTUCLIC_COLORS` desde `colors.ts`, así que cada token está disponible
como clase de Tailwind. **Prohibido** escribir el hexadecimal o usar clases por defecto de Tailwind
no aprobadas (`text-purple-600`, `bg-emerald-50`, `border-slate-200`, etc.).

| Token | Clase Tailwind | Propósito / Uso |
| :--- | :--- | :--- |
| **`corporate`** | `bg-corporate`, `text-corporate` | Títulos principales, precios, navegación, header |
| **`action`** | `bg-action`, `hover:bg-action-hover` | Botones de acción primaria, enlaces clave, bordes activos, sliders |
| **`subaction`** | `bg-subaction` | Botones secundarios de selección, subprocesos (ej. calculadora) |
| **`conversion`** | `bg-conversion`, `hover:bg-conversion-hover` | "Agregar al Carrito", confirmaciones de compra, estados aprobados |
| **`highlight`** | `bg-highlight` | Etiquetas "Patrocinado", estrellas, badges comerciales, estados pendientes |
| **`danger`** | `bg-danger`, `bg-danger-subtle` | Errores de validación, acciones destructivas, cierre de sesión |
| **`offer`** | `bg-offer`, `hover:bg-offer-hover` | Badges promocionales de descuento y campañas comerciales |
| **`neutral-white`** | `bg-neutral-white` | Tarjetas de producto, contenedores, modales |
| **`neutral-lightest`** | `bg-neutral-lightest` | Fondo general de la aplicación y de imágenes de producto |
| **`neutral-light`** | `border-neutral-light` | Bordes, divisores, separadores, sliders inactivos |
| **`neutral-medium`** | `text-neutral-medium` | Textos secundarios, descripciones, precios tachados |
| **`neutral-dark`** | `text-neutral-dark` | Texto general de lectura, párrafos de cuerpo |
| **`neutral-black`** | `text-neutral-black` | Títulos de alta jerarquía (H1, H2), nombres de producto |

### Tipografía

| Clase | Fuente | Uso |
| :--- | :--- | :--- |
| `font-title` | **Poppins** (400, 600, 700) | Títulos y encabezados de alta jerarquía |
| `font-sans` | **Inter** | Cuerpo de texto, tablas y formularios (por defecto en `<body>`) |

Ambas se cargan con `next/font/google` en `src/app/layout.tsx`. **Prohibido** importarlas por `<link>` o `@import`.

---

## 3. Componentes Canónicos (Core Components)

Los componentes base se encuentran en `../frontend/src/core/components/`:

```
core/components/
├── buttons/        # Botones con variantes semánticas y estados
├── data-display/   # Tablas, badges, listas de datos
├── dev/            # Componentes de desarrollo/debugging
├── feedback/       # Alerts, toasts, estados vacíos, loading
├── forms/          # Inputs, selects, checkboxes con accesibilidad
├── layout/         # Containers, grids, wrappers de página
├── navigation/     # Navbar, sidebar, breadcrumbs
└── overlays/       # Modales, drawers, popovers
```

**Reglas de uso obligatorio:**
1. Todo botón usa el componente canónico de `buttons/` — no `<button>` nativo sin wrapper.
2. Todo modal usa el componente de `overlays/` con focus trap y cierre por Escape.
3. Todo input y select usa el componente de `forms/` con label, helper text y aria-describedby.
4. Toda pantalla implementa los **4 estados de UI:** Loading, Empty, Error, Success.

---

## 4. Estructura de Módulos Frontend (Patrón Establecido)

Cada módulo en `../frontend/src/modules/[mXX-nombre]/` sigue el patrón:

```
mXX-nombre/
├── components/     # Componentes específicos del módulo
├── dtos/           # Tipos derivados de los contratos Zod
├── hooks/          # Custom hooks del módulo
├── interfaces/     # Interfaces TypeScript del dominio
├── services/       # Llamadas a la API (usa apiClient.ts de core)
├── store/          # Zustand stores específicos del módulo (si aplica)
└── tests/          # Tests Vitest de componentes y hooks
```

---

## 5. Rutas y Segmentos de la App (Next.js App Router)

```
src/app/
├── (admin)/        # Rutas del panel de administración (empleados + administradores)
├── (auth)/         # Rutas de autenticación (login, registro, recuperación)
└── (public)/       # Rutas públicas (catálogo, búsqueda, producto)
```

---

## 6. API Client y Auth

- **API Client centralizado:** [`../frontend/src/core/api/apiClient.ts`](../frontend/src/core/api/apiClient.ts) — usar exclusivamente para llamadas HTTP. Prohibidas las URLs hardcodeadas en vistas.
- **Auth Hook:** [`../frontend/src/core/auth/useAuth.ts`](../frontend/src/core/auth/useAuth.ts) — hook de autenticación del módulo.
- **Auth Store:** [`../frontend/src/core/store/authStore.ts`](../frontend/src/core/store/authStore.ts) — store Zustand global de sesión.

---

## 7. Visualización de Datos y Dashboards

- Las gráficas analíticas se implementan con librerías React compatibles (a definir via RFC si se requieren).
- Toda gráfica es responsiva y cuenta con tooltips interactivos accesibles.
- Los dashboards del panel de administración consumen datos reales — **prohibidos los mocks en producción**.

---

## 8. Formularios con React Hook Form

Los formularios siguen el patrón:
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MiFormSchema } from '@/modules/mXX/dtos/mi-form.dto';
// El schema Zod viene del contrato en .sdlc/docs/contracts/
```

- Resolver siempre es `zodResolver` con el schema Zod del contrato correspondiente.
- Validación en el cliente deriva 100% del mismo schema que valida el servidor.
- **Un contrato. Dos validaciones. Cero inconsistencias.**
