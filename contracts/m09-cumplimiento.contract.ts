import { z } from 'zod';

/**
 * ============================================================================
 * CONTRATO DE API REST — M09. Cumplimiento y preparación
 * ============================================================================
 * Scope: m09-cumplimiento · Ola 3 · Carril Venta · APROBADO por el usuario el 2026-10-29 · REVISADO el 2026-10-31 (estado propio por línea, preparada por línea y vista del cliente)
 *
 * Este contrato ES la especificación del módulo. Spec guía:
 * docs/02_MODULOS_FUNCIONALES/M09_ESPECIFICACION_CUMPLIMIENTO.md (HU-CUM-01, 03, 05 y 06).
 *
 * ── Qué es M09 ──────────────────────────────────────────────────────────────
 *  Una mejora de M08 (decisión del PO): hace didáctico el momento en que el empleado revisa si hay
 *  producto y evita cargar la pantalla del pedido con funciones. Es deliberadamente liviano: una lista
 *  de chequeo por línea, el paso automático a preparación y la hoja que se imprime para la bodega.
 *  Revisión 2026-10-31: el primer contrato trató la disponibilidad como un rastro aparte del pedido y la línea
 *  quedó sin estado propio: solo se veía en un panel, solo en tres estados de la orden y el cliente no veía nada.
 *  Ahora cada producto del pedido TIENE estado (R2, R17), la preparación también se marca por línea (R15) y el
 *  cliente ve en qué va cada uno (R14). El rastro de solo inserción (D3) sigue siendo la fuente de verdad.
 *
 * ── Qué incluye ─────────────────────────────────────────────────────────────
 *  Marcar cada línea de una orden como disponible, consiguiendo stock, no disponible o preparada (y corregirlo) con su
 *  rastro · paso automático de `revision_disponibilidad` a `en_preparacion` al quedar todas disponibles y de
 *  `en_preparacion` a `preparada` al quedar todas preparadas · estado de cada línea en cualquier estado de la orden
 *  (R17), también para el cliente (R14) · qué hacer cuando falta un producto: dos botones arriba de la tarjeta de
 *  productos, contactar al cliente (R19) y pedir la cancelación del pedido (R18), con el correo al cliente que explica el motivo (R20) · lista de órdenes que siguen
 *  retenidas y por qué · hoja de preparación imprimible, sin importes.
 *
 * ── Qué NO incluye ──────────────────────────────────────────────────────────
 *  Contar unidades halladas: el estado de la línea es de la línea entera, sin cantidades (D10) · un trámite
 *  de consecución de existencias (HU-CUM-02 y HU-CUM-04 siguen retiradas): «consiguiendo stock» es solo
 *  una marca de la línea, sin pasos ni seguimiento propios · dividir una orden o
 *  borrar líneas (M08 no lo ofrece y esta regla lo mantiene) · exponer al cliente el autor, la fecha o el
 *  historial de las marcas (solo ve el resultado, R14) · modificar la existencia referencial del catálogo (M01) ·
 *  estados propios de la línea más allá de la preparación: despachada, entregada, cancelada y devuelta se
 *  heredan de la orden (R17), no se marcan · transporte (M10) · cancelación (M11) ·
 *  correos o avisos al cliente cuando una línea cambia (M18) · generar el PDF en el servidor.
 *
 * ── Cómo cubre la spec (qué se hizo con cada requisito) ─────────────────────
 *  HU-CUM-01  01-01 → R4 y GET /retenidas · 01-02 → una marca por línea: disponible, consiguiendo stock o no disponible (D2) ·
 *             01-05 → R3 · 01-06 → R6 · 01-07 → R10 · 01-08 → R5 y GET /verificacion ·
 *             01-09 → la línea trae base y color de M08 · 01-12 → la línea de un combo es una sola
 *             línea que se marca como una unidad, sin desglose · 01-10 → R11 · RNF-01-01 → pantalla
 *             pensada para móvil (frontend).
 *  HU-CUM-03  03-01 → R7 · 03-02 → R8 · 03-03 → R12 y GET /retenidas · 03-07 → R9 · 03-10 → R7.
 *  HU-CUM-05  05-01 → R15 (preparada por línea) y el historial de M08 (R1) · 05-04 → R7, R15 y las transiciones de
 *             M08 · 05-05 → M08 y R16 (preparada → en_preparacion exige motivo, nunca a revisión; las líneas
 *             vuelven a disponible).
 *  HU-CUM-06  06-01, 06-02 y 06-03 → R13 y GET /hoja.
 *  Nuevos     RF-CUM-01-13 (el cliente ve el estado de cada producto) → R14 y R17 · RF-CUM-05-06 (la preparación
 *             se marca por línea y la orden pasa sola a preparada) → R15 y R16 · RF-CUM-03-11 (pedir la cancelación
 *             cuando falta un producto) → R18 y R20 · RF-CUM-03-12 (contactar al cliente desde la línea) → R19.
 *
 * ── Reglas clave ────────────────────────────────────────────────────────────
 *  R1  M09 solo mueve la orden en dos casos: `revision_disponibilidad` → `en_preparacion` (R7) y
 *      `en_preparacion` → `preparada` (R15). Devolver una orden preparada (con motivo), despachar y entregar
 *      siguen siendo de M08.
 *  R2  Las marcas que el empleado pone a una línea son `disponible`, `consiguiendo_stock` (no está completa
 *      en bodega y se está consiguiendo), `no_disponible` y `preparada` (ya está alistada en la bodega, R15).
 *      Sin marcas la línea está `pendiente` (nadie la ha revisado) y esa no se puede marcar a mano.
 *      La marca es de la línea entera: no se cuentan unidades. El estado completo de la línea es el de R17.
 *  R3  Cada marca, y cada corrección, inserta un registro con su estado, autor y momento. Nunca se actualiza ni
 *      se borra: el estado de la línea es el de su último registro. Marcar lo que ya está así no inserta nada.
 *  R4  Solo se MARCA una orden en `revision_disponibilidad`, `en_preparacion` o `preparada` (también
 *      rige para la hoja). En otro estado → 409 ORDEN_FUERA_DE_CUMPLIMIENTO. CONSULTAR la verificación
 *      (GET) se puede en cualquier estado de la orden: una orden ya despachada sigue mostrando cómo quedó
 *      cada línea y quién la marcó.
 *  R5  Es incremental: cada petición guarda lo que envía y lo marcado persiste; no hay «cerrar sesión de
 *      verificación». Una petición puede traer una línea o varias (por ejemplo, «marcar todas»).
 *  R6  Corregir una marca conserva la anterior. Corregir con la orden ya en `en_preparacion` o `preparada`
 *      NO la hace retroceder. Una corrección que deja una línea sin estar `preparada` mientras la orden está en
 *      `preparada` tampoco la devuelve: la orden se devuelve solo por M08, con motivo.
 *  R7  Avance automático: si tras aplicar la petición la orden está en `revision_disponibilidad` y todas
 *      sus líneas están `disponible` (con una `pendiente`, `consiguiendo_stock` o `no_disponible` no avanza), pasa a `en_preparacion` en la MISMA transacción, con historial de M08
 *      (autor = el empleado que confirmó la última línea, motivo fijo) y el mismo evento de cambio de
 *      estado. Si la orden cambió de estado mientras tanto → 409 ESTADO_CAMBIADO y no se guarda nada.
 *  R8  No hay despacho parcial ni forma de eludirlo: mientras una línea no esté disponible la orden no sale de
 *      `revision_disponibilidad`, y M08 no permite dividir la orden ni borrar líneas (R6 de M08).
 *  R9  El momento en que la orden alcanza la disponibilidad completa es el de la fila de historial de M08
 *      que crea R7, y el de la preparación completa el de la que crea R15; no se guardan en otra parte.
 *  R10 M09 nunca escribe sobre la existencia referencial de la variante: son dos datos distintos.
 *  R11 Autorización siempre en servidor y solo sesión de personal. TODAS las operaciones de este módulo, también los
 *      `GET`, exigen `ventas.gestionar` (el permiso «Gestión de pedidos», RF-CUM-01-10). El administrador no tiene
 *      excepción. El estado de línea que acompaña al detalle del pedido es de M08 y lo ve quien tenga
 *      `ventas.ver` (R16 de M08): es solo el estado, sin autor, fecha ni historial. Sin permiso, orden
 *      inexistente o sesión de cliente → 404 RECURSO_NO_DISPONIBLE idéntico (ADR-003), y el intento se audita (M20).
 *  R12 Una orden está «retenida» si está en `revision_disponibilidad` y tiene al menos una línea que no está
 *      `disponible`; el motivo es la lista de esas líneas con su estado. La lista va de la más antigua a la más reciente.
 *  R13 La hoja de preparación lleva: código, fecha y estado de la orden AL GENERARLA, y por línea producto,
 *      presentación, color, cantidad y la base que se consume si es entonada. NUNCA importes, descuentos,
 *      datos de pago ni datos del cliente (el esquema es `.strict()` y una prueba lo comprueba).
 *  R14 El cliente ve el estado de cada uno de sus productos, y solo eso: `verificando_disponibilidad`
 *      (pendiente o consiguiendo stock), `confirmado` (disponible o ya preparado o despachado) o `rechazado`
 *      (no disponible). Lo entrega M08 en el detalle de su pedido (R16 de M08); ninguna ruta de M09 es del cliente y
 *      nunca ve autor, fecha ni historial de las marcas. No hay aviso por correo al cambiar (M18). Si falta un
 *      producto, el empleado deja la línea en `consiguiendo_stock` o `no_disponible` y lo resuelve con el cliente
 *      (R19); la orden sigue en revisión. Si el cliente ya no la quiere, el empleado pide la cancelación (R18), que
 *      resuelve M11 y no este módulo (D11).
 *  R15 La marca `preparada` solo se puede poner con la orden en `en_preparacion` o `preparada` (esta última para
 *      corregir); en `revision_disponibilidad` → 409 MARCA_NO_PERMITIDA y no se guarda nada. Es incremental como el
 *      resto (R5). Segundo avance automático: si tras aplicar la petición la orden está en `en_preparacion` y TODAS
 *      sus líneas están `preparada` (con otra en cualquier estado no avanza), pasa a `preparada` en la MISMA
 *      transacción, con historial de M08 (autor = el empleado que marcó la última, motivo fijo
 *      MOTIVO_AVANCE_PREPARADA) y el mismo evento de cambio de estado. Si la orden cambió de estado mientras
 *      tanto → 409 ESTADO_CAMBIADO y no se guarda nada. Preparar sin tener la disponibilidad completa no es
 *      posible: la orden ya está en `en_preparacion` solo porque R7 se cumplió.
 *  R16 Devolver una orden `preparada` a `en_preparacion` (M08, con motivo) deja de nuevo en `disponible` cada línea
 *      que estaba `preparada`: M08 inserta esa marca nueva por línea, con el autor de la devolución, en la misma
 *      transacción. Sin esto la orden quedaría con todo preparado y sin forma de volver a avanzar, y R3 impide
 *      repetir una marca. El rastro anterior se conserva.
 *  R17 El estado de una línea nunca se guarda: se calcula al leer (regla R15 de M08, mismas `ESTADOS_LINEA`).
 *      Con la orden en `revision_disponibilidad`, `en_preparacion` o `preparada` es su última marca; si no tiene
 *      marcas: `pendiente` en revisión, `disponible` en preparación y `preparada` en preparada (órdenes que avanzaron
 *      antes de existir las marcas: no se inventa historial). `orden_confirmada` → `pendiente`. Con `despachado`,
 *      `entregado`, `cancelado` o `devuelto` la línea hereda `despachada`, `entregada`, `cancelada` o `devuelta`.
 *  R18 Pedir la cancelación. Con la orden en `revision_disponibilidad` o `en_preparacion` (los estados cancelables
 *      de M11) y al menos una línea `no_disponible`, el empleado puede pedir la cancelación del pedido
 *      (`POST /cumplimiento/ordenes/:codigo/cancelacion`, con una nota opcional). M09 compone el motivo con las
 *      líneas `no_disponible` (producto, presentación y cantidad) más la nota y crea en M11 una solicitud de
 *      cancelación INICIADA POR LA TIENDA: estado `solicitada`, autor = el empleado, reembolso = total de la orden.
 *      No cancela nada por sí misma: la resuelve M11 como cualquier cancelación (aprobar cancela el pedido,
 *      rechazar lo deja como estaba). Una sola solicitud en trámite por pedido (RF-POS-01-04): si ya hay una,
 *      409 SOLICITUD_DUPLICADA. Sin línea `no_disponible` → 409 SIN_LINEAS_NO_DISPONIBLES; orden en otro estado →
 *      409 ORDEN_NO_CANCELABLE. Mientras haya una solicitud en trámite, la verificación la devuelve
 *      (`cancelacion`) y la pantalla muestra su código en lugar del botón «Cancelar pedido». La nota y la lista de productos son lo
 *      que el cliente leerá en el correo (R20): la pantalla las muestra tal como saldrán antes de confirmar.
 *  R19 Dónde aparecen y contactar al cliente. Los dos botones, «Contactar al cliente» y «Cancelar pedido», salen UNA
 *      sola vez, en la parte de arriba de la tarjeta de productos del pedido (no por línea, para no abrumar), y solo
 *      mientras haya productos en ese estado: «Contactar al cliente» con al menos una línea `consiguiendo_stock` o
 *      `no_disponible`; «Cancelar pedido» con al menos una `no_disponible` (R18) y sin cancelación en trámite.
 *      Con todas las líneas disponibles o preparadas no se ve ninguno. Contactar usa el correo y el teléfono que ya
 *      trae el detalle del pedido (M08; sin teléfono, solo el correo) y, al usarlo, registra el contacto en M08
 *      (`POST /ordenes/gestion/:codigo/contactos`, solo inserción) para que quede constancia. Es solo pantalla:
 *      M09 no añade rutas ni guarda nada para esto.
 *  R20 Aviso al cliente. Cuando M11 cancela un pedido porque se aprobó una cancelación, sea iniciada por la tienda o
 *      por el cliente, sale el correo `orden_cancelada` (plantilla nueva de M18) con el código del pedido y el
 *      motivo. Sale DESPUÉS de confirmar la transacción y su fallo no la revierte (como R10 de M08). Rechazar la
 *      solicitud no envía nada. Nunca lleva importes ni datos de pago. Los detalles viven en los contratos de
 *      M11, M08 y M18.
 *
 * ── Decisiones por defecto (el Tech Lead puede vetarlas) ────────────────────
 *  D1  Prefijo de rutas /api/v1/cumplimiento/...
 *  D2  Tres marcas por línea (`disponible`, `consiguiendo_stock`, `no_disponible`) más `pendiente` sin revisar,
 *      en vez de total/parcial/nula con cantidades. El PO pidió un estado intermedio y no solo «hay / no hay»;
 *      si lo prefiere llamar «parcial», solo cambia el texto del enum (ver D10).
 *  D3  El rastro es una tabla nueva de solo inserción, `verificacion_linea_orden` (id_linea_orden,
 *      estado, id_usuario_autor, momento). El estado actual es el último registro por línea.
 *  D4  Las líneas se identifican por `numeroLinea` (posición 1..n por orden de creación). La API no expone
 *      claves primarias y las líneas de una orden no cambian (R6 de M08), así que el número es estable.
 *  D5  Todo el módulo se reserva a `ventas.gestionar`, como pide la spec (RF-CUM-01-10) y a diferencia de M08,
 *      donde consultar usa `ventas.ver`. Un empleado que solo consulta pedidos no ve la lista de chequeo, la bandeja
 *      de retenidas ni la hoja; sí ve el estado de cada línea en el detalle del pedido (R11).
 *  D6  Los permisos ya están sembrados: sin tocar el seed. Se sigue exigiendo sesión de personal (como M08).
 *  D7  M09 abre/cierra la preparación SIN tabla propia: el inicio es la entrada a `en_preparacion` (R7) y el
 *      fin es el paso a `preparada` de M08; ambos guardan autor y momento en el historial de M08.
 *  D8  La hoja la imprime el navegador (vista de impresión); el servidor solo entrega los datos.
 *  D9  Paginación de retenidas por defecto 20, máximo 100.
 *
 * ── Cambios fuera de la carpeta del módulo (autorizados para M09) ───────────
 *  PR general (archivos compartidos): tabla `verificacion_linea_orden` en bd/sql/schema_pintuclic.sql y
 *    modelo en schema.prisma · notas en los changelogs. Sin permisos nuevos. Montar las rutas en `app.routes.ts`
    viaja con el módulo, no con este PR: importaría un constructor que aún no existe y rompería la compilación.
 *  M08: (1) quitar de `reglas-estado.ts` la transición manual `revision_disponibilidad` → `en_preparacion`
 *    (queda solo R7; el panel «Pasar a» deja de ofrecerla), con sus pruebas, su fila en
 *    TRANSICIONES_ESTADO del contrato de M08 y el §5 de su spec; (2) exportar una función transaccional que
 *    M09 use para R7, como ya hace M11 con `cambiarEstadoPorPostventa`; (3) montar el panel de M09 y el
 *    enlace a la hoja en el detalle del pedido del personal.
 *  Revisión 2026-10-31 (autorizada por el usuario): BD v4.26 con el valor `preparada` en
 *    `enum_estado_verificacion_linea` · M08: (4) quitar también la transición manual `en_preparacion` → `preparada`
 *    y usar una función transaccional para R15; (5) calcular el estado de cada línea (R17) y devolverlo en los dos
 *    detalles (`estadoLinea` al personal, `disponibilidad` al cliente); (6) al devolver una orden preparada, insertar
 *    las marcas de R16; (7) la pantalla del detalle fusiona la lista de chequeo con «Productos», una sola lista
 *    donde cada línea lleva su estado, y «Mis pedidos» muestra la disponibilidad de cada producto.
 *  Revisión 2026-10-31, cancelación por falta de stock (el usuario indicó incluirla): BD v4.26 con
 *    `solicitud_postventa.id_empleado_inicia` y la plantilla `orden_cancelada` · M11: (8) función interna
 *    `solicitarCancelacionPorTienda` (sin ruta HTTP nueva) y la solicitud devuelve quién la inició; (9) al aprobar una
 *    cancelación, avisar al cliente tras confirmar la transacción · M08: (10) el puerto de notificaciones suma
 *    `notificarOrdenCancelada` (R10 ya lo prometía y nunca se implementó) · M18: (11) el tipo `orden_cancelada`,
 *    su plantilla, su método en el puerto y su fila en la lista de plantillas del panel.
 *
 *  D10 `consiguiendo_stock` es «hay parte de las unidades o se espera el resto»: la línea solo pasa a `disponible`
 *      cuando están TODAS. No se registra cuántas unidades hay (decisión del PO el 2026-10-29); si algún día se
 *      quiere, es un campo más en la marca y el resto del diseño no cambia.
 *  D11 Una orden con líneas `no_disponible` que el cliente ya no quiere se cancela por M11 (postventa). Desde la
 *      revisión del 2026-10-31 M09 ofrece el atajo para iniciar esa solicitud (R18), pero la resolución sigue siendo de M11.
 *  D12 La hoja no dice «combo»: M08 no guarda ese dato y no se añade. Una línea de combo se marca como cualquier otra.
 *  D13 Las órdenes anteriores en `orden_confirmada` no se verifican hasta pasarlas a revisión con M08 (R4).
 *  D14 El cliente ve «rechazado» en cuanto el empleado marca la línea `no_disponible`, sin esperar confirmación y
 *      sin aviso por correo. Como una marca equivocada se corrige (R6), el empleado la ve y la puede cambiar en
 *      el momento; si se quiere un colchón (por ejemplo, mostrarlo tras unos minutos) es un cambio solo de M08.
 *  D15 El estado de la línea se calcula al leer, con la última marca de `verificacion_linea_orden`, y no se
 *      añade ninguna columna a `linea_orden`: dos fuentes del mismo dato serían el origen de la próxima
 *      inconsistencia. Si los reportes lo necesitan, se añade una vista, no una columna.
 *  D16 Las órdenes que ya están en `en_preparacion` o `preparada` y no tienen marcas conservan su estado por
 *      herencia (R17); basta que el empleado marque `preparada` en las líneas para que la orden avance.
 *  D17 La cancelación se PIDE, no se ejecuta: pasa por la misma resolución de M11 (`ventas.gestionar`, aprobar o
 *      rechazar). Así M11 sigue siendo el único camino que cancela un pedido (R9 de M08), el reembolso y la
 *      auditoría quedan donde ya están y la regla de una solicitud en trámite cubre a ambos orígenes. Cancelar en el
 *      acto, sin aprobación, sería un cambio de M11, no de este contrato.
 *  D18 El correo sale al APROBAR la cancelación, no al pedirla: hasta entonces el pedido sigue vivo y el empleado
 *      puede estar hablando con el cliente. Lleva una frase fija sobre el reembolso («si ya pagaste, te contactaremos
 *      para gestionarlo»), que el administrador no edita; la plantilla solo deja editar el asunto y la introducción.
 *  D19 La nota del empleado llega al cliente tal cual: máximo 300 caracteres y la pantalla lo avisa antes de confirmar.
 *  D20 El cliente que pidió él mismo la cancelación (HU-POS-01) también recibe el correo al aprobarse: es una
 *      sola plantilla y un solo punto de envío, el del paso del pedido a `cancelado`.
 *
 * ── Preguntas abiertas ──────────────────────────────────────────────────────
 *  Ninguna.
 *
 * Regla de Oro #1: Cero código sin contrato previo.
 * Regla de Oro #11: Tolerancia Cero al tipo `any`.
 * ============================================================================
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVAS Y ENUMS
 * ─────────────────────────────────────────────────────────────────────────── */

