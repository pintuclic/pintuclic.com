# Registro de Cambios y Versiones (CHANGELOG) - PINTU CLIC

Todas las modificaciones, nuevas funcionalidades y refactorizaciones del proyecto deben registrarse en este archivo siguiendo el estándar [SemVer](https://semver.org/lang/es/) y la [Guía de Versionado y Walkthroughs](./00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_VERSIONADO_Y_WALKTHROUGHS.md).

> Formato de Versiones: `[vMAJOR.MINOR.PATCH.BUILD] - AAAA-MM-DD`

> **Transición de esquema:** las entradas hasta `v3.29.0` usaron el esquema antiguo de tres segmentos y se conservan intactas como registro histórico (la equivalencia de `3.28.0` es `0.3.28.0`). Desde `v0.3.29.1` rige el esquema de cuatro segmentos definido en [CONTRIBUTING.md](../CONTRIBUTING.md), con actualización obligatoria de `.github/version.txt` en cada entrega.

---
## [v0.4.8.0] - 2026-10-14
- **Autor:** Mapachuelo (@Mapachuelo)
### Core: Versionado — Publicación automática desde el título de la PR (CI)
- **Alcance General:** Incremento **Minior-feat (v0.4.8.0)** sobre el empaquetado automático. La versión se declara en el título de la PR con el formato `tipo(scope) [X.Y.Z.W]: mensaje`, debe coincidir con `.github/version.txt` y con la entrada del CHANGELOG; al fusionar, el bot crea el tag anotado y publica el Release con notas basadas únicamente en la PR.
- **Lint bloqueante (`.github/workflows/pr-title-lint.yml`):** valida el formato del título, que la versión sea el siguiente paso exacto de la tabla de `CONTRIBUTING.md` (solo avanza un segmento), la coincidencia con `.github/version.txt` y la presencia de `## [vX.Y.Z.W]` en `docs/CHANGELOG.md`; si algo falla, el merge queda bloqueado. También ejecuta las pruebas del motor.
- **Publicación (`.github/workflows/version.yml`):** dispara en `push` a `main`/`develop` (una sola ejecución por merge), resuelve la PR del commit fusionado (squash/rebase/forks), revalida la coincidencia y publica el tag `vX.Y.Z.W` y el Release. `develop` publica pre-release y `main` publica o promueve el release estable. No crea commits porque los rulesets protegen las ramas; es idempotente ante reruns.
- **Motor (`.github/scripts/versioning.mjs`):** parseo del título, cálculo del siguiente segmento de la tabla, validaciones de coincidencia, generación de notas y orquestación de tag/Release. Cubierto por `.github/scripts/versioning.test.mjs` (`node --test`).
- **Corrección de duplicación:** se elimina la doble ejecución por merge (`push` + `pull_request`), la lista de commits en las notas (donde la PR se repetía) y la repetición de la versión en el cuerpo del Release.
- **Autoría y fecha verificadas:** la entrada debe cumplir `## [vX.Y.Z.W] - AAAA-MM-DD` e incluir `- **Autor:** Nombre (@usuario)` con la persona real de la entrega (nunca la IA); el lint bloquea el merge si faltan y el bot avisa si el commit fusionado no los trae.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/core/walkthrough_v0.4.8.0_core_versionado_por_pr.md](./walkthroughs/core/walkthrough_v0.4.8.0_core_versionado_por_pr.md)

---
## [v0.4.7.3] - 2026-10-10
### Módulo: M17 Permisos y Roles — Resolución de inconsistencias de auditoría QA y extracción semántica de errores (Frontend)
- **Alcance General:** Incremento **PATCH (v0.4.7.3)** sobre Frontend M17 Permisos y Roles (`HU-ADM-01`, `HU-ADM-02`, `HU-ADM-04`, `RF-ADM-06`). Resolución integral de observaciones reportadas en la auditoría técnica QA.
- **Desenmascaramiento de errores de servidor (`useM17.ts`):** la función extractora de mensajes de error procesa la estructura `{ error: { message } }` y preserva los mensajes semánticos del servidor ante respuestas `403 FORBIDDEN` (como la protección de no auto-bloqueo del Administrador raíz), `400 BAD_REQUEST` (asignación de permisos reservados), `404 NOT_FOUND` y `409 CONFLICT`, eliminando los fallbacks genéricos de `"No se pudo guardar el cambio."`.
- **Sincronización de parámetros del sistema (`RF-ADM-06`):** en `parametro.dto.ts`, el valor por defecto y el límite superior de `inactividad_cliente_segundos` se alinean a 30 días (`2592000` s), coincidiendo con la política de base de datos y la capa backend.
- **Suite de pruebas de integración:** corrección del mock de empleado en `integration.test.mjs` con documento numérico válido para acatar la regla estricta de solo dígitos.
- **Verificación:** `npm run test:m17` superado con 8/8 pruebas exitosas (100% PASS); `npx eslint src/modules/m17-permisos` con 0 errores y 0 advertencias.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M17/walkthrough_v0.4.7.3_M17_resolucion_inconsistencias_qa_frontend.md](./walkthroughs/M17/walkthrough_v0.4.7.3_M17_resolucion_inconsistencias_qa_frontend.md)

---
## [v0.4.7.2] - 2026-10-10
### Módulo: M17 Permisos y Roles — Resolución de vulnerabilidades y observaciones de auditoría QA (Backend)
- **Alcance General:** Incremento **PATCH (v0.4.7.2)** sobre Backend M17 Permisos y Roles (`HU-ADM-01`, `HU-ADM-02`, `HU-ADM-03`, `HU-ADM-04`, `RF-ADM-06`). Resolución integral de observaciones y vulnerabilidades reportadas en la auditoría técnica QA.
- **Auto-bloqueo y exposición del Administrador raíz (`RF-ADM-04-12`, `RF-ADM-02-10`):** exclusión estricta en `clientes.repository.ts` del rol `'administrador'`, roles `'empleado_%'` y del usuario raíz (`u.id_usuario != 1`). Guarda defensiva en `clientes.service.ts` y respuesta `403 FORBIDDEN` en `clientes.controller.ts` para intentos de bloqueo/desbloqueo sobre el Administrador raíz.
- **Escalamiento de privilegios y fuga de credenciales (`HU-SEG-03`, `HU-SEG-06`):** la ruta `POST /api/admin/empleados` ahora exige `personal.editar` (antes permitía creación con solo `personal.ver`). Se elimina `contrasena_temporal` del payload JSON de respuesta en `empleados.service.ts` e interfaz `EmpleadoCreadoRespuesta`; la credencial inicial viaja exclusivamente por correo SMTP vía M18.
- **Blindaje contra asignación de permisos reservados (`HU-ADM-02`, `HU-ADM-03`):** definición de lista negra `PERMISOS_RESERVADOS_ADMIN` (`seguridad.*`, `configuracion.*`). Todo intento de conceder permisos de superadministrador a un empleado se rechaza con código `400 BAD_REQUEST`.
- **Sincronización de parámetros del sistema (`RF-ADM-06`):** corrección del valor por defecto de `inactividad_cliente_segundos` a 30 días (`2592000` s) y ajuste del rango máximo en `parametros.repository.ts`, consistente con la política de base de datos y M20.
- **Mapeo de alias legados en catálogo:** `inferirArea` en `permisos.repository.ts` asigna prefijos legados a sus áreas funcionales oficiales (`ordenes.*` a `ventas`, `usuarios.*` a `personal`, `productos.*` y `estadisticas.*` a `catalogo`).
- **Verificación:** `npx eslint src/modules/m17-permisos` superado con 0 errores y 0 advertencias; tipado estricto con `npx tsc --noEmit` sin errores en el módulo.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M17/walkthrough_v0.4.7.2_M17_resolucion_vulnerabilidades_qa_backend.md](./walkthroughs/M17/walkthrough_v0.4.7.2_M17_resolucion_vulnerabilidades_qa_backend.md)

---
## [v0.4.7.1] - 2026-10-09
### Core: Versionamiento — Tag y Release desde la PR fusionada (CI)
- **Alcance General:** Incremento **PATCH (v0.4.7.1)** sobre `.github/workflows/version.yml`. Al fusionar una PR hacia `main` o `develop`, el workflow ahora se dispara también con el evento `pull_request` (`closed` + `merged == true`), toma la **versión solicitada en el título de la PR** (`vX.Y.Z.W`) como fuente prioritaria, crea el tag en el commit de merge y publica el Release.
- **Resolución de versión:** el título manda; si difiere de `.github/version.txt` se publica la del título y se emite una advertencia en el resumen. Si el título no trae versión se usa `version.txt`; si el evento es PR y no hay versión en el título, se omite (lo cubre el push de `version.txt`). Si la versión pedida es menor que la vigente, se omite para no degradar el release. Si el tag ya existe, se mantiene la idempotencia.
- **Mención del autor (@):** las notas del Release incluyen número de PR, enlace y `@usuario` de quien abrió la PR. En el camino `push` se resuelve la PR asociada al commit vía `gh api repos/.../commits/{sha}/pulls` (así también se menciona al autor cuando el merge proviene de un fork). La anotación del tag incluye la referencia `(#PR por @autor)`.
- **Canales sin cambios:** `develop` publica pre-release y `main` publica/promueve el release estable; el `bump` manual (`workflow_dispatch`) conserva su lógica.
- **Verificación:** YAML validado con parser; lógica de resolución probada con 6 casos (título con/sin versión, sin prefijo `v`, versión menor, mismatch, fallback a `version.txt`) y parseo de PR asociada simulado con `[]` y payload real.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/core/walkthrough_v0.4.7.1_core_tag_release_desde_pr.md](./walkthroughs/core/walkthrough_v0.4.7.1_core_tag_release_desde_pr.md)
---

---

## [v0.4.7.0] - 2026-10-09
### Módulo: M05 Carrito de compras — Panel lateral "Tu carrito" (Frontend)
- **Alcance General:** Incremento **Minior-feat (v0.4.7.0)**. Nuevo panel lateral del carrito que se abre al agregar un producto desde la tienda y desde el botón "Mi Carrito" del header.
- **CartDrawer (`components/CartDrawer.vue`):** encabezado con logo, líneas con imagen, nombre, variante, cantidad (+/−), subtotal y eliminación; pie con total, "Continuar compra" (navega a `/carrito`), "Seguir comprando" y franja de colores corporativos. Cierra con Esc, clic fuera o "Seguir comprando"; bloquea el scroll mientras está abierto y mantiene el foco dentro del panel.
- **Store (`cart.store.ts`):** estado `isDrawerOpen` con `openDrawer()`/`closeDrawer()`; `addToCart` abre el panel tras una respuesta exitosa, por lo que aplica a todas las vistas que ya lo usan (inicio, catálogo, detalle y paleta) sin modificar M01. Conserva en memoria el nombre e imagen enviados por la vista para mostrarlos en lugar del fallback visual.
- **LayoutHome (archivo compartido, con aprobación explícita del equipo):** monta `<CartDrawer />` y el botón "Mi Carrito" abre el panel.
- **Verificación:** E2E en `localhost:5173` con backend de la rama y base sembrada con `seed_pintuclic.sql`: "Agregar" en Productos destacados abrió el panel con el producto real; cantidades, eliminación, contador del header, "Seguir comprando" y "Continuar compra" funcionaron. ESLint y `vue-tsc --noEmit` sin errores.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M05/walkthrough_v0.4.7.0_M05_panel_lateral_carrito_frontend.md](./walkthroughs/M05/walkthrough_v0.4.7.0_M05_panel_lateral_carrito_frontend.md)

---

## [v0.4.7.0] - 2026-10-08
### Módulo: M17 Permisos y Roles — Validación de empleados, selección masiva y permisos en la ficha (Fullstack)
- **Alcance General:** Incremento **Minior-feat (v0.4.7.0)**. Tres mejoras al panel de administración de empleados y permisos (`HU-ADM-01`, `HU-ADM-02`).
- **Validación por campo en el formulario de empleado:** cada error se muestra debajo de su campo en lugar de un único mensaje genérico o la ayuda nativa del navegador. El nombre solo admite letras y espacios; el documento, de 5 a 10 dígitos; el teléfono, exactamente 10 dígitos. Teléfono y documento descartan letras al escribir o pegar. Los errores del backend (`400` con `details` y correo duplicado `409`) se muestran en el campo correspondiente.
- **Validación en servidor (`HU-ADM-03`):** `CrearEmpleadoDto` y `ActualizarContactoEmpleadoDto` aplican las mismas reglas de nombre, documento y teléfono.
- **"Seleccionar todos" en Roles y permisos:** casilla con contador `N de M asignados` que marca o desmarca de una vez los permisos asignables; omite los exclusivos del administrador, respeta las dependencias `.ver` y, con búsqueda activa, solo afecta a los resultados visibles.
- **Permisos asignados en la ficha del empleado:** nueva sección en `/admin/empleados/:id` con el total y los permisos agrupados por área, y enlace para asignarlos o modificarlos.
- **Verificación:** `vue-tsc -b`, ESLint, `npx tsc --noEmit` y `npm run lint` del backend sin errores ni advertencias; pruebas manuales en navegador contra backend local.
- 🔗 **Walkthroughs Técnicos Oficiales:** [frontend](./walkthroughs/M17/walkthrough_v0.4.7.0_M17_empleados_y_permisos_frontend.md) · [backend](./walkthroughs/M17/walkthrough_v0.4.7.0_M17_empleados_y_permisos_backend.md)

---

## [v0.4.6.6] - 2026-10-09
### M01 Inclusión de ajustes visuales de ficha y evidencia del análisis
- Se incorporan los ajustes locales previamente excluidos: icono neutral junto al mensaje de imagen no disponible y miniaturas visibles únicamente cuando hay más de una imagen.
- Se incorpora `informes/informe_flujo_tarjeta_producto_2026-10-09.docx` como evidencia del análisis anterior a las correcciones; no representa una nueva auditoría del código corregido.
- Validación: TypeScript frontend y ESLint del archivo sin errores ni advertencias; backend lint y TypeScript superados. Se mantiene documentada la limitación previa del lint global frontend en componentes compartidos. Commit local solicitado por el usuario; sin push ni despliegue.
- Walkthrough: [M01 frontend](walkthroughs/M01/walkthrough_v0.4.6.5_M01_ajustes_visuales_ficha_frontend.md).

---

## [v0.4.6.5] - 2026-10-09
### M01 y M05 Corrección del flujo de tarjeta pública y carrito
- M01 backend: bloqueo de publicación sin imagen, conforme a RF-CAT-02-05 y CA-CAT-02-06.
- M01 frontend: selección compartida de variante y precio para inicio, catálogo, paleta y complementarios, respetando el color seleccionado.
- M05 backend: metadatos reales de producto, presentación, color, base e imagen en las líneas, sin alterar el precio vivo ni duplicar resultados.
- M05 frontend: retirada del mapeo de catálogo de prueba y conservación de identidad al agregar y recargar; icono neutral si no hay imagen o falla.
- Validación: 125 comprobaciones backend M01, 72 backend M05, integración de identidad con PostgreSQL y rollback, 27 pruebas frontend; backend lint/TypeScript y frontend build/lint de módulos superados. Lint global frontend pendiente por errores previos de core; no se modificaron esos archivos.
- M01 ficha pública: retirada de referencias a imágenes de demostración inexistentes; la galería usa las imágenes reales del catálogo. Los ajustes visuales locales previos se mantienen fuera del commit.
- Estado: commit local solicitado explícitamente con el lint global frontend pendiente; sin push ni despliegue.
- Walkthroughs: [M01 backend](walkthroughs/M01/walkthrough_v0.4.6.4_M01_publicacion_con_imagen_backend.md), [M01 frontend](walkthroughs/M01/walkthrough_v0.4.6.4_M01_precio_y_variante_compra_rapida_frontend.md), [M05 backend](walkthroughs/M05/walkthrough_v0.4.6.4_M05_identidad_real_lineas_carrito_backend.md) y [M05 frontend](walkthroughs/M05/walkthrough_v0.4.6.4_M05_identidad_real_y_sin_mocks_frontend.md).

---
## [v0.4.6.4] - 2026-10-08
### Módulo: M05 Carrito de compras — Carrito dentro del layout de la tienda (Frontend)
- **Alcance General:** Incremento **Patch (v0.4.6.4)**. En `v0.4.6.3`, `m05CarritoRoutes` estaba registrado en el nivel raíz del router, fuera de `LayoutHome`, por lo que `/carrito` se mostraba sin header ni footer. Esta entrega lo monta como hija de `LayoutHome`.
- **Router global (`core/routes/index.ts`):** `m05CarritoRoutes` pasa del nivel raíz a los `children` de `LayoutHome`; la ruta del módulo pasa de `/carrito` a `carrito` (relativa) y conserva la URL `/carrito`. Archivo compartido modificado con aprobación explícita del equipo.
- **CartView:** el contenedor raíz pasa de `<main class="min-h-screen">` a `<div>` para no anidar `<main>` dentro del layout.
- **Verificación:** E2E en `localhost:5173` contra los contenedores `pintuclic-m05-test-*`: header y footer visibles en `/carrito`, navegación desde "Mi Carrito" y actualización en vivo del contador del header al cambiar cantidades.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M05/walkthrough_v0.4.6.4_M05_integracion_layout_carrito_frontend.md](./walkthroughs/M05/walkthrough_v0.4.6.4_M05_integracion_layout_carrito_frontend.md)

---
## [v0.4.6.3] - 2026-10-08
### M01 - Estabilización de selección de presentaciones, rendimiento dinámico, familias del abanico y catálogo público (Fullstack)
- **Alcance General:** Incremento **Patch (v0.4.6.3)**. Corrección de la persistencia visual de selección de tamaños/presentaciones en la ficha pública de producto, cálculo dinámico de rendimiento por presentación (`RF-CAT-10-04`), activación interactiva de familias cromáticas en la carta de colores/abanico (`M01-13`), orden administrado de categorías públicas en base de datos (`M01-14`) y apertura de streaming público de imágenes de producto y logotipos de marca (`M01-10`).
- **Hitos Clave:**
  - **Persistencia Visual en Selección de Presentación (`VistaDetalleProductoPublico.vue`):** Corrección del estado seleccionado del botón de tamaño (`Elige un tamaño`). Al hacer clic, el botón ahora mantiene permanentemente el fondo de acción azul corporativo (`bg-action`), texto blanco nítido (`text-white`) y anillo activo (`ring-2 ring-subaction`), eliminando la ambigüedad que existía al retirar el cursor tras el hover.
  - **Rendimiento Dinámico por Presentación (`RF-CAT-10-04` / `M01-16`):** Incorporación de tarjeta informativa calculada en tiempo real según el volumen de la presentación seleccionada (`[min, max] * (volumen / 3.785)`) con nota visible de aproximación sobre rugosidad y porosidad de la superficie a 2 manos.
  - **Familias Cromáticas en el Abanico / Carta de Colores (`CartaColoresProductoPublica.vue`):** Transformación de las pestañas cromáticas a controles plenamente interactivos. El usuario puede filtrar instantáneamente entre "Todos", "Amarillos", "Azules", "Verdes", "Rojos" y "Grises / Neutros", combinando el filtrado por familia con el buscador en tiempo real sobre los 30 tonos CIELAB reales sembrados en el sistema.
  - **Orden de Categorías en Storefront Público (`catalogo-publico.repository.ts` / `M01-14`):** Ajuste en la consulta `listarCategoriasConProductos` para respetar el orden administrativo configurado (`c.orden ASC`, `c.nombre ASC`, `s.orden ASC`, `s.nombre ASC`) en lugar del orden alfabético simple.
  - **Acceso Público a Contenido de Imágenes y Logotipos (`m01.routes.ts` / `M01-10`):** Desprotección de las rutas binarias `GET /marcas/:id/logotipo` y `GET /imagenes/:id/contenido` para permitir que visitantes y clientes anónimos carguen fluidamente los logotipos y las fotos de productos en la tienda pública sin requerir privilegios de empleado.
  - **Identidad Visual y Favicon Oficial (`index.html` / `public/favicon.png` / `public/favicon.svg`):** Integración del favicon oficial a partir de `Pintu_Blanco.png` para máximo contraste y legibilidad, con depuración de archivos de plantilla obsoletos (`icons.svg` y `hero.png`).
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v0.4.6.3_M01_estabilizacion_ficha_publica_y_carta_colores_frontend.md](./walkthroughs/M01/walkthrough_v0.4.6.3_M01_estabilizacion_ficha_publica_y_carta_colores_frontend.md)

---
## [v0.4.6.2] - 2026-10-08
### Core / M01 / M17 / M08 - Estandarización de botones de acción en recuadros y navegación de retorno textual (Frontend)
- **Alcance General:** Incremento **Patch (v0.4.6.2)**. Estandarización global del componente `IconButton` con diseño en recuadro (`variant="boxed"` por defecto: 36x36px, bordes y tonos sutiles según estado) para acciones de tablas en clientes, empleados y catálogo, y reemplazo de botones de retorno por enlaces de texto nativos (`variant="text"` con flecha izquierda) en todas las vistas administrativas secundarias.
- **Hitos Clave:**
  - **Estandarización Global de `IconButton` (`src/core/components/buttons/IconButton.vue`):** Diseño unificado en recuadros de 36x36px con bordes suaves, fondo blanco, sombra ligera y colores semánticos por acción (`action` en azul suave para ver ficha/detalle, `neutral` en gris corporativo para edición, `danger` en rojo sutil para desactivar/bloquear, y `success` en verde para reactivar). Soporte de `variant="ghost"` para controles compactos en galerías.
  - **Eliminación de Código Repetitivo en Tablas:** Limpieza de clases inline en `PeopleList.vue` y `AccionesFila.vue`; todas las tablas del panel administrativo consumen ahora el diseño uniforme de `IconButton` de forma centralizada sin duplicar Tailwind.
  - **Navegación de Retorno Textual (`VistaCatalogosBase.vue` / `VistaPorMarca.vue` / `VistaDetalleOrdenAdmin.vue`):** Sustitución de botones de bloque gris por enlaces de texto elegantes con flecha (`← Volver a productos`, `← Volver a marcas`, `← Volver a la bandeja`) ubicados antes de la cabecera `PageHeader`, unificando el patrón de UX con `VistaProductoDetalle.vue` y `PersonDetail.vue`.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v0.4.6.2_M01_refinamiento_ux_admin_y_catalogo_frontend.md](./walkthroughs/M01/walkthrough_v0.4.6.2_M01_refinamiento_ux_admin_y_catalogo_frontend.md)

---
## [v0.4.6.1] - 2026-10-08
### Core / M01 / M17 / M08 - Refinamiento de experiencia de usuario (UX), componentes globales con buscador y ergonomía de catálogo (Frontend)
- **Alcance General:** Incremento **Patch (v0.4.6.1)**. Incorporación del componente global `SearchableSelect`, erradicación del doble tooltip flotante en favor de `title` nativo accesible, eliminación de barras de scroll horizontal espurias en `Table`, reorganización taxonómica de navegación en sidebar de administración, conversión de `ModalProductosBase` a `Drawer` con filtro en tiempo real, navegación de retorno en catálogos base y estandarización de variantes neutrales en botones de descarte/cancelación.
- **Hitos Clave:**
  - **Componente Global `SearchableSelect` (`src/core/components/forms/SearchableSelect.vue`):** Selector reutilizable con buscador reactivo integrado, navegación de teclado, búsqueda insensible a tildes/mayúsculas y resaltado del ítem seleccionado. Integrado en `Permissions.vue` (selección de empleado y consulta inversa de permisos), `VistaVariantes.vue` (selección de producto) y `VistaPorMarca.vue` (selección de marca).
  - **Accesibilidad y Tooltips (`IconButton.vue` / `PeopleList.vue`):** Eliminación del componente `<Tooltip>` visual flotante que provocaba duplicidad de letreros y desbordamiento horizontal en pantallas estrechas. Sustituido por el atributo HTML nativo `title` para señalización precisa y limpia en hover (`Bloquear acceso`, `Reactivar cliente`, `Ver ficha`, `Editar`).
  - **Ajuste Ergonómico de Tablas (`Table.vue`):** Eliminación de `whitespace-nowrap` a nivel de elemento `<table>` para permitir wrap adaptativo (`break-words`) en celdas de texto extenso, reservando `whitespace-nowrap` exclusivamente para columnas de acciones alineadas a la derecha (`align="right"`).
  - **Arquitectura de Navegación (`LayoutAdmin.vue` / `core/routes/index.ts`):** Reordenamiento de enlaces en el Catálogo Central a la secuencia natural de negocio: **Productos $\rightarrow$ Variantes $\rightarrow$ Categorías**. Adición de acceso directo a *Resinas y Presentaciones* en Maestros. Depuración de rutas y enlaces huérfanos a vistas no implementadas de búsquedas.
  - **Drawer de Productos por Base (`ModalProductosBase.vue`):** Transformación de modal estático a `Drawer` lateral completo con filtro de búsqueda instantáneo en tiempo real, permitiendo gestionar catálogos amplios de productos entonables cómodamente sin restricciones de altura.
  - **Navegación y Ergonomía de Catálogos Base (`VistaCatalogosBase.vue` / `VistaCategorias.vue`):** Inclusión de botón de retorno `← Volver a Productos`. Eliminación del prefijo redundante `+` en el botón de subcategoría (`[+] Subcategoría`).
  - **Estandarización de Botones de Cancelar/Descartar:** Unificación del estilo visual en `variant="neutral"` (gris suave corporativo) en diálogos y formularios (`Configuration.vue`, `PersonDetail.vue`, `ModalCambiarEstado.vue`, `Permissions.vue`), garantizando que ningún botón de cancelación se muestre azul (`outline`).
  - **Limpieza de Subtítulos Técnicos:** Retirada de identificadores de requisitos de desarrollo (`HU-CAT-01`, `HU-CAT-02`, `HU-CAT-03`, `HU-CAT-04`, `HU-ORD-05`) en `PageHeader` para presentar una interfaz 100% pulida y orientada al usuario final.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v0.4.6.1_M01_refinamiento_ux_admin_y_catalogo_frontend.md](./walkthroughs/M01/walkthrough_v0.4.6.1_M01_refinamiento_ux_admin_y_catalogo_frontend.md)

---
## [v0.4.6.0] - 2026-10-07
### M17 / M01 / M08 / M04 - Estabilización de flujos de administración y reestructuración UX de catálogo (Fullstack)
- **Alcance General:** Incremento **Minior-feat (v0.4.6.0)**. Corrección integral y estabilización de los flujos de administración, sincronización del esquema DDL v3.9 de base de datos en Docker (49 tablas), eliminación de fallos de creación de empleados, reactivación de clientes inactivos, restauración del Dashboard en `/admin` y rediseño jerárquico de Categorías en árbol acordeón.
- **Hitos Clave:**
  - **Base de Datos (Docker v3.9):** Regeneración limpia del volumen `pgdata` en Docker levantando las 49 tablas con columnas requeridas por el repositorio de órdenes (`codigo_solicitud`, `modo_entrega`, `historial_estado_orden`), erradicando el error 500 al consultar `/admin/ordenes`.
  - **Creación de Empleados (M17):** Corrección en `empleados.service.ts` y `empleados.repository.ts`, sustituyendo `id_rol: 0` por `null`, erradicando la violación de clave foránea `fk_usuario_rol` en PostgreSQL.
  - **Dashboard y Enrutador (Core / M17):** Eliminación de la redirección hardcodeada a catálogo en `index.ts`; `/admin` y el botón "Dashboard" cargan directamente `Dashboard.vue` con sus métricas.
  - **Gestión de Clientes (M17):** Soporte en backend y modal frontend para reactivar clientes en estado `'inactivo'` (baja voluntaria de Habeas Data).
  - **Aprobación de Empresas (M04):** Adición de notificación reactiva Alert/Toast de confirmación tras dictaminar empresas o solicitudes de actualización de NIT.
  - **Catálogo y Categorías (M01 UX):** Rediseño de `VistaCategorias.vue` sustituyendo el patrón de 2 columnas por una vista jerárquica en árbol / acordeón que agrupa subcategorías anidadas con acciones contextuales. Clarificación en `FormularioProducto.vue` de Tipo de Resina Química (solvente) vs. Bases Tintométricas (máquina).
  - **Tipado y Compilación:** Corrección de tipos en `useCatalogoPublico.ts` y variables no utilizadas en `VistaCatalogoPublico.vue`, logrando `npm run build` limpio y `npm run lint` 0/0.
- 🔗 **Walkthroughs Técnicos Oficiales:**
  - [walkthroughs/M17/walkthrough_v0.4.6.0_M17_estabilizacion_admin_backend.md](./walkthroughs/M17/walkthrough_v0.4.6.0_M17_estabilizacion_admin_backend.md)
  - [walkthroughs/M01/walkthrough_v0.4.6.0_M01_reestructuracion_catalogo_ux_frontend.md](./walkthroughs/M01/walkthrough_v0.4.6.0_M01_reestructuracion_catalogo_ux_frontend.md)

---
## [v0.4.5.1] - 2026-10-06
### M05 - Carrito de compras: integración de botones y enlaces de compra en storefront (Frontend)
- **Alcance General:** Incremento **Patch (v0.4.5.1)**. Conexión de todos los botones de «Agregar al carrito» y navegación hacia el carrito en las pantallas públicas de catálogo, inicio, paleta de colores y el layout global.
- **Hitos Clave:**
  - **Header (`LayoutHome.vue`):** Se reemplaza el estado mock por el consumo reactivo de `useCartStore` (total de ítems e importe formateado en COP). El botón redirige directamente a `/carrito` y carga el carrito al montar la aplicación.
  - **Catálogo (`VistaCatalogoPublico.vue`):** Conexión del evento `@agregar` de `TarjetaProductoPublico` con `cartStore.addToCart()`, deduciendo la variante activa con existencia y mostrando confirmación visual.
  - **Ficha de Detalle (`VistaDetalleProductoPublico.vue`):** Conexión del botón principal «Comprar» a la variante y cantidad seleccionadas, productos complementarios a sus variantes correspondientes, y modal de calculadora (`CalculadoraPinturaPublica`) a la acción de agregar al carrito.
  - **Inicio (`VistaInicioPublica.vue`):** Integración de las tarjetas de productos destacados con `cartStore.addToCart()`.
  - **Paleta de Colores (`VistaPaletaColoresPublica.vue`):** Conexión de productos recomendados por color y herramientas complementarias con `cartStore.addToCart()`, respetando el color seleccionado.
- **Verificación:** vitest 43/43 pasados al 100% · `vue-tsc` y `eslint` 0 errores · compatibilidad total con backend M05 `/api/carrito`.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M05/walkthrough_v0.4.5.1_M05_integracion_botones_carrito_frontend.md](./walkthroughs/M05/walkthrough_v0.4.5.1_M05_integracion_botones_carrito_frontend.md)


---
## [v0.4.5.0] - 2026-10-02
### M08 - Orden de venta: cierre de la integración y estados de error sin datos de ejemplo (Frontend)
- **Alcance General:** Incremento **Minior-feat (v0.4.5.0)**. El backend y el frontend de M08 ya estaban en `develop`; se verificó la integración contra la API real (contrato campo a campo en los 9 endpoints, 30 pasos en el stack completo) y se corrigió cómo reaccionan las pantallas cuando la API falla. `v0.4.4.0` la ocupa el PR de M05.
- **Correcciones:**
  - **Sin datos de ejemplo:** se elimina `ordenes.mock.ts`. Ante un 5xx o un fallo de red, la lista mostraba pedidos de ejemplo y el detalle mostraba un pedido del seed **sin aviso**, como si fuera del cliente. Ahora las 4 pantallas muestran un error con **Reintentar** y ningún dato.
  - **Personal:** un 5xx o una caída de red ya no se presenta como «Orden no encontrada»; la bandeja ofrece Reintentar solo ante fallos del servidor o de red.
  - **`Alert` con `variant`:** los avisos de error y de éxito del personal usaban `tone`, que `Alert` no reconoce, y salían con el estilo de información.
- **Pendientes:** M07 (ninguna compra genera órdenes), M09, M11, y la **firma del líder técnico al reporte de parada `REPORTE_PARADA_v3.31.0`**, cuyos cambios están en `develop` desde el #1045.
- **Verificación:** vitest 43/43 (24 nuevas) · `vue-tsc` y `eslint` 0/0 en M08 · backend M08 117/117 y 36/36 · permisos verificados con empleados sin `ventas.ver` y solo lectura · aviso de M18 al despachar registrado en su bitácora.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M08/walkthrough_v0.4.5.0_M08_cierre_integracion_frontend.md](./walkthroughs/M08/walkthrough_v0.4.5.0_M08_cierre_integracion_frontend.md)


---
## [v0.4.4.0] - 2026-10-02
### M05 - Carrito de compras: integración del backend en `develop` (Backend)
- **Alcance General:** Incremento **Minior-feat (v0.4.4.0)**. Integra el backend del carrito de `feature/m05-carrito-compras`: el frontend de M05 (`v0.3.39.0`) llamaba a 10 endpoints `/api/carrito/*` que no existían en `develop`. Se monta `/carrito`, se renombra el módulo a `m05-carrito-compras` y se corrigen 4 defectos y 4 mejoras, sin cambiar la forma de las respuestas que consume el frontend.
- **⚠️ Archivos compartidos (aprobados):** `backend/src/app.routes.ts` (+2 líneas) y `backend/src/core/middlewares/cors.middleware.ts` (`X-Visitor-Token` en `allowedHeaders`; ver [reporte de parada](./walkthroughs/M05/reporte_parada_v0.4.4.0_M05_cors_x_visitor_token_backend.md)).
- **Correcciones:**
  - **Variante inválida:** `404 VARIANTE_NO_ENCONTRADA` / `422 VARIANTE_NO_DISPONIBLE` en lugar de `500` por la llave foránea.
  - **Tope de 999 por línea** también al acumular (`422 CANTIDAD_MAXIMA_EXCEDIDA`) y al fusionar (queda en 999 y se avisa en el campo opcional `avisos`).
  - **Token de visitante** validado como UUID con Zod (header `x-visitor-token` y body de `/fusionar`).
  - **Fusión en una sola transacción:** transferir líneas y borrar el carrito de visitante ya no pueden quedar a medias.
  - **Agregado atómico** con `INSERT … ON CONFLICT DO UPDATE` y el tope en el `WHERE`: con el código anterior, 8 agregados simultáneos dejaban 4 unidades.
  - **Agregar crea el carrito** si aún no existe (antes `404 "Inicialice el carrito primero"`).
  - **Controlador alineado con M08:** identidad desde `obtenerIdentidadVigente(req)` y `:idLinea` validado con Zod (`404` si es ilegible).
