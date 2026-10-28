#!/usr/bin/env node
/**
 * Genera los scripts SQL de los datos de DEMOSTRACIÓN del catálogo:
 *   bd/sql/demo/datos_demo_catalogo.sql  → carga (aditiva e idempotente: no borra ni modifica nada existente)
 *   bd/sql/demo/retirar_datos_demo.sql   → retira lo que cargó el anterior
 *
 * Uso (desde la raíz del repositorio):  node bd/script/datos-demo/generar.mjs
 * Necesita `backend/node_modules` (usa `sharp`, ya instalado, para dibujar las imágenes).
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLORES, COLORES_FABRICA, COLORES_MATE, LINEAS, MARCAS, MEDIDAS, POPULARIDAD, PRODUCTOS } from './catalogo.mjs';
import { ilustracion, logotipo } from './ilustraciones.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const salida = path.resolve(aqui, '../../sql/demo');

const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replaceAll("'", "''")}'`);
const num = (v) => (v === null || v === undefined ? 'NULL' : String(v));
const bool = (v) => (v ? 'true' : 'false');
const lista = (filas) => filas.map((f) => `    (${f.join(', ')})`).join(',\n');

/* ── Clasificación y catálogos técnicos: los mismos del seed, por si la base no los tiene ─────────────────────────── */
const CATEGORIAS = [['Pinturas', 1], ['Preparación de superficies', 2], ['Maderas', 3], ['Impermeabilizantes', 4], ['Aerosoles', 5], ['Herramientas y accesorios', 6]];
const SUBCATEGORIAS = [
  ['Pinturas', 'Vinilos para muros', 1], ['Pinturas', 'Pinturas para fachadas', 2], ['Pinturas', 'Esmaltes', 3], ['Pinturas', 'Anticorrosivos', 4],
  ['Pinturas', 'Pinturas para pisos', 5], ['Pinturas', 'Pinturas especiales', 6], ['Preparación de superficies', 'Estucos y masillas', 1],
  ['Preparación de superficies', 'Selladores e imprimantes', 2], ['Preparación de superficies', 'Removedores y limpiadores', 3], ['Maderas', 'Barnices', 1],
  ['Maderas', 'Lacas', 2], ['Maderas', 'Tintes e inmunizantes', 3], ['Impermeabilizantes', 'Muros y fachadas', 1], ['Impermeabilizantes', 'Techos y cubiertas', 2],
  ['Impermeabilizantes', 'Siliconas y sellos de juntas', 3], ['Aerosoles', 'Aerosoles multisuperficie', 1], ['Aerosoles', 'Aerosoles especiales', 2],
  ['Herramientas y accesorios', 'Brochas', 1], ['Herramientas y accesorios', 'Rodillos', 2], ['Herramientas y accesorios', 'Bandejas y extensiones', 3],
  ['Herramientas y accesorios', 'Cintas y protección', 4], ['Herramientas y accesorios', 'Lijas y espátulas', 5],
];
const SUPERFICIES = [['Paredes y techos', 1], ['Madera', 2], ['Metal', 3], ['Pisos', 4], ['Cubiertas y terrazas', 5], ['Otras superficies', 6]];
const ACABADOS = [['Brillante', 1], ['Mate', 2], ['Semimate', 3], ['Satinado', 4], ['Transparente', 5]];
const BASES = [['Pastel', 1], ['Tint', 2], ['Deep', 3], ['Accent', 4]];
const FAMILIAS = [['Blancos', '#F5F1EA', 1], ['Grises y negros', '#8E9295', 2], ['Amarillos', '#F5D430', 3], ['Naranjas', '#F08A24', 4], ['Rojos', '#D7263D', 5],
  ['Rosados y morados', '#8E5A9B', 6], ['Azules', '#3B6EA5', 7], ['Verdes', '#1FA34A', 8], ['Tierras y cafés', '#A67C52', 9]];
const TIPOS_MEDIDA = [['Galón', 'gal', '1.000000000'], ['Litro', 'L', '0.264172052'], ['Mililitro', 'ml', '0.000264172'], ['Pulgada', 'in', null], ['Metro', 'm', null], ['Unidad', 'und', null]];
const RESINAS = ['Base agua', 'Base aceite'];

