import { describe, expect, it, vi } from 'vitest';
import { EnvioPropioAdapter } from '../adapters/envio-propio.adapter';
import type { ServicioEnviosPort } from '../dtos/m10-entrega.dto';
import type {
  DatosGuardarEnvio,
  EnvioGuardado,
  EnviosRepositoryPort,
  NovedadGuardada,
  OrdenParaEnvio,
  OrdenesParaEnvioPort,
} from '../interfaces/entrega.interface';
import { destinoDesdeTexto } from '../services/destino';
import { ProveedorEnvioError } from '../services/envio.error';
import { EnviosService } from '../services/envios.service';

const DIRECCION = 'Calle 10 # 5-20, Centro, Apto 301 · Recibe: Laura Pérez, 3151234567';

function orden(sobrescribir: Partial<OrdenParaEnvio> = {}): OrdenParaEnvio {
  return {
    codigo: 'PC-2026-00001',
    idUsuario: 7,
    modoEntrega: 'domicilio',
    direccion: DIRECCION,
    total: 90000,
    lineas: [{ descripcion: 'Viniltex · Galón', cantidad: 2, valor: 45000, pesoGramos: 4200, altoCm: 20.5, anchoCm: 18, largoCm: null }],
    ...sobrescribir,
  };
}

class RepoEnMemoria implements EnviosRepositoryPort {
  envios = new Map<string, EnvioGuardado>();
  novedades: Array<{ idEnvio: string } & NovedadGuardada> = [];

  async buscarPorCodigoOrden(codigo: string) {
    return this.envios.get(codigo) ?? null;
  }
  async buscarPorProveedorYExterno(proveedor: string, idExterno: string) {
    return [...this.envios.values()].find((e) => e.proveedor === proveedor && e.idExterno === idExterno) ?? null;
  }
  async guardar(datos: DatosGuardarEnvio) {
    const previo = this.envios.get(datos.codigoOrden);
    const envio: EnvioGuardado = {
      idEnvio: previo?.idEnvio ?? `envio-${this.envios.size + 1}`,
      idUsuario: 7,
      fechaCreacion: previo?.fechaCreacion ?? new Date('2026-10-29T10:00:00Z'),
      fechaActualizacion: new Date('2026-10-29T11:00:00Z'),
      ...datos,
    };
    this.envios.set(datos.codigoOrden, envio);
    return envio;
  }
  async actualizarEstado(idEnvio: string, estado: EnvioGuardado['estado']) {
    for (const e of this.envios.values()) if (e.idEnvio === idEnvio) e.estado = estado;
  }
  async registrarNovedad(idEnvio: string, detalle: string) {
    this.novedades.push({ idEnvio, idNovedad: `n-${this.novedades.length + 1}`, detalle, fecha: new Date('2026-10-29T12:00:00Z') });
  }
  async listarNovedades(idEnvio: string) {
    return this.novedades.filter((n) => n.idEnvio === idEnvio);
  }
}

const ORIGEN = { nombre: 'Pintu Clic S.A.S.', direccion: 'Cra 1 # 2-3', ciudad: 'Bogotá', telefono: '6011234567', correo: 'ventas@pintuclic.co' };

function montar(ordenes: Record<string, OrdenParaEnvio>, proveedor?: ServicioEnviosPort) {
  const repo = new RepoEnMemoria();
  const puerto: OrdenesParaEnvioPort = { buscarPorCodigo: async (c) => ordenes[c] ?? null };
  const servicio = new EnviosService(proveedor ?? new EnvioPropioAdapter({ obtenerNumero: async () => null }), repo, puerto, { obtener: async () => ORIGEN });
  return { repo, servicio };
}