- **Decisiones provisionales:** tope de 999 (RF-CAR-02-07 PENDIENTE) y fusión sumando con límite y aviso (RF-CAR-04-03 PENDIENTE).
- **Pendientes:** cambio de precio en la revalidación (RF-CAR-05-01/05), precios de empresa (RF-CAR-04-02 → M06), líneas de cotización (RF-CAR-05-06 → M21), `UNIQUE` en `carrito` (→ `bd/`), nombre e imagen del producto (→ M01) y token no UUID del seed (→ `bd/`).
- **Verificación:** `tsc` 0 errores · `eslint --max-warnings=0` 0/0 · `m05.test.ts` 72/72 · `m05.integracion-escritura.test.ts` 19/19 contra PostgreSQL · flujo HTTP completo (visitante → login → fusión → revalidación).
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M05/walkthrough_v0.4.4.0_M05_integracion_carrito_backend.md](./walkthroughs/M05/walkthrough_v0.4.4.0_M05_integracion_carrito_backend.md)


---
## [v0.4.3.0] - 2026-10-02
### M08 - Orden de venta: detalle completo de cada línea del pedido (Frontend)
- **Alcance General:** Incremento **MINOR (v0.4.3.0)**. Las líneas del pedido mostraban 4 de los 10 campos que el backend entrega. Con esto pasan a mostrarlos todos y se cumplen dos criterios de aceptación que estaban pendientes.
- **Hitos Clave:**
  - **CA-ORD-02-02 — desglose de descuentos por línea:** cada descuento con su origen, el orden en que se aplicó, su porcentaje (o nada, si fue importe fijo) y cuánto descontó. Antes solo se veía el precio final.
  - **RF-ORD-02-02 — precio antes de descuentos:** `precio_inicial` se muestra tachado junto al precio aplicado, cuando hubo descuentos.
  - **RF-ORD-04-03 — producto retirado del catálogo:** la línea conserva los datos de la compra, el nombre deja de enlazar a la ficha (`id_producto` llega nulo) y se añade una nota de que ya no está disponible.
  - **Color solicitado y entonado:** datos de la compra que en una pinturería no son accesorios. La **base consumida** solo se muestra al personal (RF-ORD-09-01).
  - **Enlace a la ficha del producto** cuando sigue en catálogo.
- **Correcciones:**
  - **Motivo obligatorio al retroceder.** El backend responde `400 MOTIVO_REQUERIDO` al volver de «Preparada» a «En preparación» sin motivo (el «volver con motivo» del diagrama). El modal lo marcaba obligatorio para cancelar y devolver —hoy bloqueados— pero no para este retroceso, que es el único que puede darse. Ahora se avisa antes de enviar en lugar de dejar que el servidor rechace la operación.
  - **`nota-contacto.dto.ts` usaba la sintaxis de Zod 4** (`{ error: ... }`), y el frontend va con Zod 3.25, donde la opción es `errorMap`. Rompía `vue-tsc` sin afectar al funcionamiento; entró en `v0.4.2.1` y queda corregido.
- **Verificación:** `vue-tsc` y `eslint` sin errores ni advertencias en M08; comprobado contra `ORD-2026-0003`, que trae dos descuentos en una misma línea, un producto entonado y otro retirado.


---
## [v0.4.2.2] - 2026-10-01
### M08 - Orden de venta: compras anteriores del cliente en el detalle (Frontend)
- **Alcance General:** Incremento **PATCH (v0.4.2.2)**. Da uso al último endpoint del personal que quedaba sin interfaz. **M08 pasa a consumir los 9 endpoints del módulo.**
- **Hitos Clave:**
  - **Compras anteriores (HU-ORD-11, CA-ORD-11-01):** bloque en la ficha del cliente, dentro del detalle administrativo. Lista los demás pedidos del titular con su fecha, total y estado, y cada uno enlaza a su propio detalle.
  - Se consulta **bajo demanda**, no al abrir la orden: en la mayoría de consultas basta con el pedido que se está atendiendo, y así no se pide al servidor algo que nadie va a mirar.
  - El endpoint **excluye la orden actual**, de modo que lo que se lista son estrictamente los demás pedidos. Botón «Ver más» cuando hay más de una página.
  - Al cambiar de orden el bloque se reinicia, para no arrastrar el historial de un cliente al detalle de otro.
- **Verificación:** `vue-tsc` y `eslint` sin errores; comprobado en pantalla con 4 compras anteriores y la orden consultada correctamente excluida.
- **Walkthrough:** `docs/walkthroughs/M08/walkthrough_v0.4.2.0_M08_gestion_ordenes_personal_frontend.md` (sección de ajustes posteriores)


---
## [v0.4.2.1] - 2026-10-01
### M08 - Orden de venta: alta de notas internas y contactos desde el detalle (Frontend)
- **Alcance General:** Incremento **PATCH (v0.4.2.1)**. Dos formularios que dan uso a endpoints que el backend ya exponía y la interfaz no consumía.
- **Hitos Clave:**
  - **Nota interna (HU-ORD-10):** campo de texto y botón en el bloque «Notas internas» del detalle administrativo. El texto de ayuda advierte que la nota queda con el nombre del autor y **no se puede modificar después**, porque el backend rechaza editarla o borrarla (CA-ORD-10-03).
  - **Registro de contacto (CA-ORD-09-03):** desplegable de medio (correo o teléfono) y detalle opcional, con su botón.
  - Ambos refrescan el detalle al guardar, de modo que lo que se ve es lo que el servidor confirmó, no lo que se escribió.
  - Validación en `dtos/nota-contacto.dto.ts`, espejando los DTO del backend (Directiva 12). Un 403 se identifica como falta del permiso `ventas.gestionar`.
- **Efecto:** M08 pasa a consumir **seis de los siete endpoints** del personal. Queda sin interfaz el historial de compras del cliente (HU-ORD-11).
- **Verificación:** `vue-tsc` y `eslint` sin errores; nota creada desde el formulario y confirmada en pantalla con su autor y fecha.
- **Walkthrough:** `docs/walkthroughs/M08/walkthrough_v0.4.2.0_M08_gestion_ordenes_personal_frontend.md` (sección de ajustes posteriores)


---
## [v0.4.2.0] - 2026-10-01
### M08 - Orden de venta: vistas de gestión del personal (Frontend)
- **Alcance General:** Incremento **MINOR (v0.4.2.0)** con las tres vistas del personal: «Gestión de órdenes» (HU-ORD-05, HU-ORD-08), «Detalle de orden administrativa» (HU-ORD-09, HU-ORD-04) y «Cambiar estado de la orden» (HU-ORD-03). Con ellas quedan maquetadas las **cinco vistas de M08** del listado oficial.
- **Hitos Clave:**
  - **Bandeja del personal:** tarjetas de resumen por estado que además filtran, búsqueda por código, estado, periodo y por correo o teléfono del cliente (CA-ORD-08-02), y columna «Parada» con los días que cada orden lleva detenida (CA-ORD-05-07).
  - **Detalle administrativo:** añade sobre la vista del cliente el contacto del titular (CA-ORD-09-01), el historial con autor y motivo (CA-ORD-09-02), las notas internas y los contactos registrados.
  - **Cambio de estado:** ofrece exclusivamente las transiciones que devuelve el servidor en `transiciones_permitidas`; con el array vacío la orden se presenta como estado final y el botón no se renderiza.
  - **Lenguaje visual de los paneles existentes:** tarjetas con icono en caja de color y un único panel que agrupa filtros y listado, como «Gestión de empleados» (M17) y «Productos» (M01). No se introduce ningún color ni tipografía fuera del sistema.
  - **Separación de rutas:** las del personal viven en `m08-ordenes-admin.routes.ts`, independientes de las del cliente.
- **Verificación:** `vue-tsc` y `eslint` sin errores ni advertencias; cambio de estado real ejecutado y registrado en `historial_estado_orden` con autor y fecha.
- **Pendiente de aprobación (Directiva 3):** `core/routes/index.ts` y `core/layouts/LayoutAdmin.vue`. Sin ellos las vistas existen pero no son alcanzables desde el panel.
- **Sin interfaz todavía:** tres endpoints del personal siguen sin pantalla (notas internas, registro de contactos e historial de compras del cliente), a la espera de decisión.
- **Walkthrough:** `docs/walkthroughs/M08/walkthrough_v0.4.2.0_M08_gestion_ordenes_personal_frontend.md`


---
## [v0.4.1.1] - 2026-10-01
### M08 - Orden de venta: encabezado de «Seguimiento de pedido» (Frontend)
- **Alcance General:** Incremento **PATCH (v0.4.1.1)**. Ajuste visual solicitado en revisión de diseño, sin cambios de funcionalidad ni de contrato.
- **Hitos Clave:**
  - El encabezado de «Seguimiento de pedido» adopta el mismo tratamiento que el de «Mi Perfil»: fondo `subaction` con la ilustración a la derecha y el título en `corporate`, en lugar de la fotografía del catálogo con velo oscuro que se había usado.
  - Se conservan la ruta de navegación «Inicio › Mis Pedidos › Seguimiento de Pedido», el título y el texto de apoyo.
  - Deja de importarse `hero-storefront.png` de M01: la pantalla ya no depende de recursos de otro módulo.
- **Motivo:** las tres pantallas del cliente (perfil, listado y seguimiento) debían leerse como una misma familia visual.
- **Verificación:** `vue-tsc` y `eslint` sin errores ni advertencias en M08.


---
## [v0.4.1.0] - 2026-10-01
### M08 - Orden de venta: sección de pedidos y seguimiento del cliente (Frontend)
- **Alcance General:** Incremento **MINOR (v0.4.1.0)** con las dos vistas del cliente: «Mis pedidos» (HU-ORD-07) y «Seguimiento de pedido» (HU-ORD-02, HU-ORD-04, HU-ORD-06). Las vistas del personal quedan fuera: su diseño todavía no está aprobado.
- **Hitos Clave:**
  - **«Mis pedidos» bajo la información personal del perfil**, como plantean los diseños «Mi-Perfil_Usuario natural» y «Mi-Perfil_Usuario Empresa». Filtros por estado, buscador, separación entre pedidos en curso y finalizados, y paginación.
  - **«Seguimiento de pedido» como pantalla propia**, con su encabezado, su ruta de navegación y el contenido en dos columnas: línea de tiempo a la izquierda; datos de despacho y detalle de la compra a la derecha.
  - **La línea de tiempo sigue el diagrama oficial:** desde «Preparada» el flujo bifurca según el modo de entrega, así que la recogida en tienda no muestra la etapa «Despachado», por la que su pedido nunca pasa.
  - **Datos nuevos del backend ya en pantalla:** historial de estados con fecha y hora reales, forma de entrega, costo de entrega e IVA discriminado.
  - **Aviso de cancelación al cliente:** cubre el pendiente que el informe final del backend asigna al frontend. La cancelación está bloqueada por la política de M11 y el backend responde 409 `OPERACION_NO_HABILITADA`.
  - **Corrección en la presentación de errores:** un 401 se identifica como sesión expirada en lugar de «pedido no encontrado», y deja de caerse a los datos de ejemplo. 403 y 404 siguen siendo indistinguibles entre sí (CA-SEG-03-06).
  - **Separación de rutas:** las del personal pasan a `m08-ordenes-admin.routes.ts`, de modo que cada parte del módulo pueda entregarse por separado.
- **Verificación:** `vue-tsc` y `eslint` sin errores ni advertencias en M08; las tres pantallas abiertas contra el backend real.
- **Pendiente de aprobación (Directiva 3):** 11 líneas añadidas en `m04-cuentas/views/VistaPerfil.vue` para incrustar la sección de pedidos. Ninguna línea existente fue modificada.
- **Walkthrough:** `docs/walkthroughs/M08/walkthrough_v0.4.1.0_M08_pedidos_y_seguimiento_cliente_frontend.md`

---
## [v0.4.0.0] - 2026-09-30
### Versión estable
- Solo un cambio de versión, la web funciona bastante bien.

---

## [v0.3.41.1] - 2026-09-30
### Core / Infraestructura: Restauración de `ALLOWED_ORIGINS` en el despliegue (CORS)
- **Alcance General:** Incremento **PATCH (v0.3.41.1)** que corrige el error 500 en todas las peticiones del navegador (login, registro, carrito, etc.). El `.env` generado por el deploy no incluía `ALLOWED_ORIGINS`, por lo que el backend usaba el default de `localhost` y el middleware CORS rechazaba el origen real `https://www.pintuclic.com`.
- **Hitos Clave:**
  - **`.env.example`:** nueva sección 5 con `ALLOWED_ORIGINS=https://www.pintuclic.com,https://pintuclic.com`.
  - **`deploy.yml`:** la Variable `ALLOWED_ORIGINS` se mapea al `.env` generado y se valida que no venga vacía, fallando con mensaje claro antes de levantar contenedores.
  - **Configuración:** la Variable `ALLOWED_ORIGINS` queda creada en GitHub Actions (Repository variables).
  - 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/core/walkthrough_v0.3.41.1_core_restauracion_allowed_origins.md](./walkthroughs/core/walkthrough_v0.3.41.1_core_restauracion_allowed_origins.md)

---

## [v0.3.41.0] - 2026-09-30

### M01: Vista de Gestión de Bases y Unificación de Botones del Panel Administrativo

* **Alcance General:** Incremento **MINIOR-FEAT (v0.3.41.0)** que agrega al panel administrativo la vista de gestión de bases (HU-CAT-12) y unifica el color de los botones de acción.
* **Hitos Clave:**
  * **Vista de bases:** nueva ruta `/admin/catalogo/bases` para listar, crear, editar, desactivar y reactivar las bases de cada marca, con enlace «Bases» en el menú lateral.
  * **Asignación a productos entonables:** modal «Productos que ofrecen esta base» (RF-CAT-12-02/03) conectado a `/api/catalogo/productos/:id/bases`.
  * **Botones del panel:** todos los botones de acción usan el token `action`; ya no se deshabilitan en reposo, sino que indican qué falta.
  * **Corrección de enrutamiento:** el panel admin vuelve a usar `m01-catalogo` y se elimina la carpeta `m01-dashboardcatalogo`, reintroducida por error en #1040.
* **Versión anterior:** `v0.3.40.0`
* **Nueva versión:** `v0.3.41.0`
* **Tipo de cambio:** `Minior-feat`
* 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v0.3.41.0_M01_vista_bases_frontend.md](./walkthroughs/M01/walkthrough_v0.3.41.0_M01_vista_bases_frontend.md)

---
## [v0.3.40.0] - 2026-09-30

### M02: Integración Frontend de Búsqueda Tolerante, Facetas Dinámicas y Analítica

* **Alcance General:** Incremento **MINIOR-FEAT (v0.3.40.0)** para la integración transversal de Búsqueda y Navegación (M02) en el Storefront público y panel administrativo.
* **Hitos Clave:**
  * **Habilitación de Motor de Búsqueda:** Activación de extensiones `unaccent` y `pg_trgm` en la base de datos PostgreSQL, desbloqueando el endpoint `/api/busqueda/productos` tolerante a fallos tipográficos y acentos.
  * **Buscador Storefront en Catálogo:** Búsqueda en `/catalogo` con debounce y actualización en tiempo real de resultados tolerante a fallos.
  * **Activación de Filtros y Facetas Dinámicas:** En `VistaCatalogoPublico.vue`, se activaron filtros interactivos de Marcas, Líneas, Tipo de Resina, Colores, Presentaciones y Rango de Precio con conteos en tiempo real provistos por `/api/busqueda/facetas`.
  * **Ordenamiento en Servidor:** Conexión del selector de orden con el backend (`relevancia`, `precio_asc`, `precio_desc`, `novedad`).
  * **Analítica de Búsquedas Fallidas:** Auto-registro anónimo en BD de búsquedas sin resultados y sincronización del servicio del panel administrativo con `/api/busqueda/estadisticas/sin-resultado`.
* **Versión anterior:** `v0.3.39.0`
* **Nueva versión:** `v0.3.40.0`
* **Tipo de cambio:** `Minior-feat`
* 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M02/walkthrough_v0.3.40.0_M02_integracion_busqueda_facetas_frontend.md](./walkthroughs/M02/walkthrough_v0.3.40.0_M02_integracion_busqueda_facetas_frontend.md)

---
## [v0.3.39.0] - 2026-09-30

### M01: Menú Responsive de Productos, Flujo de Calculadora y Ajustes Responsive

* **Alcance General:** Incremento **MINIOR-FEAT (v0.3.39.0)** para las Vistas Públicas Frontend del módulo M01. Se implementan mejoras funcionales en el menú de Productos, se corrige el flujo de la calculadora de pintura y se realizan ajustes de adaptación responsive.
* **Hitos Clave:**
  * **Menú responsive de Productos:** Se implementa el flujo para visualizar directamente las opciones de "Ver todos los productos" y las categorías disponibles desde dispositivos móviles.
  * **Navegación por categorías:** Se implementa el flujo de Categoría → Subcategorías → Catálogo filtrado, permitiendo cargar únicamente las subcategorías correspondientes a la categoría seleccionada.
  * **Calculadora desde Home y Productos:** Se ajusta el comportamiento para que la calculadora se abra como página completa cuando el usuario ingresa desde Home o Productos.
  * **Calculadora desde Detalle de producto:** Se ajusta el comportamiento para que la calculadora se abra como modal cuando el usuario ya se encuentra consultando un producto específico.
  * **Responsive M01:** Se realizan ajustes en las vistas públicas de M01 para mejorar su adaptación a diferentes tamaños de pantalla.
* **Flujo implementado:**
  * `Home / Productos → Calculadora completa → Cálculo → Buscar/Elegir producto`
  * `Detalle de producto → Calculadora → Modal → Resultado → Regresar/continuar`
  * `Productos → Ver todos / Categorías → Categoría → Subcategorías → Catálogo filtrado`
* **Versión anterior:** `v0.3.38.1`
* **Nueva versión:** `v0.3.39.0`
* **Tipo de cambio:** `Minior-feat`

### M05: Carrito de compras (Frontend)
- **Alcance General:** Incremento **Minior-feat (v0.3.39.0)** para la interfaz e integración frontend del carrito de visitantes y clientes autenticados. No incluye el registro de rutas globales, el checkout/pago ni el despliegue.
- **Flujos:** carga del carrito, persistencia del visitante mediante `x-visitor-token`, gestión de cantidades y líneas, estado vacío, fusión al autenticar y revalidación antes del checkout autenticado. Los totales de producción proceden de la API.
- **Integración y verificación:** contra los contenedores aislados backend/PostgreSQL, `GET /api/health` confirmó `database: connected`; la E2E en `localhost` verificó carga, agregar, persistir tras recargar, aumentar/disminuir, eliminar, vaciar y bloqueo del checkout visitante. Las solicitudes verificadas respondieron `200` y no hubo errores CORS ni de consola.
- **Validaciones frontend:** TypeScript M05, ESLint, sintaxis de `vite.config.mjs` y build aislado pasaron sobre la base frontend completa compatible.
- **Dependencias pendientes:** registrar explícitamente `m05CarritoRoutes` en el router global; completar el flujo de checkout/pago con M07 y la creación de la orden en M08. M01/M02 deben proveer el catálogo completo que sustituirá los fallbacks visuales.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M05/walkthrough_v0.3.39.0_M05_carrito_compras_frontend.md](./walkthroughs/M05/walkthrough_v0.3.39.0_M05_carrito_compras_frontend.md)

---

## [v0.3.38.1] - 2026-09-29
### Módulo: M08 Orden de Venta — Cierre del backend: diagramas, especificación y dictamen (Documentación)
- **Alcance General:** Incremento **PATCH (v0.3.38.1)** que cierra el backend de M08. Pone al día sus diagramas y su especificación, que seguían describiendo el ciclo anterior a las definiciones del analista, y deja el dictamen del checklist de cierre del equipo. Sin cambios de comportamiento, de BD ni de archivos compartidos.
- **Hitos Clave:**
  - **Máquina de estados:** `Maquina_de_estados_de_la_Orden.drawio.png` muestra el ciclo implementado:
    - desde Preparada, domicilio pasa a Despachado y recogida a Entregado, con vuelta a En preparación con motivo;
    - Cancelado y Devuelto aparecen como no habilitados (M11).

    Mantiene el formato editable de draw.io y la página del flujo end-to-end intacta.
  - **Documento de diseño v2.0** (`equipo-2-doc/assets/diagrams/M08/M08_Orden_de_venta.md`): modelo de datos real, flujo de creación, máquina de estados, arquitectura, aplicación de los ADR y pendientes vigentes. Sus 4 diagramas Mermaid están validados.
  - **Especificación** (`M08_ESPECIFICACION_ORDEN.md`): las 11 historias con sus 34 requisitos y 49 criterios, copiados de la Tanda 3C, más la implementación de cada historia, las definiciones aplicadas y los pendientes.
  - **Dictamen de cierre:**
    - HU-CUE-08 no aplica y HU-ADM-03 se cumple;
    - HU-SEG-06 se cumple en M08, con una observación externa: el seed da permisos de consulta del personal al rol empresa, y es decisión del líder técnico;
    - la matriz final es 41 ✅ · 3 ⚠️ · 5 ⛔ de 49.
  - **Código:** solo un comentario en `m08.routes.ts`. El analista confirmó que notas y contactos exigen `ventas.gestionar`.
  - 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M08/walkthrough_v0.3.38.1_M08_cierre_documentacion_backend.md](./walkthroughs/M08/walkthrough_v0.3.38.1_M08_cierre_documentacion_backend.md)

---

## [v0.3.38.0] - 2026-09-29
### Módulo: M08 Orden de Venta — Creación de la Orden al Confirmarse el Pago (Backend)
- **Alcance General:** Incremento **Minior-feat (v0.3.38.0)** con el servicio que convierte una solicitud SOL con el pago confirmado en orden (HU-ORD-01). Lo llamará M07, que no tiene responsable. Sin cambios de BD, de archivos compartidos ni de rutas HTTP.
- **Hitos Clave:**
  - **Contrato para M07:** `serviciosOrdenes.creacion.crearDesdePagoConfirmado()`, exportado en `m08.routes.ts`.
    - Valida la solicitud con Zod estricto: los campos desconocidos se rechazan.
    - Crea la orden en «Orden confirmada» con el código `PC-AAAA-NNNNN` (consecutivo sin huecos, año de Colombia).
    - Devuelve `{ codigo, codigoSolicitud, estado, creada }`.
  - **Reglas:**
    - sin pago confirmado no hay orden, y un pago inferior al total se rechaza (`RF-ORD-01-01`, D06);
    - la pasarela y la verificación manual son equivalentes (`CA-ORD-01-03`);
    - se registra la cotización de origen (`CA-ORD-01-04`);
    - una confirmación repetida o simultánea devuelve la misma orden (`CA-ORD-01-05`);
    - todo va en una transacción, así que un fallo no deja nada ni gasta número (`CA-ORD-01-06`, `RF-ORD-06-04`).
  - **Copia histórica al crear:** líneas, color, precios, descuentos en orden, IVA y entrega tal como los congeló la solicitud, sin recalcular ni redondear (D07). Primer registro del historial con el sistema o el empleado como autor.
  - **Correo (D05):** «Orden confirmada» al cliente al nacer la orden, sin bloquear. El aviso a M18 pasa a un archivo común con el cambio de estado.
  - **Verificación:**
    - `tsc` y `lint` limpios;
    - pruebas en memoria 117/117;
    - creación contra PostgreSQL con ROLLBACK 16/16, incluidas dos creaciones simultáneas;
    - lectura 36/36 y escritura 17/17;
    - servicio real con correo simulado y HTTP 7/7, en una base temporal.
  - 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M08/walkthrough_v0.3.38.0_M08_creacion_orden_pago_confirmado_backend.md](./walkthroughs/M08/walkthrough_v0.3.38.0_M08_creacion_orden_pago_confirmado_backend.md)

---

## [v0.3.37.0] - 2026-09-29
### Módulo: M08 Orden de Venta — Copia Histórica Completa de la Orden (Backend / BD)
- **Alcance General:** Incremento **Minior-feat (v0.3.37.0)** con la segunda tanda del modelo de datos de M08: esquema **3.9** (documentación de BD **v2.7**), de 47 a 49 tablas. Tiene visto bueno del líder técnico y el analista confirmó que está definido.
- **Hitos Clave:**
  - **Orden:** solicitud SOL de origen (`codigo_solicitud`, UNIQUE), modo y costo de entrega, y base, importe y tasa de IVA congelados; la dirección es opcional en la recogida.
  - **Líneas:** color solicitado, precio inicial, referencia a la variante sin FK, entonado y base consumida. Además, las líneas dejan de borrarse en cascada (`RF-ORD-02-04`).
  - **Tablas nuevas:** `linea_orden_descuento` (descuentos por línea en orden, `RF-ORD-02-02`) y `consecutivo` (numeración sin huecos para `PC-AAAA-NNNNN`, `RF-ORD-06-04`, reutilizable por M07).
  - **Detalle de M08:**
    - el cliente y el personal ven el modo de entrega, el IVA, la solicitud y, por línea, el color, el precio inicial, sus descuentos en orden y la marca de producto retirado sin enlace (`RF-ORD-04-03`);
    - el personal ve además la base consumida de las líneas entonadas (`RF-ORD-09-01`);
    - la bandeja muestra el modo de entrega (`RF-ORD-05-05`).
  - **Migración segura:** idempotente y compatible con la carga de BD del deploy. Las órdenes existentes conservan sus datos con los campos nuevos vacíos; el seed añade `ORD-2026-0003` con la copia completa.
  - **Verificación:**
    - `tsc` y `lint` limpios;
    - pruebas en memoria 91/91;
    - integración de lectura 36/36 e integración de escritura con ROLLBACK 17/17, en base migrada y en base nueva;
    - simulación del deploy con `psql -v ON_ERROR_STOP=1`, dos veces.
  - 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M08/walkthrough_v0.3.37.0_M08_copia_historica_backend.md](./walkthroughs/M08/walkthrough_v0.3.37.0_M08_copia_historica_backend.md) · Detalle de BD: [bd/docs/WALKTHROUGH_DATABASE.md](../bd/docs/WALKTHROUGH_DATABASE.md)

---

## [v0.3.36.0] - 2026-09-29
### Módulo: M08 Orden de Venta — Ajustes según la documentación del Drive (Backend)
- **Alcance General:** Incremento **Minior-feat (v0.3.36.0)** que alinea M08 con la Tanda 3C del Drive tras revisar la documentación vigente. Sin cambios de esquema ni de archivos compartidos.
- **Hitos Clave:**
  - **Historia de estados para el cliente (`RF-ORD-04-01`):** `GET /api/ordenes/mis-pedidos/:codigo` añade `historial` con cada estado y su fecha, sin autor ni motivo, que siguen siendo solo del personal (`RF-ORD-09-01`).
  - **Nombre del cliente en la bandeja (`RF-ORD-05-05`):** cada fila de `GET /api/ordenes/gestion` y del historial del cliente añade `cliente` (nombre del titular).
  - **Medios de contacto (`RF-ORD-09-02`):** `POST /api/ordenes/gestion/:codigo/contactos` acepta solo `correo` y `telefono`, los medios que la orden conserva; se retiran `whatsapp` y `otro`, que eran provisionales.
  - **Verificación:** pruebas en memoria 82/82, integración de lectura 29/29, integración de escritura con ROLLBACK 11/11 y comprobación HTTP de los tres cambios.
  - 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M08/walkthrough_v0.3.36.0_M08_ajustes_documentacion_drive_backend.md](./walkthroughs/M08/walkthrough_v0.3.36.0_M08_ajustes_documentacion_drive_backend.md)

---

## [v0.3.35.0] - 2026-09-29
### Módulo: M08 Orden de Venta — Gestión de Órdenes: Cambio de Estado, Historial, Notas y Contactos (Backend)
- **Alcance General:** Incremento **Minior-feat (v0.3.35.0)** que implementa sobre el modelo de datos de la v0.3.34.0 las operaciones del personal. Sin cambios de esquema ni de archivos compartidos: todo el código vive en `backend/src/modules/m08-ordenes/`.
- **Hitos Clave:**
  - **Cambio de estado (`HU-ORD-03`, `CA-ORD-05-01/02`):** `PATCH /api/ordenes/gestion/:codigo/estado` con `ventas.gestionar`. Aplica el ciclo de D01/D02, exige motivo al volver de Preparada a En preparación, guarda autor y fecha en el historial y rechaza con 409 si otra persona cambió la orden entre medias (`CA-ORD-05-08`). Cancelar y devolver siguen sin habilitar (política M11).
  - **Aviso al cliente (`D05`, `HU-NOT-02`):** al despachar se envía el correo de M18 `cambio_estado_orden`; si falla, el cambio de estado se conserva.
  - **Notas internas (`HU-ORD-10`):** `POST /api/ordenes/gestion/:codigo/notas`; editarlas o borrarlas responde 405 con la indicación de añadir otra. Nunca aparecen en la vista del cliente.
  - **Contactos con el cliente (`CA-ORD-09-03`):** `POST /api/ordenes/gestion/:codigo/contactos` con medio y detalle.
  - **Detalle del personal:** añade `historial`, `notas`, `contactos` y `transiciones_permitidas`. La bandeja cuenta `dias_esperando` desde el último cambio de estado (`CA-ORD-05-07`).
  - **Verificación:** pruebas en memoria 79/79; integración de lectura 27/27; integración de escritura con ROLLBACK 11/11; 29 peticiones HTTP reales con los resultados esperados.
  - 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M08/walkthrough_v0.3.35.0_M08_gestion_estados_notas_contactos_backend.md](./walkthroughs/M08/walkthrough_v0.3.35.0_M08_gestion_estados_notas_contactos_backend.md)

---

## [v0.3.34.0] - 2026-09-29
### Módulo: M08 Orden de Venta — Modelo de Datos: Estados, Historial, Notas Internas y Contactos (Backend / BD)
- **Alcance General:** Incremento **Minior-feat (v0.3.34.0)** con la primera tanda del modelo de datos de M08 (épica #28), aprobada por el líder técnico. Esquema **3.8** / documentación de BD **v2.6**: de 44 a 47 tablas.
- **Hitos Clave:**
  - **Ciclo de estados (`HU-ORD-03`):** `enum_estado_orden` pasa a `orden_confirmada`, `revision_disponibilidad`, `en_preparacion`, `preparada`, `despachado`, `entregado`, `cancelado` y `devuelto`; `orden.estado` nace en `orden_confirmada`.
  - **Migración segura para bases existentes:** renombra `pagado` → `orden_confirmada` y `enviado` → `despachado` sin perder datos. Es idempotente y funciona con el paso de carga de BD del deploy (`psql -v ON_ERROR_STOP=1`, v0.3.33.1).
  - **Tablas nuevas:** `historial_estado_orden` (cambios de estado con autor y fecha), `nota_orden` (notas internas, HU-ORD-10) y `contacto_orden` (contactos con el cliente, CA-ORD-09-03), con 6 índices y datos de ejemplo en el seed.
  - **Backend:** tipos Kysely en `core/db/types.ts`; M08 usa los estados nuevos (Mis pedidos: `despachado` y `devuelto` van a finalizados). Ningún otro módulo usaba los estados de la orden.
  - **Verificación:** `tsc` y `lint` limpios; pruebas M08 52/52; integración 20/20 en base migrada y en base nueva; simulación del deploy con `psql` sobre el estado actual del servidor.
  - 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M08/walkthrough_v0.3.34.0_M08_modelo_datos_estados_historial_backend.md](./walkthroughs/M08/walkthrough_v0.3.34.0_M08_modelo_datos_estados_historial_backend.md) · Detalle de BD: [bd/docs/WALKTHROUGH_DATABASE.md](../bd/docs/WALKTHROUGH_DATABASE.md)

---

## [v0.3.33.1] - 2026-09-29
### Core / Infraestructura: Carga del esquema y catálogo de la base de datos en el deploy
- **Alcance General:** Incremento **PATCH (v0.3.33.1)** que agrega al workflow `Deploy` la carga idempotente del esquema y los datos iniciales desde `bd/sql/`, para que la base de datos del VPS quede operativa con el catálogo y las cuentas de prueba documentadas.
- **Hitos Clave:**
  - **Nuevo paso `Cargar esquema y catálogo en PostgreSQL`:** ejecuta `schema_pintuclic.sql` y `seed_pintuclic.sql` con `psql` dentro del contenedor `pintuclic-db`, usando las credenciales del propio contenedor (`POSTGRES_USER`/`POSTGRES_DB`) y `ON_ERROR_STOP=1`.
  - **Idempotencia:** el DDL usa `IF NOT EXISTS` (el `DROP SCHEMA` está comentado) y el seed usa `ON CONFLICT DO NOTHING`, por lo que puede ejecutarse en cada despliegue sin borrar `pgdata` ni duplicar registros.
  - **Credenciales de prueba:** quedan disponibles `admin@pintuclic.co` y los demás usuarios del seed con la contraseña `Pintuclic2026` (hash BCrypt costo 12 ya incluido en `bd/sql/seed_pintuclic.sql`); se recomienda cambiar la clave del admin tras la primera carga.
  - 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/core/walkthrough_v0.3.33.1_core_carga_bd_en_deploy.md](./walkthroughs/core/walkthrough_v0.3.33.1_core_carga_bd_en_deploy.md)

---

