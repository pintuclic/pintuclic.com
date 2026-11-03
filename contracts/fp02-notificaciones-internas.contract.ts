import { z } from 'zod';

/**
 * ============================================================================
 * CONTRATO DE API REST — FP-02. Notificaciones internas (campanita y puntos de novedad)  (PROPUESTA)
 * ============================================================================
 * Scope: transversal · complemento de M18 (M18 = correo; FP-02 = avisos DENTRO del sitio) · para todos los roles
 *
 * QUÉ HACE
 *  Avisa dentro de la plataforma, sin correo, a cada persona según su rol:
 *   · PUNTO ROJO CON NÚMERO («novedad»): sobre el ítem del menú al que pertenece lo nuevo (por ejemplo «Pedidos 15»). Se apaga
 *     al entrar a esa sección.
 *   · CAMPANITA («importante»): una lista de avisos que conviene ver aunque no se esté en esa pantalla, con su contador.
 *   · AGRUPACIÓN (como YouTube): los avisos del mismo tipo se juntan en uno solo con su cantidad («Han llegado 15 pedidos
 *     nuevos») en vez de 15 avisos sueltos.
 *  Lo ven: el administrador y los colaboradores (cabecera del panel `/admin`), y los clientes, también de empresa (cabecera de
 *  la tienda). Cada quien ve solo lo suyo.
 *
 * QUÉ NO HACE
 *  - No envía correo, SMS ni notificaciones push del navegador: eso es de M18 (los dos conviven; un mismo hecho puede avisar por
 *    los dos canales).
 *  - No es tiempo real por conexión abierta: la interfaz consulta cada INTERVALO_CONSULTA_SEGUNDOS segundos mientras la pestaña
 *    está visible y al volver a ella (Q2).
 *  - No lanza avisos por el paso del tiempo (por ejemplo «una cotización vence mañana»): no hay un programador de tareas. Solo
 *    avisa de hechos que otro módulo comunica.
 *  - No deja elegir qué avisos recibir (silenciar tipos) ni publica anuncios del administrador a todos (Q5, Q6).
 *  - No modifica los módulos de origen: cada aviso nace de un puerto que el módulo ya tiene o de un adaptador (R12).
 *
 * REGLAS
 *  R1  CADA PERSONA, LO SUYO. Todas las rutas exigen sesión y solo devuelven o cambian avisos DE QUIEN LAS LLAMA. Un aviso ajeno
 *      o inexistente responde el 404 opaco `RECURSO_NO_DISPONIBLE` (ADR-003). Sirve para cualquier rol, sin permiso propio.
 *  R2  DOS NIVELES. Cada tipo de aviso (catálogo `TIPOS_NOTIFICACION`) es `novedad` o `importante`. Una novedad solo suma al punto
 *      rojo de su sección del menú; un importante va a la campanita. Un tipo no es las dos cosas.
 *  R3  A QUIÉN LLEGA. Un hecho se publica con un destino: `usuario` (el titular: por ejemplo el cliente de una orden) o `permiso`
 *      (todo el personal que tenga ese permiso, más la cuenta de administrador, que los recibe todos). Se resuelve al publicar
 *      (una fila por persona), hasta MAXIMO_DESTINATARIOS; quien no tiene el permiso en ese momento no lo recibe aunque lo
 *      tuviera antes. Un cliente nunca recibe avisos de tipo `personal`, aunque su rol traiga el permiso (como en M08 y M12).
 *  R4  AGRUPACIÓN. Cada aviso tiene una `claveGrupo` por persona: el tipo (agrupa todo lo del tipo) o el tipo más una entidad (agrupa
 *      lo de UNA cosa, por ejemplo los cambios de estado de UNA orden). Si ya hay un aviso SIN LEER con esa clave, creado hace
 *      menos de VENTANA_AGRUPACION_HORAS horas, el hecho nuevo se SUMA a él: su `cantidad` sube, su fecha pasa a la del último
 *      hecho, su texto se recalcula (singular con 1, plural con más) y vuelve a contar como no visto. Si no hay uno, o ya se
 *      leyó, nace uno nuevo. Es atómico: dos hechos a la vez no crean dos avisos (índice único parcial).
 *  R5  TEXTO. Lo escribe el catálogo (plantilla singular y plural con `{n}` y los datos del hecho), nunca el módulo de origen ni el
 *      usuario: no se guarda HTML ni texto libre. El plural lleva el enlace a la lista ya filtrada; el singular, al detalle.
 *  R6  CONTEO. El punto rojo de una sección suma las `cantidad` de sus novedades SIN LEER («Pedidos 15»). La campanita cuenta
 *      AVISOS (filas) importantes sin ver, no hechos: 15 cambios agrupados en 1 aviso suman 1. Los dos topan en 99 («99+»).
 *  R7  VISTO Y LEÍDO. «Visto» apaga el número de la campanita sin quitar el resalte del aviso: se marca al abrir la campanita.
 *      «Leído» lo apaga del todo: se marca al hacer clic en el aviso, con «Marcar todo como leído», o (en una novedad) al entrar a
 *      su sección. Un hecho nuevo que se suma a un aviso lo vuelve a poner como no visto y no leído.
 *  R8  RETENCIÓN. Los avisos leídos se borran a los RETENCION_DIAS días, y cada persona conserva como máximo MAXIMO_AVISOS_POR_PERSONA
 *      (se van los leídos más viejos). Se limpia al publicar, no con un programador.
 *  R9  SIN DATOS AJENOS. Un aviso para el personal nunca lleva nombres, correos ni teléfonos de clientes (solo códigos de
 *      orden, cantidades y secciones); uno para un cliente solo habla de lo suyo.
 *  R10 RENDIMIENTO. El resumen (`/resumen`) es la ruta que se consulta cada pocos segundos: una sola consulta agregada sobre un
 *      índice por persona, sin traer filas. Publicar es una escritura corta y nunca debe demorar ni romper la operación que la
 *      origina: un fallo al publicar se registra y se sigue (como en M12 y M03).
 *  R11 ACCESIBILIDAD. La campanita es un botón con nombre que dice cuántos avisos hay («Notificaciones, 3 sin ver»); la lista
 *      se abre y se cierra con teclado (Escape) y no atrapa el foco; el número nunca es el único indicio (también dice «sin
 *      leer» en texto); respeta `prefers-reduced-motion`.
 *  R12 ORÍGENES. Un módulo avisa con el puerto `PublicadorNotificacionesPort.publicar` (solo backend, sin ruta HTTP). Fase 1
 *      (se conecta sin tocar el código de otros módulos, con adaptadores en `app.routes.ts` sobre puertos ya existentes):
 *        pedido_nuevo              personal · ventas.ver          novedad     M08 · aviso «orden creada»
 *        pedido_anulado            personal · ventas.ver          importante  M08 · cambio de estado a cancelado o devuelto
 *        comprobante_pendiente     personal · configuracion.editar importante M12 · no se pudo emitir por datos del vendedor
 *        alerta_servicio_ia        personal · asesoria.ver        importante  M03 · aviso de fallos de IA (vía el puerto de M18)
 *        pedido_estado             cliente  · titular de la orden  importante  M08 · cambio de estado (agrupa por orden)
 *        comprobante_listo         cliente  · titular de la orden  novedad     M12 · comprobante emitido
 *        cotizacion_respondida     cliente  · titular              importante  M21 · puerto de notificaciones de cotización
 *        cotizacion_rechazada      cliente  · titular              importante  M21 · idem
 *        cuenta_empresa_dictamen   cliente  · titular              importante  M04 · aviso de dictamen (vía el puerto de M18)
 *      Fase 2 (los tipos ya están en el catálogo; quien mantiene cada módulo debe llamar al publicador, y por eso necesita
 *      autorización para tocar ese código): cotizacion_solicitada, solicitud_contacto, solicitud_empresa, solicitud_nit,
 *      postventa_solicitada, postventa_resuelta, inventario_agotado, respuesta_atencion.
 *
 * PANTALLAS
 *  - Cabecera del panel `/admin`: campanita a la derecha y punto rojo con número en los ítems del menú lateral que tengan novedades.
 *  - Cabecera de la tienda: campanita junto a favoritos, y punto rojo en «Mis pedidos» del menú de la cuenta.
 *  - La campanita abre una lista (los más recientes primero, de a PAGINA avisos, «Ver anteriores»), cada aviso con su texto,
 *    su hora relativa y su enlace; y «Marcar todo como leído».
 *
 * PREGUNTAS ABIERTAS (dependen del cliente; no frenan la construcción)
 *  Q1  ¿Se autoriza tocar los módulos de la fase 2 (una llamada al publicador en cada uno)? Mientras no, esos tipos no se emiten.
 *  Q2  ¿Consulta cada 30 s (hoy) o conexión abierta (SSE)? Con pocos usuarios simultáneos la consulta es más simple y robusta.
 *  Q3  ¿Cuánto se guardan los avisos leídos? Hoy 60 días.
 *  Q4  ¿Las novedades también se listan en la campanita? Hoy no: solo su punto rojo.
 *  Q5  ¿Cada persona debe poder silenciar tipos de aviso? Hoy no.
 *  Q6  ¿El administrador debe poder publicar avisos a todos los clientes o a un rol (promociones, mantenimientos)? Hoy no.
 *
 * FUERA DEL MÓDULO (PR general aparte, con aviso al equipo)
 *  - BD: tabla `notificacion_interna` (una fila por persona y aviso, índice único parcial por persona y `clave_grupo` mientras no
 *    esté leído, e índices para el resumen) y su modelo en `schema.prisma`.
 *  - `app.routes.ts`: montaje de las rutas y los adaptadores de la fase 1 sobre M08, M12, M21 y los puertos de M18.
 *  - Core: la campanita y el punto rojo en `AdminLayout` y en `Header` de la tienda.
 *
 * Rutas (montaje /api/v1/notificaciones, todas con sesión, de cualquier rol):
 *   GET    /resumen                       → resumenResponse            (R6; la que se consulta cada pocos segundos)
 *   GET    /?pagina&limite                → listarResponse             (importantes, de más nuevo a más viejo)
 *   POST   /campana/vista                 → { vistas }                 (R7: apaga el número, deja el resalte)
 *   POST   /leer-todas                    → { leidas }                 (importantes)
 *   POST   /:idNotificacion/leer          → notificacionResponse       (R7)
 *   POST   /secciones/:seccion/leer       → { leidas }                 (R7: apaga el punto rojo de esa sección)
 * ============================================================================
 */

