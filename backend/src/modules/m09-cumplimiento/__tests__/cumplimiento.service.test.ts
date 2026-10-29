import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  hojaResponseEnvelopeSchema,
  MOTIVO_AVANCE_AUTOMATICO,
  retenidasResponseEnvelopeSchema,
  verificacionResponseEnvelopeSchema,
  verificarLineasResponseEnvelopeSchema,
  type EstadoMarca,
  type EstadoOrden,
} from '../dtos/m09-cumplimiento.dto';
import { CumplimientoService } from '../services/cumplimiento.service';
import { AHORA, linea, ordenDe, RepoMemoria } from './repo-memoria';

const CODIGO = 'PC-2026-00001';
const EMPLEADO = { idUsuario: 21 };

function marcas(...pares: Array<[number, EstadoMarca]>) {
  return { lineas: pares.map(([numeroLinea, estado]) => ({ numeroLinea, estado })) };
}

describe('CumplimientoService (HU-CUM-01, 03, 05 y 06)', () => {
  let repo: RepoMemoria;
  let eventos: { emitirCambioEstado: ReturnType<typeof vi.fn> };
  let servicio: CumplimientoService;

  beforeEach(() => {
    repo = new RepoMemoria();
    eventos = { emitirCambioEstado: vi.fn().mockResolvedValue(undefined) };
    servicio = new CumplimientoService(repo, eventos, { ahora: () => AHORA });
    repo.cargar(ordenDe(CODIGO, 'revision_disponibilidad'));
  });

  function estadoDeLaOrden(): EstadoOrden | undefined {
    return repo.ordenes.get(CODIGO)?.estado;
  }

  describe('lista de chequeo (HU-CUM-01)', () => {
    it('una orden sin marcas muestra todas sus líneas pendientes, con base y color de las entonadas (CA-CUM-01-06)', async () => {
      const v = await servicio.verificacion(CODIGO);

      expect(verificacionResponseEnvelopeSchema.safeParse({ success: true, data: v }).success).toBe(true);
      expect(v).toMatchObject({ codigo: CODIGO, estado: 'revision_disponibilidad', lineasSinConfirmar: 3, completa: false });
      expect(v.lineas.map((l) => l.estado)).toEqual(['pendiente', 'pendiente', 'pendiente']);
      expect(v.lineas[0]).toMatchObject({ numeroLinea: 1, esEntonado: true, baseConsumida: 'Base Deep 1 gal', colorSolicitado: 'Rojo Colonial', cantidad: 2 });
      expect(v.lineas[1]?.baseConsumida).toBeNull();
    });

    it('marcar una línea la deja disponible con su autor y momento, sin mover la orden (CA-CUM-01-01)', async () => {
      const r = await servicio.marcar(CODIGO, marcas([2, 'disponible']), EMPLEADO);

      expect(r.avanzo).toBe(false);
      expect(r.verificacion.lineas[1]).toMatchObject({ estado: 'disponible', historial: [{ estado: 'disponible', autor: 'Luis Gómez' }] });
      expect(r.verificacion.lineasSinConfirmar).toBe(2);
      expect(estadoDeLaOrden()).toBe('revision_disponibilidad');
      expect(repo.historial).toHaveLength(0);
      expect(eventos.emitirCambioEstado).not.toHaveBeenCalled();
    });

    it('es incremental: lo marcado persiste entre peticiones y se puede seguir después (CA-CUM-01-08)', async () => {
      await servicio.marcar(CODIGO, marcas([1, 'disponible']), EMPLEADO);
      const intermedia = await servicio.verificacion(CODIGO);
      expect(intermedia.lineas.map((l) => l.estado)).toEqual(['disponible', 'pendiente', 'pendiente']);

      await servicio.marcar(CODIGO, marcas([2, 'disponible']), EMPLEADO);
      const final = await servicio.marcar(CODIGO, marcas([3, 'disponible']), EMPLEADO);

      expect(final.avanzo).toBe(true);
    });

    it.each<EstadoMarca>(['consiguiendo_stock', 'no_disponible'])(
      'una línea %s deja la orden en revisión aunque las demás estén disponibles (R7)',
      async (estado) => {
        const r = await servicio.marcar(CODIGO, marcas([1, estado], [2, 'disponible'], [3, 'disponible']), EMPLEADO);

        expect(r.avanzo).toBe(false);
        expect(r.verificacion).toMatchObject({ completa: false, lineasSinConfirmar: 1 });
        expect(estadoDeLaOrden()).toBe('revision_disponibilidad');
      },
    );

    it('marcar lo que ya está así no escribe nada (R3)', async () => {
      await servicio.marcar(CODIGO, marcas([1, 'disponible']), EMPLEADO);
      const escrituras = repo.escrituras;

      const r = await servicio.marcar(CODIGO, marcas([1, 'disponible']), EMPLEADO);

      expect(repo.escrituras).toBe(escrituras);
      expect(r.verificacion.lineas[0]?.historial).toHaveLength(1);
    });

    it('corregir conserva el registro anterior con su autor y su momento (CA-CUM-01-04)', async () => {
      await servicio.marcar(CODIGO, marcas([1, 'disponible']), EMPLEADO);

      const r = await servicio.marcar(CODIGO, marcas([1, 'consiguiendo_stock']), { idUsuario: 22 });

      expect(r.verificacion.lineas[0]?.estado).toBe('consiguiendo_stock');
      expect(r.verificacion.lineas[0]?.historial.map((h) => [h.estado, h.autor])).toEqual([
        ['disponible', 'Luis Gómez'],
        ['consiguiendo_stock', 'Marta Ruiz'],
      ]);
    });

    it('una línea no se puede volver a poner pendiente: se corrige con otra marca (R2)', async () => {
      await servicio.marcar(CODIGO, marcas([1, 'disponible']), EMPLEADO);
      const r = await servicio.marcar(CODIGO, marcas([1, 'no_disponible']), EMPLEADO);

      expect(r.verificacion.lineas[0]?.estado).toBe('no_disponible');
    });

    it('una línea que la orden no tiene responde 400 y no guarda NINGUNA de las marcas de la petición', async () => {
      await expect(servicio.marcar(CODIGO, marcas([1, 'disponible'], [9, 'disponible']), EMPLEADO)).rejects.toMatchObject({
        codigo: 'PARAMETRO_INVALIDO',
        statusCode: 400,
        details: { lineasInexistentes: [9] },
      });

      expect(repo.ordenes.get(CODIGO)?.lineas[0]?.registros).toHaveLength(0);
    });

    it('una orden inexistente responde RECURSO_NO_DISPONIBLE (404)', async () => {
      await expect(servicio.verificacion('PC-2026-99999')).rejects.toMatchObject({ codigo: 'RECURSO_NO_DISPONIBLE', statusCode: 404 });
      await expect(servicio.marcar('PC-2026-99999', marcas([1, 'disponible']), EMPLEADO)).rejects.toMatchObject({ statusCode: 404 });
      await expect(servicio.hoja('PC-2026-99999')).rejects.toMatchObject({ statusCode: 404 });
    });

    it.each<EstadoOrden>(['orden_confirmada', 'despachado', 'entregado', 'cancelado', 'devuelto'])(
      'una orden en %s responde ORDEN_FUERA_DE_CUMPLIMIENTO en las tres operaciones (R4)',
      async (estado) => {
        repo.cargar(ordenDe('PC-2026-00002', estado));

        await expect(servicio.verificacion('PC-2026-00002')).rejects.toMatchObject({ codigo: 'ORDEN_FUERA_DE_CUMPLIMIENTO', statusCode: 409 });
        await expect(servicio.marcar('PC-2026-00002', marcas([1, 'disponible']), EMPLEADO)).rejects.toMatchObject({ statusCode: 409 });
        await expect(servicio.hoja('PC-2026-00002')).rejects.toMatchObject({ codigo: 'ORDEN_FUERA_DE_CUMPLIMIENTO' });
        expect(repo.escrituras).toBe(0);
      },
    );
  });

  describe('avance automático (HU-CUM-03)', () => {
    it('al quedar todas disponibles pasa a preparación sin otra acción, con autor, motivo y evento (CA-CUM-03-05)', async () => {
      const r = await servicio.marcar(CODIGO, marcas([1, 'disponible'], [2, 'disponible'], [3, 'disponible']), EMPLEADO);

      expect(verificarLineasResponseEnvelopeSchema.safeParse({ success: true, data: r }).success).toBe(true);
      expect(r.avanzo).toBe(true);
      expect(r.verificacion).toMatchObject({ estado: 'en_preparacion', completa: true, lineasSinConfirmar: 0 });
      expect(estadoDeLaOrden()).toBe('en_preparacion');
      expect(repo.historial).toEqual([
        { codigo: CODIGO, estadoAnterior: 'revision_disponibilidad', estadoNuevo: 'en_preparacion', idUsuarioAutor: 21, motivo: MOTIVO_AVANCE_AUTOMATICO },
      ]);
      expect(eventos.emitirCambioEstado).toHaveBeenCalledWith({
        codigo: CODIGO,
        idUsuario: 7,
        estadoAnterior: 'revision_disponibilidad',
        estadoNuevo: 'en_preparacion',
        idUsuarioAutor: 21,
        fecha: AHORA,
      });
    });

    it('avanza con quien confirma la ÚLTIMA línea, no con quien confirmó las primeras', async () => {
      await servicio.marcar(CODIGO, marcas([1, 'disponible'], [2, 'disponible']), EMPLEADO);

      await servicio.marcar(CODIGO, marcas([3, 'disponible']), { idUsuario: 22 });

      expect(repo.historial[0]?.idUsuarioAutor).toBe(22);
    });

    it('no vuelve a avanzar si la orden ya está en preparación (R6)', async () => {
      await servicio.marcar(CODIGO, marcas([1, 'disponible'], [2, 'disponible'], [3, 'disponible']), EMPLEADO);

      const otra = await servicio.marcar(CODIGO, marcas([1, 'disponible']), EMPLEADO);

      expect(otra.avanzo).toBe(false);
      expect(repo.historial).toHaveLength(1);
      expect(eventos.emitirCambioEstado).toHaveBeenCalledTimes(1);
    });

    it('corregir una línea con la orden ya en preparación NO la hace retroceder (CA-CUM-01-10)', async () => {
      await servicio.marcar(CODIGO, marcas([1, 'disponible'], [2, 'disponible'], [3, 'disponible']), EMPLEADO);

      const r = await servicio.marcar(CODIGO, marcas([2, 'consiguiendo_stock']), EMPLEADO);

      expect(r.avanzo).toBe(false);
      expect(r.verificacion).toMatchObject({ estado: 'en_preparacion', completa: false });
      expect(estadoDeLaOrden()).toBe('en_preparacion');
      expect(repo.historial).toHaveLength(1);
    });

    it('lo mismo con la orden ya preparada', async () => {
      repo.cargar(ordenDe('PC-2026-00003', 'preparada'));

      const r = await servicio.marcar('PC-2026-00003', marcas([1, 'no_disponible']), EMPLEADO);

      expect(r.verificacion.estado).toBe('preparada');
      expect(repo.ordenes.get('PC-2026-00003')?.estado).toBe('preparada');
    });

    it('una orden sin líneas nunca avanza', async () => {
      repo.cargar(ordenDe('PC-2026-00004', 'revision_disponibilidad', []));

      await expect(servicio.marcar('PC-2026-00004', marcas([1, 'disponible']), EMPLEADO)).rejects.toMatchObject({ statusCode: 400 });
      expect(repo.ordenes.get('PC-2026-00004')?.estado).toBe('revision_disponibilidad');
    });

    it('si otra persona la cambió justo antes del avance responde ESTADO_CAMBIADO y no guarda las marcas (R7)', async () => {
      repo.perderCarrera = true;

      await expect(
        servicio.marcar(CODIGO, marcas([1, 'disponible'], [2, 'disponible'], [3, 'disponible']), EMPLEADO),
      ).rejects.toMatchObject({ codigo: 'ESTADO_CAMBIADO', statusCode: 409 });

      expect(repo.ordenes.get(CODIGO)?.lineas.every((l) => l.registros.length === 0)).toBe(true);
      expect(estadoDeLaOrden()).toBe('revision_disponibilidad');
      expect(repo.historial).toHaveLength(0);
      expect(eventos.emitirCambioEstado).not.toHaveBeenCalled();
    });

    it('si el evento falla, la orden igualmente avanzó y la petición responde bien', async () => {
      eventos.emitirCambioEstado.mockRejectedValue(new Error('M18 caído'));
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      const r = await servicio.marcar(CODIGO, marcas([1, 'disponible'], [2, 'disponible'], [3, 'disponible']), EMPLEADO);

      expect(r.avanzo).toBe(true);
      expect(estadoDeLaOrden()).toBe('en_preparacion');
      consola.mockRestore();
    });
  });

  describe('retenidas (HU-CUM-03)', () => {
    it('lista solo las órdenes en revisión con alguna línea sin confirmar, y dice cuáles y en qué estado (CA-CUM-03-06)', async () => {
      repo.cargar(ordenDe('PC-2026-00005', 'revision_disponibilidad'), 'Beatriz Soto', new Date('2026-10-30T14:00:00Z'));
      repo.cargar(ordenDe('PC-2026-00006', 'en_preparacion'));
      await servicio.marcar(CODIGO, marcas([1, 'consiguiendo_stock'], [2, 'disponible'], [3, 'no_disponible']), EMPLEADO);

      const { filas, paginacion } = await servicio.retenidas(1, 20);

      expect(retenidasResponseEnvelopeSchema.safeParse({ success: true, data: filas, pagination: paginacion }).success).toBe(true);
      expect(filas.map((f) => f.codigo)).toEqual([CODIGO, 'PC-2026-00005']);
      expect(filas[0]).toMatchObject({ lineasSinConfirmar: 2, lineasTotales: 3 });
      expect(filas[0]?.motivos).toEqual([
        { descripcion: 'Vinilo Tipo 1 — Galón', estado: 'consiguiendo_stock' },
        { descripcion: 'Rodillo felpa — Unidad', estado: 'no_disponible' },
      ]);
      expect(filas[1]?.motivos.map((m) => m.estado)).toEqual(['pendiente', 'pendiente', 'pendiente']);
      expect(paginacion).toEqual({ pagina: 1, limite: 20, total: 2, totalPaginas: 1 });
    });

    it('va de la que más lleva esperando a la más reciente y mide el tiempo desde que entró a revisión', async () => {
      repo.cargar(ordenDe('PC-2026-00005', 'revision_disponibilidad'), 'Beatriz Soto', new Date('2026-10-30T14:00:00Z'));

      const { filas } = await servicio.retenidas(1, 20);

      expect(filas.map((f) => f.codigo)).toEqual([CODIGO, 'PC-2026-00005']);
      expect(filas[0]?.segundosEnEstado).toBe(24 * 3600);
      expect(filas[1]?.segundosEnEstado).toBe(3600);
    });

    it('pagina', async () => {
      repo.cargar(ordenDe('PC-2026-00005', 'revision_disponibilidad'), 'B', new Date('2026-10-30T14:00:00Z'));
      repo.cargar(ordenDe('PC-2026-00006', 'revision_disponibilidad'), 'C', new Date('2026-10-30T14:30:00Z'));

      const segunda = await servicio.retenidas(2, 2);

      expect(segunda.filas.map((f) => f.codigo)).toEqual(['PC-2026-00006']);
      expect(segunda.paginacion).toEqual({ pagina: 2, limite: 2, total: 3, totalPaginas: 2 });
    });

    it('una orden que quedó completa sale de la lista', async () => {
      await servicio.marcar(CODIGO, marcas([1, 'disponible'], [2, 'disponible'], [3, 'disponible']), EMPLEADO);

      expect((await servicio.retenidas(1, 20)).filas).toEqual([]);
    });
  });

  describe('hoja de preparación (HU-CUM-06)', () => {
    it('lleva producto, presentación, cantidad y la base de las líneas entonadas (CA-CUM-06-01)', async () => {
      const hoja = await servicio.hoja(CODIGO);

      expect(hojaResponseEnvelopeSchema.safeParse({ success: true, data: hoja }).success).toBe(true);
      expect(hoja.lineas[0]).toEqual({
        numeroLinea: 1,
        nombreProducto: 'Vinilo Tipo 1',
        varianteCopia: 'Galón',
        colorSolicitado: 'Rojo Colonial',
        cantidad: 2,
        baseConsumida: 'Base Deep 1 gal',
      });
      expect(hoja.lineas[1]?.baseConsumida).toBeNull();
    });

    it('no trae ningún importe, descuento, pago ni dato del cliente (CA-CUM-06-02)', async () => {
      const hoja = await servicio.hoja(CODIGO);

      // La lista exacta de campos: añadir uno nuevo obliga a tocar esta prueba, y con ella el contrato (R13).
      expect(Object.keys(hoja).sort()).toEqual(['codigo', 'estado', 'generadaEn', 'lineas']);
      for (const l of hoja.lineas) {
        expect(Object.keys(l).sort()).toEqual(['baseConsumida', 'cantidad', 'colorSolicitado', 'nombreProducto', 'numeroLinea', 'varianteCopia']);
      }
      expect(JSON.stringify(hoja)).not.toMatch(/precio|descuento|total|importe|iva|pago|correo|telefono|direccion/i);
    });

    it('lleva la fecha y el estado de la orden al generarla (CA-CUM-06-03)', async () => {
      const antes = await servicio.hoja(CODIGO);
      await servicio.marcar(CODIGO, marcas([1, 'disponible'], [2, 'disponible'], [3, 'disponible']), EMPLEADO);
      const despues = await servicio.hoja(CODIGO);

      expect(antes).toMatchObject({ estado: 'revision_disponibilidad', generadaEn: AHORA.toISOString() });
      expect(despues.estado).toBe('en_preparacion');
    });

    it('la base de una línea que NO es entonada no sale aunque la fila la traiga', async () => {
      repo.cargar(ordenDe('PC-2026-00007', 'preparada', [linea(1, { nombreProducto: 'Esmalte', varianteCopia: 'Cuarto', esEntonado: false, baseConsumida: 'Base vieja' })]));

      expect((await servicio.hoja('PC-2026-00007')).lineas[0]?.baseConsumida).toBeNull();
    });
  });
});
