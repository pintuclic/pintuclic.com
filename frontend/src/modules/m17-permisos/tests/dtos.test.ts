import { describe, expect, it } from 'vitest';
import {
  crearEmpleadoDto,
  desactivarEmpleadoDto,
  editarEmpleadoDto,
  primerAccesoEmpleadoDto,
} from '../dtos/empleados.dto';
import { actualizarPermisosDto } from '../dtos/permisos.dto';
import { desactivarClienteDto } from '../dtos/clientes-admin.dto';
import { actualizarParametroDto } from '../dtos/configuracion.dto';
import {
  confirmarSustitucionCorreoDto,
  primerAccesoAdminDto,
  solicitarSustitucionCorreoDto,
} from '../dtos/gobernanza.dto';

describe('M17 Frontend — DTOs de Validación con Zod', () => {
  describe('HU-ADM-01: DTOs de Empleados', () => {
    it('valida exitosamente la creación de un colaborador válido', () => {
      const res = crearEmpleadoDto.safeParse({
        nombre: 'Carlos Mario Álvarez',
        documento: '1020304050',
        correo: 'carlos.alvarez@pintuclic.com',
        telefono: '+57 300 123 4567',
      });
      expect(res.success).toBe(true);
    });

    it('rechaza nombres demasiado cortos o vacíos', () => {
      const res = crearEmpleadoDto.safeParse({
        nombre: 'Al',
        documento: '1020304050',
        correo: 'carlos@pintuclic.com',
        telefono: '3001234567',
      });
      expect(res.success).toBe(false);
    });

    it('rechaza correos con formato inválido', () => {
      const res = crearEmpleadoDto.safeParse({
        nombre: 'Carlos Álvarez',
        documento: '1020304050',
        correo: 'correo-invalido',
        telefono: '3001234567',
      });
      expect(res.success).toBe(false);
    });

    it('permite edición de nombre y teléfono válidos', () => {
      const res = editarEmpleadoDto.safeParse({
        nombre: 'Carlos M. Álvarez',
        telefono: '3119876543',
      });
      expect(res.success).toBe(true);
    });

    it('exige confirmación explícita para desactivar colaborador (HU-ADM-04)', () => {
      expect(desactivarEmpleadoDto.safeParse({ confirmacion: false }).success).toBe(false);
      expect(desactivarEmpleadoDto.safeParse({ confirmacion: true }).success).toBe(true);
    });

    it('exige contraseña de mínimo 12 caracteres y coincidencia en primer acceso', () => {
      // Menos de 12 caracteres
      const corta = primerAccesoEmpleadoDto.safeParse({
        credencialTemporal: 'temp123456',
        nuevaContrasena: 'Corta!123',
        confirmarContrasena: 'Corta!123',
      });
      expect(corta.success).toBe(false);

      // No coinciden
      const noCoincide = primerAccesoEmpleadoDto.safeParse({
        credencialTemporal: 'temp123456',
        nuevaContrasena: 'Segura_Clave!2026_Compleja',
        confirmarContrasena: 'Otra_Clave!2026_Distinta',
      });
      expect(noCoincide.success).toBe(false);

      // Válida y coincidente
      const valida = primerAccesoEmpleadoDto.safeParse({
        credencialTemporal: 'temp123456',
        nuevaContrasena: 'Segura_Clave!2026_Compleja',
        confirmarContrasena: 'Segura_Clave!2026_Compleja',
      });
      expect(valida.success).toBe(true);
    });
  });

  describe('HU-ADM-02: DTOs de Permisos Atómicos', () => {
    it('acepta lista de permisos válidos del catálogo oficial', () => {
      const res = actualizarPermisosDto.safeParse({
        permisos: ['catalogo.ver', 'catalogo.crear', 'ventas.ver'],
      });
      expect(res.success).toBe(true);
    });

    it('rechaza códigos de permiso inexistentes fuera del catálogo', () => {
      const res = actualizarPermisosDto.safeParse({
        permisos: ['permiso_fantasma.invalido'],
      });
      expect(res.success).toBe(false);
    });
  });

  describe('HU-ADM-05: DTOs de Clientes Admin', () => {
    it('RN-ADM-08: exige motivo de al menos 5 caracteres y confirmación', () => {
      // Motivo menor a 5 caracteres
      const corto = desactivarClienteDto.safeParse({
        motivo: 'mal',
        confirmacion: true,
      });
      expect(corto.success).toBe(false);

      // Sin confirmación
      const sinConf = desactivarClienteDto.safeParse({
        motivo: 'Fraude comprobado en compras anteriores',
        confirmacion: false,
      });
      expect(sinConf.success).toBe(false);

      // Motivo con solo espacios en blanco (RN-ADM-14 / RN-ADM-08 anti-bypass)
      const soloEspacios = desactivarClienteDto.safeParse({
        motivo: '      ',
        confirmacion: true,
      });
      expect(soloEspacios.success).toBe(false);

      // Válido
      const valido = desactivarClienteDto.safeParse({
        motivo: 'Fraude comprobado en compras anteriores',
        confirmacion: true,
      });
      expect(valido.success).toBe(true);
    });
  });

  describe('HU-ADM-06: DTOs de Configuración', () => {
    it('valida actualización de parámetros numéricos, texto o booleanos', () => {
      expect(actualizarParametroDto.safeParse({ valor: 15 }).success).toBe(true);
      expect(actualizarParametroDto.safeParse({ valor: 'texto_valido' }).success).toBe(true);
      expect(actualizarParametroDto.safeParse({ valor: true }).success).toBe(true);
    });
  });

  describe('HU-ADM-07: DTOs de Gobernanza', () => {
    it('valida solicitud de sustitución con correo válido', () => {
      expect(
        solicitarSustitucionCorreoDto.safeParse({ nuevoCorreo: 'admin.nuevo@pintuclic.com' }).success,
      ).toBe(true);
      expect(
        solicitarSustitucionCorreoDto.safeParse({ nuevoCorreo: 'invalido' }).success,
      ).toBe(false);
    });

    it('exige token de confirmación de mínimo 16 caracteres', () => {
      expect(
        confirmarSustitucionCorreoDto.safeParse({ tokenConfirmacion: '12345' }).success,
      ).toBe(false);
      expect(
        confirmarSustitucionCorreoDto.safeParse({
          tokenConfirmacion: 'token_de_seguridad_largo_64_caracteres_criptograficos_validos',
        }).success,
      ).toBe(true);
    });

    it('valida primer acceso de admin con contraseña de 12+ caracteres', () => {
      const valida = primerAccesoAdminDto.safeParse({
        credencialTemporal: 'temp12345678',
        nuevaContrasena: 'Admin_Master_Seguro_2026!',
        confirmarContrasena: 'Admin_Master_Seguro_2026!',
      });
      expect(valida.success).toBe(true);
    });
  });
});