export const CODIGOS_ERROR_FP02 = {
  RECURSO_NO_DISPONIBLE: 'RECURSO_NO_DISPONIBLE',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

export const INTERVALO_CONSULTA_SEGUNDOS = 30;
export const VENTANA_AGRUPACION_HORAS = 24;
export const RETENCION_DIAS = 60;
export const MAXIMO_AVISOS_POR_PERSONA = 200;
export const MAXIMO_DESTINATARIOS = 200;
export const TOPE_CONTADOR = 99;
export const PAGINA_POR_DEFECTO = 10;
export const PAGINA_MAXIMA = 30;
export const MAXIMO_REFERENCIAS = 5;

export const NIVELES = ['novedad', 'importante'] as const;
export const nivelSchema = z.enum(NIVELES);
export type Nivel = z.infer<typeof nivelSchema>;

/** Secciones del menú que pueden mostrar un punto rojo (R6). La interfaz las asocia a su ítem por la ruta. */
export const SECCIONES = ['pedidos', 'cotizaciones', 'atencion', 'empresas', 'postventa', 'inventario', 'facturacion', 'asesoria', 'mis_pedidos', 'mis_cotizaciones', 'cuenta'] as const;
export const seccionSchema = z.enum(SECCIONES);
export type Seccion = z.infer<typeof seccionSchema>;

/** Dónde lleva cada sección (la interfaz lo usa para pintar el punto en el ítem correcto). */
export const RUTA_DE_SECCION: Readonly<Record<Seccion, string>> = {
  pedidos: '/admin/pedidos',
  cotizaciones: '/admin/cotizaciones',
  atencion: '/admin/atencion',
  empresas: '/admin/empresas',
  postventa: '/admin/postventa',
  inventario: '/admin/inventario',
  facturacion: '/admin/facturacion',
  asesoria: '/admin/asesoria',
  mis_pedidos: '/perfil/pedidos',
  mis_cotizaciones: '/perfil/cotizaciones',
  cuenta: '/perfil',
};

export const AUDIENCIAS = ['personal', 'cliente'] as const;

export interface TipoNotificacion {
  readonly nivel: Nivel;
  readonly audiencia: (typeof AUDIENCIAS)[number];
  /** Solo para `personal`: el permiso que da derecho a recibirlo (R3). */
  readonly permiso?: string;
  readonly seccion: Seccion;
  /** `tipo` junta todo lo del tipo; `entidad` junta lo de UNA cosa (R4). */
  readonly agruparPor: 'tipo' | 'entidad';
  /** Textos con `{n}` y `{ref}` (R5). El singular se usa con una sola; el plural, con más. */
  readonly singular: string;
  readonly plural: string;
  /** Enlace del singular (`{ref}` = código de la cosa) y del plural (la lista filtrada). */
  readonly enlaceUno: string;
  readonly enlaceVarios: string;
}

/** El catálogo cerrado de avisos (R2, R5, R12). Agregar un tipo es cambiar el contrato. */
export const TIPOS_NOTIFICACION = {
  pedido_nuevo: { nivel: 'novedad', audiencia: 'personal', permiso: 'ventas.ver', seccion: 'pedidos', agruparPor: 'tipo', singular: 'Llegó un pedido nuevo: {ref}', plural: 'Han llegado {n} pedidos nuevos', enlaceUno: '/admin/pedidos/{ref}', enlaceVarios: '/admin/pedidos' },
  pedido_anulado: { nivel: 'importante', audiencia: 'personal', permiso: 'ventas.ver', seccion: 'pedidos', agruparPor: 'tipo', singular: 'El pedido {ref} fue cancelado o devuelto', plural: '{n} pedidos fueron cancelados o devueltos', enlaceUno: '/admin/pedidos/{ref}', enlaceVarios: '/admin/pedidos' },
  comprobante_pendiente: { nivel: 'importante', audiencia: 'personal', permiso: 'configuracion.editar', seccion: 'facturacion', agruparPor: 'tipo', singular: 'Un comprobante de venta no se pudo emitir: faltan los datos de facturación', plural: '{n} comprobantes de venta no se pudieron emitir: faltan los datos de facturación', enlaceUno: '/admin/facturacion', enlaceVarios: '/admin/facturacion' },
  alerta_servicio_ia: { nivel: 'importante', audiencia: 'personal', permiso: 'asesoria.ver', seccion: 'asesoria', agruparPor: 'tipo', singular: 'El asistente de la tienda dejó de responder', plural: 'El asistente de la tienda dejó de responder ({n} avisos)', enlaceUno: '/admin/asesoria', enlaceVarios: '/admin/asesoria' },
  cotizacion_solicitada: { nivel: 'novedad', audiencia: 'personal', permiso: 'ventas.ver', seccion: 'cotizaciones', agruparPor: 'tipo', singular: 'Hay una cotización por responder', plural: 'Hay {n} cotizaciones por responder', enlaceUno: '/admin/cotizaciones', enlaceVarios: '/admin/cotizaciones' },
  solicitud_contacto: { nivel: 'novedad', audiencia: 'personal', permiso: 'atencion.ver', seccion: 'atencion', agruparPor: 'tipo', singular: 'Llegó una solicitud de contacto', plural: 'Han llegado {n} solicitudes de contacto', enlaceUno: '/admin/atencion', enlaceVarios: '/admin/atencion' },
  solicitud_empresa: { nivel: 'novedad', audiencia: 'personal', permiso: 'empresas.validar', seccion: 'empresas', agruparPor: 'tipo', singular: 'Hay una solicitud de empresa por revisar', plural: 'Hay {n} solicitudes de empresa por revisar', enlaceUno: '/admin/empresas', enlaceVarios: '/admin/empresas' },
  solicitud_nit: { nivel: 'novedad', audiencia: 'personal', permiso: 'empresas.validar', seccion: 'empresas', agruparPor: 'tipo', singular: 'Hay una renovación de NIT por revisar', plural: 'Hay {n} renovaciones de NIT por revisar', enlaceUno: '/admin/empresas', enlaceVarios: '/admin/empresas' },
  postventa_solicitada: { nivel: 'novedad', audiencia: 'personal', permiso: 'ventas.ver', seccion: 'postventa', agruparPor: 'tipo', singular: 'Llegó una solicitud de postventa', plural: 'Han llegado {n} solicitudes de postventa', enlaceUno: '/admin/postventa', enlaceVarios: '/admin/postventa' },
  inventario_agotado: { nivel: 'importante', audiencia: 'personal', permiso: 'catalogo.ver', seccion: 'inventario', agruparPor: 'tipo', singular: 'Se agotó una presentación', plural: 'Se agotaron {n} presentaciones', enlaceUno: '/admin/inventario', enlaceVarios: '/admin/inventario' },
  pedido_estado: { nivel: 'importante', audiencia: 'cliente', seccion: 'mis_pedidos', agruparPor: 'entidad', singular: 'Tu pedido {ref} cambió de estado', plural: 'Tu pedido {ref} tuvo {n} cambios de estado', enlaceUno: '/perfil/pedidos/{ref}', enlaceVarios: '/perfil/pedidos/{ref}' },
  comprobante_listo: { nivel: 'novedad', audiencia: 'cliente', seccion: 'mis_pedidos', agruparPor: 'tipo', singular: 'Ya está el comprobante de tu pedido {ref}', plural: 'Ya están los comprobantes de {n} de tus pedidos', enlaceUno: '/perfil/pedidos/{ref}/comprobante', enlaceVarios: '/perfil/pedidos' },
  cotizacion_respondida: { nivel: 'importante', audiencia: 'cliente', seccion: 'mis_cotizaciones', agruparPor: 'tipo', singular: 'Respondimos tu cotización', plural: 'Respondimos {n} de tus cotizaciones', enlaceUno: '/perfil/cotizaciones', enlaceVarios: '/perfil/cotizaciones' },
  cotizacion_rechazada: { nivel: 'importante', audiencia: 'cliente', seccion: 'mis_cotizaciones', agruparPor: 'tipo', singular: 'No pudimos atender tu cotización', plural: 'No pudimos atender {n} de tus cotizaciones', enlaceUno: '/perfil/cotizaciones', enlaceVarios: '/perfil/cotizaciones' },
  cuenta_empresa_dictamen: { nivel: 'importante', audiencia: 'cliente', seccion: 'cuenta', agruparPor: 'tipo', singular: 'Revisamos tu solicitud de cuenta empresa', plural: 'Revisamos {n} solicitudes de tu cuenta empresa', enlaceUno: '/perfil', enlaceVarios: '/perfil' },
  postventa_resuelta: { nivel: 'importante', audiencia: 'cliente', seccion: 'mis_pedidos', agruparPor: 'entidad', singular: 'Respondimos tu solicitud sobre el pedido {ref}', plural: 'Tu solicitud sobre el pedido {ref} tuvo {n} novedades', enlaceUno: '/perfil/pedidos/{ref}', enlaceVarios: '/perfil/pedidos/{ref}' },
  respuesta_atencion: { nivel: 'importante', audiencia: 'cliente', seccion: 'cuenta', agruparPor: 'tipo', singular: 'Respondimos tu solicitud de contacto', plural: 'Respondimos {n} de tus solicitudes de contacto', enlaceUno: '/perfil', enlaceVarios: '/perfil' },
} as const satisfies Record<string, TipoNotificacion>;

export const TIPOS = Object.keys(TIPOS_NOTIFICACION) as ReadonlyArray<keyof typeof TIPOS_NOTIFICACION>;
export const tipoNotificacionSchema = z.enum(TIPOS as unknown as [keyof typeof TIPOS_NOTIFICACION, ...Array<keyof typeof TIPOS_NOTIFICACION>]);
export type TipoNotificacionClave = z.infer<typeof tipoNotificacionSchema>;

/* ─── Publicar (uso interno, sin ruta HTTP) ───────────────────────────────── */

export const destinoSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('usuario'), idUsuario: z.number().int().positive() }),
  z.object({ tipo: z.literal('permiso'), permiso: z.string().min(1).max(100) }),
]);
export type Destino = z.infer<typeof destinoSchema>;

