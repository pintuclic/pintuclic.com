import { z } from 'zod';
import { idSchema, respuestaPaginada, respuestaUno } from './m01-catalogo.contract';
import { ambienteSchema, productoPublicoTarjetaSchema } from './m01-catalogo-productos.contract';

/**
 * ============================================================================
 * CONTRATO DE API REST — M03. Asesoría y asistencia
 * ============================================================================
 * Scope: m03-asesoria · Prefijo de historias: ASE · BORRADOR para el Tech Lead.
 * Especificación funcional: docs/02_MODULOS_FUNCIONALES/M03_ESPECIFICACION_ASESORIA.md
 *
 * Este contrato ES la especificación del módulo y está por encima de la spec cuando se
 * contradicen. Lo que depende del cliente o del PO está en "Preguntas abiertas" (Q1…Q9)
 * con la opción que se asume mientras tanto; ninguna bloquea el resto del contrato.
 *
 * ── Qué hace ────────────────────────────────────────────────────────────────
 *  HU-ASE-01 Búsqueda asistida por preguntas guiadas, EN DOS MODOS que se construyen los dos
 *            y se eligen con un interruptor del panel (D3):
 *              · `fijo`     cuestionario administrable: preguntas, opciones y su
 *                           correspondencia con los filtros viven en la BD y los edita el
 *                           administrador (RF-ASE-01-02 tal como está escrito).
 *              · `asistido` las preguntas las propone Gemini sobre el vocabulario cerrado
 *                           del catálogo (D4).
 *            Los dos terminan en lo MISMO: un botón al catálogo con los filtros ya
 *            aplicados, con la misma respuesta y la misma pantalla de resultado (D9).
 *  HU-ASE-02 Calculadora de pintura con un solo motor y dos entradas (D5):
 *              · De producto: en la ficha de TODO producto con rendimiento registrado,
 *                sin montarla a mano producto por producto.
 *              · General: en la landing; el usuario escoge cualquier producto con
 *                rendimiento y su presentación.
 *            Las dos calculan en los dos sentidos: cuánto comprar (`cantidad`) y cuánta
 *            área cubre una cantidad (`cobertura`). En `cantidad` el área no se escribe:
 *            se toman las medidas de la superficie y se calcula (K12-K14).
 *  HU-ASE-03 Simulador virtual de color: el color elegido en el abanico, aplicado a las
 *            paredes de unos ambientes ilustrados que trae el propio sitio, en varios
 *            puntos de vista. NUNCA recibe fotos del usuario (HU-ASE-07 sigue retirada).
 *            Ocupa la pestaña «En tu espacio» que M01 dejó reservada (M01 · P6).
 *  HU-ASE-05 Asistente virtual: responde las necesidades del cliente sobre pintura,
 *            preparación de superficies, aplicación y productos del catálogo, y sugiere
 *            productos. Siempre ofrece el botón «¿Quieres comunicarte con un asesor?» hacia
 *            el formulario de M15. Se construye AL FINAL (E4).
 *  HU-ASE-06 Degradación del servicio de IA: tiempo de espera, reintentos, suspensión por
 *            cuota, descarte de respuestas no procesables, registro de incidentes, alerta
 *            al administrador y alternativas para el usuario.
 *
 * ── Orden de construcción (acordado con el Tech Lead, 2026-10-26) ───────────
 *  E1  PR general: tablas de M03, auditoría de M20, evento de M18, permisos de M17 y seed.
 *  E2  Calculadora completa (backend, pantallas y pruebas). No depende de la IA.
 *  E3  Cuestionario en modo `fijo`, con su panel de administración y el botón al catálogo.
 *  E4  Modo `asistido` y asistente virtual, los dos sobre el cliente de Gemini y la
 *      resiliencia de HU-ASE-06. Va al final a propósito: si la IA se cae o el PO cambia de
 *      idea, E1-E3 ya están entregados y funcionando.
 *  E5  Simulador de color (HU-ASE-03), acordado con el Tech Lead el 2026-10-29, después de
 *      E1-E4. Entra entero en el frontend: no añade endpoints, ni tablas, ni llamadas a la
 *      IA, y no depende de fotos ni de contenido externo, porque los ambientes se dibujan
 *      por código (S3).
 *
 * ── Qué NO hace ─────────────────────────────────────────────────────────────
 *  · No implementa `EscalamientoConsultasPort` de M15, ni cola, ni criterio de escalamiento,
 *    ni pantalla de consultas escaladas (D1). El paso a una persona es solo el botón hacia el
 *    formulario de contacto de M15, que sigue siendo de M15.
 *  · No construye HU-ASE-07 (imágenes cargadas): ninguna función de M03 recibe imágenes del
 *    usuario, tampoco el simulador. Se confirmó con Pintuco el 2026-10-12.
 *  · No construye HU-ASE-04 (correspondencia entre color simulado y catálogo): queda fuera
 *    de este contrato, tal como estaba.
 *  · El simulador no repinta muebles, pisos, techos ni carpintería: solo las paredes. Todo
 *    lo demás de la ilustración son tonos fijos (S3). No hay fotografías, ni propias ni del
 *    usuario.
 *  · No filtra ni pagina el catálogo por su cuenta: el botón del cuestionario lleva al
 *    catálogo de M02, que ya resuelve filtros, orden y páginas.
 *  · No crea ni edita productos, variantes, medidas ni rendimientos: eso es de M01. M03
 *    solo LEE el catálogo y nunca estima el rendimiento de un producto que no lo declara
 *    (RF-ASE-02-07).
 *  · No guarda las respuestas del cuestionario, los cálculos ni las conversaciones (D7).
 *    No hay historial personal.
 *  · El asistente no informa precios, descuentos, existencias, plazos, órdenes ni datos de
 *    cuentas, y no pide datos personales (H4).
 *  · No consulta el registro de auditoría de M20: solo escribe en él (A3).
 *
 * ── Decisiones ──────────────────────────────────────────────────────────────
 *  D1 (PO, 2026-10-26) Sin escalamiento automático: desaparecen RF-ATC-05-04 y la cola. El
 *     puerto de M15 queda sin adaptador; el aviso al equipo de M15 lo da el Tech Lead.
 *  D2 (PO, 2026-10-26) El proveedor de IA es Gemini, con API key del servidor.
 *  D3 (PO + Tech Lead, 2026-10-26) Se construyen LOS DOS modos de cuestionario y el PO decide
 *     con ellos a la vista. `modoCuestionario` es un parámetro del panel, no una bandera de
 *     despliegue: se cambia sin tocar código y se puede volver atrás en cualquier momento.
 *     Ninguno de los dos se borra hasta que el PO lo diga.
 *  D4 La IA propone, el SERVIDOR decide. En modo `asistido` Gemini solo escoge de un
 *     vocabulario cerrado de filtros que el servidor le entrega desde el catálogo activo, y
 *     el servidor descarta todo lo que no esté en él. Ningún identificador inventado por el
 *     modelo llega a una consulta ni a una URL (R4).
 *  D5 (PO, 2026-10-26) Calculadora de producto y general, ambas en los dos sentidos.
 *  D6 (PO, 2026-10-26) El asistente atiende las necesidades del cliente dentro del negocio:
 *     pintura, superficies, aplicación y productos de Pintu Clic. Fuera de eso lo dice y
 *     ofrece asesor; no es un asistente de propósito general.
 *  D7 Cuestionario, calculadora y asistente son SIN ESTADO en el servidor: cada petición trae
 *     todo lo que necesita.
 *  D8 La configuración de M03 vive en su propia tabla (`configuracion_asesoria`), igual que
 *     M15 (D2 de su contrato), para no tocar el catálogo de parámetros de M17.
 *  D9 CAPA COMPARTIDA: la traducción de respuestas a filtros, la ruta al catálogo y la
 *     pantalla de resultado son DETERMINISTAS y comunes a los dos modos (sección 2). Lo único
 *     distinto es quién formula las preguntas. Por eso construir los dos modos cuesta poco
 *     más que uno, y por eso elegir uno al final no obliga a rehacer nada.
 *  D10 Auditoría (A1-A3): los incidentes de IA son de M03 y se purgan; los cambios del
 *     administrador van al registro inmutable de M20, que se implementa con este módulo.
 *     Son tablas distintas porque I8 purga y RF-SEG-04-04 prohíbe borrar.
 *  D11 (Tech Lead, 2026-10-26) M03 TOMA EL CATÁLOGO COMO ESTÁ. No agrega categorías,
 *     subcategorías, superficies, familias, resinas ni atributos, ni pide a M01 que los
 *     agregue. Lo que M01 no tiene, M03 no lo pregunta ni lo filtra, y el criterio de
 *     aceptación que dependa de algo inexistente se declara no cumplible (V4) en vez de
 *     inventarle un dato. Lo implementado en M01 es del PO y se mantiene.
 *
 * ── Vocabulario disponible en M01 (D11) ─────────────────────────────────────
 *  V1  LO QUE HAY, y es lo único que el cuestionario puede proponer en los dos modos:
 *        · Categoría (6): Pinturas · Preparación de superficies · Maderas ·
 *          Impermeabilizantes · Aerosoles · Herramientas y accesorios.
 *        · Subcategoría (22), entre ellas Vinilos para muros, Pinturas para fachadas,
 *          Esmaltes, Anticorrosivos, Pinturas para pisos, Pinturas especiales, Estucos y
 *          masillas, Selladores e imprimantes, Barnices, Lacas, Tintes e inmunizantes.
 *        · Superficie (6): Paredes y techos · Madera · Metal · Pisos · Cubiertas y
 *          terrazas · Otras superficies.
 *        · Familia cromática (9): de Blancos a Tierras y cafés.
 *        · Tipo de resina (2): Base agua · Base aceite.
 *        · Línea (4, de marca): Viniltex · Koraza · Pintulux · ICO.
 *        · Ambiente: interior · exterior (M01 · D13: un producto puede estar en uno, en
 *          los dos o en ninguno).
 *  V2  LO QUE NO SE PUEDE LLEVAR AL CATÁLOGO, aunque el dato exista en M01: el acabado, el
 *      `tipoCalidad` de la ficha y la `gamaComercial` de la línea no son filtros de M02
 *      (`filtrosBusquedaBaseSchema`, comprobado en `origin/main` 324a947 el 2026-10-26), y el
 *      botón del cuestionario es una URL del catálogo de M02 (R5). Quedan fuera del
 *      vocabulario; el día que M02 admita el acabado se suma aquí sin cambiar nada más (Q10).
 *  V3  CUESTIONARIO DE PARTIDA DE LA SPEC, contrastado con V1. Cuatro de las seis preguntas
 *      se pueden hacer; dos no, y se omiten (no se inventa el dato). Esto rige el seed del
 *      modo `fijo` y el guion del modo `asistido`:
 *        ✔ Superficie → superficie; «fachada o muro exterior» se resuelve con la
 *          subcategoría Pinturas para fachadas o con ambiente exterior.
 *        ✔ Color → familia cromática.
 *        ✔ Con qué se aplica o diluye → tipo de resina (agua / aceite; «indiferente» = sin
 *          filtro).
 *        ✔ Condición de la superficie → NO existe como atributo del producto: no filtra,
 *          solo sugiere complementos (R8) de Preparación de superficies, Estucos y masillas
 *          o Selladores e imprimantes.
 *        ✘ «¿El espacio es abierto o cerrado?» pierde la opción «Zona húmeda»: M01 no tiene
 *          ese dato. Quedan interior y exterior.
 *        ✘ «¿Qué uso tendrá el espacio?» (residencial / comercial de alto tránsito /
 *          industrial) se omite entera: no hay ningún atributo ni filtro que lo exprese.
 *  V4  CRITERIOS DE ACEPTACIÓN, contrastados con V1:
 *        ✔ CA-ASE-01-02 anticorrosivos → subcategoría Anticorrosivos (existe).
 *        ✔ CA-ASE-01-03 impermeabilizantes → categoría Impermeabilizantes (existe).
 *        ✘ CA-ASE-01-04 pinturas de tráfico → NO CUMPLIBLE: no existe esa subcategoría ni
 *          ninguna equivalente. Lo más cercano es Pinturas para pisos o Pinturas especiales,
 *          que no son lo mismo. No se fuerza el equivalente ni se crea la subcategoría
 *          (D11): decide el PO (Q4).
 *
 * ── Reglas comunes a los dos modos (HU-ASE-01) ──────────────────────────────
 *  R1  Público, sin sesión (CA-ASE-01-01). Sin estado en el servidor: cada petición llega con
 *      las respuestas dadas y el servidor no guarda nada (CA-ASE-01-08).
 *  R2  `GET /asesoria/cuestionario` dice en qué modo está y, si es `fijo`, entrega las
 *      preguntas activas. El frontend no necesita saber nada más para dibujar el flujo.
 *  R3  Toda pregunta es omitible y toda opción, cerrada: no hay texto libre en el
 *      cuestionario. Omitir no aporta filtros (CA-ASE-01-06). Retroceder y cambiar una
 *      respuesta es del frontend: vuelve a pedir con las respuestas vigentes (CA-ASE-01-05).
 *      Las respuestas viven solo en la memoria de la pantalla: ni almacenamiento del
 *      navegador ni URL. Salir del flujo lleva al catálogo y las olvida.
 *  R5  COMBINACIÓN: entre dimensiones distintas, Y; dentro de una misma dimensión, O (igual
 *      que M02 · F1). El resultado es un conjunto de filtros expresable en la URL del
 *      catálogo de M02, con SUS nombres de parámetro (M02 · F8). `rutaCatalogo` la arma el
 *      servidor: es el único punto de M03 que conoce ese formato.
 *  R7  VISTA PREVIA: junto al botón, el servidor devuelve cuántos productos cumplen y hasta
 *      VISTA_PREVIA_PRODUCTOS tarjetas, para que el usuario vea que hay algo antes de salir
 *      del flujo.
 *  R8  COMPLEMENTOS: los productos preparatorios que el caso sugiere van en `complementos`,
 *      con su propio enlace «Ver» al catálogo filtrado. NO entran en los filtros del botón
 *      principal, porque los filtros de M02 se combinan con Y y meterlos ahí vaciaría el
 *      resultado. Solo pueden apuntar a categorías o subcategorías que EXISTEN (V1). Por esta
 *      vía se cumplen CA-ASE-01-02 y CA-ASE-01-03; el 04 no es cumplible (V4, Q4).
 *  R9  SIN RESULTADOS: si no cumple ningún producto, `sinResultados = true` y
 *      `filtroRelajable` señala la ÚLTIMA respuesta dada, que la pantalla ofrece quitar
 *      (CA-ASE-01-07). `rutaCatalogo` se entrega igual, para que el usuario pueda ir al
 *      catálogo y ajustar a mano.
 *  R11 Una respuesta con una pregunta u opción que no corresponde, o que repite una pregunta
 *      ya respondida, se rechaza con 400.
 *
 * ── Reglas del modo `fijo` ──────────────────────────────────────────────────
 *  F1  Las preguntas, sus opciones y los EFECTOS de cada opción están en la BD y los edita el
 *      administrador desde el panel, sin despliegue (RF-ASE-01-02, CA-ASE-01-09).
 *  F2  Efectos de una opción, todos sobre el vocabulario de V1:
 *        · `filtrar`: restringe por categoría, subcategoría, superficie, familia cromática,
 *          tipo de resina o línea.
 *        · `filtrar_ambiente`: restringe a interior o exterior.
 *        · `incluir`: suma los complementos de una categoría o subcategoría (R8). Puede
 *          exigir que también se hayan elegido otras opciones (`requiereOpciones`), por
 *          ejemplo «Metal» junto con «Deteriorada» para proponer anticorrosivos.
 *  F3  Una pregunta con `origenOpciones = familias_color` no tiene opciones propias: son las
 *      familias cromáticas activas del catálogo, cada una con el efecto de filtrar por esa
 *      familia («Las familias cromáticas del catálogo», RF-ASE-01-02).
 *  F4  Un efecto debe apuntar a un elemento ACTIVO del catálogo. Si ese elemento se desactiva
 *      después, el efecto se ignora sin error; si una opción se queda sin efectos válidos,
 *      sigue mostrándose y simplemente no filtra.
 *  F5  No se borran preguntas ni opciones: se desactivan, para no romper un flujo a medias.
 *  F6  El cuestionario de partida de V3 se siembra en `seed_pintuclic.sql`.
 *
 * ── Reglas del modo `asistido` ──────────────────────────────────────────────
 *  R4  VOCABULARIO CERRADO (D4): el servidor entrega al modelo las dimensiones de V1 con los
 *      valores ACTIVOS del catálogo y sus identificadores. Cada opción que el modelo propone
 *      debe traer sus filtros tomados de ese vocabulario. El servidor descarta el filtro que
 *      no exista, esté inactivo o no corresponda a su dimensión; si una opción se queda sin
 *      filtros válidos, se descarta la opción; si la pregunta se queda sin opciones, se pide
 *      otra vez al modelo una sola vez y, si vuelve a fallar, el flujo termina con lo que
 *      haya (nunca con un error técnico).
 *  R6  Un turno = `POST /asesoria/cuestionario/turno` con las respuestas dadas hasta ahora.
 *      El servidor responde la siguiente pregunta o el resultado final. Como máximo
 *      MAX_PREGUNTAS_CUESTIONARIO preguntas; al llegar al tope cierra el flujo aunque el
 *      modelo quiera seguir.
 *  R10 Si la IA no está disponible, el modo `asistido` no finge: informa que la búsqueda
 *      asistida no está disponible y ofrece el catálogo con sus filtros (I5). Las respuestas
 *      ya dadas se conservan en pantalla y sus filtros se traducen igual, porque esa capa no
 *      depende de la IA (D9). Si el modo `fijo` está sembrado, la pantalla puede ofrecerlo
 *      como alternativa.
 *  R12 GUION: el administrador edita el guion del cuestionario y el del asistente (texto) sin
 *      despliegue. El guion orienta el tono y los temas; NUNCA puede levantar las reglas
 *      duras, que están en código: el vocabulario cerrado (R4), la lista cerrada de productos
 *      (H3), el silencio sobre precios y existencias (H4) y el esquema de salida (H5). Un
 *      guion vacío deja las reglas duras y el comportamiento por defecto.
 *
 * ── Reglas de la calculadora (HU-ASE-02) ────────────────────────────────────
 *  K1  Un producto TIENE calculadora si su ficha de recubrimiento tiene `rendimientoMin` y
 *      `rendimientoMax`, y al menos una variante activa cuya medida es de volumen
 *      (`tipo_medida.equivalencia_galones` no nulo). Si no, el producto responde 404
 *      RECURSO_NO_DISPONIBLE y la calculadora no se muestra (RF-ASE-02-07, CA-ASE-02-07).
 *      Así aparece sola en cada ficha que cumpla, sin configurarla por producto.
 *  K2  Rendimiento de una presentación = rendimiento por galón y por mano × volumen de la
 *      presentación en galones (`medida.valor × equivalencia_galones`), por RF-CAT-10-03.
 *  K3  Sentido `cantidad`: unidades = techo(área × manos ÷ rendimiento de la presentación).
 *      Con rango, el mínimo usa `rendimientoMax` y el máximo `rendimientoMin`
 *      (RF-ASE-02-03). Si los dos dan lo mismo, `minimo = maximo` y la pantalla muestra una
 *      sola cifra. Siempre enteros y hacia arriba (CA-ASE-02-01…03).
 *  K4  Sentido `cobertura`: área = unidades × rendimiento de la presentación ÷ manos. El
 *      mínimo usa `rendimientoMin` y el máximo `rendimientoMax`. Se redondea HACIA ABAJO a
 *      un decimal, para no prometer más área de la que cubre.
 *  K5  Aritmética decimal exacta (enteros escalados o Decimal), nunca coma flotante: 50 m² ×
 *      2 ÷ 25 da exactamente 4 y no 4,0000001 → 5.
 *  K6  En `cantidad` la respuesta trae el resultado de la presentación elegida y el
 *      equivalente en las demás presentaciones activas con volumen (RF-ASE-02-04,
 *      CA-ASE-02-04). En `cobertura`, solo la elegida.
 *  K7  Toda respuesta lleva `advertencia` (texto fijo de ADVERTENCIA_CALCULO) y la pantalla
 *      la muestra junto al resultado (RF-ASE-02-05, CA-ASE-02-05).
 *  K8  Área: mayor que 0, hasta 100 000 m² y dos decimales. Manos: entero de 1 a 10.
 *      Unidades: entero de 1 a 1000. Si falta o no cumple, 400 y no se calcula; el
 *      formulario lo dice antes de enviar (RF-ASE-02-08, CA-ASE-02-06, CA-ASE-02-08).
 *  K9  Las manos NO se preguntan. **Esto incumple RF-ASE-02-06 a propósito**: el Product
 *      Owner lo decidió el 2026-10-27, después de ver la calculadora funcionando, y el
 *      mockup (pág. 10) tampoco las pedía. Queda escrito aquí, y no borrado, porque el
 *      requisito sigue existiendo en la spec y alguien va a preguntar por qué no se cumple.
 *      Efecto conocido: quien dé una sola mano verá el doble de pintura de la que necesita.
 *      El servidor resuelve `manosAplicadas` —nunca nulo— en este orden: la ficha del
 *      producto, la configuración del panel (Q1-Q2) y, si no hay ninguna, 2. Lo decide el
 *      servidor y no la pantalla para que haya un solo sitio donde cambiarlo. La pantalla
 *      YA NO lo muestra: el Product Owner lo retiró el 2026-10-28 porque las manos son una
 *      característica del producto y su sitio es la ficha técnica, no el resultado de la
 *      calculadora. Dicho de otro modo, el supuesto se sigue aplicando, pero se enuncia una
 *      sola vez y en el lugar donde M01 está cargando el dato.
 *  K16 El sentido `cobertura` (K4) NO se expone en pantalla. El Product Owner retiró la
 *      pestaña «Cuánto rinde» el 2026-10-28: no aparece en el mockup (pág. 10), que enseña
 *      una sola calculadora. El cálculo del servidor y `calcularCobertura` se conservan a
 *      propósito, para que devolver la pestaña sea volver a pintarla y no rehacer el camino.
 *      Se deja escrito, y no se borra K4, porque la regla sigue siendo correcta: lo que
 *      cambió es qué se enseña, no cómo se calcula.
 *  K15 En la ficha de producto la calculadora va en un DIÁLOGO, detrás del botón «Calcula
 *      cuánta pintura necesitas» que se coloca bajo las presentaciones (mockup pág. 10).
 *      Lo monta M01 con un solo componente de M03 y sin condición alguna: **quien decide si
 *      el producto tiene calculadora es K1, y K1 es de M03**. Si M01 reprodujera esa regla
 *      para saber si pinta el botón habría dos copias que acabarían separándose. Cuando el
 *      producto no cumple, no se dibuja nada: ni el botón, ni un aviso de error.
 *      El diálogo abre con la presentación que la persona ya eligió en la ficha; si ese id
 *      no es de este producto, abre con la primera.
 *  K10 Entradas: en la ficha se fija el producto y el usuario elige presentación y sentido.
 *      En la general, primero se elige el producto en un selector con buscador (AGENTS.md)
 *      sobre `GET /asesoria/calculadora/productos`, que solo lista productos con calculadora.
 *  K11 Público, sin sesión (CA-ASE-02-09). La calculadora NO usa IA: funciona aunque Gemini
 *      esté caído (I6) y se entrega antes que cualquier pieza de IA (E2).
 *  K12 En `cantidad` el ÁREA NO SE PIDE: se pide la superficie y sus medidas, y el área sale
 *      de ellas (mockup VISTAS.pdf, pág. 10). Quien calcula sabe que su pared mide 5 × 2,5,
 *      no que son 25 m²; pedirle el área le obligaba a hacer a mano la multiplicación que
 *      venía a buscar. La pantalla pide, en tres bloques: (1) qué va a pintar —paredes,
 *      techos, puertas o muebles—, (2) ancho, el otro lado y cuántas piezas iguales, y
 *      (3) presentación y resultado. El área total se muestra en vivo mientras se escribe.
 *  K13 El tipo de superficie SOLO cambia el vocabulario, nunca el cálculo: un techo se mide
 *      de ancho y «largo» y una pared de ancho y «alto», y el contador se nombra según la
 *      pieza. No hay coeficientes por superficie (ni «la puerta se pinta por las dos caras»,
 *      ni mermas por textura): el catálogo no registra ese dato y no se inventan cifras.
 *      Área = ancho × ladoMayor × piezas, con un único redondeo final a dos decimales para
 *      cumplir K8 sin arrastrar el error de la coma flotante (misma regla que K5).
 *  K14 El resultado en pantalla corresponde SIEMPRE a los datos que se están viendo. Si se
 *      cambia una medida después de calcular, la cifra se retira hasta volver a calcular:
 *      una cifra que ya no corresponde a lo escrito engaña más que no mostrar ninguna.
 *      La API no cambia: sigue recibiendo `area` en m² (K8), que calcula el cliente.
 *
 * ── Reglas del simulador de color (HU-ASE-03) ───────────────────────────────
 *  S1  QUÉ ES. Una vista del color YA ELEGIDO en el abanico, pintado sobre las paredes de
 *      unos ambientes ilustrados que vienen con el sitio. No es una herramienta de
 *      diseño: no se eligen colores libres, no se suben fotos y no se pinta a mano.
 *      La entrada es un `ColorPaleta` de M01; no hay ninguna otra.
 *  S2  DÓNDE VIVE. Reemplaza el componente `AmbientesColor` de la pestaña «En tu espacio»
 *      de `/paleta-de-color`, tal como M01 · P6 lo dejó previsto: M01 monta UN componente
 *      de M03 y le pasa el color, sin tocar nada más de su página. Mismo trato que la
 *      calculadora en la ficha de producto (K15). Sin color elegido, el simulador dibuja la
 *      invitación a elegir uno y nada más.
 *  S3  CÓMO SE DIBUJA. Cada ambiente es una ILUSTRACIÓN SVG hecha por código, un componente
 *      de React, y se pinta en el navegador. La pared es una forma con `fill` igual al color
 *      elegido; encima van capas de luz y sombra (degradados semitransparentes) para que no
 *      se vea plana; el piso, los muebles y las ventanas son tonos neutros fijos que NO
 *      cambian con el color. Cambiar de color es cambiar un atributo: sin red, sin
 *      imágenes que descargar y sin servidor.
 *      **Por qué SVG y no canvas:** el SVG es declarativo, escala sin perder nitidez, lleva
 *      su propio texto accesible (`role="img"` y `aria-label`) y se puede comprobar en las
 *      pruebas como cualquier otro componente. El canvas es un lienzo mudo: habría que
 *      redibujarlo a mano en cada cambio y sin nada que un lector de pantalla pueda leer.
 *      **Por qué en el navegador y no en el servidor**, habiendo `sharp`: la gracia es ir
 *      saltando de color en color y ver el cambio al instante. Una petición por color pone
 *      una espera en el único momento que importa.
 *  S4  CONSECUENCIA CONOCIDA, Y SE DICE: es una ilustración, no una fotografía. El mockup de
 *      Pintuco muestra una foto real; esto se verá como un dibujo limpio de una habitación.
 *      Es el precio de no depender de fotos ni de nadie que las produzca. La luz se modela
 *      con capas blancas y negras de poca opacidad —no con mezclas que oscurezcan el
 *      color—, de modo que un tono claro sigue viéndose claro y uno oscuro, oscuro. El PO
 *      valida el aspecto cuando lo vea (Q12), igual que valida los guiones del asistente.
 *  S5  LOS AMBIENTES. Lista fija y ordenada, declarada en el módulo (`services/ambientes.ts`),
 *      igual que las superficies de la calculadora (K13): contenido sin regla de negocio que
 *      no merece tabla ni endpoint. Cada ambiente lleva `id`, nombre visible, `tipo`
 *      (`interior` | `exterior`) y texto alternativo; el dibujo es un componente asociado a
 *      ese `id`. Son PUNTOS DE VISTA de espacios de una casa: una misma sala vista de frente
 *      y desde una esquina cuenta como dos. Añadir uno es una entrada en la lista y un
 *      componente, nada más (Q11).
 *  S6  EL SELECTOR DE PUNTO DE VISTA. Bajo la imagen, una fila de miniaturas con el rótulo
 *      «Selecciona el ambiente:». Cada miniatura es el MISMO dibujo en pequeño, ya pintado con
 *      el color elegido, de modo que se ve cómo quedaría en cada vista antes de entrar en
 *      ella. Es un GRUPO DE RADIO de verdad: `<input type="radio">` ocultos con `sr-only`
 *      dentro de etiquetas con estilo, como las tarjetas de superficie de la calculadora. El
 *      ambiente activo se distingue por algo más que el color del borde, para que se vea
 *      sin distinguir colores.
 *  S7  QUÉ NO PROMETE. El color simulado es una REFERENCIA, no una garantía: las pantallas
 *      no están calibradas y el resultado real depende de la luz, de las manos aplicadas y
 *      de la superficie. Toda vista va acompañada de un aviso fijo (`ADVERTENCIA_SIMULADOR`),
 *      igual que el cálculo lleva el suyo (K7). Los textos dicen «así se vería,
 *      aproximadamente», nunca «así se verá».
 *  S8  EL COLOR SIEMPRE IDENTIFICADO. En una esquina de la imagen, el nombre y el código del
 *      color («Sol De La Tarde · NRO96T»), para que no haya duda de qué se está mirando. El
 *      rótulo se lee sobre su propio color con el contraste del core (S11).
 *  S9  ACCESIBILIDAD Y MOVIMIENTO. Cada dibujo es `role="img"` con un `aria-label` que dice
 *      el espacio y el color («Sala de frente, pintada en Sol De La Tarde»). El cambio de
 *      color se anima con una transición corta que se apaga con `prefers-reduced-motion`.
 *      Si el color no fuera un `#RRGGBB` válido no se pinta nada y se muestra la invitación
 *      a elegir uno (S2): la paleta tiene que seguir funcionando pase lo que pase.
 *  S10 SIN IA Y SIN SERVIDOR. El simulador no llama a Gemini ni a ningún endpoint: sigue
 *      funcionando con el servicio de IA caído, igual que la calculadora (I6). No añade
 *      endpoints, tablas ni permisos.
 *  S11 LO ÚNICO QUE NECESITA DE FUERA. El ayudante de contraste del core (`colorDeTexto`),
 *      para que el rótulo de S8 se lea sobre cualquier color. Hoy vive en M01 y M03 no puede
 *      importarlo (ver «Fuera del módulo»).
 *
 * ── Reglas del asistente (HU-ASE-05) ────────────────────────────────────────
 *  H1  Público, sin sesión. El servidor no guarda la conversación: el frontend envía el
 *      mensaje nuevo y como mucho los últimos CHAT_MAX_TURNOS_HISTORIAL turnos, que conserva
 *      solo en memoria.
 *  H2  Gemini con la clave en la variable de entorno `GEMINI_API_KEY` y el modelo en
 *      `GEMINI_MODELO`. La clave nunca va al repo, a las respuestas, a los registros ni al
 *      navegador: el navegador solo habla con nuestro backend (Q5).
 *  H3  Contexto de catálogo: antes de llamar a Gemini, el servidor busca en el catálogo
 *      público hasta CHAT_MAX_PRODUCTOS_CONTEXTO productos relacionados con el mensaje y se
 *      los entrega al modelo con nombre, marca, categoría, superficies, ambiente y
 *      rendimiento. El modelo solo puede sugerir productos de esa lista.
 *  H4  Dominio (D6): pintura, preparación de superficies, aplicación y productos de Pintu
 *      Clic. Responde en español, breve y en tono de asesor de tienda. No informa precios,
 *      descuentos, existencias, plazos, órdenes ni cuentas: remite al catálogo o al carrito.
 *      No inventa productos ni rendimientos y para cantidades remite a la calculadora. No
 *      pide datos personales. Ante un tema fuera del dominio, o cuando la persona pide hablar
 *      con alguien, lo dice con amabilidad y marca `ofrecerAsesor` (Q6).
 *  H5  Salida estructurada: Gemini responde un JSON que se valida con
 *      `salidaModeloChatSchema`. Los identificadores de producto que no estaban en el
 *      contexto se descartan. Si el JSON no pasa, es respuesta no procesable (I4).
 *  H6  El texto de la persona va como contenido del usuario, separado de las instrucciones
 *      del sistema. La respuesta se muestra como texto plano, nunca como HTML.
 *  H7  Botón «¿Quieres comunicarte con un asesor?»: siempre visible y destacado cuando
 *      `ofrecerAsesor` es verdadero o el servicio falla. Lleva al formulario de contacto de
 *      M15 en `/centro-de-ayuda`. Ese formulario exige sesión (M15 · R3): a un visitante lo
 *      lleva al login M15, no M03. M03 no llama al backend de M15.
 *  H8  Límite por origen: CHAT_MENSAJES_POR_MINUTO mensajes y TURNOS_CUESTIONARIO_POR_MINUTO
 *      turnos de cuestionario asistido por minuto, contados solo en memoria y sin guardar la
 *      IP (mismo criterio que M14 · M6). Al pasarlo, 429 LIMITE_MENSAJES_EXCEDIDO.
 *  H9  Presentación (mockup VISTAS.pdf, pág. 11): el asistente es una burbuja flotante
 *      montada en el armazón público, no una página. El botón redondo queda fijo en pantalla
 *      al cambiar de vista y la conversación sobrevive a la navegación; recargar la borra,
 *      como manda H1. No es un diálogo modal: no atrapa el foco ni bloquea el fondo, porque
 *      la gracia es poder mirar un producto mientras se pregunta por él. Escape lo cierra y
 *      el foco vuelve al botón. La sección «Preguntar al asistente» de /asesoria no dibuja
 *      un segundo chat: abre este.
 *  H10 Atajos de apertura: los que preguntan escriben su texto en el chat; los que piden un
 *      dato que H4 le prohíbe al modelo —el pedido (órdenes) y las promociones (precios y
 *      descuentos)— NO van al chat, navegan a la pantalla que sí tiene ese dato. Un atajo que
 *      la IA tendría que rechazar no se ofrece como si fuera a funcionar.
 *
 * ── Reglas de resiliencia (HU-ASE-06) ───────────────────────────────────────
 *  I1  Cada llamada a Gemini tiene el tiempo máximo `iaTiempoEsperaMs` y se reintenta hasta
 *      `iaReintentos` veces con espera creciente, solo ante tiempo agotado, error de red o
 *      5xx. Un 4xx o una respuesta no procesable no se reintenta (RF-ASE-06-03).
 *  I2  Agotados los intentos: 503 SERVICIO_IA_NO_DISPONIBLE con un mensaje para cualquier
 *      persona, sin códigos ni trazas (RF-ASE-06-01, CA-ASE-06-01, CA-ASE-06-03).
 *  I3  Cuota agotada (Gemini 429 / RESOURCE_EXHAUSTED): se suspenden las llamadas durante
 *      `iaSuspensionCuotaMinutos`. Mientras dure, se responde 503 SERVICIO_IA_SUSPENDIDO de
 *      inmediato, sin llamar a Gemini (CA-ASE-06-06). La suspensión vive en memoria (Q9).
 *  I4  Respuesta vacía, incompleta o que no cumple el esquema: se descarta, se registra el
 *      incidente y se responde 503 SERVICIO_IA_NO_DISPONIBLE (RF-ASE-06-04, CA-ASE-06-04).
 *  I5  Alternativas (RF-ASE-06-05, CA-ASE-06-05): el botón de asesor (H7), la última
 *      respuesta válida de la conversación —que el frontend conserva en memoria—, el
 *      cuestionario en modo `fijo` si está sembrado y el catálogo con sus filtros (R10).
 *  I6  Aislamiento (RF-ASE-06-02, CA-ASE-06-02): ningún otro módulo depende de M03 para
 *      funcionar, y dentro de M03 ni la calculadora ni el modo `fijo` dependen de la IA. El
 *      asistente se carga aparte y sus errores no salen de su panel; catálogo, búsqueda y
 *      carrito no lo esperan. La interfaz nunca se bloquea esperando a Gemini.
 *  I7  Registro de incidentes (`incidente_ia`): fecha y hora, servicio, función
 *      (`chat` o `cuestionario`), tipo de error, intentos y resultado. NUNCA el texto de la
 *      persona, la respuesta del modelo, la IP ni la clave (RF-ASE-06-06). Se registra también
 *      cuando un reintento lo salva (resultado `recuperado`).
 *  I8  Retención: los incidentes con más de `iaRetencionIncidentesDias` días se borran (purga
 *      al registrar, como mucho una vez al día). Por esto no viven en el registro de
 *      auditoría de M20, que es inmutable (D10).
 *  I9  Alerta: cuando los fallos consecutivos (resultado `fallido` o `suspendido` sin un
 *      éxito en medio) llegan a `iaFallosConsecutivosAlerta`, se activa la alerta del panel y
 *      se envía UNA notificación `alerta_servicio_ia` por M18 (A4); un éxito la apaga
 *      (CA-ASE-06-07).
 *
 * ── Reglas de auditoría (D10) ───────────────────────────────────────────────
 *  A1  Todo cambio del administrador en M03 (configuración, guiones, modo, preguntas,
 *      opciones y efectos) se registra en el registro de auditoría de M20 con actor, acción,
 *      entidad, identificador, valor anterior y valor nuevo (RF-SEG-04-02, RF-SEG-04-03), por
 *      `AuditoriaPort.registrarAccion`.
 *  A2  El guion se registra por su longitud y una huella, no por su texto completo, para que
 *      el registro no crezca sin control. El valor de un parámetro sí se guarda entero.
 *  A3  M03 solo ESCRIBE. La consulta del registro (RF-SEG-04-05) es de M20 y no entra aquí.
 *  A4  Si la auditoría o la notificación fallan, el cambio del administrador NO se deshace:
 *      se responde correctamente y el fallo queda en el registro técnico. Un registro de
 *      auditoría caído no puede bloquear la operación del panel.
 *
 * ── Autorización ────────────────────────────────────────────────────────────
 *  Público (sin sesión): todo `/asesoria/*`.
 *  `/admin/asesoria/*`: lectura con `asesoria.ver`; escritura con `asesoria.editar`, que
 *  incluye `asesoria.ver` (mismo par que el resto de áreas de M17). Sin permiso, 404 opaco
 *  RECURSO_NO_DISPONIBLE (ADR-003). Los dos permisos son NUEVOS y entran en el PR general.
 *
 * ── Endpoints ───────────────────────────────────────────────────────────────
 *  Público
 *   GET    /asesoria/cuestionario                         modo vigente y, si `fijo`, preguntas
 *   POST   /asesoria/cuestionario/resultado               resultado del modo `fijo`
 *   POST   /asesoria/cuestionario/turno                   siguiente pregunta o resultado (`asistido`)
 *   GET    /asesoria/calculadora/productos                productos con calculadora (?q, paginado)
 *   GET    /asesoria/calculadora/productos/:idProducto    datos de la calculadora de un producto
 *   POST   /asesoria/calculadora/calcular                 cantidad o cobertura
 *   GET    /asesoria/asistente/estado                     si el asistente está disponible ahora
 *   POST   /asesoria/asistente/mensajes                   un turno de conversación
 *  Admin
 *   GET    /admin/asesoria/cuestionario                   todo, con inactivos y efectos     (ver)
 *   POST   /admin/asesoria/preguntas                      crear pregunta                    (editar)
 *   PATCH  /admin/asesoria/preguntas/:idPregunta          texto, orden, estado              (editar)
 *   POST   /admin/asesoria/preguntas/:idPregunta/opciones crear opción                      (editar)
 *   PATCH  /admin/asesoria/opciones/:idOpcion             texto, orden, estado              (editar)
 *   PUT    /admin/asesoria/opciones/:idOpcion/efectos     reemplaza los efectos             (editar)
 *   GET    /admin/asesoria/configuracion                  modo, parámetros y guiones        (ver)
 *   PATCH  /admin/asesoria/configuracion                  modo, parámetros y guiones        (editar)
 *   GET    /admin/asesoria/ia/estado                      disponibilidad, suspensión, alerta (ver)
 *   GET    /admin/asesoria/incidentes                     registro paginado (?tipo, ?desde, ?hasta) (ver)
 *
 * ── Errores ─────────────────────────────────────────────────────────────────
 *  400 PARAMETRO_INVALIDO          entrada que no cumple el esquema, con el campo y el motivo
 *  404 RECURSO_NO_DISPONIBLE       inexistente, inactivo, sin calculadora o sin permiso
 *  409 MODO_CUESTIONARIO_DISTINTO  se pidió el resultado de un modo que no es el vigente
 *  429 LIMITE_MENSAJES_EXCEDIDO    tope de mensajes o de turnos (H8)
 *  503 SERVICIO_IA_NO_DISPONIBLE   Gemini no respondió o respondió algo no procesable (I2, I4)
 *  503 SERVICIO_IA_SUSPENDIDO      cuota agotada, en suspensión (I3)
 *  500 ERROR_INTERNO               genérico, sin detalles
 *
 * ── Fuera del módulo (PR general, etapa 2 = E1) ─────────────────────────────
 *  Cada punto dice a qué módulo pertenece. El Tech Lead avisa a sus dueños.
 *  · M03 (propio): tablas `pregunta_asesoria`, `opcion_asesoria`, `efecto_opcion_asesoria`,
 *    `configuracion_asesoria` (una fila) e `incidente_ia`.
 *  · M20 Seguridad: tabla `registro_auditoria` INMUTABLE (sin UPDATE ni DELETE para el rol de
 *    la aplicación, por DDL, RF-SEG-04-04), método `registrarAccion` en `AuditoriaPort` y su
 *    adaptador persistente. HU-SEG-04 deja de estar aplazada en su parte de ESCRITURA; la
 *    consulta sigue siendo de M20 (A3).
 *  · M18 Notificaciones: tipo de comunicación `alerta_servicio_ia` y su plantilla (I9, Q8).
 *  · M17 Permisos: `asesoria.ver` y `asesoria.editar` en el catálogo (contrato y DTOs), como
 *    se hizo con `atencion.atender_clientes`.
 *  · Seed: el cuestionario de partida de V3, la fila de configuración con los valores de Q1 y
 *    los dos permisos nuevos.
 *  · `app.routes.ts`: montar los routers de M03.
 *  · M01 Catálogo: una línea en la ficha de producto para montar la calculadora.
 *  · FP01 Landing: una línea para montar la calculadora general.
 *  · Core frontend: el botón del asistente en el layout público (Q7).
 *  · SIMULADOR (E5) · Core frontend: `colorDeTexto` —hoy en `m01-catalogo/services/contraste`—
 *    pasa a `core/utils/color-muestra.ts`, donde ya viven `luminancia` y `esColorMuyClaro`.
 *    M03 no puede importar servicios de M01 (aislamiento, AGENTS.md) y duplicar el cálculo de
 *    contraste sería tener dos verdades sobre si un texto se lee. M01 sigue usándolo desde el
 *    core, sin cambiar su conducta.
 *  · SIMULADOR (E5) · M01 Catálogo: una línea en la pestaña «En tu espacio» para montar el
 *    componente de M03 en lugar de `AmbientesColor`, tal como P6 lo dejó previsto.
 *
 * ── Preguntas abiertas ──────────────────────────────────────────────────────
 *  Q1  Anexo B de la Tanda 2 (no está en el repo). Se asume, editable en el panel:
 *      manos por defecto = ninguna, tiempo de espera 8000 ms, 2 reintentos, retención de
 *      incidentes 90 días, alerta a los 5 fallos seguidos, suspensión por cuota 60 min.
 *  Q2  RF-CAT-10-02 y RF-ASE-02-02 dicen que el rendimiento es POR MANO, pero
 *      `ficha_recubrimiento.manos` se describe como «manos con las que se logra el
 *      rendimiento». Se asume que el rendimiento es por mano y que `manos` es solo la
 *      sugerencia de K9. Si en realidad es el rendimiento total con esas manos, cambia K2.
 *  Q3  Qué modo queda. Se construyen los dos (D3) y el modo por defecto del seed es `fijo`,
 *      porque no depende de un servicio externo y se puede probar sin clave. El PO compara
 *      los dos en el VPS y decide; el que sobre se retira en un PR aparte.
 *  Q4  CA-ASE-01-04 (pinturas de tráfico) NO ES CUMPLIBLE con el catálogo actual (V4): esa
 *      subcategoría no existe y por D11 no se crea ni se sustituye por una parecida. El PO
 *      decide: o M01 la agrega —y es trabajo de M01, no de M03—, o el criterio se retira.
 *      Entretanto M03 se entrega sin él y así se declara al cerrar el módulo.
 *  Q4b Dos piezas del cuestionario de la spec se omiten por falta de dato en M01 (V3): la
 *      opción «Zona húmeda» y la pregunta completa «¿Qué uso tendrá el espacio?». Si el
 *      negocio las quiere, hay que modelarlas antes en M01 y en los filtros de M02.
 *  Q5  Qué modelo de Gemini y quién entrega la clave. Se asume un modelo «flash» elegido por
 *      DevOps; el código no depende del nombre.
 *  Q6  El PO valida el guion por defecto del asistente y del cuestionario (H4, R12) antes de
 *      publicarlos.
 *  Q7  Dónde vive el asistente. Se asume un botón flotante en las páginas públicas, montado
 *      en el layout público del core. La calculadora de producto se monta en la ficha de M01 y
 *      la general en la landing (FP01). Mientras no estén montadas, M03 las publica en
 *      `/asesoria`.
 *  Q8  La alerta por correo usa el tipo `alerta_servicio_ia` nuevo de M18. Falta decidir a
 *      qué destinatario: se asume el correo de contacto del administrador configurado en M15.
 *  Q9  La suspensión por cuota y los topes por minuto viven en memoria: valen para un solo
 *      servidor (el VPS actual). Con varias instancias habría que llevarlos a la BD.
 *  Q11 SIMULADOR · Cuántos ambientes y cuáles. Se asume, para arrancar, seis puntos de vista:
 *      sala de frente, sala desde la esquina, alcoba, comedor, estudio y una fachada. El
 *      mockup enseña siete miniaturas. Como se dibujan por código, cada uno cuesta un
 *      componente: si el PO quiere más o distintos, se piden por su nombre.
 *  Q12 SIMULADOR · Aspecto. El mockup muestra una fotografía y esto será una ilustración (S4).
 *      El PO debe ver el resultado y decir si le sirve; si exige fotografía, cambia el
 *      contrato entero, porque vuelve la dependencia de fotos y máscaras que este diseño
 *      evita a propósito.
 *  Q10 El PO dice que M02 ya corrigió sus filtros, pero `origin/main` (324a947, 2026-10-26) no
 *      trae ningún cambio de M02 posterior al PR #62 y `idAcabado` no existe en su contrato ni
 *      en su código. Si la corrección está en una rama sin fusionar, hay que fusionarla antes
 *      de E3 y volver a revisar V2: el acabado entraría al vocabulario sin cambiar nada más.
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. CONSTANTES
 * ─────────────────────────────────────────────────────────────────────────── */

