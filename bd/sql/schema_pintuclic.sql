-- ==============================================================================
-- PROYECTO: PINTUCLIC
-- DESCRIPCIÓN: Script DDL para PostgreSQL con tipos ENUM tipificados
-- VERSIÓN: 3.9 (v3.8 + copia histórica de la orden, descuentos por línea y consecutivo sin huecos - M08)
-- MOTOR: PostgreSQL 15+ (usa UNIQUE NULLS NOT DISTINCT; compatible con PostgreSQL 18)
-- CODIFICACIÓN: UTF-8
-- TOTAL TABLAS: 49
-- ==============================================================================

-- Si deseas recrear el esquema desde cero, puedes descomentar la siguiente línea:
-- DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;

-- ==============================================================================
-- 0. DEFINICIÓN DE TIPOS ENUMERADOS (ENUMs)
-- ==============================================================================

DO $$ 
BEGIN
    -- Estado general para entidades de configuración (descuentos, roles, permisos, métodos de pago)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_estado_general') THEN
        CREATE TYPE enum_estado_general AS ENUM ('activo', 'inactivo');
    END IF;

    -- Tipo de cuenta de usuario
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_tipo_usuario') THEN
        CREATE TYPE enum_tipo_usuario AS ENUM ('normal', 'empresa');
    END IF;

    -- Estado para cuentas de usuario
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_estado_usuario') THEN
        CREATE TYPE enum_estado_usuario AS ENUM ('activo', 'inactivo', 'bloqueado', 'pendiente');
    END IF;

    -- Estado comercial y de inventario para productos / variantes
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_estado_producto') THEN
        CREATE TYPE enum_estado_producto AS ENUM ('activo', 'inactivo', 'agotado', 'descontinuado');
    END IF;

    -- Origen de generación de una orden de compra
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_origen_orden') THEN
        CREATE TYPE enum_origen_orden AS ENUM ('carrito', 'cotizacion');
    END IF;

    -- Estado del ciclo de vida de una orden de venta (M08 - HU-ORD-03, definiciones D01/D02 de la épica #28).
    -- Las bases creadas antes de v3.8 se migran en la sección 0.1.
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_estado_orden') THEN
        CREATE TYPE enum_estado_orden AS ENUM (
            'orden_confirmada', 'revision_disponibilidad', 'en_preparacion', 'preparada',
            'despachado', 'entregado', 'cancelado', 'devuelto'
        );
    END IF;

    -- Estado del ciclo de vida de una cotización
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_estado_cotizacion') THEN
        CREATE TYPE enum_estado_cotizacion AS ENUM ('borrador', 'enviada', 'aprobada', 'rechazada', 'vencida');
    END IF;

    -- Estado de la transacción de pago
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_estado_pago') THEN
        CREATE TYPE enum_estado_pago AS ENUM ('pendiente', 'completado', 'fallido', 'reembolsado');
    END IF;

    -- Estado fiscal y legal de la factura
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_estado_factura') THEN
        CREATE TYPE enum_estado_factura AS ENUM ('emitida', 'pagada', 'anulada');
    END IF;

    -- Estado del ciclo de vida de una reservación
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_estado_reservacion') THEN
        CREATE TYPE enum_estado_reservacion AS ENUM ('pendiente', 'confirmada', 'cancelada', 'finalizada');
    END IF;

    -- Ciclo de vida de una sesion de usuario (M20 - HU-SEG-02)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_estado_sesion') THEN
        CREATE TYPE enum_estado_sesion AS ENUM ('activa', 'cerrada', 'expirada', 'revocada');
    END IF;

    -- Tipo de sesion, determina la ventana de inactividad aplicable (RF-SEG-02-02)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_tipo_sesion') THEN
        CREATE TYPE enum_tipo_sesion AS ENUM ('admin', 'cliente');
    END IF;

    -- Causa por la que una sesion dejo de estar activa (RF-SEG-02-06)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_motivo_cierre_sesion') THEN
        CREATE TYPE enum_motivo_cierre_sesion AS ENUM (
            'cierre_manual', 'inactividad', 'cambio_contrasena',
            'cuenta_desactivada', 'permisos_retirados'
        );
    END IF;

    -- Estado de solicitudes de supresion de datos personales (Habeas Data - M20 / HU-SEG-05)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_estado_solicitud_supresion') THEN
        CREATE TYPE enum_estado_solicitud_supresion AS ENUM ('pendiente', 'en_proceso', 'aprobada', 'rechazada');
    END IF;

    -- Tipo de solicitud de cuenta corporativa (M04 - HU-CUE-03 / HU-CUE-06)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_tipo_solicitud_empresa') THEN
        CREATE TYPE enum_tipo_solicitud_empresa AS ENUM ('registro', 'ascenso_particular');
    END IF;

    -- Estado del trámite de una solicitud de empresa o NIT (M04 - HU-CUE-03 / HU-CUE-09)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_estado_solicitud_empresa') THEN
        CREATE TYPE enum_estado_solicitud_empresa AS ENUM ('pendiente', 'aprobada', 'rechazada');
    END IF;

    -- Propósito transaccional del código OTP efímero (M04 - HU-CUE-01, 05, 06)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_tipo_codigo_otp') THEN
        CREATE TYPE enum_tipo_codigo_otp AS ENUM ('registro', 'recuperacion_password', 'cambio_correo');
    END IF;

    -- Clase de color de un producto (M01 - HU-CAT-02, RF-CAT-02-03)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_clase_color') THEN
        CREATE TYPE enum_clase_color AS ENUM ('entonable', 'colores_fijos', 'sin_color');
    END IF;

    -- Modo de entrega de la orden (M08 - RF-ORD-03-06, RF-ORD-05-05; M10): envío a domicilio o recogida en almacén
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_modo_entrega') THEN
        CREATE TYPE enum_modo_entrega AS ENUM ('domicilio', 'recogida');
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 0.1 MIGRACIÓN DE enum_estado_orden PARA BASES CREADAS ANTES DE v3.8 (M08)
-- En una base nueva estas sentencias no cambian nada. En una base existente
-- renombran los valores antiguos conservando los datos ('pagado' -> 'orden_confirmada',
-- 'enviado' -> 'despachado') y añaden los estados nuevos. 'pendiente' queda sin uso:
-- PostgreSQL no permite quitar un valor de un ENUM sin recrear el tipo.
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
               WHERE t.typname = 'enum_estado_orden' AND e.enumlabel = 'pagado')
       AND NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
               WHERE t.typname = 'enum_estado_orden' AND e.enumlabel = 'orden_confirmada') THEN
        ALTER TYPE enum_estado_orden RENAME VALUE 'pagado' TO 'orden_confirmada';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
               WHERE t.typname = 'enum_estado_orden' AND e.enumlabel = 'enviado')
       AND NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
               WHERE t.typname = 'enum_estado_orden' AND e.enumlabel = 'despachado') THEN
        ALTER TYPE enum_estado_orden RENAME VALUE 'enviado' TO 'despachado';
    END IF;
END $$;

ALTER TYPE enum_estado_orden ADD VALUE IF NOT EXISTS 'revision_disponibilidad' AFTER 'orden_confirmada';
ALTER TYPE enum_estado_orden ADD VALUE IF NOT EXISTS 'preparada' AFTER 'en_preparacion';
ALTER TYPE enum_estado_orden ADD VALUE IF NOT EXISTS 'devuelto' AFTER 'cancelado';

-- ==============================================================================
-- 1. MÓDULO DE DESCUENTOS, ROLES Y PERMISOS
-- ==============================================================================

-- Tabla: descuento
CREATE TABLE IF NOT EXISTS descuento (
    id_descuento SERIAL PRIMARY KEY,
    tope NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    porcentaje_descuento NUMERIC(5, 2) NOT NULL,
    estado enum_estado_general NOT NULL DEFAULT 'activo',
    CONSTRAINT chk_descuento_tope CHECK (tope >= 0),
    CONSTRAINT chk_descuento_porcentaje CHECK (porcentaje_descuento >= 0 AND porcentaje_descuento <= 100)
);

COMMENT ON TABLE descuento IS 'Políticas y topes de descuento aplicables';
COMMENT ON COLUMN descuento.tope IS 'Monto tope máximo en valor monetario aplicable al descuento';
COMMENT ON COLUMN descuento.porcentaje_descuento IS 'Porcentaje de descuento (0 a 100)';
COMMENT ON COLUMN descuento.estado IS 'Estado de la regla de descuento (activo/inactivo)';

-- Tabla: sub_rol_empresa
CREATE TABLE IF NOT EXISTS sub_rol_empresa (
    id_sub_rol_empresa SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    id_descuento INT,
    estado enum_estado_general NOT NULL DEFAULT 'activo',
    CONSTRAINT fk_subrol_descuento FOREIGN KEY (id_descuento) 
        REFERENCES descuento (id_descuento) ON UPDATE CASCADE ON DELETE SET NULL
);

COMMENT ON TABLE sub_rol_empresa IS 'Sub-roles empresariales asociados a políticas de descuento';
COMMENT ON COLUMN sub_rol_empresa.id_descuento IS 'Referencia opcional a una política de descuento';

-- Tabla: rol
CREATE TABLE IF NOT EXISTS rol (
    id_rol SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    id_sub_rol_empresa INT,
    estado enum_estado_general NOT NULL DEFAULT 'activo',
    CONSTRAINT fk_rol_subrol FOREIGN KEY (id_sub_rol_empresa) 
        REFERENCES sub_rol_empresa (id_sub_rol_empresa) ON UPDATE CASCADE ON DELETE SET NULL
);