export const eventoNotificacionSchema = z.object({
  tipo: tipoNotificacionSchema,
  destino: destinoSchema,
  /** El código de la cosa (una orden, un comprobante…): va en el texto y en el enlace (R5). Sin datos personales (R9). */
  referencia: z.string().trim().max(50).optional(),
  /** Para agrupar por entidad (R4) cuando difiere de `referencia`; por defecto, la misma. */
  entidad: z.string().trim().max(50).optional(),
});
export type EventoNotificacion = z.infer<typeof eventoNotificacionSchema>;

/* ─── Respuestas ──────────────────────────────────────────────────────────── */

export const notificacionSchema = z.object({
  idNotificacion: z.string().uuid(),
  tipo: tipoNotificacionSchema,
  nivel: nivelSchema,
  seccion: seccionSchema,
  /** Texto ya compuesto con el singular o el plural (R5). */
  texto: z.string(),
  enlace: z.string(),
  cantidad: z.number().int().positive(),
  /** Las referencias más recientes (hasta MAXIMO_REFERENCIAS), del más nuevo al más viejo. */
  referencias: z.array(z.string()).max(MAXIMO_REFERENCIAS),
  /** Fecha del último hecho sumado (R4). */
  fecha: z.string().datetime(),
  vista: z.boolean(),
  leida: z.boolean(),
});
export type Notificacion = z.infer<typeof notificacionSchema>;