/* ── Colores ───────────────────────────────────────────────────────────────────────────────────────────────────── */
function hsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  return { l, s };
}
/** Base de colorimetría por claridad y saturación: muy claro = Pastel, oscuro = Deep, saturado = Accent, el resto Tint. */
function baseDe(hex) {
  const { l, s } = hsl(hex);
  if (l > 0.8) return 'Pastel';
  if (l < 0.3) return 'Deep';
  return s > 0.55 ? 'Accent' : 'Tint';
}
const ABREV = { Blancos: 'BLA', 'Grises y negros': 'GRI', Amarillos: 'AMA', Naranjas: 'NAR', Rojos: 'ROJ', 'Rosados y morados': 'ROS', Azules: 'AZU', Verdes: 'VER', 'Tierras y cafés': 'TIE' };

const cartaBrillante = [];
const contadorFamilia = {};
for (const [familia, nombre, hex] of COLORES) {
  contadorFamilia[familia] = (contadorFamilia[familia] ?? 100) + 1;
  cartaBrillante.push({ marca: 'Pintuco', nombre, codigo: `PIN-${ABREV[familia]}-${contadorFamilia[familia]}`, base: baseDe(hex), acabado: 'Brillante', familia, hex });
}
const cartaMate = COLORES_MATE.map((nombre) => {
  const o = cartaBrillante.find((c) => c.nombre === nombre);
  if (o === undefined) throw new Error(`Color mate desconocido: ${nombre}`);
  return { ...o, codigo: `${o.codigo}-M`, acabado: 'Mate' };
});
const fabrica = COLORES_FABRICA.map(([marca, nombre, codigo, acabado, hex, familia]) => ({ marca, nombre, codigo, base: null, acabado, familia, hex }));
const todosLosColores = [...cartaBrillante, ...cartaMate, ...fabrica];

/* ── SQL ───────────────────────────────────────────────────────────────────────────────────────────────────────── */
const partes = [];
const add = (s) => partes.push(s);

add(`-- =============================================================================
-- DATOS DE DEMOSTRACIÓN DEL CATÁLOGO · Pintu Clic
-- Generado por bd/script/datos-demo/generar.mjs — no editar a mano: se cambia el generador y se vuelve a generar.
--
-- Qué hace: agrega productos, colores, marcas, variantes con su precio y existencia, una imagen por producto y un
--   historial de ventas de ejemplo (órdenes DEMO-xxxx) para que la tienda y el panel se vean con vida.
-- Seguridad: es ADITIVO e IDEMPOTENTE. Solo inserta; no modifica ni borra nada de lo existente, y si una fila ya existe
--   (mismo nombre, SKU o código) la deja como está. Se puede correr varias veces con el mismo resultado.
-- Todo en una sola transacción: si algo falla, no queda nada a medias.
-- Para retirarlo: bd/sql/retirar_datos_demo.sql
-- Requisitos: esquema del repositorio (bd/sql/schema_pintuclic.sql) ya aplicado.
-- =============================================================================
BEGIN;
`);