/** Igual que en M08: se acepta cualquier código existente, también el de órdenes anteriores a `PC-AAAA-NNNNN`. */
export const codigoOrdenSchema = z.string().trim().min(1, 'Indique el código del pedido').max(50, 'Máximo 50 caracteres');
export const fechaHoraSchema = z.string().datetime();
export const numeroLineaSchema = z.number().int().positive().max(1000);

/** Los mismos estados de M08; M09 no define estados propios. */
export const ESTADOS_ORDEN = [
  'orden_confirmada',
  'revision_disponibilidad',
  'en_preparacion',
  'preparada',
  'despachado',
  'entregado',
  'cancelado',
  'devuelto',
] as const;
export const estadoOrdenSchema = z.enum(ESTADOS_ORDEN);
export type EstadoOrden = z.infer<typeof estadoOrdenSchema>;

/** R4. Estados en los que se verifica y se genera la hoja. */
export const ESTADOS_CUMPLIMIENTO = ['revision_disponibilidad', 'en_preparacion', 'preparada'] as const;
export const estadoCumplimientoSchema = z.enum(ESTADOS_CUMPLIMIENTO);
export type EstadoCumplimiento = z.infer<typeof estadoCumplimientoSchema>;

/** R2. Lo que el empleado puede marcar en una línea. `preparada` solo con la orden en preparación (R15). */
export const ESTADOS_MARCA = ['disponible', 'consiguiendo_stock', 'no_disponible', 'preparada'] as const;
export const estadoMarcaSchema = z.enum(ESTADOS_MARCA);
export type EstadoMarca = z.infer<typeof estadoMarcaSchema>;