export const ADVERTENCIA_CALCULO =
  'La cantidad es aproximada: el rendimiento real depende del estado y la absorción de la superficie.';
export const MAX_PREGUNTAS_CUESTIONARIO = 8;
export const MAX_OPCIONES_PREGUNTA = 8;
export const VISTA_PREVIA_PRODUCTOS = 6;
export const MAX_COMPLEMENTOS = 6;
export const CHAT_MENSAJES_POR_MINUTO = 10;
export const TURNOS_CUESTIONARIO_POR_MINUTO = 20;
export const CHAT_MAX_TURNOS_HISTORIAL = 10;
export const CHAT_MAX_PRODUCTOS_CONTEXTO = 5;

/* ───────────────────────────────────────────────────────────────────────────
 * 2. CAPA COMPARTIDA: VOCABULARIO, FILTROS Y RUTA AL CATÁLOGO (D9)
 *
 * No habla con Gemini. La usan los DOS modos del cuestionario (R5) y cualquier
 * flujo que necesite llevar al catálogo de M02 con filtros aplicados.
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Dimensiones que M02 sabe filtrar HOY (su `filtrosBusquedaBaseSchema`) y cuyos nombres de
 * parámetro conoce `rutaCatalogo`. No se agrega ninguna que M02 no tenga: el acabado, el
 * tipo de calidad y la gama comercial de la línea NO son filtros de M02 (V2, Q10).
 */