add(`-- 1. Clasificación y catálogos técnicos (los mismos del seed; si ya existen no se tocan)
INSERT INTO categoria (nombre, orden) VALUES
${lista(CATEGORIAS.map(([n, o]) => [q(n), o]))}
ON CONFLICT DO NOTHING;

INSERT INTO subcategoria (id_categoria, nombre, orden)
SELECT c.id_categoria, v.nombre, v.orden FROM (VALUES
${lista(SUBCATEGORIAS.map(([c, n, o]) => [q(c), q(n), o]))}
) AS v(categoria, nombre, orden) JOIN categoria c ON c.nombre = v.categoria
ON CONFLICT DO NOTHING;

INSERT INTO superficie (nombre, orden) VALUES
${lista(SUPERFICIES.map(([n, o]) => [q(n), o]))}
ON CONFLICT DO NOTHING;

INSERT INTO acabado (nombre, orden) VALUES
${lista(ACABADOS.map(([n, o]) => [q(n), o]))}
ON CONFLICT DO NOTHING;

INSERT INTO base (nombre, orden) VALUES
${lista(BASES.map(([n, o]) => [q(n), o]))}
ON CONFLICT DO NOTHING;

INSERT INTO familia_color (nombre, hexadecimal, orden) VALUES
${lista(FAMILIAS.map(([n, h, o]) => [q(n), q(h), o]))}
ON CONFLICT DO NOTHING;

INSERT INTO tipo_resina (nombre) VALUES
${lista(RESINAS.map((n) => [q(n)]))}
ON CONFLICT DO NOTHING;

INSERT INTO tipo_medida (nombre, abreviatura, equivalencia_galones) VALUES
${lista(TIPOS_MEDIDA.map(([n, a, e]) => [q(n), q(a), e === null ? 'NULL' : e]))}
ON CONFLICT DO NOTHING;

INSERT INTO medida (id_tipo_medida, valor, nombre)
SELECT t.id_tipo_medida, v.valor, v.nombre FROM (VALUES
${lista(MEDIDAS.map(([t, v, n]) => [q(t), v, q(n)]))}
) AS v(tipo, valor, nombre) JOIN tipo_medida t ON t.nombre = v.tipo
ON CONFLICT DO NOTHING;
`);

/* Marcas (las del seed se incluyen por si la base no las tiene; con DO NOTHING no se tocan si existen). */
const marcasConLogo = [
  { nombre: 'Pintuco', color: '#0B4EA2' },
  { nombre: 'Goya', color: '#C0392B' },
  ...MARCAS,
];
const filasMarcas = [];
for (const m of marcasConLogo) filasMarcas.push([q(m.nombre), `decode('${(await logotipo(m.color)).toString('base64')}', 'base64')`, q('image/png')]);
add(`-- 2. Marcas y líneas
INSERT INTO marca (nombre, logotipo, logotipo_mime_type) VALUES
${lista(filasMarcas)}
ON CONFLICT DO NOTHING;

INSERT INTO linea (id_marca, nombre, gama_comercial)
SELECT m.id_marca, v.nombre, v.gama FROM (VALUES
${lista(LINEAS.map(([m, n, g]) => [q(m), q(n), q(g)]))}
) AS v(marca, nombre, gama) JOIN marca m ON m.nombre = v.marca
ON CONFLICT DO NOTHING;
`);

const filaColor = (c) => [q(c.marca), q(c.nombre), q(c.codigo), q(c.base), q(c.acabado), q(c.familia), q(c.hex)];
add(`-- 3. Colores: la carta de Pintuco (${cartaBrillante.length} brillantes y ${cartaMate.length} mate) y colores de fábrica de otras marcas
INSERT INTO color (id_marca, nombre, codigo, id_base, id_acabado, id_familia_color, hexadecimal)
SELECT m.id_marca, v.nombre, v.codigo, b.id_base, a.id_acabado, f.id_familia_color, v.hex FROM (VALUES
${lista(todosLosColores.map(filaColor))}
) AS v(marca, nombre, codigo, base, acabado, familia, hex)
JOIN marca m ON m.nombre = v.marca
JOIN acabado a ON a.nombre = v.acabado
LEFT JOIN base b ON b.nombre = v.base
LEFT JOIN familia_color f ON f.nombre = v.familia
ON CONFLICT DO NOTHING;
`);