/** R17. Lo que la línea hereda de la orden cuando sale de la preparación; nunca se marca. */
export const ESTADOS_LINEA_HEREDADOS = ['despachada', 'entregada', 'cancelada', 'devuelta'] as const;

/**
 * R17. Estado de una línea: su última marca, o `pendiente` si nadie la ha revisado (no se puede marcar a mano), o el
 * heredado de la orden. Se calcula al leer. Es la misma lista que `ESTADOS_LINEA` del contrato de M08.
 */
export const ESTADOS_LINEA = ['pendiente', ...ESTADOS_MARCA, ...ESTADOS_LINEA_HEREDADOS] as const;
export const estadoLineaSchema = z.enum(ESTADOS_LINEA);
export type EstadoLinea = z.infer<typeof estadoLineaSchema>;

/** R7. Texto fijo del historial de M08 cuando la orden avanza sola a preparación. */
export const MOTIVO_AVANCE_AUTOMATICO = 'Disponibilidad confirmada en todas las líneas';

/** R15. Texto fijo del historial de M08 cuando la orden avanza sola a preparada. */
export const MOTIVO_AVANCE_PREPARADA = 'Preparación completa en todas las líneas';

/** Tope de líneas que una petición puede traer. */
export const MAX_LINEAS_POR_PETICION = 200;

