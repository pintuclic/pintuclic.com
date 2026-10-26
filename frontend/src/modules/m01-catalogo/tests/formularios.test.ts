import { describe, expect, it } from 'vitest';
import type { FormColor, FormCombo, FormProducto, FormVariante } from '../dtos/formularios.dto';
import {
  aCuerpoCombo,
  aCuerpoComboEditado,
  existenciaInicialDe,
  formDeCombo,
  aCuerpoColor,
  aCuerpoColorEditado,
  aCuerpoMedida,
  aCuerpoProducto,
  aCuerpoProductoEditado,
  aCuerpoSimple,
  aCuerpoTipoMedida,
  aCuerpoVariante,
  aCuerpoVarianteEditada,
  formDesdeProducto,
  type RelacionesProductoForm,
} from '../services/formularios';
import { formColorSchema, formComboSchema, formMedidaSchema, formProductoSchema } from '../dtos/formularios.dto';
import type { Combo } from '../dtos/m01-catalogo-entrega3.dto';
import type { ProductoDetalle } from '../dtos/m01-catalogo-productos.dto';

const colorBase: FormColor = {
  idMarca: '3',
  nombre: ' Rojo ',
  codigo: '',
  hexadecimal: '#d7263d',
  idBase: '',
  idAcabado: '',
  idFamiliaColor: '',
};
const productoBase: FormProducto = {
  idMarca: '1',
  idLinea: '2',
  idCategoria: '',
  idSubcategoria: '5',
  nombre: 'Viniltex',
  descripcion: '',
  usoInterior: true,
  usoExterior: false,
  idCategoriaComplementaria: '',
  conFicha: true,
  idTipoResina: '4',
  tipoCalidad: '1',
  rendimientoMin: '20',
  rendimientoMax: '30,5',
  manos: '',
};
const relBase: RelacionesProductoForm = {
  idsSuperficies: [1],
  idsAcabados: [2],
  idsBases: [3],
  idsColoresFabrica: [],
  caracteristicas: [
    { nombre: ' Secado ', valor: '2 h' },
    { nombre: '', valor: '' },
  ],
};