/* Productos */
const filaProducto = (p) => [q(p.marca), q(p.linea), q(p.cat), q(p.sub), q(p.nombre), q(p.desc), bool(p.interior), bool(p.exterior), q(p.compl)];
add(`-- 4. Productos (${PRODUCTOS.length}), publicados
INSERT INTO producto (id_marca, id_linea, id_subcategoria, nombre, descripcion, uso_interior, uso_exterior, estado, publicado, id_categoria_complementaria)
SELECT m.id_marca, l.id_linea, sc.id_subcategoria, v.nombre, v.descripcion, v.interior, v.exterior, 'activo', true, cc.id_categoria FROM (VALUES
${lista(PRODUCTOS.map(filaProducto))}
) AS v(marca, linea, categoria, subcategoria, nombre, descripcion, interior, exterior, complementaria)
JOIN marca m ON m.nombre = v.marca
LEFT JOIN linea l ON l.id_marca = m.id_marca AND l.nombre = v.linea
JOIN categoria c ON c.nombre = v.categoria
JOIN subcategoria sc ON sc.id_categoria = c.id_categoria AND sc.nombre = v.subcategoria
LEFT JOIN categoria cc ON cc.nombre = v.complementaria
ON CONFLICT DO NOTHING;
`);

const conFicha = PRODUCTOS.filter((p) => p.resina !== null);
add(`-- 5. Ficha técnica de los recubrimientos
INSERT INTO ficha_recubrimiento (id_producto, id_tipo_resina, tipo_calidad, rendimiento_min, rendimiento_max, manos)
SELECT p.id_producto, r.id_tipo_resina, v.calidad, v.rmin, v.rmax, v.manos FROM (VALUES
${lista(conFicha.map((p) => [q(p.marca), q(p.nombre), q(p.resina), num(p.calidad), num(p.rend?.[0]), num(p.rend?.[1]), num(p.manos)]))}
) AS v(marca, producto, resina, calidad, rmin, rmax, manos)
JOIN marca m ON m.nombre = v.marca JOIN producto p ON p.id_marca = m.id_marca AND p.nombre = v.producto
JOIN tipo_resina r ON r.nombre = v.resina
ON CONFLICT DO NOTHING;
`);

const relaciones = (campo, tabla, colId, tablaRef, nombreRef) => {
  const filas = PRODUCTOS.flatMap((p) => p[campo].map((x) => [q(p.marca), q(p.nombre), q(x)]));
  if (filas.length === 0) return '';
  return `INSERT INTO ${tabla} (id_producto, ${colId})
SELECT p.id_producto, r.${colId} FROM (VALUES
${lista(filas)}
) AS v(marca, producto, ${nombreRef})
JOIN marca m ON m.nombre = v.marca JOIN producto p ON p.id_marca = m.id_marca AND p.nombre = v.producto
JOIN ${tablaRef} r ON r.nombre = v.${nombreRef}
ON CONFLICT DO NOTHING;
`;
};
add(`-- 6. Superficies, acabados y bases de cada producto (con ellos se arma la carta de colores que ve cada uno)
${relaciones('superficies', 'producto_superficie', 'id_superficie', 'superficie', 'superficie')}
${relaciones('acabados', 'producto_acabado', 'id_acabado', 'acabado', 'acabado')}
${relaciones('bases', 'producto_base', 'id_base', 'base', 'base')}`);

const exclusivos = PRODUCTOS.flatMap((p) => (Array.isArray(p.colores) ? p.colores.map(([cm, cn]) => [q(p.marca), q(p.nombre), q(cm), q(cn)]) : []));
add(`-- 7. Colores de fábrica exclusivos de cada producto
INSERT INTO producto_color (id_producto, id_color)
SELECT p.id_producto, c.id_color FROM (VALUES
${lista(exclusivos)}
) AS v(marca, producto, marca_color, color)
JOIN marca m ON m.nombre = v.marca JOIN producto p ON p.id_marca = m.id_marca AND p.nombre = v.producto
JOIN marca mc ON mc.nombre = v.marca_color JOIN color c ON c.id_marca = mc.id_marca AND c.nombre = v.color
ON CONFLICT DO NOTHING;
`);

const EXISTENTES = [
  { marca: 'Pintuco', nombre: 'Viniltex Ultralavable', img: ['lata', '#2B6CB0'] },
  { marca: 'Pintuco', nombre: 'Koraza Sol & Lluvia', img: ['lata', '#E67E22'] },
  { marca: 'Pintuco', nombre: 'Pintulux 3 en 1', img: ['lata', '#C0392B'] },
  { marca: 'Pintuco', nombre: 'Esmalte ICO', img: ['lata', '#1E1E1E'] },
  { marca: 'Pintuco', nombre: 'Barniz Transparente', img: ['lata', '#B9770E'] },
  { marca: 'Goya', nombre: 'Brocha de cerda natural', img: ['brocha', '#2B6CB0', 150] },
];