describe('EnviosService · R3 crear el envío al despachar', () => {
  it('una orden a domicilio que pasa a «despachado» queda con su envío creado por la entrega propia', async () => {
    const { repo, servicio } = montar({ 'PC-2026-00001': orden() });
    await servicio.alCambiarEstado({ codigo: 'PC-2026-00001', estadoNuevo: 'despachado' });
    expect(repo.envios.get('PC-2026-00001')).toMatchObject({ proveedor: 'envio_propio', estado: 'creado', numeroGuia: null, ultimoError: null });
  });

  it('otros estados y las órdenes de recogida no crean envío', async () => {
    const { repo, servicio } = montar({ 'PC-2026-00001': orden(), 'PC-2026-00002': orden({ codigo: 'PC-2026-00002', modoEntrega: 'recogida' }) });
    await servicio.alCambiarEstado({ codigo: 'PC-2026-00001', estadoNuevo: 'preparada' });
    await servicio.alCambiarEstado({ codigo: 'PC-2026-00002', estadoNuevo: 'despachado' });
    expect(repo.envios.size).toBe(0);
  });

  it('un segundo evento de despacho no duplica el envío', async () => {
    const { repo, servicio } = montar({ 'PC-2026-00001': orden() });
    await servicio.alCambiarEstado({ codigo: 'PC-2026-00001', estadoNuevo: 'despachado' });
    const primero = repo.envios.get('PC-2026-00001');
    await servicio.alCambiarEstado({ codigo: 'PC-2026-00001', estadoNuevo: 'despachado' });
    expect(repo.envios.get('PC-2026-00001')).toBe(primero);
  });

  it('R4: si el proveedor falla el envío queda pendiente con el motivo y no lanza; reintentar lo crea', async () => {
    let falla = true;
    const proveedor: ServicioEnviosPort = {
      proveedor: 'transportadora_x',
      cotizar: vi.fn(),
      consultarSeguimiento: vi.fn(),
      interpretarWebhook: vi.fn(),
      crearEnvio: async () => {
        if (falla) throw new ProveedorEnvioError('Zona sin cobertura');
        return { proveedor: 'transportadora_x', idExterno: 'ext-1', numeroGuia: 'G-123', urlSeguimiento: 'https://t.example/G-123', urlEtiqueta: 'https://t.example/e/G-123' };
      },
    };
    const { repo, servicio } = montar({ 'PC-2026-00001': orden() }, proveedor);

    await servicio.alCambiarEstado({ codigo: 'PC-2026-00001', estadoNuevo: 'despachado' });
    expect(repo.envios.get('PC-2026-00001')).toMatchObject({ estado: 'pendiente', ultimoError: 'Zona sin cobertura' });

    falla = false;
    const reintento = await servicio.reintentar('PC-2026-00001');
    expect(reintento).toMatchObject({ estado: 'creado', numeroGuia: 'G-123', ultimoError: null });
  });

  it('P3: el proveedor recibe el origen (ficha del vendedor de M12) y el destino separado de la dirección de M07', async () => {
    const crearEnvio = vi.fn().mockResolvedValue({ proveedor: 'transportadora_x', idExterno: null, numeroGuia: null, urlSeguimiento: null, urlEtiqueta: null });
    const proveedor: ServicioEnviosPort = { proveedor: 'transportadora_x', cotizar: vi.fn(), consultarSeguimiento: vi.fn(), interpretarWebhook: vi.fn(), crearEnvio };
    const { servicio } = montar({ 'PC-2026-00001': orden() }, proveedor);

    await servicio.alCambiarEstado({ codigo: 'PC-2026-00001', estadoNuevo: 'despachado' });

    expect(crearEnvio).toHaveBeenCalledWith(
      expect.objectContaining({
        codigoOrden: 'PC-2026-00001',
        origen: ORIGEN,
        destino: expect.objectContaining({ direccion: 'Calle 10 # 5-20', nombreRecibe: 'Laura Pérez', municipio: null }),
        // P2: el peso y las medidas de la variante viajan a cada bulto; lo que falta va en null.
        bultos: [expect.objectContaining({ cantidad: 2, pesoGramos: 4200, altoCm: 20.5, anchoCm: 18, largoCm: null })],
      }),
    );
  });

  it('el error de un proveedor que no es ProveedorEnvioError no filtra su mensaje', async () => {
    const proveedor: ServicioEnviosPort = {
      proveedor: 'transportadora_x',
      cotizar: vi.fn(),
      consultarSeguimiento: vi.fn(),
      interpretarWebhook: vi.fn(),
      crearEnvio: async () => {
        throw new Error('401 Unauthorized: api_key=secreta');
      },
    };
    const { repo, servicio } = montar({ 'PC-2026-00001': orden() }, proveedor);
    await servicio.alCambiarEstado({ codigo: 'PC-2026-00001', estadoNuevo: 'despachado' });
    expect(repo.envios.get('PC-2026-00001')?.ultimoError).toBe('El proveedor de envíos no respondió.');
  });
});

