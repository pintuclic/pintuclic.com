/**
 * Datos de DEMOSTRACIÓN del catálogo (no son datos del cliente). Todo se identifica por nombre, no por número, para que
 * el SQL generado funcione sobre cualquier base, esté vacía o con datos. Las marcas Colorama, Maderplus e Impermax y
 * los productos que no existen en el seed son inventados; Pintuco y Goya vienen del seed.
 */

export const MARCAS = [
  { nombre: 'Colorama', color: '#E4572E' },
  { nombre: 'Maderplus', color: '#7A4B2A' },
  { nombre: 'Impermax', color: '#1D6FA5' },
];

/** [marca, línea, gama comercial] */
export const LINEAS = [
  ['Pintuco', 'Viniltex', 'Interiores'],
  ['Pintuco', 'Koraza', 'Exteriores'],
  ['Pintuco', 'Pintulux', 'Esmaltes'],
  ['Colorama', 'Colorama Hogar', 'Económica'],
  ['Colorama', 'Colorama Pro', 'Profesional'],
  ['Maderplus', 'Maderplus Exterior', 'Maderas'],
  ['Impermax', 'Impermax Techos', 'Impermeabilizantes'],
];

export const MEDIDAS = [
  // [tipo de medida, valor, nombre]
  ['Galón', 0.25, '1/4 de galón'],
  ['Galón', 1, '1 galón'],
  ['Galón', 5, '5 galones'],
  ['Litro', 1, '1 litro'],
  ['Mililitro', 300, '300 ml'],
  ['Mililitro', 400, '400 ml'],
  ['Pulgada', 1.5, '1,5 pulgadas'],
  ['Pulgada', 2, '2 pulgadas'],
  ['Pulgada', 3, '3 pulgadas'],
  ['Pulgada', 4, '4 pulgadas'],
  ['Pulgada', 9, '9 pulgadas'],
  ['Unidad', 1, '1 unidad'],
  ['Metro', 40, 'Rollo de 40 m'],
];

