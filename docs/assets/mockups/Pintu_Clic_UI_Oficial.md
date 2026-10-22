# 🎨 Especificación Técnica de Requisitos de Interfaz de Usuario (UI Spec)
## Documento Rector de Arquitectura Visual y Experiencia de Usuario (v1.0 Estable)

> **Proyecto:** Pintu Clic (`pintuclic.com`) — Módulo de Catálogo, Vistas Públicas y Panel Admin  
> **Versión:** 1.0 (Estable — Aprobado para Desarrollo)  
> **Responsable Original:** Sahira  
> **Archivo PDF Fuente:** [`Pintu_Clic_UI_Oficial.docx.pdf`](./Pintu_Clic_UI_Oficial.docx.pdf)  
> **Documento Canónico en Arquitectura:** [`docs/00_SISTEMA/01_ARQUITECTURA/ESPECIFICACION_TECNICA_UI_UX.md`](../00_SISTEMA/01_ARQUITECTURA/ESPECIFICACION_TECNICA_UI_UX.md)  
> **Implementación en Código:** [`frontend/src/core/components/`](../../../frontend/src/core/components/) · [`frontend/src/core/theme/colors.ts`](../../../frontend/src/core/theme/colors.ts) · [`frontend/tailwind.config.ts`](../../../frontend/tailwind.config.ts)

---

## 🚦 Declaración de Autoridad para Agentes de IA y Desarrolladores

Este documento transcribe, estructura y formaliza la totalidad de la **Especificación Técnica de UI (UI Spec v1.0)** de Pintu Clic.

> ⛔ **DIRECTIVA INNEGOCIABLE:**  
> Todo agente de IA o desarrollador frontend que vaya a implementar vistas, páginas (`src/app/`), modales o componentes de negocio en `frontend/` **DEBE consultar este documento como su fuente rectora suprema de maquetación**.
> Queda terminantemente prohibido inventar colores hexadecimales ad-hoc, radios de borde arbitrarios, componentes nativos huérfanos o alterar los contratos de estado visual aquí establecidos. Todo elemento debe consumirse desde `@/core/components`.

---

## 1. Objetivo y Alcance

### 1.1. Objetivo
Garantizar una experiencia de usuario consistente, intuitiva y alineada estrictamente con la identidad corporativa de **Pintu Clic**, facilitando la exploración, filtrado, selección y compra de pinturas y suministros en dispositivos de escritorio y móviles.

### 1.2. Alcance
Cubre todas las vistas con diseño definido en el sistema:
1. Estructura general de página (Header, Mega-menú, Toolbars, Footers).
2. Detalle micro de componentes (Tarjetas, Filtros, Botones, Modales, Sliders, Badges).
3. Estados interactivos (Default, Hover, Active/Pressed, Disabled, Loading).
4. Adaptabilidad responsiva bajo enfoque **Mobile-First**.
5. Criterios de aceptación formales para certificación QA.

---

## 2. Identidad Visual y Sistema de Diseño

### 2.1. Paleta Cromática Institucional (Tokens Oficiales)

La interfaz utiliza **exclusivamente** los siguientes valores HEX registrados en `frontend/src/core/theme/colors.ts`. Prohibido el uso de colores arbitrarios.

