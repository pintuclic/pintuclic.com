# 🎨 Sistema de Colores Globales — PINTUCLIC Design System

> **Fuente de verdad:** [`colors.ts`](./colors.ts) → mapeada en [`tailwind.config.ts`](../../../tailwind.config.ts)

---

## ⛔ DIRECTIVA ESTRICTA (Zero Tolerance)

**PROHIBIDO ABSOLUTAMENTE para desarrolladores y Agentes de IA:**
1. Colores hexadecimales arbitrarios en clases Tailwind (ej: `bg-[#002855]`, `text-[#333]`).
2. Colores por defecto de Tailwind fuera de la paleta aprobada (ej: `bg-purple-600`, `text-pink-500`).
3. Estilos inline (`style="color: ..."`), salvo valores calculados en runtime.

**Todo color DEBE invocarse mediante los tokens semánticos oficiales.**

---

## Matriz Oficial de Tokens

| Rol | Nombre | HEX | Fondo | Texto | Borde | Uso |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| **Corporativo** | Azul Oscuro | `#002855` | `bg-corporate` | `text-corporate` | `border-corporate` | Títulos, precios, header |
| **Acción** | Azul Vivo | `#0877E8` | `bg-action` | `text-action` | `border-action` | Botones primarios, enlaces |
| **SubAcción** | Azul Claro | `#DAEEFC` | `bg-subaction` | `text-subaction` | `border-subaction` | Botones secundarios |
| **Conversión** | Verde | `#41BF5A` | `bg-conversion` | `text-conversion` | `border-conversion` | Agregar al carrito |
| **Conversión Hover** | Verde Oscuro | `#1B6D24` | `bg-conversion-hover` | `text-conversion-hover` | — | Hover de compra |
| **Destacado** | Amarillo | `#FFC107` | `bg-highlight` | `text-highlight` | `border-highlight` | Badges, estrellas |
| **Peligro** | Rojo | `#E63946` | `bg-danger` | `text-danger` | `border-danger` | Eliminar, logout |
| **Peligro Hover** | Rojo Oscuro | `#D62828` | `bg-danger-hover` | `text-danger-hover` | — | Hover destructivo |
| **Oferta** | Rojo Ofertas | `#E63946` | `bg-offer` | `text-offer` | `border-offer` | Badges de descuento |
| **Neutro Blanco** | Blanco | `#FFFFFF` | `bg-neutral-white` | `text-white` | — | Tarjetas, modales |
| **Neutro Lightest** | Gris Fondo | `#F7F8FA` | `bg-neutral-lightest` | — | — | Fondo de página |
| **Neutro Light** | Gris Bordes | `#E5E7EB` | `bg-neutral-light` | — | `border-neutral-light` | Bordes, divisores |
| **Neutro Medium** | Gris Secundario | `#6B7280` | — | `text-neutral-medium` | — | Textos secundarios |
| **Neutro Dark** | Gris Cuerpo | `#374151` | — | `text-neutral-dark` | — | Párrafos |
| **Neutro Black** | Negro Títulos | `#111827` | — | `text-neutral-black` | — | H1, H2, nombres |