const filasVar = PRODUCTOS.flatMap((p) => p.vars.map(([medida, sku, precio, stock]) => [q(p.marca), q(p.nombre), q(medida), q(sku), precio, stock]));
add(`-- 8. Variantes (producto + medida) con su precio en pesos, IVA incluido, y su existencia referencial
INSERT INTO variante (id_producto, id_medida, sku, precio_vigente, existencia_referencial, estado)
SELECT p.id_producto, md.id_medida, v.sku, v.precio, v.existencia, 'activo' FROM (VALUES
${lista(filasVar)}
) AS v(marca, producto, medida, sku, precio, existencia)
JOIN marca m ON m.nombre = v.marca JOIN producto p ON p.id_marca = m.id_marca AND p.nombre = v.producto
JOIN medida md ON md.nombre = v.medida
ON CONFLICT DO NOTHING;
`);

/* Imágenes: una por producto, principal. Solo si el producto todavía no tiene imagen principal. */
add('-- 9. Una ilustración principal por producto (solo si todavía no tiene imagen principal)');
const conImagen = [...PRODUCTOS, ...EXISTENTES];
const huellasImagenes = []; // [marca, producto, md5 de los bytes]: para retirar solo las imágenes que cargó este script
for (const p of conImagen) {
  const [forma, acento, extra] = p.img;
  const opciones = forma === 'brocha' ? { acento, ancho: extra } : forma === 'rodillo' ? { acento, mini: extra === true } : { acento };
  const bytes = await ilustracion(forma, opciones);
  const b64 = bytes.toString('base64');
  huellasImagenes.push([p.marca, p.nombre, createHash('md5').update(bytes).digest('hex')]);
  add(`INSERT INTO imagen (id_producto, datos, mime_type, orden, es_principal)
SELECT p.id_producto, decode('${b64}', 'base64'), 'image/webp', 0, true
FROM producto p JOIN marca m ON m.id_marca = p.id_marca
WHERE m.nombre = ${q(p.marca)} AND p.nombre = ${q(p.nombre)}
  AND NOT EXISTS (SELECT 1 FROM imagen i WHERE i.id_producto = p.id_producto AND i.es_principal);
`);
}

/* ── Historial de ventas ───────────────────────────────────────────────────────────────────────────────────────── */
let semilla = 20261028;
const azar = () => {
  semilla = (semilla * 1664525 + 1013904223) % 4294967296;
  return semilla / 4294967296;
};
const elegir = (arr) => arr[Math.floor(azar() * arr.length)];

const SEED_VARIANTES = [
  { producto: 'Viniltex Ultralavable', medida: '1 galón', sku: 'VIN-ULT-GAL', precio: 85900 },
  { producto: 'Viniltex Ultralavable', medida: '1/4 de galón', sku: 'VIN-ULT-QT', precio: 28900 },
  { producto: 'Koraza Sol & Lluvia', medida: '1 galón', sku: 'KOR-SYL-GAL', precio: 99900 },
  { producto: 'Pintulux 3 en 1', medida: '1 galón', sku: 'PLX-3EN1-GAL', precio: 109900 },
  { producto: 'Pintulux 3 en 1', medida: '1/4 de galón', sku: 'PLX-3EN1-QT', precio: 31900 },
];
const variantesVendibles = [
  ...PRODUCTOS.flatMap((p) => p.vars.map(([medida, sku, precio]) => ({ producto: p.nombre, medida, sku, precio }))),
  ...SEED_VARIANTES,
].map((v) => ({ ...v, peso: POPULARIDAD[v.producto] ?? 1 }));
const bolsa = variantesVendibles.flatMap((v) => Array.from({ length: v.peso }, () => v));