COMMENT ON TABLE rol IS 'Roles principales del sistema';
COMMENT ON COLUMN rol.id_sub_rol_empresa IS 'Referencia a sub-rol empresarial en caso de clientes corporativos';

-- Tabla: permisos
CREATE TABLE IF NOT EXISTS permisos (
    id_permiso SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    estado enum_estado_general NOT NULL DEFAULT 'activo'
);

COMMENT ON TABLE permisos IS 'Permisos y privilegios atómicos del sistema';

-- Tabla: asignacion_permiso
CREATE TABLE IF NOT EXISTS asignacion_permiso (
    id_asignacion_permiso SERIAL PRIMARY KEY,
    id_rol INT NOT NULL,
    id_permiso INT NOT NULL,
    CONSTRAINT fk_asig_permiso_rol FOREIGN KEY (id_rol) 
        REFERENCES rol (id_rol) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_asig_permiso_permiso FOREIGN KEY (id_permiso) 
        REFERENCES permisos (id_permiso) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT uq_rol_permiso UNIQUE (id_rol, id_permiso)
);

COMMENT ON TABLE asignacion_permiso IS 'Relación N:M que asigna permisos específicos a cada rol';

-- ==============================================================================
-- 2. MÓDULO DE USUARIOS Y CONTROL DE ACCESO
-- ==============================================================================

-- Tabla: usuario
CREATE TABLE IF NOT EXISTS usuario (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(20),
    correo VARCHAR(150) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    id_rol INT,
    estado enum_estado_usuario NOT NULL DEFAULT 'activo',
    tipo enum_tipo_usuario NOT NULL DEFAULT 'normal',
    CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol) 
        REFERENCES rol (id_rol) ON UPDATE CASCADE ON DELETE SET NULL
);

COMMENT ON TABLE usuario IS 'Entidad de usuarios registrados en el sistema';
COMMENT ON COLUMN usuario.contrasena IS 'Hash criptográfico seguro de la contraseña (BCrypt costo 12)';
COMMENT ON COLUMN usuario.id_rol IS 'Rol directo asignado al usuario';
COMMENT ON COLUMN usuario.tipo IS 'Clasificación de cuenta: normal (B2C) o empresa (B2B)';

-- Tabla: usuario_rol
CREATE TABLE IF NOT EXISTS usuario_rol (
    id_usuario_rol SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL UNIQUE,
    id_rol INT NOT NULL,
    CONSTRAINT fk_usr_rol_usuario FOREIGN KEY (id_usuario) 
        REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_usr_rol_rol FOREIGN KEY (id_rol) 
        REFERENCES rol (id_rol) ON UPDATE CASCADE ON DELETE CASCADE
);

COMMENT ON TABLE usuario_rol IS 'Asignación de roles a usuarios con restricción UNIQUE(id_usuario)';

-- Tabla: sesion
-- Sesiones activas de los usuarios (M20 - HU-SEG-02). Permite cerrar una sesión concreta,
-- invalidar todas las de un usuario y aplicar la caducidad por inactividad en servidor.
-- La clave es UUID y no SERIAL a propósito: el identificador viaja dentro del token y un
-- entero secuencial sería enumerable por un tercero.
CREATE TABLE IF NOT EXISTS sesion (
    id_sesion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario INT NOT NULL,
    tipo_sesion enum_tipo_sesion NOT NULL,
    fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_ultimo_acceso TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_expiracion TIMESTAMPTZ NOT NULL,
    estado enum_estado_sesion NOT NULL DEFAULT 'activa',
    motivo_cierre enum_motivo_cierre_sesion,
    CONSTRAINT fk_sesion_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE CASCADE
);

COMMENT ON TABLE sesion IS 'Sesiones de usuario con control de inactividad e invalidación (M20 HU-SEG-02)';
COMMENT ON COLUMN sesion.id_sesion IS 'UUID no enumerable; viaja como claim sid dentro del JWT';
COMMENT ON COLUMN sesion.fecha_ultimo_acceso IS 'Se renueva en cada operación del usuario (RF-SEG-02-03)';
COMMENT ON COLUMN sesion.fecha_expiracion IS 'Último acceso + ventana de inactividad del tipo de sesión (RF-SEG-02-02)';
COMMENT ON COLUMN sesion.motivo_cierre IS 'Causa del cierre; nulo mientras la sesión sigue activa';

-- ==============================================================================
-- 3. MÓDULO DE CATÁLOGO Y JERARQUÍA DE PRODUCTOS
-- ==============================================================================

-- Tabla: categoria
CREATE TABLE IF NOT EXISTS categoria (
    id_categoria SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    orden INT NOT NULL DEFAULT 0,
    estado enum_estado_general NOT NULL DEFAULT 'activo'
);

COMMENT ON TABLE categoria IS 'Nivel 1 de la jerarquía de catálogo: Categoría principal';
COMMENT ON COLUMN categoria.orden IS 'Orden de presentación en la navegación pública (HU-CAT-01, CA-CAT-01-04)';
COMMENT ON COLUMN categoria.estado IS 'Baja lógica: una categoría inactiva desactiva en cascada sus subcategorías (RF-CAT-01-04)';

-- Tabla: subcategorias
CREATE TABLE IF NOT EXISTS subcategorias (
    id_subcategoria SERIAL PRIMARY KEY,
    id_categoria INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    orden INT NOT NULL DEFAULT 0,
    estado enum_estado_general NOT NULL DEFAULT 'activo',
    CONSTRAINT fk_subcat_categoria FOREIGN KEY (id_categoria)
        REFERENCES categoria (id_categoria) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT uq_subcategoria_nombre_categoria UNIQUE (id_categoria, nombre)
);

COMMENT ON TABLE subcategorias IS 'Nivel 2 de la jerarquía de catálogo: Subcategorías';
COMMENT ON CONSTRAINT uq_subcategoria_nombre_categoria ON subcategorias IS 'Impide nombres duplicados bajo la misma categoría padre; permite el mismo nombre bajo padres distintos (RF-CAT-01-03, CA-CAT-01-03)';

-- Tabla: sub_subcategorias
CREATE TABLE IF NOT EXISTS sub_subcategorias (
    id_sub_subcategoria SERIAL PRIMARY KEY,
    id_subcategoria INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    CONSTRAINT fk_subsubcat_subcat FOREIGN KEY (id_subcategoria) 
        REFERENCES subcategorias (id_subcategoria) ON UPDATE CASCADE ON DELETE CASCADE
);

COMMENT ON TABLE sub_subcategorias IS 'Nivel 3 de la jerarquía de catálogo: Sub-subcategorías';

-- Tabla: marca
CREATE TABLE IF NOT EXISTS marca (
    id_marca SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    logotipo BYTEA NOT NULL,
    logotipo_mime_type VARCHAR(50) NOT NULL,
    estado enum_estado_general NOT NULL DEFAULT 'activo'
);

COMMENT ON TABLE marca IS 'Catálogo maestro de marcas (HU-CAT-04).';
COMMENT ON COLUMN marca.logotipo IS 'Bytes crudos del logotipo (RF-CAT-04-01). Máximo 5MB y formatos jpeg/png/webp validados en el servicio; el límite exacto del "Anexo B de la Tanda 2" (RF-CAT-04-02) está pendiente de confirmar por el equipo, hoy se usa 5MB como supuesto aprobado por el Product Owner.';
COMMENT ON COLUMN marca.logotipo_mime_type IS 'Tipo MIME del logotipo, para servirlo con el Content-Type correcto';

-- Tabla: linea
CREATE TABLE IF NOT EXISTS linea (
    id_linea SERIAL PRIMARY KEY,
    id_sub_subcategoria INT,
    id_marca INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    gama_comercial VARCHAR(100),
    estado enum_estado_general NOT NULL DEFAULT 'activo',
    CONSTRAINT fk_linea_subsubcat FOREIGN KEY (id_sub_subcategoria)
        REFERENCES sub_subcategorias (id_sub_subcategoria) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_linea_marca FOREIGN KEY (id_marca)
        REFERENCES marca (id_marca) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT uq_linea_nombre_marca UNIQUE (id_marca, nombre)
);

COMMENT ON TABLE linea IS 'Línea comercial de una marca (HU-CAT-11). `id_sub_subcategoria` es un remanente del árbol de categorías previo a esta HU: pendiente de retirar cuando HU-CAT-02 defina la relación real producto↔subcategoría.';
COMMENT ON COLUMN linea.id_marca IS 'Marca dueña de la línea (RF-CAT-11-01, RF-CAT-11-02)';
COMMENT ON COLUMN linea.gama_comercial IS 'Dato descriptivo opcional de la línea (RF-CAT-11-01)';
COMMENT ON CONSTRAINT uq_linea_nombre_marca ON linea IS 'Impide nombres de línea duplicados dentro de la misma marca; permite el mismo nombre entre marcas distintas (RF-CAT-11-02, CA-CAT-11-03)';

-- Tabla: base
CREATE TABLE IF NOT EXISTS base (
    id_base SERIAL PRIMARY KEY,
    id_marca INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    estado enum_estado_general NOT NULL DEFAULT 'activo',
    CONSTRAINT fk_base_marca FOREIGN KEY (id_marca)
        REFERENCES marca (id_marca) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT uq_base_nombre_marca UNIQUE (id_marca, nombre)
);

