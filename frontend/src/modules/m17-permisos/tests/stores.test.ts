import { describe, expect, it } from 'vitest';
import { useEmpleadosStore } from '../store/empleadosStore';
import { useClientesStore } from '../store/clientesStore';
import { useConfiguracionStore } from '../store/configuracionStore';

describe('M17 Frontend — Stores Zustand', () => {
  describe('useEmpleadosStore', () => {
    it('inicia con estado por defecto consistente', () => {
      const estado = useEmpleadosStore.getState();
      expect(estado.empleados).toEqual([]);
      expect(estado.total).toBe(0);
      expect(estado.pagina).toBe(1);
      expect(estado.filtroEstado).toBeUndefined();
      expect(estado.busqueda).toBe('');
      expect(estado.empleadoSeleccionado).toBeNull();
      expect(estado.credencialTemporalGenerada).toBeNull();
    });

    it('actualiza filtros y limpia credencial temporal', () => {
      const store = useEmpleadosStore.getState();
      useEmpleadosStore.setState({ credencialTemporalGenerada: 'temp_secret_123' });
      expect(useEmpleadosStore.getState().credencialTemporalGenerada).toBe('temp_secret_123');

      store.limpiarCredencialTemporal();
      expect(useEmpleadosStore.getState().credencialTemporalGenerada).toBeNull();
    });
  });

  describe('useClientesStore', () => {
    it('inicia con estado por defecto consistente', () => {
      const estado = useClientesStore.getState();
      expect(estado.clientes).toEqual([]);
      expect(estado.filtroTipo).toBe('todos');
      expect(estado.termino).toBe('');
      expect(estado.fichaSeleccionada).toBeNull();
    });

    it('permite cerrar la ficha seleccionada', () => {
      const store = useClientesStore.getState();
      useClientesStore.setState({
        fichaSeleccionada: {
          idUsuario: 10,
          nombre: 'Pinturas del Norte SAS',
          correo: 'contacto@norte.com',
          telefono: '3001234567',
          tipo: 'empresa',
          estado: 'activo',
          fechaRegistro: '2026-01-15T00:00:00Z',
          ordenesRecientes: [],
          cotizacionesRecientes: [],
        },
      });

      expect(useClientesStore.getState().fichaSeleccionada).not.toBeNull();
      store.cerrarFicha();
      expect(useClientesStore.getState().fichaSeleccionada).toBeNull();
    });
  });

  describe('useConfiguracionStore', () => {
    it('inicia con área activa "todas"', () => {
      const estado = useConfiguracionStore.getState();
      expect(estado.areaActiva).toBe('todas');
      expect(estado.parametros).toEqual([]);
    });

    it('permite cambiar el área activa y limpiar mensajes', () => {
      const store = useConfiguracionStore.getState();
      store.establecerAreaActiva('autenticacion');
      expect(useConfiguracionStore.getState().areaActiva).toBe('autenticacion');

      useConfiguracionStore.setState({
        error: 'Error de prueba',
        exitoMensaje: 'Exito de prueba',
      });
      store.limpiarMensajes();
      expect(useConfiguracionStore.getState().error).toBeNull();
      expect(useConfiguracionStore.getState().exitoMensaje).toBeNull();
    });
  });
});
