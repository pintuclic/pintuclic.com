import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { TextButton } from '@/core/components/buttons/TextButton';
import { FileInput } from '@/core/components/forms/FileInput';
import { SectionNav } from '@/core/components/navigation/SectionNav';
import { cuentaDeEncabezado, Header, type HeaderProps } from '@/core/components/layout/Header';
import { DictamenPanel } from '../components/admin/DictamenPanel';
import { EmpresasAdminView } from '../components/admin/EmpresasAdminView';
import { EstadoBadge } from '../components/admin/ElementosAdmin';
import { AuthPanel } from '../components/auth/AuthPanel';
import { CompletarGoogleForm } from '../components/auth/CompletarGoogleForm';
import { LoginForm } from '../components/auth/LoginForm';
import { PrimerAccesoForm } from '../components/auth/PrimerAccesoForm';
import { RecuperarForm } from '../components/auth/RecuperarForm';
import { RegistroFlow } from '../components/auth/RegistroFlow';
import { RestablecerForm } from '../components/auth/RestablecerForm';
import { VincularGoogleForm } from '../components/auth/VincularGoogleForm';
import { DireccionForm } from '../components/perfil/DireccionForm';
import { SeguridadSection } from '../components/perfil/SeguridadSection';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
}));

/**
 * Sin jsdom en el proyecto, se verifica el HTML que produce el servidor:
 * campos, semántica y textos del mockup (VISTAS.pdf, págs. 3–6).
 */
const html = (elemento: React.ReactElement) => renderToStaticMarkup(elemento);
const nada = () => undefined;

describe('Login (HU-CUE-04)', () => {
  const salida = html(
    <LoginForm onAutenticado={nada} onCambioObligatorio={nada} onIrARegistro={nada} onIrARecuperar={nada} />,
  );

  it('pide correo y contraseña con autocompletado correcto', () => {
    expect(salida).toContain('type="email"');
    expect(salida).toContain('autoComplete="email"');
    expect(salida).toContain('type="password"');
  });

  it('ofrece recuperar contraseña y crear cuenta', () => {
    expect(salida).toContain('¿Olvidaste tu contraseña?');
    expect(salida).toContain('Crear cuenta');
  });

  it('presenta el acceso con Google desbloqueado (sin rótulo "Próximamente")', () => {
    expect(salida).toContain('Continuar con Google');
    expect(salida).not.toContain('Próximamente');
    expect(salida).not.toContain('google-proximamente');
  });
});

describe('Autenticación federada con Google (HU-CUE-02)', () => {
  it('al completar una cuenta nueva muestra el correo verificado y pide teléfono, contraseña y términos', () => {
    const salida = html(
      <CompletarGoogleForm
        datosGoogle={{
          tokenRegistroTemporal: 'tok-temporal-12345',
          email: 'cliente.google@gmail.com',
          nombre: 'Laura Gómez',
        }}
        onCompletado={nada}
        onVolver={nada}
      />,
    );
    expect(salida).toContain('Laura Gómez');
    expect(salida).toContain('cliente.google@gmail.com');
    expect(salida).toContain('type="tel"');
    expect(salida.match(/autoComplete="new-password"/gi)).toHaveLength(2);
    expect(salida).toContain('Términos y Condiciones');
  });

  it('al detectar un correo ya registrado pide la contraseña actual para confirmar la vinculación', () => {
    const salida = html(
      <VincularGoogleForm
        datosVinculacion={{
          tokenVinculacion: 'tok-vincular-12345',
          email: 'existente@gmail.com',
          nombre: 'Carlos Ruiz',
        }}
        onCompletado={nada}
        onIrARecuperar={nada}
        onVolver={nada}
      />,
    );
    expect(salida).toContain('existente@gmail.com');
    expect(salida).toContain('autoComplete="current-password"');
    expect(salida).toContain('Vincular cuenta y entrar');
    expect(salida).toContain('Cancelar y volver');
  });
});

describe('Registro (HU-CUE-01 / HU-CUE-03)', () => {
  const salida = html(<RegistroFlow onIrALogin={nada} />);

  it('muestra el stepper de tres pasos del mockup para persona natural', () => {
    expect(salida).toContain('Datos');
    expect(salida).toContain('Verificación');
    expect(salida).toContain('Listo');
  });

  it('alterna Natural / Empresa con un tablist accesible', () => {
    expect(salida).toContain('role="tablist"');
    expect(salida).toContain('role="tabpanel"');
    expect(salida).toContain('Natural');
    expect(salida).toContain('Empresa');
  });

  it('usa los textos del mockup y un solo campo de contraseña', () => {
    expect(salida).toContain('Ej. Juan Pérez');
    expect(salida).toContain('3000000000');
    expect(salida).toContain('Términos y Condiciones');
    expect(salida.match(/type="password"/g)).toHaveLength(1);
    expect(salida).not.toContain('Confirmar contraseña');
  });

  it('el panel de acceso pone el título y subtítulo del mockup', () => {
    const panel = html(<AuthPanel vistaInicial="registro" modo="pagina" />);
    expect(panel).toContain('Crear cuenta');
    expect(panel).toContain('Únete a Pintu Clic para comprar más fácil');
  });
});