COMMENT ON TABLE base IS 'Base sobre la que se prepara cada color de un producto entonable (HU-CAT-12). El tipo de resina que pide RF-CAT-12-01 se excluyó a petición explícita del Product Owner. La asignación de bases a productos entonables (RF-CAT-12-02/03) y la asociación color↔base (RF-CAT-12-04) quedan pendientes: dependen de que existan producto (HU-CAT-02) y color (HU-CAT-05), y esta última regla además está marcada como no definida en la especificación (RF-CAT-12-12).';
COMMENT ON CONSTRAINT uq_base_nombre_marca ON base IS 'Impide nombres de base duplicados dentro de la misma marca (RF-CAT-12-01)';

-- Tabla: tipo_resina (catálogo administrable - RF-CAT-02-04)
CREATE TABLE IF NOT EXISTS tipo_resina (
    id_tipo_resina SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    estado enum_estado_general NOT NULL DEFAULT 'activo'
);

COMMENT ON TABLE tipo_resina IS 'Catálogo administrable de tipos de resina (RF-CAT-02-04). Reemplaza cualquier lista fija en el código.';

-- Tabla: producto
CREATE TABLE IF NOT EXISTS producto (
    id_producto SERIAL PRIMARY KEY,
    id_marca INT NOT NULL,
    id_linea INT,
    id_tipo_resina INT,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    clase_color enum_clase_color NOT NULL,
    estado enum_estado_general NOT NULL DEFAULT 'activo',
    publicado BOOLEAN NOT NULL DEFAULT false,
    rendimiento_min NUMERIC(8, 2),
    rendimiento_max NUMERIC(8, 2),
    id_categoria_complementaria INT,
    patrocinado BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT fk_producto_marca FOREIGN KEY (id_marca)
        REFERENCES marca (id_marca) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_producto_linea FOREIGN KEY (id_linea)
        REFERENCES linea (id_linea) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_producto_resina FOREIGN KEY (id_tipo_resina)
        REFERENCES tipo_resina (id_tipo_resina) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_producto_categoria_complementaria FOREIGN KEY (id_categoria_complementaria)
        REFERENCES categoria (id_categoria) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_producto_rendimiento CHECK (
        (rendimiento_min IS NULL AND rendimiento_max IS NULL)
        OR (rendimiento_min IS NOT NULL AND rendimiento_max IS NOT NULL
            AND rendimiento_min > 0 AND rendimiento_min <= rendimiento_max)
    )
);

COMMENT ON TABLE producto IS 'Producto del catálogo (HU-CAT-02). Información común independiente de sus variantes. Marca obligatoria; línea y tipo de resina obligatorios solo para pinturas (clase_color != sin_color); una brocha (sin_color) puede omitirlos (RF-CAT-02-02). La clase de color no puede cambiarse una vez el producto tiene variantes (RF-CAT-02-03).';
COMMENT ON COLUMN producto.clase_color IS 'Clase del producto: entonable | colores_fijos | sin_color (RF-CAT-02-03)';
COMMENT ON COLUMN producto.publicado IS 'Publicación en catálogo público (RF-CAT-02-05). Requiere >=1 variante activa y >=1 imagen; la exigencia de imagen queda pendiente de HU-CAT-07.';
COMMENT ON COLUMN producto.rendimiento_min IS 'Rendimiento mínimo en m² por galón (HU-CAT-10, RF-CAT-10-02). El rendimiento por presentación se deriva de este valor y del volumen (RF-CAT-10-03).';
COMMENT ON COLUMN producto.rendimiento_max IS 'Rendimiento máximo en m² por galón (HU-CAT-10, RF-CAT-10-02). Debe ser >= rendimiento_min (RF-CAT-10-05).';
COMMENT ON COLUMN producto.id_categoria_complementaria IS 'Categoría de la que se extraen los productos complementarios de este producto (HU-CAT-08, RF-CAT-08-01).';
COMMENT ON COLUMN producto.patrocinado IS 'Producto patrocinado: se prioriza como complementario (HU-CAT-08, RF-CAT-08-02).';

-- Tabla: producto_subcategoria (relación N:M - RF-CAT-02-02: al menos una subcategoría)
CREATE TABLE IF NOT EXISTS producto_subcategoria (
    id_producto INT NOT NULL,
    id_subcategoria INT NOT NULL,
    PRIMARY KEY (id_producto, id_subcategoria),
    CONSTRAINT fk_prodsubcat_producto FOREIGN KEY (id_producto)
        REFERENCES producto (id_producto) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_prodsubcat_subcat FOREIGN KEY (id_subcategoria)
        REFERENCES subcategorias (id_subcategoria) ON UPDATE CASCADE ON DELETE RESTRICT
);

COMMENT ON TABLE producto_subcategoria IS 'Relación N:M producto↔subcategoría (RF-CAT-02-02: un producto exige al menos una subcategoría). Es la relación real que reemplaza el remanente linea.id_sub_subcategoria del árbol previo.';

-- Tabla: producto_base (HU-CAT-12 flujo 2 - RF-CAT-12-02: bases que ofrece un producto entonable)
CREATE TABLE IF NOT EXISTS producto_base (
    id_producto INT NOT NULL,
    id_base INT NOT NULL,
    PRIMARY KEY (id_producto, id_base),
    CONSTRAINT fk_prodbase_producto FOREIGN KEY (id_producto)
        REFERENCES producto (id_producto) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_prodbase_base FOREIGN KEY (id_base)
        REFERENCES base (id_base) ON UPDATE CASCADE ON DELETE RESTRICT
);

COMMENT ON TABLE producto_base IS 'Bases que ofrece un producto entonable (HU-CAT-12 flujo 2, RF-CAT-12-02); no se fija en el código cuántas son. La base debe pertenecer a la marca del producto (RF-CAT-12-03). Una variante entonable solo puede usar una base aquí declarada.';

-- Tabla: color
CREATE TABLE IF NOT EXISTS color (
    id_color SERIAL PRIMARY KEY,
    id_marca INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(60),
    cie_l NUMERIC(6, 3) NOT NULL,
    cie_a NUMERIC(6, 3) NOT NULL,
    cie_b NUMERIC(6, 3) NOT NULL,
    estado enum_estado_general NOT NULL DEFAULT 'activo',
    CONSTRAINT fk_color_marca FOREIGN KEY (id_marca)
        REFERENCES marca (id_marca) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT uq_color_nombre_marca UNIQUE (id_marca, nombre),
    CONSTRAINT chk_color_cie_l CHECK (cie_l >= 0 AND cie_l <= 100),
    CONSTRAINT chk_color_cie_a CHECK (cie_a >= -128 AND cie_a <= 128),
    CONSTRAINT chk_color_cie_b CHECK (cie_b >= -128 AND cie_b <= 128)
);

COMMENT ON TABLE color IS 'Catálogo de colores de una marca (HU-CAT-05). Cada color pertenece a la marca que efectivamente lo ofrece (RF-CAT-05-01) y almacena su valor cromático CIELAB obligatorio (RF-CAT-05-02), del que se deriva su muestra visual sin requerir imagen. Diferidos (dependen de otras HU): familias cromáticas administrables (RF-CAT-05-03), uso del color en carta/variantes (RF-CAT-05-04/05/06 → HU-CAT-02/03) y asociación color↔base (RF-CAT-12-04 → CAT-12 flujo 3, además RF-CAT-12-12 sin definir).';
COMMENT ON COLUMN color.id_marca IS 'Marca dueña del color (RF-CAT-05-01, CA-CAT-05-01)';
COMMENT ON COLUMN color.codigo IS 'Código del color cuando exista; opcional (RF-CAT-05-01, CA-CAT-05-02)';
COMMENT ON COLUMN color.cie_l IS 'Componente L* (luminosidad, 0..100) del valor CIELAB (RF-CAT-05-02)';
COMMENT ON COLUMN color.cie_a IS 'Componente a* (verde↔rojo) del valor CIELAB (RF-CAT-05-02)';
COMMENT ON COLUMN color.cie_b IS 'Componente b* (azul↔amarillo) del valor CIELAB (RF-CAT-05-02)';
COMMENT ON CONSTRAINT uq_color_nombre_marca ON color IS 'Impide nombres de color duplicados dentro de la misma marca; admite el mismo nombre entre marcas distintas (RF-CAT-05-01, CA-CAT-05-01)';

-- Tabla: tonos
CREATE TABLE IF NOT EXISTS tonos (
    id_tono SERIAL PRIMARY KEY,
    id_color INT NOT NULL,
    nombre VARCHAR(100),
    hexagesimal VARCHAR(10),
    precio NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    CONSTRAINT fk_tonos_color FOREIGN KEY (id_color) 
        REFERENCES color (id_color) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_tonos_precio CHECK (precio >= 0)
);

COMMENT ON TABLE tonos IS 'Tonos y matices derivados de un color con nombre, código hexadecimal y ajuste de precio';

-- Tabla: presentacion (entidad propia - RF-CAT-03-05)
CREATE TABLE IF NOT EXISTS presentacion (
    id_presentacion SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    volumen NUMERIC(10, 3) NOT NULL,
    estado enum_estado_general NOT NULL DEFAULT 'activo',
    CONSTRAINT chk_presentacion_volumen CHECK (volumen > 0)
);

COMMENT ON TABLE presentacion IS 'Presentación comercial como entidad propia (RF-CAT-03-05): nombre y volumen numérico para permitir la comparación de precios entre productos. No se elimina físicamente si está referenciada por variantes; solo se desactiva (CA-CAT-03-10).';

