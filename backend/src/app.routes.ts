import { Router, type RequestHandler } from 'express';
import { construirRutasLandingBanners } from './core/landing/banners.routes';
import { construirAuthMiddleware } from './core/middlewares/auth.middleware';
import { construirModuloM01 } from './modules/m01-catalogo/m01.routes';
import { BusquedaM02Adapter } from './modules/m03-asesoria/adapters/busqueda-m02.adapter';
import { ContextoCatalogoAdapter } from './modules/m03-asesoria/adapters/contexto-catalogo.adapter';
import { construirModuloM03 } from './modules/m03-asesoria/m03.routes';
import { construirModuloM14 } from './modules/m14-patrocinios/m14.routes';
import { construirModuloM02 } from './modules/m02-busqueda/m02.routes';
import { PrecioFinalM06Adapter } from './modules/m02-busqueda/services/precio-final-m06.adapter';
import { construirModuloM04 } from './modules/m04-cuentas/m04.routes';
import { OrdenesM08Adapter } from './modules/m07-checkout/adapters/ordenes-m08.adapter';
import { construirModuloM07 } from './modules/m07-checkout/m07.routes';
import { construirModuloM12 } from './modules/m12-facturacion/m12.routes';
import { construirModuloM08 } from './modules/m08-ordenes/m08.routes';
import { construirModuloM11 } from './modules/m11-postventa/m11.routes';
import { construirModuloM05 } from './modules/m05-carrito/m05.routes';
import { construirModuloM06 } from './modules/m06-precios/m06.routes';
import { construirModuloM13 } from './modules/m13-inventario/m13.routes';
import { construirModuloM15 } from './modules/m15-atencion/m15.routes';
import { construirModuloM16 } from './modules/m16-contenido/m16.routes';
import { construirModuloM17 } from './modules/m17-permisos/m17.routes';
import { construirModuloM18 } from './modules/m18-notificaciones/m18.routes';
import { AvisosCotizacionM18Adapter, AvisosOrdenM18Adapter } from './modules/m18-notificaciones/adapters/avisos-m18.adapter';
import { PrismaDestinatarioRepository } from './modules/m18-notificaciones/repositories/destinatario.repository';
import { construirModuloM20 } from './modules/m20-seguridad/m20.routes';
import { construirModuloM21 } from './modules/m21-cotizaciones/m21.routes';

interface RutaPublica {
  metodo: string;
  ruta: string;
}

/**
 * Exige sesión salvo en las rutas públicas listadas. `req.path` es relativo al
 * punto de montaje y se compara exacto: cualquier variación cae en la sesión.
 */
function exigirSesionSalvo(auth: RequestHandler, publicas: readonly RutaPublica[]): RequestHandler {
  return (req, res, next) => {
    const esPublica = publicas.some((p) => p.metodo === req.method && p.ruta === req.path);
    if (esPublica) {
      next();
      return;
    }
    Promise.resolve(auth(req, res, next)).catch(next);
  };
}