## [v0.3.33.1] - 2026-09-29
### Core / Infraestructura: Carga del esquema y catálogo de la base de datos en el deploy
- **Alcance General:** Incremento **PATCH (v0.3.33.1)** que agrega al workflow `Deploy` la carga idempotente del esquema y los datos iniciales desde `bd/sql/`, para que la base de datos del VPS quede operativa con el catálogo y las cuentas de prueba documentadas.
- **Hitos Clave:**
  - **Nuevo paso `Cargar esquema y catálogo en PostgreSQL`:** ejecuta `schema_pintuclic.sql` y `seed_pintuclic.sql` con `psql` dentro del contenedor `pintuclic-db`, usando las credenciales del propio contenedor (`POSTGRES_USER`/`POSTGRES_DB`) y `ON_ERROR_STOP=1`.
  - **Idempotencia:** el DDL usa `IF NOT EXISTS` (el `DROP SCHEMA` está comentado) y el seed usa `ON CONFLICT DO NOTHING`, por lo que puede ejecutarse en cada despliegue sin borrar `pgdata` ni duplicar registros.
  - **Credenciales de prueba:** quedan disponibles `admin@pintuclic.co` y los demás usuarios del seed con la contraseña `Pintuclic2026` (hash BCrypt costo 12 ya incluido en `bd/sql/seed_pintuclic.sql`); se recomienda cambiar la clave del admin tras la primera carga.
  - 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/core/walkthrough_v0.3.33.1_core_carga_bd_en_deploy.md](./walkthroughs/core/walkthrough_v0.3.33.1_core_carga_bd_en_deploy.md)

---

## [v0.3.33.0] - 2026-09-28
### M17: Integración del frontend de permisos y personal con develop
- Incremento Minior-feat: incorpora las vistas y flujos existentes de M17 a la base actual de develop, conservando la estructura del módulo.
- Se conservan los componentes Core y los módulos entrantes de develop; se registran las rutas de M17 dentro de `/admin` sin retirar las del catálogo ni solicitudes.
- Vitest excluye las pruebas M17 basadas en `node:test`, que se ejecutan mediante `npm run test:m17`; se mantiene también la suite independiente del Core.
- Walkthrough: [integración M17 frontend](./walkthroughs/M17/walkthrough_v0.3.33.0_M17_integracion_develop_frontend.md).

---

## [v0.3.32.3] - 2026-09-28
### Core / Infraestructura: Actualización de Node 22 a Node 24 en las imágenes Docker
- **Alcance General:** Incremento **PATCH (v0.3.32.3)** que actualiza la imagen base de Node de `node:22-alpine` a `node:24-alpine` (LTS activo) en las construcciones de backend y frontend ejecutadas por el pipeline de despliegue. Sin cambios de código funcional.
- **Hitos Clave:**
  - **Backend:** `backend/Dockerfile` actualizado en las fases `builder` y `runner`.
  - **Frontend:** `frontend/Dockerfile` actualizado en la fase `build`; el runtime Nginx (`nginx:1.27-alpine`) no cambia.
  - **Alcance acotado:** no se modificaron workflows, el runner self-hosted, `actions/checkout`, `engines` ni `setup-node`.
  - 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/core/walkthrough_v0.3.32.3_core_actualizacion_node24_dockerfiles.md](./walkthroughs/core/walkthrough_v0.3.32.3_core_actualizacion_node24_dockerfiles.md)

---

## [v0.3.32.1] - 2026-09-28
### Core / Infraestructura: Recorte del `.env` de despliegue al catálogo de `.env.example`
- **Alcance General:** Incremento **PATCH (v0.3.32.1)** que limita la generación del `.env` en el job `Deploy` a las **17 variables exactas** de `.env.example`, eliminando claves de configuración que no forman parte de la plantilla oficial.
- **Hitos Clave:**
  - **Variables removidas del workflow:** `NODE_ENV`, `EXPONER_DETALLE_ERRORES`, `ROLES_ADMINISTRATIVOS`, `ALLOWED_ORIGINS`, `SMTP_MAX_REINTENTOS` y `SMTP_DELAY_REINTENTO_MS`; pasan a usar los valores por defecto del código.
  - **Matriz final:** *Secrets* = `POSTGRES_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SMTP_PASS`; *Variables* = `POSTGRES_USER`, `POSTGRES_DB`, `BACKEND_PORT`, `FRONTEND_PORT`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_FROM`, `SMTP_REPLY_TO`, `SMTP_SIMULACION`, `GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID`.
  - **Nota:** `NODE_ENV=production` ya lo fija `backend/Dockerfile`; el frontend proxya `/api` vía Nginx (mismo origen), por lo que `ALLOWED_ORIGINS` no es necesario para las vistas servidas por Nginx.
  - 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/core/walkthrough_v0.3.32.0_core_generacion_env_desde_secrets_deploy.md](./walkthroughs/core/walkthrough_v0.3.32.0_core_generacion_env_desde_secrets_deploy.md)

---

## [v0.3.32.0] - 2026-09-28
### Core / Infraestructura: Generación de `.env` desde GitHub Secrets en el Despliegue (CI/CD)
- **Alcance General:** Incremento **Minior-feat (v0.3.32.0)** que elimina la dependencia de un `.env` creado a mano en el VPS. El job `Deploy` ahora construye el archivo `.env` en tiempo de ejecución a partir de los **Secrets** y **Variables** del repositorio, sin exponer credenciales en el código ni en el historial de Git.
- **Hitos Clave:**
  - **Nuevo paso `Generar .env desde GitHub Secrets y Variables`:** mapea los valores por `env:`, valida que los secretos críticos (`POSTGRES_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SMTP_PASS`) estén presentes y escribe el `.env` con `umask 077` y `chmod 600`, sin imprimir valores en los logs.
  - **Separación config/credenciales:** credenciales en *Repository secrets*; configuración no sensible (`POSTGRES_USER`, puertos, `SMTP_HOST`, `ALLOWED_ORIGINS`, `GOOGLE_CLIENT_ID`, etc.) en *Repository variables*.
  - **Disparadores conservados:** automático en push a `develop` y manual vía `workflow_dispatch`.
  - 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/core/walkthrough_v0.3.32.0_core_generacion_env_desde_secrets_deploy.md](./walkthroughs/core/walkthrough_v0.3.32.0_core_generacion_env_desde_secrets_deploy.md)

---

## [v0.3.31.0] - 2026-09-28
### Módulo: M08 Orden de Venta — Bandeja, Búsqueda e Historial del Personal (Backend)
- **Alcance General:** Incremento **Minior-feat (v0.3.31.0)** que da al personal con «Revisar órdenes» (`ventas.ver`) una bandeja para atender pedidos (HU-ORD-05), un buscador por número, correo o teléfono del cliente (HU-ORD-08), el contacto del cliente en el detalle (HU-ORD-09) y el historial de compras del cliente (HU-ORD-11), según la épica #28 actualizada el 27/09. Sin cambios de esquema.
- **Hitos Clave:**
  - **Rutas nuevas:** `GET /api/ordenes/gestion` con filtros combinables, paginación y `orden=antiguedad`; `GET /api/ordenes/gestion/resumen` con contadores por estado; `GET /api/ordenes/gestion/:codigo/historial-cliente`.
  - **Generador del código `PC-AAAA-NNNNN`** con año de Colombia (D04), a la espera del consecutivo. Mis pedidos trata `enviado` como finalizado (D02).
  - **Propuesta de modelo de datos** para el líder técnico (`docs/walkthroughs/M08/PROPUESTA_MODELO_DATOS_M08.md`). Criterios: 13 cumplidos, 10 parciales y 26 bloqueados de 49.
  - **Calidad y Verificación:** `npx tsc --noEmit` y `npm run lint` sin errores ni advertencias; 51/51 pruebas en memoria, 20/20 de integración contra PostgreSQL y 12 peticiones HTTP reales correctas.
  - 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M08/walkthrough_v0.3.31.0_M08_bandeja_busqueda_historial_backend.md](./walkthroughs/M08/walkthrough_v0.3.31.0_M08_bandeja_busqueda_historial_backend.md)

---

## [v0.3.31.0] - 2026-09-28
### Módulo: M08 Orden de Venta — Bandeja, Búsqueda e Historial del Personal (Backend)
- **Alcance General:** Incremento **Minior-feat (v0.3.31.0)** que da al personal con «Revisar órdenes» (`ventas.ver`) una bandeja para atender pedidos (HU-ORD-05), un buscador por número, correo o teléfono del cliente (HU-ORD-08), el contacto del cliente en el detalle (HU-ORD-09) y el historial de compras del cliente (HU-ORD-11), según la épica #28 actualizada el 27/09. Sin cambios de esquema.
- **Hitos Clave:**
  - **Rutas nuevas:** `GET /api/ordenes/gestion` con filtros combinables, paginación y `orden=antiguedad`; `GET /api/ordenes/gestion/resumen` con contadores por estado; `GET /api/ordenes/gestion/:codigo/historial-cliente`.
  - **Generador del código `PC-AAAA-NNNNN`** con año de Colombia (D04), a la espera del consecutivo. Mis pedidos trata `enviado` como finalizado (D02).
  - **Propuesta de modelo de datos** para el líder técnico (`docs/walkthroughs/M08/PROPUESTA_MODELO_DATOS_M08.md`). Criterios: 13 cumplidos, 10 parciales y 26 bloqueados de 49.
  - **Calidad y Verificación:** `npx tsc --noEmit` y `npm run lint` sin errores ni advertencias; 51/51 pruebas en memoria, 20/20 de integración contra PostgreSQL y 12 peticiones HTTP reales correctas.
  - 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M08/walkthrough_v0.3.31.0_M08_bandeja_busqueda_historial_backend.md](./walkthroughs/M08/walkthrough_v0.3.31.0_M08_bandeja_busqueda_historial_backend.md)

---

## [v0.3.30.1] - 2026-09-27
### Core / M01 / M04: Resolución de Conflictos, Corrección de Linter y Restauración de Rutas (Frontend)
- **Alcance General:** Incremento **PATCH (v0.3.30.1)** que resuelve los conflictos de merge en componentes de registro, restaura las rutas del perfil y administración en el router central, elimina la advertencia de ESLint en tarjetas de catálogo y corrige la etiqueta duplicada en `App.vue`.
- **Hitos Clave:**
  - **Saneamiento de Merge y Componentes M04:** Limpieza de marcadores de conflicto Git en `PasoListo.vue` y `PasoVerificacion.vue`, restauración de modales en `LayoutHome.vue` y purga de componentes obsoletos duplicados.
  - **Restauración de Rutas Centrales (`routes/index.ts`):** Reincorporadas las rutas `/perfil` (`VistaPerfil.vue`) y `/admin/solicitudes` (`VistaAprobacionEmpresas.vue`) bajo el layout unificado.
  - **Calidad y Estabilidad Frontend:** Corrección de advertencia de `defineProps` en `TarjetaCombinacionColoresPublica.vue` (M01), eliminación de `<script setup>` duplicado en `App.vue`. Frontend con 0 errores y 0 advertencias de ESLint / TypeScript y build 100% exitoso.
- 🔗 **Versión:** `v0.3.30.1` registrada en `.github/version.txt`.

---

>>>>>>> 129430e744ca0f194300e90c53cfb9b3d97a7c9f
## [v0.3.29.1] - 2026-09-25
### Sistema: Migración al Versionamiento de Cuatro Segmentos y Bump Obligatorio (Documentación)
- **Alcance General:** Incremento **PATCH (v0.3.29.1)** que adopta el esquema oficial de cuatro segmentos de [CONTRIBUTING.md](../CONTRIBUTING.md) en todo el proyecto y establece la actualización obligatoria de `.github/version.txt` y su registro en este CHANGELOG por cada entrega. Alcance estrictamente documental: no se modifica ningún archivo de `backend/`.
- **Hitos Clave:**
  - **Fuente única de versión (`.github/version.txt`):** renumerado el esquema antiguo `3.29.0` → `0.3.29.0` y aplicado el parche de esta entrega `v0.3.29.1`. El workflow `.github/workflows/version.yml` genera el tag y el Release al llegar el cambio a `main` o `develop`.
  - **Prompt de agentes (`AGENTS.md`):** la IA ahora DEBE actualizar `.github/version.txt` y registrar la entrada del CHANGELOG en cada entrega (antes solo lo notificaba al usuario); Paso 9 corregido a `walkthrough_v[X.Y.Z.W]`.
  - **Guía oficial (`GUIA_VERSIONADO_Y_WALKTHROUGHS.md`):** segmentos alineados a CONTRIBUTING.md (`Mayor`, `Minior estable`, `Minior-feat`, `Patch`) conservando el mapeo a los inputs del workflow (`major`/`minor`/`patch`/`build`), regla de CHANGELOG obligatorio por bump y excepción documentada para `backend/`.
  - **Plantilla de walkthrough:** nomenclatura actualizada a cuatro segmentos (`walkthrough_v[X.Y.Z.W]`).
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/core/walkthrough_v0.3.29.1_core_versionamiento_4_segmentos.md](./walkthroughs/core/walkthrough_v0.3.29.1_core_versionamiento_4_segmentos.md)

---

## [v3.36.1] - 2026-09-20

### Módulo: M04 Cuentas, Autenticación y Perfil (Frontend)
- **Alcance General:** Incremento **PATCH (v3.36.1)** que reorganiza la arquitectura interna de componentes de M04 bajo los principios SOLID, agrupándolos por subdominios funcionales cohesivos (`auth/`, `registro/`, `recuperacion/`, `perfil/`, `empresas/`, `comunes/`), descomponiendo atómicamente flujos extensos (`ModalLogin.vue`, `PasoDatos.vue`) y estandarizando la experiencia visual con el Design System.
- **Hitos Clave de Arquitectura y Refactorización SOLID:**
  - **Desacoplamiento por Subdominios (SRP):** Erradicada la sobrecarga cognitiva de tener 14 componentes planos en un único directorio. Aislados los wizards multi-paso de registro y recuperación en sus carpetas dedicadas.
  - **Inversión de Dependencias (DIP) y Barril Central:** Creado `components/index.ts` para exportar de forma canónica y limpia los componentes del módulo.
  - **Encapsulación Atómica del SDK de Google (`BotonGoogleAuth.vue`):** Aislado todo el ciclo de vida, rendering dinámico de iframe, bucle de reintentos y fallback en un componente reutilizable autónomo, erradicando más de 100 líneas duplicadas entre Login y Registro.
  - **Subpantallas de Seguridad Desacopladas (`HU-CUE-02`):** Extraídas `PantallaVincularGoogle.vue` (vinculación con cuenta existente) y `PantallaCompletarPasswordGoogle.vue` (establecimiento de contraseña post-Google) como componentes dedicados reutilizables.
  - **Formularios de Registro Especializados (SRP):** Creados `FormRegistroNatural.vue` y `FormRegistroEmpresa.vue`, reduciendo `PasoDatos.vue` a 163 líneas (reducción del 62%) y `ModalLogin.vue` a 209 líneas (reducción del 45%).
  - **Camuflaje Visual y Tipografía en Perfil (`VistaPerfil.vue`):** Ajuste de degradado y máscara suave en el banner superior (`#E2EFFA`) y alineación estricta de la jerarquía tipográfica institucional (Poppins Bold 700 para H1, Poppins SemiBold 600 para títulos de sección, Inter Regular 400 y Medium 500 para cuerpo y etiquetas).
  - **Estandarización y Rediseño UI en Aprobación de Empresas (`VistaAprobacionEmpresas.vue`):** Modal de revisión alineado al 100% con el diseño oficial, estructurado en 5 tarjetas individuales verticales con bordes suaves (`rounded-2xl`), iconos temáticos en contenedores Lucide (`Building2`, `IdCard`, `User`, `Mail`, `Phone`), Razón Social destacada en fondo suave (`#F0F6FC`), y pie de acciones simétrico con botones oficiales (`XIcon` en `danger-outline` y `CheckIcon` en `corporate`).
  - **Transformación Responsiva de Modales a Mobile Bottom Sheets (`Modal.vue`):** Soporte responsivo nativo en el componente central del core, anclándose a la parte inferior en celulares (`max-md:bottom-0 max-md:rounded-t-[28px]`), incorporando barra superior de arrastre (*drag handle*) y gestos táctiles (*drag-to-dismiss*) para cerrar arrastrando hacia abajo o mediante el botón "X", preservando el diálogo centrado en desktop.
  - **Sincronización Preventiva de Historial:** Armonizadas las entradas de `v3.35.0` a `v3.35.7` provenientes de M01 directamente debajo de las versiones de M04 para evitar conflictos en el merge a `develop`.
- **Estado de Calidad:** ESLint (0 errores, 0 advertencias), TypeScript (`vue-tsc -b`) y Vite Build 100% exitosos sin errores.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M04/walkthrough_v3.36.1_M04_reorganizacion_subdominios_solid_frontend.md](./walkthroughs/M04/walkthrough_v3.36.1_M04_reorganizacion_subdominios_solid_frontend.md)

---

## [v3.36.0] - 2026-09-19

### Módulo: M04 Cuentas, Autenticación y Perfil & Core Layouts (Frontend)
- **Alcance General:** Incremento **MINOR (v3.36.0)** que consolida la refactorización arquitectónica de M04 bajo los principios SOLID, completa la sincronización con el Design System y Core Layouts (`Dropdown.vue`, botones de peligro/cancelación, modal accesible `X`), y audita el cumplimiento integral de notificaciones transaccionales M18 / SMTP.
- **Hitos Clave de Arquitectura y Frontend:**
  - **Refactorización SOLID de Perfil (`VistaPerfil.vue`):** Descomposición del antiguo componente monolítico de 485 líneas en submódulos atómicos: `PerfilSidebarNav.vue` (navegación y asistencia), `PerfilDatosForm.vue` (visualización y edición in-place con inputs del core) y `ModalConfirmarPassword.vue` (reautenticación de seguridad para cambio de correo). Reducción de la vista a menos de 140 líneas como coordinador declarativo limpio.
  - **Inversión de Dependencias (DIP):** Creación del composable reactivo `usePerfil.ts`, aislando las vistas del consumo estático de Axios y unificando el parseo de errores de backend sin acoplamiento a librerías HTTP.
  - **Consolidación y Purgado de Componentes:** Erradicación del componente duplicado local `PasosProgreso.vue` en favor del alias canónico exportado por `@/core/components`. Estandarización de inputs, checkboxes y botones nativos en `ModalLogin.vue`, `PasoDatos.vue`, `PasoListo.vue`, `PasoVerificacion.vue` y `RecuperarPasswordWizard.vue`.
  - **Seguridad y No Exposición de Datos Sensibles (`HU-SEG-06`):** Saneados todos los manejadores de error en formularios y llamadas de red, eliminando volcados de objetos en consola que expongan contraseñas o tokens en texto plano.
  - **Auditoría de Notificaciones Transaccionales (M18 SMTP):** Verificación exhaustiva de eventos de correo en las 10 HUs de cuentas. Generación del reporte formal para el equipo de backend con el diagnóstico y código propuesto para la emisión de `SOLICITUD_EMPRESA_RECIBIDA` en `solicitarAscensoEmpresa` (`HU-CUE-07`).
- **Estado de Calidad:** ESLint (0 errores, 0 advertencias), TypeScript (`vue-tsc -b`) y Vite Build 100% exitosos sin errores.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M04/walkthrough_v3.36.0_M04_refactor_solid_core_layouts_notificaciones_frontend.md](./walkthroughs/M04/walkthrough_v3.36.0_M04_refactor_solid_core_layouts_notificaciones_frontend.md)

---

## [v3.35.7] - 2026-09-20
### Módulo: M01 Catálogo / Vistas Públicas (Frontend)
- **Alcance:** Simulador de cinco ambientes en el detalle de pinturas, conectado al color de la variante, con alternancia a la galería del envase y ficha más compacta.
- **Hitos:** PNG RGBA de 1024 × 1024 aislados en M01, baño actualizado, muestras del color comercial y visor limitado a 384 px de alto.
- **Calidad:** TypeScript de la aplicación y ESLint de todo src aprobados sin errores ni advertencias. Build completo y validación visual pendientes; entrega parcial del detalle.
- **Walkthrough:** [Simulador de ambientes y ficha compacta](./walkthroughs/M01/walkthrough_v3.35.7_M01_ficha_compacta_ambientes_completos_frontend.md).

---
## [v3.35.2] - 2026-09-19
### Módulo: M01 Catálogo de Productos / Vistas Públicas & Core (Frontend)
- **Avance preliminar en Detalle de Producto (`VistaDetalleProductoPublico`):** ⚠️ *Nota de alcance: La vista de detalle de producto NO está finalizada; representa un avance técnico preliminar en desarrollo.* Se implementó la restricción condicional de la calculadora de pintura (`esPintura`) para que solo aplique a pinturas y no a herramientas/taladros, se deduplicaron las muestras cromáticas por `id_color` limitándolas a 6 con botón de apertura `+N más` hacia la carta completa, y se sincronizó el color inicial mediante query parameter (`?color=...`).
- **Centralización en Zona Global (`src/core/`):** Creación del módulo utilitario oficial `src/core/utils/moneda.ts` (`formatearCOP`, `formatearPrecio`, `formatearPrecioConSufijo`), erradicando duplicaciones de `Intl.NumberFormat`. Creación del componente oficial `MuestraColor.vue` en `src/core/components/data-display/` con relieve, sombra y anillo perimetral para alto contraste. Estandarización de variantes `descuento` y `destacado` en `Badge.vue`.
- **Sincronización en Paleta de Colores y Tarjetas:** Enlace reactivo de `:muestra-color="colorSeleccionado?.muestra_hex"` en `VistaPaletaColoresPublica` hacia `TarjetaProductoPublico`, y fallback automático para pinturas con variantes coloreadas. Eliminación de color inline arbitrario `bg-[#D62828]` en favor del componente oficial `<Badge estado="descuento">`.
- **Estado de Calidad:** ESLint (0 errores, 0 advertencias), TypeScript (`vue-tsc -b`) y Vite Build 100% exitosos sin errores.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.35.2_M01_avance_detalle_producto_y_core_frontend.md](./walkthroughs/M01/walkthrough_v3.35.2_M01_avance_detalle_producto_y_core_frontend.md)

---

## [v3.35.1] - 2026-09-17
### Módulo: M01 Catálogo de Productos / Vistas Públicas (Frontend)
- **Estandarización visual de tarjetas:** Alineación de `TarjetaProductoPublico` conforme a especificaciones oficiales con esquinas redondeadas `rounded-2xl`, insignia de descuento `-15%`, precios en una línea con precio tachado, y botón de compra alineado al pie (`mt-auto`) usando tokens oficiales (`bg-conversion-hover hover:bg-conversion-accent`).
- **Filas de 5 productos:** Reorganización de las grillas a 5 columnas (`lg:grid-cols-5`) en productos destacados (Home), pinturas y herramientas (Paleta de Colores), y productos complementarios (Detalle de Producto).
- **Distribución del combinador y abanico:** Cuadrícula de 2x2 para el combinador de colores con tarjetas de altura completa, y optimización de espaciados en el abanico de colores eliminando espacios en blanco innecesarios.
- **Identidad institucional en modales:** Incorporación de la barra superior decorativa con degradado multicolor Pintu Clic en el componente `Modal.vue` del Core, y eliminación del botón circular de slider en productos destacados.
- **Estado de Calidad:** ESLint (0 errores, 0 advertencias), TypeScript (`vue-tsc -b`) y Vite Build 100% exitosos sin errores.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.35.1_M01_diseno_storefront_tarjetas_frontend.md](./walkthroughs/M01/walkthrough_v3.35.1_M01_diseno_storefront_tarjetas_frontend.md)

---

## [v3.35.0] - 2026-09-16
### Módulo: M01 Catálogo de Productos / Vistas Públicas (Frontend)
- **Integración con Core Layouts:** Unificación de todas las vistas públicas (`VistaInicioPublica`, `VistaCatalogoPublico`, `VistaDetalleProductoPublico`, `VistaPaletaColoresPublica`) bajo el layout maestro unificado `LayoutHome.vue` configurado como rutas anidadas (`children: publicStorefrontRoutes`). Las vistas administrativas de catálogo se alojan correspondientemente como hijas de `/admin` en `LayoutAdmin.vue`.
- **Erradicación de Duplicidad:** Eliminados definitivamente los componentes duplicados `EncabezadoTiendaPublica.vue` y `PieTiendaPublica.vue`, delegando navegación, cabecera y pie al Core (`LayoutHome`, `HeaderPrincipal`, `FooterPrincipal`).
- **Estandarización Tipográfica y de Componentes:** Aplicadas fuentes institucionales del Design System (`font-title` / Poppins para títulos de sección, nombres de producto y precios; `font-sans` / Inter para textos, botones e inputs). Migrados modales y botones a componentes oficiales del Core (`Modal`, `Button`, `Paginacion`).
- **Estado de Calidad:** ESLint (0 errores, 0 advertencias), TypeScript (`vue-tsc -b`) y Vite Build 100% exitosos sin errores.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.35.0_M01_integracion_core_layouts_frontend.md](./walkthroughs/M01/walkthrough_v3.35.0_M01_integracion_core_layouts_frontend.md)

---

## [v3.34.10] - 2026-09-14
### Módulo: M01 Catálogo de Productos (Frontend)
- **Corrección visual:** El panel preliminar reemplaza los selects deshabilitados por secciones compactas con buscador, checkboxes, muestras circulares y rango de precio, siguiendo el mockup del catálogo.
- **Datos provisionales:** Marcas, colores, familias y presentaciones visibles se deducen de la página pública cargada; la aplicación completa continúa pendiente de facetas M02.
- **Estado de Calidad:** ESLint, TypeScript/Vite y validación visual local superados.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.34.10_M01_corregir_diseno_filtros_frontend.md](./walkthroughs/M01/walkthrough_v3.34.10_M01_corregir_diseno_filtros_frontend.md)

---

## [v3.34.9] - 2026-09-14
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** El catálogo público presenta la estructura completa de filtros avanzados exigida por HU-BUS-02 como vista preliminar.
- **Integración pendiente:** Marca, línea, resina, color, familia cromática, presentación y precio quedan deshabilitados hasta consumir las facetas y la búsqueda paginada de M02; no se hardcodearon catálogos.
- **Estado de Calidad:** ESLint, TypeScript/Vite y verificación visual local.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.34.9_M01_filtros_catalogo_estaticos_frontend.md](./walkthroughs/M01/walkthrough_v3.34.9_M01_filtros_catalogo_estaticos_frontend.md)

---

## [v3.34.8] - 2026-09-13
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance en revisión:** La Paleta pública adopta un abanico de láminas físicas y un combinador visual compacto, conservando la selección reactiva de HU-CAT-06.
- **Integridad visual:** Seis colores por lámina, armonías 2/4/3/5 con código revelado en hover, Tailwind y tokens oficiales; las muestras cromáticas continúan proviniendo de la API.
- **Estado de Calidad:** ✅ Build TypeScript/Vite, ESLint, `git diff --check` y validación interactiva local sin errores.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.34.8_M01_abanico_laminas_fisicas_frontend.md](./walkthroughs/M01/walkthrough_v3.34.8_M01_abanico_laminas_fisicas_frontend.md)

---

## [v3.34.7] - 2026-09-13
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** Uniformidad estructural del storefront de HU-CAT-06 mediante un encabezado público compartido y un ancho máximo común para Home, Catálogo, Detalle y Paleta.
- **Hitos Clave:** Home conserva sus anclas internas; el encabezado unifica el alcance de envíos y sus estados accesibles; Paleta adopta `max-w-7xl` en todas sus secciones principales.
- **Estado de Calidad:** ✅ Build TypeScript/Vite, ESLint, `git diff --check` y comprobación visual local sin errores.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.34.7_M01_encabezado_ancho_storefront_frontend.md](./walkthroughs/M01/walkthrough_v3.34.7_M01_encabezado_ancho_storefront_frontend.md)

---

## [v3.34.6] - 2026-09-13
### Módulo: M01 Catálogo de Productos (Backend + Frontend)
- **Alcance parcial:** Avance funcional de la paleta pública de HU-CAT-06; la vista continúa en iteración visual y no se declara terminada.
- **Hitos Clave:** La API expone código, muestra cromática y familia de cada variante; la interfaz habilita filtros, abanico móvil, combinaciones interactivas y muestras en productos recomendados.
- **Estado de Calidad:** ✅ Backend TypeScript, ESLint y 123 pruebas M01; frontend TypeScript/Vite y ESLint sin errores ni advertencias.
- 🔗 **Walkthrough Backend:** [walkthroughs/M01/walkthrough_v3.34.6_M01_paleta_interactiva_backend.md](./walkthroughs/M01/walkthrough_v3.34.6_M01_paleta_interactiva_backend.md)
- 🔗 **Walkthrough Frontend:** [walkthroughs/M01/walkthrough_v3.34.6_M01_paleta_interactiva_frontend.md](./walkthroughs/M01/walkthrough_v3.34.6_M01_paleta_interactiva_frontend.md)

---

## [v3.34.5] - 2026-09-12
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** Paleta pública ajustada a la referencia visual aprobada, con ancho de contenido uniforme, hero compacto, filtros simplificados y composición de dos columnas.
- **Abanico:** Nuevo componente interactivo con láminas superpuestas, apertura lateral desde un pivote único, marca frontal y selección accesible de colores publicados.
- **Estado de Calidad:** ✅ Build TypeScript/Vite, ESLint y validación visual e interactiva local sin errores.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.34.5_M01_paleta_abanico_referencia_frontend.md](./walkthroughs/M01/walkthrough_v3.34.5_M01_paleta_abanico_referencia_frontend.md)

---

## [v3.34.4] - 2026-09-12
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** Paleta pública, menú de categorías y calculadora alineados con la UI Spec oficial mediante radios, espaciado, jerarquía y estados interactivos consistentes.
- **Accesibilidad:** Controles táctiles de al menos 44 px, focos visibles, etiquetas accesibles y estado deshabilitado explícito para la asesoría aún no disponible.
- **Estado de Calidad:** ✅ Build TypeScript/Vite, ESLint y validación visual local sin errores.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.34.4_M01_paleta_herramientas_ui_spec_frontend.md](./walkthroughs/M01/walkthrough_v3.34.4_M01_paleta_herramientas_ui_spec_frontend.md)

---

## [v3.34.3] - 2026-09-12
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** Detalle público alineado con la UI Spec oficial: superficie en tarjeta, ambiente visual, descripción colapsable, swatches, presentaciones, controles táctiles y nota de color referencial.
- **Interacción:** La selección de color mantiene la variante/precio y muestra la imagen asociada cuando la API aporta una imagen para ese color.
- **Estado de Calidad:** ✅ Build TypeScript/Vite, ESLint y validación visual local sin errores.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.34.3_M01_detalle_ui_spec_frontend.md](./walkthroughs/M01/walkthrough_v3.34.3_M01_detalle_ui_spec_frontend.md)

---

## [v3.34.2] - 2026-09-12
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** Catálogo público alineado con la UI Spec oficial: encabezado, toolbar sticky, orden, vista grid/lista, sidebar y drawer móvil, estados y sección de complementos.
- **Compatibilidad:** Se preservó la búsqueda y paginación en servidor; disponibilidad y orden visual operan únicamente sobre la página recibida, sin simular filtros que la API no soporta.
- **Estado de Calidad:** ✅ Build TypeScript/Vite, ESLint y validación visual local sin errores.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.34.2_M01_catalogo_ui_spec_frontend.md](./walkthroughs/M01/walkthrough_v3.34.2_M01_catalogo_ui_spec_frontend.md)

---

## [v3.34.1] - 2026-09-12
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** Ajuste visual del Home y la tarjeta pública de producto conforme a la UI Spec oficial v1.0.
- **Hitos Clave:** Jerarquía Poppins/Inter, precio destacado, grid 24/32 px, radios oficiales, áreas táctiles de 44 px y estados hover/active/focus consistentes.
- **Estado de Calidad:** ✅ Build TypeScript/Vite y ESLint sin errores ni advertencias.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.34.1_M01_home_ui_spec_frontend.md](./walkthroughs/M01/walkthrough_v3.34.1_M01_home_ui_spec_frontend.md)

---

## [v3.34.0] - 2026-09-12
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** Carta de colores modal integrada en la ficha pública de producto para HU-CAT-06, con búsqueda, selección, paginación visual y conservación de la presentación compatible.
- **Integridad:** La interfaz utiliza únicamente variantes públicas del producto, no expone la base al cliente y diferencia claramente las muestras ilustrativas de los datos aún ausentes en la API.
- **Estado de Calidad:** ✅ Build TypeScript/Vite, ESLint y verificación visual e interactiva en navegador local sin errores.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.34.0_M01_carta_colores_producto_frontend.md](./walkthroughs/M01/walkthrough_v3.34.0_M01_carta_colores_producto_frontend.md)

---

## [v3.33.0] - 2026-09-12
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** Vista pública `/paleta-colores` de HU-CAT-06, construida a partir de los colores y productos publicados por la API de catálogo.
- **Experiencia:** Hero, búsqueda por nombre, selector visual, combinador inspiracional, productos recomendados, complementarios, beneficios y navegación integrada con el storefront.
- **Integridad de datos:** No se inventaron códigos, muestras HEX ni familias cromáticas. Los filtros por familia quedan visibles pero deshabilitados hasta que el backend exponga la clasificación pública y la compatibilidad color–base.
- **Estado de Calidad:** ✅ Build TypeScript/Vite, ESLint y verificación visual en navegador local sin errores.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.33.0_M01_paleta_colores_publica_frontend.md](./walkthroughs/M01/walkthrough_v3.33.0_M01_paleta_colores_publica_frontend.md)

---

## [v3.32.0] - 2026-09-12
### Integración: Core Frontend + M01 Catálogo
- **Alcance:** Integración de `feature/core-frontend-layouts` en la rama de vistas públicas, incorporando layouts, componentes UI base, tipos globales y agregador único de rutas.
- **Compatibilidad:** Se conservaron las rutas públicas y administrativas de M01; `/admin` redirige al dashboard de catálogo mientras se incorporan los demás módulos.
- **Correcciones de Integración:** Se eliminó estado sin uso en `LayoutHome` y se sustituyeron colores hexadecimales inline por tokens oficiales.
- **Estado de Calidad:** ✅ Build TypeScript/Vite y ESLint sin errores ni advertencias.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.32.0_M01_integracion_core_frontend.md](./walkthroughs/M01/walkthrough_v3.32.0_M01_integracion_core_frontend.md)

---