-- Tabla: presentacion (entidad propia - RF-CAT-03-05)
CREATE TABLE IF NOT EXISTS presentacion (
    id_presentacion SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    volumen NUMERIC(10, 3) NOT NULL,
    estado enum_estado_general NOT NULL DEFAULT 'activo',
    CONSTRAINT chk_presentacion_volumen CHECK (volumen > 0)
);

COMMENT ON TABLE presentacion IS 'Presentación comercial como entidad propia (RF-CAT-03-05): nombre y volumen numérico para permitir la comparación de precios entre productos. No se elimina físicamente si está referenciada por variantes; solo se desactiva (CA-CAT-03-10).';

-- Tabla: variante
CREATE TABLE IF NOT EXISTS variante (
    id_variante SERIAL PRIMARY KEY,
    id_producto INT NOT NULL,
    id_presentacion INT NOT NULL,
    id_color INT,
    id_base INT,
    precio_vigente NUMERIC(12, 2) NOT NULL,
    existencia_referencial INT NOT NULL DEFAULT 0,
    codigo_proveedor VARCHAR(100),
    estado enum_estado_producto NOT NULL DEFAULT 'activo',
    CONSTRAINT fk_variante_producto FOREIGN KEY (id_producto)
        REFERENCES producto (id_producto) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_variante_presentacion FOREIGN KEY (id_presentacion)
        REFERENCES presentacion (id_presentacion) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_variante_color FOREIGN KEY (id_color)
        REFERENCES color (id_color) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_variante_base FOREIGN KEY (id_base)
        REFERENCES base (id_base) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_variante_precio CHECK (precio_vigente >= 0),
    CONSTRAINT chk_variante_existencia CHECK (existencia_referencial >= 0),
    CONSTRAINT uq_variante_codigo_proveedor UNIQUE (codigo_proveedor),
    CONSTRAINT uq_variante_forma UNIQUE NULLS NOT DISTINCT (id_producto, id_base, id_color, id_presentacion)
);

COMMENT ON TABLE variante IS 'SKU comercial vendible con precio y existencia sobre la variante física (RF-CAT-03-04). Su forma depende de la clase del producto (RF-CAT-03-02): entonable = producto+base+presentación; colores_fijos = producto+color+presentación; sin_color = producto+presentación.';
COMMENT ON COLUMN variante.precio_vigente IS 'Precio actual de venta en catálogo antes de congelarse en órdenes';
COMMENT ON COLUMN variante.existencia_referencial IS 'Existencia referencial (no negativa) sobre la variante física (RF-CAT-03-04, CA-CAT-03-11)';
COMMENT ON COLUMN variante.codigo_proveedor IS 'Código de proveedor (SAMIT); único cuando existe (RF-CAT-03-06, CA-CAT-03-08)';
COMMENT ON CONSTRAINT uq_variante_forma ON variante IS 'Impide dos variantes idénticas del mismo producto (RF-CAT-03-03, CA-CAT-03-02); NULLS NOT DISTINCT trata las combinaciones sin base/color como iguales.';

-- Tabla: caracteristica
CREATE TABLE IF NOT EXISTS caracteristica (
    id_caracteristica SERIAL PRIMARY KEY,
    id_variante INT NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    CONSTRAINT fk_caract_variante FOREIGN KEY (id_variante) 
        REFERENCES variante (id_variante) ON UPDATE CASCADE ON DELETE CASCADE
);

COMMENT ON TABLE caracteristica IS 'Características y propiedades técnicas de una variante';

-- Tabla: imagen (HU-CAT-07: imágenes del producto)
CREATE TABLE IF NOT EXISTS imagen (
    id_imagen SERIAL PRIMARY KEY,
    id_producto INT NOT NULL,
    id_variante INT,
    id_color INT,
    datos BYTEA NOT NULL,
    mime_type VARCHAR(50) NOT NULL,
    orden INT NOT NULL DEFAULT 0,
    es_principal BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT fk_imagen_producto FOREIGN KEY (id_producto)
        REFERENCES producto (id_producto) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_imagen_variante FOREIGN KEY (id_variante)
        REFERENCES variante (id_variante) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_imagen_color FOREIGN KEY (id_color)
        REFERENCES color (id_color) ON UPDATE CASCADE ON DELETE SET NULL
);

COMMENT ON TABLE imagen IS 'Imágenes de un producto (HU-CAT-07), almacenadas en la propia infraestructura como BYTEA (RF-CAT-07-03). Pueden asociarse a una variante o a un color (RF-CAT-07-02). La generación de miniaturas optimizadas (RNF-CAT-07-01) queda pendiente.';
COMMENT ON COLUMN imagen.es_principal IS 'Imagen principal del producto para listados (CA-CAT-07-02); a lo sumo una por producto.';

-- Una sola imagen principal por producto (CA-CAT-07-02)
CREATE UNIQUE INDEX IF NOT EXISTS uq_imagen_principal ON imagen (id_producto) WHERE es_principal;

-- Tabla: combo
CREATE TABLE IF NOT EXISTS combo (
    id_combo SERIAL PRIMARY KEY,
    id_producto INT NOT NULL,
    CONSTRAINT fk_combo_producto FOREIGN KEY (id_producto) 
        REFERENCES producto (id_producto) ON UPDATE CASCADE ON DELETE CASCADE
);

COMMENT ON TABLE combo IS 'Combos o paquetes comerciales vinculados a un producto';

-- Tabla: variante_combo
CREATE TABLE IF NOT EXISTS variante_combo (
    id_variante_combo SERIAL PRIMARY KEY,
    id_variante INT NOT NULL,
    id_combo INT NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    CONSTRAINT fk_varcombo_variante FOREIGN KEY (id_variante) 
        REFERENCES variante (id_variante) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_varcombo_combo FOREIGN KEY (id_combo) 
        REFERENCES combo (id_combo) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_varcombo_cantidad CHECK (cantidad > 0),
    CONSTRAINT uq_variante_combo UNIQUE (id_variante, id_combo)
);

COMMENT ON TABLE variante_combo IS 'Detalle de variantes y cantidades que integran cada combo';

-- ==============================================================================
-- 4. MÓDULO DE CARRITO DE COMPRAS (VIVO)
-- ==============================================================================

-- Tabla: carrito
-- Soporta usuarios registrados (id_usuario) y visitantes anónimos (token_visitante)
CREATE TABLE IF NOT EXISTS carrito (
    id_carrito SERIAL PRIMARY KEY,
    token_visitante VARCHAR(255),
    id_usuario INT,
    fecha_ultima_actividad TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_carrito_usuario FOREIGN KEY (id_usuario) 
        REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE CASCADE
);

COMMENT ON TABLE carrito IS 'Cabecera del carrito de compras vivo para usuarios y visitantes';
COMMENT ON COLUMN carrito.token_visitante IS 'Identificador para carritos anónimos antes del inicio de sesión';
COMMENT ON COLUMN carrito.id_usuario IS 'Cliente autenticado propietario del carrito (nullable)';

-- Tabla: linea_carrito
-- Detalle de ítems vivos en el carrito, apuntando directamente a la variante seleccionada
CREATE TABLE IF NOT EXISTS linea_carrito (
    id_linea_carrito SERIAL PRIMARY KEY,
    id_carrito INT NOT NULL,
    id_variante INT NOT NULL,
    ref_viva INT NOT NULL DEFAULT 1,
    cantidad INT NOT NULL DEFAULT 1,
    CONSTRAINT fk_lineacarrito_carrito FOREIGN KEY (id_carrito) 
        REFERENCES carrito (id_carrito) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_lineacarrito_variante FOREIGN KEY (id_variante) 
        REFERENCES variante (id_variante) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_lineacarrito_cantidad CHECK (cantidad > 0),
    CONSTRAINT uq_carrito_variante UNIQUE (id_carrito, id_variante)
);

COMMENT ON TABLE linea_carrito IS 'Líneas vivas de ítems en carrito vinculadas a la variante de producto y referencia viva';
COMMENT ON COLUMN linea_carrito.ref_viva IS 'Identificador de referencia viva del carrito (M21)';

-- ==============================================================================
-- 5. MÓDULO DE COTIZACIONES Y ÓRDENES (HISTÓRICO INMUTABLE)
-- ==============================================================================

-- Tabla: cotizacion
CREATE TABLE IF NOT EXISTS cotizacion (
    id_cotizacion SERIAL PRIMARY KEY,
    id_usuario INT,
    id_rol INT,
    estado enum_estado_cotizacion NOT NULL DEFAULT 'borrador',
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cotizacion_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_cotizacion_rol FOREIGN KEY (id_rol)
        REFERENCES rol (id_rol) ON UPDATE CASCADE ON DELETE SET NULL
);

COMMENT ON TABLE cotizacion IS 'Cotizaciones comerciales B2B / B2C vinculadas a usuario y rol que pueden originar órdenes';