/** Enrutador raíz. Monta cada módulo bajo /api/v1. */
export function construirAppRoutes(): Router {
  const router = Router();
  const m20 = construirModuloM20();
  const auth = construirAuthMiddleware(m20.sesionService);
  const m17 = construirModuloM17(m20.sesionService, m20.auditoria, {
    // HU-ADM-01: M04 envía el enlace de activación de los empleados que crea M17.
    // M04 se construye después (usa la autorización de M17); la llamada ocurre por
    // petición, cuando `m04` ya existe.
    activacionEmpleado: {
      enviarEnlaceActivacion: (idUsuario) => m04.recuperacionService.emitirEnlaceActivacion(idUsuario),
    },
  });
  const m18 = construirModuloM18(m17.autorizacionService, {
    // RF-NOT-01-03: M18 lee el límite de reintentos que el admin edita en M17.
    parametros: {
      obtenerNumero: async (clave) => {
        const { parametros } = await m17.configService.obtenerCatalogo();
        const valor = parametros.find((p) => p.clave === clave)?.valor;
        return typeof valor === 'number' ? valor : null;
      },
    },
  });
  const m04 = construirModuloM04(m20.sesionService, m17.autorizacionService, {
    // HU-ADM-07: M04 lee los parámetros de autenticación que el admin edita en M17
    // (caché corta de 30 s en el repositorio de configuración).
    parametros: {
      obtenerNumero: async (clave) => {
        const { parametros } = await m17.configService.obtenerCatalogo();
        const valor = parametros.find((p) => p.clave === clave)?.valor;
        return typeof valor === 'number' ? valor : null;
      },
    },
    // ADR-009 (migrado a M18): M04 ya no construye su propio adapter SMTP.
    notificaciones: m18.notificaciones,
    // M06 · D8: los tipos de cliente empresa los administra M06. M06 se construye más abajo (necesita M01); la
    // llamada ocurre por petición, cuando `m06` ya existe.
    tiposCliente: {
      listarActivos: () => m06.tiposCliente.listarActivos(),
      existeActivo: (idSubRolEmpresa) => m06.tiposCliente.existeActivo(idSubRolEmpresa),
    },
  });

  // M20: El aviso de privacidad es público (RF-SEG-05-03); el resto exige sesión vigente.
  router.use(
    '/seguridad',
    exigirSesionSalvo(auth, [{ metodo: 'GET', ruta: '/privacidad/aviso-vigente' }]),
    m20.router,
  );

  // M04: Cuentas, autenticación, perfil y gestión empresarial
  router.use('/cuentas', m04.cuentasRouter);
  router.use('/admin/empresas', m04.adminEmpresasRouter);

  // M01: administración del catálogo (exige sesión y permisos `catalogo.*`, resueltos en servidor)
  // y consulta pública de lo publicado (sin sesión, solo lectura). Va antes de `/admin` para que
  // el router de M17 no atienda las rutas `/admin/catalogo`.
  const m01 = construirModuloM01(m17.autorizacionService, {
    // M06 (eventos de descuento): ofertas para tarjetas y ficha, y conteo de eventos al desactivar. M06 se construye
    // después (necesita `catalogoParaCompra` de M01); la llamada ocurre por petición, cuando `m06` ya existe.
    ofertas: {
      idsProductosEnOferta: () => m06.precios.idsProductosEnOferta(),
      ofertasDeProductos: (ids) => m06.precios.ofertasDeProductos(ids),
      preciosDeVariantes: (consultas) => m06.precios.preciosDeVariantes(consultas),
    },
    impactoReglas: { contarEventosVigentes: (objetivos) => m06.impacto.contarEventosVigentes(objetivos) },
    // M14 (campañas de patrocinio): los productos patrocinados van primero en los complementarios de la ficha.
    patrocinio: { prioridadesDeProductos: (ubicacion) => m14.patrocinio.prioridadesDeProductos(ubicacion) },
  });
  router.use('/admin/catalogo', exigirSesionSalvo(auth, []), m01.adminRouter);
  router.use('/catalogo', m01.publicRouter);

  // M08: órdenes de venta. Cliente (`/ordenes/mis-pedidos`) y personal (`/ordenes/gestion`)
  // exigen sesión; el permiso `ventas.*` se resuelve en servidor dentro del módulo.
  // M12: comprobante de venta imprimible. Se construye antes que M08 porque se engancha a su aviso «orden creada»
  // (`estados.notificaciones`) para emitirlo al nacer la orden; el aviso al cliente sale por M18. Va antes de `/admin`.
  const m12 = construirModuloM12(m17.autorizacionService, { notificaciones: m18.notificaciones });
  router.use('/facturacion', exigirSesionSalvo(auth, []), m12.router);
  router.use('/admin/facturacion', exigirSesionSalvo(auth, []), m12.adminRouter);

  const avisosOrdenM18 = new AvisosOrdenM18Adapter(m18.notificaciones, new PrismaDestinatarioRepository());
  const m08 = construirModuloM08(m17.autorizacionService, {
    auditoria: m20.auditoria,
    // M08 D05: al nacer la orden sale el comprobante (M12); al despacharla, el aviso de M18.
    estados: {
      notificaciones: {
        notificarOrdenCreada: (evento) => m12.alCrearOrden.notificarOrdenCreada(evento),
        notificarOrdenDespachada: (evento) => avisosOrdenM18.notificarOrdenDespachada(evento),
      },
    },
  });
  router.use('/ordenes', exigirSesionSalvo(auth, []), m08.router);

  // M11: postventa (cancelaciones, devoluciones y reembolsos)
  const m11 = construirModuloM11(m17.autorizacionService, { auditoria: m20.auditoria });
  router.use('/postventa', exigirSesionSalvo(auth, []), m11.router);
  // M02: búsqueda, filtros y descubrimiento (público) y analítica de búsquedas sin resultado (admin).
  // El precio final y las ofertas los da M06 (se pide de forma diferida: se construye después, por M01).
  const m02 = construirModuloM02(m17.autorizacionService, {
    precioFinal: new PrecioFinalM06Adapter({ preciosDeVariantes: (consultas) => m06.precios.preciosDeVariantes(consultas) }),
    ofertas: {
      idsProductosEnOferta: () => m06.precios.idsProductosEnOferta(),
      ofertasDeProductos: (ids) => m06.precios.ofertasDeProductos(ids),
    },
    // Las campañas de M14 (se piden de forma diferida: M14 se construye después, porque pide a M01 las tarjetas).
    patrocinio: { prioridadesDeProductos: (ubicacion) => m14.patrocinio.prioridadesDeProductos(ubicacion) },
  });
  router.use('/admin/busqueda', exigirSesionSalvo(auth, []), m02.adminRouter);
  router.use('/busqueda', m02.publicRouter);

  // M13: inventario referencial (existencias, historial y carga masiva). Exige sesión y los permisos
  // `catalogo.ver` / `catalogo.editar`, resueltos en servidor. Va antes de `/admin` por la misma razón.
  const m13 = construirModuloM13(m17.autorizacionService);
  router.use('/admin/inventario', exigirSesionSalvo(auth, []), m13.router);

  // M06: precios, eventos de descuento, cupones y descuentos de empresa. La administración exige sesión y los
  // permisos `catalogo.*`; el cálculo y los eventos en curso son públicos (la sesión es opcional y solo sirve para
  // saber quién es el cliente). Lee el precio base de M01 y el IVA de M17. Va antes de `/admin` por lo mismo que M01.
  const m06 = construirModuloM06(m17.autorizacionService, {
    sesiones: m20.sesionService,
    catalogoCompra: m01.catalogoParaCompra,
    parametros: {
      obtenerNumero: async (clave) => {
        const { parametros } = await m17.configService.obtenerCatalogo();
        const valor = parametros.find((p) => p.clave === clave)?.valor;
        return typeof valor === 'number' ? valor : null;
      },
    },
  });
  router.use('/admin/precios', exigirSesionSalvo(auth, []), m06.adminRouter);
  router.use('/precios', m06.publicRouter);

  // M05: carrito de compras. Público con sesión opcional: el dueño sale de la sesión o de la cookie `pc_cart` del
  // visitante, nunca del cliente. Los precios los calcula M06 y los datos de cada línea vienen de M01. Los días tras
  // los que se borra un carrito de visitante abandonado se editan en la configuración general (M17).
  const m05 = construirModuloM05({
    sesiones: m20.sesionService,
    precios: m06.precios,
    catalogo: m01.catalogoParaCompra,
    parametros: {
      obtenerNumero: async (clave) => {
        const { parametros } = await m17.configService.obtenerCatalogo();
        const valor = parametros.find((p) => p.clave === clave)?.valor;
        return typeof valor === 'number' ? valor : null;
      },
    },
  });
  router.use('/carrito', m05.publicRouter);

  // M21: cotizaciones. El cliente las pide desde su carrito (M05) y exige sesión; el panel exige sesión y los permisos
  // `ventas.ver` / `ventas.gestionar`, resueltos en servidor. Al aceptarla, sus líneas vuelven al carrito con el precio
  // acordado. Va antes de `/admin` por lo mismo que M01.
  const m21 = construirModuloM21(m17.autorizacionService, {
    carrito: m05.carrito,
    // M21 D8 / RF-NOT-02-03: avisos de cotización respondida y rechazada por M18.
    notificaciones: new AvisosCotizacionM18Adapter(m18.notificaciones),
    parametros: {
      obtenerNumero: async (clave) => {
        const { parametros } = await m17.configService.obtenerCatalogo();
        const valor = parametros.find((p) => p.clave === clave)?.valor;
        return typeof valor === 'number' ? valor : null;
      },
    },
  });
  router.use('/admin/cotizaciones', exigirSesionSalvo(auth, []), m21.adminRouter);
  router.use('/cotizaciones', exigirSesionSalvo(auth, []), m21.clienteRouter);

  // M14: patrocinios. La administración de campañas exige sesión y los permisos propios `patrocinios.ver` y
  // `patrocinios.editar`; el bloque «Productos patrocinados» del inicio es público. Pide a M01 las tarjetas. Va antes
  // de `/admin` por lo mismo que M01.
  const m14 = construirModuloM14(m17.autorizacionService, { tarjetas: m01.consultaPublicaService });
  router.use('/admin/patrocinios', exigirSesionSalvo(auth, []), m14.adminRouter);
  router.use('/patrocinios', m14.publicRouter);

  // M16: gestión administrativa de contenido institucional y FAQ (exige sesión y permisos
  // `configuracion.*`) y consulta pública de páginas publicadas y FAQ activas (sin sesión).
  // Va antes de `/admin` para no colisionar con el enrutador general de M17.
  const m16 = construirModuloM16(m17.autorizacionService);
  router.use('/admin/contenido', exigirSesionSalvo(auth, []), m16.adminRouter);
  router.use('/contenido', m16.publicRouter);

  // FP-01 (Transversal): gestión administrativa de banners / sliders de inicio y consulta pública.
  const landing = construirRutasLandingBanners(m17.autorizacionService);
  router.use('/admin/landing', exigirSesionSalvo(auth, []), landing.adminRouter);
  router.use('/landing', landing.publicRouter);

  // M15: atención al cliente. El horario y el canal son públicos; el formulario de
  // contacto exige sesión (RF-ATC-02-01). Las preguntas frecuentes no son de M15:
  // las sirve M16 en /contenido/faq. Va antes de `/admin` por lo mismo que M01.
  const m15 = construirModuloM15(m17.autorizacionService);
  router.use('/admin/atencion', exigirSesionSalvo(auth, []), m15.adminRouter);
  router.use(
    '/atencion',
    exigirSesionSalvo(auth, [
      { metodo: 'GET', ruta: '/horario' },
      { metodo: 'GET', ruta: '/whatsapp' },
    ]),
    m15.publicRouter,
  );

  // M03: asesoría y asistencia. La calculadora y el cuestionario guiado son públicos y no
  // usan inteligencia artificial, así que responden aunque el servicio de IA esté caído
  // (M03 · K11, I6). La vista previa del cuestionario la resuelve la búsqueda de M02, para
  // que el número que anuncia y lo que muestra el catálogo al pulsar sean lo mismo (M03 · R7).
  const m03 = construirModuloM03(m17.autorizacionService, {
    catalogo: new BusquedaM02Adapter(m02.busquedaService),
    contextoCatalogo: new ContextoCatalogoAdapter(m02.busquedaService),
    auditoria: m20.auditoria,
  });
  router.use('/admin/asesoria', exigirSesionSalvo(auth, []), m03.adminRouter);
  router.use('/asesoria', m03.publicRouter);

  // M07: checkout y pago con Nequi por Wompi. El cliente paga con sesión; Wompi avisa sin sesión a
  // `/checkout/wompi/eventos` (lo protege la firma, por eso se monta antes). El panel exige sesión de personal y
  // `ventas.*`. Congela el carrito de M05 con los precios de M06 y, con el pago aprobado, crea la orden en M08.
  const m07 = construirModuloM07(m17.autorizacionService, {
    carrito: {
      carritoDeCuenta: (idUsuario, codigoCupon) => m05.carrito.carritoDeCuenta(idUsuario, codigoCupon),
      revalidar: (idUsuario, pantalla) => m05.carrito.revalidarCuenta(idUsuario, pantalla),
      quitarComprado: (idUsuario, lineas) => m05.carrito.quitarComprado(idUsuario, lineas),
      carritoDirecto: (idUsuario, linea) => m05.carrito.carritoDirecto(idUsuario, linea),
      revalidarDirecta: (idUsuario, linea, pantalla) => m05.carrito.revalidarDirecta(idUsuario, linea, pantalla),
    },
    precios: m06.precios,
    ordenes: new OrdenesM08Adapter(m08.creacion),
    parametros: {
      obtenerNumero: async (clave) => {
        const { parametros } = await m17.configService.obtenerCatalogo();
        const valor = parametros.find((p) => p.clave === clave)?.valor;
        return typeof valor === 'number' ? valor : null;
      },
    },
    auditoria: m20.auditoria,
    tareaPeriodica: process.env.VITEST === undefined,
  });
  router.use('/checkout/wompi', m07.wompiRouter);
  router.use('/checkout', exigirSesionSalvo(auth, []), m07.clienteRouter);
  router.use('/admin/pagos', exigirSesionSalvo(auth, []), m07.adminRouter);

  // M17: la confirmación del cambio de correo del admin llega desde un enlace y es
  // pública (HU-ADM-06); el resto de endpoints administrativos exige sesión.
  router.use(
    '/admin',
    exigirSesionSalvo(auth, [{ metodo: 'POST', ruta: '/gobernanza/confirmar-correo' }]),
    m17.router,
  );

  // M18: Notificaciones y Comunicaciones — plantillas y diagnóstico de envíos (HU-NOT-03/04)
  router.use('/admin/notificaciones', auth, m18.router);

  return router;
}