## [v3.31.0] - 2026-09-12
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** Calculadora pública de pintura integrada en Home, catálogo y ficha de producto para HU-CAT-06.
- **Cálculo:** Valida superficie, dimensiones y cantidad con Zod; estima galones usando el rendimiento mínimo/máximo real del producto y dos manos de aplicación.
- **Experiencia:** Modal responsive de tres etapas conforme a la maqueta, con resultado, producto recomendado y dependencia de carrito claramente delimitada.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.31.0_M01_calculadora_pintura_frontend.md](./walkthroughs/M01/walkthrough_v3.31.0_M01_calculadora_pintura_frontend.md)

---

## [v3.30.0] - 2026-09-12
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** Ficha pública de producto de HU-CAT-06 con galería, descripción, variantes, precio, cantidad y productos complementarios.
- **Navegación:** Las tarjetas del Home y del catálogo abren `/productos/:productoId`; los productos no disponibles muestran el estado contractual correspondiente.
- **Estado de Calidad:** Datos obtenidos exclusivamente de los endpoints públicos de M01 y respaldo visual local mientras HU-CAT-07 no exponga imágenes.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.30.0_M01_detalle_producto_publico_frontend.md](./walkthroughs/M01/walkthrough_v3.30.0_M01_detalle_producto_publico_frontend.md)

---

## [v3.29.0] - 2026-09-16

### Módulo: M04 Cuentas, Autenticación y Perfil (Frontend)
- **Alcance General:** Incremento **MINOR (v3.29.0)** que implementa la aprobación administrativa de cuentas empresa (`HU-CUE-09`), la reestructuración responsiva del perfil de usuario y el flujo de verificación para cambio seguro de correo electrónico (`HU-CUE-06` / `HU-CUE-01`), con adopción integral de los componentes globales del Design System Pintuclic (`@/core/components`).
- **Hitos Clave de Implementación:**
  - **Aprobación de Cuentas Empresa (`VistaAprobacionEmpresas.vue`):** Erradicación total de HTML nativo (`<table>`, `<button>`). Implementación del componente `<Table>` con soporte responsivo automático (`mobile-cards`), `TableColumn` fuertemente tipado, clave de fila `row-key="id_solicitud"`, badges semánticos (`Badge`) y modal de dictamen (`Modal`, `Button`) con motivo de rechazo obligatorio según `RF-CUE-09-05`.
  - **Perfil de Usuario Responsivo y Cambio Seguro de Correo (`VistaPerfil.vue`):** Reestructuración de la vista con CSS Grid responsivo (`order-1`, `order-2`, `order-3` en móvil). Campo de documento de identidad bloqueado contra edición indebida con tooltip explicativo. Implementación de flujo de seguridad de cambio de correo que exige la contraseña actual (`contrasenaActual`), consume `POST /cuentas/perfil/cambiar-correo/solicitar` y valida el código OTP de 6 dígitos con `POST /cuentas/perfil/cambiar-correo/confirmar` actualizando el store reactivo de Pinia.
  - **Componente Reutilizable de Verificación (`PasoVerificacion.vue`):** Adaptado para admitir el prop `isCambioCorreo`, omitir la barra de pasos de registro cuando aplica y emitir el código OTP digitado hacia el componente padre.
  - **Servicios y Tipado Centralizado (`cuentas.service.ts`, `admin.interface.ts`):** Nuevos métodos cliente `solicitarCambioCorreo`, `confirmarCambioCorreo`, `listarSolicitudesEmpresa` y `dictaminarSolicitudEmpresa`. Contratos de interfaz tipados sin `any`.
  - **Enrutamiento Administrativo Central (`src/core/routes/index.ts`):** Montaje formal de la ruta `/admin/empresas` bajo `LayoutAdmin`.
  - 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M04/walkthrough_v3.29.0_M04_aprobacion_empresas_perfil_cambio_correo_frontend.md](./walkthroughs/M04/walkthrough_v3.29.0_M04_aprobacion_empresas_perfil_cambio_correo_frontend.md)

---

## [v3.31.0] - 2026-09-24
### Módulo: M08 Orden de Venta (Frontend)
- **Alcance:** Primera entrega del frontend de M08 sobre los endpoints de consulta de `v3.30.0`/`v3.30.1`. Cubre la sección de pedidos del cliente (HU-ORD-07) y el seguimiento del pedido (HU-ORD-02, HU-ORD-04, HU-ORD-06) en vista maestro-detalle sobre una misma pantalla. La parte administrativa (HU-ORD-01, HU-ORD-03, HU-ORD-05) queda fuera por ausencia de endpoints.
- **Hitos Clave:** Módulo autónomo en `frontend/src/modules/m08-ordenes/` con listado, buscador servidor, filtros y paginación en cliente, panel de seguimiento y respaldo de mocks. Expone el componente `SeccionMisPedidos` para que otros módulos lo incrusten.
- **Estado de Calidad:** ✅ `vue-tsc --noEmit` y `eslint` sin errores ni advertencias. Paleta verificada: 0 hexadecimales arbitrarios, 0 estilos inline, 0 clases ajenas a la marca.
- ⚠️ **Dependencias bloqueantes:** requiere aprobación del Líder Técnico para dos archivos compartidos (enrutador central y tokens de tema). Ver reporte de parada.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M08/walkthrough_v3.31.0_M08_seccion_pedidos_cliente_frontend.md](./walkthroughs/M08/walkthrough_v3.31.0_M08_seccion_pedidos_cliente_frontend.md)

---

## [v3.30.1] - 2026-09-22
### Módulo: M08 Orden de Venta (Backend)
- **Alcance:** Montaje del router de M08 en el enrutador central. Las tres consultas entregadas en `v3.30.0` ya responden bajo `/api/ordenes`; antes devolvían 404 porque el módulo no estaba registrado. Sin cambios de lógica.
- **Hitos Clave:** `backend/src/app.routes.ts` registra `appRouter.use('/ordenes', ordenesRoutes)`, siguiendo el mismo patrón que el resto de módulos. Habilita las pruebas de API del equipo de testing.
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m08.test.ts`: 18/18.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M08/walkthrough_v3.30.1_M08_montaje_rutas_backend.md](./walkthroughs/M08/walkthrough_v3.30.1_M08_montaje_rutas_backend.md)

---

## [v3.30.0] - 2026-09-15
### Módulo: M08 Orden de Venta (Backend)
- **Alcance:** Primera entrega del backend de M08. El cliente consulta su sección de pedidos (en curso / finalizados, con buscador) y el detalle de un pedido propio; el personal autorizado localiza órdenes por código visible. La creación de órdenes y el ciclo de estados quedan bloqueados por el esquema de BD (ver walkthrough).
- **Hitos Clave:** `GET /api/ordenes/mis-pedidos`, `GET /api/ordenes/mis-pedidos/:codigo` y `GET /api/ordenes/gestion/:codigo` (permiso `ventas.ver`). Una orden ajena responde igual que una inexistente y el intento queda registrado (M20). Router pendiente de montar en `app.routes.ts`. CA: 8 cumplidos, 6 parciales y 16 bloqueados.
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m08.test.ts`: 18/18. ⚠️ Pendiente validar contra PostgreSQL real.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M08/walkthrough_v3.30.0_M08_consulta_ordenes_backend.md](./walkthroughs/M08/walkthrough_v3.30.0_M08_consulta_ordenes_backend.md)

---

## [v3.29.0] - 2026-09-22
### Base de Datos: Sincronización Completa de DDL, Mocks y Tipos Kysely según Diagrama ER (Backend)
- **Alcance General:** Incremento **MINOR (v3.29.0)** que actualiza el esquema relacional de PostgreSQL (`bd/sql/schema_pintuclic.sql`), los datos iniciales de prueba y mocks (`bd/sql/seed_pintuclic.sql`), la documentación técnica oficial (`bd/docs/DOCUMENTACION_BASE_DATOS.md`) y los tipos TypeScript en Kysely (`backend/src/core/db/types.ts`) basándose en el diagrama Entidad-Relación (Mermaid ER) actualizado.
- **Hitos Clave:**
  - **Bloque Fusionado (`Variante` $\rightarrow$ `Bases` $\rightarrow$ `Color` $\rightarrow$ `tonos`):** Vinculación de `base` a `variante` (`id_variante`) con `prefijo`; clasificación de `color` por `id_base`; atributo `nombre` y `hexagesimal` en `tonos`.
  - **Ventas y Carrito:** Soporte de `ref_viva` en `linea_carrito`, asociación de `cotizacion` a `id_usuario` e `id_rol`, y atributo `carrito_o_cotizacion` en `orden`.
  - **Calidad y Verificación:** `npx tsc --noEmit` y `npm run lint` ejecutados con 0 errores y 0 advertencias.
  - 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/DATABASE/walkthrough_v3.29.0_DATABASE_actualizacion_esquema_diagrama_er_backend.md](./walkthroughs/DATABASE/walkthrough_v3.29.0_DATABASE_actualizacion_esquema_diagrama_er_backend.md)

---

## [v3.28.0] - 2026-09-13
### Core: Layouts Globales, Enrutador Central y Sincronización con M01 Catálogo (Frontend)
- **Alcance General:** Incremento **MINOR (v3.28.0)** que formaliza la arquitectura visual y estructural de layouts del frontend para Pintu Clic. Unifica los layouts globales (`LayoutHome`, `LayoutAdmin`, `LayoutAcceso`, `FooterPrincipal`), sincroniza el enrutamiento central con el módulo completo de catálogo `M01` recién integrado en `develop` y resuelve conflictos de merge en el contenedor raíz.
- **Hitos Clave de Arquitectura y Frontend:**
  - **Layout de Tienda Pública (`LayoutHome.vue`):** Maquetación de la experiencia e-commerce con Topbar institucional de cobertura Caquetá, Header responsive, Navbar con navegación y selector de categorías, menú de usuario activo con logout y contenedor de modales globales de autenticación `M04` (`ModalLogin`, `RegistroWizard`).
  - **Shell de Administración (`LayoutAdmin.vue`):** Panel administrativo colapsable con menús tipo acordeón para Gestión Administrativa y Gestión de Catálogo, integración de branding oficial y topbar administrativo.
  - **Shell de Acceso Minimalista (`LayoutAcceso.vue`):** Estructura base centrada para pantallas completas de inicio de sesión o restablecimiento de credenciales.
  - **Enrutador Central Unificado (`src/core/routes/index.ts`):** Fusión armónica de la tienda pública como raíz de `LayoutHome`, montaje de `...dashboardCatalogoRoutes` de `M01`, redirección defensiva de `/admin` a `/admin/catalogo` (evitando pantallas en blanco) y alias para búsquedas administrativas (`/admin/catalogo/busquedas-sin-resultado`).
  - **Contenedores Limpios (`App.vue` & `main.ts`):** Simplificación de `App.vue` a un `<router-view />` puro y montaje ordenado de Pinia y Vue Router en `main.ts`.
  - **Corrección de Linter y TypeScript:** Saneamiento de variables huérfanas en `LayoutHome.vue` (`showMobileMenu`), logrando 0 errores en compilación estricta (`vue-tsc -b`) y 0 advertencias en ESLint.
  - 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/CORE/walkthrough_v3.28.0_CORE_layouts_globales_enrutador_frontend.md](./walkthroughs/CORE/walkthrough_v3.28.0_CORE_layouts_globales_enrutador_frontend.md)

---

## [v3.27.0] - 2026-09-11

### Módulo: M01 Catálogo de Productos (Backend)
- **Alcance:** feat(M01): integrar soporte para `id_categoria_complementaria` y `patrocinado` en la creación de productos (HU-CAT-08).
- **Hitos Clave:** Se agregó al `CrearProductoDto` y a la lógica `crear` en el `ProductosService`.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.27.0_M01_productos_complementarios_creacion_backend.md](./walkthroughs/M01/walkthrough_v3.27.0_M01_productos_complementarios_creacion_backend.md)

---

## [v3.26.0] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** feat(M01): responsive adaptado del dashboard de catalogo para telefono y tablet.
- **Hitos Clave:** Ajustes de responsive.
- **Estado de Calidad:** Validado en rama feature/m01-especificacion-catalogo.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.26.0_M01_dashboard_responsive_frontend.md](./walkthroughs/M01/walkthrough_v3.26.0_M01_dashboard_responsive_frontend.md)

---

## [v3.25.2] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** fix(M01): compactar el resumen lateral de variantes para que la tabla se vea completa.
- **Hitos Clave:** Ajustes visuales de tabla.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.25.2_M01_compactar_variantes_frontend.md](./walkthroughs/M01/walkthrough_v3.25.2_M01_compactar_variantes_frontend.md)

---

## [v3.25.1] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** fix(M01): corregir desbordamiento lateral en categorias y filtrar productos afectados al desactivar.
- **Hitos Clave:** Corrección de desbordamiento.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.25.1_M01_fix_desbordamiento_categorias_frontend.md](./walkthroughs/M01/walkthrough_v3.25.1_M01_fix_desbordamiento_categorias_frontend.md)

---

## [v3.25.0] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** feat(M01): integrar crear/editar marca y detalle de marca segun maquetas admin 13 y 14.
- **Hitos Clave:** Integración de maquetas.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.25.0_M01_marcas_frontend.md](./walkthroughs/M01/walkthrough_v3.25.0_M01_marcas_frontend.md)

---

## [v3.24.0] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** feat(M01): integrar crear/editar categoria, subcategoria y modal desactivar segun maquetas admin 10 11 12.
- **Hitos Clave:** Integración de maquetas de categorías.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.24.0_M01_categorias_frontend.md](./walkthroughs/M01/walkthrough_v3.24.0_M01_categorias_frontend.md)

---

## [v3.23.1] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** fix(M01): tabla de variantes no horizontal y acciones en menu de tres puntos.
- **Hitos Clave:** Fix UI.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.23.1_M01_fix_tabla_variantes_frontend.md](./walkthroughs/M01/walkthrough_v3.23.1_M01_fix_tabla_variantes_frontend.md)

---

## [v3.23.0] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** feat(M01): integrar crear y editar variante segun maquetas admin 07 y 08.
- **Hitos Clave:** Integración de variantes.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.23.0_M01_crear_editar_variante_frontend.md](./walkthroughs/M01/walkthrough_v3.23.0_M01_crear_editar_variante_frontend.md)

---

## [v3.22.0] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** feat(M01): integrar vista detalle administrativo del producto segun maqueta admin 05.
- **Hitos Clave:** Detalle de producto.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.22.0_M01_detalle_producto_frontend.md](./walkthroughs/M01/walkthrough_v3.22.0_M01_detalle_producto_frontend.md)

---

## [v3.21.1] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** fix(M01): fijar el menu de acciones al hacer scroll.
- **Hitos Clave:** Fix UI.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.21.1_M01_fix_menu_acciones_frontend.md](./walkthroughs/M01/walkthrough_v3.21.1_M01_fix_menu_acciones_frontend.md)

---

## [v3.21.0] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** feat(M01): integrar vista editar producto y menu de acciones segun maqueta admin 04.
- **Hitos Clave:** Edición de producto.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.21.0_M01_editar_producto_frontend.md](./walkthroughs/M01/walkthrough_v3.21.0_M01_editar_producto_frontend.md)

---

## [v3.20.0] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** feat(M01): montar vue-router e integrar el panel de catalogo en la app.
- **Hitos Clave:** Enrutamiento vue-router.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.20.0_M01_vue_router_frontend.md](./walkthroughs/M01/walkthrough_v3.20.0_M01_vue_router_frontend.md)

---

## [v3.19.2] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** feat(M01): agregar ilustraciones de producto y logos de marca del catalogo.
- **Hitos Clave:** Ilustraciones agregadas.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.19.2_M01_ilustraciones_logos_frontend.md](./walkthroughs/M01/walkthrough_v3.19.2_M01_ilustraciones_logos_frontend.md)

---

## [v3.19.1] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** refactor(M01): fijar la barra lateral del panel al hacer scroll.
- **Hitos Clave:** Refactor UI.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.19.1_M01_fijar_barra_lateral_frontend.md](./walkthroughs/M01/walkthrough_v3.19.1_M01_fijar_barra_lateral_frontend.md)

---

## [v3.19.0] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** refactor(M01): carga transparente en las 8 vistas del panel de catalogo.
- **Hitos Clave:** Refactor UI de carga.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.19.0_M01_carga_transparente_frontend.md](./walkthroughs/M01/walkthrough_v3.19.0_M01_carga_transparente_frontend.md)

---

## [v3.18.0] - 2026-09-09
### Módulo: M02 Búsqueda y navegación (Backend)
- **Alcance:** Sexta entrega del módulo M02: facetas del catálogo (HU-BUS-02, RF-BUS-02-02). Cierra el último requisito funcional pendiente del módulo: ofrecer en cada filtro únicamente los valores que producen resultados, con su conteo. Sin cambios de esquema.
- **Hitos Clave:** Nuevo endpoint **público** `GET /api/busqueda/facetas` que acepta los mismos parámetros que la búsqueda (término + filtros) y devuelve, por dimensión (`categorias`, `subcategorias`, `marcas`, `lineas`, `resinas`, `colores`, `presentaciones`), los valores disponibles con su número de productos. Conteo **conjuntivo** (aplica todos los filtros vigentes) mediante agregaciones `GROUP BY` con `COUNT(DISTINCT producto)` sobre la misma base filtrada de la búsqueda; solo aparecen valores con `cantidad ≥ 1` (RF-BUS-02-02). Ordenadas por frecuencia desc con desempate por nombre. Se refactorizó el armado de filtros del controlador a un helper compartido por `buscar` y `facetas`.
- **Diferido:** (1) **conteo disyuntivo** (que una dimensión no se cuente a sí misma, estándar de e-commerce): hoy es conjuntivo; ampliar si se requiere. (2) **Faceta de color solo cuenta preparados** (variante con ese color); los entonables (carta de la marca) quedan fuera del conteo. (3) **Familia cromática:** sigue diferida (sin dato, HU-CAT-05).
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m02.test.ts`: 26/26 pruebas superadas (+1 de facetas). ✅ **Validado contra PostgreSQL real** (`pintuclic-db`): las agregaciones de marca, presentación (vía variante) y subcategoría ejecutan sin errores y cuentan productos distintos correctamente (p. ej. Pintuco 2 / Interpinturas 1). Con esto, **M02 backend cubre todas sus HU funcionales** (HU-BUS-01/02/03/05/06; HU-BUS-04 descartada por el spec).
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M02/walkthrough_v3.18.0_M02_facetas_backend.md](./walkthroughs/M02/walkthrough_v3.18.0_M02_facetas_backend.md)

---

## [v3.17.0] - 2026-09-09
### Módulo: M02 Búsqueda y navegación (Backend)
- **Alcance:** Quinta entrega del módulo M02: registro de búsquedas sin resultado (HU-BUS-06). Completa las HU funcionales del módulo. Registra de forma **anónima** los términos que no arrojan resultados (M20 / CA-BUS-06-02) y expone un listado **solo para administradores** con el permiso «Consultar estadísticas» (M17 / CA-BUS-06-03).
- **Hitos Clave:** **BD v3.7:** nueva tabla **`busqueda_sin_resultado`** (`id_busqueda`, `termino`, `fecha`), modelo por evento (sin identidad de usuario) con índices por `fecha` y `termino`. Nuevo permiso M17 **`estadisticas.consultar`** (id 20) asignado al rol administrador. El endpoint público `GET /api/busqueda/productos` ahora **registra** el término (normalizado a minúsculas) cuando una búsqueda con texto da 0 resultados, aislado en `try/catch` para no afectar a la búsqueda (RF-BUS-01-06). Nuevo endpoint **protegido** `GET /api/busqueda/estadisticas/sin-resultado?periodo=diario|semanal|mensual|anual` (default `mensual`) que agrega por término y ordena por frecuencia (RF-BUS-06-02 / CA-BUS-06-01), sin exponer identidad.
- **Nota de arquitectura:** el registro en runtime es un insert operacional (analítica), no auto-siembra de catálogo; no incumple la política de seed centralizado (regla #10). Toques globales autorizados por el PO: `bd/sql/schema_pintuclic.sql` (tabla), `backend/src/core/db/types.ts` (tipos) y `bd/sql/seed_pintuclic.sql` (permiso + asignación).
- **Diferido:** retención por periodo configurable (RF-BUS-06-01: purga de eventos antiguos) — pendiente de un job/config; hoy se conservan todos los eventos.
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m02.test.ts`: 25/25 pruebas superadas (+4 de HU-BUS-06). ✅ **Validado contra PostgreSQL real** (`pintuclic-db`): tabla e índices creados, permiso 20 asignado al rol administrador, y la agregación por frecuencia verificada (un término repetido aparece una sola vez con su conteo; CA-BUS-06-01). Datos de prueba eliminados tras la validación. ℹ️ `npm run db:reset` no se ejecutó por un desajuste de conexión preexistente del `setup.ts` (usuario/host); los objetos se aplicaron directamente al contenedor.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M02/walkthrough_v3.17.0_M02_busquedas_sin_resultado_backend.md](./walkthroughs/M02/walkthrough_v3.17.0_M02_busquedas_sin_resultado_backend.md)

---

## [v3.16.0] - 2026-09-09
### Módulo: M02 Búsqueda y navegación (Backend)
- **Alcance:** Cuarta entrega del módulo M02: paginación de resultados (HU-BUS-05). Buena parte ya estaba cubierta por la paginación introducida en HU-BUS-01 (entrega por páginas con `limite`/`offset`, `total`, `pagina` y conservación de filtros/orden por ser un endpoint sin estado). Esta versión **consolida el hueco real**: los metadatos de **páginas numeradas** (RF-BUS-05-02). Sin cambios de esquema.
- **Hitos Clave:** La respuesta de `GET /api/busqueda/productos` incorpora `total_paginas` (= `ceil(total/limite)`) junto a `total`, `pagina` y `limite`, habilitando la navegación por páginas numeradas. Una página que excede el total responde **sin error** con `items` vacío y los metadatos correctos (CA-BUS-05-04). El orden determinista (desempate estable por nombre, HU-BUS-03) garantiza que no haya reordenamiento dinámico entre páginas (RF-BUS-05-02).
- **Estado ya cubierto por HU previas:** RF-BUS-05-01 (entrega por páginas del tamaño configurado sin cargar todo; `total` y `pagina`) y CA-BUS-05-01/02 (primera página acotada; avanzar conservando filtros y orden) provienen de HU-BUS-01/02/03. RNF-BUS-05-01 (móvil/tableta/escritorio sin scroll horizontal) y CA-BUS-05-03 son responsabilidad del frontend.
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m02.test.ts`: 21/21 pruebas superadas (+3 de paginación: `total_paginas`, sin resultados y página fuera de rango). ℹ️ Sin SQL nuevo; el cálculo de páginas se valida en el suite en memoria.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M02/walkthrough_v3.16.0_M02_paginacion_backend.md](./walkthroughs/M02/walkthrough_v3.16.0_M02_paginacion_backend.md)

---

## [v3.15.0] - 2026-09-09
### Módulo: M02 Búsqueda y navegación (Backend)
- **Alcance:** Tercera entrega del módulo M02: ordenamiento de resultados (HU-BUS-03). Se **extiende el mismo endpoint** `GET /api/busqueda/productos` con el parámetro `orden`, combinable con término y filtros y conservado en la paginación (CA-BUS-03-01). Sin cambios de esquema.
- **Hitos Clave:** Nuevo parámetro `orden` con valores `relevancia` (por defecto), `precio_asc`, `precio_desc` y `novedad` (RF-BUS-03-01). La **relevancia se pondera** nombre>marca>línea>color>descripción (pesos 5/4/3/2/1) con un bonus por coincidencia exacta del nombre para priorizar el exacto sobre el aproximado (RF-BUS-03-02). Todos los criterios cierran con **desempate estable por nombre asc**, de modo que consultas idénticas mantienen el orden entre páginas (RF-BUS-03-03 / CA-BUS-03-03). El precio del producto para ordenar es el mínimo de sus variantes activas. Los productos sin coincidencia (relevancia 0) no se elevan por patrocinio (CA-BUS-03-04, ya garantizado desde HU-BUS-01).
- **Diferido:** (1) **precio final tras descuentos + IVA** y **precio por condiciones de empresa** en el orden por precio (CA-BUS-03-05): dependen de M06 (inexistente); el orden opera sobre `variante.precio_vigente` (precio base). (2) **Novedad sin fecha:** `producto` no tiene columna de fecha de alta; se usa `id_producto` (serial) como proxy de novedad hasta que el esquema incorpore una fecha. (3) **Default "configurable"** (RF-BUS-03-01): fijo en `relevancia` hasta que exista un módulo de configuración.
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m02.test.ts`: 18/18 pruebas superadas (+3 de ordenamiento: default, propagación del criterio y validación del enum). ✅ **Validado contra PostgreSQL real** (`pintuclic-db`): la relevancia ponderada y el subquery de precio mínimo ejecutan sin errores y ordenan correctamente (p. ej. `vinil` → *Viniltex* con relevancia 6.667 encabezando).
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M02/walkthrough_v3.15.0_M02_ordenamiento_backend.md](./walkthroughs/M02/walkthrough_v3.15.0_M02_ordenamiento_backend.md)

---

## [v3.14.0] - 2026-09-09
### Módulo: M02 Búsqueda y navegación (Backend)
- **Alcance:** Segunda entrega del módulo M02: filtros del catálogo (HU-BUS-02). Se **extiende el mismo endpoint** `GET /api/busqueda/productos` para aceptar filtros simultáneos y multivalor (RF-BUS-02-01), combinables con el término de búsqueda y conservados en la paginación (CA-BUS-02-05). Sin cambios de esquema.
- **Hitos Clave:** Nuevos parámetros de query `categoria`, `subcategoria`, `marca`, `linea`, `resina`, `color`, `presentacion` (multivalor: `?marca=1&marca=2` o `?marca=1,2`) y `precio_min`/`precio_max`. Cada filtro es un OR interno (`in`) y entre filtros distintos es AND; todos se resuelven con `EXISTS` sobre `producto` para devolver **productos, no variantes** (RF-BUS-02-03). El filtro de color incluye **preparados y entonables** (CA-BUS-02-08). El rango de precio inválido (mínimo > máximo) se rechaza como error de validación 400 (CA-BUS-02-06). Los filtros se aplican por igual a productos patrocinados (CA-BUS-02-09, sin tratamiento especial).
- **Diferido:** (1) **familia cromática** (RF-BUS-02-01): las familias se difirieron en M01/HU-CAT-05, no hay dato que filtrar. (2) **Precio final tras descuentos + IVA** y **precio por condiciones de empresa** (RF-BUS-02-04 / CA-BUS-02-07): dependen de M06 (inexistente); el rango opera de momento sobre `variante.precio_vigente` (precio base). (3) **Facetas** (RF-BUS-02-02: "ofrecer solo los valores que producen resultados"): endpoint de valores disponibles pendiente; el backend ya acepta que el frontend agregue/quite filtros y responde `total=0` cuando no hay coincidencias.
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m02.test.ts`: 14/14 pruebas superadas (término, paginación, propagación de filtros, parseo multivalor y validación del rango de precio). ✅ **Validado contra PostgreSQL real** (`pintuclic-db`, extensiones `unaccent`/`pg_trgm` activas): el predicado completo y las ramas `EXISTS` de filtros (precio, color preparado/entonable, presentación) ejecutan sin errores contra el esquema real. Nota: los 3 productos del seed están `publicado=f`, por lo que el endpoint público responde vacío hasta que se publique algún producto (HU-CAT-02).
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M02/walkthrough_v3.14.0_M02_filtros_backend.md](./walkthroughs/M02/walkthrough_v3.14.0_M02_filtros_backend.md)

---

## [v3.13.0] - 2026-09-09
### Módulo: M02 Búsqueda y navegación (Backend)
- **Alcance:** Primera entrega del módulo M02: búsqueda de productos por texto libre (HU-BUS-01). Primer endpoint del módulo, **público (sin autenticación)** y resuelto en servidor (RF-BUS-01-02 / CA-BUS-01-04). Búsqueda tolerante a errores tipográficos e insensible a mayúsculas y acentos (RF-BUS-01-03).
- **Hitos Clave:** Nuevo endpoint público `GET /api/busqueda/productos?q=&pagina=&limite=`. Busca sobre **nombre, descripción, marca, línea y color** del producto usando `unaccent` + `pg_trgm` (`word_similarity`, umbral 0.3). En color incluye tanto los **preparados** (variante con ese color) como los **entonables** (producto entonable cuyo color existe en la carta de su marca), cumpliendo RF-BUS-01-05. Cada producto aparece **una sola vez** vía subconsultas `EXISTS` (sin joins que multipliquen filas), excluye inactivos/no publicados (RF-BUS-01-04) y con término vacío devuelve el catálogo completo (RF-BUS-01-01). Resultados paginados con `total/pagina/limite` (base para HU-BUS-05) y ordenados por relevancia de nombre con desempate estable alfabético.
- **Prerrequisito de BD (global):** habilitar las extensiones `unaccent` y `pg_trgm` en PostgreSQL (`CREATE EXTENSION IF NOT EXISTS ...`). No se modificó `bd/sql/schema_pintuclic.sql` (archivo del equipo de BD); su inclusión durable en el esquema queda pendiente de coordinación con ese equipo.
- **Diferido:** filtros (HU-BUS-02), ordenamiento configurable por precio/novedad y relevancia ponderada completa (HU-BUS-03), metadatos de paginación numerada (HU-BUS-05) y registro de búsquedas sin resultado (HU-BUS-06). El precio real tras descuentos (M06) no aplica a esta HU.
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m02.test.ts`: 8/8 pruebas superadas (normalización del término y paginación con repositorio en memoria). ✅ **Validado contra PostgreSQL real** (`pintuclic-db`, extensiones `unaccent`/`pg_trgm` activas): `unaccent` resuelve acentos (`maxima`↔"Máxima") y `word_similarity` la tolerancia a typos (`vinil`→"Viniltex" 0.833 ≥ 0.3). Nota: los 3 productos del seed están `publicado=f`, por lo que el endpoint público responde vacío hasta que se publique algún producto (HU-CAT-02).
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M02/walkthrough_v3.13.0_M02_busqueda_backend.md](./walkthroughs/M02/walkthrough_v3.13.0_M02_busqueda_backend.md)

---

## [v3.12.1] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** feat(M01): montar panel de catalogo frontend con las 8 vistas admin.
- **Hitos Clave:** Montaje de panel frontend.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.12.1_M01_montar_panel_frontend.md](./walkthroughs/M01/walkthrough_v3.12.1_M01_montar_panel_frontend.md)

---

## [v3.12.0] - 2026-09-09
### Módulo: M01 Catálogo de Productos (Backend)
- **Alcance:** Decimotercera entrega del módulo M01: productos complementarios (HU-CAT-08). Cada producto puede declarar la categoría de la que se extraen sus complementarios, y los productos pueden marcarse como patrocinados para priorizarlos.
- **Hitos Clave:** BD v3.6: `producto` gana `id_categoria_complementaria` (FK categoría, `ON DELETE SET NULL`, RF-CAT-08-01) y `patrocinado` (BOOLEAN, RF-CAT-08-02). Nuevo endpoint **público** `GET /api/catalogo/publico/productos/:id/complementarios` que devuelve hasta 4 productos activos+publicados de la categoría configurada, **patrocinados primero**, con **fallback a patrocinados** si no hay categoría o no arroja resultados, excluyendo el propio producto (CA-CAT-08-04). La configuración (`id_categoria_complementaria`, `patrocinado`) se administra vía el update de producto, validando que la categoría exista.
- **Diferido:** configuración de complementarios a nivel categoría (la spec permite "producto o categoría"; se implementó a nivel producto), exclusión de combos agotados (RF-CAT-08-03, depende de combos/stock — CAT-13/M05-M08) y CA-CAT-08-05 (no sugerir en el carrito → M05).
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m01.test.ts`: 123/123 pruebas superadas. ✅ Validado contra PostgreSQL real (reset de esquema + seed en `pintuclic-db`): columnas y FK de complementarios verificadas; 43 tablas.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.12.0_M01_complementarios_backend.md](./walkthroughs/M01/walkthrough_v3.12.0_M01_complementarios_backend.md)

---

## [v3.11.0] - 2026-09-09
### Módulo: M01 Catálogo de Productos (Backend)
- **Alcance:** Duodécima entrega del módulo M01: consulta pública del catálogo (HU-CAT-06). Primeros endpoints **públicos (sin autenticación)** del módulo, que exponen únicamente elementos activos y publicados (RF-CAT-06-01, RF-CAT-09-02). Sin cambios de esquema.
- **Hitos Clave:** Nuevos endpoints públicos `GET /api/catalogo/publico/categorias` (categorías/subcategorías con productos activos+publicados — RF-CAT-06-02, CA-CAT-06-04), `GET /api/catalogo/publico/productos?subcategoria=&q=&pagina=&limite=` (listado paginado — RNF-CAT-06-01, CA-CAT-06-05) y `GET /api/catalogo/publico/productos/:id` (ficha con variantes activas —presentación, color/base, precio, existencia—, imágenes y rendimiento; 404 "no disponible" si el producto no está activo+publicado — CA-CAT-06-02/03). Consultas de solo lectura con joins y `EXISTS`.
- **Diferido:** RF-CAT-06-03 (carta navegable por familia cromática — familias diferidas en HU-CAT-05) y RF-CAT-06-04 (solo colores preparables sobre una base activa — depende de color↔base, HU-CAT-12 flujo 3, pendiente de RF-CAT-12-12).
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m01.test.ts`: 118/118 pruebas superadas. ✅ Consultas SQL validadas contra el esquema real de `pintuclic-db` (categorías con productos, listado paginado y variantes con joins). Sin cambios de esquema (43 tablas).
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.11.0_M01_consulta_publica_backend.md](./walkthroughs/M01/walkthrough_v3.11.0_M01_consulta_publica_backend.md)

---