/* ───────────────────────────────────────────────────────────────────────────
 * 2. ENTIDADES DE SALIDA
 * ─────────────────────────────────────────────────────────────────────────── */

/** R3. Un registro del rastro de una línea. */
export const registroVerificacionSchema = z.object({
  estado: estadoMarcaSchema,
  autor: z.string().describe('Nombre del empleado que hizo la marca'),
  fecha: fechaHoraSchema,
});
export type RegistroVerificacion = z.infer<typeof registroVerificacionSchema>;

export const lineaVerificacionSchema = z.object({
  numeroLinea: numeroLineaSchema,
  nombreProducto: z.string(),
  varianteCopia: z.string(),
  colorSolicitado: z.string().nullable(),
  cantidad: z.number().int().positive(),
  esEntonado: z.boolean(),
  /** Base que se consume cuando la línea es entonada; null en cualquier otro caso. */
  baseConsumida: z.string().nullable(),
  /** R17. El del último registro de `historial`; sin registros, el que corresponde al estado de la orden. */
  estado: estadoLineaSchema,
  /** Del más antiguo al más reciente. Vacío mientras nadie la haya marcado. */
  historial: z.array(registroVerificacionSchema),
});
export type LineaVerificacion = z.infer<typeof lineaVerificacionSchema>;

