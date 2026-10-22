import { describe, expect, it } from 'vitest';
import { destinoSeguro, enmascararCorreo, minutosDesde } from '../components/auth/utilidades';
import { formatoTamano, motivoObligatorio } from '../components/admin/formato';
import { aBase64, RUT_TAMANO_MAXIMO_BYTES, validarArchivoRut } from '../components/perfil/archivo-rut';
import { esSeccionPerfil } from '../components/perfil/secciones';

describe('M04 Frontend — utilidades de autenticación', () => {
  it('enmascara el correo como en el mockup de verificación (pág. 5)', () => {
    expect(enmascararCorreo('ana.perez@correo.com')).toBe('a•••@correo.com');
    expect(enmascararCorreo('sin-arroba')).toBe('sin-arroba');
  });

  describe('destinoSeguro (CA-SEG-02-06 sin redirección abierta)', () => {
    it('acepta rutas internas absolutas con su query', () => {
      expect(destinoSeguro('/perfil')).toBe('/perfil');
      expect(destinoSeguro('/productos?categoria=vinilos')).toBe('/productos?categoria=vinilos');
    });

    it('rechaza destinos externos o ambiguos', () => {
      expect(destinoSeguro('https://evil.com')).toBe('/');
      expect(destinoSeguro('//evil.com')).toBe('/');
      expect(destinoSeguro('/\\evil.com')).toBe('/');
      expect(destinoSeguro('perfil')).toBe('/');
      expect(destinoSeguro(undefined)).toBe('/');
      expect(destinoSeguro(null, '/perfil')).toBe('/perfil');
    });

    it('no devuelve al propio flujo de acceso (evita bucles)', () => {
      expect(destinoSeguro('/login')).toBe('/');
      expect(destinoSeguro('/login?destino=/perfil')).toBe('/');
      expect(destinoSeguro('/registro')).toBe('/');
      expect(destinoSeguro('/restablecer-contrasena?token=abc')).toBe('/');
      expect(destinoSeguro('/loginx')).toBe('/loginx');
    });
  });

  it('convierte segundos a minutos enteros redondeando hacia arriba', () => {
    expect(minutosDesde(900)).toBe(15);
    expect(minutosDesde(901)).toBe(16);
    expect(minutosDesde(0)).toBe(1);
  });
});

describe('M04 Frontend — RUT de la renovación de NIT (RN-CUE-20, DP-18)', () => {
  it('acepta 5 MB exactos y rechaza 5 MB + 1 byte', () => {
    expect(validarArchivoRut({ type: 'application/pdf', size: RUT_TAMANO_MAXIMO_BYTES })).toBeNull();
    expect(validarArchivoRut({ type: 'application/pdf', size: RUT_TAMANO_MAXIMO_BYTES + 1 })).toBe(
      'El RUT no puede superar 5 MB.',
    );
  });

  it('solo admite PDF, JPG y PNG', () => {
    expect(validarArchivoRut({ type: 'image/jpeg', size: 1000 })).toBeNull();
    expect(validarArchivoRut({ type: 'image/png', size: 1000 })).toBeNull();
    expect(validarArchivoRut({ type: 'application/x-msdownload', size: 1000 })).toBe(
      'El RUT debe ser un archivo PDF, JPG o PNG.',
    );
  });

  it('exige el archivo y rechaza uno vacío (CA-CUE-10-01)', () => {
    expect(validarArchivoRut(null)).toBe('Adjunta el documento de renovación del RUT.');
    expect(validarArchivoRut({ type: 'application/pdf', size: 0 })).toBe('El archivo está vacío.');
  });

  it('codifica en base64 sin prefijo data:, también por encima del bloque de 32 KB', () => {
    expect(aBase64(new TextEncoder().encode('Pintu Clic'))).toBe('UGludHUgQ2xpYw==');
    const grande = new Uint8Array(0x8000 * 2 + 7).fill(65);
    expect(atob(aBase64(grande))).toHaveLength(grande.length);
  });
});

describe('M04 Frontend — panel de empresas y perfil', () => {
  it('el motivo solo es obligatorio al rechazar un registro (RN-CUE-17)', () => {
    expect(motivoObligatorio('registro')).toBe(true);
    expect(motivoObligatorio('ascenso_particular')).toBe(false);
    expect(motivoObligatorio('renovacion')).toBe(false);
  });

  it('formatea el tamaño del documento', () => {
    expect(formatoTamano(2048)).toBe('2 KB');
    expect(formatoTamano(RUT_TAMANO_MAXIMO_BYTES)).toBe('5.0 MB');
  });

  it('valida la sección pedida en ?seccion=', () => {
    expect(esSeccionPerfil('direcciones')).toBe(true);
    expect(esSeccionPerfil('admin')).toBe(false);
    expect(esSeccionPerfil(['datos'])).toBe(false);
  });
});
