import { describe, expect, it } from 'vitest';
import {
  contactoFormSchema,
  crearEsquemaCambioEstado,
  FILTROS_BANDEJA_VACIOS,
  filtrosBandejaFormSchema,
  notaFormSchema,
} from '../dtos/formularios.dto';
import { cambiarEstadoRequestSchema, crearContactoRequestSchema } from '../dtos/m08-ordenes.dto';
import { aCambioEstado, aContacto, aFiltrosBandeja } from '../services/formularios';

describe('formularios de M08', () => {
  describe('búsqueda de pedidos (HU-ORD-08)', () => {
    it('un formulario vacío no filtra nada', () => {
      expect(aFiltrosBandeja(FILTROS_BANDEJA_VACIOS)).toEqual({});
    });

    it('envía solo los campos escritos', () => {
      const valores = { ...FILTROS_BANDEJA_VACIOS, correo: 'ana@correo.co', estado: 'preparada' as const, desde: '2026-10-01' };

      expect(aFiltrosBandeja(valores)).toEqual({ correo: 'ana@correo.co', estado: 'preparada', desde: '2026-10-01' });
    });

    it('rechaza un periodo invertido', () => {
      const r = filtrosBandejaFormSchema.safeParse({ ...FILTROS_BANDEJA_VACIOS, desde: '2026-10-10', hasta: '2026-10-01' });

      expect(r.success).toBe(false);
    });

    it('recorta espacios y limita el largo', () => {
      expect(filtrosBandejaFormSchema.parse({ ...FILTROS_BANDEJA_VACIOS, codigo: '  PC-2026  ' }).codigo).toBe('PC-2026');
      expect(filtrosBandejaFormSchema.safeParse({ ...FILTROS_BANDEJA_VACIOS, telefono: '1'.repeat(21) }).success).toBe(false);
    });
  });

  describe('cambio de estado (HU-ORD-03)', () => {
    it('volver de preparada a preparación exige motivo', () => {
      const esquema = crearEsquemaCambioEstado('preparada');

      expect(esquema.safeParse({ estadoNuevo: 'en_preparacion', motivo: '  ' }).success).toBe(false);
      expect(esquema.safeParse({ estadoNuevo: 'en_preparacion', motivo: 'Falta una lata' }).success).toBe(true);
    });

    it('en el resto de pasos el motivo es opcional', () => {
      expect(crearEsquemaCambioEstado('orden_confirmada').safeParse({ estadoNuevo: 'revision_disponibilidad', motivo: '' }).success).toBe(true);
    });

    it('arma un cuerpo que cumple el contrato, con el estado que el empleado veía', () => {
      const cuerpo = aCambioEstado('preparada', { estadoNuevo: 'en_preparacion', motivo: 'Falta una lata' });

      expect(cuerpo).toEqual({ estadoActual: 'preparada', estadoNuevo: 'en_preparacion', motivo: 'Falta una lata' });
      expect(cambiarEstadoRequestSchema.safeParse(cuerpo).success).toBe(true);
    });

    it('sin motivo no lo envía', () => {
      expect(aCambioEstado('orden_confirmada', { estadoNuevo: 'revision_disponibilidad', motivo: '' })).toEqual({
        estadoActual: 'orden_confirmada',
        estadoNuevo: 'revision_disponibilidad',
      });
    });
  });

  describe('nota y contacto (HU-ORD-10, HU-ORD-09-02)', () => {
    it('no admite una nota vacía ni de más de 2000 caracteres', () => {
      expect(notaFormSchema.safeParse({ texto: '   ' }).success).toBe(false);
      expect(notaFormSchema.safeParse({ texto: 'x'.repeat(2001) }).success).toBe(false);
      expect(notaFormSchema.parse({ texto: '  Llamar antes  ' }).texto).toBe('Llamar antes');
    });

    it('el contacto solo admite correo o teléfono y el detalle es opcional', () => {
      expect(contactoFormSchema.safeParse({ medio: 'whatsapp', detalle: '' }).success).toBe(false);

      const cuerpo = aContacto({ medio: 'telefono', detalle: '' });
      expect(cuerpo).toEqual({ medio: 'telefono' });
      expect(crearContactoRequestSchema.safeParse(cuerpo).success).toBe(true);
      expect(aContacto({ medio: 'correo', detalle: 'Se avisó' })).toEqual({ medio: 'correo', detalle: 'Se avisó' });
    });
  });
});