/** R18. Una solicitud de cancelación en trámite sobre la orden (de M11). */
export const tramiteCancelacionSchema = z.object({
  /** Código de la solicitud en M11, `DEV-AAAA-NNNNN`. */
  codigo: z.string().regex(/^DEV-\d{4}-\d{5}$/),
  estado: z.enum(['solicitada', 'en_revision']),
  iniciadaPor: z.enum(['cliente', 'tienda']),
  fecha: fechaHoraSchema,
});
export type TramiteCancelacion = z.infer<typeof tramiteCancelacionSchema>;

export const verificacionOrdenSchema = z.object({
  codigo: codigoOrdenSchema,
  /** R4. La verificación se consulta en cualquier estado de la orden; solo se marca en `ESTADOS_CUMPLIMIENTO`. */
  estado: estadoOrdenSchema,
  /** Líneas pendientes, consiguiendo stock o no disponibles. Las `disponible`, `preparada` y heredadas no cuentan. */
  lineasSinConfirmar: z.number().int().nonnegative(),
  /** true cuando `lineasSinConfirmar` es 0. */
  completa: z.boolean(),
  lineas: z.array(lineaVerificacionSchema),
  /** R18. La solicitud de cancelación en trámite, o null si no hay ninguna. */
  cancelacion: tramiteCancelacionSchema.nullable(),
});
export type VerificacionOrden = z.infer<typeof verificacionOrdenSchema>;