describe('Recuperación y restablecimiento (HU-CUE-05)', () => {
  it('la solicitud solo pide el correo', () => {
    const salida = html(<RecuperarForm onVolver={nada} />);
    expect(salida).toContain('type="email"');
    expect(salida).toContain('Enviar enlace');
  });

  it('sin token explica que el enlace no es válido y ofrece uno nuevo', () => {
    const salida = html(<RestablecerForm token={null} />);
    expect(salida).toContain('El enlace no es válido');
    expect(salida).toContain('href="/recuperar-contrasena"');
  });

  it('con token pide la contraseña nueva y su confirmación', () => {
    const salida = html(<RestablecerForm token="abc" />);
    expect(salida.match(/autoComplete="new-password"/gi)).toHaveLength(2);
  });

  it('la activación de un colaborador sin token remite al administrador, no a recuperar', () => {
    const salida = html(<RestablecerForm token={null} variante="activacion" />);
    expect(salida).toContain('Pide al administrador');
    expect(salida).not.toContain('href="/recuperar-contrasena"');
  });

  it('el primer acceso pide la temporal, la nueva y su confirmación', () => {
    const salida = html(<PrimerAccesoForm tokenCambio="t" onCompletado={nada} onVolver={nada} />);
    expect(salida.match(/type="password"/g)).toHaveLength(3);
    expect(salida).toContain('Contraseña temporal');
  });
});

describe('Direcciones (HU-CUE-07)', () => {
  const guardar = async () => undefined;

  it('no ofrece elegir predeterminada: la única dirección siempre lo es', () => {
    const salida = html(<DireccionForm onGuardar={guardar} onCancelar={nada} />);
    expect(salida).not.toContain('type="checkbox"');
    expect(salida).not.toContain('predeterminada');
  });

  it('ofrece completar con la ubicación del dispositivo y mantiene la edición manual', () => {
    const salida = html(<DireccionForm onGuardar={guardar} onCancelar={nada} />);
    expect(salida).toContain('Usar mi ubicación actual');
    expect(salida).toContain('Apartamento o casa (opcional)');
    expect(salida).not.toContain('Quitar ubicación');
  });
});

describe('Panel de empresas (HU-CUE-09)', () => {
  it('ofrece aprobar y rechazar', () => {
    const salida = html(<DictamenPanel motivoObligatorio onDictaminar={async () => undefined} />);
    expect(salida).toContain('Aprobar');
    expect(salida).toContain('Rechazar');
  });

  describe('tipo de cliente empresa al aprobar (M06 · D8)', () => {
    const tipos = [
      { idSubRolEmpresa: 1, nombre: 'Proveedor', porcentaje: 15, montoMinimoCompra: 0 },
      { idSubRolEmpresa: 2, nombre: 'Constructora', porcentaje: 10, montoMinimoCompra: 300000 },
    ];

    it('en una solicitud de cuenta pide elegir el tipo y no deja aprobar hasta elegirlo', () => {
      const salida = html(<DictamenPanel motivoObligatorio onDictaminar={async () => undefined} tiposCliente={tipos} />);
      expect(salida).toContain('Tipo de cliente empresa');
      expect(salida).toContain('Proveedor · 15 % de descuento');
      expect(salida).toContain('Constructora · 10 % de descuento');
      // el botón Aprobar nace deshabilitado
      expect(salida).toMatch(/<button[^>]*disabled=""[^>]*>(?:(?!<\/button>).)*Aprobar/s);
    });

    it('en una renovación de NIT (sin tipos) no pide tipo y deja aprobar', () => {
      const salida = html(<DictamenPanel motivoObligatorio={false} onDictaminar={async () => undefined} />);
      expect(salida).not.toContain('Tipo de cliente empresa');
      expect(salida).not.toMatch(/<button[^>]*disabled=""[^>]*>(?:(?!<\/button>).)*Aprobar/s);
    });

    it('mientras cargan los tipos lo dice, y si no hay ninguno activo explica dónde crearlos', () => {
      expect(html(<DictamenPanel motivoObligatorio onDictaminar={async () => undefined} tiposCliente={null} />)).toContain(
        'Cargando los tipos de cliente',
      );
      const vacio = html(<DictamenPanel motivoObligatorio onDictaminar={async () => undefined} tiposCliente={[]} />);
      expect(vacio).toContain('No hay tipos de cliente empresa activos');
      expect(vacio).toContain('Tipos de cliente');
    });
  });

  it('muestra el estado legible', () => {
    expect(html(<EstadoBadge estado="pendiente" />)).toContain('Pendiente');
    expect(html(<EstadoBadge estado="rechazada" />)).toContain('Rechazada');
  });
});