/** Paleta de la carta de Pintuco: [familia, nombre, hex]. El código y la base se derivan. */
export const COLORES = [
  ['Blancos', 'Blanco Nube', '#F8F6F1'], ['Blancos', 'Blanco Algodón', '#F3F0E8'], ['Blancos', 'Marfil', '#EFE6D0'],
  ['Blancos', 'Crema Suave', '#F2E6C9'], ['Blancos', 'Perla', '#EAE6DD'], ['Blancos', 'Blanco Lino', '#EDE7DA'],
  ['Blancos', 'Arena Clara', '#E8DDC6'], ['Blancos', 'Hueso Antiguo', '#E4D9BF'],
  ['Grises y negros', 'Gris Perla', '#D5D8DA'], ['Grises y negros', 'Gris Plata', '#B8BCBF'], ['Grises y negros', 'Gris Humo', '#9A9EA2'],
  ['Grises y negros', 'Gris Piedra', '#7D8186'], ['Grises y negros', 'Gris Grafito', '#55595D'], ['Grises y negros', 'Gris Tormenta', '#44484C'],
  ['Grises y negros', 'Gris Cemento', '#A3A29D'], ['Grises y negros', 'Negro Azabache', '#202124'], ['Grises y negros', 'Carbón Profundo', '#2E3033'],
  ['Amarillos', 'Amarillo Pálido', '#F8EDB0'], ['Amarillos', 'Amarillo Limón', '#F6E05A'], ['Amarillos', 'Amarillo Girasol', '#F5C518'],
  ['Amarillos', 'Amarillo Maíz', '#F2D16B'], ['Amarillos', 'Amarillo Mostaza', '#D9A81E'], ['Amarillos', 'Dorado Miel', '#E0A93B'], ['Amarillos', 'Paja', '#EAD893'],
  ['Naranjas', 'Durazno', '#F8C8A0'], ['Naranjas', 'Naranja Papaya', '#F59B4C'], ['Naranjas', 'Naranja Atardecer', '#EE7A2B'],
  ['Naranjas', 'Calabaza', '#D9631E'], ['Naranjas', 'Zanahoria', '#E8691E'], ['Naranjas', 'Cobre Brillante', '#C9622F'],
  ['Rojos', 'Rojo Cereza', '#C8283A'], ['Rojos', 'Rojo Tomate', '#D94735'], ['Rojos', 'Rojo Granate', '#8E1B2B'],
  ['Rojos', 'Rojo Ladrillo', '#A8402E'], ['Rojos', 'Rojo Fuego', '#D1301F'], ['Rojos', 'Vino Tinto', '#6F1D2C'], ['Rojos', 'Coral Intenso', '#E86B5A'],
  ['Rosados y morados', 'Rosa Pastel', '#F4D3DA'], ['Rosados y morados', 'Rosa Chicle', '#EFA8BE'], ['Rosados y morados', 'Fucsia', '#C72C7B'],
  ['Rosados y morados', 'Lavanda', '#D2C5E6'], ['Rosados y morados', 'Violeta Suave', '#A68CC8'], ['Rosados y morados', 'Morado Uva', '#6B3F8C'],
  ['Rosados y morados', 'Malva', '#B890B8'], ['Rosados y morados', 'Ciruela', '#573063'],
  ['Azules', 'Azul Hielo', '#D4E8F4'], ['Azules', 'Azul Brisa', '#A8D0EA'], ['Azules', 'Azul Caribe', '#3FA7D6'], ['Azules', 'Azul Real', '#2457A8'],
  ['Azules', 'Azul Petróleo', '#1F5F7A'], ['Azules', 'Azul Medianoche', '#18284F'], ['Azules', 'Turquesa', '#2BB3B1'], ['Azules', 'Azul Acero', '#5C7C99'], ['Azules', 'Celeste Suave', '#BFDDF0'],
  ['Verdes', 'Verde Pistacho', '#CFE3B4'], ['Verdes', 'Verde Lima', '#A6D043'], ['Verdes', 'Verde Hoja', '#4CA64C'], ['Verdes', 'Verde Esmeralda', '#1E8A5B'],
  ['Verdes', 'Verde Oliva', '#7A7F3A'], ['Verdes', 'Verde Selva', '#24513A'], ['Verdes', 'Verde Salvia', '#9DB59C'], ['Verdes', 'Verde Agua', '#A8DCC9'],
  ['Tierras y cafés', 'Beige Duna', '#D9C3A0'], ['Tierras y cafés', 'Arena del Desierto', '#CDB08A'], ['Tierras y cafés', 'Caramelo', '#C08A4E'],
  ['Tierras y cafés', 'Cuero', '#9A6B3F'], ['Tierras y cafés', 'Chocolate', '#5A3A28'], ['Tierras y cafés', 'Café Espresso', '#3E2A20'],
  ['Tierras y cafés', 'Arcilla', '#B36A4C'], ['Tierras y cafés', 'Canela', '#A5683A'], ['Tierras y cafés', 'Topo', '#8A7A6C'],
];

/** Colores mate de la carta (los que ve Viniltex Advanced Mate): se toman de la paleta por nombre. */
export const COLORES_MATE = [
  'Blanco Nube', 'Marfil', 'Gris Perla', 'Gris Piedra', 'Amarillo Maíz', 'Durazno', 'Rojo Ladrillo', 'Lavanda',
  'Azul Brisa', 'Verde Salvia', 'Beige Duna', 'Topo',
];