export const dimensionFiltroSchema = z.enum([
  'categoria',
  'subcategoria',
  'superficie',
  'familia_color',
  'tipo_resina',
  'linea',
]);
export type DimensionFiltro = z.infer<typeof dimensionFiltroSchema>;

/** Dimensiones que admite el efecto `incluir` y los complementos (R8). */
export const dimensionComplementoSchema = z.enum(['categoria', 'subcategoria']);
export type DimensionComplemento = z.infer<typeof dimensionComplementoSchema>;

/** Un filtro concreto: una dimensión y un valor del catálogo activo (V1). */
export const filtroCatalogoSchema = z.object({
  dimension: dimensionFiltroSchema,
  idValor: idSchema,
});
export type FiltroCatalogo = z.infer<typeof filtroCatalogoSchema>;

/** Conjunto final: Y entre dimensiones, O dentro de cada una (R5). */
export const filtrosPropuestosSchema = z.object({
  filtros: z.array(filtroCatalogoSchema).max(30),
  ambiente: ambienteSchema.nullable(),
});
export type FiltrosPropuestos = z.infer<typeof filtrosPropuestosSchema>;

/** Un valor del vocabulario, tal como se muestra al usuario y se ofrece al modelo. */
export const valorVocabularioSchema = z.object({
  dimension: dimensionFiltroSchema,
  idValor: idSchema,
  nombre: z.string(),
});
export type ValorVocabulario = z.infer<typeof valorVocabularioSchema>;

