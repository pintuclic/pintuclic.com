# WALKTHROUGH DE IMPLEMENTACIÓN — FP-01 · Landing page pública (Frontend)

> 📌 **Frente propio:** `FP-01 — Landing page pública (Home)` (no pertenece a ninguno de los 21 módulos; registrado por el Director Humano el 2026-10-22)
> 🏷️ **Capa:** Frontend (Next.js 15 + React 19 + Tailwind CSS 4) · 🎯 **Fase:** 3B · **Gate:** 3B — revisión visual del Director Humano

## 1. Metadatos
* **Versión:** `v0.5.0` · **Fecha:** 22/10/2026
* **Autor / Responsable:** DanExl24 (@DanExl24) — con asistencia de un agente de IA
* **Fuentes de verdad:** `docs/assets/mockups/VISTAS.pdf` (solo la página 1, por indicación del Director) · `ESPECIFICACION_TECNICA_UI_UX.md` §2, §3.1–3.3, §4.1, §5, §6 · tipografía Poppins + Inter (`Pintu_Clic_UI_Oficial.md` §2.2)
* **Autorizaciones registradas** (`current_state.json`, bloqueo `FRENTE_PROPIO_AUTORIZADO`): ampliar `frontend/src/core/`, datos estáticos temporales, la landing vive fuera de `src/modules/`.

## 2. Qué se entrega
Ruta `/` con las 7 piezas de la UI Spec §4.1, en el orden del mockup:

| # | Sección | Implementación |
| :-: | :--- | :--- |
| 1 | Topbar + header + navegación | `Topbar`, `Header` (logo, botón "Categorías", navegación con "Inicio" activo y pastilla "OFERTAS", cuenta, carrito con contador y total) |
| — | Mega-menú (§3.2) | `CategoriesMegaMenu`: modal centrado con los 3 grupos y la banda del asistente |
| 2 | Hero | `Carousel` + `HeroSection`: titular en 2 líneas (segunda en amarillo `highlight`), "Comprar ahora" (conversión) y "Pedir asesoría" (`outline-light`) |
| 3 | Franja de confianza | `TrustStrip`: 4 pilares con divisores |
| 4 | Buscador + herramientas | `SearchBar` (GET `/productos`, selector de categoría) + "Calculadora" y "Asesorías de color" |
| 5 | Productos destacados | `ScrollRow` + `ProductCard` (5 tarjetas, insignia `-15%`, "Ver todos") |
| 6 | Categorías | `CategoryCard` × 5 |
| 7 | Footer | `Footer`: marca, redes, 2 columnas, contacto, banda legal con año calculado |

En móvil la navegación pasa a un panel modal, el buscador y los accesos se apilan, los productos se deslizan y las categorías van en 2 columnas.

## 3. Core Kit ampliado (autorizado)
| Nuevo | Propósito |
| :--- | :--- |
| `buttons/button-styles.ts` | Estilos canónicos compartidos por `Button` y `ButtonLink` (nueva variante `outline-light` para fondos oscuros) |
| `buttons/ButtonLink.tsx` · `buttons/IconButton.tsx` | Navegación con apariencia de botón · botón circular de ícono con `aria-label` obligatorio |
| `forms/Select.tsx` · `forms/SearchBar.tsx` | Select del kit (`field`/`bare`) · buscador compuesto que funciona sin JavaScript |
| `layout/Container, Logo, Topbar, Header, CategoriesMegaMenu, Footer` | Estructura pública |
| `navigation/Carousel.tsx` · `navigation/ScrollRow.tsx` | Carrusel accesible (patrón WAI-ARIA, `inert`, respeta `prefers-reduced-motion`) · fila desplazable con flechas solo si hay desborde |
| `data-display/CategoryCard.tsx` · `utils/moneda.ts` | Mosaico de categoría con texto real · `formatCOP` |

| Modificado (compatible hacia atrás) | Cambio |
| :--- | :--- |
| `Button.tsx` | Usa `button-styles.ts`; mismo comportamiento (suite de M17 en verde) |
| `Input.tsx` / `Badge.tsx` | Props opcionales `appearance="bare"` / `pill` |
| `ProductCard.tsx` | `href` opcional (nombre y "Ver producto" pasan a ser enlaces), precio "$ 89.900 COP" (UI Spec §4.1.1), `mix-blend-multiply` para fotos con fondo blanco, dimensiones de imagen, objetivos táctiles de 44 px en móvil |
| `app/layout.tsx` | Poppins 500 (botones y badges, §2.2) y declaración del favicon |