const CAMINO = ['orden_confirmada', 'revision_disponibilidad', 'en_preparacion', 'preparada', 'despachado', 'entregado'];
const ordenes = [];
for (let i = 1; i <= 42; i += 1) {
  const dias = Math.floor(azar() * 75);
  const lineas = [];
  const n = 1 + Math.floor(azar() * 3);
  while (lineas.length < n) {
    const v = elegir(bolsa);
    if (!lineas.some((l) => l.v.sku === v.sku)) lineas.push({ v, cantidad: v.precio < 20000 ? 1 + Math.floor(azar() * 4) : 1 + Math.floor(azar() * 2) });
  }
  let estado;
  const r = azar();
  if (dias <= 6) estado = elegir(['orden_confirmada', 'revision_disponibilidad', 'en_preparacion', 'preparada', 'despachado', 'entregado']);
  else estado = r < 0.88 ? 'entregado' : r < 0.95 ? 'cancelado' : 'devuelto';
  ordenes.push({ codigo: `DEMO-${String(i).padStart(4, '0')}`, dias, estado, lineas });
}

const sqlOrden = (o, indice) => {
  const sub = o.lineas.reduce((s, l) => s + l.v.precio * l.cantidad, 0);
  const base = Math.round((sub / 1.19) * 100) / 100;
  const iva = Math.round((sub - base) * 100) / 100;
  const camino = o.estado === 'cancelado' ? ['orden_confirmada', 'cancelado'] : o.estado === 'devuelto' ? [...CAMINO, 'devuelto'] : CAMINO.slice(0, CAMINO.indexOf(o.estado) + 1);
  const lineas = o.lineas
    .map(
      (l) => `    INSERT INTO linea_orden (id_orden, nombre_producto, variante_copia, precio_aplicado, cantidad, precio_inicial, id_variante_ref, sku_vendido)
    VALUES (v_orden, ${q(l.v.producto)}, ${q(l.v.medida)}, ${l.v.precio}, ${l.cantidad}, ${l.v.precio}, (SELECT id_variante FROM variante WHERE sku = ${q(l.v.sku)}), ${q(l.v.sku)});`,
    )
    .join('\n');
  const historial = camino
    .map(
      (e, k) => `    INSERT INTO historial_estado_orden (id_orden, estado_anterior, estado_nuevo, id_usuario_autor, motivo, fecha)
    VALUES (v_orden, ${k === 0 ? 'NULL' : `'${camino[k - 1]}'`}, '${e}', NULL, ${e === 'cancelado' ? q('Cancelada por el cliente') : e === 'devuelto' ? q('Devolución solicitada por el cliente') : 'NULL'}, now() - interval '${o.dias} days' + interval '${k * 5} hours');`,
    )
    .join('\n');
  return `  -- ${o.codigo} · ${o.estado}
  INSERT INTO orden (codigo_visible, id_usuario, origen, estado, modo_entrega, costo_entrega, sub_total, descuento, total, base_sin_impuesto, importe_iva, tasa_iva, observaciones, fecha)
  VALUES (${q(o.codigo)}, v_clientes[1 + (${indice} % array_length(v_clientes, 1))], 'carrito', '${o.estado}', 'recogida', 0, ${sub}, 0, ${sub}, ${base}, ${iva}, 19, 'Orden de demostración', CURRENT_DATE - ${o.dias})
  RETURNING id_orden INTO v_orden;
${lineas}
${historial}`;
};

add(`-- 10. Historial de ventas de ejemplo (${ordenes.length} órdenes DEMO-xxxx de los últimos 75 días). Alimenta «Los más vendidos» y los
--     paneles del administrador. Se asignan a los clientes que ya existan; si no hay ninguno, o si ya se cargaron, no se hace nada.
DO $demo$
DECLARE
  v_clientes INT[];
  v_orden INT;
BEGIN
  SELECT array_agg(u.id_usuario ORDER BY u.id_usuario) INTO v_clientes
  FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
  WHERE r.nombre = 'cliente' AND u.estado = 'activo';

  IF v_clientes IS NULL THEN
    RAISE NOTICE 'No hay clientes activos: se omite el historial de ventas de ejemplo.';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM orden WHERE codigo_visible LIKE 'DEMO-%') THEN
    RAISE NOTICE 'El historial de ventas de ejemplo ya estaba cargado: no se repite.';
    RETURN;
  END IF;

${ordenes.map((o, i) => sqlOrden(o, i)).join('\n\n')}
END
$demo$;

COMMIT;
`);