/** El resultado final del cuestionario, IDÉNTICO en los dos modos (D9, R5, R7, R8, R9). */
export const resultadoCuestionarioSchema = z.object({
  filtrosPropuestos: filtrosPropuestosSchema,
  /** Nombres legibles de lo aplicado, para que el usuario vea con qué se va al catálogo. */
  resumenFiltros: z.array(valorVocabularioSchema),
  /** R5: ruta relativa al catálogo de M02 con sus nombres de parámetro. */
  rutaCatalogo: z.string().min(1),
  total: z.number().int().nonnegative(),
  vistaPrevia: z.array(productoPublicoTarjetaSchema).max(VISTA_PREVIA_PRODUCTOS),
  /** R8: preparatorios, cada uno con su propia ruta al catálogo. */
  complementos: z
    .array(
      z.object({
        titulo: z.string().min(1).max(100),
        rutaCatalogo: z.string().min(1),
        productos: z.array(productoPublicoTarjetaSchema).max(MAX_COMPLEMENTOS),
      }),
    )
    .max(3),
  sinResultados: z.boolean(),
  /** R9: última respuesta dada, que la pantalla ofrece quitar. Null si no hay ninguna. */
  filtroRelajable: z.object({ idPregunta: z.string(), texto: z.string() }).nullable(),
});
export type ResultadoCuestionario = z.infer<typeof resultadoCuestionarioSchema>;