-- Tabla: orden
-- Reemplazo inmutable de pedido. Posee código visible, origen y trazabilidad legal.
CREATE TABLE IF NOT EXISTS orden (
    id_orden SERIAL PRIMARY KEY,
    codigo_visible VARCHAR(50) NOT NULL UNIQUE,
    id_usuario INT NOT NULL,
    origen enum_origen_orden NOT NULL DEFAULT 'carrito',
    id_cotizacion INT,
    carrito_o_cotizacion VARCHAR(50),
    estado enum_estado_orden NOT NULL DEFAULT 'orden_confirmada',
    transaccion_pago_id VARCHAR(100) UNIQUE,
    codigo_solicitud VARCHAR(20),
    modo_entrega enum_modo_entrega,
    costo_entrega NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    direccion TEXT,
    sub_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    descuento NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    base_sin_impuesto NUMERIC(12, 2),
    importe_iva NUMERIC(12, 2),
    tasa_iva NUMERIC(5, 2),
    observaciones TEXT,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT fk_orden_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_orden_cotizacion FOREIGN KEY (id_cotizacion)
        REFERENCES cotizacion (id_cotizacion) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT uq_orden_codigo_solicitud UNIQUE (codigo_solicitud),
    CONSTRAINT chk_orden_subtotal CHECK (sub_total >= 0),
    CONSTRAINT chk_orden_descuento CHECK (descuento >= 0),
    CONSTRAINT chk_orden_total CHECK (total >= 0),
    CONSTRAINT chk_orden_costo_entrega CHECK (costo_entrega >= 0),
    CONSTRAINT chk_orden_iva CHECK (
        (base_sin_impuesto IS NULL OR base_sin_impuesto >= 0)
        AND (importe_iva IS NULL OR importe_iva >= 0)
        AND (tasa_iva IS NULL OR (tasa_iva >= 0 AND tasa_iva <= 100))
    ),
    CONSTRAINT chk_orden_direccion_domicilio CHECK (modo_entrega IS DISTINCT FROM 'domicilio' OR direccion IS NOT NULL)
);

COMMENT ON TABLE orden IS 'Cabecera de órdenes de compra inmutables';
COMMENT ON COLUMN orden.codigo_visible IS 'Código amigable alfanumérico para el cliente (ej. ORD-2026-0001)';
COMMENT ON COLUMN orden.origen IS 'Flujo de procedencia: carrito de compras o cotización aprobada';
COMMENT ON COLUMN orden.carrito_o_cotizacion IS 'Identificador descriptivo del origen de la compra';
COMMENT ON COLUMN orden.transaccion_pago_id IS 'Identificador único de la pasarela de pago vinculada';
COMMENT ON COLUMN orden.estado IS 'Estado del ciclo de vida (M08 - HU-ORD-03). Nace en orden_confirmada: no existe orden sin pago (RF-ORD-01-01)';

-- Migración (bases anteriores a v3.8): el valor por defecto 'pendiente' contradecía RF-ORD-01-01.
ALTER TABLE orden ALTER COLUMN estado SET DEFAULT 'orden_confirmada';