describe('M01 · formularios → cuerpos del contrato', () => {
  it('catálogo simple: nombre recortado y orden solo si se escribió', () => {
    expect(aCuerpoSimple({ nombre: ' Madera ', orden: '' })).toEqual({ nombre: 'Madera' });
    expect(aCuerpoSimple({ nombre: 'Madera', orden: '3' })).toEqual({ nombre: 'Madera', orden: 3 });
  });

  it('tipo de medida y medida convierten números con coma', () => {
    expect(aCuerpoTipoMedida({ nombre: 'Litro', abreviatura: 'L', equivalenciaGalones: '0,264172' })).toEqual({
      nombre: 'Litro',
      abreviatura: 'L',
      equivalenciaGalones: 0.264172,
    });
    expect(
      aCuerpoTipoMedida({ nombre: 'Metro', abreviatura: 'm', equivalenciaGalones: '' }).equivalenciaGalones,
    ).toBeNull();
    expect(aCuerpoMedida({ idTipoMedida: '2', valor: '3,78' })).toEqual({ idTipoMedida: 2, valor: 3.78 });
    expect(formMedidaSchema.safeParse({ idTipoMedida: '2', valor: '0' }).success).toBe(false);
    expect(formMedidaSchema.safeParse({ idTipoMedida: '2', valor: 'abc' }).success).toBe(false);
  });

  it('color: sin base ni acabado ni familia deja que el servidor decida (C2, C3, C4)', () => {
    const r = aCuerpoColor(colorBase);
    expect(r).toEqual({
      ok: true,
      valor: { idMarca: 3, nombre: 'Rojo', codigo: null, hexadecimal: '#d7263d', idBase: null },
    });
    const completo = aCuerpoColor({ ...colorBase, idBase: '7', idAcabado: '2', idFamiliaColor: '9', codigo: ' A1 ' });
    expect(completo).toMatchObject({ ok: true, valor: { idBase: 7, idAcabado: 2, idFamiliaColor: 9, codigo: 'A1' } });
  });

  it('color: rechaza con el mensaje del contrato un hexadecimal inválido', () => {
    expect(formColorSchema.safeParse({ ...colorBase, hexadecimal: 'rojo' }).success).toBe(false);
    const r = aCuerpoColor({ ...colorBase, hexadecimal: '#12' });
    expect(r.ok).toBe(false);
  });

  it('color editado: limpiar la base y la familia envía null; la marca no viaja', () => {
    const r = aCuerpoColorEditado({ ...colorBase, idBase: '', idFamiliaColor: '' });
    expect(r).toMatchObject({ ok: true, valor: { idBase: null, idFamiliaColor: null } });
    expect(r.ok && 'idMarca' in r.valor).toBe(false);
  });

  it('variante: precio con coma y SKU opcional', () => {
    const f: FormVariante = {
      idTipoMedida: '1',
      idMedida: '4',
      precio: '98900',
      sku: '',
      codigoProveedor: '',
    };
    expect(aCuerpoVariante(f)).toEqual({
      ok: true,
      valor: { idMedida: 4, precio: 98900, codigoProveedor: null },
    });
    expect(aCuerpoVariante({ ...f, precio: '10,5', sku: 'AB-1' })).toMatchObject({
      ok: true,
      valor: { precio: 10.5, sku: 'AB-1' },
    });
    expect(aCuerpoVariante({ ...f, precio: '10,123' }).ok).toBe(false);
    expect(aCuerpoVariante({ ...f, sku: 'con espacio' }).ok).toBe(false);
    expect(aCuerpoVarianteEditada({ ...f, sku: 'X-1' })).toMatchObject({
      ok: true,
      valor: { sku: 'X-1', precio: 98900 },
    });
  });

  it('producto con ficha: arma el cuerpo completo y descarta las características vacías', () => {
    const r = aCuerpoProducto(productoBase, relBase);
    expect(r).toMatchObject({
      ok: true,
      valor: {
        idMarca: 1,
        idLinea: 2,
        idSubcategoria: 5,
        nombre: 'Viniltex',
        descripcion: null,
        ficha: { idTipoResina: 4, tipoCalidad: 1, rendimientoMin: 20, rendimientoMax: 30.5 },
        idsSuperficies: [1],
        idsAcabados: [2],
        idsBases: [3],
        caracteristicas: [{ nombre: 'Secado', valor: '2 h', orden: 0 }],
      },
    });
  });

  it('el interruptor «patrocinado» ya no existe: ni el producto ni el combo lo envían (el patrocinio es de M14)', () => {
    const producto = aCuerpoProducto(productoBase, relBase);
    expect(producto.ok && 'patrocinado' in producto.valor).toBe(false);
    const editado = aCuerpoProductoEditado(productoBase, relBase);
    expect(editado.ok && 'patrocinado' in editado.valor).toBe(false);
  });

  it('producto sin ficha: acabados, bases y colores de fábrica no viajan (P2) y la línea es opcional', () => {
    const r = aCuerpoProducto({ ...productoBase, conFicha: false, idLinea: '' }, relBase);
    expect(r).toMatchObject({ ok: true, valor: { ficha: null, idLinea: null, idsAcabados: [], idsBases: [] } });
  });

  it('dice qué falta por elegir, nunca un error genérico de número (antes: "expected number, received NaN")', () => {
    expect(aCuerpoProducto({ ...productoBase, idTipoResina: '' }, relBase)).toEqual({
      ok: false,
      mensaje: 'Elija el tipo de resina.',
    });
    expect(aCuerpoProducto({ ...productoBase, idLinea: '' }, relBase)).toEqual({
      ok: false,
      mensaje: 'Elija la línea: los recubrimientos la exigen.',
    });
    expect(aCuerpoProducto({ ...productoBase, idSubcategoria: '' }, relBase)).toEqual({
      ok: false,
      mensaje: 'Elija la subcategoría.',
    });
    expect(aCuerpoProducto({ ...productoBase, idMarca: '' }, relBase)).toEqual({
      ok: false,
      mensaje: 'Elija la marca.',
    });
    expect(aCuerpoProducto(productoBase, { ...relBase, idsSuperficies: [] })).toEqual({
      ok: false,
      mensaje: 'Elija al menos una superficie donde se aplica.',
    });
    // Un accesorio (sin ficha) no exige resina, línea ni superficie.
    expect(
      aCuerpoProducto(
        { ...productoBase, conFicha: false, idLinea: '', idTipoResina: '' },
        { ...relBase, idsSuperficies: [] },
      ).ok,
    ).toBe(true);
  });

  it('reporta las reglas del contrato que dependen de varios campos', () => {
    expect(aCuerpoProducto(productoBase, { ...relBase, idsAcabados: [] })).toEqual({
      ok: false,
      mensaje: 'Un producto con bases necesita al menos un acabado',
    });
    expect(aCuerpoProducto({ ...productoBase, rendimientoMax: '' }, relBase).ok).toBe(false);
    expect(aCuerpoProducto({ ...productoBase, rendimientoMin: '40' }, relBase).ok).toBe(false);
    expect(formProductoSchema.safeParse({ ...productoBase, nombre: '' }).success).toBe(false);
  });

  it('el formulario marca cada campo obligatorio en su sitio', () => {
    const r = formProductoSchema.safeParse({ ...productoBase, idSubcategoria: '', idTipoResina: '', idLinea: '' });
    expect(r.success).toBe(false);
    const mensajes = Object.fromEntries((r.error?.issues ?? []).map((i) => [String(i.path[0]), i.message]));
    expect(mensajes).toEqual({
      idSubcategoria: 'Elija la subcategoría',
      idTipoResina: 'Elija el tipo de resina',
      idLinea: 'Elija la línea: los recubrimientos la exigen',
    });
    // Sin ficha, solo la subcategoría es obligatoria.
    const sinFicha = formProductoSchema.safeParse({ ...productoBase, conFicha: false, idTipoResina: '', idLinea: '' });
    expect(sinFicha.success).toBe(true);
  });

  it('manos: de 1 a 10 y solo junto con el rendimiento', () => {
    const campo = (extra: Partial<FormProducto>) =>
      formProductoSchema
        .safeParse({ ...productoBase, ...extra })
        .error?.issues.map((i) => `${String(i.path[0])}: ${i.message}`);
    expect(formProductoSchema.safeParse({ ...productoBase, manos: '2' }).success).toBe(true);
    expect(campo({ manos: '0' })).toEqual(['manos: Las manos van de 1 a 10']);
    expect(campo({ manos: '11' })).toEqual(['manos: Las manos van de 1 a 10']);
    expect(campo({ manos: '1,5' })).toContain('manos: Las manos son un número entero');
    expect(campo({ manos: '2', rendimientoMin: '', rendimientoMax: '' })).toEqual([
      'manos: Las manos se indican junto con el rendimiento',
    ]);
    expect(aCuerpoProducto({ ...productoBase, manos: '2' }, relBase)).toMatchObject({
      ok: true,
      valor: { ficha: { manos: 2 } },
    });
    expect(aCuerpoProducto(productoBase, relBase)).toMatchObject({ ok: true, valor: { ficha: { manos: null } } });
  });

  it('producto editado no envía la marca y puede retirar la ficha en un solo paso', () => {
    const r = aCuerpoProductoEditado({ ...productoBase, conFicha: false, idLinea: '' }, relBase);
    expect(r.ok).toBe(true);
    expect(r.ok && 'idMarca' in r.valor).toBe(false);
    expect(r).toMatchObject({ valor: { ficha: null, idLinea: null, idsBases: [], idsAcabados: [] } });
  });

  it('formDesdeProducto es el inverso de aCuerpoProductoEditado', () => {
    const detalle: ProductoDetalle = {
      idProducto: 9,
      nombre: 'Viniltex',
      idMarca: 1,
      marca: 'Pintuco',
      idLinea: 2,
      linea: 'Viniltex',
      idSubcategoria: 5,
      subcategoria: 'Vinilos',
      categoria: 'Pinturas',
      usoInterior: true,
      usoExterior: false,
      esCombo: false,
      excluidoDeDescuentos: false,
      claseColor: 'entonable',
      estado: 'activo',
      publicado: false,
      variantesActivas: 0,
      descripcion: null,
      idCategoriaComplementaria: null,
      ficha: {
        idTipoResina: 4,
        tipoResina: 'Vinílica',
        tipoCalidad: 1,
        rendimientoMin: 20,
        rendimientoMax: 30.5,
        manos: 2,
      },
      superficies: [{ id: 1, nombre: 'Muros' }],
      acabados: [{ id: 2, nombre: 'Mate' }],
      bases: [{ id: 3, nombre: 'Tint' }],
      coloresFabrica: [],
      caracteristicas: [{ nombre: 'Secado', valor: '2 h', orden: 0 }],
      imagenes: [],
      variantes: [],
    };
    const { form, relaciones } = formDesdeProducto(detalle);
    expect(form).toEqual({ ...productoBase, rendimientoMax: '30.5', manos: '2' });
    expect(relaciones.idsBases).toEqual([3]);
    expect(aCuerpoProductoEditado(form, relaciones)).toMatchObject({
      ok: true,
      valor: {
        ficha: { idTipoResina: 4, rendimientoMax: 30.5 },
        caracteristicas: [{ nombre: 'Secado', valor: '2 h', orden: 0 }],
      },
    });
  });
});