export const resultadoCuestionarioResponseEnvelopeSchema = respuestaUno(resultadoCuestionarioSchema);
export type ResultadoCuestionarioResponseEnvelope = z.infer<typeof resultadoCuestionarioResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 3. CUESTIONARIO — MODO VIGENTE Y MODO `fijo` (HU-ASE-01, F1-F6)
 * ─────────────────────────────────────────────────────────────────────────── */

export const modoCuestionarioSchema = z.enum(['fijo', 'asistido']);
export type ModoCuestionario = z.infer<typeof modoCuestionarioSchema>;

export const textoPreguntaSchema = z.string().trim().min(3).max(200);
export const textoOpcionSchema = z.string().trim().min(1).max(100);
export const ordenSchema = z.number().int().min(0).max(10_000);

export const origenOpcionesSchema = z.enum(['manual', 'familias_color']);
export type OrigenOpciones = z.infer<typeof origenOpcionesSchema>;

/** F2: lo que hace elegir una opción. */
export const efectoOpcionSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('filtrar'), dimension: dimensionFiltroSchema, idObjetivo: idSchema }),
  z.object({ tipo: z.literal('filtrar_ambiente'), ambiente: ambienteSchema }),
  z.object({
    tipo: z.literal('incluir'),
    dimension: dimensionComplementoSchema,
    idObjetivo: idSchema,
    /** Opciones que también deben estar elegidas para que el efecto aplique. */
    requiereOpciones: z.array(idSchema).max(5).default([]),
  }),
]);
export type EfectoOpcion = z.infer<typeof efectoOpcionSchema>;

