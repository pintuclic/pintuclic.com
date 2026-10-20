-- ==============================================================================
-- PROYECTO: PINTUCLIC
-- DESCRIPCIÓN: Script de Seed y Mocks de Prueba Inicial para Desarrollo y Testing
-- VERSIÓN: 3.9 (alineado con schema_pintuclic.sql v3.9: copia histórica, descuentos por línea y consecutivo - M08)
-- MOTOR: PostgreSQL 12+ (Compatible con PostgreSQL 18)
-- CODIFICACIÓN: UTF-8
-- PROPIEDAD: Totalmente idempotente (ON CONFLICT DO NOTHING + setval)
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. MÓDULO DE DESCUENTOS, ROLES Y PERMISOS (5 Tablas)
-- ==============================================================================

-- 1.1 Descuentos
INSERT INTO descuento (id_descuento, tope, porcentaje_descuento, estado) VALUES
    (1, 500000.00, 15.00, 'activo'),
    (2, 200000.00, 10.00, 'activo')
ON CONFLICT (id_descuento) DO NOTHING;

-- 1.2 Sub-Roles de Empresa
INSERT INTO sub_rol_empresa (id_sub_rol_empresa, nombre, id_descuento, estado) VALUES
    (1, 'Distribuidor Mayorista', 1, 'activo'),
    (2, 'Contratista Comercial',  2, 'activo')
ON CONFLICT (id_sub_rol_empresa) DO NOTHING;

-- 1.3 Roles Principales
INSERT INTO rol (id_rol, nombre, id_sub_rol_empresa, estado) VALUES
    (1, 'administrador', NULL, 'activo'),
    (2, 'cliente',       NULL, 'activo'),
    (3, 'empresa_vip',   1,    'activo')
ON CONFLICT (id_rol) DO NOTHING;

-- 1.4 Permisos Atómicos (Catálogo Maestro Oficial M17 / M20)
INSERT INTO permisos (id_permiso, nombre, descripcion, estado) VALUES
    -- Permisos heredados / pruebas M20
    (1,  'seguridad.configurar_sesion',    'Ajustar tiempos y políticas de vigencia de sesión', 'activo'),
    (2,  'productos.crear',                'Crear productos en el catálogo (alias legado)',      'activo'),
    (3,  'productos.eliminar',             'Permiso desactivado a propósito para pruebas',      'inactivo'),
    (4,  'ordenes.ver',                    'Visualizar órdenes de compra y ventas (alias legado)', 'activo'),
    (5,  'usuarios.gestionar',             'Administrar cuentas de usuarios (alias legado)',    'activo'),
    -- Catálogo Maestro Oficial M17
    (6,  'catalogo.ver',                   'Ver productos, variantes y categorías',             'activo'),
    (7,  'catalogo.crear',                 'Crear productos y variantes en el catálogo',        'activo'),
    (8,  'catalogo.editar',                'Editar productos, precios e imágenes',              'activo'),
    (9,  'catalogo.eliminar',              'Desactivar productos y variantes',                  'activo'),
    (10, 'ventas.ver',                     'Consultar órdenes de venta y cotizaciones',         'activo'),
    (11, 'ventas.gestionar',               'Actualizar estados y despachos de órdenes',         'activo'),
    (12, 'ventas.exportar',                'Exportar reportes comerciales y métricas de venta', 'activo'),
    (13, 'personal.ver',                   'Ver listado y ficha de empleados y clientes',       'activo'),
    (14, 'personal.editar',                'Editar datos de contacto y perfiles de empleados',  'activo'),
    (15, 'personal.desactivar',            'Desactivar y reactivar cuentas de empleado',        'activo'),
    (16, 'seguridad.gestionar_permisos',   'Asignar y revocar permisos individuales a empleados', 'activo'),
    (17, 'seguridad.gestionar_privacidad', 'Gestionar solicitudes de supresión y habeas data',  'activo'),
    (18, 'configuracion.ver',              'Consultar parámetros operativos del sistema',       'activo'),
    (19, 'configuracion.editar',           'Actualizar parámetros y reglas del sistema',        'activo'),
    -- Analítica de Búsqueda (M02 HU-BUS-06)
    (20, 'estadisticas.consultar',         'Consultar estadísticas de búsqueda sin resultado',  'activo')
ON CONFLICT (id_permiso) DO NOTHING;

-- 1.5 Asignación de Permisos a Roles
INSERT INTO asignacion_permiso (id_rol, id_permiso) VALUES
    (1, 1), (1, 2), (1, 3), (1, 4), (1, 5),
    (1, 6), (1, 7), (1, 8), (1, 9), (1, 10),
    (1, 11), (1, 12), (1, 13), (1, 14), (1, 15),
    (1, 16), (1, 17), (1, 18), (1, 19), (1, 20),
    (3, 4), (3, 10)
ON CONFLICT (id_rol, id_permiso) DO NOTHING;

-- ==============================================================================
-- 2. MÓDULO DE USUARIOS, SESIONES Y CONTROL DE ACCESO (3 Tablas)
-- ==============================================================================