/** R12. Por qué una orden sigue retenida: una línea que no está disponible y en qué estado está. */
export const motivoRetencionSchema = z.object({
  /** Producto y presentación de la línea. */
  descripcion: z.string(),
  estado: z.enum(['pendiente', 'consiguiendo_stock', 'no_disponible']),
});
export type MotivoRetencion = z.infer<typeof motivoRetencionSchema>;

/** R12. Una orden retenida en la revisión de disponibilidad. */
export const ordenRetenidaSchema = z.object({
  codigo: codigoOrdenSchema,
  cliente: z.string(),
  fecha: fechaHoraSchema,
  segundosEnEstado: z.number().int().nonnegative(),
  lineasSinConfirmar: z.number().int().positive(),
  lineasTotales: z.number().int().positive(),
  /** Una entrada por cada línea que no está `disponible`. */
  motivos: z.array(motivoRetencionSchema),
});
export type OrdenRetenida = z.infer<typeof ordenRetenidaSchema>;

export const paginacionSchema = z.object({
  pagina: z.number().int().positive(),
  limite: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPaginas: z.number().int().nonnegative(),
});
export type Paginacion = z.infer<typeof paginacionSchema>;

/**
 * R13. `.strict()` a propósito: la hoja no admite ningún campo más. Añadir un importe, un descuento o un dato de
 * pago aquí debe fallar en las pruebas, no pasar sin que nadie lo note.
 */