/** Vista pública: sin efectos. En `familias_color`, `idOpcion` es el id de la familia (F3). */
export const opcionPublicaSchema = z.object({
  idOpcion: idSchema,
  texto: z.string(),
  /** Solo en `familias_color`: muestra de la familia. */
  hexadecimal: z.string().nullable(),
});
export type OpcionPublica = z.infer<typeof opcionPublicaSchema>;

export const preguntaPublicaSchema = z.object({
  idPregunta: idSchema,
  texto: z.string(),
  origenOpciones: origenOpcionesSchema,
  opciones: z.array(opcionPublicaSchema),
});
export type PreguntaPublica = z.infer<typeof preguntaPublicaSchema>;

/** GET /asesoria/cuestionario (R2). `preguntas` viene vacío en modo `asistido`. */
export const cuestionarioPublicoSchema = z.object({
  modo: modoCuestionarioSchema,
  preguntas: z.array(preguntaPublicaSchema),
  /** En `asistido`, false cuando la IA no está disponible ahora (R10). */
  disponible: z.boolean(),
});
export type CuestionarioPublico = z.infer<typeof cuestionarioPublicoSchema>;

export const cuestionarioResponseEnvelopeSchema = respuestaUno(cuestionarioPublicoSchema);
export type CuestionarioResponseEnvelope = z.infer<typeof cuestionarioResponseEnvelopeSchema>;

export const respuestaFijaSchema = z.object({ idPregunta: idSchema, idOpcion: idSchema });

/** POST /asesoria/cuestionario/resultado — modo `fijo`. Orden = el de respuesta (R9). */
export const resultadoFijoInputSchema = z
  .object({ respuestas: z.array(respuestaFijaSchema).max(20) })
  .refine((v) => new Set(v.respuestas.map((r) => r.idPregunta)).size === v.respuestas.length, {
    message: 'Cada pregunta se responde una sola vez',
    path: ['respuestas'],
  });
export type ResultadoFijoInput = z.infer<typeof resultadoFijoInputSchema>;

/* ── Admin del modo `fijo` ── */

export const opcionAdminSchema = z.object({
  idOpcion: idSchema,
  texto: z.string(),
  orden: z.number().int(),
  activa: z.boolean(),
  efectos: z.array(efectoOpcionSchema),
});
export type OpcionAdmin = z.infer<typeof opcionAdminSchema>;

export const preguntaAdminSchema = z.object({
  idPregunta: idSchema,
  texto: z.string(),
  orden: z.number().int(),
  activa: z.boolean(),
  origenOpciones: origenOpcionesSchema,
  /** Vacío en `familias_color` (F3). */
  opciones: z.array(opcionAdminSchema),
});
export type PreguntaAdmin = z.infer<typeof preguntaAdminSchema>;

export const cuestionarioAdminResponseEnvelopeSchema = respuestaUno(
  z.object({ modo: modoCuestionarioSchema, preguntas: z.array(preguntaAdminSchema) }),
);
export type CuestionarioAdminResponseEnvelope = z.infer<typeof cuestionarioAdminResponseEnvelopeSchema>;

export const createPreguntaInputSchema = z.object({
  texto: textoPreguntaSchema,
  orden: ordenSchema,
  origenOpciones: origenOpcionesSchema.default('manual'),
});
export type CreatePreguntaInput = z.infer<typeof createPreguntaInputSchema>;

