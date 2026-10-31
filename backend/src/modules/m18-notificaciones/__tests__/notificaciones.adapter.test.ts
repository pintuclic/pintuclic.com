import { describe, expect, it, vi } from 'vitest';
import type { PlantillasRepositoryPort } from '../interfaces/plantillas.port';
import type { RegistroEnviosRepositoryPort } from '../interfaces/registro-envios.port';
import {
  crearNotificacionesAdapterDesdeEntorno,
  MemoriaNotificacionesAdapter,
  NoOpNotificacionesAdapter,
  resolverRemitenteSmtp,
  SmtpNotificacionesAdapter,
  type ConfiguracionSmtp,
  type TransporteCorreoPort,
} from '../adapters/notificaciones.adapter';

const configBase: ConfiguracionSmtp = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  user: 'cuenta.prueba@gmail.com',
  pass: 'app-password-16',
  from: 'Pintu Clic <notificaciones@pintuclic.com>',
  frontendBaseUrl: 'https://pintuclic-dev.adsoproject.dev/',
};

function crearTransporteMock(): {
  transporter: TransporteCorreoPort;
  sendMailMock: ReturnType<typeof vi.fn>;
} {
  const sendMailMock = vi.fn().mockResolvedValue({ messageId: '<msg-1@gmail.com>' });
  return {
    transporter: { sendMail: sendMailMock },
    sendMailMock,
  };
}

function crearRegistroMock(): {
  registro: RegistroEnviosRepositoryPort;
  registrarResultadoMock: ReturnType<typeof vi.fn>;
} {
  const registrarResultadoMock = vi.fn().mockResolvedValue('envio-1');
  const registro: RegistroEnviosRepositoryPort = {
    registrarResultado: registrarResultadoMock,
    registrarRebote: vi.fn().mockResolvedValue(undefined),
    listarEnvios: vi.fn().mockResolvedValue({ envios: [], total: 0 }),
    listarRebotes: vi.fn().mockResolvedValue({ rebotes: [], total: 0 }),
  };
  return { registro, registrarResultadoMock };
}