## [v3.10.0] - 2026-09-09
### Módulo: M01 Catálogo de Productos (Backend)
- **Alcance:** Undécima entrega del módulo M01: estado y ciclo de vida del catálogo (HU-CAT-09). Buena parte de la HU ya estaba cubierta de forma transversal por las entregas previas; esta versión **consolida los huecos reales**: (1) cierra la cascada de desactivación marca→productos (posible ahora que `producto.id_marca` existe desde HU-CAT-02) y (2) agrega el aviso previo de impacto en cascada (RF-CAT-09-03) para marca y producto. **Sin cambios de esquema.**
- **Hitos Clave:** `MarcasService.desactivar` ahora también desactiva los productos de la marca (RF-CAT-04-03, antes era un hueco). Nuevos endpoints de solo lectura `GET /api/catalogo/marcas/:id/impacto-desactivacion` (líneas, bases, colores y productos activos afectados) y `GET /api/catalogo/productos/:id/impacto-desactivacion` (variantes activas e imágenes afectadas). Métodos de conteo (`contarActivasPorMarca` / `contarActivosPorMarca`, `contarImagenes`) en los repositorios.
- **Estado ya cubierto por HU previas:** RF-CAT-09-01 (sin borrado físico de referenciados: no hay endpoints DELETE de catálogo salvo `imagen`), RF-CAT-09-04/05/06 (reactivación verificando dependencias activas, incluida la variante entonable con base inactiva y la variante de brocha sin comprobación de base/color). RF-CAT-09-02 (exclusión del catálogo público) se aplicará en HU-CAT-06.
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m01.test.ts`: 113/113 pruebas superadas. ℹ️ Sin cambios de esquema (43 tablas); la lógica de cascada e impacto se valida en el suite en memoria.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.10.0_M01_ciclo_vida_backend.md](./walkthroughs/M01/walkthrough_v3.10.0_M01_ciclo_vida_backend.md)

---

## [v3.9.0] - 2026-09-09
### Módulo: M01 Catálogo de Productos (Backend)
- **Alcance:** Décima entrega del módulo M01: imágenes del producto (HU-CAT-07). Cargar, reemplazar, eliminar y ordenar imágenes (RF-CAT-07-01), asociarlas a una variante o color del propio producto (RF-CAT-07-02) y mantener una sola imagen principal por producto (CA-CAT-07-02). Almacenamiento en la propia infraestructura como BYTEA (RF-CAT-07-03). Con esto, el `publicar` de HU-CAT-02 ya puede exigir imagen.
- **Hitos Clave:** BD v3.5: nueva tabla **`imagen`** (`id_producto` FK, `id_variante`/`id_color` opcionales, `datos` BYTEA, `mime_type`, `orden`, `es_principal`) con **índice único parcial** de una principal por producto. Endpoints `POST/GET /api/catalogo/productos/:idProducto/imagenes`, `GET /api/catalogo/imagenes/:id/contenido` (binario con `Cache-Control`), `PATCH/DELETE /api/catalogo/imagenes/:id`. La imagen viaja como data URL base64 (jpeg/png/webp ≤5MB, mismo validador que el logotipo de marca; sin dependencias nuevas).
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m01.test.ts`: 110/110 pruebas superadas. ✅ Validado contra PostgreSQL real (reset de esquema + seed en `pintuclic-db`): tabla `imagen`, FKs e índice único parcial de principal verificados; 43 tablas.
- **Pendiente (RNF-CAT-07-01):** generación de miniaturas optimizadas — se sirve el binario con caché; las miniaturas requieren una librería de imágenes y quedan documentadas como pendientes.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.9.0_M01_imagenes_backend.md](./walkthroughs/M01/walkthrough_v3.9.0_M01_imagenes_backend.md)

---

## [v3.8.0] - 2026-09-09
### Módulo: M01 Catálogo de Productos (Backend)
- **Alcance:** Novena entrega del módulo M01: se completa el **flujo 2 de HU-CAT-12** — declarar qué bases ofrece cada producto entonable (RF-CAT-12-02/03). Cierra un pendiente conocido de la v2.6.0. El flujo 3 (asociación color↔base) sigue diferido por depender de la decisión de negocio RF-CAT-12-12.
- **Hitos Clave:** BD v3.4: nueva tabla join **`producto_base`** (`id_producto`, `id_base`). Endpoints `GET/POST/DELETE /api/catalogo/productos/:idProducto/bases`. Reglas: solo productos entonables pueden ofrecer bases (RF-CAT-12-02); la base debe ser de la marca del producto y estar activa (RF-CAT-12-03); no se puede quitar una base usada por una variante. **Acoplamiento con HU-CAT-03:** una variante entonable ahora exige que su base esté declarada en `producto_base` (además de pertenecer a la marca).
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m01.test.ts`: 102/102 pruebas superadas. ✅ Validado contra PostgreSQL real (reset de esquema + seed en `pintuclic-db`): tabla `producto_base` con PK compuesta y FKs verificadas; 42 tablas.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.8.0_M01_producto_base_backend.md](./walkthroughs/M01/walkthrough_v3.8.0_M01_producto_base_backend.md)

---

## [v3.7.0] - 2026-09-09
### Módulo: M01 Catálogo de Productos (Backend)
- **Alcance:** Octava entrega del módulo M01: rendimiento del producto (HU-CAT-10). **Alcance aprobado por el PO: solo rendimiento**, sin catálogo genérico de atributos técnicos (RF-CAT-10-01 diferido). El rendimiento se captura en m² por galón (mínimo y máximo) y se deriva por presentación a partir del volumen, sin capturarlo una por una.
- **Hitos Clave:** BD v3.3: `producto` gana `rendimiento_min` / `rendimiento_max` (NUMERIC, opcionales) con CHECK que exige ambos o ninguno, `> 0` y `min ≤ max` (RF-CAT-10-02/05). Endpoints `GET/PATCH /api/catalogo/productos/:idProducto/rendimiento`: el GET devuelve el rendimiento por galón y su **derivación por presentación activa** (RF-CAT-10-03, `valor × volumen / galón`). El rendimiento se incluye además en la ficha del producto. Sin tablas nuevas.
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m01.test.ts`: 94/94 pruebas superadas. ✅ Validado contra PostgreSQL real (reset de esquema + seed en `pintuclic-db`): columnas y CHECK de rendimiento verificados con datos semilla (Viniltex 40–45, Esmalte 15–20); 41 tablas.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.7.0_M01_rendimiento_backend.md](./walkthroughs/M01/walkthrough_v3.7.0_M01_rendimiento_backend.md)

---

## [v3.6.0] - 2026-09-09
### Módulo: M01 Catálogo de Productos (Backend)
- **Alcance:** Séptima entrega del módulo M01: gestión de variantes (HU-CAT-03) y de presentaciones como entidad propia. La variante es el SKU vendible con precio y existencia referencial; su forma depende de la clase del producto (entonable→base, colores_fijos→color, sin_color→ninguno). Con esto queda operativo el `publicar` real de HU-CAT-02 (ya validaba variante activa). La actualización de precio/color en la ficha pública (RF-CAT-03-07) es de frontend.
- **Hitos Clave:** BD v3.2: nueva tabla **`presentacion`** (nombre + volumen numérico, RF-CAT-03-05) y `variante` enriquecida (`+id_presentacion` obligatoria, `+id_base`, `+existencia_referencial` con CHECK ≥ 0, `+codigo_proveedor` único, y unicidad de forma `UNIQUE NULLS NOT DISTINCT (id_producto, id_base, id_color, id_presentacion)`). Endpoints `POST/GET/PATCH /api/catalogo/variantes` (+`/desactivar`, `/reactivar`), `GET /api/catalogo/productos/:idProducto/variantes`, y `POST/GET/PATCH /api/catalogo/presentaciones` (+estado). Reglas: forma por clase (RF-CAT-03-02); sin variantes idénticas (RF-CAT-03-03); base/color deben ser de la marca del producto y estar activos; existencia no negativa (RF-CAT-03-04); código de proveedor único (RF-CAT-03-06); sin borrado físico, solo desactivación (RF-CAT-03-01); reactivación condicionada a dependencias activas (RF-CAT-09-04/05).
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m01.test.ts`: 86/86 pruebas superadas. ✅ Validado contra PostgreSQL real (reset de esquema + seed en `pintuclic-db`): estructura de `variante` v3.2 (`uq_variante_forma NULLS NOT DISTINCT`, `uq_variante_codigo_proveedor`, CHECKs de precio/existencia, FKs a base/color/presentación), tabla `presentacion` y datos semilla verificados; 41 tablas.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.6.0_M01_variantes_backend.md](./walkthroughs/M01/walkthrough_v3.6.0_M01_variantes_backend.md)

---

## [v3.5.0] - 2026-09-09
### Módulo: M01 Catálogo de Productos (Backend)
- **Alcance:** Sexta entrega del módulo M01: gestión de productos (HU-CAT-02), con la información común independiente de las variantes, clase de color, catálogo administrable de tipos de resina y relación N:M con subcategorías. La publicación (RF-CAT-02-05) se implementa de forma parcial (valida ≥1 variante activa; la exigencia de imagen queda diferida a HU-CAT-07). Variantes en sí (HU-CAT-03) quedan fuera de esta entrega.
- **Hitos Clave:** BD v3.1: nuevo `enum_clase_color` (`entonable | colores_fijos | sin_color`), nuevas tablas **`tipo_resina`** (catálogo administrable, RF-CAT-02-04) y **`producto_subcategoria`** (N:M, RF-CAT-02-02), y `producto` enriquecido (`id_marca` obligatoria, `id_linea`/`id_tipo_resina` opcionales, `clase_color`, `descripcion`, `estado`, `publicado`). Endpoints `POST/GET/PATCH /api/catalogo/productos` (+`/publicar`, `/despublicar`, `/desactivar`, `/reactivar`) con búsqueda `?q=&marca=`, y `POST/GET/PATCH /api/catalogo/tipos-resina` (+estado). Reglas: marca obligatoria y existente; ≥1 subcategoría; una pintura (clase ≠ `sin_color`) exige línea + resina y la línea debe ser de la marca del producto; la clase no puede cambiarse si el producto ya tiene variantes (RF-CAT-02-03, verificado contra `variante`).
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m01.test.ts`: 72/72 pruebas superadas. ✅ Validado contra PostgreSQL real (reset de esquema + seed en `pintuclic-db`): estructura de `producto` v3.1, `tipo_resina` y `producto_subcategoria`, FKs y datos semilla verificados; 40 tablas.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.5.0_M01_productos_backend.md](./walkthroughs/M01/walkthrough_v3.5.0_M01_productos_backend.md)

---

## [v3.4.0] - 2026-09-08
### Módulo: M01 Catálogo de Productos (Backend)
- **Alcance:** Quinta entrega del módulo M01: gestión administrativa de colores (HU-CAT-05), cada color asociado a la marca que efectivamente lo ofrece y con su valor cromático CIELAB obligatorio. **Alcance aprobado por el PO: sin familias cromáticas** (RF-CAT-05-03 diferido). El uso del color en carta/variantes (RF-CAT-05-04/05/06) y la asociación color↔base (RF-CAT-12-04, flujo 3 de CAT-12) quedan diferidos por depender de HU-CAT-02/03 y de la decisión de negocio RF-CAT-12-12.
- **Hitos Clave:** Tabla `color` enriquecida (BD v3.0): ahora `id_marca` (FK marca, obligatoria), `codigo` (opcional), `cie_l/cie_a/cie_b` (CIELAB obligatorio con CHECK de rango), `estado`, y unicidad `UNIQUE(id_marca, nombre)` en lugar de nombre global. La muestra visual se **deriva del CIELAB** (`muestra_hex` sRGB) sin requerir imagen (RF-CAT-05-02). Endpoints `POST/GET/PATCH /api/catalogo/colores` (+`/desactivar`, `/reactivar`) y `GET /api/catalogo/marcas/:idMarca/colores?q=` (búsqueda por nombre/código, RF-CAT-05-01/CA-CAT-05-05). Se extendió la cascada de HU-CAT-04: desactivar una marca ahora desactiva también sus colores (RF-CAT-04-03).
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m01.test.ts`: 57/57 pruebas superadas. ✅ Validado contra PostgreSQL real (reset de esquema + seed aplicados en el contenedor `pintuclic-db`): estructura de `color` v3.0, unicidad `UNIQUE(id_marca, nombre)` y CHECKs de rango CIELAB verificados, FKs de `tonos`/`variante`→`color` intactas, 38 tablas.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.4.0_M01_colores_backend.md](./walkthroughs/M01/walkthrough_v3.4.0_M01_colores_backend.md)

---

## [v3.3.0] - 2026-09-08
### Módulo: M01 Catálogo de Productos (Backend)
- **Alcance:** Cuarta entrega del módulo M01: registro de bases (HU-CAT-12), la entidad sobre la que se preparan los colores de un producto entonable. Solo cubre el flujo 1 del diagrama oficial (registrar/editar/consultar/desactivar bases); los otros 3 flujos (asignar bases a un producto, asociar colores a bases, retirar colores al desactivar una base) quedan documentados como pendientes por depender de HU-CAT-02/HU-CAT-05, que aún no existen.
- **Hitos Clave:** Nueva tabla `base` (marca + nombre/código, sin tipo de resina — excluido a petición explícita del Product Owner). Endpoints `POST/GET/PATCH /api/catalogo/bases` (+`/desactivar`, `/reactivar`) y `GET /api/catalogo/marcas/:idMarca/bases`. Se corrigió además un hueco real encontrado en la cascada de HU-CAT-04: `MarcasService.desactivar` no tocaba bases (bases no existía cuando se implementó); ahora la desactivación de una marca cascada correctamente a líneas **y** bases.
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m01.test.ts`: 43/43 pruebas superadas. Probado end-to-end contra PostgreSQL real (crear, duplicado, cascada de desactivación de marca verificada en `base`, reactivar).
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.3.0_M01_bases_backend.md](./walkthroughs/M01/walkthrough_v3.3.0_M01_bases_backend.md)

---

## [v3.2.0] - 2026-09-08
### Módulo: M01 Catálogo de Productos (Backend)
- **Alcance:** Tercera entrega del módulo M01: gestión administrativa de marcas (HU-CAT-04), con logotipo almacenado en base de datos y desactivación en cascada hacia líneas.
- **Hitos Clave:** `marca` gana `logotipo` (BYTEA) y `logotipo_mime_type`, ambos obligatorios. Endpoints `POST/GET/PATCH /api/catalogo/marcas` (+`/desactivar`, `/reactivar`) y `GET /api/catalogo/marcas/:id/logotipo` (imagen cruda, fuera del listado JSON). El logotipo viaja como data URL base64 (sin dependencias nuevas de subida de archivos), formato jpeg/png/webp y máximo 5MB (supuesto aprobado por el Product Owner mientras no exista el "Anexo B de la Tanda 2" referenciado en la especificación).
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m01.test.ts`: 35/35 pruebas superadas. Probado end-to-end contra PostgreSQL real (crear, duplicado, logotipo servido aparte, cascada de desactivación verificada en `linea`, reactivar).
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.2.0_M01_marcas_backend.md](./walkthroughs/M01/walkthrough_v3.2.0_M01_marcas_backend.md)

---

## [v3.1.0] - 2026-09-08
### Módulo: M01 Catálogo de Productos (Backend)
- **Alcance:** Segunda entrega del módulo M01: gestión administrativa de líneas comerciales (HU-CAT-11), asociadas a una marca.
- **Hitos Clave:** Nueva tabla `marca` (mínima: nombre, estado) y endpoints `POST/GET/PATCH /api/catalogo/lineas` y `/api/catalogo/marcas/:idMarca/lineas`, protegidos por el permiso «Gestión del catálogo». `linea` ahora referencia `marca` (`id_marca`); `id_sub_subcategoria` se volvió opcional (columna remanente, no se usa en esta HU).
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m01.test.ts`: 27/27 pruebas superadas.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.1.0_M01_lineas_comerciales_backend.md](./walkthroughs/M01/walkthrough_v3.1.0_M01_lineas_comerciales_backend.md)

---

## [v3.0.0] - 2026-09-08
### Módulo: M01 Catálogo de Productos (Backend)
- **Alcance:** Primera entrega del módulo M01: gestión administrativa de categorías y subcategorías (HU-CAT-01), con baja lógica en cascada y advertencia previa de productos afectados.
- **Hitos Clave:** Nuevo módulo `backend/src/modules/m01-catalogo/` con endpoints `POST/GET/PATCH /api/catalogo/categorias` y `/api/catalogo/subcategorias`, protegidos por el permiso «Gestión del catálogo» (M17). Se agregaron las columnas `estado` y `orden` a `categoria` y `subcategorias` (BD v2.5), requisito bloqueante detectado y aprobado por el Product Owner antes de codificar (RF-CAT-01-04, CA-CAT-01-04).
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m01.test.ts`: 17/17 pruebas superadas.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.0.0_M01_categorias_subcategorias_backend.md](./walkthroughs/M01/walkthrough_v3.0.0_M01_categorias_subcategorias_backend.md)

---
## [v2.4.0] - 2026-09-15
### Módulo: Core Frontend (Layouts)
- **Alcance General:** Salto a versión **MINOR (v2.4.0)**. Se importaron los componentes globales de `feature/m04-cuentas-auth-perfil` hacia `feature/core-frontend-layouts`.
- **Hitos Clave Frontend:**
  - **Botones y Tablas:** Corrección en renderizado del `:key` en `Table.vue` y estilos del botón outline en `Button.vue`.
  - **Layouts y Modales:** Inyección de modales de autenticación y confirmación de "Cerrar sesión" en `LayoutHome.vue` y `LayoutAdmin.vue`.
  - **Enrutador Central:** Refactorización de `routes/index.ts` usando el patrón de Layouts globales, en lugar de importar explícitamente M01.
- **Estado:** ✅ Validado. Cambios sincronizados.

## [v2.3.0] - 2026-09-15
### Módulo: Core Frontend (Design System Components)
- **Alcance General:** Salto a versión **MINOR (v2.3.0)** con la estabilización, implementación y centralización de los componentes visuales core del frontend en la rama `feature/core-frontend-layouts`, unificando el diseño de botones, tarjetas, inputs, tablas y modales para que todos los módulos utilicen la misma fuente y se erradique la duplicidad de componentes.
- **Hitos Clave Frontend:**
  - **Tipografías y Tailwind:** Inyección de `Inter` (sans) y `Poppins` (title) en `tailwind.config.ts`.
  - **Componentes Base (Botones):** Refactorización completa de `Button.vue` e `IconButton.vue` para soportar las variantes oficiales (`action`, `corporate`, `outline`, etc.) y consumir la librería `lucide-vue-next` dinámicamente mediante la prop `icon`, protegiendo el `index.ts` y evitando crear archivos innecesarios.
  - **Formularios y Tarjetas (`GrupoOpciones.vue` y `Card.vue`):** Implementación del diseño interactivo de tarjeta seleccionable (check y borde activo) en `GrupoOpciones.vue` e implementación de un contenedor de tarjetas limpio en `Card.vue`.
  - **Tablas y Paginación (M17/M01):** Consolidación de `Table.vue` con soporte para diseño adaptativo (mobile-cards) y `Paginacion.vue` estándar, reemplazando las tablas dispares de los módulos.
  - **Modales y Drawers:** Verificación de `Modal.vue` con la franja de gradiente corporativa e implementación de un `Drawer.vue` lateral con transiciones.
  - **Corrección Arquitectónica:** Migración y corrección de `FooterPrincipal.vue` (removido erróneamente de `components/layout/` hacia la carpeta correcta `src/core/layouts/`).
  - 🔗 **Walkthrough Técnico Frontend Core:** [walkthrough_v2.3.0_core_design_system_frontend.md](./walkthroughs/core/walkthrough_v2.3.0_core_design_system_frontend.md)
- **Estado:** ✅ Validado. Componentes implementados estrictamente sobre `src/core/components/` sin afectar otras ramas.

## [v2.5.2] - 2026-09-23
### Módulo: M17 — Optimización de permisos y flujos en Drawer
- **Alcance:** La búsqueda inversa reutiliza permisos en caché con concurrencia limitada; se elimina el polling global que reemplazaba listados completos.
- **Hitos:** Alta y edición de empleados en Drawer, ficha compacta de cliente actualizada y rutas profundas conservadas sin cambiar la estructura del módulo.
- **Calidad:** ESLint sin advertencias, TypeScript, build y pruebas Core/M17 correctos; la prueba de integración verifica caché, invalidación por sesión y máximo de cuatro solicitudes concurrentes.
- **Walkthrough:** [Optimización de permisos y Drawers](./walkthroughs/M17/walkthrough_v2.5.2_M17_optimizacion_permisos_drawers_frontend.md).

## [v2.5.1] - 2026-09-15
### Módulo: M17 — Actualización del menú Core
- **Alcance:** Merge de `f1ce953` de Core, cuyo único archivo de código modificado es LayoutAdmin; enlaces de M17 y catálogo actualizados sin duplicar perfil ni configuración.
- **Calidad:** ESLint sin errores ni advertencias, TypeScript/build y pruebas Core/M17 correctos. Se conserva el manejo de foco móvil.
- **Walkthrough:** [Actualización del menú Core](./walkthroughs/M17/walkthrough_v2.5.1_M17_merge_menu_core_frontend.md).

## [v2.5.0] - 2026-09-15
### Módulo: M17 y controles oficiales del Core
- **Alcance:** Select, Textarea y Checkbox compartidos funcionales; Input conserva VeeValidate de M04 y admite v-model independiente. Cambios de Core autorizados expresamente por el usuario.
- **Hitos:** M17 usa controles y badges oficiales, títulos Poppins y estilos de controles Inter; se conserva la confirmación para retirar permisos dependientes.
- **Calidad:** ESLint sin errores ni advertencias, TypeScript y build correctos; nueve pruebas de Core/M17 y comprobaciones en navegador de edición, restablecimiento, bloqueo y confirmación.
- **Walkthrough:** [Controles Core y limpieza M17](./walkthroughs/M17/walkthrough_v2.5.0_M17_controles_core_frontend.md).

## [v2.4.1] - 2026-09-15
### Módulo: M17 — Sincronización con Core Frontend
- **Alcance:** Integración de los commits oficiales del Core conservando las rutas M17 bajo `/admin` y la accesibilidad del panel. Cambios compartidos y de M04 autorizados expresamente por el usuario.
- **Hitos:** Consumo directo de Badge, PageHeader, Button e IconButton; adaptación al Drawer oficial; correcciones de tipado OTP, navegación RouterLink y tokens de estado.
- **Calidad:** ESLint sin errores ni advertencias, TypeScript y build correctos, ocho pruebas M17 y comprobaciones de render SSR correctas.
- **Walkthrough:** [Sincronización con Core](./walkthroughs/M17/walkthrough_v2.4.1_M17_sincronizacion_core_frontend.md).

## [v2.4.0] - 2026-09-15
### Módulo: Core Frontend (Layouts)
- **Alcance General:** Salto a versión **MINOR (v2.4.0)**. Se importaron los componentes globales de `feature/m04-cuentas-auth-perfil` hacia `feature/core-frontend-layouts`.
- **Hitos Clave Frontend:**
  - **Botones y Tablas:** Corrección en renderizado del `:key` en `Table.vue` y estilos del botón outline en `Button.vue`.
  - **Layouts y Modales:** Inyección de modales de autenticación y confirmación de "Cerrar sesión" en `LayoutHome.vue` y `LayoutAdmin.vue`.
  - **Enrutador Central:** Refactorización de `routes/index.ts` usando el patrón de Layouts globales, en lugar de importar explícitamente M01.
- **Estado:** ✅ Validado. Cambios sincronizados.

## [v2.3.0] - 2026-09-15
### Módulo: Core Frontend (Design System Components)
- **Alcance General:** Salto a versión **MINOR (v2.3.0)** con la estabilización, implementación y centralización de los componentes visuales core del frontend en la rama `feature/core-frontend-layouts`, unificando el diseño de botones, tarjetas, inputs, tablas y modales para que todos los módulos utilicen la misma fuente y se erradique la duplicidad de componentes.
- **Hitos Clave Frontend:**
  - **Tipografías y Tailwind:** Inyección de `Inter` (sans) y `Poppins` (title) en `tailwind.config.ts`.
  - **Componentes Base (Botones):** Refactorización completa de `Button.vue` e `IconButton.vue` para soportar las variantes oficiales (`action`, `corporate`, `outline`, etc.) y consumir la librería `lucide-vue-next` dinámicamente mediante la prop `icon`, protegiendo el `index.ts` y evitando crear archivos innecesarios.
  - **Formularios y Tarjetas (`GrupoOpciones.vue` y `Card.vue`):** Implementación del diseño interactivo de tarjeta seleccionable (check y borde activo) en `GrupoOpciones.vue` e implementación de un contenedor de tarjetas limpio en `Card.vue`.
  - **Tablas y Paginación (M17/M01):** Consolidación de `Table.vue` con soporte para diseño adaptativo (mobile-cards) y `Paginacion.vue` estándar, reemplazando las tablas dispares de los módulos.
  - **Modales y Drawers:** Verificación de `Modal.vue` con la franja de gradiente corporativa e implementación de un `Drawer.vue` lateral con transiciones.
  - **Corrección Arquitectónica:** Migración y corrección de `FooterPrincipal.vue` (removido erróneamente de `components/layout/` hacia la carpeta correcta `src/core/layouts/`).
  - 🔗 **Walkthrough Técnico Frontend Core:** [walkthrough_v2.3.0_core_design_system_frontend.md](./walkthroughs/core/walkthrough_v2.3.0_core_design_system_frontend.md)
- **Estado:** ✅ Validado. Componentes implementados estrictamente sobre `src/core/components/` sin afectar otras ramas.

## [v2.2.6] - 2026-09-14
### Módulo: M17 e integración de entrega
- **Alcance:** Se retira la demostración en memoria de M17 para consumir exclusivamente la API; los datos de prueba siguen en SQL central. Se prepara la entrega Git conservando los historiales existentes.
- **Hitos:** CI con Node 22 y validación previa a despliegue/release; versión de release sincronizada con paquete, lockfile, changelog y walkthrough; guía de transición a Docker Compose y exclusión de temporales.
- **Calidad:** Instalación limpia con Node 22; lint y compilación frontend/backend correctos, ocho pruebas M17 y cuatro de releases correctas. Docker/servidor no verificados; aviso moderado preexistente de `qs` en backend documentado.
- **Walkthrough:** [Preparación de Git y despliegue](./walkthroughs/M17/walkthrough_v2.2.6_M17_preparacion_git_despliegue_frontend.md).

## [v2.2.5] - 2026-09-14
### Módulo: M17 — Adaptación móvil del panel administrativo
- **Alcance:** Menú móvil con cierre y control de foco, listados en fichas verticales, paginación adaptable y formularios ajustados a pantallas pequeñas. Cambios en core autorizados explícitamente por el usuario.
- **Calidad:** Build y TypeScript correctos, ESLint sin errores ni advertencias, ocho pruebas M17 correctas y 49 comprobaciones de tamaño entre 320 y 1440 px sin desbordamiento del contenido.
- **Walkthrough:** [Adaptación móvil de administración](./walkthroughs/M17/walkthrough_v2.2.5_M17_responsivo_movil_frontend.md).

## [v2.2.4] - 2026-09-14
### Módulo: M17 — Perfil único en administración
- **Alcance:** Se quitó la entrada duplicada «Administrador» del menú; «Mi perfil» queda como única vista y la URL anterior redirige a ella.
- **Calidad:** Compilación, ESLint, pruebas M17 y navegación local verificadas.
- **Walkthrough:** [Consolidación de Mi perfil](./walkthroughs/M17/walkthrough_v2.2.4_M17_perfil_unico_frontend.md).

## [v2.2.3] - 2026-09-14
### Módulo: M17 — Transición del drawer global
- **Alcance:** El panel lateral de clientes se desliza desde la derecha al abrirse y sale hacia la derecha al cerrarse; respeta la preferencia de movimiento reducido.
- **Calidad:** Compilación, ESLint, pruebas de M17 y apertura/cierre en navegador local verificados.
- **Walkthrough:** [Transición del drawer](./walkthroughs/M17/walkthrough_v2.2.3_M17_transicion_drawer_frontend.md).

## [v2.2.2] - 2026-09-14
### Módulo: M17 — Componentes visuales compartidos
- **Alcance:** Se completó `IconButton` en el design system global y se sustituyeron las acciones de icono duplicadas en la lista de empleados y clientes; el alta rápida del dashboard usa el botón global.
- **Calidad:** Compilación, ESLint y pruebas M17 verificadas. Sin cambios en contratos HTTP ni backend.
- **Walkthrough:** [Clasificación de componentes globales y M17](./walkthroughs/M17/walkthrough_v2.2.2_M17_componentes_globales_frontend.md).

## [v2.2.1] - 2026-09-14
### Módulo: M17 — Integración local con core y layouts
- **Alcance:** Recuperación del frontend local M17 sobre `feature/core-frontend-layouts`, con UI reutilizable en las categorías de `core/components`, rutas bajo `/admin`, estado Pinia y DTOs de módulo que reutilizan validaciones globales.
- **Calidad:** Compilación de producción y TypeScript correctos, ESLint sin advertencias, ocho pruebas correctas; alta de empleado y ficha de cliente verificadas en navegador en modo demo.
- **Entrega:** Cambios exclusivamente locales, stash original conservado y sin push.
- **Walkthrough:** [Integración de M17 con core y layouts](./walkthroughs/M17/walkthrough_v2.2.1_M17_integracion_core_layouts_frontend.md).

## [v3.35.7] - 2026-09-20
### Módulo: M01 Catálogo / Vistas Públicas (Frontend)
- **Alcance:** Simulador de cinco ambientes en el detalle de pinturas, conectado al color de la variante, con alternancia a la galería del envase y ficha más compacta.
- **Hitos:** PNG RGBA de 1024 × 1024 aislados en M01, baño actualizado, muestras del color comercial y visor limitado a 384 px de alto.
- **Calidad:** TypeScript de la aplicación y ESLint de todo src aprobados sin errores ni advertencias. Build completo y validación visual pendientes; entrega parcial del detalle.
- **Walkthrough:** [Simulador de ambientes y ficha compacta](./walkthroughs/M01/walkthrough_v3.35.7_M01_ficha_compacta_ambientes_completos_frontend.md).

---
## [v3.35.2] - 2026-09-19
### Módulo: M01 Catálogo de Productos / Vistas Públicas & Core (Frontend)
- **Avance preliminar en Detalle de Producto (`VistaDetalleProductoPublico`):** ⚠️ *Nota de alcance: La vista de detalle de producto NO está finalizada; representa un avance técnico preliminar en desarrollo.* Se implementó la restricción condicional de la calculadora de pintura (`esPintura`) para que solo aplique a pinturas y no a herramientas/taladros, se deduplicaron las muestras cromáticas por `id_color` limitándolas a 6 con botón de apertura `+N más` hacia la carta completa, y se sincronizó el color inicial mediante query parameter (`?color=...`).
- **Centralización en Zona Global (`src/core/`):** Creación del módulo utilitario oficial `src/core/utils/moneda.ts` (`formatearCOP`, `formatearPrecio`, `formatearPrecioConSufijo`), erradicando duplicaciones de `Intl.NumberFormat`. Creación del componente oficial `MuestraColor.vue` en `src/core/components/data-display/` con relieve, sombra y anillo perimetral para alto contraste. Estandarización de variantes `descuento` y `destacado` en `Badge.vue`.
- **Sincronización en Paleta de Colores y Tarjetas:** Enlace reactivo de `:muestra-color="colorSeleccionado?.muestra_hex"` en `VistaPaletaColoresPublica` hacia `TarjetaProductoPublico`, y fallback automático para pinturas con variantes coloreadas. Eliminación de color inline arbitrario `bg-[#D62828]` en favor del componente oficial `<Badge estado="descuento">`.
- **Estado de Calidad:** ESLint (0 errores, 0 advertencias), TypeScript (`vue-tsc -b`) y Vite Build 100% exitosos sin errores.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.35.2_M01_avance_detalle_producto_y_core_frontend.md](./walkthroughs/M01/walkthrough_v3.35.2_M01_avance_detalle_producto_y_core_frontend.md)

---

## [v3.35.1] - 2026-09-17
### Módulo: M01 Catálogo de Productos / Vistas Públicas (Frontend)
- **Estandarización visual de tarjetas:** Alineación de `TarjetaProductoPublico` conforme a especificaciones oficiales con esquinas redondeadas `rounded-2xl`, insignia de descuento `-15%`, precios en una línea con precio tachado, y botón de compra alineado al pie (`mt-auto`) usando tokens oficiales (`bg-conversion-hover hover:bg-conversion-accent`).
- **Filas de 5 productos:** Reorganización de las grillas a 5 columnas (`lg:grid-cols-5`) en productos destacados (Home), pinturas y herramientas (Paleta de Colores), y productos complementarios (Detalle de Producto).
- **Distribución del combinador y abanico:** Cuadrícula de 2x2 para el combinador de colores con tarjetas de altura completa, y optimización de espaciados en el abanico de colores eliminando espacios en blanco innecesarios.
- **Identidad institucional en modales:** Incorporación de la barra superior decorativa con degradado multicolor Pintu Clic en el componente `Modal.vue` del Core, y eliminación del botón circular de slider en productos destacados.
- **Estado de Calidad:** ESLint (0 errores, 0 advertencias), TypeScript (`vue-tsc -b`) y Vite Build 100% exitosos sin errores.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.35.1_M01_diseno_storefront_tarjetas_frontend.md](./walkthroughs/M01/walkthrough_v3.35.1_M01_diseno_storefront_tarjetas_frontend.md)

---

## [v3.35.0] - 2026-09-16
### Módulo: M01 Catálogo de Productos / Vistas Públicas (Frontend)
- **Integración con Core Layouts:** Unificación de todas las vistas públicas (`VistaInicioPublica`, `VistaCatalogoPublico`, `VistaDetalleProductoPublico`, `VistaPaletaColoresPublica`) bajo el layout maestro unificado `LayoutHome.vue` configurado como rutas anidadas (`children: publicStorefrontRoutes`). Las vistas administrativas de catálogo se alojan correspondientemente como hijas de `/admin` en `LayoutAdmin.vue`.
- **Erradicación de Duplicidad:** Eliminados definitivamente los componentes duplicados `EncabezadoTiendaPublica.vue` y `PieTiendaPublica.vue`, delegando navegación, cabecera y pie al Core (`LayoutHome`, `HeaderPrincipal`, `FooterPrincipal`).
- **Estandarización Tipográfica y de Componentes:** Aplicadas fuentes institucionales del Design System (`font-title` / Poppins para títulos de sección, nombres de producto y precios; `font-sans` / Inter para textos, botones e inputs). Migrados modales y botones a componentes oficiales del Core (`Modal`, `Button`, `Paginacion`).
- **Estado de Calidad:** ESLint (0 errores, 0 advertencias), TypeScript (`vue-tsc -b`) y Vite Build 100% exitosos sin errores.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.35.0_M01_integracion_core_layouts_frontend.md](./walkthroughs/M01/walkthrough_v3.35.0_M01_integracion_core_layouts_frontend.md)

