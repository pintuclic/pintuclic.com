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
    buscarUltimoEnvioEnviado: vi.fn().mockResolvedValue(null),
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

  it('HU-NOT-02: el aviso de despacho lleva pedido y enlace, y escapa el nombre; el de cancelación no lleva enlace', async () => {
    const { transporter, sendMailMock } = crearTransporteMock();
    const adapter = new SmtpNotificacionesAdapter(configBase, transporter);

    await adapter.notificarOrdenDespachada('cliente@gmail.com', { nombre: '<b>Laura</b>', codigoOrden: 'PC-2026-00001' });
    await adapter.notificarOrdenCancelada('cliente@gmail.com', { nombre: 'Laura', codigoOrden: 'PC-2026-00001' });

    const [despachada, cancelada] = sendMailMock.mock.calls.map((c) => c[0]);
    expect(despachada.to).toBe('cliente@gmail.com');
    expect(despachada.text).toContain('Pedido: PC-2026-00001');
    expect(despachada.text).toContain('/perfil/pedidos/PC-2026-00001');
    expect(despachada.html).toContain('&lt;b&gt;Laura&lt;/b&gt;');
    expect(cancelada.text).toContain('Pedido: PC-2026-00001');
    expect(cancelada.text).not.toContain('/perfil/pedidos');
  });

  it('HU-NOT-02: los avisos de cotización llevan código, condiciones y enlace; el motivo se escapa', async () => {
    const { transporter, sendMailMock } = crearTransporteMock();
    const adapter = new SmtpNotificacionesAdapter(configBase, transporter);

    await adapter.notificarCotizacionRespondida('cliente@gmail.com', { nombre: 'Laura', codigo: 'COT-2026-00001', idCotizacion: 7, total: '$ 171.800', vencimiento: '15 de noviembre de 2026' });
    await adapter.notificarCotizacionRechazada('cliente@gmail.com', { nombre: 'Laura', codigo: 'COT-2026-00001', idCotizacion: 7, motivo: '<script>x</script>' });

    const [respondida, rechazada] = sendMailMock.mock.calls.map((c) => c[0]);
    expect(respondida.text).toContain('Total acordado: $ 171.800');
    expect(respondida.text).toContain('/cotizaciones/7');
    expect(rechazada.html).not.toContain('<script>');
    expect(rechazada.html).toContain('&lt;script&gt;x&lt;/script&gt;');
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
