import { describe, expect, it } from 'vitest';
import { ESTADOS_LINEA, ESTADOS_MARCA } from '../dtos/m09-cumplimiento.dto';
import {
  AVISO_AVANZO,
  AVISO_AVANZO_PREPARADA,
  AVISO_PASO_AUTOMATICO,
  avisoDeAvance,
  avisoDelEstado,
  ETIQUETA_ESTADO_LINEA,
  hayProductosConProblema,
  hayProductosSinStock,
  MARCAS,
  marcasDisponibles,
  motivoDeCancelacion,
  puedePedirCancelacion,
  resumenAvance,
  varianteLinea,
} from '../services/presentacion';
import { lineaVerificacion, verificacion } from './fixtures';

describe('presentación de M09', () => {
  it('toda línea tiene una etiqueta legible y una variante, y las marcas coinciden con las del contrato', () => {
    for (const estado of ESTADOS_LINEA) {
      expect(ETIQUETA_ESTADO_LINEA[estado].length).toBeGreaterThan(0);
      expect(varianteLinea(estado)).toBeTruthy();
    }
    expect(MARCAS.map((m) => m.valor)).toEqual([...ESTADOS_MARCA]);
  });

  it('«sin revisar» y los estados heredados del pedido no son marcas que se puedan elegir', () => {
    const valores = MARCAS.map((m) => m.valor as string);
    for (const noMarca of ['pendiente', 'despachada', 'entregada', 'cancelada', 'devuelta']) expect(valores).not.toContain(noMarca);
  });

  it('cada estado de línea se distingue por algo más que el color: tiene su propio texto', () => {
    const textos = ESTADOS_LINEA.map((e) => ETIQUETA_ESTADO_LINEA[e]);
    expect(new Set(textos).size).toBe(ESTADOS_LINEA.length);
    expect(varianteLinea('disponible')).toBe('success');
    expect(varianteLinea('preparada')).toBe('success');
    expect(varianteLinea('consiguiendo_stock')).toBe('sponsored');
    expect(varianteLinea('no_disponible')).toBe('danger');
    expect(varianteLinea('pendiente')).toBe('neutral');
  });

  describe('qué opciones se ofrecen en cada línea', () => {
    const valores = (...args: Parameters<typeof marcasDisponibles>) => marcasDisponibles(...args).map((m) => m.valor);

    it('en revisión, las tres de disponibilidad: no se puede preparar antes de confirmar', () => {
      expect(valores('revision_disponibilidad', 'pendiente')).toEqual(['disponible', 'consiguiendo_stock', 'no_disponible']);
    });

    it('ya en preparación, solo «Disponible» y «Preparada»: lo que se hace a diario', () => {
      expect(valores('en_preparacion', 'disponible')).toEqual(['disponible', 'preparada']);
      expect(valores('en_preparacion', 'preparada')).toEqual(['disponible', 'preparada']);
      expect(valores('preparada', 'preparada')).toEqual(['disponible', 'preparada']);
    });

    it('si una línea tiene un problema, se ofrecen todas para poder corregirla', () => {
      expect(valores('en_preparacion', 'no_disponible')).toEqual(['disponible', 'consiguiendo_stock', 'no_disponible', 'preparada']);
      expect(valores('preparada', 'consiguiendo_stock')).toEqual(['disponible', 'consiguiendo_stock', 'no_disponible', 'preparada']);
    });
  });

  describe('el resumen de avance', () => {
    it('en revisión cuenta los productos disponibles, con singular y plural', () => {
      const dos = [lineaVerificacion({ estado: 'disponible' }), lineaVerificacion({ numeroLinea: 2 })];
      expect(resumenAvance(verificacion(dos))).toBe('1 de 2 productos disponibles');
      expect(resumenAvance(verificacion([lineaVerificacion({ estado: 'disponible' })]))).toBe('1 de 1 producto disponible');
      expect(resumenAvance(verificacion([lineaVerificacion()]))).toBe('0 de 1 producto disponible');
    });

    it('ya en preparación cuenta los preparados', () => {
      const lineas = [lineaVerificacion({ estado: 'preparada' }), lineaVerificacion({ numeroLinea: 2, estado: 'disponible' })];
      expect(resumenAvance(verificacion(lineas, { estado: 'en_preparacion' }))).toBe('1 de 2 productos preparados');
      expect(resumenAvance(verificacion([lineaVerificacion({ estado: 'preparada' })], { estado: 'preparada' }))).toBe('1 de 1 producto preparado');
    });
  });

  it('explica el paso automático de cada fase y avisa que corregir no devuelve el pedido', () => {
    expect(avisoDelEstado('revision_disponibilidad')).toBe(AVISO_PASO_AUTOMATICO);
    expect(avisoDelEstado('en_preparacion')).toContain('preparados');
    expect(avisoDelEstado('en_preparacion')).toContain('no vuelve atrás');
    expect(avisoDelEstado('preparada')).toContain('no vuelve atrás');
  });

  it('el aviso de avance dice a dónde pasó el pedido', () => {
    expect(avisoDeAvance('en_preparacion')).toBe(AVISO_AVANZO);
    expect(avisoDeAvance('preparada')).toBe(AVISO_AVANZO_PREPARADA);
  });

  describe('cuándo hay que resolver algo con el cliente (R19, R18)', () => {
    const lineas = (...estados: Array<'disponible' | 'consiguiendo_stock' | 'no_disponible' | 'pendiente'>) =>
      estados.map((estado, i) => lineaVerificacion({ numeroLinea: i + 1, estado }));

    it('contactar se ofrece con un producto que se consigue o que no hay; con todo en orden, nada', () => {
      expect(hayProductosConProblema(lineas('disponible', 'pendiente'))).toBe(false);
      expect(hayProductosConProblema(lineas('disponible', 'consiguiendo_stock'))).toBe(true);
      expect(hayProductosConProblema(lineas('no_disponible'))).toBe(true);
    });

    it('cancelar exige un producto que no hay, no basta con que se esté consiguiendo', () => {
      expect(hayProductosSinStock(lineas('consiguiendo_stock'))).toBe(false);
      expect(hayProductosSinStock(lineas('disponible', 'no_disponible'))).toBe(true);
    });

    it('solo se puede pedir con el pedido en revisión o preparación y sin otra cancelación en trámite', () => {
      const sinStock = lineas('no_disponible');
      expect(puedePedirCancelacion(verificacion(sinStock))).toBe(true);
      expect(puedePedirCancelacion(verificacion(sinStock, { estado: 'en_preparacion' }))).toBe(true);
      expect(puedePedirCancelacion(verificacion(sinStock, { estado: 'preparada' }))).toBe(false);
      expect(puedePedirCancelacion(verificacion(sinStock, { estado: 'despachado' }))).toBe(false);
      expect(
        puedePedirCancelacion(
          verificacion(sinStock, { cancelacion: { codigo: 'DEV-2026-00012', estado: 'solicitada', iniciadaPor: 'tienda', fecha: '2026-10-31T10:00:00.000Z' } }),
        ),
      ).toBe(false);
    });
  });

  describe('el texto de la cancelación que ve el empleado antes de confirmar (R18)', () => {
    const lineas = [
      lineaVerificacion({ numeroLinea: 1, nombreProducto: 'Vinilo Blanco', varianteCopia: 'Galón', cantidad: 2, estado: 'no_disponible' }),
      lineaVerificacion({ numeroLinea: 2, nombreProducto: 'Brocha', varianteCopia: 'Unidad', cantidad: 1, estado: 'disponible' }),
      lineaVerificacion({ numeroLinea: 3, nombreProducto: 'Rodillo', varianteCopia: 'Unidad', cantidad: 1, estado: 'no_disponible' }),
    ];

    it('nombra solo los productos que no hay, con cantidad en singular o plural', () => {
      expect(motivoDeCancelacion(lineas, '')).toBe('Sin existencias de: Vinilo Blanco, Galón (2 unidades); Rodillo, Unidad (1 unidad).');
    });

    it('añade la nota en una línea aparte, recortada, y una nota en blanco no añade nada', () => {
      expect(motivoDeCancelacion(lineas, '  Llega a fin de mes ')).toContain('\nNota: Llega a fin de mes');
      expect(motivoDeCancelacion(lineas, '   ')).not.toContain('Nota:');
      expect(motivoDeCancelacion(lineas, 'x'.repeat(400)).split('\nNota: ')[1]).toHaveLength(300);
    });
  });

  it('los textos de la interfaz no mencionan códigos de historia, reglas ni el contrato', () => {
    const todos = [
      ...Object.values(ETIQUETA_ESTADO_LINEA),
      ...MARCAS.map((m) => m.etiqueta),
      AVISO_PASO_AUTOMATICO,
      avisoDelEstado('en_preparacion'),
      avisoDelEstado('preparada'),
      AVISO_AVANZO,
      AVISO_AVANZO_PREPARADA,
    ];
    for (const texto of todos) expect(texto).not.toMatch(/HU-|RF-|R\d|contrato|M09/);
  });
});