describe('Core Kit — TextButton y SectionNav', () => {
  it('TextButton es un botón (no envía formularios por omisión)', () => {
    const salida = html(<TextButton onClick={nada}>Crear cuenta</TextButton>);
    expect(salida).toMatch(/^<button[^>]*type="button"/);
    expect(salida).toContain('text-action');
  });

  it('SectionNav anuncia la sección activa y el panel que controla', () => {
    const salida = html(
      <SectionNav
        items={[
          { id: 'datos', label: 'Mis datos' },
          { id: 'direcciones', label: 'Direcciones' },
        ]}
        value="direcciones"
        onChange={nada}
        ariaLabel="Secciones de mi cuenta"
        controlsId="panel"
      />,
    );
    expect(salida).toContain('aria-label="Secciones de mi cuenta"');
    expect(salida.match(/aria-current="true"/g)).toHaveLength(1);
    expect(salida).toMatch(/aria-current="true"[^>]*>.*Direcciones/);
    expect(salida.match(/aria-controls="panel"/g)).toHaveLength(2);
  });
});

describe('Core Kit — FileInput', () => {
  it('el input nativo queda accesible y toma su nombre del rótulo', () => {
    const salida = html(
      <FileInput id="rut" label="Documento RUT" value={null} onChange={nada} accept=".pdf" helperText="PDF de máximo 5 MB." />,
    );
    expect(salida).toContain('type="file"');
    expect(salida).toContain('id="rut-label"');
    expect(salida).toContain('aria-labelledby="rut-label"');
    expect(salida).toContain('accept=".pdf"');
    expect(salida).toContain('aria-describedby="rut-helper"');
  });
});

describe('Header con sesión (M04 → Core)', () => {
  const anonima = { label: 'Mi cuenta', sublabel: 'Iniciar sesión', href: '/login' };
  const props: HeaderProps = {
    logo: { src: '/logo.png', alt: 'Pintu Clic, ir al inicio', width: 520, height: 303 },
    navItems: [],
    megaMenu: { groups: [], assistant: { text: 'Asistente', ctaLabel: 'Abrir', href: '/' } },
    account: anonima,
    cart: { count: 0, total: 0, href: '/carrito' },
  };

  it('el HTML de servidor siempre es el de visitante (la sesión se hidrata en el cliente)', () => {
    const salida = html(<Header {...props} />);
    expect(salida).toContain('href="/login"');
    expect(salida).toContain('Iniciar sesión');
  });

  it('sin sesión conserva la cuenta anónima', () => {
    expect(cuentaDeEncabezado(null, anonima)).toBe(anonima);
  });

  it('con sesión saluda por el primer nombre y lleva a /perfil', () => {
    expect(cuentaDeEncabezado({ nombre: '  Ana María Pérez ' }, anonima)).toEqual({
      label: 'Ana',
      sublabel: 'Mi perfil',
      href: '/perfil',
    });
  });

  it('con sesión de administrador lleva a /admin (Panel admin)', () => {
    expect(cuentaDeEncabezado({ nombre: 'Admin Pintuclic', esAdmin: true }, anonima)).toEqual({
      label: 'Admin',
      sublabel: 'Panel admin',
      href: '/admin',
    });
  });
});

describe('Seguridad del perfil (HU-CUE-06)', () => {
  const salida = html(
    <SeguridadSection
      perfil={{
        idUsuario: 1,
        nombre: 'Cliente Prueba',
        correo: 'cliente@pintuclic.com',
        telefono: '3000000000',
        tipo: 'normal',
        estado: 'activo',
        cambioContrasenaPendiente: false,
      }}
      onCorreoCambiado={nada}
      onSesionInvalidada={nada}
    />,
  );

  it('desactiva el autocompletado de credenciales guardadas en cambio de correo y contraseña', () => {
    expect(salida).not.toContain('autoComplete="current-password"');
    expect(salida).not.toContain('autoComplete="email"');
    expect(salida).toContain('id="correo-nuevo"');
    expect(salida).toContain('id="correo-contrasena"');
  });
});

describe('Panel de empresas · tipos de cliente en la misma vista', () => {
  it('ofrece la pestaña «Tipos de cliente» junto a las cuentas y su descuento', () => {
    const salida = html(<EmpresasAdminView />);
    expect(salida).toContain('Solicitudes de empresa');
    expect(salida).toContain('Cuentas y descuentos');
    expect(salida).toContain('Tipos de cliente');
  });
});
