import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  faqFormSchema,
  normalizarSlugPagina,
  paginaFormSchema,
} from '../dtos/m16-contenido.dto';
import {
  MarkdownContenido,
  parsearBloquesMarkdown,
} from '../components/publico/MarkdownContenido';

describe('M16 · Contenido Institucional y Centro de Ayuda (Frontend)', () => {
  describe('normalizarSlugPagina y esquemas Zod (HU-CON-01 / HU-CON-02)', () => {
    it('normaliza títulos con tildes y símbolos hacia kebab-case limpio', () => {
      expect(normalizarSlugPagina('  Política de Privacidad & Datos! ')).toBe(
        'politica-de-privacidad-datos',
      );
      expect(normalizarSlugPagina('Términos --- y Condiciones')).toBe(
        'terminos-y-condiciones',
      );
    });

    it('valida correctamente un formulario de página institucional y rechaza slugs inválidos', () => {
      const valido = paginaFormSchema.safeParse({
        titulo: '  Sobre Nosotros  ',
        slug: 'sobre-nosotros',
        resumen: 'Historia y misión',
        cuerpoMarkdown: '## Nuestra Misión\nOfrecer calidad y servicio técnico.',
        estado: 'publicado',
      });
      expect(valido.success).toBe(true);
      if (valido.success) {
        expect(valido.data.titulo).toBe('Sobre Nosotros');
      }

      const invalido = paginaFormSchema.safeParse({
        titulo: 'Sobre Nosotros',
        slug: 'Sobre_Nosotros!',
        resumen: '',
        cuerpoMarkdown: 'Contenido válido de prueba.',
        estado: 'borrador',
      });
      expect(invalido.success).toBe(false);
    });

    it('valida correctamente una entrada de pregunta frecuente (FAQ)', () => {
      const ok = faqFormSchema.safeParse({
        pregunta: '¿Cómo solicito una cuenta empresarial?',
        respuestaMarkdown: 'Regístrate adjuntando tu **NIT** vigente.',
        orden: 1,
        estado: 'activo',
      });
      expect(ok.success).toBe(true);
    });
  });

  describe('MarkdownContenido (HU-CON-03 / HU-CON-04)', () => {
    it('parsea y renderiza encabezados, listas y negritas de forma segura', () => {
      const md = [
        '## Misión Corporativa',
        'Brindamos **respaldo técnico** en todo el país.',
        '- Atención B2B',
        '- Entregas oportunas',
      ].join('\n');

      const bloques = parsearBloquesMarkdown(md);
      expect(bloques).toHaveLength(3);

      const html = renderToStaticMarkup(<MarkdownContenido markdown={md} />);
      expect(html).toContain('<h2');
      expect(html).toContain('Misión Corporativa');
      expect(html).toContain('<strong');
      expect(html).toContain('respaldo técnico');
      expect(html).toContain('Atención B2B');
    });
  });
});