export const lineaHojaSchema = z
  .object({
    numeroLinea: numeroLineaSchema,
    nombreProducto: z.string(),
    varianteCopia: z.string(),
    colorSolicitado: z.string().nullable(),
    cantidad: z.number().int().positive(),
    baseConsumida: z.string().nullable().describe('Solo cuando la línea es entonada'),
  })
  .strict();
export type LineaHoja = z.infer<typeof lineaHojaSchema>;

export const hojaPreparacionSchema = z
  .object({
    codigo: codigoOrdenSchema,
    /** Momento en que se generó la hoja (R13): una hoja impresa horas antes no se confunde con el estado actual. */
    generadaEn: fechaHoraSchema,
    /** Estado de la orden en ese momento. */
    estado: estadoCumplimientoSchema,
    lineas: z.array(lineaHojaSchema),
  })
  .strict();
export type HojaPreparacion = z.infer<typeof hojaPreparacionSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 3. PETICIONES (query, params y body)
 * ─────────────────────────────────────────────────────────────────────────── */

export const codigoOrdenParamsSchema = z.object({ codigo: codigoOrdenSchema });

export const paginacionQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).max(100_000).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});

/** GET /cumplimiento/retenidas (HU-CUM-03). */
export const listarRetenidasRequestSchema = paginacionQuerySchema;
export type ListarRetenidasRequest = z.infer<typeof listarRetenidasRequestSchema>;

/** Una línea y la marca que recibe (R2, R5). Volver a `pendiente` no se puede: se corrige poniendo otra marca. */
export const lineaVerificadaInputSchema = z.object({
  numeroLinea: numeroLineaSchema,
  estado: estadoMarcaSchema,
});
export type LineaVerificadaInput = z.infer<typeof lineaVerificadaInputSchema>;

/** PUT /cumplimiento/ordenes/:codigo/verificacion (HU-CUM-01). Una línea o varias a la vez (R5). */
export const verificarLineasRequestSchema = z
  .object({
    lineas: z
      .array(lineaVerificadaInputSchema)
      .min(1, 'Indique al menos una línea')
      .max(MAX_LINEAS_POR_PETICION, `Máximo ${MAX_LINEAS_POR_PETICION} líneas por petición`),
  })
  .refine((v) => new Set(v.lineas.map((l) => l.numeroLinea)).size === v.lineas.length, {
    message: 'Una línea no puede repetirse en la misma petición',
    path: ['lineas'],
  });
export type VerificarLineasRequest = z.infer<typeof verificarLineasRequestSchema>;

/** R18. Nota que el empleado añade al motivo; el cliente la lee en el correo (D19). */
export const MAX_NOTA_CANCELACION = 300;

/** POST /cumplimiento/ordenes/:codigo/cancelacion (RF-CUM-03-11). */
export const solicitarCancelacionRequestSchema = z.object({
  nota: z.string().trim().min(1, 'La nota no puede estar vacía').max(MAX_NOTA_CANCELACION, `Máximo ${MAX_NOTA_CANCELACION} caracteres`).optional(),
});
export type SolicitarCancelacionRequest = z.infer<typeof solicitarCancelacionRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. ERRORES
 * ─────────────────────────────────────────────────────────────────────────── */