export const resumenSchema = z.object({
  campana: z.object({
    /** Avisos importantes sin ver (R6), con tope TOPE_CONTADOR. */
    sinVer: z.number().int().nonnegative(),
    /** Importantes sin leer (para el texto accesible, R11). */
    sinLeer: z.number().int().nonnegative(),
  }),
  /** Una entrada por sección con novedades sin leer (R6); las secciones sin novedades no vienen. */
  secciones: z.array(z.object({ seccion: seccionSchema, cantidad: z.number().int().positive() })),
});
export type Resumen = z.infer<typeof resumenSchema>;

export const consultaListaSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(PAGINA_MAXIMA).default(PAGINA_POR_DEFECTO),
});
export type ConsultaLista = z.infer<typeof consultaListaSchema>;

export const listaNotificacionesSchema = z.object({
  items: z.array(notificacionSchema),
  total: z.number().int().nonnegative(),
  hayMas: z.boolean(),
});
export type ListaNotificaciones = z.infer<typeof listaNotificacionesSchema>;

export const idNotificacionParamSchema = z.object({ idNotificacion: z.string().uuid() });
export const seccionParamSchema = z.object({ seccion: seccionSchema });

const envelope = <T extends z.ZodTypeAny>(data: T) => z.object({ success: z.literal(true), data });
export const resumenResponseEnvelopeSchema = envelope(resumenSchema);
export const listarResponseEnvelopeSchema = envelope(listaNotificacionesSchema);
export const notificacionResponseEnvelopeSchema = envelope(notificacionSchema);
export const conteoResponseEnvelopeSchema = envelope(z.object({ cantidad: z.number().int().nonnegative() }));

export const errorFp02EnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({ code: z.string(), message: z.string() }),
});