/** Colores de fábrica de otras marcas, exclusivos de un producto: [marca, nombre, código, acabado, hex, familia]. */
export const COLORES_FABRICA = [
  ['Colorama', 'Negro Aerosol', 'COL-AER-NEG', 'Brillante', '#141414', 'Grises y negros'],
  ['Colorama', 'Blanco Aerosol', 'COL-AER-BLA', 'Brillante', '#F6F6F4', 'Blancos'],
  ['Colorama', 'Rojo Aerosol', 'COL-AER-ROJ', 'Brillante', '#C4161C', 'Rojos'],
  ['Colorama', 'Azul Aerosol', 'COL-AER-AZU', 'Brillante', '#1B4F9C', 'Azules'],
  ['Colorama', 'Plateado Aerosol', 'COL-AER-PLA', 'Brillante', '#B7BBC0', 'Grises y negros'],
  ['Colorama', 'Negro Mate Aerosol', 'COL-AER-NMA', 'Mate', '#1E1E1E', 'Grises y negros'],
  ['Pintuco', 'Gris Anticorrosivo', 'PIN-ANT-GRI', 'Brillante', '#8B9096', 'Grises y negros'],
  ['Pintuco', 'Rojo Óxido Anticorrosivo', 'PIN-ANT-ROJ', 'Brillante', '#9C3B2A', 'Rojos'],
  ['Colorama', 'Blanco Económico', 'COL-VIN-BLA', 'Brillante', '#F5F4EF', 'Blancos'],
  ['Colorama', 'Blanco Esmalte', 'COL-ESM-BLA', 'Brillante', '#F7F7F5', 'Blancos'],
  ['Colorama', 'Negro Esmalte', 'COL-ESM-NEG', 'Brillante', '#171717', 'Grises y negros'],
  ['Colorama', 'Rojo Colonial', 'COL-ESM-ROJ', 'Brillante', '#A6232B', 'Rojos'],
  ['Colorama', 'Azul Francia', 'COL-ESM-AZU', 'Brillante', '#1F4C9A', 'Azules'],
  ['Colorama', 'Amarillo Tráfico', 'COL-PIS-AMA', 'Brillante', '#F2C200', 'Amarillos'],
  ['Colorama', 'Verde Tablero', 'COL-TAB-VER', 'Mate', '#2F5D46', 'Verdes'],
  ['Colorama', 'Negro Tablero', 'COL-TAB-NEG', 'Mate', '#232526', 'Grises y negros'],
  ['Maderplus', 'Nogal', 'MAD-TIN-NOG', 'Transparente', '#6B4428', 'Tierras y cafés'],
  ['Maderplus', 'Caoba', 'MAD-TIN-CAO', 'Transparente', '#7A3B26', 'Tierras y cafés'],
  ['Maderplus', 'Cedro', 'MAD-TIN-CED', 'Transparente', '#A5663A', 'Tierras y cafés'],
  ['Maderplus', 'Wengué', 'MAD-TIN-WEN', 'Transparente', '#3A2A22', 'Tierras y cafés'],
  ['Maderplus', 'Roble Claro', 'MAD-TIN-ROB', 'Transparente', '#C79B63', 'Tierras y cafés'],
  ['Maderplus', 'Incoloro', 'MAD-INC', 'Transparente', '#FFFFFF', null],
  ['Impermax', 'Terracota Impermeable', 'IMP-TER', 'Brillante', '#B5573B', 'Tierras y cafés'],
  ['Impermax', 'Blanco Reflectivo', 'IMP-BLA', 'Brillante', '#F7F7F5', 'Blancos'],
  ['Impermax', 'Gris Teja', 'IMP-GRI', 'Brillante', '#8C9094', 'Grises y negros'],
];

const TODAS_BASES = ['Pastel', 'Tint', 'Deep', 'Accent'];

/**
 * Productos. `colores`: 'carta' = los de la carta de Pintuco según sus bases y acabados; o una lista de colores de fábrica
 * (marca + nombre) exclusivos del producto. `vars`: [medida, sku, precio COP IVA incluido, existencia].
 */