describe('EnviosService · lectura (R5, R9)', () => {
  it('el cliente ve su envío sin etiqueta ni errores; el de otro cliente o uno inexistente responde igual 404', async () => {
    const { servicio } = montar({ 'PC-2026-00001': orden() });
    await servicio.alCambiarEstado({ codigo: 'PC-2026-00001', estadoNuevo: 'despachado' });

    const visto = await servicio.paraCliente(7, 'PC-2026-00001');
    expect(visto).not.toHaveProperty('urlEtiqueta');
    expect(visto).not.toHaveProperty('ultimoError');
    await expect(servicio.paraCliente(99, 'PC-2026-00001')).rejects.toMatchObject({ statusCode: 404 });
    await expect(servicio.paraCliente(7, 'PC-2026-99999')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('el personal ve el envío con sus novedades, o envio null si aún no hay', async () => {
    const { servicio } = montar({ 'PC-2026-00001': orden() });
    expect(await servicio.paraPersonal('PC-2026-00001')).toEqual({ envio: null, novedades: [] });
    await expect(servicio.paraPersonal('PC-2026-99999')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('reintentar una orden de recogida responde 404', async () => {
    const { servicio } = montar({ 'PC-2026-00002': orden({ codigo: 'PC-2026-00002', modoEntrega: 'recogida' }) });
    await expect(servicio.reintentar('PC-2026-00002')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('EnviosService · R6 y R7 webhook', () => {
  const proveedor = (evento: ReturnType<ServicioEnviosPort['interpretarWebhook']>): ServicioEnviosPort => ({
    proveedor: 'transportadora_x',
    cotizar: vi.fn(),
    consultarSeguimiento: vi.fn(),
    crearEnvio: async () => ({ proveedor: 'transportadora_x', idExterno: 'ext-1', numeroGuia: 'G-1', urlSeguimiento: null, urlEtiqueta: null }),
    interpretarWebhook: () => evento,
  });

  it('una novedad cambia el estado del envío, se guarda y no toca la orden', async () => {
    const { repo, servicio } = montar(
      { 'PC-2026-00001': orden() },
      proveedor({ idExterno: 'ext-1', estado: 'con_novedad', detalle: 'Destinatario ausente' }),
    );
    await servicio.alCambiarEstado({ codigo: 'PC-2026-00001', estadoNuevo: 'despachado' });

    expect(await servicio.procesarWebhook('transportadora_x', {})).toEqual({ procesado: true });
    expect(repo.envios.get('PC-2026-00001')?.estado).toBe('con_novedad');
    expect(repo.novedades).toHaveLength(1);
    expect((await servicio.paraPersonal('PC-2026-00001')).novedades[0]?.detalle).toBe('Destinatario ausente');
  });

  it('un proveedor distinto del configurado responde 404; un cuerpo que no es un evento, procesado false', async () => {
    const { servicio } = montar({ 'PC-2026-00001': orden() }, proveedor(null));
    await expect(servicio.procesarWebhook('otro', {})).rejects.toMatchObject({ statusCode: 404 });
    expect(await servicio.procesarWebhook('transportadora_x', {})).toEqual({ procesado: false });
  });

  it('el adaptador por defecto no interpreta webhooks', async () => {
    const { servicio } = montar({});
    expect(await servicio.procesarWebhook('envio_propio', { cualquier: 'cosa' })).toEqual({ procesado: false });
  });
});

describe('EnvioPropioAdapter · R2 tarifa de hoy', () => {
  const solicitud = (totalMercancia: number) => ({ destino: destinoDesdeTexto(DIRECCION), bultos: [], totalMercancia }) as never;

  it('cobra la base debajo del umbral y es gratis al alcanzarlo', async () => {
    const adapter = new EnvioPropioAdapter({ obtenerNumero: async () => null });
    expect((await adapter.cotizar(solicitud(199_999)))[0]?.costo).toBe(15_000);
    expect((await adapter.cotizar(solicitud(200_000)))[0]?.costo).toBe(0);
  });

  it('usa los parámetros de M17 cuando se pueden leer', async () => {
    const valores: Record<string, number> = { 'comercial.costo_envio_base': 9000, 'comercial.umbral_envio_gratis': 50_000 };
    const adapter = new EnvioPropioAdapter({ obtenerNumero: async (clave) => valores[clave] ?? null });
    expect((await adapter.cotizar(solicitud(10_000)))[0]?.costo).toBe(9000);
    expect((await adapter.cotizar(solicitud(60_000)))[0]?.costo).toBe(0);
  });
});

describe('destinoDesdeTexto · el texto de dirección de M07', () => {
  it('separa dirección, barrio, complemento y quién recibe; municipio y departamento quedan null', () => {
    expect(destinoDesdeTexto(DIRECCION)).toEqual({
      direccion: 'Calle 10 # 5-20',
      barrio: 'Centro',
      complemento: 'Apto 301',
      municipio: null,
      departamento: null,
      nombreRecibe: 'Laura Pérez',
      telefonoRecibe: '3151234567',
    });
  });

  it('un texto que no sigue el formato se conserva entero en la dirección', () => {
    expect(destinoDesdeTexto('Carrera 7 con calle 50')).toMatchObject({ direccion: 'Carrera 7 con calle 50', barrio: null, nombreRecibe: null });
  });
});