export const updatePreguntaInputSchema = z
  .object({ texto: textoPreguntaSchema, orden: ordenSchema, activa: z.boolean() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Indica al menos un cambio' });
export type UpdatePreguntaInput = z.infer<typeof updatePreguntaInputSchema>;

export const createOpcionInputSchema = z.object({ texto: textoOpcionSchema, orden: ordenSchema });
export type CreateOpcionInput = z.infer<typeof createOpcionInputSchema>;

export const updateOpcionInputSchema = z
  .object({ texto: textoOpcionSchema, orden: ordenSchema, activa: z.boolean() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Indica al menos un cambio' });
export type UpdateOpcionInput = z.infer<typeof updateOpcionInputSchema>;

/** PUT /admin/asesoria/opciones/:idOpcion/efectos — reemplaza el conjunto completo. */
export const updateEfectosInputSchema = z.object({ efectos: z.array(efectoOpcionSchema).max(10) });
export type UpdateEfectosInput = z.infer<typeof updateEfectosInputSchema>;

export const preguntaAdminResponseEnvelopeSchema = respuestaUno(preguntaAdminSchema);
export type PreguntaAdminResponseEnvelope = z.infer<typeof preguntaAdminResponseEnvelopeSchema>;
export const opcionAdminResponseEnvelopeSchema = respuestaUno(opcionAdminSchema);
export type OpcionAdminResponseEnvelope = z.infer<typeof opcionAdminResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. CUESTIONARIO — MODO `asistido` (R4, R6, R10)
 * ─────────────────────────────────────────────────────────────────────────── */

/** Opción cerrada de una pregunta propuesta por el modelo. `idOpcion` es del turno. */
export const opcionPreguntaSchema = z.object({
  idOpcion: z.string().min(1).max(40),
  texto: z.string().min(1).max(100),
});
export type OpcionPregunta = z.infer<typeof opcionPreguntaSchema>;

export const preguntaAsistidaSchema = z.object({
  idPregunta: z.string().min(1).max(40),
  texto: z.string().min(1).max(200),
  opciones: z.array(opcionPreguntaSchema).min(2).max(MAX_OPCIONES_PREGUNTA),
  /** R3: toda pregunta se puede omitir. */
  omitible: z.literal(true),
});
export type PreguntaAsistida = z.infer<typeof preguntaAsistidaSchema>;

/**
 * Una respuesta ya dada. `filtros` son los que el SERVIDOR validó cuando ofreció esa opción
 * (R4): viajan con la respuesta porque el flujo es sin estado (D7) y se vuelven a validar en
 * cada turno, así que una opción manipulada no mete un filtro inventado.
 */
export const respuestaDadaSchema = z.object({
  idPregunta: z.string().min(1).max(40),
  texto: z.string().min(1).max(200),
  idOpcion: z.string().min(1).max(40).nullable(),
  opcionTexto: z.string().min(1).max(100).nullable(),
  filtros: z.array(filtroCatalogoSchema).max(10),
  ambiente: ambienteSchema.nullable(),
  complementos: z.array(z.object({ dimension: dimensionComplementoSchema, idValor: idSchema })).max(3),
  /** True cuando la persona omitió la pregunta (CA-ASE-01-06). */
  omitida: z.boolean(),
});
export type RespuestaDada = z.infer<typeof respuestaDadaSchema>;

/** POST /asesoria/cuestionario/turno */
export const turnoCuestionarioInputSchema = z
  .object({
    respuestas: z.array(respuestaDadaSchema).max(MAX_PREGUNTAS_CUESTIONARIO),
    /** La persona pidió terminar y ver el resultado con lo respondido hasta ahora. */
    finalizar: z.boolean().default(false),
  })
  .refine((v) => new Set(v.respuestas.map((r) => r.idPregunta)).size === v.respuestas.length, {
    message: 'Cada pregunta se responde una sola vez',
    path: ['respuestas'],
  });
export type TurnoCuestionarioInput = z.infer<typeof turnoCuestionarioInputSchema>;

/** Un turno: o viene `pregunta`, o viene `resultado`. Nunca los dos (R6). */
export const turnoCuestionarioSchema = z.discriminatedUnion('fase', [
  z.object({
    fase: z.literal('pregunta'),
    pregunta: preguntaAsistidaSchema,
    numero: z.number().int().min(1).max(MAX_PREGUNTAS_CUESTIONARIO),
  }),
  z.object({ fase: z.literal('resultado'), resultado: resultadoCuestionarioSchema }),
]);
export type TurnoCuestionario = z.infer<typeof turnoCuestionarioSchema>;

export const turnoCuestionarioResponseEnvelopeSchema = respuestaUno(turnoCuestionarioSchema);
export type TurnoCuestionarioResponseEnvelope = z.infer<typeof turnoCuestionarioResponseEnvelopeSchema>;

/** R4: lo que se le exige al modelo en el cuestionario. No sale del servidor. */
export const salidaModeloPreguntaSchema = z.object({
  /** False cuando el modelo considera que ya hay suficiente para filtrar. */
  continuar: z.boolean(),
  texto: z.string().trim().min(1).max(200),
  opciones: z
    .array(
      z.object({
        texto: z.string().trim().min(1).max(100),
        filtros: z.array(filtroCatalogoSchema).max(10),
        ambiente: ambienteSchema.nullable(),
        complementos: z.array(z.object({ dimension: dimensionComplementoSchema, idValor: idSchema })).max(3),
      }),
    )
    .max(MAX_OPCIONES_PREGUNTA),
});
export type SalidaModeloPregunta = z.infer<typeof salidaModeloPreguntaSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 5. CALCULADORA (HU-ASE-02)
 * ─────────────────────────────────────────────────────────────────────────── */

const dosDecimales = (v: number): boolean => Math.abs(v * 100 - Math.round(v * 100)) < 1e-9;

export const areaSchema = z
  .number({ error: 'Indica el área a pintar en metros cuadrados' })
  .gt(0, 'El área debe ser mayor que cero')
  .max(100_000, 'El área no puede pasar de 100 000 m²')
  .refine(dosDecimales, 'Usa como máximo dos decimales');

export const manosSchema = z
  .number({ error: 'Indica cuántas manos vas a dar' })
  .int('Las manos deben ser un número entero')
  .min(1, 'Indica al menos una mano')
  .max(10, 'Como máximo 10 manos');

export const unidadesSchema = z
  .number({ error: 'Indica cuántas unidades tienes' })
  .int('Las unidades deben ser un número entero')
  .min(1, 'Indica al menos una unidad')
  .max(1000, 'Como máximo 1000 unidades');

export const productoCalculableSchema = z.object({
  idProducto: idSchema,
  nombre: z.string(),
  marca: z.string(),
});
export type ProductoCalculable = z.infer<typeof productoCalculableSchema>;

export const listarProductosCalculablesQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(48).default(20),
});
export type ListarProductosCalculablesQuery = z.infer<typeof listarProductosCalculablesQuerySchema>;

export const productosCalculablesResponseEnvelopeSchema = respuestaPaginada(productoCalculableSchema);
export type ProductosCalculablesResponseEnvelope = z.infer<typeof productosCalculablesResponseEnvelopeSchema>;

/** Una presentación con volumen y su rendimiento derivado (K2), en m² por unidad y por mano. */
export const presentacionCalculableSchema = z.object({
  idVariante: idSchema,
  presentacion: z.string(),
  volumenGalones: z.number().positive(),
  rendimientoMin: z.number().positive(),
  rendimientoMax: z.number().positive(),
});
export type PresentacionCalculable = z.infer<typeof presentacionCalculableSchema>;

export const calculadoraProductoSchema = z.object({
  idProducto: idSchema,
  nombre: z.string(),
  /** m² por galón y por mano. */
  rendimientoMin: z.number().positive(),
  rendimientoMax: z.number().positive(),
  /** K9: las manos que aplica la calculadora. Nunca nulo; la pantalla las muestra. */
  manosAplicadas: z.number().int().min(1).max(10),
  presentaciones: z.array(presentacionCalculableSchema).min(1),
  advertencia: z.string(),
});
export type CalculadoraProducto = z.infer<typeof calculadoraProductoSchema>;

export const calculadoraProductoResponseEnvelopeSchema = respuestaUno(calculadoraProductoSchema);
export type CalculadoraProductoResponseEnvelope = z.infer<typeof calculadoraProductoResponseEnvelopeSchema>;

export const sentidoCalculoSchema = z.enum(['cantidad', 'cobertura']);
export type SentidoCalculo = z.infer<typeof sentidoCalculoSchema>;

/** POST /asesoria/calculadora/calcular */
export const calcularInputSchema = z.discriminatedUnion('sentido', [
  z.object({
    sentido: z.literal('cantidad'),
    idProducto: idSchema,
    idVariante: idSchema,
    area: areaSchema,
    manos: manosSchema,
  }),
  z.object({
    sentido: z.literal('cobertura'),
    idProducto: idSchema,
    idVariante: idSchema,
    unidades: unidadesSchema,
    manos: manosSchema,
  }),
]);
export type CalcularInput = z.infer<typeof calcularInputSchema>;

/** `cantidad`: unidades enteras (K3). `cobertura`: m² con un decimal (K4). */
export const resultadoPresentacionSchema = z.object({
  idVariante: idSchema,
  presentacion: z.string(),
  minimo: z.number().nonnegative(),
  maximo: z.number().nonnegative(),
});
export type ResultadoPresentacion = z.infer<typeof resultadoPresentacionSchema>;

export const resultadoCalculoSchema = z.object({
  sentido: sentidoCalculoSchema,
  seleccionada: resultadoPresentacionSchema,
  /** K6: solo en `cantidad`; vacío en `cobertura`. */
  equivalencias: z.array(resultadoPresentacionSchema),
  advertencia: z.string(),
});
export type ResultadoCalculo = z.infer<typeof resultadoCalculoSchema>;

export const resultadoCalculoResponseEnvelopeSchema = respuestaUno(resultadoCalculoSchema);
export type ResultadoCalculoResponseEnvelope = z.infer<typeof resultadoCalculoResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 6. ASISTENTE (HU-ASE-05)
 * ─────────────────────────────────────────────────────────────────────────── */

export const turnoChatSchema = z.object({
  rol: z.enum(['usuario', 'asistente']),
  texto: z.string().trim().min(1).max(1500),
});
export type TurnoChat = z.infer<typeof turnoChatSchema>;

/** POST /asesoria/asistente/mensajes */
export const mensajeChatInputSchema = z.object({
  mensaje: z
    .string({ error: 'Escribe tu pregunta' })
    .trim()
    .min(1, 'Escribe tu pregunta')
    .max(500, 'Usa como máximo 500 caracteres'),
  historial: z.array(turnoChatSchema).max(CHAT_MAX_TURNOS_HISTORIAL).default([]),
});
export type MensajeChatInput = z.infer<typeof mensajeChatInputSchema>;

/** H5: lo que se le exige a Gemini. No sale del servidor. */
export const salidaModeloChatSchema = z.object({
  respuesta: z.string().trim().min(1).max(1500),
  idsProductos: z.array(idSchema).max(CHAT_MAX_PRODUCTOS_CONTEXTO),
  ofrecerAsesor: z.boolean(),
});
export type SalidaModeloChat = z.infer<typeof salidaModeloChatSchema>;

export const respuestaChatSchema = z.object({
  respuesta: z.string(),
  productos: z.array(productoPublicoTarjetaSchema).max(CHAT_MAX_PRODUCTOS_CONTEXTO),
  ofrecerAsesor: z.boolean(),
});
export type RespuestaChat = z.infer<typeof respuestaChatSchema>;

export const respuestaChatResponseEnvelopeSchema = respuestaUno(respuestaChatSchema);
export type RespuestaChatResponseEnvelope = z.infer<typeof respuestaChatResponseEnvelopeSchema>;

export const estadoChatSchema = z.object({
  disponible: z.boolean(),
  /** null si está disponible. */
  motivo: z.enum(['no_configurado', 'suspendido']).nullable(),
});
export type EstadoChat = z.infer<typeof estadoChatSchema>;

export const estadoChatResponseEnvelopeSchema = respuestaUno(estadoChatSchema);
export type EstadoChatResponseEnvelope = z.infer<typeof estadoChatResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 7. CONFIGURACIÓN, GUIONES Y RESILIENCIA (HU-ASE-02, HU-ASE-06)
 * ─────────────────────────────────────────────────────────────────────────── */

/** R12: el guion orienta; nunca levanta las reglas duras del código. */
export const guionSchema = z.string().trim().max(4000);

export const configuracionAsesoriaSchema = z.object({
  /** D3: qué modo de cuestionario está vigente. */
  modoCuestionario: modoCuestionarioSchema,
  /** K9 y Q1: null = sin sugerencia por defecto. */
  manosPorDefecto: z.number().int().min(1).max(10).nullable(),
  guionCuestionario: z.string(),
  guionAsistente: z.string(),
  iaTiempoEsperaMs: z.number().int().min(1000).max(60_000),
  iaReintentos: z.number().int().min(0).max(5),
  iaSuspensionCuotaMinutos: z.number().int().min(1).max(1440),
  iaRetencionIncidentesDias: z.number().int().min(1).max(3650),
  iaFallosConsecutivosAlerta: z.number().int().min(1).max(100),
  fechaActualizacion: z.string().datetime(),
});
export type ConfiguracionAsesoria = z.infer<typeof configuracionAsesoriaSchema>;

export const updateConfiguracionAsesoriaInputSchema = configuracionAsesoriaSchema
  .omit({ fechaActualizacion: true, guionCuestionario: true, guionAsistente: true })
  .extend({ guionCuestionario: guionSchema, guionAsistente: guionSchema })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Indica al menos un cambio' });
export type UpdateConfiguracionAsesoriaInput = z.infer<typeof updateConfiguracionAsesoriaInputSchema>;

export const configuracionAsesoriaResponseEnvelopeSchema = respuestaUno(configuracionAsesoriaSchema);
export type ConfiguracionAsesoriaResponseEnvelope = z.infer<typeof configuracionAsesoriaResponseEnvelopeSchema>;

export const servicioIaSchema = z.enum(['gemini']);
export const funcionIaSchema = z.enum(['chat', 'cuestionario']);
export type FuncionIa = z.infer<typeof funcionIaSchema>;
export const tipoIncidenteIaSchema = z.enum([
  'tiempo_agotado',
  'no_disponible',
  'cuota_agotada',
  'respuesta_no_procesable',
  'error_configuracion',
]);
export type TipoIncidenteIa = z.infer<typeof tipoIncidenteIaSchema>;
export const resultadoIncidenteIaSchema = z.enum(['recuperado', 'fallido', 'suspendido']);
export type ResultadoIncidenteIa = z.infer<typeof resultadoIncidenteIaSchema>;

/** I7: sin texto de la persona, respuesta del modelo, IP ni clave. */
export const incidenteIaSchema = z.object({
  idIncidente: idSchema,
  fecha: z.string().datetime(),
  servicio: servicioIaSchema,
  funcion: funcionIaSchema,
  tipo: tipoIncidenteIaSchema,
  intentos: z.number().int().min(1),
  resultado: resultadoIncidenteIaSchema,
});
export type IncidenteIa = z.infer<typeof incidenteIaSchema>;

export const listarIncidentesQuerySchema = z.object({
  tipo: tipoIncidenteIaSchema.optional(),
  desde: z.iso.date().optional(),
  hasta: z.iso.date().optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListarIncidentesQuery = z.infer<typeof listarIncidentesQuerySchema>;

export const incidentesResponseEnvelopeSchema = respuestaPaginada(incidenteIaSchema);
export type IncidentesResponseEnvelope = z.infer<typeof incidentesResponseEnvelopeSchema>;

export const estadoServicioIaSchema = z.object({
  configurado: z.boolean(),
  suspendidoHasta: z.string().datetime().nullable(),
  fallosConsecutivos: z.number().int().nonnegative(),
  /** I9 */
  alertaActiva: z.boolean(),
  ultimoIncidente: incidenteIaSchema.nullable(),
});
export type EstadoServicioIa = z.infer<typeof estadoServicioIaSchema>;

export const estadoServicioIaResponseEnvelopeSchema = respuestaUno(estadoServicioIaSchema);
export type EstadoServicioIaResponseEnvelope = z.infer<typeof estadoServicioIaResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 8. PARÁMETROS DE RUTA
 * ─────────────────────────────────────────────────────────────────────────── */

export const idProductoParamsSchema = z.object({ idProducto: z.coerce.number().int().positive() });
export const idPreguntaParamsSchema = z.object({ idPregunta: z.coerce.number().int().positive() });
export const idOpcionParamsSchema = z.object({ idOpcion: z.coerce.number().int().positive() });

/* ───────────────────────────────────────────────────────────────────────────
 * 9. SIMULADOR DE COLOR (HU-ASE-03, S1-S11)
 *
 * No hay endpoints: el simulador vive entero en el navegador (S3, S10). Estos esquemas
 * existen para fijar la FORMA del catálogo de ambientes y validarlo en una prueba, de modo
 * que un ambiente mal declarado se detecte al construir y no en producción.
 * ─────────────────────────────────────────────────────────────────────────── */

/** S7: el aviso que acompaña a toda vista del simulador. Texto fijo, como ADVERTENCIA_CALCULO. */
export const ADVERTENCIA_SIMULADOR =
  'El color de la pantalla es una referencia: el resultado real depende de la luz del lugar, de las manos aplicadas y de la superficie.';

/** S5: dónde se puede usar el ambiente. Mismo vocabulario que el resto de M03. */
export const tipoAmbienteSimuladorSchema = z.enum(['interior', 'exterior']);
export type TipoAmbienteSimulador = z.infer<typeof tipoAmbienteSimuladorSchema>;

/**
 * S5 — Un ambiente de muestra. Es contenido fijo del módulo, no un recurso de la API.
 *
 * El dibujo NO se declara aquí: es un componente de React asociado a este `id` (S3). Esta
 * forma solo fija lo que hace falta para listarlo, seleccionarlo y describirlo.
 */
export const ambienteSimuladorSchema = z.object({
  /** Clave estable del punto de vista: `sala-frente`, `alcoba`, `fachada`. */
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** Nombre visible bajo la miniatura: «Sala», «Alcoba», «Fachada». */
  nombre: z.string().min(1),
  tipo: tipoAmbienteSimuladorSchema,
  /** Describe el espacio y el punto de vista, no el color: el color lo añade el simulador (S9). */
  alt: z.string().min(1),
});
export type AmbienteSimulador = z.infer<typeof ambienteSimuladorSchema>;

/** El catálogo completo: al menos un ambiente y sin identificadores repetidos. */
export const catalogoAmbientesSchema = z
  .array(ambienteSimuladorSchema)
  .min(1)
  .refine((lista) => new Set(lista.map((a) => a.id)).size === lista.length, 'Hay ambientes con el mismo id');
export type CatalogoAmbientes = z.infer<typeof catalogoAmbientesSchema>;

/**
 * S1, S2 — Lo que el simulador recibe de M01. Se declara aquí para que la frontera entre los
 * dos módulos quede escrita: M01 entrega esto y nada más. Mientras no haya color elegido, M01
 * no monta el simulador con datos: se muestra la invitación a elegir uno (S2).
 */
export const simuladorInputSchema = z.object({
  hexadecimal: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  nombre: z.string().min(1),
  codigo: z.string().nullable(),
});
export type SimuladorInput = z.infer<typeof simuladorInputSchema>;