| Rol | Color | HEX | Clase Tailwind Oficial | Aplicación Principal y Contexto |
| :--- | :--- | :---: | :--- | :--- |
| **Corporativo** | Azul Oscuro | `#002855` | `bg-corporate`, `text-corporate` | Títulos principales (H1), precios destacados, navegación principal, footer institucional. |
| **Acción** | Azul Vivo | `#0877E8` | `bg-action`, `hover:bg-action-hover`, `text-action`, `border-action` | Botones primarios de acción, enlaces, bordes de elementos activos, sliders de rango activos. |
| **SubAcción** | Azul Claro | `#DAEEFC` | `bg-subaction`, `border-subaction` | Botones secundarios de selección, subprocesos paso a paso (ej. opción Paredes en Calculadora). |
| **Conversión** | Verde Principal | `#41BF5A` | `bg-conversion`, `text-conversion` | Botón "Agregar al Carrito", confirmaciones de compra, hitos aprobados. |
| **Conversión (Hover)** | Verde Oscuro | `#1B6D24` | `hover:bg-conversion-hover` | Estado hover estricto del botón de carrito y conversión. |
| **Destacado** | Amarillo | `#FFC107` | `bg-highlight`, `text-highlight` | Etiquetas de "Patrocinado", estrellas de valoración, alertas de atención. |
| **Peligro / Oferta** | Rojo | `#E63946` | `bg-danger`, `bg-offer`, `text-danger` | Badges de "Oferta" o descuentos, errores de formulario, acciones destructivas. |
| **Neutros** | Blanco | `#FFFFFF` | `bg-neutral-white` | Fondos de tarjetas, modales, superficies y tarjetas interactivas. |
| **Neutros** | Gris Muy Claro | `#F7F8FA` | `bg-neutral-lightest` | Fondo de página general, contenedor de imágenes de producto. |
| **Neutros** | Gris Claro | `#E5E7EB` | `border-neutral-light`, `bg-neutral-light` | Bordes generales, divisores, sliders inactivos, estados deshabilitados. |
| **Neutros** | Gris Medio | `#6B7280` | `text-neutral-medium` | Textos secundarios, marcas, descripciones cortas, precios tachados. |
| **Neutros** | Gris Oscuro | `#374151` | `text-neutral-dark` | Texto general de lectura y párrafos de cuerpo. |
| **Neutros** | Negro | `#111827` | `text-neutral-black` | Títulos de alta jerarquía, nombres de productos en cards y detalles. |

---

### 2.2. Tipografía Oficial (Poppins + Inter)

Se utilizan únicamente dos familias tipográficas, configuradas vía `next/font/google` en `src/app/layout.tsx`:

#### 1. Poppins (`font-title` / `var(--font-poppins)`)
Exclusiva para títulos y elementos de mayor jerarquía visual:
* **Bold (700):** Títulos de página H1 (`text-2xl` a `text-3xl`) y precios actuales de productos (`text-xl` a `text-2xl`, `#002855`).
* **SemiBold (600):** Títulos de sección H2, nombres de productos en cards (`text-base`, `#111827`) y encabezados de filtros.
* **Medium (500):** Textos de botones (`text-sm`), badges y pestañas/tabs activas.

#### 2. Inter (`font-sans` / `var(--font-inter)`)
Para el contenido general de lectura y la estructura de datos (fuente por defecto del `<body>`):
* **Regular (400):** Cuerpo de texto general, descripciones de producto, marcas, metadatos y valores de tablas.
* **Medium (500):** Labels de formularios que requieran mayor énfasis, resúmenes de precios y subtítulos de apoyo.
* **Light (300):** Textos legales secundarios, disclaimers y notas al pie.

---

### 2.3. Iconografía (Unistroke Lineal)

* **Estilo obligatorio:** Iconografía de un solo trazo (outline/lineal), grosor uniforme (stroke width `1.5` a `2px`) y terminaciones redondeadas (`stroke-linecap="round" stroke-linejoin="round"`).
* **Librería oficial:** **`lucide-react`** (instalada en el core).
* **Uso correcto:** Íconos limpios en outline (casa `Home`, carrito `ShoppingCart`, camión `Truck`, corazón `Heart`, lupa `Search`, escudo `ShieldCheck`, rodillo `Paintbrush`, usuario `User`).
* ❌ **Uso incorrecto:** Iconos con relleno sólido (*solid/filled*), iconos multicolores o con detalles internos excesivos.

---

### 2.4. Espaciado y Grid (Sistema de Múltiplos de 8px)

* **Sistema base:** Todos los márgenes, paddings y gaps deben ser múltiplos de 8px (8px, 16px, 24px, 32px, 40px, 48px, etc.).
* **Contenedor de Página:**
  * **Escritorio (> 1024px):** `max-w-7xl mx-auto px-6` (márgenes laterales de 24px).
  * **Móvil (< 768px):** `px-4` (márgenes laterales de 16px).
* **Gutter (separación entre columnas):** 24px (`gap-6`).
* **Espaciado entre tarjetas de catálogo:**
  * Separación vertical: 32px (`gap-y-8`).
  * Separación horizontal: 24px (`gap-x-6`).

---

### 2.5. Bordes y Esquinas Redondeadas

La interfaz utiliza bordes suaves y consistentes definidos en `tailwind.config.ts`:

| Elemento | Radio Exacto | Clase Tailwind Oficial |
| :--- | :---: | :--- |
| **Inputs / Campos de texto** | 4–6 px | `rounded-input` (`rounded-[6px]`) |
| **Botones** | 5–7 px | `rounded-btn` (`rounded-[6px]`) |
| **Tarjetas (Cards)** | 6–10 px | `rounded-card` (`rounded-[8px]`) |
| **Modales / Overlays** | 12–16 px | `rounded-modal` (`rounded-[14px]`) |

---

### 2.6. Botones: Jerarquía, Variantes y Estados

Implementados en el componente canónico [`Button.tsx`](../../../frontend/src/core/components/buttons/Button.tsx).

#### Las 5 Variantes Oficiales:
1. **5.1 Primario (Acción / Conversión):**
   * *Acción (`variant="primary-action"`):* Fondo `#0877E8`, hover `#0661BF`, texto blanco. Para navegación, confirmación general y herramientas.
   * *Conversión (`variant="primary-conversion"`):* Fondo `#41BF5A`, hover `#1B6D24`, texto blanco. Exclusivo para "Agregar al Carrito" y "Proceder al Pago".
2. **5.2 Selección / Opción (`variant="selection"`):**
   * Fondo claro `#DAEEFC` con borde `#0877E8` cuando está seleccionado (con checkmark azul); fondo blanco con borde gris `#E5E7EB` cuando está inactivo. Usado en asistentes paso a paso (Calculadora, Asesoría de Color).
3. **5.3 Outline (`variant="outline"`):**
   * Borde 1px `#0877E8`, texto `#0877E8`, fondo blanco. Hover: fondo `#0877E8` con texto blanco. Para acciones secundarias ("Ver producto", "Seguir comprando").
4. **5.4 Con Ícono (`leftIcon` / `rightIcon`):**
   * El ícono acompaña al texto sin competir con él (lupa en búsqueda, carrito en compra, flecha en siguiente).
5. **5.5 Ghost (`variant="ghost"`):**
   * Sin fondo ni borde, texto neutro, hover sutil gris `#F7F8FA`.

#### Estados Innegociables:
* **Normal:** Color y sombra base.
* **Hover:** Intensificación cromática (`hover:bg-action-hover` o `hover:bg-conversion-hover`), elevación ligera.
* **Activo / Presionado:** Efecto de hundimiento táctil (`active:scale-[0.98]`).
* **Deshabilitado (Disabled):** Fondo `#E5E7EB`, texto `#6B7280`, cursor `not-allowed`, borde transparente.

---

## 3. Estructura de la Página y Elementos Globales

### 3.1. Header y Navegación
* **Topbar Superior:** Fondo azul oscuro `#002855`, texto blanco pequeño (`text-xs`): "Envíos a toda Colombia", "Productos de calidad", "Asesoría experta", "Teléfono de atención".
* **Header Principal:**
  * Logotipo oficial Pintu Clic a la izquierda.
  * Botón destacado **"Categorías"** (abre el Mega-menú modal).
  * Enlaces de navegación: Inicio, Productos, Servicios, Promociones (badge rojo "OFERTAS"), Sobre Nosotros.
  * Zona derecha: Acceso a "Mi cuenta" e ícono de Carrito con contador badge numérico y monto total.

### 3.2. Mega-Menú Modal de Categorías
Se activa desde el botón "Categorías" del header.
* **Comportamiento:** Se presenta como un **panel modal centrado** sobre la página con overlay oscuro (`bg-neutral-black/60`), **NO como un simple dropdown desplegable**.
* **Cabecera:** Título "Categorías" con icono y botón de cierre `(X)` a la derecha.
* **Contenido en 3 Grupos Principales:**
  1. *Pinturas:* Decorativos, Metales, Automotriz, Mantenimiento industrial.
  2. *Construcción y Protección Personal:* Estuco, Graniplas, Siliconas, Guantes, Gafas, Respiradores.
  3. *Accesorios y Herramientas:* Rodillos, Brochas, Cintas, Lijas, Eléctricas, Manuales, Neumáticas, Inalámbricas.