export const CODIGOS_ERROR_M09 = {
  RECURSO_NO_DISPONIBLE: 'RECURSO_NO_DISPONIBLE',
  PARAMETRO_INVALIDO: 'PARAMETRO_INVALIDO',
  ORDEN_FUERA_DE_CUMPLIMIENTO: 'ORDEN_FUERA_DE_CUMPLIMIENTO',
  MARCA_NO_PERMITIDA: 'MARCA_NO_PERMITIDA',
  ORDEN_NO_CANCELABLE: 'ORDEN_NO_CANCELABLE',
  SIN_LINEAS_NO_DISPONIBLES: 'SIN_LINEAS_NO_DISPONIBLES',
  SOLICITUD_DUPLICADA: 'SOLICITUD_DUPLICADA',
  ESTADO_CAMBIADO: 'ESTADO_CAMBIADO',
  ERROR_INTERNO: 'ERROR_INTERNO',
} as const;
export const codigoErrorM09Schema = z.enum([
  CODIGOS_ERROR_M09.RECURSO_NO_DISPONIBLE,
  CODIGOS_ERROR_M09.PARAMETRO_INVALIDO,
  CODIGOS_ERROR_M09.ORDEN_FUERA_DE_CUMPLIMIENTO,
  CODIGOS_ERROR_M09.MARCA_NO_PERMITIDA,
  CODIGOS_ERROR_M09.ORDEN_NO_CANCELABLE,
  CODIGOS_ERROR_M09.SIN_LINEAS_NO_DISPONIBLES,
  CODIGOS_ERROR_M09.SOLICITUD_DUPLICADA,
  CODIGOS_ERROR_M09.ESTADO_CAMBIADO,
  CODIGOS_ERROR_M09.ERROR_INTERNO,
]);

export const errorResponseEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: codigoErrorM09Schema,
    message: z.string(),
    details: z.unknown().nullable(),
  }),
});
export type ErrorResponseEnvelope = z.infer<typeof errorResponseEnvelopeSchema>;

/**
 * Códigos HTTP por error:
 *  404 RECURSO_NO_DISPONIBLE (inexistente, sin permiso o sesión de cliente) · 400 PARAMETRO_INVALIDO (también
 *  un `numeroLinea` que la orden no tiene: details lo indica) · 409 ORDEN_FUERA_DE_CUMPLIMIENTO (R4: marcar o pedir
 *  la hoja fuera de revisión, preparación o preparada), MARCA_NO_PERMITIDA (R15: `preparada` en revisión;
 *  details lista las líneas), ORDEN_NO_CANCELABLE, SIN_LINEAS_NO_DISPONIBLES, SOLICITUD_DUPLICADA (R18),
 *  ESTADO_CAMBIADO (R7, R15) · 500 ERROR_INTERNO.
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 5. RESPUESTAS (envelopes)
 * ─────────────────────────────────────────────────────────────────────────── */

/** GET /cumplimiento/retenidas */
export const retenidasResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(ordenRetenidaSchema),
  pagination: paginacionSchema,
});
export type RetenidasResponseEnvelope = z.infer<typeof retenidasResponseEnvelopeSchema>;

/** GET /cumplimiento/ordenes/:codigo/verificacion. Responde en cualquier estado de la orden (R4). */
export const verificacionResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: verificacionOrdenSchema,
});
export type VerificacionResponseEnvelope = z.infer<typeof verificacionResponseEnvelopeSchema>;

/** PUT /cumplimiento/ordenes/:codigo/verificacion. `avanzo: true` = esta petición movió la orden: a preparación (R7) o a preparada (R15). */
export const verificarLineasResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.object({ verificacion: verificacionOrdenSchema, avanzo: z.boolean() }),
});
export type VerificarLineasResponseEnvelope = z.infer<typeof verificarLineasResponseEnvelopeSchema>;

/** POST /cumplimiento/ordenes/:codigo/cancelacion. Devuelve la solicitud creada en M11 (R18). */
export const solicitarCancelacionResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.object({ cancelacion: tramiteCancelacionSchema }),
});
export type SolicitarCancelacionResponseEnvelope = z.infer<typeof solicitarCancelacionResponseEnvelopeSchema>;

/** GET /cumplimiento/ordenes/:codigo/hoja */
export const hojaResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: hojaPreparacionSchema,
});
export type HojaResponseEnvelope = z.infer<typeof hojaResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 6. ENDPOINTS (referencia; prefijo /api/v1)
 * ─────────────────────────────────────────────────────────────────────────── */

export const ENDPOINTS_M09 = [
  { metodo: 'GET', ruta: '/cumplimiento/retenidas', acceso: 'ventas.gestionar', hu: 'HU-CUM-03' },
  { metodo: 'GET', ruta: '/cumplimiento/ordenes/:codigo/verificacion', acceso: 'ventas.gestionar', hu: 'HU-CUM-01' },
  { metodo: 'PUT', ruta: '/cumplimiento/ordenes/:codigo/verificacion', acceso: 'ventas.gestionar', hu: 'HU-CUM-01, 03' },
  { metodo: 'GET', ruta: '/cumplimiento/ordenes/:codigo/hoja', acceso: 'ventas.gestionar', hu: 'HU-CUM-06' },
  { metodo: 'POST', ruta: '/cumplimiento/ordenes/:codigo/cancelacion', acceso: 'ventas.gestionar', hu: 'HU-CUM-03' },
] as const;
