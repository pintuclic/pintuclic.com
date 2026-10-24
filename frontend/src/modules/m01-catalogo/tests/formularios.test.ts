import { describe, expect, it } from 'vitest';
import type { FormColor, FormProducto, FormVariante } from '../dtos/formularios.dto';
import {
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
import { formColorSchema, formMedidaSchema, formProductoSchema } from '../dtos/formularios.dto';
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
  patrocinado: false,
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

  it('variante: precio con coma, existencia y SKU opcionales', () => {
    const f: FormVariante = {
      idTipoMedida: '1',
      idMedida: '4',
      precio: '98900',
      sku: '',
      existenciaReferencial: '',
      codigoProveedor: '',
    };
    expect(aCuerpoVariante(f)).toEqual({
      ok: true,
      valor: { idMedida: 4, precio: 98900, existenciaReferencial: 0, codigoProveedor: null },
    });
    expect(aCuerpoVariante({ ...f, precio: '10,5', sku: 'AB-1', existenciaReferencial: '7' })).toMatchObject({
      ok: true,
      valor: { precio: 10.5, sku: 'AB-1', existenciaReferencial: 7 },
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
      claseColor: 'entonable',
      estado: 'activo',
      publicado: false,
      patrocinado: false,
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