* Cada ítem cuenta con un chevron `>` que indica subcategorías.
* **Banda Inferior de Asistente:** Recuadro decorativo con el texto *"¿No sabes qué pintura necesitas? Te ayudamos a encontrar el ideal para tu proyecto"* y botón de acción azul *"Encontrar pintura ideal"* que enlaza al wizard de Asesoría de Color.

### 3.3. Estructura de la Vista de Catálogo
1. **Encabezado de Sección:** Breadcrumbs (`Inicio > Productos`), Título H1 "Catálogo de productos" (Poppins Bold 32px `#002855`) y subtítulo explicativo.
2. **Barra de Herramientas Sticky:** Contador de resultados ("Mostrando 1-12 de 128"), dropdown de ordenamiento (precio, relevancia, novedad) y selector de vista Grid/Lista.
3. **Área Principal en 2 Columnas:**
   * Columna Izquierda (25%): Panel de filtros sticky.
   * Columna Derecha (75%): Grid de productos responsivo (4 columnas en escritorio, 2 en móvil).
4. **Sección de Complementos:** "Completa tu proyecto" con carrusel/grid de productos complementarios.
5. **Footer Institucional:** Fondo `#002855`, columnas de navegación, sellos de pago y políticas legales.

---

## 4. Especificación Detallada por Vista

---

### 4.1. Página de Inicio (Home)
* **Objetivo:** Presentar la propuesta de valor, dar acceso inmediato a herramientas de asesoría y exhibir productos destacados.
* **Estructura (arriba hacia abajo):**
  1. *Topbar + Header + Navegación.*
  2. *Hero / Banner Principal:* Título "Todo para tu proyecto, en un solo lugar", subtítulo, CTA primario "Comprar ahora" (verde) y CTA secundario "Pedir asesoría" (outline blanco), imagen de productos destacados y controles de slide.
  3. *Franja de Confianza (4 Pilares):* Compra segura, Productos de calidad, Envíos rápidos, Pagos seguros.
  4. *Buscador Destacado + 2 Accesos Directos a Herramientas:*
     * Botón "Calculadora" (verde `#41BF5A`).
     * Botón "Asesoría de color" (azul `#0877E8`).
  5. *Sección "Productos Destacados":* Grid de 5 tarjetas de producto + enlace "Ver todos".
  6. *Sección "Explora nuestras categorías":* 5 tarjetas con imagen, nombre y botón "Ver productos".
  7. *Footer Institucional.*

---

### 4.1.1. Tarjeta de Producto Canónica (`ProductCard.tsx`)
Componente central del catálogo y del home. Especificación milimétrica:

```text
┌──────────────────────────────────────────┐
│ [Patrocinado] [Oferta -20%]              │  <- Badges superiores izquierda
│                                          │
│             [IMAGEN PRODUCTO]            │  <- Fondo #F7F8FA, object-fit: contain
│                                          │
├──────────────────────────────────────────┤
│ MARCA (Poppins 12px #6B7280)             │
│ Nombre del Producto (Poppins 16px #111827)│  <- line-clamp: 2, hover:text-action
│ Descripción breve (Inter 12px #6B7280)   │
│                                          │
│ $ 120.000 COP (Tachado, 14px)            │
│ $ 98.900 COP (Poppins Bold 20px #002855) │  <- Precio destacado
├──────────────────────────────────────────┤
│ [ Ver producto ]        [ 🛒 ]           │  <- Botón Outline + Botón Verde Carrito
└──────────────────────────────────────────┘
```

* **Contenedor:** Fondo `#FFFFFF`, radio `8px`, sombra `0 2px 8px rgba(0,0,0,0.08)`, borde `border-neutral-light/60`.
* **Hover:** `translateY(-4px)`, sombra `0 8px 16px rgba(0,0,0,0.12)`, transición `all 0.3s ease`.
* **Imagen:** Altura 208px (`h-52`), fondo `#F7F8FA`, centrada vertical y horizontalmente, `object-fit: contain`.
* **Badges:** Superpuestos en esquina superior izquierda. Fondo `#FFC107` (Patrocinado) o `#E63946` (Oferta), radio 4px.
* **Precios:** Precio actual Poppins Bold 20px `#002855`; precio anterior tachado Poppins Regular 14px `#6B7280`.
* **Acciones:** Botón outline "Ver producto" + Botón de conversión cuadrado/circular verde `#41BF5A` con ícono de carrito blanco (hover `#1B6D24`).