describe('SmtpNotificacionesAdapter · Envío de correos transaccionales por SMTP', () => {
  it('normaliza el remitente cuando se usa smtp.gmail.com para alinear con la cuenta autenticada', () => {
    const remitente = resolverRemitenteSmtp(
      'smtp.gmail.com',
      'cuenta.prueba@gmail.com',
      'Pintu Clic <notificaciones@pintuclic.com>',
    );
    expect(remitente).toBe('"Pintu Clic" <cuenta.prueba@gmail.com>');
  });

  it('envía el código OTP de registro con vigencia y contenido HTML/texto', async () => {
    const { transporter, sendMailMock } = crearTransporteMock();
    const adapter = new SmtpNotificacionesAdapter(configBase, transporter);

    await adapter.enviarCodigoRegistro('cliente@gmail.com', '482910', 15);

    expect(sendMailMock).toHaveBeenCalledOnce();
    const args = sendMailMock.mock.calls[0]?.[0];
    expect(args.to).toBe('cliente@gmail.com');
    expect(args.from).toBe('"Pintu Clic" <cuenta.prueba@gmail.com>');
    expect(args.subject).toContain('Código de verificación');
    expect(args.text).toContain('482910');
    expect(args.html).toContain('482910');
  });

  it('envía el enlace de recuperación apuntando a /restablecer-contrasena?token=', async () => {
    const { transporter, sendMailMock } = crearTransporteMock();
    const adapter = new SmtpNotificacionesAdapter(configBase, transporter);

    await adapter.enviarEnlaceRecuperacion('cliente@gmail.com', 'jwt.token.123', 30);

    expect(sendMailMock).toHaveBeenCalledOnce();
    const args = sendMailMock.mock.calls[0]?.[0];
    expect(args.to).toBe('cliente@gmail.com');
    expect(args.text).toContain(
      'https://pintuclic-dev.adsoproject.dev/restablecer-contrasena?token=jwt.token.123',
    );
    expect(args.html).toContain(
      'https://pintuclic-dev.adsoproject.dev/restablecer-contrasena?token=jwt.token.123',
    );
  });

  it('envía el enlace de activación a /activar-cuenta con la vigencia en horas y el nombre escapado', async () => {
    const { transporter, sendMailMock } = crearTransporteMock();
    const adapter = new SmtpNotificacionesAdapter(configBase, transporter);

    await adapter.enviarEnlaceActivacion('empleado@gmail.com', '<b>Laura</b>', 'jwt.token.456', 72);

    const args = sendMailMock.mock.calls[0]?.[0];
    expect(args.to).toBe('empleado@gmail.com');
    expect(args.text).toContain('https://pintuclic-dev.adsoproject.dev/activar-cuenta?token=jwt.token.456');
    expect(args.text).toContain('72 horas');
    expect(args.html).toContain('&lt;b&gt;Laura&lt;/b&gt;');
    expect(args.html).not.toContain('<b>Laura</b>');
  });

  it('envía el código OTP de cambio de correo y el aviso de seguridad al correo anterior', async () => {
    const { transporter, sendMailMock } = crearTransporteMock();
    const adapter = new SmtpNotificacionesAdapter(configBase, transporter);

    await adapter.enviarCodigoCambioCorreo('nuevo@gmail.com', '918273', 15);
    await adapter.notificarCambioCorreoConfirmado('anterior@gmail.com', 'nuevo@gmail.com');

    expect(sendMailMock).toHaveBeenCalledTimes(2);
    expect(sendMailMock.mock.calls[0]?.[0]?.to).toBe('nuevo@gmail.com');
    expect(sendMailMock.mock.calls[0]?.[0]?.text).toContain('918273');
    expect(sendMailMock.mock.calls[1]?.[0]?.to).toBe('anterior@gmail.com');
    expect(sendMailMock.mock.calls[1]?.[0]?.text).toContain('nuevo@gmail.com');
  });

  it('escapa caracteres HTML peligrosos en el motivo de rechazo de solicitud de empresa', async () => {
    const { transporter, sendMailMock } = crearTransporteMock();
    const adapter = new SmtpNotificacionesAdapter(configBase, transporter);

    await adapter.notificarDictamenEmpresa(
      'empresa@gmail.com',
      'rechazada',
      'RUT ilegible <script>alert("xss")</script>',
    );

    expect(sendMailMock).toHaveBeenCalledOnce();
    const args = sendMailMock.mock.calls[0]?.[0];
    expect(args.html).not.toContain('<script>');
    expect(args.html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('M12 · R9: el aviso del comprobante lleva número, total y enlace a la página, y escapa el nombre', async () => {
    const { transporter, sendMailMock } = crearTransporteMock();
    const adapter = new SmtpNotificacionesAdapter(configBase, transporter);

    await adapter.notificarComprobanteVenta('cliente@gmail.com', {
      nombre: '<b>Laura</b>',
      numero: 'CV-000007',
      total: '$ 171.800',
      codigoOrden: 'PC-2026-00001',
    });

    expect(sendMailMock).toHaveBeenCalledOnce();
    const args = sendMailMock.mock.calls[0]?.[0];
    expect(args.to).toBe('cliente@gmail.com');
    expect(args.text).toContain('CV-000007');
    expect(args.text).toContain('$ 171.800');
    expect(args.text).toContain('/perfil/pedidos/PC-2026-00001/comprobante');
    expect(args.html).toContain('&lt;b&gt;Laura&lt;/b&gt;');
    expect(args.html).not.toContain('<b>Laura</b>');
  });

  describe('M11 · R-POS-B: aviso de pedido cancelado', () => {
    const datos = {
      nombre: 'Laura',
      codigoOrden: 'PC-2026-00001',
      motivo: 'Sin existencias de: Vinilo Blanco, Galón (2 unidades).\nNota: Llega a fin de mes',
      origen: 'tienda' as const,
    };

    it('lleva el código, el motivo con sus saltos de línea y la frase del reembolso, sin importes ni enlace de pago', async () => {
      const { transporter, sendMailMock } = crearTransporteMock();
      const adapter = new SmtpNotificacionesAdapter(configBase, transporter);

      await adapter.notificarOrdenCancelada('cliente@gmail.com', datos);

      expect(sendMailMock).toHaveBeenCalledOnce();
      const args = sendMailMock.mock.calls[0]?.[0];
      expect(args.to).toBe('cliente@gmail.com');
      expect(args.subject).toBe('Tu pedido fue cancelado · Pintu Clic');
      expect(args.text).toContain('Pedido: PC-2026-00001');
      expect(args.text).toContain('Motivo: Sin existencias de: Vinilo Blanco, Galón (2 unidades).\nNota: Llega a fin de mes');
      expect(args.text).toContain('nuestro equipo se pondrá en contacto contigo para gestionar el reembolso');
      expect(args.html).toContain('Sin existencias de: Vinilo Blanco, Galón (2 unidades).<br/>Nota: Llega a fin de mes');
      expect(`${args.text}${args.html}`).not.toMatch(/\$|total|precio|tarjeta|cuenta bancaria/i);
    });

    it('si fue el cliente quien la pidió, el motivo se presenta como suyo', async () => {
      const { transporter, sendMailMock } = crearTransporteMock();
      const adapter = new SmtpNotificacionesAdapter(configBase, transporter);

      await adapter.notificarOrdenCancelada('cliente@gmail.com', { ...datos, origen: 'cliente', motivo: 'Me equivoqué de color' });

      const args = sendMailMock.mock.calls[0]?.[0];
      expect(args.text).toContain('Motivo que indicaste: Me equivoqué de color');
    });

    it('escapa el nombre y el motivo: nada de lo que escribió el personal o el cliente se ejecuta como HTML', async () => {
      const { transporter, sendMailMock } = crearTransporteMock();
      const adapter = new SmtpNotificacionesAdapter(configBase, transporter);

      await adapter.notificarOrdenCancelada('cliente@gmail.com', {
        ...datos,
        nombre: '<b>Laura</b>',
        motivo: '<script>alert("x")</script>',
      });

      const args = sendMailMock.mock.calls[0]?.[0];
      expect(args.html).not.toContain('<script>');
      expect(args.html).not.toContain('<b>Laura</b>');
      expect(args.html).toContain('&lt;script&gt;');
    });

    it('usa el asunto y la introducción que el administrador editó, y deja fijos el motivo y el reembolso', async () => {
      const { transporter, sendMailMock } = crearTransporteMock();
      const plantillas = {
        obtenerPorTipo: vi.fn().mockResolvedValue({
          tipo: 'orden_cancelada',
          asunto: 'Cancelamos tu pedido',
          contenidoTexto: 'Lamentamos informarte lo siguiente.',
          fechaActualizacion: new Date(),
        }),
      } as unknown as PlantillasRepositoryPort;
      const adapter = new SmtpNotificacionesAdapter(configBase, transporter, undefined, undefined, plantillas);

      await adapter.notificarOrdenCancelada('cliente@gmail.com', datos);

      const args = sendMailMock.mock.calls[0]?.[0];
      expect(args.subject).toBe('Cancelamos tu pedido');
      expect(args.text).toContain('Lamentamos informarte lo siguiente.');
      expect(args.text).toContain('Pedido: PC-2026-00001');
      expect(args.text).toContain('reembolso');
    });

    it('queda registrado como «orden_cancelada» en el registro de envíos', async () => {
      const { transporter } = crearTransporteMock();
      const { registro, registrarResultadoMock } = crearRegistroMock();
      const adapter = new SmtpNotificacionesAdapter(configBase, transporter, registro);

      await adapter.notificarOrdenCancelada('cliente@gmail.com', datos);

      expect(registrarResultadoMock).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'orden_cancelada', estado: 'enviado' }));
    });

    it('el adaptador en memoria deja el aviso con sus datos, para las pruebas de los módulos', async () => {
      const memoria = new MemoriaNotificacionesAdapter();

      await memoria.notificarOrdenCancelada('cliente@gmail.com', datos);

      expect(memoria.obtenerEventos()).toEqual([
        expect.objectContaining({ tipo: 'orden_cancelada', destinatario: 'cliente@gmail.com', metadatos: datos }),
      ]);
    });

    it('el adaptador apagado no envía nada', async () => {
      await expect(new NoOpNotificacionesAdapter().notificarOrdenCancelada()).resolves.toBeUndefined();
    });
  });

  it('selecciona el adaptador correcto según las variables de entorno', () => {
    const { transporter } = crearTransporteMock();

    const enTest = crearNotificacionesAdapterDesdeEntorno({ NODE_ENV: 'test' }, transporter);
    expect(enTest).toBeInstanceOf(MemoriaNotificacionesAdapter);

    const conSmtp = crearNotificacionesAdapterDesdeEntorno(
      {
        NODE_ENV: 'production',
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_PORT: '587',
        SMTP_USER: 'cuenta@gmail.com',
        SMTP_PASS: 'clave',
      },
      transporter,
    );
    expect(conSmtp).toBeInstanceOf(SmtpNotificacionesAdapter);

    const sinSmtp = crearNotificacionesAdapterDesdeEntorno(
      {
        NODE_ENV: 'production',
      },
      transporter,
    );
    expect(sinSmtp).toBeInstanceOf(NoOpNotificacionesAdapter);
  });

  describe('RF-NOT-01-03 / RF-NOT-01-04 · Reintentos y registro de envíos', () => {
    it('reintenta tras un fallo transitorio y registra el envío como exitoso', async () => {
      const { transporter, sendMailMock } = crearTransporteMock();
      sendMailMock.mockRejectedValueOnce(new Error('ECONNRESET')).mockResolvedValueOnce({ messageId: '<ok>' });
      const { registro, registrarResultadoMock } = crearRegistroMock();
      const adapter = new SmtpNotificacionesAdapter(configBase, transporter, registro);

      await adapter.enviarCodigoRegistro('cliente@gmail.com', '111222', 15);

      expect(sendMailMock).toHaveBeenCalledTimes(2);
      expect(registrarResultadoMock).toHaveBeenCalledOnce();
      expect(registrarResultadoMock).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'registro_otp',
          destinatario: 'cliente@gmail.com',
          estado: 'enviado',
          intentos: 2,
          maxIntentos: 3,
        }),
      );
    });

    it('agota los reintentos configurados y registra el envío como fallido sin exponer el contenido', async () => {
      const { transporter, sendMailMock } = crearTransporteMock();
      sendMailMock.mockRejectedValue(new Error('SMTP timeout'));
      const { registro, registrarResultadoMock } = crearRegistroMock();
      const adapter = new SmtpNotificacionesAdapter(configBase, transporter, registro);

      await adapter.enviarCodigoRegistro('cliente@gmail.com', '333444', 15);

      expect(sendMailMock).toHaveBeenCalledTimes(3);
      expect(registrarResultadoMock).toHaveBeenCalledOnce();
      const llamada = registrarResultadoMock.mock.calls[0]?.[0];
      expect(llamada).toMatchObject({
        tipo: 'registro_otp',
        destinatario: 'cliente@gmail.com',
        estado: 'fallido',
        intentos: 3,
        maxIntentos: 3,
        ultimoError: 'SMTP timeout',
      });
      expect(JSON.stringify(llamada)).not.toContain('333444');
    });

    it('usa el límite de reintentos del puerto de parámetros cuando se inyecta', async () => {
      const { transporter, sendMailMock } = crearTransporteMock();
      sendMailMock.mockRejectedValue(new Error('fallo persistente'));
      const { registro, registrarResultadoMock } = crearRegistroMock();
      const parametros = { obtenerNumero: vi.fn().mockResolvedValue(1) };
      const adapter = new SmtpNotificacionesAdapter(configBase, transporter, registro, parametros);

      await adapter.enviarCodigoRegistro('cliente@gmail.com', '555666', 15);

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      expect(registrarResultadoMock).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'fallido', intentos: 1, maxIntentos: 1 }),
      );
    });
  });

  describe('HU-NOT-03 · El envío real usa el contenido editado en plantilla_notificacion', () => {
    function crearPlantillasMock(plantilla: Awaited<ReturnType<PlantillasRepositoryPort['obtenerPorTipo']>>): {
      plantillas: PlantillasRepositoryPort;
    } {
      return {
        plantillas: {
          listar: vi.fn().mockResolvedValue([]),
          obtenerPorTipo: vi.fn().mockResolvedValue(plantilla),
          actualizar: vi.fn(),
        },
      };
    }

    it('usa el asunto y la copia introductoria editados por el admin, con el código real insertado por el maquetado fijo', async () => {
      const { transporter, sendMailMock } = crearTransporteMock();
      const { plantillas } = crearPlantillasMock({
        idPlantilla: 'p-1',
        tipo: 'registro_otp',
        asunto: 'Tu código Pintu Clic',
        contenidoTexto: 'Copia editada por el admin para el OTP de registro.',
        fechaActualizacion: new Date(),
        idUsuarioActualizo: 1,
      });
      const adapter = new SmtpNotificacionesAdapter(configBase, transporter, undefined, undefined, plantillas);

      await adapter.enviarCodigoRegistro('cliente@gmail.com', '777888', 20);

      const args = sendMailMock.mock.calls[0]?.[0];
      expect(args.subject).toBe('Tu código Pintu Clic');
      expect(args.text).toContain('Copia editada por el admin para el OTP de registro.');
      expect(args.text).toContain('777888');
      expect(args.html).toContain('Copia editada por el admin para el OTP de registro.');
      expect(args.html).toContain('777888');
    });

    it('escapa el texto introductorio del admin dentro del maquetado fijo, sin dejarlo inyectar HTML', async () => {
      const { transporter, sendMailMock } = crearTransporteMock();
      const { plantillas } = crearPlantillasMock({
        idPlantilla: 'p-1',
        tipo: 'registro_otp',
        asunto: 'Tu código Pintu Clic',
        contenidoTexto: '<script>alert("xss")</script>',
        fechaActualizacion: new Date(),
        idUsuarioActualizo: 1,
      });
      const adapter = new SmtpNotificacionesAdapter(configBase, transporter, undefined, undefined, plantillas);

      await adapter.enviarCodigoRegistro('cliente@gmail.com', '111222', 20);

      const args = sendMailMock.mock.calls[0]?.[0];
      expect(args.html).not.toContain('<script>');
      expect(args.html).toContain('&lt;script&gt;');
    });

    it('cae en el contenido de respaldo si no hay plantilla para ese tipo', async () => {
      const { transporter, sendMailMock } = crearTransporteMock();
      const { plantillas } = crearPlantillasMock(null);
      const adapter = new SmtpNotificacionesAdapter(configBase, transporter, undefined, undefined, plantillas);

      await adapter.enviarCodigoRegistro('cliente@gmail.com', '999000', 10);

      const args = sendMailMock.mock.calls[0]?.[0];
      expect(args.subject).toContain('Código de verificación');
      expect(args.text).toContain('999000');
    });
  });
});
