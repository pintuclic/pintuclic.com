import type { Prisma } from '@prisma/client';

/**
 * M17 · R-ACC-1/R-ACC-2 (ADR-013). El rol de una cuenta es `usuario.id_rol`, nada más. Es PERSONAL quien tiene el rol
 * `administrador` o `empleado`; el resto (clientes, empresas, cuentas sin rol) no entra al panel.
 * Los nombres son los del seed (seed_pintuclic.sql): no se compara por id.
 */
export const ROL_ADMINISTRADOR = 'administrador';
export const ROL_EMPLEADO = 'empleado';
export const ROLES_PERSONAL: readonly string[] = [ROL_ADMINISTRADOR, ROL_EMPLEADO];

export function esRolDePersonal(nombreRol: string | null | undefined): boolean {
  return nombreRol !== null && nombreRol !== undefined && ROLES_PERSONAL.includes(nombreRol);
}

/** Cuentas de personal (administrador o empleado). */
export const DONDE_PERSONAL: Prisma.UsuarioWhereInput = {
  rolDirecto: { nombre: { in: [...ROLES_PERSONAL] } },
};

/** Cuentas que NO son de personal: clientes, empresas y cuentas sin rol. */
export const DONDE_NO_PERSONAL: Prisma.UsuarioWhereInput = {
  OR: [{ idRol: null }, { rolDirecto: { nombre: { notIn: [...ROLES_PERSONAL] } } }],
};

/** Solo cuentas con rol `empleado` (los «colaboradores» del panel, R-ACC-8). */
export const DONDE_EMPLEADO: Prisma.UsuarioWhereInput = {
  rolDirecto: { nombre: ROL_EMPLEADO },
};
