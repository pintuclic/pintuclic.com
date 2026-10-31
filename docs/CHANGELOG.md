# Registro de Cambios y Versiones (CHANGELOG) - PINTU CLIC

Todas las modificaciones, nuevas funcionalidades y refactorizaciones del proyecto deben registrarse en este archivo siguiendo el estándar [SemVer](https://semver.org/lang/es/). El número de versión lo calcula `.github/workflows/release.yml` al fusionar en `main` (ver la [Guía de commits y push](./00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_GIT_COMMITS_Y_PUSH.md)).

> **Repositorio oficial:** `pintuclic/pintuclic.com`  
> **Formato de Versiones:** `[vMAJOR.MINOR.PATCH]` - `AAAA-MM-DD`  
> **Stack tecnológico oficial:** Express 5 + Prisma 6 + PostgreSQL + Next.js 15 + React 19 + Tailwind CSS 4 + Zustand 5

## [No publicado] - 2026-10-31 · M09 · estado propio por línea (módulo)
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** 🧾 **Implementación** de lo definido en el PR general de abajo, en M09, M08, M11 y M18 (autorizado).

### Qué hace ahora
- **Cada producto del pedido muestra su estado** en la lista de «Productos» (una sola lista: se fusionó la tarjeta «Revisión de disponibilidad»). El cliente ve verificando disponibilidad, confirmado o rechazado; el personal, el estado propio y qué lee el cliente.
- **Preparada por línea:** al marcar preparada la última línea el pedido pasa solo a «Alistado». M08 ya no ofrece ese paso a mano. Devolver el pedido a preparación vuelve sus líneas a «disponible».
- **Cuando falta un producto:** arriba de la tarjeta de productos aparecen, solo entonces, «Contactar al cliente» (deja constancia en el pedido) y «Cancelar pedido» (pide la cancelación a postventa, con el texto exacto que leerá el cliente y una nota opcional).
- **Correo `orden_cancelada`** al aprobarse cualquier cancelación, con asunto e introducción editables en el panel. M08 conecta por fin su aviso de cancelación a M18.
- La lista de chequeo se puede **consultar en cualquier estado** del pedido; marcar y la hoja siguen limitados a revisión, preparación y preparada.

### Cómo se probó
- Backend y frontend: lint, tipos, cero `any` y `test:contracts` en verde. Suites completas: backend 1242 pruebas y frontend 877 (una de M05 se agota por tiempo bajo carga y pasa sola).
- **PostgreSQL real:** 39 pruebas de integración de M09 y M08, entre ellas el ciclo preparada, el reinicio al devolver, la cancelación con M11 real y el aviso.
- **Pila real con un SMTP falso local** (nada salió de la máquina): 40 comprobaciones con sesiones de administrador, empleado y cliente, incluido el correo recibido con su asunto, motivo, nota y frase de reembolso.
- **Navegador (administrador):** marcar un producto sin stock, aparición de los dos botones, diálogo con la vista previa, solicitud creada y botón «Cancelar pedido» oculto.
- No probado: empleado con permisos parciales en el navegador, la vista del cliente en el navegador, «Contactar al cliente» en pantalla ni el despliegue en el VPS.

---

## [No publicado] - 2026-10-31 · M09 · estado propio por línea (PR general)
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** 🧾 **Cada producto del pedido tiene estado.** Contrato y base de datos; el módulo va en un PR aparte, después de este.

### Qué falla hoy
- El estado de una línea solo existía como un rastro aparte del pedido: se veía en un panel, solo con el pedido en revisión, preparación o preparada, y el cliente no veía nada. Cuando el pedido salía de ahí, el estado de sus productos dejaba de verse.

### Qué cambia (contratos `m09-cumplimiento` y `m08-ordenes`)
- **Estado de línea siempre visible.** Se calcula al leer: la última marca mientras el pedido está en revisión, preparación o preparada, y el estado del pedido (despachada, entregada, cancelada, devuelta) después. Sin columna nueva en `linea_orden`.
- **Preparada por línea (RF-CUM-05-06).** El empleado marca cada línea como preparada y el pedido pasa solo a «preparada» al quedar todas, como ya pasa de revisión a preparación. M08 deja de ofrecer a mano `en_preparacion` → `preparada`. Devolver un pedido preparado vuelve sus líneas a «disponible».
- **El cliente ve cada producto (RF-CUM-01-13):** verificando disponibilidad, confirmado o rechazado, sin autor ni fecha y sin aviso por correo. El personal con `ventas.ver` ve el estado de cada línea en el detalle.
- **Cuando falta un producto (RF-CUM-03-11 y 03-12):** arriba de la tarjeta de productos, y solo si hay un producto sin stock, el empleado puede contactar al cliente (queda registrado en el pedido) y pedir la cancelación. Esa petición crea una solicitud de postventa «iniciada por la tienda» con el motivo armado con los productos que faltan más una nota del empleado; la resuelve M11 como cualquier cancelación.
- **Correo al cliente al cancelarse su pedido:** plantilla nueva `orden_cancelada` en M18, con el código y el motivo, para cualquier cancelación aprobada (también las que pide el cliente). El contrato de M08 ya prometía este correo y nunca existió; además hoy M08 no envía ningún correo de pedido en producción porque su adaptador está sin conectar.
- **Base de datos 4.26:** `preparada` en `enum_estado_verificacion_linea`, `solicitud_postventa.id_empleado_inicia` y el tipo `orden_cancelada` (aditivo e idempotente).
- Contratos de M08, M09, M11 y M18 y specs de M08 (§5), M09 (v3.1) y M11 al día.

### Cómo se probó
- `test:contracts` en verde; los dos contratos cargan, la lista de estados de línea coincide en ambos y el mapa del cliente cubre todos.
- El esquema se aplica dos veces y sobre una base creada con el anterior (ver el PR).

---

## [No publicado] - 2026-10-31
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** 🔐 **Permisos individuales por usuario y panel según los permisos: el módulo.** Entra como la rama `feature/m17-permisos-por-usuario`, sobre el contrato y la base de datos del PR general `chore/m17-permisos-usuario-bd` (que debe fusionarse antes).

### Qué se arregla
- **El personal ya no ve el panel del administrador.** El menú se arma con los permisos de cada persona y el rol se muestra como «Colaborador». Gobernanza y Configuración global solo salen para la cuenta administradora. Quien teclea una sección que no tiene ve un aviso claro (con el título correcto), no una pantalla rota. Un empleado sin ningún acceso ve un mensaje de bienvenida; uno cuyos accesos no alimentan el resumen, la lista de sus secciones. Un cliente que entra a `/admin` vuelve a la tienda.
- **Los permisos se guardan por persona** (`usuario_permiso`) y nunca en un rol: se acaba la escalada en la que dar permisos a una cuenta de cliente se los daba a todos los clientes. Solo se asignan a cuentas con rol `empleado`; sobre un cliente responde como si no existiera y sobre el administrador está bloqueado.
- **Nadie concede lo que no tiene.** Quien no es el administrador solo añade o retira permisos que él mismo posee, y `seguridad.gestionar_permisos` solo lo mueve el administrador (`PERMISO_NO_CONCEDIBLE`).
- **Quién es personal** se decide por el nombre del rol (`administrador` o `empleado`) en `usuario.id_rol`, ya no por «cualquier id distinto de 2 y 3». El listado de colaboradores deja de mostrar clientes y la lista de clientes del administrador deja de ocultar a los del seed.
- **El listado de colaboradores** muestra la fecha de alta real y cuenta los permisos en una sola consulta (antes una por empleado).
- **Nuevo `GET /admin/mis-permisos`** (sesión de personal): lo que puede hacer quien entró; el administrador recibe todo el catálogo.
- **Toca fuera de M17 (autorizado):** M04 (criterio de personal en el inicio de sesión y el perfil) y `core` (`utils/roles.ts`; el `AdminLayout` acepta el rol visible y oculta las opciones del administrador).

### Cómo se probó
- Backend y frontend: lint, tipos, cero `any` y `test:contracts` en verde; suites completas (backend 1130 pruebas, frontend 837). Una prueba de M05 agotó su tiempo bajo carga y pasa sola.
- **PostgreSQL real** (11 pruebas nuevas de integración): rol del empleado nuevo, listado sin clientes, rechazo al asignar a un cliente, una fila suelta de un cliente no concede nada, desactivar y reactivar, permiso inactivo en el catálogo.
- **Pila real** (25 escenarios con sesiones reales): inicio de sesión de administrador, empleado y cliente; `mis-permisos`; 404 al asignar a un cliente; alta de empleado; asignación con permisos implícitos; delegación con `PERMISO_NO_CONCEDIBLE`; revocación en caliente sin volver a iniciar sesión.
- **Navegador:** empleado con solo `catalogo.ver` (cuatro secciones, rol «Colaborador», aviso en una sección ajena con el título correcto) y cliente devuelto a la tienda.
- **No se probó:** el administrador en el navegador (solo por API y pruebas), las demás pantallas con un empleado de permisos parciales y el despliegue real en el VPS.
- **Para el VPS:** la base se recrea (`down -v`). El seed crea el rol `empleado` y la cuenta de demostración `empleado@pintuclic.co`; desactívala o bórrala en producción real, igual que las otras cuentas del seed, cuya contraseña está en el repositorio.

## [No publicado] - 2026-10-30 (b)
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** 🔐 **Permisos individuales por usuario: contrato y base de datos.** Entra como el PR general `chore/m17-permisos-usuario-bd`; el módulo (M17, M04 y el panel) sigue en su propia rama.

### Qué cambia y por qué
- **Contrato M17** con las reglas R-ACC-1 a R-ACC-9: un solo vínculo de rol, personal = administrador o empleado, permisos propios de cada empleado, nadie concede lo que no tiene y el endpoint `GET /admin/mis-permisos` para armar el menú. Nota de alcance en el contrato de M04 (`esAdmin` = personal con acceso al panel).
- **Base de datos v4.25:** tabla `usuario_permiso`, columna `usuario.fecha_creacion`, rol `empleado` en el seed y `usuario_rol` obsoleta. **ADR-013** reemplaza a ADR-006.
- **Motivo:** con el modelo anterior, asignar permisos a una cuenta de cliente los escribía en el rol compartido de todos los clientes, el listado de colaboradores incluía clientes y el personal veía el panel del administrador.

### Cómo se probó
- Esquema y seed aplicados dos veces seguidas sobre PostgreSQL 18 limpio (idempotentes, 98 tablas), y el esquema nuevo sobre una base creada con el anterior (el paso del despliegue), sin errores.
- `prisma validate` y compilación estricta de los dos contratos.
- **No se probó:** el código del módulo, que viene en el PR siguiente.

## [No publicado] - 2026-10-30
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** 📦 **M09 Cumplimiento y preparación: el módulo completo.** Entra como la rama `feature/m09-cumplimiento`, sobre el contrato y la base de datos ya fusionados.

### Módulo M09 — Revisión de disponibilidad (HU-CUM-01, 03, 05 y 06)
- **Una lista de chequeo dentro del detalle del pedido.** Cada producto se marca como disponible, consiguiendo stock o no disponible, y cada toque se guarda al instante. Hay un botón para marcar todos como disponibles. Sin pantallas ni pasos extra para el empleado.
- **El pedido pasa solo a preparación** cuando todos los productos quedan disponibles, en la misma operación y con el empleado que marcó el último como autor. Corregir una marca después no lo devuelve.
- **Rastro completo:** cada marca guarda quién y cuándo, y una corrección conserva las anteriores. La pantalla muestra quién marcó y cuántos cambios hubo.
- **Pedidos detenidos:** una lista aparte, enlazada desde la bandeja de pedidos, con qué productos retienen cada pedido y en qué estado están, de los que más llevan esperando a los más recientes.
- **Hoja de preparación imprimible** (sin precios, descuentos ni datos de pago ni del cliente), con la base de las líneas entonadas y la fecha y el estado del pedido al generarla. Se imprime o se guarda como PDF desde el navegador.
- **Todo exige el permiso de gestión de pedidos**, también las consultas. Quien no lo tiene, o entra con una cuenta de cliente, recibe el mismo 404 que un pedido inexistente.
- Se monta en `/api/v1/cumplimiento` y en las páginas `/admin/pedidos/retenidas` y `/admin/pedidos/[codigo]/hoja`.

### M08 Pedidos (se tocan tres cosas, avisado)
- **Se quita el paso manual de revisión a preparación** (contrato, sus dos copias, reglas, pruebas y §5 de la spec). Pedirlo a mano responde 409 y el panel «Cambiar estado» ya no aparece en revisión: lo hace M09. Ni el administrador puede saltarse la revisión.
- Se añade `cambiarEstadoPorCumplimiento` (como M11 con la postventa) y se exporta la guarda de «solo personal».
- El detalle del pedido monta el panel y el enlace a la hoja, y la bandeja enlaza a los pedidos detenidos.

### Cómo se probó
- Backend: lint, tipos, cero `any` y toda la suite en verde; pruebas unitarias, HTTP y de integración contra PostgreSQL real (dos empleados confirmando la última línea a la vez avanzan el pedido una sola vez).
- Frontend: lint, tipos, accesibilidad, cero `any`, toda la suite y `build` en verde.
- Pila real con sesión de administrador y de cliente, y navegador: marcar de a poco, avance automático, corrección, hoja, pedidos detenidos y móvil sin desbordes.
- **No se probó:** la impresión real (solo que existe la regla de impresión y el botón); las pruebas de integración en CI, que se omiten sin base de datos.

## [No publicado] - 2026-10-29 (c)
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** 📋 **M09 Cumplimiento y preparación: contrato y base de datos.** Entra como el PR general `chore/m09-contrato-bd`; el módulo sigue en su propia rama.

### Módulo M09 — Contrato (HU-CUM-01, 03, 05 y 06)
- **Es una mejora de M08, no un módulo pesado (PO).** Una lista de chequeo por línea en el detalle del pedido, el paso automático a preparación y la hoja que se imprime para la bodega. Nada más, para no cargar al empleado al confirmar el envío.
- **Tres marcas por línea:** `disponible`, `consiguiendo_stock` (hay parte de las unidades o se espera el resto) y `no_disponible`; sin marca, la línea está pendiente. La línea solo pasa a `disponible` con todas sus unidades y no se cuentan unidades.
- **Avance automático:** al quedar todas las líneas `disponible`, la orden pasa sola de revisión de disponibilidad a preparación. Se quita el paso manual de M08 (se hará con el módulo), de modo que nadie puede saltarse la revisión, tampoco el administrador.
- **Todo el módulo exige `ventas.gestionar`**, también las consultas (RF-CUM-01-10).
- **Hoja de preparación sin importes, descuentos ni datos de pago ni del cliente**; el esquema es estricto y una prueba lo comprueba.
- **Preparación (HU-CUM-05):** sin pantallas ni tabla propias; es el cambio de estado de M08 con su historial.
- **La spec `M09_ESPECIFICACION_CUMPLIMIENTO.md` se ajusta** (tres marcas en vez de parcial y nula, sin consecución) y se le quitan los requisitos de M14, que venían en el mismo documento. Donde difiera del contrato, manda el contrato.

### Base de datos — esquema 4.24
- Tabla `verificacion_linea_orden` de solo inserción (con disparador que rechaza UPDATE y DELETE) y ENUM `enum_estado_verificacion_linea`. Detalle en `bd/docs/CHANGELOG_DATABASE.md` (v3.25).
- Se ejecutó el DDL dos veces seguidas y el seed sobre un PostgreSQL desechable (97 tablas, sin errores), y se probó la tabla: acepta las tres marcas, rechaza `parcial`, `pendiente`, filas sin autor, líneas inexistentes y cualquier UPDATE o DELETE. Un ciclo de escritura y lectura con Prisma confirma que el modelo coincide con la tabla.

## [No publicado] - 2026-10-29 (b)
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** 🏠 **Simulador de color: la pestaña «En tu espacio» deja de ser un aviso.** El color elegido en la paleta se pinta ahora sobre las paredes de seis ambientes. Entra como la rama `feature/m03-simulador-color`.

### Módulo M03 — Simulador de color (HU-ASE-03)
- **Seis puntos de vista (S5):** sala de frente, sala desde la esquina, alcoba, comedor, estudio y fachada. El PO no especificó cuántos; se construyeron los seis del supuesto del contrato (Q11).
- **Ilustraciones SVG dibujadas por código (S3).** Solo la pared lleva el color: el piso, los muebles, las ventanas y los cuadros son tonos fijos. La luz y la sombra son capas blancas y negras de poca opacidad sobre la pared, de modo que un tono claro sigue viéndose claro y uno oscuro, oscuro. Se probó con amarillo, azul profundo, blanco hueso y verde salvia.
- **Es una ilustración, no la fotografía del mockup de Pintuco (S4, Q12).** Queda dicho aquí para que el PO lo valide al verlo.
- **Cambiar de color o de ambiente no toca la red (S10).** Se comprobó en el navegador: ninguna petición del simulador. Funciona con el servicio de IA caído.
- **Selector de ambiente (S6):** un grupo de radio de verdad, con una miniatura por vista ya pintada con el color elegido, el nombre debajo y una marca de check en la activa, para que se distinga sin depender del color del borde. Se maneja con las flechas del teclado.
- **El color siempre identificado (S8):** nombre y código sobre la imagen, con texto negro o blanco según el contraste.
- **Aviso fijo de que es una referencia (S7)** y leyenda «Así se vería …, aproximadamente».
- **Accesibilidad (S9):** cada dibujo grande lleva su texto («Sala de frente…, con las paredes pintadas en Rojo Coral»); las miniaturas, que ya tienen su nombre visible, se ocultan a los lectores de pantalla; la transición del color se apaga con «reducir movimiento».
- **Sin color elegido, o con un valor que no es `#RRGGBB`, no dibuja nada** salvo la invitación a elegir uno (S2, S9).

### Defectos encontrados probando en el navegador
- **La fila de miniaturas desbordaba la página en móvil.** Dos causas, las dos mías: un `<fieldset>` mide por defecto lo que mide su contenido y se estiraba hasta los 616 px, y los radios ocultos con `sr-only` son absolutos, así que el recorte de la fila desplazable no los alcanzaba y ensanchaban todo el documento. Se corrigió con `min-w-0` y haciendo `relative` cada etiqueta; ahora `html` y `body` miden lo mismo.
- **La ilustración llenaba la pantalla de lado a lado** (más de 800 px de alto) y empujaba el selector fuera de la vista. Se limita su ancho.

### M01 Catálogo (se tocan tres cosas, avisado)
- `CombinadorColores.tsx` monta `SimuladorColor` donde estaba `AmbientesColor` y le pasa el color elegido, tal como M01 · P6 lo dejó previsto. **`AmbientesColor.tsx` desaparece**, con su bloque de prueba, y la prueba de las pestañas ya no dice «reservada».
- El contrato de la paleta (`P6`) lleva una nota de que M03 ya lo reemplazó.

## [No publicado] - 2026-10-29
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** 🎨 **Contrato del simulador de color (HU-ASE-03) y PR general.** El simulador pone el color elegido en la paleta sobre las paredes de unos ambientes de muestra. Aquí solo entra el contrato y lo compartido; el simulador se construye en su propia rama. Entra como la rama `chore/m03-contrato-simulador`.

### Módulo M03 — Simulador de color (contrato)
- **Se desbloquea HU-ASE-03.** La spec la daba por bloqueada por la elección del servicio de IA, ya resuelta. Estaba en «Historias sin requisitos derivados»: no tenía ni un RF ni un CA, así que todo lo que define su conducta lo pone el contrato (reglas S1-S11).
- **Los ambientes son ilustraciones SVG dibujadas por código (S3).** Sin fotos ni máscaras, y por tanto sin depender de nadie que las produzca. El color se pinta en el navegador: cambiar de color es cambiar un atributo, sin red ni servidor. **Consecuencia que se dice de entrada (S4, Q12):** es una ilustración, no la fotografía del mockup de Pintuco; el PO valida el aspecto al verlo.
- **No añade endpoints, tablas ni permisos, y no usa la IA (S10).** Funciona con el servicio de IA caído.
- **Sin color elegido, el simulador no dibuja nada** salvo la invitación a elegir uno (S2). Ocupa la pestaña «En tu espacio» que M01 dejó reservada (M01 · P6).
- **HU-ASE-04 y HU-ASE-07 quedan fuera**, como estaban.

### Archivos compartidos
- **`core/utils/color-muestra.ts`** pasa a tener `razonDeContraste` y `colorDeTexto`, que vivían en `m01-catalogo/services/contraste`. M03 no puede importar servicios de M01 y duplicar el cálculo sería tener dos verdades sobre si un texto se lee. **M01 no cambia de conducta:** su servicio los vuelve a exportar desde el core y su prueba existente pasa sin tocarla.
- Prueba nueva en el core que recorre 4 913 colores del cubo RGB y comprueba que el texto elegido siempre se lee (≥ 4,5:1).
- La línea que monta el simulador en la pestaña de M01 **no entra aquí**: importa un componente que aún no existe. Viaja con el simulador.

## [No publicado] - 2026-10-28 (b)
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** ✂️ **La calculadora se queda con una sola cosa que hacer.** Decisiones del Product Owner tras revisar la pantalla. Entra como la rama `feature/m03-calculadora-ajustes`.

### Módulo M03 — Calculadora (HU-ASE-02)
- **El resultado deja de decir «(Para N manos)» (K9).** Las manos son una característica del producto y su sitio es la ficha técnica, que es donde el PO está cargando el dato. El supuesto **se sigue aplicando** igual —ficha, configuración del panel y 2 por defecto—, pero se enuncia una sola vez y en su sitio, en lugar de repetirlo en dos lugares de la misma página con cifras que no coincidían.
- **Se retira la pestaña «Cuánto rinde» (K16).** No aparece en el mockup (pág. 10), que enseña una sola calculadora. **El cálculo no se borra:** la regla K4, el endpoint y `calcularCobertura` siguen ahí, así que devolver la pestaña es volver a pintarla, no rehacer el camino. Se deja escrito en el contrato en vez de borrar K4, porque la regla sigue siendo correcta: cambió qué se enseña, no cómo se calcula.

### Core
- **`Modal` se dibuja con un portal** (va en su propio PR, `chore/core-modal-portal`). Dentro de un ancestro `position: sticky` el modal quedaba encerrado en su contexto de apilamiento y se pintaba bajo la cabecera fija: el velo gris se cortaba, el header no se oscurecía y el diálogo salía recortado. Afecta a todos los modales del sitio.

## [No publicado] - 2026-10-28
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** 💬 **El asistente pasa a ser una burbuja flotante.** Deja de vivir dentro de una pestaña de `/asesoria` y acompaña a la persona por toda la tienda. Entra como la rama `feature/m03-asistente-flotante`.

### Módulo M03 — Asistente (HU-ASE-05)
- **El botón redondo queda fijo en pantalla (H9).** El panel se monta en el armazón público, no en una página, así que sigue ahí al cambiar de vista y **la conversación sobrevive a la navegación**: se puede preguntar por un producto, ir a verlo y seguir la charla. Recargar sí la borra, que es lo que manda H1 —no se guarda en ninguna parte.
- **Pantalla según el mockup `VISTAS.pdf` (pág. 11):** cabecera azul con el estado «En línea», burbujas grises para el asistente y azules para la persona, hora en cada una, atajos en pastilla, y la barra de escribir abajo.
- **No es un diálogo modal a propósito.** No atrapa el foco ni bloquea el fondo: la gracia es poder mirar un producto mientras se pregunta por él. Escape lo cierra y el foco vuelve al botón.
- **Dos atajos del mockup no mandan nada al chat (H10).** «Consultar mi pedido» y «Ver promociones» piden justo lo que H4 le prohíbe al modelo —datos de órdenes, precios y descuentos—, así que **enlazan** a `/perfil/pedidos` y a `/ofertas`, que es donde ese dato sí está. Ofrecer un atajo que la IA tendría que rechazar es enseñar un botón roto. Los otros tres sí escriben en el chat.
- **Se quita el segundo chat.** La pestaña «Preguntar al asistente» de `/asesoria` ya no dibuja su propia conversación: abre la flotante. Dos implementaciones del mismo chat acaban separándose, y además la conversación se perdía al salir de la pestaña. `AsistenteView.tsx` desaparece.
- **El botón lleva un aro blanco** porque el pie de página es del mismo azul marino y sin él el círculo se fundía con el fondo. Se vio probando en navegador, no lo reportó nadie.
- **Adjuntar archivos no se implementa.** El clip del mockup no tiene respaldo en el contrato: no hay subida de archivos en M03.

### Archivos compartidos
- **`src/app/(public)/layout.tsx`**: monta `<AsistenteFlotante />` junto al panel del carrito. Una línea; es la única forma de que el botón sobreviva al cambio de vista.

## [No publicado] - 2026-10-27
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** 📐 **La calculadora deja de pedir los metros cuadrados.** Ahora se eligen la superficie y sus medidas, y el área se calcula sola. Entra como la rama `feature/m03-calculadora-medidas`.

### Módulo M03 — Calculadora (HU-ASE-02)
- **El área ya no se escribe (K12).** Quien llega a la calculadora sabe que su pared mide 5 × 2,5, no que son 25 m²: pedirle el área le obligaba a hacer a mano justo la multiplicación que venía a buscar. La pantalla sigue el mockup de `VISTAS.pdf` (pág. 10) y reparte el trabajo en tres bloques: qué vas a pintar, las medidas, y el resultado. El área total se actualiza mientras se escribe.
- **Cuatro superficies: paredes, techos, puertas y muebles (K13).** Solo cambian el vocabulario, nunca el cálculo: un techo se mide de ancho y **largo**, una pared de ancho y **alto**, y el contador se nombra según la pieza («Cantidad de techos iguales»). **No se inventaron coeficientes** por superficie —ni «la puerta se pinta por las dos caras», ni mermas por textura—: el catálogo no registra ese dato.
- **El área se calcula con enteros escalados**, igual que el backend (K5): multiplicar en coma flotante hacía que 1,1 × 2,2 diera 2,4200000000000004, que el servidor habría rechazado por tener más de dos decimales. Un solo redondeo al final.
- **El resultado se retira si cambian los datos (K14).** Antes, al cambiar una medida después de calcular, la cifra de al lado se quedaba en pantalla sin corresponder a lo escrito. Una cifra que ya no corresponde engaña más que no mostrar ninguna.
- **Las manos dejan de preguntarse (K9).** Decisión del Product Owner, que **incumple RF-ASE-02-06 a propósito**; queda escrito en el contrato y no borrado, porque el requisito sigue en la spec. Las resuelve el servidor en `manosAplicadas` —ficha del producto, configuración del panel y, si no hay ninguna, 2— y la pantalla las muestra junto al resultado («Para 2 manos»), igual que el mockup: el supuesto se ve, no se esconde. **Efecto conocido:** quien dé una sola mano verá el doble de pintura de la que necesita.
- La API **no cambia** su forma de entrada: sigue recibiendo `area` en m² y `manos`. Lo que cambia es que las manos las pone el servidor, no la persona.

### Base de datos (seed)
- **`configuracion_asesoria.manos_por_defecto` pasa de NULL a 2.** Nació en NULL justamente porque la regla prohibía suponer las manos; al quitarlas de la pantalla tiene que haber un número que aplicar. Se añade un `UPDATE ... WHERE manos_por_defecto IS NULL` para las instalaciones ya sembradas, condicionado a propósito: si alguien eligió un valor en el panel, se respeta.
- **Aviso:** hoy, en el catálogo real, **ningún producto tiene `ficha_recubrimiento.manos`** y la configuración está en NULL, así que los cinco productos calculables caen en el valor por defecto. Llenar las manos por producto es de M01.

## [No publicado] - 2026-10-26
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** 🧩 **PR general de M03 (Asesoría y asistencia).** Los archivos compartidos que el módulo necesita, antes de construirlo: base de datos, permisos, el aviso de M18 y el registro de auditoría de M20. Sin código de módulo todavía. Entra como la rama `chore/m03-asesoria-bd`.

### Contrato
- **`contracts/m03-asesoria.contract.ts`**: la especificación de M03. Cubre HU-ASE-01 (búsqueda asistida), HU-ASE-02 (calculadora), HU-ASE-05 (asistente) y HU-ASE-06 (degradación de la IA). HU-ASE-03, 04 y 07 quedan fuera: las dos primeras están bloqueadas y la tercera se retiró.
- **El cuestionario se construye en los dos modos** y el Product Owner decide con los dos a la vista: `fijo` (preguntas administrables en la base) y `asistido` (las propone Gemini sobre un vocabulario cerrado del catálogo). Comparten la traducción a filtros, la ruta al catálogo y la pantalla de resultado, así que elegir uno al final no obliga a rehacer nada.
- **M03 toma el catálogo como está (D11).** No agrega categorías ni atributos: lo que M01 no tiene, M03 no lo pregunta. Por eso se omiten la opción «Zona húmeda» y la pregunta «¿Qué uso tendrá el espacio?», y **CA-ASE-01-04 (pinturas de tráfico) se declara no cumplible**, porque esa subcategoría no existe y no se sustituye por una parecida. Decide el Product Owner.

### Base de datos (esquema 4.18, v3.18 del changelog de BD)
- **Seis tablas nuevas:** el cuestionario administrable (`pregunta_asesoria`, `opcion_asesoria`, `efecto_opcion_asesoria`), la configuración de fila única (`configuracion_asesoria`), los incidentes de IA (`incidente_ia`) y el registro de auditoría de M20 (`registro_auditoria`).
- **Seed:** permisos `asesoria.ver` y `asesoria.editar`, la configuración en modo `fijo` y el cuestionario de partida con 5 preguntas, 13 opciones y 13 efectos, todos apuntando a valores que existen en el catálogo.

### Módulo M20 — Seguridad y auditoría
- **HU-SEG-04 deja de estar aplazada en su parte de escritura:** `registro_auditoria` y `registrarAccion` en `AuditoriaPort`, con adaptador persistente. La consulta por el administrador (RF-SEG-04-05) sigue pendiente y es de M20.
- **La tabla es inmutable con dos barreras:** la revocación de permisos **y** un disparador. Se comprobó que la revocación sola no basta, porque un superusuario la atraviesa; el disparador rechaza `UPDATE`, `DELETE` y `TRUNCATE` sea quien sea, como pide RF-SEG-04-04 («incluso por parte del administrador»).
- `registrarAccion` es **opcional** en el puerto, igual que `notificarCambioCorreoConfirmado` de M18: exigirlo obligaría a tocar los dobles de prueba de M13, M14 y M16 sin necesidad.

### Módulo M18 — Notificaciones
- Tipo de comunicación **`alerta_servicio_ia`** con su plantilla y su previsualización, para avisar al administrador cuando la IA acumula los fallos configurados.

### Módulo M17 — Permisos
- Permisos **`asesoria.ver`** y **`asesoria.editar`** en el catálogo maestro, con el área funcional `asesoria` y la dependencia `editar → ver` en el backend y en el formulario.

### Verificación
- Backend **593/593** y frontend **422/422**; contratos **68/68**; ESLint, `tsc --noEmit` y `check:no-any` en verde en los dos lados.
- Comprobado contra un **PostgreSQL 18 real y desechable**: el DDL y el seed corren limpios dos veces seguidas sobre la misma base y dejan 84 tablas; los 13 efectos resuelven a valores activos del catálogo; las restricciones rechazan lo que deben; y con el cliente de Prisma se lee el cuestionario, se registra y purga un incidente, se escribe en la auditoría y se rechazan el `UPDATE` y el `DELETE` sobre ella.
- `prisma migrate diff` no reporta ninguna diferencia entre el DDL y Prisma en las tablas nuevas. La deriva que sí reporta en otras tablas es **anterior a este cambio** y queda igual.

---

## [v0.17.3] - 2026-10-25
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** 🧭 **Una sola página de ayuda.** `/faq` y `/centro-de-ayuda` mostraban la misma vista, así que el contacto con el equipo que aporta M15 quedaba escondido debajo de una pantalla entera de preguntas frecuentes y el ítem "¿Necesitas ayuda?" de la franja superior llevaba a la página que no lo tenía. Entra como la rama `fix/centro-de-ayuda-unificado`.

### Centro de ayuda
- **`/faq` redirige a `/centro-de-ayuda`** con un 308 permanente (`next.config.ts`); se elimina la ruta duplicada. Los enlaces ya compartidos siguen funcionando.
- **La página la abre el contacto:** cabecera propia (`<h1>Centro de ayuda</h1>` y ruta de navegación), el formulario, el horario y el botón de WhatsApp de M15, y debajo las preguntas frecuentes de M16 con un atajo `Ver preguntas frecuentes` hacia `#preguntas-frecuentes`.
- **Navegación:** la franja superior y el pie llevan a `/centro-de-ayuda`; los dos ítems del menú ("Ayuda" y "FAQ") se funden en **"Ayuda y FAQ"**, y "Preguntas frecuentes" del pie apunta al ancla de la sección.
- **Jerarquía de encabezados:** la página tiene un solo `h1`; cada módulo aporta un `h2` y lo de dentro baja a `h3`. Antes las dos rutas repetían el mismo `h1` "Preguntas Frecuentes (FAQ)".

### Módulo M16 — Contenido
- `CentroAyudaFaqView` deja de ser una página completa y pasa a ser la sección `#preguntas-frecuentes`: sin ruta de navegación, sin distintivo y sin `min-h-[70vh]`, que era lo que empujaba el contacto fuera de la primera pantalla.

### Módulo M15 — Atención al cliente
- `ContactoYHorarioView` pone el formulario a todo el ancho y baja el horario y el canal directo a dos tarjetas: sin sesión el formulario se reduce a un aviso y la columna lateral fija dejaba un hueco de media pantalla.
- Textos al día ahora que la sección va primero: "Escríbenos" en lugar de "¿No encontraste tu respuesta?".

### Verificación
- Frontend **259/259**, ESLint, `lint:a11y`, `tsc --noEmit` y `check:no-any` en verde; contratos **48/48**.
- Comprobado en el navegador contra el backend de dev: `/faq` responde **308 → /centro-de-ayuda**, los cuatro `GET` públicos responden 200, el ancla existe, hay un solo `h1` y no hay desborde horizontal a 390 px.
- **Nota:** este archivo venía sin registrar desde la v0.7.0 (las etiquetas publicadas llegan a la v0.17.2). Aquí solo se documenta este cambio; el hueco de versiones sigue pendiente.

---

## [v0.7.0] - 2026-10-23
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** 🛡️ **QA combinado de M20, M17 y M04 y activación de empleados por correo.** Se corrigen los hallazgos de seguridad y de conformidad con los contratos de los tres módulos, y el alta de colaboradores deja de usar una clave temporal visible para el administrador. Entra a `main` como cuatro ramas: `feature/m04-cuentas`, `fix/core-rutas-publicas-y-sesion`, `feature/m17-permisos` y `fix/core-parametros-auth`.

### Módulo M04 — Cuentas, Autenticación y Perfil
- **Google (`HU-CUE-02`, aplazada):** las rutas `/cuentas/oauth/google*` solo se montan con un adaptador real; el de pruebas queda fuera de producción. Se exige correo verificado por Google y el tipo de sesión se calcula igual que en el login.
- **Recuperación de contraseña:** el código queda atado al usuario del enlace, se compara el hash del valor aleatorio y en la base no se guarda el valor plano. Cualquier fallo responde el mismo `TOKEN_INVALIDO_O_EXPIRADO`.
- **Anti-enumeración (RF-SEG-06-06):** el login valida la contraseña antes de revelar el estado de la cuenta y ya no devuelve los intentos restantes; la recuperación no espera al SMTP, que delataba por latencia si el correo existía.
- **Secretos y aleatoriedad:** `JWT_SECRET` es obligatorio (mínimo 32 caracteres, sin valor por defecto en código) y los OTP se generan con `crypto.randomInt`.
- **Sesión (RF-SEG-02-02):** la cookie `pc_sid` vive lo mismo que la ventana de inactividad de la sesión (admin 30 min, cliente 30 días); antes caducaba a la hora.
- **Parámetros de autenticación (`HU-ADM-07`):** bloqueo por intentos, vigencia y reintentos del OTP y vigencia del enlace de recuperación se leen de la configuración de M17, con los valores del seed como respaldo.
- **NIT (decisión del PO, 2026-10-23):** todo NIT lleva guion antes del dígito de verificación; `9005556661` se rechaza en contrato, backend y frontend.
- **Contrato fiel al frontend:** `idVerificacion` y `tiempoExpiracionSegundos` en registro y reenvío del OTP, respuesta de login con `tokenCambio`, respuestas del cambio de correo, listados paginados del panel y "mis solicitudes"; `details` admite números o `null`. Los códigos de error siguen el contrato y se añade `DATOS_INVALIDOS`.
- **Corregido:** "Reenviar código" del registro respondía siempre 400 porque el backend pedía `correo` y el frontend envía `idVerificacion`.
- **Perfil:** la contraseña errónea al cambiar la clave, el correo o desactivar la cuenta responde `CONTRASENA_INCORRECTA` y el frontend muestra "La contraseña actual no es correcta."; el login conserva el mensaje genérico.
- **Primer acceso:** el `tokenCambio` es de un solo uso y exige cuenta activa; se verifica la clave temporal y la nueva debe ser distinta.
- **Activación de empleados:** `emitirEnlaceActivacion` envía un enlace de un solo uso (correo de bienvenida y página `/activar-cuenta`); uno nuevo invalida los anteriores.

### Módulo M17 — Administración, Empleados y Permisos
- **Administrador principal:** se identifica solo como la cuenta activa con rol `administrador`, sin respaldos por correo ni por primer usuario.
- **Alta de empleados (`HU-ADM-01`):** ya no se genera ni se devuelve una clave temporal; el empleado define su contraseña con el enlace de activación y queda con `cambio_contrasena_pendiente` hasta hacerlo. `POST /admin/empleados/:id/reenviar-activacion` (permiso `personal.editar`) emite un enlace nuevo.
- **Corregido:** el modal de alta buscaba la clave en `meta.credencialTemporalGenerada`, un campo que el backend nunca envió, así que el administrador nunca la veía y el empleado no podía entrar.
- **Nuevo parámetro:** `auth.vigencia_enlace_activacion_horas` (72 h por defecto, rango 1–168), editable en Configuración.
- **Gobernanza:** los tokens de sustitución de correo del admin se guardan en `codigo_verificacion` como hash SHA-256 (antes vivían en memoria) y el servicio deja de usar `prisma` directamente.
- **⚠️ Cambio de contrato:** `crearEmpleadoOutputSchema` pierde `credencialTemporal` y gana `activacionEnviada`; `resumenEmpleadoSchema` gana `primerAccesoPendiente`.

### Archivos compartidos
- **`app.routes.ts`:** el aviso de privacidad (`GET /seguridad/privacidad/aviso-vigente`) y la confirmación de correo del admin vuelven a ser públicos (respondían 401); conecta los parámetros de M17 con M04 y la activación de empleados de M04 con M17.
- **Middleware de sesión:** renueva la cookie con la expiración deslizante de la sesión.
- **`AGENTS.md`:** sin permiso se responde el 404 opaco `RECURSO_NO_DISPONIBLE` (ADR-003).
- **Seed:** fila `id_parametro = 11` para `auth.vigencia_enlace_activacion_horas` (`ON CONFLICT DO NOTHING`).
- **Verificación:** backend **255/255**, frontend **144/144**, ESLint, `lint:a11y`, `tsc`, `check:no-any` y contratos en verde sobre la integración de las cuatro ramas. Prueba de punta a punta con PostgreSQL y SMTP locales: alta, correo, reenvío, activación, inicio de sesión, vigencia configurable y permisos, **28/28**.
- **Despliegue:** primer despliegue automático con el pipeline de v0.6.9. En el VPS la fila del parámetro nuevo se agrega a mano (el seed no se re-ejecuta sobre una base existente).
- **Pendiente:** DevOps debe ajustar `02_cd_deploy.yml` (ver v0.6.9); pruebas E2E y de carga (k6) con evidencia; auditoría de decisiones (`HU-SEG-04`) sigue bloqueada.

---

## [v0.6.9] - 2026-10-23
- **Autor:** one-centavo (Gustavo Cabrera) · PR #12
- **Hito:** 🚀 **Despliegue continuo al VPS.** Nuevo workflow `.github/workflows/02_cd_deploy.yml`: en cada push a `main` entra por SSH (`appleboy/ssh-action`) a la ruta de `DEPLOY_PATH`, ejecuta `git reset --hard origin/main` y `docker compose -f docker-compose.yml up -d --build --remove-orphans`, muestra el estado y limpia imágenes huérfanas. En el primer despliegue clona el repo, crea el `.env` desde `.env.example` y se detiene hasta que se completen las credenciales. Documentado en `docs/00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_DESPLIEGUE.md`.
- **Conocido:** al pasar `-f docker-compose.yml`, Docker no carga el `docker-compose.override.yml` del VPS que une los contenedores a `proxy-network`; tras cada despliegue el dominio responde 502 hasta ejecutar `docker compose up -d` sin `-f`. Ajuste a cargo de DevOps.

---

## [v0.6.8] - 2026-10-23
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** 🎨 **Panel administrativo alineado al diseño oficial.** `AdminLayout`, `AdminPageHeader` y `AdminStatCard` pasan al Core Kit (`core/components`) y los usan todas las páginas de `/admin`; barra lateral a altura completa con el logo oficial y la tarjeta inferior del mockup.
- **Corregido:** apilamiento vertical en `Button` y en el bloque de perfil del header administrativo.
- **Verificación:** pruebas de renderizado nuevas para los tres componentes.

---

## [v0.6.7] - 2026-10-23
- **Autor:** Luices08 · PR #11
- **Hito:** 🔁 **Flujo de trabajo ágil.** Se retira el flujo SDLC (gates, firmas, roles de agente, `current_state.json` y documentos de proceso por módulo en `.sdlc/`). Lo que usa el CI se conserva y se reubica: verificadores en `tooling/`, contratos Zod en `contracts/` y ADR en `docs/adrs/`.
- **Alcance:** `AGENTS.md`, `CLAUDE.md` y `GEMINI.md` reescritos (rama por módulo, PR pequeño aparte para archivos compartidos, versión calculada por `release.yml`); el CI deja de ejecutar `verify:state`; se alinean la guía de commits y la arquitectura general.

---

## [v0.6.6] - 2026-10-23
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** 🧭 **Las cuentas administrativas entran al panel `/admin`.** El login y el perfil devuelven `esAdmin`, calculado con `esUsuarioAdministrativo` (rol directo o asignado, excluidos clientes y empresas); el frontend redirige a `/admin` al iniciar sesión y el header y el `AdminLayout` muestran la sesión.
- **Alcance:** backend y frontend de M04, contrato de M04, header del Core y layout de M17. Con pruebas en `auth-cuentas.service` y en los componentes de M04.

---

## [v0.6.5] - 2026-10-23
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** ✉️ **Correo real por SMTP.** M04 usa `SmtpNotificacionesAdapter` (nodemailer, elegido según el entorno) para el OTP de registro, el enlace de recuperación, el código de cambio de correo y el dictamen de empresa, y avisa al correo anterior cuando se confirma un cambio (CA-CUE-06-02, pendiente desde v0.6.1; falta volver a mostrar ese aviso en el frontend). M17 envía por SMTP el token de sustitución del correo del admin y una alerta al correo actual.
- **Robustez:** un fallo del transporte SMTP no cambia la respuesta de la recuperación (RF-SEG-06-06).
- **DevOps:** `SMTP_HOST` por defecto pasa a `smtp.gmail.com` en `docker-compose.yml`.

---

## [v0.6.4] - 2026-10-23
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** 🔧 **`DATABASE_URL` apunta a `pintuclic-db`.** En la red compartida `proxy-network` el nombre genérico `db` colisionaba con servicios de otros proyectos del VPS.

---

## [v0.6.3] - 2026-10-22
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** 🩺 **Healthcheck del backend y SQL inicial.** El healthcheck acepta cualquier respuesta menor que 500 (la API no tiene `/api/health` y el 404 marcaba el contenedor como no saludable) y `bd/sql` se monta en `docker-entrypoint-initdb.d` para crear el esquema y el seed en una base nueva.

---

## [v0.6.2] - 2026-10-22
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** 📦 **Lockfile del frontend sincronizado.** `frontend/package-lock.json` fija `lucide-react` `^1.58.0` (resuelve 1.61.0), igual que `package.json`. Cierra el pendiente de DevOps de v0.6.0.

---

## [v0.6.1] - 2026-10-22
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** 🔎 **Validación real de M04 contra PostgreSQL y correcciones.** Todas las HU de M04 (salvo `HU-CUE-02`, aplazada) recorridas en el navegador contra el backend real y la base `pintuclic_dev` (esquema v4.2 + seed): registro con OTP, primer acceso, recuperación con token de un solo uso, cambio de contraseña que cierra todas las sesiones, cambio de correo, direcciones con ubicación del dispositivo, ascenso y dictamen, renovación de NIT con un RUT real de 2 MB y descarga idéntica byte a byte, desactivación y 404 opaco sin permiso.
- **Correcciones (autorizadas por el Director):**
  - **Backend · perfil fuera de contrato:** `GET` y `PUT /cuentas/perfil` respondían `tipoUsuario`/`cuentaEmpresa` sin `cambioContrasenaPendiente`; ahora cumplen `perfilUsuarioResponseSchema` (una cuenta empresa se mostraba como personal).
  - **Backend · unicidad del NIT (RN-CUE-14):** `900.555.666-1` evadía el duplicado de `900555666-1`. `nitSchema` normaliza (sin espacios ni puntos) en backend, contrato rector y frontend.
  - **Frontend:** se retiró la promesa de aviso al correo anterior, que el backend no emite (CA-CUE-06-02 queda pendiente con M18).
- **Verificación:** backend 205/205 (+6), frontend 136/136, `tsc`/ESLint/`check:no-any` limpios, contratos validados. Walkthrough: `docs/walkthroughs/M04/walkthrough_v0.6.1_M04_validacion_real_y_correcciones_backend.md`.
- **Pendiente:** el Product Owner debe fijar si un NIT sin guion equivale al mismo con guion; el correo real (OTP, enlaces y avisos) depende de M18.

---

## [v0.6.0] - 2026-10-22
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** 🔐 **Frontend de M04 — Cuentas, Autenticación y Perfil.** Registro de persona natural con OTP y de empresa según `VISTAS.pdf` págs. 3–6; login, recuperación, restablecimiento y primer acceso derivados del mismo modal; "Mi cuenta" (`/perfil`: datos, contraseña, correo con OTP, direcciones, ascenso a empresa, renovación de NIT con RUT, cierre de sesión y desactivación) y panel `/admin/empresas` (dictamen de registros, ascensos y renovaciones con descarga del RUT). Cubre `HU-CUE-01` y `03` a `10`; `HU-CUE-02` (Google) aplazada con el botón deshabilitado.
- **✅ Estado:** **Gate 3B aprobado** por el Director Humano ("apruebo tu frontend"). Verificado con una API simulada en el navegador: **aún no se ha probado contra el backend real**; la integración (incluida la geolocalización de `CA-CUE-07-04`) se hará al enlazarlo.

### Módulo M04 — Frontend
- **Acceso en modal:** rutas interceptadas `@modal/(.)login` y `(.)registro` sobre cualquier página pública, con su versión de página completa para enlace directo y para la redirección del middleware (`?destino=`, validado contra redirecciones abiertas y bucles).
- **Sesión (ADR-005):** `SesionBootstrap` hidrata `useAuthStore` con `GET /cuentas/perfil`; el header muestra el nombre y lleva a `/perfil`. Ningún token en el cliente.
- **RUT:** validación previa de tipo y tamaño (5 MB exactos sí, 5 MB + 1 byte no) y huella SHA-256 calculada en el navegador, idéntica a la del backend.
- **Core Kit (autorizado):** nuevos `PasswordInput`, `OtpInput`, `FileInput`, `Alert`, `Stepper`, `SegmentedTabs`, `SectionNav` y `TextButton`; `Input` gana `endAdornment` y `Header` lee la sesión.
- **Verificación:** `next build` ✅ (17 rutas), `tsc`, ESLint y `lint:a11y` sin errores, 0 `any`, `audit:core-kit` 0 violaciones, `audit:a11y` aprobado, `audit:zod` ✅, Vitest **136/136** (+33). Navegador real a 1920 y 390 px recorriendo todos los flujos. Walkthrough: `docs/walkthroughs/M04/walkthrough_v0.6.0_M04_cuentas_autenticacion_perfil_frontend.md`.
- **Ajustes autorizados al aprobar:** (1) el backend conserva 100 kb de cuerpo JSON en toda la API y acepta hasta 7 MB **solo** en `POST /cuentas/empresas/renovacion-nit` (RUT de 5 MB en base64); el exceso responde 413 con código propio en vez de un 500 (`core/middlewares/cuerpoJson.middleware.ts`, backend 199/199, +6). (2) Entrada "Empresas" en la barra lateral y el breadcrumb del `AdminLayout` de M17.
- **Integración de `main` (DevOps):** sin conflictos. `lucide-react` 1.x retiró los íconos de marca y rompía el `Footer` del Core; se reemplazaron por `IconosMarca.tsx` (Simple Icons, CC0). Verificado con `lucide-react` 1.60.0 y `dotenv` 18.0.8.
- **URL de la API (autorizado por el Director):** el navegador llama a `/api/v1` en el mismo origen y Next lo reenvía al backend **conservando el prefijo** con `BACKEND_URL`, variable solo de servidor que se fija al compilar (`next.config.ts`, `ARG` en `frontend/Dockerfile`, `docker-compose.yml`, override y `.env.example`). Antes el *rewrite* descartaba `/api` y los `args` de compose no llegaban al build. Verificado con un backend de eco: ruta, cookie, cuerpo de ~7 MB y `Set-Cookie`.
- **🛑 Pendiente para DevOps:** `frontend/package-lock.json` sigue fijando `lucide-react` 0.525 frente a `^1.58` en `package.json`. Detalle en el walkthrough §12.

---

## [v0.5.0] - 2026-10-22
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** 🏠 **Landing page pública (frente propio FP-01).** Página de inicio `/` según la página 1 de `VISTAS.pdf` y la UI Spec §4.1: topbar, header con mega-menú de categorías, hero, franja de confianza, buscador con accesos a Calculadora y Asesoría de color, productos destacados, categorías y footer institucional. Responsive *mobile-first*.
- **⚠️ Estado:** detenido en **Gate 3B** a la espera de la revisión visual del Director Humano. **Datos estáticos temporales** (productos, categorías, carrito y sesión) hasta que M01, M05 y M04 los alimenten; imágenes de producto, categoría y logo son marcadores extraídos del mockup.

### Core Kit (ampliación autorizada)
- **Nuevos:** `ButtonLink`, `IconButton`, `Select`, `SearchBar`, `Container`, `Logo`, `Topbar`, `Header`, `CategoriesMegaMenu`, `Footer`, `Carousel`, `ScrollRow`, `CategoryCard`, `formatCOP` y `button-styles.ts` (fuente única de estilos de botón, con la variante `outline-light`).
- **Extendidos sin romper su API:** `Button` (estilos extraídos), `Input` (`appearance="bare"`), `Badge` (`pill`), `ProductCard` (`href`, precio con sufijo COP, fondos blancos fundidos, objetivos táctiles de 44 px en móvil). `app/layout.tsx`: Poppins 500 y favicon declarado.
- **Verificación:** `next build` ✅ (`/` estática, 122 kB); `tsc`, ESLint y `lint:a11y` sin errores; 0 `any`; auditorías `a11y` y `core-kit` aprobadas; Vitest **103/103** (+38). Verificado en navegador real a 1366 y 500 px: sin desborde, objetivos táctiles ≥ 44 px, mega-menú accesible con retorno de foco.
- **Conocido:** 14 errores 404 en consola por el *prefetch* de Next.js hacia rutas aún no construidas (`/productos`, `/login`, `/carrito`…). Walkthrough: `docs/walkthroughs/FP-01/walkthrough_v0.5.0_FP01_landing_frontend.md`.

---

## [v0.4.2] - 2026-10-22
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** ✏️ **Motivo de rechazo opcional en el dictamen (M04).** Por decisión del Director Humano el contrato acepta rechazar sin motivo; se conserva obligatorio (mínimo 10 caracteres) solo al rechazar un **registro** de empresa (`RN-CUE-17`), regla que pasa del DTO al servicio porque depende del tipo de solicitud.
- **Alcance:** contrato rector `m04-cuentas.contract.ts`, DTO del backend, `EmpresasService` (un motivo vacío se guarda como "sin motivo") y DTO del frontend (`dictamenSolicitudEmpresaFormSchema` opcional + `dictamenRegistroEmpresaFormSchema` obligatorio). Ajuste autorizado expresamente durante la Fase 3B.
- **Verificación:** backend 20/20 suites · **193/193** (+5); frontend +8 pruebas de DTO; contratos 16/16; `tsc`, ESLint y `check:no-any` limpios. Walkthrough: `docs/walkthroughs/M04/walkthrough_v0.4.2_M04_motivo_rechazo_opcional_backend.md`.
- **Decisiones registradas:** ratificado el cambio de `app.routes.ts` (v0.4.1); la verificación del correo del registro de empresa la valida el administrador al aceptarla; auditoría de decisiones aplazada (`HU-SEG-04`).

---

## [v0.4.1] - 2026-10-21
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** 🛡️ **Remediación de `BUG-M04-01` (S1 Blocker) — control de acceso en `/admin/empresas/*`.** Las rutas administrativas de empresas ahora exigen sesión válida y el permiso atómico `empresas.validar`, evaluado en servidor en cada petición; sin él responden el 404 opaco de M20.
- **✅ Estado de certificación:** re-auditado y certificado formalmente por el QA Lead & Security Compliance Director en v0.4.1 tras resolución comprobada de `BUG-M04-01`. Veto Stop-the-Line levantado formalmente. Gate 3A (Backend) aprobado al 100%. Reporte oficial: `.sdlc/docs/qa/M04/v0.4.1/QA_REPORT.md`.

### Módulo M04 — Cuentas, Autenticación y Perfil (Backend)
- **Control de acceso (`HU-CUE-09` E2, `HU-ADM-03`):** guarda a nivel de router (`sesión → requirePermission('empresas.validar')`), protegida por omisión. `construirModuloM04` exige ahora el `AutorizacionService`; no se puede montar sin autorización administrativa.
- **Por qué no `tipoSesion === 'admin'`:** el login concede ese tipo a todo usuario con rol, empleados incluidos; solo el permiso atómico impide que un colaborador sin `empresas.validar` dictamine.
- **Raíz de composición:** `app.routes.ts` inyecta `m17.autorizacionService` (cambio de una línea en archivo compartido, por instrucción expresa del Director Humano; pendiente de su ratificación).

#### Saneamiento del flujo de dictamen (defectos hallados al analizar `HU-CUE-09` / `HU-CUE-10`)
- **Decisión atómica y transaccional (`RNF-CUE-09-01`, `ADR-010`):** `UPDATE ... WHERE estado = 'pendiente'`; la aprobación (activar cuenta, convertir a tipo `empresa`, crear `cuenta_empresa`, retirar Google) ocurre en **una** transacción que se revierte ante un conflicto de NIT. Antes eran escrituras sueltas y dos administradores simultáneos podían decidir ambos.
- **Cuenta empresa correcta (`RN-CUE-15`, `HU-CUE-09` E8/E10):** el registro de empresa ya no nace como `empresa`; solo la aprobación convierte la cuenta (sobre la misma) y desactiva el acceso de Google.
- **Códigos y reglas:** decisión repetida → `409 SOLICITUD_YA_DECIDIDA`; motivo de rechazo obligatorio solo en registros (`RN-CUE-17`).
- **Identificadores mal formados** ya no provocan 500: responden el 404 opaco (solicitudes, renovaciones, documentos y direcciones).
- **Endpoints nuevos:** `GET /cuentas/empresas/solicitudes/mias` (estado de solicitudes propias, `HU-CUE-03` E6 / `HU-CUE-10` E3), `GET /admin/empresas/renovaciones` y `/:id`, y `GET /admin/empresas/documentos/:id` (descarga del RUT con adjunto, `nosniff`, `no-store` y verificación SHA-256; `HU-CUE-09` E14).
- **Pruebas y verificación:** 20/20 suites, **188/188 tests** (+72); `tsc` 0 errores; ESLint 0/0; 0 `any` en 102 archivos. Pruebas de mutación: la guarda de permiso, la condición `pendiente`, la conversión a `empresa` y la baja de Google fueron sabotadas una a una y cada mutante fue detectado.
- **Límite de lo verificado:** la exclusión mutua real entre dos conexiones concurrentes requiere PostgreSQL y queda para la prueba de integración del Gate 4.
- **Elevado para decisión (no se tocó):** el cuerpo JSON global de 100 kb impide subir un RUT de hasta 5 MB (`HU-CUE-10` E5; bloquea la renovación de punta a punta), catálogo de códigos de error divergente entre contrato y HU, motivo opcional en ascensos/renovaciones frente al DTO firmado, verificación de correo del registro de empresa, notificaciones de renovación de NIT y auditoría de decisiones. Detalle en el walkthrough §8.
- **Errata:** el walkthrough `v0.4.0` §4.2 afirmaba una comprobación de permisos inexistente; corregido en el propio documento. Walkthrough: `docs/walkthroughs/M04/walkthrough_v0.4.1_M04_remediacion_bug_m04_01_backend.md`.

---

## [v0.4.0] - 2026-10-21
- **Autor:** DanExl24 (@DanExl24)
- **Hito:** 🔐 **Implementación Backend completa de Cuentas, Autenticación y Perfil (M04).** Endpoints REST canónicos bajo `/cuentas` y `/admin/empresas`, servicios hexagonales desacoplados, autenticación con OTP, federación Google Identity, señuelos anti-fuerza bruta, libreta de direcciones y flujo B2B corporativo con custodia de RUT.

### Módulo M04 — Cuentas, Autenticación y Perfil (Backend)
- **HU-CUE-01 (Registro B2C con OTP):** Código de verificación de 6 dígitos con hash BCrypt costo 12, expiración de 15 minutos y límite de 3 reintentos.
- **HU-CUE-02 (Federación Google Identity):** Autenticación federada vía `GoogleAuthPort` con token de registro efímero JWT de 10 minutos para complementar datos en nuevos usuarios.
- **HU-CUE-03 y HU-CUE-09 (Empresas B2B y Renovación de NIT):** Solicitudes corporativas con validación de NIT, custodia segura de archivo RUT (hasta 5MB, SHA-256) en `documento_soporte` y flujo de renovación de NIT.
- **HU-CUE-04 (Login y Control de Fuerza Bruta):** Bloqueo temporal por 15m tras 5 intentos fallidos (ADR-012) y comparación con hash señuelo de tiempo constante ante correos inexistentes para prevenir ataques de temporización. Forzado de cambio de clave en primer acceso (ADR-011).
- **HU-CUE-05 (Recuperación de Contraseña):** Enlace firmado seguro JWT de 30 minutos con respuesta indistinguible anti-enumeración y revocación masiva de sesiones en reset.
- **HU-CUE-06 (Perfil y Credenciales):** Actualización de datos personales, cambio de contraseña con validación de clave actual y solicitud/confirmación de cambio de correo con OTP de 15m.
- **HU-CUE-07 (Libreta de Direcciones):** Límite estricto de 10 direcciones por cliente (RN-CUE-07), auto-asignación de primera dirección como predeterminada y desmarcado atómico.
- **HU-CUE-08 (Unicidad Universal):** Blindaje de unicidad en BD y repositorios contra colisiones de correo, NIT y solicitudes pendientes.
- **HU-CUE-10 (Dictamen Administrativo y Desactivación):** Aprobación crea fila 1:1 en `cuenta_empresa` (ADR-010 / C-1); rechazo exige motivo >= 10 caracteres. Desactivación de cuenta con confirmación de clave y revocación de sesiones.
- **Verificación:** 18/18 suites Vitest backend PASS (116/116 tests), 0 errores TypeScript (`npx tsc --noEmit`), 0 advertencias ESLint, y 0 usos de `any` en 99 archivos backend auditados. Walkthrough generado en `docs/walkthroughs/M04/walkthrough_v0.4.0_M04_cuentas_autenticacion_backend.md`.

---

## [v0.3.3] - 2026-10-21
- **Autor:** DanExl24 (@DanExl24)
- **Commit:** `3b10811` — `feat(m17-permisos): persistir parametros en base de datos con repositorio prisma HU-ADM-05`
- **Hito:** ⚙️ **Persistencia relacional de configuración general según RFC-M17-001.** Se elimina el almacén volátil en memoria y se conecta la API administrativa con la tabla `parametro_sistema`.

### Módulo M17 — Administración, Empleados y Permisos (Backend)

Esta entrega resuelve de forma definitiva la deuda técnica transitoria documentada en `ADR-007` y formalizada en el `RFC-M17-001`:

- **Conexión Prisma ↔ PostgreSQL:** Mapeo de la tabla `parametro_sistema` en `backend/prisma/schema.prisma` con enums `AreaParametro` y `TipoDatoParametro`.
- **`PrismaConfiguracionRepository`:** Implementación del puerto `ConfiguracionPort` que reemplaza `AlmacenConfiguracionMemoria` en `m17.routes.ts`.
- **Cero Datos Iniciales en Código (Directiva #10):** Se remueve el catálogo hardcodeado de 10 parámetros de TypeScript en `configuracion.repository.ts`. Toda la siembra reside exclusivamente en `bd/sql/seed_pintuclic.sql`.
- **Auditoría del Administrador:** Propagación de `idAdmin` desde `req.actor?.idUsuario` en `ConfiguracionController` hasta `actualizar()` para registrar la autoría en `id_usuario_actualizo`.
- **Caché en Memoria (TTL 30s):** Consultas de alta frecuencia resuelven en `< 1ms` sin saturar la base de datos, con invalidación reactiva ante cualquier actualización.
- **Verificación:** 71/71 tests Vitest backend PASS (+1 test de caché e invalidación), 0 errores TypeScript (`npx tsc --noEmit`), 0 advertencias ESLint, y 0 usos de `any` en 145 archivos auditados.

---

## [v0.3.2] - 2026-10-21
- **Autor:** DanExl24 (@DanExl24)
- **Commit:** `160b077` — `fix(ui): cerrar defectos de accesibilidad de modal y tarjeta del core kit`
- **Hito:** ♿ **Cierre de la deuda de accesibilidad del Core Kit compartido.** La compuerta de accesibilidad pasa a cubrir todo el frontend.

### Core Kit compartido — M20, infraestructura frontend

Los 2 defectos que la revisión de pares de `v0.3.1` dejó abiertos vivían fuera de `m17-permisos`,
en `frontend/src/core/`, y se reportaron sin tocar conforme a la Directiva #3. Esta entrega los
cierra con autorización explícita del Director Humano y sobre el ticket técnico que QA asignó al
custodio del Core Kit.

**Diálogo modal accesible.** `Modal.tsx` declaraba `role="dialog"` y `aria-modal` pero sin nombre
accesible, sin foco inicial, sin retorno de foco y sin trampa de foco: `Tab` desde el último control
salía del diálogo hacia la página de detrás, que seguía siendo tabulable bajo el fondo opaco. Se
añaden `aria-labelledby` y `aria-describedby` mediante `useId()`, la prop opcional `ariaLabel` para
modales sin título, foco inicial, retorno del foco al disparador y trampa de foco cíclica. Los 7
consumidores de M17 pasan `title`, así que ninguno requirió cambios.

**Tercer defecto corregido, no reportado antes.** El `role="dialog"` estaba sobre el **fondo**
decorativo y no sobre el panel, de modo que la región del diálogo abarcaba toda la pantalla.

**Causa raíz del lint, no su síntoma.** El cierre por clic exterior pasa de un `onClick` en el fondo
a un escucha de `pointerdown` en `document` —el mismo patrón que `AdminLayout.tsx` ya usaba en
`v0.3.1`—, con lo que el contenedor decorativo deja de necesitar semántica interactiva.

**Tarjeta de producto operable por teclado.** El `<h3>` de `ProductCard.tsx` llevaba `onClick` sin
manejador de teclado: "ver producto" era inalcanzable sin ratón. El encabezado conserva su semántica
y delega la acción a un `<button>` real, que obtiene `Enter`, `Espacio`, foco y anuncio de rol de
forma nativa. Sin `onViewDetails` se renderiza un `<span>` en lugar de un botón inerte.

**La compuerta de accesibilidad se amplía.** `v0.3.1` había acotado `lint:a11y` a `src/app` y
`src/modules` precisamente porque estas 2 violaciones habrían dejado el lint en rojo para todo el
equipo. Cerradas, el alcance incorpora `src/core`: una reaparición ahora rompe la verificación.

**Verificación.** `eslint-plugin-jsx-a11y` sobre `src/core` pasa de **2 errores a 0**. 57/57 pruebas
Vitest de frontend (eran 47) con 10 nuevas sobre el contrato de recorrido del foco; 68/68 de backend
sin afectación, **125/125 en total**; `tsc`, ESLint y `check:no-any` (75 archivos) limpios; los tres
auditores del repositorio sin violaciones. Se preserva la protección de la credencial de un solo uso
de `HU-SEG-06`.

**Brecha declarada.** El proyecto no tiene `jsdom` ni Testing Library y `vitest.config.ts` corre en
`environment: node`. Las pruebas nuevas cubren el **contrato de recorrido** de la trampa de foco y el
instrumento externo cubre la ausencia de manejador de teclado, pero el cableado DOM —`querySelectorAll`,
la llamada efectiva a `focus()`, el retorno del foco y la resolución de `aria-labelledby` por un lector
de pantalla— queda **verificado por inspección, no por prueba automatizada**. Se recomienda incorporar
`jsdom` y `@testing-library/react` como dependencias de desarrollo; es un cambio de dependencias del
proyecto y excedía el alcance autorizado de esta remediación.

**Sin cambios.** Sigue bloqueada la integración nativa de las 8 reglas en `frontend/eslint.config.mjs`
por el hook de protección de configuración del entorno. No se declara ninguna compuerta aprobada.

---

## [v0.3.1] - 2026-10-21
- **Autor:** DanExl24 (@DanExl24)
- **Commit:** `cb21b6a` — `fix(m17): cerrar hallazgos de revision de pares en dtos stores y accesibilidad`
- **Hito:** 🔎 **Primera remediación guiada por revisión de pares.** Cierra defectos que las compuertas estáticas no podían detectar.

### Módulo M17 — Administración, Empleados y Permisos (remediación de frontend)

Una revisión de pares sobre `v0.3.0` registró 1 defecto bloqueante y 12 mayores. El ciclo
*Stop-the-Line* de QA resolvió 4 de ellos; esta entrega cierra **6 de los 8 restantes**, todos dentro
de los límites de `m17-permisos`.

**Corrección de datos y contrato.** Un colaborador con `telefono: null` no podía editarse —ni para
cambiarle solo el nombre— porque el modal precarga la cadena vacía y `telefonoSchema.optional()` solo
admite `undefined`. Se introduce `telefonoEdicionSchema`, que acepta el vacío y conserva el rango
7–20 cuando hay valor, y la vista omite el campo del payload, ya que el contrato del backend tampoco
acepta la cadena vacía.

**Mensajes de error reales.** 15 puntos del módulo leían `err.message` de un `AxiosError`, que
también es un `Error`, de modo que el usuario veía "Request failed with status code 409" en lugar del
motivo de negocio. El nuevo helper `mensajeDeError` prefiere el mensaje del envelope canónico
mediante `esRespuestaError`.

**Consistencia de los listados.** Contador de secuencia por store que descarta las respuestas
obsoletas —antes una respuesta lenta sobrescribía una más reciente y la tabla dejaba de corresponder
a los filtros visibles— y debounce de 300 ms que sustituye a una petición por pulsación de tecla.

**Accesibilidad de la navegación.** El menú de perfil solo se cerraba con `onMouseLeave`, inalcanzable
con teclado o en pantalla táctil; el sidebar móvil oculto seguía siendo tabulable. Se añaden cierre
por `Escape` y por puntero externo, `inert` condicionado por `matchMedia`, y los atributos
`aria-expanded`, `aria-controls`, `aria-haspopup` y `aria-current`.

**Protección de la credencial de un solo uso (`HU-SEG-06`).** `Escape` o un clic en el fondo
destruían la clave temporal sin recuperación posible; ahora solo la descarta el botón explícito, y el
fallo del portapapeles se informa en vez de silenciarse.

**Confirmación de guardado (`HU-ADM-05`).** El banner de éxito de configuración nunca llegaba a verse
porque el refresco posterior lo borraba. Se corrige el orden.

**Verificación.** 47/47 pruebas Vitest de frontend (eran 38) con **9 pruebas de regresión nuevas** que
ejercitan el límite exacto de cada defecto; `tsc`, ESLint y `check:no-any` (73 archivos) limpios; los
tres scripts de auditoría del repositorio sin violaciones; y `eslint-plugin-jsx-a11y` ejecutado como
instrumento externo con **0 errores en M17** por primera vez.

**Pendiente declarado.** Quedan abiertos 2 defectos de accesibilidad del Core Kit compartido
(`Modal.tsx` sin trampa de foco, `ProductCard.tsx` sin manejador de teclado), reportados sin tocar
conforme a la Directiva #3, y 2 hallazgos bloqueados por dependencias: la identidad simulada del
panel exige la sesión real de M04, y los KPIs agregados exigen ampliar el contrato de M17.

> **Nota:** la entrega `v0.3.0` (implementación inicial de M17, backend y frontend) no tiene entrada
> propia en este registro. Sus walkthroughs sí están publicados en `docs/walkthroughs/M17/`.

---

## [v0.2.0] - 2026-10-21
- **Autor:** DanExl24 (@DanExl24)
- **Commit:** `c5e6492` — `feat(m20-seguridad): implementar la infraestructura de seguridad del frontend`
- **Hito:** 🥇 **Primer feature del sistema.** Primera entrega con código de aplicación, no solo documentación.

### Módulo M20 — Seguridad, Auditoría y Protección de Datos (parcial)

Primer módulo recorrido por el ciclo SDLC formal: Gate 0 → Gate 1 → Gate 2 → Fase 3A → Gate 3B.
M20 es la raíz absoluta del grafo de construcción, de la que dependen los 20 módulos restantes.

**Requerimientos (Gate 1).** 5 historias formalizadas en INVEST con **36 escenarios BDD** trazados
uno a uno a su criterio de aceptación, 15 reglas inmutables (`RN-SEG-01`…`RN-SEG-15`) y los 6
diagramas contractuales transcritos a Mermaid.

**Arquitectura (Gate 2).** Contrato Zod API-First en `.sdlc/docs/contracts/m20-seguridad.contract.ts`
y 4 ADRs. Hallazgo principal: **M20 no requiere ningún cambio de DDL**, porque sus cuatro tablas ya
existían en `bd/sql/schema_pintuclic.sql`. Prisma pasa a mapear ese DDL con `@@map` en lugar de
describir un modelo paralelo incompatible.

**Backend (Fase 3A).** Derivación BCrypt con coste ajustable y verificación en tiempo constante; la
máquina de 8 estados de la sesión con ventana deslizante e invalidación en masa con causa; el
validador central de autorización que resuelve permisos en cada petición; y el manejador global de
errores sin detalle interno. **36 pruebas Vitest.**

**Frontend (Gate 3B, acotado).** Guarda de rutas que conserva el destino pretendido, interceptor
`401`, DTOs transversales de seguridad y traducción de errores sin fugas. La sesión viaja en cookie
`HttpOnly`: ni el cliente HTTP ni el store tocan el identificador. **19 pruebas Vitest.**

**Gobernanza.** Se incorporó `CONSULTATION_BYPASS_PROTOCOL.md` (Mesa de Consulta Acotada) para los
ritos que exigen varios roles a la vez, como la mesa ATDD. Se absorbió el submódulo `.sdlc` en el
repositorio principal y se eliminó el residuo del clon en `backend/` y `frontend/` — que, entre otras
cosas, impedía instalar el frontend por un conflicto de dependencias.

> ⚠️ **Entrega parcial y sin certificar.** Alcance: 5 de 6 historias — **HU-SEG-04 (auditoría) está
> aplazada por el Product Owner**, y con ella `CA-SEG-03-05` queda **NO CUBIERTO**. **Gate 4 (QA) está
> diferido**: M20 está probado unitariamente pero nunca se ha ejecutado contra una sesión real,
> porque no existe login hasta M04. Se certificará junto a M17 y M04.

- 🔗 **Walkthrough:** [walkthroughs/M20/walkthrough_v0.2.0_M20_seguridad_frontend.md](./walkthroughs/M20/walkthrough_v0.2.0_M20_seguridad_frontend.md)

---

## [v0.1.8] - 2026-10-20
- **Autor:** DanExl24 (@DanExl24)
- **Commit:** `081066e` — `docs(arquitectura): agregar RUTA_DEL_PROYECTO.md como ruta maestra`
- **Release:** [Release v0.1.8](https://github.com/pintuclic/pintuclic.com/releases/tag/v0.1.8)

### Documentación y Arquitectura
- **Ruta Maestra del Proyecto:** Adición de [`docs/00_SISTEMA/01_ARQUITECTURA/RUTA_DEL_PROYECTO.md`](./00_SISTEMA/01_ARQUITECTURA/RUTA_DEL_PROYECTO.md), formalizando el mapa de 21 módulos (`M01` a `M21`) organizados en 6 olas secuenciales según el contrato oficial del Product Owner.
- **Grafo de Dependencias:** Integración del diagrama Mermaid como contrato vinculante de orden de construcción (`A --> B` indica que B depende estrictamente de A).
- **Inventario de Módulos:** Definición detallada de scopes canónicos (`m[xx]-[nombre-modulo]`), olas de pertenencia, dependencias y estado de especificación funcional.
- **Camino Crítico:** Trazado de la cadena crítica de 9 módulos (`M20 → M17 → M01 → M05 → M21 → M07 → M08 → M09 → M10`).
- **Observaciones Técnicas:** Registro de 4 puntos de atención para decisión del Product Owner (ciclo `M18-M04-M07-M08`, dependencias cruzadas entre Ola 4 y Ola 5, independencia de `M16`, y asignación de estilos por dominio).
- **Gobernanza de Agentes:** Inclusión obligatoria del Paso 0 y Directiva #5.1 en [`AGENTS.md`](../AGENTS.md).
- **Catálogo de Scopes:** Ampliación a 21 scopes modulares en [`GUIA_GIT_COMMITS_Y_PUSH.md`](./00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_GIT_COMMITS_Y_PUSH.md) y actualización de índices en [`docs/README.md`](./README.md).
- **Submódulo SDLC:** Actualización de puntero en `.sdlc`.

---

## [v0.1.7] - 2026-10-20
- **Autor:** DanExl24 (@DanExl24)
- **Commit:** `d3a91f9` — `chore(sdlc): actualizar puntero del submodulo a a089113`
- **Release:** [Release v0.1.7](https://github.com/pintuclic/pintuclic.com/releases/tag/v0.1.7)

### SDLC y Design System
- **Puntero SDLC:** Actualización del puntero del submódulo `.sdlc` al commit `a089113`.
- **Alineación de Diseño:** Reemplazo de paleta hardcodeada en las especificaciones del Design System por los 13 tokens oficiales de `PINTUCLIC_COLORS` definidos en `frontend/src/core/theme/colors.ts`.
- **Tipografía Oficial:** Estandarización de tipografía a Poppins (marca y títulos) e Inter (interfaz y cuerpo).

---

## [v0.1.6] - 2026-10-20
- **Autor:** DanExl24 (@DanExl24)
- **Commit:** `9428ab3` — `chore(sdlc): actualizar puntero del submodulo a 5660c39`
- **Release:** [Release v0.1.6](https://github.com/pintuclic/pintuclic.com/releases/tag/v0.1.6)

### Metodología SDLC
- **Puntero SDLC:** Actualización del puntero del submódulo `.sdlc` al commit `5660c39`.
- **Alineación de Stack Multiagente:** Actualización de 27 archivos de roles, subroles, protocolos y plantillas para reflejar el stack tecnológico de `pintuclic.com`:
  - Kysely sustituido por Prisma 6.
  - Pinia sustituido por Zustand 5.
  - Vue / vue-tsc sustituido por Next.js 15, React 19 y TypeScript (`tsc --noEmit`).

---

## [v0.1.5] - 2026-10-20
- **Autor:** DanExl24 (@DanExl24)
- **Commit:** `0602e0e` — `docs(gobernanza): establecer reglas globales de nomenclatura de commits`
- **Release:** [Release v0.1.5](https://github.com/pintuclic/pintuclic.com/releases/tag/v0.1.5)

### Gobernanza y Flujo Git
- **Fuente Única de Verdad para Commits:** Publicación de [`GUIA_GIT_COMMITS_Y_PUSH.md`](./00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_GIT_COMMITS_Y_PUSH.md).
- **Regla de Oro:** El tipo `feat` exige estrictamente una Historia de Usuario verificable end-to-end (`HU-XXX-NN`).
- **Convenciones de Commits:** Estandarización de 12 tipos permitidos, árbol de decisión Mermaid, catálogo de scopes canónicos y tabla de antipatrones.
- **Formato Canónico:** Distinción estricta entre commits (`tipo(scope): descripcion`) y títulos de Pull Request (`tipo(scope) [X.Y.Z.W]: mensaje`).
- **Alineación Documental:** Actualización de Directiva #7 en [`AGENTS.md`](../AGENTS.md), sección de commits en [`CONTRIBUTING.md`](../CONTRIBUTING.md) y corrección de referencias en [`docs/README.md`](./README.md).

---

## [v0.1.4] - 2026-10-20
- **Autor:** DanExl24 (@DanExl24)
- **Commit:** `c8ba780` — `docs(arquitectura): agregar seccion QA tooling en ARQUITECTURA_GENERAL.md`
- **Release:** [Release v0.1.4](https://github.com/pintuclic/pintuclic.com/releases/tag/v0.1.4)

### Calidad y Pruebas (QA)
- **Arsenal de QA:** Integración de la Sección 5 "Capa de Calidad y Testing (QA)" en [`ARQUITECTURA_GENERAL.md`](./00_SISTEMA/01_ARQUITECTURA/ARQUITECTURA_GENERAL.md).
- **Herramientas de Validación:** Especificación de Vitest (unitarias e integración), Bruno (contratos de API REST), Playwright (flujos E2E), axe-core (accesibilidad a11y), k6 (pruebas de carga) y OWASP ZAP (seguridad DAST).
- **Scripts de Análisis Estático:** Inventario de validaciones AST en `.sdlc/tooling/`.
- **Gobernanza QA Lead:** Definición de los 4 Pilares del Arsenal QA y facultades de veto técnico sin corrección directa.

---

## [v0.1.3] - 2026-10-20
- **Autor:** DanExl24 (@DanExl24)
- **Commit:** `ac6d075` — `chore(sdlc): actualizar puntero del submodulo .sdlc`
- **Release:** [Release v0.1.3](https://github.com/pintuclic/pintuclic.com/releases/tag/v0.1.3)

### Metodología SDLC
- **Puntero SDLC:** Actualización del puntero del submódulo `.sdlc` al commit `c8ea314`.
- **Blindaje DevOps:** Delimitación estricta del dominio DevOps, eliminación del subrol de GitHub Projects y corrección de validaciones de compilación con `tsc`.

---

## [v0.1.2] - 2026-10-20
- **Autor:** DanExl24 (@DanExl24)
- **Commit:** `8e0ae18` — `docs(root): refactorizar AGENTS.md, CONTRIBUTING.md y DEPLOY.md para SDLC`
- **Release:** [Release v0.1.2](https://github.com/pintuclic/pintuclic.com/releases/tag/v0.1.2)

### Documentación Raíz
- **AGENTS.md:** Banner de entrada obligatorio con protocolo de aterrizaje, corrección del stack hacia Express 5 + Prisma 6 + Next.js 15, y actualización obligatoria de artefactos SDLC en el Paso 10.
- **CONTRIBUTING.md:** Integración formal del flujo Git Flow con compuertas de calidad Stage-Gates y versionamiento semántico.
- **DEPLOY.md:** Actualización de directivas de despliegue a Next.js 15, variables de entorno (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`), repositorio oficial y compuerta Gate 4 como prerrequisito de producción.

---

## [v0.1.1] - 2026-10-20
- **Autor:** DanExl24 (@DanExl24)
- **Commit:** `3662350` — `chore(sdlc): update submodule to pintuclic.com-adapted version`
- **Release:** [Release v0.1.1](https://github.com/pintuclic/pintuclic.com/releases/tag/v0.1.1)

### SDLC Multiagente
- **Adaptación a pintuclic.com:** Sincronización del submódulo `.sdlc` al commit `a36f3bd`.
- **Fuentes de Verdad:** Incorporación de `PINTUCLIC_CONTEXT.md` y enlaces directos a las especificaciones en `docs/` y base de datos en `bd/`.
- **Mapeo de Módulos:** Registro de los módulos M01 a M20 en el estado inicial del orquestador.

---

## [v0.1.0] - 2026-10-20
- **Autor:** DanExl24 (@DanExl24)
- **Commit:** `2f029b7` — `feat: add full project structure (backend, frontend, bd, docs)`
- **Release:** [Release v0.1.0](https://github.com/pintuclic/pintuclic.com/releases/tag/v0.1.0)

### Estructura Inicial del Proyecto
- **Backend:** Configuración inicial de la API modular en Node.js, Express 5, TypeScript, Prisma 6, Zod, JWT, BCrypt, Vitest y Nodemailer.
- **Frontend:** Estructura modular en Next.js 15 (App Router), React 19, Tailwind CSS 4 y Zustand 5.
- **Base de Datos:** DDL SQL (`schema_pintuclic.sql`), datos semilla de prueba (`seed_pintuclic.sql`) y diagramas entidad-relación en `bd/`.
- **Documentación Centralizada:** Arquitectura de software, especificaciones funcionales modulares, políticas de seguridad transversales y plantillas de control de calidad.

---

## [v0.0.3] - 2026-10-20
- **Autor:** DanExl24 (@DanExl24)
- **Commit:** `8eaa3ce` — `chore: add multiagent-sdlc-starter as git submodule`
- **Release:** [Release v0.0.3](https://github.com/pintuclic/pintuclic.com/releases/tag/v0.0.3)

### Infraestructura SDLC
- **Submódulo Multiagente:** Integración del repositorio `multiagent-sdlc-starter` como submódulo Git en `.sdlc/` para la gestión ágil y gobernanza asistida por IA.

---

## [v0.0.2] - 2026-10-20
- **Autor:** one-centavo (@one-centavo)
- **Commit:** `3ba9b03` — `ci(github): configure semantic release workflow and dependabot`
- **Release:** [Release v0.0.2](https://github.com/pintuclic/pintuclic.com/releases/tag/v0.0.2)

### CI/CD Inicial
- **Automatización de Releases:** Creación de `.github/workflows/release.yml` para etiquetado semántico y generación automática de GitHub Releases (`mathieudutour/github-tag-action@v7`).
- **Seguridad y Dependencias:** Configuración de `.github/dependabot.yml` para monitoreo de vulnerabilidades y dependencias en GitHub Actions y paquetes npm.