---

### 4.2. Autenticación: Modal Multi-Paso de Registro (`Modal.tsx`)
* **Objetivo:** Registro de nuevos clientes con verificación de correo mediante código OTP de 6 dígitos.
* **Estructura Modal:** Fondo blanco, radio 14px (`rounded-modal`), overlay oscuro con backdrop-blur, **franja superior decorativa en degradado de marca arcoíris**.
* **Stepper de 3 Pasos:**
  1. **Paso 1 — Datos:**
     * Selector de tipo de cuenta con dos tabs: **"Natural"** y **"Empresa"**.
     * Campos de entrada: Nombre completo, Correo electrónico, Teléfono (WhatsApp) y Contraseña.
     * Checkboxes obligatorios: Aceptación de Términos y Condiciones y Política de Tratamiento de Datos.
     * Botón primario: "Continuar" (ancho completo, azul `#0877E8`).
     * Enlace inferior: "¿Ya tienes cuenta? Inicia sesión".
  2. **Paso 2 — Verificación:**
     * Título "Verifica tu correo" + texto explicativo con correo enmascarado (ej: `a***@correo.com`).
     * **6 casillas individuales para código OTP** con autoenfoque y salto automático.
     * Banner informativo verde claro: *"El código expira en 10 minutos. Tu cuenta se activa al confirmarlo."*
     * Enlace: "¿No te llegó? Reenviar código".
     * Botón primario: "Verificar y crear cuenta" (azul `#0877E8`).
     * Enlace secundario: "← Volver al paso anterior".
  3. **Paso 3 — Listo:**
     * Ícono de check circular en verde claro.
     * Título "¡Cuenta creada!" y mensaje de éxito.
     * Botón primario: "Empezar a comprar" (azul) y enlace "Volver al inicio".

*Nota de reutilización:* El formulario de registro empresarial (con NIT, Razón Social y RUT) y el modal de Inicio de Sesión mantienen exactamente esta misma estructura y estilo visual.

---

### 4.3. Catálogo de Productos y Sidebar de Filtros
* **Panel de Filtros (Sidebar Izquierdo):**
  * Posición: Columna izquierda (25%), fijo (`sticky top-24`) al hacer scroll.
  * Acordeones colapsables: Categorías, Marcas, Rango de Precio y Disponibilidad.
  * Título del panel: "Filtros" con botón "Limpiar todo" en azul `#0877E8`.
  * Checkboxes: Personalizados con relleno azul `#0877E8` y contador de productos entre paréntesis `(#6B7280)`.
  * Rango de Precio: Slider de doble extremo con riel gris `#E5E7EB`, barra activa azul `#0877E8`, perillas circulares y dos inputs numéricos (Mínimo / Máximo) debajo.
  * Botón final: "Aplicar filtros" (ancho completo, azul `#0877E8`, radio 6px).
* **Productos Patrocinados (Sección 4.3.4):**
  * Título de bloque con ícono de estrella o pastilla ámbar.
  * Mantiene la misma tarjeta estándar pero con la etiqueta visible "Patrocinado" (`bg-highlight text-neutral-black`).

---

### 4.4. Detalle de Producto (Página Completa)
* **Objetivo:** Mostrar información técnica completa, variantes y permitir compra inmediata.
* **Estructura (Layout de 2 Columnas):**
  * *Columna Izquierda (Visualizador Interactivo):* Sección visual en formato 3D o relieve que simula un espacio/habitación y permite cambiar las tonalidades de las paredes según el color seleccionado.
  * *Columna Derecha (Información y Compra):*
    * Breadcrumbs: `Inicio > Pinturas > Interiores > [Producto]`.
    * Nombre del producto (H1, Poppins Bold 28px).
    * Precio destacado en `#002855`.
    * Acordeón colapsable con ficha técnica y "Descripción".
    * **Selector de Color:** Swatches circulares con borde activo al seleccionar.
    * **Selector de Presentación:** Botones tipo pill ("1/4 Gal.", "1 Gal.", "Cuñete 5 Gal.").
    * Acceso directo: *"Calcula cuánta pintura necesitas"* (abre el modal de la Calculadora).
    * Selector de cantidad (stepper `- / +`) junto al botón primario "Comprar" (verde `#41BF5A`).
    * Badge de disponibilidad: *"Retira hoy en tienda"* y aclaración: `*Los colores mostrados son referenciales y pueden variar según la pantalla`.