-- Migración (bases anteriores a v3.9): copia histórica de la orden (M08 - HU-ORD-02, RF-ORD-05-05).
-- Las órdenes ya existentes quedan con los campos nuevos en NULL (o costo 0): no se inventan datos pasados.
ALTER TABLE orden ADD COLUMN IF NOT EXISTS codigo_solicitud VARCHAR(20);
ALTER TABLE orden ADD COLUMN IF NOT EXISTS modo_entrega enum_modo_entrega;
ALTER TABLE orden ADD COLUMN IF NOT EXISTS costo_entrega NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE orden ADD COLUMN IF NOT EXISTS base_sin_impuesto NUMERIC(12, 2);
ALTER TABLE orden ADD COLUMN IF NOT EXISTS importe_iva NUMERIC(12, 2);
ALTER TABLE orden ADD COLUMN IF NOT EXISTS tasa_iva NUMERIC(5, 2);
ALTER TABLE orden ALTER COLUMN direccion DROP NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_orden_codigo_solicitud') THEN
        ALTER TABLE orden ADD CONSTRAINT uq_orden_codigo_solicitud UNIQUE (codigo_solicitud);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_orden_costo_entrega') THEN
        ALTER TABLE orden ADD CONSTRAINT chk_orden_costo_entrega CHECK (costo_entrega >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_orden_iva') THEN
        ALTER TABLE orden ADD CONSTRAINT chk_orden_iva CHECK (
            (base_sin_impuesto IS NULL OR base_sin_impuesto >= 0)
            AND (importe_iva IS NULL OR importe_iva >= 0)
            AND (tasa_iva IS NULL OR (tasa_iva >= 0 AND tasa_iva <= 100))
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_orden_direccion_domicilio') THEN
        ALTER TABLE orden ADD CONSTRAINT chk_orden_direccion_domicilio
            CHECK (modo_entrega IS DISTINCT FROM 'domicilio' OR direccion IS NOT NULL);
    END IF;
END $$;

-- Comentarios de las columnas de v3.9 (después de la migración, para que existan también en bases antiguas).
COMMENT ON COLUMN orden.codigo_solicitud IS 'Código SOL-AAAA-NNNNN de la solicitud de compra de M07 que originó la orden (D04, RF-CHK-04-13). Sin FK hasta que exista la tabla de M07; UNIQUE: una solicitud genera una sola orden';
COMMENT ON COLUMN orden.modo_entrega IS 'Envío a domicilio o recogida en almacén (RF-ORD-03-06). NULL solo en órdenes anteriores a v3.9';
COMMENT ON COLUMN orden.costo_entrega IS 'Costo de envío congelado; 0 mientras el negocio no fije tarifa (Tanda 12)';
COMMENT ON COLUMN orden.direccion IS 'Dirección de entrega; obligatoria cuando el modo es domicilio (RF-ORD-09-01)';
COMMENT ON COLUMN orden.sub_total IS 'Suma de los precios iniciales de las líneas antes de descuentos';
COMMENT ON COLUMN orden.descuento IS 'Suma de los descuentos aplicados; el desglose está en linea_orden_descuento (RF-ORD-02-02)';
COMMENT ON COLUMN orden.total IS 'Importe cobrado, congelado desde la solicitud sin recalcular (D07)';
COMMENT ON COLUMN orden.base_sin_impuesto IS 'Base gravable congelada de la solicitud (D07)';
COMMENT ON COLUMN orden.importe_iva IS 'IVA cobrado, congelado de la solicitud (D07)';
COMMENT ON COLUMN orden.tasa_iva IS 'Porcentaje de IVA vigente al comprar; no cambia si el administrador lo modifica después (CA-ORD-02-05)';

-- Tabla: linea_orden
-- Snapshot inmutable de cada producto y precio en el instante exacto de compra
CREATE TABLE IF NOT EXISTS linea_orden (
    id_linea_orden SERIAL PRIMARY KEY,
    id_orden INT NOT NULL,
    nombre_producto VARCHAR(150) NOT NULL,
    variante_copia VARCHAR(150) NOT NULL,
    precio_aplicado NUMERIC(12, 2) NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    color_solicitado VARCHAR(150),
    precio_inicial NUMERIC(12, 2),
    id_variante_ref INT,
    es_entonado BOOLEAN NOT NULL DEFAULT false,
    base_consumida VARCHAR(150),
    CONSTRAINT fk_lineaorden_orden FOREIGN KEY (id_orden)
        REFERENCES orden (id_orden) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_lineaorden_precio CHECK (precio_aplicado >= 0),
    CONSTRAINT chk_lineaorden_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_lineaorden_precio_inicial CHECK (precio_inicial IS NULL OR precio_inicial >= 0)
);

COMMENT ON TABLE linea_orden IS 'Snapshot congelado inmutable de productos comprados en una orden';
COMMENT ON COLUMN linea_orden.nombre_producto IS 'Copia inmutable del nombre del producto al momento de comprar';
COMMENT ON COLUMN linea_orden.variante_copia IS 'Copia inmutable de la variante/color adquirida';
COMMENT ON COLUMN linea_orden.precio_aplicado IS 'Precio final unitario cobrado al momento de generar la orden';
-- Migración (bases anteriores a v3.9): copia histórica de las líneas (M08 - HU-ORD-02).
ALTER TABLE linea_orden ADD COLUMN IF NOT EXISTS color_solicitado VARCHAR(150);
ALTER TABLE linea_orden ADD COLUMN IF NOT EXISTS precio_inicial NUMERIC(12, 2);
ALTER TABLE linea_orden ADD COLUMN IF NOT EXISTS id_variante_ref INT;
ALTER TABLE linea_orden ADD COLUMN IF NOT EXISTS es_entonado BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE linea_orden ADD COLUMN IF NOT EXISTS base_consumida VARCHAR(150);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_lineaorden_precio_inicial') THEN
        ALTER TABLE linea_orden ADD CONSTRAINT chk_lineaorden_precio_inicial
            CHECK (precio_inicial IS NULL OR precio_inicial >= 0);
    END IF;
    -- RF-ORD-02-04: los datos de una orden no se eliminan físicamente. Antes v3.9 las líneas se
    -- borraban en cascada con la orden; ahora el borrado de la orden queda bloqueado.
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lineaorden_orden' AND confdeltype = 'c') THEN
        ALTER TABLE linea_orden DROP CONSTRAINT fk_lineaorden_orden;
        ALTER TABLE linea_orden ADD CONSTRAINT fk_lineaorden_orden FOREIGN KEY (id_orden)
            REFERENCES orden (id_orden) ON UPDATE CASCADE ON DELETE RESTRICT;
    END IF;
END $$;

-- Comentarios de las columnas de v3.9 (después de la migración, para que existan también en bases antiguas).
COMMENT ON COLUMN linea_orden.color_solicitado IS 'Copia del color pedido cuando lo hay (RF-ORD-02-01, CA-ORD-04-02)';
COMMENT ON COLUMN linea_orden.precio_inicial IS 'Precio unitario de partida antes de descuentos; con linea_orden_descuento reconstruye el cobro (RF-ORD-02-02)';
COMMENT ON COLUMN linea_orden.id_variante_ref IS 'Referencia informativa a la variante, sin FK a propósito (ADR-05): solo sirve para saber si el producto sigue en el catálogo (RF-ORD-04-03)';
COMMENT ON COLUMN linea_orden.es_entonado IS 'Color de carta entonado a medida: no admite devolución (RF-POS-04-04, CA-ORD-03-10)';
COMMENT ON COLUMN linea_orden.base_consumida IS 'Copia de la variante de base que consume la línea entonada (RF-CUM-01-09, RF-ORD-09-01)';

-- Tabla: linea_orden_descuento (M08 - HU-ORD-02, RF-ORD-02-02 / CA-ORD-02-02)
-- Desglose de cada descuento aplicado a una línea, en el orden en que se aplicó.
CREATE TABLE IF NOT EXISTS linea_orden_descuento (
    id_linea_orden_descuento SERIAL PRIMARY KEY,
    id_linea_orden INT NOT NULL,
    orden_aplicacion SMALLINT NOT NULL,
    origen VARCHAR(150) NOT NULL,
    porcentaje NUMERIC(5, 2),
    importe NUMERIC(12, 2) NOT NULL,
    CONSTRAINT fk_lod_linea_orden FOREIGN KEY (id_linea_orden)
        REFERENCES linea_orden (id_linea_orden) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT uq_lod_orden_aplicacion UNIQUE (id_linea_orden, orden_aplicacion),
    CONSTRAINT chk_lod_orden_aplicacion CHECK (orden_aplicacion > 0),
    CONSTRAINT chk_lod_origen CHECK (length(trim(origen)) > 0),
    CONSTRAINT chk_lod_importe CHECK (importe >= 0),
    CONSTRAINT chk_lod_porcentaje CHECK (porcentaje IS NULL OR (porcentaje >= 0 AND porcentaje <= 100))
);

COMMENT ON TABLE linea_orden_descuento IS 'Descuentos aplicados a cada línea con su origen, porcentaje, importe y orden (M08 - RF-ORD-02-02). Copia congelada; solo inserción';
COMMENT ON COLUMN linea_orden_descuento.porcentaje IS 'NULL cuando el descuento es un importe fijo';

-- Tabla: consecutivo (M08 - HU-ORD-06, RF-ORD-06-04; reutilizable por M07 para SOL-AAAA-NNNNN)
-- Numeración corrida sin huecos: se incrementa dentro de la misma transacción que crea el documento,
-- de modo que si la creación falla el número no se consume. Un salto solo puede ser una orden cancelada.
CREATE TABLE IF NOT EXISTS consecutivo (
    id_consecutivo SERIAL PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE,
    ultimo_valor BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_consecutivo_valor CHECK (ultimo_valor >= 0),
    CONSTRAINT chk_consecutivo_nombre CHECK (length(trim(nombre)) > 0)
);

COMMENT ON TABLE consecutivo IS 'Consecutivos corridos sin huecos por tipo de documento (orden = PC-AAAA-NNNNN, anexo B de la Tanda 2). Nunca se reinicia con el año';

-- Tabla: historial_estado_orden (M08 - HU-ORD-03, CA-ORD-03-03 / CA-ORD-03-04)
-- Historia de las transiciones de una orden: estado alcanzado, autor y momento.
-- Solo inserción: ningún repositorio la actualiza ni la borra.
CREATE TABLE IF NOT EXISTS historial_estado_orden (
    id_historial_estado_orden SERIAL PRIMARY KEY,
    id_orden INT NOT NULL,
    estado_anterior enum_estado_orden,
    estado_nuevo enum_estado_orden NOT NULL,
    id_usuario_autor INT,
    motivo TEXT,
    referencia_externa VARCHAR(150),
    fecha TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_historial_estado_orden FOREIGN KEY (id_orden)
        REFERENCES orden (id_orden) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_historial_estado_autor FOREIGN KEY (id_usuario_autor)
        REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_historial_estado_cambio CHECK (estado_anterior IS DISTINCT FROM estado_nuevo)
);

COMMENT ON TABLE historial_estado_orden IS 'Historia inmutable de transiciones de la orden (M08 - HU-ORD-03). Solo inserción';
COMMENT ON COLUMN historial_estado_orden.estado_anterior IS 'NULL cuando la orden nace';
COMMENT ON COLUMN historial_estado_orden.id_usuario_autor IS 'Quién hizo el cambio; NULL = transición automática del sistema (D01)';
COMMENT ON COLUMN historial_estado_orden.motivo IS 'Obligatorio al volver de preparada a en_preparacion (D01) y al cancelar; lo exige el servicio de M08';
COMMENT ON COLUMN historial_estado_orden.referencia_externa IS 'Rastro de una resolución económica hecha fuera de la plataforma (D03)';

-- Tabla: nota_orden (M08 - HU-ORD-10)
-- Notas internas del personal sobre una orden: nunca visibles al cliente y sin borrado.
CREATE TABLE IF NOT EXISTS nota_orden (
    id_nota_orden SERIAL PRIMARY KEY,
    id_orden INT NOT NULL,
    id_usuario_autor INT NOT NULL,
    texto TEXT NOT NULL,
    fecha TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_nota_orden_orden FOREIGN KEY (id_orden)
        REFERENCES orden (id_orden) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_nota_orden_autor FOREIGN KEY (id_usuario_autor)
        REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_nota_orden_texto CHECK (length(trim(texto)) > 0)
);

COMMENT ON TABLE nota_orden IS 'Notas internas del personal sobre una orden (M08 - HU-ORD-10). Solo inserción; nunca visibles al cliente';

-- Tabla: contacto_orden (M08 - HU-ORD-09, CA-ORD-09-03)
-- Constancia de cada contacto con el cliente iniciado desde la orden: quién, cuándo y por qué medio.
CREATE TABLE IF NOT EXISTS contacto_orden (
    id_contacto_orden SERIAL PRIMARY KEY,
    id_orden INT NOT NULL,
    id_usuario_autor INT NOT NULL,
    medio VARCHAR(30) NOT NULL,
    detalle TEXT,
    fecha TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_contacto_orden_orden FOREIGN KEY (id_orden)
        REFERENCES orden (id_orden) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_contacto_orden_autor FOREIGN KEY (id_usuario_autor)
        REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_contacto_orden_medio CHECK (length(trim(medio)) > 0)
);

COMMENT ON TABLE contacto_orden IS 'Registro de contactos con el cliente iniciados desde una orden (M08 - HU-ORD-09). Solo inserción';
COMMENT ON COLUMN contacto_orden.medio IS 'Medio usado (p. ej. telefono, correo, whatsapp); la lista cerrada está pendiente del análisis';

-- ==============================================================================
-- 6. MÓDULO DE PAGOS Y FACTURACIÓN
-- ==============================================================================

-- Tabla: metodo_pago
CREATE TABLE IF NOT EXISTS metodo_pago (
    id_metodo_pago SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    estado enum_estado_general NOT NULL DEFAULT 'activo'
);

COMMENT ON TABLE metodo_pago IS 'Métodos de pago habilitados en la plataforma';

-- Tabla: pagos
CREATE TABLE IF NOT EXISTS pagos (
    id_pago SERIAL PRIMARY KEY,
    id_orden INT NOT NULL,
    id_metodo_pago INT NOT NULL,
    estado enum_estado_pago NOT NULL DEFAULT 'pendiente',
    monto NUMERIC(12, 2) NOT NULL,
    CONSTRAINT fk_pagos_orden FOREIGN KEY (id_orden) 
        REFERENCES orden (id_orden) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_pagos_metodo FOREIGN KEY (id_metodo_pago) 
        REFERENCES metodo_pago (id_metodo_pago) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_pagos_monto CHECK (monto > 0)
);

COMMENT ON TABLE pagos IS 'Transacciones y pagos registrados para una orden';

-- Tabla: factura
CREATE TABLE IF NOT EXISTS factura (
    id_factura SERIAL PRIMARY KEY,
    id_orden INT NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    estado enum_estado_factura NOT NULL DEFAULT 'emitida',
    CONSTRAINT fk_factura_orden FOREIGN KEY (id_orden) 
        REFERENCES orden (id_orden) ON UPDATE CASCADE ON DELETE RESTRICT
);

COMMENT ON TABLE factura IS 'Factura electrónica o física vinculada a una orden';

-- ==============================================================================
-- 7. MÓDULO DE SERVICIOS Y RESERVACIONES
-- ==============================================================================

-- Tabla: reservaciones
CREATE TABLE IF NOT EXISTS reservaciones (
    id_reservacion SERIAL PRIMARY KEY,
    id_producto INT NOT NULL,
    id_usuario INT NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora TIME NOT NULL,
    estado enum_estado_reservacion NOT NULL DEFAULT 'pendiente',
    CONSTRAINT fk_reservacion_producto FOREIGN KEY (id_producto) 
        REFERENCES producto (id_producto) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_reservacion_usuario FOREIGN KEY (id_usuario) 
        REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE CASCADE
);

COMMENT ON TABLE reservaciones IS 'Agendamiento de citas y reservaciones de servicios';

-- ==============================================================================
-- 8. MÓDULO DE PRIVACIDAD, CONSENTIMIENTO Y HABEAS DATA (M20 - HU-SEG-05)
-- ==============================================================================

-- Tabla: aviso_privacidad
-- Almacena las versiones legales de la política de tratamiento de datos y términos
CREATE TABLE IF NOT EXISTS aviso_privacidad (
    id_aviso_privacidad SERIAL PRIMARY KEY,
    version VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT NOT NULL,
    es_vigente BOOLEAN NOT NULL DEFAULT true
);

COMMENT ON TABLE aviso_privacidad IS 'Versiones de las políticas de privacidad y términos de tratamiento de datos personales (M20 HU-SEG-05)';
COMMENT ON COLUMN aviso_privacidad.version IS 'Identificador semántico o código de la versión del aviso (ej: v1.0, 2026-A)';
COMMENT ON COLUMN aviso_privacidad.descripcion IS 'Texto completo o enlace al documento legal vinculante';
COMMENT ON COLUMN aviso_privacidad.es_vigente IS 'Indica si es la versión activa que los usuarios deben consentir';

-- Tabla: consentimiento_usuario
-- Registro auditable e inmutable de aceptación de políticas por parte de cada usuario
CREATE TABLE IF NOT EXISTS consentimiento_usuario (
    id_consentimiento SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_aviso_privacidad INT NOT NULL,
    fecha TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_consentimiento_usuario FOREIGN KEY (id_usuario) 
        REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_consentimiento_aviso FOREIGN KEY (id_aviso_privacidad) 
        REFERENCES aviso_privacidad (id_aviso_privacidad) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT uq_usuario_aviso UNIQUE (id_usuario, id_aviso_privacidad)
);

COMMENT ON TABLE consentimiento_usuario IS 'Registro histórico auditable del consentimiento de tratamiento de datos otorgado por los usuarios';
COMMENT ON COLUMN consentimiento_usuario.fecha IS 'Marca temporal exacta en la que el titular aceptó la versión del aviso';

-- Tabla: solicitud_supresion
-- Registro y gestión de peticiones de supresión de datos personales / derecho al olvido (Habeas Data)
CREATE TABLE IF NOT EXISTS solicitud_supresion (
    id_solicitud_supresion SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion TIMESTAMPTZ,
    estado enum_estado_solicitud_supresion NOT NULL DEFAULT 'pendiente',
    CONSTRAINT fk_supresion_usuario FOREIGN KEY (id_usuario) 
        REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE CASCADE
);

COMMENT ON TABLE solicitud_supresion IS 'Solicitudes de ejercicio de derechos ARCO / supresión de datos personales (Habeas Data)';
COMMENT ON COLUMN solicitud_supresion.fecha_resolucion IS 'Fecha y hora en que la administración resuelve o dictamina la petición (nullable mientras esté en trámite)';
COMMENT ON COLUMN solicitud_supresion.estado IS 'Ciclo de vida de la solicitud (pendiente, en_proceso, aprobada, rechazada)';

-- ==============================================================================
-- 9. MÓDULO DE CUENTAS, DIRECCIONES Y SOLICITUDES EMPRESA (M04)
-- ==============================================================================

-- Tabla: direccion_cliente
-- Libreta de direcciones de entrega de los clientes con designación de predeterminada y geolocalización (HU-CUE-07)
CREATE TABLE IF NOT EXISTS direccion_cliente (
    id_direccion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario INT NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    barrio VARCHAR(100) NOT NULL,
    apartamento_casa VARCHAR(100),
    nombre_apellido VARCHAR(150) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    es_predeterminada BOOLEAN NOT NULL DEFAULT false,
    latitud NUMERIC(10, 7),
    longitud NUMERIC(10, 7),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_direccion_usuario FOREIGN KEY (id_usuario) 
        REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE CASCADE
);

COMMENT ON TABLE direccion_cliente IS 'Libreta de direcciones de entrega guardadas por cada cliente (HU-CUE-07)';
COMMENT ON COLUMN direccion_cliente.id_direccion IS 'UUID único de la dirección; referenciado en órdenes de despacho';
COMMENT ON COLUMN direccion_cliente.es_predeterminada IS 'Bandera de dirección principal seleccionada para compras rápidas';
COMMENT ON COLUMN direccion_cliente.latitud IS 'Coordenada geográfica de latitud para geolocalización precisa';
COMMENT ON COLUMN direccion_cliente.longitud IS 'Coordenada geográfica de longitud para geolocalización precisa';

-- Tabla: solicitud_empresa
-- Solicitudes de registro de cuenta empresarial B2B y solicitudes de ascenso (HU-CUE-03 / HU-CUE-09)
CREATE TABLE IF NOT EXISTS solicitud_empresa (
    id_solicitud UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario INT NOT NULL,
    nombre_empresa VARCHAR(150) NOT NULL,
    nombre_representante VARCHAR(150) NOT NULL,
    correo_empresarial VARCHAR(150) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    nit VARCHAR(30) NOT NULL,
    tipo_solicitud enum_tipo_solicitud_empresa NOT NULL DEFAULT 'registro',
    estado enum_estado_solicitud_empresa NOT NULL DEFAULT 'pendiente',
    motivo_rechazo TEXT,
    id_admin_revisor INT,
    fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_revision TIMESTAMPTZ,
    CONSTRAINT fk_solicitud_empresa_usuario FOREIGN KEY (id_usuario) 
        REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_solicitud_empresa_admin FOREIGN KEY (id_admin_revisor) 
        REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL
);

COMMENT ON TABLE solicitud_empresa IS 'Trazabilidad y dictamen administrativo de cuentas corporativas B2B (HU-CUE-03, HU-CUE-09)';
COMMENT ON COLUMN solicitud_empresa.nit IS 'Número de Identificación Tributaria o RUT de la empresa solicitante';
COMMENT ON COLUMN solicitud_empresa.motivo_rechazo IS 'Justificación obligatoria registrada por el administrador en caso de rechazo';
COMMENT ON COLUMN solicitud_empresa.id_admin_revisor IS 'Administrador que dictaminó la solicitud (RF-CUE-09-03)';

-- Tabla: solicitud_actualizacion_nit
-- Solicitudes formales de cambio o corrección de NIT con soporte documental adjunto (RF-CUE-09-07)
CREATE TABLE IF NOT EXISTS solicitud_actualizacion_nit (
    id_solicitud UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario INT NOT NULL,
    nit_anterior VARCHAR(30) NOT NULL,
    nit_nuevo VARCHAR(30) NOT NULL,
    documento_adjunto_url TEXT NOT NULL,
    estado enum_estado_solicitud_empresa NOT NULL DEFAULT 'pendiente',
    motivo_rechazo TEXT,
    id_admin_revisor INT,
    fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_revision TIMESTAMPTZ,
    CONSTRAINT fk_solicitud_nit_usuario FOREIGN KEY (id_usuario) 
        REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_solicitud_nit_admin FOREIGN KEY (id_admin_revisor) 
        REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL
);

COMMENT ON TABLE solicitud_actualizacion_nit IS 'Solicitudes de actualización de NIT empresarial con soporte RUT adjunto (RF-CUE-09-07)';
COMMENT ON COLUMN solicitud_actualizacion_nit.documento_adjunto_url IS 'Enlace o ruta del documento soporte (RUT/Cámara de Comercio) adjunto';

-- Tabla: usuario_identidad_externa
-- Cuentas federadas y vinculaciones OAuth (Google Identity, etc.) (HU-CUE-02)
CREATE TABLE IF NOT EXISTS usuario_identidad_externa (
    id_identidad SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    proveedor VARCHAR(50) NOT NULL,
    id_proveedor VARCHAR(255) NOT NULL,
    correo_proveedor VARCHAR(150),
    fecha_vinculacion TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_identidad_usuario FOREIGN KEY (id_usuario) 
        REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT uq_identidad_proveedor UNIQUE (proveedor, id_proveedor),
    CONSTRAINT uq_usuario_proveedor UNIQUE (id_usuario, proveedor)
);

COMMENT ON TABLE usuario_identidad_externa IS 'Identidades federadas OAuth vinculadas a la cuenta de usuario (HU-CUE-02)';
COMMENT ON COLUMN usuario_identidad_externa.proveedor IS 'Proveedor de identidad (ej. google)';
COMMENT ON COLUMN usuario_identidad_externa.id_proveedor IS 'Identificador federado único del usuario en el proveedor (sub)';

-- Tabla: codigo_verificacion
-- Códigos OTP efímeros con control de intentos y expiración para activación, reseteo y cambio de correo (M04)
CREATE TABLE IF NOT EXISTS codigo_verificacion (
    id_codigo UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correo VARCHAR(150) NOT NULL,
    codigo VARCHAR(10) NOT NULL,
    tipo enum_tipo_codigo_otp NOT NULL,
    expiracion TIMESTAMPTZ NOT NULL,
    intentos INT NOT NULL DEFAULT 0,
    max_intentos INT NOT NULL DEFAULT 3,
    datos_temporales JSONB,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE codigo_verificacion IS 'Almacén de códigos OTP transaccionales efímeros (HU-CUE-01, HU-CUE-05, HU-CUE-06)';
COMMENT ON COLUMN codigo_verificacion.intentos IS 'Contador de intentos fallidos antes de invalidar el código';
COMMENT ON COLUMN codigo_verificacion.datos_temporales IS 'Metadatos adicionales asociados al trámite (ej. nuevo_correo, id_usuario)';

-- ==============================================================================
-- 9B. MÓDULO DE BÚSQUEDA — ANALÍTICA (M02 - HU-BUS-06)
-- ==============================================================================

-- Registro de términos de búsqueda que no produjeron resultados (RF-BUS-06-01).
-- Modelo por evento: una fila por búsqueda fallida, para poder acotar por periodo
-- (RF-BUS-06-02) y agregar repeticiones (CA-BUS-06-01) con GROUP BY termino.
-- M20: NO se almacena identidad del usuario (CA-BUS-06-02).
CREATE TABLE IF NOT EXISTS busqueda_sin_resultado (
    id_busqueda BIGSERIAL PRIMARY KEY,
    termino     TEXT NOT NULL,
    fecha       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE busqueda_sin_resultado IS 'Analítica de búsquedas sin resultado, sin identidad de usuario (M02 HU-BUS-06 / M20 HU-SEG-06)';
COMMENT ON COLUMN busqueda_sin_resultado.termino IS 'Término normalizado (minúsculas, sin espacios extremos) que no arrojó resultados';

-- ==============================================================================
-- 10. ÍNDICES DE RENDIMIENTO (OPTIMIZACIÓN DE BÚSQUEDAS Y JOINS)
-- ==============================================================================

-- Índices en Roles, Permisos y Usuarios
CREATE INDEX IF NOT EXISTS idx_subrol_descuento ON sub_rol_empresa(id_descuento);
CREATE INDEX IF NOT EXISTS idx_rol_subrol ON rol(id_sub_rol_empresa);
CREATE INDEX IF NOT EXISTS idx_asig_permiso_rol ON asignacion_permiso(id_rol);
CREATE INDEX IF NOT EXISTS idx_asig_permiso_permiso ON asignacion_permiso(id_permiso);
CREATE INDEX IF NOT EXISTS idx_usuario_correo ON usuario(correo);
CREATE INDEX IF NOT EXISTS idx_usuario_rol ON usuario(id_rol);
CREATE INDEX IF NOT EXISTS idx_usuario_tipo ON usuario(tipo);
CREATE INDEX IF NOT EXISTS idx_usr_rol_usuario ON usuario_rol(id_usuario);
CREATE INDEX IF NOT EXISTS idx_usr_rol_rol ON usuario_rol(id_rol);

-- Índices en Jerarquía de Catálogo
CREATE INDEX IF NOT EXISTS idx_subcat_categoria ON subcategorias(id_categoria);
CREATE INDEX IF NOT EXISTS idx_subsubcat_subcat ON sub_subcategorias(id_subcategoria);
CREATE INDEX IF NOT EXISTS idx_linea_subsubcat ON linea(id_sub_subcategoria);
CREATE INDEX IF NOT EXISTS idx_producto_linea ON producto(id_linea);
CREATE INDEX IF NOT EXISTS idx_producto_marca ON producto(id_marca);
CREATE INDEX IF NOT EXISTS idx_producto_resina ON producto(id_tipo_resina);
CREATE INDEX IF NOT EXISTS idx_producto_cat_complementaria ON producto(id_categoria_complementaria);
CREATE INDEX IF NOT EXISTS idx_prodsubcat_subcat ON producto_subcategoria(id_subcategoria);
CREATE INDEX IF NOT EXISTS idx_prodbase_base ON producto_base(id_base);
CREATE INDEX IF NOT EXISTS idx_combo_producto ON combo(id_producto);
CREATE INDEX IF NOT EXISTS idx_tonos_color ON tonos(id_color);
CREATE INDEX IF NOT EXISTS idx_variante_producto ON variante(id_producto);
CREATE INDEX IF NOT EXISTS idx_variante_color ON variante(id_color);
CREATE INDEX IF NOT EXISTS idx_variante_base ON variante(id_base);
CREATE INDEX IF NOT EXISTS idx_variante_presentacion ON variante(id_presentacion);
CREATE INDEX IF NOT EXISTS idx_imagen_producto ON imagen(id_producto);
CREATE INDEX IF NOT EXISTS idx_imagen_variante ON imagen(id_variante);
CREATE INDEX IF NOT EXISTS idx_imagen_color ON imagen(id_color);
CREATE INDEX IF NOT EXISTS idx_variante_estado ON variante(estado);
CREATE INDEX IF NOT EXISTS idx_caract_variante ON caracteristica(id_variante);
CREATE INDEX IF NOT EXISTS idx_varcombo_variante ON variante_combo(id_variante);
CREATE INDEX IF NOT EXISTS idx_varcombo_combo ON variante_combo(id_combo);

-- Índices en Carrito y Líneas de Carrito
CREATE INDEX IF NOT EXISTS idx_carrito_usuario ON carrito(id_usuario);
CREATE INDEX IF NOT EXISTS idx_carrito_token ON carrito(token_visitante);
CREATE INDEX IF NOT EXISTS idx_lineacarrito_carrito ON linea_carrito(id_carrito);
CREATE INDEX IF NOT EXISTS idx_lineacarrito_variante ON linea_carrito(id_variante);

-- Índices en Órdenes, Líneas de Orden, Pagos y Facturación
CREATE INDEX IF NOT EXISTS idx_orden_codigo ON orden(codigo_visible);
CREATE INDEX IF NOT EXISTS idx_orden_usuario ON orden(id_usuario);
CREATE INDEX IF NOT EXISTS idx_orden_cotizacion ON orden(id_cotizacion);
CREATE INDEX IF NOT EXISTS idx_orden_estado ON orden(estado);
CREATE INDEX IF NOT EXISTS idx_orden_fecha ON orden(fecha);
CREATE INDEX IF NOT EXISTS idx_lineaorden_orden ON linea_orden(id_orden);
CREATE INDEX IF NOT EXISTS idx_pagos_orden ON pagos(id_orden);
CREATE INDEX IF NOT EXISTS idx_pagos_metodo ON pagos(id_metodo_pago);
CREATE INDEX IF NOT EXISTS idx_factura_orden ON factura(id_orden);

-- Índices en Historial, Notas y Contactos de la Orden (M08 - v3.8): consulta por orden en orden cronológico
CREATE INDEX IF NOT EXISTS idx_historial_estado_orden_fecha ON historial_estado_orden(id_orden, fecha);
CREATE INDEX IF NOT EXISTS idx_historial_estado_autor ON historial_estado_orden(id_usuario_autor);
CREATE INDEX IF NOT EXISTS idx_nota_orden_orden_fecha ON nota_orden(id_orden, fecha);
CREATE INDEX IF NOT EXISTS idx_nota_orden_autor ON nota_orden(id_usuario_autor);
CREATE INDEX IF NOT EXISTS idx_contacto_orden_orden_fecha ON contacto_orden(id_orden, fecha);
CREATE INDEX IF NOT EXISTS idx_contacto_orden_autor ON contacto_orden(id_usuario_autor);

-- Índices en Reservaciones
CREATE INDEX IF NOT EXISTS idx_reservacion_usuario ON reservaciones(id_usuario);
CREATE INDEX IF NOT EXISTS idx_reservacion_producto ON reservaciones(id_producto);
CREATE INDEX IF NOT EXISTS idx_reservacion_fecha ON reservaciones(fecha);

-- Sesiones (M20): búsqueda de sesiones vigentes por usuario y barrido de caducadas.
CREATE INDEX IF NOT EXISTS idx_sesion_usuario_estado ON sesion(id_usuario, estado);
CREATE INDEX IF NOT EXISTS idx_sesion_estado_expiracion ON sesion(estado, fecha_expiracion);

-- Índices en Privacidad, Consentimiento y Habeas Data
CREATE INDEX IF NOT EXISTS idx_consentimiento_usuario ON consentimiento_usuario(id_usuario);
CREATE INDEX IF NOT EXISTS idx_consentimiento_aviso ON consentimiento_usuario(id_aviso_privacidad);
CREATE INDEX IF NOT EXISTS idx_supresion_usuario ON solicitud_supresion(id_usuario);
CREATE INDEX IF NOT EXISTS idx_supresion_estado ON solicitud_supresion(estado);

-- Índices en Cuentas, Direcciones y Solicitudes Empresa (M04)
CREATE INDEX IF NOT EXISTS idx_direccion_usuario ON direccion_cliente(id_usuario);
CREATE INDEX IF NOT EXISTS idx_direccion_predeterminada ON direccion_cliente(id_usuario, es_predeterminada);
CREATE INDEX IF NOT EXISTS idx_solicitud_empresa_nit ON solicitud_empresa(nit);
CREATE INDEX IF NOT EXISTS idx_solicitud_empresa_usuario ON solicitud_empresa(id_usuario);
CREATE INDEX IF NOT EXISTS idx_solicitud_empresa_estado ON solicitud_empresa(estado);
CREATE INDEX IF NOT EXISTS idx_solicitud_nit_usuario ON solicitud_actualizacion_nit(id_usuario);
CREATE INDEX IF NOT EXISTS idx_solicitud_nit_estado ON solicitud_actualizacion_nit(estado);
CREATE INDEX IF NOT EXISTS idx_identidad_proveedor ON usuario_identidad_externa(proveedor, id_proveedor);
CREATE INDEX IF NOT EXISTS idx_identidad_usuario ON usuario_identidad_externa(id_usuario);
CREATE INDEX IF NOT EXISTS idx_codigo_correo_tipo ON codigo_verificacion(correo, tipo);
CREATE INDEX IF NOT EXISTS idx_codigo_expiracion ON codigo_verificacion(expiracion);

-- Índices en Analítica de Búsqueda (M02 - HU-BUS-06): filtro por periodo y agrupación por término
CREATE INDEX IF NOT EXISTS idx_bsr_fecha ON busqueda_sin_resultado(fecha);
CREATE INDEX IF NOT EXISTS idx_bsr_termino ON busqueda_sin_resultado(termino);

-- ==============================================================================
-- FIN DEL SCRIPT DDL (49 TABLAS - v3.9)
-- ==============================================================================