---

## [v3.34.10] - 2026-09-14
### Módulo: M01 Catálogo de Productos (Frontend)
- **Corrección visual:** El panel preliminar reemplaza los selects deshabilitados por secciones compactas con buscador, checkboxes, muestras circulares y rango de precio, siguiendo el mockup del catálogo.
- **Datos provisionales:** Marcas, colores, familias y presentaciones visibles se deducen de la página pública cargada; la aplicación completa continúa pendiente de facetas M02.
- **Estado de Calidad:** ESLint, TypeScript/Vite y validación visual local superados.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.34.10_M01_corregir_diseno_filtros_frontend.md](./walkthroughs/M01/walkthrough_v3.34.10_M01_corregir_diseno_filtros_frontend.md)

---

## [v3.34.9] - 2026-09-14
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** El catálogo público presenta la estructura completa de filtros avanzados exigida por HU-BUS-02 como vista preliminar.
- **Integración pendiente:** Marca, línea, resina, color, familia cromática, presentación y precio quedan deshabilitados hasta consumir las facetas y la búsqueda paginada de M02; no se hardcodearon catálogos.
- **Estado de Calidad:** ESLint, TypeScript/Vite y verificación visual local.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.34.9_M01_filtros_catalogo_estaticos_frontend.md](./walkthroughs/M01/walkthrough_v3.34.9_M01_filtros_catalogo_estaticos_frontend.md)

---

## [v3.34.8] - 2026-09-13
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance en revisión:** La Paleta pública adopta un abanico de láminas físicas y un combinador visual compacto, conservando la selección reactiva de HU-CAT-06.
- **Integridad visual:** Seis colores por lámina, armonías 2/4/3/5 con código revelado en hover, Tailwind y tokens oficiales; las muestras cromáticas continúan proviniendo de la API.
- **Estado de Calidad:** ✅ Build TypeScript/Vite, ESLint, `git diff --check` y validación interactiva local sin errores.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.34.8_M01_abanico_laminas_fisicas_frontend.md](./walkthroughs/M01/walkthrough_v3.34.8_M01_abanico_laminas_fisicas_frontend.md)

---

## [v3.34.7] - 2026-09-13
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** Uniformidad estructural del storefront de HU-CAT-06 mediante un encabezado público compartido y un ancho máximo común para Home, Catálogo, Detalle y Paleta.
- **Hitos Clave:** Home conserva sus anclas internas; el encabezado unifica el alcance de envíos y sus estados accesibles; Paleta adopta `max-w-7xl` en todas sus secciones principales.
- **Estado de Calidad:** ✅ Build TypeScript/Vite, ESLint, `git diff --check` y comprobación visual local sin errores.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.34.7_M01_encabezado_ancho_storefront_frontend.md](./walkthroughs/M01/walkthrough_v3.34.7_M01_encabezado_ancho_storefront_frontend.md)

---

## [v3.34.6] - 2026-09-13
### Módulo: M01 Catálogo de Productos (Backend + Frontend)
- **Alcance parcial:** Avance funcional de la paleta pública de HU-CAT-06; la vista continúa en iteración visual y no se declara terminada.
- **Hitos Clave:** La API expone código, muestra cromática y familia de cada variante; la interfaz habilita filtros, abanico móvil, combinaciones interactivas y muestras en productos recomendados.
- **Estado de Calidad:** ✅ Backend TypeScript, ESLint y 123 pruebas M01; frontend TypeScript/Vite y ESLint sin errores ni advertencias.
- 🔗 **Walkthrough Backend:** [walkthroughs/M01/walkthrough_v3.34.6_M01_paleta_interactiva_backend.md](./walkthroughs/M01/walkthrough_v3.34.6_M01_paleta_interactiva_backend.md)
- 🔗 **Walkthrough Frontend:** [walkthroughs/M01/walkthrough_v3.34.6_M01_paleta_interactiva_frontend.md](./walkthroughs/M01/walkthrough_v3.34.6_M01_paleta_interactiva_frontend.md)

---

## [v3.34.5] - 2026-09-12
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** Paleta pública ajustada a la referencia visual aprobada, con ancho de contenido uniforme, hero compacto, filtros simplificados y composición de dos columnas.
- **Abanico:** Nuevo componente interactivo con láminas superpuestas, apertura lateral desde un pivote único, marca frontal y selección accesible de colores publicados.
- **Estado de Calidad:** ✅ Build TypeScript/Vite, ESLint y validación visual e interactiva local sin errores.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.34.5_M01_paleta_abanico_referencia_frontend.md](./walkthroughs/M01/walkthrough_v3.34.5_M01_paleta_abanico_referencia_frontend.md)

---

## [v3.34.4] - 2026-09-12
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** Paleta pública, menú de categorías y calculadora alineados con la UI Spec oficial mediante radios, espaciado, jerarquía y estados interactivos consistentes.
- **Accesibilidad:** Controles táctiles de al menos 44 px, focos visibles, etiquetas accesibles y estado deshabilitado explícito para la asesoría aún no disponible.
- **Estado de Calidad:** ✅ Build TypeScript/Vite, ESLint y validación visual local sin errores.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.34.4_M01_paleta_herramientas_ui_spec_frontend.md](./walkthroughs/M01/walkthrough_v3.34.4_M01_paleta_herramientas_ui_spec_frontend.md)

---

## [v3.34.3] - 2026-09-12
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** Detalle público alineado con la UI Spec oficial: superficie en tarjeta, ambiente visual, descripción colapsable, swatches, presentaciones, controles táctiles y nota de color referencial.
- **Interacción:** La selección de color mantiene la variante/precio y muestra la imagen asociada cuando la API aporta una imagen para ese color.
- **Estado de Calidad:** ✅ Build TypeScript/Vite, ESLint y validación visual local sin errores.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.34.3_M01_detalle_ui_spec_frontend.md](./walkthroughs/M01/walkthrough_v3.34.3_M01_detalle_ui_spec_frontend.md)

---

## [v3.34.2] - 2026-09-12
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** Catálogo público alineado con la UI Spec oficial: encabezado, toolbar sticky, orden, vista grid/lista, sidebar y drawer móvil, estados y sección de complementos.
- **Compatibilidad:** Se preservó la búsqueda y paginación en servidor; disponibilidad y orden visual operan únicamente sobre la página recibida, sin simular filtros que la API no soporta.
- **Estado de Calidad:** ✅ Build TypeScript/Vite, ESLint y validación visual local sin errores.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.34.2_M01_catalogo_ui_spec_frontend.md](./walkthroughs/M01/walkthrough_v3.34.2_M01_catalogo_ui_spec_frontend.md)

---

## [v3.34.1] - 2026-09-12
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** Ajuste visual del Home y la tarjeta pública de producto conforme a la UI Spec oficial v1.0.
- **Hitos Clave:** Jerarquía Poppins/Inter, precio destacado, grid 24/32 px, radios oficiales, áreas táctiles de 44 px y estados hover/active/focus consistentes.
- **Estado de Calidad:** ✅ Build TypeScript/Vite y ESLint sin errores ni advertencias.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.34.1_M01_home_ui_spec_frontend.md](./walkthroughs/M01/walkthrough_v3.34.1_M01_home_ui_spec_frontend.md)

---

## [v3.34.0] - 2026-09-12
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** Carta de colores modal integrada en la ficha pública de producto para HU-CAT-06, con búsqueda, selección, paginación visual y conservación de la presentación compatible.
- **Integridad:** La interfaz utiliza únicamente variantes públicas del producto, no expone la base al cliente y diferencia claramente las muestras ilustrativas de los datos aún ausentes en la API.
- **Estado de Calidad:** ✅ Build TypeScript/Vite, ESLint y verificación visual e interactiva en navegador local sin errores.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.34.0_M01_carta_colores_producto_frontend.md](./walkthroughs/M01/walkthrough_v3.34.0_M01_carta_colores_producto_frontend.md)

---

## [v3.33.0] - 2026-09-12
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** Vista pública `/paleta-colores` de HU-CAT-06, construida a partir de los colores y productos publicados por la API de catálogo.
- **Experiencia:** Hero, búsqueda por nombre, selector visual, combinador inspiracional, productos recomendados, complementarios, beneficios y navegación integrada con el storefront.
- **Integridad de datos:** No se inventaron códigos, muestras HEX ni familias cromáticas. Los filtros por familia quedan visibles pero deshabilitados hasta que el backend exponga la clasificación pública y la compatibilidad color–base.
- **Estado de Calidad:** ✅ Build TypeScript/Vite, ESLint y verificación visual en navegador local sin errores.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.33.0_M01_paleta_colores_publica_frontend.md](./walkthroughs/M01/walkthrough_v3.33.0_M01_paleta_colores_publica_frontend.md)

---

## [v3.32.0] - 2026-09-12
### Integración: Core Frontend + M01 Catálogo
- **Alcance:** Integración de `feature/core-frontend-layouts` en la rama de vistas públicas, incorporando layouts, componentes UI base, tipos globales y agregador único de rutas.
- **Compatibilidad:** Se conservaron las rutas públicas y administrativas de M01; `/admin` redirige al dashboard de catálogo mientras se incorporan los demás módulos.
- **Correcciones de Integración:** Se eliminó estado sin uso en `LayoutHome` y se sustituyeron colores hexadecimales inline por tokens oficiales.
- **Estado de Calidad:** ✅ Build TypeScript/Vite y ESLint sin errores ni advertencias.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.32.0_M01_integracion_core_frontend.md](./walkthroughs/M01/walkthrough_v3.32.0_M01_integracion_core_frontend.md)

---

## [v3.31.0] - 2026-09-12
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** Calculadora pública de pintura integrada en Home, catálogo y ficha de producto para HU-CAT-06.
- **Cálculo:** Valida superficie, dimensiones y cantidad con Zod; estima galones usando el rendimiento mínimo/máximo real del producto y dos manos de aplicación.
- **Experiencia:** Modal responsive de tres etapas conforme a la maqueta, con resultado, producto recomendado y dependencia de carrito claramente delimitada.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.31.0_M01_calculadora_pintura_frontend.md](./walkthroughs/M01/walkthrough_v3.31.0_M01_calculadora_pintura_frontend.md)

---

## [v3.30.0] - 2026-09-12
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** Ficha pública de producto de HU-CAT-06 con galería, descripción, variantes, precio, cantidad y productos complementarios.
- **Navegación:** Las tarjetas del Home y del catálogo abren `/productos/:productoId`; los productos no disponibles muestran el estado contractual correspondiente.
- **Estado de Calidad:** Datos obtenidos exclusivamente de los endpoints públicos de M01 y respaldo visual local mientras HU-CAT-07 no exponga imágenes.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.30.0_M01_detalle_producto_publico_frontend.md](./walkthroughs/M01/walkthrough_v3.30.0_M01_detalle_producto_publico_frontend.md)

---

## [v3.29.0] - 2026-09-12
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** Vista de catálogo público de HU-CAT-06 con búsqueda, filtro por subcategoría, paginación y navegación hacia la ficha de producto.
- **Datos:** El seed oficial habilita tres productos activos y publicados con descripción, precio y variante verificable para el storefront.
- **Estado de Calidad:** Catálogo conectado exclusivamente a los endpoints públicos de M01, sin mocks de producto en Vue.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.29.0_M01_catalogo_publico_frontend.md](./walkthroughs/M01/walkthrough_v3.29.0_M01_catalogo_publico_frontend.md)

---

## [v3.28.0] - 2026-09-12
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** Primera entrega del storefront público de HU-CAT-06: Home responsive conectado a categorías y productos públicos, con buscador y menú de categorías sin autenticación.
- **Hitos Clave:** Nueva ruta pública `/`, carga paginada bajo demanda, ficha mínima de destacados para precio e imagen, estados de carga/error y modal de categorías conforme a las maquetas compartidas.
- **Estado de Calidad:** ✅ `npm run build` y `npm run lint` sin errores; verificación visual del Home y del modal en navegador local. Integración con datos reales pendiente de disponer del backend en ejecución.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.28.0_M01_home_storefront_frontend.md](./walkthroughs/M01/walkthrough_v3.28.0_M01_home_storefront_frontend.md)

---

## [v3.27.0] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Backend)
- **Alcance:** feat(M01): integrar soporte para `id_categoria_complementaria` y `patrocinado` en la creación de productos (HU-CAT-08).
- **Hitos Clave:** Se agregó al `CrearProductoDto` y a la lógica `crear` en el `ProductosService`.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.27.0_M01_productos_complementarios_creacion_backend.md](./walkthroughs/M01/walkthrough_v3.27.0_M01_productos_complementarios_creacion_backend.md)

---

## [v3.26.0] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** feat(M01): responsive adaptado del dashboard de catalogo para telefono y tablet.
- **Hitos Clave:** Ajustes de responsive.
- **Estado de Calidad:** Validado en rama feature/m01-especificacion-catalogo.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.26.0_M01_dashboard_responsive_frontend.md](./walkthroughs/M01/walkthrough_v3.26.0_M01_dashboard_responsive_frontend.md)

---

## [v3.25.2] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** fix(M01): compactar el resumen lateral de variantes para que la tabla se vea completa.
- **Hitos Clave:** Ajustes visuales de tabla.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.25.2_M01_compactar_variantes_frontend.md](./walkthroughs/M01/walkthrough_v3.25.2_M01_compactar_variantes_frontend.md)

---

## [v3.25.1] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** fix(M01): corregir desbordamiento lateral en categorias y filtrar productos afectados al desactivar.
- **Hitos Clave:** Corrección de desbordamiento.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.25.1_M01_fix_desbordamiento_categorias_frontend.md](./walkthroughs/M01/walkthrough_v3.25.1_M01_fix_desbordamiento_categorias_frontend.md)

---

## [v3.25.0] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** feat(M01): integrar crear/editar marca y detalle de marca segun maquetas admin 13 y 14.
- **Hitos Clave:** Integración de maquetas.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.25.0_M01_marcas_frontend.md](./walkthroughs/M01/walkthrough_v3.25.0_M01_marcas_frontend.md)

---

## [v3.24.0] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** feat(M01): integrar crear/editar categoria, subcategoria y modal desactivar segun maquetas admin 10 11 12.
- **Hitos Clave:** Integración de maquetas de categorías.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.24.0_M01_categorias_frontend.md](./walkthroughs/M01/walkthrough_v3.24.0_M01_categorias_frontend.md)

---

## [v3.23.1] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** fix(M01): tabla de variantes no horizontal y acciones en menu de tres puntos.
- **Hitos Clave:** Fix UI.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.23.1_M01_fix_tabla_variantes_frontend.md](./walkthroughs/M01/walkthrough_v3.23.1_M01_fix_tabla_variantes_frontend.md)

---

## [v3.23.0] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** feat(M01): integrar crear y editar variante segun maquetas admin 07 y 08.
- **Hitos Clave:** Integración de variantes.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.23.0_M01_crear_editar_variante_frontend.md](./walkthroughs/M01/walkthrough_v3.23.0_M01_crear_editar_variante_frontend.md)

---

## [v3.22.0] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** feat(M01): integrar vista detalle administrativo del producto segun maqueta admin 05.
- **Hitos Clave:** Detalle de producto.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.22.0_M01_detalle_producto_frontend.md](./walkthroughs/M01/walkthrough_v3.22.0_M01_detalle_producto_frontend.md)

---

## [v3.21.1] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** fix(M01): fijar el menu de acciones al hacer scroll.
- **Hitos Clave:** Fix UI.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.21.1_M01_fix_menu_acciones_frontend.md](./walkthroughs/M01/walkthrough_v3.21.1_M01_fix_menu_acciones_frontend.md)

---

## [v3.21.0] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** feat(M01): integrar vista editar producto y menu de acciones segun maqueta admin 04.
- **Hitos Clave:** Edición de producto.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.21.0_M01_editar_producto_frontend.md](./walkthroughs/M01/walkthrough_v3.21.0_M01_editar_producto_frontend.md)

---

## [v3.20.0] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** feat(M01): montar vue-router e integrar el panel de catalogo en la app.
- **Hitos Clave:** Enrutamiento vue-router.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.20.0_M01_vue_router_frontend.md](./walkthroughs/M01/walkthrough_v3.20.0_M01_vue_router_frontend.md)

---

## [v3.19.2] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** feat(M01): agregar ilustraciones de producto y logos de marca del catalogo.
- **Hitos Clave:** Ilustraciones agregadas.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.19.2_M01_ilustraciones_logos_frontend.md](./walkthroughs/M01/walkthrough_v3.19.2_M01_ilustraciones_logos_frontend.md)

---

## [v3.19.1] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** refactor(M01): fijar la barra lateral del panel al hacer scroll.
- **Hitos Clave:** Refactor UI.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.19.1_M01_fijar_barra_lateral_frontend.md](./walkthroughs/M01/walkthrough_v3.19.1_M01_fijar_barra_lateral_frontend.md)

---

## [v3.19.0] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** refactor(M01): carga transparente en las 8 vistas del panel de catalogo.
- **Hitos Clave:** Refactor UI de carga.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.19.0_M01_carga_transparente_frontend.md](./walkthroughs/M01/walkthrough_v3.19.0_M01_carga_transparente_frontend.md)

---

## [v3.18.0] - 2026-09-09
### Módulo: M02 Búsqueda y navegación (Backend)
- **Alcance:** Sexta entrega del módulo M02: facetas del catálogo (HU-BUS-02, RF-BUS-02-02). Cierra el último requisito funcional pendiente del módulo: ofrecer en cada filtro únicamente los valores que producen resultados, con su conteo. Sin cambios de esquema.
- **Hitos Clave:** Nuevo endpoint **público** `GET /api/busqueda/facetas` que acepta los mismos parámetros que la búsqueda (término + filtros) y devuelve, por dimensión (`categorias`, `subcategorias`, `marcas`, `lineas`, `resinas`, `colores`, `presentaciones`), los valores disponibles con su número de productos. Conteo **conjuntivo** (aplica todos los filtros vigentes) mediante agregaciones `GROUP BY` con `COUNT(DISTINCT producto)` sobre la misma base filtrada de la búsqueda; solo aparecen valores con `cantidad ≥ 1` (RF-BUS-02-02). Ordenadas por frecuencia desc con desempate por nombre. Se refactorizó el armado de filtros del controlador a un helper compartido por `buscar` y `facetas`.
- **Diferido:** (1) **conteo disyuntivo** (que una dimensión no se cuente a sí misma, estándar de e-commerce): hoy es conjuntivo; ampliar si se requiere. (2) **Faceta de color solo cuenta preparados** (variante con ese color); los entonables (carta de la marca) quedan fuera del conteo. (3) **Familia cromática:** sigue diferida (sin dato, HU-CAT-05).
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m02.test.ts`: 26/26 pruebas superadas (+1 de facetas). ✅ **Validado contra PostgreSQL real** (`pintuclic-db`): las agregaciones de marca, presentación (vía variante) y subcategoría ejecutan sin errores y cuentan productos distintos correctamente (p. ej. Pintuco 2 / Interpinturas 1). Con esto, **M02 backend cubre todas sus HU funcionales** (HU-BUS-01/02/03/05/06; HU-BUS-04 descartada por el spec).
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M02/walkthrough_v3.18.0_M02_facetas_backend.md](./walkthroughs/M02/walkthrough_v3.18.0_M02_facetas_backend.md)

---

## [v3.17.0] - 2026-09-09
### Módulo: M02 Búsqueda y navegación (Backend)
- **Alcance:** Quinta entrega del módulo M02: registro de búsquedas sin resultado (HU-BUS-06). Completa las HU funcionales del módulo. Registra de forma **anónima** los términos que no arrojan resultados (M20 / CA-BUS-06-02) y expone un listado **solo para administradores** con el permiso «Consultar estadísticas» (M17 / CA-BUS-06-03).
- **Hitos Clave:** **BD v3.7:** nueva tabla **`busqueda_sin_resultado`** (`id_busqueda`, `termino`, `fecha`), modelo por evento (sin identidad de usuario) con índices por `fecha` y `termino`. Nuevo permiso M17 **`estadisticas.consultar`** (id 20) asignado al rol administrador. El endpoint público `GET /api/busqueda/productos` ahora **registra** el término (normalizado a minúsculas) cuando una búsqueda con texto da 0 resultados, aislado en `try/catch` para no afectar a la búsqueda (RF-BUS-01-06). Nuevo endpoint **protegido** `GET /api/busqueda/estadisticas/sin-resultado?periodo=diario|semanal|mensual|anual` (default `mensual`) que agrega por término y ordena por frecuencia (RF-BUS-06-02 / CA-BUS-06-01), sin exponer identidad.
- **Nota de arquitectura:** el registro en runtime es un insert operacional (analítica), no auto-siembra de catálogo; no incumple la política de seed centralizado (regla #10). Toques globales autorizados por el PO: `bd/sql/schema_pintuclic.sql` (tabla), `backend/src/core/db/types.ts` (tipos) y `bd/sql/seed_pintuclic.sql` (permiso + asignación).
- **Diferido:** retención por periodo configurable (RF-BUS-06-01: purga de eventos antiguos) — pendiente de un job/config; hoy se conservan todos los eventos.
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m02.test.ts`: 25/25 pruebas superadas (+4 de HU-BUS-06). ✅ **Validado contra PostgreSQL real** (`pintuclic-db`): tabla e índices creados, permiso 20 asignado al rol administrador, y la agregación por frecuencia verificada (un término repetido aparece una sola vez con su conteo; CA-BUS-06-01). Datos de prueba eliminados tras la validación. ℹ️ `npm run db:reset` no se ejecutó por un desajuste de conexión preexistente del `setup.ts` (usuario/host); los objetos se aplicaron directamente al contenedor.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M02/walkthrough_v3.17.0_M02_busquedas_sin_resultado_backend.md](./walkthroughs/M02/walkthrough_v3.17.0_M02_busquedas_sin_resultado_backend.md)

---

## [v3.16.0] - 2026-09-09
### Módulo: M02 Búsqueda y navegación (Backend)
- **Alcance:** Cuarta entrega del módulo M02: paginación de resultados (HU-BUS-05). Buena parte ya estaba cubierta por la paginación introducida en HU-BUS-01 (entrega por páginas con `limite`/`offset`, `total`, `pagina` y conservación de filtros/orden por ser un endpoint sin estado). Esta versión **consolida el hueco real**: los metadatos de **páginas numeradas** (RF-BUS-05-02). Sin cambios de esquema.
- **Hitos Clave:** La respuesta de `GET /api/busqueda/productos` incorpora `total_paginas` (= `ceil(total/limite)`) junto a `total`, `pagina` y `limite`, habilitando la navegación por páginas numeradas. Una página que excede el total responde **sin error** con `items` vacío y los metadatos correctos (CA-BUS-05-04). El orden determinista (desempate estable por nombre, HU-BUS-03) garantiza que no haya reordenamiento dinámico entre páginas (RF-BUS-05-02).
- **Estado ya cubierto por HU previas:** RF-BUS-05-01 (entrega por páginas del tamaño configurado sin cargar todo; `total` y `pagina`) y CA-BUS-05-01/02 (primera página acotada; avanzar conservando filtros y orden) provienen de HU-BUS-01/02/03. RNF-BUS-05-01 (móvil/tableta/escritorio sin scroll horizontal) y CA-BUS-05-03 son responsabilidad del frontend.
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m02.test.ts`: 21/21 pruebas superadas (+3 de paginación: `total_paginas`, sin resultados y página fuera de rango). ℹ️ Sin SQL nuevo; el cálculo de páginas se valida en el suite en memoria.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M02/walkthrough_v3.16.0_M02_paginacion_backend.md](./walkthroughs/M02/walkthrough_v3.16.0_M02_paginacion_backend.md)

---

## [v3.15.0] - 2026-09-09
### Módulo: M02 Búsqueda y navegación (Backend)
- **Alcance:** Tercera entrega del módulo M02: ordenamiento de resultados (HU-BUS-03). Se **extiende el mismo endpoint** `GET /api/busqueda/productos` con el parámetro `orden`, combinable con término y filtros y conservado en la paginación (CA-BUS-03-01). Sin cambios de esquema.
- **Hitos Clave:** Nuevo parámetro `orden` con valores `relevancia` (por defecto), `precio_asc`, `precio_desc` y `novedad` (RF-BUS-03-01). La **relevancia se pondera** nombre>marca>línea>color>descripción (pesos 5/4/3/2/1) con un bonus por coincidencia exacta del nombre para priorizar el exacto sobre el aproximado (RF-BUS-03-02). Todos los criterios cierran con **desempate estable por nombre asc**, de modo que consultas idénticas mantienen el orden entre páginas (RF-BUS-03-03 / CA-BUS-03-03). El precio del producto para ordenar es el mínimo de sus variantes activas. Los productos sin coincidencia (relevancia 0) no se elevan por patrocinio (CA-BUS-03-04, ya garantizado desde HU-BUS-01).
- **Diferido:** (1) **precio final tras descuentos + IVA** y **precio por condiciones de empresa** en el orden por precio (CA-BUS-03-05): dependen de M06 (inexistente); el orden opera sobre `variante.precio_vigente` (precio base). (2) **Novedad sin fecha:** `producto` no tiene columna de fecha de alta; se usa `id_producto` (serial) como proxy de novedad hasta que el esquema incorpore una fecha. (3) **Default "configurable"** (RF-BUS-03-01): fijo en `relevancia` hasta que exista un módulo de configuración.
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m02.test.ts`: 18/18 pruebas superadas (+3 de ordenamiento: default, propagación del criterio y validación del enum). ✅ **Validado contra PostgreSQL real** (`pintuclic-db`): la relevancia ponderada y el subquery de precio mínimo ejecutan sin errores y ordenan correctamente (p. ej. `vinil` → *Viniltex* con relevancia 6.667 encabezando).
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M02/walkthrough_v3.15.0_M02_ordenamiento_backend.md](./walkthroughs/M02/walkthrough_v3.15.0_M02_ordenamiento_backend.md)

---

## [v3.14.0] - 2026-09-09
### Módulo: M02 Búsqueda y navegación (Backend)
- **Alcance:** Segunda entrega del módulo M02: filtros del catálogo (HU-BUS-02). Se **extiende el mismo endpoint** `GET /api/busqueda/productos` para aceptar filtros simultáneos y multivalor (RF-BUS-02-01), combinables con el término de búsqueda y conservados en la paginación (CA-BUS-02-05). Sin cambios de esquema.
- **Hitos Clave:** Nuevos parámetros de query `categoria`, `subcategoria`, `marca`, `linea`, `resina`, `color`, `presentacion` (multivalor: `?marca=1&marca=2` o `?marca=1,2`) y `precio_min`/`precio_max`. Cada filtro es un OR interno (`in`) y entre filtros distintos es AND; todos se resuelven con `EXISTS` sobre `producto` para devolver **productos, no variantes** (RF-BUS-02-03). El filtro de color incluye **preparados y entonables** (CA-BUS-02-08). El rango de precio inválido (mínimo > máximo) se rechaza como error de validación 400 (CA-BUS-02-06). Los filtros se aplican por igual a productos patrocinados (CA-BUS-02-09, sin tratamiento especial).
- **Diferido:** (1) **familia cromática** (RF-BUS-02-01): las familias se difirieron en M01/HU-CAT-05, no hay dato que filtrar. (2) **Precio final tras descuentos + IVA** y **precio por condiciones de empresa** (RF-BUS-02-04 / CA-BUS-02-07): dependen de M06 (inexistente); el rango opera de momento sobre `variante.precio_vigente` (precio base). (3) **Facetas** (RF-BUS-02-02: "ofrecer solo los valores que producen resultados"): endpoint de valores disponibles pendiente; el backend ya acepta que el frontend agregue/quite filtros y responde `total=0` cuando no hay coincidencias.
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m02.test.ts`: 14/14 pruebas superadas (término, paginación, propagación de filtros, parseo multivalor y validación del rango de precio). ✅ **Validado contra PostgreSQL real** (`pintuclic-db`, extensiones `unaccent`/`pg_trgm` activas): el predicado completo y las ramas `EXISTS` de filtros (precio, color preparado/entonable, presentación) ejecutan sin errores contra el esquema real. Nota: los 3 productos del seed están `publicado=f`, por lo que el endpoint público responde vacío hasta que se publique algún producto (HU-CAT-02).
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M02/walkthrough_v3.14.0_M02_filtros_backend.md](./walkthroughs/M02/walkthrough_v3.14.0_M02_filtros_backend.md)

---

## [v3.13.0] - 2026-09-09
### Módulo: M02 Búsqueda y navegación (Backend)
- **Alcance:** Primera entrega del módulo M02: búsqueda de productos por texto libre (HU-BUS-01). Primer endpoint del módulo, **público (sin autenticación)** y resuelto en servidor (RF-BUS-01-02 / CA-BUS-01-04). Búsqueda tolerante a errores tipográficos e insensible a mayúsculas y acentos (RF-BUS-01-03).
- **Hitos Clave:** Nuevo endpoint público `GET /api/busqueda/productos?q=&pagina=&limite=`. Busca sobre **nombre, descripción, marca, línea y color** del producto usando `unaccent` + `pg_trgm` (`word_similarity`, umbral 0.3). En color incluye tanto los **preparados** (variante con ese color) como los **entonables** (producto entonable cuyo color existe en la carta de su marca), cumpliendo RF-BUS-01-05. Cada producto aparece **una sola vez** vía subconsultas `EXISTS` (sin joins que multipliquen filas), excluye inactivos/no publicados (RF-BUS-01-04) y con término vacío devuelve el catálogo completo (RF-BUS-01-01). Resultados paginados con `total/pagina/limite` (base para HU-BUS-05) y ordenados por relevancia de nombre con desempate estable alfabético.
- **Prerrequisito de BD (global):** habilitar las extensiones `unaccent` y `pg_trgm` en PostgreSQL (`CREATE EXTENSION IF NOT EXISTS ...`). No se modificó `bd/sql/schema_pintuclic.sql` (archivo del equipo de BD); su inclusión durable en el esquema queda pendiente de coordinación con ese equipo.
- **Diferido:** filtros (HU-BUS-02), ordenamiento configurable por precio/novedad y relevancia ponderada completa (HU-BUS-03), metadatos de paginación numerada (HU-BUS-05) y registro de búsquedas sin resultado (HU-BUS-06). El precio real tras descuentos (M06) no aplica a esta HU.
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m02.test.ts`: 8/8 pruebas superadas (normalización del término y paginación con repositorio en memoria). ✅ **Validado contra PostgreSQL real** (`pintuclic-db`, extensiones `unaccent`/`pg_trgm` activas): `unaccent` resuelve acentos (`maxima`↔"Máxima") y `word_similarity` la tolerancia a typos (`vinil`→"Viniltex" 0.833 ≥ 0.3). Nota: los 3 productos del seed están `publicado=f`, por lo que el endpoint público responde vacío hasta que se publique algún producto (HU-CAT-02).
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M02/walkthrough_v3.13.0_M02_busqueda_backend.md](./walkthroughs/M02/walkthrough_v3.13.0_M02_busqueda_backend.md)

---

## [v3.12.1] - 2026-09-11
### Módulo: M01 Catálogo de Productos (Frontend)
- **Alcance:** feat(M01): montar panel de catalogo frontend con las 8 vistas admin.
- **Hitos Clave:** Montaje de panel frontend.
- **Estado de Calidad:** Validado.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.12.1_M01_montar_panel_frontend.md](./walkthroughs/M01/walkthrough_v3.12.1_M01_montar_panel_frontend.md)

---

## [v3.12.0] - 2026-09-09
### Módulo: M01 Catálogo de Productos (Backend)
- **Alcance:** Decimotercera entrega del módulo M01: productos complementarios (HU-CAT-08). Cada producto puede declarar la categoría de la que se extraen sus complementarios, y los productos pueden marcarse como patrocinados para priorizarlos.
- **Hitos Clave:** BD v3.6: `producto` gana `id_categoria_complementaria` (FK categoría, `ON DELETE SET NULL`, RF-CAT-08-01) y `patrocinado` (BOOLEAN, RF-CAT-08-02). Nuevo endpoint **público** `GET /api/catalogo/publico/productos/:id/complementarios` que devuelve hasta 4 productos activos+publicados de la categoría configurada, **patrocinados primero**, con **fallback a patrocinados** si no hay categoría o no arroja resultados, excluyendo el propio producto (CA-CAT-08-04). La configuración (`id_categoria_complementaria`, `patrocinado`) se administra vía el update de producto, validando que la categoría exista.
- **Diferido:** configuración de complementarios a nivel categoría (la spec permite "producto o categoría"; se implementó a nivel producto), exclusión de combos agotados (RF-CAT-08-03, depende de combos/stock — CAT-13/M05-M08) y CA-CAT-08-05 (no sugerir en el carrito → M05).
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m01.test.ts`: 123/123 pruebas superadas. ✅ Validado contra PostgreSQL real (reset de esquema + seed en `pintuclic-db`): columnas y FK de complementarios verificadas; 43 tablas.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.12.0_M01_complementarios_backend.md](./walkthroughs/M01/walkthrough_v3.12.0_M01_complementarios_backend.md)

---

## [v3.11.0] - 2026-09-09
### Módulo: M01 Catálogo de Productos (Backend)
- **Alcance:** Duodécima entrega del módulo M01: consulta pública del catálogo (HU-CAT-06). Primeros endpoints **públicos (sin autenticación)** del módulo, que exponen únicamente elementos activos y publicados (RF-CAT-06-01, RF-CAT-09-02). Sin cambios de esquema.
- **Hitos Clave:** Nuevos endpoints públicos `GET /api/catalogo/publico/categorias` (categorías/subcategorías con productos activos+publicados — RF-CAT-06-02, CA-CAT-06-04), `GET /api/catalogo/publico/productos?subcategoria=&q=&pagina=&limite=` (listado paginado — RNF-CAT-06-01, CA-CAT-06-05) y `GET /api/catalogo/publico/productos/:id` (ficha con variantes activas —presentación, color/base, precio, existencia—, imágenes y rendimiento; 404 "no disponible" si el producto no está activo+publicado — CA-CAT-06-02/03). Consultas de solo lectura con joins y `EXISTS`.
- **Diferido:** RF-CAT-06-03 (carta navegable por familia cromática — familias diferidas en HU-CAT-05) y RF-CAT-06-04 (solo colores preparables sobre una base activa — depende de color↔base, HU-CAT-12 flujo 3, pendiente de RF-CAT-12-12).
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m01.test.ts`: 118/118 pruebas superadas. ✅ Consultas SQL validadas contra el esquema real de `pintuclic-db` (categorías con productos, listado paginado y variantes con joins). Sin cambios de esquema (43 tablas).
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.11.0_M01_consulta_publica_backend.md](./walkthroughs/M01/walkthrough_v3.11.0_M01_consulta_publica_backend.md)