-- 2.1 Usuarios
-- Contraseña de prueba para todos: Pintuclic2026
-- Hashes generados con BCrypt costo 12 (CA-SEG-01-02)
INSERT INTO usuario (id_usuario, nombre, telefono, correo, contrasena, id_rol, estado, tipo) VALUES
    (1, 'Admin Pruebas',              '3001234567', 'admin@pintuclic.co',
        '$2b$12$i3iIf6m7gavl8FKk1sbgp.Iao4QP23bqCsf5MXrnhE5vQmPHHA32y', 1, 'activo',   'normal'),
    (2, 'Cliente Activo',             '3109876543', 'cliente@pintuclic.co',
        '$2b$12$rzP5oOr82AJTsAGk4dRAEOtzJnPwwxpsSdcZkx3hm1jVa9AZjcXIC', 2, 'activo',   'normal'),
    (3, 'Cliente De Baja',            '3155551234', 'baja@pintuclic.co',
        '$2b$12$rzP5oOr82AJTsAGk4dRAEOtzJnPwwxpsSdcZkx3hm1jVa9AZjcXIC', 2, 'inactivo', 'normal'),
    (4, 'Pinturas del Valle S.A.S.',  '3208889900', 'contacto@pinturasvalle.co',
        '$2b$12$rzP5oOr82AJTsAGk4dRAEOtzJnPwwxpsSdcZkx3hm1jVa9AZjcXIC', 3, 'activo',   'empresa')
ON CONFLICT (id_usuario) DO NOTHING;

-- 2.2 Relación 1:1 Usuario - Rol
INSERT INTO usuario_rol (id_usuario, id_rol) VALUES
    (1, 1),
    (2, 2),
    (3, 2),
    (4, 3)
ON CONFLICT (id_usuario) DO NOTHING;

-- 2.3 Sesiones de Usuario (M20 - HU-SEG-02)
INSERT INTO sesion (id_sesion, id_usuario, tipo_sesion, fecha_inicio, fecha_ultimo_acceso, fecha_expiracion, estado, motivo_cierre) VALUES
    ('a0000000-0000-0000-0000-000000000001'::uuid, 1, 'admin',   now(), now(), now() + interval '30 minutes', 'activa', NULL),
    ('a0000000-0000-0000-0000-000000000002'::uuid, 2, 'cliente', now(), now(), now() + interval '30 days',    'activa', NULL)
ON CONFLICT (id_sesion) DO NOTHING;

-- ==============================================================================
-- 3. MÓDULO DE CATÁLOGO, VARIANTES Y COMBOS (13 Tablas)
-- ==============================================================================

-- 3.1 Categoría
INSERT INTO categoria (id_categoria, nombre) VALUES
    (1, 'Pinturas Arquitectónicas'),
    (2, 'Preparación y Protección de Superficies')
ON CONFLICT (id_categoria) DO NOTHING;

-- 3.2 Subcategorías
INSERT INTO subcategorias (id_subcategoria, id_categoria, nombre) VALUES
    (1, 1, 'Interiores y Exteriores'),
    (2, 2, 'Anticorrosivos e Imprimantes')
ON CONFLICT (id_subcategoria) DO NOTHING;

-- 3.3 Sub-Subcategorías
INSERT INTO sub_subcategorias (id_sub_subcategoria, id_subcategoria, nombre) VALUES
    (1, 1, 'Vinilos Base Agua'),
    (2, 2, 'Bases Sintéticas')
ON CONFLICT (id_sub_subcategoria) DO NOTHING;