## 4. Decisiones de diseño frente al mockup (para revisar en el Gate)
1. **Botón de carrito de la tarjeta:** el mockup lo pinta verde oscuro (`#1A6D23`); se aplica la UI Spec (rector supremo): `#41BF5A` con hover `#1B6D24`.
2. **Fondos:** el blanco con tinte lila del mockup (`#FBF8FD`) no es un token; se usan `neutral-white` y `neutral-lightest`.
3. **Alineación:** el mockup alinea secciones en x = 20…67; se normalizó a un único contenedor `max-w-7xl`.
4. **Mosaicos de categoría:** se añadió un degradado corporativo detrás del texto para garantizar contraste 4.5:1 sobre arte claro (p. ej. amarillo).
5. **Hero:** el mockup muestra 3 puntos de carrusel pero solo existe el arte y el texto de un slide; no se inventó contenido. Con una diapositiva el carrusel oculta los controles; al añadir más en `home.content.ts` aparecen solos.
6. **Flecha de "Productos destacados":** aparece solo si hay productos fuera de vista (con 5 en escritorio caben todos).
7. **Mega-menú y móvil:** no están en la página 1 del mockup; se derivaron de la UI Spec §3.2 y §6.

## 5. Datos estáticos temporales y activos
* Todo el contenido vive en `src/app/(public)/_data/shell.content.ts` y `home.content.ts`, marcado como **TEMPORAL**: carrito (3 · $ 178.900), sesión, productos y categorías serán reactivos con M05, M04 y M01. No se siembra nada en base de datos (Directiva #10).
* **Imágenes:** el hero usa `frontend/assets/hero-storefront-D9L_fhlS.png` (provisto por el Director). Logo, productos y categorías son **marcadores extraídos de la página 1 del mockup** en `public/images/landing/`; los mosaicos se recompusieron desde sus capas originales para que no lleven texto incrustado. Se reemplazan sobrescribiendo los archivos, sin tocar código.
* Redes sociales: dominios genéricos hasta recibir las cuentas oficiales.

## 6. Verificación
| Puerta | Resultado |
| :--- | :---: |
| `npm run build` (incluye `check:no-any`) | ✅ `/` prerenderizada estática, 122 kB de carga inicial |
| `npx tsc --noEmit` · `npm run lint` · `npm run lint:a11y` | ✅ 0 errores · 0 avisos |
| `check:no-any` | ✅ 0 ANY |
| Auditorías del repo `audit-a11y` · `audit-core-kit` | ✅ Aprobado (WCAG 2.1 AA) · ✅ Directiva #13 |
| Vitest frontend | ✅ 12/12 suites · **103/103** (+38 de la landing: render en servidor de cada componente del kit e integridad del contenido, incluida la existencia de cada imagen) |
| **Navegador real** (Chrome, servidor de producción) a 1366 px y 500 px | ✅ Sin desborde horizontal; todos los objetivos táctiles visibles ≥ 44 px; mega-menú: diálogo con nombre, foco retenido, `Escape` cierra y devuelve el foco, `aria-expanded` sincronizado |

### Limitaciones conocidas
* **14 errores 404 en consola** por el *prefetch* automático de Next.js hacia rutas que aún no existen (`/productos`, `/login`, `/carrito`, fichas de producto…). Desaparecen cuando M01, M04 y M05 construyan esas rutas; no se desactivó el prefetch para no degradar el comportamiento futuro.
* El ancho mínimo de la ventana de Chrome usada fue 500 px; la vista de 390 px se derivó del mismo layout *mobile-first* y queda para la revisión del Gate.
* `public/favicon.svg` pesa 1,1 MB y `favicon.png` 0,85 MB (activos del Director): conviene optimizarlos.
* No hay pruebas de interacción en DOM (el proyecto no tiene `jsdom` ni Testing Library); la interacción se verificó en el navegador real.

## 7. Dependencias externas
* **Habilita:** la estructura pública (header, footer, buscador) que reutilizarán las vistas de M01, M02, M04 y M05.
* **Depende para ser reactiva de:** M01 (productos y categorías), M05 (carrito), M04 (sesión y "Mi cuenta").

## 8. Archivos
```
frontend/src/app/(public)/layout.tsx · page.tsx
frontend/src/app/(public)/_components/{HeroSection,TrustStrip,ToolsBar,FeaturedProducts,CategoryExplorer}.tsx
frontend/src/app/(public)/_data/{shell,home}.content.ts
frontend/src/app/(public)/tests/landing.content.test.ts
frontend/src/core/components/** (ver §3) · frontend/src/core/utils/moneda.ts
frontend/src/core/tests/componentes-landing.test.tsx
frontend/src/app/layout.tsx
frontend/public/images/landing/*.png (marcadores temporales)
```