---

## [v3.10.0] - 2026-09-09
### Módulo: M01 Catálogo de Productos (Backend)
- **Alcance:** Undécima entrega del módulo M01: estado y ciclo de vida del catálogo (HU-CAT-09). Buena parte de la HU ya estaba cubierta de forma transversal por las entregas previas; esta versión **consolida los huecos reales**: (1) cierra la cascada de desactivación marca→productos (posible ahora que `producto.id_marca` existe desde HU-CAT-02) y (2) agrega el aviso previo de impacto en cascada (RF-CAT-09-03) para marca y producto. **Sin cambios de esquema.**
- **Hitos Clave:** `MarcasService.desactivar` ahora también desactiva los productos de la marca (RF-CAT-04-03, antes era un hueco). Nuevos endpoints de solo lectura `GET /api/catalogo/marcas/:id/impacto-desactivacion` (líneas, bases, colores y productos activos afectados) y `GET /api/catalogo/productos/:id/impacto-desactivacion` (variantes activas e imágenes afectadas). Métodos de conteo (`contarActivasPorMarca` / `contarActivosPorMarca`, `contarImagenes`) en los repositorios.
- **Estado ya cubierto por HU previas:** RF-CAT-09-01 (sin borrado físico de referenciados: no hay endpoints DELETE de catálogo salvo `imagen`), RF-CAT-09-04/05/06 (reactivación verificando dependencias activas, incluida la variante entonable con base inactiva y la variante de brocha sin comprobación de base/color). RF-CAT-09-02 (exclusión del catálogo público) se aplicará en HU-CAT-06.
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m01.test.ts`: 113/113 pruebas superadas. ℹ️ Sin cambios de esquema (43 tablas); la lógica de cascada e impacto se valida en el suite en memoria.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.10.0_M01_ciclo_vida_backend.md](./walkthroughs/M01/walkthrough_v3.10.0_M01_ciclo_vida_backend.md)

---

## [v3.9.0] - 2026-09-09
### Módulo: M01 Catálogo de Productos (Backend)
- **Alcance:** Décima entrega del módulo M01: imágenes del producto (HU-CAT-07). Cargar, reemplazar, eliminar y ordenar imágenes (RF-CAT-07-01), asociarlas a una variante o color del propio producto (RF-CAT-07-02) y mantener una sola imagen principal por producto (CA-CAT-07-02). Almacenamiento en la propia infraestructura como BYTEA (RF-CAT-07-03). Con esto, el `publicar` de HU-CAT-02 ya puede exigir imagen.
- **Hitos Clave:** BD v3.5: nueva tabla **`imagen`** (`id_producto` FK, `id_variante`/`id_color` opcionales, `datos` BYTEA, `mime_type`, `orden`, `es_principal`) con **índice único parcial** de una principal por producto. Endpoints `POST/GET /api/catalogo/productos/:idProducto/imagenes`, `GET /api/catalogo/imagenes/:id/contenido` (binario con `Cache-Control`), `PATCH/DELETE /api/catalogo/imagenes/:id`. La imagen viaja como data URL base64 (jpeg/png/webp ≤5MB, mismo validador que el logotipo de marca; sin dependencias nuevas).
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m01.test.ts`: 110/110 pruebas superadas. ✅ Validado contra PostgreSQL real (reset de esquema + seed en `pintuclic-db`): tabla `imagen`, FKs e índice único parcial de principal verificados; 43 tablas.
- **Pendiente (RNF-CAT-07-01):** generación de miniaturas optimizadas — se sirve el binario con caché; las miniaturas requieren una librería de imágenes y quedan documentadas como pendientes.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.9.0_M01_imagenes_backend.md](./walkthroughs/M01/walkthrough_v3.9.0_M01_imagenes_backend.md)

---

## [v3.8.0] - 2026-09-09
### Módulo: M01 Catálogo de Productos (Backend)
- **Alcance:** Novena entrega del módulo M01: se completa el **flujo 2 de HU-CAT-12** — declarar qué bases ofrece cada producto entonable (RF-CAT-12-02/03). Cierra un pendiente conocido de la v2.6.0. El flujo 3 (asociación color↔base) sigue diferido por depender de la decisión de negocio RF-CAT-12-12.
- **Hitos Clave:** BD v3.4: nueva tabla join **`producto_base`** (`id_producto`, `id_base`). Endpoints `GET/POST/DELETE /api/catalogo/productos/:idProducto/bases`. Reglas: solo productos entonables pueden ofrecer bases (RF-CAT-12-02); la base debe ser de la marca del producto y estar activa (RF-CAT-12-03); no se puede quitar una base usada por una variante. **Acoplamiento con HU-CAT-03:** una variante entonable ahora exige que su base esté declarada en `producto_base` (además de pertenecer a la marca).
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m01.test.ts`: 102/102 pruebas superadas. ✅ Validado contra PostgreSQL real (reset de esquema + seed en `pintuclic-db`): tabla `producto_base` con PK compuesta y FKs verificadas; 42 tablas.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.8.0_M01_producto_base_backend.md](./walkthroughs/M01/walkthrough_v3.8.0_M01_producto_base_backend.md)

---

## [v3.7.0] - 2026-09-09
### Módulo: M01 Catálogo de Productos (Backend)
- **Alcance:** Octava entrega del módulo M01: rendimiento del producto (HU-CAT-10). **Alcance aprobado por el PO: solo rendimiento**, sin catálogo genérico de atributos técnicos (RF-CAT-10-01 diferido). El rendimiento se captura en m² por galón (mínimo y máximo) y se deriva por presentación a partir del volumen, sin capturarlo una por una.
- **Hitos Clave:** BD v3.3: `producto` gana `rendimiento_min` / `rendimiento_max` (NUMERIC, opcionales) con CHECK que exige ambos o ninguno, `> 0` y `min ≤ max` (RF-CAT-10-02/05). Endpoints `GET/PATCH /api/catalogo/productos/:idProducto/rendimiento`: el GET devuelve el rendimiento por galón y su **derivación por presentación activa** (RF-CAT-10-03, `valor × volumen / galón`). El rendimiento se incluye además en la ficha del producto. Sin tablas nuevas.
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m01.test.ts`: 94/94 pruebas superadas. ✅ Validado contra PostgreSQL real (reset de esquema + seed en `pintuclic-db`): columnas y CHECK de rendimiento verificados con datos semilla (Viniltex 40–45, Esmalte 15–20); 41 tablas.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.7.0_M01_rendimiento_backend.md](./walkthroughs/M01/walkthrough_v3.7.0_M01_rendimiento_backend.md)

---

## [v3.6.0] - 2026-09-09
### Módulo: M01 Catálogo de Productos (Backend)
- **Alcance:** Séptima entrega del módulo M01: gestión de variantes (HU-CAT-03) y de presentaciones como entidad propia. La variante es el SKU vendible con precio y existencia referencial; su forma depende de la clase del producto (entonable→base, colores_fijos→color, sin_color→ninguno). Con esto queda operativo el `publicar` real de HU-CAT-02 (ya validaba variante activa). La actualización de precio/color en la ficha pública (RF-CAT-03-07) es de frontend.
- **Hitos Clave:** BD v3.2: nueva tabla **`presentacion`** (nombre + volumen numérico, RF-CAT-03-05) y `variante` enriquecida (`+id_presentacion` obligatoria, `+id_base`, `+existencia_referencial` con CHECK ≥ 0, `+codigo_proveedor` único, y unicidad de forma `UNIQUE NULLS NOT DISTINCT (id_producto, id_base, id_color, id_presentacion)`). Endpoints `POST/GET/PATCH /api/catalogo/variantes` (+`/desactivar`, `/reactivar`), `GET /api/catalogo/productos/:idProducto/variantes`, y `POST/GET/PATCH /api/catalogo/presentaciones` (+estado). Reglas: forma por clase (RF-CAT-03-02); sin variantes idénticas (RF-CAT-03-03); base/color deben ser de la marca del producto y estar activos; existencia no negativa (RF-CAT-03-04); código de proveedor único (RF-CAT-03-06); sin borrado físico, solo desactivación (RF-CAT-03-01); reactivación condicionada a dependencias activas (RF-CAT-09-04/05).
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m01.test.ts`: 86/86 pruebas superadas. ✅ Validado contra PostgreSQL real (reset de esquema + seed en `pintuclic-db`): estructura de `variante` v3.2 (`uq_variante_forma NULLS NOT DISTINCT`, `uq_variante_codigo_proveedor`, CHECKs de precio/existencia, FKs a base/color/presentación), tabla `presentacion` y datos semilla verificados; 41 tablas.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.6.0_M01_variantes_backend.md](./walkthroughs/M01/walkthrough_v3.6.0_M01_variantes_backend.md)

---

## [v3.5.0] - 2026-09-09
### Módulo: M01 Catálogo de Productos (Backend)
- **Alcance:** Sexta entrega del módulo M01: gestión de productos (HU-CAT-02), con la información común independiente de las variantes, clase de color, catálogo administrable de tipos de resina y relación N:M con subcategorías. La publicación (RF-CAT-02-05) se implementa de forma parcial (valida ≥1 variante activa; la exigencia de imagen queda diferida a HU-CAT-07). Variantes en sí (HU-CAT-03) quedan fuera de esta entrega.
- **Hitos Clave:** BD v3.1: nuevo `enum_clase_color` (`entonable | colores_fijos | sin_color`), nuevas tablas **`tipo_resina`** (catálogo administrable, RF-CAT-02-04) y **`producto_subcategoria`** (N:M, RF-CAT-02-02), y `producto` enriquecido (`id_marca` obligatoria, `id_linea`/`id_tipo_resina` opcionales, `clase_color`, `descripcion`, `estado`, `publicado`). Endpoints `POST/GET/PATCH /api/catalogo/productos` (+`/publicar`, `/despublicar`, `/desactivar`, `/reactivar`) con búsqueda `?q=&marca=`, y `POST/GET/PATCH /api/catalogo/tipos-resina` (+estado). Reglas: marca obligatoria y existente; ≥1 subcategoría; una pintura (clase ≠ `sin_color`) exige línea + resina y la línea debe ser de la marca del producto; la clase no puede cambiarse si el producto ya tiene variantes (RF-CAT-02-03, verificado contra `variante`).
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m01.test.ts`: 72/72 pruebas superadas. ✅ Validado contra PostgreSQL real (reset de esquema + seed en `pintuclic-db`): estructura de `producto` v3.1, `tipo_resina` y `producto_subcategoria`, FKs y datos semilla verificados; 40 tablas.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.5.0_M01_productos_backend.md](./walkthroughs/M01/walkthrough_v3.5.0_M01_productos_backend.md)

---

## [v3.4.0] - 2026-09-08
### Módulo: M01 Catálogo de Productos (Backend)
- **Alcance:** Quinta entrega del módulo M01: gestión administrativa de colores (HU-CAT-05), cada color asociado a la marca que efectivamente lo ofrece y con su valor cromático CIELAB obligatorio. **Alcance aprobado por el PO: sin familias cromáticas** (RF-CAT-05-03 diferido). El uso del color en carta/variantes (RF-CAT-05-04/05/06) y la asociación color↔base (RF-CAT-12-04, flujo 3 de CAT-12) quedan diferidos por depender de HU-CAT-02/03 y de la decisión de negocio RF-CAT-12-12.
- **Hitos Clave:** Tabla `color` enriquecida (BD v3.0): ahora `id_marca` (FK marca, obligatoria), `codigo` (opcional), `cie_l/cie_a/cie_b` (CIELAB obligatorio con CHECK de rango), `estado`, y unicidad `UNIQUE(id_marca, nombre)` en lugar de nombre global. La muestra visual se **deriva del CIELAB** (`muestra_hex` sRGB) sin requerir imagen (RF-CAT-05-02). Endpoints `POST/GET/PATCH /api/catalogo/colores` (+`/desactivar`, `/reactivar`) y `GET /api/catalogo/marcas/:idMarca/colores?q=` (búsqueda por nombre/código, RF-CAT-05-01/CA-CAT-05-05). Se extendió la cascada de HU-CAT-04: desactivar una marca ahora desactiva también sus colores (RF-CAT-04-03).
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m01.test.ts`: 57/57 pruebas superadas. ✅ Validado contra PostgreSQL real (reset de esquema + seed aplicados en el contenedor `pintuclic-db`): estructura de `color` v3.0, unicidad `UNIQUE(id_marca, nombre)` y CHECKs de rango CIELAB verificados, FKs de `tonos`/`variante`→`color` intactas, 38 tablas.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.4.0_M01_colores_backend.md](./walkthroughs/M01/walkthrough_v3.4.0_M01_colores_backend.md)

---

## [v3.3.0] - 2026-09-08
### Módulo: M01 Catálogo de Productos (Backend)
- **Alcance:** Cuarta entrega del módulo M01: registro de bases (HU-CAT-12), la entidad sobre la que se preparan los colores de un producto entonable. Solo cubre el flujo 1 del diagrama oficial (registrar/editar/consultar/desactivar bases); los otros 3 flujos (asignar bases a un producto, asociar colores a bases, retirar colores al desactivar una base) quedan documentados como pendientes por depender de HU-CAT-02/HU-CAT-05, que aún no existen.
- **Hitos Clave:** Nueva tabla `base` (marca + nombre/código, sin tipo de resina — excluido a petición explícita del Product Owner). Endpoints `POST/GET/PATCH /api/catalogo/bases` (+`/desactivar`, `/reactivar`) y `GET /api/catalogo/marcas/:idMarca/bases`. Se corrigió además un hueco real encontrado en la cascada de HU-CAT-04: `MarcasService.desactivar` no tocaba bases (bases no existía cuando se implementó); ahora la desactivación de una marca cascada correctamente a líneas **y** bases.
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m01.test.ts`: 43/43 pruebas superadas. Probado end-to-end contra PostgreSQL real (crear, duplicado, cascada de desactivación de marca verificada en `base`, reactivar).
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.3.0_M01_bases_backend.md](./walkthroughs/M01/walkthrough_v3.3.0_M01_bases_backend.md)

---

## [v3.2.0] - 2026-09-08
### Módulo: M01 Catálogo de Productos (Backend)
- **Alcance:** Tercera entrega del módulo M01: gestión administrativa de marcas (HU-CAT-04), con logotipo almacenado en base de datos y desactivación en cascada hacia líneas.
- **Hitos Clave:** `marca` gana `logotipo` (BYTEA) y `logotipo_mime_type`, ambos obligatorios. Endpoints `POST/GET/PATCH /api/catalogo/marcas` (+`/desactivar`, `/reactivar`) y `GET /api/catalogo/marcas/:id/logotipo` (imagen cruda, fuera del listado JSON). El logotipo viaja como data URL base64 (sin dependencias nuevas de subida de archivos), formato jpeg/png/webp y máximo 5MB (supuesto aprobado por el Product Owner mientras no exista el "Anexo B de la Tanda 2" referenciado en la especificación).
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m01.test.ts`: 35/35 pruebas superadas. Probado end-to-end contra PostgreSQL real (crear, duplicado, logotipo servido aparte, cascada de desactivación verificada en `linea`, reactivar).
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.2.0_M01_marcas_backend.md](./walkthroughs/M01/walkthrough_v3.2.0_M01_marcas_backend.md)

---

## [v3.1.0] - 2026-09-08
### Módulo: M01 Catálogo de Productos (Backend)
- **Alcance:** Segunda entrega del módulo M01: gestión administrativa de líneas comerciales (HU-CAT-11), asociadas a una marca.
- **Hitos Clave:** Nueva tabla `marca` (mínima: nombre, estado) y endpoints `POST/GET/PATCH /api/catalogo/lineas` y `/api/catalogo/marcas/:idMarca/lineas`, protegidos por el permiso «Gestión del catálogo». `linea` ahora referencia `marca` (`id_marca`); `id_sub_subcategoria` se volvió opcional (columna remanente, no se usa en esta HU).
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m01.test.ts`: 27/27 pruebas superadas.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.1.0_M01_lineas_comerciales_backend.md](./walkthroughs/M01/walkthrough_v3.1.0_M01_lineas_comerciales_backend.md)

---

## [v3.0.0] - 2026-09-08
### Módulo: M01 Catálogo de Productos (Backend)
- **Alcance:** Primera entrega del módulo M01: gestión administrativa de categorías y subcategorías (HU-CAT-01), con baja lógica en cascada y advertencia previa de productos afectados.
- **Hitos Clave:** Nuevo módulo `backend/src/modules/m01-catalogo/` con endpoints `POST/GET/PATCH /api/catalogo/categorias` y `/api/catalogo/subcategorias`, protegidos por el permiso «Gestión del catálogo» (M17). Se agregaron las columnas `estado` y `orden` a `categoria` y `subcategorias` (BD v2.5), requisito bloqueante detectado y aprobado por el Product Owner antes de codificar (RF-CAT-01-04, CA-CAT-01-04).
- **Estado de Calidad:** ✅ `tsc --noEmit` y `npm run lint` sin errores ni advertencias. Suite `m01.test.ts`: 17/17 pruebas superadas.
- 🔗 **Walkthrough Técnico Oficial:** [walkthroughs/M01/walkthrough_v3.0.0_M01_categorias_subcategorias_backend.md](./walkthroughs/M01/walkthrough_v3.0.0_M01_categorias_subcategorias_backend.md)

---

## [v2.3.0] - 2026-09-15
### Módulo: Core Frontend (Design System Components)
- **Alcance General:** Salto a versión **MINOR (v2.3.0)** con la estabilización, implementación y centralización de los componentes visuales core del frontend en la rama `feature/core-frontend-layouts`, unificando el diseño de botones, tarjetas, inputs, tablas y modales para que todos los módulos utilicen la misma fuente y se erradique la duplicidad de componentes.
- **Hitos Clave Frontend:**
  - **Tipografías y Tailwind:** Inyección de `Inter` (sans) y `Poppins` (title) en `tailwind.config.ts`.
  - **Componentes Base (Botones):** Refactorización completa de `Button.vue` e `IconButton.vue` para soportar las variantes oficiales (`action`, `corporate`, `outline`, etc.) y consumir la librería `lucide-vue-next` dinámicamente mediante la prop `icon`, protegiendo el `index.ts` y evitando crear archivos innecesarios.
  - **Formularios y Tarjetas (`GrupoOpciones.vue` y `Card.vue`):** Implementación del diseño interactivo de tarjeta seleccionable (check y borde activo) en `GrupoOpciones.vue` e implementación de un contenedor de tarjetas limpio en `Card.vue`.
  - **Tablas y Paginación (M17/M01):** Consolidación de `Table.vue` con soporte para diseño adaptativo (mobile-cards) y `Paginacion.vue` estándar, reemplazando las tablas dispares de los módulos.
  - **Modales y Drawers:** Verificación de `Modal.vue` con la franja de gradiente corporativa e implementación de un `Drawer.vue` lateral con transiciones.
  - **Corrección Arquitectónica:** Migración y corrección de `FooterPrincipal.vue` (removido erróneamente de `components/layout/` hacia la carpeta correcta `src/core/layouts/`).
  - 🔗 **Walkthrough Técnico Frontend Core:** [walkthrough_v2.3.0_core_design_system_frontend.md](./walkthroughs/core/walkthrough_v2.3.0_core_design_system_frontend.md)
- **Estado:** ✅ Validado. Componentes implementados estrictamente sobre `src/core/components/` sin afectar otras ramas.

## [v2.2.0] - 2026-09-07
### Arquitectura Global: Estandarización de DTOs en Frontend (Globales vs Locales y Erradicación Inline)
- **Alcance General:** Salto a versión **MINOR (v2.2.0)** que formaliza la arquitectura de **DTOs (Data Transfer Objects) en el Frontend**, documentándola en `frontend/infraestructura.md` y `AGENTS.md` (Directiva 12). Se define la separación estricta entre **DTOs Globales (`src/core/dtos/`)**, **DTOs Locales de Módulo (`src/modules/m[xx]/dtos/`)** y **Contratos Estáticos (`interfaces/`)**, eliminando al 100% las declaraciones de esquemas Zod inline en componentes `.vue`.
- **Hitos Clave de Arquitectura e Implementación:**
  - **Documentación y Normativa Oficial:** Actualización de `frontend/infraestructura.md` (Sección 5: Gestión de DTOs y Validación de Formularios) y de `AGENTS.md` (Directiva 12 y Paso 5) prohibiendo validaciones inline en vistas.
  - **Capa Global de DTOs (`src/core/dtos/`):** Creación de `seguridad.dto.ts` centralizando `contrasenaSchema` (`HU-SEG-01`), `contrasenaConConfirmacionSchema`, `telefonoSchema`, `correoSchema` y utilidades de validación atómica (`validarContrasena`, `validarContrasenaConConfirmacion`).
  - **Capa de DTOs Locales M04 (`src/modules/m04-cuentas/dtos/`):** Estructuración de `login.dto.ts` (`loginSchema`), `registro.dto.ts` (`registroNaturalSchema`, `registroEmpresaSchema`) y `password.dto.ts` mediante composición limpia.
  - **Introspección y Limpieza de Componentes Vue:** Refactorización de `ModalLogin.vue` y `PasoDatos.vue`, removiendo todos los esquemas `z.object` del cuerpo del componente y delegando exclusivamente en `toTypedSchema(dtoImportado)`.
  - 🔗 **Walkthrough Técnico:** [walkthrough_v2.2.0_M04_arquitectura_dtos_frontend.md](./walkthroughs/M04/walkthrough_v2.2.0_M04_arquitectura_dtos_frontend.md)
- **Estado:** ✅ Validado con compilación TypeScript limpia en frontend (`vue-tsc -b`), linter en 0 advertencias (`npm run lint`), build de producción generado con éxito y backend en 0 errores.

---

## [v2.1.3] - 2026-09-07
### Módulo: M04 (Cuentas, Autenticación y Perfil - DTO Centralizado y Validador DRY de Contraseñas Frontend)
- **Alcance General:** Incremento **PATCH (v2.1.3)** que unifica y centraliza la validación de contraseñas en el frontend bajo el principio DRY mediante un nuevo módulo de DTOs (`dtos/password.dto.ts`). Aplica idénticas reglas de seguridad y robustez criptográfica (`HU-SEG-01`) tanto en el registro de particulares y empresas (`HU-CUE-01`, `HU-CUE-03`), como en el establecimiento de contraseñas federadas (`HU-CUE-02`) en modales y wizards.
- **Hitos Clave Frontend (HU-SEG-01 / HU-CUE-01 / HU-CUE-02 / HU-CUE-03):**
  - **Nuevo Módulo DTO Frontend (`password.dto.ts`):** Definición de `contrasenaSchema`, `contrasenaConConfirmacionSchema`, y funciones utilitarias puras `validarContrasena` y `validarContrasenaConConfirmacion` como única fuente de la verdad para reglas de seguridad de contraseñas.
  - **Erradicación de Duplicidad (Principio DRY):** Reemplazo de expresiones regulares y bloques repetitivos de comprobación en `ModalLogin.vue` y `PasoDatos.vue` por llamadas atómicas al DTO centralizado.
  - **Validación Homogénea en Registros Natural y Empresa:** Integración directa de `contrasenaSchema` en los esquemas Zod/Vee-Validate `naturalZod` y `empresaZod` de `PasoDatos.vue`, garantizando que ningún usuario cree una cuenta con una contraseña débil.
  - **Guía Visual y Usabilidad:** Adición de textos explicativos de asistencia debajo del campo de contraseña en ambos formularios de registro indicando los requisitos de seguridad antes del envío.
  - 🔗 **Walkthrough Técnico:** [walkthrough_v2.1.3_M04_dto_validador_contrasena_dry_frontend.md](./walkthroughs/M04/walkthrough_v2.1.3_M04_dto_validador_contrasena_dry_frontend.md)
- **Estado:** ✅ Validado con compilación TypeScript limpia en frontend (`vue-tsc -b`), linter en 0 advertencias (`npm run lint`), build de producción exitoso y backend sin afectaciones.

---

## [v2.1.2] - 2026-09-07
### Módulo: M04 (Cuentas, Autenticación y Perfil - Corrección Validación Contraseña Propia con Google)
- **Alcance General:** Incremento **PATCH (v2.1.2)** que soluciona el fallo de validación de seguridad al registrarse con Google e intentar establecer la contraseña propia (`RF-CUE-02-04` / `CA-CUE-02-04`), corrigiendo la exigencia innecesaria de un `tokenTemporal` en el DTO de backend y sincronizando las reglas de complejidad de contraseña (`HU-SEG-01`) y detalle de mensajes de error en los componentes frontend.
- **Hitos Clave Fullstack (HU-CUE-02 / HU-SEG-01):**
  - **Backend DTO Desacoplado:** Marcado de `tokenTemporal` como opcional (`z.string().optional()`) en `completarPasswordGoogleSchema` de `login.dto.ts`, evitando rechazos 400 Bad Request en peticiones estándar `{ correo, contrasena }`.
  - **Frontend Validación Pre-Envío:** Implementación de validaciones explícitas de robustez (`/[a-z]/`, `/[A-Z]/`, `/[0-9]/`, longitud mínima de 8) en `guardarPasswordInicial` tanto en `ModalLogin.vue` como en `PasoDatos.vue`.
  - **Claridad de Requisitos y Textos de Ayuda:** Actualización de placeholders y textos de ayuda en pantalla informando al usuario la necesidad de mayúsculas, minúsculas y números antes de someter el formulario.
  - **Propagación Precisa de Errores de Validación:** Mejora en el parser reactivo `procesarErrorApi` de `useCuentas.ts` para extraer y proyectar directamente el mensaje específico reportado por el backend en `error.details`.
  - 🔗 **Walkthrough Técnico:** [walkthrough_v2.1.2_M04_fix_password_google_validation.md](./walkthroughs/M04/walkthrough_v2.1.2_M04_fix_password_google_validation.md)
- **Estado:** ✅ Validado con compilación TypeScript limpia en backend (`npx tsc --noEmit`) y frontend (`vue-tsc -b`), linter en 0 advertencias (`npm run lint`) en ambos entornos y build de producción generado con éxito.

---

## [v2.1.1] - 2026-09-07
### Módulo: M04 (Cuentas, Autenticación y Perfil - Registro con Google en Wizard de Creación de Cuenta)
- **Alcance General:** Incremento **PATCH (v2.1.1)** que extiende la autenticación federada con Google Identity Services (`HU-CUE-02`) directamente al wizard de registro de clientes (`RegistroWizard.vue` / `PasoDatos.vue`), permitiendo a nuevos usuarios registrarse con un solo clic con Google en el tab Natural, ingresar su contraseña de respaldo y avanzar directamente al estado de bienvenida sin requerir verificación por OTP por correo.
- **Hitos Clave Frontend (HU-CUE-02 / HU-CUE-01):**
  - **Botón y Flujo de Google en Wizard:** Integración de Google Identity en el tab de cliente particular de `PasoDatos.vue` con separador de diseño `"O con tu correo"`.
  - **Soporte de Flujos de Negocio:** Manejo nativo de sugerencia de vinculación si el correo ya existe, y captura inmediata de la contraseña de respaldo (`RF-CUE-02-04`).
  - **Transición Fluida en Wizard:** Conexión del evento `registroGoogleExitoso` en `RegistroWizard.vue` para avanzar directamente al paso 3 (`PasoListo.vue`), conservando la franja de marca y consistencia del Design System (Directiva 8).
  - 🔗 **Walkthrough Técnico:** [walkthrough_v2.1.1_M04_google_identity_registro_wizard_frontend.md](./walkthroughs/M04/walkthrough_v2.1.1_M04_google_identity_registro_wizard_frontend.md)
- **Estado:** ✅ Validado con compilación TypeScript limpia (`npx tsc --noEmit` y `vue-tsc -b`), linter en 0 advertencias (`npm run lint`) y build de producción en frontend generado con éxito.

---

## [v2.1.0] - 2026-09-07
### Módulo: M04 (Cuentas, Autenticación y Perfil - Google Identity OAuth2 Fullstack)
- **Alcance General:** Incremento **MINOR (v2.1.0)** con la implementación e integración de extremo a extremo (E2E) de **Google Identity Services (HU-CUE-02)**. Se conecta la autenticación federada con validación criptográfica en backend (`google-auth-library`), persistencia nativa en PostgreSQL (`usuario_identidad_externa`), y flujo reactivo en frontend con gestión de sugerencia de vinculación y registro de contraseña de respaldo, protegiendo al 100% las credenciales mediante variables de entorno en el host.
- **Hitos Clave Fullstack (HU-CUE-02):**
  - **Verificación Criptográfica en Backend:** Incorporación de `OAuth2Client.verifyIdToken()` para comprobar la firma, expiración y audiencia (`GOOGLE_CLIENT_ID`) del ID Token emitido por Google.
  - **Persistencia en Base de Datos (PostgreSQL):** Conexión de la tabla `usuario_identidad_externa` mediante Kysely en `CuentasRepository` para almacenamiento duradero de vinculaciones federadas (`google`, `id_proveedor`, `correo_proveedor`).
  - **Flujo Completo de Negocio (HU-CUE-02):**
    - *Login Directo (CA-CUE-02-05):* Emisión de sesión JWT y tokens cuando la cuenta ya está vinculada.
    - *Sugerencia de Vinculación (RF-CUE-02-03 / CA-CUE-02-02):* Presentación de diálogo al usuario cuando el correo coincide con una cuenta previa creada por formulario, requiriendo confirmación explícita antes de vincular.
    - *Contraseña Propia de Respaldo (RF-CUE-02-04 / CA-CUE-02-04):* Solicitud de contraseña propia tras registro con Google para garantizar acceso indistinto por ambas vías.
  - **Frontend Reactivo y Design System (Directiva 8):** Integración de Google Identity Services en `ModalLogin.vue`, `useCuentas.ts` y `cuentas.service.ts` utilizando exclusivamente tokens oficiales (`corporate`, `action`, `subaction`, `neutral-*`).
  - **Protección de Credenciales (Cero Secretos en Git):** Lectura desacoplada de `GOOGLE_CLIENT_ID` y `VITE_GOOGLE_CLIENT_ID` desde `.env` en el host, inyectadas mediante `env_file` y build args en Docker.
  - 🔗 **Walkthrough Técnico M04 Google Identity:** [walkthrough_v2.1.0_M04_google_identity_oauth_fullstack.md](./walkthroughs/M04/walkthrough_v2.1.0_M04_google_identity_oauth_fullstack.md)
- **Estado:** ✅ Validado con compilación limpia en backend (`npx tsc --noEmit`), linter backend en 0 advertencias (`npm run lint`), 30/30 tests aprobados (`m04.test.ts`) y build de producción en frontend (`vue-tsc -b && vite build`) con 0 errores.

---

## [v2.0.0] - 2026-09-07
### Módulo: M04 (Cuentas, Autenticación y Perfil - Integración Fullstack E2E)
- **Alcance General:** Salto a versión **MAJOR (v2.0.0)** con la primera integración simétrica y desacoplada de extremo a extremo (E2E) entre el backend (Express + Kysely) y frontend (Vue 3 + Pinia + Composables), resolviendo el contrato de datos del Universal API Envelope y orquestando el manejo reactivo de errores y estados de carga.
- **Hitos Clave Fullstack (HU-CUE-01, HU-CUE-03, HU-CUE-04):**
  - **Universal API Envelope (`ApiResponse<T>` y `ApiErrorResponse`):** Estandarización de contratos de respuesta HTTP alineando el cliente de frontend para interpretar respuestas con `success: true` / `data` y capturar errores estructurados (`error.code`, `error.message`, `error.details`).
  - **Capa de Composables Reactivos (`useCuentas`):** Desacoplamiento de la lógica de red y estado (`cargando`, `errorMensaje`, `codigoError`, `erroresValidacion`) fuera de los componentes Vue (`ModalLogin.vue`, `PasoDatos.vue`, `PasoVerificacion.vue`).
  - **Sincronización de Sesión Segura (M20):** Actualización de `auth.store.ts` para persistir `accessToken`, `idSesion` y el usuario sanitizado sin exposición de datos sensibles.
  - **Limpieza de Tipos (Zero Any):** Interfaces TypeScript de integración pura en `registro.interface.ts` con 0 bytes de runtime y 100% simétricas con los DTOs de backend.
  - 🔗 **Walkthrough Técnico M04 Fullstack:** [walkthrough_v2.0.0_M04_integracion_fullstack.md](./walkthroughs/M04/walkthrough_v2.0.0_M04_integracion_fullstack.md)
- **Estado:** ✅ Validado con compilación limpia en backend (`npx tsc --noEmit`), linter backend en 0 advertencias (`npm run lint`) y build de producción en frontend (`vue-tsc -b && vite build`) con 0 errores.

---