-- 3.4 Marca (HU-CAT-04 / prerrequisito de HU-CAT-11)
INSERT INTO marca (id_marca, nombre, logotipo, logotipo_mime_type) VALUES
    (1, 'Pintuco', decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'), 'image/png'),
    (2, 'Interpinturas', decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'), 'image/png')
ON CONFLICT (id_marca) DO NOTHING;

-- 3.5 Línea
INSERT INTO linea (id_linea, id_sub_subcategoria, id_marca, nombre) VALUES
    (1, 1, 1, 'Viniltex Avanzado'),
    (2, 2, 2, 'Pintulux Anticorrosivo')
ON CONFLICT (id_linea) DO NOTHING;

-- 3.6 Base
INSERT INTO base (id_base, id_marca, nombre) VALUES
    (1, 1, 'Base A'),
    (2, 1, 'Base B')
ON CONFLICT (id_base) DO NOTHING;

-- 3.6b Tipo de resina (catálogo administrable - RF-CAT-02-04)
INSERT INTO tipo_resina (id_tipo_resina, nombre) VALUES
    (1, 'Base Agua'),
    (2, 'Base Aceite')
ON CONFLICT (id_tipo_resina) DO NOTHING;

-- 3.7 Producto (HU-CAT-02): marca obligatoria, clase de color, y línea/resina en pinturas
-- rendimiento en m2 por galón (HU-CAT-10) solo aplica a pinturas
INSERT INTO producto (id_producto, id_marca, id_linea, id_tipo_resina, nombre, descripcion, clase_color, estado, publicado, rendimiento_min, rendimiento_max, id_categoria_complementaria, patrocinado) VALUES
    (1, 1, 1, 1,    'Viniltex Máxima Protección Antibacterial', 'Pintura interior y exterior de alta lavabilidad con acabado mate.', 'colores_fijos', 'activo', true, 40.00, 45.00, 2,    false),
    (2, 1, 1, NULL, 'Kit Renovación Hogar Premium',             'Kit práctico para renovar espacios interiores con acabado uniforme.', 'sin_color',     'activo', true, NULL,  NULL,  NULL, false),
    (3, 2, 2, 2,    'Esmalte Anticorrosivo Secado Rápido',      'Esmalte de alta resistencia para proteger superficies metálicas.', 'colores_fijos', 'activo', true, 15.00, 20.00, NULL, true)
ON CONFLICT (id_producto) DO NOTHING;

-- Habilita los registros históricos del seed para el storefront público.
-- UPDATE es idempotente y permite actualizar bases creadas con versiones previas.
UPDATE producto
SET descripcion = CASE id_producto
        WHEN 1 THEN 'Pintura interior y exterior de alta lavabilidad con acabado mate.'
        WHEN 2 THEN 'Kit práctico para renovar espacios interiores con acabado uniforme.'
        WHEN 3 THEN 'Esmalte de alta resistencia para proteger superficies metálicas.'
    END,
    estado = 'activo',
    publicado = true
WHERE id_producto IN (1, 2, 3);

-- 3.7b Producto ↔ Subcategoría (RF-CAT-02-02: al menos una subcategoría)
INSERT INTO producto_subcategoria (id_producto, id_subcategoria) VALUES
    (1, 1),
    (2, 1),
    (3, 2)
ON CONFLICT (id_producto, id_subcategoria) DO NOTHING;

-- 3.8 Colores por marca (HU-CAT-05): nombre + código opcional + valor CIELAB obligatorio
INSERT INTO color (id_color, id_marca, nombre, codigo, cie_l, cie_a, cie_b) VALUES
    (1, 1, 'Blanco Puro',  'PIN-BLA-01', 96.000,  0.000,   0.500),
    (2, 1, 'Azul Océano',  'PIN-AZU-07', 45.000, -5.000, -35.000),
    (3, 2, 'Gris Titanio', NULL,         60.000,  0.000,   0.000),
    (4, 1, 'Amarillo Sol',      'PIN-AMA-01', 85.000,   5.000,  80.000),
    (5, 1, 'Amarillo Maíz',     'PIN-AMA-02', 78.000,   8.000,  68.000),
    (6, 1, 'Amarillo Arena',    'PIN-AMA-03', 82.000,   4.000,  35.000),
    (7, 1, 'Amarillo Mostaza',  'PIN-AMA-04', 65.000,  12.000,  55.000),
    (8, 1, 'Amarillo Vainilla', 'PIN-AMA-05', 90.000,   1.000,  25.000),
    (9, 1, 'Amarillo Dorado',   'PIN-AMA-06', 74.000,  15.000,  70.000),
    (10, 1, 'Azul Marino',      'PIN-AZU-01', 30.000,   5.000, -35.000),
    (11, 1, 'Azul Cielo',       'PIN-AZU-02', 75.000, -15.000, -25.000),
    (12, 1, 'Azul Turquesa',    'PIN-AZU-03', 68.000, -28.000, -18.000),
    (13, 1, 'Azul Noche',       'PIN-AZU-04', 22.000,   2.000, -25.000),
    (14, 1, 'Azul Índigo',      'PIN-AZU-05', 38.000,  18.000, -42.000),
    (15, 1, 'Verde Bosque',     'PIN-VER-01', 42.000, -40.000,  22.000),
    (16, 1, 'Verde Menta',      'PIN-VER-02', 80.000, -34.000,  15.000),
    (17, 1, 'Verde Oliva',      'PIN-VER-03', 55.000, -24.000,  14.000),
    (18, 1, 'Verde Esmeralda',  'PIN-VER-04', 58.000, -52.000,  25.000),
    (19, 1, 'Verde Salvia',     'PIN-VER-05', 72.000, -22.000,  18.000),
    (20, 1, 'Verde Pino',       'PIN-VER-06', 34.000, -32.000,  16.000),
    (21, 1, 'Rojo Coral',       'PIN-ROJ-01', 58.000,  55.000,  35.000),
    (22, 1, 'Rojo Carmesí',     'PIN-ROJ-02', 42.000,  58.000,  25.000),
    (23, 1, 'Rojo Terracota',   'PIN-ROJ-03', 50.000,  45.000,  35.000),
    (24, 1, 'Rojo Rubí',        'PIN-ROJ-04', 40.000,  58.000,  18.000),
    (25, 1, 'Rojo Cereza',      'PIN-ROJ-05', 48.000,  62.000,  28.000),
    (26, 1, 'Rojo Arcilla',     'PIN-ROJ-06', 56.000,  38.000,  32.000),
    (27, 1, 'Gris Niebla',      'PIN-GRI-01', 78.000,   0.000,   0.000),
    (28, 1, 'Gris Plata',       'PIN-GRI-02', 68.000,  -1.000,  -1.000),
    (29, 1, 'Gris Cemento',     'PIN-GRI-03', 52.000,   1.000,   2.000),
    (30, 1, 'Gris Carbón',      'PIN-GRI-04', 28.000,   0.000,   0.000)
ON CONFLICT (id_color) DO NOTHING;

-- 3.9 Tonos Derivados con recargo de precio
INSERT INTO tonos (id_tono, id_color, precio) VALUES
    (1, 2, 15000.00),
    (2, 3, 12000.00)
ON CONFLICT (id_tono) DO NOTHING;

-- 3.9b Presentaciones (HU-CAT-03, RF-CAT-03-05): entidad propia con volumen numérico
INSERT INTO presentacion (id_presentacion, nombre, volumen) VALUES
    (1, 'Galón',           3.785),
    (2, 'Cuarto de Galón', 0.946),
    (3, 'Litro',           1.000)
ON CONFLICT (id_presentacion) DO NOTHING;

-- 3.10 Variantes Vendibles (SKU) — producto + presentación (+ color si es de colores fijos)
INSERT INTO variante (id_variante, id_producto, id_presentacion, id_color, precio_vigente, existencia_referencial, estado) VALUES
    (1, 1, 1, 1, 85900.00,  50, 'activo'),
    (2, 1, 1, 2, 95900.00,  30, 'activo'),
    (3, 3, 1, 3, 115000.00, 20, 'activo'),
    (4, 2, 3, NULL, 129900.00, 12, 'activo'),
    (5, 1, 1, 4,  95900.00, 20, 'activo'),
    (6, 1, 1, 5,  95900.00, 20, 'activo'),
    (7, 1, 1, 6,  95900.00, 20, 'activo'),
    (8, 1, 1, 7,  95900.00, 20, 'activo'),
    (9, 1, 1, 8,  95900.00, 20, 'activo'),
    (10, 1, 1, 9, 95900.00, 20, 'activo'),
    (11, 1, 1, 10, 95900.00, 20, 'activo'),
    (12, 1, 1, 11, 95900.00, 20, 'activo'),
    (13, 1, 1, 12, 95900.00, 20, 'activo'),
    (14, 1, 1, 13, 95900.00, 20, 'activo'),
    (15, 1, 1, 14, 95900.00, 20, 'activo'),
    (16, 1, 1, 15, 95900.00, 20, 'activo'),
    (17, 1, 1, 16, 95900.00, 20, 'activo'),
    (18, 1, 1, 17, 95900.00, 20, 'activo'),
    (19, 1, 1, 18, 95900.00, 20, 'activo'),
    (20, 1, 1, 19, 95900.00, 20, 'activo'),
    (21, 1, 1, 20, 95900.00, 20, 'activo'),
    (22, 1, 1, 21, 95900.00, 20, 'activo'),
    (23, 1, 1, 22, 95900.00, 20, 'activo'),
    (24, 1, 1, 23, 95900.00, 20, 'activo'),
    (25, 1, 1, 24, 95900.00, 20, 'activo'),
    (26, 1, 1, 25, 95900.00, 20, 'activo'),
    (27, 1, 1, 26, 95900.00, 20, 'activo'),
    (28, 1, 1, 27, 95900.00, 20, 'activo'),
    (29, 1, 1, 28, 95900.00, 20, 'activo'),
    (30, 1, 1, 29, 95900.00, 20, 'activo'),
    (31, 1, 1, 30, 95900.00, 20, 'activo'),
    (32, 1, 2, 1,  28900.00, 30, 'activo'),
    (33, 1, 2, 2,  31900.00, 25, 'activo')
ON CONFLICT (id_variante) DO NOTHING;

-- 3.11 Características Técnicas
INSERT INTO caracteristica (id_caracteristica, id_variante, nombre) VALUES
    (1, 1, 'Rendimiento: 40-45 m2 por galón a dos manos'),
    (2, 1, 'Acabado: Mate de alta lavabilidad sin olor'),
    (3, 2, 'Resistencia a la intemperie: Filtro UV grado superior'),
    (4, 3, 'Protección catódica contra óxido para metales')
ON CONFLICT (id_caracteristica) DO NOTHING;

-- 3.12 Combo Cabecera
INSERT INTO combo (id_combo, id_producto) VALUES
    (1, 2)
ON CONFLICT (id_combo) DO NOTHING;

-- 3.13 Detalle de Variantes en Combo
INSERT INTO variante_combo (id_variante_combo, id_variante, id_combo, cantidad) VALUES
    (1, 1, 1, 2),
    (2, 2, 1, 1)
ON CONFLICT (id_variante, id_combo) DO NOTHING;

-- ==============================================================================
-- 4. MÓDULO DE CARRITO DE COMPRAS (VIVO) (2 Tablas)
-- ==============================================================================

-- 4.1 Carrito
INSERT INTO carrito (id_carrito, token_visitante, id_usuario, fecha_ultima_actividad) VALUES
    (1, NULL, 2, now()),
    (2, 'anon-cart-uuid-dev-sample-2026', NULL, now())
ON CONFLICT (id_carrito) DO NOTHING;

-- 4.2 Líneas de Carrito
INSERT INTO linea_carrito (id_linea_carrito, id_carrito, id_variante, ref_viva, cantidad) VALUES
    (1, 1, 1, 1, 2),
    (2, 2, 2, 1, 1)
ON CONFLICT (id_carrito, id_variante) DO NOTHING;

-- ==============================================================================
-- 5. MÓDULO DE COTIZACIONES Y ÓRDENES (HISTÓRICO INMUTABLE) (7 Tablas; consecutivo no lleva datos de prueba)
-- ==============================================================================

-- 5.1 Cotización
INSERT INTO cotizacion (id_cotizacion, id_usuario, id_rol, estado, fecha_creacion) VALUES
    (1, 4, 3, 'aprobada', now() - interval '2 days'),
    (2, 2, 2, 'borrador', now())
ON CONFLICT (id_cotizacion) DO NOTHING;

-- 5.2 Orden (v3.9: modo de entrega, IVA congelado y solicitud SOL de origen).
-- En bases creadas antes de v3.9, ORD-2026-0001 y 0002 ya existen: conservan los campos nuevos en NULL.
-- ORD-2026-0003 es nueva: recogida en almacén, pago directo verificado por un empleado (SOL), dos
-- descuentos encadenados, una línea entonada y una línea de un producto retirado del catálogo.
INSERT INTO orden (id_orden, codigo_visible, id_usuario, origen, id_cotizacion, carrito_o_cotizacion, estado, transaccion_pago_id, codigo_solicitud, modo_entrega, costo_entrega, direccion, sub_total, descuento, total, base_sin_impuesto, importe_iva, tasa_iva, observaciones, fecha) VALUES
    (1, 'ORD-2026-0001', 2, 'carrito', NULL, 'carrito_directo', 'orden_confirmada', 'TRX-PSE-987654321', NULL, 'domicilio', 0.00,
        'Calle 45 # 12-34, Apt 301, Chapinero, Bogotá D.C.', 171800.00, 0.00, 171800.00, 144369.75, 27430.25, 19.00,
        'Dejar en portería debidamente sellado', CURRENT_DATE),
    (2, 'ORD-2026-0002', 4, 'cotizacion', 1, 'cotizacion_aprobada', 'en_preparacion', 'TRX-TAR-112233445', NULL, 'domicilio', 0.00,
        'Avenida Las Americas # 68-90, Bodega 4, Medellín', 500000.00, 75000.00, 425000.00, 357142.86, 67857.14, 19.00,
        'Despacho corporativo con factura electrónica adjunta', CURRENT_DATE),
    (3, 'ORD-2026-0003', 2, 'carrito', NULL, 'carrito_directo', 'orden_confirmada', NULL, 'SOL-2026-00001', 'recogida', 0.00,
        NULL, 275900.00, 14590.00, 261310.00, 219588.24, 41721.76, 19.00,
        'Recoge en el almacén; pago directo verificado por WhatsApp', CURRENT_DATE)
ON CONFLICT (codigo_visible) DO NOTHING;

-- 5.3 Líneas de Orden (Snapshot Histórico Inmutable; v3.9: color, precio inicial, referencia y entonado).
-- id_variante_ref 9999 no existe a propósito: representa un producto retirado del catálogo (RF-ORD-04-03).
-- La línea entonada usa un producto de ejemplo porque el catálogo del seed aún no tiene productos entonables.
INSERT INTO linea_orden (id_linea_orden, id_orden, nombre_producto, variante_copia, precio_aplicado, cantidad, color_solicitado, precio_inicial, id_variante_ref, es_entonado, base_consumida) VALUES
    (1, 1, 'Viniltex Máxima Protección Antibacterial', 'Galón - Blanco Puro',            85900.00,  2, 'Blanco Puro',   85900.00,  1,    false, NULL),
    (2, 2, 'Kit Renovación Hogar Premium',              'Kit Corporativo Pro',            425000.00, 1, NULL,            500000.00, NULL, false, NULL),
    (3, 3, 'Viniltex Máxima Protección Antibacterial', 'Galón - Azul Océano',            81310.00,  1, 'Azul Océano',   95900.00,  2,    false, NULL),
    (4, 3, 'Pintura Entonada de Carta (ejemplo)',       'Galón - Base A',                 120000.00, 1, 'Amarillo Sol',  120000.00, NULL, true,  'Base A - Galón'),
    (5, 3, 'Esmalte Sintético Brillante',               'Cuarto de Galón - Rojo Colonial', 30000.00, 2, 'Rojo Colonial', 30000.00,  9999, false, NULL)
ON CONFLICT (id_linea_orden) DO NOTHING;

-- 5.3b Descuentos por Línea en su orden de aplicación (M08 - RF-ORD-02-02 / CA-ORD-02-02).
INSERT INTO linea_orden_descuento (id_linea_orden_descuento, id_linea_orden, orden_aplicacion, origen, porcentaje, importe) VALUES
    (1, 2, 1, 'Descuento cliente empresa', 15.00, 75000.00),
    (2, 3, 1, 'Promoción Viniltex',         10.00,  9590.00),
    (3, 3, 2, 'Cupón de bienvenida',        NULL,   5000.00)
ON CONFLICT (id_linea_orden_descuento) DO NOTHING;

-- 5.4 Historial de Estados de la Orden (M08 - HU-ORD-03). Autor NULL = transición automática del sistema.
INSERT INTO historial_estado_orden (id_historial_estado_orden, id_orden, estado_anterior, estado_nuevo, id_usuario_autor, motivo, referencia_externa, fecha) VALUES
    (1, 1, NULL,                      'orden_confirmada',        NULL, NULL, NULL, now() - interval '90 minutes'),
    (2, 2, NULL,                      'orden_confirmada',        NULL, NULL, NULL, now() - interval '90 minutes'),
    (3, 2, 'orden_confirmada',        'revision_disponibilidad', 1,    NULL, NULL, now() - interval '60 minutes'),
    (4, 2, 'revision_disponibilidad', 'en_preparacion',          NULL, NULL, NULL, now() - interval '30 minutes'),
    (5, 3, NULL,                      'orden_confirmada',        1,    NULL, NULL, now() - interval '10 minutes')
ON CONFLICT (id_historial_estado_orden) DO NOTHING;

-- 5.5 Notas Internas del Personal (M08 - HU-ORD-10). Nunca visibles al cliente.
INSERT INTO nota_orden (id_nota_orden, id_orden, id_usuario_autor, texto, fecha) VALUES
    (1, 2, 1, 'Cliente corporativo: confirmar el NIT de la factura electrónica antes de despachar.', now() - interval '25 minutes')
ON CONFLICT (id_nota_orden) DO NOTHING;

-- 5.6 Contactos con el Cliente Registrados desde la Orden (M08 - HU-ORD-09)
INSERT INTO contacto_orden (id_contacto_orden, id_orden, id_usuario_autor, medio, detalle, fecha) VALUES
    (1, 2, 1, 'telefono', 'Se confirmó con el cliente la dirección de la bodega para el despacho.', now() - interval '20 minutes')
ON CONFLICT (id_contacto_orden) DO NOTHING;

-- ==============================================================================
-- 6. MÓDULO DE PAGOS Y FACTURACIÓN (3 Tablas)
-- ==============================================================================

-- 6.1 Métodos de Pago
INSERT INTO metodo_pago (id_metodo_pago, nombre, descripcion, estado) VALUES
    (1, 'PSE - Transferencia Bancaria', 'Pagos electrónicos seguros desde cualquier entidad financiera', 'activo'),
    (2, 'Tarjeta de Crédito / Débito',  'Procesamiento vía pasarela internacional (Visa, Master)',        'activo'),
    (3, 'Transferencia Bancolombia',    'Pago directo a cuenta empresarial',                             'activo')
ON CONFLICT (id_metodo_pago) DO NOTHING;

-- 6.2 Pagos
INSERT INTO pagos (id_pago, id_orden, id_metodo_pago, estado, monto) VALUES
    (1, 1, 1, 'completado', 171800.00),
    (2, 2, 2, 'completado', 425000.00)
ON CONFLICT (id_pago) DO NOTHING;

-- 6.3 Factura
INSERT INTO factura (id_factura, id_orden, fecha, estado) VALUES
    (1, 1, CURRENT_DATE, 'emitida'),
    (2, 2, CURRENT_DATE, 'pagada')
ON CONFLICT (id_factura) DO NOTHING;

-- ==============================================================================
-- 7. MÓDULO DE SERVICIOS Y RESERVACIONES (1 Tabla)
-- ==============================================================================

-- 7.1 Reservaciones
INSERT INTO reservaciones (id_reservacion, id_producto, id_usuario, fecha, hora, estado) VALUES
    (1, 1, 2, CURRENT_DATE + interval '3 days', '10:00:00', 'confirmada'),
    (2, 3, 4, CURRENT_DATE + interval '5 days', '14:30:00', 'pendiente')
ON CONFLICT (id_reservacion) DO NOTHING;

-- ==============================================================================
-- 8. MÓDULO DE PRIVACIDAD, CONSENTIMIENTO Y HABEAS DATA (3 Tablas)
-- ==============================================================================

-- 8.1 Aviso de Privacidad
INSERT INTO aviso_privacidad (id_aviso_privacidad, version, descripcion, es_vigente) VALUES
    (1, 'v1.0-2026', 'Política integral de tratamiento de datos personales conforme a la Ley Estatutaria 1581 de 2012 y Decreto 1377 de 2013 de la República de Colombia.', true),
    (2, 'v0.9-2025', 'Política preliminar de términos y condiciones de comercio digital para pruebas piloto.', false)
ON CONFLICT (version) DO NOTHING;

-- 8.2 Consentimiento de Usuarios
INSERT INTO consentimiento_usuario (id_consentimiento, id_usuario, id_aviso_privacidad, fecha) VALUES
    (1, 1, 1, now() - interval '10 days'),
    (2, 2, 1, now() - interval '5 days'),
    (3, 4, 1, now() - interval '2 days')
ON CONFLICT (id_usuario, id_aviso_privacidad) DO NOTHING;

-- 8.3 Solicitud de Supresión (Derechos ARCO / Habeas Data)
INSERT INTO solicitud_supresion (id_solicitud_supresion, id_usuario, fecha_solicitud, fecha_resolucion, estado) VALUES
    (1, 3, now() - interval '1 day', NULL, 'pendiente')
ON CONFLICT (id_solicitud_supresion) DO NOTHING;

-- ==============================================================================
-- 9. MÓDULO DE CUENTAS, DIRECCIONES Y SOLICITUDES EMPRESA (5 Tablas - M04)
-- ==============================================================================

-- 9.1 Direcciones de Cliente (HU-CUE-07)
INSERT INTO direccion_cliente (id_direccion, id_usuario, direccion, barrio, apartamento_casa, nombre_apellido, telefono, es_predeterminada, latitud, longitud) VALUES
    ('d0000000-0000-0000-0000-000000000001', 2, 'Carrera 7 # 45-23', 'Chapinero', 'Apto 402', 'Cliente Activo', '3001234567', true, 4.6300000, -74.0650000),
    ('d0000000-0000-0000-0000-000000000002', 2, 'Calle 100 # 15-20', 'Chicó', 'Oficina 501', 'Cliente Activo', '3001234567', false, 4.6850000, -74.0500000),
    ('d0000000-0000-0000-0000-000000000003', 4, 'Zona Industrial Acopi Cl 15 # 22-10', 'Acopi', 'Bodega 3', 'Pinturas del Valle S.A.S.', '3157778899', true, 3.5100000, -76.5100000)
ON CONFLICT (id_direccion) DO NOTHING;

-- 9.2 Solicitudes de Empresa (B2B - HU-CUE-03 / HU-CUE-09)
INSERT INTO solicitud_empresa (id_solicitud, id_usuario, nombre_empresa, nombre_representante, correo_empresarial, telefono, nit, tipo_solicitud, estado, motivo_rechazo, id_admin_revisor, fecha_solicitud, fecha_revision) VALUES
    ('e0000000-0000-0000-0000-000000000001', 4, 'Pinturas del Valle S.A.S.', 'Carlos Echeverry', 'contacto@pinturasvalle.co', '3157778899', '900555666-1', 'registro', 'aprobada', NULL, 1, now() - interval '15 days', now() - interval '14 days'),
    ('e0000000-0000-0000-0000-000000000002', 2, 'Ferretería El Progreso', 'Cliente Activo', 'progreso@ferreteria.com', '3001234567', '800111222-3', 'ascenso_particular', 'pendiente', NULL, NULL, now() - interval '1 day', NULL)
ON CONFLICT (id_solicitud) DO NOTHING;

-- 9.3 Solicitudes de Actualización de NIT (HU-CUE-09)
INSERT INTO solicitud_actualizacion_nit (id_solicitud, id_usuario, nit_anterior, nit_nuevo, documento_adjunto_url, estado, motivo_rechazo, id_admin_revisor, fecha_solicitud, fecha_revision) VALUES
    ('b0000000-0000-0000-0000-000000000001', 4, '900555666-1', '900555666-2', 'https://storage.pintuclic.co/ruts/rut_actualizado_valle.pdf', 'pendiente', NULL, NULL, now() - interval '2 days', NULL)
ON CONFLICT (id_solicitud) DO NOTHING;

-- 9.4 Identidad Externa OAuth (HU-CUE-02)
INSERT INTO usuario_identidad_externa (id_identidad, id_usuario, proveedor, id_proveedor, correo_proveedor, fecha_vinculacion) VALUES
    (1, 2, 'google', 'google-oauth2|102938475610293847561', 'cliente@pintuclic.co', now() - interval '5 days')
ON CONFLICT (id_identidad) DO NOTHING;

-- 9.5 Códigos de Verificación OTP Efímeros (HU-CUE-01, 05, 06)
INSERT INTO codigo_verificacion (id_codigo, correo, codigo, tipo, expiracion, intentos, max_intentos, datos_temporales) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'baja@pintuclic.co', '123456', 'registro', now() + interval '15 minutes', 0, 3, '{"id_usuario": 3}'::jsonb)
ON CONFLICT (id_codigo) DO NOTHING;

-- ==============================================================================
-- 10. ACTUALIZACIÓN AUTOMÁTICA DE SECUENCIAS (EVITA COLISIONES DE IDs)
-- ==============================================================================

SELECT setval('descuento_id_descuento_seq',                      COALESCE((SELECT MAX(id_descuento) FROM descuento), 1));
SELECT setval('sub_rol_empresa_id_sub_rol_empresa_seq',          COALESCE((SELECT MAX(id_sub_rol_empresa) FROM sub_rol_empresa), 1));
SELECT setval('rol_id_rol_seq',                                  COALESCE((SELECT MAX(id_rol) FROM rol), 1));
SELECT setval('permisos_id_permiso_seq',                         COALESCE((SELECT MAX(id_permiso) FROM permisos), 1));
SELECT setval('asignacion_permiso_id_asignacion_permiso_seq',    COALESCE((SELECT MAX(id_asignacion_permiso) FROM asignacion_permiso), 1));
SELECT setval('usuario_id_usuario_seq',                          COALESCE((SELECT MAX(id_usuario) FROM usuario), 1));
SELECT setval('usuario_rol_id_usuario_rol_seq',                  COALESCE((SELECT MAX(id_usuario_rol) FROM usuario_rol), 1));
SELECT setval('categoria_id_categoria_seq',                      COALESCE((SELECT MAX(id_categoria) FROM categoria), 1));
SELECT setval('subcategorias_id_subcategoria_seq',              COALESCE((SELECT MAX(id_subcategoria) FROM subcategorias), 1));
SELECT setval('sub_subcategorias_id_sub_subcategoria_seq',       COALESCE((SELECT MAX(id_sub_subcategoria) FROM sub_subcategorias), 1));
SELECT setval('marca_id_marca_seq',                              COALESCE((SELECT MAX(id_marca) FROM marca), 1));
SELECT setval('linea_id_linea_seq',                              COALESCE((SELECT MAX(id_linea) FROM linea), 1));
SELECT setval('base_id_base_seq',                                COALESCE((SELECT MAX(id_base) FROM base), 1));
SELECT setval('producto_id_producto_seq',                        COALESCE((SELECT MAX(id_producto) FROM producto), 1));
SELECT setval('tipo_resina_id_tipo_resina_seq',                  COALESCE((SELECT MAX(id_tipo_resina) FROM tipo_resina), 1));
SELECT setval('color_id_color_seq',                              COALESCE((SELECT MAX(id_color) FROM color), 1));
SELECT setval('tonos_id_tono_seq',                               COALESCE((SELECT MAX(id_tono) FROM tonos), 1));
SELECT setval('presentacion_id_presentacion_seq',                COALESCE((SELECT MAX(id_presentacion) FROM presentacion), 1));
SELECT setval('variante_id_variante_seq',                        COALESCE((SELECT MAX(id_variante) FROM variante), 1));
SELECT setval('caracteristica_id_caracteristica_seq',            COALESCE((SELECT MAX(id_caracteristica) FROM caracteristica), 1));
SELECT setval('combo_id_combo_seq',                              COALESCE((SELECT MAX(id_combo) FROM combo), 1));
SELECT setval('variante_combo_id_variante_combo_seq',            COALESCE((SELECT MAX(id_variante_combo) FROM variante_combo), 1));
SELECT setval('carrito_id_carrito_seq',                          COALESCE((SELECT MAX(id_carrito) FROM carrito), 1));
SELECT setval('linea_carrito_id_linea_carrito_seq',              COALESCE((SELECT MAX(id_linea_carrito) FROM linea_carrito), 1));
SELECT setval('cotizacion_id_cotizacion_seq',                    COALESCE((SELECT MAX(id_cotizacion) FROM cotizacion), 1));
SELECT setval('orden_id_orden_seq',                              COALESCE((SELECT MAX(id_orden) FROM orden), 1));
SELECT setval('linea_orden_id_linea_orden_seq',                  COALESCE((SELECT MAX(id_linea_orden) FROM linea_orden), 1));
SELECT setval('linea_orden_descuento_id_linea_orden_descuento_seq', COALESCE((SELECT MAX(id_linea_orden_descuento) FROM linea_orden_descuento), 1));
SELECT setval('historial_estado_orden_id_historial_estado_orden_seq', COALESCE((SELECT MAX(id_historial_estado_orden) FROM historial_estado_orden), 1));
SELECT setval('nota_orden_id_nota_orden_seq',                    COALESCE((SELECT MAX(id_nota_orden) FROM nota_orden), 1));
SELECT setval('contacto_orden_id_contacto_orden_seq',            COALESCE((SELECT MAX(id_contacto_orden) FROM contacto_orden), 1));
SELECT setval('metodo_pago_id_metodo_pago_seq',                  COALESCE((SELECT MAX(id_metodo_pago) FROM metodo_pago), 1));
SELECT setval('pagos_id_pago_seq',                               COALESCE((SELECT MAX(id_pago) FROM pagos), 1));
SELECT setval('factura_id_factura_seq',                          COALESCE((SELECT MAX(id_factura) FROM factura), 1));
SELECT setval('reservaciones_id_reservacion_seq',                COALESCE((SELECT MAX(id_reservacion) FROM reservaciones), 1));
SELECT setval('aviso_privacidad_id_aviso_privacidad_seq',        COALESCE((SELECT MAX(id_aviso_privacidad) FROM aviso_privacidad), 1));
SELECT setval('consentimiento_usuario_id_consentimiento_seq',    COALESCE((SELECT MAX(id_consentimiento) FROM consentimiento_usuario), 1));
SELECT setval('solicitud_supresion_id_solicitud_supresion_seq',  COALESCE((SELECT MAX(id_solicitud_supresion) FROM solicitud_supresion), 1));
SELECT setval('usuario_identidad_externa_id_identidad_seq',      COALESCE((SELECT MAX(id_identidad) FROM usuario_identidad_externa), 1));

COMMIT;