---

### 4.5. Asesoría de Color (Wizard Conversacional)
* **Objetivo:** Guiar al cliente indeciso mediante preguntas secuenciales interactivas.
* **Diseño Visual:**
  * Franja superior en azul oscuro `#002855` con título: *"¡Hola! Bienvenido al sistema de asesoría de Color"*.
  * Barra de progreso delgada en degradado de marca en la parte superior del panel.
  * **Formato "Burbuja de Chat":** Avatar circular corporativo + globo de texto con la pregunta activa (ej. *"¿Qué superficie se va a pintar?"*).
  * **Tarjetas de Respuesta (2 Columnas):** Botones grandes con ícono, texto y check azul: Paredes interiores, Fachadas exteriores, Madera, Metal, Otros.
  * **Footer de Navegación:** Botón outline "Cancelar" y botón primario verde "Siguiente →".

---

### 4.6. Calculadora de Pintura (Modal de 3 Pasos)
* **Modal centrado:** Fondo blanco, radio 14px, franja arcoíris superior, botón de cierre `(X)`.
* **Dos modalidades de acceso:**
  1. *Modalidad Menú General:* El usuario selecciona producto, medidas y espacio.
  2. *Modalidad Contextual (Detalle de Producto):* El producto ya está preseleccionado y solo solicita medidas.
* **Pasos:**
  * **Paso 1 — ¿Qué vas a pintar?:** Opciones tipo botón de selección (Paredes, Techos, Puertas, Muebles).
  * **Paso 2 — Ingresa las medidas:** Inputs numéricos de Ancho (m) y Alto (m), stepper de *"Cantidad de paredes iguales"*, y caja destacada en azul claro `#DAEEFC`: **"Área total a pintar: 25 m²"**.
  * **Paso 3 — Resultado:** Tarjeta de producto recomendado, mensaje destacado: *"Necesitas aproximadamente: 2 GALONES (Para 2 manos)"*, botón azul "Producto recomendado" y botón verde "Agregar al carrito".
  * Disclaimer al pie: *"El cálculo es aproximado y referencial según la textura y porosidad de la superficie."*

---

### 4.7. Carrito de Compras (Dos Variantes Oficiales)

#### Variante A: Drawer Lateral Deslizante (Slide-over)
* Panel deslizante desde el borde derecho, ancho aproximado 420px sobre overlay oscuro.
* Stepper horizontal de 3 etapas: **Carrito** (activo, azul) → **Pago** → **Orden**.
* Lista de productos con miniatura, nombre, variante, SKU, stepper de cantidad y botón eliminar rojo.
* Franja de asistencia: *"¿Necesitas ayuda? Un asesor puede revisar tu compra"* con botón WhatsApp.
* Sección *"Complementa tu proyecto":* Tarjetas compactas de accesorios con botón `(+)` para añadir con 1 clic.
* Resumen inferior fijo en azul corporativo: Subtotal, Envío estimado, Total y botón verde "Continuar compra".

#### Variante B: Página Completa (`/carrito`)
* Layout de 2 columnas: 70% lista de productos / 30% resumen de la orden sticky.
* Campo para cupón de descuento con botón "Aplicar".
* Sellos de confianza visibles: Pago seguro SSL, Envíos rápidos garantizados.

---

### 4.8. Seguimiento de Pedidos (`/seguimiento`)
* Banner de cabecera ilustrado con bote de pintura y brocha sobre salpicaduras de color.
* Tarjeta de datos: Número de pedido, fecha de realización, fecha estimada y badge "En camino" con ícono de camión.
* **Timeline Vertical de 5 Hitos:**
  1. Pedido Confirmado (Check verde).
  2. Pago Verificado (Check verde).
  3. En Preparación (Ícono de reloj/caja).
  4. En Camino (Ícono de camión azul activo).
  5. Entregado (Ícono gris pendiente).
* Panel derecho: Datos de Despacho (transportadora, guía) y Detalle de Compra con miniaturas y desglose de precios.
* Banner informativo en lenguaje natural: *"¡Tu pedido está en camino! Te notificaremos cuando llegue a tu destino"*.

