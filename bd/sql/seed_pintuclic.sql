-- ==============================================================================
-- PROYECTO: PINTUCLIC
-- DESCRIPCIÓN: Script de Seed y Mocks de Prueba Inicial para Desarrollo y Testing
-- VERSIÓN: 4.4 (alineado con schema_pintuclic.sql v4.4 - equivalencia en galones)
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

-- 1.4 Permisos Atómicos (Catálogo Maestro Oficial M17 / M20 / M04)
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
    (20, 'estadisticas.consultar',         'Consultar estadísticas de búsqueda sin resultado',  'activo'),
    -- Validación de Cuentas Empresa (M04 HU-CUE-09, RFC-M04-001 C-9)
    (21, 'empresas.validar',               'Aprobar o rechazar solicitudes de cuenta empresa, ascenso y renovación de NIT', 'activo'),
    -- Notificaciones y Comunicaciones (M18 HU-NOT-03)
    (22, 'notificaciones.ver',             'Ver plantillas de comunicación y el registro de envíos y rebotes', 'activo'),
    (23, 'notificaciones.editar',          'Editar el contenido de las plantillas de comunicación',            'activo')
ON CONFLICT (id_permiso) DO NOTHING;

-- 1.5 Asignación de Permisos a Roles
INSERT INTO asignacion_permiso (id_rol, id_permiso) VALUES
    (1, 1), (1, 2), (1, 3), (1, 4), (1, 5),
    (1, 6), (1, 7), (1, 8), (1, 9), (1, 10),
    (1, 11), (1, 12), (1, 13), (1, 14), (1, 15),
    (1, 16), (1, 17), (1, 18), (1, 19), (1, 20),
    (1, 21),
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
-- 3. MÓDULO DE CATÁLOGO (M01) — esquema 4.3 (19 Tablas)
-- Clasificación propuesta por el equipo (editable desde el panel):
--   categoría = qué ES el producto · subcategoría = su especialidad
--   superficie y ambiente (interior/exterior) = etiquetas del producto
-- ==============================================================================

-- 3.1 Categorías
INSERT INTO categoria (id_categoria, nombre, orden) VALUES
    (1, 'Pinturas',                   1),
    (2, 'Preparación de superficies', 2),
    (3, 'Maderas',                    3),
    (4, 'Impermeabilizantes',         4),
    (5, 'Aerosoles',                  5),
    (6, 'Herramientas y accesorios',  6)
ON CONFLICT (id_categoria) DO NOTHING;

-- 3.2 Subcategorías
INSERT INTO subcategoria (id_subcategoria, id_categoria, nombre, orden) VALUES
    (1,  1, 'Vinilos para muros',             1),
    (2,  1, 'Pinturas para fachadas',         2),
    (3,  1, 'Esmaltes',                       3),
    (4,  1, 'Anticorrosivos',                 4),
    (5,  1, 'Pinturas para pisos',            5),
    (6,  1, 'Pinturas especiales',            6),
    (7,  2, 'Estucos y masillas',             1),
    (8,  2, 'Selladores e imprimantes',       2),
    (9,  2, 'Removedores y limpiadores',      3),
    (10, 3, 'Barnices',                       1),
    (11, 3, 'Lacas',                          2),
    (12, 3, 'Tintes e inmunizantes',          3),
    (13, 4, 'Muros y fachadas',               1),
    (14, 4, 'Techos y cubiertas',             2),
    (15, 4, 'Siliconas y sellos de juntas',   3),
    (16, 5, 'Aerosoles multisuperficie',      1),
    (17, 5, 'Aerosoles especiales',           2),
    (18, 6, 'Brochas',                        1),
    (19, 6, 'Rodillos',                       2),
    (20, 6, 'Bandejas y extensiones',         3),
    (21, 6, 'Cintas y protección',            4),
    (22, 6, 'Lijas y espátulas',              5)
ON CONFLICT (id_subcategoria) DO NOTHING;

-- 3.3 Superficies (etiqueta N:M del producto)
INSERT INTO superficie (id_superficie, nombre, orden) VALUES
    (1, 'Paredes y techos',      1),
    (2, 'Madera',                2),
    (3, 'Metal',                 3),
    (4, 'Pisos',                 4),
    (5, 'Cubiertas y terrazas',  5),
    (6, 'Otras superficies',     6)