## [v1.10.1] - 2026-09-07
### Módulo: M04 (Cuentas, Autenticación y Perfil - Frontend Tech Lead Fixes)
- **Alcance General:** Subsanación técnica integral de la capa frontend de M04 tras auditoría de Tech Lead, alcanzando 100% de cumplimiento en compilación TypeScript limpia (`vue-tsc`), linter en cero errores/advertencias (`npm run lint`), erradicación absoluta de tipos laxos (`any`) y alineación total con los tokens semánticos oficiales del Design System Pintuclic (Directiva 8).
- **Hitos Clave Frontend:**
  - **Resolución de Error Crítico TS2339:** Type narrowing estricto en el submit reactivo de `PasoDatos.vue` para uniones de esquemas Vee-Validate/Zod (`RegistroNaturalPayload` vs `RegistroEmpresaPayload`).
  - **Alineación con Design System (Directiva 8):** Purga total de colores hexadecimales arbitrarios (`#E63946`) en `ModalLogin.vue`, `PasoDatos.vue` y `PasoVerificacion.vue`, reemplazados por tokens institucionales (`bg-subaction`, `text-corporate`, `border-action/30`).
  - **Calidad de Tipos (Zero-Any):** Tipado fuerte de argumentos y retornos en `CuentasService` y en el almacén de Pinia (`useAuthStore`) con la nueva interfaz `UsuarioSesion` sin runtime en `registro.interface.ts`.
  - **Gestión Segura de Ciclo de Vida:** Prevención de fugas de memoria en `PasoVerificacion.vue` mediante `onUnmounted` con `clearInterval` sobre el cooldown de 60s de reenvío OTP.
  - **Limpieza de Linter:** Corrección de globals en `eslint.config.js` y remoción de `props` no utilizados en `Boton.vue`.
  - 🔗 **Walkthrough Técnico M04 Frontend:** [walkthrough_v1.10.1_M04_cuentas_auth_perfil_frontend.md](./walkthroughs/M04/walkthrough_v1.10.1_M04_cuentas_auth_perfil_frontend.md)
  - 🔗 **Reporte de Revisión Técnica M04 Frontend:** [review_v1.10.0_M04_cuentas_auth_perfil.md](./reviews/frontend/review_v1.10.0_M04_cuentas_auth_perfil.md)
- **Estado:** ✅ Compilación limpia con `npx vue-tsc -b` (código 0), linter con 0 errores y 0 advertencias (`npm run lint`), y build de producción generado con éxito (`npm run build`).

---

## [v1.10.0] - 2026-09-07
### Módulo: M04 (Cuentas, Autenticación y Perfil - Frontend)
- **Alcance General:** Integración funcional, estructuración arquitectónica y conexión de la interfaz de usuario (Vue) con la API REST del backend para las funcionalidades de autenticación (Login y Registro B2C/B2B).
- **Hitos Clave Frontend (HU-CUE-01 a HU-CUE-03):**
  - **Refactorización Arquitectónica:** Migración estricta de componentes modales específicos (Login, Stepper) de la carpeta global `core` hacia `modules/m04-cuentas/components/`.
  - **Single Source of Truth (Zod):** Unificación de reglas de validación en cliente (VeeValidate + Zod) para coincidir 1:1 con las restricciones del backend. Resolución de colisión de contextos de formulario en Vue.
  - **Estado y Persistencia:** Inyección global de Pinia (`main.ts`) y creación del store de autenticación (`auth.store.ts`) conectado al JWT de localStorage.
  - **Comunicación HTTP y Manejo de Errores:** Implementación de `cuentas.service.ts` con Axios. Inserción de UI responsiva (Loading States) y renderizado de errores directos desde el servidor.
  - **Identidad Externa (HU-CUE-02):** Preparación del framework e interfaz para Google Identity (`vue3-google-login`), a la espera de credenciales Cloud por parte de DevOps.
  - 🔗 **Walkthrough Técnico M04 Frontend:** [walkthrough_v1.10.0_M04_cuentas_auth_perfil_frontend.md](./walkthroughs/M04/walkthrough_v1.10.0_M04_cuentas_auth_perfil_frontend.md)
- **Estado:** ✅ Validado con compilación limpia (`npm run build`).

---

## [v1.9.0] - 2026-09-05
### Módulo: M04 (Cuentas, Autenticación y Perfil - Backend)
- **Alcance General:** Implementación completa del backend para el módulo M04 (HU-CUE-01 a HU-CUE-09), abarcando registro particular y empresa, autenticación por formulario y Google Identity, ciclo de vida de sesiones seguras con JWT portando `sid`, recuperación de contraseña, administración de perfiles, gestión de direcciones y panel administrativo de revisión de empresas.
- **Hitos Clave Backend (HU-CUE-01 a HU-CUE-09):**
  - **Registro de Particular y OTP (`HU-CUE-01`):** Alta de clientes particulares en estado `pendiente`, emisión de código OTP criptográfico de 6 dígitos con vigencia de 15 minutos, verificación, expiración y reenvío con notificación SMTP.
  - **Identidad y Acceso con Google (`HU-CUE-02`):** Autenticación mediante Google Identity con sugerencia de vinculación cuando el correo coincide con una cuenta previa, e incorporación de contraseña propia obligatoria para doble vía de acceso.
  - **Registro de Empresas B2B (`HU-CUE-03`):** Registro corporativo con NIT/RUT y representante legal en estado `pendiente`, prevención de NIT duplicado y consulta del estado de trámite.
  - **Inicio y Cierre de Sesión Seguro (`HU-CUE-04`):** Login con mitigación contra fuerza bruta, verificación de credenciales en tiempo constante (`HU-SEG-06`), emisión de JWT portando claim `sid` persistido en PostgreSQL (`HU-SEG-02`) y logout explícito.
  - **Recuperación de Contraseña (`HU-CUE-05`):** Solicitud uniforme para evitar enumeración de correos, reseteo mediante código OTP e invalidación inmediata de todas las sesiones activas del usuario.
  - **Gestión de Perfil (`HU-CUE-06`):** Consulta segura sin datos sensibles (`HU-SEG-06`), actualización de datos personales, cambio de correo protegido con código enviado al correo actual y solicitud de ascenso a cuenta empresa.
  - **Gestión de Direcciones (`HU-CUE-07`):** CRUD completo de direcciones con soporte de geolocalización, designación automática de predeterminada y comprobación estricta de titularidad en backend (`HU-SEG-03`).
  - **Unicidad de Cuentas (`HU-CUE-08`):** Garantía de correo único en minúsculas en todo el sistema sin distinción de rol.
  - **Aprobación Administrativa de Empresas (`HU-CUE-09`):** Bandeja protegida por permisos `personal.ver` y `personal.editar` para aprobar (activando cuenta y rol `empresa_vip`) o rechazar solicitudes corporativas y actualizaciones de NIT con motivo y notificación.
  - 🔗 **Walkthrough Técnico M04 Backend:** [walkthrough_v1.9.0_M04_cuentas_auth_perfil_backend.md](./walkthroughs/M04/walkthrough_v1.9.0_M04_cuentas_auth_perfil_backend.md)
  - 🔗 **Reporte de Revisión Técnica M04 Backend:** [review_v1.9.0_M04_cuentas_auth_perfil.md](./reviews/backend/review_v1.9.0_M04_cuentas_auth_perfil.md)
- **Estado:** ✅ Validado con 30 pruebas automatizadas superadas al 100%; compilación TypeScript limpia (`tsc --noEmit`) con 0 errores y linter con 0 advertencias tras refactorización del Tech Lead.

---

## [v1.8.1] - 2026-09-05
### Módulos: M18 (Notificaciones) ↔ M17 (Permisos y Administración) ↔ M20 (Seguridad) - Integración Fullstack
- **Alcance General:** Implementación de ajustes de integración, resolución de contratos inter-módulo y coherencia global derivados de la auditoría arquitectural.
- **Hitos Clave de Integración:**
  - **Principio DRY en Criptografía (`HU-SEG-01`):** `EmpleadosService` (`M17`) ahora delega la derivación de contraseñas seguras a `CredencialesService.derivarContrasena` de `M20`, eliminando el uso redundante de `bcrypt` y centralizando políticas criptográficas.
  - **Despacho Automático de Credenciales (`CA-ADM-01-01` / `HU-NOT-01`):** Al crear una cuenta de empleado, `M17` dispara el evento `ALTA_EMPLEADO_CREDENCIAL` vía `servicioNotificaciones` (`M18`), enviando un correo formateado con plantilla oficial y credencial temporal.
  - **Catálogo y Contratos en M18:** Adición de la plantilla `alta_empleado_credencial` con variables obligatorias `['nombre', 'credencial_temporal']` y tipado exhaustivo en la SSOT inmutable `TIPOS_EVENTOS_NOTIFICACION`.
  - **Fachadas Públicas de M17:** Exportación de `serviciosEmpleados` y `serviciosPermisos` en `m17.routes.ts` para habilitar inyecciones directas en el backend.
  - **Sincronización Fullstack en Frontend:** Alineación de los permisos en los perfiles mock de `useAuth.ts` con el catálogo maestro de PostgreSQL (`seed_pintuclic.sql`) y las guardas del backend (`personal.ver`, `personal.editar`, `personal.desactivar`, `seguridad.gestionar_permisos`).
  - 🔗 **Walkthrough Técnico de Integración:** [walkthrough_v1.8.1_M18_M17_integracion_backend.md](./walkthroughs/M18/walkthrough_v1.8.1_M18_M17_integracion_backend.md)
- **Estado:** ✅ Compilación limpia con `tsc --noEmit` y `npm run build` en frontend; 22 pruebas de integración automatizadas superadas con 0 errores.

---

## [v1.8.0] - 2026-09-05
### Módulo: M18 (Notificaciones y Comunicaciones Transaccionales - Backend)
- **Alcance General:** Implementación completa de la infraestructura y lógica de backend para el módulo transversal M18 (HU-NOT-01 a HU-NOT-04), permitiendo el despacho asíncrono de correos transaccionales por SMTP, gestión de plantillas administrables y trazabilidad auditable sin datos sensibles.
- **Hitos Clave Backend (HU-NOT-01 a HU-NOT-04):**
  - **Motor de Envío Transaccional y Reintentos (`HU-NOT-01`):** Despacho SMTP (Nodemailer) con política de reintentos configurable (hasta 3 intentos con retroceso exponencial) y modo de simulación seguro para desarrollo y testing.
  - **Suscripción a Eventos de Negocio (`HU-NOT-02`):** Orquestación de notificaciones ante cambios de estado de órdenes de compra (`M08`), alertas preventivas de demora por falta de stock y actualizaciones sobre cotizaciones comerciales (`M21`).
  - **Plantillas Administrables e Inviolabilidad de Variables (`HU-NOT-03`):** Endpoints administrativos protegidos para listar, previsualizar en vivo con datos mock y actualizar plantillas, aplicando la regla de negocio crítica que bloquea con `422` cualquier intento de eliminar variables obligatorias (ej. enlaces o códigos de verificación).
  - **Entregabilidad y Diagnóstico de Bitácora (`HU-NOT-04`):** Historial paginado de despachos, detección de rebotes y cálculo automático de métricas de entregabilidad cumpliendo la política de confidencialidad `HU-SEG-06`.
  - **Seguridad en Servidor:** Rutas de administración protegidas con guardas `sesionVigente` y `requierePermiso` de `M20`/`M17`.
  - **Arquitectura SSOT en Contratos y Eventos:** Catálogo inmutable de eventos y estados unificado en `dtos/envio.dto.ts` con inferencia estática en interfaces (`0 bytes runtime`) y protección en tiempo de compilación para el mapeo exhaustivo de plantillas en el servicio.
  - 🔗 **Walkthrough Técnico M18 Backend:** [walkthrough_v1.8.0_M18_notificaciones_backend.md](./walkthroughs/M18/walkthrough_v1.8.0_M18_notificaciones_backend.md)
  - 🔗 **Reporte de Revisión Técnica M18 Backend:** [review_v1.8.0_M18_notificaciones.md](./reviews/backend/review_v1.8.0_M18_notificaciones.md)
- **Estado:** ✅ Validado con 22 pruebas de integración automatizadas; compilación limpia con `tsc --noEmit` y linters con 0 errores.


---

## [v1.7.0] - 2026-09-05
### Módulo: M17 (Administración, Empleados y Permisos - Fullstack)
- **Alcance General:** Implementación completa del backend operativo de M17 (HU-ADM-01 a HU-ADM-06) e infraestructura desacoplada de simulación y testing de permisos en frontend, permitiendo la gestión integral de empleados, permisos atómicos en cascada, clientes y parámetros de sistema.
- **Hitos Clave Backend (HU-ADM-01 a HU-ADM-06):**
  - **Gestión de Empleados (`HU-ADM-01`):** Alta de empleados con credencial temporal hasheada en BCrypt (costo 12, `HU-SEG-01`), baja lógica con invalidación inmediata de sesiones activas en M20 (`RF-SEG-02-06`), reactivación y protección inviolable del Administrador raíz ID=1 (`RF-ADM-01-14`, `RF-ADM-02-10`).
  - **Catálogo y Cascada de Permisos (`HU-ADM-02`):** 14 permisos atómicos agrupados por área funcional con regla de cascada (al revocar un permiso base se revocan los dependientes; al otorgar uno dependiente se confiere el base).
  - **Arquitectura de Permisos Individuales (Opción A):** Sin migraciones de BD, se genera un rol individual `empleado_{id_usuario}` vinculado a `asignacion_permiso`, siendo 100% compatible con la lectura de permisos de M20.
  - **Gestión de Clientes (`HU-ADM-04`):** Consulta y fichas de clientes con anonimización estricta de datos sensibles (`HU-SEG-06`).
  - **Parámetros del Sistema (`HU-ADM-06`):** Configuración tipada y validación de rangos.
  - **Seguridad en Servidor:** Rutas `/api/admin/*` protegidas mediante guardas `requierePermiso` de M20 (`RNF-SEG-03-01`).
  - 🔗 **Walkthrough Técnico M17 Backend:** [walkthrough_v1.7.0_M17_administracion_permisos_backend.md](./walkthroughs/M17/walkthrough_v1.7.0_M17_administracion_permisos_backend.md)
- **Hitos Clave Frontend Core & Testbench:**
  - Composable `useAuth.ts` con persistencia en `localStorage`, roles tipados y catálogo de perfiles mock basado en el seed central.
  - Componente flotante `DevRoleSwitcher.vue` con alternador de identidades en 1 clic (Admin, Empleado Parcial, Cliente, Empresa).
  - Soporte de testing para subdominio (`adsoproject.dev`) y despliegue desacoplado en `docker-compose.dev.yml`.
  - Guía oficial de implementación y estándares visuales en `frontend/src/modules/m17-permisos/README.md`.
  - 🔗 **Walkthrough Técnico M17 Frontend:** [walkthrough_v1.7.0_M17_auth_simulation_frontend.md](./walkthroughs/M17/walkthrough_v1.7.0_M17_auth_simulation_frontend.md)
- **Estado:** ✅ Compilación limpia con `tsc --noEmit` en backend y `npm run build` en frontend; linters en 0 errores.

---

## [v1.6.0] - 2026-09-05
### Módulo: M20 (Seguridad) - Protección de Datos Personales y Habeas Data (HU-SEG-05)
- **Alcance:** Implementación de **HU-SEG-05**, que estuvo bloqueada desde la v1.4.0 por ausencia de modelo de datos. Consume las tablas `aviso_privacidad`, `consentimiento_usuario` y `solicitud_supresion` incorporadas en el esquema v2.3. **Sin cambios en el DDL.**
- **Añadido:**
  - `m20-seguridad/dtos/privacidad.dto.ts`: schemas Zod de consentimiento, resolución de solicitudes y parámetro de URL.
  - `m20-seguridad/interfaces/privacidad.interfaces.ts`: contratos de dominio sin runtime.
  - `m20-seguridad/repositories/privacidad.repository.ts`: consultas Kysely de las 3 tablas de privacidad y conteo de órdenes asociadas.
  - `m20-seguridad/services/privacidad.service.ts`: reglas de consentimiento y circuito de supresión.
  - `m20-seguridad/controllers/privacidad.controller.ts`: transporte HTTP.
  - Endpoints: `GET /api/seguridad/privacidad/aviso` (**público**), `GET|POST /privacidad/consentimiento`, `GET|POST /privacidad/supresion`, `GET /privacidad/supresion/pendientes` y `PUT /privacidad/supresion/:id` (ambos con permiso).
  - `docs/walkthroughs/M20/walkthrough_v1.6.0_M20_privacidad_backend.md`.
- **Decisiones de diseño:**
  - **El consentimiento es histórico, no un estado:** cada aceptación crea una fila y nunca se sobrescribe una anterior. Es lo que permite responder qué versión aceptó cada titular y cuándo, y hace posible avisar cuando el aviso cambia de versión (CA-SEG-05-06).
  - **La versión se acepta explícitamente:** si el aviso cambia entre que el usuario lo lee y lo acepta, la operación falla con `409` en lugar de registrar consentimiento sobre un texto que nunca vio.
  - **El aviso vigente es público:** debe poder leerse antes de registrarse, porque nadie puede consentir lo que no ha visto.
  - **La supresión se registra con la verdad:** cuando hay órdenes asociadas, la respuesta informa que la información comercial exigida por la ley se conservará desvinculada de la identidad, en vez de prometer un borrado total que la ley no permite.
- **Ajustado:**
  - `m20-seguridad/dtos/index.ts` y `seguridad.routes.ts`: composición y cableado de las rutas nuevas.
  - Renombrado `walkthrough_v1.5.0_M20_seguridad.md` → `..._backend.md` para cumplir la normativa de sufijo de capa.
- **Pendiente:**
  - **M17** debe registrar el permiso `seguridad.gestionar_privacidad` en el catálogo; no está en el seed oficial y sin él la cola administrativa responde `403` a todos.
  - **M04** debe invocar `serviciosSeguridad.privacidad.exigirConsentimientoVigente(idUsuario)` al completar un registro, y es el dueño de la consulta y rectificación del perfil (CA-SEG-05-03).
  - **CA-SEG-05-05 parcial — requiere decisión del líder técnico / PO:** el sistema identifica y comunica qué información comercial debe conservarse, pero **no ejecuta la desvinculación de la identidad**, que es estructuralmente imposible hoy (`orden.id_usuario` es `NOT NULL` y su FK usa `ON DELETE RESTRICT`). El walkthrough plantea tres opciones con su contrapartida y recomienda anonimizar la fila de `usuario` en lugar de la orden, por no requerir cambios de DDL. Queda además una colisión legal por resolver: la normativa tributaria exige que la factura identifique al comprador, mientras que la de protección de datos exige suprimir esa identidad. Ver [walkthrough v1.6.0](./walkthroughs/M20/walkthrough_v1.6.0_M20_privacidad_backend.md).
  - **RF-SEG-05-08/09 bloqueados:** la rama de transferencia de datos a terceros depende de la postura sobre retención de imágenes del simulador y conversaciones de chatbot, aún sin definir.
  - **HU-SEG-04 (auditoría)** sigue EN PAUSA por decisión del Lider general.
- **Estado:** ✅ `tsc --noEmit` y `npm run lint` sin errores, y 16 pruebas de integración contra PostgreSQL 18.4 con el esquema v2.3 y el seed oficial (aviso público, cambio de versión del aviso, aceptación de versión retirada, histórico no sobrescrito, bifurcación de órdenes asociadas, no duplicación de solicitudes, control de permisos en la cola administrativa y ausencia de datos sensibles en las respuestas).

---

## [v1.5.5] - 2026-09-05
### Módulo: Base de Datos y Calidad de Desarrollo (Mocks y Fixtures Centralizados)
- **Alcance:** Unificación del sistema de mocks de prueba en una única fuente centralizada ([`bd/sql/seed_pintuclic.sql`](../bd/sql/seed_pintuclic.sql)), eliminación definitiva de la carpeta aislada `backend/src/modules/m20-seguridad/__fixtures__`, creación del ejecutor `npm run db:seed` y publicación de la [Guía de Mocks y Datos de Prueba](../bd/docs/GUIA_MOCKS_Y_DATOS_PRUEBA.md).
- **Hitos Clave:**
  - Siembra integral e idempotente de datos en las **31 tablas** del esquema relacional (79 registros de prueba vinculados).
  - Eliminación de dependencias dispersas en `m20-seguridad/__fixtures__` concentrando toda la data en la capa `bd/`.
  - Inclusión de comandos `db:seed` y `db:reset` en `backend/package.json`.
  - Publicación de [`GUIA_MOCKS_Y_DATOS_PRUEBA.md`](../bd/docs/GUIA_MOCKS_Y_DATOS_PRUEBA.md) con roles, credenciales (`Pintuclic2026`) y catálogo de testing.
- **Estado:** ✅ Validado contra PostgreSQL local con 31 tablas verificadas; `tsc --noEmit` y `eslint` limpios.

---

## [v1.5.4] - 2026-09-05
### Módulo: Core Backend e Infraestructura de Base de Datos
- **Alcance:** Creación del script automatizado de despliegue y verificación de base de datos (`backend/src/core/db/setup.ts`) invocable mediante `npm run db` (o `npm run db:setup` / `npm run db:init`).
- **Hitos Clave:**
  - Ejecución integral del script DDL oficial (`bd/sql/schema_pintuclic.sql`) conectando por pool de PostgreSQL e inspeccionando `information_schema.tables`.
  - Verificación automática de integridad para las 31 tablas operativas (incluyendo `sesion` y las entidades de Habeas Data).
  - Configuración del archivo `backend/.env` local para conexión a PostgreSQL.
- **Estado:** ✅ Validado y ejecutado con éxito en PostgreSQL local (31 tablas creadas en 0.19s); compilación `tsc` y linter limpios.

---

## [v1.5.3] - 2026-09-05
### Módulo: BD (Base de Datos v2.3) y Privacidad (Habeas Data - M20 / HU-SEG-05)
- **Alcance:** Actualización a la versión 2.3 del esquema relacional (31 tablas) con la incorporación de entidades de aviso de privacidad, consentimiento auditable y radicación de solicitudes de supresión de datos personales (Habeas Data). Sincronización completa de tipos Kysely en `backend/src/core/db/types.ts` preservando intacta la tabla `sesion` (v2.2).
- **Hitos Clave:**
  - Nuevas tablas: `aviso_privacidad`, `consentimiento_usuario` y `solicitud_supresion`.
  - Nuevo enumerado nativo: `enum_estado_solicitud_supresion`.
  - Índices optimizados para auditoría de consentimientos y tramitación de supresiones.
- **Estado:** ✅ Compilación limpia con `npx tsc --noEmit` y linter sin errores.
- 🔗 **Walkthrough Técnico BD v2.3:** [WALKTHROUGH_DATABASE.md](../bd/docs/WALKTHROUGH_DATABASE.md#-versión-23-2026-09-05)

---

## [v1.5.2] - 2026-09-05
### Módulo: Especificación Funcional de Negocio (M01, M02, M05, M08)
- **Alcance:** Especificación funcional formal, historias de usuario y diagramas de arquitectura de flujo para Catálogo, Búsqueda, Carrito y Órdenes de venta.
- **Hitos Clave:**
  - Especificación de Catálogo (`M01`): jerarquía, atributos técnicos, marcas, líneas, colores CIELAB y productos entonables (`HU-CAT-01` a `13`).
  - Especificación de Búsqueda y Navegación (`M02`): filtros facetados, ordenamiento y catálogo público (`HU-BUS-01` a `04`).
  - Especificación de Carrito (`M05`) y Órdenes de Venta (`M08`): snapshot inmutable y ciclo de vida de la orden (`HU-ORD-01` a `07`).
  - Incorporación de 15 diagramas de flujo y arquitectura en `docs/assets/diagrams/`.
- 🔗 **Especificaciones:** Ver [M01](./02_MODULOS_FUNCIONALES/M01_ESPECIFICACION_CATALOGO.md), [M02](./02_MODULOS_FUNCIONALES/M02_ESPECIFICACION_BUSQUEDA.md), [M05](./02_MODULOS_FUNCIONALES/M05_ESPECIFICACION_CARRITO.md) y [M08](./02_MODULOS_FUNCIONALES/M08_ESPECIFICACION_ORDEN.md).

---

## [v1.5.1] - 2026-09-05
### Módulo: 00_SISTEMA, Gobernanza de Calidad (Reviews) y Refactorización M20 (DTOs)
- **Alcance:** Desacoplamiento estricto de esquemas Zod (runtime) de contratos e interfaces estáticas en el módulo `m20-seguridad`, estandarización de la carpeta obligatoria `dtos/` en la arquitectura backend y formalización del sistema de auditoría técnica en `docs/reviews/`.
- **Añadido:**
  - `docs/reviews/`: Directorio central de auditoría técnica y code reviews del Tech Lead (`README.md`, `backend/`, `frontend/`).
  - `docs/reviews/backend/review_v1.5.0_M20_seguridad.md`: Primer informe formal de code review evaluando M20, justificando el desacoplamiento de DTOs y emitiendo dictamen de aprobación.
  - `backend/src/modules/m20-seguridad/dtos/`: Carpeta modular dedicada a esquemas Zod y tipos inferidos (`seguridad.dto.ts`, `index.ts`).
- **Ajustado:**
  - `backend/src/modules/m20-seguridad/interfaces/seguridad.interfaces.ts`: Purificación a tipos y contratos de dominio TypeScript 100% libres de dependencias de Zod en runtime.
  - `backend/src/modules/m20-seguridad/controllers/seguridad.controller.ts` y `services/`: Actualizadas importaciones hacia la capa `dtos`.
  - `backend/infraestructura.md`: Actualizada la especificación arquitectónica consagrando la carpeta `dtos/` separada de `interfaces/` para todos los módulos del proyecto.
  - `docs/README.md`: Registro de `docs/reviews/` y `docs/walkthroughs/` en el árbol de gobernanza del sistema.
- **Estado:** ✅ Compilación limpia con `npx tsc --noEmit` y `npm run lint` en backend con cero errores.

---

## [v1.5.0] - 2026-09-05
### Módulo: M20 (Seguridad, Auditoría y Protección de Datos) + BD v2.2
- **Alcance:** Primera entrega funcional de M20 (HU-SEG-01, HU-SEG-02, HU-SEG-03, HU-SEG-06) e incorporación de la tabla `sesion` en el esquema de base de datos v2.2 (28 tablas).
- **Hitos Clave:**
  - Validador central de autorización en servidor y guardas reutilizables (`sesionVigente`, `requierePermiso`, `requiereTitularidad`, `protegido`).
  - Hashing seguro con BCrypt (costo 12) y saneamiento recursivo de credenciales en respuestas HTTP.
  - Sesiones con estado persistidas en PostgreSQL (`sesion` con UUID) y resolución de permisos en tiempo real.
- **Estado:** ✅ `tsc --noEmit` y `npm run lint` limpios; 28 pruebas de integración ejecutadas contra PostgreSQL 18.
- 🔗 **Walkthrough Técnico M20:** [walkthrough_v1.5.0_M20_seguridad_backend.md](./walkthroughs/M20/walkthrough_v1.5.0_M20_seguridad_backend.md)
- 🔗 **Walkthrough Técnico BD v2.2:** [WALKTHROUGH_DATABASE.md](../bd/docs/WALKTHROUGH_DATABASE.md#-versión-22-2026-09-05)

---

## [v1.4.0] - 2026-09-04
### Módulo: BD (Base de Datos v2.1) y Core Backend
- **Alcance:** Actualización a la versión 2.1 del esquema relacional (27 tablas) y sincronización de tipos Kysely en `backend/src/core/db/types.ts`.
- **Hitos Clave:**
  - Patrón de e-commerce inmutable para ventas (`orden` y `linea_orden`).
  - Desacoplamiento de cotizaciones comerciales B2B/B2C (`cotizacion`).
  - Carrito vivo con soporte para visitantes anónimos (`token_visitante`) y variantes (`linea_carrito`).
  - Clasificación de tipo de cuenta (`enum_tipo_usuario`).
- **Estado:** ✅ Compilación limpia con `npx tsc --noEmit` en backend; orden topológico validado.
- 🔗 **Walkthrough Técnico BD v2.1:** [WALKTHROUGH_DATABASE.md](../bd/docs/WALKTHROUGH_DATABASE.md#-versión-21-2026-09-04)

---

## [v1.3.0] - 2026-09-04
### Módulo: Frontend y Design System (Paleta Oficial de Colores)
- **Alcance:** Implementación y estandarización de los tokens de color globales de Pintuclic (`corporate`, `action`, `subaction`, `conversion`, `highlight`, `neutral-*`), integración con Tailwind CSS v4, directiva de diseño estricta en `AGENTS.md` y documentación técnica en `frontend/src/core/theme/`.
- **Añadido:**
  - `frontend/src/core/theme/colors.ts`: Constantes fuertemente tipadas de la paleta oficial (HEX).
  - `frontend/src/core/theme/index.ts`: Punto de exportación centralizado del tema.
  - `frontend/src/core/theme/GUIA_COLORES.md`: Manual de uso de clases Tailwind, tabla de roles y ejemplos de componentes.
- **Ajustado:**
  - `frontend/tailwind.config.ts`: Mapeo oficial de los tokens semánticos en el tema extendido.
  - `frontend/src/style.css`: Declaración de variables CSS nativas `@theme` para Tailwind CSS v4.
  - `frontend/src/App.vue`: Showcase interactivo demostrativo de los roles visuales.
  - `frontend/infraestructura.md`: Actualización de la arquitectura con el módulo `core/theme/` y la tabla oficial de colores.
  - `AGENTS.md`: Directiva crítica #8 con regla estricta de prohibición de colores arbitrarios.
- **Estado:** ✅ Validado con `npm run lint` y `npm run build` sin errores.

---

## [v1.2.0] - 2026-09-04
### Módulo: BD (Base de Datos v2.0) y Reorganización Modular
- **Alcance:** Actualización a la versión 2.0 del esquema relacional (25 tablas), reorganización de la carpeta `bd/` (`sql/`, `docs/`, `assets/`) y unificación de `docs/`.
- **Hitos Clave:** Catálogo de 4 niveles (`categoria` $\rightarrow$ `subcategorias` $\rightarrow$ `sub_subcategorias` $\rightarrow$ `linea`), variantes por color/tono, combos y 8 ENUMs nativos.
- **Estado:** ✅ DDL validado, orden topológico comprobado y rutas de documentación unificadas.
- 🔗 **Walkthrough Técnico BD v2.0:** [WALKTHROUGH_DATABASE.md](../bd/docs/WALKTHROUGH_DATABASE.md#-versión-20-2026-09-03)

---

## [v1.1.1] - 2026-09-04
### Módulo: 00_SISTEMA y Calidad de Código (Linters)
- **Alcance:** Activación de restricción estricta contra tipos `any` explícitos en TypeScript para backend y frontend.
- **Añadido:**
  - `backend/eslint.config.mjs`: Configuración ESLint 9 + `typescript-eslint` con regla `@typescript-eslint/no-explicit-any: "error"`.
  - `frontend/eslint.config.js`: Configuración ESLint 9 + `typescript-eslint` + `eslint-plugin-vue` con regla `@typescript-eslint/no-explicit-any: "error"`.
  - Scripts `"lint"` y `"lint:fix"` en los `package.json` de backend y frontend.
- **Ajustado:**
  - `backend/src/core/db/connection.ts` y `auth.middleware.ts`: Tipado estricto de variables de error no utilizadas.
- **Estado:** ✅ Regla probada y validada activamente contra violaciones de tipo `any` en ambos entornos.

---

## [v1.1.0] - 2026-09-04
### Módulo: 00_SISTEMA y Core Backend / Infraestructura Docker
- **Alcance:** Implementación de la capa transversal `backend/src/core/` y refactorización de Dockerfiles para compilación limpia a producción.
- **Añadido:**
  - `backend/src/core/db/types.ts`: Tipado Kysely centralizado de las 25 tablas de la base de datos y 8 ENUMs nativos a partir de `schema_pintuclic.sql`.
  - `backend/src/core/db/connection.ts`: Conexión PostgreSQL con Kysely y fallback de entorno por defecto.
  - `backend/src/core/utils/crypto.ts`: Hashing seguro de contraseñas con BCrypt (costo 12, `HU-SEG-01`).
  - `backend/src/core/utils/jwt.ts` y middleware `auth.middleware.ts`: Gestión de sesiones y tokens seguros (`HU-SEG-02`).
  - `backend/src/core/middlewares/errorHandler.ts`: Manejador centralizado de excepciones y validaciones Zod con protección contra exposición de datos sensibles (`HU-SEG-06`).
  - `backend/src/core/middlewares/cors.middleware.ts`: CORS restrictivo.
  - `backend/src/app.routes.ts`: Enrutador global con endpoint `/api/health`.
  - `backend/.dockerignore` y `frontend/.dockerignore`: Prevención de filtración de `node_modules` del host a contenedores Linux.
- **Refactorizado:**
  - `backend/Dockerfile` y `Dockerfile.backend`: Multi-stage build con compilación estricta de TypeScript a JavaScript (`tsc` $\rightarrow$ `dist/`) y runtime mínimo con `node dist/index.js` bajo usuario no-root `USER node`.
  - `frontend/Dockerfile` y `Dockerfile.frontend`: Multi-stage build estandarizado con `npm ci` determinístico y servidor estático Nginx 1.27.
  - `backend/tsconfig.json`: Habilitados `rootDir` y `outDir` para compilación limpia en `/dist`.
- **Estado:** ✅ Compilación limpia con `tsc` y build verificado en backend y frontend.

---

## [v1.0.0] - 2026-09-01
### Módulo: 00_SISTEMA y Transversales (Línea Base del Proyecto)
- **Alcance:** Creación y formalización de la arquitectura documental, técnica y de seguridad de Pintu Clic.
- **Añadido:**
  - Definición del Stack Oficial: TypeScript, Express.js, Kysely, Zod, JWT, BCrypt, SMTP, CORS.
  - Protocolo y reglas obligatorias para Agentes de IA en `AGENTS.md`.
  - Matriz de trazabilidad y dependencias transversales en `MATRIZ_TRAZABILIDAD.md`.
  - Políticas de Unicidad (`HU-CUE-08`), Comprobación en Servidor (`HU-ADM-03`) y Datos Sensibles (`HU-SEG-06`).
  - Plantilla de Reporte de Pruebas QA (`PLANTILLA_REPORTE_QA_MODULO.md` / `.docx`).
  - Guía y Plantilla de Walkthroughs de Implementación (`PLANTILLA_WALKTHROUGH_IMPLEMENTACION.md` / `.docx`).
- **Estado:** ✅ Línea Base Aprobada y Lista para Desarrollo de Módulos.

