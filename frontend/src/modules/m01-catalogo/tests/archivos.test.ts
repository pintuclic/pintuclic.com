import { describe, expect, it } from 'vitest';
import { base64DeDataUrl, validarLogotipo } from '../services/archivos';

describe('M01 · logotipos en el navegador (R9)', () => {
  it('extrae el base64 de una data URL', () => {
    expect(base64DeDataUrl('data:image/png;base64,iVBORw0KGgo=')).toBe('iVBORw0KGgo=');
    expect(base64DeDataUrl('sin coma')).toBe('');
  });

  it('acepta jpeg, png y webp de hasta 5 MB', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(validarLogotipo({ type, size: 5 * 1024 * 1024 })).toBeNull();
    }
  });

  it('rechaza otros tipos y archivos demasiado grandes', () => {
    expect(validarLogotipo({ type: 'image/gif', size: 100 })).toBe('Use una imagen JPEG, PNG o WebP');
    expect(validarLogotipo({ type: 'application/pdf', size: 100 })).not.toBeNull();
    expect(validarLogotipo({ type: 'image/png', size: 5 * 1024 * 1024 + 1 })).toBe('El logotipo no puede superar 5 MB');
  });
});