export const PRODUCTOS = [
  {
    marca: 'Pintuco', linea: 'Viniltex', cat: 'Pinturas', sub: 'Vinilos para muros', nombre: 'Viniltex Advanced Mate',
    desc: 'Vinilo tipo 1 con acabado mate profundo y alta cubrición para muros interiores. Fácil de limpiar y sin olor fuerte.',
    interior: true, exterior: false, resina: 'Base agua', calidad: 1, rend: [38, 44], manos: 2, superficies: ['Paredes y techos'],
    acabados: ['Mate'], bases: TODAS_BASES, colores: 'carta', compl: 'Herramientas y accesorios',
    vars: [['1 galón', 'VIN-ADV-GAL', 92900, 36], ['5 galones', 'VIN-ADV-CUN', 428000, 8]],
    img: ['lata', '#2B6CB0'],
  },
  {
    marca: 'Pintuco', linea: 'Viniltex', cat: 'Pinturas', sub: 'Vinilos para muros', nombre: 'Viniltex Baños y Cocinas',
    desc: 'Vinilo antihongos para zonas húmedas: resiste vapor, grasa y limpieza frecuente.',
    interior: true, exterior: false, resina: 'Base agua', calidad: 1, rend: [35, 40], manos: 2, superficies: ['Paredes y techos'],
    acabados: ['Brillante'], bases: ['Pastel', 'Tint'], colores: 'carta', compl: 'Herramientas y accesorios',
    vars: [['1/4 de galón', 'VIN-BYC-QT', 31900, 22], ['1 galón', 'VIN-BYC-GAL', 98900, 28]],
    img: ['lata', '#2F9E8F'],
  },
  {
    marca: 'Pintuco', linea: 'Koraza', cat: 'Pinturas', sub: 'Pinturas para fachadas', nombre: 'Koraza Elastomérica',
    desc: 'Pintura elastomérica para fachadas: cubre fisuras finas y resiste sol, lluvia y moho por años.',
    interior: false, exterior: true, resina: 'Base agua', calidad: 1, rend: [30, 36], manos: 2, superficies: ['Paredes y techos', 'Cubiertas y terrazas'],
    acabados: ['Brillante'], bases: ['Pastel', 'Tint', 'Deep'], colores: 'carta', compl: 'Impermeabilizantes',
    vars: [['1 galón', 'KOR-ELA-GAL', 119900, 18], ['5 galones', 'KOR-ELA-CUN', 548000, 6]],
    img: ['lata', '#C0392B'],
  },
  {
    marca: 'Pintuco', linea: 'Pintulux', cat: 'Pinturas', sub: 'Anticorrosivos', nombre: 'Pintulux Anticorrosivo Gris',
    desc: 'Anticorrosivo base aceite para proteger metal antes del esmalte. Secado rápido y gran adherencia.',
    interior: true, exterior: true, resina: 'Base aceite', calidad: null, rend: [28, 34], manos: 2, superficies: ['Metal'],
    acabados: ['Brillante'], bases: [], colores: [['Pintuco', 'Gris Anticorrosivo'], ['Pintuco', 'Rojo Óxido Anticorrosivo']], compl: 'Herramientas y accesorios',
    vars: [['1/4 de galón', 'PLX-ANT-QT', 29900, 40], ['1 galón', 'PLX-ANT-GAL', 94900, 24]],
    img: ['lata', '#7F8C8D'],
  },
  {
    marca: 'Colorama', linea: 'Colorama Hogar', cat: 'Pinturas', sub: 'Vinilos para muros', nombre: 'Colorama Vinilo Económico',
    desc: 'Vinilo tipo 3 para repintar muros interiores a buen precio. Rendidor y de fácil aplicación.',
    interior: true, exterior: false, resina: 'Base agua', calidad: 3, rend: [45, 55], manos: 2, superficies: ['Paredes y techos'],
    acabados: [], bases: [], colores: [['Colorama', 'Blanco Económico']], compl: null,
    vars: [['1 galón', 'COL-VIN-GAL', 42900, 60], ['5 galones', 'COL-VIN-CUN', 189000, 14]],
    img: ['cubeta', '#E4572E'],
  },
  {
    marca: 'Colorama', linea: 'Colorama Hogar', cat: 'Pinturas', sub: 'Esmaltes', nombre: 'Colorama Esmalte Sintético',
    desc: 'Esmalte sintético brillante para puertas, rejas y muebles. Acabado duro y resistente al roce.',
    interior: true, exterior: true, resina: 'Base aceite', calidad: 2, rend: [32, 38], manos: 2, superficies: ['Madera', 'Metal'],
    acabados: [], bases: [], colores: [['Colorama', 'Blanco Esmalte'], ['Colorama', 'Negro Esmalte'], ['Colorama', 'Rojo Colonial'], ['Colorama', 'Azul Francia']], compl: 'Herramientas y accesorios',
    vars: [['1/4 de galón', 'COL-ESM-QT', 33900, 30], ['1 galón', 'COL-ESM-GAL', 99900, 20]],
    img: ['lata', '#E4572E'],
  },
  {
    marca: 'Colorama', linea: 'Colorama Pro', cat: 'Pinturas', sub: 'Pinturas para pisos', nombre: 'Pintura de Demarcación y Pisos',
    desc: 'Pintura para pisos de parqueaderos, bodegas y canchas. Soporta tráfico y lavado frecuente.',
    interior: true, exterior: true, resina: 'Base agua', calidad: null, rend: [25, 30], manos: 2, superficies: ['Pisos'],
    acabados: [], bases: [], colores: [['Colorama', 'Amarillo Tráfico']], compl: null,
    vars: [['1 galón', 'COL-PIS-GAL', 104900, 16], ['5 galones', 'COL-PIS-CUN', 489000, 5]],
    img: ['cubeta', '#F2C200'],
  },
  {
    marca: 'Colorama', linea: 'Colorama Pro', cat: 'Pinturas', sub: 'Pinturas especiales', nombre: 'Pintura para Tableros',
    desc: 'Pintura mate para tableros escolares y de oficina. Permite escribir con marcador y borrar sin manchar.',
    interior: true, exterior: false, resina: 'Base agua', calidad: null, rend: [30, 34], manos: 2, superficies: ['Paredes y techos', 'Madera'],
    acabados: [], bases: [], colores: [['Colorama', 'Verde Tablero'], ['Colorama', 'Negro Tablero']], compl: null,
    vars: [['1/4 de galón', 'COL-TAB-QT', 38900, 18]],
    img: ['lata', '#2F5D46'],
  },
  {
    marca: 'Colorama', linea: 'Colorama Hogar', cat: 'Preparación de superficies', sub: 'Estucos y masillas', nombre: 'Estuco Plástico Interiores',
    desc: 'Estuco listo para usar que alisa muros y techos interiores antes de pintar. Lijado fácil.',
    interior: true, exterior: false, resina: 'Base agua', calidad: null, rend: [18, 22], manos: 2, superficies: ['Paredes y techos'],
    acabados: [], bases: [], colores: 'ninguno', compl: 'Herramientas y accesorios',
    vars: [['1 galón', 'COL-EST-GAL', 36900, 45], ['5 galones', 'COL-EST-CUN', 158000, 12]],
    img: ['cubeta', '#9AA5B1'],
  },
  {
    marca: 'Colorama', linea: 'Colorama Pro', cat: 'Preparación de superficies', sub: 'Estucos y masillas', nombre: 'Masilla Acrílica para Exteriores',
    desc: 'Masilla para reparar fisuras y huecos en fachadas. Resiste humedad y no se agrieta.',
    interior: false, exterior: true, resina: 'Base agua', calidad: null, rend: [15, 20], manos: 2, superficies: ['Paredes y techos'],
    acabados: [], bases: [], colores: 'ninguno', compl: 'Herramientas y accesorios',
    vars: [['1 galón', 'COL-MAS-GAL', 44900, 28]],
    img: ['lata', '#C9CED3'],
  },
  {
    marca: 'Colorama', linea: 'Colorama Pro', cat: 'Preparación de superficies', sub: 'Selladores e imprimantes', nombre: 'Sellador Acrílico para Muros',
    desc: 'Sella el poro del muro y mejora la adherencia y el rendimiento de la pintura de acabado.',
    interior: true, exterior: true, resina: 'Base agua', calidad: null, rend: [40, 50], manos: 1, superficies: ['Paredes y techos'],
    acabados: [], bases: [], colores: 'ninguno', compl: 'Pinturas',
    vars: [['1 galón', 'COL-SEL-GAL', 54900, 26], ['5 galones', 'COL-SEL-CUN', 244000, 7]],
    img: ['cubeta', '#4F9DDE'],
  },
  {
    marca: 'Colorama', linea: 'Colorama Pro', cat: 'Preparación de superficies', sub: 'Removedores y limpiadores', nombre: 'Removedor de Pintura en Gel',
    desc: 'Gel removedor para quitar capas de pintura y barniz de madera y metal sin dañar la superficie.',
    interior: true, exterior: true, resina: null, calidad: null, rend: null, manos: null, superficies: ['Madera', 'Metal'],
    acabados: [], bases: [], colores: 'ninguno', compl: null,
    vars: [['1 litro', 'COL-REM-LT', 38900, 20]],
    img: ['botella', '#E67E22'],
  },
  {
    marca: 'Maderplus', linea: 'Maderplus Exterior', cat: 'Maderas', sub: 'Barnices', nombre: 'Barniz Marino Brillante',
    desc: 'Barniz marino de alta protección UV para madera expuesta al sol, la lluvia y la humedad.',
    interior: true, exterior: true, resina: 'Base aceite', calidad: null, rend: [30, 36], manos: 3, superficies: ['Madera'],
    acabados: [], bases: [], colores: [['Maderplus', 'Incoloro']], compl: 'Herramientas y accesorios',
    vars: [['1/4 de galón', 'MAD-BMA-QT', 42900, 24], ['1 galón', 'MAD-BMA-GAL', 139900, 12]],
    img: ['lata', '#B9770E'],
  },
  {
    marca: 'Maderplus', linea: 'Maderplus Exterior', cat: 'Maderas', sub: 'Lacas', nombre: 'Laca Catalizada Brillante',
    desc: 'Laca de dos componentes para muebles y puertas: película dura, brillante y resistente a los rayones.',
    interior: true, exterior: false, resina: 'Base aceite', calidad: null, rend: [28, 34], manos: 3, superficies: ['Madera'],
    acabados: [], bases: [], colores: [['Maderplus', 'Incoloro']], compl: null,
    vars: [['1 galón', 'MAD-LAC-GAL', 154900, 10]],
    img: ['lata', '#8E44AD'],
  },
  {
    marca: 'Maderplus', linea: 'Maderplus Exterior', cat: 'Maderas', sub: 'Tintes e inmunizantes', nombre: 'Tinte para Madera',
    desc: 'Tinte penetrante que realza la veta de la madera. Disponible en cinco tonos de madera natural.',
    interior: true, exterior: false, resina: 'Base aceite', calidad: null, rend: [35, 42], manos: 2, superficies: ['Madera'],
    acabados: [], bases: [], colores: [['Maderplus', 'Nogal'], ['Maderplus', 'Caoba'], ['Maderplus', 'Cedro'], ['Maderplus', 'Wengué'], ['Maderplus', 'Roble Claro']], compl: 'Maderas',
    vars: [['1/4 de galón', 'MAD-TIN-QT', 36900, 32], ['1 galón', 'MAD-TIN-GAL', 118900, 14]],
    img: ['lata', '#6B4428'],
  },
  {
    marca: 'Impermax', linea: 'Impermax Techos', cat: 'Impermeabilizantes', sub: 'Techos y cubiertas', nombre: 'Impermeabilizante Acrílico para Terrazas',
    desc: 'Membrana líquida acrílica para terrazas y cubiertas. Elástica, transitable y fácil de aplicar con brocha o rodillo.',
    interior: false, exterior: true, resina: 'Base agua', calidad: null, rend: [10, 14], manos: 3, superficies: ['Cubiertas y terrazas'],
    acabados: [], bases: [], colores: [['Impermax', 'Terracota Impermeable'], ['Impermax', 'Blanco Reflectivo'], ['Impermax', 'Gris Teja']], compl: 'Herramientas y accesorios',
    vars: [['1 galón', 'IMP-TER-GAL', 89900, 22], ['5 galones', 'IMP-TER-CUN', 399000, 9]],
    img: ['cubeta', '#B5573B'],
  },
  {
    marca: 'Impermax', linea: 'Impermax Techos', cat: 'Impermeabilizantes', sub: 'Muros y fachadas', nombre: 'Impermeabilizante para Muros',
    desc: 'Protege muros y fachadas contra la humedad por filtración y capilaridad. Transpirable.',
    interior: true, exterior: true, resina: 'Base agua', calidad: null, rend: [12, 16], manos: 2, superficies: ['Paredes y techos'],
    acabados: [], bases: [], colores: [['Impermax', 'Blanco Reflectivo']], compl: 'Pinturas',
    vars: [['1 galón', 'IMP-MUR-GAL', 78900, 19]],
    img: ['lata', '#1D6FA5'],
  },
  {
    marca: 'Impermax', linea: 'Impermax Techos', cat: 'Impermeabilizantes', sub: 'Siliconas y sellos de juntas', nombre: 'Silicona Sello de Juntas',
    desc: 'Silicona neutra para sellar juntas, marcos de ventana y uniones. Flexible y resistente a la intemperie.',
    interior: true, exterior: true, resina: null, calidad: null, rend: null, manos: null, superficies: ['Otras superficies'],
    acabados: [], bases: [], colores: 'ninguno', compl: null,
    vars: [['300 ml', 'IMP-SIL-300', 16900, 70]],
    img: ['cartucho', '#1D6FA5'],
  },
  {
    marca: 'Colorama', linea: 'Colorama Hogar', cat: 'Aerosoles', sub: 'Aerosoles multisuperficie', nombre: 'Aerosol Multisuperficie',
    desc: 'Pintura en aerosol de secado rápido para metal, madera, plástico y cerámica. Cinco colores de fábrica.',
    interior: true, exterior: true, resina: 'Base aceite', calidad: null, rend: null, manos: null, superficies: ['Madera', 'Metal', 'Otras superficies'],
    acabados: [], bases: [], colores: [['Colorama', 'Negro Aerosol'], ['Colorama', 'Blanco Aerosol'], ['Colorama', 'Rojo Aerosol'], ['Colorama', 'Azul Aerosol'], ['Colorama', 'Plateado Aerosol']], compl: null,
    vars: [['400 ml', 'COL-AER-400', 18900, 96]],
    img: ['aerosol', '#E4572E'],
  },
  {
    marca: 'Colorama', linea: 'Colorama Pro', cat: 'Aerosoles', sub: 'Aerosoles especiales', nombre: 'Aerosol Alta Temperatura',
    desc: 'Esmalte en aerosol resistente a altas temperaturas para estufas, parrillas, motores y escapes.',
    interior: true, exterior: true, resina: 'Base aceite', calidad: null, rend: null, manos: null, superficies: ['Metal'],
    acabados: [], bases: [], colores: [['Colorama', 'Negro Mate Aerosol']], compl: null,
    vars: [['400 ml', 'COL-AAT-400', 24900, 40]],
    img: ['aerosol', '#2C3E50'],
  },
  {
    marca: 'Goya', linea: null, cat: 'Herramientas y accesorios', sub: 'Brochas', nombre: 'Brocha Profesional de 3 Pulgadas',
    desc: 'Brocha de cerda sintética con mango de madera. No suelta pelo y deja un acabado parejo.',
    interior: false, exterior: false, resina: null, calidad: null, rend: null, manos: null, superficies: [], acabados: [], bases: [], colores: 'ninguno', compl: null,
    vars: [['3 pulgadas', 'GOY-BRO-3', 14900, 80], ['4 pulgadas', 'GOY-BRO-4', 18900, 55]],
    img: ['brocha', '#E4572E', 180],
  },
  {
    marca: 'Goya', linea: null, cat: 'Herramientas y accesorios', sub: 'Brochas', nombre: 'Brocha Angular para Cortes',
    desc: 'Brocha angular para cortar bordes, marcos y esquinas con precisión.',
    interior: false, exterior: false, resina: null, calidad: null, rend: null, manos: null, superficies: [], acabados: [], bases: [], colores: 'ninguno', compl: null,
    vars: [['1,5 pulgadas', 'GOY-ANG-15', 9900, 64]],
    img: ['brocha', '#2B6CB0', 110],
  },
  {
    marca: 'Goya', linea: null, cat: 'Herramientas y accesorios', sub: 'Rodillos', nombre: 'Rodillo de Felpa de 9 Pulgadas',
    desc: 'Rodillo de felpa media para muros lisos y semirrugosos, con armazón reforzado.',
    interior: false, exterior: false, resina: null, calidad: null, rend: null, manos: null, superficies: [], acabados: [], bases: [], colores: 'ninguno', compl: null,
    vars: [['9 pulgadas', 'GOY-ROD-9', 17900, 70]],
    img: ['rodillo', '#E4572E'],
  },
  {
    marca: 'Goya', linea: null, cat: 'Herramientas y accesorios', sub: 'Rodillos', nombre: 'Mini Rodillo de Espuma',
    desc: 'Mini rodillo de espuma para puertas, muebles y detalles. Acabado liso sin burbujas.',
    interior: false, exterior: false, resina: null, calidad: null, rend: null, manos: null, superficies: [], acabados: [], bases: [], colores: 'ninguno', compl: null,
    vars: [['4 pulgadas', 'GOY-MIN-4', 8900, 90]],
    img: ['rodillo', '#2F9E8F', true],
  },
  {
    marca: 'Goya', linea: null, cat: 'Herramientas y accesorios', sub: 'Bandejas y extensiones', nombre: 'Bandeja para Rodillo',
    desc: 'Bandeja plástica con rampa para cargar y escurrir el rodillo. Fácil de limpiar.',
    interior: false, exterior: false, resina: null, calidad: null, rend: null, manos: null, superficies: [], acabados: [], bases: [], colores: 'ninguno', compl: null,
    vars: [['1 unidad', 'GOY-BAN-1', 12900, 48]],
    img: ['bandeja', '#2B6CB0'],
  },
  {
    marca: 'Goya', linea: null, cat: 'Herramientas y accesorios', sub: 'Bandejas y extensiones', nombre: 'Extensión Telescópica para Rodillo',
    desc: 'Extensión metálica de 1 a 2 metros para pintar techos y muros altos sin escalera.',
    interior: false, exterior: false, resina: null, calidad: null, rend: null, manos: null, superficies: [], acabados: [], bases: [], colores: 'ninguno', compl: null,
    vars: [['1 unidad', 'GOY-EXT-1', 29900, 26]],
    img: ['extension', '#E4572E'],
  },
  {
    marca: 'Goya', linea: null, cat: 'Herramientas y accesorios', sub: 'Cintas y protección', nombre: 'Cinta de Enmascarar',
    desc: 'Cinta de papel crepé para proteger bordes y marcos. Se retira limpio sin dejar residuos.',
    interior: false, exterior: false, resina: null, calidad: null, rend: null, manos: null, superficies: [], acabados: [], bases: [], colores: 'ninguno', compl: null,
    vars: [['Rollo de 40 m', 'GOY-CIN-40', 7900, 120]],
    img: ['cinta', '#F2C200'],
  },
  {
    marca: 'Goya', linea: null, cat: 'Herramientas y accesorios', sub: 'Lijas y espátulas', nombre: 'Lija de Agua Grano 220',
    desc: 'Lija al agua para acabados finos en madera, metal y estuco. Hoja de alta duración.',
    interior: false, exterior: false, resina: null, calidad: null, rend: null, manos: null, superficies: [], acabados: [], bases: [], colores: 'ninguno', compl: null,
    vars: [['1 unidad', 'GOY-LIJ-220', 2500, 200]],
    img: ['lija', '#2B6CB0'],
  },
  {
    marca: 'Goya', linea: null, cat: 'Herramientas y accesorios', sub: 'Lijas y espátulas', nombre: 'Espátula de Acero de 3 Pulgadas',
    desc: 'Espátula de hoja flexible para aplicar estuco y masilla y raspar superficies.',
    interior: false, exterior: false, resina: null, calidad: null, rend: null, manos: null, superficies: [], acabados: [], bases: [], colores: 'ninguno', compl: null,
    vars: [['3 pulgadas', 'GOY-ESP-3', 11900, 58]],
    img: ['espatula', '#E4572E'],
  },
];

/** Ventas de ejemplo: nombre del producto → peso (qué tanto se vende). El resto de productos casi no se vende. */
export const POPULARIDAD = {
  'Viniltex Ultralavable': 10, 'Koraza Sol & Lluvia': 8, 'Viniltex Advanced Mate': 7, 'Colorama Vinilo Económico': 6,
  'Rodillo de Felpa de 9 Pulgadas': 6, 'Brocha Profesional de 3 Pulgadas': 5, 'Cinta de Enmascarar': 5, 'Estuco Plástico Interiores': 4,
  'Impermeabilizante Acrílico para Terrazas': 4, 'Aerosol Multisuperficie': 4, 'Koraza Elastomérica': 3, 'Pintulux 3 en 1': 3,
  'Sellador Acrílico para Muros': 3, 'Barniz Marino Brillante': 2, 'Lija de Agua Grano 220': 3, 'Bandeja para Rodillo': 2,
};