mkdirSync(salida, { recursive: true });
writeFileSync(path.join(salida, 'datos_demo_catalogo.sql'), partes.join('\n'));

/* ── Retiro ────────────────────────────────────────────────────────────────────────────────────────────────────── */
const skus = PRODUCTOS.flatMap((p) => p.vars.map((v) => q(v[1])));
const nombresProducto = PRODUCTOS.map((p) => `(${q(p.marca)}, ${q(p.nombre)})`);
const codigosColor = todosLosColores.map((c) => `(${q(c.marca)}, ${q(c.codigo)})`);
writeFileSync(
  path.join(salida, 'retirar_datos_demo.sql'),
  `-- =============================================================================
-- RETIRO DE LOS DATOS DE DEMOSTRACIÓN · Pintu Clic
-- Generado por bd/script/datos-demo/generar.mjs. Deshace bd/sql/demo/datos_demo_catalogo.sql:
--   · las órdenes DEMO-xxxx con sus líneas e historial,
--   · los productos de demostración (con sus imágenes, variantes y relaciones),
--   · los colores de demostración y las marcas y líneas que solo ellos usaban.
-- NO toca nada de lo que existía antes (seed, datos reales). Si alguno de estos productos ya se usó de verdad (está en un
-- carrito o en una cotización), la transacción falla con un error de llave foránea y no borra nada: se resuelve a mano.
-- =============================================================================
BEGIN;

DELETE FROM historial_estado_orden WHERE id_orden IN (SELECT id_orden FROM orden WHERE codigo_visible LIKE 'DEMO-%');
DELETE FROM linea_orden WHERE id_orden IN (SELECT id_orden FROM orden WHERE codigo_visible LIKE 'DEMO-%');
DELETE FROM orden WHERE codigo_visible LIKE 'DEMO-%';

-- Las imágenes de demostración (también las que se pusieron a los productos que ya existían), reconocidas por su contenido.
DELETE FROM imagen i USING producto p, marca m
WHERE p.id_producto = i.id_producto AND m.id_marca = p.id_marca
  AND (m.nombre, p.nombre, md5(i.datos)) IN (${huellasImagenes.map(([m, n, h]) => `(${q(m)}, ${q(n)}, ${q(h)})`).join(', ')});

DELETE FROM variante WHERE sku IN (${skus.join(', ')});

DELETE FROM producto p USING marca m
WHERE m.id_marca = p.id_marca AND (m.nombre, p.nombre) IN (${nombresProducto.join(', ')})
  AND NOT EXISTS (SELECT 1 FROM variante v WHERE v.id_producto = p.id_producto);

DELETE FROM color c USING marca m
WHERE m.id_marca = c.id_marca AND (m.nombre, c.codigo) IN (${codigosColor.join(', ')})
  AND NOT EXISTS (SELECT 1 FROM producto_color pc WHERE pc.id_color = c.id_color);

DELETE FROM linea l USING marca m
WHERE m.id_marca = l.id_marca AND m.nombre IN ('Colorama', 'Maderplus', 'Impermax')
  AND NOT EXISTS (SELECT 1 FROM producto p WHERE p.id_linea = l.id_linea);

DELETE FROM marca m
WHERE m.nombre IN ('Colorama', 'Maderplus', 'Impermax')
  AND NOT EXISTS (SELECT 1 FROM producto p WHERE p.id_marca = m.id_marca)
  AND NOT EXISTS (SELECT 1 FROM color c WHERE c.id_marca = m.id_marca)
  AND NOT EXISTS (SELECT 1 FROM linea l WHERE l.id_marca = m.id_marca);

COMMIT;
`,
);

console.log(`Listo: ${PRODUCTOS.length} productos, ${todosLosColores.length} colores, ${ordenes.length} órdenes de ejemplo.`);