ON CONFLICT (id_superficie) DO NOTHING;

-- 3.4 Marcas (logotipo: PNG de 1x1 como marcador)
INSERT INTO marca (id_marca, nombre, logotipo, logotipo_mime_type) VALUES
    (1, 'Pintuco', decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'), 'image/png'),
    (2, 'Goya',    decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'), 'image/png')
ON CONFLICT (id_marca) DO NOTHING;

-- 3.5 Líneas
INSERT INTO linea (id_linea, id_marca, nombre, gama_comercial) VALUES
    (1, 1, 'Viniltex', 'Interiores'),
    (2, 1, 'Koraza',   'Exteriores'),
    (3, 1, 'Pintulux', 'Esmaltes'),
    (4, 1, 'ICO',      'Esmaltes de fábrica')
ON CONFLICT (id_linea) DO NOTHING;

-- 3.6 Catálogos técnicos
INSERT INTO tipo_resina (id_tipo_resina, nombre) VALUES
    (1, 'Base agua'),
    (2, 'Base aceite')
ON CONFLICT (id_tipo_resina) DO NOTHING;

INSERT INTO acabado (id_acabado, nombre, orden) VALUES
    (1, 'Brillante',    1),
    (2, 'Mate',         2),
    (3, 'Semimate',     3),
    (4, 'Satinado',     4),
    (5, 'Transparente', 5)
ON CONFLICT (id_acabado) DO NOTHING;

INSERT INTO base (id_base, nombre, orden) VALUES
    (1, 'Pastel', 1),
    (2, 'Tint',   2),
    (3, 'Deep',   3),
    (4, 'Accent', 4)
ON CONFLICT (id_base) DO NOTHING;

INSERT INTO familia_color (id_familia_color, nombre, hexadecimal, orden) VALUES
    (1,  'Blancos',           '#F5F1EA', 1),
    (2,  'Grises y negros',   '#8E9295', 2),
    (3,  'Amarillos',         '#F5D430', 3),
    (4,  'Naranjas',          '#F08A24', 4),
    (5,  'Rojos',             '#D7263D', 5),
    (6,  'Rosados y morados', '#8E5A9B', 6),
    (7,  'Azules',            '#3B6EA5', 7),
    (8,  'Verdes',            '#1FA34A', 8),
    (9,  'Tierras y cafés',   '#A67C52', 9)
ON CONFLICT (id_familia_color) DO NOTHING;

INSERT INTO tipo_medida (id_tipo_medida, nombre, abreviatura, equivalencia_galones) VALUES
    (1, 'Galón',     'gal', 1.000000000),
    (2, 'Litro',     'L',   0.264172052),
    (3, 'Mililitro', 'ml',  0.000264172),
    (4, 'Pulgada',   'in',  NULL),
    (5, 'Metro',     'm',   NULL),
    (6, 'Unidad',    'und', NULL)
ON CONFLICT (id_tipo_medida) DO NOTHING;

-- Bases creadas con el esquema 4.3: completa la equivalencia sin pisar la que ya fijó el administrador.
UPDATE tipo_medida SET equivalencia_galones = CASE id_tipo_medida
        WHEN 1 THEN 1.000000000 WHEN 2 THEN 0.264172052 WHEN 3 THEN 0.000264172 END
WHERE id_tipo_medida IN (1, 2, 3) AND equivalencia_galones IS NULL;

INSERT INTO medida (id_medida, id_tipo_medida, valor, nombre) VALUES
    (1, 1, 0.250, '1/4 de galón'),
    (2, 1, 1.000, '1 galón'),
    (3, 1, 5.000, '5 galones'),
    (4, 3, 300.000, '300 ml'),
    (5, 4, 2.000, '2 pulgadas'),
    (6, 4, 9.000, '9 pulgadas')
ON CONFLICT (id_medida) DO NOTHING;

-- 3.7 Colores (marca Pintuco). Base opcional: solo la omiten los colores de fábrica
-- sin preparación (ICO) y el transparente. Acabado por defecto: Brillante.
INSERT INTO color (id_color, id_marca, nombre, codigo, id_base, id_acabado, id_familia_color, hexadecimal) VALUES
    (1,  1, 'Blanco Puro',       'PIN-BLA-01', 1, 1, 1, '#F7F5EF'),
    (2,  1, 'Blanco Hueso',      'PIN-BLA-02', 1, 1, 1, '#EFE8D8'),
    (3,  1, 'Blanco',            'PIN-BLA-03', 1, 2, 1, '#F4F2EC'),
    (4,  1, 'Negro',             'PIN-NEG-01', 3, 2, 2, '#1E1E1E'),
    (5,  1, 'Gris Niebla',       'PIN-GRI-01', 1, 1, 2, '#C9CBCB'),
    (6,  1, 'Gris Carbón',       'PIN-GRI-04', 3, 1, 2, '#3B3D3F'),
    (7,  1, 'Amarillo Vainilla', 'PIN-AMA-05', 1, 1, 3, '#F3E3A6'),
    (8,  1, 'Amarillo Sol',      'PIN-AMA-01', 4, 1, 3, '#F7C600'),
    (9,  1, 'Naranja Mandarina', 'PIN-NAR-01', 4, 1, 4, '#F28C28'),
    (10, 1, 'Rojo Coral',        'PIN-ROJ-01', 2, 1, 5, '#E0654F'),
    (11, 1, 'Rojo Carmesí',      'PIN-ROJ-02', 4, 1, 5, '#A3161E'),
    (12, 1, 'Lila Suave',        'PIN-LIL-01', 1, 1, 6, '#D9C7E3'),
    (13, 1, 'Azul Cielo',        'PIN-AZU-02', 1, 1, 7, '#9CC9E8'),
    (14, 1, 'Azul Océano',       'PIN-AZU-07', 2, 1, 7, '#2F6E9E'),
    (15, 1, 'Azul Marino',       'PIN-AZU-01', 3, 1, 7, '#1F2F55'),
    (16, 1, 'Verde Menta',       'PIN-VER-02', 1, 1, 8, '#B8E2C8'),
    (17, 1, 'Verde Bosque',      'PIN-VER-01', 3, 1, 8, '#2E5E3A'),
    (18, 1, 'Terracota',         'PIN-TIE-01', 2, 1, 9, '#B5573B'),
    (19, 1, 'Maní',              'PIN-TIE-02', 2, 1, 9, '#C9A16A'),
    (20, 1, 'Negro ICO',         'ICO-NEG-01', NULL, 1, 2, '#111111'),
    (21, 1, 'Rojo ICO',          'ICO-ROJ-01', NULL, 1, 5, '#B01E23'),
    (22, 1, 'Transparente',      NULL,         NULL, 5, NULL, '#FFFFFF')
ON CONFLICT (id_color) DO NOTHING;

-- 3.8 Productos (marca → línea opcional → producto)
INSERT INTO producto (id_producto, id_marca, id_linea, id_subcategoria, nombre, descripcion, uso_interior, uso_exterior, estado, publicado, id_categoria_complementaria, patrocinado) VALUES
    (1, 1, 1,    1,  'Viniltex Ultralavable',      'Vinilo tipo 1 de alta lavabilidad para muros interiores.',          true,  false, 'activo', true, 6,    false),
    (2, 1, 2,    2,  'Koraza Sol & Lluvia',        'Pintura para fachadas con protección contra sol y lluvia.',         false, true,  'activo', true, 6,    true),
    (3, 1, 3,    3,  'Pintulux 3 en 1',            'Esmalte que prepara, protege y decora metal y madera.',             true,  true,  'activo', true, 6,    false),
    (4, 1, 4,    3,  'Esmalte ICO',                'Esmalte de colores de fábrica, sin preparación por colorimetría.',  true,  true,  'activo', true, NULL, false),
    (5, 1, NULL, 10, 'Barniz Transparente',        'Barniz para proteger y realzar la madera.',                         true,  true,  'activo', true, 6,    false),
    (6, 2, NULL, 18, 'Brocha de cerda natural',    'Brocha para pinturas base agua y base aceite.',                    false, false, 'activo', true, NULL, false)
ON CONFLICT (id_producto) DO NOTHING;

INSERT INTO ficha_recubrimiento (id_producto, id_tipo_resina, tipo_calidad, rendimiento_min, rendimiento_max) VALUES
    (1, 1, 1,    40.00, 45.00),
    (2, 1, 1,    35.00, 40.00),
    (3, 2, NULL, 30.00, 35.00),
    (4, 2, NULL, 30.00, 35.00),
    (5, 1, NULL, 25.00, 30.00)
ON CONFLICT (id_producto) DO NOTHING;

INSERT INTO producto_superficie (id_producto, id_superficie) VALUES
    (1, 1), (2, 1), (2, 5), (3, 2), (3, 3), (4, 3), (5, 2)
ON CONFLICT (id_producto, id_superficie) DO NOTHING;

-- Acabados: Viniltex ofrece brillante y mate (por eso ve los colores mate)
INSERT INTO producto_acabado (id_producto, id_acabado) VALUES
    (1, 1), (1, 2), (2, 1), (3, 1), (4, 1), (5, 5)
ON CONFLICT (id_producto, id_acabado) DO NOTHING;

-- Bases (carta): ICO, el barniz y la brocha no tienen
INSERT INTO producto_base (id_producto, id_base) VALUES
    (1, 1), (1, 2), (1, 3), (1, 4),
    (2, 1), (2, 2), (2, 3),
    (3, 1), (3, 2), (3, 3), (3, 4)
ON CONFLICT (id_producto, id_base) DO NOTHING;

-- Colores exclusivos / de fábrica
INSERT INTO producto_color (id_producto, id_color) VALUES
    (1, 1), (1, 19),
    (4, 20), (4, 21),
    (5, 22)
ON CONFLICT (id_producto, id_color) DO NOTHING;

INSERT INTO producto_caracteristica (id_caracteristica, id_producto, nombre, valor, orden) VALUES
    (1, 1, 'Tiempo de secado', '1 hora al tacto', 1),
    (2, 1, 'Lavabilidad',      'Alta',            2),
    (3, 3, 'Uso',              'Anticorrosivo y esmalte en un solo producto', 1)
ON CONFLICT (id_caracteristica) DO NOTHING;

-- 3.9 Variantes = producto + medida, con su precio
INSERT INTO variante (id_variante, id_producto, id_medida, sku, precio_vigente, existencia_referencial, estado) VALUES
    (1, 1, 2, 'VIN-ULT-GAL',   85900.00, 50, 'activo'),
    (2, 1, 1, 'VIN-ULT-QT',    28900.00, 30, 'activo'),
    (3, 1, 3, 'VIN-ULT-CUN',  389000.00, 10, 'activo'),
    (4, 2, 2, 'KOR-SYL-GAL',   99900.00, 20, 'activo'),
    (5, 3, 1, 'PLX-3EN1-QT',   31900.00, 25, 'activo'),
    (6, 3, 2, 'PLX-3EN1-GAL', 109900.00, 15, 'activo'),
    (7, 4, 1, 'ICO-ESM-QT',    27900.00, 40, 'activo'),
    (8, 5, 1, 'BAR-TRA-QT',    34900.00, 12, 'activo'),
    (9, 6, 5, 'GOY-BRO-2',      8900.00, 60, 'activo')
ON CONFLICT (id_variante) DO NOTHING;

-- 3.10 Combos (pendiente de rediseño en la entrega de combos)
INSERT INTO combo (id_combo, id_producto) VALUES
    (1, 1)
ON CONFLICT (id_combo) DO NOTHING;

INSERT INTO variante_combo (id_variante_combo, id_variante, id_combo, cantidad) VALUES
    (1, 1, 1, 1),
    (2, 9, 1, 2)
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
-- Mismo Viniltex de 1 galón en dos colores: dos líneas distintas (variante + color, RC-21)
INSERT INTO linea_carrito (id_linea_carrito, id_carrito, id_variante, id_color, ref_viva, cantidad) VALUES
    (1, 1, 1, 13, 1, 2),
    (2, 2, 2, 19, 1, 1),
    (3, 1, 1, 14, 1, 1)
ON CONFLICT (id_linea_carrito) DO NOTHING;

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
-- 9. MÓDULO DE CUENTAS, DIRECCIONES Y SOLICITUDES EMPRESA (7 Tablas - M04)
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

-- 9.2b Cuenta Empresa: NIT vigente de las cuentas ya aprobadas (RFC-M04-001 C-1)
INSERT INTO cuenta_empresa (id_usuario, nit, nombre_empresa, nombre_representante, correo_empresarial, telefono, id_solicitud_origen, fecha_aprobacion)
SELECT id_usuario, nit, nombre_empresa, nombre_representante, correo_empresarial, telefono, id_solicitud, COALESCE(fecha_revision, fecha_solicitud)
FROM solicitud_empresa
WHERE estado = 'aprobada'
ON CONFLICT (id_usuario) DO NOTHING;

-- 9.3a Documento de soporte (RUT adjunto - RFC-M04-001 C-3). Mock: PDF mínimo de 15 bytes
INSERT INTO documento_soporte (id_documento, nombre_original, tipo_mime, tamano_bytes, sha256, contenido) VALUES
    ('f0000000-0000-0000-0000-000000000001', 'rut_actualizado_valle.pdf', 'application/pdf', 15, '14bcd090baf31edba64e9cbd8cdfc15f943344aa72cb3675ad8e91bfcbce03ad', '\x255044462d312e340a2525454f460a')
ON CONFLICT (id_documento) DO NOTHING;

-- 9.3 Solicitudes de Actualización de NIT (HU-CUE-09)
INSERT INTO solicitud_actualizacion_nit (id_solicitud, id_usuario, nit_anterior, nit_nuevo, documento_adjunto_url, id_documento, estado, motivo_rechazo, id_admin_revisor, fecha_solicitud, fecha_revision) VALUES
    ('b0000000-0000-0000-0000-000000000001', 4, '900555666-1', '900555666-2', NULL, 'f0000000-0000-0000-0000-000000000001', 'pendiente', NULL, NULL, now() - interval '2 days', NULL)
ON CONFLICT (id_solicitud) DO NOTHING;

-- 9.4 Identidad Externa OAuth (HU-CUE-02)
INSERT INTO usuario_identidad_externa (id_identidad, id_usuario, proveedor, id_proveedor, correo_proveedor, fecha_vinculacion) VALUES
    (1, 2, 'google', 'google-oauth2|102938475610293847561', 'cliente@pintuclic.co', now() - interval '5 days')
ON CONFLICT (id_identidad) DO NOTHING;

-- 9.5 Códigos de Verificación OTP Efímeros (HU-CUE-01, 05, 06, RFC-M04-001 C-5)
-- Hash BCrypt costo 12 derivado de '123456'
INSERT INTO codigo_verificacion (id_codigo, correo, codigo_hash, tipo, expiracion, intentos, max_intentos, datos_temporales) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'baja@pintuclic.co', '$2b$12$UEjh98K3w36fJBWLtCWHKuAzhWy24tbz7kmqHcGuIdVkSSTtPsCmO', 'registro', now() + interval '15 minutes', 0, 3, '{"id_usuario": 3}'::jsonb)
ON CONFLICT (id_codigo) DO NOTHING;

-- ==============================================================================
-- 9C. CONFIGURACIÓN GENERAL DEL SISTEMA (1 Tabla - M17 - RFC-M17-001)
-- Catálogo oficial de HU-ADM-07, idéntico al que hasta ahora vivía en memoria (ADR-007).
-- ON CONFLICT DO NOTHING: re-ejecutar el seed NO pisa valores que un administrador ya modificó.
-- ==============================================================================

INSERT INTO parametro_sistema (id_parametro, clave, area, tipo_dato, descripcion, valor, valor_por_defecto, rango_minimo, rango_maximo) VALUES
    (1, 'auth.vigencia_codigo_registro_minutos', 'autenticacion', 'numero', 'Tiempo de vida en minutos del código OTP para confirmación de registro', '15'::jsonb, '15'::jsonb, 5, 60),
    (2, 'auth.intentos_codigo_registro', 'autenticacion', 'numero', 'Cantidad máxima de intentos fallidos antes de invalidar el código OTP', '3'::jsonb, '3'::jsonb, 1, 10),
    (3, 'auth.complejidad_minima_contrasena', 'autenticacion', 'numero', 'Longitud mínima exigida para contraseñas de cuentas', '12'::jsonb, '12'::jsonb, 12, 32),
    (4, 'auth.vigencia_enlace_recuperacion_minutos', 'autenticacion', 'numero', 'Vigencia máxima del token o enlace para restablecimiento de contraseña', '30'::jsonb, '30'::jsonb, 10, 120),
    (5, 'auth.intentos_fallidos_bloqueo', 'autenticacion', 'numero', 'Número de intentos erróneos consecutivos que disparan el bloqueo temporal', '5'::jsonb, '5'::jsonb, 3, 10),
    (6, 'auth.duracion_bloqueo_minutos', 'autenticacion', 'numero', 'Duración en minutos del bloqueo por intentos fallidos de autenticación', '15'::jsonb, '15'::jsonb, 5, 1440),
    (7, 'comms.reintentos_envio_transaccional', 'comunicaciones', 'numero', 'Reintentos automáticos ante fallas transitorias de entrega SMTP', '3'::jsonb, '3'::jsonb, 1, 5),
    (8, 'comercial.iva_porcentaje', 'comercial', 'numero', 'Porcentaje general de impuesto al valor agregado (IVA) aplicable a ventas', '19'::jsonb, '19'::jsonb, 0, 50),
    (9, 'comercial.costo_envio_base', 'comercial', 'numero', 'Tarifa base de despacho estándar a domicilio', '15000'::jsonb, '15000'::jsonb, 0, NULL),
    (10, 'comercial.umbral_envio_gratis', 'comercial', 'numero', 'Monto mínimo de compra para exoneración de costos de envío', '200000'::jsonb, '200000'::jsonb, 0, NULL),
    (11, 'auth.vigencia_enlace_activacion_horas', 'autenticacion', 'numero', 'Vigencia en horas del enlace con el que un colaborador nuevo define su contraseña', '72'::jsonb, '72'::jsonb, 1, 168)
ON CONFLICT (clave) DO NOTHING;

-- Alineación con el piso de contraseña de M20 (12 caracteres, RN-SEG-01 / RFC-M17-001 D-5).
-- Corrige las bases que se sembraron antes con el rango 8-32. Idempotente: solo actúa si el mínimo sigue por debajo de 12.
UPDATE parametro_sistema
SET rango_minimo = 12,
    valor = to_jsonb(GREATEST((valor #>> '{}')::numeric, 12))
WHERE clave = 'auth.complejidad_minima_contrasena' AND rango_minimo < 12;

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
SELECT setval('subcategoria_id_subcategoria_seq',               COALESCE((SELECT MAX(id_subcategoria) FROM subcategoria), 1));
SELECT setval('superficie_id_superficie_seq',                    COALESCE((SELECT MAX(id_superficie) FROM superficie), 1));
SELECT setval('marca_id_marca_seq',                              COALESCE((SELECT MAX(id_marca) FROM marca), 1));
SELECT setval('linea_id_linea_seq',                              COALESCE((SELECT MAX(id_linea) FROM linea), 1));
SELECT setval('base_id_base_seq',                                COALESCE((SELECT MAX(id_base) FROM base), 1));
SELECT setval('producto_id_producto_seq',                        COALESCE((SELECT MAX(id_producto) FROM producto), 1));
SELECT setval('tipo_resina_id_tipo_resina_seq',                  COALESCE((SELECT MAX(id_tipo_resina) FROM tipo_resina), 1));
SELECT setval('color_id_color_seq',                              COALESCE((SELECT MAX(id_color) FROM color), 1));
SELECT setval('acabado_id_acabado_seq',                          COALESCE((SELECT MAX(id_acabado) FROM acabado), 1));
SELECT setval('familia_color_id_familia_color_seq',              COALESCE((SELECT MAX(id_familia_color) FROM familia_color), 1));
SELECT setval('tipo_medida_id_tipo_medida_seq',                  COALESCE((SELECT MAX(id_tipo_medida) FROM tipo_medida), 1));
SELECT setval('medida_id_medida_seq',                            COALESCE((SELECT MAX(id_medida) FROM medida), 1));
SELECT setval('variante_id_variante_seq',                        COALESCE((SELECT MAX(id_variante) FROM variante), 1));
SELECT setval('producto_caracteristica_id_caracteristica_seq',   COALESCE((SELECT MAX(id_caracteristica) FROM producto_caracteristica), 1));
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
SELECT setval('parametro_sistema_id_parametro_seq',              COALESCE((SELECT MAX(id_parametro) FROM parametro_sistema), 1));

COMMIT;