---

### 4.9. Historial de Pedidos (`/mis-pedidos`)
* Barra de filtros: Buscador por número de pedido, selector de fecha ("Últimos 6 meses") y estado.
* Tabla responsiva:
  * Columnas: Pedido (código + fecha), Fecha/hora, Productos (miniaturas apiladas con indicador `+2`), Monto total, Estado (Badges: azul "En camino", verde "Entregado", rojo "Cancelado"), Acciones (botón outline "Ver detalle").
* Paginación inferior numerada con selector "Mostrar N por página".

---

## 5. Comportamiento y Estados Interactivos

### 5.1. Feedback Visual Inmediato
* **Carga de Productos:** Prohibido usar spinners genéricos en listas de productos. Se utilizan obligatoriamente **Skeleton Loaders pulsantes** (`SkeletonProductCard.tsx` con fondo `#E5E7EB`).
* **Interacción con el Carrito:** Al pulsar "Agregar al carrito", el ícono del carrito en el header realiza una micro-animación de rebote y aparece un Toast flotante confirmando: *"Producto añadido al carrito"*.
* **Estados Vacíos (Empty States):** Si un filtro no arroja resultados, mostrar ilustración/icono central, mensaje claro (*"No encontramos productos con esos filtros"*) y botón primario *"Limpiar filtros"*.

---

## 6. Adaptabilidad Responsiva (Mobile-First)

| Breakpoint | Dispositivo | Columnas Catálogo | Panel de Filtros | Comportamiento Específico |
| :--- | :--- | :---: | :--- | :--- |
| **`> 1024px`** | Escritorio | 4 Columnas | Sidebar lateral 25% visible y sticky | Layout de 2 columnas completo. |
| **`768px – 1023px`** | Tablet | 3 Columnas | Panel visible o colapsable | Botones con espaciado intermedio. |
| **`< 768px`** | Móvil | 2 Columnas | Oculto por defecto | Se reemplaza por un botón fijo **"Filtros"** que abre un Drawer/Modal deslizante. |

### Reglas Móviles Específicas:
1. **Área táctil mínima:** Todo botón, selector o enlace interactivo debe tener un tamaño mínimo de **44x44px** para evitar toques erróneos.
2. **Padding en Tarjetas:** En móvil el padding interno de `ProductCard` se compacta a 12px para optimizar el espacio visual en pantalla.
3. **Cero scroll horizontal:** Prohibido cualquier overflow no controlado en el eje X.

---

## 7. Criterios de Aceptación Oficiales (Checklist de Aprobación QA)

Toda pantalla maquetada por un desarrollador o agente de IA se considerará **APROBADA** únicamente si cumple con los 8 puntos del checklist:

- [ ] **1. Consistencia Visual:** Todas las tarjetas de producto tienen dimensiones idénticas, sombras `0 2px 8px rgba(0,0,0,0.08)` y espaciados homogéneos.
- [ ] **2. Integridad de Imágenes:** Ninguna imagen aparece recortada o estirada; todas utilizan `object-fit: contain` sobre fondo `#F7F8FA`.
- [ ] **3. Jerarquía Tipográfica:** El precio actual (`#002855`, Poppins Bold 20px) es el elemento dominante tras la imagen. El nombre no se desborda (`line-clamp-2`).
- [ ] **4. Estados Interactivos:** Todo botón cuenta con estados visibles de Hover, Active (presionado) y Disabled (`#E5E7EB` / `#6B7280`).
- [ ] **5. Identidad Cromática:** Solo se utilizan tokens oficiales (`#002855`, `#0877E8`, `#41BF5A`, `#FFC107`, `#E63946`, `#DAEEFC`). Cero `#hex` sueltos.
- [ ] **6. Experiencia Móvil:** En smartphone el grid se ajusta fluidamente a 2 columnas y los filtros abren en drawer lateral accesible.
- [ ] **7. Accesibilidad (WCAG 2.1 AA):** Ratios de contraste superiores a 4.5:1 y navegación por teclado completamente funcional con foco visible.
- [ ] **8. Diferenciación de Patrocinados:** Los productos patrocinados destacan mediante su badge ámbar sin romper la estética general del catálogo.
