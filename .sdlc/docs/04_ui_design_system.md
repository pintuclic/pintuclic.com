# 🎨 Sistema de Diseño Institucional y Especificación de UI (Design System)

> **Proyecto:** Pintu Clic
> **Versión:** 1.0.0
> **Responsable:** Frontend Lead Engineer & UI/UX Specialist (Fase 3B)
> **Estado:** TOKENS DEFINIDOS — Componentes base en desarrollo
> **Fuente de Verdad Principal:** `../frontend/src/core/theme/colors.ts`

---

> ⚠️ **INSTRUCCIÓN PARA EL AGENTE FRONTEND ENGINEER:**
> Los tokens de color y la especificación técnica de UI de Pintu Clic son innegociables:
> - **Documento Rector Supremo de UI/UX:** [`../../docs/assets/mockups/Pintu_Clic_UI_Oficial.docx.pdf`](../../docs/assets/mockups/Pintu_Clic_UI_Oficial.docx.pdf) (UI Spec v1.0).
> - **Especificación Panel Admin:** [`../../docs/assets/mockups/pintu_clic_admin_m01_m02_.pdf`](../../docs/assets/mockups/pintu_clic_admin_m01_m02_.pdf) (Vistas M01 y M02).
> - **Catálogo de Referencia Visual Global:** [`../../docs/assets/mockups/VISTAS.pdf`](../../docs/assets/mockups/VISTAS.pdf).
> - **Fuente de verdad de colores en código:** [`../frontend/src/core/theme/colors.ts`](../frontend/src/core/theme/colors.ts)
> - **Guía de uso:** [`../frontend/src/core/theme/GUIA_COLORES.md`](../frontend/src/core/theme/GUIA_COLORES.md)
>
> PROHIBIDO usar colores arbitrarios o maquetar componentes huérfanos que no pertenezcan al kit canónico de `src/core/components/`. Todo diseño debe apegarse a la UI Spec v1.0.

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

## 3. Especificación Técnica de UI (Pintu_Clic_UI_Oficial.docx.pdf)

### 3.1. Radios de Borde y Esquinas
| Elemento | Radio | Clase Tailwind recomendada |
| :--- | :--- | :--- |
| **Inputs / Campos** | 4–6 px | `rounded-input` / `rounded-[6px]` |
| **Botones** | 5–7 px | `rounded-btn` / `rounded-[6px]` |
| **Tarjetas (Cards)** | 6–10 px | `rounded-card` / `rounded-[8px]` |
| **Modales** | 12–16 px | `rounded-modal` / `rounded-[14px]` |

### 3.2. Elevaciones y Sombras
* **Card Default:** `0 2px 8px rgba(0,0,0,0.08)` (`shadow-card`)
* **Card Hover:** `0 8px 16px rgba(0,0,0,0.12)` (`shadow-card-hover`), acompañado de `transform: translateY(-4px)` y transición `all 0.3s ease`.

### 3.3. Jerarquía y Variantes Oficiales de Botón (5 Variantes)
1. **Primario Acción:** Fondo `#0877E8`, texto blanco, hover `#0661BF`.
2. **Primario Conversión:** Fondo `#41BF5A`, texto blanco, hover `#1B6D24` (usado para "Agregar al Carrito" y confirmaciones de compra).
3. **Selección / Opción:** Fondo `#DAEEFC`, borde sutil, estado seleccionado con check `#0877E8` (procesos paso a paso / calculadora).
4. **Outline:** Fondo blanco, borde 1px `#0877E8`, texto `#0877E8`. Hover: fondo `#0877E8`, texto blanco.
5. **Con Ícono:** Ícono integrado (Lucide React, unistroke outline) que acompaña al texto sin competir con él.
* **Estados Innegociables:** Normal, Hover, Active (efecto de hundimiento), Disabled (Fondo `#E5E7EB`, texto `#6B7280`, cursor `not-allowed`).

### 3.4. Componentes Canónicos (Core Components)

Los componentes base se encuentran en `../frontend/src/core/components/`:

```
core/components/
├── buttons/        # Button.tsx (5 variantes oficiales + estados)
├── forms/          # Input.tsx, Checkbox.tsx (radios 4-6px, bordes accesibles)
├── overlays/       # Modal.tsx (overlay oscuro, franja arcoíris, focus trap, Escape)
├── data-display/   # ProductCard.tsx, Badge.tsx (patrocinado #FFC107, oferta #E63946)
├── feedback/       # Skeleton.tsx (esqueletos pulsantes grises), Toasts, Estados Vacíos
├── layout/         # Containers, grids de página (márgenes 24px escritorio / 16px móvil)
└── navigation/     # Header con Mega-menú modal, Navbar, Breadcrumbs
```

**Reglas de uso obligatorio:**
1. Todo botón usa el componente canónico de `buttons/` — no `<button>` nativo sin wrapper.
2. Todo modal usa el componente de `overlays/Modal.tsx` con franja superior arcoíris corporativa, focus trap y cierre por Escape.
3. Todo input y select usa el componente de `forms/` con label, helper text y aria-describedby.
4. Todo producto se renderiza con `ProductCard.tsx` respetando sombras, imagen con `object-fit: contain`, badges y tipografía Poppins.
5. Toda pantalla implementa los **4 estados de UI:** Loading (Skeleton), Empty, Error, Success.

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