describe('M01 · formulario de combos (entrega 3)', () => {
  const f: FormCombo = {
    nombre: '  Combo 3 brochas ',
    idMarca: '1',
    idSubcategoria: '4',
    idMedida: '7',
    precio: '59.900',
    sku: '',
    descripcion: '',
    excluidoDeDescuentos: true,
    idCategoriaComplementaria: '',
    existenciaInicial: '',
  };

  it('el combo tampoco envía «patrocinado»', () => {
    const r = aCuerpoCombo({ ...f, precio: '59900' });
    expect(r.ok && 'patrocinado' in r.valor).toBe(false);
  });

  it('arma el cuerpo de alta: sin SKU ni descripción vacíos y con las banderas', () => {
    expect(aCuerpoCombo({ ...f, precio: '59900' })).toEqual({
      ok: true,
      valor: {
        idMarca: 1,
        idSubcategoria: 4,
        nombre: 'Combo 3 brochas',
        descripcion: null,
        idMedida: 7,
        precio: 59900,
        excluidoDeDescuentos: true,
        idCategoriaComplementaria: null,
      },
    });
    expect(aCuerpoCombo({ ...f, precio: '10,5', sku: ' CB-1 ', idCategoriaComplementaria: '3' })).toMatchObject({
      ok: true,
      valor: { precio: 10.5, sku: 'CB-1', idCategoriaComplementaria: 3 },
    });
  });

  it('rechaza precios y SKU inválidos con el mensaje del contrato', () => {
    expect(aCuerpoCombo({ ...f, precio: '10,123' }).ok).toBe(false);
    expect(aCuerpoCombo({ ...f, precio: '59900', sku: 'con espacio' }).ok).toBe(false);
  });

  it('la edición no envía la marca ni la medida (no cambian)', () => {
    const r = aCuerpoComboEditado({ ...f, precio: '59900', sku: 'CB-1' });
    expect(r.ok).toBe(true);
    expect(r.ok && ('idMarca' in r.valor || 'idMedida' in r.valor)).toBe(false);
    expect(r).toMatchObject({ valor: { precio: 59900, sku: 'CB-1', idSubcategoria: 4, descripcion: null } });
  });

  it('formDeCombo es el inverso de la edición', () => {
    const combo: Combo = {
      idProducto: 9,
      idVariante: 11,
      nombre: 'Combo',
      descripcion: null,
      idMarca: 1,
      marca: 'Pintuco',
      idSubcategoria: 4,
      subcategoria: 'Brochas',
      idCategoriaComplementaria: 2,
      excluidoDeDescuentos: false,
      idMedida: 7,
      medida: '1 unidad',
      sku: 'P9-V11',
      precio: 59900,
      existenciaReferencial: 0,
      disponibilidad: 'agotado',
      estado: 'activo',
      publicado: false,
      cantidadImagenes: 0,
    };
    const form = formDeCombo(combo);
    expect(form).toMatchObject({ idMarca: '1', idMedida: '7', precio: '59900', idCategoriaComplementaria: '2' });
    expect(aCuerpoComboEditado(form)).toMatchObject({
      ok: true,
      valor: { nombre: 'Combo', precio: 59900, sku: 'P9-V11', idCategoriaComplementaria: 2 },
    });
  });

  it('la existencia inicial es opcional y entera', () => {
    expect(existenciaInicialDe(f)).toBeNull();
    expect(existenciaInicialDe({ ...f, existenciaInicial: ' 12 ' })).toBe(12);
    expect(formComboSchema.safeParse({ ...f, precio: '59900', existenciaInicial: '1,5' }).success).toBe(false);
    expect(formComboSchema.safeParse({ ...f, precio: '59900', existenciaInicial: '' }).success).toBe(true);
  });

  it('exige nombre, marca, subcategoría, unidad y precio', () => {
    for (const campo of ['nombre', 'idMarca', 'idSubcategoria', 'idMedida', 'precio'] as const) {
      expect(formComboSchema.safeParse({ ...f, precio: '59900', [campo]: '' }).success).toBe(false);
    }
  });
});
